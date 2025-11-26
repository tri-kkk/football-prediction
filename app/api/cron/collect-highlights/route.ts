import { NextRequest, NextResponse } from 'next/server'

// ScoreBat API (완전 무료!)
const SCOREBAT_API_URL = 'https://www.scorebat.com/video-api/v3/feed'

// Supabase 설정
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 주요 리그 필터 (소문자로 비교)
const MAJOR_LEAGUES = [
  'premier league',
  'la liga',
  'bundesliga', 
  'serie a',
  'ligue 1',
  'champions league',
  'europa league',
]

interface ScoreBatVideo {
  title: string
  competition: {
    name: string
    id: number
  }
  matchviewUrl: string
  thumbnail: string
  date: string
  videos: Array<{
    title: string
    embed: string
  }>
}

export async function GET(request: NextRequest) {
  console.log('🎬 ScoreBat 하이라이트 수집 시작...')
  const startTime = Date.now()
  
  try {
    // ScoreBat API 호출 (무료!)
    const response = await fetch(SCOREBAT_API_URL, {
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.log('❌ ScoreBat API 실패:', response.status)
      return NextResponse.json({
        success: false,
        error: `ScoreBat API error: ${response.status}`,
      }, { status: 500 })
    }
    
    const data = await response.json()
    console.log(`📊 ScoreBat 응답: ${data.response?.length || 0}개 경기`)
    
    const videos: ScoreBatVideo[] = data.response || []
    
    // 주요 리그만 필터링
    const majorLeagueVideos = videos.filter(video => {
      const competitionName = video.competition?.name?.toLowerCase() || ''
      return MAJOR_LEAGUES.some(league => competitionName.includes(league))
    })
    
    console.log(`  - 주요 리그: ${majorLeagueVideos.length}개`)
    
    let totalCollected = 0
    let totalSkipped = 0
    const results: any[] = []
    
    for (const video of majorLeagueVideos.slice(0, 30)) { // 최대 30개
      try {
        // 제목에서 팀 이름 추출 (예: "Arsenal vs Chelsea")
        const titleParts = video.title.split(' - ')
        const matchPart = titleParts[0] || video.title
        const teams = matchPart.split(' vs ')
        
        const homeTeam = teams[0]?.trim() || 'Unknown'
        const awayTeam = teams[1]?.trim() || 'Unknown'
        
        // YouTube URL 추출 (embed에서)
        let youtubeUrl = ''
        let youtubeId = ''
        
        if (video.videos && video.videos.length > 0) {
          const embed = video.videos[0].embed || ''
          
          // iframe에서 YouTube URL 추출
          const srcMatch = embed.match(/src="([^"]+)"/)
          if (srcMatch) {
            const embedUrl = srcMatch[1]
            
            // YouTube embed URL에서 ID 추출
            if (embedUrl.includes('youtube.com/embed/')) {
              youtubeId = embedUrl.split('youtube.com/embed/')[1]?.split('?')[0] || ''
              youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`
            } else if (embedUrl.includes('youtube.com')) {
              youtubeUrl = embedUrl
              youtubeId = embedUrl.split('v=')[1]?.split('&')[0] || ''
            }
          }
        }
        
        // YouTube 정보가 없으면 ScoreBat 페이지 URL 사용
        if (!youtubeUrl && video.matchviewUrl) {
          youtubeUrl = video.matchviewUrl
        }
        
        if (!youtubeUrl) {
          console.log(`  ⚠️ URL 없음: ${video.title}`)
          continue
        }
        
        // 고유 ID 생성
        const matchId = `scorebat_${video.competition?.id || 0}_${homeTeam.replace(/\s+/g, '')}_${awayTeam.replace(/\s+/g, '')}_${video.date}`
        
        // 중복 체크
        const checkResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/match_highlights?match_id=eq.${encodeURIComponent(matchId)}&select=id`,
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
            totalSkipped++
            continue
          }
        }
        
        // 리그 이름 정규화
        let leagueName = video.competition?.name || 'Unknown'
        if (leagueName.toLowerCase().includes('premier league')) {
          leagueName = 'Premier League'
        } else if (leagueName.toLowerCase().includes('la liga')) {
          leagueName = 'La Liga'
        } else if (leagueName.toLowerCase().includes('bundesliga')) {
          leagueName = 'Bundesliga'
        } else if (leagueName.toLowerCase().includes('serie a')) {
          leagueName = 'Serie A'
        } else if (leagueName.toLowerCase().includes('ligue 1')) {
          leagueName = 'Ligue 1'
        } else if (leagueName.toLowerCase().includes('champions league')) {
          leagueName = 'Champions League'
        } else if (leagueName.toLowerCase().includes('europa league')) {
          leagueName = 'Europa League'
        }
        
        // DB에 저장
        const highlightData = {
          match_id: matchId,
          home_team: homeTeam,
          away_team: awayTeam,
          league: leagueName,
          match_date: video.date?.split('T')[0] || new Date().toISOString().split('T')[0],
          youtube_url: youtubeUrl,
          youtube_id: youtubeId || matchId,
          thumbnail_url: video.thumbnail || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
          video_title: video.title,
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
            match: `${homeTeam} vs ${awayTeam}`,
            league: leagueName,
            date: highlightData.match_date,
          })
          console.log(`  ✅ 저장: ${homeTeam} vs ${awayTeam} (${leagueName})`)
        } else {
          const error = await insertResponse.text()
          console.log(`  ❌ 저장 실패: ${homeTeam} vs ${awayTeam} - ${error}`)
        }
        
      } catch (error) {
        console.error(`  ❌ 처리 에러:`, error)
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    
    console.log(`✅ ScoreBat 하이라이트 수집 완료!`)
    console.log(`   - 새로 수집: ${totalCollected}개`)
    console.log(`   - 중복 건너뜀: ${totalSkipped}개`)
    console.log(`   - 소요 시간: ${duration}초`)
    
    return NextResponse.json({
      success: true,
      message: `하이라이트 ${totalCollected}개 수집 완료 (ScoreBat)`,
      collected: totalCollected,
      skipped: totalSkipped,
      total: videos.length,
      majorLeagues: majorLeagueVideos.length,
      duration: `${duration}s`,
      highlights: results,
    })
    
  } catch (error: any) {
    console.error('❌ 하이라이트 수집 실패:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}