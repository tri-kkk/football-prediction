import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fixtureId = searchParams.get('fixture')

    if (!fixtureId) {
      return NextResponse.json(
        { error: 'Fixture ID is required' },
        { status: 400 }
      )
    }

    const API_KEY = process.env.FOOTBALL_API_KEY
    const API_HOST = 'v3.football.api-sports.io'

    if (!API_KEY) {
      console.error('API Key is missing')
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      )
    }

    // API-Football Predictions 엔드포인트 호출
    const response = await fetch(
      `https://${API_HOST}/predictions?fixture=${fixtureId}`,
      {
        method: 'GET',
        headers: {
          'x-apisports-key': API_KEY,
        },
      }
    )

    if (!response.ok) {
      console.error('API-Football error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch predictions' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // 예측 데이터가 없는 경우
    if (!data.response || data.response.length === 0) {
      return NextResponse.json(
        { error: 'No predictions available for this fixture' },
        { status: 404 }
      )
    }

    return NextResponse.json(data.response[0])
  } catch (error: any) {
    console.error('Predictions API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}