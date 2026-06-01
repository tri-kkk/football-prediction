/**
 * POST /api/v1/mobile/purchase/verify
 *
 * Google Play 인앱 결제 토큰을 백엔드에서 검증하고 구독 활성화.
 *
 * 흐름:
 *  1. Bearer JWT로 사용자 식별
 *  2. body 검증 (productId, purchaseToken)
 *  3. purchaseToken 멱등성 체크 (이미 처리된 토큰이면 현재 상태 반환)
 *  4. Google Play Developer API로 토큰 검증
 *  5. paymentState 확인
 *  6. payments + subscriptions insert + users.tier 업데이트
 *  7. Google에 acknowledge (3일 내 안 하면 자동 환불됨)
 *  8. 텔레그램 매출 알림 + PostHog 캡처
 */

import { NextRequest } from 'next/server'

import {
  ErrorCode,
  errorResponse,
  successResponse,
  capturePostHogEvent,
} from '@/lib/mobile-api'
import {
  getMobileSession,
  requireAuth,
  getServerSupabase,
} from '@/lib/mobile-auth'
import {
  verifySubscription,
  acknowledgeSubscription,
  getProductInfo,
} from '@/lib/google-play'

async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) return

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (e) {
    console.warn('[purchase/verify] telegram failed:', (e as Error)?.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. 인증 (모바일 JWT)
    const session = await getMobileSession(request)
    const authError = requireAuth(session)
    if (authError) return authError

    const userId = session!.userId
    const userEmail = session!.email

    // 2. body 파싱
    let body: any
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'Invalid JSON body')
    }

    const { productId, purchaseToken, platform, email } = body || {}

    if (!productId || typeof productId !== 'string') {
      return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'productId is required')
    }
    if (!purchaseToken || typeof purchaseToken !== 'string') {
      return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'purchaseToken is required')
    }
    if (platform && platform !== 'android') {
      return errorResponse(
        400,
        ErrorCode.VALIDATION_ERROR,
        `Only platform=android supported (got: ${platform}). iOS는 별도 엔드포인트 예정.`
      )
    }

    const product = getProductInfo(productId)
    if (!product) {
      return errorResponse(
        400,
        ErrorCode.INVALID_PRODUCT,
        `Unknown productId: ${productId}`,
        { allowed: Object.keys({ premium_monthly: 1, premium_quarterly: 1 }) }
      )
    }

    // body의 email은 로그/디버깅 용도로만 — 인증은 JWT 기준
    const bodyEmail = typeof email === 'string' ? email.toLowerCase() : null
    if (bodyEmail && bodyEmail !== userEmail.toLowerCase()) {
      console.warn(
        `[purchase/verify] body email (${bodyEmail}) != JWT email (${userEmail}) — JWT 사용`
      )
    }

    const supabase = getServerSupabase()

    // 3. 멱등성 — 같은 purchaseToken이 이미 처리되었는지
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id, plan, status, started_at, expires_at, user_id')
      .eq('payment_id', purchaseToken)
      .maybeSingle()

    if (existing) {
      // 같은 사용자가 같은 토큰 재전송 → 현재 상태 반환 (정상 멱등)
      // 다른 사용자가 같은 토큰 → 토큰 도용 시도, 차단
      if (existing.user_id !== userId) {
        console.warn(
          `[purchase/verify] purchaseToken collision — owner ${existing.user_id} vs caller ${userId}`
        )
        return errorResponse(
          409,
          ErrorCode.TOKEN_ALREADY_USED,
          '이 구매 토큰은 다른 계정에서 이미 사용되었습니다.'
        )
      }

      const { data: u } = await supabase
        .from('users')
        .select('tier, premium_expires_at')
        .eq('id', userId)
        .single()

      return successResponse({
        tier: u?.tier ?? 'premium',
        plan: existing.plan,
        expiresAt: u?.premium_expires_at ?? existing.expires_at,
        startedAt: existing.started_at,
        autoRenewing: true,
        alreadyProcessed: true,
      })
    }

    // 4. Google Play Developer API로 토큰 검증
    let purchase
    try {
      purchase = await verifySubscription(productId, purchaseToken)
    } catch (e: any) {
      console.error('[purchase/verify] Google verify error:', e?.message)
      return errorResponse(
        400,
        ErrorCode.GOOGLE_VERIFY_FAILED,
        'Google Play 토큰 검증에 실패했습니다.',
        { details: e?.message?.slice(0, 200) }
      )
    }

    // 5. paymentState 확인
    // 0 = Payment pending, 1 = Payment received, 2 = Free trial, 3 = Pending deferred upgrade
    if (purchase.paymentState !== 1 && purchase.paymentState !== 2) {
      return errorResponse(
        402,
        ErrorCode.PAYMENT_PENDING,
        '결제가 완료되지 않은 상태입니다.',
        {
          paymentState: purchase.paymentState ?? null,
          retryAfterSec: 60,
        }
      )
    }

    const startTime = new Date(parseInt(purchase.startTimeMillis, 10))
    const expiresAt = new Date(parseInt(purchase.expiryTimeMillis, 10))
    const autoRenewing = !!purchase.autoRenewing
    const orderId = purchase.orderId || purchaseToken

    // 6. payments + subscriptions insert + users 업데이트 (트랜잭션 대신 순차)

    // 탈퇴 재가입자 텔레그램 알림용 체크
    const { data: deletedRecord } = await supabase
      .from('deleted_users')
      .select('deleted_at, subscription_tier, total_payments')
      .eq('email_hash', require('crypto').createHash('sha256').update(userEmail.toLowerCase()).digest('hex'))
      .maybeSingle()

    // 6-A. payments insert
    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: userId,
      order_id: orderId,
      status: 'success',
      tid: orderId,
      amount: product.price,
      buyer_email: userEmail,
      goods_name: product.label,
      payment_method: 'PLAY_IAP',
      order_date: startTime.toISOString(),
      raw_response: purchase,
    })
    if (paymentError) {
      console.warn('[purchase/verify] payments insert error (계속 진행):', paymentError.message)
    }

    // 6-B. subscriptions insert (payment_id = purchaseToken — 멱등성 키)
    const { error: subError } = await supabase.from('subscriptions').insert({
      user_id: userId,
      plan: product.plan,
      status: 'active',
      started_at: startTime.toISOString(),
      expires_at: expiresAt.toISOString(),
      payment_id: purchaseToken,
      price: product.price,
      payment_method: 'PLAY_IAP',
    })
    if (subError) {
      console.error('[purchase/verify] subscriptions insert error:', subError.message)
      return errorResponse(
        500,
        ErrorCode.INTERNAL_ERROR,
        'Failed to save subscription',
        { details: subError.message }
      )
    }

    // 6-C. users tier 업데이트 (현재 premium_expires_at과 비교해서 더 늦은 것 선택)
    const { data: currentUser } = await supabase
      .from('users')
      .select('premium_expires_at')
      .eq('id', userId)
      .single()

    const currentExpires = currentUser?.premium_expires_at
      ? new Date(currentUser.premium_expires_at)
      : null
    const newExpiresAt =
      currentExpires && currentExpires > expiresAt ? currentExpires : expiresAt

    await supabase
      .from('users')
      .update({
        tier: 'premium',
        premium_expires_at: newExpiresAt.toISOString(),
      })
      .eq('id', userId)

    // 7. Google Play에 acknowledge (3일 내 안 하면 자동 환불됨)
    // acknowledgementState === 0이면 호출
    if (purchase.acknowledgementState !== 1) {
      acknowledgeSubscription(productId, purchaseToken).catch(() => {})
    }

    // 8. 텔레그램 알림 + PostHog
    if (deletedRecord) {
      const alertMsg =
        `⚠️ <b>탈퇴 재가입 유저 결제!</b> (Play IAP)\n\n` +
        `👤 이메일: ${userEmail}\n` +
        `📅 이전 탈퇴일: ${deletedRecord.deleted_at}\n` +
        `💎 이전 티어: ${deletedRecord.subscription_tier || 'unknown'}\n` +
        `💰 이전 결제 횟수: ${deletedRecord.total_payments || 0}회\n` +
        `🆔 주문번호: ${orderId}`
      await sendTelegramNotification(alertMsg)
    }

    await sendTelegramNotification(
      `💰 <b>매출 발생!</b> (Play IAP)\n\n` +
        `📋 상품: ${product.label}\n` +
        `💳 금액: ₩${product.price.toLocaleString()}\n` +
        `👤 이메일: ${userEmail}\n` +
        `🆔 주문번호: ${orderId}\n` +
        `🕐 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
    )

    capturePostHogEvent('subscription_completed', userId, {
      provider: 'PLAY_IAP',
      plan: product.plan,
      price: product.price,
      productId,
      autoRenewing,
    })

    // 9. 성공 응답
    return successResponse({
      tier: 'premium',
      plan: product.plan,
      expiresAt: newExpiresAt.toISOString(),
      startedAt: startTime.toISOString(),
      autoRenewing,
      alreadyProcessed: false,
    })
  } catch (error) {
    console.error('[purchase/verify] unexpected error:', error)
    return errorResponse(
      500,
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      { details: (error as Error)?.message?.slice(0, 200) }
    )
  }
}
