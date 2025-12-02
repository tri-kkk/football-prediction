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
      },
      cache: 'no-store'
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

// API-Football 통계 가져오기
async function getMatchStatistics(matchId: string) {
  try {
    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures/statistics?fixture=${matchId}`,
      {
        headers: {
          'x-rapidapi-key': process.env.API_FOOTBALL_KEY!,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        cache: 'no-store'
      }
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    if (!data.response || data.response.length < 2) return null
    
    const homeStats = data.response[0].statistics
    const awayStats = data.response[1].statistics
    
    // 통계 매핑
    const findStat = (stats: any[], type: string) => {
      const stat = stats.find((s: any) => s.type === type)
      return stat ? stat.value : null
    }
    
    return {
      shots_total_home: findStat(homeStats, 'Total Shots'),
      shots_total_away: findStat(awayStats, 'Total Shots'),
      shots_on_goal_home: findStat(homeStats, 'Shots on Goal'),
      shots_on_goal_away: findStat(awayStats, 'Shots on Goal'),
      possession_home: parseInt(findStat(homeStats, 'Ball Possession')?.replace('%', '') || '0'),
      possession_away: parseInt(findStat(awayStats, 'Ball Possession')?.replace('%', '') || '0'),
      pass_accuracy_home: parseInt(findStat(homeStats, 'Passes %')?.replace('%', '') || '0'),
      pass_accuracy_away: parseInt(findStat(awayStats, 'Passes %')?.replace('%', '') || '0'),
      fouls_home: findStat(homeStats, 'Fouls'),
      fouls_away: findStat(awayStats, 'Fouls'),
      yellow_cards_home: findStat(homeStats, 'Yellow Cards'),
      yellow_cards_away: findStat(awayStats, 'Yellow Cards'),
      offsides_home: findStat(homeStats, 'Offsides'),
      offsides_away: findStat(awayStats, 'Offsides'),
      corners_home: findStat(homeStats, 'Corner Kicks'),
      corners_away: findStat(awayStats, 'Corner Kicks'),
    }
  } catch (error) {
    console.error('❌ Error fetching statistics:', error)
    return null
  }
}

// 리그 코드 → API-Football ID 매핑 (시즌 2025)
const LEAGUE_IDS: Record<string, { id: number, season: number }> = {
  'CL': { id: 2, season: 2025 },      // Champions League
  'EL': { id: 3, season: 2025 },      // Europa League
  'UECL': { id: 848, season: 2025 },  // Conference League
  'UNL': { id: 5, season: 2025 },     // Nations League
  'PL': { id: 39, season: 2025 },     // Premier League
  'ELC': { id: 40, season: 2025 },    // Championship
  'PD': { id: 140, season: 2025 },    // La Liga
  'BL1': { id: 78, season: 2025 },    // Bundesliga
  'SA': { id: 135, season: 2025 },    // Serie A
  'FL1': { id: 61, season: 2025 },    // Ligue 1
  'PPL': { id: 94, season: 2025 },    // Primeira Liga
  'DED': { id: 88, season: 2025 },    // Eredivisie
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const league = searchParams.get('league') || 'ALL'
    const period = searchParams.get('period') || 'week'
    const specificDate = searchParams.get('date') // 특정 날짜 (YYYY-MM-DD)
    
    console.log(`📊 Fetching match results: league=${league}, period=${period}, date=${specificDate}`)
    
    // 날짜 범위 계산
    const now = new Date()
    let fromDate: Date
    let toDate: Date
    
    if (specificDate) {
      // 한국 시간 기준 해당 날짜의 경기를 가져오려면
      // UTC 기준으로 전날~당일 범위로 조회 필요
      // (한국 12/2 00:00 = UTC 12/1 15:00)
      const targetDate = new Date(specificDate)
      fromDate = new Date(targetDate)
      fromDate.setDate(fromDate.getDate() - 1) // 전날부터
      toDate = new Date(targetDate)
      toDate.setDate(toDate.getDate() + 1) // 다음날까지
      console.log(`📅 Specific date mode: ${specificDate} (KST)`)
      console.log(`📅 API range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]} (UTC)`)
    } else {
      // 기존 period 기반 로직
      toDate = now
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
        console.log(`  → Fetching ${code} (season ${leagueConfig.season})...`)
        const matches = await getFinishedMatches(leagueConfig.id, leagueConfig.season, fromStr, toStr)
        console.log(`  ✓ ${code}: ${matches.length} matches`)
        return matches.map((m: any) => ({
          ...m,
          leagueCode: code
        }))
      })
      
      const results = await Promise.all(promises)
      allMatches = results.flat()
    } else {
      const leagueConfig = LEAGUE_IDS[league]
      if (leagueConfig) {
        console.log(`🔄 Fetching ${league} (season ${leagueConfig.season})...`)
        const matches = await getFinishedMatches(leagueConfig.id, leagueConfig.season, fromStr, toStr)
        console.log(`  ✓ ${league}: ${matches.length} matches`)
        allMatches = matches.map((m: any) => ({
          ...m,
          leagueCode: league
        }))
      }
    }
    
    console.log(`📥 Fetched ${allMatches.length} matches from API`)
    
    // 데이터 변환
    let formattedMatches = allMatches.map((match: any) => ({
      match_id: match.fixture?.id?.toString() || '',
      home_team: match.teams?.home?.name || '',
      away_team: match.teams?.away?.name || '',
      home_crest: match.teams?.home?.logo || '',
      away_crest: match.teams?.away?.logo || '',
      match_date: match.fixture?.date || '',
      league: match.leagueCode || '',
      final_score_home: match.goals?.home ?? 0,
      final_score_away: match.goals?.away ?? 0,
    }))
    
    // 특정 날짜 필터링 (한국 시간 UTC+9 기준)
    if (specificDate) {
      formattedMatches = formattedMatches.filter((match: any) => {
        const matchDate = new Date(match.match_date)
        
        // 한국 시간으로 변환 (UTC+9)
        const kstOffset = 9 * 60 * 60 * 1000
        const kstDate = new Date(matchDate.getTime() + kstOffset)
        const kstDateStr = kstDate.toISOString().split('T')[0]
        
        console.log(`    Match: ${match.home_team} vs ${match.away_team}`)
        console.log(`    UTC: ${match.match_date}`)
        console.log(`    KST Date: ${kstDateStr}`)
        console.log(`    Target: ${specificDate}`)
        console.log(`    Match: ${kstDateStr === specificDate}`)
        
        return kstDateStr === specificDate
      })
      console.log(`📅 Filtered to ${formattedMatches.length} matches for ${specificDate} (KST)`)
    }
    
    console.log(`✅ Formatted ${formattedMatches.length} matches`)
    
    // 시간순 정렬
    formattedMatches.sort((a: any, b: any) => 
      new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    )
    
    // 통계 추가 (요청시)
    let matches = formattedMatches
    const includeStats = searchParams.get('stats') === 'true'
    
    if (includeStats && matches.length > 0) {
      console.log(`📈 Fetching statistics for ${matches.length} matches...`)
      
      // 통계 가져오기 (최대 50개)
      const matchesForStats = matches.slice(0, 50)
      
      const statsMap = new Map()
      await Promise.all(
        matchesForStats.map(async (match: any) => {
          try {
            const statistics = await getMatchStatistics(match.match_id)
            if (statistics) {
              statsMap.set(match.match_id, statistics)
            }
          } catch (error) {
            console.error(`Failed to fetch stats for ${match.match_id}:`, error)
          }
        })
      )
      
      // 모든 경기에 통계 매핑
      matches = formattedMatches.map(match => ({
        ...match,
        statistics: statsMap.get(match.match_id) || null
      }))
      
      const statsCount = Array.from(statsMap.values()).filter(s => s).length
      console.log(`✅ Added statistics to ${statsCount} matches`)
    }
    
    console.log(`✅ Returning ${matches.length} matches`)
    if (matches.length > 0) {
      console.log(`📦 Sample match:`, JSON.stringify(matches[0], null, 2))
    }
    
    return NextResponse.json({
      success: true,
      matches,
      count: matches.length,
      date: specificDate || null,
      period: specificDate ? null : period
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