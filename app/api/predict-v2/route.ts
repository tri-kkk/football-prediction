// app/api/predict-v2/route.ts
// 오리지널 방식 예측 알고리즘 v2
// 선제골 + 폼 기반 (배당 불필요)
// 3가지 Method 평균 + 패턴 역대 승률 반영
// ✅ v2.1: 전체 시즌 통합 통계 사용

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// 타입 정의
// ============================================

interface PredictionInput {
  homeTeam: string
  awayTeam: string
  homeTeamId?: number
  awayTeamId?: number
  leagueId: number
  leagueCode: string
  season: string
}

interface TeamStats {
  team_name: string
  team_id: number
  
  // 기본 통계
  total_played: number
  total_goals_for: number
  total_goals_against: number
  home_goals_for: number
  home_goals_against: number
  away_goals_for: number
  away_goals_against: number
  
  // 선제골 통계
  home_first_goal_games: number
  home_first_goal_wins: number
  home_first_goal_draws: number
  home_first_goal_losses: number
  home_first_goal_gf: number
  home_first_goal_ga: number
  
  home_concede_first_games: number
  home_concede_first_wins: number
  
  away_first_goal_games: number
  away_first_goal_wins: number
  away_first_goal_draws: number
  away_first_goal_losses: number
  away_first_goal_gf: number
  away_first_goal_ga: number
  
  away_concede_first_games: number
  away_concede_first_wins: number
  
  // 폼
  form_last_5: number | null
  form_home_5: number | null
  form_away_5: number | null
  
  // 승격팀
  is_promoted: boolean
  promotion_factor: number
}

interface AggregatedStats {
  team_name: string
  team_id: number
  seasons_count: number
  
  // 합산 통계
  total_played: number
  home_goals_for: number
  home_goals_against: number
  away_goals_for: number
  away_goals_against: number
  
  // 선제골 합산
  home_first_goal_games: number
  home_first_goal_wins: number
  home_concede_first_games: number
  home_concede_first_wins: number
  
  away_first_goal_games: number
  away_first_goal_wins: number
  away_concede_first_games: number
  away_concede_first_wins: number
  
  // 최신 시즌 폼 (가장 최근)
  form_home_5: number | null
  form_away_5: number | null
  
  // 승격팀 (현재 시즌)
  is_promoted: boolean
  promotion_factor: number
}

interface PredictionResult {
  homeTeam: string
  awayTeam: string
  
  // 파워 점수
  homePower: number
  awayPower: number
  
  // P/A 비율
  homePA: { all: number; five: number; firstGoal: number }
  awayPA: { all: number; five: number; firstGoal: number }
  
  // 3가지 Method 결과
  method1: { win: number; draw: number; lose: number }
  method2: { win: number; draw: number; lose: number }
  method3: { win: number; draw: number; lose: number }
  
  // 패턴
  pattern: string
  patternStats: {
    totalMatches: number
    homeWinRate: number
    drawRate: number
    awayWinRate: number
  } | null
  
  // 최종 확률
  finalProb: {
    home: number
    draw: number
    away: number
  }
  
  // 추천
  recommendation: {
    pick: string
    grade: 'PICK' | 'GOOD' | 'PASS'
    reasons: string[]
  }
  
  debug: any
}

// ============================================
// 유틸 함수
// ============================================

// P/A (득실비율) 계산 - 0 방지
function calcPA(goals_for: number, goals_against: number): number {
  if (goals_against === 0) return goals_for > 0 ? 2.0 : 1.0
  return goals_for / goals_against
}

// 승률 계산
function calcWinRate(wins: number, games: number): number {
  if (games === 0) return 0.5
  return wins / games
}

// min-min, max-min, min-max 조합 계산
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

// 패턴 코드 계산 (0, 1, 2, 3)
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

// 신뢰도 평가
function evaluateConfidence(
  homePlayed: number, 
  awayPlayed: number,
  patternMatches: number
): string {
  const minGames = Math.min(homePlayed, awayPlayed)
  
  if (minGames >= 30 && patternMatches >= 30) return 'HIGH'
  if (minGames >= 15 && patternMatches >= 15) return 'MEDIUM'
  if (minGames >= 5) return 'LOW'
  return 'VERY_LOW'
}

// ============================================
// ✅ 전체 시즌 통합 통계 조회
// ============================================

async function getAggregatedStats(
  teamId: number | undefined,
  teamName: string,
  currentSeason: string
): Promise<AggregatedStats | null> {
  
  // 팀 ID 또는 이름으로 모든 시즌 데이터 조회
  let query = supabase.from('fg_team_stats').select('*')
  
  if (teamId) {
    query = query.eq('team_id', teamId)
  } else {
    query = query.ilike('team_name', `%${teamName}%`)
  }
  
  const { data: allSeasons, error } = await query.order('season', { ascending: false })
  
  if (error || !allSeasons || allSeasons.length === 0) {
    console.log(`No stats found for team: ${teamName} (ID: ${teamId})`)
    return null
  }
  
  // 합산
  const aggregated: AggregatedStats = {
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
    
    // 최신 시즌 폼 사용
    form_home_5: allSeasons[0].form_home_5,
    form_away_5: allSeasons[0].form_away_5,
    
    // 현재 시즌 승격팀 여부
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
    
    // 현재 시즌 승격팀 체크
    if (season.season === currentSeason && season.is_promoted) {
      aggregated.is_promoted = true
      aggregated.promotion_factor = season.promotion_factor || 0.85
    }
  }
  
  console.log(`✅ Aggregated ${aggregated.seasons_count} seasons for ${aggregated.team_name}: ${aggregated.total_played} games`)
  
  return aggregated
}

// ============================================
// 메인 예측 로직
// ============================================

async function predict(input: PredictionInput): Promise<PredictionResult> {
  const { homeTeam, awayTeam, homeTeamId, awayTeamId, leagueId, leagueCode, season } = input
  
  // ============================================
  // 1단계: 전체 시즌 통합 통계 조회
  // ============================================
  
  const homeStats = await getAggregatedStats(homeTeamId, homeTeam, season)
  const awayStats = await getAggregatedStats(awayTeamId, awayTeam, season)
  
  // 기본값 설정 (통계 없을 경우)
  if (!homeStats || !awayStats) {
    return {
      homeTeam,
      awayTeam,
      homePower: 50,
      awayPower: 50,
      homePA: { all: 1, five: 1, firstGoal: 0.5 },
      awayPA: { all: 1, five: 1, firstGoal: 0.5 },
      method1: { win: 0.4, draw: 0.3, lose: 0.3 },
      method2: { win: 0.4, draw: 0.3, lose: 0.3 },
      method3: { win: 0.4, draw: 0.3, lose: 0.3 },
      pattern: '2-2-2',
      patternStats: null,
      finalProb: { home: 0.4, draw: 0.3, away: 0.3 },
      recommendation: {
        pick: 'SKIP',
        grade: 'PASS' as const,
        reasons: ['Insufficient team stats'],
      },
      debug: { 
        homeStats: null, 
        awayStats: null,
        note: 'No team stats found'
      },
    }
  }
  
  // ============================================
  // 2단계: P/A (득실비율) 계산
  // ============================================
  
  const homePA_all = calcPA(homeStats.home_goals_for, homeStats.home_goals_against)
  const awayPA_all = calcPA(awayStats.away_goals_for, awayStats.away_goals_against)
  
  // 선제골 승률 (전체 시즌 합산)
  const homePA_firstGoal = calcWinRate(homeStats.home_first_goal_wins, homeStats.home_first_goal_games)
  const awayPA_firstGoal = calcWinRate(awayStats.away_first_goal_wins, awayStats.away_first_goal_games)
  
  // ============================================
  // 2-1단계: 폼 지수 반영
  // ============================================
  
  const homeForm = homeStats.form_home_5 ?? 1.5
  const awayForm = awayStats.form_away_5 ?? 1.5
  
  const homeFormBonus = (homeForm - 1.5) * 0.167
  const awayFormBonus = (awayForm - 1.5) * 0.167
  
  const homePA_five = homePA_all * (1 + homeFormBonus)
  const awayPA_five = awayPA_all * (1 + awayFormBonus)
  
  // ============================================
  // 3단계: Method 1 - P/A 직접 비교
  // ============================================
  
  const homeAdvantage = (homePA_all + homePA_five) / 2
  const awayAdvantage = (awayPA_all + awayPA_five) / 2
  const totalAdvantage = homeAdvantage + awayAdvantage
  
  const homeFirstGoalBonus = (homePA_firstGoal - 0.5) * 0.3
  const awayFirstGoalBonus = (awayPA_firstGoal - 0.5) * 0.3
  
  let method1_win = (homeAdvantage / totalAdvantage) + homeFirstGoalBonus + homeFormBonus * 0.5
  let method1_lose = (awayAdvantage / totalAdvantage) + awayFirstGoalBonus + awayFormBonus * 0.5
  let method1_draw = 1 - method1_win - method1_lose
  
  if (method1_draw < 0.05) method1_draw = 0.05
  const m1_total = method1_win + method1_draw + method1_lose
  method1_win /= m1_total
  method1_draw /= m1_total
  method1_lose /= m1_total
  
  // ============================================
  // 4단계: Method 2 - min-max 조합
  // ============================================
  
  const combinations = calcMinMaxCombination(
    homePA_all, homePA_five,
    awayPA_all, awayPA_five
  )
  
  let method2_win = (combinations.minmin + combinations.maxmin + combinations.minmax) / 3
  let method2_lose = 1 - method2_win
  
  const paDiff = Math.abs(homeAdvantage - awayAdvantage)
  let method2_draw = Math.max(0.1, 0.35 - paDiff * 0.2)
  
  const m2_total = method2_win + method2_draw + method2_lose
  method2_win = method2_win / m2_total * (1 - method2_draw) + method2_draw * 0.3
  method2_lose = method2_lose / m2_total * (1 - method2_draw) + method2_draw * 0.3
  method2_draw = 1 - method2_win - method2_lose
  
  // ============================================
  // 5단계: Method 3 - 선제골 시나리오
  // ============================================
  
  const homeFirstGoalWinRate = calcWinRate(
    homeStats.home_first_goal_wins,
    homeStats.home_first_goal_games
  )
  const awayFirstGoalWinRate = calcWinRate(
    awayStats.away_first_goal_wins,
    awayStats.away_first_goal_games
  )
  
  const homeComebackRate = calcWinRate(
    homeStats.home_concede_first_wins,
    homeStats.home_concede_first_games
  )
  const awayComebackRate = calcWinRate(
    awayStats.away_concede_first_wins,
    awayStats.away_concede_first_games
  )
  
  const homeScoreFirst = homePA_all / (homePA_all + awayPA_all)
  const awayScoreFirst = 1 - homeScoreFirst
  
  const scenario1_home = homeScoreFirst * homeFirstGoalWinRate
  const scenario2_home = awayScoreFirst * homeComebackRate
  const scenario1_away = awayScoreFirst * awayFirstGoalWinRate
  const scenario2_away = homeScoreFirst * awayComebackRate
  
  let method3_win = scenario1_home + scenario2_home
  let method3_lose = scenario1_away + scenario2_away
  let method3_draw = 1 - method3_win - method3_lose
  
  if (method3_draw < 0.05) method3_draw = 0.05
  if (method3_draw > 0.40) method3_draw = 0.40
  const m3_total = method3_win + method3_draw + method3_lose
  method3_win /= m3_total
  method3_draw /= m3_total
  method3_lose /= m3_total
  
  // ============================================
  // 6단계: 3 Method 평균
  // ============================================
  
  let avgWin = (method1_win + method2_win + method3_win) / 3
  let avgDraw = (method1_draw + method2_draw + method3_draw) / 3
  let avgLose = (method1_lose + method2_lose + method3_lose) / 3
  
  // 승격팀 보정
  if (homeStats.is_promoted) {
    avgWin *= homeStats.promotion_factor || 0.85
  }
  if (awayStats.is_promoted) {
    avgLose *= awayStats.promotion_factor || 0.85
  }
  
  const avgTotal = avgWin + avgDraw + avgLose
  avgWin /= avgTotal
  avgDraw /= avgTotal
  avgLose /= avgTotal
  
  // ============================================
  // 7단계: 패턴 역대 승률 반영
  // ============================================
  
  const pattern = calculatePattern(avgWin, avgDraw, avgLose)
  
  const { data: patternData } = await supabase
    .from('fg_patterns')
    .select('*')
    .eq('pattern', pattern)
    .is('league_id', null)
    .single()
  
  let patternStats = null
  let finalWin = avgWin
  let finalDraw = avgDraw
  let finalLose = avgLose
  
  if (patternData && patternData.total_matches >= 10) {
    patternStats = {
      totalMatches: patternData.total_matches,
      homeWinRate: patternData.home_win_rate,
      drawRate: patternData.draw_rate,
      awayWinRate: patternData.away_win_rate,
    }
    
    const PATTERN_WEIGHT = 0.5
    finalWin = avgWin * (1 - PATTERN_WEIGHT) + patternData.home_win_rate * PATTERN_WEIGHT
    finalDraw = avgDraw * (1 - PATTERN_WEIGHT) + patternData.draw_rate * PATTERN_WEIGHT
    finalLose = avgLose * (1 - PATTERN_WEIGHT) + patternData.away_win_rate * PATTERN_WEIGHT
    
    const finalTotal = finalWin + finalDraw + finalLose
    finalWin /= finalTotal
    finalDraw /= finalTotal
    finalLose /= finalTotal
  }
  
  // ============================================
  // 8단계: 파워 점수 계산
  // ============================================
  
  const homeFormScore = (homeStats.form_home_5 ?? 1.5) * 10
  const awayFormScore = (awayStats.form_away_5 ?? 1.5) * 10
  
  const homePower = Math.round(
    (homePA_all * 15) + 
    (homePA_five * 15) + 
    (homePA_firstGoal * 25) +
    (homeComebackRate * 10) +
    homeFormScore +
    5
  )
  
  const awayPower = Math.round(
    (awayPA_all * 15) + 
    (awayPA_five * 15) + 
    (awayPA_firstGoal * 25) +
    (awayComebackRate * 10) +
    awayFormScore
  )
  
  // ============================================
  // 9단계: 추천 생성
  // ============================================
  
  const recommendation = generateRecommendation(
    { home: finalWin, draw: finalDraw, away: finalLose },
    { homePower, awayPower },
    patternStats,
    homeStats,
    awayStats,
    { homeFirstGoalWinRate, awayFirstGoalWinRate, homeComebackRate, awayComebackRate }
  )
  
  return {
    homeTeam,
    awayTeam,
    homePower,
    awayPower,
    homePA: { all: homePA_all, five: homePA_five, firstGoal: homePA_firstGoal },
    awayPA: { all: awayPA_all, five: awayPA_five, firstGoal: awayPA_firstGoal },
    method1: { win: method1_win, draw: method1_draw, lose: method1_lose },
    method2: { win: method2_win, draw: method2_draw, lose: method2_lose },
    method3: { win: method3_win, draw: method3_draw, lose: method3_lose },
    pattern,
    patternStats,
    finalProb: { home: finalWin, draw: finalDraw, away: finalLose },
    recommendation,
    debug: {
      homeStats: {
        played: homeStats.total_played,
        seasons: homeStats.seasons_count,
        homeFirstGoalGames: homeStats.home_first_goal_games,
        homeFirstGoalWinRate,
        homeComebackRate,
        form: homeStats.form_home_5,
        formBonus: homeFormBonus.toFixed(3),
        isPromoted: homeStats.is_promoted,
      },
      awayStats: {
        played: awayStats.total_played,
        seasons: awayStats.seasons_count,
        awayFirstGoalGames: awayStats.away_first_goal_games,
        awayFirstGoalWinRate,
        awayComebackRate,
        form: awayStats.form_away_5,
        formBonus: awayFormBonus.toFixed(3),
        isPromoted: awayStats.is_promoted,
      },
    },
  }
}

// 추천 생성
function generateRecommendation(
  finalProb: { home: number; draw: number; away: number },
  power: { homePower: number; awayPower: number },
  patternStats: any,
  homeStats: AggregatedStats,
  awayStats: AggregatedStats,
  rates: { homeFirstGoalWinRate: number; awayFirstGoalWinRate: number; homeComebackRate: number; awayComebackRate: number }
): PredictionResult['recommendation'] {
  
  const reasons: string[] = []
  
  const maxProb = Math.max(finalProb.home, finalProb.draw, finalProb.away)
  let pick: string = 'SKIP'
  
  if (finalProb.home === maxProb) pick = 'HOME'
  else if (finalProb.away === maxProb) pick = 'AWAY'
  else pick = 'DRAW'
  
  const probDiff = maxProb - Math.min(finalProb.home, finalProb.draw, finalProb.away)
  const patternMatches = patternStats?.totalMatches || 0
  const minGames = Math.min(homeStats.total_played, awayStats.total_played)
  const powerDiff = power.homePower - power.awayPower
  
  // ============================================
  // 🎯 3단계 등급 판정
  // ============================================
  
  // 🔥 PICK: 엄격한 기준 (강추)
  const isPick = 
    probDiff >= 0.25 &&
    Math.abs(powerDiff) >= 25 &&
    patternMatches >= 50 &&
    minGames >= 40 &&
    (
      (pick === 'HOME' && rates.homeFirstGoalWinRate >= 0.70) ||
      (pick === 'AWAY' && rates.awayFirstGoalWinRate >= 0.65)
    )
  
  // 👍 GOOD: 중간 기준 (괜찮음)
  const isGood = !isPick && 
    probDiff >= 0.15 &&
    Math.abs(powerDiff) >= 15 &&
    minGames >= 20
  
  // ⛔ PASS: 나머지 (비추)
  // isPick도 아니고 isGood도 아닌 경우
  
  // 등급 결정
  let grade: 'PICK' | 'GOOD' | 'PASS' = 'PASS'
  if (isPick) grade = 'PICK'
  else if (isGood) grade = 'GOOD'
  
  // 파워 차이
  if (Math.abs(powerDiff) >= 20) {
    reasons.push(`Power diff: ${Math.abs(powerDiff)}pts`)
  }
  
  // 확률 우위
  reasons.push(`Prob edge: ${(probDiff * 100).toFixed(1)}%`)
  
  // 선제골 승률
  if (pick === 'HOME' && rates.homeFirstGoalWinRate >= 0.70) {
    reasons.push(`Home 1st goal win: ${(rates.homeFirstGoalWinRate * 100).toFixed(0)}%`)
  }
  if (pick === 'AWAY' && rates.awayFirstGoalWinRate >= 0.60) {
    reasons.push(`Away 1st goal win: ${(rates.awayFirstGoalWinRate * 100).toFixed(0)}%`)
  }
  
  // 패턴 기반
  if (patternStats && patternStats.totalMatches >= 20) {
    reasons.push(`Pattern: ${patternStats.totalMatches} matches`)
  }
  
  // 데이터 양
  if (minGames >= 50) {
    reasons.push(`Data: ${minGames}+ games`)
  }
  
  // 승격팀 경고
  if (homeStats.is_promoted) {
    reasons.push(`Warning: Home promoted`)
  }
  if (awayStats.is_promoted) {
    reasons.push(`Warning: Away promoted`)
  }
  
  // 확률 너무 비슷하면 SKIP
  if (probDiff < 0.08) {
    pick = 'SKIP'
    grade = 'PASS'
    reasons.unshift(`Low edge ${(probDiff * 100).toFixed(1)}% - risky`)
  }
  
  return { pick, grade, reasons }
}

// ============================================
// API 핸들러
// ============================================

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ready',
    version: 'v2.1-aggregated',
    changes: [
      '✅ 전체 시즌 통합 통계 사용',
      '✅ 2022-2025 시즌 합산',
      '✅ 경기 수 많아져서 승률 안정화',
    ],
    algorithm: [
      '1. 전체 시즌 통합 P/A 계산',
      '2. Method 1: P/A 직접 비교 + 폼',
      '3. Method 2: min-max 조합',
      '4. Method 3: 선제골 시나리오',
      '5. 3 Method 평균',
      '6. 패턴 역대 승률 50% 반영',
      '7. 파워 점수 & 추천',
    ],
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const required = ['homeTeam', 'awayTeam', 'leagueId', 'leagueCode', 'season']
    for (const field of required) {
      if (body[field] === undefined) {
        return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 })
      }
    }
    
    const result = await predict(body as PredictionInput)
    
    return NextResponse.json({
      success: true,
      prediction: result,
    })
    
  } catch (error: any) {
    console.error('Prediction error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}