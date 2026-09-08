// app/api/team-index/[teamId]/route.ts
// 팀 종목 상세 — 지수/시리즈 + fg_team_stats 펀더멘털 + 리그 순위/승점 + 최근 경기(경기별 지수 등락)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const rate = (w: number, g: number) => (g > 0 ? Math.round((w / g) * 100) : null)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId: teamIdRaw } = await params
  const teamId = Number(teamIdRaw)
  if (!teamId) return NextResponse.json({ error: 'bad teamId' }, { status: 400 })
  try {
    const { data: latest } = await supabase.from('team_index_latest').select('*').eq('team_id', teamId).maybeSingle()
    if (!latest) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const { league_id, league_code, season } = latest

    const [{ data: hist }, { data: stat }, { data: leagueStats }, { data: recentRaw }] = await Promise.all([
      supabase.from('team_index_history').select('match_date,idx,change,note').eq('team_id', teamId).eq('season', season).order('match_date', { ascending: true }),
      supabase.from('fg_team_stats').select('*').eq('team_id', teamId).eq('league_id', league_id).eq('season', season).maybeSingle(),
      supabase.from('fg_team_stats').select('team_id,total_wins,total_draws,total_losses,total_goals_for,total_goals_against,total_played').eq('league_id', league_id).eq('season', season),
      supabase.from('fg_match_history')
        .select('match_date,home_team,away_team,home_team_id,away_team_id,home_score,away_score,result')
        .eq('league_id', league_id).eq('season', season)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order('match_date', { ascending: false }).limit(6),
    ])

    // 리그 순위(승점 → 득실차)
    const table = (leagueStats || []).map((t: any) => ({
      id: t.team_id, pts: (t.total_wins || 0) * 3 + (t.total_draws || 0),
      gd: (t.total_goals_for || 0) - (t.total_goals_against || 0), gf: t.total_goals_for || 0,
    })).sort((a: any, b: any) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    const rank = table.findIndex((t: any) => t.id === teamId) + 1 || null

    // 지수 등락 맵 (경기일 → change)
    const chgByDate: Record<string, number> = {}
    for (const h of hist || []) chgByDate[h.match_date] = Number(h.change)

    const recent = (recentRaw || []).map((m: any) => {
      const home = m.home_team_id === teamId
      const gf = home ? m.home_score : m.away_score
      const ga = home ? m.away_score : m.home_score
      const res = m.result === 'DRAW' ? 'D' : ((m.result === 'HOME') === home ? 'W' : 'L')
      return {
        date: m.match_date, opp: home ? m.away_team : m.home_team, homeAway: home ? 'H' : 'A',
        score: `${gf}-${ga}`, result: res, indexChange: chgByDate[m.match_date] ?? null,
      }
    })
    const form = recent.map((r: any) => r.result) // 최신→과거
    // 스트릭(최신 기준 연속 동일결과)
    let streak = 0, sres = form[0]
    for (const r of form) { if (r === sres) streak++; else break }

    const s = stat || {}
    const fgGames = (s.home_first_goal_games || 0) + (s.away_first_goal_games || 0)
    const fgWins = (s.home_first_goal_wins || 0) + (s.away_first_goal_wins || 0)
    const cfGames = (s.home_concede_first_games || 0) + (s.away_concede_first_games || 0)
    const cfWins = (s.home_concede_first_wins || 0) + (s.away_concede_first_wins || 0)
    const gp = s.total_played || latest.played || 0
    const pts = (s.total_wins || 0) * 3 + (s.total_draws || 0)

    // 지수 변동성(표준편차)
    const vs = (hist || []).map((h: any) => Number(h.idx))
    let vol: number | null = null
    if (vs.length > 1) { const m = vs.reduce((a, b) => a + b, 0) / vs.length; vol = Math.round(Math.sqrt(vs.reduce((a, b) => a + (b - m) ** 2, 0) / vs.length)) }

    return NextResponse.json({
      teamId, team: latest.team_name, leagueCode: league_code, season,
      index: latest.idx, change: Number(latest.change ?? 0), hi: latest.hi, lo: latest.lo, played: gp, volatility: vol,
      table: { rank, points: pts, ppg: gp ? +(pts / gp).toFixed(2) : null,
        wins: s.total_wins ?? null, draws: s.total_draws ?? null, losses: s.total_losses ?? null },
      goals: { gf: s.total_goals_for ?? null, ga: s.total_goals_against ?? null,
        gd: (s.total_goals_for ?? 0) - (s.total_goals_against ?? 0),
        homeGf: s.home_goals_for ?? null, homeGa: s.home_goals_against ?? null,
        awayGf: s.away_goals_for ?? null, awayGa: s.away_goals_against ?? null },
      traits: { firstGoalWinRate: rate(fgWins, fgGames), firstGoalGames: fgGames,
        concedeFirstWinRate: rate(cfWins, cfGames), concedeFirstGames: cfGames },
      form, streak, streakType: sres || null,
      series: (hist || []).map((h: any) => ({ date: h.match_date, v: h.idx, note: h.note })),
      recent,
    }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1800' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
