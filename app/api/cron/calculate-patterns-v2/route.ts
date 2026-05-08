// app/api/cron/calculate-patterns-v2/route.ts
// 선제골 + 폼 기반 패턴 계산 API v2
// 배당 불필요! fg_match_history + fg_team_stats 활용

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// 유틸 함수
// ============================================

// P/A (득실비율) 계산
function calcPA(goals_for: number, goals_against: number): number {
  if (goals_against === 0) return goals_for > 0 ? 2.0 : 1.0
  return goals_for / goals_against
}

// 승률 계산
function calcWinRate(wins: number, games: number): number {
  if (games === 0) return 0.5
  return wins / games
}

// 패턴 코드 계산 (0, 1, 2, 3)
function calculatePattern(homeProb: number, drawProb: number, awayProb: number): string {
  const max = Math.max(homeProb, drawProb, awayProb)
  const min = Math.min(homeProb, drawProb, awayProb)
  
  const getCode = (value: number): number => {
    // 0 = 극단적 (5% 이하 또는 85% 이상)
    if (value <= 0.05) return 0
    if (value >= 0.85) return 0
    
    // 1 = 높음 (최대값 근처)
    if (value >= max - 0.03) return 1
    
    // 3 = 낮음 (최소값 근처)
    if (value <= min + 0.05) return 3
    
    // 2 = 중간
    return 2
  }
  
  return `${getCode(homeProb)}-${getCode(drawProb)}-${getCode(awayProb)}`
}

// 신뢰도 평가
function evaluateConfidence(sampleSize: number): string {
  if (sampleSize >= 50) return 'HIGH'
  if (sampleSize >= 20) return 'MEDIUM'
  if (sampleSize >= 10) return 'LOW'
  return 'VERY_LOW'
}

// 패턴 설명 생성
function generateDescription(pattern: string, homeWinRate: number, drawRate: number, awayWinRate: number): string {
  let desc = ''
  
  if (homeWinRate >= 0.60) {
    desc = `강력한 홈 우세 패턴 (홈승 ${(homeWinRate * 100).toFixed(1)}%)`
  } else if (homeWinRate >= 0.45) {
    desc = `홈승 우세 패턴 (${(homeWinRate * 100).toFixed(1)}%)`
  } else if (awayWinRate >= 0.50) {
    desc = `원정 우세 패턴 (원정승 ${(awayWinRate * 100).toFixed(1)}%)`
  } else if (drawRate >= 0.35) {
    desc = `무승부 높은 패턴 (${(drawRate * 100).toFixed(1)}%)`
  } else {
    desc = `균형 패턴 - 분석 어려움`
  }
  
  // 특수 패턴 표시
  if (pattern.startsWith('1-') && pattern.endsWith('-3')) {
    desc += ' | 홈팀 강세'
  }
  if (pattern.startsWith('3-') && pattern.endsWith('-1')) {
    desc += ' | 원정팀 강세'
  }
  if (pattern.includes('-0-')) {
    desc += ' | 극단적 케이스'
  }
  
  return desc
}

// 추천 생성
function generateRecommendation(homeWinRate: number, drawRate: number, awayWinRate: number, confidence: string): string {
  if (confidence === 'VERY_LOW') {
    return '샘플 부족 - 참고용'
  }
  
  const maxRate = Math.max(homeWinRate, drawRate, awayWinRate)
  
  if (maxRate === homeWinRate && homeWinRate >= 0.55) {
    return `홈승 추천 (${(homeWinRate * 100).toFixed(0)}%)`
  }
  if (maxRate === awayWinRate && awayWinRate >= 0.45) {
    return `원정승 추천 (${(awayWinRate * 100).toFixed(0)}%)`
  }
  if (drawRate >= 0.35) {
    return `무승부 고려 (${(drawRate * 100).toFixed(0)}%)`
  }
  
  return '확률 차이 적음 - 주의'
}

// ============================================
// 경기별 확률 계산 (선제골 + 폼 기반)
// ============================================

interface TeamStatsCache {
  [key: string]: any
}

async function calculateMatchProbability(
  match: any,
  teamStatsCache: TeamStatsCache
): Promise<{ home: number; draw: number; away: number } | null> {
  
  const { home_team_id, away_team_id, season, league_id } = match
  
  // 팀 통계 조회 (캐시 활용)
  const homeKey = `${home_team_id}-${season}`
  const awayKey = `${away_team_id}-${season}`
  
  let homeStats = teamStatsCache[homeKey]
  let awayStats = teamStatsCache[awayKey]
  
  if (!homeStats) {
    const { data } = await supabase
      .from('fg_team_stats')
      .select('*')
      .eq('team_id', home_team_id)
      .eq('season', season)
      .single()
    homeStats = data
    if (homeStats) teamStatsCache[homeKey] = homeStats
  }
  
  if (!awayStats) {
    const { data } = await supabase
      .from('fg_team_stats')
      .select('*')
      .eq('team_id', away_team_id)
      .eq('season', season)
      .single()
    awayStats = data
    if (awayStats) teamStatsCache[awayKey] = awayStats
  }
  
  // 둘 중 하나라도 없으면 스킵
  if (!homeStats || !awayStats) {
    return null
  }
  
  // P/A 계산
  const homePA_all = calcPA(homeStats.home_goals_for || 1, homeStats.home_goals_against || 1)
  const homePA_five = homeStats.form_home_5 ? homeStats.form_home_5 / 1.5 : homePA_all
  
  const awayPA_all = calcPA(awayStats.away_goals_for || 1, awayStats.away_goals_against || 1)
  const awayPA_five = awayStats.form_away_5 ? awayStats.form_away_5 / 1.5 : awayPA_all
  
  // 선제골 승률
  const homeFirstGoalWinRate = calcWinRate(
    homeStats.home_first_goal_wins || 0,
    homeStats.home_first_goal_games || 1
  )
  const awayFirstGoalWinRate = calcWinRate(
    awayStats.away_first_goal_wins || 0,
    awayStats.away_first_goal_games || 1
  )
  
  // Method 1: P/A 비교
  const homeAdvantage = (homePA_all + homePA_five) / 2
  const awayAdvantage = (awayPA_all + awayPA_five) / 2
  const totalAdvantage = homeAdvantage + awayAdvantage
  
  const homeFirstGoalBonus = (homeFirstGoalWinRate - 0.5) * 0.3
  const awayFirstGoalBonus = (awayFirstGoalWinRate - 0.5) * 0.3
  
  let m1_win = (homeAdvantage / totalAdvantage) + homeFirstGoalBonus
  let m1_lose = (awayAdvantage / totalAdvantage) + awayFirstGoalBonus
  let m1_draw = 1 - m1_win - m1_lose
  if (m1_draw < 0.08) m1_draw = 0.08
  
  // Method 2: min-max 조합
  const homeMin = Math.min(homePA_all, homePA_five)
  const homeMax = Math.max(homePA_all, homePA_five)
  const awayMax = Math.max(awayPA_all, awayPA_five)
  const awayMin = Math.min(awayPA_all, awayPA_five)
  
  const minmin = homeMin / (homeMin + awayMax)
  const maxmin = homeMax / (homeMax + awayMax)
  const minmax = homeMin / (homeMin + awayMin)
  
  let m2_win = (minmin + maxmin + minmax) / 3
  const paDiff = Math.abs(homeAdvantage - awayAdvantage)
  let m2_draw = Math.max(0.12, 0.30 - paDiff * 0.15)
  let m2_lose = 1 - m2_win - m2_draw
  
  // Method 3: 선제골 시나리오
  const homeScoreFirst = homePA_all / (homePA_all + awayPA_all)
  const awayScoreFirst = 1 - homeScoreFirst
  
  const homeComebackRate = calcWinRate(
    homeStats.home_concede_first_wins || 0,
    homeStats.home_concede_first_games || 1
  )
  const awayComebackRate = calcWinRate(
    awayStats.away_concede_first_wins || 0,
    awayStats.away_concede_first_games || 1
  )
  
  let m3_win = homeScoreFirst * homeFirstGoalWinRate + awayScoreFirst * homeComebackRate
  let m3_lose = awayScoreFirst * awayFirstGoalWinRate + homeScoreFirst * awayComebackRate
  let m3_draw = 1 - m3_win - m3_lose
  if (m3_draw < 0.08) m3_draw = 0.08
  if (m3_draw > 0.35) m3_draw = 0.35
  
  // 3 Method 평균
  let avgWin = (m1_win + m2_win + m3_win) / 3
  let avgDraw = (m1_draw + m2_draw + m3_draw) / 3
  let avgLose = (m1_lose + m2_lose + m3_lose) / 3
  
  // 승격팀 보정
  if (homeStats.is_promoted) {
    avgWin *= homeStats.promotion_factor || 0.85
  }
  if (awayStats.is_promoted) {
    avgLose *= awayStats.promotion_factor || 0.85
  }
  
  // 정규화
  const total = avgWin + avgDraw + avgLose
  
  return {
    home: avgWin / total,
    draw: avgDraw / total,
    away: avgLose / total,
  }
}

// ============================================
// 메인 로직
// ============================================

async function calculatePatterns(
  leagueId: number | null = null,
  season: string | null = null
): Promise<{ patterns: number; updated: number; errors: number; skipped: number }> {
  
  // 경기 데이터 조회 (결과 있는 것만)
  let query = supabase
    .from('fg_match_history')
    .select('*')
    .not('result', 'is', null)
  
  if (leagueId) query = query.eq('league_id', leagueId)
  if (season) query = query.eq('season', season)
  
  const { data: matches, error } = await query
  
  if (error || !matches) {
    console.error('Error fetching matches:', error)
    return { patterns: 0, updated: 0, errors: 1, skipped: 0 }
  }
  
  console.log(`📊 Processing ${matches.length} matches...`)
  
  // 팀 통계 캐시
  const teamStatsCache: TeamStatsCache = {}
  
  // 패턴별 집계
  interface PatternData {
    total: number
    homeWins: number
    draws: number
    awayWins: number
  }
  
  const patternMap: Map<string, PatternData> = new Map()
  const patternByLeague: Map<string, Map<string, PatternData>> = new Map()
  
  let skipped = 0
  let processed = 0
  
  for (const match of matches) {
    // 확률 계산
    const prob = await calculateMatchProbability(match, teamStatsCache)
    
    if (!prob) {
      skipped++
      continue
    }
    
    // 패턴 코드 계산
    const pattern = calculatePattern(prob.home, prob.draw, prob.away)
    const { result, league_id, league_code } = match
    
    // 전체 통합 집계
    if (!patternMap.has(pattern)) {
      patternMap.set(pattern, { total: 0, homeWins: 0, draws: 0, awayWins: 0 })
    }
    const data = patternMap.get(pattern)!
    data.total++
    if (result === 'HOME') data.homeWins++
    else if (result === 'DRAW') data.draws++
    else if (result === 'AWAY') data.awayWins++
    
    // 리그별 집계
    const leagueKey = `${league_id}-${league_code}`
    if (!patternByLeague.has(leagueKey)) {
      patternByLeague.set(leagueKey, new Map())
    }
    const leaguePatterns = patternByLeague.get(leagueKey)!
    if (!leaguePatterns.has(pattern)) {
      leaguePatterns.set(pattern, { total: 0, homeWins: 0, draws: 0, awayWins: 0 })
    }
    const leagueData = leaguePatterns.get(pattern)!
    leagueData.total++
    if (result === 'HOME') leagueData.homeWins++
    else if (result === 'DRAW') leagueData.draws++
    else if (result === 'AWAY') leagueData.awayWins++
    
    processed++
    
    // 진행 로그 (100개마다)
    if (processed % 100 === 0) {
      console.log(`  Processed ${processed}/${matches.length}...`)
    }
  }
  
  console.log(`📊 Found ${patternMap.size} unique patterns (${skipped} skipped)`)
  
  // 기존 패턴 삭제 (새로 계산)
  await supabase.from('fg_patterns').delete().neq('pattern', '')
  
  // DB 저장
  let updated = 0
  let errors = 0
  
  // 1. 전체 통합 패턴 저장
  for (const [pattern, data] of patternMap) {
    const homeWinRate = data.total > 0 ? data.homeWins / data.total : 0
    const drawRate = data.total > 0 ? data.draws / data.total : 0
    const awayWinRate = data.total > 0 ? data.awayWins / data.total : 0
    const confidence = evaluateConfidence(data.total)
    
    const patternRecord = {
      pattern,
      league_id: null,
      league_code: null,
      season: null,
      total_matches: data.total,
      home_wins: data.homeWins,
      draws: data.draws,
      away_wins: data.awayWins,
      home_win_rate: homeWinRate,
      draw_rate: drawRate,
      away_win_rate: awayWinRate,
      confidence,
      description: generateDescription(pattern, homeWinRate, drawRate, awayWinRate),
      recommendation: generateRecommendation(homeWinRate, drawRate, awayWinRate, confidence),
      updated_at: new Date().toISOString(),
    }
    
    const { error } = await supabase.from('fg_patterns').insert(patternRecord)
    
    if (error) {
      console.error(`Error inserting pattern ${pattern}:`, error.message)
      errors++
    } else {
      updated++
    }
  }
  
  // 2. 리그별 패턴 저장 (최소 5경기 이상)
  for (const [leagueKey, patterns] of patternByLeague) {
    const [leagueIdStr, leagueCode] = leagueKey.split('-')
    const leagueId = parseInt(leagueIdStr)
    
    for (const [pattern, data] of patterns) {
      if (data.total < 5) continue
      
      const homeWinRate = data.total > 0 ? data.homeWins / data.total : 0
      const drawRate = data.total > 0 ? data.draws / data.total : 0
      const awayWinRate = data.total > 0 ? data.awayWins / data.total : 0
      const confidence = evaluateConfidence(data.total)
      
      const patternRecord = {
        pattern,
        league_id: leagueId,
        league_code: leagueCode,
        season: null,
        total_matches: data.total,
        home_wins: data.homeWins,
        draws: data.draws,
        away_wins: data.awayWins,
        home_win_rate: homeWinRate,
        draw_rate: drawRate,
        away_win_rate: awayWinRate,
        confidence,
        description: generateDescription(pattern, homeWinRate, drawRate, awayWinRate),
        recommendation: generateRecommendation(homeWinRate, drawRate, awayWinRate, confidence),
        updated_at: new Date().toISOString(),
      }
      
      const { error } = await supabase.from('fg_patterns').insert(patternRecord)
      
      if (error) {
        console.error(`Error inserting league pattern ${pattern}:`, error.message)
        errors++
      } else {
        updated++
      }
    }
  }
  
  console.log(`✅ Updated ${updated} patterns, ${errors} errors, ${skipped} skipped`)
  
  return { patterns: patternMap.size, updated, errors, skipped }
}

// ============================================
// API 핸들러
// ============================================

export async function GET(request: NextRequest) {
  const { data: patterns, count } = await supabase
    .from('fg_patterns')
    .select('*', { count: 'exact' })
    .is('league_id', null)
    .order('total_matches', { ascending: false })
    .limit(10)
  
  return NextResponse.json({
    status: 'ready',
    version: 'v2-firstgoal',
    totalPatterns: count || 0,
    topPatterns: patterns?.map(p => ({
      pattern: p.pattern,
      matches: p.total_matches,
      homeWin: `${(p.home_win_rate * 100).toFixed(1)}%`,
      draw: `${(p.draw_rate * 100).toFixed(1)}%`,
      awayWin: `${(p.away_win_rate * 100).toFixed(1)}%`,
      confidence: p.confidence,
    })),
    note: '선제골 + 폼 기반 패턴 (배당 불필요)',
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, leagueId, season } = body
    
    const startTime = Date.now()
    
    if (mode === 'all') {
      const result = await calculatePatterns()
      const duration = Math.round((Date.now() - startTime) / 1000)
      
      return NextResponse.json({
        success: true,
        mode: 'all',
        ...result,
        duration: `${duration}s`,
      })
      
    } else if (mode === 'league' && leagueId) {
      const result = await calculatePatterns(leagueId, null)
      const duration = Math.round((Date.now() - startTime) / 1000)
      
      return NextResponse.json({
        success: true,
        mode: 'league',
        leagueId,
        ...result,
        duration: `${duration}s`,
      })
      
    } else {
      return NextResponse.json({
        error: 'Invalid mode',
        examples: {
          all: { mode: 'all' },
          league: { mode: 'league', leagueId: 39 },
        }
      }, { status: 400 })
    }
    
  } catch (error: any) {
    console.error('Pattern calculation error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}
