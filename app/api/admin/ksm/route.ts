// app/api/admin/ksm/route.ts
// KSM 베팅 관리 — PL 경기 예측(3방법+패턴) + 배당 + 베팅 기록 CRUD (라운드별)
// GET  ?type=matches : 시즌 전체 경기(라운드 포함) + 예측 + 배당 + 베팅(+결과/손익 자동)
// POST : 베팅 저장/수정(upsert by match_id)
// DELETE ?match_id= : 베팅 삭제

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const AF_KEY = process.env.API_FOOTBALL_KEY!
const AF_HOST = 'v3.football.api-sports.io'
const PL = 39
const ELC = 40

const PROMO_IDS = [1346, 64, 57] // Coventry, Hull City, Ipswich
const TEAM_IDS = [42, 66, 35, 55, 51, 49, 1346, 52, 45, 36, 64, 57, 63, 40, 50, 33, 34, 65, 746, 47]

function currentSeason(): number {
  const now = new Date()
  return now.getMonth() + 1 >= 8 ? now.getFullYear() : now.getFullYear() - 1
}
async function af(endpoint: string) {
  const res = await fetch(`https://${AF_HOST}${endpoint}`, {
    headers: { 'x-rapidapi-key': AF_KEY, 'x-rapidapi-host': AF_HOST },
    next: { revalidate: 1800 },
  })
  if (!res.ok) throw new Error(`API-Football ${res.status}`)
  return res.json()
}

// ---------- 팀 통계 집계 (fg_team_stats 다시즌 합산 + 승격팀 환산) ----------
const SUMKEYS = [
  'home_played','home_wins','home_goals_for','home_goals_against',
  'home_first_goal_games','home_first_goal_wins','home_concede_first_games','home_concede_first_wins',
  'away_played','away_wins','away_goals_for','away_goals_against',
  'away_first_goal_games','away_first_goal_wins','away_concede_first_games','away_concede_first_wins',
]
async function buildTeamStats() {
  const { data: plRows } = await supabase
    .from('fg_team_stats').select('*')
    .eq('league_id', PL).in('season', ['2023','2024','2025','2026']).in('team_id', TEAM_IDS)
  const { data: elcRows } = await supabase
    .from('fg_team_stats').select('*')
    .eq('league_id', ELC).eq('season', '2025').in('team_id', PROMO_IDS)
  const stats: Record<number, any> = {}
  for (const tid of TEAM_IDS) {
    const plt = (plRows || []).filter((r: any) => r.team_id === tid)
    const pl2026 = plt.find((r: any) => r.season === '2026')
    const stillPromo = PROMO_IDS.includes(tid) && ((pl2026?.total_played || 0) < 5)
    const src = stillPromo ? (elcRows || []).filter((r: any) => r.team_id === tid) : plt
    if (!src.length) { stats[tid] = null; continue }
    const F: any = { promoted: stillPromo }
    for (const k of SUMKEYS) F[k] = src.reduce((s: number, r: any) => s + (r[k] || 0), 0)
    const latest = src.reduce((a: any, b: any) => (parseInt(b.season) > parseInt(a.season) ? b : a))
    F.form_home_5 = latest.form_home_5; F.form_away_5 = latest.form_away_5
    if (stillPromo) {
      F.home_goals_for *= 0.6; F.away_goals_for *= 0.6
      F.home_goals_against *= 2.32; F.away_goals_against *= 2.32
      F.home_first_goal_wins *= 0.51; F.away_first_goal_wins *= 0.51
      F.home_concede_first_wins *= 0.51; F.away_concede_first_wins *= 0.51
      if (F.form_home_5 != null) F.form_home_5 *= 0.6
      if (F.form_away_5 != null) F.form_away_5 *= 0.6
    }
    stats[tid] = F
  }
  return stats
}

// ---------- 3방법 재보정 모델 ----------
const PA = (gf: number, ga: number) => (ga === 0 ? (gf > 0 ? 2 : 1) : gf / ga)
const WR = (w: number, g: number) => (g < 4 ? 0.5 : w / g)
function predict(h: any, a: any) {
  const hSplit = PA(h.home_goals_for, h.home_goals_against)
  const hO = PA(h.home_goals_for + h.away_goals_for, h.home_goals_against + h.away_goals_against)
  const aSplit = PA(a.away_goals_for, a.away_goals_against)
  const aO = PA(a.home_goals_for + a.away_goals_for, a.home_goals_against + a.away_goals_against)
  const hPA = 0.6 * hSplit + 0.4 * hO, aPA = 0.6 * aSplit + 0.4 * aO
  const hPA5 = h.form_home_5 ? h.form_home_5 / 1.5 : hPA
  const aPA5 = a.form_away_5 ? a.form_away_5 / 1.5 : aPA
  const hFG = WR(h.home_first_goal_wins, h.home_first_goal_games)
  const aFG = WR(a.away_first_goal_wins, a.away_first_goal_games)
  const hCB = WR(h.home_concede_first_wins, h.home_concede_first_games)
  const aCB = WR(a.away_concede_first_wins, a.away_concede_first_games)
  const hAdv = (hPA + hPA5) / 2, aAdv = (aPA + aPA5) / 2, tot = hAdv + aAdv
  const m1w = hAdv / tot + (hFG - 0.5) * 0.15, m1l = aAdv / tot + (aFG - 0.5) * 0.15
  const m1d = Math.max(1 - m1w - m1l, 0.15)
  const hmin = Math.min(hPA, hPA5), hmax = Math.max(hPA, hPA5), amax = Math.max(aPA, aPA5), amin = Math.min(aPA, aPA5)
  const m2w = (hmin / (hmin + amax) + hmax / (hmax + amax) + hmin / (hmin + amin)) / 3
  const m2d = Math.max(0.18, 0.3 - Math.abs(hAdv - aAdv) * 0.15), m2l = 1 - m2w - m2d
  const hSF = hPA / (hPA + aPA), aSF = 1 - hSF
  const m3w = hSF * hFG + aSF * hCB, m3l = aSF * aFG + hSF * aCB
  const m3d = Math.min(Math.max(1 - m3w - m3l, 0.15), 0.35)
  let w = (m1w + m2w + m3w) / 3, d = (m1d + m2d + m3d) / 3, l = (m1l + m2l + m3l) / 3
  const t = w + d + l
  return { home: w / t, draw: d / t, away: l / t }
}
function patternCode(hp: number, dp: number, ap: number) {
  const mx = Math.max(hp, dp, ap), mn = Math.min(hp, dp, ap)
  const c = (v: number) => (v <= 0.05 ? 0 : v >= 0.85 ? 0 : v >= mx - 0.03 ? 1 : v <= mn + 0.05 ? 3 : 2)
  return `${c(hp)}-${c(dp)}-${c(ap)}`
}

const FINISHED = new Set(['FT', 'AET', 'PEN'])

// ---------- GET ----------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'matches'
  try {
    if (type === 'matches') {
      const season = currentSeason()
      const [fixData, stats, patRows, betRows] = await Promise.all([
        af(`/fixtures?league=${PL}&season=${season}`), // 시즌 전체
        buildTeamStats(),
        supabase.from('fg_patterns').select('*').eq('league_id', PL).then((r) => r.data || []),
        supabase.from('ksm_bets').select('*').then((r) => r.data || []),
      ])
      const patMap: Record<string, any> = {}
      for (const p of patRows) patMap[p.pattern] = p
      const betMap: Record<number, any> = {}
      for (const b of betRows) betMap[b.match_id] = b

      const fixtures = fixData.response || []
      const fixIds = fixtures.map((f: any) => String(f.fixture.id))
      const { data: oddsRows } = await supabase
        .from('match_odds_latest').select('match_id,home_odds,draw_odds,away_odds').in('match_id', fixIds)
      const oddsMap: Record<string, any> = {}
      for (const o of oddsRows || []) oddsMap[String(o.match_id)] = o

      // 대기 베팅 결과 자동 판정 (경기 종료)
      const pending = betRows.filter((b: any) => b.status === 'pending' && b.bet_pick)
      if (pending.length) {
        const ids = pending.map((b: any) => b.match_id)
        const { data: fins } = await supabase
          .from('fg_match_history').select('fixture_id,result').in('fixture_id', ids)
        const finMap: Record<number, string> = {}
        for (const f of fins || []) finMap[f.fixture_id] = f.result
        for (const b of pending) {
          const r = finMap[b.match_id]
          if (r) {
            const actual = r === 'HOME' ? 'home' : r === 'AWAY' ? 'away' : 'draw'
            const status = b.bet_pick === actual ? 'win' : 'lose'
            await supabase.from('ksm_bets')
              .update({ actual_result: actual, status, updated_at: new Date().toISOString() })
              .eq('match_id', b.match_id)
            b.actual_result = actual; b.status = status
          }
        }
      }

      const matches = fixtures.map((f: any) => {
        const hid = f.teams.home.id, aid = f.teams.away.id
        const h = stats[hid], a = stats[aid]
        const od = oddsMap[String(f.fixture.id)]
        let pred: any = null, pattern = null, patHist = null, rec = null
        if (h && a) {
          const p = predict(h, a)
          pattern = patternCode(p.home, p.draw, p.away)
          patHist = patMap[pattern] || null
          rec = patHist?.recommendation || null
          pred = { home: p.home, draw: p.draw, away: p.away }
        }
        const short = f.fixture.status?.short
        return {
          match_id: f.fixture.id,
          date: f.fixture.date,
          status: short,
          finished: FINISHED.has(short),
          round: f.league?.round || '',
          home_team: f.teams.home.name,
          away_team: f.teams.away.name,
          home_score: f.goals?.home ?? null,
          away_score: f.goals?.away ?? null,
          pattern, pred,
          confidence: patHist?.confidence || null,
          recommendation: rec,
          home_odds: od?.home_odds ?? null,
          draw_odds: od?.draw_odds ?? null,
          away_odds: od?.away_odds ?? null,
          bet: betMap[f.fixture.id] || null,
        }
      })
      return NextResponse.json({ success: true, season, league: 'PL', matches })
    }
    return NextResponse.json({ error: 'unknown type' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ---------- POST: 베팅 저장(upsert) + 결과 자동판정 ----------
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    if (!b.match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 })
    let actual_result: string | null = null, status = 'pending'
    const { data: fin } = await supabase
      .from('fg_match_history').select('result').eq('fixture_id', b.match_id).maybeSingle()
    if (fin && fin.result) {
      actual_result = fin.result === 'HOME' ? 'home' : fin.result === 'AWAY' ? 'away' : 'draw'
      if (b.bet_pick) status = b.bet_pick === actual_result ? 'win' : 'lose'
    }
    const row = {
      match_id: b.match_id, match_date: b.match_date || null,
      home_team: b.home_team || null, away_team: b.away_team || null,
      pattern: b.pattern || null,
      home_prob: b.home_prob ?? null, draw_prob: b.draw_prob ?? null, away_prob: b.away_prob ?? null,
      recommendation: b.recommendation || null,
      bet_pick: b.bet_pick || null, stake: b.stake ?? null, bet_odds: b.bet_odds ?? null,
      memo: b.memo || null, actual_result, status,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('ksm_bets').upsert(row, { onConflict: 'match_id' }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, bet: data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ---------- DELETE ----------
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const match_id = searchParams.get('match_id')
  if (!match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 })
  const { error } = await supabase.from('ksm_bets').delete().eq('match_id', match_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
