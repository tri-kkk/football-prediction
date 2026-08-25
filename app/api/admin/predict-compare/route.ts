// app/api/admin/predict-compare/route.ts
// [진단] 메인(predict-v2 → pick_recommendations) vs 코치(ksmModel via coachMatchService)
// 두 엔진이 같은 경기에서 승률/픽/등급이 얼마나 다른지 수치화. READ-ONLY.
//   GET                → 전체 리그
//   GET ?league=PL     → 특정 리그만
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LEAGUES } from '@/lib/ksmModel'
import { getMatchesWithSignals } from '@/lib/coachMatchService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type P = { home: number; draw: number; away: number }
const argmax = (p: P): 'HOME' | 'DRAW' | 'AWAY' => {
  if (p.home >= p.draw && p.home >= p.away) return 'HOME'
  if (p.away >= p.home && p.away >= p.draw) return 'AWAY'
  return 'DRAW'
}
const r1 = (n: number) => Math.round(n * 10) / 10

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const one = url.searchParams.get('league')
  const leagues = one ? [one] : Object.keys(LEAGUES)

  // 1) 코치 시그널 (ksmModel 모델 승률)
  const coachAll: any[] = []
  for (const lc of leagues) {
    const ms = await getMatchesWithSignals(lc).catch(() => [])
    for (const m of ms) coachAll.push({ ...m, _league: lc })
  }
  const ids = coachAll.map((m) => String(m.matchId))

  // 2) 메인 예측 (pick_recommendations)
  const recMap = new Map<string, any>()
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const { data } = await supabase
      .from('pick_recommendations')
      .select('match_id, pick_result, home_probability, draw_probability, away_probability')
      .in('match_id', chunk)
    for (const r of data || []) recMap.set(String(r.match_id), r)
  }

  // 3) 대조
  const rows: any[] = []
  for (const m of coachAll) {
    const rec = recMap.get(String(m.matchId))
    if (!rec || !m.model) continue
    const coach: P = { home: m.model.home * 100, draw: m.model.draw * 100, away: m.model.away * 100 }
    const main: P = { home: rec.home_probability, draw: rec.draw_probability, away: rec.away_probability }
    const dHome = Math.abs(coach.home - main.home)
    const dDraw = Math.abs(coach.draw - main.draw)
    const dAway = Math.abs(coach.away - main.away)
    const maxDelta = Math.max(dHome, dDraw, dAway)
    const coachPick = argmax(m.model)
    const mainPick = (rec.pick_result || '').toUpperCase()
    const agree = coachPick === mainPick
    const opposite =
      (coachPick === 'HOME' && mainPick === 'AWAY') || (coachPick === 'AWAY' && mainPick === 'HOME')
    rows.push({
      match: `${m.home} vs ${m.away}`,
      league: m._league,
      coach: { home: r1(coach.home), draw: r1(coach.draw), away: r1(coach.away), pick: coachPick, grade: m.signal?.grade ?? null },
      main: { home: r1(main.home), draw: r1(main.draw), away: r1(main.away), pick: mainPick },
      maxDelta: r1(maxDelta),
      agree,
      opposite,
    })
  }

  rows.sort((a, b) => b.maxDelta - a.maxDelta)
  const matched = rows.length
  const agreeN = rows.filter((r) => r.agree).length
  const oppositeN = rows.filter((r) => r.opposite).length
  const avgMaxDelta = matched ? r1(rows.reduce((s, r) => s + r.maxDelta, 0) / matched) : 0

  return NextResponse.json({
    summary: {
      coachMatches: coachAll.length,
      mainPredictions: recMap.size,
      matched,
      pickAgreePct: matched ? Math.round((agreeN / matched) * 100) : 0,
      oppositePicks: oppositeN,
      avgMaxProbDelta: avgMaxDelta,
      onlyCoachNoMain: coachAll.length - matched,
    },
    worst: rows.slice(0, 20),
  })
}
