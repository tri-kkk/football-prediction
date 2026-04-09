// app/api/baseball/cron/sync-mlb-team-stats/route.ts
// MLB 팀 시즌 타격/투구 통계 수집 (statsapi.mlb.com — 무료, 인증 불필요)
//
// GET /api/baseball/cron/sync-mlb-team-stats                → 현재 시즌
// GET /api/baseball/cron/sync-mlb-team-stats?season=2026
// GET /api/baseball/cron/sync-mlb-team-stats?dry=true       → DB 업데이트 안 함
//
// 데이터 소스:
//   - 타격: https://statsapi.mlb.com/api/v1/teams/stats?stats=season&group=hitting&season={Y}&sportId=1
//   - 투구: https://statsapi.mlb.com/api/v1/teams/stats?stats=season&group=pitching&season={Y}&sportId=1
//
// Supabase Cron 추천 스케줄: 매일 14:00 KST (경기 종료 후, MLB 기준 전날 밤)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ===================================================================
// 팀명 매핑 — MLB StatsAPI 이름을 DB 표준명으로
// (대부분 동일하지만 Oakland Athletics, Cleveland Indians 레거시 대응)
// ===================================================================
const MLB_NAME_MAP: Record<string, string> = {
  'Oakland Athletics': 'Athletics',
  'Cleveland Indians': 'Cleveland Guardians',
}

function normalizeMlbTeamName(name: string): string {
  return MLB_NAME_MAP[name] || name
}

// DB 조회용 alias (구/신 이름 모두 검색)
const MLB_ALIASES: Record<string, string[]> = {
  'Athletics': ['Athletics', 'Oakland Athletics'],
  'Cleveland Guardians': ['Cleveland Guardians', 'Cleveland Indians'],
}

function toNum(val: any): number | null {
  if (val == null || val === '' || val === '-' || val === '-.---') return null
  // MLB API는 ".265" 같은 leading-dot 형식 사용 — parseFloat이 처리 가능
  const n = parseFloat(String(val))
  return isNaN(n) ? null : n
}

function toInt(val: any): number | null {
  if (val == null || val === '') return null
  const n = parseInt(String(val), 10)
  return isNaN(n) ? null : n
}

// ===================================================================
// MLB StatsAPI fetch
// ===================================================================
interface TeamHittingStats {
  teamName: string
  avg: number | null
  obp: number | null
  slg: number | null
  ops: number | null
  hr: number | null
  atBats: number | null
  hits: number | null
  runs: number | null
  rbi: number | null
  games: number | null
}

interface TeamPitchingStats {
  teamName: string
  era: number | null
  whip: number | null
  oppAvg: number | null
  ip: string | null
  strikeouts: number | null
  walks: number | null
  earnedRuns: number | null
}

async function fetchMlbHitting(season: string): Promise<TeamHittingStats[]> {
  const url = `https://statsapi.mlb.com/api/v1/teams/stats?stats=season&group=hitting&season=${season}&sportId=1`
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`MLB hitting API ${res.status}`)
  const data = await res.json()
  const splits = data?.stats?.[0]?.splits ?? []

  const result: TeamHittingStats[] = []
  for (const s of splits) {
    const rawName = s?.team?.name
    if (!rawName) continue
    const teamName = normalizeMlbTeamName(rawName)
    const stat = s.stat ?? {}
    result.push({
      teamName,
      avg: toNum(stat.avg),
      obp: toNum(stat.obp),
      slg: toNum(stat.slg),
      ops: toNum(stat.ops),
      hr: toInt(stat.homeRuns),
      atBats: toInt(stat.atBats),
      hits: toInt(stat.hits),
      runs: toInt(stat.runs),
      rbi: toInt(stat.rbi),
      games: toInt(stat.gamesPlayed),
    })
  }
  return result
}

async function fetchMlbPitching(season: string): Promise<TeamPitchingStats[]> {
  const url = `https://statsapi.mlb.com/api/v1/teams/stats?stats=season&group=pitching&season=${season}&sportId=1`
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`MLB pitching API ${res.status}`)
  const data = await res.json()
  const splits = data?.stats?.[0]?.splits ?? []

  const result: TeamPitchingStats[] = []
  for (const s of splits) {
    const rawName = s?.team?.name
    if (!rawName) continue
    const teamName = normalizeMlbTeamName(rawName)
    const stat = s.stat ?? {}
    result.push({
      teamName,
      era: toNum(stat.era),
      whip: toNum(stat.whip),
      // pitching group의 'avg'는 피안타율 (opposing batting average)
      oppAvg: toNum(stat.avg),
      ip: stat.inningsPitched ?? null,
      strikeouts: toInt(stat.strikeOuts),
      walks: toInt(stat.baseOnBalls),
      earnedRuns: toInt(stat.earnedRuns),
    })
  }
  return result
}

// ===================================================================
// DB 저장 — baseball_team_season_stats 테이블에 upsert
// ===================================================================
async function upsertTeamStats(
  season: string,
  hitting: TeamHittingStats[],
  pitching: TeamPitchingStats[],
) {
  // 팀별로 병합
  const merged = new Map<string, {
    team: string
    hit?: TeamHittingStats
    pit?: TeamPitchingStats
  }>()

  for (const h of hitting) {
    merged.set(h.teamName, { team: h.teamName, hit: h })
  }
  for (const p of pitching) {
    const prev = merged.get(p.teamName)
    if (prev) prev.pit = p
    else merged.set(p.teamName, { team: p.teamName, pit: p })
  }

  let updated = 0
  let errors = 0

  for (const { team, hit, pit } of merged.values()) {
    const aliases = MLB_ALIASES[team] || [team]

    const payload: Record<string, any> = {
      team_name: team,
      season,
      league: 'MLB',
      team_stats_updated_at: new Date().toISOString(),
    }

    if (hit) {
      payload.team_avg = hit.avg
      payload.team_obp = hit.obp
      payload.team_slg = hit.slg
      payload.team_ops = hit.ops
      payload.team_hr = hit.hr
      payload.team_at_bats = hit.atBats
      payload.team_hits_total = hit.hits
      payload.team_runs_total = hit.runs
      payload.team_rbi = hit.rbi
    }
    if (pit) {
      payload.team_era_real = pit.era
      payload.team_whip = pit.whip
      payload.team_opp_avg = pit.oppAvg
      payload.team_innings_pitched = pit.ip
      payload.team_k = pit.strikeouts
      payload.team_bb = pit.walks
    }

    // 기존 row 확인 (league+season+team_name 기준, alias 포함 검색)
    const { data: existing } = await supabase
      .from('baseball_team_season_stats')
      .select('id, team_name')
      .eq('league', 'MLB')
      .eq('season', season)
      .in('team_name', aliases)
      .limit(1)
      .maybeSingle()

    let err: any = null
    if (existing) {
      const { error } = await supabase
        .from('baseball_team_season_stats')
        .update(payload)
        .eq('id', existing.id)
      err = error
    } else {
      const { error } = await supabase
        .from('baseball_team_season_stats')
        .insert(payload)
      err = error
    }

    if (err) {
      console.error(`  ❌ ${team}:`, err.message)
      errors++
    } else {
      console.log(
        `  ✅ ${team}: AVG ${hit?.avg ?? '-'} / OPS ${hit?.ops ?? '-'} / ERA ${pit?.era ?? '-'} / WHIP ${pit?.whip ?? '-'}`,
      )
      updated++
    }
  }

  return { updated, errors, total: merged.size }
}

// ===================================================================
// GET 핸들러
// ===================================================================
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization') || ''
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const isDry = searchParams.get('dry') === 'true'
  // MLB 시즌은 UTC 기준 현재 연도 사용 (스프링 트레이닝 ~ 10월)
  const season = searchParams.get('season') || String(new Date().getUTCFullYear())

  console.log(`\n⚾ MLB 팀 시즌 스탯 수집 시작 — season=${season}${isDry ? ' (dry)' : ''}`)

  try {
    const [hitting, pitching] = await Promise.all([
      fetchMlbHitting(season).catch(e => {
        console.error('  ❌ Hitting fetch 실패:', e.message)
        return [] as TeamHittingStats[]
      }),
      fetchMlbPitching(season).catch(e => {
        console.error('  ❌ Pitching fetch 실패:', e.message)
        return [] as TeamPitchingStats[]
      }),
    ])

    console.log(`  📊 hitting ${hitting.length}팀, pitching ${pitching.length}팀`)

    if (hitting.length === 0 && pitching.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data from MLB StatsAPI',
        season,
      }, { status: 502 })
    }

    if (isDry) {
      return NextResponse.json({
        success: true,
        dry: true,
        season,
        hittingRows: hitting.length,
        pitchingRows: pitching.length,
        hittingSample: hitting[0] ?? null,
        pitchingSample: pitching[0] ?? null,
      })
    }

    const result = await upsertTeamStats(season, hitting, pitching)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`⏱️ 완료 (${elapsed}s): ${result.updated}/${result.total} 업데이트, 에러 ${result.errors}`)

    return NextResponse.json({
      success: true,
      season,
      hittingRows: hitting.length,
      pitchingRows: pitching.length,
      ...result,
      elapsed: `${elapsed}s`,
    })
  } catch (error: any) {
    console.error('❌ sync-mlb-team-stats 에러:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
