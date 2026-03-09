// app/api/baseball/cron/collect-historical/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_KEY = process.env.API_FOOTBALL_KEY!
const API_HOST = 'v1.baseball.api-sports.io'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season') || '2024'
  const startDate = searchParams.get('startDate') || `${season}-03-20`
  const endDate = searchParams.get('endDate') || `${season}-11-01`
  
  console.log(`⚾ 과거 시즌 데이터 수집 시작: ${season} (${startDate} ~ ${endDate})`)
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // 날짜 범위 생성
    const dates = generateDateRange(startDate, endDate)
    console.log(`📅 수집 날짜: ${dates.length}일`)
    
    let totalCollected = 0
    let totalErrors = 0
    
    // 각 날짜별로 수집
    for (const date of dates) {
      try {
        console.log(`\n📆 ${date} 수집 중...`)
        
        // API-Football에서 해당 날짜 경기 조회
        const url = `https://${API_HOST}/games?league=1&season=${season}&date=${date}`
        
        const response = await fetch(url, {
          headers: {
            'x-apisports-key': API_KEY
          }
        })
        
        if (!response.ok) {
          console.error(`  ❌ API 오류: ${response.status}`)
          totalErrors++
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
        
        const data = await response.json()
        
        if (!data.response || data.response.length === 0) {
          console.log(`  ⚠️ ${date}: 경기 없음`)
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
        
        console.log(`  📊 ${date}: ${data.response.length}개 경기 발견`)
        
        // 각 경기 처리
        for (const game of data.response) {
          try {
            // 종료된 경기만 수집
            if (game.status.short !== 'FT') {
              console.log(`  ⏭️ 건너뜀: ${game.id} (${game.status.short})`)
              continue
            }
            
            // 이미 존재하는지 확인
            const { data: existing } = await supabase
              .from('baseball_matches')
              .select('id')
              .eq('api_match_id', game.id)
              .single()
            
            if (existing) {
              console.log(`  ⏭️ 이미 존재: ${game.id}`)
              continue
            }
            
            // 이닝 데이터 파싱
            let inningData = null
            if (game.scores.home.innings && game.scores.away.innings) {
              inningData = {
                home: {},
                away: {}
              }
              
              for (const [inning, score] of Object.entries(game.scores.home.innings)) {
                if (inning !== 'extra') {
                  inningData.home[inning] = score
                }
              }
              
              for (const [inning, score] of Object.entries(game.scores.away.innings)) {
                if (inning !== 'extra') {
                  inningData.away[inning] = score
                }
              }
            }
            
            // DB 저장
            const matchData = {
              api_match_id: game.id,
              league: 'MLB',
              league_name: game.league.name,
              season: season,
              match_date: game.date.split('T')[0],
              match_timestamp: game.date,
              home_team: game.teams.home.name,
              home_team_id: game.teams.home.id,
              home_team_logo: game.teams.home.logo,
              away_team: game.teams.away.name,
              away_team_id: game.teams.away.id,
              away_team_logo: game.teams.away.logo,
              home_score: game.scores.home.total,
              away_score: game.scores.away.total,
              
              // ✨ 추가 통계 데이터
              home_hits: game.scores.home.hits || null,
              away_hits: game.scores.away.hits || null,
              home_errors: game.scores.home.errors || null,
              away_errors: game.scores.away.errors || null,
              
              status: game.status.short,
              inning: inningData,
              venue: game.venue || null,
              is_spring_training: false,
            }
            
            const { error: insertError } = await supabase
              .from('baseball_matches')
              .insert(matchData)
            
            if (insertError) {
              console.error(`  ❌ 저장 실패: ${game.id}`, insertError.message)
              totalErrors++
            } else {
              console.log(`  ✅ 저장 성공: ${game.teams.away.name} ${game.scores.away.total} vs ${game.scores.home.total} ${game.teams.home.name} (H:${game.scores.home.hits} E:${game.scores.home.errors})`)
              totalCollected++
            }
            
          } catch (gameError: any) {
            console.error(`  ❌ 경기 처리 오류: ${game.id}`, gameError.message)
            totalErrors++
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (dateError: any) {
        console.error(`❌ ${date} 처리 오류:`, dateError.message)
        totalErrors++
      }
    }
    
    console.log(`\n✅ 수집 완료!`)
    console.log(`  총 수집: ${totalCollected}개`)
    console.log(`  오류: ${totalErrors}개`)
    
    return NextResponse.json({
      success: true,
      season,
      dateRange: { start: startDate, end: endDate },
      totalDates: dates.length,
      collected: totalCollected,
      errors: totalErrors,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ 전체 오류:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// 날짜 범위 생성 헬퍼 함수
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}