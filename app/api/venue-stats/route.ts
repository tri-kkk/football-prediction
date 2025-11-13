import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venue')
    const teamId = searchParams.get('team')

    if (!venueId && !teamId) {
      return NextResponse.json(
        { error: 'venue or team parameter is required' },
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

    let url = 'https://v3.football.api-sports.io/venues'
    if (venueId) {
      url += `?id=${venueId}`
    } else if (teamId) {
      url += `?search=${teamId}`
    }

    const response = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
      },
      next: { revalidate: 86400 } // 24시간 캐시 (경기장 정보는 자주 안 바뀜)
    })

    if (!response.ok) {
      throw new Error(`API-Football returned ${response.status}`)
    }

    const data = await response.json()

    if (!data.response || data.response.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No venue data available',
      })
    }

    const venue = data.response[0]

    // 경기장 데이터 가공
    const processedVenue = {
      id: venue.id,
      name: venue.name,
      address: venue.address,
      city: venue.city,
      country: venue.country,
      capacity: venue.capacity,
      surface: venue.surface, // grass, artificial turf
      image: venue.image,
    }

    return NextResponse.json({
      success: true,
      venue: processedVenue,
    })

  } catch (error: any) {
    console.error('Venue Stats API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch venue stats' },
      { status: 500 }
    )
  }
}
