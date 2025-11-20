import { NextRequest, NextResponse } from 'next/server'

// API-Football 리그 ID 매핑
const LEAGUE_IDS: Record<string, number> = {
  'PL': 39,    // Premier League
  'PD': 140,   // La Liga
  'BL1': 78,   // Bundesliga
  'SA': 135,   // Serie A
  'FL1': 61,   // Ligue 1
  'PPL': 94,   // Primeira Liga
  'DED': 88,   // Eredivisie
  'CL': 2,     // Champions League
  'EL': 3,     // Europa League
  'ELC': 40,   // Championship
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const homeTeam = searchParams.get('homeTeam')
    const awayTeam = searchParams.get('awayTeam')
    const leagueCode = searchParams.get('league')

    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: '홈팀과 원정팀 정보가 필요합니다' },
        { status: 400 }
      )
    }

    const API_KEY = process.env.API_FOOTBALL_KEY
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다' },
        { status: 500 }
      )
    }

    // 1. 팀 ID 검색
    const homeTeamId = await getTeamId(homeTeam, API_KEY)
    const awayTeamId = await getTeamId(awayTeam, API_KEY)

    if (!homeTeamId || !awayTeamId) {
      return NextResponse.json(
        { error: '팀 정보를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 2. H2H 데이터 가져오기
    const h2hUrl = `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&last=10`
    
    const h2hResponse = await fetch(h2hUrl, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    })

    if (!h2hResponse.ok) {
      throw new Error(`API-Football H2H 오류: ${h2hResponse.status}`)
    }

    const h2hData = await h2hResponse.json()

    // 3. 최근 5경기 폼 가져오기
    const homeFormUrl = `https://v3.football.api-sports.io/fixtures?team=${homeTeamId}&last=5`
    const awayFormUrl = `https://v3.football.api-sports.io/fixtures?team=${awayTeamId}&last=5`

    const [homeFormResponse, awayFormResponse] = await Promise.all([
      fetch(homeFormUrl, {
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      }),
      fetch(awayFormUrl, {
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      })
    ])

    const homeFormData = await homeFormResponse.json()
    const awayFormData = await awayFormResponse.json()

    // 4. 데이터 가공
    const h2hMatches = processH2HMatches(h2hData.response, homeTeamId, awayTeamId)
    const homeForm = processForm(homeFormData.response, homeTeamId)
    const awayForm = processForm(awayFormData.response, awayTeamId)
    const statistics = calculateStatistics(h2hMatches, homeTeamId, awayTeamId)

    return NextResponse.json({
      h2hMatches,
      homeForm,
      awayForm,
      statistics,
      homeTeamId,
      awayTeamId
    })

  } catch (error: any) {
    console.error('H2H API 오류:', error)
    return NextResponse.json(
      { 
        error: 'H2H 데이터를 가져오는데 실패했습니다',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// 팀 ID 검색 함수
async function getTeamId(teamName: string, apiKey: string): Promise<number | null> {
  try {
    const searchUrl = `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(teamName)}`
    const response = await fetch(searchUrl, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    })

    const data = await response.json()
    
    if (data.response && data.response.length > 0) {
      // 정확히 일치하는 팀 찾기
      const exactMatch = data.response.find((item: any) => 
        item.team.name.toLowerCase() === teamName.toLowerCase()
      )
      
      if (exactMatch) {
        return exactMatch.team.id
      }
      
      // 정확히 일치하지 않으면 첫 번째 결과 반환
      return data.response[0].team.id
    }

    return null
  } catch (error) {
    console.error('팀 ID 검색 오류:', error)
    return null
  }
}

// H2H 경기 데이터 가공 - ✅ 팀 ID 추가!
function processH2HMatches(matches: any[], homeTeamId: number, awayTeamId: number) {
  return matches.map((match: any) => {
    const isHomeTeamHome = match.teams.home.id === homeTeamId
    
    return {
      date: match.fixture.date,
      league: match.league.name,
      homeTeam: match.teams.home.name,
      awayTeam: match.teams.away.name,
      homeTeamId: match.teams.home.id,      // ✅ 추가!
      awayTeamId: match.teams.away.id,      // ✅ 추가!
      homeScore: match.goals.home,
      awayScore: match.goals.away,
      winner: match.teams.home.winner ? 'home' : (match.teams.away.winner ? 'away' : 'draw'),
      isHomeTeamHome
    }
  })
}

// 최근 5경기 폼 가공
function processForm(matches: any[], teamId: number) {
  return matches.map((match: any) => {
    const isHome = match.teams.home.id === teamId
    const result = match.teams.home.winner 
      ? (isHome ? 'W' : 'L')
      : match.teams.away.winner 
        ? (isHome ? 'L' : 'W')
        : 'D'
    
    return {
      date: match.fixture.date,
      opponent: isHome ? match.teams.away.name : match.teams.home.name,
      score: `${match.goals.home}-${match.goals.away}`,
      result,
      isHome
    }
  })
}

// 통계 계산
function calculateStatistics(matches: any[], homeTeamId: number, awayTeamId: number) {
  let homeWins = 0
  let draws = 0
  let awayWins = 0
  let totalGoalsHome = 0
  let totalGoalsAway = 0

  matches.forEach((match: any) => {
    if (match.winner === 'home') {
      if (match.isHomeTeamHome) {
        homeWins++
      } else {
        awayWins++
      }
    } else if (match.winner === 'away') {
      if (match.isHomeTeamHome) {
        awayWins++
      } else {
        homeWins++
      }
    } else {
      draws++
    }

    if (match.isHomeTeamHome) {
      totalGoalsHome += match.homeScore || 0
      totalGoalsAway += match.awayScore || 0
    } else {
      totalGoalsHome += match.awayScore || 0
      totalGoalsAway += match.homeScore || 0
    }
  })

  const totalMatches = matches.length

  return {
    totalMatches,
    homeWins,
    draws,
    awayWins,
    homeWinPercentage: totalMatches > 0 ? Math.round((homeWins / totalMatches) * 100) : 0,
    drawPercentage: totalMatches > 0 ? Math.round((draws / totalMatches) * 100) : 0,
    awayWinPercentage: totalMatches > 0 ? Math.round((awayWins / totalMatches) * 100) : 0,
    avgGoalsHome: totalMatches > 0 ? (totalGoalsHome / totalMatches).toFixed(1) : '0.0',
    avgGoalsAway: totalMatches > 0 ? (totalGoalsAway / totalMatches).toFixed(1) : '0.0'
  }
}