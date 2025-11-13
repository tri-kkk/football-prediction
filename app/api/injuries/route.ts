// app/api/injuries/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team')
    const season = searchParams.get('season') || '2025'  // ✅ 2024 → 2025
    const fixtureId = searchParams.get('fixture')

    // ✅ team + season 또는 fixture 필요
    if (!teamId && !fixtureId) {
      return NextResponse.json({
        success: false,
        error: 'Team ID or Fixture ID required'
      }, { status: 400 })
    }

    const apiKey = process.env.API_FOOTBALL_KEY
    if (!apiKey) {
      console.error('❌ API_FOOTBALL_KEY not configured')
      return NextResponse.json({
        success: false,
        error: 'API key not configured'
      }, { status: 500 })
    }

    // ✅ URL 구성 (season 포함)
    let url = 'https://v3.football.api-sports.io/injuries?'
    if (fixtureId) {
      url += `fixture=${fixtureId}`
    } else if (teamId) {
      url += `team=${teamId}&season=${season}`  // ✅ season 필수!
    }

    console.log(`🏥 Fetching injuries: ${url}`)

    const response = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
      },
    })

    if (!response.ok) {
      console.error('❌ Injuries API failed:', response.status)
      return NextResponse.json({
        success: false,
        error: 'API request failed'
      }, { status: response.status })
    }

    const data = await response.json()
    
    console.log(`✅ Injuries response:`, {
      count: data.response?.length || 0,
      results: data.results
    })

    return NextResponse.json({
      success: true,
      count: data.response?.length || 0,
      injuries: data.response || []
    })

  } catch (error: any) {
    console.error('❌ Injuries API Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}