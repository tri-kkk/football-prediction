// app/api/matches-unified/route.ts
// 📅 날짜 기반 통합 경기 조회 API
// - 과거: match_results 테이블 (완료 경기 + PICK 적중)
// - 오늘: match_results + match_odds_latest (완료 + 예정)
// - 미래: match_odds_latest 테이블 (예정 경기)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 리그 코드 → API-Football 리그 ID 매핑
const LEAGUE_IDS: Record<string, number> = {
  'PL': 39,    // Premier League
  'PD': 140,   // La Liga
  'BL1': 78,   // Bundesliga
  'SA': 135,   // Serie A
  'FL1': 61,   // Ligue 1
  'DED': 88,   // Eredivisie
  'PPL': 94,   // Primeira Liga
  'CL': 2,     // Champions League
  'EL': 3,     // Europa League
  'WC': 1,     // World Cup 2026
  'ELC': 40,   // Championship
  'UECL': 848, // Conference League
  'UNL': 5,    // Nations League
  'AFCON': 6,  // Africa Cup of Nations
}

// 통합 경기 인터페이스
interface UnifiedMatch {
  id: string
  matchId: string
  homeTeam: string
  awayTeam: string
  homeTeamKr?: string
  awayTeamKr?: string
  homeTeamId?: number
  awayTeamId?: number
  homeCrest?: string
  awayCrest?: string
  league: string
  leagueCode: string
  kickoffTime: string       // ISO 시간
  status: 'FT' | 'LIVE' | 'NS' | 'HT' | 'AET' | 'PEN'  // FT=완료, NS=예정
  // 스코어 (완료/라이브 경기)
  homeScore?: number | null
  awayScore?: number | null
  // 예측 확률
  homeWinRate?: number
  drawRate?: number
  awayWinRate?: number
  // 예측 결과 (match_results에서)
  predictedWinner?: string
  isCorrect?: boolean
  predictionType?: string   // 'exact', 'winner_only', 'wrong'
  // 오즈
  homeOdds?: number
  drawOdds?: number
  awayOdds?: number
  // PICK 정보 (있는 경우)
  pickInfo?: {
    pickResult: string      // HOME, DRAW, AWAY
    pickProbability: number
    isCorrect?: boolean | null
    actualResult?: string
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')  // YYYY-MM-DD 형식
  const leagueParam = searchParams.get('league') || 'ALL'
  
  try {
    // 날짜 파싱 (KST 기준)
    const targetDate = dateParam ? new Date(dateParam + 'T00:00:00+09:00') : new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const targetDateOnly = new Date(targetDate)
    targetDateOnly.setHours(0, 0, 0, 0)
    
    // 날짜 범위 계산 (해당 날짜의 00:00 ~ 23:59 KST)
    const dateStart = new Date(targetDateOnly)
    dateStart.setHours(0, 0, 0, 0)
    const dateEnd = new Date(targetDateOnly)
    dateEnd.setHours(23, 59, 59, 999)
    
    // UTC로 변환 (DB는 UTC 기준)
    const utcStart = new Date(dateStart.getTime() - 9 * 60 * 60 * 1000).toISOString()
    const utcEnd = new Date(dateEnd.getTime() - 9 * 60 * 60 * 1000).toISOString()
    
    console.log('📅 조회 날짜:', {
      targetDate: dateParam,
      utcStart,
      utcEnd,
      league: leagueParam
    })
    
    const isPast = targetDateOnly < today
    const isToday = targetDateOnly.getTime() === today.getTime()
    const isFuture = targetDateOnly > today
    
    let allMatches: UnifiedMatch[] = []
    let pickMap: Record<string, any> = {}
    
    // ============================================
    // 1. PICK 데이터 먼저 로드
    // ============================================
    const { data: pickData } = await supabase
      .from('pick_recommendations')
      .select('*')
      .gte('commence_time', utcStart)
      .lte('commence_time', utcEnd)
    
    if (pickData) {
      pickData.forEach(pick => {
        // match_id를 문자열과 숫자 모두 대응
        pickMap[pick.match_id?.toString()] = pick
        pickMap[parseInt(pick.match_id)] = pick
      })
    }
    
    // ============================================
    // 2. 과거 또는 오늘 → match_results에서 완료 경기 조회
    // ============================================
    if (isPast || isToday) {
      let resultsQuery = supabase
        .from('match_results')
        .select('*')
        .gte('match_date', utcStart)
        .lte('match_date', utcEnd)
        .order('match_date', { ascending: true })
      
      if (leagueParam !== 'ALL') {
        resultsQuery = resultsQuery.eq('league', leagueParam)
      }
      
      const { data: resultsData, error: resultsError } = await resultsQuery
      
      if (resultsError) {
        console.error('❌ match_results 조회 오류:', resultsError)
      }
      
      if (resultsData && resultsData.length > 0) {
        const finishedMatches: UnifiedMatch[] = resultsData.map(match => {
          // PICK 정보 찾기 (숫자/문자열 모두 체크)
          const pick = pickMap[match.match_id] || pickMap[match.match_id?.toString()]
          
          // 실제 결과 계산 (PICK 적중 비교용)
          let actualResult = 'DRAW'
          if (match.final_score_home > match.final_score_away) actualResult = 'HOME'
          else if (match.final_score_away > match.final_score_home) actualResult = 'AWAY'
          
          return {
            id: match.match_id?.toString() || match.id?.toString(),
            matchId: match.match_id?.toString(),
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            homeTeamKr: match.home_team_kr,
            awayTeamKr: match.away_team_kr,
            homeTeamId: match.home_team_id,
            awayTeamId: match.away_team_id,
            homeCrest: match.home_crest,
            awayCrest: match.away_crest,
            league: getLeagueName(match.league),
            leagueCode: match.league,
            kickoffTime: match.match_date,
            status: (match.match_status || 'FT') as any,
            homeScore: match.final_score_home,
            awayScore: match.final_score_away,
            // 예측 정보 (DB에 저장된 예측)
            homeWinRate: parseFloat(match.predicted_home_probability) || undefined,
            drawRate: parseFloat(match.predicted_draw_probability) || undefined,
            awayWinRate: parseFloat(match.predicted_away_probability) || undefined,
            predictedWinner: match.predicted_winner,
            isCorrect: match.is_correct,
            predictionType: match.prediction_type,
            // PICK 정보 (별도 테이블에서)
            pickInfo: pick ? {
              pickResult: pick.pick_result,
              pickProbability: pick.pick_probability,
              isCorrect: pick.is_correct,
              actualResult: pick.actual_result || actualResult
            } : undefined
          }
        })
        
        allMatches.push(...finishedMatches)
        console.log('✅ 완료 경기 로드:', finishedMatches.length)
      }
    }
    
    // ============================================
    // 3. 오늘 또는 미래 → match_odds_latest에서 예정 경기 조회
    // ============================================
    if (isToday || isFuture) {
      // 리그 코드 목록
      const leagueCodes = leagueParam === 'ALL' 
        ? Object.keys(LEAGUE_IDS)
        : [leagueParam]
      
      let oddsQuery = supabase
        .from('match_odds_latest')
        .select('*')
        .gte('commence_time', utcStart)
        .lte('commence_time', utcEnd)
        .order('commence_time', { ascending: true })
      
      if (leagueParam !== 'ALL') {
        oddsQuery = oddsQuery.eq('league_code', leagueParam)
      }
      
      const { data: oddsData, error: oddsError } = await oddsQuery
      
      if (oddsError) {
        console.error('❌ match_odds_latest 조회 오류:', oddsError)
      }
      
      if (oddsData && oddsData.length > 0) {
        // 이미 match_results에 있는 경기 제외 (중복 방지)
        const existingIds = new Set(allMatches.map(m => m.matchId))
        
        const scheduledMatches: UnifiedMatch[] = oddsData
          .filter(match => !existingIds.has(match.match_id?.toString()))
          .map(match => {
            const pick = pickMap[match.match_id?.toString()]
            
            return {
              id: match.match_id?.toString() || match.id?.toString(),
              matchId: match.match_id?.toString(),
              homeTeam: match.home_team,
              awayTeam: match.away_team,
              homeTeamId: match.home_team_id,
              awayTeamId: match.away_team_id,
              homeCrest: match.home_team_logo,
              awayCrest: match.away_team_logo,
              league: getLeagueName(match.league_code),
              leagueCode: match.league_code,
              kickoffTime: match.commence_time,
              status: 'NS' as const,
              // 예측 확률
              homeWinRate: match.home_probability,
              drawRate: match.draw_probability,
              awayWinRate: match.away_probability,
              // 오즈
              homeOdds: match.home_odds,
              drawOdds: match.draw_odds,
              awayOdds: match.away_odds,
              // PICK 정보
              pickInfo: pick ? {
                pickResult: pick.pick_result,
                pickProbability: pick.pick_probability,
                isCorrect: pick.is_correct,
                actualResult: pick.actual_result
              } : undefined
            }
          })
        
        allMatches.push(...scheduledMatches)
        console.log('✅ 예정 경기 로드:', scheduledMatches.length)
      }
    }
    
    // ============================================
    // 4. 시간순 정렬
    // ============================================
    allMatches.sort((a, b) => 
      new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
    )
    
    // ============================================
    // 5. PICK 통계 계산
    // ============================================
    const pickStats = calculatePickStats(allMatches)
    
    console.log('📊 최종 결과:', {
      total: allMatches.length,
      finished: allMatches.filter(m => m.status === 'FT').length,
      scheduled: allMatches.filter(m => m.status === 'NS').length,
      withPick: allMatches.filter(m => m.pickInfo).length
    })
    
    return NextResponse.json({
      success: true,
      date: dateParam || new Date().toISOString().split('T')[0],
      dateType: isPast ? 'past' : isToday ? 'today' : 'future',
      matches: allMatches,
      pickStats,
      meta: {
        total: allMatches.length,
        finished: allMatches.filter(m => m.status === 'FT').length,
        scheduled: allMatches.filter(m => m.status === 'NS').length,
        live: allMatches.filter(m => m.status === 'LIVE' || m.status === 'HT').length
      }
    })
    
  } catch (error: any) {
    console.error('❌ matches-unified API 오류:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// 리그 코드 → 리그명 변환
function getLeagueName(code: string): string {
  const names: Record<string, string> = {
    'PL': 'Premier League',
    'PD': 'La Liga',
    'BL1': 'Bundesliga',
    'SA': 'Serie A',
    'FL1': 'Ligue 1',
    'DED': 'Eredivisie',
    'PPL': 'Primeira Liga',
    'CL': 'Champions League',
    'EL': 'Europa League',
    'ELC': 'Championship',
    'UECL': 'Conference League',
    'UNL': 'Nations League',
    'AFCON': 'Africa Cup of Nations',
    'FAC': 'FA Cup',
    'EFL': 'EFL Cup',
    'CDR': 'Copa del Rey',
    'DFB': 'DFB Pokal',
    'CIT': 'Coppa Italia',
    'CDF': 'Coupe de France',
    'KNV': 'KNVB Cup'
  }
  return names[code] || code
}

// PICK 통계 계산
function calculatePickStats(matches: UnifiedMatch[]) {
  const picksWithResult = matches.filter(m => 
    m.pickInfo && m.pickInfo.isCorrect !== null && m.pickInfo.isCorrect !== undefined
  )
  
  const correct = picksWithResult.filter(m => m.pickInfo?.isCorrect === true).length
  const total = picksWithResult.length
  const pending = matches.filter(m => 
    m.pickInfo && m.pickInfo.isCorrect === null
  ).length
  
  return {
    total: matches.filter(m => m.pickInfo).length,
    settled: total,
    correct,
    incorrect: total - correct,
    pending,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0
  }
}