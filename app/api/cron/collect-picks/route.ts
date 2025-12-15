// app/api/cron/collect-picks/route.ts
// 🔥 자동 PICK 수집 Cron Job
// 예정된 경기를 자동으로 분석하여 PICK 등급 경기 저장
// 권장: 하루 2-3회 실행 (경기 시작 6시간 전쯤)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 리그 설정
const LEAGUES_TO_ANALYZE = [
  { code: 'PL', leagueId: 39 },
  { code: 'PD', leagueId: 140 },
  { code: 'BL1', leagueId: 78 },
  { code: 'SA', leagueId: 135 },
  { code: 'FL1', leagueId: 61 },
  { code: 'CL', leagueId: 2 },
  { code: 'EL', leagueId: 3 },
  { code: 'PPL', leagueId: 94 },
  { code: 'DED', leagueId: 88 },
]

// ============================================
// 예측 알고리즘 (predict-v2와 동일)
// ============================================

function calcPA(goals_for: number, goals_against: number): number {
  if (goals_against === 0) return goals_for > 0 ? 2.0 : 1.0
  return goals_for / goals_against
}

function calcWinRate(wins: number, games: number): number {
  if (games === 0) return 0.5
  return wins / games
}

function calcMinMaxCombination(
  homeAll: number, homeFive: number,
  awayAll: number, awayFive: number
): { minmin: number; maxmin: number; minmax: number } {
  const homeMin = Math.min(homeAll, homeFive)
  const homeMax = Math.max(homeAll, homeFive)
  const awayMin = Math.min(awayAll, awayFive)
  const awayMax = Math.max(awayAll, awayFive)
  
  const total = homeMin + homeMax + awayMin + awayMax
  if (total === 0) return { minmin: 0.33, maxmin: 0.33, minmax: 0.33 }
  
  return {
    minmin: homeMin / (homeMin + awayMax),
    maxmin: homeMax / (homeMax + awayMax),
    minmax: homeMin / (homeMin + awayMin),
  }
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

async function getAggregatedStats(teamId: number | undefined, teamName: string, currentSeason: string) {
  let query = supabase.from('fg_team_stats').select('*')
  
  if (teamId) {
    query = query.eq('team_id', teamId)
  } else {
    query = query.ilike('team_name', `%${teamName}%`)
  }
  
  const { data: allSeasons, error } = await query.order('season', { ascending: false })
  
  if (error || !allSeasons || allSeasons.length === 0) {
    return null
  }
  
  const aggregated = {
    team_name: allSeasons[0].team_name,
    team_id: allSeasons[0].team_id,
    seasons_count: allSeasons.length,
    total_played: 0,
    home_goals_for: 0,
    home_goals_against: 0,
    away_goals_for: 0,
    away_goals_against: 0,
    home_first_goal_games: 0,
    home_first_goal_wins: 0,
    home_concede_first_games: 0,
    home_concede_first_wins: 0,
    away_first_goal_games: 0,
    away_first_goal_wins: 0,
    away_concede_first_games: 0,
    away_concede_first_wins: 0,
    form_home_5: allSeasons[0].form_home_5,
    form_away_5: allSeasons[0].form_away_5,
    is_promoted: false,
    promotion_factor: 1.0,
  }
  
  for (const season of allSeasons) {
    aggregated.total_played += season.total_played || 0
    aggregated.home_goals_for += season.home_goals_for || 0
    aggregated.home_goals_against += season.home_goals_against || 0
    aggregated.away_goals_for += season.away_goals_for || 0
    aggregated.away_goals_against += season.away_goals_against || 0
    aggregated.home_first_goal_games += season.home_first_goal_games || 0
    aggregated.home_first_goal_wins += season.home_first_goal_wins || 0
    aggregated.home_concede_first_games += season.home_concede_first_games || 0
    aggregated.home_concede_first_wins += season.home_concede_first_wins || 0
    aggregated.away_first_goal_games += season.away_first_goal_games || 0
    aggregated.away_first_goal_wins += season.away_first_goal_wins || 0
    aggregated.away_concede_first_games += season.away_concede_first_games || 0
    aggregated.away_concede_first_wins += season.away_concede_first_wins || 0
    
    if (season.season === currentSeason && season.is_promoted) {
      aggregated.is_promoted = true
      aggregated.promotion_factor = season.promotion_factor || 0.85
    }
  }
  
  return aggregated
}

async function analyzeMatch(match: any, leagueCode: string): Promise<any | null> {
  try {
    const homeStats = await getAggregatedStats(match.home_team_id, match.home_team, '2024-2025')
    const awayStats = await getAggregatedStats(match.away_team_id, match.away_team, '2024-2025')
    
    if (!homeStats || !awayStats) {
      return null
    }
    
    // P/A 계산
    const homePA_all = calcPA(homeStats.home_goals_for, homeStats.home_goals_against)
    const homePA_five = (homeStats.form_home_5 ?? 1.5) / 1.5
    const homePA_firstGoal = homeStats.home_first_goal_games > 0
      ? calcPA(homeStats.home_first_goal_wins, homeStats.home_first_goal_games - homeStats.home_first_goal_wins)
      : 1.0
    
    const awayPA_all = calcPA(awayStats.away_goals_for, awayStats.away_goals_against)
    const awayPA_five = (awayStats.form_away_5 ?? 1.5) / 1.5
    const awayPA_firstGoal = awayStats.away_first_goal_games > 0
      ? calcPA(awayStats.away_first_goal_wins, awayStats.away_first_goal_games - awayStats.away_first_goal_wins)
      : 1.0
    
    // Method 1
    const homeFormBonus = homeStats.form_home_5 ? (homeStats.form_home_5 - 1.5) * 0.1 : 0
    const awayFormBonus = awayStats.form_away_5 ? (awayStats.form_away_5 - 1.5) * 0.1 : 0
    
    const homeScore_m1 = (homePA_all * 0.4 + homePA_five * 0.3 + homePA_firstGoal * 0.3) + homeFormBonus + 0.05
    const awayScore_m1 = (awayPA_all * 0.4 + awayPA_five * 0.3 + awayPA_firstGoal * 0.3) + awayFormBonus
    
    const totalScore_m1 = homeScore_m1 + awayScore_m1 + 0.3
    let method1_win = homeScore_m1 / totalScore_m1
    let method1_draw = 0.3 / totalScore_m1
    let method1_lose = awayScore_m1 / totalScore_m1
    
    const m1_total = method1_win + method1_draw + method1_lose
    method1_win /= m1_total
    method1_draw /= m1_total
    method1_lose /= m1_total
    
    // Method 2
    const mmComb = calcMinMaxCombination(homePA_all, homePA_five, awayPA_all, awayPA_five)
    let method2_win = (mmComb.minmin * 0.3 + mmComb.maxmin * 0.4 + mmComb.minmax * 0.3)
    let method2_draw = 0.25
    let method2_lose = 1 - method2_win - method2_draw
    if (method2_lose < 0.1) {
      method2_lose = 0.1
      method2_win = 1 - method2_draw - method2_lose
    }
    
    // Method 3
    const homeFirstGoalWinRate = calcWinRate(homeStats.home_first_goal_wins, homeStats.home_first_goal_games)
    const awayFirstGoalWinRate = calcWinRate(awayStats.away_first_goal_wins, awayStats.away_first_goal_games)
    const homeComebackRate = calcWinRate(homeStats.home_concede_first_wins, homeStats.home_concede_first_games)
    const awayComebackRate = calcWinRate(awayStats.away_concede_first_wins, awayStats.away_concede_first_games)
    
    const homeWin_scenario = 0.55 * homeFirstGoalWinRate + 0.45 * awayComebackRate * 0.5
    const awayWin_scenario = 0.45 * awayFirstGoalWinRate + 0.55 * homeComebackRate * 0.3
    
    let method3_win = homeWin_scenario
    let method3_lose = awayWin_scenario
    let method3_draw = 1 - method3_win - method3_lose
    if (method3_draw < 0.05) method3_draw = 0.05
    if (method3_draw > 0.40) method3_draw = 0.40
    const m3_total = method3_win + method3_draw + method3_lose
    method3_win /= m3_total
    method3_draw /= m3_total
    method3_lose /= m3_total
    
    // 평균
    let avgWin = (method1_win + method2_win + method3_win) / 3
    let avgDraw = (method1_draw + method2_draw + method3_draw) / 3
    let avgLose = (method1_lose + method2_lose + method3_lose) / 3
    
    if (homeStats.is_promoted) avgWin *= homeStats.promotion_factor || 0.85
    if (awayStats.is_promoted) avgLose *= awayStats.promotion_factor || 0.85
    
    const avgTotal = avgWin + avgDraw + avgLose
    avgWin /= avgTotal
    avgDraw /= avgTotal
    avgLose /= avgTotal
    
    // 패턴
    const pattern = calculatePattern(avgWin, avgDraw, avgLose)
    
    const { data: patternData } = await supabase
      .from('fg_patterns')
      .select('*')
      .eq('pattern', pattern)
      .is('league_id', null)
      .single()
    
    let patternMatches = 0
    let finalWin = avgWin
    let finalDraw = avgDraw
    let finalLose = avgLose
    
    if (patternData && patternData.total_matches >= 10) {
      patternMatches = patternData.total_matches
      const PATTERN_WEIGHT = 0.5
      finalWin = avgWin * (1 - PATTERN_WEIGHT) + patternData.home_win_rate * PATTERN_WEIGHT
      finalDraw = avgDraw * (1 - PATTERN_WEIGHT) + patternData.draw_rate * PATTERN_WEIGHT
      finalLose = avgLose * (1 - PATTERN_WEIGHT) + patternData.away_win_rate * PATTERN_WEIGHT
      
      const finalTotal = finalWin + finalDraw + finalLose
      finalWin /= finalTotal
      finalDraw /= finalTotal
      finalLose /= finalTotal
    }
    
    // 파워 점수
    const homeFormScore = (homeStats.form_home_5 ?? 1.5) * 10
    const awayFormScore = (awayStats.form_away_5 ?? 1.5) * 10
    
    const homePower = Math.round(
      (homePA_all * 15) + (homePA_five * 15) + (homePA_firstGoal * 25) +
      (homeComebackRate * 10) + homeFormScore + 5
    )
    const awayPower = Math.round(
      (awayPA_all * 15) + (awayPA_five * 15) + (awayPA_firstGoal * 25) +
      (awayComebackRate * 10) + awayFormScore
    )
    
    // 추천 등급 계산
    const maxProb = Math.max(finalWin, finalDraw, finalLose)
    const minProb = Math.min(finalWin, finalDraw, finalLose)
    const probDiff = maxProb - minProb
    const powerDiff = homePower - awayPower
    const minGames = Math.min(homeStats.total_played, awayStats.total_played)
    
    let pick: string = 'SKIP'
    if (finalWin === maxProb) pick = 'HOME'
    else if (finalLose === maxProb) pick = 'AWAY'
    else pick = 'DRAW'
    
    // 🔥 PICK 등급 조건
    const isPick = 
      probDiff >= 0.25 &&
      Math.abs(powerDiff) >= 25 &&
      patternMatches >= 50 &&
      minGames >= 40 &&
      (
        (pick === 'HOME' && homeFirstGoalWinRate >= 0.70) ||
        (pick === 'AWAY' && awayFirstGoalWinRate >= 0.65)
      )
    
    if (!isPick) {
      return null  // PICK이 아니면 저장 안 함
    }
    
    // 이유 생성
    const reasons: string[] = []
    if (Math.abs(powerDiff) >= 20) {
      reasons.push(`Power diff: ${Math.abs(powerDiff)}pts`)
    }
    reasons.push(`Prob edge: ${(probDiff * 100).toFixed(1)}%`)
    if (pick === 'HOME' && homeFirstGoalWinRate >= 0.70) {
      reasons.push(`Home 1st goal win: ${(homeFirstGoalWinRate * 100).toFixed(0)}%`)
    }
    if (pick === 'AWAY' && awayFirstGoalWinRate >= 0.60) {
      reasons.push(`Away 1st goal win: ${(awayFirstGoalWinRate * 100).toFixed(0)}%`)
    }
    if (patternMatches >= 20) {
      reasons.push(`Pattern: ${patternMatches} matches`)
    }
    
    return {
      match_id: String(match.match_id),
      league_code: leagueCode,
      home_team: match.home_team,
      away_team: match.away_team,
      home_team_logo: match.home_crest || null,
      away_team_logo: match.away_crest || null,
      commence_time: match.commence_time || match.match_date,
      pick_result: pick,
      pick_probability: Math.round(maxProb * 1000) / 10,
      home_probability: Math.round(finalWin * 1000) / 10,
      draw_probability: Math.round(finalDraw * 1000) / 10,
      away_probability: Math.round(finalLose * 1000) / 10,
      home_power: homePower,
      away_power: awayPower,
      pattern,
      reasons,
    }
  } catch (e: any) {
    console.error(`Error analyzing match:`, e.message)
    return null
  }
}

// ============================================
// 메인 핸들러
// ============================================

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('🔍 Starting automatic PICK collection...')
    
    // 오늘 ~ 7일 후 경기 조회
    const today = new Date()
    const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    const todayStr = today.toISOString().split('T')[0]
    const weekLaterStr = weekLater.toISOString().split('T')[0]
    
    // match_odds_latest에서 예정된 경기 가져오기
    const { data: upcomingMatches, error: fetchError } = await supabase
      .from('match_odds_latest')
      .select('*')
      .gte('commence_time', todayStr)
      .lte('commence_time', weekLaterStr)
      .order('commence_time', { ascending: true })
    
    if (fetchError) {
      console.error('Error fetching matches:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }
    
    if (!upcomingMatches || upcomingMatches.length === 0) {
      console.log('No upcoming matches found')
      return NextResponse.json({
        success: true,
        message: 'No upcoming matches',
        analyzed: 0,
        picks: 0
      })
    }
    
    console.log(`📋 Found ${upcomingMatches.length} upcoming matches`)
    
    // 이미 저장된 PICK match_id 조회
    const { data: existingPicks } = await supabase
      .from('pick_recommendations')
      .select('match_id')
    
    const existingIds = new Set(existingPicks?.map(p => p.match_id) || [])
    
    // 각 경기 분석
    let analyzed = 0
    let picksSaved = 0
    const newPicks: any[] = []
    
    for (const match of upcomingMatches) {
      // 이미 저장된 경기는 스킵
      if (existingIds.has(String(match.match_id))) {
        continue
      }
      
      analyzed++
      
      const pickResult = await analyzeMatch(match, match.league_code || 'PL')
      
      if (pickResult) {
        // PICK 저장
        const { error: insertError } = await supabase
          .from('pick_recommendations')
          .upsert(pickResult, { onConflict: 'match_id' })
        
        if (!insertError) {
          picksSaved++
          newPicks.push({
            match: `${pickResult.home_team} vs ${pickResult.away_team}`,
            pick: pickResult.pick_result,
            probability: pickResult.pick_probability
          })
          console.log(`⭐ PICK saved: ${pickResult.home_team} vs ${pickResult.away_team} → ${pickResult.pick_result} (${pickResult.pick_probability}%)`)
        }
      }
      
      // API 레이트 리밋 방지
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      stats: {
        totalMatches: upcomingMatches.length,
        analyzed,
        picksSaved,
        duration: `${duration}ms`
      },
      newPicks,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('PICK collection error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
