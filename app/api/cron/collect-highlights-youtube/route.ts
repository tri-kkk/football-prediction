import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// YouTube Data API
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

// Supabase 설정
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 🏆 주요 인기 구단 YouTube 채널 ID (확장됨)
const CLUB_CHANNELS = [
  // Premier League
  { channelId: 'UCU2PacFf99vhb3hNiYDmxww', name: 'Chelsea FC', league: 'Premier League' },
  { channelId: 'UCpryVRk_VDudG8SHXgWcG0w', name: 'Arsenal', league: 'Premier League' },
  { channelId: 'UC9LQwHZoucFT94I2h6JOcjw', name: 'Liverpool FC', league: 'Premier League' },
  { channelId: 'UC6yW44UGJJBvYTlfC7CRg2Q', name: 'Manchester United', league: 'Premier League' },
  { channelId: 'UCwqfJdKjGaACQrOeF6FdM3g', name: 'Tottenham Hotspur', league: 'Premier League' },
  { channelId: 'UCkzCjdRMrW2vXLx8mvPVLdQ', name: 'Manchester City', league: 'Premier League' },
  { channelId: 'UC_Wlc-dILMWO8b8GajEYRRQ', name: 'Newcastle United', league: 'Premier League' },
  { channelId: 'UCb3HMk4Ib0fHN7RNKmhKDfg', name: 'Aston Villa', league: 'Premier League' },
  
  // La Liga
  { channelId: 'UCWV3obpZVGgJ3j9FVhEjF2Q', name: 'Real Madrid', league: 'La Liga' },
  { channelId: 'UC14UlmYlSNiQCBe9Eookf_A', name: 'FC Barcelona', league: 'La Liga' },
  { channelId: 'UC9aSelbhR5IYBRg5L5GgjZg', name: 'Atletico Madrid', league: 'La Liga' },
  
  // Bundesliga
  { channelId: 'UCZdzYsXFuTfX4A4hz14RnEw', name: 'Bayern Munich', league: 'Bundesliga' },
  { channelId: 'UCHpPpYCGvXlTCSyV-aRbBvQ', name: 'Borussia Dortmund', league: 'Bundesliga' },
  { channelId: 'UC4WBCsh9qn8k0Vqx5LQjS2g', name: 'RB Leipzig', league: 'Bundesliga' },
  
  // Serie A
  { channelId: 'UCITVCQrRPuUb2LrUEvLRPCg', name: 'Juventus', league: 'Serie A' },
  { channelId: 'UCEL-_pjj5x6SdvVD-7VKN2g', name: 'AC Milan', league: 'Serie A' },
  { channelId: 'UCgYDP08fJg2O0KGgzbYkCVQ', name: 'Inter Milan', league: 'Serie A' },
  { channelId: 'UCBRxPBKjCoiWxl2MNHt7wfQ', name: 'Napoli', league: 'Serie A' },
  
  // Ligue 1
  { channelId: 'UCyPJlI7FHwhXTYOGLNOPLsA', name: 'Paris Saint-Germain', league: 'Ligue 1' },
  
  // 🆕 공식 리그 채널 (하이라이트 많음!)
  { channelId: 'UCG5qGWdu8nIRZqJ_GgDwQ-w', name: 'Premier League', league: 'Premier League' },
  { channelId: 'UCTv-XvfzLX5Xq2Vu2sBniQg', name: 'LaLiga', league: 'La Liga' },
  { channelId: 'UCGBHGLSqpQP8lNfpVz4K-fg', name: 'Bundesliga', league: 'Bundesliga' },
  { channelId: 'UCBJeMCIeLQos7wacox4hmLQ', name: 'Serie A', league: 'Serie A' },
  { channelId: 'UCFtEEv80fQVKkD4h1PF-Xqw', name: 'Ligue 1', league: 'Ligue 1' },
  { channelId: 'UCJlS0D0bkduXB8dkf8xfkAA', name: 'UEFA Champions League', league: 'Champions League' },
]

// 🎯 하이라이트 키워드 (완화됨!)
const HIGHLIGHT_KEYWORDS = [
  // 영어
  'highlight', 'highlights', 'extended highlight',
  'goals', 'all goals', 'goal',
  'match recap', 'recap', 'summary',
  'full match', 'extended',
  // 스코어 패턴
  '0-', '1-', '2-', '3-', '4-', '5-', '6-',
  '-0', '-1', '-2', '-3', '-4', '-5', '-6',
  // 한글
  '하이라이트', '골 모음', '경기 요약',
]

// ❌ 제외 키워드 (완화됨 - 핵심만 유지)
const EXCLUDE_KEYWORDS = [
  'preview', 'press conference', 'training',
  'interview', 'behind the scenes', 'reaction',
  'best of', 'top 10', 'all goals season', 'compilation',
  'skills', 'welcome', 'transfer', 'signs',
  // 옛날 경기 제외
  'classic', 'throwback', 'retro', 'rewind', 'on this day',
  'years ago', 'anniversary', 'legendary',
  '예고', '인터뷰', '훈련', '기자회견'
]

// 🏆 알려진 팀 이름 목록
const KNOWN_TEAMS: { [key: string]: string } = {
  // Premier League
  'chelsea': 'Chelsea', 'arsenal': 'Arsenal', 'liverpool': 'Liverpool',
  'man united': 'Manchester United', 'manchester united': 'Manchester United', 'man utd': 'Manchester United',
  'tottenham': 'Tottenham', 'spurs': 'Tottenham',
  'man city': 'Manchester City', 'manchester city': 'Manchester City', 'city': 'Manchester City',
  'west ham': 'West Ham', 'newcastle': 'Newcastle', 'aston villa': 'Aston Villa',
  'everton': 'Everton', 'brighton': 'Brighton', 'wolves': 'Wolves',
  'crystal palace': 'Crystal Palace', 'fulham': 'Fulham', 'brentford': 'Brentford',
  'bournemouth': 'Bournemouth', 'nottingham forest': 'Nottingham Forest',
  'leicester': 'Leicester', 'ipswich': 'Ipswich', 'southampton': 'Southampton',
  
  // La Liga
  'real madrid': 'Real Madrid', 'barcelona': 'Barcelona', 'barca': 'Barcelona',
  'atletico madrid': 'Atletico Madrid', 'atletico': 'Atletico Madrid',
  'sevilla': 'Sevilla', 'villarreal': 'Villarreal', 'real sociedad': 'Real Sociedad',
  'athletic bilbao': 'Athletic Bilbao', 'valencia': 'Valencia',
  'betis': 'Real Betis', 'real betis': 'Real Betis',
  
  // Bundesliga
  'bayern munich': 'Bayern Munich', 'bayern': 'Bayern Munich',
  'dortmund': 'Borussia Dortmund', 'borussia dortmund': 'Borussia Dortmund', 'bvb': 'Borussia Dortmund',
  'leverkusen': 'Bayer Leverkusen', 'bayer leverkusen': 'Bayer Leverkusen',
  'rb leipzig': 'RB Leipzig', 'leipzig': 'RB Leipzig',
  'frankfurt': 'Eintracht Frankfurt', 'eintracht frankfurt': 'Eintracht Frankfurt',
  
  // Serie A
  'juventus': 'Juventus', 'juve': 'Juventus',
  'inter': 'Inter Milan', 'inter milan': 'Inter Milan', 'internazionale': 'Inter Milan',
  'ac milan': 'AC Milan', 'milan': 'AC Milan',
  'napoli': 'Napoli', 'roma': 'AS Roma', 'as roma': 'AS Roma',
  'lazio': 'Lazio', 'atalanta': 'Atalanta', 'fiorentina': 'Fiorentina',
  
  // Ligue 1
  'psg': 'Paris Saint-Germain', 'paris': 'Paris Saint-Germain',
  'marseille': 'Marseille', 'lyon': 'Lyon', 'monaco': 'Monaco', 'lille': 'Lille',
  
  // Others
  'psv': 'PSV Eindhoven', 'ajax': 'Ajax', 'benfica': 'Benfica', 'porto': 'Porto',
  'celtic': 'Celtic', 'rangers': 'Rangers', 'galatasaray': 'Galatasaray',
}

interface YouTubeVideo {
  id: { videoId: string }
  snippet: {
    title: string
    description: string
    publishedAt: string
    channelTitle: string
    thumbnails: {
      high: { url: string }
      maxres?: { url: string }
    }
  }
}

// 팀 이름 찾기
function findTeamName(text: string): string | null {
  const lowerText = text.toLowerCase().trim()
  
  for (const [key, value] of Object.entries(KNOWN_TEAMS)) {
    if (lowerText.includes(key)) {
      return value
    }
  }
  return null
}

// 팀 이름 추출 (제목에서)
function extractTeams(title: string, clubName: string): { home: string; away: string } | null {
  const lowerTitle = title.toLowerCase()
  
  // "vs", "v", "-" 로 분리
  const vsMatch = title.match(/(.+?)\s+(?:vs\.?|v\.?|\-)\s+(.+)/i)
  
  if (vsMatch) {
    const beforeVs = vsMatch[1].trim()
    const afterVs = vsMatch[2].trim()
    
    let homeTeam = findTeamName(beforeVs)
    let awayTeam = findTeamName(afterVs)
    
    if (!homeTeam && !awayTeam) {
      homeTeam = clubName
      awayTeam = afterVs.split(/[|\-!]/)[0].trim()
    } else if (!homeTeam) {
      homeTeam = clubName
    } else if (!awayTeam) {
      awayTeam = clubName
    }
    
    return { home: homeTeam || clubName, away: awayTeam || 'Unknown' }
  }
  
  // vs가 없는 경우 - 스코어 패턴으로 찾기 (예: "Arsenal 3-1 Chelsea")
  const scoreMatch = title.match(/(.+?)\s+(\d+)\s*[-:]\s*(\d+)\s+(.+)/i)
  if (scoreMatch) {
    const team1 = findTeamName(scoreMatch[1]) || scoreMatch[1].trim()
    const team2 = findTeamName(scoreMatch[4]) || scoreMatch[4].split(/[|\-!]/)[0].trim()
    return { home: team1, away: team2 }
  }
  
  // 제목에서 다른 팀 찾기
  for (const [key, value] of Object.entries(KNOWN_TEAMS)) {
    if (lowerTitle.includes(key) && value !== clubName) {
      return { home: clubName, away: value }
    }
  }
  
  return null
}

// 경기 날짜 추출
function extractMatchDate(title: string, publishedAt: string): string {
  // 제목에서 날짜 패턴 찾기
  const dateMatch = title.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0')
    const month = dateMatch[2].padStart(2, '0')
    let year = dateMatch[3]
    if (year.length === 2) year = '20' + year
    return `${year}-${month}-${day}`
  }
  
  // 업로드 날짜 사용 (보통 경기 다음 날)
  const published = new Date(publishedAt)
  published.setDate(published.getDate() - 1)
  return published.toISOString().split('T')[0]
}

// 🎯 하이라이트 영상인지 확인 (완화된 필터!)
function isHighlightVideo(title: string): boolean {
  const lowerTitle = title.toLowerCase()
  
  // 1️⃣ 제외 키워드 있으면 false
  for (const exclude of EXCLUDE_KEYWORDS) {
    if (lowerTitle.includes(exclude.toLowerCase())) {
      return false
    }
  }
  
  // 2️⃣ 하이라이트 키워드 확인 (하나라도 있으면 OK!)
  for (const keyword of HIGHLIGHT_KEYWORDS) {
    if (lowerTitle.includes(keyword.toLowerCase())) {
      return true
    }
  }
  
  // 3️⃣ vs 패턴 + 숫자(스코어) 있으면 하이라이트일 가능성 높음
  const hasVs = lowerTitle.includes(' vs ') || lowerTitle.includes(' v ')
  const hasScore = /\d+\s*[-:]\s*\d+/.test(title)
  
  if (hasVs && hasScore) {
    return true
  }
  
  return false
}

export async function GET(request: NextRequest) {
  console.log('🎬 YouTube 구단 채널 하이라이트 수집 시작...')
  const startTime = Date.now()
  
  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({
      success: false,
      error: 'YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.',
    }, { status: 500 })
  }
  
  // 쿼리 파라미터
  const { searchParams } = new URL(request.url)
  const days = Math.min(parseInt(searchParams.get('days') || '7'), 14)
  
  try {
    let totalCollected = 0
    let totalSkipped = 0
    let totalNoHighlight = 0
    const results: any[] = []
    const errors: any[] = []

    for (const club of CLUB_CHANNELS) {
      console.log(`📺 ${club.name} 채널 검색 중...`)
      
      try {
        // YouTube Data API로 최신 영상 검색
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?` +
          `key=${YOUTUBE_API_KEY}` +
          `&channelId=${club.channelId}` +
          `&part=snippet` +
          `&order=date` +
          `&maxResults=10` +  // 10개로 증가
          `&type=video` +
          `&publishedAfter=${new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()}`
        
        const response = await fetch(searchUrl)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`❌ ${club.name} API 에러: ${response.status}`)
          errors.push({ club: club.name, error: errorText.substring(0, 100) })
          continue
        }
        
        const data = await response.json()
        const videos: YouTubeVideo[] = data.items || []
        
        console.log(`  - 최근 영상: ${videos.length}개`)
        
        // 하이라이트 영상 필터링
        const highlightVideos = videos.filter(v => isHighlightVideo(v.snippet.title))
        
        if (highlightVideos.length === 0) {
          console.log(`  ⚠️ ${club.name}: 하이라이트 영상 없음`)
          totalNoHighlight++
          continue
        }
        
        console.log(`  - 하이라이트 영상: ${highlightVideos.length}개`)
        
        for (const video of highlightVideos) {
          const videoId = video.id.videoId
          const title = video.snippet.title
          
          // 팀 이름 추출
          const teams = extractTeams(title, club.name)
          if (!teams) {
            console.log(`  ⚠️ 팀 이름 추출 실패: ${title.substring(0, 50)}...`)
            continue
          }
          
          // 경기 날짜 추출
          const matchDate = extractMatchDate(title, video.snippet.publishedAt)
          
          // 리그 결정
          let league = club.league
          const lowerTitle = title.toLowerCase()
          if (lowerTitle.includes('champions league') || lowerTitle.includes('ucl')) {
            league = 'Champions League'
          } else if (lowerTitle.includes('europa league') || lowerTitle.includes('uel')) {
            league = 'Europa League'
          } else if (lowerTitle.includes('conference league') || lowerTitle.includes('uecl')) {
            league = 'Conference League'
          } else if (lowerTitle.includes('fa cup')) {
            league = 'FA Cup'
          } else if (lowerTitle.includes('carabao') || lowerTitle.includes('league cup') || lowerTitle.includes('efl cup')) {
            league = 'EFL Cup'
          }
          
          // 중복 체크
          const checkResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/match_highlights?youtube_id=eq.${videoId}&select=id`,
            {
              headers: {
                'apikey': SUPABASE_SERVICE_KEY || '',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              },
            }
          )
          
          if (checkResponse.ok) {
            const existing = await checkResponse.json()
            if (existing.length > 0) {
              console.log(`  ⏭️ 이미 있음: ${teams.home} vs ${teams.away}`)
              totalSkipped++
              continue
            }
          }
          
          // 썸네일 URL (최고 화질)
          const thumbnailUrl = video.snippet.thumbnails.maxres?.url 
            || video.snippet.thumbnails.high?.url 
            || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
          
          // DB에 저장
          const highlightData = {
            event_id: `yt_${videoId}`,
            home_team: teams.home,
            away_team: teams.away,
            league: league,
            match_date: matchDate,
            youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
            youtube_id: videoId,
            thumbnail_url: thumbnailUrl,
            video_title: title,
            source: 'youtube',
          }
          
          const insertResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/match_highlights`,
            {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_SERVICE_KEY || '',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify(highlightData),
            }
          )
          
          if (insertResponse.ok) {
            totalCollected++
            results.push({
              match: `${teams.home} vs ${teams.away}`,
              league: league,
              date: matchDate,
              channel: club.name,
            })
            console.log(`  ✅ 저장: ${teams.home} vs ${teams.away}`)
          } else {
            const errorText = await insertResponse.text()
            console.log(`  ❌ 저장 실패: ${errorText.substring(0, 100)}`)
            errors.push({ match: `${teams.home} vs ${teams.away}`, error: errorText.substring(0, 100) })
          }
        }
        
        // API 제한 방지
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error: any) {
        console.error(`❌ ${club.name} 에러:`, error.message)
        errors.push({ club: club.name, error: error.message })
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    
    console.log(`
🎬 YouTube 하이라이트 수집 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 기간: ${days}일
📺 채널: ${CLUB_CHANNELS.length}개
🆕 새로 수집: ${totalCollected}개
⏭️ 중복 건너뜀: ${totalSkipped}개
⚠️ 하이라이트 없음: ${totalNoHighlight}개 채널
⏱️ 소요 시간: ${duration}초
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
    
    return NextResponse.json({
      success: true,
      message: `하이라이트 ${totalCollected}개 수집 완료`,
      days,
      collected: totalCollected,
      skipped: totalSkipped,
      noHighlights: totalNoHighlight,
      duration: `${duration}s`,
      highlights: results.slice(0, 20),  // 최대 20개만 반환
      errors: errors.slice(0, 5),
      debug: {
        channelsChecked: CLUB_CHANNELS.length,
        clubs: CLUB_CHANNELS.map(c => c.name),
      }
    })
    
  } catch (error: any) {
    console.error('❌ YouTube 하이라이트 수집 실패:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    }, { status: 500 })
  }
}
