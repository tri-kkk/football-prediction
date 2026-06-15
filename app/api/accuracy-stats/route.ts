// app/api/accuracy-stats/route.ts
// 백테스트 결과 기반 적중 통계 API
// PICK 등급 중심으로 표시

import { NextResponse } from 'next/server'

// 🛡️ DB outage 시 cascade timeout 방지 (기본 300초 → 15초)
export const maxDuration = 15
// 🚀 백테스트 결과 1시간 캐시 (적중률은 시간 단위로 변경 없음)
export const revalidate = 3600
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// predict-v2 핵심 로직 (간소화)
// ============================================

function calcPA(goals_for: number, goals_against: number): number {
  if (goals_against === 0) return goals_for > 0 ? 2.0 : 1.0
  return goals_for / goals_against
}

function calcWinRate(wins: number, games: number): number {
  if (games === 0) return 0.5
  return wins / games
}

function calculatePattern(homeProb: number, drawProb: number, awayProb: number): string {
  const max = Math.max(homeProb, drawProb, awayProb)
  const min = Math.min(homeProb, drawProb, awayProb)
  
  const getCode = (value: number): number => {
    if (value <= 0.05) return 0
    if (value >= 0.85) return 0
    if (value >= max - 0.03) return 1
    if (value <= min + 0.05) return 3
    return 2
  }
  
  return `${getCode(homeProb)}-${getCode(drawProb)}-${getCode(awayProb)}`
}

// 팀 통계 - 미리 일괄 로드해서 memory map으로 조회
type TeamStatsAgg = {
  total_played: number
  home_goals_for: number
  home_goals_against: number
  away_goals_for: number
  away_goals_against: number
  home_first_goal_games: number
  home_first_goal_wins: number
  away_first_goal_games: number
  away_first_goal_wins: number
  form_home_5: number | null
  form_away_5: number | null
  is_promoted: boolean
}

function aggregateTeamSeasons(seasons: any[]): TeamStatsAgg | null {
  if (!seasons || seasons.length === 0) return null
  // 최신 시즌 우선 (season DESC)
  const sorted = [...seasons].sort((a, b) =>
    String(b.season).localeCompare(String(a.season))
  )
  const agg: TeamStatsAgg = {
    total_played: 0,
    home_goals_for: 0,
    home_goals_against: 0,
    away_goals_for: 0,
    away_goals_against: 0,
    home_first_goal_games: 0,
    home_first_goal_wins: 0,
    away_first_goal_games: 0,
    away_first_goal_wins: 0,
    form_home_5: sorted[0].form_home_5,
    form_away_5: sorted[0].form_away_5,
    is_promoted: sorted[0].is_promoted || false,
  }
  for (const s of sorted) {
    agg.total_played += s.total_played || 0
    agg.home_goals_for += s.home_goals_for || 0
    agg.home_goals_against += s.home_goals_against || 0
    agg.away_goals_for += s.away_goals_for || 0
    agg.away_goals_against += s.away_goals_against || 0
    agg.home_first_goal_games += s.home_first_goal_games || 0
    agg.home_first_goal_wins += s.home_first_goal_wins || 0
    agg.away_first_goal_games += s.away_first_goal_games || 0
    agg.away_first_goal_wins += s.away_first_goal_wins || 0
  }
  return agg
}

function predictMatch(
  match: any,
  teamStatsMap: Map<number, TeamStatsAgg>,
  patternMap: Map<string, any>
): {
  predictedWinner: 'HOME' | 'DRAW' | 'AWAY' | 'SKIP'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  grade: 'PICK' | 'GOOD' | 'PASS'
  homeProb: number
  drawProb: number
  awayProb: number
} | null {

  const homeStats = teamStatsMap.get(match.home_team_id)
  const awayStats = teamStatsMap.get(match.away_team_id)

  if (!homeStats || !awayStats) return null
  if (homeStats.total_played < 5 || awayStats.total_played < 5) return null
  
  // P/A 계산
  const homePA_all = calcPA(homeStats.home_goals_for, homeStats.home_goals_against)
  const awayPA_all = calcPA(awayStats.away_goals_for, awayStats.away_goals_against)
  const homeFormPA = homeStats.form_home_5 || 1.0
  const awayFormPA = awayStats.form_away_5 || 1.0
  
  // 선제골 승률
  const homeFirstGoalWinRate = calcWinRate(homeStats.home_first_goal_wins, homeStats.home_first_goal_games)
  const awayFirstGoalWinRate = calcWinRate(awayStats.away_first_goal_wins, awayStats.away_first_goal_games)
  
  // Method 1: P/A 비교
  const paTotal = homePA_all + awayPA_all
  let method1_win = paTotal > 0 ? homePA_all / paTotal : 0.4
  let method1_lose = paTotal > 0 ? awayPA_all / paTotal : 0.4
  let method1_draw = 1 - method1_win - method1_lose
  if (method1_draw < 0.15) method1_draw = 0.15
  const m1_total = method1_win + method1_draw + method1_lose
  method1_win /= m1_total; method1_draw /= m1_total; method1_lose /= m1_total
  
  // Method 2: Min-Max
  const homeMin = Math.min(homePA_all, homeFormPA)
  const homeMax = Math.max(homePA_all, homeFormPA)
  const awayMin = Math.min(awayPA_all, awayFormPA)
  const awayMax = Math.max(awayPA_all, awayFormPA)
  
  const minmin = homeMin / (homeMin + awayMax) || 0.33
  const maxmin = homeMax / (homeMax + awayMax) || 0.33
  const minmax = homeMin / (homeMin + awayMin) || 0.33
  
  let method2_win = (minmin + maxmin + minmax) / 3
  let method2_lose = 1 - method2_win - 0.25
  let method2_draw = 0.25
  const m2_total = method2_win + method2_draw + method2_lose
  method2_win /= m2_total; method2_draw /= m2_total; method2_lose /= m2_total
  
  // Method 3: 선제골 시나리오
  const homeScoreFirst = 0.55
  const awayScoreFirst = 1 - homeScoreFirst
  let method3_win = homeScoreFirst * homeFirstGoalWinRate + awayScoreFirst * (1 - awayFirstGoalWinRate) * 0.3
  let method3_lose = awayScoreFirst * awayFirstGoalWinRate + homeScoreFirst * (1 - homeFirstGoalWinRate) * 0.3
  let method3_draw = 1 - method3_win - method3_lose
  if (method3_draw < 0.05) method3_draw = 0.05
  if (method3_draw > 0.40) method3_draw = 0.40
  const m3_total = method3_win + method3_draw + method3_lose
  method3_win /= m3_total; method3_draw /= m3_total; method3_lose /= m3_total
  
  // 3 Method 평균
  let avgWin = (method1_win + method2_win + method3_win) / 3
  let avgDraw = (method1_draw + method2_draw + method3_draw) / 3
  let avgLose = (method1_lose + method2_lose + method3_lose) / 3
  const avgTotal = avgWin + avgDraw + avgLose
  avgWin /= avgTotal; avgDraw /= avgTotal; avgLose /= avgTotal
  
  // 패턴 반영 (메모리 Map 조회 - DB 안 거침)
  const pattern = calculatePattern(avgWin, avgDraw, avgLose)
  const patternData = patternMap.get(pattern) || null

  let finalWin = avgWin, finalDraw = avgDraw, finalLose = avgLose
  
  if (patternData && patternData.total_matches >= 10) {
    const PATTERN_WEIGHT = 0.5
    finalWin = avgWin * (1 - PATTERN_WEIGHT) + patternData.home_win_rate * PATTERN_WEIGHT
    finalDraw = avgDraw * (1 - PATTERN_WEIGHT) + patternData.draw_rate * PATTERN_WEIGHT
    finalLose = avgLose * (1 - PATTERN_WEIGHT) + patternData.away_win_rate * PATTERN_WEIGHT
    const finalTotal = finalWin + finalDraw + finalLose
    finalWin /= finalTotal; finalDraw /= finalTotal; finalLose /= finalTotal
  }
  
  // 분석
  let predictedWinner: 'HOME' | 'DRAW' | 'AWAY' | 'SKIP' = 'HOME'
  const maxProb = Math.max(finalWin, finalDraw, finalLose)
  if (finalWin === maxProb) predictedWinner = 'HOME'
  else if (finalLose === maxProb) predictedWinner = 'AWAY'
  else predictedWinner = 'DRAW'
  
  const probDiff = maxProb - Math.min(finalWin, finalDraw, finalLose)
  
  // 신뢰도
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
  if (probDiff >= 0.20) confidence = 'HIGH'
  else if (probDiff >= 0.12) confidence = 'MEDIUM'
  
  // 등급
  let grade: 'PICK' | 'GOOD' | 'PASS' = 'PASS'
  const minGames = Math.min(homeStats.total_played, awayStats.total_played)
  
  if (probDiff >= 0.25 && minGames >= 40 && 
      ((predictedWinner === 'HOME' && homeFirstGoalWinRate >= 0.70) ||
       (predictedWinner === 'AWAY' && awayFirstGoalWinRate >= 0.65))) {
    grade = 'PICK'
  } else if (probDiff >= 0.15 && minGames >= 20) {
    grade = 'GOOD'
  }
  
  if (probDiff < 0.08) {
    predictedWinner = 'SKIP'
    grade = 'PASS'
  }
  
  return {
    predictedWinner,
    confidence,
    grade,
    homeProb: Math.round(finalWin * 1000) / 10,
    drawProb: Math.round(finalDraw * 1000) / 10,
    awayProb: Math.round(finalLose * 1000) / 10,
  }
}

// ============================================
// API 핸들러
// ============================================

export async function GET() {
  const startTime = Date.now()

  try {
    // ============================================
    // 1) 모든 데이터 일괄 fetch (3 DB call)
    // ============================================

    // 1-1) 24-25 시즌 종료된 경기 (최근 300경기)
    const matchesPromise = supabase
      .from('fg_match_history')
      .select('*')
      .eq('status', 'FINISHED')
      .in('season', ['2024', '2025'])
      .order('match_date', { ascending: false })
      .limit(300)

    // 1-2) 글로벌 패턴 (league_id IS NULL) — 한 번만 fetch
    const patternsPromise = supabase
      .from('fg_patterns')
      .select('*')
      .is('league_id', null)

    const [
      { data: matches, error: matchesError },
      { data: allPatterns },
    ] = await Promise.all([matchesPromise, patternsPromise])

    if (matchesError) throw matchesError
    if (!matches || matches.length === 0) {
      return NextResponse.json({ success: false, error: 'No matches found' })
    }

    const patternMap = new Map<string, any>(
      (allPatterns || []).map((p: any) => [p.pattern, p])
    )

    // 1-3) 등장하는 모든 team_id 추출 → fg_team_stats 일괄 fetch
    const teamIdSet = new Set<number>()
    for (const m of matches) {
      if (m.home_team_id) teamIdSet.add(m.home_team_id)
      if (m.away_team_id) teamIdSet.add(m.away_team_id)
    }
    const teamIds = Array.from(teamIdSet)

    const { data: allTeamSeasons } = await supabase
      .from('fg_team_stats')
      .select('*')
      .in('team_id', teamIds)

    // team_id별로 시즌 묶기
    const seasonsByTeam = new Map<number, any[]>()
    for (const row of allTeamSeasons || []) {
      const arr = seasonsByTeam.get(row.team_id) || []
      arr.push(row)
      seasonsByTeam.set(row.team_id, arr)
    }
    const teamStatsMap = new Map<number, TeamStatsAgg>()
    Array.from(seasonsByTeam.entries()).forEach(([tid, seasons]) => {
      const agg = aggregateTeamSeasons(seasons)
      if (agg) teamStatsMap.set(tid, agg)
    })

    // ============================================
    // 2) 백테스트 실행 (메모리만 — DB 호출 없음)
    // ============================================
    let total = 0, hits = 0, skipped = 0

    const byGrade: Record<string, { total: number; hits: number }> = {
      PICK: { total: 0, hits: 0 },
      GOOD: { total: 0, hits: 0 },
      PASS: { total: 0, hits: 0 }
    }

    const byLeague: Record<string, { total: number; hits: number }> = {}
    const recentResults: any[] = []

    for (const match of matches) {
      const prediction = predictMatch(match, teamStatsMap, patternMap)
      
      if (!prediction || prediction.predictedWinner === 'SKIP') {
        skipped++
        continue
      }
      
      total++
      const actualResult = match.result?.toUpperCase()
      const isHit = prediction.predictedWinner === actualResult
      if (isHit) hits++
      
      // 등급별
      byGrade[prediction.grade].total++
      if (isHit) byGrade[prediction.grade].hits++
      
      // 리그별
      const leagueCode = match.league_code || 'OTHER'
      if (!byLeague[leagueCode]) byLeague[leagueCode] = { total: 0, hits: 0 }
      byLeague[leagueCode].total++
      if (isHit) byLeague[leagueCode].hits++
      
      // 최근 결과 (PICK만, 최대 20개)
      if (prediction.grade === 'PICK' && recentResults.length < 20) {
        recentResults.push({
          fixtureId: match.fixture_id,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          homeLogo: `https://media.api-sports.io/football/teams/${match.home_team_id}.png`,
          awayLogo: `https://media.api-sports.io/football/teams/${match.away_team_id}.png`,
          prediction: prediction.predictedWinner,
          confidence: prediction.confidence,
          actual: actualResult,
          score: `${match.home_score}-${match.away_score}`,
          isHit,
          date: match.match_date,
          league: leagueCode
        })
      }
    }
    
    // 리그별 정렬
    const leagueStats = Object.entries(byLeague)
      .map(([code, data]) => ({
        code,
        name: getLeagueName(code),
        matches: data.total,
        hits: data.hits,
        accuracy: data.total > 0 ? Math.round((data.hits / data.total) * 1000) / 10 : 0
      }))
      .filter(l => l.matches >= 5)
      .sort((a, b) => b.accuracy - a.accuracy)
    
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      data: {
        // 전체 (PICK 기준)
        totalMatches: byGrade.PICK.total,
        totalHits: byGrade.PICK.hits,
        overallAccuracy: byGrade.PICK.total > 0 
          ? Math.round((byGrade.PICK.hits / byGrade.PICK.total) * 1000) / 10 
          : 0,
        
        // 현 시즌 = 전체 (24-25만 조회)
        season25Matches: byGrade.PICK.total,
        season25Hits: byGrade.PICK.hits,
        season25Accuracy: byGrade.PICK.total > 0 
          ? Math.round((byGrade.PICK.hits / byGrade.PICK.total) * 1000) / 10 
          : 0,
        
        // 등급별 (PICK/GOOD/PASS → HIGH/MEDIUM/LOW로 매핑)
        byConfidence: {
          HIGH: {
            matches: byGrade.PICK.total,
            hits: byGrade.PICK.hits,
            accuracy: byGrade.PICK.total > 0 
              ? Math.round((byGrade.PICK.hits / byGrade.PICK.total) * 1000) / 10 
              : 0
          },
          MEDIUM: {
            matches: byGrade.GOOD.total,
            hits: byGrade.GOOD.hits,
            accuracy: byGrade.GOOD.total > 0 
              ? Math.round((byGrade.GOOD.hits / byGrade.GOOD.total) * 1000) / 10 
              : 0
          },
          LOW: {
            matches: byGrade.PASS.total,
            hits: byGrade.PASS.hits,
            accuracy: byGrade.PASS.total > 0 
              ? Math.round((byGrade.PASS.hits / byGrade.PASS.total) * 1000) / 10 
              : 0
          }
        },
        
        // 리그별
        byLeague: leagueStats,
        
        // 최근 결과 (PICK만)
        recentResults,
        
        // 메타
        totalAnalyzed: total,
        skipped,
        duration: `${duration}ms`
      }
    })
    
  } catch (error: any) {
    console.error('Accuracy stats error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

function getLeagueName(code: string): string {
  const map: Record<string, string> = {
    'PL': 'Premier League',
    'PD': 'La Liga',
    'BL1': 'Bundesliga',
    'SA': 'Serie A',
    'FL1': 'Ligue 1',
    'DED': 'Eredivisie',
    'CL': 'Champions League',
    'EL': 'Europa League'
  }
  return map[code] || code
}
