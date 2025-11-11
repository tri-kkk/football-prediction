import { NextResponse } from 'next/server'

// API-Football 리그 ID 매핑
const API_FOOTBALL_LEAGUES: Record<string, number> = {
  PL: 39,   // 프리미어리그
  PD: 140,  // 라리가
  BL1: 78,  // 분데스리가
  SA: 135,  // 세리에A
  FL1: 61,  // 리그1
  CL: 2,    // 챔피언스리그
}

// 리그 ID → 리그 코드 역매핑
const LEAGUE_ID_TO_CODE: Record<number, string> = {
  39: 'PL',
  140: 'PD',
  78: 'BL1',
  135: 'SA',
  61: 'FL1',
  2: 'CL',
}

// API-Football Fixture 응답 인터페이스
interface ApiFootballFixture {
  fixture: {
    id: number
    date: string
    timezone: string
    status: {
      short: string
      long: string
    }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
  }
  teams: {
    home: {
      id: number
      name: string
      logo: string
    }
    away: {
      id: number
      name: string
      logo: string
    }
  }
  goals?: {
    home: number | null
    away: number | null
  }
  score?: {
    halftime: {
      home: number | null
      away: number | null
    }
    fulltime: {
      home: number | null
      away: number | null
    }
  }
}

// API-Football Odds 응답 인터페이스
interface ApiFootballOdds {
  fixture: {
    id: number
  }
  league: {
    id: number
    name: string
  }
  bookmakers: Array<{
    id: number
    name: string
    bets: Array<{
      id: number
      name: string
      values: Array<{
        value: string
        odd: string
      }>
    }>
  }>
}

// 오즈를 확률로 변환
function oddsToPercentage(odds: number): number {
  if (!odds || odds <= 0) return 0
  const percentage = (1 / odds) * 100
  return Math.round(percentage * 10) / 10
}

// 확률 정규화
function normalizePercentages(home: number, draw: number, away: number) {
  const total = home + draw + away
  if (total === 0) return { home: 33.3, draw: 33.3, away: 33.3 }
  
  return {
    home: Math.round((home / total) * 100 * 10) / 10,
    draw: Math.round((draw / total) * 100 * 10) / 10,
    away: Math.round((away / total) * 100 * 10) / 10,
  }
}

// Fixture를 Match 형식으로 변환
function convertFixtureToMatch(
  fixture: ApiFootballFixture,
  odds?: ApiFootballOdds
) {
  const leagueCode = LEAGUE_ID_TO_CODE[fixture.league.id] || 'XX'
  
  let homeWinRate = 33.3
  let drawRate = 33.3
  let awayWinRate = 33.3
  
  if (odds && odds.bookmakers.length > 0) {
    const bookmaker = odds.bookmakers[0]
    const matchWinnerBet = bookmaker.bets.find(
      bet => bet.name === 'Match Winner' || bet.id === 1
    )
    
    if (matchWinnerBet) {
      const homeOdds = parseFloat(
        matchWinnerBet.values.find(v => v.value === 'Home')?.odd || '0'
      )
      const drawOdds = parseFloat(
        matchWinnerBet.values.find(v => v.value === 'Draw')?.odd || '0'
      )
      const awayOdds = parseFloat(
        matchWinnerBet.values.find(v => v.value === 'Away')?.odd || '0'
      )
      
      const homePercent = oddsToPercentage(homeOdds)
      const drawPercent = oddsToPercentage(drawOdds)
      const awayPercent = oddsToPercentage(awayOdds)
      
      const normalized = normalizePercentages(homePercent, drawPercent, awayPercent)
      homeWinRate = normalized.home
      drawRate = normalized.draw
      awayWinRate = normalized.away
    }
  }
  
  const utcDate = new Date(fixture.fixture.date)
  const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000))
  
  const dateString = kstDate.toISOString().split('T')[0]
  const timeString = kstDate.toTimeString().slice(0, 5)
  
  return {
    id: fixture.fixture.id,
    league: fixture.league.name,
    leagueCode: leagueCode,
    leagueLogo: fixture.league.logo,
    date: dateString,
    time: timeString,
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    homeTeamKR: fixture.teams.home.name,
    awayTeamKR: fixture.teams.away.name,
    homeCrest: fixture.teams.home.logo,
    awayCrest: fixture.teams.away.logo,
    homeScore: fixture.goals?.home ?? null,
    awayScore: fixture.goals?.away ?? null,
    status: fixture.fixture.status.long,
    homeWinRate,
    drawRate,
    awayWinRate,
    utcDate: fixture.fixture.date,
  }
}

// 여러 Fixture를 한 번에 변환
function convertFixturesToMatches(
  fixtures: ApiFootballFixture[],
  oddsData?: ApiFootballOdds[]
) {
  return fixtures.map(fixture => {
    const odds = oddsData?.find(o => o.fixture.id === fixture.fixture.id)
    return convertFixtureToMatch(fixture, odds)
  })
}

// 날짜 범위 생성 (오늘부터 30일 후까지로 확대)
function getDateRange() {
  const today = new Date()
  const thirtyDaysLater = new Date()
  thirtyDaysLater.setDate(today.getDate() + 30)
  
  return {
    from: today.toISOString().split('T')[0],
    to: thirtyDaysLater.toISOString().split('T')[0],
  }
}

const API_KEY = process.env.API_FOOTBALL_KEY || '87fdad3a68c6386ce1921080461e91e6'
const BASE_URL = 'https://v3.football.api-sports.io'

// API-Football 요청 헬퍼
async function fetchFromApiFootball(endpoint: string) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'x-apisports-key': API_KEY,
    },
    next: { revalidate: 3600 }, // 1시간 캐싱 (API 사용량 절약)
  })

  if (!response.ok) {
    throw new Error(`API-Football request failed: ${response.status}`)
  }

  const data = await response.json()
  return data
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const league = searchParams.get('league') || 'PL'
    const type = searchParams.get('type') || 'fixtures'

    console.log('🏈 API-Football Request:', { league, type })

    const leagueId = API_FOOTBALL_LEAGUES[league]
    if (!leagueId) {
      return NextResponse.json(
        { error: `지원하지 않는 리그: ${league}` },
        { status: 400 }
      )
    }

    const season = 2025  // 2024/25 시즌

    if (type === 'fixtures') {
      const { from, to } = getDateRange()
      
      console.log('📅 날짜 범위:', from, '~', to)
      
      const fixturesData = await fetchFromApiFootball(
        `/fixtures?league=${leagueId}&season=${season}&from=${from}&to=${to}`
      )

      console.log('📅 Fixtures:', fixturesData.results, '경기')

      const fixtures: ApiFootballFixture[] = fixturesData.response || []
      
      // 오즈 데이터는 처음 20경기만 가져오기 (API 절약)
      let oddsData: ApiFootballOdds[] = []
      if (fixtures.length > 0) {
        try {
          const fixtureIds = fixtures.slice(0, 20).map(f => f.fixture.id)
          console.log('💰 오즈 요청:', fixtureIds.length, '경기')
          
          const oddsPromises = fixtureIds.map(id =>
            fetchFromApiFootball(`/odds?fixture=${id}&bet=1`)
              .then(data => data.response?.[0])
              .catch(() => null)
          )
          const oddsResults = await Promise.all(oddsPromises)
          oddsData = oddsResults.filter(Boolean)
          
          console.log('💰 Odds fetched:', oddsData.length, '경기')
        } catch (error) {
          console.warn('⚠️ Odds fetch failed, using fixtures only')
        }
      }

      const matches = convertFixturesToMatches(fixtures, oddsData)

      return NextResponse.json({
        success: true,
        data: matches,
        count: matches.length,
        league: league,
        dateRange: { from, to },
        source: 'api-football',
      })
    }

    if (type === 'odds') {
      const { from } = getDateRange()
      
      const oddsData = await fetchFromApiFootball(
        `/odds?league=${leagueId}&season=${season}&date=${from}&bet=1`
      )

      console.log('💰 Odds:', oddsData.results, '경기')

      return NextResponse.json({
        success: true,
        data: oddsData.response || [],
        count: oddsData.results || 0,
        league: league,
        source: 'api-football',
      })
    }

    if (type === 'live') {
      const liveData = await fetchFromApiFootball(
        `/fixtures?league=${leagueId}&season=${season}&live=all`
      )

      console.log('🔴 Live:', liveData.results, '경기')

      const fixtures: ApiFootballFixture[] = liveData.response || []
      const matches = convertFixturesToMatches(fixtures)

      return NextResponse.json({
        success: true,
        data: matches,
        count: matches.length,
        league: league,
        source: 'api-football',
      })
    }

    return NextResponse.json(
      { error: '지원하지 않는 타입입니다' },
      { status: 400 }
    )

  } catch (error) {
    console.error('❌ API-Football Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
