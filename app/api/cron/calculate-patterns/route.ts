// app/api/cron/calculate-patterns/route.ts
// fg_match_history → fg_patterns 패턴 통계 계산 API
// 배당 기반 패턴 코드 생성 및 승률 집계

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
  const max = Math.max(homeProb, drawProb, awayProb)
  const min = Math.min(homeProb, drawProb, awayProb)
  
  const getCode = (value: number): number => {
    if (value >= max - 0.02) return 1        // 최대값 근처
    if (value <= min + 0.03) return 3        // 최소값 근처
    return 2                                  // 중간
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
  const [h, d, a] = pattern.split('-').map(Number)
  
  let desc = ''
  
  // 홈승 우세
  if (homeWinRate >= 0.60) {
    desc = `강력한 홈 우세 패턴 (홈승 ${(homeWinRate * 100).toFixed(1)}%)`
  } else if (homeWinRate >= 0.45) {
    desc = `홈승 우세 패턴 (${(homeWinRate * 100).toFixed(1)}%)`
  }
  // 원정승 우세
  else if (awayWinRate >= 0.50) {
    desc = `원정 우세 패턴 (원정승 ${(awayWinRate * 100).toFixed(1)}%)`
  }
  // 무승부 우세
  else if (drawRate >= 0.35) {
    desc = `무승부 높은 패턴 (${(drawRate * 100).toFixed(1)}%)`
  }
  // 균형
  else {
    desc = `균형 패턴 - 분석 어려움`
  }
  
  // 특수 패턴
  if (pattern === '1-2-3' || pattern === '1-3-3') {
    desc += ' | 홈팀 강세 시그널'
  }
  if (pattern === '3-2-1' || pattern === '3-3-1') {
    desc += ' | 원정팀 강세 시그널'
  }
  if (h === 1 && d === 1) {
    desc += ' | 홈승/무승부 가능성'
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
// 메인 로직
// ============================================

async function calculatePatterns(
  leagueId: number | null = null,
  season: string | null = null
): Promise<{ patterns: number; updated: number; errors: number }> {
  
  // 경기 데이터 조회 (배당 있는 것만)
  let query = supabase
    .from('fg_match_history')
    .select('*')
    .not('odds_home', 'is', null)
    .not('odds_draw', 'is', null)
    .not('odds_away', 'is', null)
  
  if (leagueId) query = query.eq('league_id', leagueId)
  if (season) query = query.eq('season', season)
  
  const { data: matches, error } = await query
  
  if (error || !matches) {
    console.error('Error fetching matches:', error)
    return { patterns: 0, updated: 0, errors: 1 }
  }
  
  console.log(`📊 Processing ${matches.length} matches with odds...`)
  
  // 패턴별 집계
  interface PatternData {
    total: number
    homeWins: number
    draws: number
    awayWins: number
    matches: any[]
  }
  
  const patternMap: Map<string, PatternData> = new Map()
  const patternByLeague: Map<string, Map<string, PatternData>> = new Map()
  
  for (const match of matches) {
    const { odds_home, odds_draw, odds_away, result, league_id, league_code } = match
    
    // 확률 계산
    const prob = oddsToProb(odds_home, odds_draw, odds_away)
    
    // 패턴 코드 계산
    const pattern = calculatePattern(prob.home, prob.draw, prob.away)
    
    // 전체 통합 집계
    if (!patternMap.has(pattern)) {
      patternMap.set(pattern, { total: 0, homeWins: 0, draws: 0, awayWins: 0, matches: [] })
    }
    const data = patternMap.get(pattern)!
    data.total++
    if (result === 'HOME') data.homeWins++
    else if (result === 'DRAW') data.draws++
    else if (result === 'AWAY') data.awayWins++
    data.matches.push(match)
    
    // 리그별 집계
    const leagueKey = `${league_id}-${league_code}`
    if (!patternByLeague.has(leagueKey)) {
      patternByLeague.set(leagueKey, new Map())
    }
    const leaguePatterns = patternByLeague.get(leagueKey)!
    if (!leaguePatterns.has(pattern)) {
      leaguePatterns.set(pattern, { total: 0, homeWins: 0, draws: 0, awayWins: 0, matches: [] })
    }
    const leagueData = leaguePatterns.get(pattern)!
    leagueData.total++
    if (result === 'HOME') leagueData.homeWins++
    else if (result === 'DRAW') leagueData.draws++
    else if (result === 'AWAY') leagueData.awayWins++
  }
  
  console.log(`📊 Found ${patternMap.size} unique patterns`)
  
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
    
    const { error } = await supabase
      .from('fg_patterns')
      .upsert(patternRecord, {
        onConflict: 'pattern,league_id,season',
      })
    
    if (error) {
      console.error(`Error upserting pattern ${pattern}:`, error.message)
      errors++
    } else {
      updated++
    }
  }
  
  // 2. 리그별 패턴 저장
  for (const [leagueKey, patterns] of patternByLeague) {
    const [leagueIdStr, leagueCode] = leagueKey.split('-')
    const leagueId = parseInt(leagueIdStr)
    
    for (const [pattern, data] of patterns) {
      if (data.total < 3) continue  // 최소 3경기 이상만
      
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
      
      const { error } = await supabase
        .from('fg_patterns')
        .upsert(patternRecord, {
          onConflict: 'pattern,league_id,season',
        })
      
      if (error) {
        console.error(`Error upserting league pattern ${pattern}:`, error.message)
        errors++
      } else {
        updated++
      }
    }
  }
  
  console.log(`✅ Updated ${updated} patterns, ${errors} errors`)
  
  return { patterns: patternMap.size, updated, errors }
}

// 경기별 패턴 업데이트 (fg_match_history.pattern 컬럼)
async function updateMatchPatterns(): Promise<number> {
  const { data: matches, error } = await supabase
    .from('fg_match_history')
    .select('id, odds_home, odds_draw, odds_away')
    .not('odds_home', 'is', null)
    .not('odds_draw', 'is', null)
    .not('odds_away', 'is', null)
  
  if (error || !matches) {
    console.error('Error fetching matches:', error)
    return 0
  }
  
  let updated = 0
  
  for (const match of matches) {
    const prob = oddsToProb(match.odds_home, match.odds_draw, match.odds_away)
    const pattern = calculatePattern(prob.home, prob.draw, prob.away)
    
    const { error: updateError } = await supabase
      .from('fg_match_history')
      .update({ pattern })
      .eq('id', match.id)
    
    if (!updateError) updated++
  }
  
  return updated
}

// ============================================
// API 핸들러
// ============================================

// GET: 상태 확인
export async function GET(request: NextRequest) {
  const { data: patterns, count } = await supabase
    .from('fg_patterns')
    .select('*', { count: 'exact' })
    .is('league_id', null)
    .order('total_matches', { ascending: false })
    .limit(10)
  
  return NextResponse.json({
    status: 'ready',
    totalPatterns: count || 0,
    topPatterns: patterns?.map(p => ({
      pattern: p.pattern,
      matches: p.total_matches,
      homeWin: `${(p.home_win_rate * 100).toFixed(1)}%`,
      draw: `${(p.draw_rate * 100).toFixed(1)}%`,
      awayWin: `${(p.away_win_rate * 100).toFixed(1)}%`,
      confidence: p.confidence,
    })),
    usage: {
      calculateAll: 'POST { "mode": "all" }',
      updateMatchPatterns: 'POST { "mode": "updateMatches" }',
    }
  })
}

// POST: 패턴 계산 실행
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, leagueId, season } = body
    
    const startTime = Date.now()
    
    if (mode === 'all') {
      // 전체 패턴 계산
      const result = await calculatePatterns()
      const duration = Math.round((Date.now() - startTime) / 1000)
      
      return NextResponse.json({
        success: true,
        mode: 'all',
        ...result,
        duration: `${duration}s`,
      })
      
    } else if (mode === 'updateMatches') {
      // 경기별 패턴 컬럼 업데이트
      const updated = await updateMatchPatterns()
      const duration = Math.round((Date.now() - startTime) / 1000)
      
      return NextResponse.json({
        success: true,
        mode: 'updateMatches',
        matchesUpdated: updated,
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
          updateMatches: { mode: 'updateMatches' },
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
