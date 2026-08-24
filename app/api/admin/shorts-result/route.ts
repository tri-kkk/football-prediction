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

/**
 * 최근에 끝난 경기 범위.
 *
 * ⚠ "어제 달력 하루" 로 자르면 안 된다.
 * 유럽 축구는 한국시간 새벽에 열리므로, 오늘 새벽에 끝난 가장 최신 경기가
 * "어제" 에 안 잡혀 하루 늦게 성적표에 나온다.
 * 지금 기준 지난 N시간으로 보면 새벽 경기가 그날 아침 성적표에 바로 들어간다.
 */
function recentRange(hours = 36) {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 3600_000)
  // 라벨은 경기가 몰려 있는 쪽(어제)을 기준으로 잡는다
  const label = new Date(now.getTime() - 12 * 3600_000 + 9 * 3600_000)
  return {
    start: new Date(now.getTime() - hours * 3600_000).toISOString(),
    end: now.toISOString(),
    dateLabel: `${label.getUTCFullYear()}-${String(label.getUTCMonth() + 1).padStart(2, '0')}-${String(label.getUTCDate()).padStart(2, '0')}`,
  }
}

/**
 * 화면에 쓸 시점 라벨.
 *
 * "어제 결과" 로 고정해두면 유럽 축구에서 어긋난다.
 * 현지 밤 경기가 한국시간으로는 **오늘 새벽**이라,
 * 날짜는 8월 24일인데 제목은 "어제 결과" 인 모순이 생긴다.
 */
function windowLabelFor(shownDate: string): string {
  const today = dayRangeKST(0).dateLabel
  const yesterday = dayRangeKST(-1).dateLabel
  if (shownDate === today) return '오늘 새벽'
  if (shownDate === yesterday) return '어제'
  return shownDate.slice(5).replace('-', '/')
}

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
async function football(groupKey: string) {
  const group = LEAGUE_GROUPS[groupKey]
  if (!group) throw new Error(`알 수 없는 리그 그룹: ${groupKey}`)

  const { start, end, dateLabel } = recentRange(36)

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

  // 축구는 36시간 창으로 뽑으므로 조회 자체는 시각에 안 흔들린다.
  // 다만 화면에 찍히는 날짜는 실제 보여줄 경기 기준이어야 한다.
  // (오후 2시에 돌리면 recentRange 라벨이 '오늘' 로 나오는데,
  //  정작 경기는 어젯밤에 열린 것이라 하루가 어긋난다)
  const shownDates = (data || [])
    .filter((r) => results.some((x) => String(x.matchId) === String(r.match_id)))
    .map((r) => {
      const k = new Date(new Date(r.commence_time).getTime() + 9 * 3600_000)
      return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, '0')}-${String(k.getUTCDate()).padStart(2, '0')}`
    })
  const tally = new Map<string, number>()
  for (const d of shownDates) tally.set(d, (tally.get(d) || 0) + 1)
  const shownDate =
    [...tally.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1))[0]?.[0] || dateLabel

  return {
    date: shownDate,
    windowLabel: windowLabelFor(shownDate),
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

async function baseball(league: string) {
  // ⚠ 여기서 recentRange() 의 dateLabel 을 쓰면 안 된다.
  //
  // recentRange 는 "지금 -12시간" 을 라벨로 삼는다. 오전 7시에 돌릴 땐
  // 그게 어제 저녁이라 맞았지만, 렌더 시각을 **오후 2시로 옮기면서**
  // -12시간이 같은 날 새벽 2시가 되어 라벨이 '오늘' 로 바뀌었다.
  // 그래서 오늘 저녁에 열릴, 아직 끝나지도 않은 경기를 조회하고
  // 정산된 게 하나도 없어 전부 건너뛰었다.
  //
  // 시각에 기대는 대신 어제·오늘을 다 조회하고,
  // **정산된 경기가 더 많은 날**을 보여준다.
  //   KBO·NPB : 저녁 경기 → 오후 2시엔 어제가 이긴다
  //   MLB     : 한국시간 새벽~오전 경기 → 오후 2시엔 오늘이 이긴다
  // 리그마다 규칙을 따로 두지 않아도 알아서 맞는다.
  const yLabel = dayRangeKST(-1).dateLabel
  const tLabel = dayRangeKST(0).dateLabel

  const isSettled = (p: ComboPick) => p.homeScore != null && p.awayScore != null

  const yAll = await readComboPicks(league, yLabel)
  const tAll = await readComboPicks(league, tLabel)
  const ySettled = yAll.filter(isSettled)
  const tSettled = tAll.filter(isSettled)

  // 동점이면 오늘 쪽을 쓴다 (더 최신이므로)
  const useToday = tSettled.length >= ySettled.length && tSettled.length > 0
  const settled = useToday ? tSettled : ySettled
  const dateLabel = useToday ? tLabel : yLabel

  // 왜 비었는지 렌더 로그에서 바로 알 수 있게 남긴다.
  // "픽 자체가 없다" 와 "픽은 있는데 아직 정산 전이다" 는 원인이 완전히 다르다.
  const diag = {
    checked: [
      { date: yLabel, picks: yAll.length, settled: ySettled.length },
      { date: tLabel, picks: tAll.length, settled: tSettled.length },
    ],
    used: dateLabel,
  }

  const results = settled
    .sort((a, b) => b.winProb - a.winProb)
    .slice(0, MAX_COUNT)
    .map((p) => ({
      matchId: p.matchId,
      league,
      leagueLabel: LEAGUE_LABEL[league] || league,
      leagueLogo: '',
      home: { name: p.homeTeamKo, logo: p.homeLogo || '' },
      away: { name: p.awayTeamKo, logo: p.awayLogo || '' },
      homeScore: p.homeScore ?? null,
      awayScore: p.awayScore ?? null,
      pickSide: (p.pick === 'home' ? 'HOME' : 'AWAY') as 'HOME' | 'AWAY',
      pickTeam: p.pickTeamKo,
      probability: Math.round(p.winProb),
      isCorrect: p.isCorrect === true,
      // ⚠ "야구는 무승부 없음" 이 아니다.
      //   NPB·KBO 는 연장 12회까지 승부가 안 나면 무승부로 끝난다.
      //   여기를 false 로 박아두면 무승부 경기가 성적표에서 ✕(오답)으로 찍히고,
      //   적중률 분모에도 그대로 들어가 숫자가 왜곡된다.
      isDraw: p.homeScore != null && p.awayScore != null && p.homeScore === p.awayScore,
    }))

  const correct = results.filter((x) => x.isCorrect).length
  const draws = results.filter((x) => x.isDraw).length
  const decisive = results.length - draws

  // 누적은 기존 야구 전용 API 를 그대로 쓴다 (동점 제외 2-way 로 이미 계산됨)
  let cumulative = null
  try {
    const r = await fetch(
      `${BASE_ORIGIN}/api/baseball/prediction-results?league=${encodeURIComponent(league)}&days=60&limit=1`,
      { cache: 'no-store' }
    )
    if (r.ok) {
      const j = await r.json()
      cumulative = {
        decisive: j?.total ?? 0,
        correct: j?.correct ?? 0,
        accuracy: j?.accuracy ?? 0,
        drawCount: 0,
        drawRate: 0,
      }
    }
  } catch {}

  return {
    date: dateLabel,
    windowLabel: windowLabelFor(dateLabel),
    sport: 'baseball' as const,
    groupLabel: LEAGUE_LABEL[league] || league,
    results,
    summary: {
      total: results.length,
      correct,
      draws,
      // 적중률 분모는 **승부가 갈린 경기**다.
      // 무승부를 분모에 넣으면 모델이 맞힐 수 없는 경기까지 실패로 세게 된다.
      // (축구에서 무승부를 빼고 계산하는 것과 같은 기준)
      accuracy: decisive ? Math.round((correct / decisive) * 100) : 0,
    },
    diag,
    cumulative,
  }
}

// ── 핸들러 ───────────────────────────────────────────────
let BASE_ORIGIN = ''

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sport = (searchParams.get('sport') || 'football').toLowerCase()
  BASE_ORIGIN = request.nextUrl.origin

  try {
    const payload =
      sport === 'baseball'
        ? await baseball((searchParams.get('league') || 'KBO').toUpperCase())
        : await football((searchParams.get('group') || 'euro').toLowerCase())

    return NextResponse.json({ success: true, ...payload })
  } catch (e: any) {
    console.error('[shorts-result]', e)
    return NextResponse.json(
      { success: false, error: String(e?.message || e), results: [] },
      { status: 500 }
    )
  }
}
