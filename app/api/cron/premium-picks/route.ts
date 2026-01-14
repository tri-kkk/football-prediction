// app/api/cron/premium-picks/route.ts
// 프리미엄 픽 자동 생성 Cron
// K리그/J리그 지원 추가

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 리그 ID 매핑 (K리그/J리그 추가)
const leagueIdMap: Record<string, number> = {
  'PL': 39,
  'PD': 140,
  'BL1': 78,
  'SA': 135,
  'FL1': 61,
  'DED': 88,
  'PPL': 94,
  'CL': 2,
  'EL': 3,
  // 아시아 리그 추가
  'KL1': 292,
  'K1': 292,
  'J1': 98,
  'J2': 99,
}

// 분석할 리그 코드 (K리그/J리그 추가)
const LEAGUE_CODES = [
  // 유럽
  'PL', 'PD', 'BL1', 'SA', 'FL1', 'DED',
  // 아시아
  'KL1', 'J1',
]

export async function GET(request: Request) {
  console.log('🔄 Premium Picks Cron Started:', new Date().toISOString())
  
  try {
    // 1. 오늘 날짜 (KST 기준)
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000
    const kstNow = new Date(now.getTime() + kstOffset)
    const validDate = kstNow.toISOString().split('T')[0] // YYYY-MM-DD
    
    console.log('📅 Valid Date (KST):', validDate)
    
    // 2. 기존 오늘 픽 삭제
    await supabase
      .from('premium_picks')
      .delete()
      .eq('valid_date', validDate)
    
    // 3. 경기 데이터 가져오기 (현재 ~ 24시간 이내)
    let allMatches: any[] = []
    
    for (const league of LEAGUE_CODES) {
      const { data: matches } = await supabase
        .from('match_odds_latest')
        .select('*')
        .eq('league_code', league)
        .order('commence_time', { ascending: true })
      
      if (matches) {
        allMatches = [...allMatches, ...matches]
      }
    }
    
    // 4. 시간 필터링 (현재 ~ 24시간 이내)
    const startTime = new Date()
    const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000)
    
    const matchesToAnalyze = allMatches
      .filter(m => {
        const matchTime = new Date(m.commence_time)
        return matchTime >= startTime && matchTime < endTime
      })
      .slice(0, 15) // 최대 15경기 분석 (아시아 리그 추가로 증가)
    
    console.log('📊 Matches to analyze:', matchesToAnalyze.length)
    
    if (matchesToAnalyze.length === 0) {
      console.log('⚠️ No matches found for analysis')
      return NextResponse.json({ 
        success: true, 
        message: 'No matches to analyze',
        validDate,
        picks: 0
      })
    }
    
    // 5. 각 경기 분석
    const analyzedMatches: any[] = []
    
    for (const match of matchesToAnalyze) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
        
        // 리그 ID 결정
        const leagueId = leagueIdMap[match.league_code] || 39
        
        // 시즌 결정 (아시아는 단일 연도)
        const isAsianLeague = ['KL1', 'K1', 'J1', 'J2'].includes(match.league_code)
        const season = isAsianLeague ? '2025' : '2025'
        
        const response = await fetch(`${baseUrl}/api/predict-v2`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            homeTeamId: match.home_team_id,
            awayTeamId: match.away_team_id,
            leagueId: leagueId,
            leagueCode: match.league_code,
            season: season,
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          analyzedMatches.push({
            ...match,
            prediction: data.prediction,
          })
        }
      } catch (e) {
        console.error('Analysis error for', match.home_team, 'vs', match.away_team, e)
      }
      
      // API 부하 방지
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    // 6. 프리미엄 픽 조건 필터링 (엄격한 기준)
    const premiumPicks = analyzedMatches.filter(m => {
      if (!m.prediction) return false
      const p = m.prediction
      
      // 1. PICK 등급만
      const grade = p.recommendation?.grade
      if (grade !== 'PICK') return false
      
      // 2. 파워 차이 50점 이상
      const powerDiff = Math.abs((p.homePower || 0) - (p.awayPower || 0))
      if (powerDiff < 50) return false
      
      // 3. 확률 우위 20% 이상
      const pick = p.recommendation?.pick
      let probEdge = 0
      if (pick === 'HOME') probEdge = p.finalProb.home - Math.max(p.finalProb.draw, p.finalProb.away)
      else if (pick === 'AWAY') probEdge = p.finalProb.away - Math.max(p.finalProb.draw, p.finalProb.home)
      if (probEdge < 0.20) return false
      
      // 4. 패턴 데이터 500경기 이상
      const patternMatches = p.patternStats?.totalMatches || 0
      if (patternMatches < 500) return false
      
      return true
    }).slice(0, 3) // 최대 3경기
    
    console.log('💎 Premium Picks filtered:', premiumPicks.length)
    
    // 7. DB에 저장
    if (premiumPicks.length > 0) {
      const picksToInsert = premiumPicks.map(m => ({
        match_id: m.match_id?.toString() || m.id?.toString(),
        home_team: m.home_team,
        away_team: m.away_team,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        league_code: m.league_code,
        commence_time: m.commence_time,
        home_odds: m.home_odds,
        draw_odds: m.draw_odds,
        away_odds: m.away_odds,
        prediction: m.prediction,
        valid_date: validDate,
      }))
      
      const { error } = await supabase
        .from('premium_picks')
        .insert(picksToInsert)
      
      if (error) {
        console.error('DB Insert error:', error)
        throw error
      }
    }
    
    // 8. 오래된 데이터 정리 (7일 이상)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    await supabase
      .from('premium_picks')
      .delete()
      .lt('valid_date', sevenDaysAgo.toISOString().split('T')[0])
    
    console.log('✅ Premium Picks Cron Completed')
    
    return NextResponse.json({
      success: true,
      validDate,
      analyzed: matchesToAnalyze.length,
      picks: premiumPicks.length,
      matches: premiumPicks.map(m => ({
        home: m.home_team,
        away: m.away_team,
        league: m.league_code,
        pick: m.prediction?.recommendation?.pick,
      }))
    })
    
  } catch (error) {
    console.error('❌ Premium Picks Cron Error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

// POST도 지원 (수동 실행용)
export async function POST(request: Request) {
  return GET(request)
}