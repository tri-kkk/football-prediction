/**
 * POST /api/v1/mobile/purchase/webhook?token=<VERIFY_TOKEN>
 *
 * Google Play Real-time Developer Notifications (RTDN) 수신.
 * Pub/Sub Push 구독이 이 엔드포인트로 자동 갱신/취소/환불 등을 알려줌.
 *
 * 흐름:
 *  1. query param `?token=...`로 출처 검증 (Pub/Sub 구독 URL에 박은 비밀)
 *  2. Pub/Sub 메시지 봉투 파싱 (message.data = base64 JSON)
 *  3. subscriptionNotification.notificationType별 처리
 *     - 2 RENEWED        → expires_at 연장
 *     - 3 CANCELED       → subscription 자동 갱신 OFF (만료까지는 유지)
 *     - 4 PURCHASED      → verify와 같은 처리 (보통 verify가 먼저 처리)
 *     - 5 ON_HOLD        → 보류 (status 유지하되 webhook 로그만)
 *     - 12 REVOKED       → 즉시 차감 (premium → free)
 *     - 13 EXPIRED       → 정상 만료
 *
 * 응답:
 *  - 200 항상 (Pub/Sub가 재시도 안 하게)
 *  - 단, 토큰 검증 실패면 401
 *
 * 환경변수:
 *  GOOGLE_PLAY_PUBSUB_VERIFY_TOKEN — Pub/Sub Push URL의 ?token= 값
 */

import { NextRequest, NextResponse } from 'next/server'

import {
  parseRTDNMessage,
  verifyWebhookToken,
  verifySubscriptionV2,
  extractExpiryTime,
  SubscriptionNotificationType,
} from '@/lib/google-play'
import { getServerSupabase } from '@/lib/mobile-auth'

async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) return
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    /* ignore */
  }
}

// ──────────────────────────────────────────────────────────────────
// notificationType별 처리
// ──────────────────────────────────────────────────────────────────

async function handleSubscriptionNotification(
  notificationType: number,
  productId: string,
  purchaseToken: string
) {
  const supabase = getServerSupabase()

  // purchaseToken으로 구독 찾기
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, user_id, status, expires_at, plan')
    .eq('payment_id', purchaseToken)
    .maybeSingle()

  // 첫 PURCHASED 알림이 verify보다 빨리 올 수 있음 — 그 경우 sub가 없을 수 있음
  // 그땐 그냥 무시 (verify가 곧 처리할 것)
  if (!sub) {
    console.log(
      `[webhook] no subscription row for purchaseToken (type=${notificationType}, productId=${productId}) — skipping`
    )
    return { handled: false, reason: 'subscription_not_found' }
  }

  switch (notificationType) {
    case SubscriptionNotificationType.RENEWED:
    case SubscriptionNotificationType.RECOVERED:
    case SubscriptionNotificationType.RESTARTED: {
      // 자동 갱신 → expires_at 갱신 (v2 API 사용)
      try {
        const purchase = await verifySubscriptionV2(purchaseToken)
        const expiryStr = extractExpiryTime(purchase)
        if (!expiryStr) {
          console.warn(`[webhook] no expiryTime in v2 response — token=${purchaseToken.slice(0, 20)}...`)
          return { handled: false, error: 'no_expiry_time' }
        }
        const newExpiresAt = new Date(expiryStr)

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            expires_at: newExpiresAt.toISOString(),
            // 갱신 성공 시 자동갱신 ON으로 복귀 (cancelled_at은 그대로 두되, 재가입 시점이라 클리어)
            auto_renew: true,
            cancelled_at: null,
          })
          .eq('id', sub.id)

        // users 만료일도 갱신 (더 늦은 쪽 유지)
        const { data: u } = await supabase
          .from('users')
          .select('premium_expires_at')
          .eq('id', sub.user_id)
          .single()
        const current = u?.premium_expires_at ? new Date(u.premium_expires_at) : null
        const finalExpires = current && current > newExpiresAt ? current : newExpiresAt

        await supabase
          .from('users')
          .update({
            tier: 'premium',
            premium_expires_at: finalExpires.toISOString(),
          })
          .eq('id', sub.user_id)

        console.log(
          `[webhook] RENEWED/RECOVERED/RESTARTED — user=${sub.user_id}, new expires=${newExpiresAt.toISOString()}`
        )
        return { handled: true, type: 'renewed', newExpiresAt: newExpiresAt.toISOString() }
      } catch (e) {
        console.error('[webhook] renew verify failed:', (e as Error).message)
        return { handled: false, error: (e as Error).message }
      }
    }

    case SubscriptionNotificationType.CANCELED: {
      // 사용자가 자동 갱신 해제 → 현재 expires_at까지는 유효, 그 이후 자연 만료
      // status는 'active' 유지 (만료 전까지는 프리미엄)
      await supabase
        .from('subscriptions')
        .update({
          cancelled_at: new Date().toISOString(),
          auto_renew: false,
        })
        .eq('id', sub.id)

      console.log(`[webhook] CANCELED — user=${sub.user_id}, expires_at unchanged, auto_renew=false`)
      return { handled: true, type: 'canceled' }
    }

    case SubscriptionNotificationType.REVOKED: {
      // 환불됨 → 즉시 차감
      await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          expires_at: new Date().toISOString(),
          auto_renew: false,
        })
        .eq('id', sub.id)

      // users tier 다운그레이드 (다른 활성 구독 없으면)
      const { data: otherActive } = await supabase
        .from('subscriptions')
        .select('id, expires_at')
        .eq('user_id', sub.user_id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .neq('id', sub.id)
        .limit(1)
        .maybeSingle()

      if (!otherActive) {
        await supabase
          .from('users')
          .update({ tier: 'free', premium_expires_at: null })
          .eq('id', sub.user_id)
      }

      await sendTelegramNotification(
        `🚨 <b>환불 발생</b> (Play IAP)\n\n` +
          `👤 user_id: ${sub.user_id}\n` +
          `📋 plan: ${sub.plan}\n` +
          `🆔 token: ${purchaseToken.slice(0, 20)}...`
      )

      console.log(`[webhook] REVOKED — user=${sub.user_id} downgraded to free`)
      return { handled: true, type: 'revoked' }
    }

    case SubscriptionNotificationType.EXPIRED: {
      // 정상 만료 — DB 정리만
      await supabase
        .from('subscriptions')
        .update({ status: 'expired', auto_renew: false })
        .eq('id', sub.id)

      // 다른 활성 구독 없으면 free 다운그레이드
      const { data: otherActive } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', sub.user_id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle()

      if (!otherActive) {
        await supabase
          .from('users')
          .update({ tier: 'free', premium_expires_at: null })
          .eq('id', sub.user_id)
      }

      console.log(`[webhook] EXPIRED — user=${sub.user_id}`)
      return { handled: true, type: 'expired' }
    }

    case SubscriptionNotificationType.ON_HOLD:
    case SubscriptionNotificationType.IN_GRACE_PERIOD:
    case SubscriptionNotificationType.PAUSED:
    case SubscriptionNotificationType.PAUSE_SCHEDULE_CHANGED:
    case SubscriptionNotificationType.PRICE_CHANGE_CONFIRMED:
    case SubscriptionNotificationType.DEFERRED:
    case SubscriptionNotificationType.PENDING_PURCHASE_CANCELED: {
      // 로그만 — 정책상 별도 액션 없음
      console.log(`[webhook] type=${notificationType} (no-op) for user=${sub.user_id}`)
      return { handled: true, type: 'noop' }
    }

    case SubscriptionNotificationType.PURCHASED: {
      // verify가 처리할 것 — webhook은 보통 verify보다 늦게 옴
      console.log(`[webhook] PURCHASED — assuming verify will handle, user=${sub.user_id}`)
      return { handled: true, type: 'purchased' }
    }

    default: {
      console.warn(`[webhook] unknown notificationType=${notificationType}`)
      return { handled: false, reason: 'unknown_type' }
    }
  }
}

// ──────────────────────────────────────────────────────────────────
// 메인 POST
// ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. 토큰 검증 (?token= 쿼리)
  if (!verifyWebhookToken(request.url)) {
    console.warn('[webhook] invalid verify token')
    return NextResponse.json(
      { success: false, error: { code: 'WEBHOOK_TOKEN_INVALID', message: 'Invalid token' } },
      { status: 401 }
    )
  }

  // 2. Pub/Sub 메시지 봉투 파싱
  let envelope: any
  try {
    envelope = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_BODY', message: 'Invalid JSON' } },
      { status: 200 } // Pub/Sub 재시도 방지
    )
  }

  const message = envelope?.message
  if (!message?.data) {
    console.warn('[webhook] missing message.data')
    return NextResponse.json({ success: true, ignored: 'no_data' }, { status: 200 })
  }

  let payload
  try {
    payload = parseRTDNMessage(message.data)
  } catch (e) {
    console.error('[webhook] payload parse failed:', (e as Error).message)
    return NextResponse.json({ success: true, ignored: 'parse_error' }, { status: 200 })
  }

  // 3. Test notification — Play Console 테스트 알림
  if (payload.testNotification) {
    console.log('[webhook] test notification received:', payload)
    return NextResponse.json({ success: true, test: true }, { status: 200 })
  }

  // 4. Subscription notification
  if (payload.subscriptionNotification) {
    const { notificationType, purchaseToken, subscriptionId } = payload.subscriptionNotification
    try {
      const result = await handleSubscriptionNotification(
        notificationType,
        subscriptionId,
        purchaseToken
      )
      return NextResponse.json({ success: true, ...result }, { status: 200 })
    } catch (e) {
      console.error('[webhook] handler crashed:', (e as Error).message)
      // 200으로 응답 — Pub/Sub가 재시도하면 같은 에러 반복됨. 일단 ack하고 로그로 추적.
      return NextResponse.json(
        { success: false, error: (e as Error).message },
        { status: 200 }
      )
    }
  }

  // 5. 일회성 상품 알림은 현재 미사용
  if (payload.oneTimeProductNotification) {
    console.log('[webhook] oneTimeProductNotification received (no handler):', payload)
    return NextResponse.json({ success: true, ignored: 'one_time' }, { status: 200 })
  }

  console.warn('[webhook] unknown payload:', payload)
  return NextResponse.json({ success: true, ignored: 'unknown_payload' }, { status: 200 })
}
