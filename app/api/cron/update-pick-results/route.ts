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
  'PL': 39,    // Premier League
  'PD': 140,   // La Liga
  'BL1': 78,   // Bundesliga
  'SA': 135,   // Serie A
  'FL1': 61,   // Ligue 1
  'CL': 2,     // Champions League
  'EL': 3,     // Europa League
  'PPL': 94,   // Primeira Liga
  'DED': 88,   // Eredivisie
  'ELC': 40,   // Championship
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
        
        // API-Football에서 경기 결과 조회
        const leagueId = LEAGUE_ID_MAP[pick.league_code]
        if (!leagueId) {
          console.log(`⚠️ Unknown league: ${pick.league_code}`)
          skipped++
          continue
        }
        
        const dateStr = pick.commence_time.split('T')[0]
        const apiUrl = `https://${API_FOOTBALL_HOST}/fixtures?league=${leagueId}&date=${dateStr}&timezone=UTC`
        
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
        
        // 팀 이름으로 경기 찾기
        const fixture = fixtures.find((f: any) => {
          const homeMatch = f.teams.home.name.toLowerCase().includes(pick.home_team.toLowerCase().split(' ')[0]) ||
                           pick.home_team.toLowerCase().includes(f.teams.home.name.toLowerCase().split(' ')[0])
          const awayMatch = f.teams.away.name.toLowerCase().includes(pick.away_team.toLowerCase().split(' ')[0]) ||
                           pick.away_team.toLowerCase().includes(f.teams.away.name.toLowerCase().split(' ')[0])
          return homeMatch && awayMatch
        })
        
        if (!fixture) {
          console.log(`⚠️ Fixture not found: ${pick.home_team} vs ${pick.away_team}`)
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
