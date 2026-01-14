// app/api/cron/premium-picks-results/route.ts
// 프리미엄 픽 결과 확인 Cron
// 경기 종료 후 결과 체크하여 WIN/LOSE 업데이트

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  console.log('🔄 Checking Premium Picks Results:', new Date().toISOString())
  
  try {
    // 1. result가 NULL이고 경기 시간이 지난 픽들 조회
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 경기 종료 여유 시간
    
    const { data: pendingPicks, error: fetchError } = await supabase
      .from('premium_picks')
      .select('*')
      .is('result', null)
      .lt('commence_time', twoHoursAgo.toISOString())
    
    if (fetchError) {
      console.error('Error fetching pending picks:', fetchError)
      throw new Error(fetchError.message || JSON.stringify(fetchError))
    }
    
    if (!pendingPicks || pendingPicks.length === 0) {
      console.log('✅ No pending picks to check')
      return NextResponse.json({
        success: true,
        message: 'No pending picks to check',
        checked: 0,
      })
    }
    
    console.log(`📊 Checking ${pendingPicks.length} pending picks...`)
    
    const results: any[] = []
    
    // 2. 각 픽의 경기 결과 확인
    for (const pick of pendingPicks) {
      try {
        // API-Football에서 경기 결과 조회
        const fixtureId = pick.match_id
        
        const response = await fetch(
          `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
          {
            headers: {
              'x-apisports-key': API_FOOTBALL_KEY,
            },
          }
        )
        
        if (!response.ok) {
          console.error(`API error for fixture ${fixtureId}`)
          continue
        }
        
        const data = await response.json()
        const fixture = data.response?.[0]
        
        if (!fixture) {
          console.log(`No fixture data for ${fixtureId}`)
          continue
        }
        
        const status = fixture.fixture?.status?.short
        
        // 경기가 아직 안 끝났으면 스킵
        if (!['FT', 'AET', 'PEN'].includes(status)) {
          console.log(`Fixture ${fixtureId} not finished yet: ${status}`)
          continue
        }
        
        const homeScore = fixture.goals?.home
        const awayScore = fixture.goals?.away
        
        if (homeScore === null || awayScore === null) {
          console.log(`No score data for fixture ${fixtureId}`)
          continue
        }
        
        // 3. 예측 결과 판정
        const predictedPick = pick.prediction?.recommendation?.pick // 'HOME', 'AWAY', 'DRAW'
        
        let actualResult: 'HOME' | 'AWAY' | 'DRAW'
        if (homeScore > awayScore) {
          actualResult = 'HOME'
        } else if (awayScore > homeScore) {
          actualResult = 'AWAY'
        } else {
          actualResult = 'DRAW'
        }
        
        const isWin = predictedPick === actualResult
        const result = isWin ? 'WIN' : 'LOSE'
        
        console.log(`⚽ ${pick.home_team} vs ${pick.away_team}: ${homeScore}-${awayScore}`)
        console.log(`   Predicted: ${predictedPick}, Actual: ${actualResult} → ${result}`)
        
        // 4. DB 업데이트
        const { error: updateError } = await supabase
          .from('premium_picks')
          .update({
            result: result,
            actual_home_score: homeScore,
            actual_away_score: awayScore,
            result_checked_at: new Date().toISOString(),
          })
          .eq('id', pick.id)
        
        if (updateError) {
          console.error(`Update error for pick ${pick.id}:`, updateError)
        } else {
          results.push({
            match: `${pick.home_team} vs ${pick.away_team}`,
            league: pick.league_code,
            score: `${homeScore}-${awayScore}`,
            predicted: predictedPick,
            actual: actualResult,
            result: result,
          })
        }
        
        // API 부하 방지
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (e) {
        console.error(`Error checking pick ${pick.id}:`, e)
      }
    }
    
    console.log(`✅ Checked ${results.length} picks`)
    
    return NextResponse.json({
      success: true,
      checked: results.length,
      results: results,
    })
    
  } catch (error: any) {
    console.error('❌ Premium Picks Results Check Error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || JSON.stringify(error) },
      { status: 500 }
    )
  }
}

// POST도 지원 (수동 실행용)
export async function POST() {
  return GET()
}