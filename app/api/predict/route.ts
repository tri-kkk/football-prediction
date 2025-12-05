// app/api/predict/route.ts
// 선제골 기반 경기 예측 알고리즘 v1
// 배당 + 팀 통계 + 패턴 + 폼 지수 → 최종 예측

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
  oddsHome: number
  oddsDraw: number
  oddsAway: number
}

interface TeamStats {
  team_name: string
  total_played: number
  
  // 홈 선득점
  home_first_goal_games: number
  home_first_goal_wins: number
  home_first_goal_draws: number
  home_first_goal_losses: number
  
  // 홈 선실점
  home_concede_first_games: number
  home_concede_first_wins: number
  home_concede_first_draws: number
  home_concede_first_losses: number
  
  // 원정 선득점
  away_first_goal_games: number
  away_first_goal_wins: number
  away_first_goal_draws: number
  away_first_goal_losses: number
  
  // 원정 선실점
  away_concede_first_games: number
  away_concede_first_wins: number
  away_concede_first_draws: number
  away_concede_first_losses: number
  
  // 폼
  form_last_5: number | null
  form_home_5: number | null
  form_away_5: number | null
  
  // 승격팀
  is_promoted: boolean
  promotion_factor: number
}

interface PredictionResult {
  homeTeam: string
  awayTeam: string
  
  // 1단계: 배당 기반 확률
  marketProb: {
    home: number
    draw: number
    away: number
  }
  
  // 2단계: 선제골 보정 확률
  firstGoalAdjusted: {
    home: number
    draw: number
    away: number
  }
  
  // 3단계: 패턴 코드
  pattern: string
  patternStats: {
    totalMatches: number
    homeWinRate: number
    drawRate: number
    awayWinRate: number
    confidence: string
  } | null
  
  // 4단계: 최종 확률
  finalProb: {
    home: number
    draw: number
    away: number
  }
  
  // 추천
  recommendation: {
    pick: string          // 'HOME', 'DRAW', 'AWAY', 'SKIP'
    confidence: string    // 'HIGH', 'MEDIUM', 'LOW'
    value: string         // 'GOOD', 'FAIR', 'POOR'
    reason: string[]
  }
  
  // 디버그 정보
  debug: {
    homeStats: any
    awayStats: any
    adjustments: any
  }
}

// ============================================
// 유틸 함수
// ============================================

// 배당 → 확률 변환 (마진 제거)
function oddsToProb(home: number, draw: number, away: number): { home: number; draw: number; away: number } {
  const rawHome = 1 / home
  const rawDraw = 1 / draw
  const rawAway = 1 / away
  const total = rawHome + rawDraw + rawAway
  
  return {
    home: rawHome / total,
    draw: rawDraw / total,
    away: rawAway / total,
  }
}

// 패턴 코드 계산
function calculatePattern(homeProb: number, drawProb: number, awayProb: number): string {
  const probs = [
    { type: 'home', value: homeProb },
    { type: 'draw', value: drawProb },
    { type: 'away', value: awayProb },
  ]
  
  const max = Math.max(homeProb, drawProb, awayProb)
  const min = Math.min(homeProb, drawProb, awayProb)
  
  const getCode = (value: number): number => {
    if (value >= max - 0.02) return 1        // 최대값 근처
    if (value <= min + 0.03) return 3        // 최소값 근처
    return 2                                  // 중간
  }
  
  return `${getCode(homeProb)}-${getCode(drawProb)}-${getCode(awayProb)}`
}

// 승률 계산 (안전하게)
function calcWinRate(wins: number, games: number): number {
  if (games === 0) return 0.5  // 데이터 없으면 50%
  return wins / games
}

// 신뢰도 평가
function evaluateConfidence(sampleSize: number): string {
  if (sampleSize >= 50) return 'HIGH'
  if (sampleSize >= 20) return 'MEDIUM'
  if (sampleSize >= 10) return 'LOW'
  return 'VERY_LOW'
}

// ============================================
// 메인 예측 로직
// ============================================

async function predict(input: PredictionInput): Promise<PredictionResult> {
  const {
    homeTeam, awayTeam, homeTeamId, awayTeamId,
    leagueId, leagueCode, season,
    oddsHome, oddsDraw, oddsAway
  } = input
  
  // ============================================
  // 1단계: 배당 → 확률 변환
  // ============================================
  const marketProb = oddsToProb(oddsHome, oddsDraw, oddsAway)
  
  // ============================================
  // 2단계: 팀 통계 조회
  // ============================================
  
  // 홈팀 통계
  let homeStats: TeamStats | null = null
  const homeQuery = homeTeamId 
    ? supabase.from('fg_team_stats').select('*').eq('team_id', homeTeamId).eq('season', season).single()
    : supabase.from('fg_team_stats').select('*').ilike('team_name', `%${homeTeam}%`).eq('season', season).single()
  
  const { data: homeData } = await homeQuery
  homeStats = homeData as TeamStats | null
  
  // 원정팀 통계
  let awayStats: TeamStats | null = null
  const awayQuery = awayTeamId
    ? supabase.from('fg_team_stats').select('*').eq('team_id', awayTeamId).eq('season', season).single()
    : supabase.from('fg_team_stats').select('*').ilike('team_name', `%${awayTeam}%`).eq('season', season).single()
  
  const { data: awayData } = await awayQuery
  awayStats = awayData as TeamStats | null
  
  // ============================================
  // 3단계: 선제골 기반 보정
  // ============================================
  
  let adjustments = {
    homeFirstGoalBonus: 0,
    awayFirstGoalBonus: 0,
    homeComebackPenalty: 0,
    awayComebackPenalty: 0,
    homeFormFactor: 1.0,
    awayFormFactor: 1.0,
    homePromotionFactor: 1.0,
    awayPromotionFactor: 1.0,
  }
  
  let firstGoalAdjusted = { ...marketProb }
  
  if (homeStats && awayStats) {
    // 홈팀: 홈 선득점 승률
    const homeFirstGoalWinRate = calcWinRate(
      homeStats.home_first_goal_wins,
      homeStats.home_first_goal_games
    )
    
    // 홈팀: 홈 선실점 승률 (역전력)
    const homeComebackRate = calcWinRate(
      homeStats.home_concede_first_wins,
      homeStats.home_concede_first_games
    )
    
    // 원정팀: 원정 선득점 승률
    const awayFirstGoalWinRate = calcWinRate(
      awayStats.away_first_goal_wins,
      awayStats.away_first_goal_games
    )
    
    // 원정팀: 원정 선실점 승률 (역전력)
    const awayComebackRate = calcWinRate(
      awayStats.away_concede_first_wins,
      awayStats.away_concede_first_games
    )
    
    // 리그 평균 대비 보정 (평균 65% 가정)
    const LEAGUE_AVG_FIRST_GOAL_WIN = 0.65
    
    // 보정값 계산
    adjustments.homeFirstGoalBonus = (homeFirstGoalWinRate - LEAGUE_AVG_FIRST_GOAL_WIN) * 0.15
    adjustments.awayFirstGoalBonus = (awayFirstGoalWinRate - LEAGUE_AVG_FIRST_GOAL_WIN) * 0.15
    adjustments.homeComebackPenalty = (homeComebackRate - 0.30) * 0.10  // 평균 역전률 30%
    adjustments.awayComebackPenalty = (awayComebackRate - 0.30) * 0.10
    
    // 폼 지수 (최근 5경기)
    if (homeStats.form_home_5) {
      adjustments.homeFormFactor = 0.9 + (homeStats.form_home_5 / 3) * 0.2  // 0.9~1.1
    }
    if (awayStats.form_away_5) {
      adjustments.awayFormFactor = 0.9 + (awayStats.form_away_5 / 3) * 0.2
    }
    
    // 승격팀 보정
    if (homeStats.is_promoted) {
      adjustments.homePromotionFactor = homeStats.promotion_factor || 0.85
    }
    if (awayStats.is_promoted) {
      adjustments.awayPromotionFactor = awayStats.promotion_factor || 0.85
    }
    
    // 최종 보정 적용
    let adjHome = marketProb.home 
      + adjustments.homeFirstGoalBonus 
      + adjustments.homeComebackPenalty
    let adjAway = marketProb.away 
      + adjustments.awayFirstGoalBonus 
      + adjustments.awayComebackPenalty
    
    // 폼 & 승격팀 보정
    adjHome *= adjustments.homeFormFactor * adjustments.homePromotionFactor
    adjAway *= adjustments.awayFormFactor * adjustments.awayPromotionFactor
    
    // 정규화
    const adjDraw = 1 - adjHome - adjAway
    const total = adjHome + Math.max(0.05, adjDraw) + adjAway
    
    firstGoalAdjusted = {
      home: adjHome / total,
      draw: Math.max(0.05, adjDraw) / total,
      away: adjAway / total,
    }
  }
  
  // ============================================
  // 4단계: 패턴 분석
  // ============================================
  
  const pattern = calculatePattern(
    firstGoalAdjusted.home,
    firstGoalAdjusted.draw,
    firstGoalAdjusted.away
  )
  
  // 패턴 통계 조회
  const { data: patternData } = await supabase
    .from('fg_patterns')
    .select('*')
    .eq('pattern', pattern)
    .is('league_id', null)  // 전체 리그 통합
    .single()
  
  let patternStats = null
  if (patternData) {
    patternStats = {
      totalMatches: patternData.total_matches,
      homeWinRate: patternData.home_win_rate,
      drawRate: patternData.draw_rate,
      awayWinRate: patternData.away_win_rate,
      confidence: patternData.confidence || evaluateConfidence(patternData.total_matches),
    }
  }
  
  // ============================================
  // 5단계: 최종 확률 (패턴 반영)
  // ============================================
  
  let finalProb = { ...firstGoalAdjusted }
  
  if (patternStats && patternStats.totalMatches >= 10) {
    // 패턴 가중치 30%
    const PATTERN_WEIGHT = 0.30
    
    finalProb = {
      home: firstGoalAdjusted.home * (1 - PATTERN_WEIGHT) + patternStats.homeWinRate * PATTERN_WEIGHT,
      draw: firstGoalAdjusted.draw * (1 - PATTERN_WEIGHT) + patternStats.drawRate * PATTERN_WEIGHT,
      away: firstGoalAdjusted.away * (1 - PATTERN_WEIGHT) + patternStats.awayWinRate * PATTERN_WEIGHT,
    }
  }
  
  // ============================================
  // 6단계: 추천 생성
  // ============================================
  
  const recommendation = generateRecommendation(
    finalProb,
    marketProb,
    { oddsHome, oddsDraw, oddsAway },
    patternStats,
    homeStats,
    awayStats
  )
  
  return {
    homeTeam,
    awayTeam,
    marketProb,
    firstGoalAdjusted,
    pattern,
    patternStats,
    finalProb,
    recommendation,
    debug: {
      homeStats,
      awayStats,
      adjustments,
    }
  }
}

// 추천 생성
function generateRecommendation(
  finalProb: { home: number; draw: number; away: number },
  marketProb: { home: number; draw: number; away: number },
  odds: { oddsHome: number; oddsDraw: number; oddsAway: number },
  patternStats: any,
  homeStats: TeamStats | null,
  awayStats: TeamStats | null
): PredictionResult['recommendation'] {
  
  const reasons: string[] = []
  
  // 최고 확률 찾기
  const maxProb = Math.max(finalProb.home, finalProb.draw, finalProb.away)
  let pick: string = 'SKIP'
  
  if (finalProb.home === maxProb) pick = 'HOME'
  else if (finalProb.away === maxProb) pick = 'AWAY'
  else pick = 'DRAW'
  
  // 신뢰도 계산
  let confidence: string = 'LOW'
  const probDiff = maxProb - Math.min(finalProb.home, finalProb.draw, finalProb.away)
  
  if (probDiff >= 0.25 && maxProb >= 0.50) {
    confidence = 'HIGH'
    reasons.push(`확률 우위 ${(probDiff * 100).toFixed(1)}%`)
  } else if (probDiff >= 0.15 && maxProb >= 0.40) {
    confidence = 'MEDIUM'
    reasons.push(`중간 확률 우위`)
  } else {
    reasons.push(`확률 차이 적음 - 주의 필요`)
  }
  
  // 밸류 계산 (기대값)
  const expectedReturn = {
    home: finalProb.home * odds.oddsHome,
    draw: finalProb.draw * odds.oddsDraw,
    away: finalProb.away * odds.oddsAway,
  }
  
  const pickReturn = pick === 'HOME' ? expectedReturn.home :
                     pick === 'AWAY' ? expectedReturn.away :
                     pick === 'DRAW' ? expectedReturn.draw : 0
  
  let value: string = 'POOR'
  if (pickReturn >= 1.15) {
    value = 'GOOD'
    reasons.push(`밸류 베팅 (기대값 ${(pickReturn * 100).toFixed(0)}%)`)
  } else if (pickReturn >= 1.05) {
    value = 'FAIR'
    reasons.push(`적정 배당`)
  } else {
    reasons.push(`배당 가치 낮음`)
  }
  
  // 선제골 통계 기반 이유
  if (homeStats && pick === 'HOME') {
    const homeWinRate = calcWinRate(homeStats.home_first_goal_wins, homeStats.home_first_goal_games)
    if (homeWinRate >= 0.70) {
      reasons.push(`홈팀 선득점시 승률 ${(homeWinRate * 100).toFixed(0)}%`)
    }
  }
  
  if (awayStats && pick === 'AWAY') {
    const awayWinRate = calcWinRate(awayStats.away_first_goal_wins, awayStats.away_first_goal_games)
    if (awayWinRate >= 0.60) {
      reasons.push(`원정팀 선득점시 승률 ${(awayWinRate * 100).toFixed(0)}%`)
    }
  }
  
  // 패턴 기반 이유
  if (patternStats && patternStats.totalMatches >= 20) {
    reasons.push(`패턴 ${patternStats.totalMatches}경기 기반`)
  }
  
  // 승격팀 경고
  if (homeStats?.is_promoted) {
    reasons.push(`⚠️ 홈팀 승격팀 (보정 적용)`)
  }
  if (awayStats?.is_promoted) {
    reasons.push(`⚠️ 원정팀 승격팀 (보정 적용)`)
  }
  
  // 확률 너무 비슷하면 SKIP
  if (probDiff < 0.10) {
    pick = 'SKIP'
    confidence = 'LOW'
    reasons.unshift(`확률 차이 ${(probDiff * 100).toFixed(1)}% - 예측 어려움`)
  }
  
  return { pick, confidence, value, reasons }
}

// ============================================
// API 핸들러
// ============================================

// GET: 사용법
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ready',
    version: 'v1',
    algorithm: [
      '1. 배당 → 확률 변환 (마진 제거)',
      '2. 팀 선제골 통계 보정',
      '3. 패턴 코드 계산 (1-2-3)',
      '4. 패턴 역대 승률 반영',
      '5. 폼 지수 + 승격팀 보정',
      '6. 최종 확률 & 추천',
    ],
    usage: {
      single: 'POST { homeTeam, awayTeam, leagueId, leagueCode, season, oddsHome, oddsDraw, oddsAway }',
      example: {
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        leagueId: 39,
        leagueCode: 'PL',
        season: '2025',
        oddsHome: 1.80,
        oddsDraw: 3.50,
        oddsAway: 4.20,
      }
    }
  })
}

// POST: 예측 실행
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 필수 필드 검증
    const required = ['homeTeam', 'awayTeam', 'leagueId', 'leagueCode', 'season', 'oddsHome', 'oddsDraw', 'oddsAway']
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
