import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    
    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId parameter is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('team_translations')
      .select('team_id, english_name, korean_name, league_code')
      .eq('team_id', parseInt(teamId))
      .single()

    if (error) {
      console.error('Translation error:', error)
      return NextResponse.json({
        team_id: parseInt(teamId),
        english_name: null,
        korean_name: null,
        league_code: null,
      })
    }

    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// 여러 팀 ID를 한번에 조회하는 엔드포인트
export async function POST(request: Request) {
  try {
    const { teamIds } = await request.json()
    
    if (!teamIds || !Array.isArray(teamIds)) {
      return NextResponse.json(
        { error: 'teamIds array is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('team_translations')
      .select('team_id, english_name, korean_name, league_code')
      .in('team_id', teamIds)

    if (error) {
      console.error('Batch translation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ teams: data })
    
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
