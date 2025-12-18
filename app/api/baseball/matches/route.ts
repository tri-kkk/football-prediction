import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// =====================================================
// Baseball Matches API - 프론트엔드용
// GET /api/baseball/matches
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // 파라미터
  const league = searchParams.get('league') || 'ALL'  // KBO, NPB, MLB, CPBL, ALL
  const status = searchParams.get('status') || 'all'   // scheduled, finished, all
  const limit = parseInt(searchParams.get('limit') || '50')
  const date = searchParams.get('date') || ''          // YYYY-MM-DD

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // 쿼리 빌드
    let query = supabase
      .from('baseball_matches')
      .select(`
        id,
        api_match_id,
        league,
        league_name,
        match_date,
        match_time,
        match_timestamp,
        home_team,
        home_team_ko,
        home_team_logo,
        away_team,
        away_team_ko,
        away_team_logo,
        home_score,
        away_score,
        status,
        innings_score
      `)

    // 리그 필터
    if (league !== 'ALL') {
      query = query.eq('league', league)
    }

    // 상태 필터
    if (status === 'scheduled') {
      query = query.in('status', ['NS', 'SCHEDULED', 'TBD'])
    } else if (status === 'finished') {
      query = query.eq('status', 'FT')
    }

    // 날짜 필터
    if (date) {
      query = query.eq('match_date', date)
    }

    // 정렬 및 제한
    query = query
      .order('match_date', { ascending: false })
      .order('match_time', { ascending: true })
      .limit(limit)

    const { data: matches, error } = await query

    if (error) {
      console.error('❌ 경기 조회 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 오즈 데이터 조인
    const matchIds = matches?.map(m => m.api_match_id) || []
    
    let odds: any[] = []
    if (matchIds.length > 0) {
      const { data: oddsData } = await supabase
        .from('baseball_odds_latest')
        .select('*')
        .in('api_match_id', matchIds)
      
      odds = oddsData || []
    }

    // 오즈 매핑
    const oddsMap = new Map(odds.map(o => [o.api_match_id, o]))

    // 결과 포맷팅
    const formattedMatches = matches?.map(match => {
      const matchOdds = oddsMap.get(match.api_match_id)
      
      return {
        id: match.api_match_id,
        league: match.league,
        leagueName: match.league_name,
        date: match.match_date,
        time: match.match_time,
        timestamp: match.match_timestamp,
        
        homeTeam: match.home_team,
        homeTeamKo: match.home_team_ko,
        homeLogo: match.home_team_logo,
        homeScore: match.home_score,
        
        awayTeam: match.away_team,
        awayTeamKo: match.away_team_ko,
        awayLogo: match.away_team_logo,
        awayScore: match.away_score,
        
        status: match.status,
        innings: match.innings_score,
        
        // 오즈 정보
        odds: matchOdds ? {
          homeWinProb: matchOdds.home_win_prob,
          awayWinProb: matchOdds.away_win_prob,
          homeWinOdds: matchOdds.home_win_odds,
          awayWinOdds: matchOdds.away_win_odds,
          overUnderLine: matchOdds.over_under_line,
          overOdds: matchOdds.over_odds,
          underOdds: matchOdds.under_odds,
        } : null,
      }
    }) || []

    return NextResponse.json({
      success: true,
      count: formattedMatches.length,
      filters: { league, status, limit, date },
      matches: formattedMatches,
    })

  } catch (error: any) {
    console.error('❌ API 오류:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}