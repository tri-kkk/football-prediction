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

    // lineup_status 테이블에서 조회
    const { data, error } = await supabase
      .from('lineup_status')
      .select('*')
      .eq('fixture_id', fixtureId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = 데이터 없음 (정상)
      throw error
    }

    if (!data) {
      // 라인업 데이터 없음 (아직 체크 안 됨)
      return NextResponse.json({
        success: true,
        lineupAvailable: false,
        message: 'Lineup not checked yet',
      })
    }

    return NextResponse.json({
      success: true,
      lineupAvailable: data.lineup_available,
      homeFormation: data.home_formation,
      awayFormation: data.away_formation,
      updatedAt: data.updated_at,
    })

  } catch (error: any) {
    console.error('Error fetching lineup status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lineup status' },
      { status: 500 }
    )
  }
}