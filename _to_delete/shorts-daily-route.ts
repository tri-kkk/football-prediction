// app/api/admin/shorts-daily/route.ts
//
// 데일리 픽 리포트(숏폼 포맷 A) 데이터 API.
//
//   GET /api/admin/shorts-daily?sport=football&group=euro
//   GET /api/admin/shorts-daily?sport=football&group=kleague
//   GET /api/admin/shorts-daily?sport=baseball&league=KBO
//
// 응답은 Remotion DailyPicks 컴포지션의 props 와 1:1 대응한다.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TEAM_NAME_KR, getTeamLogo } from '@/app/teamLogos'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── 리그 그룹 ────────────────────────────────────────────
// 적중률이 검증된 리그만 픽 대상으로 삼는다.
// K리그는 현재 모델 적중률이 낮아 유럽과 섞지 않고 별도 그룹으로 분리한다.
// (섞으면 유럽 리그 픽의 신뢰도까지 같이 깎인다)
const LEAGUE_GROUPS: Record<string, { label: string; codes: string[] }> = {
  euro: {
    label: '유럽 축구',
    codes: ['PL', 'PD', 'SA', 'BL1', 'FL1', 'DED', 'PPL', 'CL', 'EL', 'UECL'],
  },
  kleague: {
    label: 'K리그',
    codes: ['KL1', 'KL2'],
  },
  jleague: {
    label: 'J리그',
    codes: ['J1', 'J2'],
  },
}

const LEAGUE_LABEL: Record<string, string> = {
  PL: '프리미어리그',
  PD: '라리가',
  SA: '세리에A',
  BL1: '분데스리가',
  FL1: '리그1',
  DED: '에레디비시',
  PPL: '프리메이라리가',
  CL: '챔피언스리그',
  EL: '유로파리그',
  UECL: '컨퍼런스리그',
  KL1: 'K리그1',
  KL2: 'K리그2',
  J1: 'J1리그',
  J2: 'J2리그',
  ELC: '챔피언십',
  MLS: 'MLS',
  KBO: 'KBO',
  NPB: 'NPB',
  MLB: 'MLB',
}

// ── 픽 선정 기준 ─────────────────────────────────────────
// 승률 순으로만 뽑으면 매일 같은 강팀만 나와 영상이 똑같아 보인다.
// 그래서 리그 다양성 제약을 건다. 숫자는 여기서만 고치면 된다.
const MIN_PROBABILITY = 60   // 이 확률 미만은 픽으로 안 씀
const MAX_PER_LEAGUE = 2     // 같은 리그에서 최대 몇 개까지
const MIN_COUNT = 2          // 자동 모드 최소 픽 개수
const MAX_COUNT = 5          // 자동 모드 최대 픽 개수

/**
 * 기준을 통과한 픽 수에 따라 영상에 넣을 개수를 정한다.
 * 주말처럼 경기가 많은 날은 5개, 목요일처럼 적은 날은 2~3개.
 */
function autoCount(qualified: number): number {
  return Math.max(MIN_COUNT, Math.min(MAX_COUNT, qualified))
}

function starsFromProbability(p: number): number {
  if (p >= 70) return 5
  if (p >= 62) return 4
  if (p >= 55) return 3
  if (p >= 48) return 2
  return 1
}

function ko(name: string): string {
  return TEAM_NAME_KR[name] || name
}

function logo(name: string): string {
  try {
    return getTeamLogo(name) || ''
  } catch {
    return ''
  }
}

/** KST 기준 오늘(또는 offset 일) 의 UTC 범위 */
function dayRangeKST(offsetDays = 0) {
  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 3600_000)
  kstNow.setUTCDate(kstNow.getUTCDate() + offsetDays)

  const y = kstNow.getUTCFullYear()
  const m = kstNow.getUTCMonth()
  const d = kstNow.getUTCDate()

  // KST 00:00 == UTC 전날 15:00
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0) - 9 * 3600_000)
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59) - 9 * 3600_000)
  const dateLabel = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  return { start: start.toISOString(), end: end.toISOString(), dateLabel }
}

// ── 순위 · 최근 폼 ───────────────────────────────────────
// standings 는 리그당 1회만 호출하면 그 리그 전 팀 데이터가 온다.
// 경기별로 부르지 않도록 리그 단위로 묶어서 가져온다.

export interface TeamContext {
  position: number | null
  points: number | null
  /** 최근 5경기, 최신이 뒤. 'W' | 'D' | 'L' */
  form: string[]
}

// 시즌 개막 직후에는 순위가 정보가 아니라 노이즈다.
// 1~2경기 치른 "13위 · 0점" 은 아무것도 말해주지 않으므로 표시하지 않는다.
const MIN_PLAYED_FOR_RANK = 4

const EMPTY_CONTEXT: TeamContext = { position: null, points: null, form: [] }

/** 팀명 표기 차이를 흡수하기 위한 정규화 */
function normTeam(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/\b(fc|cf|ac|sc|afc|club|de|the)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
}

// API-Football 리그 ID — standings 가 엠블럼을 안 줄 때의 폴백용.
// (standings/route.ts 의 LEAGUES 와 같은 값)
const LEAGUE_API_ID: Record<string, number> = {
  PL: 39, PD: 140, SA: 135, BL1: 78, FL1: 61, DED: 88, PPL: 94,
  CL: 2, EL: 3, UECL: 848, ELC: 40,
  KL1: 292, KL2: 293, J1: 98, J2: 99, MLS: 253,
}

const leagueLogoFallback = (code: string): string => {
  const id = LEAGUE_API_ID[code]
  return id ? `https://media.api-sports.io/football/leagues/${id}.png` : ''
}

interface StandingsResult {
  teams: Map<string, TeamContext>
  /** 리그 코드 → 엠블럼 URL */
  emblems: Map<string, string>
}

async function fetchStandings(leagueCodes: string[], origin: string): Promise<StandingsResult> {
  const teams = new Map<string, TeamContext>()
  const emblems = new Map<string, string>()

  await Promise.all(
    leagueCodes.map(async (code) => {
      // 엠블럼은 먼저 폴백으로 채워두고, standings 가 주면 덮어쓴다
      emblems.set(code, leagueLogoFallback(code))
      try {
        const r = await fetch(`${origin}/api/standings?league=${encodeURIComponent(code)}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        })
        if (!r.ok) return
        const j = await r.json()

        // 리그 엠블럼 — 순위 조회에 이미 들어있어서 추가 호출이 필요 없다
        if (j?.competition?.emblem) emblems.set(code, j.competition.emblem)

        const rows: any[] = Array.isArray(j?.standings) ? j.standings : []
        for (const t of rows) {
          const name = t?.team?.name
          if (!name) continue
          const played = Number(t.playedGames ?? 0)
          const enough = played >= MIN_PLAYED_FOR_RANK
          teams.set(`${code}:${normTeam(name)}`, {
            position: enough ? (t.position ?? null) : null,
            points: enough ? (t.points ?? null) : null,
            // API-Football 의 form 은 'WWDLW' 문자열. 최근 5경기만 쓴다.
            form: String(t.form || '').toUpperCase().split('').filter((c) => 'WDL'.includes(c)).slice(-5),
          })
        }
      } catch {
        // 순위 조회 실패는 치명적이지 않다. 카드에서 해당 줄만 빠진다.
      }
    })
  )

  return { teams, emblems }
}

/**
 * 오늘의 픽 범위 — **지금 이후에 시작하는 경기만**.
 *
 * ⚠ KST 달력 하루(00:00~23:59)로 자르면 안 된다.
 * 유럽 축구는 한국시간 새벽에 열리므로, 아침에 렌더하면
 * "오늘" 안에 이미 끝난 새벽 경기가 포함된다.
 * 끝난 경기를 예측으로 내보내게 되므로 반드시 now 이후만 본다.
 *
 * 위쪽 경계는 30시간. 오늘 밤 경기와 내일 새벽 경기까지 들어온다.
 * (유럽 리그 기준 "오늘 밤 ~ 내일 새벽" 이 한 묶음이다)
 */
function upcomingRange(hours = 30) {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 3600_000)
  return {
    start: now.toISOString(),
    end: new Date(now.getTime() + hours * 3600_000).toISOString(),
    dateLabel: `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`,
  }
}

/** KST 기준 날짜 문자열 (YYYY-MM-DD) */
function kstDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/**
 * 픽들이 실제로 언제 열리는지 보고 화면에 쓸 문구를 정한다.
 * 전부 오늘이면 "오늘", 오늘/내일에 걸치면 "오늘 밤 ~ 내일 새벽".
 */
function windowLabelFor(times: string[], todayLabel: string): string {
  if (times.length === 0) return '오늘'
  const days = new Set(times.map(kstDate))
  if (days.size === 1) return days.has(todayLabel) ? '오늘' : '내일'
  return days.has(todayLabel) ? '오늘 밤 ~ 내일 새벽' : '내일'
}

/**
 * 이번(또는 다가오는) 주말 범위 — 토 00:00 ~ 일 23:59 KST.
 * 금요일에 만드는 주말 프리뷰용. 일요일에 돌리면 진행 중인 주말을 잡는다.
 */
function weekendRangeKST() {
  const nowIso = new Date().toISOString()
  const kst = new Date(Date.now() + 9 * 3600_000)
  const dow = kst.getUTCDay() // 0=일 … 6=토
  const toSat = dow === 0 ? -1 : 6 - dow

  const sat = new Date(kst)
  sat.setUTCDate(sat.getUTCDate() + toSat)
  const y = sat.getUTCFullYear()
  const m = sat.getUTCMonth()
  const d = sat.getUTCDate()

  const satStart = new Date(Date.UTC(y, m, d, 0, 0, 0) - 9 * 3600_000).toISOString()

  return {
    // 주말이 이미 시작됐으면 지금 이후 경기만 본다 (끝난 경기를 픽으로 내보내지 않는다)
    start: satStart > nowIso ? satStart : nowIso,
    // 일요일 23:59 까지
    end: new Date(Date.UTC(y, m, d + 1, 23, 59, 59) - 9 * 3600_000).toISOString(),
    dateLabel: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
  }
}

/**
 * 승률 순 + 리그 다양성 제약으로 픽을 고른다.
 * 기준을 만족하는 게 부족하면 임계값을 단계적으로 낮춘다.
 */
function selectPicks<T extends { league: string; probability: number }>(
  rows: T[],
  count: number
): T[] {
  const tryPick = (minProb: number, maxPerLeague: number): T[] => {
    const sorted = rows
      .filter((r) => r.probability >= minProb)
      .sort((a, b) => b.probability - a.probability)

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

  // 1차: 기준 그대로
  let picked = tryPick(MIN_PROBABILITY, MAX_PER_LEAGUE)
  if (picked.length >= count) return picked

  // 2차: 리그 제약 완화
  picked = tryPick(MIN_PROBABILITY, count)
  if (picked.length >= count) return picked

  // 3차: 확률 기준 완화
  picked = tryPick(55, count)
  if (picked.length >= count) return picked

  // 4차: 남은 것 중 상위
  return tryPick(0, count)
}

// ── 축구 ─────────────────────────────────────────────────
async function football(
  groupKey: string,
  count: number | 'auto',
  origin: string,
  range: 'today' | 'weekend' = 'today'
) {
  const group = LEAGUE_GROUPS[groupKey]
  if (!group) throw new Error(`알 수 없는 리그 그룹: ${groupKey}`)

  const { start, end, dateLabel } =
    range === 'weekend' ? weekendRangeKST() : upcomingRange(30)

  // 오늘 열리는 경기 목록.
  //  - 필터링 서사의 분모(= 실제 경기 수)를 여기서 센다.
  //    pick_recommendations 는 "픽이 생성된 경기"만 담고 있어 분모로 쓸 수 없다.
  //  - 팀 엠블럼도 여기서 가져온다.
  //    teamLogos.ts 의 하드코딩 매핑은 승격팀·신생팀이 빠져 있어 로고가 뜨지 않는다.
  //    사이트가 쓰는 것과 같은 컬럼(home_team_logo)을 그대로 쓰는 게 항상 최신이다.
  const { data: scheduled, error: schedErr } = await supabase
    .from('match_odds_latest')
    .select('match_id, home_team, away_team, home_team_logo, away_team_logo')
    .in('league_code', group.codes)
    .gte('commence_time', start)
    .lte('commence_time', end)

  if (schedErr) throw schedErr

  const logoByMatch = new Map<string, { home: string; away: string }>()
  const logoByTeam = new Map<string, string>()
  for (const m of scheduled || []) {
    logoByMatch.set(String(m.match_id), {
      home: m.home_team_logo || '',
      away: m.away_team_logo || '',
    })
    if (m.home_team && m.home_team_logo) logoByTeam.set(m.home_team, m.home_team_logo)
    if (m.away_team && m.away_team_logo) logoByTeam.set(m.away_team, m.away_team_logo)
  }

  const { data, error } = await supabase
    .from('pick_recommendations')
    .select(
      'match_id, league_code, home_team, away_team, commence_time, pick_result, pick_probability, ' +
        'home_probability, draw_probability, away_probability, home_team_logo, away_team_logo'
    )
    .in('league_code', group.codes)
    .gte('commence_time', start)
    .lte('commence_time', end)
    .order('pick_probability', { ascending: false })

  if (error) throw error

  /** match_odds_latest → pick_recommendations 자체 컬럼 → 하드코딩 매핑 순 */
  const resolveLogo = (r: any, side: 'home' | 'away'): string => {
    const byMatch = logoByMatch.get(String(r.match_id))
    if (byMatch?.[side]) return byMatch[side]
    const own = side === 'home' ? r.home_team_logo : r.away_team_logo
    if (own) return own
    const teamName = side === 'home' ? r.home_team : r.away_team
    const byTeam = logoByTeam.get(teamName)
    if (byTeam) return byTeam
    return logo(teamName)
  }

  const pct = (v: any): number => {
    if (v == null) return 0
    const n = Number(v)
    return Math.round(n <= 1 ? n * 100 : n)
  }

  const base = (data || [])
    .filter((r) => r.pick_probability != null && r.pick_result)
    .map((r) => {
      const probability = pct(r.pick_probability)
      const side = String(r.pick_result).toUpperCase() as 'HOME' | 'DRAW' | 'AWAY'
      return {
        raw: r,
        matchId: r.match_id,
        league: r.league_code,
        leagueLabel: LEAGUE_LABEL[r.league_code] || r.league_code,
        pickSide: side,
        probability,
        // 승/무/패 3-way 분포. 픽 확률 하나만 보여주면 카드가 너무 얇다.
        odds3: {
          home: pct(r.home_probability),
          draw: pct(r.draw_probability),
          away: pct(r.away_probability),
        },
        matchTime: r.commence_time,
      }
    })

  const wanted = count === 'auto'
    ? autoCount(base.filter((r) => r.probability >= MIN_PROBABILITY).length)
    : count

  const selected = selectPicks(base, wanted)

  // 선택된 픽의 리그만 순위를 조회한다 (최대 3~5개 리그)
  const leagues = Array.from(new Set(selected.map((p) => p.league)))
  const standings = await fetchStandings(leagues, origin)
  const ctx = (league: string, teamName: string): TeamContext =>
    standings.teams.get(`${league}:${normTeam(teamName)}`) ?? EMPTY_CONTEXT

  const picks = selected.map((p) => {
    const r = p.raw
    return {
      matchId: p.matchId,
      league: p.league,
      leagueLabel: p.leagueLabel,
      leagueLogo: standings.emblems.get(p.league) || leagueLogoFallback(p.league),
      home: {
        name: ko(r.home_team),
        logo: resolveLogo(r, 'home'),
        ...ctx(p.league, r.home_team),
      },
      away: {
        name: ko(r.away_team),
        logo: resolveLogo(r, 'away'),
        ...ctx(p.league, r.away_team),
      },
      pickSide: p.pickSide,
      pickTeam:
        p.pickSide === 'HOME' ? ko(r.home_team) : p.pickSide === 'AWAY' ? ko(r.away_team) : '무승부',
      probability: p.probability,
      odds3: p.odds3,
      stars: starsFromProbability(p.probability),
      matchTime: p.matchTime,
    }
  })

  return {
    date: dateLabel,
    range,
    windowLabel: range === 'weekend' ? '이번 주말' : windowLabelFor(picks.map((p) => p.matchTime), dateLabel),
    sport: 'football' as const,
    groupLabel: group.label,
    totalMatches: Math.max(scheduled?.length ?? 0, base.length, picks.length),
    picks,
    missingLogos: picks.filter((p) => !p.home.logo || !p.away.logo).length,
    missingStandings: picks.filter((p) => p.home.position == null || p.away.position == null).length,
    // 한글 팀명 매핑이 없어 영문 그대로 나가는 팀. teamLogos.ts 의 TEAM_NAME_KR 에 추가하면 사라진다.
    missingKoNames: Array.from(
      new Set(
        selected.flatMap((p) => {
          const out: string[] = []
          if (TEAM_NAME_KR[p.raw.home_team] == null) out.push(p.raw.home_team)
          if (TEAM_NAME_KR[p.raw.away_team] == null) out.push(p.raw.away_team)
          return out
        })
      )
    ),
  }
}


// ── 야구: 사이트와 같은 소스를 쓴다 ──────────────────────
//
// ⚠ 야구 예측은 두 곳에 있다.
//   baseball_combo_picks        생성 시점에 고정된 스냅샷  ← 사이트 multi-match 가 쓰는 값
//   baseball_odds_latest.ai_*   상세 페이지를 열 때마다 갱신
//
// 후자는 배당이 움직일 때마다 다시 계산되므로, 어제 예측을 오늘 조회하면 값이 달라진다.
// 50% 근처 경기는 픽 방향까지 뒤집힌다. 영상과 사이트가 다른 팀을 추천하면 신뢰가 무너지므로
// 반드시 스냅샷(baseball_combo_picks)을 쓴다.
//
// 저장된 확률 = 배당확률 × 0.6 + 모델 × 0.4 + 투수보정
// (app/api/baseball/cron/generate-combo-picks/route.ts)

interface ComboPick {
  matchId: number
  apiMatchId: number
  homeTeamKo: string
  awayTeamKo: string
  homeLogo: string
  awayLogo: string
  matchTime: string
  pick: 'home' | 'away'
  pickTeamKo: string
  winProb: number
  odds: number
  reason: string
  homeScore?: number | null
  awayScore?: number | null
  isCorrect?: boolean
  matchStatus?: string
}

/**
 * 해당 날짜의 조합 픽을 펼쳐서 경기 단위로 되돌린다.
 * 같은 경기가 여러 조합에 들어가므로 matchId 로 중복을 제거한다.
 */
async function readComboPicks(league: string, dateLabel: string): Promise<ComboPick[]> {
  const { data, error } = await supabase
    .from('baseball_combo_picks')
    .select('picks, pick_date, league')
    .eq('league', league)
    .eq('pick_date', dateLabel)

  if (error) throw error

  const byMatch = new Map<number, ComboPick>()
  for (const combo of data || []) {
    for (const p of (combo.picks as any[]) || []) {
      if (p?.matchId == null) continue
      // 정산된 픽(스코어 있음)을 우선 보관
      const existing = byMatch.get(p.matchId)
      if (!existing || (p.homeScore != null && existing.homeScore == null)) {
        byMatch.set(p.matchId, p as ComboPick)
      }
    }
  }

  return Array.from(byMatch.values())
}

async function baseball(league: string, count: number | 'auto') {
  const { start, end, dateLabel } = dayRangeKST(0)

  const picksRaw = await readComboPicks(league, dateLabel)

  // ⚠ baseball_combo_picks 의 matchTime 은 baseball_matches.match_time 을 그대로 담고 있는데,
  //   이 컬럼은 "18:30" 같은 시각 문자열이라 new Date() 로 파싱되지 않는다 (NaN).
  //   실제 날짜+시각은 match_timestamp 에 있으므로 여기서 다시 붙인다.
  const matchIds = picksRaw.map((p) => p.matchId).filter((v) => v != null)
  const timeById = new Map<number, string>()
  if (matchIds.length) {
    const { data: mrows } = await supabase
      .from('baseball_matches')
      .select('id, match_timestamp, match_date, match_time')
      .in('id', matchIds)
    for (const m of mrows || []) {
      const ts =
        m.match_timestamp ||
        (m.match_date && m.match_time ? `${m.match_date}T${m.match_time}` : m.match_date) ||
        ''
      if (ts) timeById.set(m.id, ts)
    }
  }
  const resolveTime = (p: ComboPick): string => {
    const fromDb = timeById.get(p.matchId)
    if (fromDb) return fromDb
    // 폴백: 그래도 없으면 파싱 가능한 값일 때만 쓴다
    return p.matchTime && !Number.isNaN(new Date(p.matchTime).getTime()) ? p.matchTime : ''
  }

  // 필터링 서사의 분모 — 오늘 그 리그의 전체 경기 수
  const { count: scheduled } = await supabase
    .from('baseball_matches')
    .select('id', { count: 'exact', head: true })
    .eq('league', league)
    .gte('match_timestamp', start)
    .lte('match_timestamp', end)

  // 이미 시작한 경기는 픽에서 뺀다
  const nowMs = Date.now()
  const rows = picksRaw
    .filter((p) => {
      const iso = resolveTime(p)
      if (!iso) return true
      const t = new Date(iso).getTime()
      return Number.isNaN(t) ? true : t > nowMs
    })
    .map((p) => ({
    matchId: p.matchId,
    league,
    leagueLabel: LEAGUE_LABEL[league] || league,
    leagueLogo: '',
    home: { name: p.homeTeamKo, logo: p.homeLogo || '', ...EMPTY_CONTEXT },
    away: { name: p.awayTeamKo, logo: p.awayLogo || '', ...EMPTY_CONTEXT },
    pickSide: (p.pick === 'home' ? 'HOME' : 'AWAY') as 'HOME' | 'AWAY',
    pickTeam: p.pickTeamKo,
    probability: Math.round(p.winProb),
    // 야구는 무승부가 없으므로 2-way
    odds3: {
      home: p.pick === 'home' ? Math.round(p.winProb) : 100 - Math.round(p.winProb),
      draw: 0,
      away: p.pick === 'away' ? Math.round(p.winProb) : 100 - Math.round(p.winProb),
    },
    stars: starsFromProbability(Math.round(p.winProb)),
    matchTime: resolveTime(p),
  }))

  const wanted = count === 'auto'
    ? autoCount(rows.filter((r) => r.probability >= MIN_PROBABILITY).length)
    : count

  const picks = selectPicks(rows, wanted)

  return {
    date: dateLabel,
    windowLabel: windowLabelFor(picks.map((p) => p.matchTime), dateLabel),
    sport: 'baseball' as const,
    groupLabel: LEAGUE_LABEL[league] || league,
    totalMatches: Math.max(scheduled ?? 0, rows.length, picks.length),
    picks,
    missingLogos: picks.filter((p) => !p.home.logo || !p.away.logo).length,
    missingStandings: 0,
  }
}

// ── 핸들러 ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sport = (searchParams.get('sport') || 'football').toLowerCase()
  const countParam = searchParams.get('count')
  const count: number | 'auto' =
    !countParam || countParam === 'auto'
      ? 'auto'
      : Math.max(1, Math.min(MAX_COUNT, Number(countParam) || 3))

  try {
    const payload =
      sport === 'baseball'
        ? await baseball((searchParams.get('league') || 'KBO').toUpperCase(), count)
        : await football(
            (searchParams.get('group') || 'euro').toLowerCase(),
            count,
            request.nextUrl.origin,
            (searchParams.get('range') || 'today') === 'weekend' ? 'weekend' : 'today'
          )

    return NextResponse.json({ success: true, ...payload })
  } catch (e: any) {
    console.error('[shorts-daily]', e)
    return NextResponse.json(
      { success: false, error: String(e?.message || e), picks: [], totalMatches: 0 },
      { status: 500 }
    )
  }
}
