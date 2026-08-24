// app/api/cron/reconcile-subscriptions/route.ts
//
// 🔄 구독 상태 정합화 cron (RTDN 유실 대비 안전망 + 누적 중복 행 정리)
//    RTDN(실시간 알림)을 한 건 놓쳐도 상태가 어긋나지 않도록,
//    활성 구독을 주기적으로 Google Play Developer API와 대조해 동기화한다.
//
// 처리:
//   A. status='active' 인데 expires_at 이 과거인 행 → 'expired' 로 정리 (누적 중복/유실 만료)
//   B. 아직 유효한 Play IAP 활성 구독 → verifySubscriptionV2 로 실제 상태 대조
//      · expires_at / auto_renew / cancelled_at / status 동기화
//   C. 영향받은 유저의 tier / premium_expires_at 재계산 (활성 구독 최대 만료일 기준)
//
// 🔒 CRON_SECRET Bearer 인증. 권장 주기: 매시간 또는 6시간.
// 호출: pg_cron → Authorization: Bearer <CRON_SECRET>
// 응답: { success, checkedActive, expiredCleaned, apiSynced, usersUpdated, errors }

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

  const supabase = getServerSupabase()
  const nowIso = new Date().toISOString()
  const now = Date.now()
  const startedAt = Date.now()

  let expiredCleaned = 0
  let apiSynced = 0
  let usersUpdated = 0
  const errors: string[] = []
  const touchedUsers = new Set<string>()

  try {
    // 1) 활성 구독 전체 로드
    const { data: activeSubs, error: loadErr } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan, status, expires_at, auto_renew, cancelled_at, payment_id, payment_method')
      .eq('status', 'active')

    if (loadErr) throw loadErr

    for (const sub of activeSubs ?? []) {
      if (sub.user_id) touchedUsers.add(sub.user_id)

      // A) 이미 만료된 활성 행 → expired 로 정리 (API 없이)
      if (sub.expires_at && new Date(sub.expires_at).getTime() <= now) {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'expired', auto_renew: false })
          .eq('id', sub.id)
        if (!error) expiredCleaned++
        else errors.push(`expire ${sub.id}: ${error.message}`)
        continue
      }

      // B) Play IAP 유효 구독만 실제 상태 대조 (그 외 결제수단은 건너뜀)
      if (sub.payment_method !== 'PLAY_IAP' || !sub.payment_id) continue

      try {
        const purchase = await verifySubscriptionV2(sub.payment_id)
        const li = purchase.lineItems?.[0]
        const autoRenew = li?.autoRenewingPlan?.autoRenewEnabled ?? false
        const expiryIso = extractExpiryTime(purchase) ?? sub.expires_at
        const state = purchase.subscriptionState
        const expired =
          state === 'SUBSCRIPTION_STATE_EXPIRED' ||
          (expiryIso ? new Date(expiryIso).getTime() <= now : false)

        // cancelled_at: 해지(자동갱신 OFF) 최초 감지 시 기록, 재활성화 시 클리어
        let cancelledAt: string | null = sub.cancelled_at ?? null
        if (!autoRenew && !cancelledAt) cancelledAt = nowIso
        if (autoRenew) cancelledAt = null

        const { error } = await supabase
          .from('subscriptions')
          .update({
            expires_at: expiryIso,
            auto_renew: autoRenew,
            cancelled_at: cancelledAt,
            status: expired ? 'expired' : 'active',
          })
          .eq('id', sub.id)
        if (!error) apiSynced++
        else errors.push(`sync ${sub.id}: ${error.message}`)
      } catch (e: any) {
        // 토큰이 이미 대체/만료된 경우 등 — 만료로 간주하지 않고 로그만 (다음 주기 재시도)
        errors.push(`verify ${sub.id}: ${String(e?.message || e).slice(0, 120)}`)
      }
    }

    // C) 영향받은 유저 tier / premium_expires_at 재계산
    for (const userId of touchedUsers) {
      const { data: stillActive } = await supabase
        .from('subscriptions')
        .select('expires_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('expires_at', nowIso)
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (stillActive?.expires_at) {
        // 유료 구독이 살아있으면 premium 유지 (트라이얼 premium_expires_at 은 더 늦은 쪽 유지)
        const { data: u } = await supabase
          .from('users')
          .select('premium_expires_at')
          .eq('id', userId)
          .single()
        const cur = u?.premium_expires_at ? new Date(u.premium_expires_at).getTime() : 0
        const subExp = new Date(stillActive.expires_at).getTime()
        const finalExp = subExp > cur ? stillActive.expires_at : u!.premium_expires_at
        const { error } = await supabase
          .from('users')
          .update({ tier: 'premium', premium_expires_at: finalExp })
          .eq('id', userId)
        if (!error) usersUpdated++
      } else {
        // 활성 유료 구독 없음 — 단, 트라이얼/프로모(premium_expires_at 미래)면 premium 유지
        const { data: u } = await supabase
          .from('users')
          .select('tier, premium_expires_at')
          .eq('id', userId)
          .single()
        const trialActive =
          !!u?.premium_expires_at && new Date(u.premium_expires_at).getTime() > now
        if (!trialActive && u?.tier === 'premium') {
          const { error } = await supabase
            .from('users')
            .update({ tier: 'free', premium_expires_at: null })
            .eq('id', userId)
          if (!error) usersUpdated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      checkedActive: activeSubs?.length ?? 0,
      expiredCleaned,
      apiSynced,
      usersUpdated,
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
