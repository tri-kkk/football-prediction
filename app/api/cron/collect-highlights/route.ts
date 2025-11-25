import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const THESPORTSDB_API_KEY = process.env.THESPORTSDB_API_KEY || '166885'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// 주요 리그 (축구만)
const TARGET_LEAGUES: { [key: string]: string } = {
  'PL': '4328',      // Premier League
  'PD': '4335',      // La Liga
  'BL1': '4331',     // Bundesliga
  'SA': '4332',      // Serie A
  'FL1': '4334',     // Ligue 1
  'CL': '4480',      // Champions League
  'EL': '4481',      // Europa League
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const stats = {
      totalMatches: 0,
      matchesWithVideo: 0,
      newHighlights: 0,
      duplicates: 0,
      errors: 0,
      leagueStats: {} as { [key: string]: number }
    }

    console.log('🎬 하이라이트 수집 시작 (2단계 방식)')
    console.log('🏆 대상 리그:', Object.keys(TARGET_LEAGUES))

    // 각 리그별로 최근 경기 조회
    for (const [leagueCode, leagueId] of Object.entries(TARGET_LEAGUES)) {
      console.log(`\n🏆 ${leagueCode} 확인 중...`)
      stats.leagueStats[leagueCode] = 0

      try {
        // ⭐ 리그별 최근 15경기 조회
        const url = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_API_KEY}/eventspastleague.php?id=${leagueId}`
        
        const response = await fetch(url)
        
        if (!response.ok) {
          console.error(`   ❌ API 호출 실패:`, response.status)
          stats.errors++
          continue
        }

        const data = await response.json()
        const events = data.events || []

        console.log(`   ✅ ${events.length}개 최근 경기`)
        stats.totalMatches += events.length

        // 각 경기 처리
        for (const event of events) {
          // 필수 필드 확인
          if (!event.strHomeTeam || !event.strAwayTeam || !event.dateEvent) {
            continue
          }

          // YouTube URL 확인
          if (!event.strVideo) {
            continue
          }

          stats.matchesWithVideo++

          // YouTube ID 추출
          let youtubeId = ''
          const videoUrl = event.strVideo

          if (videoUrl.includes('youtube.com/watch?v=')) {
            youtubeId = videoUrl.split('v=')[1]?.split('&')[0] || ''
          } else if (videoUrl.includes('youtu.be/')) {
            youtubeId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || ''
          }

          if (!youtubeId) {
            continue
          }

          // Supabase 저장
          const highlightData = {
            match_id: parseInt(event.idEvent),
            event_id: event.idEvent,
            home_team: event.strHomeTeam,
            away_team: event.strAwayTeam,
            league: event.strLeague,
            match_date: event.dateEvent,
            youtube_url: videoUrl,
            youtube_id: youtubeId,
            thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
            video_title: `${event.strHomeTeam} vs ${event.strAwayTeam} | ${event.strLeague} Highlights`,
            duration: 0,
            views: 0,
          }

          try {
            const upsertResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/match_highlights`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': SUPABASE_SERVICE_KEY || '',
                  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                  'Prefer': 'resolution=ignore-duplicates',
                },
                body: JSON.stringify(highlightData),
              }
            )

            if (upsertResponse.status === 201) {
              stats.newHighlights++
              stats.leagueStats[leagueCode]++
              console.log(`   ✅ 신규: ${event.strHomeTeam} vs ${event.strAwayTeam}`)
            } else if (upsertResponse.ok) {
              stats.duplicates++
            } else {
              const errorText = await upsertResponse.text()
              console.error(`   ❌ 저장 실패:`, errorText.substring(0, 200))
              stats.errors++
            }
          } catch (dbError: any) {
            console.error(`   ❌ DB 에러:`, dbError.message)
            stats.errors++
          }
        }

        // API 요청 제한 대응
        await new Promise(resolve => setTimeout(resolve, 700))

      } catch (leagueError: any) {
        console.error(`   ❌ ${leagueCode} 에러:`, leagueError.message)
        stats.errors++
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('\n📊 최종 통계:')
    console.log('   총 경기:', stats.totalMatches)
    console.log('   하이라이트 있음:', stats.matchesWithVideo)
    console.log('   신규 저장:', stats.newHighlights)
    console.log('   중복:', stats.duplicates)
    console.log('   에러:', stats.errors)
    console.log('\n🏆 리그별 통계:', stats.leagueStats)

    return NextResponse.json({
      success: true,
      stats,
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
      message: `${stats.totalMatches}개 경기 확인, ${stats.matchesWithVideo}개 하이라이트, ${stats.newHighlights}개 신규 저장`
    })

  } catch (error: any) {
    console.error('❌ Cron Job 에러:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
    }, { status: 500 })
  }
}