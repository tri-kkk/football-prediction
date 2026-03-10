// app/api/baseball/predict/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RAILWAY_URL = 'https://web-production-efc2e.up.railway.app'
const WINDOW = 10

async function getTeamRollingStats(team: string, beforeDate: string) {
  const [{ data: homeGames }, { data: awayGames }] = await Promise.all([
    supabase
      .from('baseball_matches')
      .select('match_date, home_score, away_score, home_hits, away_hits')
      .eq('home_team', team)
      .eq('status', 'FT')
      .eq('league', 'MLB')
      .lt('match_date', beforeDate)
      .order('match_date', { ascending: false })
      .limit(WINDOW),
    supabase
      .from('baseball_matches')
      .select('match_date, home_score, away_score, home_hits, away_hits')
      .eq('away_team', team)
      .eq('status', 'FT')
      .eq('league', 'MLB')
      .lt('match_date', beforeDate)
      .order('match_date', { ascending: false })
      .limit(WINDOW),
  ])

  const allGames: Array<{
    scored: number
    conceded: number
    hits: number
    won: number
    is_home: number
    match_date: string
  }> = []

  for (const g of homeGames || []) {
    allGames.push({
      scored: g.home_score,
      conceded: g.away_score,
      hits: g.home_hits ?? 8,
      won: g.home_score > g.away_score ? 1 : 0,
      is_home: 1,
      match_date: g.match_date,
    })
  }

  for (const g of awayGames || []) {
    allGames.push({
      scored: g.away_score,
      conceded: g.home_score,
      hits: g.away_hits ?? 8,
      won: g.away_score > g.home_score ? 1 : 0,
      is_home: 0,
      match_date: g.match_date,
    })
  }

  allGames.sort((a, b) => a.match_date.localeCompare(b.match_date))
  const recent = allGames.slice(-WINDOW)
  const recent5 = recent.slice(-5)

  if (recent.length === 0) {
    return {
      win_pct: 0.5, avg_scored: 4.5, avg_conceded: 4.5,
      avg_hits: 8.0, home_win_pct: 0.5, away_win_pct: 0.5,
      recent_form: 0.5, run_diff: 0.0, games_played: 0,
      home_record: '-.---', away_record: '-.---',
      recent_wins: 0, recent_total: 0,
    }
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0.5

  const homeOnly = recent.filter(g => g.is_home === 1)
  const awayOnly = recent.filter(g => g.is_home === 0)
  const homeWinPct = homeOnly.length > 0 ? avg(homeOnly.map(g => g.won)) : 0.5
  const awayWinPct = awayOnly.length > 0 ? avg(awayOnly.map(g => g.won)) : 0.5
  const recentForm = avg(recent5.map(g => g.won))

  return {
    win_pct: avg(recent.map(g => g.won)),
    avg_scored: avg(recent.map(g => g.scored)),
    avg_conceded: avg(recent.map(g => g.conceded)),
    avg_hits: avg(recent.map(g => g.hits)),
    home_win_pct: homeWinPct,
    away_win_pct: awayWinPct,
    recent_form: recentForm,
    run_diff: avg(recent.map(g => g.scored - g.conceded)),
    games_played: recent.length,
    // 인사이트용 포맷
    home_record: homeOnly.length > 0
      ? `${(homeWinPct * 100).toFixed(0)}%`
      : 'N/A',
    away_record: awayOnly.length > 0
      ? `${(awayWinPct * 100).toFixed(0)}%`
      : 'N/A',
    recent_wins: recent5.filter(g => g.won === 1).length,
    recent_total: recent5.length,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { matchId, homeTeam, awayTeam } = await request.json()

    if (!matchId) {
      return NextResponse.json({ error: 'matchId required' }, { status: 400 })
    }

    // 경기 날짜 조회
    const { data: match, error } = await supabase
      .from('baseball_matches')
      .select('match_date, league')
      .eq('id', matchId)
      .single()

    if (error || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // MLB만 AI 예측 지원
    if (match.league !== 'MLB') {
      return NextResponse.json(
        { error: 'AI 예측은 현재 MLB만 지원합니다.' },
        { status: 400 }
      )
    }

    // Rolling feature 계산
    const [homeStats, awayStats] = await Promise.all([
      getTeamRollingStats(homeTeam, match.match_date),
      getTeamRollingStats(awayTeam, match.match_date),
    ])

    // 데이터 부족 경고
    const dataReliable =
      homeStats.games_played >= 5 && awayStats.games_played >= 5

    // Railway 모델 feature
    const features = {
      home_win_pct: homeStats.win_pct,
      home_avg_scored: homeStats.avg_scored,
      home_avg_conceded: homeStats.avg_conceded,
      home_avg_hits: homeStats.avg_hits,
      home_home_win_pct: homeStats.home_win_pct,
      home_recent_form: homeStats.recent_form,
      home_run_diff: homeStats.run_diff,
      away_win_pct: awayStats.win_pct,
      away_avg_scored: awayStats.avg_scored,
      away_avg_conceded: awayStats.avg_conceded,
      away_avg_hits: awayStats.avg_hits,
      away_away_win_pct: awayStats.away_win_pct,
      away_recent_form: awayStats.recent_form,
      away_run_diff: awayStats.run_diff,
      win_pct_diff: homeStats.win_pct - awayStats.win_pct,
      scored_diff: homeStats.avg_scored - awayStats.avg_scored,
      conceded_diff: homeStats.avg_conceded - awayStats.avg_conceded,
      form_diff: homeStats.recent_form - awayStats.recent_form,
      run_diff_diff: homeStats.run_diff - awayStats.run_diff,
      total_avg_scored: homeStats.avg_scored + awayStats.avg_scored,
    }

    // Railway API 호출
    const aiResponse = await fetch(`${RAILWAY_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features }),
      signal: AbortSignal.timeout(5000),
    })

    if (!aiResponse.ok) {
      throw new Error(`Railway API error: ${aiResponse.status}`)
    }

    const aiResult = await aiResponse.json()

    // homeWinProb를 정수 %로 변환 (컴포넌트에서 * 100 하지 않도록)
    const homeWinProb = Math.round(aiResult.home_win_prob * 100)
    const awayWinProb = Math.round(aiResult.away_win_prob * 100)
    const overProb = Math.round(aiResult.over_prob * 100)
    const underProb = Math.round(aiResult.under_prob * 100)

    // 인사이트 생성
    const winDiff = Math.abs(homeStats.win_pct - awayStats.win_pct)
    const formDiff = Math.abs(homeStats.recent_form - awayStats.recent_form)

    const keyFactors = [
      {
        name: '최근 10경기 안타',
        value: homeStats.avg_hits,
        impact: Math.round(8.04 * 100),
        description: `홈 ${homeStats.avg_hits.toFixed(1)}개 vs 원정 ${awayStats.avg_hits.toFixed(1)}개`,
      },
      {
        name: '득실점 차이',
        value: homeStats.run_diff,
        impact: Math.round(7.25 * 100),
        description: `홈 ${homeStats.run_diff > 0 ? '+' : ''}${homeStats.run_diff.toFixed(1)} vs 원정 ${awayStats.run_diff > 0 ? '+' : ''}${awayStats.run_diff.toFixed(1)}`,
      },
      {
        name: '최근 5경기 폼',
        value: homeStats.recent_form,
        impact: Math.round(formDiff * 100),
        description: `홈 ${homeStats.recent_wins}/${homeStats.recent_total}승 vs 원정 ${awayStats.recent_wins}/${awayStats.recent_total}승`,
      },
    ]

    const favoredTeam = homeWinProb >= awayWinProb ? homeTeam : awayTeam
    const favoredProb = Math.max(homeWinProb, awayWinProb)
    const summary = dataReliable
      ? `${favoredTeam}이 ${favoredProb}% 확률로 우세합니다. 최근 득실점 흐름과 안타 생산력이 주요 예측 근거입니다.`
      : `데이터가 부족하여 예측 신뢰도가 낮습니다. (홈 ${homeStats.games_played}경기, 원정 ${awayStats.games_played}경기)`

    return NextResponse.json({
      success: true,
      prediction: {
        homeWinProb,
        awayWinProb,
        overProb,
        underProb,
        confidence: aiResult.confidence,
        grade: aiResult.grade,
      },
      insights: {
        keyFactors,
        homeAdvantage: {
          homeRecord: homeStats.home_record,
          awayRecord: awayStats.away_record,
          advantage: homeStats.home_win_pct - homeStats.win_pct,
        },
        recentForm: {
          home: `${(homeStats.recent_form * 100).toFixed(0)}%`,
          away: `${(awayStats.recent_form * 100).toFixed(0)}%`,
        },
        summary,
      },
      dataQuality: {
        homeGamesPlayed: homeStats.games_played,
        awayGamesPlayed: awayStats.games_played,
        reliable: dataReliable,
      },
    })
  } catch (err) {
    console.error('AI predict error:', err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}