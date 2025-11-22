import { NextRequest, NextResponse } from 'next/server'
import { TEAM_NAME_KR } from '../../teamLogos'

// 리그 ID 매핑
const LEAGUE_IDS: Record<string, number> = {
  'PL': 39,    // Premier League
  'PD': 140,   // La Liga
  'BL1': 78,   // Bundesliga
  'SA': 135,   // Serie A
  'FL1': 61,   // Ligue 1
  'CL': 2,     // Champions League
  'PPL': 94,   // Primeira Liga
  'DED': 88,   // Eredivisie
  'EL': 3,     // Europa League
  'ELC': 40    // Championship
}

export async function GET(request: NextRequest) {
  try {
    // 🧪 테스트 모드: ?test=true 로 활성화
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get('test') === 'true'

    if (testMode) {
      console.log('🧪 테스트 모드: 임시 데이터 반환')
      return NextResponse.json(generateTestData())
    }

    const apiKey = process.env.API_FOOTBALL_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    console.log('🔴 라이브 경기 조회 시작...')

    // API-Football에서 현재 라이브 경기 조회
    const response = await fetch(
      'https://v3.football.api-sports.io/fixtures?live=all',
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        next: { revalidate: 0 } // 캐싱 안 함
      }
    )

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`)
    }

    const data = await response.json()
    console.log('📥 받은 라이브 경기 수:', data.response?.length || 0)

    // 우리가 지원하는 리그만 필터링
    const supportedLeagueIds = Object.values(LEAGUE_IDS)
    const liveMatches = data.response.filter((match: any) =>
      supportedLeagueIds.includes(match.league.id)
    )

    console.log('✅ 필터링된 경기 수:', liveMatches.length)

    // 각 경기에 대해 상세 정보 추가로 조회
    const matchesWithDetails = await Promise.all(
      liveMatches.map(async (match: any) => {
        // 리그 코드 찾기 (역매핑)
        const leagueCode = Object.keys(LEAGUE_IDS).find(
          key => LEAGUE_IDS[key] === match.league.id
        ) || 'UNKNOWN'

        // 홈/어웨이 팀 ID 저장 (✅ 중요!)
        const homeTeamId = match.teams.home.id
        const awayTeamId = match.teams.away.id

        console.log(`🏠 Home: ${match.teams.home.name} (ID: ${homeTeamId})`)
        console.log(`✈️  Away: ${match.teams.away.name} (ID: ${awayTeamId})`)

        // 🆕 경기 이벤트 & 통계 조회
        let events: any[] = []
        let stats: any = null

        try {
          // 경기 이벤트 조회 (골, 카드, 교체)
          const eventsResponse = await fetch(
            `https://v3.football.api-sports.io/fixtures/events?fixture=${match.fixture.id}`,
            {
              headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'v3.football.api-sports.io'
              }
            }
          )
          
          if (eventsResponse.ok) {
            const eventsData = await eventsResponse.json()
            // ✅ homeTeamId와 awayTeamId를 전달!
            events = processEvents(eventsData.response || [], homeTeamId, awayTeamId)
            console.log(`✅ 경기 ${match.fixture.id}: ${events.length}개 이벤트`)
          }

          // 경기 통계 조회 (점유율, 슈팅 등)
          const statsResponse = await fetch(
            `https://v3.football.api-sports.io/fixtures/statistics?fixture=${match.fixture.id}`,
            {
              headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'v3.football.api-sports.io'
              }
            }
          )
          
          if (statsResponse.ok) {
            const statsData = await statsResponse.json()
            stats = processStats(statsData.response || [])
          }
        } catch (error) {
          console.error(`❌ 경기 ${match.fixture.id} 상세 정보 조회 실패:`, error)
        }

        return {
          id: match.fixture.id,
          fixtureId: match.fixture.id,
          leagueCode: leagueCode,
          league: match.league.name,
          leagueLogo: match.league.logo,
          country: match.league.country,
          
          // 경기 시간
          date: match.fixture.date,
          timestamp: match.fixture.timestamp,
          
          // 경기 상태
          status: match.fixture.status.short,
          statusLong: match.fixture.status.long,
          elapsed: match.fixture.status.elapsed,
          
          // 팀 정보
          homeTeam: match.teams.home.name,
          awayTeam: match.teams.away.name,
          homeTeamKR: translateTeamName(match.teams.home.name),
          awayTeamKR: translateTeamName(match.teams.away.name),
          homeCrest: match.teams.home.logo,
          awayCrest: match.teams.away.logo,
          
          // 현재 스코어
          homeScore: match.goals.home || 0,
          awayScore: match.goals.away || 0,
          
          // 하프타임 스코어
          halftimeHomeScore: match.score.halftime.home,
          halftimeAwayScore: match.score.halftime.away,

          // 🆕 경기 이벤트 & 통계
          events: events.length > 0 ? events : undefined,
          stats: stats
        }
      })
    )

    console.log(`📊 총 ${matchesWithDetails.length}개 경기 상세 정보 조회 완료`)

    return NextResponse.json({
      success: true,
      count: matchesWithDetails.length,
      matches: matchesWithDetails,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ 라이브 경기 조회 실패:', error)
    return NextResponse.json(
      { 
        error: '라이브 경기를 불러올 수 없습니다.',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// 🆕 이벤트 처리 함수 (완전 수정!)
function processEvents(apiEvents: any[], homeTeamId: number, awayTeamId: number): any[] {
  return apiEvents
    .filter(event => {
      // 주요 이벤트만 필터링
      return ['Goal', 'Card', 'subst'].includes(event.type)
    })
    .map(event => {
      // ✅ 팀 ID로 정확하게 홈/어웨이 구분
      const eventTeamId = event.team.id
      const isHomeTeam = eventTeamId === homeTeamId
      
      console.log(`  Event: ${event.type} by ${event.player.name} (Team ID: ${eventTeamId}, ${isHomeTeam ? 'HOME' : 'AWAY'})`)
      
      return {
        time: event.time.elapsed,
        type: event.type === 'Goal' ? 'goal' : 
              event.type === 'Card' ? 'card' : 'subst',
        team: isHomeTeam ? 'home' : 'away', // ✅ 수정!
        player: event.player.name,
        detail: event.detail || event.comments || undefined
      }
    })
    .sort((a, b) => b.time - a.time) // 최신 이벤트가 위로
}

// 통계 처리 함수
function processStats(apiStats: any[]): any {
  if (apiStats.length !== 2) return null

  const homeStats = apiStats[0]
  const awayStats = apiStats[1]

  const getStat = (statName: string) => {
    const homeStat = homeStats.statistics.find((s: any) => s.type === statName)
    const awayStat = awayStats.statistics.find((s: any) => s.type === statName)
    
    return {
      home: parseInt(homeStat?.value || '0'),
      away: parseInt(awayStat?.value || '0')
    }
  }

  const getPossession = () => {
    const homePoss = homeStats.statistics.find((s: any) => s.type === 'Ball Possession')?.value
    const awayPoss = awayStats.statistics.find((s: any) => s.type === 'Ball Possession')?.value
    
    return {
      home: homePoss ? parseInt(homePoss.replace('%', '')) : 50,
      away: awayPoss ? parseInt(awayPoss.replace('%', '')) : 50
    }
  }

  return {
    shotsOnGoal: getStat('Shots on Goal'),
    shotsOffGoal: getStat('Shots off Goal'),
    possession: getPossession(),
    corners: getStat('Corner Kicks'),
    offsides: getStat('Offsides'),
    fouls: getStat('Fouls'),
    yellowCards: getStat('Yellow Cards'),
    redCards: getStat('Red Cards')
  }
}

// 팀명 번역 함수
function translateTeamName(englishName: string): string {
  if (TEAM_NAME_KR[englishName]) {
    return TEAM_NAME_KR[englishName]
  }
  return englishName
}

// 🧪 테스트 데이터 생성 함수
function generateTestData() {
  const now = new Date()
  
  const testMatches = [
    {
      id: 1234567,
      fixtureId: 1234567,
      leagueCode: 'PL',
      league: 'Premier League',
      leagueLogo: 'https://media.api-sports.io/football/leagues/39.png',
      country: 'England',
      date: now.toISOString(),
      timestamp: Math.floor(now.getTime() / 1000),
      status: '2H',
      statusLong: 'Second Half',
      elapsed: 67,
      homeTeam: 'Manchester City',
      awayTeam: 'Liverpool',
      homeTeamKR: '맨체스터 시티',
      awayTeamKR: '리버풀',
      homeCrest: 'https://media.api-sports.io/football/teams/50.png',
      awayCrest: 'https://media.api-sports.io/football/teams/40.png',
      homeScore: 2,
      awayScore: 1,
      halftimeHomeScore: 1,
      halftimeAwayScore: 0,
      events: [
        {
          time: 23,
          type: 'goal',
          team: 'home',
          player: 'Erling Haaland',
          detail: 'Normal Goal'
        },
        {
          time: 45,
          type: 'card',
          team: 'away',
          player: 'Virgil van Dijk',
          detail: 'Yellow Card'
        },
        {
          time: 56,
          type: 'goal',
          team: 'away',
          player: 'Mohamed Salah',
          detail: 'Penalty'
        },
        {
          time: 63,
          type: 'goal',
          team: 'home',
          player: 'Kevin De Bruyne',
          detail: 'Normal Goal'
        }
      ],
      stats: {
        shotsOnGoal: { home: 8, away: 5 },
        shotsOffGoal: { home: 4, away: 3 },
        possession: { home: 58, away: 42 },
        corners: { home: 7, away: 4 },
        offsides: { home: 2, away: 1 },
        fouls: { home: 9, away: 12 },
        yellowCards: { home: 1, away: 2 },
        redCards: { home: 0, away: 0 }
      }
    }
  ]

  return {
    success: true,
    count: testMatches.length,
    matches: testMatches,
    timestamp: now.toISOString(),
    testMode: true
  }
}