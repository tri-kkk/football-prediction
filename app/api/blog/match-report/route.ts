// =============================================================================
// GET /api/blog/match-report?matchId=<id>&lang=ko
//
// BLOG_REPORT_LAYOUT_SPEC_v1 · Phase 2
// 블로그 프리뷰 리포트의 데이터 모듈(04 폼 / 05 순위 / 06 스탯 / 07 H2H / 08 트렌드)을
// 한 번에 내려주는 집계 라우트.
//
// 설계 메모
//  - match_odds_latest 에 home_team_id / away_team_id 가 이미 저장돼 있어
//    팀 이름 검색(API-Football 2회) 없이 바로 조회한다.
//  - 폼 / 스탯 / 마켓은 기존 /api/team-stats 를 재사용 (fg_team_stats 기반, 대부분 DB 히트).
//  - 서브 요청은 각각 try/catch — 하나 실패해도 나머지 모듈은 살린다.
//  - 30분 인메모리 캐시. 블로그 트래픽이 API-Football 쿼터를 갉아먹지 않게.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { toKoreanTeamName } from '@/lib/teamNameKo'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const AF_KEY = process.env.API_FOOTBALL_KEY || ''
const CRON_SECRET = process.env.CRON_SECRET || ''

/** true 로 바꾸면 비회원도 축소 페이로드(폼 3경기 + H2H 3경기)를 받는다. */
const ALLOW_GUEST_PREVIEW = false

const CACHE_TTL_MS = 30 * 60 * 1000
const cache = new Map<string, { at: number; payload: any }>()

// ------------------------------------------------------------------ helpers

async function sb(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`supabase ${res.status}`)
  return res.json()
}

// 자기 서버로 되부르므로 base 는 요청 origin 을 쓴다.
// (로컬에서 NEXT_PUBLIC_SITE_URL 이 없으면 프로덕션으로 새 나가는 걸 막는다)
async function internal(base: string, path: string, cookie: string | null) {
  const headers: Record<string, string> = {}
  if (CRON_SECRET) headers['x-internal-secret'] = CRON_SECRET
  // CRON_SECRET 미설정 환경에서도 동작하도록 세션 쿠키를 함께 전달
  if (cookie) headers['cookie'] = cookie

  const res = await fetch(`${base}${path}`, { headers, cache: 'no-store' })
  if (!res.ok) throw new Error(`${path} ${res.status}`)
  return res.json()
}

function pct(part: number, total: number): number | null {
  if (!total || total <= 0) return null
  return Math.round((part / total) * 100)
}

function perGame(total: number, played: number): number | null {
  if (!played || played <= 0) return null
  return Math.round((total / played) * 100) / 100
}

// -------------------------------------------------------------------- types

interface FormEntry {
  date: string | null
  opponent: string | null
  isHome: boolean
  goalsFor: number
  goalsAgainst: number
  result: 'W' | 'D' | 'L'
}

interface StatBlock {
  played: number | null
  goalsForPerGame: number | null
  goalsAgainstPerGame: number | null
  winRate: number | null
  cleanSheetRate: number | null
  over25Rate: number | null
  bttsRate: number | null
}

interface TrendChip {
  side: 'home' | 'away' | 'h2h'
  label: string
  hit: number
  of: number
  rate: number
}

// ------------------------------------------------------- module 04 · 06 · 08

function buildForm(ts: any, limit: number): FormEntry[] {
  const list = Array.isArray(ts?.recentMatches) ? ts.recentMatches : []
  return list.slice(0, limit).map((m: any) => ({
    date: m.date ?? null,
    opponent: m.opponentKo || m.opponent || null,
    isHome: !!m.isHome,
    goalsFor: Number(m.goalsFor) || 0,
    goalsAgainst: Number(m.goalsAgainst) || 0,
    result: (m.result === 'W' || m.result === 'D' || m.result === 'L' ? m.result : 'D') as 'W' | 'D' | 'L',
  }))
}

function buildStats(ts: any): StatBlock {
  const s = ts?.seasonStats || {}
  const played = Number(s.played) || 0
  return {
    played: played || null,
    goalsForPerGame: perGame(Number(s.goalsFor) || 0, played),
    goalsAgainstPerGame: perGame(Number(s.goalsAgainst) || 0, played),
    winRate: typeof s.winRate === 'number' ? Math.round(s.winRate) : pct(Number(s.wins) || 0, played),
    cleanSheetRate: typeof ts?.markets?.cleanSheetRate === 'number' ? Math.round(ts.markets.cleanSheetRate) : null,
    over25Rate: typeof ts?.markets?.over25Rate === 'number' ? Math.round(ts.markets.over25Rate) : null,
    bttsRate: typeof ts?.markets?.bttsRate === 'number' ? Math.round(ts.markets.bttsRate) : null,
  }
}

/**
 * 최근 10경기(recentMatches)에서 트렌드를 뽑는다.
 *
 * 시즌 집계(seasonStats/markets)를 쓰지 않는 이유: fg_team_stats 는 시즌 경계에서
 * 팀마다 다른 시즌을 물고 온다(실측: 나가사키 4경기 vs 감바 38경기). 최근 10경기는
 * 두 팀 모두 같은 기준이라 비교가 성립한다.
 */
function buildTrends(
  homeTs: any,
  awayTs: any,
  homeName: string,
  awayName: string,
  h2h: any[],
  lang: 'ko' | 'en'
): TrendChip[] {
  const out: TrendChip[] = []
  const ko = lang === 'ko'
  const MIN_SAMPLE = 4
  const HI = 60
  const LO = 25

  const push = (side: TrendChip['side'], label: string, hit: number, of: number) => {
    if (!of || of < MIN_SAMPLE) return
    const rate = Math.round((hit / of) * 100)
    // 평범한 구간은 트렌드가 아니다
    if (rate > LO && rate < HI) return
    out.push({ side, label, hit, of, rate })
  }

  const teams: Array<[any, string, 'home' | 'away']> = [
    [homeTs, homeName, 'home'],
    [awayTs, awayName, 'away'],
  ]

  for (const [ts, name, side] of teams) {
    const rm = (Array.isArray(ts?.recentMatches) ? ts.recentMatches : []).slice(0, 10)
    if (rm.length === 0) continue

    const gf = (m: any) => Number(m.goalsFor) || 0
    const ga = (m: any) => Number(m.goalsAgainst) || 0

    push(side, ko ? `${name} 최근 무패` : `${name} unbeaten`, rm.filter((m: any) => m.result !== 'L').length, rm.length)
    push(side, ko ? `${name} 오버 2.5` : `${name} over 2.5`, rm.filter((m: any) => gf(m) + ga(m) >= 3).length, rm.length)
    push(side, ko ? `${name} 클린시트` : `${name} clean sheet`, rm.filter((m: any) => ga(m) === 0).length, rm.length)
    push(side, ko ? `${name} 양팀 득점` : `${name} BTTS`, rm.filter((m: any) => gf(m) > 0 && ga(m) > 0).length, rm.length)

    const venue = side === 'home' ? rm.filter((m: any) => m.isHome) : rm.filter((m: any) => !m.isHome)
    const venueLabel = side === 'home' ? (ko ? '홈 무패' : 'unbeaten at home') : (ko ? '원정 무패' : 'unbeaten away')
    push(side, `${name} ${venueLabel}`, venue.filter((m: any) => m.result !== 'L').length, venue.length)
  }

  if (Array.isArray(h2h) && h2h.length >= MIN_SAMPLE) {
    const under = h2h.filter((m) => (m.homeGoals ?? 0) + (m.awayGoals ?? 0) < 3).length
    push('h2h', ko ? '맞대결 언더 2.5' : 'H2H under 2.5', under, h2h.length)
  }

  return out.sort((a, b) => Math.abs(b.rate - 50) - Math.abs(a.rate - 50)).slice(0, 6)
}

// ------------------------------------------------------------- module 05 순위

/** /api/standings 의 groups[] 는 API-Football 원본 형태라 매핑 형태로 맞춰준다. */
function normalizeGroupRow(t: any) {
  return {
    position: t?.rank,
    team: { id: t?.team?.id, name: t?.team?.name, crest: t?.team?.logo },
    playedGames: t?.all?.played,
    points: t?.points,
    goalDifference: t?.goalsDiff,
  }
}

/**
 * /api/standings 는 `leagueData.standings[0]` 만 매핑해서 내려준다.
 * 리그가 스테이지/조로 쪼개져 있으면(실측: J1 2026 = 10팀×2스테이지, CL 조별리그)
 * 두 팀이 뒤쪽 그룹에 있을 때 통째로 사라진다. groups[] 원본에서 다시 찾는다.
 */
function pickStandingRows(raw: any, homeId: number, awayId: number): any[] {
  const has = (rows: any[]) => rows.some((r) => r?.team?.id === homeId || r?.team?.id === awayId)
  const flat = Array.isArray(raw?.standings) ? raw.standings : []
  if (has(flat)) return flat

  const groups = Array.isArray(raw?.groups) ? raw.groups : []
  for (const g of groups) {
    const rows = (Array.isArray(g?.standings) ? g.standings : []).map(normalizeGroupRow)
    if (has(rows)) return rows
  }
  return flat
}

function sliceStandings(rows: any[], homeId: number, awayId: number) {
  if (!Array.isArray(rows) || rows.length === 0) return null

  // /api/standings 는 실패 시 더미 순위표('Team 1', 'Team 2' …)를 200으로 반환한다.
  // 분석 페이지에 가짜 순위가 나가는 건 최악이므로 여기서 끊는다.
  const looksDummy = rows
    .slice(0, 3)
    .every((r) => typeof r?.team?.name === 'string' && /^Team \d+$/.test(r.team.name))
  if (looksDummy) return null

  const idxHome = rows.findIndex((r) => r?.team?.id === homeId)
  const idxAway = rows.findIndex((r) => r?.team?.id === awayId)
  if (idxHome < 0 && idxAway < 0) return null

  const keep = new Set<number>()
  for (const idx of [idxHome, idxAway]) {
    if (idx < 0) continue
    for (let i = idx - 2; i <= idx + 2; i++) {
      if (i >= 0 && i < rows.length) keep.add(i)
    }
  }

  return {
    rows: [...keep]
      .sort((a, b) => a - b)
      .map((i) => {
        const r = rows[i]
        return {
          position: r.position,
          teamId: r.team?.id ?? null,
          name: r.team?.name ?? '',
          crest: r.team?.crest ?? null,
          played: r.playedGames,
          points: r.points,
          goalDifference: r.goalDifference,
          isFocus: r.team?.id === homeId || r.team?.id === awayId,
        }
      }),
    homePosition: idxHome >= 0 ? rows[idxHome].position : null,
    awayPosition: idxAway >= 0 ? rows[idxAway].position : null,
  }
}

// -------------------------------------------------------------- module 07 H2H

async function fetchH2H(homeId: number, awayId: number, limit: number) {
  if (!AF_KEY || !homeId || !awayId) return []
  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${homeId}-${awayId}&last=${limit}`,
    { headers: { 'x-apisports-key': AF_KEY }, next: { revalidate: 21600 } }
  )
  if (!res.ok) throw new Error(`h2h ${res.status}`)
  const json = await res.json()
  const list = Array.isArray(json?.response) ? json.response : []

  return list
    .filter((f: any) => f?.goals?.home !== null && f?.goals?.away !== null)
    // 친선경기는 프리뷰 맞대결 통계에 넣지 않는다.
    // (실측: 285 vs 293 결과에 2025 Friendlies Clubs 5-5 가 섞여 들어와 요약을 왜곡함)
    .filter((f: any) => !/friendl/i.test(String(f?.league?.name || '')))
    .map((f: any) => ({
      date: f.fixture?.date ?? null,
      competition: f.league?.name ?? null,
      homeId: f.teams?.home?.id ?? null,
      awayId: f.teams?.away?.id ?? null,
      homeName: f.teams?.home?.name ?? '',
      awayName: f.teams?.away?.name ?? '',
      homeGoals: f.goals?.home ?? 0,
      awayGoals: f.goals?.away ?? 0,
    }))
    .sort((a: any, b: any) => (a.date < b.date ? 1 : -1))
}

function h2hSummary(matches: any[], homeId: number) {
  let homeWins = 0, draws = 0, awayWins = 0
  for (const m of matches) {
    const focusIsHome = m.homeId === homeId
    const gf = focusIsHome ? m.homeGoals : m.awayGoals
    const ga = focusIsHome ? m.awayGoals : m.homeGoals
    if (gf > ga) homeWins++
    else if (gf === ga) draws++
    else awayWins++
  }
  return { homeWins, draws, awayWins, total: matches.length }
}

// --------------------------------------------------------------------- route

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get('matchId')
  const lang: 'ko' | 'en' = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'ko'

  if (!matchId) {
    return NextResponse.json({ success: false, error: 'matchId required' }, { status: 400 })
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 })
  }

  // --- 인증: /api/team-stats 와 동일한 회원 전용 정책을 따른다 ---
  const session = await getServerSession()
  const isMember = !!(session as any)?.user?.email
  if (!isMember && !ALLOW_GUEST_PREVIEW) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const formLimit = isMember ? 6 : 3
  const h2hLimit = isMember ? 6 : 3

  const cacheKey = `${matchId}:${lang}:${isMember ? 'm' : 'g'}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json({ ...hit.payload, cached: true })
  }

  try {
    // 1) 경기 기본 정보 + 예측 (우리 DB)
    const rows = await sb(
      `match_odds_latest?match_id=eq.${encodeURIComponent(matchId)}&limit=1&select=` +
        [
          'match_id', 'home_team', 'away_team', 'home_team_id', 'away_team_id',
          'home_team_logo', 'away_team_logo', 'league_code', 'commence_time',
          'home_odds', 'draw_odds', 'away_odds',
          'home_probability', 'draw_probability', 'away_probability',
          'predicted_score_home', 'predicted_score_away', 'predicted_winner',
        ].join(',')
    )
    const m = Array.isArray(rows) ? rows[0] : null
    if (!m) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 })
    }

    const homeId = Number(m.home_team_id) || 0
    const awayId = Number(m.away_team_id) || 0
    const league = m.league_code || ''
    const cookie = request.headers.get('cookie')
    const base = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

    // 2) 서브 요청 병렬 — 실패해도 각자 null 로 떨어진다
    const [homeTs, awayTs, standingsRaw, h2hMatches] = await Promise.all([
      homeId ? internal(base, `/api/team-stats?teamId=${homeId}&league=${league}&lang=${lang}`, cookie).then((r) => r?.data ?? null).catch(() => null) : null,
      awayId ? internal(base, `/api/team-stats?teamId=${awayId}&league=${league}&lang=${lang}`, cookie).then((r) => r?.data ?? null).catch(() => null) : null,
      league ? internal(base, `/api/standings?league=${league}`, cookie).catch(() => null) : null,
      fetchH2H(homeId, awayId, h2hLimit).catch(() => []),
    ])

    const nm = (n: string | null | undefined) => (lang === 'ko' ? toKoreanTeamName(n) : n || '')
    const homeName = nm(m.home_team)
    const awayName = nm(m.away_team)

    // 순위표·H2H 팀명은 API-Football 영문이라 여기서 한 번에 한글화한다
    const standingsSliced = isMember && standingsRaw
      ? sliceStandings(pickStandingRows(standingsRaw, homeId, awayId), homeId, awayId)
      : null
    if (standingsSliced) {
      standingsSliced.rows = standingsSliced.rows.map((r) => ({ ...r, name: nm(r.name) }))
    }
    const h2hLocalized = h2hMatches.map((x: any) => ({
      ...x,
      homeName: nm(x.homeName),
      awayName: nm(x.awayName),
    }))

    const payload = {
      success: true,
      data: {
        match: {
          matchId: m.match_id,
          leagueCode: league,
          commenceTime: m.commence_time ?? null,
          home: { id: homeId || null, name: homeName, logo: m.home_team_logo ?? null },
          away: { id: awayId || null, name: awayName, logo: m.away_team_logo ?? null },
        },
        // 모듈 01/12 — blog_posts 에 백필한 값보다 이쪽이 항상 최신이다
        verdict: {
          homeProb: m.home_probability ?? null,
          drawProb: m.draw_probability ?? null,
          awayProb: m.away_probability ?? null,
          predScore:
            m.predicted_score_home != null && m.predicted_score_away != null
              ? `${m.predicted_score_home}-${m.predicted_score_away}`
              : null,
          predictedWinner: m.predicted_winner ?? null,
          odds: { home: m.home_odds ?? null, draw: m.draw_odds ?? null, away: m.away_odds ?? null },
        },
        form: {
          home: homeTs ? buildForm(homeTs, formLimit) : [],
          away: awayTs ? buildForm(awayTs, formLimit) : [],
        },
        stats: isMember
          ? (() => {
              const h = homeTs ? buildStats(homeTs) : null
              const a = awayTs ? buildStats(awayTs) : null
              // 표본이 비대칭이면 비교 자체가 오해를 부른다.
              // (실측: 나가사키 4경기 vs 감바 38경기 — 시즌 경계 때문에 fg_team_stats 가 어긋남)
              const hp = h?.played ?? 0
              const ap = a?.played ?? 0
              const comparable = hp >= 5 && ap >= 5 && Math.max(hp, ap) / Math.min(hp, ap) <= 3
              return { home: h, away: a, comparable }
            })()
          : null,
        standings: standingsSliced,
        h2h: {
          matches: h2hLocalized,
          summary: h2hSummary(h2hMatches, homeId),
          focusHomeId: homeId,
        },
        trends: isMember ? buildTrends(homeTs, awayTs, homeName, awayName, h2hMatches, lang) : [],
      },
      // 어떤 모듈이 비었는지 클라이언트가 알 수 있게
      partial: {
        stats: !homeTs || !awayTs,
        standings: !standingsRaw,
        h2h: h2hMatches.length === 0,
      },
    }

    cache.set(cacheKey, { at: Date.now(), payload })
    if (cache.size > 200) cache.delete(cache.keys().next().value as string)

    return NextResponse.json(payload)
  } catch (e: any) {
    console.error('[blog/match-report]', e?.message || e)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
