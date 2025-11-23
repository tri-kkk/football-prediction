import { NextRequest, NextResponse } from 'next/server'

// API-Football에서 완료된 경기 가져오기
async function getFinishedMatches(leagueId: number, season: number, from: string, to: string) {
  try {
    const url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&from=${from}&to=${to}&status=FT`
    console.log(`    📡 API URL: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': process.env.API_FOOTBALL_KEY!,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    })
    
    console.log(`    📊 Response status: ${response.status}`)
    
    if (!response.ok) {
      console.error(`    ❌ Failed to fetch league ${leagueId}:`, response.status)
      return []
    }
    
    const data = await response.json()
    console.log(`    📦 Response data:`, data.response?.length || 0, 'matches')
    return data.response || []
  } catch (error) {
    console.error(`    ❌ Error fetching matches for league ${leagueId}:`, error)
    return []
  }
}

// 리그 코드 → API-Football ID 매핑
const LEAGUE_IDS: Record<string, { id: number, season: number }> = {
  'CL': { id: 2, season: 2025 },
  'EL': { id: 3, season: 2025 },
  'UECL': { id: 848, season: 2025 },
  'UNL': { id: 5, season: 2025 },
  'PL': { id: 39, season: 2025 },
  'ELC': { id: 40, season: 2025 },
  'PD': { id: 140, season: 2025 },
  'BL1': { id: 78, season: 2025 },
  'SA': { id: 135, season: 2025 },
  'FL1': { id: 61, season: 2025 },
  'PPL': { id: 94, season: 2025 },
  'DED': { id: 88, season: 2025 },
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const league = searchParams.get('league') || 'ALL'
    const period = searchParams.get('period') || 'week'
    
    console.log(`📊 Fetching match results: league=${league}, period=${period}`)
    
    // 날짜 범위 계산
    const now = new Date()
    let fromDate: Date
    let toDate: Date = now
    
    switch (period) {
      case 'today':
        fromDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
        break
      case 'week':
        fromDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        fromDate = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)
        break
      default:
        fromDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    }
    
    const fromStr = fromDate.toISOString().split('T')[0]
    const toStr = toDate.toISOString().split('T')[0]
    
    console.log(`📅 Date range: ${fromStr} to ${toStr}`)
    
    let allMatches: any[] = []
    
    if (league === 'ALL') {
      const leagueCodes = Object.keys(LEAGUE_IDS)
      console.log(`🔄 Fetching from ${leagueCodes.length} leagues...`)
      
      const promises = leagueCodes.map(async (code) => {
        const leagueConfig = LEAGUE_IDS[code]
        console.log(`  → Fetching ${code}...`)
        const matches = await getFinishedMatches(leagueConfig.id, leagueConfig.season, fromStr, toStr)
        console.log(`  ✓ ${code}: ${matches.length} matches`)
        return matches.map((m: any) => ({
          ...m,
          league: code
        }))
      })
      
      const results = await Promise.all(promises)
      allMatches = results.flat()
    } else {
      const leagueConfig = LEAGUE_IDS[league]
      if (leagueConfig) {
        console.log(`🔄 Fetching ${league}...`)
        const matches = await getFinishedMatches(leagueConfig.id, leagueConfig.season, fromStr, toStr)
        console.log(`  ✓ ${league}: ${matches.length} matches`)
        allMatches = matches.map((m: any) => ({
          ...m,
          league
        }))
      }
    }
    
    console.log(`📥 Fetched ${allMatches.length} matches from API`)
    
    // 데이터 변환
    const formattedMatches = allMatches.map((match: any) => ({
      match_id: match.fixture?.id?.toString() || '',
      home_team: match.teams?.home?.name || '',
      away_team: match.teams?.away?.name || '',
      home_crest: match.teams?.home?.logo || '',
      away_crest: match.teams?.away?.logo || '',
      match_date: match.fixture?.date || '',
      league: match.league || '',
      final_score_home: match.goals?.home ?? 0,
      final_score_away: match.goals?.away ?? 0,
    }))
    
    console.log(`✅ Formatted ${formattedMatches.length} matches`)
    
    // 날짜순 정렬
    formattedMatches.sort((a: any, b: any) => 
      new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
    )
    
    console.log(`✅ Returning ${formattedMatches.length} matches`)
    console.log(`📦 Sample match:`, formattedMatches[0])
    
    return NextResponse.json({
      success: true,
      matches: formattedMatches,
      count: formattedMatches.length
    })
  } catch (error) {
    console.error('❌ Error in match-results API:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch match results',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}