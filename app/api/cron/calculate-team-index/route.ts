// app/api/cron/calculate-team-index/route.ts
// 팀 지수(Elo) 계산 — 축구 5대 리그. fg_match_history 전체를 시간순으로 돌려
// 팀별 실력 레이팅을 산출하고 team_index_latest / team_index_history 에 저장.
// 전체 재계산(idempotent)이라 백필과 매 라운드 갱신을 겸함.
//   pg_cron 예: 매일/라운드 후 GET /api/cron/calculate-team-index

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const LEAGUES = [
  { code: 'PL', id: 39 },
  { code: 'PD', id: 140 },
  { code: 'BL1', id: 78 },
  { code: 'SA', id: 135 },
  { code: 'FL1', id: 61 },
  { code: 'J1', id: 98 },
]

const BASE = 1500, K = 20, HOME_ADV = 65, REGRESS = 0.75

function currentSeason(): string {
  const n = new Date()
  return String(n.getMonth() + 1 >= 8 ? n.getFullYear() : n.getFullYear() - 1)
}
const expct = (ra: number, rb: number) => 1 / (1 + Math.pow(10, (rb - ra) / 400))
function gmult(gd: number) {
  gd = Math.abs(gd)
  return gd <= 1 ? 1 : gd === 2 ? 1.5 : (11 + gd) / 8
}

async function fetchAll(leagueId: number) {
  const out: any[] = []
  let off = 0
  for (;;) {
    const { data, error } = await supabase
      .from('fg_match_history')
      .select('season,match_date,home_team,away_team,home_team_id,away_team_id,home_score,away_score,result')
      .eq('league_id', leagueId)
      .order('match_date', { ascending: true })
      .range(off, off + 999)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < 1000) break
    off += 1000
  }
  return out.filter((m) => m.home_score != null && m.away_score != null)
}

async function processLeague(code: string, leagueId: number, cur: string) {
  const ms = await fetchAll(leagueId)
  const R: Record<number, number> = {}
  const name: Record<number, string> = {}
  const hist: Record<number, { date: string; idx: number; change: number; note: string }[]> = {}
  let prev: string | null = null

  for (const m of ms) {
    if (prev && m.season !== prev) {
      for (const t in R) R[t] = BASE + REGRESS * (R[t] - BASE)
    }
    prev = m.season
    const h = m.home_team_id, a = m.away_team_id
    if (h == null || a == null) continue
    R[h] ??= BASE; R[a] ??= BASE
    name[h] = m.home_team; name[a] = m.away_team
    const sc = m.result === 'HOME' ? 1 : m.result === 'AWAY' ? 0 : 0.5
    const d = K * gmult(m.home_score - m.away_score) * (sc - expct(R[h] + HOME_ADV, R[a]))
    R[h] += d; R[a] -= d
    if (m.season === cur) {
      const hr = m.result === 'HOME' ? '승' : m.result === 'DRAW' ? '무' : '패'
      const ar = m.result === 'AWAY' ? '승' : m.result === 'DRAW' ? '무' : '패'
        ; (hist[h] ??= []).push({ date: m.match_date, idx: Math.round(R[h]), change: +d.toFixed(1), note: `${hr} vs ${m.away_team} ${m.home_score}-${m.away_score}` })
        ; (hist[a] ??= []).push({ date: m.match_date, idx: Math.round(R[a]), change: +(-d).toFixed(1), note: `${ar} vs ${m.home_team} ${m.away_score}-${m.home_score}` })
    }
  }

  const teams = Object.keys(hist).map(Number)
  const latestRows: any[] = []
  const histRows: any[] = []
  for (const t of teams) {
    const hs = hist[t]
    const vals = hs.map((x) => x.idx)
    const last = hs[hs.length - 1]
    latestRows.push({
      team_id: t, league_code: code, league_id: leagueId, team_name: name[t], season: cur,
      idx: Math.round(R[t]), change: last.change, hi: Math.max(...vals), lo: Math.min(...vals),
      played: hs.length, last_result: last.note, updated_at: new Date().toISOString(),
    })
    for (const x of hs)
      histRows.push({ team_id: t, league_code: code, league_id: leagueId, season: cur, match_date: x.date, idx: x.idx, change: x.change, note: x.note })
  }
  for (let i = 0; i < latestRows.length; i += 200)
    await supabase.from('team_index_latest').upsert(latestRows.slice(i, i + 200), { onConflict: 'team_id' })
  for (let i = 0; i < histRows.length; i += 500)
    await supabase.from('team_index_history').upsert(histRows.slice(i, i + 500), { onConflict: 'team_id,season,match_date' })

  return { league: code, teams: teams.length, historyRows: histRows.length }
}

async function run() {
  const cur = currentSeason()
  const results = []
  for (const l of LEAGUES) results.push(await processLeague(l.code, l.id, cur))
  return { season: cur, results }
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, ...(await run()) })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
export async function POST() { return GET() }
