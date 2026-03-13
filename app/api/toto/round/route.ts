// app/api/toto/round/route.ts
// 토토 회차 데이터 조회 API
// GET /api/toto/round                → 최신 회차
// GET /api/toto/round?year=2026&round=10  → 특정 회차
// GET /api/toto/round?history=true   → 최근 회차 목록

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year')
  const round = searchParams.get('round')
  const history = searchParams.get('history') === 'true'
  const stats = searchParams.get('stats') === 'true'
  
  try {
    // --- 회차 목록 ---
    if (history) {
      const limit = parseInt(searchParams.get('limit') || '10')
      const { data, error } = await supabase
        .from('toto_rounds')
        .select('id, year, round_number, total_matches, total_votes, estimated_prize, status, scraped_at')
        .order('year', { ascending: false })
        .order('round_number', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      return NextResponse.json({ rounds: data })
    }
    
    // --- 적중률 통계 ---
    if (stats) {
      const { data, error } = await supabase
        .from('toto_accuracy_stats')
        .select('*')
        .limit(20)
      
      if (error) throw error
      
      // 전체 통계 계산
      const totalMatches = data?.reduce((s, r) => s + r.total_matches, 0) || 0
      const totalCorrect = data?.reduce((s, r) => s + r.correct_picks, 0) || 0
      const overallAccuracy = totalMatches > 0 ? Math.round((totalCorrect / totalMatches) * 1000) / 10 : 0
      
      return NextResponse.json({
        overall: { total_matches: totalMatches, correct: totalCorrect, accuracy: overallAccuracy },
        rounds: data,
      })
    }
    
    // --- 특정 회차 또는 최신 회차 ---
    let roundQuery = supabase
      .from('toto_rounds')
      .select('*')
    
    if (year && round) {
      roundQuery = roundQuery.eq('year', parseInt(year)).eq('round_number', parseInt(round))
    } else {
      // 최신 회차
      roundQuery = roundQuery.order('year', { ascending: false }).order('round_number', { ascending: false })
    }
    
    const { data: roundData, error: roundErr } = await roundQuery.limit(1).single()
    
    if (roundErr || !roundData) {
      return NextResponse.json(
        { error: '회차 데이터 없음', message: '해당 회차를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 경기 데이터
    const { data: matches, error: matchErr } = await supabase
      .from('toto_matches')
      .select('*')
      .eq('round_id', roundData.id)
      .order('match_number')
    
    if (matchErr) throw matchErr
    
    // 요약 통계 계산
    const gradeCount = {
      PICK: matches?.filter(m => m.grade === 'PICK').length || 0,
      GOOD: matches?.filter(m => m.grade === 'GOOD').length || 0,
      FAIR: matches?.filter(m => m.grade === 'FAIR').length || 0,
      PASS: matches?.filter(m => m.grade === 'PASS').length || 0,
    }
    
    // 괴리율 TOP 3
    const topDivergence = [...(matches || [])]
      .sort((a, b) => (b.max_divergence || 0) - (a.max_divergence || 0))
      .slice(0, 3)
      .map(m => ({
        match_number: m.match_number,
        home_team: m.home_team,
        away_team: m.away_team,
        max_divergence: m.max_divergence,
        divergence_win: m.divergence_win,
        divergence_draw: m.divergence_draw,
        divergence_lose: m.divergence_lose,
      }))
    
    // 난이도 평가
    const difficulty = gradeCount.PASS >= 3 ? 5 :
                       gradeCount.PASS >= 2 ? 4 :
                       gradeCount.FAIR >= 3 ? 3 :
                       gradeCount.PICK >= 6 ? 2 : 3
    
    // 예산별 추천 조합 계산
    const budgetStrategies = calculateBudgetStrategies(matches || [])
    
    return NextResponse.json({
      round: {
        id: roundData.id,
        year: roundData.year,
        round_number: roundData.round_number,
        total_votes: roundData.total_votes,
        estimated_prize: roundData.estimated_prize,
        status: roundData.status,
        scraped_at: roundData.scraped_at,
      },
      matches: matches || [],
      summary: {
        total_matches: matches?.length || 0,
        grade_count: gradeCount,
        difficulty,
        top_divergence: topDivergence,
      },
      strategies: budgetStrategies,
    })
    
  } catch (error: any) {
    console.error('❌ 토토 데이터 조회 에러:', error)
    return NextResponse.json(
      { error: '데이터 조회 실패', message: error.message },
      { status: 500 }
    )
  }
}

// ===== 예산별 조합 전략 =====
function calculateBudgetStrategies(matches: any[]) {
  // 경기별 선택 수 결정
  const getSelections = (match: any, aggressive: boolean = false) => {
    if (match.grade === 'PICK') return 1 // 고정
    if (match.grade === 'GOOD') return aggressive ? 2 : 1
    if (match.grade === 'FAIR') return 2 // 더블
    return aggressive ? 3 : 2 // PASS = 트리플 or 더블
  }
  
  const strategies = [
    {
      budget: 1000,
      label: '₩1,000 · 1매',
      description: '가장 자신있는 14경기 고정',
      combinations: 1,
      selections: matches.map(m => ({
        match_number: m.match_number,
        picks: [m.primary_pick],
        count: 1,
      })),
    },
    {
      budget: 5000,
      label: '₩5,000 · 5매',
      description: '가장 불확실한 1경기 더블 + 나머지 트리플 1개',
      combinations: 5,
      selections: calculateOptimalSelections(matches, 5),
    },
    {
      budget: 10000,
      label: '₩10,000 · 10매',
      description: '불확실한 2경기 더블 + 1경기 트리플 가능',
      combinations: 10,
      selections: calculateOptimalSelections(matches, 10),
    },
    {
      budget: 54000,
      label: '₩54,000 · 54매',
      description: 'FAIR/PASS 전부 더블 + 주요 변수 트리플',
      combinations: 54,
      selections: calculateOptimalSelections(matches, 54),
    },
  ]
  
  return strategies
}

function calculateOptimalSelections(matches: any[], targetCombinations: number) {
  // 괴리율 높은 순으로 정렬하여 더블/트리플 할당
  const sorted = [...matches].sort((a, b) => {
    // PASS > FAIR > GOOD > PICK 순으로 더블/트리플 우선
    const gradeOrder: Record<string, number> = { PASS: 4, FAIR: 3, GOOD: 2, PICK: 1 }
    return (gradeOrder[b.grade] || 0) - (gradeOrder[a.grade] || 0)
  })
  
  const selections = matches.map(m => ({
    match_number: m.match_number,
    picks: [m.primary_pick],
    count: 1,
  }))
  
  let currentCombinations = 1
  
  for (const match of sorted) {
    if (currentCombinations >= targetCombinations) break
    
    const idx = selections.findIndex(s => s.match_number === match.match_number)
    if (idx === -1) continue
    
    // 더블로 확장
    if (selections[idx].count === 1 && match.secondary_pick) {
      selections[idx].picks.push(match.secondary_pick)
      selections[idx].count = 2
      currentCombinations *= 2
      
      if (currentCombinations >= targetCombinations) break
    }
    
    // 트리플로 확장 (PASS 등급만)
    if (selections[idx].count === 2 && match.grade === 'PASS') {
      const allPicks = ['W', 'D', 'L']
      const missing = allPicks.filter(p => !selections[idx].picks.includes(p))
      if (missing.length > 0) {
        selections[idx].picks.push(missing[0])
        selections[idx].count = 3
        currentCombinations = currentCombinations / 2 * 3
      }
    }
  }
  
  return selections
}
