import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const team1 = searchParams.get('team1')
    const team2 = searchParams.get('team2')
    const last = searchParams.get('last') || '10' // 최근 N경기

    if (!team1 || !team2) {
      return NextResponse.json(
        { error: 'team1 and team2 parameters are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.API_FOOTBALL_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    const url = `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${team1}-${team2}&last=${last}`

    const response = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
      },
      next: { revalidate: 3600 } // 1시간 캐시
    })

    if (!response.ok) {
      throw new Error(`API-Football returned ${response.status}`)
    }

    const data = await response.json()

    if (!data.response || data.response.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No head to head data available',
        h2h: {
          matches: [],
          summary: {
            total: 0,
            team1Wins: 0,
            team2Wins: 0,
            draws: 0,
            team1Goals: 0,
            team2Goals: 0,
          }
        }
      })
    }

    // 매치 데이터 가공
    const matches = data.response.map((match: any) => ({
      id: match.fixture?.id,
      date: match.fixture?.date,
      venue: match.fixture?.venue?.name,
      status: match.fixture?.status?.short,
      league: {
        id: match.league?.id,
        name: match.league?.name,
        logo: match.league?.logo,
      },
      teams: {
        home: {
          id: match.teams?.home?.id,
          name: match.teams?.home?.name,
          logo: match.teams?.home?.logo,
          winner: match.teams?.home?.winner,
        },
        away: {
          id: match.teams?.away?.id,
          name: match.teams?.away?.name,
          logo: match.teams?.away?.logo,
          winner: match.teams?.away?.winner,
        },
      },
      goals: {
        home: match.goals?.home,
        away: match.goals?.away,
      },
      score: {
        halftime: {
          home: match.score?.halftime?.home,
          away: match.score?.halftime?.away,
        },
        fulltime: {
          home: match.score?.fulltime?.home,
          away: match.score?.fulltime?.away,
        },
      },
    }))

    // 통계 계산
    const team1Id = parseInt(team1)
    const team2Id = parseInt(team2)

    let team1Wins = 0
    let team2Wins = 0
    let draws = 0
    let team1Goals = 0
    let team2Goals = 0

    matches.forEach((match: any) => {
      if (match.status !== 'FT') return // 완료된 경기만 계산

      const isTeam1Home = match.teams.home.id === team1Id
      const homeGoals = match.goals.home
      const awayGoals = match.goals.away

      if (isTeam1Home) {
        team1Goals += homeGoals
        team2Goals += awayGoals
        if (homeGoals > awayGoals) team1Wins++
        else if (homeGoals < awayGoals) team2Wins++
        else draws++
      } else {
        team1Goals += awayGoals
        team2Goals += homeGoals
        if (awayGoals > homeGoals) team1Wins++
        else if (awayGoals < homeGoals) team2Wins++
        else draws++
      }
    })

    return NextResponse.json({
      success: true,
      h2h: {
        matches,
        summary: {
          total: matches.length,
          team1Wins,
          team2Wins,
          draws,
          team1Goals,
          team2Goals,
          team1WinRate: matches.length > 0 ? ((team1Wins / matches.length) * 100).toFixed(1) : '0',
          team2WinRate: matches.length > 0 ? ((team2Wins / matches.length) * 100).toFixed(1) : '0',
          avgGoalsPerMatch: matches.length > 0 ? ((team1Goals + team2Goals) / matches.length).toFixed(1) : '0',
        },
      },
    })

  } catch (error: any) {
    console.error('H2H Enhanced API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch head to head data' },
      { status: 500 }
    )
  }
}
