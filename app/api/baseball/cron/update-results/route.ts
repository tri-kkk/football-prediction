// app/api/baseball/cron/update-results/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_KEY = process.env.API_FOOTBALL_KEY!
const API_HOST = 'v1.baseball.api-sports.io'

export async function GET(request: NextRequest) {
  console.log('⚾ Baseball 경기 결과 업데이트 시작...')
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // 1. 오늘과 어제 날짜
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    console.log(`📅 업데이트 대상: ${yesterdayStr}, ${todayStr}`)
    
    // 2. DB에서 업데이트가 필요한 경기 조회
    // - 진행 중인 경기 (NS, LIVE, IN1-IN9, 1H-9H)
    // - 종료된 경기 중 이닝 데이터가 없는 경기 (FT인데 inning IS NULL)
    const { data: matches, error: fetchError } = await supabase
      .from('baseball_matches')
      .select('api_match_id, home_team, away_team, match_date, status, inning, updated_at')
      .gte('match_date', yesterdayStr)
      .lte('match_date', todayStr)
      .or(`status.in.(NS,LIVE,IN1,IN2,IN3,IN4,IN5,IN6,IN7,IN8,IN9,1H,2H,3H,4H,5H,6H,7H,8H,9H),and(status.eq.FT,inning.is.null)`)
      .limit(50)
    
    if (fetchError) {
      console.error('❌ DB 조회 오류:', fetchError)
      return NextResponse.json({ success: false, error: fetchError.message })
    }
    
    if (!matches || matches.length === 0) {
      console.log('✅ 업데이트할 경기 없음')
      return NextResponse.json({ 
        success: true, 
        message: 'No matches to update',
        updated: 0
      })
    }
    
    console.log(`🔍 업데이트 대상 경기: ${matches.length}개`)
    
    let updated = 0
    let errors = 0
    
    // 3. 각 경기의 최신 정보 가져오기
    for (const match of matches) {
      try {
        console.log(`  🔍 처리 중: ${match.home_team} vs ${match.away_team} (${match.api_match_id}, status: ${match.status}, inning: ${match.inning ? 'O' : 'X'})`)
        
        const url = `https://${API_HOST}/games?id=${match.api_match_id}`
        
        const response = await fetch(url, {
          headers: {
            'x-apisports-key': API_KEY
          }
        })
        
        if (!response.ok) {
          console.error(`  ❌ API 오류 (${match.api_match_id}):`, response.status)
          errors++
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
        
        const data = await response.json()
        
        if (!data.response || data.response.length === 0) {
          console.log(`  ⚠️ 경기 정보 없음 (${match.api_match_id})`)
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
        
        const game = data.response[0]
        
        // 🔍 디버깅: API 응답 전체 출력
        console.log(`  🔎 API 전체 응답:`, JSON.stringify(game.scores, null, 2))
        
        // 종료 상태 코드 매핑 (API-Football 야구)
        const FINISHED_STATUSES = ['FT', 'AET', 'POST', 'CANC', 'ABD', 'AWD', 'WO']
        let newStatus = game.status.short
        const homeScore = game.scores.home.total
        const awayScore = game.scores.away.total

        // API가 종료 상태를 반환하면 FT로 통일
        if (FINISHED_STATUSES.includes(newStatus) && newStatus !== 'FT') {
          console.log(`  🔄 상태 매핑: ${newStatus} → FT`)
          newStatus = 'FT'
        }

        // 타임아웃 안전장치: IN7 이상 상태에서 3시간 이상 업데이트 없으면 자동 FT
        const lateInnings = ['IN7', 'IN8', 'IN9']
        if (lateInnings.includes(match.status) && match.updated_at) {
          const lastUpdate = new Date(match.updated_at).getTime()
          const hoursElapsed = (Date.now() - lastUpdate) / (1000 * 60 * 60)
          if (hoursElapsed >= 3 && !FINISHED_STATUSES.includes(newStatus) && newStatus !== 'FT') {
            console.log(`  ⏰ 타임아웃: ${match.status} 상태에서 ${hoursElapsed.toFixed(1)}시간 경과 → FT 자동 전환`)
            newStatus = 'FT'
          }
        }

        console.log(`  📊 API 응답: status=${newStatus}, score=${homeScore}-${awayScore}, innings=${game.scores.home.innings ? 'O' : 'X'}`)
        
        // 이닝별 스코어 파싱
        let inningData = null
        if (game.scores.home.innings && game.scores.away.innings) {
          inningData = {
            home: {},
            away: {}
          }
          
          // home.innings에서 데이터 추출
          for (const [inning, score] of Object.entries(game.scores.home.innings)) {
            if (inning !== 'extra') {  // extra는 제외
              inningData.home[inning] = score
            }
          }
          
          // away.innings에서 데이터 추출
          for (const [inning, score] of Object.entries(game.scores.away.innings)) {
            if (inning !== 'extra') {  // extra는 제외
              inningData.away[inning] = score
            }
          }
          
          console.log(`  ✨ 이닝 데이터 파싱 완료: ${Object.keys(inningData.home).length}개 이닝`)
        } else {
          console.log(`  ⚠️ 이닝 데이터 없음 (API에서 제공 안 함)`)
        }
        
        // 4. 점수나 상태가 변경되었으면 업데이트
        if (newStatus === 'FT' || newStatus === 'LIVE' || newStatus.startsWith('IN') || homeScore !== null || awayScore !== null) {
          console.log(`  💾 DB 업데이트 시도...`)
          
          const { error: updateError } = await supabase
            .from('baseball_matches')
            .update({
              status: newStatus,
              home_score: homeScore,
              away_score: awayScore,
              inning: inningData,  // ✨ 이닝 데이터 추가!
              updated_at: new Date().toISOString()
            })
            .eq('api_match_id', match.api_match_id)
          
          if (updateError) {
            console.error(`  ❌ 업데이트 실패 (${match.api_match_id}):`, updateError)
            errors++
          } else {
            console.log(`  ✅ ${match.home_team} ${homeScore ?? '-'} vs ${awayScore ?? '-'} ${match.away_team} [${newStatus}]`)
            updated++
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (matchError: any) {
        console.error(`  ❌ 경기 처리 오류 (${match.api_match_id}):`, matchError.message)
        errors++
      }
    }
    
    console.log(`✅ 완료: ${updated}개 업데이트, ${errors}개 오류`)
    
    return NextResponse.json({
      success: true,
      total: matches.length,
      updated,
      errors,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ Cron 실행 오류:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}