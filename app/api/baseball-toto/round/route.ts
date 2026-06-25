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

    // 누적 적중률 / 1점차 예측 정확도 (baseball_toto_calibration)
    let track: any = null
    try {
      const { data: calib } = await supabase
        .from('baseball_toto_calibration')
        .select('decided, pred_one_avg, actual_one_rate, primary_hits, graded, round_id')
        .order('id', { ascending: false }).limit(80)
      let hits = 0, graded = 0, dec = 0, predW = 0, actW = 0
      const rset = new Set<number>()
      for (const c of calib || []) {
        hits += c.primary_hits || 0
        graded += c.graded || 0
        dec += c.decided || 0
        predW += (Number(c.pred_one_avg) || 0) / 100 * (c.decided || 0)
        actW += (Number(c.actual_one_rate) || 0) / 100 * (c.decided || 0)
        rset.add(c.round_id)
      }
      if (graded > 0) {
        track = {
          hit_rate: Math.round((100 * hits / graded) * 10) / 10,
          graded,
          rounds: rset.size,
          pred_one_avg: dec ? Math.round((predW / dec) * 1000) / 10 : null,
          actual_one_rate: dec ? Math.round((actW / dec) * 1000) / 10 : null,
        }
      }
    } catch {}

    return NextResponse.json({
      round: {
        id: roundData.id, year: roundData.year, round_number: roundData.round_number,
        total_votes: roundData.total_votes, estimated_prize: roundData.estimated_prize,
        status: roundData.status, scraped_at: roundData.scraped_at,
      },
      matches: matches || [],
      summary: { total_matches: matches?.length || 0, grade_count: gradeCount, difficulty, top_divergence: topDivergence },
      strategies,
      track,
    })
  } catch (error: any) {
    console.error('❌ 야구토토 조회 에러:', error)
    return NextResponse.json({ error: '데이터 조회 실패', message: error.message }, { status: 500 })
  }
}

// ===== 예산별 조합 전략 (승/1/패) =====
// 목표 최대 조합수(매수)를 넘지 않게 확장하고, 실제 조합수로 금액·라벨 표기.
// (₩1,000 × 조합수 = 총구매금액 — 와이즈토토 슬립과 일치)
function calculateBudgetStrategies(matches: any[]) {
  const targets = [
    { max: 1,  desc: '가장 자신있는 14경기 고정' },
    { max: 6,  desc: '불확실 경기 더블/트리플 (최대 6매)' },
    { max: 12, desc: '불확실 경기 더블/트리플 (최대 12매)' },
    { max: 54, desc: 'FAIR/PASS 더블 + 주요 변수 트리플 (최대 54매)' },
  ]
  return targets.map(t => {
    const { selections, combos } = buildSelections(matches, t.max)
    return {
      budget: combos * 1000,
      label: `₩${(combos * 1000).toLocaleString()} · ${combos}매`,
      description: t.desc,
      combinations: combos,
      selections,
    }
  })
}

// 목표 조합수(maxCombos)를 절대 초과하지 않도록 더블(×2)/트리플(×1.5) 확장.
// 실제 달성 조합수(combos)도 함께 반환.
function buildSelections(matches: any[], maxCombos: number) {
  const sorted = [...matches].sort((a, b) => {
    const order: Record<string, number> = { PASS: 4, FAIR: 3, GOOD: 2, PICK: 1 }
    return (order[b.grade] || 0) - (order[a.grade] || 0)
  })
  const selections = matches.map(m => ({ match_number: m.match_number, picks: [m.primary_pick], count: 1 }))
  const find = (id: number) => selections.find(s => s.match_number === id)!
  let combos = 1
  for (const match of sorted) {
    const s = find(match.match_number)
    // 더블: count 1 → 2 (조합수 ×2)
    if (s.count === 1 && match.secondary_pick && combos * 2 <= maxCombos) {
      s.picks.push(match.secondary_pick)
      s.count = 2
      combos *= 2
    }
    // 트리플: PASS, count 2 → 3 (조합수 ×1.5)
    if (s.count === 2 && match.grade === 'PASS' && (combos / 2) * 3 <= maxCombos) {
      const missing = ['W', 'O', 'L'].filter(p => !s.picks.includes(p))
      if (missing.length > 0) {
        s.picks.push(missing[0])
        s.count = 3
        combos = (combos / 2) * 3
      }
    }
  }
  return { selections, combos }
}
