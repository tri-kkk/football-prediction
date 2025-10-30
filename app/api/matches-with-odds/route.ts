export const dynamic = 'force-dynamic'

interface FootballDataMatch {
  id: number
  utcDate: string
  status: string
  homeTeam: {
    id: number
    name: string
    shortName: string
    crest: string
  }
  awayTeam: {
    id: number
    name: string
    shortName: string
    crest: string
  }
  score: {
    fullTime: {
      home: number | null
      away: number | null
    }
  }
  competition: {
    id: number
    name: string
    code: string
    emblem: string
  }
}

interface OddsData {
  matchId: string
  homeTeam: string
  awayTeam: string
  homeOdds: number
  drawOdds: number
  awayOdds: number
  homeProbability: number
  drawProbability: number
  awayProbability: number
  timestamp: string
  commenceTime: string
}

interface IntegratedMatch {
  id: number
  league: string
  leagueCode: string
  leagueLogo: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  homeCrest: string
  awayCrest: string
  homeScore: number | null
  awayScore: number | null
  status: string
  // Odds data
  homeWinRate: number
  drawRate: number
  awayWinRate: number
  homeOdds: number
  drawOdds: number
  awayOdds: number
  oddsSource: 'live' | 'estimated' | 'none'
  oddsTimestamp?: string
}

// 팀 이름 정규화 (매칭용)
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/fc|afc|united|city|town|albion|hotspur/gi, '')
    .replace(/[^a-z]/g, '')
}

// 두 팀 이름이 비슷한지 확인
function isTeamMatch(name1: string, name2: string): boolean {
  const normalized1 = normalizeTeamName(name1)
  const normalized2 = normalizeTeamName(name2)
  
  // 정확히 일치
  if (normalized1 === normalized2) return true
  
  // 한쪽이 다른쪽을 포함
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true
  }
  
  // 짧은 이름 매칭 (예: "Arsenal" vs "Arsenal FC")
  const short1 = normalized1.substring(0, 4)
  const short2 = normalized2.substring(0, 4)
  if (short1 === short2 && short1.length >= 4) {
    return true
  }
  
  return false
}

// 경기 매칭
function matchOddsToFixture(
  fixture: FootballDataMatch,
  oddsData: OddsData[]
): OddsData | null {
  return oddsData.find(odds => 
    isTeamMatch(fixture.homeTeam.name, odds.homeTeam) &&
    isTeamMatch(fixture.awayTeam.name, odds.awayTeam)
  ) || null
}

// 리그 코드를 Odds API 스포츠 키로 변환
function getOddsSportKey(leagueCode: string): string {
  const mapping: Record<string, string> = {
    'PL': 'soccer_epl',
    'PD': 'soccer_spain_la_liga',
    'BL1': 'soccer_germany_bundesliga',
    'SA': 'soccer_italy_serie_a',
    'FL1': 'soccer_france_ligue_one',
    'CL': 'soccer_uefa_champs_league',
    'EL': 'soccer_uefa_europa_league'
  }
  return mapping[leagueCode] || ''
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const league = searchParams.get('league') || 'PL'
    
    console.log('🔄 Starting integrated match fetch...')
    console.log('League:', league)
    
    // 1. Football-Data API에서 경기 가져오기
    const footballDataKey = process.env.FOOTBALL_DATA_API_KEY
    
    if (!footballDataKey) {
      console.warn('⚠️ FOOTBALL_DATA_API_KEY not found')
      return Response.json({ error: 'Football Data API key not configured' }, { status: 500 })
    }
    
    console.log('📡 Fetching from Football-Data API...')
    
    const footballResponse = await fetch(
      `https://api.football-data.org/v4/competitions/${league}/matches?status=SCHEDULED`,
      {
        headers: {
          'X-Auth-Token': footballDataKey
        },
        next: { revalidate: 300 } // 5분 캐싱
      }
    )
    
    if (!footballResponse.ok) {
      throw new Error(`Football-Data API error: ${footballResponse.status}`)
    }
    
    const footballData = await footballResponse.json()
    const fixtures: FootballDataMatch[] = footballData.matches || []
    
    console.log(`✅ Got ${fixtures.length} fixtures from Football-Data`)
    
    // 2. The Odds API에서 오즈 가져오기
    const oddsSportKey = getOddsSportKey(league)
    let allOdds: OddsData[] = []
    
    if (oddsSportKey) {
      console.log('📡 Fetching from The Odds API...')
      console.log('Sport key:', oddsSportKey)
      
      try {
        const oddsResponse = await fetch(
          `${request.url.split('/api/')[0]}/api/odds?sport=${oddsSportKey}`,
          { next: { revalidate: 3600 } } // 1시간 캐싱
        )
        
        if (oddsResponse.ok) {
          const oddsJson = await oddsResponse.json()
          if (oddsJson.success) {
            allOdds = oddsJson.data
            console.log(`✅ Got ${allOdds.length} matches with odds`)
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch odds, continuing without them:', error)
      }
    } else {
      console.log('⚠️ No odds mapping for league:', league)
    }
    
    // 3. 매칭 및 통합
    console.log('🔗 Matching fixtures with odds...')
    
    const integratedMatches: IntegratedMatch[] = fixtures.map(fixture => {
      // 오즈 매칭 시도
      const matchedOdds = matchOddsToFixture(fixture, allOdds)
      
      const date = new Date(fixture.utcDate)
      
      // 기본 확률 (오즈 없을 경우)
      let homeWinRate = 33.3
      let drawRate = 33.3
      let awayWinRate = 33.3
      let homeOdds = 3.0
      let drawOdds = 3.0
      let awayOdds = 3.0
      let oddsSource: 'live' | 'estimated' | 'none' = 'estimated'
      let oddsTimestamp: string | undefined
      
      if (matchedOdds) {
        // 실제 오즈 사용
        homeWinRate = matchedOdds.homeProbability
        drawRate = matchedOdds.drawProbability
        awayWinRate = matchedOdds.awayProbability
        homeOdds = matchedOdds.homeOdds
        drawOdds = matchedOdds.drawOdds
        awayOdds = matchedOdds.awayOdds
        oddsSource = 'live'
        oddsTimestamp = matchedOdds.timestamp
        
        console.log(`✅ Matched: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`)
      } else {
        console.log(`⚠️ No odds for: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`)
        
        // 간단한 추정 (홈 팀 약간 우세)
        homeWinRate = 40
        drawRate = 30
        awayWinRate = 30
        oddsSource = 'estimated'
      }
      
      return {
        id: fixture.id,
        league: fixture.competition.name,
        leagueCode: fixture.competition.code,
        leagueLogo: fixture.competition.emblem,
        date: date.toLocaleDateString('ko-KR'),
        time: date.toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        homeTeam: fixture.homeTeam.name,
        awayTeam: fixture.awayTeam.name,
        homeCrest: fixture.homeTeam.crest,
        awayCrest: fixture.awayTeam.crest,
        homeScore: fixture.score.fullTime.home,
        awayScore: fixture.score.fullTime.away,
        status: fixture.status,
        homeWinRate,
        drawRate,
        awayWinRate,
        homeOdds,
        drawOdds,
        awayOdds,
        oddsSource,
        oddsTimestamp
      }
    })
    
    console.log('✅ Integration complete!')
    console.log(`📊 Total matches: ${integratedMatches.length}`)
    console.log(`📊 Live odds: ${integratedMatches.filter(m => m.oddsSource === 'live').length}`)
    console.log(`📊 Estimated: ${integratedMatches.filter(m => m.oddsSource === 'estimated').length}`)
    
    return Response.json({
      success: true,
      matches: integratedMatches,
      stats: {
        total: integratedMatches.length,
        liveOdds: integratedMatches.filter(m => m.oddsSource === 'live').length,
        estimated: integratedMatches.filter(m => m.oddsSource === 'estimated').length
      }
    })
    
  } catch (error) {
    console.error('❌ Integrated API Error:', error)
    return Response.json(
      { 
        success: false,
        error: 'Failed to fetch integrated match data',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
