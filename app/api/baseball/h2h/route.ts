// app/api/baseball/h2h/route.ts
// 야구 상대 전적 - Supabase DB 기반 (완료된 경기만)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const homeTeam = searchParams.get('homeTeam')
  const awayTeam = searchParams.get('awayTeam')
  const homeTeamId = searchParams.get('homeTeamId')
  const awayTeamId = searchParams.get('awayTeamId')

  if ((!homeTeam && !homeTeamId) || (!awayTeam && !awayTeamId)) {
    return NextResponse.json({
      success: false,
      error: 'Team names or IDs required'
    }, { status: 400 })
  }

  try {
    // DB에서 두 팀 간의 완료된 경기 조회 (홈/원정 양방향)
    // home_team_id or away_team_id 기준 OR team name 기준
    let query1, query2

    if (homeTeamId && awayTeamId) {
      // 팀 ID로 조회 (양방향)
      query1 = supabase
        .from('baseball_matches')
        .select('id, api_match_id, match_date, home_team, away_team, home_team_ko, away_team_ko, home_team_id, away_team_id, home_team_logo, away_team_logo, home_score, away_score, league, season, status')
        .eq('home_team_id', Number(homeTeamId))
        .eq('away_team_id', Number(awayTeamId))
        .eq('status', 'FT')
        .order('match_date', { ascending: false })
        .limit(10)

      query2 = supabase
        .from('baseball_matches')
        .select('id, api_match_id, match_date, home_team, away_team, home_team_ko, away_team_ko, home_team_id, away_team_id, home_team_logo, away_team_logo, home_score, away_score, league, season, status')
        .eq('home_team_id', Number(awayTeamId))
        .eq('away_team_id', Number(homeTeamId))
        .eq('status', 'FT')
        .order('match_date', { ascending: false })
        .limit(10)
    } else {
      // 팀 이름으로 조회 (양방향)
      query1 = supabase
        .from('baseball_matches')
        .select('id, api_match_id, match_date, home_team, away_team, home_team_ko, away_team_ko, home_team_id, away_team_id, home_team_logo, away_team_logo, home_score, away_score, league, season, status')
        .eq('home_team', homeTeam!)
        .eq('away_team', awayTeam!)
        .eq('status', 'FT')
        .order('match_date', { ascending: false })
        .limit(10)

      query2 = supabase
        .from('baseball_matches')
        .select('id, api_match_id, match_date, home_team, away_team, home_team_ko, away_team_ko, home_team_id, away_team_id, home_team_logo, away_team_logo, home_score, away_score, league, season, status')
        .eq('home_team', awayTeam!)
        .eq('away_team', homeTeam!)
        .eq('status', 'FT')
        .order('match_date', { ascending: false })
        .limit(10)
    }

    const [{ data: games1, error: err1 }, { data: games2, error: err2 }] = await Promise.all([query1, query2])

    if (err1 || err2) {
      console.error('❌ H2H DB query error:', err1 || err2)
      return NextResponse.json({ success: false, error: (err1 || err2)!.message }, { status: 500 })
    }

    // 합쳐서 날짜순 정렬 (최신순)
    const allMatches = [...(games1 || []), ...(games2 || [])]
      .sort((a, b) => b.match_date.localeCompare(a.match_date))
      .slice(0, 10)

    console.log(`✅ H2H from DB: ${allMatches.length} completed matches`)

    // 기존 응답 형식에 맞게 변환
    const requestedHomeId = homeTeamId ? Number(homeTeamId) : null

    const matches = allMatches.map((game) => {
      const isHomeWin = game.home_score > game.away_score
      const isAwayWin = game.away_score > game.home_score
      return {
        id: game.api_match_id || game.id,
        date: game.match_date,
        homeTeam: game.home_team,
        homeTeamKo: game.home_team_ko,
        homeTeamId: game.home_team_id,
        homeTeamLogo: game.home_team_logo,
        awayTeam: game.away_team,
        awayTeamKo: game.away_team_ko,
        awayTeamId: game.away_team_id,
        awayTeamLogo: game.away_team_logo,
        homeScore: game.home_score,
        awayScore: game.away_score,
        winner: isHomeWin ? 'home' : isAwayWin ? 'away' : 'draw',
        league: game.league,
        season: game.season,
        status: game.status
      }
    })

    // 통산 전적 계산 (요청한 homeTeam 기준)
    let homeWins = 0
    let awayWins = 0
    let draws = 0

    matches.forEach((match) => {
      if (requestedHomeId) {
        // homeTeamId 기준: 해당 팀이 홈일 때 홈 승 = homeWin, 원정일 때 원정 승 = homeWin
        if (match.homeTeamId === requestedHomeId) {
          if (match.winner === 'home') homeWins++
          else if (match.winner === 'away') awayWins++
          else draws++
        } else {
          if (match.winner === 'away') homeWins++
          else if (match.winner === 'home') awayWins++
          else draws++
        }
      } else {
        if (match.winner === 'home') homeWins++
        else if (match.winner === 'away') awayWins++
        else draws++
      }
    })

    return NextResponse.json({
      success: true,
      count: matches.length,
      matches,
      summary: {
        total: matches.length,
        homeWins,
        awayWins,
        draws,
        homeTeam: homeTeam || matches[0]?.homeTeam || 'Home',
        awayTeam: awayTeam || matches[0]?.awayTeam || 'Away'
      }
    })

  } catch (error: any) {
    console.error('❌ H2H error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      matches: [],
      summary: { total: 0, homeWins: 0, awayWins: 0, draws: 0 }
    }, { status: 500 })
  }
}
