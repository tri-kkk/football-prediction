// app/api/cron/calculate-patterns-v3/route.ts
// 패턴 계산 API v3 - UPSERT 방식 (누적 가능)
// 타임아웃 방지를 위한 배치 처리 지원

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// 유틸 함수 (기존과 동일)
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

function evaluateConfidence(sampleSize: number): string {
  if (sampleSize >= 50) return 'HIGH'
  if (sampleSize >= 20) return 'MEDIUM'
  if (sampleSize >= 10) return 'LOW'
  return 'VERY_LOW'
}

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
    desc = `균형 패턴 - 예측 어려움`
  }
  
  if (pattern.startsWith('1-') && pattern.endsWith('-3')) {
    desc += ' | 홈팀 강세'
  }
  if (pattern.startsWith('3-') && pattern.endsWith('-1')) {
    desc += ' | 원정팀 강세'
  }
  
  return desc
}

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
// 팀 통계 캐시
// ============================================

interface TeamStatsCache {
  [key: string]: any
}

async function loadTeamStatsCache(leagueId: number | null): Promise<TeamStatsCache> {
  const cache: TeamStatsCache = {}
  
  let query = supabase.from('fg_team_stats').select('*')
  if (leagueId) {
    query = query.eq('league_id', leagueId)
  }
  
  const { data } = await query
  
  if (data) {
    for (const stat of data) {
      const key = `${stat.team_id}-${stat.season}`
      cache[key] = stat
    }
  }
  
  console.log(`📊 Loaded ${Object.keys(cache).length} team stats into cache`)
  return cache
}

// ============================================
// 경기별 확률 계산
// ============================================

function calculateMatchProbability(
  match: any,
  teamStatsCache: TeamStatsCache
): { home: number; draw: number; away: number } | null {
  
  const { home_team_id, away_team_id, season } = match
  
  const homeKey = `${home_team_id}-${season}`
  const awayKey = `${away_team_id}-${season}`
  
  const homeStats = teamStatsCache[homeKey]
  const awayStats = teamStatsCache[awayKey]
  
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
// UPSERT 함수 (핵심 변경!)
// ============================================

async function upsertPattern(patternData: {
  pattern: string
  league_id: number | null
  league_code: string | null
  total_matches: number
  home_wins: number
  draws: number
  away_wins: number
}): Promise<boolean> {
  
  const { pattern, league_id, total_matches, home_wins, draws, away_wins } = patternData
  
  const homeWinRate = total_matches > 0 ? home_wins / total_matches : 0
  const drawRate = total_matches > 0 ? draws / total_matches : 0
  const awayWinRate = total_matches > 0 ? away_wins / total_matches : 0
  const confidence = evaluateConfidence(total_matches)
  
  const record = {
    pattern,
    league_id: patternData.league_id,
    league_code: patternData.league_code,
    season: null,
    total_matches,
    home_wins,
    draws,
    away_wins,
    home_win_rate: homeWinRate,
    draw_rate: drawRate,
    away_win_rate: awayWinRate,
    confidence,
    description: generateDescription(pattern, homeWinRate, drawRate, awayWinRate),
    recommendation: generateRecommendation(homeWinRate, drawRate, awayWinRate, confidence),
    updated_at: new Date().toISOString(),
  }
  
  // 기존 패턴 있는지 확인
  let query = supabase
    .from('fg_patterns')
    .select('id')
    .eq('pattern', pattern)
  
  if (league_id === null) {
    query = query.is('league_id', null)
  } else {
    query = query.eq('league_id', league_id)
  }
  
  const { data: existing } = await query.single()
  
  if (existing) {
    // UPDATE
    const { error } = await supabase
      .from('fg_patterns')
      .update(record)
      .eq('id', existing.id)
    
    return !error
  } else {
    // INSERT
    const { error } = await supabase
      .from('fg_patterns')
      .insert(record)
    
    return !error
  }
}

// ============================================
// 메인 로직 (개선된 버전)
// ============================================

async function calculatePatterns(
  leagueId: number | null = null,
  batchSize: number = 2000
): Promise<{ patterns: number; updated: number; errors: number; skipped: number; processed: number }> {
  
  console.log(`🚀 Starting pattern calculation (leagueId: ${leagueId || 'ALL'}, batchSize: ${batchSize})`)
  
  // 1. 팀 통계 미리 로드 (캐시)
  const teamStatsCache = await loadTeamStatsCache(leagueId)
  
  // 2. 경기 데이터 조회
  let query = supabase
    .from('fg_match_history')
    .select('*')
    .eq('status', 'FINISHED')
    .not('result', 'is', null)
    .order('match_date', { ascending: true })
    .limit(batchSize)
  
  if (leagueId) {
    query = query.eq('league_id', leagueId)
  }
  
  const { data: matches, error } = await query
  
  if (error || !matches) {
    console.error('Error fetching matches:', error)
    return { patterns: 0, updated: 0, errors: 1, skipped: 0, processed: 0 }
  }
  
  console.log(`📊 Processing ${matches.length} matches...`)
  
  // 3. 패턴별 집계 (메모리에서)
  interface PatternData {
    total: number
    homeWins: number
    draws: number
    awayWins: number
    leagueCode: string | null
  }
  
  // 전체 통합 패턴
  const globalPatterns: Map<string, PatternData> = new Map()
  // 리그별 패턴
  const leaguePatterns: Map<string, Map<string, PatternData>> = new Map()
  
  let skipped = 0
  let processed = 0
  
  for (const match of matches) {
    const prob = calculateMatchProbability(match, teamStatsCache)
    
    if (!prob) {
      skipped++
      continue
    }
    
    const pattern = calculatePattern(prob.home, prob.draw, prob.away)
    const { result, league_id, league_code } = match
    
    // 전체 통합 집계
    if (!globalPatterns.has(pattern)) {
      globalPatterns.set(pattern, { total: 0, homeWins: 0, draws: 0, awayWins: 0, leagueCode: null })
    }
    const gData = globalPatterns.get(pattern)!
    gData.total++
    if (result === 'HOME') gData.homeWins++
    else if (result === 'DRAW') gData.draws++
    else if (result === 'AWAY') gData.awayWins++
    
    // 리그별 집계
    const leagueKey = String(league_id)
    if (!leaguePatterns.has(leagueKey)) {
      leaguePatterns.set(leagueKey, new Map())
    }
    const lPatterns = leaguePatterns.get(leagueKey)!
    if (!lPatterns.has(pattern)) {
      lPatterns.set(pattern, { total: 0, homeWins: 0, draws: 0, awayWins: 0, leagueCode: league_code })
    }
    const lData = lPatterns.get(pattern)!
    lData.total++
    if (result === 'HOME') lData.homeWins++
    else if (result === 'DRAW') lData.draws++
    else if (result === 'AWAY') lData.awayWins++
    
    processed++
  }
  
  console.log(`📊 Found ${globalPatterns.size} global patterns, ${skipped} skipped`)
  
  // 4. DB 저장 (UPSERT)
  let updated = 0
  let errors = 0
  
  // 전체 통합 패턴 저장
  for (const [pattern, data] of globalPatterns) {
    const success = await upsertPattern({
      pattern,
      league_id: null,
      league_code: null,
      total_matches: data.total,
      home_wins: data.homeWins,
      draws: data.draws,
      away_wins: data.awayWins,
    })
    
    if (success) updated++
    else errors++
  }
  
  // 리그별 패턴 저장 (최소 5경기 이상)
  for (const [leagueIdStr, patterns] of leaguePatterns) {
    const lid = parseInt(leagueIdStr)
    
    for (const [pattern, data] of patterns) {
      if (data.total < 5) continue
      
      const success = await upsertPattern({
        pattern,
        league_id: lid,
        league_code: data.leagueCode,
        total_matches: data.total,
        home_wins: data.homeWins,
        draws: data.draws,
        away_wins: data.awayWins,
      })
      
      if (success) updated++
      else errors++
    }
  }
  
  console.log(`✅ Updated ${updated} patterns, ${errors} errors, ${skipped} skipped, ${processed} processed`)
  
  return { 
    patterns: globalPatterns.size, 
    updated, 
    errors, 
    skipped,
    processed 
  }
}

// ============================================
// API 핸들러
// ============================================

export async function GET(request: NextRequest) {
  // 현재 패턴 상태 조회
  const { data: globalPatterns, count: globalCount } = await supabase
    .from('fg_patterns')
    .select('*', { count: 'exact' })
    .is('league_id', null)
    .order('total_matches', { ascending: false })
  
  const { count: leagueCount } = await supabase
    .from('fg_patterns')
    .select('*', { count: 'exact' })
    .not('league_id', 'is', null)
  
  const totalProcessed = globalPatterns?.reduce((sum, p) => sum + p.total_matches, 0) || 0
  
  return NextResponse.json({
    status: 'ready',
    version: 'v3-upsert',
    globalPatterns: globalCount || 0,
    leaguePatterns: leagueCount || 0,
    totalProcessed,
    topPatterns: globalPatterns?.slice(0, 5).map(p => ({
      pattern: p.pattern,
      matches: p.total_matches,
      homeWin: `${(p.home_win_rate * 100).toFixed(1)}%`,
      draw: `${(p.draw_rate * 100).toFixed(1)}%`,
      awayWin: `${(p.away_win_rate * 100).toFixed(1)}%`,
      confidence: p.confidence,
    })),
    usage: {
      all: 'POST { "mode": "all" }',
      league: 'POST { "mode": "league", "leagueId": 39 }',
      batch: 'POST { "mode": "all", "batchSize": 3000 }',
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, leagueId, batchSize = 2000 } = body
    
    const startTime = Date.now()
    
    if (mode === 'all') {
      // 전체 계산 (배치 사이즈 적용)
      const result = await calculatePatterns(null, batchSize)
      const duration = Math.round((Date.now() - startTime) / 1000)
      
      return NextResponse.json({
        success: true,
        mode: 'all',
        batchSize,
        ...result,
        duration: `${duration}s`,
      })
      
    } else if (mode === 'league' && leagueId) {
      // 리그별 계산
      const result = await calculatePatterns(leagueId, batchSize)
      const duration = Math.round((Date.now() - startTime) / 1000)
      
      return NextResponse.json({
        success: true,
        mode: 'league',
        leagueId,
        batchSize,
        ...result,
        duration: `${duration}s`,
      })
      
    } else {
      return NextResponse.json({
        error: 'Invalid mode',
        examples: {
          all: { mode: 'all' },
          allWithBatch: { mode: 'all', batchSize: 3000 },
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