import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  const matchId = params.matchId

  try {
    const apiKey = process.env.API_FOOTBALL_KEY

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    console.log(`🔍 경기 상세 조회: ${matchId}`)

    // 경기 기본 정보 조회
    const fixtureResponse = await fetch(
      `https://v3.football.api-sports.io/fixtures?id=${matchId}`,
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        cache: 'no-store'
      }
    )

    if (!fixtureResponse.ok) {
      throw new Error(`API 요청 실패: ${fixtureResponse.status}`)
    }

    const fixtureData = await fixtureResponse.json()
    
    if (!fixtureData.response || fixtureData.response.length === 0) {
      return NextResponse.json(
        { success: false, error: '경기를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const match = fixtureData.response[0]
    const homeTeamId = match.teams.home.id
    const awayTeamId = match.teams.away.id

    // 병렬로 이벤트, 통계, 라인업 조회
    const [eventsRes, statsRes, lineupsRes] = await Promise.all([
      fetch(
        `https://v3.football.api-sports.io/fixtures/events?fixture=${matchId}`,
        {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'v3.football.api-sports.io'
          }
        }
      ),
      fetch(
        `https://v3.football.api-sports.io/fixtures/statistics?fixture=${matchId}`,
        {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'v3.football.api-sports.io'
          }
        }
      ),
      fetch(
        `https://v3.football.api-sports.io/fixtures/lineups?fixture=${matchId}`,
        {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'v3.football.api-sports.io'
          }
        }
      )
    ])

    const [eventsData, statsData, lineupsData] = await Promise.all([
      eventsRes.json(),
      statsRes.json(),
      lineupsRes.json()
    ])

    // 이벤트 처리
    const events = processEvents(eventsData.response || [], homeTeamId, awayTeamId)
    
    // 통계 처리
    const stats = processStats(statsData.response || [])
    
    // 라인업 처리
    const lineups = processLineups(lineupsData.response || [], homeTeamId)

    // 리그 코드 매핑
    const LEAGUE_IDS: Record<number, string> = {
      39: 'PL', 140: 'PD', 78: 'BL1', 135: 'SA', 61: 'FL1',
      2: 'CL', 3: 'EL', 40: 'ELC', 94: 'PPL', 88: 'DED',
      292: 'KL1', 98: 'J1', 188: 'ALG'
    }

    const leagueCode = LEAGUE_IDS[match.league.id] || 'OTHER'

    const result = {
      success: true,
      match: {
        id: match.fixture.id,
        fixtureId: match.fixture.id,
        leagueCode,
        league: match.league.name,
        leagueLogo: match.league.logo,
        country: match.league.country,
        
        date: match.fixture.date,
        timestamp: match.fixture.timestamp,
        venue: match.fixture.venue?.name || '',
        
        status: match.fixture.status.short,
        statusLong: match.fixture.status.long,
        elapsed: match.fixture.status.elapsed || 0,
        
        homeTeam: match.teams.home.name,
        awayTeam: match.teams.away.name,
        homeCrest: match.teams.home.logo,
        awayCrest: match.teams.away.logo,
        homeTeamId,
        awayTeamId,
        
        homeScore: match.goals.home ?? 0,
        awayScore: match.goals.away ?? 0,
        halftimeHomeScore: match.score.halftime?.home ?? null,
        halftimeAwayScore: match.score.halftime?.away ?? null,
        
        events,
        stats,
        lineups
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('❌ 경기 상세 조회 실패:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// 이벤트 처리
function processEvents(apiEvents: any[], homeTeamId: number, awayTeamId: number): any[] {
  return apiEvents
    .filter(event => ['Goal', 'Card', 'subst', 'Var'].includes(event.type))
    .map(event => {
      const isHomeTeam = event.team.id === homeTeamId
      
      return {
        time: event.time.elapsed + (event.time.extra || 0),
        extraTime: event.time.extra || null,
        type: event.type.toLowerCase(),
        team: isHomeTeam ? 'home' : 'away',
        player: event.player?.name || '',
        assist: event.assist?.name || null,
        detail: event.detail || ''
      }
    })
    .sort((a, b) => a.time - b.time)
}

// 통계 처리
function processStats(apiStats: any[]): any {
  if (apiStats.length !== 2) return null

  const homeStats = apiStats[0]?.statistics || []
  const awayStats = apiStats[1]?.statistics || []

  const getStat = (statName: string) => {
    const home = homeStats.find((s: any) => s.type === statName)?.value
    const away = awayStats.find((s: any) => s.type === statName)?.value
    
    return {
      home: parseStatValue(home),
      away: parseStatValue(away)
    }
  }

  return {
    possession: getStat('Ball Possession'),
    shotsOnGoal: getStat('Shots on Goal'),
    shotsOffGoal: getStat('Shots off Goal'),
    totalShots: getStat('Total Shots'),
    corners: getStat('Corner Kicks'),
    offsides: getStat('Offsides'),
    fouls: getStat('Fouls'),
    yellowCards: getStat('Yellow Cards'),
    redCards: getStat('Red Cards'),
    saves: getStat('Goalkeeper Saves'),
    passes: getStat('Total passes'),
    passAccuracy: getStat('Passes %'),
    expectedGoals: getStat('expected_goals')
  }
}

function parseStatValue(value: any): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const num = parseInt(value.replace('%', ''))
    return isNaN(num) ? 0 : num
  }
  return 0
}

// 라인업 처리
function processLineups(apiLineups: any[], homeTeamId: number): any {
  if (apiLineups.length !== 2) return null

  const homeLineup = apiLineups.find((l: any) => l.team.id === homeTeamId) || apiLineups[0]
  const awayLineup = apiLineups.find((l: any) => l.team.id !== homeTeamId) || apiLineups[1]

  const processTeamLineup = (lineup: any) => ({
    formation: lineup.formation || '4-3-3',
    coach: lineup.coach?.name || '',
    startXI: (lineup.startXI || []).map((p: any) => ({
      id: p.player.id,
      name: p.player.name,
      number: p.player.number,
      pos: p.player.pos,
      grid: p.player.grid
    })),
    substitutes: (lineup.substitutes || []).map((p: any) => ({
      id: p.player.id,
      name: p.player.name,
      number: p.player.number,
      pos: p.player.pos
    }))
  })

  return {
    home: processTeamLineup(homeLineup),
    away: processTeamLineup(awayLineup)
  }
}
