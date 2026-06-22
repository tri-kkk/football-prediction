// app/api/baseball-toto/round/route.ts
// 야구토토 승1패 회차 조회
// GET /api/baseball-toto/round                     → 최신 회차
// GET /api/baseball-toto/round?year=2026&round=37  → 특정 회차
// GET /api/baseball-toto/round?history=true        → 회차 목록
// GET /api/baseball-toto/round?stats=true          → 적중률 통계

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year')
  const round = searchParams.get('round')
  const history = searchParams.get('history') === 'true'
  const stats = searchParams.get('stats') === 'true'

  try {
    if (history) {
      const limit = parseInt(searchParams.get('limit') || '10')
      const { data, error } = await supabase
        .from('baseball_toto_rounds')
        .select('id, year, round_number, total_matches, total_votes, estimated_prize, status, scraped_at')
        .order('year', { ascending: false })
        .order('round_number', { ascending: false })
        .limit(limit)
      if (error) throw error
      return NextResponse.json({ rounds: data })
    }

    if (stats) {
      const { data, error } = await supabase
        .from('baseball_toto_accuracy_stats').select('*').limit(20)
      if (error) throw error
      const totalMatches = data?.reduce((s, r) => s + (r.total_matches || 0), 0) || 0
      const totalCorrect = data?.reduce((s, r) => s + (r.correct_picks || 0), 0) || 0
      const overall = totalMatches > 0 ? Math.round((totalCorrect / totalMatches) * 1000) / 10 : 0
      return NextResponse.json({
        overall: { total_matches: totalMatches, correct: totalCorrect, accuracy: overall },
        rounds: data,
      })
    }

    let roundData: any = null
    let roundErr: any = null
    if (year && round) {
      const r = await supabase.from('baseball_toto_rounds').select('*')
        .eq('year', parseInt(year)).eq('round_number', parseInt(round)).limit(1).single()
      roundData = r.data; roundErr = r.error
    } else {
      // 기본: 투표가 있는(발매중/마감) 최신 회차 — 미발매(투표 0) 미래 회차는 제외
      const r = await supabase.from('baseball_toto_rounds').select('*')
        .gt('total_votes', 0)
        .order('year', { ascending: false }).order('round_number', { ascending: false })
        .limit(1).maybeSingle()
      roundData = r.data; roundErr = r.error
      // 폴백: 투표 있는 회차가 아직 없으면 최신 회차 아무거나
      if (!roundData) {
        const r2 = await supabase.from('baseball_toto_rounds').select('*')
          .order('year', { ascending: false }).order('round_number', { ascending: false })
          .limit(1).maybeSingle()
        roundData = r2.data; roundErr = r2.error
      }
    }
    if (roundErr || !roundData) {
      return NextResponse.json({ error: '회차 데이터 없음', message: '해당 회차를 찾을 수 없습니다.' }, { status: 404 })
    }

    const { data: matches, error: matchErr } = await supabase
      .from('baseball_toto_matches').select('*')
      .eq('round_id', roundData.id).order('match_number')
    if (matchErr) throw matchErr

    const gradeCount = {
      PICK: matches?.filter(m => m.grade === 'PICK').length || 0,
      GOOD: matches?.filter(m => m.grade === 'GOOD').length || 0,
      FAIR: matches?.filter(m => m.grade === 'FAIR').length || 0,
      PASS: matches?.filter(m => m.grade === 'PASS').length || 0,
    }
    const topDivergence = [...(matches || [])]
      .sort((a, b) => (b.max_divergence || 0) - (a.max_divergence || 0))
      .slice(0, 3)
      .map(m => ({
        match_number: m.match_number, home_team: m.home_team, away_team: m.away_team,
        max_divergence: m.max_divergence,
        divergence_win: m.divergence_win, divergence_one: m.divergence_one, divergence_lose: m.divergence_lose,
      }))
    const difficulty = gradeCount.PASS >= 3 ? 5 : gradeCount.PASS >= 2 ? 4
      : gradeCount.FAIR >= 3 ? 3 : gradeCount.PICK >= 6 ? 2 : 3

    const strategies = calculateBudgetStrategies(matches || [])

    return NextResponse.json({
      round: {
        id: roundData.id, year: roundData.year, round_number: roundData.round_number,
        total_votes: roundData.total_votes, estimated_prize: roundData.estimated_prize,
        status: roundData.status, scraped_at: roundData.scraped_at,
      },
      matches: matches || [],
      summary: { total_matches: matches?.length || 0, grade_count: gradeCount, difficulty, top_divergence: topDivergence },
      strategies,
    })
  } catch (error: any) {
    console.error('❌ 야구토토 조회 에러:', error)
    return NextResponse.json({ error: '데이터 조회 실패', message: error.message }, { status: 500 })
  }
}

// ===== 예산별 조합 전략 (승/1/패) =====
function calculateBudgetStrategies(matches: any[]) {
  return [
    {
      budget: 1000, label: '₩1,000 · 1매', description: '가장 자신있는 14경기 고정',
      combinations: 1,
      selections: matches.map(m => ({ match_number: m.match_number, picks: [m.primary_pick], count: 1 })),
    },
    { budget: 5000, label: '₩5,000 · 5매', description: '불확실 1경기 더블 + 1경기 트리플', combinations: 5, selections: calculateOptimalSelections(matches, 5) },
    { budget: 10000, label: '₩10,000 · 10매', description: '불확실 2경기 더블 + 1경기 트리플', combinations: 10, selections: calculateOptimalSelections(matches, 10) },
    { budget: 54000, label: '₩54,000 · 54매', description: 'FAIR/PASS 전부 더블 + 주요 변수 트리플', combinations: 54, selections: calculateOptimalSelections(matches, 54) },
  ]
}

function calculateOptimalSelections(matches: any[], target: number) {
  const sorted = [...matches].sort((a, b) => {
    const order: Record<string, number> = { PASS: 4, FAIR: 3, GOOD: 2, PICK: 1 }
    return (order[b.grade] || 0) - (order[a.grade] || 0)
  })
  const selections = matches.map(m => ({ match_number: m.match_number, picks: [m.primary_pick], count: 1 }))
  let combos = 1
  for (const match of sorted) {
    if (combos >= target) break
    const idx = selections.findIndex(s => s.match_number === match.match_number)
    if (idx === -1) continue
    if (selections[idx].count === 1 && match.secondary_pick) {
      selections[idx].picks.push(match.secondary_pick)
      selections[idx].count = 2
      combos *= 2
      if (combos >= target) break
    }
    if (selections[idx].count === 2 && match.grade === 'PASS') {
      const all = ['W', 'O', 'L']
      const missing = all.filter(p => !selections[idx].picks.includes(p))
      if (missing.length > 0) {
        selections[idx].picks.push(missing[0])
        selections[idx].count = 3
        combos = combos / 2 * 3
      }
    }
  }
  return selections
}
