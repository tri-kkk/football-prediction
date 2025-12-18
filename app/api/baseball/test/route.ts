import { NextRequest, NextResponse } from 'next/server'

// API-Sports Baseball 테스트
// GET /api/baseball/test

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const testType = searchParams.get('type') || 'leagues'

  if (!API_FOOTBALL_KEY) {
    return NextResponse.json({
      error: 'API_FOOTBALL_KEY not found',
      message: 'Please add API_FOOTBALL_KEY to .env.local'
    }, { status: 500 })
  }

  try {
    let result: any = {}

    // 1. 야구 리그 목록 조회
    if (testType === 'leagues') {
      const response = await fetch('https://v1.baseball.api-sports.io/leagues', {
        headers: {
          'x-apisports-key': API_FOOTBALL_KEY
        }
      })

      const data = await response.json()

      // KBO, NPB, MLB, CPBL 찾기
      const targetLeagues = ['KBO', 'NPB', 'MLB', 'CPBL', 'Korea', 'Japan', 'USA', 'Taiwan']
      const filteredLeagues = data.response?.filter((league: any) =>
        targetLeagues.some(target =>
          league.name?.toLowerCase().includes(target.toLowerCase()) ||
          league.country?.name?.toLowerCase().includes(target.toLowerCase())
        )
      )

      result = {
        testType: 'leagues',
        success: data.errors?.length === 0,
        message: data.errors?.length > 0 ? 'API Error' : 'Baseball leagues found!',
        errors: data.errors,
        totalLeagues: data.response?.length || 0,
        relevantLeagues: filteredLeagues || [],
        // 전체 리그도 일부 보여주기
        allLeagues: data.response?.slice(0, 20) || []
      }
    }

    // 2. 특정 리그 경기 조회 (예: KBO)
    else if (testType === 'games') {
      const leagueId = searchParams.get('league') || '1' // 기본값
      const season = searchParams.get('season') || '2023'
      const date = searchParams.get('date') || ''

      // date가 있으면 date로, 없으면 season으로 조회
      const apiUrl = date 
        ? `https://v1.baseball.api-sports.io/games?league=${leagueId}&season=${season}&date=${date}`
        : `https://v1.baseball.api-sports.io/games?league=${leagueId}&season=${season}`

      const response = await fetch(apiUrl, {
        headers: {
          'x-apisports-key': API_FOOTBALL_KEY
        }
      })

      const data = await response.json()

      result = {
        testType: 'games',
        leagueId,
        season,
        date: date || 'all',
        success: !data.errors || Object.keys(data.errors || {}).length === 0,
        errors: data.errors,
        gamesCount: data.response?.length || 0,
        games: data.response?.slice(0, 5) || []
      }
    }

    // 3. 야구 오즈 조회
    else if (testType === 'odds') {
      const gameId = searchParams.get('game') || ''
      
      if (!gameId) {
        return NextResponse.json({
          error: 'game parameter required',
          example: '/api/baseball/test?type=odds&game=12345'
        }, { status: 400 })
      }

      const response = await fetch(
        `https://v1.baseball.api-sports.io/odds?game=${gameId}`,
        {
          headers: {
            'x-apisports-key': API_FOOTBALL_KEY
          }
        }
      )

      const data = await response.json()

      result = {
        testType: 'odds',
        gameId,
        success: !data.errors || data.errors.length === 0,
        errors: data.errors,
        odds: data.response || []
      }
    }

    // 4. 팀 목록 조회
    else if (testType === 'teams') {
      const leagueId = searchParams.get('league') || '1'
      const season = searchParams.get('season') || '2024'

      const response = await fetch(
        `https://v1.baseball.api-sports.io/teams?league=${leagueId}&season=${season}`,
        {
          headers: {
            'x-apisports-key': API_FOOTBALL_KEY
          }
        }
      )

      const data = await response.json()

      result = {
        testType: 'teams',
        leagueId,
        season,
        success: !data.errors || data.errors.length === 0,
        errors: data.errors,
        teamsCount: data.response?.length || 0,
        teams: data.response || []
      }
    }

    // 5. 순위 조회
    else if (testType === 'standings') {
      const leagueId = searchParams.get('league') || '1'
      const season = searchParams.get('season') || '2024'

      const response = await fetch(
        `https://v1.baseball.api-sports.io/standings?league=${leagueId}&season=${season}`,
        {
          headers: {
            'x-apisports-key': API_FOOTBALL_KEY
          }
        }
      )

      const data = await response.json()

      result = {
        testType: 'standings',
        leagueId,
        season,
        success: !data.errors || data.errors.length === 0,
        errors: data.errors,
        standings: data.response || []
      }
    }

    // 6. API 상태 확인
    else if (testType === 'status') {
      const response = await fetch('https://v1.baseball.api-sports.io/status', {
        headers: {
          'x-apisports-key': API_FOOTBALL_KEY
        }
      })

      const data = await response.json()

      result = {
        testType: 'status',
        message: 'API Status',
        status: data.response || data
      }
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Baseball API Test Error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error.message
    }, { status: 500 })
  }
}