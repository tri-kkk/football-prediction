import { NextRequest, NextResponse } from 'next/server'

// TheSportsDB API (유료 키 사용!)
const THESPORTSDB_API_KEY = process.env.THESPORTSDB_API_KEY || '3'
const THESPORTSDB_API_URL = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_API_KEY}`

// Supabase 설정
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 주요 리그 ID (TheSportsDB)
const LEAGUES = [
  { id: '4328', name: 'English Premier League' },
  { id: '4335', name: 'Spanish La Liga' },
  { id: '4331', name: 'German Bundesliga' },
  { id: '4332', name: 'Italian Serie A' },
  { id: '4334', name: 'French Ligue 1' },
  { id: '4480', name: 'UEFA Champions League' },
]

interface Event {
  idEvent: string
  strEvent: string
  strHomeTeam: string
  strAwayTeam: string
  strLeague: string
  dateEvent: string
  strVideo?: string
  strThumb?: string
}

export async function GET(request: NextRequest) {
  console.log('🎬 하이라이트 수집 시작...')
  console.log(`🔑 API 키: ${THESPORTSDB_API_KEY === '3' ? '무료(3)' : '유료(***' + THESPORTSDB_API_KEY.slice(-4) + ')'}`)
  const startTime = Date.now()
  
  try {
    let totalCollected = 0
    let totalSkipped = 0
    let totalNoVideo = 0
    let totalErrors = 0
    const results: any[] = []
    const errors: any[] = []

    for (const league of LEAGUES) {
      console.log(`📊 ${league.name} 수집 중...`)
      
      try {
        // TheSportsDB에서 최근 경기 결과 가져오기
        const response = await fetch(
          `${THESPORTSDB_API_URL}/eventspastleague.php?id=${league.id}`
        )
        
        if (!response.ok) {
          console.log(`❌ ${league.name} API 실패: ${response.status}`)
          continue
        }
        
        const data = await response.json()
        const events: Event[] = data.events || []
        
        console.log(`  - 전체 경기: ${events.length}개`)
        
        // 첫 경기 데이터 샘플 출력 (디버깅)
        if (events.length > 0) {
          console.log(`  - 샘플 데이터:`, JSON.stringify({
            idEvent: events[0].idEvent,
            strEvent: events[0].strEvent,
            strVideo: events[0].strVideo || '❌ 없음',
            strThumb: events[0].strThumb || '❌ 없음',
          }))
        }
        
        // 각 경기의 strVideo 상태 확인
        let withVideo = 0
        let withoutVideo = 0
        for (const e of events) {
          if (e.strVideo && e.strVideo.includes('youtube')) {
            withVideo++
          } else {
            withoutVideo++
          }
        }
        console.log(`  - YouTube 있음: ${withVideo}개, 없음: ${withoutVideo}개`)
        
        // 하이라이트 있는 경기만 필터링
        const eventsWithVideo = events.filter(e => e.strVideo && e.strVideo.includes('youtube'))
        
        if (eventsWithVideo.length === 0) {
          console.log(`  ⚠️ ${league.name}: YouTube 하이라이트 없음!`)
          totalNoVideo += events.length
          continue
        }
        
        console.log(`  - 전체 경기: ${events.length}, 하이라이트: ${eventsWithVideo.length}`)
        
        for (const event of eventsWithVideo.slice(0, 5)) { // 리그당 최대 5개
          // YouTube ID 추출
          const youtubeUrl = event.strVideo || ''
          let youtubeId = ''
          
          if (youtubeUrl.includes('youtube.com/watch?v=')) {
            youtubeId = youtubeUrl.split('v=')[1]?.split('&')[0] || ''
          } else if (youtubeUrl.includes('youtu.be/')) {
            youtubeId = youtubeUrl.split('youtu.be/')[1]?.split('?')[0] || ''
          }
          
          if (!youtubeId) continue
          
          // match_id를 숫자로 변환
          const matchIdNum = parseInt(event.idEvent, 10)
          
          if (isNaN(matchIdNum)) {
            console.log(`  ⚠️ 잘못된 match_id: ${event.idEvent}`)
            continue
          }
          
          // 중복 체크 (event_id로!)
          const checkResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/match_highlights?event_id=eq.${event.idEvent}&select=id`,
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
          
          // DB에 저장
          const highlightData = {
            match_id: matchIdNum,           // integer
            event_id: event.idEvent,        // ✅ varchar - 추가!
            home_team: event.strHomeTeam,
            away_team: event.strAwayTeam,
            league: league.name,
            match_date: event.dateEvent,
            youtube_url: youtubeUrl,
            youtube_id: youtubeId,
            thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
            video_title: event.strEvent,
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
              match: `${event.strHomeTeam} vs ${event.strAwayTeam}`,
              league: league.name,
              date: event.dateEvent,
            })
            console.log(`  ✅ 저장: ${event.strHomeTeam} vs ${event.strAwayTeam}`)
          } else {
            const errorText = await insertResponse.text()
            totalErrors++
            errors.push({
              match: `${event.strHomeTeam} vs ${event.strAwayTeam}`,
              error: errorText,
            })
            console.log(`  ❌ 저장 실패: ${event.strHomeTeam} vs ${event.strAwayTeam} - ${errorText}`)
          }
        }
        
        // API 제한 방지
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        console.error(`❌ ${league.name} 에러:`, error)
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    
    console.log(`✅ 하이라이트 수집 완료!`)
    console.log(`   - 새로 수집: ${totalCollected}개`)
    console.log(`   - 중복 건너뜀: ${totalSkipped}개`)
    console.log(`   - 영상 없음: ${totalNoVideo}개`)
    console.log(`   - 에러: ${totalErrors}개`)
    console.log(`   - 소요 시간: ${duration}초`)
    
    return NextResponse.json({
      success: true,
      message: `하이라이트 ${totalCollected}개 수집 완료`,
      collected: totalCollected,
      skipped: totalSkipped,
      noVideo: totalNoVideo,
      errors: totalErrors,
      duration: `${duration}s`,
      highlights: results,
      errorDetails: errors.slice(0, 5),  // 최대 5개 에러만
      debug: {
        apiKey: THESPORTSDB_API_KEY === '3' ? '무료(3) - strVideo 미지원!' : '유료 ✅',
        leaguesChecked: LEAGUES.map(l => l.name),
      }
    })
    
  } catch (error: any) {
    console.error('❌ 하이라이트 수집 실패:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}