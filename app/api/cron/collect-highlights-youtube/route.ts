import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// YouTube Data API
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

// Supabase 설정
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 🏆 주요 인기 구단 YouTube 채널 ID
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
  
  // 공식 리그 채널 (하이라이트 많음!)
  { channelId: 'UCG5qGWdu8nIRZqJ_GgDwQ-w', name: 'Premier League', league: 'Premier League' },
  { channelId: 'UCTv-XvfzLX5Xq2Vu2sBniQg', name: 'LaLiga', league: 'La Liga' },
  { channelId: 'UCGBHGLSqpQP8lNfpVz4K-fg', name: 'Bundesliga', league: 'Bundesliga' },
  { channelId: 'UCBJeMCIeLQos7wacox4hmLQ', name: 'Serie A', league: 'Serie A' },
  { channelId: 'UCFtEEv80fQVKkD4h1PF-Xqw', name: 'Ligue 1', league: 'Ligue 1' },
  { channelId: 'UCJlS0D0bkduXB8dkf8xfkAA', name: 'UEFA Champions League', league: 'Champions League' },
]

// 🎯 하이라이트 키워드
const HIGHLIGHT_KEYWORDS = [
  'highlight', 'highlights', 'extended highlight',
  'goals', 'all goals',
  'match recap', 'recap', 'summary',
]

// ❌ 제외 키워드 (강화됨!)
const EXCLUDE_KEYWORDS = [
  // 라이브/예고
  'live', 'live:', '🔴', 'build up', 'build-up', 'buildup',
  'preview', 'pre-match', 'prematch',
  // 인터뷰/훈련
  'press conference', 'training', 'interview',
  'behind the scenes', 'reaction', 'post-match reaction',
  // 컴필레이션
  'best of', 'top 10', 'top 5', 'all goals season', 'compilation',
  'skills', 'welcome', 'transfer', 'signs', 'official',
  // 옛날/기념
  'classic', 'throwback', 'retro', 'rewind', 'on this day',
  'years ago', 'anniversary', 'legendary', 'iconic',
  // 기타
  'seamless', 'cinematic', 'ambient', 'asmr',
  'fan cam', 'fan view', 'vlog',
  // 한글
  '예고', '인터뷰', '훈련', '기자회견', '라이브'
]

// 🏆 알려진 팀 이름 목록
const KNOWN_TEAMS: { [key: string]: string } = {
  // Premier League
  'chelsea': 'Chelsea', 'arsenal': 'Arsenal', 'liverpool': 'Liverpool',
  'man united': 'Manchester United', 'manchester united': 'Manchester United', 'man utd': 'Manchester United',
  'tottenham': 'Tottenham', 'spurs': 'Tottenham',
  'man city': 'Manchester City', 'manchester city': 'Manchester City',
  'west ham': 'West Ham', 'newcastle': 'Newcastle', 'aston villa': 'Aston Villa',
  'everton': 'Everton', 'brighton': 'Brighton', 'wolves': 'Wolves',
  'crystal palace': 'Crystal Palace', 'fulham': 'Fulham', 'brentford': 'Brentford',
  'bournemouth': 'Bournemouth', 'nottingham forest': 'Nottingham Forest', "nott'm forest": 'Nottingham Forest',
  'leicester': 'Leicester', 'ipswich': 'Ipswich', 'southampton': 'Southampton',
  'sheffield united': 'Sheffield United', 'sheffield utd': 'Sheffield United',
  'luton': 'Luton Town', 'burnley': 'Burnley',
  
  // La Liga
  'real madrid': 'Real Madrid', 'barcelona': 'Barcelona', 'fc barcelona': 'Barcelona', 'barca': 'Barcelona',
  'atletico madrid': 'Atletico Madrid', 'atletico': 'Atletico Madrid', 'atleti': 'Atletico Madrid',
  'sevilla': 'Sevilla', 'villarreal': 'Villarreal', 'real sociedad': 'Real Sociedad',
  'athletic bilbao': 'Athletic Bilbao', 'athletic club': 'Athletic Bilbao',
  'valencia': 'Valencia', 'betis': 'Real Betis', 'real betis': 'Real Betis',
  'celta vigo': 'Celta Vigo', 'getafe': 'Getafe', 'osasuna': 'Osasuna',
  'mallorca': 'Mallorca', 'rayo vallecano': 'Rayo Vallecano', 'espanyol': 'Espanyol',
  
  // Bundesliga
  'bayern munich': 'Bayern Munich', 'bayern': 'Bayern Munich', 'fc bayern': 'Bayern Munich',
  'dortmund': 'Borussia Dortmund', 'borussia dortmund': 'Borussia Dortmund', 'bvb': 'Borussia Dortmund',
  'leverkusen': 'Bayer Leverkusen', 'bayer leverkusen': 'Bayer Leverkusen',
  'rb leipzig': 'RB Leipzig', 'leipzig': 'RB Leipzig',
  'frankfurt': 'Eintracht Frankfurt', 'eintracht frankfurt': 'Eintracht Frankfurt',
  'wolfsburg': 'Wolfsburg', 'gladbach': 'Borussia Monchengladbach', 'freiburg': 'Freiburg',
  'stuttgart': 'Stuttgart', 'union berlin': 'Union Berlin', 'hoffenheim': 'Hoffenheim',
  
  // Serie A
  'juventus': 'Juventus', 'juve': 'Juventus',
  'inter': 'Inter Milan', 'inter milan': 'Inter Milan', 'internazionale': 'Inter Milan',
  'ac milan': 'AC Milan', 'milan': 'AC Milan',
  'napoli': 'Napoli', 'roma': 'AS Roma', 'as roma': 'AS Roma',
  'lazio': 'Lazio', 'atalanta': 'Atalanta', 'fiorentina': 'Fiorentina',
  'torino': 'Torino', 'bologna': 'Bologna', 'udinese': 'Udinese',
  'sassuolo': 'Sassuolo', 'como': 'Como', 'monza': 'Monza',
  'verona': 'Verona', 'hellas verona': 'Verona', 'lecce': 'Lecce',
  'genoa': 'Genoa', 'cagliari': 'Cagliari', 'empoli': 'Empoli',
  
  // Ligue 1
  'psg': 'Paris Saint-Germain', 'paris': 'Paris Saint-Germain', 'paris saint-germain': 'Paris Saint-Germain',
  'marseille': 'Marseille', 'om': 'Marseille',
  'lyon': 'Lyon', 'monaco': 'Monaco', 'lille': 'Lille',
  'nice': 'Nice', 'lens': 'Lens', 'rennes': 'Rennes',
  
  // Champions League 자주 나오는 팀
  'olympiacos': 'Olympiacos', 'feyenoord': 'Feyenoord', 'celtic': 'Celtic',
  'rangers': 'Rangers', 'psv': 'PSV Eindhoven', 'psv eindhoven': 'PSV Eindhoven',
  'ajax': 'Ajax', 'benfica': 'Benfica', 'porto': 'Porto',
  'sporting': 'Sporting CP', 'sporting cp': 'Sporting CP',
  'club brugge': 'Club Brugge', 'galatasaray': 'Galatasaray',
  'red star': 'Red Star Belgrade', 'young boys': 'Young Boys',
  'salzburg': 'RB Salzburg', 'rb salzburg': 'RB Salzburg',
  'shakhtar': 'Shakhtar Donetsk', 'dynamo kyiv': 'Dynamo Kyiv',
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

// 제목 정리 (HIGHLIGHTS | 같은 접두사 제거)
function cleanTitle(title: string): string {
  return title
    .replace(/^(highlights?|extended|full\s*match)\s*[|:\-–—]\s*/i, '')
    .replace(/\s*[|:\-–—]\s*(highlights?|extended|full\s*match)$/i, '')
    .trim()
}

// 팀 이름 찾기
function findTeamName(text: string): string | null {
  const lowerText = text.toLowerCase().trim()
  
  // 정확한 매칭 우선 (긴 이름부터)
  const sortedKeys = Object.keys(KNOWN_TEAMS).sort((a, b) => b.length - a.length)
  
  for (const key of sortedKeys) {
    if (lowerText.includes(key)) {
      return KNOWN_TEAMS[key]
    }
  }
  return null
}

// 팀 이름 추출 (개선됨!)
function extractTeams(title: string, clubName: string): { home: string; away: string } | null {
  // 1. 제목 정리
  const cleanedTitle = cleanTitle(title)
  const lowerTitle = cleanedTitle.toLowerCase()
  
  // 2. 스코어 패턴으로 팀 추출 (가장 정확함!)
  // 예: "Arsenal 3-1 Chelsea", "Barcelona 4 vs 0 Athletic Club"
  const scorePatterns = [
    /(.+?)\s+(\d+)\s*[-–—:]\s*(\d+)\s+(.+)/i,           // Team1 3-1 Team2
    /(.+?)\s+(\d+)\s+vs\.?\s+(\d+)\s+(.+)/i,            // Team1 3 vs 1 Team2
    /(.+?)\s+(\d+)\s*[-–—]\s*(\d+)\s*[|:\-–—]\s*(.+)/i, // Team1 3-1 | Team2
  ]
  
  for (const pattern of scorePatterns) {
    const match = cleanedTitle.match(pattern)
    if (match) {
      const team1Text = match[1].trim()
      const team2Text = match[4].trim()
      
      const team1 = findTeamName(team1Text) || team1Text.split(/[|,]/)[0].trim()
      const team2 = findTeamName(team2Text) || team2Text.split(/[|,]/)[0].trim()
      
      if (team1 && team2 && team1 !== team2) {
        return { home: team1, away: team2 }
      }
    }
  }
  
  // 3. vs 패턴
  const vsMatch = cleanedTitle.match(/(.+?)\s+(?:vs\.?|v\.?|versus)\s+(.+)/i)
  if (vsMatch) {
    const beforeVs = vsMatch[1].trim()
    const afterVs = vsMatch[2].trim()
    
    let homeTeam = findTeamName(beforeVs)
    let awayTeam = findTeamName(afterVs)
    
    // 못 찾으면 텍스트 정리해서 사용
    if (!homeTeam) {
      homeTeam = beforeVs.split(/[|,\-–—]/)[0].trim()
      // "HIGHLIGHTS Olympiacos" 같은 경우 정리
      homeTeam = homeTeam.replace(/^(highlights?|extended)\s*/i, '').trim()
    }
    if (!awayTeam) {
      awayTeam = afterVs.split(/[|,\-–—]/)[0].trim()
    }
    
    if (homeTeam && awayTeam && homeTeam !== awayTeam) {
      return { home: homeTeam, away: awayTeam }
    }
  }
  
  // 4. 제목에서 두 팀 찾기 (vs 없는 경우)
  const foundTeams: string[] = []
  const sortedKeys = Object.keys(KNOWN_TEAMS).sort((a, b) => b.length - a.length)
  
  for (const key of sortedKeys) {
    if (lowerTitle.includes(key)) {
      const teamName = KNOWN_TEAMS[key]
      if (!foundTeams.includes(teamName)) {
        foundTeams.push(teamName)
        if (foundTeams.length >= 2) break
      }
    }
  }
  
  if (foundTeams.length >= 2) {
    return { home: foundTeams[0], away: foundTeams[1] }
  }
  
  // 5. 채널 이름 + 다른 팀 하나
  if (foundTeams.length === 1) {
    // 채널이 구단 채널이면 채널명을 홈팀으로
    if (clubName !== 'Premier League' && clubName !== 'LaLiga' && 
        clubName !== 'Bundesliga' && clubName !== 'Serie A' && 
        clubName !== 'Ligue 1' && clubName !== 'UEFA Champions League') {
      if (foundTeams[0] !== clubName) {
        return { home: clubName, away: foundTeams[0] }
      }
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
  
  // 업로드 날짜 사용 (보통 경기 당일 또는 다음 날)
  const published = new Date(publishedAt)
  return published.toISOString().split('T')[0]
}

// 리그 감지
function detectLeague(title: string, defaultLeague: string): string {
  const lowerTitle = title.toLowerCase()
  
  if (lowerTitle.includes('champions league') || lowerTitle.includes('ucl')) {
    return 'Champions League'
  }
  if (lowerTitle.includes('europa league') || lowerTitle.includes('uel')) {
    return 'Europa League'
  }
  if (lowerTitle.includes('conference league') || lowerTitle.includes('uecl')) {
    return 'Conference League'
  }
  if (lowerTitle.includes('fa cup')) {
    return 'FA Cup'
  }
  if (lowerTitle.includes('carabao') || lowerTitle.includes('league cup') || lowerTitle.includes('efl cup')) {
    return 'EFL Cup'
  }
  if (lowerTitle.includes('copa del rey')) {
    return 'Copa del Rey'
  }
  if (lowerTitle.includes('dfb-pokal') || lowerTitle.includes('dfb pokal')) {
    return 'DFB-Pokal'
  }
  if (lowerTitle.includes('coppa italia')) {
    return 'Coppa Italia'
  }
  if (lowerTitle.includes('coupe de france')) {
    return 'Coupe de France'
  }
  if (lowerTitle.includes('premier league') || lowerTitle.includes('pl ')) {
    return 'Premier League'
  }
  if (lowerTitle.includes('la liga') || lowerTitle.includes('laliga')) {
    return 'La Liga'
  }
  if (lowerTitle.includes('bundesliga')) {
    return 'Bundesliga'
  }
  if (lowerTitle.includes('serie a')) {
    return 'Serie A'
  }
  if (lowerTitle.includes('ligue 1')) {
    return 'Ligue 1'
  }
  
  return defaultLeague
}

// 🎯 하이라이트 영상인지 확인 (강화됨!)
function isHighlightVideo(title: string): boolean {
  const lowerTitle = title.toLowerCase()
  
  // 1️⃣ 제외 키워드 있으면 즉시 false
  for (const exclude of EXCLUDE_KEYWORDS) {
    if (lowerTitle.includes(exclude.toLowerCase())) {
      return false
    }
  }
  
  // 2️⃣ 하이라이트 키워드 확인
  const hasHighlightKeyword = HIGHLIGHT_KEYWORDS.some(keyword => 
    lowerTitle.includes(keyword.toLowerCase())
  )
  
  if (hasHighlightKeyword) {
    return true
  }
  
  // 3️⃣ vs/v + 스코어 패턴 (경기 결과 영상)
  const hasVs = /\s(vs\.?|v\.?|versus)\s/i.test(title)
  const hasScore = /\d+\s*[-–—:]\s*\d+/.test(title)
  
  if (hasVs && hasScore) {
    return true
  }
  
  // 4️⃣ 팀명 + 스코어 (vs 없이)
  // 예: "Arsenal 3-1 Chelsea"
  if (hasScore) {
    const scoreMatch = title.match(/(.+?)\s+\d+\s*[-–—:]\s*\d+\s+(.+)/)
    if (scoreMatch) {
      const team1 = findTeamName(scoreMatch[1])
      const team2 = findTeamName(scoreMatch[2])
      if (team1 && team2) {
        return true
      }
    }
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
    let totalFiltered = 0
    let totalNoTeams = 0
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
          `&maxResults=10` +
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
        
        // 하이라이트 영상 필터링
        const highlightVideos = videos.filter(v => isHighlightVideo(v.snippet.title))
        
        if (highlightVideos.length === 0) {
          totalFiltered++
          continue
        }
        
        console.log(`  ✓ 하이라이트 ${highlightVideos.length}개 발견`)
        
        for (const video of highlightVideos) {
          const videoId = video.id.videoId
          const title = video.snippet.title
          
          // 팀 이름 추출
          const teams = extractTeams(title, club.name)
          
          // 팀명 추출 실패 또는 빈 값이면 스킵
          if (!teams || !teams.home || !teams.away || teams.away === '') {
            console.log(`  ⚠️ 팀명 추출 실패: ${title.substring(0, 50)}...`)
            totalNoTeams++
            continue
          }
          
          // 홈팀과 어웨이팀이 같으면 스킵
          if (teams.home === teams.away) {
            console.log(`  ⚠️ 동일 팀명: ${teams.home}`)
            totalNoTeams++
            continue
          }
          
          // 리그 감지
          const league = detectLeague(title, club.league)
          
          // 경기 날짜 추출
          const matchDate = extractMatchDate(title, video.snippet.publishedAt)
          
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
          
          // 썸네일 URL
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
            video_title: cleanTitle(title),
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
            console.log(`  ✅ 저장: ${teams.home} vs ${teams.away} (${league})`)
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
⏭️ 중복: ${totalSkipped}개
🚫 필터링: ${totalFiltered}개 채널
❓ 팀명 추출 실패: ${totalNoTeams}개
⏱️ 소요: ${duration}초
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
    
    return NextResponse.json({
      success: true,
      message: `하이라이트 ${totalCollected}개 수집 완료`,
      days,
      collected: totalCollected,
      skipped: totalSkipped,
      filtered: totalFiltered,
      noTeams: totalNoTeams,
      duration: `${duration}s`,
      highlights: results.slice(0, 20),
      errors: errors.slice(0, 5),
      debug: {
        channelsChecked: CLUB_CHANNELS.length,
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
