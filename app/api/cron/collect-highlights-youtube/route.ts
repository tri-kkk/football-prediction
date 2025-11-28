import { NextRequest, NextResponse } from 'next/server'

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
  
  // La Liga
  { channelId: 'UCWV3obpZVGgJ3j9FVhEjF2Q', name: 'Real Madrid', league: 'La Liga' },
  { channelId: 'UC14UlmYlSNiQCBe9Eookf_A', name: 'FC Barcelona', league: 'La Liga' },
  { channelId: 'UC9aSelbhR5IYBRg5L5GgjZg', name: 'Atletico Madrid', league: 'La Liga' },
  
  // Bundesliga
  { channelId: 'UCZdzYsXFuTfX4A4hz14RnEw', name: 'Bayern Munich', league: 'Bundesliga' },
  { channelId: 'UCHpPpYCGvXlTCSyV-aRbBvQ', name: 'Borussia Dortmund', league: 'Bundesliga' },
  
  // Serie A
  { channelId: 'UCITVCQrRPuUb2LrUEvLRPCg', name: 'Juventus', league: 'Serie A' },
  { channelId: 'UCEL-_pjj5x6SdvVD-7VKN2g', name: 'AC Milan', league: 'Serie A' },
  { channelId: 'UCgYDP08fJg2O0KGgzbYkCVQ', name: 'Inter Milan', league: 'Serie A' },
  
  // Ligue 1
  { channelId: 'UCyPJlI7FHwhXTYOGLNOPLsA', name: 'Paris Saint-Germain', league: 'Ligue 1' },
]

// 하이라이트 키워드 (필수!)
const MUST_HAVE_KEYWORDS = ['highlight', 'highlights', '하이라이트']

// 추가 확인 키워드 (vs + 스코어)
const MATCH_INDICATORS = ['vs', 'v.', '0', '1', '2', '3', '4', '5', '6']

// ❌ 제외 키워드 (이런 영상은 무시)
const EXCLUDE_KEYWORDS = [
  'preview', 'press', 'conference', 'training', 'interview',
  'behind', 'scenes', 'reaction', 'vlog', 'analysis', 
  'tactical', 'best of', 'top 10', 'all goals', 'season',
  'compilation', 'skills', 'welcome', 'transfer', 'signs',
  'announcement', 'official', 'trailer', 'teaser', 'promo',
  'fan', 'supporters', 'chant', 'anthem', 'trophy', 'parade',
  'award', 'ceremony', 'gala', 'documentary', 'story',
  '예고', '인터뷰', '훈련', '기자회견', '시즌', '베스트'
]

// 🏆 알려진 팀 이름 목록 (매칭용)
const KNOWN_TEAMS: { [key: string]: string } = {
  // Premier League
  'chelsea': 'Chelsea',
  'arsenal': 'Arsenal',
  'liverpool': 'Liverpool',
  'man united': 'Manchester United',
  'manchester united': 'Manchester United',
  'man utd': 'Manchester United',
  'tottenham': 'Tottenham',
  'spurs': 'Tottenham',
  'man city': 'Manchester City',
  'manchester city': 'Manchester City',
  'west ham': 'West Ham',
  'newcastle': 'Newcastle',
  'aston villa': 'Aston Villa',
  'everton': 'Everton',
  'brighton': 'Brighton',
  'wolves': 'Wolves',
  'crystal palace': 'Crystal Palace',
  'fulham': 'Fulham',
  'brentford': 'Brentford',
  'bournemouth': 'Bournemouth',
  'nottingham forest': 'Nottingham Forest',
  'leicester': 'Leicester',
  'ipswich': 'Ipswich',
  'southampton': 'Southampton',
  
  // La Liga
  'real madrid': 'Real Madrid',
  'barcelona': 'Barcelona',
  'barca': 'Barcelona',
  'atletico madrid': 'Atletico Madrid',
  'atletico': 'Atletico Madrid',
  'sevilla': 'Sevilla',
  'villarreal': 'Villarreal',
  'real sociedad': 'Real Sociedad',
  'athletic bilbao': 'Athletic Bilbao',
  'valencia': 'Valencia',
  'betis': 'Real Betis',
  'real betis': 'Real Betis',
  
  // Bundesliga
  'bayern munich': 'Bayern Munich',
  'bayern': 'Bayern Munich',
  'dortmund': 'Borussia Dortmund',
  'borussia dortmund': 'Borussia Dortmund',
  'bvb': 'Borussia Dortmund',
  'leverkusen': 'Bayer Leverkusen',
  'bayer leverkusen': 'Bayer Leverkusen',
  'rb leipzig': 'RB Leipzig',
  'leipzig': 'RB Leipzig',
  'frankfurt': 'Eintracht Frankfurt',
  'eintracht frankfurt': 'Eintracht Frankfurt',
  
  // Serie A
  'juventus': 'Juventus',
  'juve': 'Juventus',
  'inter': 'Inter Milan',
  'inter milan': 'Inter Milan',
  'ac milan': 'AC Milan',
  'milan': 'AC Milan',
  'napoli': 'Napoli',
  'roma': 'AS Roma',
  'as roma': 'AS Roma',
  'lazio': 'Lazio',
  'atalanta': 'Atalanta',
  'fiorentina': 'Fiorentina',
  
  // Ligue 1
  'psg': 'Paris Saint-Germain',
  'paris': 'Paris Saint-Germain',
  'paris saint-germain': 'Paris Saint-Germain',
  'marseille': 'Marseille',
  'lyon': 'Lyon',
  'monaco': 'Monaco',
  'lille': 'Lille',
  
  // Others
  'psv': 'PSV Eindhoven',
  'psv eindhoven': 'PSV Eindhoven',
  'ajax': 'Ajax',
  'benfica': 'Benfica',
  'porto': 'Porto',
  'sporting': 'Sporting CP',
  'celtic': 'Celtic',
  'rangers': 'Rangers',
  'club brugge': 'Club Brugge',
  'galatasaray': 'Galatasaray',
  'olympiacos': 'Olympiacos',
}

interface YouTubeVideo {
  id: { videoId: string }
  snippet: {
    title: string
    description: string
    publishedAt: string
    thumbnails: {
      high: { url: string }
    }
  }
}

// 팀 이름 찾기 (알려진 목록에서)
function findTeamName(text: string): string | null {
  const lowerText = text.toLowerCase().trim()
  
  // 정확한 매칭 우선
  for (const [key, value] of Object.entries(KNOWN_TEAMS)) {
    if (lowerText === key || lowerText.includes(key)) {
      return value
    }
  }
  
  return null
}

// 팀 이름 추출 (제목에서) - 개선된 버전
function extractTeams(title: string, clubName: string): { home: string; away: string } | null {
  const lowerTitle = title.toLowerCase()
  
  // "vs" 또는 "v" 로 분리
  const vsMatch = title.match(/(.+?)\s+(?:vs\.?|v\.?)\s+(.+)/i)
  
  if (vsMatch) {
    const beforeVs = vsMatch[1].trim()
    const afterVs = vsMatch[2].trim()
    
    // 앞뒤에서 팀 이름 찾기
    let homeTeam = findTeamName(beforeVs)
    let awayTeam = findTeamName(afterVs)
    
    // 못 찾으면 채널 구단 이름 사용
    if (!homeTeam && !awayTeam) {
      // 둘 다 못 찾으면 채널명을 홈팀으로
      homeTeam = clubName
      awayTeam = afterVs.split(/[|\-!]/)[0].trim() // | 나 - 뒤 제거
    } else if (!homeTeam) {
      // 홈팀만 못 찾으면 채널명 사용
      homeTeam = clubName
    } else if (!awayTeam) {
      // 원정팀만 못 찾으면 채널명 사용
      awayTeam = clubName
    }
    
    // 채널 구단이 원정팀에 있으면 홈/어웨이 교체
    const clubLower = clubName.toLowerCase()
    if (awayTeam && awayTeam.toLowerCase().includes(clubLower.split(' ')[0])) {
      // 채널 구단이 어웨이에 있으면 제목 그대로 (상대팀 홈경기)
    }
    
    return { home: homeTeam || clubName, away: awayTeam || 'Unknown' }
  }
  
  // vs가 없는 경우 - 채널 구단 + 제목에서 다른 팀 찾기
  for (const [key, value] of Object.entries(KNOWN_TEAMS)) {
    if (lowerTitle.includes(key) && value !== clubName) {
      // 다른 팀 발견
      return { home: clubName, away: value }
    }
  }
  
  return null
}

// 경기 날짜 추출 (제목 또는 업로드 날짜에서)
function extractMatchDate(title: string, publishedAt: string): string {
  // 제목에서 날짜 패턴 찾기 (예: 25/11/2025, 2025-11-25)
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
  published.setDate(published.getDate() - 1) // 하루 전 = 경기 날짜
  return published.toISOString().split('T')[0]
}

// 하이라이트 영상인지 확인 (엄격한 필터링!)
function isHighlightVideo(title: string): boolean {
  const lowerTitle = title.toLowerCase()
  
  // 1️⃣ 제외 키워드 있으면 바로 false
  for (const exclude of EXCLUDE_KEYWORDS) {
    if (lowerTitle.includes(exclude)) {
      return false
    }
  }
  
  // 2️⃣ "highlights" 키워드 필수!
  const hasHighlight = MUST_HAVE_KEYWORDS.some(keyword => 
    lowerTitle.includes(keyword.toLowerCase())
  )
  
  if (!hasHighlight) {
    return false
  }
  
  // 3️⃣ 경기 지표 확인 (vs 또는 스코어)
  const hasMatchIndicator = MATCH_INDICATORS.some(indicator => 
    lowerTitle.includes(indicator)
  )
  
  return hasMatchIndicator
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
          `&maxResults=5` +
          `&type=video` +
          `&publishedAfter=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}` // 최근 7일
        
        const response = await fetch(searchUrl)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`❌ ${club.name} API 에러: ${response.status} - ${errorText}`)
          errors.push({ club: club.name, error: errorText })
          continue
        }
        
        const data = await response.json()
        const videos: YouTubeVideo[] = data.items || []
        
        console.log(`  - 최근 영상: ${videos.length}개`)
        
        // 하이라이트 영상만 필터링
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
            console.log(`  ⚠️ 팀 이름 추출 실패: ${title}`)
            continue
          }
          
          // 경기 날짜 추출
          const matchDate = extractMatchDate(title, video.snippet.publishedAt)
          
          // 리그 결정 (챔스 경기인지 확인)
          let league = club.league
          const lowerTitle = title.toLowerCase()
          if (lowerTitle.includes('champions league') || lowerTitle.includes('ucl')) {
            league = 'Champions League'
          } else if (lowerTitle.includes('europa league') || lowerTitle.includes('uel')) {
            league = 'Europa League'
          }
          
          // 중복 체크 (youtube_id로)
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
          
          // DB에 저장
          const highlightData = {
            event_id: `yt_${videoId}`,
            home_team: teams.home,
            away_team: teams.away,
            league: league,
            match_date: matchDate,
            youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
            youtube_id: videoId,
            thumbnail_url: video.snippet.thumbnails.high.url,
            video_title: title,
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
            console.log(`  ❌ 저장 실패: ${errorText}`)
            errors.push({ match: `${teams.home} vs ${teams.away}`, error: errorText })
          }
        }
        
        // API 제한 방지 (YouTube API는 초당 제한 있음)
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error: any) {
        console.error(`❌ ${club.name} 에러:`, error.message)
        errors.push({ club: club.name, error: error.message })
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    
    console.log(`✅ YouTube 하이라이트 수집 완료!`)
    console.log(`   - 새로 수집: ${totalCollected}개`)
    console.log(`   - 중복 건너뜀: ${totalSkipped}개`)
    console.log(`   - 하이라이트 없음: ${totalNoHighlight}개`)
    console.log(`   - 소요 시간: ${duration}초`)
    
    return NextResponse.json({
      success: true,
      message: `하이라이트 ${totalCollected}개 수집 완료`,
      collected: totalCollected,
      skipped: totalSkipped,
      noHighlights: totalNoHighlight,
      duration: `${duration}s`,
      highlights: results,
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
    }, { status: 500 })
  }
}