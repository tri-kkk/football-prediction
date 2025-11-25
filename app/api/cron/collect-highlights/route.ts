/**
 * Collect Highlights Cron Job
 * GET /api/cron/collect-highlights
 * 
 * TheSportsDB API에서 YouTube 하이라이트를 수집하여 Supabase에 저장
 * 
 * 실행 주기: 6시간마다 (하루 4회)
 * - 00:00, 06:00, 12:00, 18:00
 * 
 * Supabase Cron 설정:
 * SELECT cron.schedule(
 *   'collect-highlights',
 *   '0 */6 * * *',
 *   $$
 *   SELECT net.http_post(
 *     url := 'https://trendsoccer.com/api/cron/collect-highlights',
 *     headers := '{"Content-Type": "application/json"}'::jsonb
 *   ) AS request_id;
 *   $$
 * );
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const tsdbApiKey = process.env.THESPORTSDB_API_KEY! // Premium API Key

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300 // 5분 타임아웃

// TheSportsDB League IDs
const LEAGUE_IDS: Record<string, string> = {
  PL: '4328',   // Premier League
  PD: '4335',   // La Liga
  BL1: '4331',  // Bundesliga
  SA: '4332',   // Serie A
  FL1: '4334',  // Ligue 1
  CL: '4480',   // Champions League
  EL: '4481',   // Europa League
  PPL: '4344',  // Primeira Liga
  DED: '4337',  // Eredivisie
  ELC: '4329',  // Championship
}

interface TSDBEvent {
  idEvent: string
  strEvent: string
  strHomeTeam: string
  strAwayTeam: string
  dateEvent: string
  strLeague: string
  strVideo?: string
  strThumb?: string
}

interface CollectionStats {
  totalProcessed: number
  newHighlights: number
  updatedHighlights: number
  errors: number
  leagueStats: Record<string, number>
}

/**
 * YouTube URL에서 Video ID 추출
 */
function extractYouTubeId(url: string): string | null {
  if (!url) return null
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

/**
 * 리그 코드를 TheSportsDB 리그 ID로 변환
 */
function getLeagueCode(leagueName: string): string | null {
  const mapping: Record<string, string> = {
    'English Premier League': 'PL',
    'Spanish La Liga': 'PD',
    'German Bundesliga': 'BL1',
    'Italian Serie A': 'SA',
    'French Ligue 1': 'FL1',
    'UEFA Champions League': 'CL',
    'UEFA Europa League': 'EL',
    'Portuguese Primeira Liga': 'PPL',
    'Dutch Eredivisie': 'DED',
    'English League Championship': 'ELC',
  }
  
  return mapping[leagueName] || null
}

/**
 * TheSportsDB API에서 하이라이트 가져오기
 */
async function fetchHighlightsFromTSDB(
  date: string,
  leagueId?: string
): Promise<TSDBEvent[]> {
  try {
    let url = `https://www.thesportsdb.com/api/v1/json/${tsdbApiKey}/eventstv.php?d=${date}`
    
    if (leagueId) {
      url += `&l=${leagueId}`
    }
    
    console.log(`📡 Fetching from TSDB: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`TSDB API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // strVideo가 있는 이벤트만 필터링
    const events = data.events || []
    return events.filter((event: TSDBEvent) => event.strVideo)
  } catch (error) {
    console.error('❌ TSDB API error:', error)
    return []
  }
}

/**
 * Supabase에 하이라이트 저장 또는 업데이트
 */
async function saveHighlight(event: TSDBEvent): Promise<boolean> {
  try {
    const youtubeId = extractYouTubeId(event.strVideo || '')
    if (!youtubeId) {
      console.log('⚠️ No valid YouTube ID:', event.strVideo)
      return false
    }
    
    const leagueCode = getLeagueCode(event.strLeague)
    if (!leagueCode) {
      console.log('⚠️ Unknown league:', event.strLeague)
      return false
    }
    
    const highlightData = {
      event_id: event.idEvent,
      home_team: event.strHomeTeam,
      away_team: event.strAwayTeam,
      league: leagueCode,
      match_date: event.dateEvent,
      youtube_url: event.strVideo,
      youtube_id: youtubeId,
      thumbnail_url: event.strThumb || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      video_title: event.strEvent,
      last_synced_at: new Date().toISOString(),
    }
    
    // Upsert (있으면 업데이트, 없으면 삽입)
    const { error } = await supabase
      .from('match_highlights')
      .upsert(highlightData, {
        onConflict: 'event_id,youtube_url',
        ignoreDuplicates: false,
      })
    
    if (error) {
      console.error('❌ Save error:', error)
      return false
    }
    
    console.log(`✅ Saved: ${event.strHomeTeam} vs ${event.strAwayTeam}`)
    return true
  } catch (error) {
    console.error('❌ Unexpected save error:', error)
    return false
  }
}

/**
 * 메인 수집 함수
 */
async function collectHighlights(): Promise<CollectionStats> {
  const stats: CollectionStats = {
    totalProcessed: 0,
    newHighlights: 0,
    updatedHighlights: 0,
    errors: 0,
    leagueStats: {},
  }
  
  // 최근 7일간의 하이라이트 수집
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0])
  }
  
  console.log(`📅 Collecting highlights for dates: ${dates.join(', ')}`)
  
  // 각 리그별로 하이라이트 수집
  for (const [leagueCode, leagueId] of Object.entries(LEAGUE_IDS)) {
    console.log(`\n🏆 Processing league: ${leagueCode} (${leagueId})`)
    stats.leagueStats[leagueCode] = 0
    
    for (const date of dates) {
      try {
        const events = await fetchHighlightsFromTSDB(date, leagueId)
        console.log(`   📅 ${date}: Found ${events.length} events with highlights`)
        
        for (const event of events) {
          stats.totalProcessed++
          
          const saved = await saveHighlight(event)
          if (saved) {
            stats.newHighlights++
            stats.leagueStats[leagueCode]++
          } else {
            stats.errors++
          }
          
          // API Rate Limit 방지 (100 req/min)
          await new Promise((resolve) => setTimeout(resolve, 650)) // ~90 req/min
        }
      } catch (error) {
        console.error(`❌ Error processing ${leagueCode} ${date}:`, error)
        stats.errors++
      }
    }
  }
  
  return stats
}

/**
 * 수집 로그 저장
 */
async function saveCollectionLog(stats: CollectionStats, success: boolean, errorMessage?: string) {
  try {
    await supabase.from('highlight_sync_log').insert({
      sync_date: new Date().toISOString().split('T')[0],
      highlights_collected: stats.newHighlights,
      api_calls_made: stats.totalProcessed,
      success,
      error_message: errorMessage,
    })
  } catch (error) {
    console.error('❌ Failed to save log:', error)
  }
}

/**
 * Cron Job Handler
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  console.log('🚀 Starting highlight collection...')
  console.log(`⏰ Time: ${new Date().toISOString()}`)
  
  // Authorization 체크 (선택사항)
  // const authHeader = request.headers.get('authorization')
  // const cronSecret = process.env.CRON_SECRET
  // if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // }
  
  try {
    // 하이라이트 수집
    const stats = await collectHighlights()
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    console.log('\n✅ Collection completed!')
    console.log(`📊 Stats:`)
    console.log(`   - Total processed: ${stats.totalProcessed}`)
    console.log(`   - New highlights: ${stats.newHighlights}`)
    console.log(`   - Errors: ${stats.errors}`)
    console.log(`   - Duration: ${duration}s`)
    console.log(`   - League stats:`, stats.leagueStats)
    
    // 로그 저장
    await saveCollectionLog(stats, true)
    
    return NextResponse.json({
      success: true,
      stats,
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    const errorMessage = String(error)
    
    console.error('❌ Collection failed:', error)
    
    // 로그 저장
    await saveCollectionLog(
      {
        totalProcessed: 0,
        newHighlights: 0,
        updatedHighlights: 0,
        errors: 1,
        leagueStats: {},
      },
      false,
      errorMessage
    )
    
    return NextResponse.json(
      {
        success: false,
        error: 'Collection failed',
        details: errorMessage,
        duration: `${duration}s`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
