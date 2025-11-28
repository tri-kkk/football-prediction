import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60  // Vercel Pro는 300까지 가능

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 🔑 TheSportsDB Premium API Key
const SPORTSDB_API_KEY = process.env.THESPORTSDB_API_KEY || '3'
const SPORTSDB_BASE_URL = 'https://www.thesportsdb.com/api/v1/json'

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
    // 쿼리 파라미터로 수집할 일수 지정 (기본 3일, 최대 7일)
    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get('days') || '3'), 7)
    
    console.log('🎬 TheSportsDB 하이라이트 수집 시작...')
    console.log('🔑 API Key:', SPORTSDB_API_KEY === '3' ? 'Free' : `Premium (${SPORTSDB_API_KEY}) ✅`)
    console.log('📅 수집 일수:', days)
    
    // 최근 N일간의 날짜 생성
    const dates: string[] = []
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    const allHighlights: SportsDBHighlight[] = []
    
    // 병렬로 모든 날짜 요청 (훨씬 빠름!)
    const fetchPromises = dates.map(async (date) => {
      try {
        const url = `${SPORTSDB_BASE_URL}/${SPORTSDB_API_KEY}/eventshighlights.php?d=${date}&s=Soccer`
        
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
        })
        
        if (!response.ok) return []
        
        const data = await response.json()
        
        if (data.tvhighlights && Array.isArray(data.tvhighlights)) {
          return data.tvhighlights.filter(
            (h: SportsDBHighlight) => h.strSport === 'Soccer' && h.strVideo
          )
        }
        return []
      } catch {
        return []
      }
    })
    
    // 모든 요청 병렬 실행
    const results = await Promise.all(fetchPromises)
    results.forEach(highlights => allHighlights.push(...highlights))
    
    console.log(`📊 수집된 하이라이트: ${allHighlights.length}개`)
    
    if (allHighlights.length === 0) {
      return NextResponse.json({
        success: true,
        message: '새 하이라이트 없음',
        collected: 0,
        saved: 0,
        duration: Date.now() - startTime,
      })
    }
    
    // 중복 제거
    const uniqueHighlights = Array.from(
      new Map(allHighlights.map(h => [h.idEvent, h])).values()
    )
    
    // DB에 저장할 데이터 변환
    const highlightsToSave = uniqueHighlights.map(h => {
      let youtubeId = ''
      let youtubeUrl = h.strVideo || ''
      
      if (youtubeUrl.includes('youtube.com/watch?v=')) {
        youtubeId = youtubeUrl.split('v=')[1]?.split('&')[0] || ''
      } else if (youtubeUrl.includes('youtu.be/')) {
        youtubeId = youtubeUrl.split('youtu.be/')[1]?.split('?')[0] || ''
      } else if (youtubeUrl.includes('youtube.com/embed/')) {
        youtubeId = youtubeUrl.split('embed/')[1]?.split('?')[0] || ''
      }
      
      const thumbnailUrl = youtubeId 
        ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
        : h.strThumb || ''
      
      // 리그명 정규화
      let league = h.strLeague || 'Unknown'
      if (league.includes('English Premier')) league = 'Premier League'
      if (league.includes('Spanish La Liga')) league = 'La Liga'
      if (league.includes('German Bundesliga')) league = 'Bundesliga'
      if (league.includes('Italian Serie A')) league = 'Serie A'
      if (league.includes('French Ligue 1')) league = 'Ligue 1'
      if (league.includes('UEFA Champions')) league = 'Champions League'
      if (league.includes('UEFA Europa League')) league = 'Europa League'
      if (league.includes('Europa Conference')) league = 'Conference League'
      
      return {
        match_id: parseInt(h.idEvent) || null,
        home_team: h.strHomeTeam || 'Unknown',
        away_team: h.strAwayTeam || 'Unknown',
        league,
        match_date: h.dateEvent || new Date().toISOString().split('T')[0],
        youtube_url: youtubeUrl,
        youtube_id: youtubeId,
        thumbnail_url: thumbnailUrl,
        video_title: h.strEvent || `${h.strHomeTeam} vs ${h.strAwayTeam}`,
        source: 'thesportsdb',
      }
    }).filter(h => h.youtube_id && h.youtube_url)
    
    console.log(`🎥 유효한 하이라이트: ${highlightsToSave.length}개`)
    
    // 기존 youtube_id 목록 한번에 가져오기 (개별 체크보다 훨씬 빠름!)
    const youtubeIds = highlightsToSave.map(h => h.youtube_id)
    const existingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/match_highlights?youtube_id=in.(${youtubeIds.join(',')})&select=youtube_id`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    )
    
    const existingData = await existingResponse.json()
    const existingIds = new Set((existingData || []).map((e: any) => e.youtube_id))
    
    // 새로운 것만 필터링
    const newHighlights = highlightsToSave.filter(h => !existingIds.has(h.youtube_id))
    
    console.log(`🆕 새 하이라이트: ${newHighlights.length}개 (기존: ${existingIds.size}개)`)
    
    if (newHighlights.length === 0) {
      return NextResponse.json({
        success: true,
        message: '새 하이라이트 없음 (모두 중복)',
        collected: allHighlights.length,
        unique: uniqueHighlights.length,
        valid: highlightsToSave.length,
        saved: 0,
        skipped: existingIds.size,
        duration: Date.now() - startTime,
      })
    }
    
    // 배치로 한번에 저장 (개별 저장보다 훨씬 빠름!)
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
        body: JSON.stringify(newHighlights),
      }
    )
    
    const savedCount = saveResponse.ok ? newHighlights.length : 0
    
    if (!saveResponse.ok) {
      const errorText = await saveResponse.text()
      console.error('❌ 저장 실패:', errorText)
    }
    
    const duration = Date.now() - startTime
    
    console.log(`
🎬 하이라이트 수집 완료!
━━━━━━━━━━━━━━━━━━━━━
📅 기간: ${days}일
📊 수집: ${allHighlights.length}개
🆕 새로 저장: ${savedCount}개
⏭️ 스킵: ${existingIds.size}개
⏱️ 소요: ${duration}ms
━━━━━━━━━━━━━━━━━━━━━
    `)
    
    return NextResponse.json({
      success: true,
      message: `${savedCount}개 저장 완료`,
      days,
      collected: allHighlights.length,
      unique: uniqueHighlights.length,
      valid: highlightsToSave.length,
      saved: savedCount,
      skipped: existingIds.size,
      duration,
    })
    
  } catch (error: any) {
    console.error('❌ 에러:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }, { status: 500 })
  }
}