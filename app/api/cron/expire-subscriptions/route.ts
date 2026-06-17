// app/api/cron/expire-subscriptions/route.ts
//
// 🕓 만료된 프리미엄 구독 자동 처리 cron
//    매일 1회 실행:
//    1) subscriptions 중 expires_at < now() AND status='active' AND plan='premium' → status='expired'
//    2) 해당 user의 다른 active premium subscription 없으면 users.tier='free'
//    3) users.premium_expires_at < now() AND tier='premium' 도 demote (subscription 누락 케이스 대응)
//
// 호출: pg_cron (매일 00:10 KST = 15:10 UTC)
// 응답: { success, expiredSubscriptions, demotedUsers, demotedByExpiryColumn }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(_req: NextRequest) {
  const startedAt = Date.now()

  try {
    const nowIso = new Date().toISOString()

    // 1) 만료된 active premium subscription 찾기
    const { data: expiringRows, error: findError } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan, status, expires_at')
      .eq('status', 'active')
      .eq('plan', 'premium')
      .lt('expires_at', nowIso)

    if (findError) throw findError

    const targetIds = (expiringRows ?? []).map((r) => r.id)
    const targetUserIds = Array.from(
      new Set((expiringRows ?? []).map((r) => r.user_id).filter(Boolean)),
    )

    let expiredCount = 0
    let demotedCount = 0

    if (targetIds.length > 0) {
      // 2) subscriptions.status → 'expired'
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .in('id', targetIds)
      if (updateError) throw updateError
      expiredCount = targetIds.length

      // 3) 각 user_id에 대해 다른 active premium subscription 있는지 확인 후 없으면 users.tier='free'
      for (const userId of targetUserIds) {
        const { count: remainingActive } = await supabase
          .from('subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'active')
          .eq('plan', 'premium')
          .gte('expires_at', nowIso)

        if ((remainingActive ?? 0) === 0) {
          const { error: userUpdateError } = await supabase
            .from('users')
            .update({ tier: 'free' })
            .eq('id', userId)
            .eq('tier', 'premium')
          if (!userUpdateError) demotedCount++
        }
      }
    }

    // 4) 안전망: subscription row 없어도 users.premium_expires_at가 지나면 demote
    //    (수동으로 premium 부여한 케이스 / subscription 누락 케이스 대응)
    const { data: orphanExpired, error: orphanError } = await supabase
      .from('users')
      .select('id')
      .eq('tier', 'premium')
      .not('premium_expires_at', 'is', null)
      .lt('premium_expires_at', nowIso)

    let demotedByExpiryColumn = 0
    if (!orphanError && orphanExpired && orphanExpired.length > 0) {
      const orphanIds = orphanExpired.map((u: any) => u.id)
      const { error: demoteError } = await supabase
        .from('users')
        .update({ tier: 'free' })
        .in('id', orphanIds)
      if (!demoteError) demotedByExpiryColumn = orphanIds.length
    }

    return NextResponse.json({
      success: true,
      expiredSubscriptions: expiredCount,
      demotedUsers: demotedCount,
      demotedByExpiryColumn,
      checkedAt: nowIso,
      elapsedMs: Date.now() - startedAt,
    })
  } catch (e: any) {
    console.error('[expire-subscriptions] crash:', e?.message ?? e)
    return NextResponse.json(
      { success: false, error: e?.message ?? String(e), elapsedMs: Date.now() - startedAt },
      { status: 500 },
    )
  }
}
