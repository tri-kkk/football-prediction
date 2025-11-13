import { NextResponse } from 'next/server'

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || ''
const BASE_URL = 'https://v3.football.api-sports.io'

// API-Football 리그 ID 매핑
const LEAGUES: { [key: string]: number } = {
  'PL': 39,      // Premier League
  'PD': 140,     // La Liga
  'SA': 135,     // Serie A
  'BL1': 78,     // Bundesliga
  'FL1': 61,     // Ligue 1
  'CL': 2,       // Champions League
  'PPL': 94,     // Primeira Liga
  'DED': 88,     // Eredivisie
  'EL': 3,       // Europa League
  'ELC': 40,     // Championship
  'UECL': 848,   // Conference League
}

// 현재 시즌 계산 (8월 기준)
function getCurrentSeason(): number {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 0-based이므로 +1
  
  // 8월 이후면 현재 연도, 그 전이면 전년도
  return month >= 8 ? year : year - 1
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const league = searchParams.get('league') || 'PL'
    const debug = searchParams.get('debug')
    
    // 디버그 모드
    if (debug === '1') {
      return NextResponse.json({
        hasApiKey: !!API_FOOTBALL_KEY,
        keyLength: API_FOOTBALL_KEY.length,
        keyFirst5: API_FOOTBALL_KEY.substring(0, 5),
        keyLast5: API_FOOTBALL_KEY.substring(API_FOOTBALL_KEY.length - 5),
        league: league,
        leagueId: LEAGUES[league],
        season: getCurrentSeason(),
        url: `${BASE_URL}/standings?league=${LEAGUES[league]}&season=${getCurrentSeason()}`
      })
    }
    
    if (!API_FOOTBALL_KEY) {
      console.error('❌ API_FOOTBALL_KEY가 없습니다')
      return NextResponse.json(getDummyStandings(league))
    }
    
    const leagueId = LEAGUES[league]
    if (!leagueId) {
      console.error('❌ 지원하지 않는 리그:', league)
      return NextResponse.json(getDummyStandings('PL'))
    }
    
    const season = getCurrentSeason()
    const url = `${BASE_URL}/standings?league=${leagueId}&season=${season}`
    
    console.log('🔍 API-Football Standings 요청:', {
      league,
      leagueId,
      season,
      url
    })
    
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      next: { revalidate: 300 } // 5분 캐시
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API-Football 에러:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      return NextResponse.json({
        error: true,
        status: response.status,
        statusText: response.statusText,
        message: errorText,
        fallbackToDummy: true,
        ...getDummyStandings(league)
      })
    }
    
    const data = await response.json()
    
    console.log('✅ API-Football 응답:', {
      results: data.results,
      league: data.response?.[0]?.league?.name
    })
    
    // API-Football 응답 구조 변환
    if (!data.response || data.response.length === 0) {
      console.warn('⚠️ 순위표 데이터 없음')
      return NextResponse.json(getDummyStandings(league))
    }
    
    const apiData = data.response[0]
    const leagueData = apiData.league
    
    // 컵 대회는 그룹이 여러 개
    const isGroupStage = ['CL', 'EL', 'UECL'].includes(league)
    
    let standingsData
    let groupedStandings = null
    
    if (isGroupStage && leagueData.standings.length > 1) {
      // 그룹 스테이지: 여러 그룹을 하나로 합치거나 첫 번째 그룹만
      console.log('🔍 그룹 스테이지 감지:', leagueData.standings.length, '개 그룹')
      
      // CL, EL, UECL는 그룹별로 분리
      groupedStandings = leagueData.standings.map((group: any[], index: number) => ({
        groupName: `Group ${String.fromCharCode(65 + index)}`, // A, B, C...
        standings: group
      }))
      standingsData = leagueData.standings[0] // 일단 첫 그룹을 기본으로
    } else {
      // 일반 리그: standings[0]에 전체 순위표
      standingsData = leagueData.standings[0]
    }
    
    const standings = {
      competition: {
        name: leagueData.name || league,
        emblem: leagueData.logo || '',
        code: league,
        country: leagueData.country || '',
        flag: leagueData.flag || ''
      },
      season: {
        year: leagueData.season || season,
        currentMatchday: standingsData?.[0]?.all?.played || 0
      },
      isGroupStage,
      groups: groupedStandings,
      standings: standingsData?.map((team: any) => ({
        position: team.rank,
        team: {
          name: team.team.name,
          shortName: team.team.name.split(' ').slice(-1)[0], // 간단한 short name
          crest: team.team.logo,
          id: team.team.id
        },
        playedGames: team.all.played,
        won: team.all.win,
        draw: team.all.draw,
        lost: team.all.lose,
        points: team.points,
        goalsFor: team.all.goals.for,
        goalsAgainst: team.all.goals.against,
        goalDifference: team.goalsDiff,
        form: team.form || null,
        status: team.status || null,
        description: team.description || null,
        group: team.group || null
      })) || []
    }
    
    console.log('✅ 변환 완료:', {
      competition: standings.competition.name,
      teams: standings.standings.length
    })
    
    return NextResponse.json(standings)
    
  } catch (error: any) {
    console.error('❌ Standings API 에러:', error)
    return NextResponse.json({
      error: true,
      message: error.message,
      stack: error.stack,
      fallbackToDummy: true
    })
  }
}

function getDummyStandings(league: string) {
  const leagueNames: { [key: string]: string } = {
    'PL': 'Premier League',
    'PD': 'La Liga',
    'SA': 'Serie A',
    'BL1': 'Bundesliga',
    'FL1': 'Ligue 1',
    'CL': 'Champions League',
    'PPL': 'Primeira Liga',
    'DED': 'Eredivisie',
    'EL': 'Europa League',
    'ELC': 'Championship',
    'UECL': 'Conference League'
  }
  
  const leagueLogos: { [key: string]: string } = {
    'PL': 'https://media.api-sports.io/football/leagues/39.png',
    'PD': 'https://media.api-sports.io/football/leagues/140.png',
    'SA': 'https://media.api-sports.io/football/leagues/135.png',
    'BL1': 'https://media.api-sports.io/football/leagues/78.png',
    'FL1': 'https://media.api-sports.io/football/leagues/61.png',
    'CL': 'https://media.api-sports.io/football/leagues/2.png',
    'PPL': 'https://media.api-sports.io/football/leagues/94.png',
    'DED': 'https://media.api-sports.io/football/leagues/88.png',
    'EL': 'https://media.api-sports.io/football/leagues/3.png',
    'ELC': 'https://media.api-sports.io/football/leagues/40.png',
    'UECL': 'https://media.api-sports.io/football/leagues/848.png'
  }
  
  return {
    competition: {
      name: leagueNames[league] || 'Premier League',
      emblem: leagueLogos[league] || 'https://media.api-sports.io/football/leagues/39.png',
      code: league
    },
    season: {
      year: getCurrentSeason(),
      currentMatchday: 12
    },
    standings: [
      {
        position: 1,
        team: {
          name: 'Liverpool FC',
          shortName: 'Liverpool',
          crest: 'https://media.api-sports.io/football/teams/40.png',
          id: 40
        },
        playedGames: 12,
        won: 10,
        draw: 1,
        lost: 1,
        points: 31,
        goalsFor: 28,
        goalsAgainst: 10,
        goalDifference: 18,
        form: 'WWWWW',
        status: null,
        description: null
      },
      {
        position: 2,
        team: {
          name: 'Manchester City',
          shortName: 'Man City',
          crest: 'https://media.api-sports.io/football/teams/50.png',
          id: 50
        },
        playedGames: 12,
        won: 9,
        draw: 2,
        lost: 1,
        points: 29,
        goalsFor: 30,
        goalsAgainst: 12,
        goalDifference: 18,
        form: 'WWDWW',
        status: null,
        description: null
      },
      {
        position: 3,
        team: {
          name: 'Arsenal FC',
          shortName: 'Arsenal',
          crest: 'https://media.api-sports.io/football/teams/42.png',
          id: 42
        },
        playedGames: 12,
        won: 8,
        draw: 3,
        lost: 1,
        points: 27,
        goalsFor: 26,
        goalsAgainst: 11,
        goalDifference: 15,
        form: 'WDWDW',
        status: null,
        description: null
      },
      {
        position: 4,
        team: {
          name: 'Chelsea FC',
          shortName: 'Chelsea',
          crest: 'https://media.api-sports.io/football/teams/49.png',
          id: 49
        },
        playedGames: 12,
        won: 7,
        draw: 3,
        lost: 2,
        points: 24,
        goalsFor: 24,
        goalsAgainst: 14,
        goalDifference: 10,
        form: 'WWDLW',
        status: null,
        description: null
      },
      {
        position: 5,
        team: {
          name: 'Manchester United',
          shortName: 'Man Utd',
          crest: 'https://media.api-sports.io/football/teams/33.png',
          id: 33
        },
        playedGames: 12,
        won: 6,
        draw: 4,
        lost: 2,
        points: 22,
        goalsFor: 20,
        goalsAgainst: 14,
        goalDifference: 6,
        form: 'WDWDL',
        status: null,
        description: null
      }
    ]
  }
}