// app/api/baseball/picks/history/route.ts
// ⚾ 야구 픽 히스토리 — 축구 GET /api/premium-picks/history 와 동일한 클라이언트 파서를 쓰도록
//    "픽 목록"을 그대로 반환한다. (집계값은 클라가 계산, stats 는 참고용으로만 동봉)
//
// 데이터 경로:
//   baseball_matches(status=FT, 스코어 有) ⨯ baseball_odds_latest(저장된 AI 예측) — api_match_id 조인
//   예측 = ai_home_win_prob >= ai_away_win_prob ? 'home' : 'away'
//   결과 = 예측==실제 ? 'WIN' : 'LOSE'  (무승부 등 판정불가 → 'PENDING')
//
// 축구 history 와 공통 키: matchId, date, league, homeTeam, awayTeam,
//   homeTeamLogo, awayTeamLogo, homeScore, awayScore, predicted, result
// 야구 추가 키: homeTeamKo, awayTeamKo, pickedTeam, grade
//
// params: days(기본 60, 최대 120) · limit(기본 200, 최대 500) · league(ALL|MLB|KBO|NPB|CPBL) · lang(ko|en)

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
  const days = Math.min(120, Math.max(1, parseInt(searchParams.get('days') || '60', 10)))
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '200', 10)))
  const leagueParam = (searchParams.get('league') || 'ALL').toUpperCase() // ALL | MLB | KBO | NPB | CPBL
  const langParam = (searchParams.get('language') ?? searchParams.get('lang') ?? 'ko').toLowerCase()
  const isEn = langParam === 'en'
  const pickName = (en: string | null | undefined, ko: string | null | undefined) =>
    isEn ? (en || ko || '') : (ko || en || '')

  try {
    const now = new Date()
    const fromDate = new Date(now.getTime() - days * 86_400_000).toISOString().split('T')[0]

    // 1) 종료 경기 (스코어 있는 것) — CPBL 포함(데이터 있는 리그 전부)
    let mQuery = supabase
      .from('baseball_matches')
      .select(
        'api_match_id, league, match_date, match_timestamp, home_team, home_team_ko, away_team, away_team_ko, home_team_logo, away_team_logo, home_score, away_score, status',
      )
      .eq('status', 'FT')
      .gte('match_date', fromDate)
      .not('home_score', 'is', null)
      .order('match_timestamp', { ascending: false })
      .limit(1000)

    if (leagueParam !== 'ALL') mQuery = mQuery.eq('league', leagueParam)

    const { data: matches, error: mErr } = await mQuery
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

    // 3) 픽 목록 생성 (축구 history 와 동일 형태)
    const picks: any[] = []
    for (const m of matches || []) {
      const o = oddsMap.get(m.api_match_id)
      if (!o || o.ai_home_win_prob == null || o.ai_away_win_prob == null) continue // 예측 없는 경기는 픽 아님

      const hasScore = m.home_score != null && m.away_score != null
      const predHome = o.ai_home_win_prob >= o.ai_away_win_prob
      let result: 'WIN' | 'LOSE' | 'PENDING' = 'PENDING'
      if (hasScore && m.home_score !== m.away_score) {
        const actualHome = m.home_score > m.away_score
        result = predHome === actualHome ? 'WIN' : 'LOSE'
      }

      picks.push({
        matchId: m.api_match_id,
        date: m.match_date,
        league: m.league,
        homeTeam: pickName(m.home_team, m.home_team_ko),
        awayTeam: pickName(m.away_team, m.away_team_ko),
        homeTeamKo: m.home_team_ko ?? null,
        awayTeamKo: m.away_team_ko ?? null,
        homeTeamLogo: m.home_team_logo ?? null, // 빈 팀 존재 가능 → 앱 폴백
        awayTeamLogo: m.away_team_logo ?? null,
        homeScore: m.home_score,
        awayScore: m.away_score,
        predicted: predHome ? 'home' : 'away', // 서버 판정값 (현지화 문자열 매칭 회피)
        pickedTeam: predHome
          ? pickName(m.home_team, m.home_team_ko)
          : pickName(m.away_team, m.away_team_ko),
        grade: o.ai_grade ?? null,
        result, // 'WIN' | 'LOSE' | 'PENDING'
      })
    }

    const scoped = picks.slice(0, limit)

    // 참고용 stats (클라가 자체 계산해도 됨 — 축구 history 와 동일 필드)
    const wins = scoped.filter((p) => p.result === 'WIN').length
    const losses = scoped.filter((p) => p.result === 'LOSE').length
    const total = wins + losses
    const accuracy = total > 0 ? Math.round((wins / total) * 100) : 0
    let streak = 0
    for (const p of scoped) {
      if (p.result === 'PENDING') continue
      if (p.result === 'WIN') streak++
      else break
    }

    return NextResponse.json({
      success: true,
      league: leagueParam,
      days,
      picks: scoped,
      stats: {
        total,
        wins,
        losses,
        accuracy,
        streak,
        pending: scoped.filter((p) => p.result === 'PENDING').length,
      },
    })
  } catch (error: any) {
    console.error('baseball picks history 오류:', error)
    return NextResponse.json(
      { success: false, error: String(error?.message || error), picks: [], stats: null },
      { status: 200 },
    )
  }
}
