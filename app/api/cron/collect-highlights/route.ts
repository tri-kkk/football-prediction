export const maxDuration = 60
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ScoreBat API 토큰
const SCOREBAT_API_TOKEN = 'MjU4NjkzXzE3Njk3Mzk4OTZfMWVhN2ZlMGE0Y2Q3ZDY0MDYyOWM3N2NkM2M1M2E3OGViYjEzODdmOA=='

// 리그 매핑 (8개)
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
  // 🆕 추가 2개
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
  // 🆕 K리그 (1부+2부 병합)
  'KL': { 
    id: 'korea-republic-kleague-1', 
    name: 'K League', 
    nameKR: 'K리그',
    logo: 'https://media.api-sports.io/football/leagues/292.png'
  },
  // 🆕 J리그 (1부+2부 병합)
  'JL': { 
    id: 'japan-jleague', 
    name: 'J.League', 
    nameKR: 'J리그',
    logo: 'https://media.api-sports.io/football/leagues/98.png'
  },
}

async function fetchLeagueVideos(code: string, info: typeof LEAGUE_MAP[string]) {
  try {
    const url = `https://www.scorebat.com/video-api/v3/competition/${info.id}/?token=${SCOREBAT_API_TOKEN}`
    
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrendSoccer/1.0'
      }
    })
    
    if (!response.ok) {
      console.error(`[Cron] ${code} error:`, response.status)
      return []
    }
    
    const data = await response.json()
    
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
    console.error(`[Cron] ${code} fetch error:`, error)
    return []
  }
}

export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    console.log('[Cron] Starting highlights collection...')
    
    let totalInserted = 0
    let totalSkipped = 0
    
    // 각 리그별로 순차 처리 (API 부하 분산)
    for (const [code, info] of Object.entries(LEAGUE_MAP)) {
      const videos = await fetchLeagueVideos(code, info)
      console.log(`[Cron] ${code}: ${videos.length} videos fetched`)
      
      for (const video of videos) {
        // upsert (있으면 업데이트, 없으면 삽입)
        const { error } = await supabase
          .from('highlights')
          .upsert(video, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          })
        
        if (error) {
          console.error(`[Cron] Insert error:`, error.message)
          totalSkipped++
        } else {
          totalInserted++
        }
      }
      
      // 리그 간 1초 딜레이 (API 부하 분산)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // 7일 지난 영상 삭제
    const { error: deleteError } = await supabase
      .from('highlights')
      .delete()
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    
    if (deleteError) {
      console.error('[Cron] Cleanup error:', deleteError)
    }
    
    const duration = Date.now() - startTime
    
    console.log(`[Cron] Done! Inserted: ${totalInserted}, Skipped: ${totalSkipped}, Duration: ${duration}ms`)
    
    return NextResponse.json({
      success: true,
      inserted: totalInserted,
      skipped: totalSkipped,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Cron] Fatal error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}