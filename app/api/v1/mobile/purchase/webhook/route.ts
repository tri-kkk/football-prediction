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
  acknowledgeSubscriptionV2,
  extractExpiryTime,
  extractBasePlanId,
  getProductInfoByBasePlan,
  isSubscriptionPayable,
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
// B39: RTDN 자동 권한부여 (self-heal)
//   결제는 됐는데 앱이 verify 를 못 보낸 경우(결제 직후 네트워크 단절 등),
//   subscriptions 행이 없어 아래 handler 가 skip 된다. 이때 RTDN 만으로 권한을 부여한다.
//   흐름: Play API v2 조회 → obfuscatedExternalAccountId(=users.id) 로 사용자 매핑
//         → 활성 상태면 subscriptions/payments insert + users premium + acknowledge.
//   멱등: payment_id(purchaseToken) 로 중복 방지. 이후 앱이 같은 토큰으로 verify 해도
//         verify 의 기존행 체크가 중복부여를 막는다.
// ──────────────────────────────────────────────────────────────────
async function selfHealGrant(purchaseToken: string, notificationType: number) {
  const supabase = getServerSupabase()

  let purchase
  try {
    purchase = await verifySubscriptionV2(purchaseToken)
  } catch (e) {
    console.error('[webhook][self-heal] verify failed:', (e as Error).message)
    return { handled: false, reason: 'verify_failed' }
  }

  // obfuscatedExternalAccountId = 앱이 결제 시 넣은 users.id (v2.0+). 없으면 레거시 구매 → 매핑 불가.
  const userId = purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId
  if (!userId) {
    console.warn(`[webhook][self-heal] no obfuscatedExternalAccountId (legacy purchase) — token=${purchaseToken.slice(0, 20)}...`)
    return { handled: false, reason: 'no_external_account_id' }
  }

  const { data: u } = await supabase
    .from('users')
    .select('id, premium_expires_at')
    .eq('id', userId)
    .maybeSingle()
  if (!u) {
    console.warn(`[webhook][self-heal] user not found for id=${userId}`)
    return { handled: false, reason: 'user_not_found' }
  }

  // 활성/유예 상태만 부여
  if (!isSubscriptionPayable(purchase)) {
    return { handled: false, reason: 'not_payable', state: purchase.subscriptionState }
  }

  // 멱등 재확인 (verify 와의 경합 대비) — payment_id 기준
  const { data: dup } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('payment_id', purchaseToken)
    .maybeSingle()
  if (dup) return { handled: true, type: 'already_granted' }

  const basePlanId = extractBasePlanId(purchase)
  const product = basePlanId ? getProductInfoByBasePlan(basePlanId) : null
  if (!product) {
    return { handled: false, reason: 'unknown_plan', basePlanId }
  }

  const expiryStr = extractExpiryTime(purchase)
  if (!expiryStr) return { handled: false, reason: 'no_expiry' }
  const startTime = new Date(purchase.startTime)
  const expiresAt = new Date(expiryStr)
  const orderId = purchase.latestOrderId || purchaseToken
  const autoRenew = !!purchase.lineItems?.[0]?.autoRenewingPlan?.autoRenewEnabled

  // payments (best-effort)
  await supabase
    .from('payments')
    .insert({
      user_id: userId,
      order_id: orderId,
      status: 'success',
      tid: orderId,
      amount: product.price,
      goods_name: product.label,
      payment_method: 'PLAY_IAP',
      order_date: startTime.toISOString(),
      raw_response: purchase,
    })
    .then(() => {}, () => {})

  // subscriptions (payment_id = 멱등 키)
  const { error: subErr } = await supabase.from('subscriptions').insert({
    user_id: userId,
    plan: product.plan,
    status: 'active',
    started_at: startTime.toISOString(),
    expires_at: expiresAt.toISOString(),
    payment_id: purchaseToken,
    price: product.price,
    payment_method: 'PLAY_IAP',
    auto_renew: autoRenew,
  })
  if (subErr) {
    // payment_id UNIQUE 충돌(23505) = 동시 verify/webhook이 이미 처리함 → 정상(멱등)
    if ((subErr as any).code === '23505') {
      console.log('[webhook][self-heal] payment_id 중복(경합) → already_granted')
      return { handled: true, type: 'already_granted' }
    }
    console.error('[webhook][self-heal] subscriptions insert error:', subErr.message)
    return { handled: false, reason: 'insert_failed', error: subErr.message }
  }

  // users premium (더 늦은 만료일 유지)
  const cur = u.premium_expires_at ? new Date(u.premium_expires_at) : null
  const finalExp = cur && cur > expiresAt ? cur : expiresAt
  await supabase
    .from('users')
    .update({ tier: 'premium', premium_expires_at: finalExp.toISOString() })
    .eq('id', userId)

  // acknowledge (3일 내 안 하면 자동 환불)
  if (purchase.acknowledgementState !== 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED') {
    acknowledgeSubscriptionV2(purchaseToken).catch(() => {})
  }

  await sendTelegramNotification(
    `🛟 <b>RTDN 자동 권한부여</b> (앱 verify 누락 복구)\n\n` +
      `👤 user_id: ${userId}\n` +
      `📋 plan: ${product.plan}\n` +
      `🆔 token: ${purchaseToken.slice(0, 20)}...`
  )
  console.log(`[webhook][self-heal] granted — user=${userId}, plan=${product.plan} (type=${notificationType})`)
  return { handled: true, type: 'self_heal_granted', userId, plan: product.plan }
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

  // subscriptions 행이 없음 — 앱 verify 가 아직/영영 안 온 경우.
  //  · 권한부여 성격 알림(PURCHASED/RENEWED/RECOVERED/RESTARTED)이면 B39 self-heal 로 직접 부여.
  //  · 그 외(CANCEL/EXPIRE/REVOKE 등)는 부여할 대상이 없으니 skip.
  if (!sub) {
    const GRANT_TYPES: number[] = [
      SubscriptionNotificationType.PURCHASED,
      SubscriptionNotificationType.RENEWED,
      SubscriptionNotificationType.RECOVERED,
      SubscriptionNotificationType.RESTARTED,
    ]
    if (GRANT_TYPES.includes(notificationType)) {
      console.log(
        `[webhook] no subscription row (type=${notificationType}) → B39 self-heal 시도`
      )
      return await selfHealGrant(purchaseToken, notificationType)
    }
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
