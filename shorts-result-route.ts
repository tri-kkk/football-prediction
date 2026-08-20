// app/api/admin/shorts-result/route.ts
//
// 어제 성적표(숏폼 포맷 B) 데이터 API.
//
//   GET /api/admin/shorts-result?sport=football&group=euro
//   GET /api/admin/shorts-result?sport=baseball&league=KBO
//
// ⚠ 설계 원칙
// 보여줄 경기는 포맷 A(shorts-daily)와 **완전히 동일한 선정 규칙**으로 뽑는다.
// 결과를 보고 나서 고르면 이긴 경기만 보여주게 된다.
// 같은 기준을 어제 데이터에 그대로 적용해야 "어제 우리가 고른 픽의 결과" 가 된다.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TEAM_NAME_KR } from '@/app/teamLogos'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── 리그 ─────────────────────────────────────────────────
// 승패 기준 적중률 70% 이상이 확인된 리그만 쓴다.
// K리그(42%) · J리그(62%) 는 제외. 자세한 근거는 SHORTS_STORYLINE_SPEC.md 부록2.
const EURO_CODES = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'DED', 'PPL', 'CL', 'EL', 'UECL']

const LEAGUE_GROUPS: Record<string, { label: string; codes: string[] }> = {
  euro: { label: '유럽 축구', codes: EURO_CODES },
  kleague: { label: 'K리그', codes: ['KL1', 'KL2'] },
  jleague: { label: 'J리그', codes: ['J1', 'J2'] },
}

const LEAGUE_LABEL: Record<string, string> = {
  PL: '프리미어리그', PD: '라리가', SA: '세리에A', BL1: '분데스리가',
  FL1: '리그1', DED: '에레디비시', PPL: '프리메이라리가',
  CL: '챔피언스리그', EL: '유로파리그', UECL: '컨퍼런스리그',
  KL1: 'K리그1', KL2: 'K리그2', J1: 'J1리그', J2: 'J2리그',
  KBO: 'KBO', NPB: 'NPB', MLB: 'MLB',
}

const LEAGUE_API_ID: Record<string, number> = {
  PL: 39, PD: 140, SA: 135, BL1: 78, FL1: 61, DED: 88, PPL: 94,
  CL: 2, EL: 3, UECL: 848, KL1: 292, KL2: 293, J1: 98, J2: 99,
}

const leagueLogo = (code: string) => {
  const id = LEAGUE_API_ID[code]
  return id ? `https://media.api-sports.io/football/leagues/${id}.png` : ''
}

// 포맷 A 와 같은 값을 쓴다. 한쪽만 바꾸면 성적표가 실제 픽과 어긋난다.
const MIN_PROBABILITY = 60
const MAX_PER_LEAGUE = 2
const MIN_COUNT = 3
const MAX_COUNT = 5

const ko = (name: string) => TEAM_NAME_KR[name] || name

function dayRangeKST(offsetDays: number) {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 3600_000)
  kst.setUTCDate(kst.getUTCDate() + offsetDays)

  const y = kst.getUTCFullYear()
  const m = kst.getUTCMonth()
  const d = kst.getUTCDate()

  return {
    start: new Date(Date.UTC(y, m, d, 0, 0, 0) - 9 * 3600_000).toISOString(),
    end: new Date(Date.UTC(y, m, d, 23, 59, 59) - 9 * 3600_000).toISOString(),
    dateLabel: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
  }
}

/** 포맷 A(shorts-daily) 의 selectPicks 와 동일한 로직 */
function selectPicks<T extends { league: string; probability: number }>(rows: T[], count: number): T[] {
  const tryPick = (minProb: number, maxPerLeague: number): T[] => {
    const sorted = rows.filter((r) => r.probability >= minProb).sort((a, b) => b.probability - a.probability)
    const perLeague: Record<string, number> = {}
    const out: T[] = []
    for (const r of sorted) {
      if (out.length >= count) break
      const used = perLeague[r.league] || 0
      if (used >= maxPerLeague) continue
      perLeague[r.league] = used + 1
      out.push(r)
    }
    return out
  }

  let picked = tryPick(MIN_PROBABILITY, MAX_PER_LEAGUE)
  if (picked.length >= count) return picked
  picked = tryPick(MIN_PROBABILITY, count)
  if (picked.length >= count) return picked
  picked = tryPick(55, count)
  if (picked.length >= count) return picked
  return tryPick(0, count)
}

/**
 * 누적 적중률 — **승패가 갈린 경기 기준**.
 *
 * 모델이 무승부를 전혀 예측하지 않기 때문에(807경기 중 무승부 176건 적중 0),
 * 3-way 로 계산하면 구조적으로 낮게 나온다.
 * 승패 결정 경기만으로 계산하고, 화면에는 그 기준을 반드시 병기한다.
 */
async function cumulativeAccuracy(codes: string[]) {
  const { data, error } = await supabase
    .from('pick_recommendations')
    .select('is_correct, actual_result')
    .in('league_code', codes)
    .not('is_correct', 'is', null)

  if (error || !data) return null

  const decisive = data.filter((r) => r.actual_result !== 'DRAW')
  const correct = decisive.filter((r) => r.is_correct === true).length
  const drawCount = data.length - decisive.length

  return {
    decisive: decisive.length,
    correct,
    accuracy: decisive.length ? Math.round((correct / decisive.length) * 100) : 0,
    drawCount,
    drawRate: data.length ? Math.round((drawCount / data.length) * 100) : 0,
  }
}

// ── 축구 ─────────────────────────────────────────────────
async function football(groupKey: string, origin: string) {
  const group = LEAGUE_GROUPS[groupKey]
  if (!group) throw new Error(`알 수 없는 리그 그룹: ${groupKey}`)

  const { start, end, dateLabel } = dayRangeKST(-1)

  const { data, error } = await supabase
    .from('pick_recommendations')
    .select(
      'match_id, league_code, home_team, away_team, commence_time, pick_result, pick_probability, ' +
        'actual_result, final_score_home, final_score_away, is_correct, home_team_logo, away_team_logo'
    )
    .in('league_code', group.codes)
    .gte('commence_time', start)
    .lte('commence_time', end)
    .not('is_correct', 'is', null)

  if (error) throw error

  // 로고 보강 — pick_recommendations 에 없으면 match_odds_latest 에서
  const ids = (data || []).map((r) => r.match_id).filter(Boolean)
  const logoByMatch = new Map<string, { home: string; away: string }>()
  if (ids.length) {
    const { data: odds } = await supabase
      .from('match_odds_latest')
      .select('match_id, home_team_logo, away_team_logo')
      .in('match_id', ids)
    for (const m of odds || []) {
      logoByMatch.set(String(m.match_id), {
        home: m.home_team_logo || '',
        away: m.away_team_logo || '',
      })
    }
  }

  const pct = (v: any) => {
    if (v == null) return 0
    const n = Number(v)
    return Math.round(n <= 1 ? n * 100 : n)
  }

  const rows = (data || [])
    .filter((r) => r.pick_probability != null && r.pick_result)
    .map((r) => {
      const side = String(r.pick_result).toUpperCase() as 'HOME' | 'DRAW' | 'AWAY'
      const actual = String(r.actual_result || '').toUpperCase()
      const lg = logoByMatch.get(String(r.match_id))
      return {
        matchId: r.match_id,
        league: r.league_code,
        leagueLabel: LEAGUE_LABEL[r.league_code] || r.league_code,
        leagueLogo: leagueLogo(r.league_code),
        home: { name: ko(r.home_team), logo: lg?.home || r.home_team_logo || '' },
        away: { name: ko(r.away_team), logo: lg?.away || r.away_team_logo || '' },
        homeScore: r.final_score_home ?? null,
        awayScore: r.final_score_away ?? null,
        pickSide: side,
        pickTeam: side === 'HOME' ? ko(r.home_team) : side === 'AWAY' ? ko(r.away_team) : '무승부',
        probability: pct(r.pick_probability),
        isCorrect: r.is_correct === true,
        // 무승부는 예측 대상 자체가 아니었다. 성적표에서 ❌ 와 구분해 표시한다.
        isDraw: actual === 'DRAW',
      }
    })

  const count = Math.max(MIN_COUNT, Math.min(MAX_COUNT, rows.filter((r) => r.probability >= MIN_PROBABILITY).length))
  const results = selectPicks(rows, count)

  const correct = results.filter((r) => r.isCorrect).length
  const draws = results.filter((r) => r.isDraw).length

  return {
    date: dateLabel,
    sport: 'football' as const,
    groupLabel: group.label,
    results,
    summary: {
      total: results.length,
      correct,
      draws,
      accuracy: results.length ? Math.round((correct / results.length) * 100) : 0,
    },
    cumulative: await cumulativeAccuracy(group.codes),
  }
}

// ── 야구 ─────────────────────────────────────────────────
// 야구는 pick_recommendations 를 쓰지 않는다.
// baseball_matches + baseball_odds_latest 를 대조하는 전용 API 가 이미 있다.
async function baseball(league: string, origin: string) {
  const { dateLabel } = dayRangeKST(-1)

  const r = await fetch(
    `${origin}/api/baseball/prediction-results?league=${encodeURIComponent(league)}&days=2&limit=20`,
    { cache: 'no-store' }
  )
  if (!r.ok) throw new Error(`baseball prediction-results ${r.status}`)
  const j = await r.json()

  const recent: any[] = Array.isArray(j?.recent) ? j.recent : []
  const yesterday = recent.filter((g) => g.date === dateLabel)
  const pool = yesterday.length ? yesterday : recent.slice(0, MAX_COUNT)

  const results = pool.slice(0, MAX_COUNT).map((g) => ({
    matchId: g.matchId,
    league: g.league,
    leagueLabel: LEAGUE_LABEL[g.league] || g.league,
    leagueLogo: '',
    home: { name: g.homeTeam, logo: g.homeTeamLogo || '' },
    away: { name: g.awayTeam, logo: g.awayTeamLogo || '' },
    homeScore: g.homeScore,
    awayScore: g.awayScore,
    pickSide: (g.predicted === 'home' ? 'HOME' : 'AWAY') as 'HOME' | 'AWAY',
    pickTeam: g.pickedTeam,
    probability: g.confidence ?? 0,
    isCorrect: !!g.correct,
    isDraw: false, // 야구는 무승부 없음 (동점 경기는 API 단계에서 제외됨)
  }))

  const correct = results.filter((x) => x.isCorrect).length

  return {
    date: dateLabel,
    sport: 'baseball' as const,
    groupLabel: LEAGUE_LABEL[league] || league,
    results,
    summary: {
      total: results.length,
      correct,
      draws: 0,
      accuracy: results.length ? Math.round((correct / results.length) * 100) : 0,
    },
    cumulative: {
      decisive: j?.total ?? 0,
      correct: j?.correct ?? 0,
      accuracy: j?.accuracy ?? 0,
      drawCount: 0,
      drawRate: 0,
    },
  }
}

// ── 핸들러 ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sport = (searchParams.get('sport') || 'football').toLowerCase()

  try {
    const payload =
      sport === 'baseball'
        ? await baseball((searchParams.get('league') || 'KBO').toUpperCase(), request.nextUrl.origin)
        : await football((searchParams.get('group') || 'euro').toLowerCase(), request.nextUrl.origin)

    return NextResponse.json({ success: true, ...payload })
  } catch (e: any) {
    console.error('[shorts-result]', e)
    return NextResponse.json(
      { success: false, error: String(e?.message || e), results: [] },
      { status: 500 }
    )
  }
}
