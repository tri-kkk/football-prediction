import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 리그 코드 매핑
const LEAGUE_NAMES: { [key: string]: string } = {
  'PL': '프리미어리그',
  'PD': '라리가',
  'BL1': '분데스리가',
  'SA': '세리에A',
  'FL1': '리그1',
  'CL': '챔피언스리그',
  'EL': '유로파리그',
  'PPL': '프리메이라리가',
  'DED': '에레디비시',
  'ELC': '챔피언십'
}

// 조합 타입 정의
interface InsightMatch {
  match_id: string
  home_team: string
  away_team: string
  home_team_logo: string
  away_team_logo: string
  league_code: string
  league_name: string
  commence_time: string
  home_probability: number
  draw_probability: number
  away_probability: number
  home_odds: number
  draw_odds: number
  away_odds: number
  recommendation: 'HOME' | 'DRAW' | 'AWAY'
  confidence: number
  trend_direction: 'UP' | 'DOWN' | 'STABLE'
  trend_change: number
}

interface InsightCombo {
  id: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  type: 'SAFE' | 'BALANCED' | 'HIGH_RETURN' | 'TRENDING'
  matches: InsightMatch[]
  totalOdds: number
  expectedReturn: number
  confidence: number
  icon: string
}

// 트렌드 데이터 가져오기
async function getMatchTrend(matchId: string): Promise<{ direction: 'UP' | 'DOWN' | 'STABLE', change: number }> {
  try {
    const { data, error } = await supabase
      .from('match_odds_history')
      .select('home_probability, collected_at')
      .eq('match_id', matchId)
      .order('collected_at', { ascending: true })
      .limit(10)

    if (error || !data || data.length < 2) {
      return { direction: 'STABLE', change: 0 }
    }

    const firstProb = data[0].home_probability
    const lastProb = data[data.length - 1].home_probability
    const change = lastProb - firstProb

    if (change > 3) return { direction: 'UP', change }
    if (change < -3) return { direction: 'DOWN', change }
    return { direction: 'STABLE', change }
  } catch {
    return { direction: 'STABLE', change: 0 }
  }
}

// 오늘의 경기 데이터 가져오기 (현재 시간 이후 경기만)
async function getTodayMatches(): Promise<InsightMatch[]> {
  const now = new Date()
  const nowISO = now.toISOString()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowEnd = tomorrow.toISOString().split('T')[0] + 'T23:59:59'

  console.log('🕐 현재 시간:', nowISO)
  console.log('🔍 조회 범위:', nowISO, '~', tomorrowEnd)

  const { data, error } = await supabase
    .from('match_odds_latest')
    .select('*')
    .gte('commence_time', nowISO)  // 현재 시간 이후만!
    .lt('commence_time', tomorrowEnd)
    .order('commence_time', { ascending: true })

  if (error) {
    console.error('❌ 경기 데이터 조회 실패:', error)
    return []
  }

  // 트렌드 데이터 추가
  const matchesWithTrend = await Promise.all(
    (data || []).map(async (match) => {
      const trend = await getMatchTrend(match.match_id)
      
      // 최고 확률 찾기
      const probs = [
        { type: 'HOME' as const, prob: match.home_probability, odds: match.home_odds },
        { type: 'DRAW' as const, prob: match.draw_probability, odds: match.draw_odds },
        { type: 'AWAY' as const, prob: match.away_probability, odds: match.away_odds }
      ]
      const best = probs.reduce((a, b) => a.prob > b.prob ? a : b)

      return {
        match_id: match.match_id,
        home_team: match.home_team,
        away_team: match.away_team,
        home_team_logo: match.home_team_logo || '',
        away_team_logo: match.away_team_logo || '',
        league_code: match.league_code,
        league_name: LEAGUE_NAMES[match.league_code] || match.league_code,
        commence_time: match.commence_time,
        home_probability: match.home_probability,
        draw_probability: match.draw_probability,
        away_probability: match.away_probability,
        home_odds: match.home_odds,
        draw_odds: match.draw_odds,
        away_odds: match.away_odds,
        recommendation: best.type,
        confidence: best.prob,
        trend_direction: trend.direction,
        trend_change: trend.change
      }
    })
  )

  return matchesWithTrend
}

// 조합 생성 알고리즘
function generateCombos(matches: InsightMatch[]): InsightCombo[] {
  const combos: InsightCombo[] = []

  // 1. 안전 조합 (승률 60% 이상, 3-4경기)
  const safeMatches = matches
    .filter(m => m.confidence >= 55)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4)

  if (safeMatches.length >= 3) {
    const totalOdds = safeMatches.reduce((acc, m) => {
      const odds = m.recommendation === 'HOME' ? m.home_odds 
                 : m.recommendation === 'DRAW' ? m.draw_odds 
                 : m.away_odds
      return acc * odds
    }, 1)

    combos.push({
      id: 'safe-combo',
      name: '🛡️ 안전 조합',
      nameEn: '🛡️ Safe Combo',
      description: '승률 55% 이상 경기만 선별한 안정적인 조합',
      descriptionEn: 'Stable combo with matches above 55% win rate',
      type: 'SAFE',
      matches: safeMatches,
      totalOdds: Math.round(totalOdds * 100) / 100,
      expectedReturn: Math.round(totalOdds * 10000),
      confidence: Math.round(safeMatches.reduce((a, b) => a + b.confidence, 0) / safeMatches.length),
      icon: '🛡️'
    })
  }

  // 2. 상승 추세 조합 (트렌드 UP인 경기만)
  const trendingMatches = matches
    .filter(m => m.trend_direction === 'UP' && m.confidence >= 45)
    .sort((a, b) => b.trend_change - a.trend_change)
    .slice(0, 5)

  if (trendingMatches.length >= 3) {
    const totalOdds = trendingMatches.reduce((acc, m) => {
      const odds = m.recommendation === 'HOME' ? m.home_odds 
                 : m.recommendation === 'DRAW' ? m.draw_odds 
                 : m.away_odds
      return acc * odds
    }, 1)

    combos.push({
      id: 'trending-combo',
      name: '📈 상승 추세 조합',
      nameEn: '📈 Trending Up Combo',
      description: '24시간 내 승률이 상승 중인 경기 조합',
      descriptionEn: 'Matches with rising win probability in 24h',
      type: 'TRENDING',
      matches: trendingMatches,
      totalOdds: Math.round(totalOdds * 100) / 100,
      expectedReturn: Math.round(totalOdds * 10000),
      confidence: Math.round(trendingMatches.reduce((a, b) => a + b.confidence, 0) / trendingMatches.length),
      icon: '📈'
    })
  }

  // 3. 균형 조합 (5경기, 다양한 리그)
  const leagueGroups = new Map<string, InsightMatch[]>()
  matches.forEach(m => {
    const existing = leagueGroups.get(m.league_code) || []
    existing.push(m)
    leagueGroups.set(m.league_code, existing)
  })

  const balancedMatches: InsightMatch[] = []
  const usedLeagues = new Set<string>()
  
  // 각 리그에서 최고 확률 경기 1개씩
  const sortedByConfidence = matches.sort((a, b) => b.confidence - a.confidence)
  for (const match of sortedByConfidence) {
    if (!usedLeagues.has(match.league_code) && balancedMatches.length < 5) {
      balancedMatches.push(match)
      usedLeagues.add(match.league_code)
    }
  }

  if (balancedMatches.length >= 4) {
    const totalOdds = balancedMatches.reduce((acc, m) => {
      const odds = m.recommendation === 'HOME' ? m.home_odds 
                 : m.recommendation === 'DRAW' ? m.draw_odds 
                 : m.away_odds
      return acc * odds
    }, 1)

    combos.push({
      id: 'balanced-combo',
      name: '⚖️ 균형 조합',
      nameEn: '⚖️ Balanced Combo',
      description: '다양한 리그에서 선별한 균형잡힌 조합',
      descriptionEn: 'Balanced selection from various leagues',
      type: 'BALANCED',
      matches: balancedMatches,
      totalOdds: Math.round(totalOdds * 100) / 100,
      expectedReturn: Math.round(totalOdds * 10000),
      confidence: Math.round(balancedMatches.reduce((a, b) => a + b.confidence, 0) / balancedMatches.length),
      icon: '⚖️'
    })
  }

  // 4. 하이리턴 조합 (배당 높은 경기)
  const highReturnMatches = matches
    .filter(m => {
      const odds = m.recommendation === 'HOME' ? m.home_odds 
                 : m.recommendation === 'DRAW' ? m.draw_odds 
                 : m.away_odds
      return odds >= 1.8 && m.confidence >= 40
    })
    .sort((a, b) => {
      const oddsA = a.recommendation === 'HOME' ? a.home_odds 
                  : a.recommendation === 'DRAW' ? a.draw_odds 
                  : a.away_odds
      const oddsB = b.recommendation === 'HOME' ? b.home_odds 
                  : b.recommendation === 'DRAW' ? b.draw_odds 
                  : b.away_odds
      return oddsB - oddsA
    })
    .slice(0, 4)

  if (highReturnMatches.length >= 3) {
    const totalOdds = highReturnMatches.reduce((acc, m) => {
      const odds = m.recommendation === 'HOME' ? m.home_odds 
                 : m.recommendation === 'DRAW' ? m.draw_odds 
                 : m.away_odds
      return acc * odds
    }, 1)

    combos.push({
      id: 'high-return-combo',
      name: '🚀 하이리턴 조합',
      nameEn: '🚀 High Return Combo',
      description: '높은 배당으로 구성된 고수익 조합',
      descriptionEn: 'High odds selections for maximum returns',
      type: 'HIGH_RETURN',
      matches: highReturnMatches,
      totalOdds: Math.round(totalOdds * 100) / 100,
      expectedReturn: Math.round(totalOdds * 10000),
      confidence: Math.round(highReturnMatches.reduce((a, b) => a + b.confidence, 0) / highReturnMatches.length),
      icon: '🚀'
    })
  }

  return combos
}

// API 핸들러
export async function GET(request: NextRequest) {
  try {
    console.log('📊 인사이트 API 호출')
    
    // 오늘 경기 데이터 가져오기
    const matches = await getTodayMatches()
    console.log(`✅ 오늘 경기 수: ${matches.length}`)

    if (matches.length === 0) {
      return NextResponse.json({
        success: true,
        message: '오늘 예정된 경기가 없습니다',
        data: {
          combos: [],
          matchCount: 0,
          lastUpdated: new Date().toISOString()
        }
      })
    }

    // 조합 생성
    const combos = generateCombos(matches)
    console.log(`✅ 생성된 조합 수: ${combos.length}`)

    return NextResponse.json({
      success: true,
      data: {
        combos,
        matchCount: matches.length,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('❌ 인사이트 API 오류:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '인사이트 데이터를 불러올 수 없습니다',
        message: error.message 
      },
      { status: 500 }
    )
  }
}
