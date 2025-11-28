import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 🔑 TheSportsDB Premium API Key (환경변수에서 가져옴)
const SPORTSDB_API_KEY = process.env.THESPORTSDB_API_KEY || '3'
const SPORTSDB_BASE_URL = 'https://www.thesportsdb.com/api/v1/json'

// 주요 축구 리그 ID (TheSportsDB)
const FOOTBALL_LEAGUES = [
  { id: '4328', name: 'Premier League' },
  { id: '4335', name: 'La Liga' },
  { id: '4331', name: 'Bundesliga' },
  { id: '4332', name: 'Serie A' },
  { id: '4334', name: 'Ligue 1' },
  { id: '4480', name: 'Champions League' },
  { id: '4481', name: 'Europa League' },
  { id: '4682', name: 'Conference League' },
  { id: '4344', name: 'Primeira Liga' },    // 포르투갈
  { id: '4337', name: 'Eredivisie' },        // 네덜란드
  { id: '4329', name: 'Championship' },      // 잉글랜드 2부
]

interface SportsDBHighlight {
  idEvent: string
  strEvent: string
  strHomeTeam: string
  strAwayTeam: string
  strLeague: string
  dateEvent: string
  strVideo: string
  strThumb: string
  strSport: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('🎬 TheSportsDB Premium 하이라이트 수집 시작...')
    console.log('🔑 API Key:', SPORTSDB_API_KEY === '3' ? 'Free (3)' : `Premium (${SPORTSDB_API_KEY}) ✅`)
    
    // 최근 14일간의 날짜 생성 (Premium이라 더 많이!)
    const dates: string[] = []
    for (let i = 0; i < 14; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    console.log('📅 수집 대상 날짜:', dates.length, '일')
    
    const allHighlights: SportsDBHighlight[] = []
    
    // 각 날짜별로 하이라이트 수집 (Premium: 50개/요청)
    for (const date of dates) {
      try {
        // Soccer 전체 하이라이트
        const url = `${SPORTSDB_BASE_URL}/${SPORTSDB_API_KEY}/eventshighlights.php?d=${date}&s=Soccer`
        console.log(`🔍 Fetching: ${date}`)
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
          },
        })
        
        if (!response.ok) {
          console.warn(`⚠️ ${date} 요청 실패:`, response.status)
          continue
        }
        
        const data = await response.json()
        
        if (data.tvhighlights && Array.isArray(data.tvhighlights)) {
          // 축구만 필터링 + YouTube 링크 있는 것만
          const soccerHighlights = data.tvhighlights.filter(
            (h: SportsDBHighlight) => h.strSport === 'Soccer' && h.strVideo
          )
          allHighlights.push(...soccerHighlights)
          console.log(`✅ ${date}: ${soccerHighlights.length}개 발견`)
        }
        
        // API 레이트 리밋 방지 (300ms 대기 - Premium은 더 빠르게 가능)
        await new Promise(resolve => setTimeout(resolve, 300))
        
      } catch (error) {
        console.error(`❌ ${date} 에러:`, error)
      }
    }
    
    // 추가: 리그별로도 수집 (더 많은 하이라이트 확보)
    console.log('🏆 리그별 추가 수집 시작...')
    
    for (const league of FOOTBALL_LEAGUES) {
      try {
        const today = new Date().toISOString().split('T')[0]
        const url = `${SPORTSDB_BASE_URL}/${SPORTSDB_API_KEY}/eventshighlights.php?d=${today}&l=${league.id}`
        
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.tvhighlights && Array.isArray(data.tvhighlights)) {
            const newHighlights = data.tvhighlights.filter(
              (h: SportsDBHighlight) => h.strVideo && 
                !allHighlights.some(existing => existing.idEvent === h.idEvent)
            )
            allHighlights.push(...newHighlights)
            if (newHighlights.length > 0) {
              console.log(`✅ ${league.name}: +${newHighlights.length}개`)
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        // 무시
      }
    }
    
    console.log(`📊 총 수집된 하이라이트: ${allHighlights.length}개`)
    
    if (allHighlights.length === 0) {
      return NextResponse.json({
        success: true,
        message: '새 하이라이트 없음',
        collected: 0,
        saved: 0,
        duration: Date.now() - startTime,
      })
    }
    
    // 중복 제거 (idEvent 기준)
    const uniqueHighlights = Array.from(
      new Map(allHighlights.map(h => [h.idEvent, h])).values()
    )
    console.log(`🔄 중복 제거 후: ${uniqueHighlights.length}개`)
    
    // DB에 저장할 데이터 변환
    const highlightsToSave = uniqueHighlights.map(h => {
      // YouTube URL에서 video ID 추출
      let youtubeId = ''
      let youtubeUrl = h.strVideo || ''
      
      if (youtubeUrl.includes('youtube.com/watch?v=')) {
        youtubeId = youtubeUrl.split('v=')[1]?.split('&')[0] || ''
      } else if (youtubeUrl.includes('youtu.be/')) {
        youtubeId = youtubeUrl.split('youtu.be/')[1]?.split('?')[0] || ''
      } else if (youtubeUrl.includes('youtube.com/embed/')) {
        youtubeId = youtubeUrl.split('embed/')[1]?.split('?')[0] || ''
      }
      
      // 썸네일 URL 생성
      const thumbnailUrl = youtubeId 
        ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
        : h.strThumb || ''
      
      // 리그명 정규화
      let normalizedLeague = h.strLeague || 'Unknown'
      if (normalizedLeague.includes('English Premier')) normalizedLeague = 'Premier League'
      if (normalizedLeague.includes('Spanish La Liga')) normalizedLeague = 'La Liga'
      if (normalizedLeague.includes('German Bundesliga')) normalizedLeague = 'Bundesliga'
      if (normalizedLeague.includes('Italian Serie A')) normalizedLeague = 'Serie A'
      if (normalizedLeague.includes('French Ligue 1')) normalizedLeague = 'Ligue 1'
      if (normalizedLeague.includes('UEFA Champions')) normalizedLeague = 'Champions League'
      if (normalizedLeague.includes('UEFA Europa League')) normalizedLeague = 'Europa League'
      if (normalizedLeague.includes('UEFA Europa Conference')) normalizedLeague = 'Conference League'
      
      return {
        match_id: parseInt(h.idEvent) || null,
        home_team: h.strHomeTeam || 'Unknown',
        away_team: h.strAwayTeam || 'Unknown',
        league: normalizedLeague,
        match_date: h.dateEvent || new Date().toISOString().split('T')[0],
        youtube_url: youtubeUrl,
        youtube_id: youtubeId,
        thumbnail_url: thumbnailUrl,
        video_title: h.strEvent || `${h.strHomeTeam} vs ${h.strAwayTeam}`,
        source: 'thesportsdb',
      }
    })
    
    // 유효한 YouTube 영상만 필터링
    const validHighlights = highlightsToSave.filter(h => h.youtube_id && h.youtube_url)
    console.log(`🎥 유효한 하이라이트: ${validHighlights.length}개`)
    
    if (validHighlights.length === 0) {
      return NextResponse.json({
        success: true,
        message: '유효한 YouTube 하이라이트 없음',
        collected: allHighlights.length,
        saved: 0,
        duration: Date.now() - startTime,
      })
    }
    
    // Supabase에 Upsert (중복 방지)
    let savedCount = 0
    let skippedCount = 0
    
    for (const highlight of validHighlights) {
      try {
        // 먼저 중복 체크 (youtube_id 기준)
        const checkResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/match_highlights?youtube_id=eq.${highlight.youtube_id}&select=id`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        )
        
        const existing = await checkResponse.json()
        
        if (existing && existing.length > 0) {
          skippedCount++
          continue // 이미 존재하면 스킵
        }
        
        // 새로운 하이라이트 저장
        const saveResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/match_highlights`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(highlight),
          }
        )
        
        if (saveResponse.ok) {
          savedCount++
          console.log(`💾 저장: ${highlight.home_team} vs ${highlight.away_team} (${highlight.league})`)
        } else {
          const errorText = await saveResponse.text()
          console.warn(`⚠️ 저장 실패: ${highlight.home_team} vs ${highlight.away_team}`, errorText)
        }
        
      } catch (error) {
        console.error(`❌ 저장 에러:`, error)
      }
    }
    
    const duration = Date.now() - startTime
    
    console.log(`
🎬 TheSportsDB Premium 하이라이트 수집 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 API: ${SPORTSDB_API_KEY === '3' ? 'Free' : 'Premium'}
📅 기간: 최근 14일
📊 수집: ${allHighlights.length}개
🔄 중복제거: ${uniqueHighlights.length}개
🎥 유효: ${validHighlights.length}개
💾 저장: ${savedCount}개
⏭️ 스킵(중복): ${skippedCount}개
⏱️ 소요시간: ${duration}ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
    
    return NextResponse.json({
      success: true,
      message: `${savedCount}개 하이라이트 저장 완료`,
      apiType: SPORTSDB_API_KEY === '3' ? 'free' : 'premium',
      dateRange: '14 days',
      collected: allHighlights.length,
      unique: uniqueHighlights.length,
      valid: validHighlights.length,
      saved: savedCount,
      skipped: skippedCount,
      duration,
    })
    
  } catch (error: any) {
    console.error('❌ 하이라이트 수집 에러:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }, { status: 500 })
  }
}
