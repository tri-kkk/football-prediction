import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const league = searchParams.get('league') || 'ALL'
  
  try {
    let query = supabase
      .from('highlights')
      .select('*')
      .order('match_date', { ascending: false })
      .limit(30)
    
    // 특정 리그 필터
    if (league !== 'ALL') {
      query = query.eq('league_code', league)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('[Highlights API] DB error:', error)
      return NextResponse.json({
        success: false,
        count: 0,
        videos: [],
        error: error.message
      })
    }
    
    // 프론트엔드 형식으로 변환
    const videos = (data || []).map(row => ({
      id: row.id,
      title: row.title,
      thumbnail: row.thumbnail,
      embed: row.embed,
      url: row.url,
      date: row.match_date,
      competition: row.league_name,
      leagueCode: row.league_code,
      leagueInfo: {
        id: row.league_code,
        name: row.league_name,
        nameKR: row.league_name_kr,
        logo: row.league_logo
      },
      videos: row.videos || []
    }))
    
    return NextResponse.json({
      success: true,
      count: videos.length,
      videos
    })
    
  } catch (error) {
    console.error('[Highlights API] Error:', error)
    return NextResponse.json({
      success: false,
      count: 0,
      videos: [],
      error: String(error)
    })
  }
}