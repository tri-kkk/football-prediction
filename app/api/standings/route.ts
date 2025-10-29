import { NextResponse } from 'next/server'

const FOOTBALL_API_KEY = process.env.FOOTBALL_DATA_API_KEY || ''
const BASE_URL = 'https://api.football-data.org/v4'

// 리그 코드 매핑
const LEAGUES: { [key: string]: number } = {
  'PL': 2021,    // Premier League
  'PD': 2014,    // La Liga
  'SA': 2019,    // Serie A
  'BL1': 2002,   // Bundesliga
  'FL1': 2015,   // Ligue 1
  'CL': 2001,    // Champions League
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const league = searchParams.get('league') || 'PL'
    
    console.log('🔄 API 호출:', `standings-${league}`)
    
    // API 키 확인
    if (!FOOTBALL_API_KEY) {
      console.warn('⚠️ FOOTBALL_DATA_API_KEY가 설정되지 않음 - 더미 데이터 반환')
      return NextResponse.json(getDummyStandings(league))
    }
    
    const leagueId = LEAGUES[league]
    
    if (!leagueId) {
      console.warn(`⚠️ 알 수 없는 리그: ${league}`)
      return NextResponse.json(getDummyStandings('PL'))
    }
    
    const response = await fetch(
      `${BASE_URL}/competitions/${leagueId}/standings`,
      {
        headers: {
          'X-Auth-Token': FOOTBALL_API_KEY
        },
        next: { revalidate: 300 } // 5분 캐시
      }
    )
    
    if (!response.ok) {
      console.error(`❌ Standings API 에러:`, response.status)
      return NextResponse.json(getDummyStandings(league))
    }
    
    const data = await response.json()
    
    // 데이터 형식 변환
    const standings = {
      competition: {
        name: data.competition?.name || league,
        emblem: data.competition?.emblem || '',
        code: data.competition?.code || league
      },
      season: {
        currentMatchday: data.season?.currentMatchday || 1
      },
      standings: data.standings?.[0]?.table?.map((team: any) => ({
        position: team.position,
        team: {
          name: team.team?.name || '',
          shortName: team.team?.shortName || team.team?.name || '',
          crest: team.team?.crest || ''
        },
        playedGames: team.playedGames || 0,
        won: team.won || 0,
        draw: team.draw || 0,
        lost: team.lost || 0,
        points: team.points || 0,
        goalsFor: team.goalsFor || 0,
        goalsAgainst: team.goalsAgainst || 0,
        goalDifference: team.goalDifference || 0,
        form: team.form || null
      })) || []
    }
    
    console.log(`✅ ${standings.standings.length}개 팀 순위 로드 완료`)
    return NextResponse.json(standings)
    
  } catch (error) {
    console.error('❌ Standings API 에러:', error)
    return NextResponse.json(getDummyStandings('PL'))
  }
}

// 더미 데이터 (API 실패 시 백업용)
function getDummyStandings(league: string) {
  const leagueNames: { [key: string]: string } = {
    'PL': 'Premier League',
    'PD': 'La Liga',
    'SA': 'Serie A',
    'BL1': 'Bundesliga',
    'FL1': 'Ligue 1',
    'CL': 'Champions League'
  }
  
  const leagueLogos: { [key: string]: string } = {
    'PL': 'https://crests.football-data.org/PL.png',
    'PD': 'https://crests.football-data.org/PD.png',
    'SA': 'https://crests.football-data.org/SA.png',
    'BL1': 'https://crests.football-data.org/BL1.png',
    'FL1': 'https://crests.football-data.org/FL1.png',
    'CL': 'https://crests.football-data.org/CL.png'
  }
  
  return {
    competition: {
      name: leagueNames[league] || 'Premier League',
      emblem: leagueLogos[league] || 'https://crests.football-data.org/PL.png',
      code: league
    },
    season: {
      currentMatchday: 20
    },
    standings: [
      {
        position: 1,
        team: {
          name: 'Liverpool FC',
          shortName: 'Liverpool',
          crest: 'https://crests.football-data.org/64.png'
        },
        playedGames: 20,
        won: 15,
        draw: 3,
        lost: 2,
        points: 48,
        goalsFor: 45,
        goalsAgainst: 20,
        goalDifference: 25,
        form: 'W,W,W,D,W'
      },
      {
        position: 2,
        team: {
          name: 'Manchester City FC',
          shortName: 'Man City',
          crest: 'https://crests.football-data.org/65.png'
        },
        playedGames: 20,
        won: 14,
        draw: 4,
        lost: 2,
        points: 46,
        goalsFor: 50,
        goalsAgainst: 22,
        goalDifference: 28,
        form: 'W,D,W,W,D'
      },
      {
        position: 3,
        team: {
          name: 'Arsenal FC',
          shortName: 'Arsenal',
          crest: 'https://crests.football-data.org/57.png'
        },
        playedGames: 20,
        won: 13,
        draw: 5,
        lost: 2,
        points: 44,
        goalsFor: 42,
        goalsAgainst: 18,
        goalDifference: 24,
        form: 'W,W,D,W,W'
      },
      {
        position: 4,
        team: {
          name: 'Chelsea FC',
          shortName: 'Chelsea',
          crest: 'https://crests.football-data.org/61.png'
        },
        playedGames: 20,
        won: 12,
        draw: 5,
        lost: 3,
        points: 41,
        goalsFor: 38,
        goalsAgainst: 22,
        goalDifference: 16,
        form: 'W,D,W,L,W'
      },
      {
        position: 5,
        team: {
          name: 'Manchester United FC',
          shortName: 'Man Utd',
          crest: 'https://crests.football-data.org/66.png'
        },
        playedGames: 20,
        won: 11,
        draw: 6,
        lost: 3,
        points: 39,
        goalsFor: 35,
        goalsAgainst: 25,
        goalDifference: 10,
        form: 'D,W,W,D,L'
      }
    ]
  }
}
