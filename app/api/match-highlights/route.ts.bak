import { NextRequest, NextResponse } from 'next/server'

// ScoreBat API 토큰 (새 토큰)
const SCOREBAT_TOKEN = process.env.SCOREBAT_API_TOKEN || 'MjU4NjkzXzE3NjQ3MzQ4MTRfN2FhODNjNmIxM2MxZDhiOWU3MDYzZTI3MzdjZThlZDJlZDEwYmNhMw=='

// 리그 코드 → ScoreBat Competition ID 매핑
const LEAGUE_TO_COMPETITION: Record<string, string> = {
  'PL': 'england-premier-league',
  'ELC': 'england-championship',
  'PD': 'spain-la-liga',
  'BL1': 'germany-bundesliga',
  'SA': 'italy-serie-a',
  'FL1': 'france-ligue-1',
  'PPL': 'portugal-primeira-liga',
  'DED': 'netherlands-eredivisie',
  'CL': 'uefa-champions-league',
  'EL': 'uefa-europa-league',
  'UECL': 'uefa-europa-conference-league',
}

// 캐시 (Competition별로 저장)
const highlightCache: Record<string, { data: any[]; timestamp: number }> = {}
const CACHE_DURATION = 10 * 60 * 1000 // 10분 (API 호출 = 10 requests이므로 절약)

// 팀 이름 정규화
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^(fc|cf|afc|sc|ac|as|ss|ssc|rc|rcd|cd|ud|sd|ca|club|sporting|athletic|athletico|atletico)\s+/gi, '')
    .replace(/\s+(fc|cf|afc|sc|ac|united|city|town|rovers|wanderers|hotspur)$/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim()
}

// 팀 매칭 점수 계산
function getMatchScore(team1: string, team2: string): number {
  const n1 = normalizeTeamName(team1)
  const n2 = normalizeTeamName(team2)
  
  if (n1 === n2) return 100
  if (n1.includes(n2) || n2.includes(n1)) return 80
  
  const words1 = n1.split(' ').filter(w => w.length > 2)
  const words2 = n2.split(' ').filter(w => w.length > 2)
  
  let matchedWords = 0
  for (const word of words2) {
    if (words1.some(w => w.includes(word) || word.includes(w))) {
      matchedWords++
    }
  }
  
  if (matchedWords > 0) {
    return (matchedWords / Math.max(words1.length, words2.length)) * 60
  }
  
  return 0
}

// 타이틀에서 팀 추출 ("Team A - Team B" 형식)
function extractTeamsFromTitle(title: string): { home: string; away: string } | null {
  const match = title.match(/^(.+?)\s*[-–vs.]+\s*(.+?)$/i)
  if (match) {
    return { home: match[1].trim(), away: match[2].trim() }
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const homeTeam = searchParams.get('homeTeam')
    const awayTeam = searchParams.get('awayTeam')
    const league = searchParams.get('league')

    console.log('🎬 Highlight request:', { date, homeTeam, awayTeam, league })

    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing team parameters' 
      }, { status: 400 })
    }

    const now = Date.now()
    let allHighlights: any[] = []

    // 리그별 Competition 엔드포인트 사용 (더 정확한 매칭)
    const competitionId = league ? LEAGUE_TO_COMPETITION[league] : null
    
    if (competitionId) {
      // Competition 엔드포인트 사용
      const cacheKey = `competition-${competitionId}`
      
      if (highlightCache[cacheKey] && (now - highlightCache[cacheKey].timestamp) < CACHE_DURATION) {
        console.log(`📦 Using cached data for ${competitionId}`)
        allHighlights = highlightCache[cacheKey].data
      } else {
        const apiUrl = `https://www.scorebat.com/video-api/v3/competition/${competitionId}/?token=${SCOREBAT_TOKEN}`
        console.log(`🔄 Fetching from ScoreBat Competition: ${competitionId}`)

        const response = await fetch(apiUrl, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 600 }
        })

        if (response.ok) {
          const data = await response.json()
          allHighlights = data.response || []
          highlightCache[cacheKey] = { data: allHighlights, timestamp: now }
          console.log(`✅ Fetched ${allHighlights.length} highlights from ${competitionId}`)
        }
      }
    }
    
    // Competition에서 못 찾으면 Featured Feed 사용
    if (allHighlights.length === 0) {
      const cacheKey = 'featured-feed'
      
      if (highlightCache[cacheKey] && (now - highlightCache[cacheKey].timestamp) < CACHE_DURATION) {
        console.log('📦 Using cached featured feed')
        allHighlights = highlightCache[cacheKey].data
      } else {
        const apiUrl = `https://www.scorebat.com/video-api/v3/featured-feed/?token=${SCOREBAT_TOKEN}`
        console.log('🔄 Fetching from ScoreBat Featured Feed')

        const response = await fetch(apiUrl, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 600 }
        })

        if (response.ok) {
          const data = await response.json()
          allHighlights = data.response || []
          highlightCache[cacheKey] = { data: allHighlights, timestamp: now }
          console.log(`✅ Fetched ${allHighlights.length} highlights from featured feed`)
        }
      }
    }

    // 매칭 찾기
    let bestMatch: any = null
    let bestScore = 0

    for (const highlight of allHighlights) {
      const title = highlight.title || ''
      const teams = extractTeamsFromTitle(title)
      
      if (!teams) continue
      
      const homeScore = getMatchScore(teams.home, homeTeam)
      const awayScore = getMatchScore(teams.away, awayTeam)
      
      // 양쪽 팀 모두 40점 이상이어야 매칭
      if (homeScore >= 40 && awayScore >= 40) {
        const totalScore = homeScore + awayScore
        
        // 날짜 보너스
        if (date && highlight.date) {
          const highlightDate = highlight.date.split('T')[0]
          if (highlightDate === date) {
            if (totalScore + 50 > bestScore) {
              bestScore = totalScore + 50
              bestMatch = highlight
            }
            continue
          }
        }
        
        if (totalScore > bestScore) {
          bestScore = totalScore
          bestMatch = highlight
        }
      }
    }

    console.log(`🔍 Best match score: ${bestScore} for ${homeTeam} vs ${awayTeam}`)
    
    if (bestMatch) {
      console.log(`✅ Found: ${bestMatch.title}`)
    } else {
      console.log('❌ No matching highlight found')
    }

    if (!bestMatch) {
      return NextResponse.json({
        success: true,
        highlights: [],
        message: 'No matching highlight found'
      })
    }

    // 비디오 정보 추출 - videos 배열에서 embed 코드 가져오기
    const videos = bestMatch.videos || []
    
    // 하이라이트 비디오 찾기 (Highlights, Extended Highlights 등)
    const highlightVideo = videos.find((v: any) => 
      v.title?.toLowerCase().includes('highlight') ||
      v.title?.toLowerCase().includes('extended')
    ) || videos[0]

    const formattedHighlight = {
      title: bestMatch.title,
      thumbnail: bestMatch.thumbnail,
      competition: bestMatch.competition,
      date: bestMatch.date,
      matchScore: bestScore,
      // 위젯 페이지 URL (iframe으로 불러올 수 있음)
      matchviewUrl: bestMatch.matchviewUrl,
      // 메인 비디오 embed 코드
      embedCode: highlightVideo?.embed || null,
      // 모든 비디오 클립
      videoClips: videos.map((v: any) => ({
        title: v.title,
        embedCode: v.embed,
        id: v.id
      }))
    }

    return NextResponse.json({
      success: true,
      highlights: [formattedHighlight],
      count: 1,
      query: { homeTeam, awayTeam, date, league }
    })

  } catch (error) {
    console.error('❌ Highlight API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch highlights',
      highlights: []
    }, { status: 500 })
  }
}