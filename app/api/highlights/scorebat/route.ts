import { NextResponse } from 'next/server'

// ScoreBat API 토큰
const SCOREBAT_API_TOKEN = 'MjU4NjkzXzE3Njk3Mzk4OTZfMWVhN2ZlMGE0Y2Q3ZDY0MDYyOWM3N2NkM2M1M2E3OGViYjEzODdmOA=='

// 메이저 리그 매핑
const LEAGUE_MAP: Record<string, { id: string; name: string; nameKR: string; logo: string }> = {
  'PL': { 
    id: 'england-premier-league', 
    name: 'Premier League', 
    nameKR: '프리미어리그',
    logo: 'https://crests.football-data.org/PL.png'
  },
  'PD': { 
    id: 'spain-laliga', 
    name: 'La Liga', 
    nameKR: '라리가',
    logo: 'https://crests.football-data.org/PD.png'
  },
  'SA': { 
    id: 'italy-serie-a', 
    name: 'Serie A', 
    nameKR: '세리에A',
    logo: 'https://crests.football-data.org/SA.png'
  },
  'BL1': { 
    id: 'germany-bundesliga', 
    name: 'Bundesliga', 
    nameKR: '분데스리가',
    logo: 'https://crests.football-data.org/BL1.png'
  },
  'FL1': { 
    id: 'france-ligue-1', 
    name: 'Ligue 1', 
    nameKR: '리그1',
    logo: 'https://crests.football-data.org/FL1.png'
  },
  'CL': { 
    id: 'uefa-champions-league', 
    name: 'Champions League', 
    nameKR: '챔피언스리그',
    logo: 'https://crests.football-data.org/CL.png'
  },
}

interface ScoreBatVideo {
  title: string
  embed: string
  url: string
  thumbnail: string
  date: string
  competition: {
    name: string
    id: number
    url: string
  }
  matchviewUrl: string
  competitionUrl: string
  videos: {
    title: string
    embed: string
  }[]
}

async function fetchLeagueVideos(code: string, info: typeof LEAGUE_MAP[string]) {
  try {
    const url = `https://www.scorebat.com/video-api/v3/competition/${info.id}/?token=${SCOREBAT_API_TOKEN}`
    console.log(`[ScoreBat] Fetching ${code}: ${info.id}`)
    
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrendSoccer/1.0'
      }
    })
    
    console.log(`[ScoreBat] ${code} response status:`, response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[ScoreBat] ${code} error response:`, errorText)
      return []
    }
    
    const rawData = await response.text()
    console.log(`[ScoreBat] ${code} raw response length:`, rawData.length)
    
    if (!rawData || rawData.length === 0) {
      console.log(`[ScoreBat] ${code} empty response`)
      return []
    }
    
    let data
    try {
      data = JSON.parse(rawData)
    } catch (parseError) {
      console.error(`[ScoreBat] ${code} JSON parse error:`, parseError)
      return []
    }
    
    // ScoreBat API는 배열을 직접 반환하거나 response 속성에 배열을 담아 반환
    let videos: ScoreBatVideo[] = []
    
    if (Array.isArray(data)) {
      videos = data
    } else if (data && Array.isArray(data.response)) {
      videos = data.response
    } else if (data && typeof data === 'object') {
      // 다른 구조일 경우 로깅
      console.log(`[ScoreBat] ${code} unexpected structure:`, Object.keys(data))
      return []
    }
    
    console.log(`[ScoreBat] ${code} found ${videos.length} videos`)
    
    return videos.map((video: ScoreBatVideo) => ({
      ...video,
      leagueCode: code,
      leagueInfo: info
    }))
    
  } catch (error) {
    console.error(`[ScoreBat] ${code} fetch error:`, error)
    return []
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const league = searchParams.get('league') || 'ALL'
  
  console.log(`[ScoreBat API] Request for league: ${league}`)
  
  try {
    let allVideos: any[] = []
    
    if (league === 'ALL') {
      // 모든 리그에서 하이라이트 가져오기 (병렬)
      const leaguePromises = Object.entries(LEAGUE_MAP).map(([code, info]) => 
        fetchLeagueVideos(code, info)
      )
      
      const results = await Promise.all(leaguePromises)
      allVideos = results.flat()
      
      console.log(`[ScoreBat API] Total videos from all leagues: ${allVideos.length}`)
      
    } else {
      // 특정 리그만
      const leagueInfo = LEAGUE_MAP[league]
      if (!leagueInfo) {
        return NextResponse.json({ error: 'Invalid league', validLeagues: Object.keys(LEAGUE_MAP) }, { status: 400 })
      }
      
      allVideos = await fetchLeagueVideos(league, leagueInfo)
    }
    
    // 날짜순 정렬 (최신순)
    allVideos.sort((a, b) => {
      try {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      } catch {
        return 0
      }
    })
    
    // 최대 30개
    const videos = allVideos.slice(0, 30).map(video => ({
      id: `${video.leagueCode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: video.title || 'No Title',
      thumbnail: video.thumbnail || '',
      embed: video.embed || video.videos?.[0]?.embed || '',  // videos[0].embed 사용
      url: video.url || '',
      date: video.date || new Date().toISOString(),
      competition: video.competition?.name || video.leagueInfo?.name || '',
      leagueCode: video.leagueCode || 'PL',
      leagueInfo: video.leagueInfo || LEAGUE_MAP['PL'],
      videos: video.videos || []
    }))
    
    console.log(`[ScoreBat API] Returning ${videos.length} videos`)
    
    return NextResponse.json({
      success: true,
      count: videos.length,
      videos
    })
    
  } catch (error) {
    console.error('[ScoreBat API] Fatal error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch highlights', 
        details: String(error),
        message: 'ScoreBat API 연결 오류. 잠시 후 다시 시도해주세요.'
      },
      { status: 500 }
    )
  }
}