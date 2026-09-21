// app/api/cron/cleanup-unagreed-users/route.ts
//
// 🧹 부록B / B38: 약관 미동의 유령 계정 정리 cron (서버 배치 · 앱 작업 불필요)
//
//   현 아키텍처(모바일):
//     소셜 인증 → pending_users 행 생성(+JWT). 약관 동의 완료 시에만 users 로 승격.
//     약관 화면에서 이탈하면 pending_users 행이 그대로 남는다(= 미동의 잔류).
//     재인증하면 같은 email 의 pending_users 를 재사용하며 expires_at 을 +7일 연장한다.
//   레거시:
//     예전엔 users 행을 즉시 만들었을 수 있어 terms_agreed_at IS NULL 계정이 남을 수 있음.
//
//   → 두 곳을 모두 정리한다:
//     A) pending_users: expires_at < now()  (7일 TTL, 재인증 시 자동 연장되므로 안전)
//     B) users:         terms_agreed_at IS NULL AND created_at < now()-CLEANUP_AFTER_HOURS (레거시/보수)
//
//   재인증 시 OAuth 가 계정을 다시 만들므로 삭제는 안전하다.
//
// 🔒 CRON_SECRET Bearer 인증 필수. ?dryRun=true 로 삭제 없이 대상 수만 확인.
// 응답: { success, dryRun, pending:{candidates,deleted}, users:{candidates,deleted}, hours }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// 레거시 users(terms NULL) 정리 유예 시간(시간).
const CLEANUP_AFTER_HOURS = 48

// (레거시 users 삭제 시) 함께 지울 연관 테이블. pending_users 는 승격 전이라 연관 데이터 없음.
const RELATED_TABLES = [
  'proto_slips',
  'subscriptions',
  'referral_history',
  'referral_codes',
  'user_settings',
  'user_preferences',
  'match_notifications',
]

export async function GET(request: NextRequest) {
  // 🔒 CRON_SECRET 인증
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true'
  const startedAt = Date.now()
  const nowIso = new Date().toISOString()

  try {
    // ── A) pending_users: 만료(expires_at < now) 정리 ── 현 아키텍처의 실제 미동의 잔류
    const { data: expiredPending, error: pendFindErr } = await supabase
      .from('pending_users')
      .select('id')
      .lt('expires_at', nowIso)
    if (pendFindErr) throw pendFindErr

    const pendingIds = (expiredPending ?? []).map((p) => p.id)
    let pendingDeleted = 0
    if (!dryRun && pendingIds.length > 0) {
      const { error } = await supabase.from('pending_users').delete().in('id', pendingIds)
      if (error) throw error
      pendingDeleted = pendingIds.length
    }

    // ── B) users: terms_agreed_at NULL + 유예 경과 (레거시/보수) ──
    const cutoffIso = new Date(Date.now() - CLEANUP_AFTER_HOURS * 3600_000).toISOString()
    const { data: ghosts, error: findErr } = await supabase
      .from('users')
      .select('id')
      .is('terms_agreed_at', null)
      .lt('created_at', cutoffIso)
    if (findErr) throw findErr

    const userIds = (ghosts ?? []).map((u) => u.id)
    let usersDeleted = 0
    if (!dryRun && userIds.length > 0) {
      for (const table of RELATED_TABLES) {
        const { error } = await supabase.from(table).delete().in('user_id', userIds)
        if (error) console.warn(`[cleanup-unagreed-users] ${table} 삭제 경고:`, error.message)
      }
      const { error: delErr } = await supabase.from('users').delete().in('id', userIds)
      if (delErr) throw delErr
      usersDeleted = userIds.length
    }

    console.log(
      `[cleanup-unagreed-users] pending ${dryRun ? 'candidates' : 'deleted'}=${pendingIds.length}, ` +
        `users ${dryRun ? 'candidates' : 'deleted'}=${userIds.length}`,
    )

    return NextResponse.json({
      success: true,
      dryRun,
      pending: { candidates: pendingIds.length, deleted: pendingDeleted },
      users: { candidates: userIds.length, deleted: usersDeleted },
      hours: CLEANUP_AFTER_HOURS,
      durationMs: Date.now() - startedAt,
    })
  } catch (error: any) {
    console.error('[cleanup-unagreed-users] 오류:', error)
    return NextResponse.json(
      { success: false, error: String(error?.message || error) },
      { status: 500 },
    )
  }
}
