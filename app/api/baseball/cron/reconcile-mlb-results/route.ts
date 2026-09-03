// app/api/baseball/cron/reconcile-mlb-results/route.ts
//
// MLB 결과 교차검증 — API-Sports 피드가 멈춘 경기를 MLB 공식 StatsAPI로 확정한다.
//
// ⚠️ 배경 (2026-09-03)
// LAD vs STL (api_match_id 180103, 09-03 02:10Z)이 시작 4.5시간 뒤에도
// "LIVE IN9 5:5"로 남아 있었다. 원인은 우리 크론이 아니라 제공사다.
//   v1.baseball.api-sports.io/games?id=180103 → status IN9, 5:5, extra null
// 실제 결과는 10회 연장에서 세인트루이스 8:6 승리.
// MLB 공식 StatsAPI에는 정확히 들어 있었다.
//   statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-09-02
//   → "Final", St. Louis Cardinals 8 : 6 Los Angeles Dodgers
//
// StatsAPI는 무료·무인증이고 gameDate가 우리 match_timestamp와 그대로 일치한다.
// 팀명은 구두점만 다르므로(St.Louis / St. Louis) 정규화 매칭으로 30/30 붙는다.
//
// ⚠️ MLB 전용이다. KBO/NPB/CPBL은 동급의 공개 공식 API가 없어
//    lib/baseballStatus.ts의 STALE(결과 확인중) 표시로만 방어한다.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { FINISHED_STATUSES_ARRAY } from '@/lib/baseballStatus'

export const maxDuration = 300
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const STATSAPI = 'https://statsapi.mlb.com/api/v1/schedule'

/** 팀명 정규화 — 'St.Louis Cardinals' / 'St. Louis Cardinals' → 'stlouiscardinals' */
const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

const ymd = (d: Date) => d.toISOString().slice(0, 10)

type Resolved = {
  status: 'FT' | 'PST' | 'CANC'
  homeScore: number | null
  awayScore: number | null
  homeHits: number | null
  awayHits: number | null
  homeErrors: number | null
  awayErrors: number | null
  inning: any
  gameDateMs: number
  detail: string
}

/** StatsAPI linescore → 우리 DB inning 컬럼 형식 {home:{"1":..,"extra":n}, away:{...}} */
function toInningColumn(linescore: any) {
  const innings = linescore?.innings
  if (!Array.isArray(innings) || innings.length === 0) return null
  const out: any = { home: {}, away: {} }
  let homeExtra = 0
  let awayExtra = 0
  let hasExtra = false
  for (const inn of innings) {
    const n = Number(inn?.num)
    if (!Number.isFinite(n)) continue
    const h = inn?.home?.runs ?? null
    const a = inn?.away?.runs ?? null
    if (n <= 9) {
      out.home[String(n)] = h
      out.away[String(n)] = a
    } else {
      hasExtra = true
      homeExtra += Number(h ?? 0)
      awayExtra += Number(a ?? 0)
    }
  }
  out.home.extra = hasExtra ? homeExtra : null
  out.away.extra = hasExtra ? awayExtra : null
  return out
}

async function fetchOfficial(startDate: string, endDate: string) {
  const url = `${STATSAPI}?sportId=1&startDate=${startDate}&endDate=${endDate}&hydrate=linescore`
  const res = await fetch(url, { signal: AbortSignal.timeout(20000), cache: 'no-store' })
  if (!res.ok) throw new Error(`StatsAPI ${res.status}`)
  const data = await res.json()

  // key: 'awaynorm|homenorm' → 후보 경기들 (더블헤더 대비 배열)
  const index = new Map<string, Resolved[]>()
  for (const day of data?.dates || []) {
    for (const g of day?.games || []) {
      const abstract = g?.status?.abstractGameState
      const detailed = String(g?.status?.detailedState || '')
      let status: Resolved['status'] | null = null
      if (abstract === 'Final') {
        status = /cancel/i.test(detailed) ? 'CANC' : 'FT'
      } else if (/postpon/i.test(detailed)) {
        status = 'PST'
      } else if (/cancel/i.test(detailed)) {
        status = 'CANC'
      }
      if (!status) continue // 아직 안 끝난 경기는 건드리지 않는다

      const away = g?.teams?.away?.team?.name
      const home = g?.teams?.home?.team?.name
      if (!away || !home) continue

      const ls = g?.linescore || {}
      const entry: Resolved = {
        status,
        homeScore: g?.teams?.home?.score ?? ls?.teams?.home?.runs ?? null,
        awayScore: g?.teams?.away?.score ?? ls?.teams?.away?.runs ?? null,
        homeHits: ls?.teams?.home?.hits ?? null,
        awayHits: ls?.teams?.away?.hits ?? null,
        homeErrors: ls?.teams?.home?.errors ?? null,
        awayErrors: ls?.teams?.away?.errors ?? null,
        inning: toInningColumn(ls),
        gameDateMs: new Date(g?.gameDate).getTime(),
        detail: detailed,
      }
      const key = `${norm(away)}|${norm(home)}`
      const list = index.get(key) || []
      list.push(entry)
      index.set(key, list)
    }
  }
  return index
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    source: 'MLB StatsAPI (statsapi.mlb.com) — 무료·무인증',
    scope: 'MLB만. KBO/NPB/CPBL은 공개 공식 API가 없어 STALE 표시로만 방어',
    usage: {
      run: 'POST {} — 최근 72시간 중 미확정 MLB 경기 보정',
      dryRun: 'POST { "dryRun": true }',
      widen: 'POST { "hoursBack": 168, "minElapsedH": 3 }',
    },
    note: 'pg_cron에서 30분~1시간 주기 권장. update-results 직후에 도는 것이 이상적.',
  })
}

export async function POST(request: NextRequest) {
  const started = Date.now()
  let body: any = {}
  try { body = await request.json() } catch { body = {} }
  const {
    hoursBack = 72,     // 얼마나 과거까지 훑을지
    minElapsedH = 3,    // 시작 후 N시간 지난 경기만 (진행 중 경기 오확정 방지)
    dryRun = false,
  } = body

  const now = Date.now()
  const from = new Date(now - hoursBack * 3600_000)
  const until = new Date(now - minElapsedH * 3600_000)

  // 1) 아직 확정되지 않은 MLB 경기
  const { data: stuck, error } = await supabase
    .from('baseball_matches')
    .select('id, api_match_id, match_timestamp, home_team, away_team, status, home_score, away_score')
    .eq('league', 'MLB')
    .not('status', 'in', `(${FINISHED_STATUSES_ARRAY.join(',')})`)
    .gte('match_timestamp', from.toISOString())
    .lte('match_timestamp', until.toISOString())
    .order('match_timestamp', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  if (!stuck || stuck.length === 0) {
    return NextResponse.json({
      success: true, message: '보정할 미확정 MLB 경기 없음', checked: 0,
      window: { from: from.toISOString(), until: until.toISOString() },
      duration: `${Math.round((Date.now() - started) / 1000)}s`,
    })
  }

  // 2) 공식 결과 조회 (StatsAPI는 현지 날짜 기준이라 하루씩 여유를 둔다)
  let official: Map<string, Resolved[]>
  try {
    official = await fetchOfficial(ymd(new Date(from.getTime() - 86400_000)), ymd(new Date(now + 86400_000)))
  } catch (e: any) {
    return NextResponse.json({ success: false, error: `StatsAPI 조회 실패: ${e?.message}` }, { status: 502 })
  }

  // 3) 매칭 후 반영
  const updated: any[] = []
  const unmatched: any[] = []

  for (const m of stuck) {
    const key = `${norm(m.away_team)}|${norm(m.home_team)}`
    const cands = official.get(key)
    if (!cands || cands.length === 0) {
      unmatched.push({ api_match_id: m.api_match_id, teams: `${m.away_team} @ ${m.home_team}`, reason: '공식 일정에서 미발견(또는 아직 미종료)' })
      continue
    }
    // 더블헤더 대비 — 시작 시각이 가장 가까운 경기 (6시간 이내만 인정)
    const ts = new Date(m.match_timestamp).getTime()
    const best = cands.reduce((a, b) => (Math.abs(a.gameDateMs - ts) <= Math.abs(b.gameDateMs - ts) ? a : b))
    if (Math.abs(best.gameDateMs - ts) > 6 * 3600_000) {
      unmatched.push({ api_match_id: m.api_match_id, teams: `${m.away_team} @ ${m.home_team}`, reason: '시작 시각 불일치' })
      continue
    }

    const patch: any = { status: best.status }
    if (best.status === 'FT') {
      patch.home_score = best.homeScore
      patch.away_score = best.awayScore
      if (best.homeHits != null) patch.home_hits = best.homeHits
      if (best.awayHits != null) patch.away_hits = best.awayHits
      if (best.homeErrors != null) patch.home_errors = best.homeErrors
      if (best.awayErrors != null) patch.away_errors = best.awayErrors
      if (best.inning) patch.inning = best.inning
    }

    const before = `${m.status} ${m.home_score}:${m.away_score}`
    const after = `${best.status} ${best.homeScore}:${best.awayScore}`

    if (!dryRun) {
      const { error: upErr } = await supabase
        .from('baseball_matches')
        .update(patch)
        .eq('api_match_id', m.api_match_id)
      if (upErr) {
        unmatched.push({ api_match_id: m.api_match_id, reason: `update 실패: ${upErr.message}` })
        continue
      }
    }
    updated.push({
      api_match_id: m.api_match_id,
      teams: `${m.away_team} @ ${m.home_team}`,
      before, after, detail: best.detail,
    })
  }

  return NextResponse.json({
    success: true,
    dryRun,
    window: { from: from.toISOString(), until: until.toISOString() },
    checked: stuck.length,
    fixed: updated.length,
    updated,
    unmatched,
    duration: `${Math.round((Date.now() - started) / 1000)}s`,
  })
}
