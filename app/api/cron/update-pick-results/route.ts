// app/api/cron/update-pick-results/route.ts
// PICK 추천 경기 결과 자동 업데이트 Cron Job
// Supabase Cron: 2시간마다 실행 권장

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!
const API_FOOTBALL_HOST = 'v3.football.api-sports.io'

// 리그 코드 → API-Football 리그 ID 매핑
const LEAGUE_ID_MAP: Record<string, number> = {
  // 국제대회
  'WC': 1,     // World Cup 2026
  'CL': 2,     // Champions League
  'EL': 3,     // Europa League
  'UECL': 848, // Conference League
  'UNL': 5,    // Nations League
  // 잉글랜드
  'PL': 39,    // Premier League
  'ELC': 40,   // Championship
  'FAC': 45,   // FA Cup
  'EFL': 48,   // EFL Cup
  // 스페인
  'PD': 140,   // La Liga
  'CDR': 143,  // Copa del Rey
  // 독일
  'BL1': 78,   // Bundesliga
  'DFB': 81,   // DFB Pokal
  // 이탈리아
  'SA': 135,   // Serie A
  'CIT': 137,  // Coppa Italia
  // 프랑스
  'FL1': 61,   // Ligue 1
  'CDF': 66,   // Coupe de France
  // 포르투갈
  'PPL': 94,   // Primeira Liga
  'TDP': 96,   // Taca de Portugal
  // 네덜란드
  'DED': 88,   // Eredivisie
  'KNV': 90,   // KNVB Beker
  // 🆕 아프리카
  'AFCON': 6,  // Africa Cup of Nations
}

interface PendingPick {
  match_id: string
  league_code: string
  home_team: string
  away_team: string
  commence_time: string
  pick_result: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('🔄 Starting PICK results update...')
    
    // 1. 미확정 PICK 조회 (is_correct = null)
    const { data: pendingPicks, error: fetchError } = await supabase
      .from('pick_recommendations')
      .select('match_id, league_code, home_team, away_team, commence_time, pick_result')
      .is('is_correct', null)
      .lt('commence_time', new Date().toISOString())  // 이미 시작된 경기만
      .order('commence_time', { ascending: true })
      .limit(50)
    
    if (fetchError) {
      console.error('Error fetching pending picks:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }
    
    if (!pendingPicks || pendingPicks.length === 0) {
      console.log('✅ No pending picks to update')
      return NextResponse.json({
        success: true,
        message: 'No pending picks',
        updated: 0
      })
    }
    
    console.log(`📋 Found ${pendingPicks.length} pending picks`)
    
    // 2. 각 경기 결과 조회 및 업데이트
    let updated = 0
    let skipped = 0
    let errors = 0
    
    for (const pick of pendingPicks as PendingPick[]) {
      try {
        // 경기 시작 후 2시간 이상 지났는지 확인 (경기 종료 예상)
        const commenceTime = new Date(pick.commence_time)
        const now = new Date()
        const hoursSinceStart = (now.getTime() - commenceTime.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceStart < 2) {
          console.log(`⏳ Match not finished yet: ${pick.home_team} vs ${pick.away_team}`)
          skipped++
          continue
        }
        
        // 🔧 match_id로 직접 경기 조회 (팀 이름 매칭 문제 해결!)
        const apiUrl = `https://${API_FOOTBALL_HOST}/fixtures?id=${pick.match_id}`
        
        const response = await fetch(apiUrl, {
          headers: {
            'x-apisports-key': API_FOOTBALL_KEY
          }
        })
        
        if (!response.ok) {
          console.error(`API error for ${pick.match_id}:`, response.status)
          errors++
          continue
        }
        
        const data = await response.json()
        const fixtures = data.response || []
        
        // 🔧 match_id로 직접 조회했으므로 첫 번째 결과 사용
        const fixture = fixtures[0]
        
        if (!fixture) {
          console.log(`⚠️ Fixture not found for match_id: ${pick.match_id}`)
          skipped++
          continue
        }
        
        // 경기 종료 확인
        if (fixture.fixture.status.short !== 'FT' && fixture.fixture.status.short !== 'AET' && fixture.fixture.status.short !== 'PEN') {
          console.log(`⏳ Match not finished: ${pick.home_team} vs ${pick.away_team} (${fixture.fixture.status.short})`)
          skipped++
          continue
        }
        
        // 결과 계산
        const homeScore = fixture.goals.home
        const awayScore = fixture.goals.away
        
        let actualResult: 'HOME' | 'DRAW' | 'AWAY'
        if (homeScore > awayScore) {
          actualResult = 'HOME'
        } else if (homeScore < awayScore) {
          actualResult = 'AWAY'
        } else {
          actualResult = 'DRAW'
        }
        
        const isCorrect = pick.pick_result === actualResult
        
        // 업데이트
        const { error: updateError } = await supabase
          .from('pick_recommendations')
          .update({
            actual_result: actualResult,
            final_score_home: homeScore,
            final_score_away: awayScore,
            is_correct: isCorrect,
            settled_at: new Date().toISOString()
          })
          .eq('match_id', pick.match_id)
        
        if (updateError) {
          console.error(`Update error for ${pick.match_id}:`, updateError)
          errors++
          continue
        }
        
        console.log(`✅ Updated: ${pick.home_team} ${homeScore}-${awayScore} ${pick.away_team} | PICK: ${pick.pick_result} | Actual: ${actualResult} | ${isCorrect ? '⭐ HIT!' : '❌ Miss'}`)
        updated++
        
        // API 레이트 리밋 방지
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (e: any) {
        console.error(`Error processing pick ${pick.match_id}:`, e.message)
        errors++
      }
    }
    
    const duration = Date.now() - startTime
    
    // 3. 결과 반환
    return NextResponse.json({
      success: true,
      stats: {
        total: pendingPicks.length,
        updated,
        skipped,
        errors,
        duration: `${duration}ms`
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('PICK update cron error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// POST 방식도 지원 (Supabase Cron용)
export async function POST(request: NextRequest) {
  return GET(request)
}