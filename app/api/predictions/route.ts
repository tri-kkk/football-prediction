import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    // ✅ 'fixture' 또는 'fixtureId' 둘 다 지원
    const fixtureId = searchParams.get('fixtureId') || searchParams.get('fixture')

    if (!fixtureId) {
      return NextResponse.json(
        { error: 'Fixture ID is required' },
        { status: 400 }
      )
    }

    const API_KEY = process.env.API_FOOTBALL_KEY
    const API_HOST = 'v3.football.api-sports.io'

    if (!API_KEY) {
      console.error('❌ API Key is missing')
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      )
    }

    console.log(`🔍 Fetching predictions for fixture: ${fixtureId}`)

    // API-Football Predictions 엔드포인트 호출
    const response = await fetch(
      `https://${API_HOST}/predictions?fixture=${fixtureId}`,
      {
        method: 'GET',
        headers: {
          'x-apisports-key': API_KEY,
        },
        next: { revalidate: 3600 } // 1시간 캐시
      }
    )

    if (!response.ok) {
      console.error('❌ API-Football error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch predictions' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // 예측 데이터가 없는 경우
    if (!data.response || data.response.length === 0) {
      console.warn(`⚠️ No predictions available for fixture: ${fixtureId}`)
      return NextResponse.json(
        { error: 'No predictions available for this fixture' },
        { status: 404 }
      )
    }

    const prediction = data.response[0]

    // ✅ 컴포넌트가 기대하는 구조로 변환
    const formattedResponse = {
      predictions: {
        winner: {
          id: prediction.predictions?.winner?.id || null,
          name: prediction.predictions?.winner?.name || 'Unknown',
          comment: prediction.predictions?.winner?.comment || '',
        },
        win_or_draw: prediction.predictions?.win_or_draw || false,
        under_over: prediction.predictions?.under_over || null,
        goals: {
          home: prediction.predictions?.goals?.home || '-1.5',
          away: prediction.predictions?.goals?.away || '-1.5',
        },
        advice: prediction.predictions?.advice || 'No advice available',
        percent: {
          home: prediction.predictions?.percent?.home || '33%',
          draw: prediction.predictions?.percent?.draw || '33%',
          away: prediction.predictions?.percent?.away || '33%',
        },
      },
      comparison: {
        form: {
          home: prediction.comparison?.form?.home || '50%',
          away: prediction.comparison?.form?.away || '50%',
        },
        att: {
          home: prediction.comparison?.att?.home || '50%',
          away: prediction.comparison?.att?.away || '50%',
        },
        def: {
          home: prediction.comparison?.def?.home || '50%',
          away: prediction.comparison?.def?.away || '50%',
        },
        poisson_distribution: {
          home: prediction.comparison?.poisson_distribution?.home || '50%',
          away: prediction.comparison?.poisson_distribution?.away || '50%',
        },
        h2h: {
          home: prediction.comparison?.h2h?.home || '50%',
          away: prediction.comparison?.h2h?.away || '50%',
        },
        goals: {
          home: prediction.comparison?.goals?.home || '50%',
          away: prediction.comparison?.goals?.away || '50%',
        },
        total: {
          home: prediction.comparison?.total?.home || '50%',
          away: prediction.comparison?.total?.away || '50%',
        },
      },
    }

    console.log(`✅ Prediction data formatted successfully for fixture: ${fixtureId}`)

    return NextResponse.json(formattedResponse)

  } catch (error: any) {
    console.error('❌ Predictions API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}