// app/api/cron/calculate-patterns-v3/route.ts
// 패턴 계산 API v3 - 누적 방식 (리그별 실행해도 전체 통합에 누적)
// 타임아웃 방지를 위한 배치 처리 지원
// K리그/J리그 지원 추가

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// 리그 설정
// ============================================
const LEAGUES = {
  europe: [
    { id: 39, code: 'PL', name: 'Premier League' },
    { id: 140, code: 'PD', name: 'La Liga' },
    { id: 78, code: 'BL1', name: 'Bundesliga' },
    { id: 135, code: 'SA', name: 'Serie A' },
    { id: 61, code: 'FL1', name: 'Ligue 1' },
    { id: 88, code: 'DED', name: 'Eredivisie' },
  ],
  asia: [
    { id: 292, code: 'K1', name: 'K League 1' },
    { id: 98, code: 'J1', name: 'J1 League' },
  ],
  americas: [
    { id: 253, code: 'MLS', name: 'Major League Soccer' },
  ]
}

// 전체 리그 ID 배열
const ALL_LEAGUE_IDS = [
  ...LEAGUES.europe.map(l => l.id),
  ...LEAGUES.asia.map(l => l.id),
  ...LEAGUES.americas.map(l => l.id)
]

// ============================================
// 유틸 함수
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
// 누적 UPSERT 함수 (핵심 변경!)
// ============================================

async function upsertPatternAccumulate(patternData: {
  pattern: string
  league_id: number | null
  league_code: string | null
  total_matches: number
  home_wins: number
  draws: number
  away_wins: number
  isGlobal: boolean  // 전체 통합 패턴인지 여부
  sourceLeagueId?: number  // 어느 리그에서 온 데이터인지
}): Promise<boolean> {
  
  const { pattern, league_id, total_matches, home_wins, draws, away_wins, isGlobal, sourceLeagueId } = patternData
  
  // 기존 패턴 조회
  let query = supabase
    .from('fg_patterns')
    .select('*')
    .eq('pattern', pattern)
  
  if (league_id === null) {
    query = query.is('league_id', null)
  } else {
    query = query.eq('league_id', league_id)
  }
  
  const { data: existing } = await query.single()
  
  let finalTotal: number
  let finalHomeWins: number
  let finalDraws: number
  let finalAwayWins: number
  
  if (existing && isGlobal) {
    // 전체 통합 패턴: 누적 (기존 + 새로운)
    finalTotal = existing.total_matches + total_matches
    finalHomeWins = existing.home_wins + home_wins
    finalDraws = existing.draws + draws
    finalAwayWins = existing.away_wins + away_wins
  } else {
    // 리그별 또는 신규: 새로운 값 사용
    finalTotal = total_matches
    finalHomeWins = home_wins
    finalDraws = draws
    finalAwayWins = away_wins
  }
  
  // 비율 계산
  const homeWinRate = finalTotal > 0 ? finalHomeWins / finalTotal : 0
  const drawRate = finalTotal > 0 ? finalDraws / finalTotal : 0
  const awayWinRate = finalTotal > 0 ? finalAwayWins / finalTotal : 0
  
  const confidence = evaluateConfidence(finalTotal)
  const description = generateDescription(pattern, homeWinRate, drawRate, awayWinRate)
  const recommendation = generateRecommendation(homeWinRate, drawRate, awayWinRate, confidence)
  
  const record = {
    pattern,
    league_id: league_id,
    league_code: patternData.league_code,
    total_matches: finalTotal,
    home_wins: finalHomeWins,
    draws: finalDraws,
    away_wins: finalAwayWins,
    home_win_rate: homeWinRate,
    draw_rate: drawRate,
    away_win_rate: awayWinRate,
    confidence,
    description,
    recommendation,
    updated_at: new Date().toISOString(),
  }
  
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
// 메인 로직
// ============================================

async function calculatePatterns(
  leagueId: number | null = null,
  resetGlobal: boolean = false
): Promise<{ patterns: number; updated: number; errors: number; skipped: number; processed: number }> {
  
  console.log(`🚀 Starting pattern calculation (leagueId: ${leagueId || 'ALL'}, resetGlobal: ${resetGlobal})`)
  
  // 전체 리셋 모드면 글로벌 패턴 삭제
  if (resetGlobal) {
    console.log('🗑️ Resetting global patterns...')
    await supabase.from('fg_patterns').delete().is('league_id', null)
  }
  
  // 1. 팀 통계 미리 로드 (캐시)
  const teamStatsCache = await loadTeamStatsCache(leagueId)
  
  // 2. 경기 데이터 조회
  let query = supabase
    .from('fg_match_history')
    .select('*')
    .eq('status', 'FINISHED')
    .not('result', 'is', null)
    .order('match_date', { ascending: true })
  
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
  
  // 전체 통합 패턴 (이번 리그에서 나온 것만)
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
    const { result, league_id: matchLeagueId, league_code } = match
    
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
    const leagueKey = String(matchLeagueId)
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
  
  console.log(`📊 Found ${globalPatterns.size} patterns from this batch, ${skipped} skipped`)
  
  // 4. DB 저장 (누적 UPSERT)
  let updated = 0
  let errors = 0
  
  // 전체 통합 패턴 저장 (누적!)
  for (const [pattern, data] of globalPatterns) {
    const success = await upsertPatternAccumulate({
      pattern,
      league_id: null,
      league_code: null,
      total_matches: data.total,
      home_wins: data.homeWins,
      draws: data.draws,
      away_wins: data.awayWins,
      isGlobal: true,  // 누적 모드
      sourceLeagueId: leagueId || undefined,
    })
    
    if (success) updated++
    else errors++
  }
  
  // 리그별 패턴 저장 (해당 리그만, 최소 5경기 이상)
  for (const [leagueIdStr, patterns] of leaguePatterns) {
    const lid = parseInt(leagueIdStr)
    
    // 현재 실행 중인 리그만 업데이트 (다른 리그 건드리지 않음)
    if (leagueId && lid !== leagueId) continue
    
    for (const [pattern, data] of patterns) {
      if (data.total < 5) continue
      
      const success = await upsertPatternAccumulate({
        pattern,
        league_id: lid,
        league_code: data.leagueCode,
        total_matches: data.total,
        home_wins: data.homeWins,
        draws: data.draws,
        away_wins: data.awayWins,
        isGlobal: false,  // 덮어쓰기 모드
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
    version: 'v3-accumulate',
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
    leagues: LEAGUES,
    usage: {
      reset_and_all: 'POST { "mode": "reset" } - 전체 리셋 후 전체 계산',
      league: 'POST { "mode": "league", "leagueId": 39 } - 리그별 누적',
      kleague: 'POST { "mode": "league", "leagueId": 292 } - K리그',
      jleague: 'POST { "mode": "league", "leagueId": 98 } - J리그',
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, leagueId } = body
    
    const startTime = Date.now()
    
    if (mode === 'reset') {
      // 전체 리셋 후 모든 리그 계산 (유럽 + 아시아)
      await supabase.from('fg_patterns').delete().is('league_id', null)
      
      let totalResult = { patterns: 0, updated: 0, errors: 0, skipped: 0, processed: 0 }
      
      for (const lid of ALL_LEAGUE_IDS) {
        console.log(`📊 Processing league ${lid}...`)
        const result = await calculatePatterns(lid, false)
        totalResult.patterns = Math.max(totalResult.patterns, result.patterns)
        totalResult.updated += result.updated
        totalResult.errors += result.errors
        totalResult.skipped += result.skipped
        totalResult.processed += result.processed
      }
      
      const duration = Math.round((Date.now() - startTime) / 1000)
      
      return NextResponse.json({
        success: true,
        mode: 'reset',
        leagues: ALL_LEAGUE_IDS.length,
        ...totalResult,
        duration: `${duration}s`,
      })
      
    } else if (mode === 'league' && leagueId) {
      // 리그별 계산 (글로벌에 누적)
      const result = await calculatePatterns(leagueId, false)
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
          reset: { mode: 'reset' },
          league: { mode: 'league', leagueId: 39 },
          kleague: { mode: 'league', leagueId: 292 },
          jleague: { mode: 'league', leagueId: 98 },
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