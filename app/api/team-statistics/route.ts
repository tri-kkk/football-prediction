import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team')
    const leagueId = searchParams.get('league')
    const season = searchParams.get('season') || '2024'

    if (!teamId) {
      return NextResponse.json(
        { error: 'team parameter is required' },
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

    let url = `https://v3.football.api-sports.io/teams/statistics?team=${teamId}&season=${season}`
    if (leagueId) {
      url += `&league=${leagueId}`
    }

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

    if (!data.response) {
      return NextResponse.json({
        success: false,
        message: 'No statistics available',
      })
    }

    const stats = data.response

    // 데이터 가공
    const processedStats = {
      team: {
        id: stats.team?.id,
        name: stats.team?.name,
        logo: stats.team?.logo,
      },
      league: {
        id: stats.league?.id,
        name: stats.league?.name,
        country: stats.league?.country,
        logo: stats.league?.logo,
        season: stats.league?.season,
      },
      form: stats.form, // 예: "WWDLW"
      fixtures: {
        played: {
          home: stats.fixtures?.played?.home || 0,
          away: stats.fixtures?.played?.away || 0,
          total: stats.fixtures?.played?.total || 0,
        },
        wins: {
          home: stats.fixtures?.wins?.home || 0,
          away: stats.fixtures?.wins?.away || 0,
          total: stats.fixtures?.wins?.total || 0,
        },
        draws: {
          home: stats.fixtures?.draws?.home || 0,
          away: stats.fixtures?.draws?.away || 0,
          total: stats.fixtures?.draws?.total || 0,
        },
        loses: {
          home: stats.fixtures?.loses?.home || 0,
          away: stats.fixtures?.loses?.away || 0,
          total: stats.fixtures?.loses?.total || 0,
        },
      },
      goals: {
        for: {
          home: stats.goals?.for?.total?.home || 0,
          away: stats.goals?.for?.total?.away || 0,
          total: stats.goals?.for?.total?.total || 0,
          average: stats.goals?.for?.average?.total || '0.0',
        },
        against: {
          home: stats.goals?.against?.total?.home || 0,
          away: stats.goals?.against?.total?.away || 0,
          total: stats.goals?.against?.total?.total || 0,
          average: stats.goals?.against?.average?.total || '0.0',
        },
      },
      cleanSheet: {
        home: stats.clean_sheet?.home || 0,
        away: stats.clean_sheet?.away || 0,
        total: stats.clean_sheet?.total || 0,
      },
      failedToScore: {
        home: stats.failed_to_score?.home || 0,
        away: stats.failed_to_score?.away || 0,
        total: stats.failed_to_score?.total || 0,
      },
      biggest: {
        streak: {
          wins: stats.biggest?.streak?.wins || 0,
          draws: stats.biggest?.streak?.draws || 0,
          loses: stats.biggest?.streak?.loses || 0,
        },
        wins: {
          home: stats.biggest?.wins?.home || 'N/A',
          away: stats.biggest?.wins?.away || 'N/A',
        },
        loses: {
          home: stats.biggest?.loses?.home || 'N/A',
          away: stats.biggest?.loses?.away || 'N/A',
        },
        goals: {
          for: {
            home: stats.biggest?.goals?.for?.home || 0,
            away: stats.biggest?.goals?.for?.away || 0,
          },
          against: {
            home: stats.biggest?.goals?.against?.home || 0,
            away: stats.biggest?.goals?.against?.away || 0,
          },
        },
      },
    }

    return NextResponse.json({
      success: true,
      statistics: processedStats,
    })

  } catch (error: any) {
    console.error('Team Statistics API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team statistics' },
      { status: 500 }
    )
  }
}
