// app/api/baseball/cron/sync-mlb-pitchers-actual/route.ts
// MLB 완료경기의 "실제 선발투수" + 시즌 ERA/WHIP/K 자동 채움 (학습 데이터용)
//
// 배경: collect-mlb-pitchers 는 probablePitcher(예고선발) 기반이라 경기 전 upcoming 만 채움.
//       mlb_game_pk 는 수동 백필 스크립트(END_DATE 2026-03-10)로만 채워져 상시 갱신이 없었음.
//       → 정규시즌 완료경기에 game_pk/투수가 비어 투수 피처가 말랐던 문제를 영구 해결.
//
// 동작: 최근 N일 완료(FT) MLB 경기 중 game_pk 또는 home_pitcher_era 가 비어있는 것을
//       statsapi schedule(±1일 매칭)로 gamePk 복구 → boxscore 에서 실제 선발 + 시즌스탯 추출 → update.
//
// GET /api/baseball/cron/sync-mlb-pitchers-actual           → 최근 5일
// GET /api/baseball/cron/sync-mlb-pitchers-actual?days=10
// GET /api/baseball/cron/sync-mlb-pitchers-actual?dry=true  → DB 업데이트 안 함
//
// Supabase Cron 추천: 매일 1회 (완료경기 정산 후). 예: 16:00 UTC (01:00 KST)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 우리 DB 팀명 → statsapi 팀명 (예외만)
const TEAM_NORM: Record<string, string> = {
  'St.Louis Cardinals': 'St. Louis Cardinals',
  'Oakland Athletics': 'Athletics',
}
const norm = (t: string) => TEAM_NORM[t] ?? t

function parseFloatSafe(x: unknown): number | null {
  const f = parseFloat(String(x))
  return Number.isFinite(f) ? f : null
}

function shiftDate(d: string, n: number): string {
  const dt = new Date(d + 'T00:00:00Z')
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().split('T')[0]
}

interface Starter {
  name: string | null
  era: number | null
  whip: number | null
  k: number | null
}

async function getScheduleMap(date: string): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  try {
    const res = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return map
    const data = await res.json()
    for (const day of data.dates ?? []) {
      for (const g of day.games ?? []) {
        const h = g.teams?.home?.team?.name
        const a = g.teams?.away?.team?.name
        if (h && a && g.gamePk) map.set(`${h}|${a}`, g.gamePk)
      }
    }
  } catch {
    /* ignore */
  }
  return map
}

async function getBoxscoreStarters(
  gamePk: number
): Promise<{ home: Starter | null; away: Starter | null }> {
  try {
    const res = await fetch(
      `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`,
      { cache: 'no-store' }
    )
    if (!res.ok) return { home: null, away: null }
    const data = await res.json()
    const out: { home: Starter | null; away: Starter | null } = { home: null, away: null }
    for (const side of ['home', 'away'] as const) {
      const t = data.teams?.[side]
      const pitchers: number[] = t?.pitchers ?? []
      if (!pitchers.length) continue
      const p = t.players?.[`ID${pitchers[0]}`]
      const ss = p?.seasonStats?.pitching ?? {}
      out[side] = {
        name: p?.person?.fullName ?? null,
        era: parseFloatSafe(ss.era),
        whip: parseFloatSafe(ss.whip),
        k: typeof ss.strikeOuts === 'number' ? ss.strikeOuts : parseFloatSafe(ss.strikeOuts),
      }
    }
    return out
  } catch {
    return { home: null, away: null }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '5', 10), 1), 14)
    const dry = searchParams.get('dry') === 'true'

    const today = new Date()
    const from = new Date(today)
    from.setDate(from.getDate() - days)
    const fromStr = from.toISOString().split('T')[0]

    // 완료(FT) MLB 경기 중 game_pk 또는 투수 ERA 가 비어있는 것
    const { data: matches, error } = await supabase
      .from('baseball_matches')
      .select('api_match_id, match_date, home_team, away_team, mlb_game_pk, home_pitcher_era')
      .eq('league', 'MLB')
      .eq('status', 'FT')
      .gte('match_date', fromStr)
      .or('mlb_game_pk.is.null,home_pitcher_era.is.null')

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    if (!matches || matches.length === 0) {
      return NextResponse.json({ success: true, processed: 0, updated: 0, message: '채울 경기 없음' })
    }

    // 필요한 날짜(±1일 포함) schedule 캐시
    const neededDates = new Set<string>()
    for (const m of matches) {
      for (const off of [-1, 0, 1]) neededDates.add(shiftDate(m.match_date, off))
    }
    const schedCache = new Map<string, Map<string, number>>()
    for (const d of neededDates) schedCache.set(d, await getScheduleMap(d))

    let updated = 0
    let resolvedPk = 0
    let pitcherFilled = 0
    const failures: string[] = []

    for (const m of matches) {
      const h = norm(m.home_team)
      const a = norm(m.away_team)

      // gamePk 결정 (기존 값 우선, 없으면 ±1일 매칭)
      let gamePk: number | null = m.mlb_game_pk ?? null
      if (!gamePk) {
        for (const off of [0, -1, 1]) {
          const d = shiftDate(m.match_date, off)
          const pk = schedCache.get(d)?.get(`${h}|${a}`)
          if (pk) {
            gamePk = pk
            resolvedPk++
            break
          }
        }
      }
      if (!gamePk) {
        failures.push(`${m.match_date} ${h} vs ${a}`)
        continue
      }

      const { home, away } = await getBoxscoreStarters(gamePk)

      const updateData: Record<string, unknown> = { mlb_game_pk: gamePk }
      if (home?.name) {
        updateData.home_starting_pitcher = home.name
        if (home.era !== null) updateData.home_pitcher_era = home.era
        if (home.whip !== null) updateData.home_pitcher_whip = home.whip
        if (home.k !== null) updateData.home_pitcher_k = home.k
      }
      if (away?.name) {
        updateData.away_starting_pitcher = away.name
        if (away.era !== null) updateData.away_pitcher_era = away.era
        if (away.whip !== null) updateData.away_pitcher_whip = away.whip
        if (away.k !== null) updateData.away_pitcher_k = away.k
      }
      if (home?.era != null || away?.era != null) pitcherFilled++

      if (!dry && Object.keys(updateData).length > 0) {
        const { error: upErr } = await supabase
          .from('baseball_matches')
          .update(updateData)
          .eq('api_match_id', m.api_match_id)
        if (!upErr) updated++
      }
    }

    return NextResponse.json({
      success: true,
      dry,
      windowDays: days,
      candidates: matches.length,
      gamePkResolved: resolvedPk,
      pitcherFilled,
      updated,
      unmatched: failures.length,
      unmatchedSample: failures.slice(0, 5),
    })
  } catch (err) {
    console.error('sync-mlb-pitchers-actual error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
