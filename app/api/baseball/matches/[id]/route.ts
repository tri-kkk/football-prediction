import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// =====================================================
// Baseball Match Detail API - 프론트엔드용
// GET /api/baseball/matches/[id]
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Next.js 15+ requires awaiting params
  const { id: matchId } = await params

  if (!matchId) {
    return NextResponse.json({ error: 'Match ID required' }, { status: 400 })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // 경기 정보 조회
    const { data: match, error: matchError } = await supabase
      .from('baseball_matches')
      .select('*')
      .eq('api_match_id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ 
        error: 'Match not found' 
      }, { status: 404 })
    }

    // 최신 오즈 조회
    const { data: latestOdds } = await supabase
      .from('baseball_odds_latest')
      .select('*')
      .eq('api_match_id', matchId)
      .single()

    // 오즈 히스토리 조회 (트렌드용)
    const { data: oddsHistory } = await supabase
      .from('baseball_odds_history')
      .select('*')
      .eq('api_match_id', matchId)
      .order('collected_at', { ascending: true })

    // 같은 리그 다른 경기 (관련 경기)
    const { data: relatedMatches } = await supabase
      .from('baseball_matches')
      .select(`
        api_match_id,
        home_team_ko,
        away_team_ko,
        home_team_logo,
        away_team_logo,
        match_date,
        match_time,
        home_score,
        away_score,
        status
      `)
      .eq('league', match.league)
      .neq('api_match_id', matchId)
      .order('match_date', { ascending: false })
      .limit(5)

    // 결과 포맷팅
    const result = {
      id: match.api_match_id,
      league: match.league,
      leagueName: match.league_name,
      season: match.season,
      
      date: match.match_date,
      time: match.match_time,
      timestamp: match.match_timestamp,
      venue: match.venue,
      
      home: {
        id: match.home_team_id,
        team: match.home_team,
        teamKo: match.home_team_ko,
        logo: match.home_team_logo,
        score: match.home_score,
      },
      
      away: {
        id: match.away_team_id,
        team: match.away_team,
        teamKo: match.away_team_ko,
        logo: match.away_team_logo,
        score: match.away_score,
      },
      
      status: match.status,
      innings: match.innings_score,
      
      // 오즈 정보
      odds: latestOdds ? {
        homeWinProb: latestOdds.home_win_prob,
        awayWinProb: latestOdds.away_win_prob,
        homeWinOdds: latestOdds.home_win_odds,
        awayWinOdds: latestOdds.away_win_odds,
        overUnderLine: latestOdds.over_under_line,
        overOdds: latestOdds.over_odds,
        underOdds: latestOdds.under_odds,
        bookmaker: latestOdds.bookmaker,
        updatedAt: latestOdds.collected_at,
      } : null,
      
      // 오즈 트렌드 (차트용)
      oddsTrend: oddsHistory?.map(h => ({
        time: h.collected_at,
        homeProb: h.home_win_prob,
        awayProb: h.away_win_prob,
      })) || [],
      
      // 관련 경기
      relatedMatches: relatedMatches?.map(m => ({
        id: m.api_match_id,
        homeTeam: m.home_team_ko,
        awayTeam: m.away_team_ko,
        homeLogo: m.home_team_logo,
        awayLogo: m.away_team_logo,
        date: m.match_date,
        time: m.match_time,
        homeScore: m.home_score,
        awayScore: m.away_score,
        status: m.status,
      })) || [],
    }

    return NextResponse.json({
      success: true,
      match: result,
    })

  } catch (error: any) {
    console.error('❌ API 오류:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}