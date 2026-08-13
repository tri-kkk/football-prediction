// app/api/cron/cleanup-unagreed-users/route.ts
//
// 🧹 부록B: 약관 미동의 유령 계정 정리 cron (서버 배치 · 앱 작업 불필요)
//    소셜 인증 시점에 users 행이 생성되지만, 약관 화면에서 이탈하면
//    terms_agreed_at 이 NULL 인 채로 계정이 남는다. 이 계정들을 주기 정리한다.
//
// 정리 조건: terms_agreed_at IS NULL  AND  created_at < now() - CLEANUP_AFTER_HOURS
// 재로그인 시 OAuth 가 계정을 다시 생성하므로 삭제는 안전하다.
//
// 🔒 보안: 파괴적 작업이므로 CRON_SECRET Bearer 인증 필수.
//    pg_cron 등록 시 헤더에 `Authorization: Bearer <CRON_SECRET>` 를 넣을 것.
//
// 호출 예: 매시간 pg_cron. ?dryRun=true 로 삭제 없이 대상 수만 확인 가능.
// 응답: { success, dryRun, candidates, deleted, hours }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// 약관 미동의 계정을 정리하기까지의 유예 시간(시간). 필요 시 조정.
const CLEANUP_AFTER_HOURS = 48

// 유저 삭제 시 함께 지울 연관 테이블 (user/delete 로직과 동일 · best-effort)
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

  try {
    const cutoffIso = new Date(Date.now() - CLEANUP_AFTER_HOURS * 3600_000).toISOString()

    // 1) 약관 미동의 + 유예시간 경과 계정 조회
    const { data: ghosts, error: findErr } = await supabase
      .from('users')
      .select('id, email, created_at')
      .is('terms_agreed_at', null)
      .lt('created_at', cutoffIso)

    if (findErr) throw findErr

    const targets = ghosts ?? []
    if (dryRun || targets.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        candidates: targets.length,
        deleted: 0,
        hours: CLEANUP_AFTER_HOURS,
        durationMs: Date.now() - startedAt,
      })
    }

    const userIds = targets.map((u) => u.id)

    // 2) 연관 행 정리 (best-effort — 없으면 그냥 통과)
    for (const table of RELATED_TABLES) {
      const { error } = await supabase.from(table).delete().in('user_id', userIds)
      if (error) console.warn(`[cleanup-unagreed-users] ${table} 삭제 경고:`, error.message)
    }

    // 3) users 행 삭제
    const { error: delErr } = await supabase.from('users').delete().in('id', userIds)
    if (delErr) throw delErr

    console.log(`[cleanup-unagreed-users] 삭제 ${userIds.length}건 (>${CLEANUP_AFTER_HOURS}h 미동의)`)

    return NextResponse.json({
      success: true,
      dryRun: false,
      candidates: targets.length,
      deleted: userIds.length,
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
