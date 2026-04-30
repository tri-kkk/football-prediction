/**
 * Featured Highlights API
 * GET /api/highlights/featured
 * 
 * 홈페이지에 표시할 주요 하이라이트를 반환
 * - 최근 24시간 내 경기
 * - 조회수가 높은 순서
 * - 주요 리그 우선 (PL, PD, BL1, SA, FL1, CL)
 * - 최대 6개 반환
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface FeaturedHighlight {
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
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔥 Fetching featured highlights...')

    // 최근 7일간의 하이라이트 중 상위 6개
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('match_highlights')
      .select('*')
      .gte('match_date', sevenDaysAgoStr)
      .order('views', { ascending: false })
      .order('match_date', { ascending: false })
      .limit(6)

    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch featured highlights', details: error.message },
        { status: 500 }
      )
    }

    // 데이터 변환
    const highlights: FeaturedHighlight[] = (data || []).map((row) => ({
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
    }))

    console.log(`✅ Found ${highlights.length} featured highlights`)

    // 리그 우선순위 적용 (PL > CL > PD > BL1 > SA > FL1 > 기타)
    const leaguePriority: Record<string, number> = {
      PL: 1,
      CL: 2,
      PD: 3,
      BL1: 4,
      SA: 5,
      FL1: 6,
    }

    const sortedHighlights = highlights.sort((a, b) => {
      const aPriority = leaguePriority[a.league] || 999
      const bPriority = leaguePriority[b.league] || 999
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      
      // 같은 리그면 조회수 순
      return (b.views || 0) - (a.views || 0)
    })

    return NextResponse.json({
      featured: sortedHighlights,
      count: sortedHighlights.length,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
