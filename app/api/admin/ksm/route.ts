// app/api/admin/ksm/route.ts
// KSM 베팅 관리 — 다가오는 PL 경기 예측(3방법+패턴) + 베팅 기록 CRUD
// GET  ?type=matches : 다가오는 경기 + 예측 + 저장된 베팅(+결과 자동 판정)
// POST : 베팅 저장/수정(upsert by match_id)
// DELETE ?id= : 베팅 삭제

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

// 2026-27 PL 20팀 + 승격 후보
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
  // PL 최근 시즌 + 챔피언십(승격팀)
  const { data: plRows } = await supabase
    .from('fg_team_stats').select('*')
    .eq('league_id', PL).in('season', ['2023','2024','2025','2026']).in('team_id', TEAM_IDS)
  const { data: elcRows } = await supabase
    .from('fg_team_stats').select('*')
    .eq('league_id', ELC).eq('season', '2025').in('team_id', PROMO_IDS)

  const stats: Record<number, any> = {}
  for (const tid of TEAM_IDS) {
    const plt = (plRows || []).filter((r: any) => r.team_id === tid)
    // 승격팀 자동 전환: PL 2026 경기 5+ 면 정상 취급
    const pl2026 = plt.find((r: any) => r.season === '2026')
    const isPromoCandidate = PROMO_IDS.includes(tid)
    const stillPromo = isPromoCandidate && ((pl2026?.total_played || 0) < 5)
    const src = stillPromo ? (elcRows || []).filter((r: any) => r.team_id === tid) : plt

    if (!src.length) { stats[tid] = null; continue }
    const F: any = { promoted: stillPromo }
    for (const k of SUMKEYS) F[k] = src.reduce((s: number, r: any) => s + (r[k] || 0), 0)
    const latest = src.reduce((a: any, b: any) => (parseInt(b.season) > parseInt(a.season) ? b : a))
    F.form_home_5 = latest.form_home_5
    F.form_away_5 = latest.form_away_5

    if (stillPromo) {  // 2부 -> 1부 환산
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
  const hPA = 0.6 * hSplit + 0.4 * hO
  const aPA = 0.6 * aSplit + 0.4 * aO
  const hPA5 = h.form_home_5 ? h.form_home_5 / 1.5 : hPA
  const aPA5 = a.form_away_5 ? a.form_away_5 / 1.5 : aPA
  const hFG = WR(h.home_first_goal_wins, h.home_first_goal_games)
  const aFG = WR(a.away_first_goal_wins, a.away_first_goal_games)
  const hCB = WR(h.home_concede_first_wins, h.home_concede_first_games)
  const aCB = WR(a.away_concede_first_wins, a.away_concede_first_games)
  const hAdv = (hPA + hPA5) / 2, aAdv = (aPA + aPA5) / 2, tot = hAdv + aAdv
  let m1w = hAdv / tot + (hFG - 0.5) * 0.15, m1l = aAdv / tot + (aFG - 0.5) * 0.15
  let m1d = Math.max(1 - m1w - m1l, 0.15)
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

// ---------- GET ----------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'matches'
  try {
    if (type === 'matches') {
      const season = currentSeason()
      const [fixData, stats, patRows, betRows] = await Promise.all([
        af(`/fixtures?league=${PL}&season=${season}&next=30`),
        buildTeamStats(),
        supabase.from('fg_patterns').select('*').eq('league_id', PL).then((r) => r.data || []),
        supabase.from('ksm_bets').select('*').then((r) => r.data || []),
      ])
      const patMap: Record<string, any> = {}
      for (const p of patRows) patMap[p.pattern] = p
      const betMap: Record<number, any> = {}
      for (const b of betRows) betMap[b.match_id] = b

      const upcoming = (fixData.response || []).map((f: any) => {
        const hid = f.teams.home.id, aid = f.teams.away.id
        const h = stats[hid], a = stats[aid]
        let pred: any = null, pattern = null, patHist = null, rec = null
        if (h && a) {
          const p = predict(h, a)
          pattern = patternCode(p.home, p.draw, p.away)
          patHist = patMap[pattern] || null
          rec = patHist?.recommendation || null
          pred = { home: p.home, draw: p.draw, away: p.away }
        }
        return {
          match_id: f.fixture.id,
          date: f.fixture.date,
          status: f.fixture.status?.short,
          round: f.league?.round,
          home_team: f.teams.home.name,
          away_team: f.teams.away.name,
          home_logo: f.teams.home.logo,
          away_logo: f.teams.away.logo,
          pattern, pred,
          confidence: patHist?.confidence || null,
          pat_home_rate: patHist?.home_win_rate ?? null,
          pat_draw_rate: patHist?.draw_rate ?? null,
          pat_away_rate: patHist?.away_win_rate ?? null,
          recommendation: rec,
          bet: betMap[f.fixture.id] || null,
        }
      })

      // 대기중 베팅 결과 자동 판정 (경기 종료 시)
      const upcomingIds = new Set(upcoming.map((m: any) => m.match_id))
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
      // 종료/과거 베팅 행 (다가오는 목록에 없는 것) — 결과 확인용으로 함께 표시
      const pastRows = betRows
        .filter((b: any) => !upcomingIds.has(b.match_id))
        .sort((x: any, y: any) => (y.match_date || '').localeCompare(x.match_date || ''))
        .map((b: any) => ({
          match_id: b.match_id, date: b.match_date, status: 'FT', round: '',
          home_team: b.home_team, away_team: b.away_team, home_logo: null, away_logo: null,
          pattern: b.pattern,
          pred: b.home_prob != null ? { home: b.home_prob, draw: b.draw_prob, away: b.away_prob } : null,
          confidence: null, pat_home_rate: null, pat_draw_rate: null, pat_away_rate: null,
          recommendation: b.recommendation, bet: b,
        }))

      return NextResponse.json({ success: true, season, matches: [...upcoming, ...pastRows] })
    }
    return NextResponse.json({ error: 'unknown type' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ---------- POST: 베팅 저장(upsert by match_id) + 결과 자동판정 ----------
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    if (!b.match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 })

    // 이미 끝난 경기면 결과 판정
    let actual_result: string | null = null, status = 'pending'
    const { data: fin } = await supabase
      .from('fg_match_history').select('home_score,away_score,result')
      .eq('fixture_id', b.match_id).maybeSingle()
    if (fin && fin.result) {
      actual_result = fin.result === 'HOME' ? 'home' : fin.result === 'AWAY' ? 'away' : 'draw'
      if (b.bet_pick) status = b.bet_pick === actual_result ? 'win' : 'lose'
    }

    const row = {
      match_id: b.match_id,
      match_date: b.match_date || null,
      home_team: b.home_team || null,
      away_team: b.away_team || null,
      pattern: b.pattern || null,
      home_prob: b.home_prob ?? null,
      draw_prob: b.draw_prob ?? null,
      away_prob: b.away_prob ?? null,
      recommendation: b.recommendation || null,
      bet_pick: b.bet_pick || null,
      stake: b.stake ?? null,
      memo: b.memo || null,
      actual_result,
      status,
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
  const id = searchParams.get('id')
  const match_id = searchParams.get('match_id')
  let q = supabase.from('ksm_bets').delete()
  if (id) q = q.eq('id', id)
  else if (match_id) q = q.eq('match_id', match_id)
  else return NextResponse.json({ error: 'id or match_id required' }, { status: 400 })
  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
