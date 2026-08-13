// app/api/admin/ksm/route.ts
// KSM 베팅 관리 — 멀티리그(PL/BL1/PD/FL1) 라운드별 예측 + 배당 + 베팅 CRUD
// GET  ?type=matches&league=PL : 시즌 전체 경기(라운드) + 예측 + 배당 + 베팅(+결과/손익 자동)
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

const LEAGUES: Record<string, { id: number; name: string }> = {
  PL: { id: 39, name: '프리미어리그' },
  BL1: { id: 78, name: '분데스리가' },
  PD: { id: 140, name: '라리가' },
  FL1: { id: 61, name: '리그1' },
  SA: { id: 135, name: '세리에A' },
}
// 1부 리그별 승격팀 처리: 하위리그(2부) id + 참조 시즌 + 승격팀 id + 2부→1부 환산계수
// 환산계수는 실제 승격팀 신인시즌 데이터로 도출(득점/실점/선제골승률/폼 배율).
const PROMO_CFG: Record<number, {
  lower: number; season: string; ids: number[]
  gf: number; ga: number; fgw: number; form: number
}> = {
  // PL ← 챔피언십(코번트리/헐시티/입스위치)
  39:  { lower: 40,  season: '2025', ids: [1346, 64, 57],   gf: 0.60, ga: 2.32, fgw: 0.51, form: 0.60 },
  // 라리가 ← 세군다(말라가/데포르티보/라싱 산탄데르). 9개 승격팀 실측: GF 0.75, GA 1.90, FGwr 0.68, form 0.60
  140: { lower: 141, season: '2025', ids: [535, 544, 4665], gf: 0.75, ga: 1.90, fgw: 0.68, form: 0.60 },
}

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

const SUMKEYS = [
  'home_played','home_wins','home_goals_for','home_goals_against',
  'home_first_goal_games','home_first_goal_wins','home_concede_first_games','home_concede_first_wins',
  'away_played','away_wins','away_goals_for','away_goals_against',
  'away_first_goal_games','away_first_goal_wins','away_concede_first_games','away_concede_first_wins',
]
function aggregate(src: any[], promoted: boolean, f?: typeof PROMO_CFG[number]) {
  const F: any = { promoted }
  for (const k of SUMKEYS) F[k] = src.reduce((s: number, r: any) => s + (r[k] || 0), 0)
  const latest = src.reduce((a: any, b: any) => (parseInt(b.season) > parseInt(a.season) ? b : a))
  F.form_home_5 = latest.form_home_5; F.form_away_5 = latest.form_away_5
  if (promoted && f) {
    F.home_goals_for *= f.gf; F.away_goals_for *= f.gf
    F.home_goals_against *= f.ga; F.away_goals_against *= f.ga
    F.home_first_goal_wins *= f.fgw; F.away_first_goal_wins *= f.fgw
    F.home_concede_first_wins *= f.fgw; F.away_concede_first_wins *= f.fgw
    if (F.form_home_5 != null) F.form_home_5 *= f.form
    if (F.form_away_5 != null) F.form_away_5 *= f.form
  }
  return F
}
// 리그별 팀 통계 (fg_team_stats 다시즌 합산). 승격팀은 2부 데이터를 1부로 환산(PL←챔피언십, 라리가←세군다).
async function buildTeamStats(leagueId: number) {
  const { data: rows } = await supabase.from('fg_team_stats').select('*')
    .eq('league_id', leagueId).in('season', ['2023', '2024', '2025', '2026'])
  const byTeam: Record<number, any[]> = {}
  for (const r of rows || []) (byTeam[r.team_id] = byTeam[r.team_id] || []).push(r)

  const cfg = PROMO_CFG[leagueId]
  const lowerByTeam: Record<number, any[]> = {}
  if (cfg) {
    const { data: low } = await supabase.from('fg_team_stats').select('*')
      .eq('league_id', cfg.lower).eq('season', cfg.season).in('team_id', cfg.ids)
    for (const r of low || []) (lowerByTeam[r.team_id] = lowerByTeam[r.team_id] || []).push(r)
  }
  const cur = String(currentSeason())
  const stats: Record<number, any> = {}
  const ids = new Set<number>([...Object.keys(byTeam).map(Number), ...Object.keys(lowerByTeam).map(Number)])
  for (const tid of ids) {
    const top = byTeam[tid] || []
    const curRow = top.find((r: any) => r.season === cur)
    const stillPromo = !!cfg && cfg.ids.includes(tid) && ((curRow?.total_played || 0) < 5)
    const src = stillPromo ? (lowerByTeam[tid] || []) : top
    if (!src.length) continue
    stats[tid] = aggregate(src, stillPromo, cfg)
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
// 배당 → 시장 확률 (마진/오버라운드 제거, power 방식)
function devig(oh: number, odw: number, oa: number) {
  const raw = [1 / oh, 1 / odw, 1 / oa]
  let lo = 0.5, hi = 1.5
  for (let i = 0; i < 50; i++) {
    const k = (lo + hi) / 2
    const s = raw.reduce((x, r) => x + Math.pow(r, k), 0)
    if (s > 1) lo = k; else hi = k
  }
  const k = (lo + hi) / 2
  const p = raw.map((r) => Math.pow(r, k))
  const s = p[0] + p[1] + p[2]
  return { home: p[0] / s, draw: p[1] / s, away: p[2] / s }
}
function patternCode(hp: number, dp: number, ap: number) {
  const mx = Math.max(hp, dp, ap), mn = Math.min(hp, dp, ap)
  const c = (v: number) => (v <= 0.05 ? 0 : v >= 0.85 ? 0 : v >= mx - 0.03 ? 1 : v <= mn + 0.05 ? 3 : 2)
  return `${c(hp)}-${c(dp)}-${c(ap)}`
}
// 이 경기 예측 확률 기반 추천 (무승부 라벨 포함)
function recommend(p: { home: number; draw: number; away: number }) {
  const arr: [string, number][] = [['홈승', p.home], ['무', p.draw], ['원정승', p.away]]
  arr.sort((a, b) => b[1] - a[1])
  const [label, top] = arr[0]
  const gap = top - arr[1][1]
  const s = (v: number) => `${(v * 100).toFixed(0)}%`
  const ds = s(p.draw)
  if (label === '무') return p.draw >= 0.30 ? `무승부 추천 (${ds})` : `무승부 우세 (${ds})`
  if (top >= 0.60 || gap >= 0.20) return `${label} 추천 (${s(top)})`
  if (top >= 0.48 || gap >= 0.10) return `${label} 우세 (${s(top)})`
  if (p.draw >= 0.25) return `무승부 고려 (${ds})`
  return `접전 - 주의`
}
const FINISHED = new Set(['FT', 'AET', 'PEN'])

// ---------- GET ----------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'matches'
  const code = (searchParams.get('league') || 'PL').toUpperCase()
  const cfg = LEAGUES[code]
  if (!cfg) return NextResponse.json({ error: 'unknown league' }, { status: 400 })
  try {
    if (type === 'matches') {
      const season = currentSeason()
      const [fixData, stats, patRows, betRows] = await Promise.all([
        af(`/fixtures?league=${cfg.id}&season=${season}`),
        buildTeamStats(cfg.id),
        supabase.from('fg_patterns').select('*').eq('league_id', cfg.id).then((r) => r.data || []),
        supabase.from('ksm_bets').select('*').eq('league', code).then((r) => r.data || []),
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
            // CLV: 종료 시점(=클로징) 시장배당 스냅샷 → 베팅 배당과 비교
            const oc = oddsMap[String(b.match_id)]
            const closeOdd = oc
              ? (b.bet_pick === 'home' ? oc.home_odds : b.bet_pick === 'draw' ? oc.draw_odds : oc.away_odds)
              : null
            const clv = b.bet_odds && closeOdd ? b.bet_odds / closeOdd - 1 : null
            await supabase.from('ksm_bets')
              .update({ actual_result: actual, status, close_odds: closeOdd, clv, updated_at: new Date().toISOString() })
              .eq('match_id', b.match_id)
            b.actual_result = actual; b.status = status; b.close_odds = closeOdd; b.clv = clv
          }
        }
      }

      const matches = fixtures.map((f: any) => {
        const h = stats[f.teams.home.id], a = stats[f.teams.away.id]
        const o = oddsMap[String(f.fixture.id)]
        let pred: any = null, pattern = null, patHist = null, rec = null
        let pick: string | null = null, value: number | null = null, signal = false
        let market: { home: number; draw: number; away: number } | null = null
        if (h && a) {
          const p = predict(h, a)
          pattern = patternCode(p.home, p.draw, p.away)
          patHist = patMap[pattern] || null
          rec = recommend(p)
          pred = { home: p.home, draw: p.draw, away: p.away }
          pick = p.home >= p.draw && p.home >= p.away ? 'home' : p.away >= p.draw ? 'away' : 'draw'
          // 시장확률(마진제거) 대비 이견 — 정직판: 밸류=모델확률 − 시장확률(수익 보장 아님, 참고용)
          if (o?.home_odds && o?.draw_odds && o?.away_odds) {
            market = devig(o.home_odds, o.draw_odds, o.away_odds)
            const mp = pick === 'home' ? market.home : pick === 'draw' ? market.draw : market.away
            const pp = pick === 'home' ? p.home : pick === 'draw' ? p.draw : p.away
            value = pp - mp
            signal = value >= 0.08 && patHist?.confidence === 'HIGH' && !rec.startsWith('접전')
          }
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
          pattern, pred, market,
          confidence: patHist?.confidence || null,
          pat_home_rate: patHist?.home_win_rate ?? null,
          pat_draw_rate: patHist?.draw_rate ?? null,
          pat_away_rate: patHist?.away_win_rate ?? null,
          pat_total: patHist?.total_matches ?? null,
          recommendation: rec,
          pick, value, signal,
          home_odds: o?.home_odds ?? null,
          draw_odds: o?.draw_odds ?? null,
          away_odds: o?.away_odds ?? null,
          bet: betMap[f.fixture.id] || null,
        }
      })
      return NextResponse.json({ success: true, season, league: code, leagueName: cfg.name, matches })
    }
    return NextResponse.json({ error: 'unknown type' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ---------- POST ----------
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    if (!b.match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 })
    let actual_result: string | null = null, status = 'pending'
    let close_odds: number | null = null, clv: number | null = null
    const { data: fin } = await supabase
      .from('fg_match_history').select('result').eq('fixture_id', b.match_id).maybeSingle()
    if (fin && fin.result) {
      actual_result = fin.result === 'HOME' ? 'home' : fin.result === 'AWAY' ? 'away' : 'draw'
      if (b.bet_pick) status = b.bet_pick === actual_result ? 'win' : 'lose'
      // 종료된 경기에 베팅 기록 시 클로징 배당 스냅샷 → CLV
      if (b.bet_pick) {
        const { data: oc } = await supabase
          .from('match_odds_latest').select('home_odds,draw_odds,away_odds').eq('match_id', b.match_id).maybeSingle()
        if (oc) close_odds = b.bet_pick === 'home' ? oc.home_odds : b.bet_pick === 'draw' ? oc.draw_odds : oc.away_odds
        if (b.bet_odds && close_odds) clv = b.bet_odds / close_odds - 1
      }
    }
    const row = {
      match_id: b.match_id, league: b.league || 'PL', match_date: b.match_date || null,
      home_team: b.home_team || null, away_team: b.away_team || null, pattern: b.pattern || null,
      home_prob: b.home_prob ?? null, draw_prob: b.draw_prob ?? null, away_prob: b.away_prob ?? null,
      recommendation: b.recommendation || null,
      bet_pick: b.bet_pick || null, stake: b.stake ?? null, bet_odds: b.bet_odds ?? null,
      memo: b.memo || null, actual_result, status, close_odds, clv, updated_at: new Date().toISOString(),
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
