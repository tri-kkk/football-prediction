import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// 🛡️ DB outage 시 cascade timeout 방지 (기본 300초 → 15초)
export const maxDuration = 15

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '8')

    // 주요 리그 (실제 DB의 모든 변형 포함!)
    const leagueGroups = {
      'Premier League': ['Premier League', 'English Premier League'],
      'La Liga': ['La Liga', 'Spanish La Liga'],
      'Bundesliga': ['Bundesliga', 'German Bundesliga'],
      'Serie A': ['Serie A', 'Italian Serie A'],
      'Ligue 1': ['Ligue 1', 'French Ligue 1'],
      'Champions League': ['Champions League', 'UEFA Champions League'],
      'Europa League': ['Europa League', 'UEFA Europa League'],  // 🆕 추가!
      'Conference League': ['Conference League', 'UEFA Conference League'],  // 🆕 추가!
    }

    // 모든 하이라이트를 한 번에 가져오기
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/match_highlights?select=*&order=created_at.desc&limit=100`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch from Supabase')
    }

    const allData = await response.json()

    // 주요 리그만 필터링
    const majorLeagueNames = Object.values(leagueGroups).flat()
    const filteredData = allData.filter((item: any) => 
      majorLeagueNames.includes(item.league)
    )

    console.log('📊 전체:', allData.length, '| 필터링:', filteredData.length)

    // 리그별로 그룹화
    const byLeague: { [key: string]: any[] } = {}
    
    filteredData.forEach((item: any) => {
      // 리그명 통일 (English Premier League → Premier League)
      let normalizedLeague = item.league
      for (const [key, variants] of Object.entries(leagueGroups)) {
        if (variants.includes(item.league)) {
          normalizedLeague = key
          break
        }
      }
      
      if (!byLeague[normalizedLeague]) {
        byLeague[normalizedLeague] = []
      }
      byLeague[normalizedLeague].push(item)
    })

    // 각 리그에서 최대 2개씩 선택 (경기 날짜 최신순)
    const selected: any[] = []
    Object.keys(leagueGroups).forEach(leagueName => {
      const items = (byLeague[leagueName] || [])
        .sort((a, b) => {
          const dateA = new Date(a.match_date || a.created_at)
          const dateB = new Date(b.match_date || b.created_at)
          return dateB.getTime() - dateA.getTime()
        })
      selected.push(...items.slice(0, 2))
    })

    // 경기 날짜 기준 최신순으로 정렬 후 limit만큼
    const sortedHighlights = selected
      .sort((a, b) => {
        const dateA = new Date(a.match_date || a.created_at)
        const dateB = new Date(b.match_date || b.created_at)
        return dateB.getTime() - dateA.getTime()  // 최신순 (내림차순)
      })
      .slice(0, limit)

    // 필드명 변환 + 리그명 통일
    const highlights = sortedHighlights.map((item: any) => {
      // 리그명 통일
      let normalizedLeague = item.league
      for (const [key, variants] of Object.entries(leagueGroups)) {
        if (variants.includes(item.league)) {
          normalizedLeague = key
          break
        }
      }

      return {
        id: item.id,
        matchId: item.match_id,
        homeTeam: item.home_team,
        awayTeam: item.away_team,
        league: normalizedLeague,  // 통일된 이름
        matchDate: item.match_date,
        youtubeUrl: item.youtube_url,
        youtubeId: item.youtube_id,
        thumbnailUrl: item.thumbnail_url,
        videoTitle: item.video_title,
      }
    })

    console.log('✅ 하이라이트 API:', highlights.length, '개')
    console.log('📊 리그 분포:', highlights.reduce((acc: any, h: any) => {
      acc[h.league] = (acc[h.league] || 0) + 1
      return acc
    }, {}))
    console.log('📅 날짜 순서:', highlights.map(h => 
      `${h.homeTeam.split(' ')[0]} vs ${h.awayTeam.split(' ')[0]} (${h.matchDate})`
    ))
    
    return NextResponse.json({
      success: true,
      highlights,
      total: highlights.length,
    })

  } catch (error: any) {
    console.error('❌ Highlights API 에러:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      highlights: [],
      total: 0,
    }, { status: 500 })
  }
}
