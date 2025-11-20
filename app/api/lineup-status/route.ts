import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fixtureId = searchParams.get('fixtureId')

    if (!fixtureId) {
      return NextResponse.json(
        { error: 'fixtureId is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Checking lineup status for fixture ${fixtureId}`)

    // Supabase DB에서 라인업 상태 조회 (빠름!)
    const { data, error } = await supabase
      .from('lineup_status')
      .select('*')
      .eq('fixture_id', fixtureId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = 데이터 없음 (정상)
      console.error('❌ Database error:', error)
      throw error
    }

    if (!data) {
      // 라인업 데이터 없음 (아직 체크 안 됨)
      return NextResponse.json({
        success: true,
        lineupAvailable: false,
        message: 'Lineup not checked yet',
        lastChecked: null,
      })
    }

    // 라인업 상태 반환
    const response = {
      success: true,
      lineupAvailable: data.lineup_available,
      homeTeam: data.home_team,
      awayTeam: data.away_team,
      homeFormation: data.home_formation,
      awayFormation: data.away_formation,
      homeCoach: data.home_coach,
      awayCoach: data.away_coach,
      lastChecked: data.updated_at,
    }

    if (data.lineup_available) {
      console.log(`✅ Lineup available: ${data.home_formation} vs ${data.away_formation}`)
    } else {
      console.log(`⏳ Lineup not available yet`)
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ Error fetching lineup status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch lineup status',
        details: error.message 
      },
      { status: 500 }
    )
  }
}