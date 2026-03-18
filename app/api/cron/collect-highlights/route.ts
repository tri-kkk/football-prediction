export const maxDuration = 60
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ScoreBat API 토큰
const SCOREBAT_API_TOKEN = 'MjU4NjkzXzE3Njk3Mzk4OTZfMWVhN2ZlMGE0Y2Q3ZDY0MDYyOWM3N2NkM2M1M2E3OGViYjEzODdmOA=='

// 리그 매핑 (10개)
const LEAGUE_MAP: Record<string, { id: string; name: string; nameKR: string; logo: string }> = {
  'PL': { 
    id: 'england-premier-league', 
    name: 'Premier League', 
    nameKR: '프리미어리그',
    logo: 'https://media.api-sports.io/football/leagues/39.png'
  },
  'PD': { 
    id: 'spain-la-liga', 
    name: 'La Liga', 
    nameKR: '라리가',
    logo: 'https://media.api-sports.io/football/leagues/140.png'
  },
  'SA': { 
    id: 'italy-serie-a', 
    name: 'Serie A', 
    nameKR: '세리에A',
    logo: 'https://media.api-sports.io/football/leagues/135.png'
  },
  'BL1': { 
    id: 'germany-bundesliga', 
    name: 'Bundesliga', 
    nameKR: '분데스리가',
    logo: 'https://media.api-sports.io/football/leagues/78.png'
  },
  'FL1': { 
    id: 'france-ligue-1', 
    name: 'Ligue 1', 
    nameKR: '리그1',
    logo: 'https://media.api-sports.io/football/leagues/61.png'
  },
  'CL': { 
    id: 'uefa-champions-league', 
    name: 'Champions League', 
    nameKR: '챔피언스리그',
    logo: 'https://media.api-sports.io/football/leagues/2.png'
  },
  'DED': { 
    id: 'netherlands-eredivisie', 
    name: 'Eredivisie', 
    nameKR: '에레디비시',
    logo: 'https://media.api-sports.io/football/leagues/88.png'
  },
  'ELC': { 
    id: 'england-championship', 
    name: 'Championship', 
    nameKR: '챔피언십',
    logo: 'https://media.api-sports.io/football/leagues/40.png'
  },
  'KL': { 
    id: 'korea-republic-kleague-1', 
    name: 'K League', 
    nameKR: 'K리그',
    logo: 'https://media.api-sports.io/football/leagues/292.png'
  },
  'JL': { 
    id: 'japan-jleague', 
    name: 'J.League', 
    nameKR: 'J리그',
    logo: 'https://media.api-sports.io/football/leagues/98.png'
  },
}

// league/ endpoint를 사용하는 리그 (CL처럼 competition ID가 여러 개로 쪼개진 경우)
const LEAGUE_ENDPOINT_CODES: Record<string, string> = {
  'CL': 'uefa-champions-league',
}

async function fetchLeagueVideos(code: string, info: typeof LEAGUE_MAP[string]) {
  try {
    // CL 등은 /league/ endpoint 사용 (competition ID가 여러 개로 분리된 리그)
    const leagueSlug = LEAGUE_ENDPOINT_CODES[code]
    const url = leagueSlug
      ? `https://www.scorebat.com/video-api/v3/league/${leagueSlug}/?token=${SCOREBAT_API_TOKEN}`
      : `https://www.scorebat.com/video-api/v3/competition/${info.id}/?token=${SCOREBAT_API_TOKEN}`
    
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrendSoccer/1.0'
      }
    })
    
    if (!response.ok) {
      console.error(`[Highlights] ${code}: HTTP ${response.status}`)
      return []
    }
    
    const data = await response.json()
    
    // 에러 응답 체크
    if (data?.error) {
      console.error(`[Highlights] ${code}: API error -`, data.error.text || data.error)
      return []
    }
    
    let videos: any[] = []
    if (Array.isArray(data)) {
      videos = data
    } else if (data && Array.isArray(data.response)) {
      videos = data.response
    }
    
    return videos.map((video: any) => ({
      id: `${code}-${video.title?.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date(video.date).getTime()}`,
      title: video.title || 'No Title',
      thumbnail: video.thumbnail || '',
      embed: video.embed || video.videos?.[0]?.embed || '',
      url: video.url || '',
      match_date: video.date,
      league_code: code,
      league_name: info.name,
      league_name_kr: info.nameKR,
      league_logo: info.logo,
      videos: video.videos || []
    }))
    
  } catch (error) {
    console.error(`[Highlights] ${code}: fetch error -`, error)
    return []
  }
}

export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    console.log('[Highlights] 수집 시작...')
    
    // 🔥 최적화 1: 병렬 fetch (3개씩 동시 호출, ScoreBat 부하 방지)
    const entries = Object.entries(LEAGUE_MAP)
    const allVideos: any[] = []
    const leagueResults: Record<string, number> = {}
    
    const PARALLEL_SIZE = 3
    for (let i = 0; i < entries.length; i += PARALLEL_SIZE) {
      const batch = entries.slice(i, i + PARALLEL_SIZE)
      const results = await Promise.all(
        batch.map(([code, info]) => fetchLeagueVideos(code, info))
      )
      
      results.forEach((videos, idx) => {
        const code = batch[idx][0]
        leagueResults[code] = videos.length
        allVideos.push(...videos)
      })
    }
    
    console.log(`[Highlights] 총 ${allVideos.length}개 영상 (${Object.entries(leagueResults).map(([k,v]) => `${k}:${v}`).join(', ')})`)
    
    let totalInserted = 0
    let totalSkipped = 0
    
    if (allVideos.length > 0) {
      // 🔥 최적화 2: 배치 upsert (50건씩)
      const BATCH_SIZE = 50
      for (let i = 0; i < allVideos.length; i += BATCH_SIZE) {
        const batch = allVideos.slice(i, i + BATCH_SIZE)
        
        const { error } = await supabase
          .from('highlights')
          .upsert(batch, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          })
        
        if (error) {
          console.error(`[Highlights] 배치 upsert 오류:`, error.message)
          totalSkipped += batch.length
        } else {
          totalInserted += batch.length
        }
      }
    }
    
    // 7일 지난 영상 삭제
    const { error: deleteError } = await supabase
      .from('highlights')
      .delete()
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    
    if (deleteError) {
      console.error('[Highlights] 정리 오류:', deleteError)
    }
    
    const duration = Date.now() - startTime
    
    console.log(`[Highlights] 완료! 저장: ${totalInserted}, 스킵: ${totalSkipped}, ${duration}ms`)
    
    return NextResponse.json({
      success: true,
      inserted: totalInserted,
      skipped: totalSkipped,
      fetched: allVideos.length,
      leagues: leagueResults,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Highlights] 치명적 오류:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}