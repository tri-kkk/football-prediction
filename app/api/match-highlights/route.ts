// app/api/match-highlights/route.ts
// 경기 결과 페이지 전용 - TheSportsDB API에서 실시간으로 하이라이트 검색
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const THESPORTSDB_API_KEY = process.env.THESPORTSDB_API_KEY || '123'

// TheSportsDB 리그 ID 매핑
const LEAGUE_ID_MAP: Record<string, number> = {
  'PL': 4328,    // English Premier League
  'PD': 4335,    // Spanish La Liga
  'BL1': 4331,   // German Bundesliga
  'SA': 4332,    // Italian Serie A
  'FL1': 4334,   // French Ligue 1
  'CL': 4480,    // UEFA Champions League
  'EL': 4481,    // UEFA Europa League
  'PPL': 4344,   // Portuguese Primeira Liga
  'DED': 4337,   // Dutch Eredivisie
  'ELC': 4329,   // English Championship
  'UECL': 4897,  // UEFA Conference League
  'UNL': 4684,   // UEFA Nations League
}

interface TheSportsDBHighlight {
  idEvent: string
  strEvent: string
  strVideo: string
  strThumb?: string
  dateEvent: string
  strHomeTeam: string
  strAwayTeam: string
  intHomeScore?: string
  intAwayScore?: string
}

interface HighlightResponse {
  tvhighlights?: TheSportsDBHighlight[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD 형식
    const league = searchParams.get('league') // 리그 코드 (PL, PD 등)
    const homeTeam = searchParams.get('homeTeam')
    const awayTeam = searchParams.get('awayTeam')

    // 날짜가 없으면 오늘 날짜 사용
    const targetDate = date || new Date().toISOString().split('T')[0]
    
    // API URL 구성
    let apiUrl = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_API_KEY}/eventshighlights.php?d=${targetDate}`
    
    // 리그 필터 추가
    if (league && LEAGUE_ID_MAP[league]) {
      apiUrl += `&l=${LEAGUE_ID_MAP[league]}`
    } else {
      // 축구만 필터
      apiUrl += `&s=Soccer`
    }

    console.log('🎬 [match-highlights] Fetching from:', apiUrl)

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 1800 } // 30분 캐시
    })

    if (!response.ok) {
      console.error('❌ TheSportsDB API error:', response.status)
      throw new Error(`TheSportsDB API error: ${response.status}`)
    }

    const data: HighlightResponse = await response.json()
    
    let highlights = data.tvhighlights || []

    console.log(`📊 [match-highlights] Raw results: ${highlights.length}`)

    // 특정 경기 필터링 (홈팀/원정팀으로)
    if (homeTeam && awayTeam) {
      const homeTeamLower = normalizeTeamName(homeTeam)
      const awayTeamLower = normalizeTeamName(awayTeam)
      
      highlights = highlights.filter(h => {
        const eventHome = normalizeTeamName(h.strHomeTeam || '')
        const eventAway = normalizeTeamName(h.strAwayTeam || '')
        
        // 유연한 매칭 (부분 일치)
        const homeMatch = eventHome.includes(homeTeamLower) || homeTeamLower.includes(eventHome)
        const awayMatch = eventAway.includes(awayTeamLower) || awayTeamLower.includes(eventAway)
        
        return homeMatch && awayMatch
      })

      console.log(`🔍 [match-highlights] After team filter: ${highlights.length} (${homeTeam} vs ${awayTeam})`)
    }

    // 결과 포맷팅
    const formattedHighlights = highlights.map(h => ({
      eventId: h.idEvent,
      event: h.strEvent,
      videoUrl: h.strVideo,
      thumbnail: h.strThumb,
      date: h.dateEvent,
      homeTeam: h.strHomeTeam,
      awayTeam: h.strAwayTeam,
      homeScore: h.intHomeScore,
      awayScore: h.intAwayScore,
      youtubeId: extractYoutubeId(h.strVideo)
    }))

    console.log(`✅ [match-highlights] Returning ${formattedHighlights.length} highlights`)

    return NextResponse.json({
      success: true,
      date: targetDate,
      count: formattedHighlights.length,
      highlights: formattedHighlights
    })

  } catch (error) {
    console.error('❌ [match-highlights] API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch highlights',
      highlights: [],
      count: 0
    }, { status: 500 })
  }
}

// 팀명 정규화 함수
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/fc|cf|sc|ac|as|ss|afc|ssc/gi, '') // 접두어/접미어 제거
    .replace(/\s+/g, '') // 공백 제거
    .trim()
}

// YouTube 영상 ID 추출 함수
function extractYoutubeId(url: string | undefined): string | null {
  if (!url) return null
  
  // 다양한 YouTube URL 형식 처리
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/ // 순수 ID만 있는 경우
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  return null
}
