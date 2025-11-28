// app/api/match-highlights/route.ts
// ScoreBat Free Feed + TheSportsDB 폴백 (무료 버전)
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const THESPORTSDB_API_KEY = process.env.THESPORTSDB_API_KEY || ''
const SCOREBAT_TOKEN = process.env.SCOREBAT_TOKEN || ''

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const homeTeam = searchParams.get('homeTeam')
    const awayTeam = searchParams.get('awayTeam')

    if (!homeTeam || !awayTeam || !date) {
      return NextResponse.json({
        success: false,
        error: 'date, homeTeam, awayTeam are required',
        highlights: [],
        count: 0
      }, { status: 400 })
    }

    console.log(`🎬 Searching: ${homeTeam} vs ${awayTeam} (${date})`)

    const homeVariants = getTeamVariants(homeTeam)
    const awayVariants = getTeamVariants(awayTeam)

    console.log(`🔍 Home variants: ${homeVariants.slice(0, 4).join(', ')}`)
    console.log(`🔍 Away variants: ${awayVariants.slice(0, 4).join(', ')}`)

    // 1. ScoreBat Free Feed
    if (SCOREBAT_TOKEN) {
      const scoreBatResult = await searchScoreBatFeed(homeVariants, awayVariants)
      if (scoreBatResult) {
        console.log(`✅ [ScoreBat] Found: ${scoreBatResult.title}`)
        return NextResponse.json({
          success: true,
          date,
          count: 1,
          source: 'scorebat',
          highlights: [scoreBatResult]
        })
      }
    }

    // 2. TheSportsDB 폴백
    if (THESPORTSDB_API_KEY) {
      const sportsDbResult = await searchTheSportsDB(date, homeVariants, awayVariants)
      if (sportsDbResult) {
        console.log(`✅ [TheSportsDB] Found: ${sportsDbResult.event}`)
        return NextResponse.json({
          success: true,
          date,
          count: 1,
          source: 'thesportsdb',
          highlights: [sportsDbResult]
        })
      }
    }

    console.log(`❌ No highlights found for: ${homeTeam} vs ${awayTeam}`)
    return NextResponse.json({
      success: true,
      date,
      count: 0,
      highlights: []
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed',
      highlights: [],
      count: 0
    }, { status: 500 })
  }
}

// ScoreBat Free Feed 검색
async function searchScoreBatFeed(
  homeVariants: string[], 
  awayVariants: string[]
): Promise<any | null> {
  try {
    // Free Feed 엔드포인트
    const feedUrl = `https://www.scorebat.com/video-api/v3/feed/?token=${SCOREBAT_TOKEN}`
    
    console.log(`📡 [ScoreBat] Fetching free feed...`)
    
    const response = await fetch(feedUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.log(`⚠️ [ScoreBat] Feed error: ${response.status}`)
      return null
    }

    const data = await response.json()
    const videos = data.response || data || []
    
    if (!Array.isArray(videos)) {
      console.log(`⚠️ [ScoreBat] Invalid response format`)
      return null
    }

    console.log(`📊 [ScoreBat] Got ${videos.length} videos`)

    // 팀 매칭
    for (const video of videos) {
      const title = (video.title || '').toLowerCase()
      
      const homeMatch = homeVariants.some(v => title.includes(v))
      const awayMatch = awayVariants.some(v => title.includes(v))
      
      if (homeMatch && awayMatch) {
        console.log(`🎯 [ScoreBat] MATCH: ${video.title}`)
        
        const embed = video.videos?.[0]?.embed || ''
        const embedUrl = extractIframeSrc(embed)
        
        return {
          title: video.title,
          competition: video.competition,
          matchviewUrl: video.matchviewUrl,
          date: video.date?.split('T')[0] || '',
          thumbnail: video.thumbnail,
          embed: embed,
          embedUrl: embedUrl,
          videoUrl: embedUrl || video.matchviewUrl
        }
      }
    }

    console.log(`❌ [ScoreBat] No match in ${videos.length} videos`)
    return null

  } catch (error) {
    console.error('⚠️ [ScoreBat] Error:', error)
    return null
  }
}

// TheSportsDB 검색
async function searchTheSportsDB(
  date: string, 
  homeVariants: string[], 
  awayVariants: string[]
): Promise<any | null> {
  try {
    console.log(`🔍 [TheSportsDB] Searching for ${date}...`)
    
    const v1Url = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_API_KEY}/eventshighlights.php?d=${date}&s=Soccer`
    
    const v1Response = await fetch(v1Url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    })

    if (!v1Response.ok) {
      console.log(`⚠️ [TheSportsDB] API error: ${v1Response.status}`)
      return null
    }

    const v1Data = await v1Response.json()
    const highlights = v1Data.tvhighlights || []
    
    console.log(`📊 [TheSportsDB] Found ${highlights.length} highlights`)

    for (const h of highlights) {
      // 팀 이름이 없으면 스킵
      if (!h.strHomeTeam || !h.strAwayTeam) continue

      const eventHome = h.strHomeTeam.toLowerCase()
      const eventAway = h.strAwayTeam.toLowerCase()
      
      // 양쪽 팀 모두 매칭되어야 함
      const homeMatch = homeVariants.some(v => 
        eventHome.includes(v) || v.includes(eventHome.replace(/[^a-z0-9]/g, ''))
      )
      const awayMatch = awayVariants.some(v => 
        eventAway.includes(v) || v.includes(eventAway.replace(/[^a-z0-9]/g, ''))
      )
      
      if (homeMatch && awayMatch && h.strVideo) {
        console.log(`🎯 [TheSportsDB] MATCH: ${h.strHomeTeam} vs ${h.strAwayTeam}`)
        const youtubeId = extractYoutubeId(h.strVideo)
        return {
          eventId: h.idEvent,
          event: h.strEvent,
          videoUrl: h.strVideo,
          thumbnail: h.strThumb || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null),
          date: h.dateEvent,
          homeTeam: h.strHomeTeam,
          awayTeam: h.strAwayTeam,
          youtubeId
        }
      }
    }

    console.log(`❌ [TheSportsDB] No match found`)
    return null

  } catch (error) {
    console.error('⚠️ [TheSportsDB] Error:', error)
    return null
  }
}

// 팀 이름 변형 생성
function getTeamVariants(name: string): string[] {
  const variants: string[] = []
  const lower = name.toLowerCase()
  
  variants.push(lower)
  
  // 접두어/접미어 제거
  const cleaned = lower
    .replace(/\s*(fc|cf|sc|ac|as|ss|afc|ssc|sk|fk|bsc|vfb|rb|sv|bv|osc|losc|1\.|rcd|cd)\s*/gi, '')
    .trim()
  if (cleaned && cleaned !== lower) variants.push(cleaned)
  
  // 특수문자 제거
  const noSpecial = lower.replace(/[^a-z0-9\s]/g, '').trim()
  if (noSpecial && !variants.includes(noSpecial)) variants.push(noSpecial)
  
  // 공백 제거
  const noSpace = cleaned.replace(/\s+/g, '')
  if (noSpace && !variants.includes(noSpace)) variants.push(noSpace)
  
  // 특수 팀 매핑 (확장)
  const mappings: Record<string, string[]> = {
    // England
    'manchester united': ['man united', 'man utd', 'united'],
    'manchester city': ['man city'],
    'tottenham hotspur': ['tottenham', 'spurs'],
    'tottenham': ['spurs', 'tottenham hotspur'],
    'nottingham forest': ['forest', 'nottm forest', "nott'm forest"],
    'newcastle united': ['newcastle'],
    'newcastle': ['newcastle united'],
    'west ham united': ['west ham'],
    'west ham': ['west ham united'],
    'wolverhampton': ['wolves'],
    'wolves': ['wolverhampton'],
    'brighton': ['brighton hove albion'],
    'leicester city': ['leicester'],
    'leicester': ['leicester city'],
    // Spain
    'atletico madrid': ['atletico', 'atlético madrid', 'atlético'],
    'athletic bilbao': ['athletic club', 'bilbao'],
    'athletic club': ['athletic bilbao', 'bilbao'],
    'real sociedad': ['sociedad'],
    'real betis': ['betis'],
    // Germany
    'borussia dortmund': ['dortmund', 'bvb'],
    'dortmund': ['borussia dortmund', 'bvb'],
    'bayern münchen': ['bayern munich', 'bayern'],
    'bayern munich': ['bayern münchen', 'bayern'],
    'rb leipzig': ['leipzig'],
    'bayer leverkusen': ['leverkusen'],
    'leverkusen': ['bayer leverkusen'],
    'eintracht frankfurt': ['frankfurt'],
    'vfb stuttgart': ['stuttgart'],
    'stuttgart': ['vfb stuttgart'],
    'sc freiburg': ['freiburg'],
    // Italy
    'inter milan': ['inter', 'internazionale'],
    'inter': ['inter milan', 'internazionale'],
    'ac milan': ['milan'],
    'as roma': ['roma'],
    'roma': ['as roma'],
    'ssc napoli': ['napoli'],
    'napoli': ['ssc napoli'],
    // France
    'paris saint germain': ['psg', 'paris saint-germain', 'paris'],
    'paris saint-germain': ['psg', 'paris saint germain', 'paris'],
    'psg': ['paris saint germain', 'paris'],
    'olympique marseille': ['marseille', 'om'],
    'marseille': ['olympique marseille', 'om'],
    'olympique lyon': ['lyon', 'ol'],
    'lyon': ['olympique lyon'],
    // Portugal
    'sporting cp': ['sporting', 'sporting lisbon'],
    'sporting': ['sporting cp'],
    'fc porto': ['porto'],
    'porto': ['fc porto'],
    'sl benfica': ['benfica'],
    'benfica': ['sl benfica'],
    // Netherlands
    'psv eindhoven': ['psv'],
    'psv': ['psv eindhoven'],
    'ajax amsterdam': ['ajax'],
    'ajax': ['ajax amsterdam'],
    'feyenoord rotterdam': ['feyenoord'],
    // Others
    'club brugge': ['brugge', 'bruges'],
    'red bull salzburg': ['salzburg', 'rb salzburg'],
    'bsc young boys': ['young boys'],
    'young boys': ['bsc young boys'],
    'dinamo zagreb': ['zagreb', 'dinamo'],
    'crvena zvezda': ['red star', 'red star belgrade'],
    'fc midtjylland': ['midtjylland'],
    'midtjylland': ['fc midtjylland'],
    'malmo ff': ['malmo', 'malmö', 'malmö ff'],
    'malmo': ['malmo ff', 'malmö'],
    'celtic': ['celtic fc'],
    'rangers': ['rangers fc'],
    'galatasaray': ['galatasaray sk'],
    'fenerbahce': ['fenerbahçe'],
    'qarabag': ['qarabağ'],
  }
  
  for (const [key, values] of Object.entries(mappings)) {
    if (lower.includes(key) || cleaned === key.replace(/\s+/g, '')) {
      variants.push(...values)
    }
  }
  
  return [...new Set(variants)].filter(v => v.length >= 3)
}

// iframe src 추출
function extractIframeSrc(html: string): string | null {
  if (!html) return null
  const match = html.match(/src=["']([^"']+)["']/)
  return match ? match[1] : null
}

// YouTube ID 추출
function extractYoutubeId(url: string | undefined | null): string | null {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}