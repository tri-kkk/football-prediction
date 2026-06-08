// app/api/baseball/prediction-results/route.ts
// 야구 AI 예측 성적표 — 종료 경기(baseball_matches) + 저장된 AI 예측(baseball_odds_latest)을
// api_match_id로 조인해 경기별 적중/실패 + 전체 적중률 산출. (CPBL 제외)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = Math.min(60, Math.max(1, parseInt(searchParams.get('days') || '14', 10)))
  const limit = Math.min(30, Math.max(1, parseInt(searchParams.get('limit') || '8', 10)))
  const leagueParam = (searchParams.get('league') || 'ALL').toUpperCase() // ALL | MLB | KBO | NPB

  try {
    const now = new Date()
    const fromDate = new Date(now.getTime() - days * 86_400_000).toISOString().split('T')[0]

    // 1) 종료 경기 (CPBL 제외, 스코어 있는 것)
    const { data: matches, error: mErr } = await supabase
      .from('baseball_matches')
      .select(
        'api_match_id, league, match_date, match_timestamp, home_team, home_team_ko, away_team, away_team_ko, home_score, away_score, status',
      )
      .eq('status', 'FT')
      .neq('league', 'CPBL')
      .gte('match_date', fromDate)
      .not('home_score', 'is', null)
      .order('match_timestamp', { ascending: false })
      .limit(500)

    if (mErr) throw mErr

    const ids = (matches || []).map((m) => m.api_match_id).filter(Boolean)

    // 2) 저장된 AI 예측 조인 (api_match_id 기준)
    const oddsMap = new Map<any, any>()
    if (ids.length > 0) {
      const { data: odds } = await supabase
        .from('baseball_odds_latest')
        .select('api_match_id, ai_home_win_prob, ai_away_win_prob, ai_grade')
        .in('api_match_id', ids)
      ;(odds || []).forEach((o) => oddsMap.set(o.api_match_id, o))
    }

    // 3) 경기별 적중/실패 계산
    const evalGames: any[] = []
    for (const m of matches || []) {
      const o = oddsMap.get(m.api_match_id)
      if (!o || o.ai_home_win_prob == null || o.ai_away_win_prob == null) continue
      if (m.home_score == null || m.away_score == null || m.home_score === m.away_score) continue

      const predHome = o.ai_home_win_prob >= o.ai_away_win_prob
      const actualHome = m.home_score > m.away_score
      const correct = predHome === actualHome

      evalGames.push({
        league: m.league,
        date: m.match_date,
        homeTeam: m.home_team_ko || m.home_team,
        awayTeam: m.away_team_ko || m.away_team,
        homeScore: m.home_score,
        awayScore: m.away_score,
        pickedTeam: predHome ? m.home_team_ko || m.home_team : m.away_team_ko || m.away_team,
        confidence: Math.round(Math.max(o.ai_home_win_prob, o.ai_away_win_prob)),
        grade: o.ai_grade ?? null,
        correct,
      })
    }

    // 리그별 집계 (탭 라벨/요약용 — 항상 전체 리그 기준)
    const LEAGUE_ORDER = ['MLB', 'KBO', 'NPB']
    const byLeague = LEAGUE_ORDER.map((lg) => {
      const arr = evalGames.filter((g) => g.league === lg)
      const t = arr.length
      const c = arr.filter((g) => g.correct).length
      return { league: lg, total: t, correct: c, accuracy: t > 0 ? Math.round((c / t) * 100) : null }
    }).filter((l) => l.total > 0)

    // 선택 리그로 스코프 (ALL = 전체)
    const scoped = leagueParam === 'ALL' ? evalGames : evalGames.filter((g) => g.league === leagueParam)

    const total = scoped.length
    const correctCount = scoped.filter((g) => g.correct).length
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : null

    // 최근 목록: 시간순 최근 경기 (evalGames는 match_timestamp desc 정렬 유지)
    const recent = scoped.slice(0, limit)

    return NextResponse.json({
      success: true,
      days,
      league: leagueParam,
      total,
      correct: correctCount,
      accuracy,
      byLeague,
      recent,
    })
  } catch (error: any) {
    console.error('prediction-results 오류:', error)
    return NextResponse.json(
      { success: false, error: String(error?.message || error), total: 0, correct: 0, accuracy: null, recent: [] },
      { status: 200 },
    )
  }
}
