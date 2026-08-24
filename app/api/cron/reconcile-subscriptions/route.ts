// app/api/cron/reconcile-subscriptions/route.ts
//
// 🔄 구독 상태 정합화 cron (RTDN 유실 대비 안전망)
//    활성 구독을 Google Play Developer API(subscriptionsv2)와 대조해 동기화한다.
//
// ⚠️ 안전 원칙 (v4 — 오강등 사고 재발 방지):
//    "만료/강등 판정은 오직 Google 의 subscriptionState 로만 한다.
//     우리 서버 시계(now)나 DB 의 expires_at 과 비교해 만료로 단정하지 않는다."
//    → 해지(CANCELED)했지만 아직 유효한 구독은 EXPIRED 가 아니므로 프리미엄 유지.
//    → expiryTime 은 표시용으로 저장만 하고 만료 트리거로 쓰지 않는다.
//
// 처리:
//   B. 활성 Play IAP 구독 → verifySubscriptionV2 로 실제 상태 대조
//      · subscriptionState === EXPIRED 일 때만 status='expired'
//      · 그 외(ACTIVE/CANCELED/GRACE/ON_HOLD/PAUSED/PENDING)는 active 유지
//      · auto_renew / cancelled_at / expires_at(표시용) 동기화
//      · API 오류 시 해당 행은 건드리지 않음(보수)
//   C. 유저 tier 재계산
//      · 활성 구독 있으면 premium / 없고 프로모도 아니면 free
//      · touchedUsers = 구독 이력 있는 유저만 → 순수 트라이얼/프로모 유저는 미포함(보호)
//
// 🔒 CRON_SECRET Bearer 인증. ?dryRun=true → 쓰기 없이 예상 결과만.
// 응답: { success, dryRun, checkedActive, apiSynced, expiredByGoogle, usersUpdated, downgraded[], errorCount }

import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/mobile-auth'
import { verifySubscriptionV2, extractExpiryTime } from '@/lib/google-play'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true'
  const supabase = getServerSupabase()
  const nowIso = new Date().toISOString()
  const now = Date.now()
  const startedAt = Date.now()

  let apiSynced = 0
  let expiredByGoogle = 0
  let usersUpdated = 0
  const errors: string[] = []
  const downgraded: Array<{ userId: string; email: string | null }> = []

  try {
    // 1) 활성 구독 로드
    const { data: activeSubs, error: loadErr } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan, status, expires_at, auto_renew, cancelled_at, payment_id, payment_method')
      .eq('status', 'active')

    if (loadErr) throw loadErr

    // B) Play IAP 활성 구독 → Google 실제 상태로만 판정
    for (const sub of activeSubs ?? []) {
      if (sub.payment_method !== 'PLAY_IAP' || !sub.payment_id) continue

      try {
        const purchase = await verifySubscriptionV2(sub.payment_id)
        const li = purchase.lineItems?.[0]
        const autoRenew = li?.autoRenewingPlan?.autoRenewEnabled ?? false
        const expiryIso = extractExpiryTime(purchase) ?? sub.expires_at
        const state = purchase.subscriptionState

        // ✅ 만료는 오직 Google 상태로만. 시계/expires_at 비교 금지.
        const isExpired = state === 'SUBSCRIPTION_STATE_EXPIRED'

        // cancelled_at: 해지 감지(자동갱신 OFF or CANCELED) 시 최초 기록, 재활성화 시 클리어
        const isCanceledState = state === 'SUBSCRIPTION_STATE_CANCELED' || !autoRenew
        let cancelledAt: string | null = sub.cancelled_at ?? null
        if (isCanceledState && !cancelledAt) cancelledAt = nowIso
        if (autoRenew) cancelledAt = null

        if (!dryRun) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              expires_at: expiryIso,          // 표시용 — Google 실제 만료일
              auto_renew: autoRenew,
              cancelled_at: cancelledAt,
              status: isExpired ? 'expired' : 'active',
            })
            .eq('id', sub.id)
          if (error) { errors.push(`sync ${sub.id}: ${error.message}`); continue }
        }
        apiSynced++
        if (isExpired) expiredByGoogle++
      } catch (e: any) {
        // API 오류(토큰 만료/네트워크 등) → 이 행은 절대 건드리지 않음(오강등 방지)
        errors.push(`verify ${sub.id}: ${String(e?.message || e).slice(0, 120)}`)
      }
    }

    // C) tier / premium_expires_at 재계산 — 구독 이력 있는 유저만(트라이얼/프로모 유저 보호)
    const { data: subOwners } = await supabase.from('subscriptions').select('user_id')
    const evalUsers = new Set<string>((subOwners ?? []).map((r: any) => r.user_id).filter(Boolean))

    for (const userId of evalUsers) {
      const { data: stillActive } = await supabase
        .from('subscriptions')
        .select('expires_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data: u } = await supabase
        .from('users')
        .select('email, tier, premium_expires_at, promo_code')
        .eq('id', userId)
        .single()
      if (!u) continue

      if (stillActive?.expires_at) {
        // 활성 구독 있음 → premium (트라이얼/프로모가 더 늦으면 그쪽 유지)
        const cur = u.premium_expires_at ? new Date(u.premium_expires_at).getTime() : 0
        const subExp = new Date(stillActive.expires_at).getTime()
        const finalExp = subExp > cur ? stillActive.expires_at : u.premium_expires_at
        if (u.tier !== 'premium' || u.premium_expires_at !== finalExp) {
          if (!dryRun) {
            const { error } = await supabase
              .from('users')
              .update({ tier: 'premium', premium_expires_at: finalExp })
              .eq('id', userId)
            if (!error) usersUpdated++
          } else usersUpdated++
        }
      } else {
        // 활성 구독 없음 (= Google 이 모든 구독을 EXPIRED 로 확인한 경우에만 여기 도달)
        const promoActive =
          !!u.promo_code && !!u.premium_expires_at && new Date(u.premium_expires_at).getTime() > now
        if (promoActive) continue // 프로모 프리미엄 보호
        if (u.tier === 'premium') {
          downgraded.push({ userId, email: u.email ?? null })
          if (!dryRun) {
            const { error } = await supabase
              .from('users')
              .update({ tier: 'free', premium_expires_at: null })
              .eq('id', userId)
            if (!error) usersUpdated++
          } else usersUpdated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      checkedActive: activeSubs?.length ?? 0,
      apiSynced,
      expiredByGoogle,
      usersUpdated,
      downgraded,
      downgradedCount: downgraded.length,
      errors: errors.slice(0, 20),
      errorCount: errors.length,
      elapsedMs: Date.now() - startedAt,
    })
  } catch (e: any) {
    console.error('[reconcile-subscriptions] crash:', e?.message ?? e)
    return NextResponse.json(
      { success: false, error: String(e?.message ?? e), elapsedMs: Date.now() - startedAt },
      { status: 500 },
    )
  }
}
