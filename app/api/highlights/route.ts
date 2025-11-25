/**
 * Match Highlights API
 * GET /api/highlights
 * 
 * Query Parameters:
 * - league: 리그 코드 (PL, PD, BL1, SA, FL1, CL, etc.)
 * - team: 팀 이름 (home_team 또는 away_team)
 * - date: 날짜 (YYYY-MM-DD)
 * - limit: 결과 개수 (기본: 20, 최대: 50)
 * - offset: 페이지네이션 오프셋 (기본: 0)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface HighlightResponse {
  highlights: Highlight[]
  total: number
  page: number
  limit: number
}

interface Highlight {
  id: number
  homeTeam: string
  awayTeam: string
  league: string
  matchDate: string
  youtubeUrl: string
  youtubeId: string
  thumbnailUrl: string
  videoTitle: string
  views: number
  duration: number
  createdAt: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const league = searchParams.get('league')
    const team = searchParams.get('team')
    const date = searchParams.get('date')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('🎬 Fetching highlights:', { league, team, date, limit, offset })

    // 기본 쿼리
    let query = supabase
      .from('match_highlights')
      .select('*', { count: 'exact' })

    // 필터 적용
    if (league && league !== 'ALL') {
      query = query.eq('league', league)
    }

    if (team) {
      query = query.or(`home_team.ilike.%${team}%,away_team.ilike.%${team}%`)
    }

    if (date) {
      query = query.eq('match_date', date)
    }

    // 정렬 및 페이지네이션
    query = query
      .order('match_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch highlights', details: error.message },
        { status: 500 }
      )
    }

    // 데이터 변환
    const highlights: Highlight[] = (data || []).map((row) => ({
      id: row.id,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      league: row.league,
      matchDate: row.match_date,
      youtubeUrl: row.youtube_url,
      youtubeId: row.youtube_id,
      thumbnailUrl: row.thumbnail_url,
      videoTitle: row.video_title,
      views: row.views || 0,
      duration: row.duration || 0,
      createdAt: row.created_at,
    }))

    console.log(`✅ Found ${highlights.length} highlights (total: ${count})`)

    const response: HighlightResponse = {
      highlights,
      total: count || 0,
      page: Math.floor(offset / limit) + 1,
      limit,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
