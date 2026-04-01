// app/api/baseball/cron/update-combo-results/route.ts
// 조합 픽 결과 자동 업데이트
// - pending 상태의 조합 픽을 확인
// - 경기 결과(FT)가 나온 경우 적중/미적중 판정
// - 모든 경기가 끝나면 조합 전체 결과 업데이트

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // 인증
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('🔄 조합 픽 결과 업데이트 시작')

  // 1. pending 상태의 조합 픽 조회 (최근 7일)
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const weekAgo = new Date(kstNow.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: pendingPicks, error } = await supabase
    .from('baseball_combo_picks')
    .select('*')
    .eq('result', 'pending')
    .gte('pick_date', weekAgo)

  if (error || !pendingPicks || pendingPicks.length === 0) {
    console.log('  ⏭️ 업데이트할 조합 없음')
    return NextResponse.json({ success: true, updated: 0 })
  }

  console.log(`  📋 확인할 조합: ${pendingPicks.length}개`)

  let updated = 0

  for (const combo of pendingPicks) {
    const picks = combo.picks as any[]
    const matchIds = picks.map((p: any) => p.matchId)

    // 해당 경기들의 결과 조회
    const { data: matches } = await supabase
      .from('baseball_matches')
      .select('api_match_id, home_team, away_team, home_score, away_score, status')
      .in('api_match_id', matchIds)

    if (!matches) continue

    // 경기 결과 매핑
    const matchResults = new Map(matches.map(m => [m.api_match_id, m]))

    let allFinished = true
    let correctCount = 0
    let totalDecided = 0
    const updatedPicks = [...picks]

    for (let idx = 0; idx < picks.length; idx++) {
      const pick = picks[idx]
      const match = matchResults.get(pick.matchId)
      if (!match) { allFinished = false; continue }

      if (match.status !== 'FT') {
        allFinished = false
        continue
      }

      totalDecided++

      // 승리팀 판정
      const homeWon = match.home_score > match.away_score
      const pickCorrect = (pick.pick === 'home' && homeWon) || (pick.pick === 'away' && !homeWon)

      if (pickCorrect) correctCount++

      // 개별 경기 결과를 picks에 기록
      updatedPicks[idx] = {
        ...pick,
        homeScore: match.home_score,
        awayScore: match.away_score,
        isCorrect: pickCorrect,
        matchStatus: 'FT',
      }
    }

    // 모든 경기가 끝났으면 결과 업데이트
    if (allFinished && totalDecided === picks.length) {
      const result = correctCount === picks.length ? 'win' :
                     correctCount === 0 ? 'lose' : 'partial'

      const { error: updateError } = await supabase
        .from('baseball_combo_picks')
        .update({
          result,
          correct_count: correctCount,
          picks: updatedPicks,
          updated_at: new Date().toISOString(),
        })
        .eq('id', combo.id)

      if (!updateError) {
        updated++
        console.log(`  ✅ 조합 #${combo.id} (${combo.league} ${combo.fold_count}F): ${result} (${correctCount}/${picks.length})`)
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n⏱️ 완료: ${updated}개 업데이트 (${elapsed}s)`)

  return NextResponse.json({
    success: true,
    checked: pendingPicks.length,
    updated,
    elapsed: `${elapsed}s`,
  })
}
