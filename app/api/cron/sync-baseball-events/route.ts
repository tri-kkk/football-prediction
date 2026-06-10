// app/api/cron/sync-baseball-events/route.ts
//
// 🟢 라이브 MLB 매치의 실시간 plays(타석/이닝/스코어)를 MLB Stats API에서 폴링해 baseball_events 테이블에 적재.
//    - 1분 주기 pg_cron으로 호출.
//    - push-baseball-events cron이 별도로 baseball_events 신규 row를 detect해 FCM 발송.
//
// 데이터 소스:
//   - MLB Stats API: https://statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live
//   - allPlays[].result(event, eventType, awayScore, homeScore)
//   - allPlays[].about(halfInning, inning, isComplete, endTime)
//   - allPlays[].matchup(batter, pitcher)
//
// 적재 이벤트 타입 (events.type):
//   - 'homerun'      — eventType === 'home_run'
//   - 'score'        — runs scored (eventType 다양: single, double, triple, sac_fly, walk 등)
//   - 'inningChange' — about.isTopInning 변경
//   - 'strikeout'    — eventType === 'strikeout'
//   - (firstPitch / gameEnd는 push cron에서 매치 상태로 보완)
//
// 비용:
//   - 매분 라이브 MLB 매치 N개 × 1 호출 → 100 req/min 이하 (MLB Stats API는 무료, quota 넉넉)
//
// 응답:
//   { success, liveGames, eventsInserted, eventsSkipped, elapsedMs }
//
// 참고: KBO/NPB는 별도 데이터 소스 필요. 이 cron은 우선 MLB만 처리.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const MLB_API = 'https://statsapi.mlb.com/api/v1.1'
const MLB_API_V1 = 'https://statsapi.mlb.com/api/v1'

// 팀명 정규화 — 비교용 (api-sports vs MLB Stats가 약간씩 표기 다름)
function normalizeTeamName(name: string | null | undefined): string {
  if (!name) return ''
  return name.toLowerCase()
    .replace(/\./g, '')
    .replace(/the\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// MLB Stats API schedule → 그날 게임들의 gamePk + teams + gameState 매핑
async function fetchMlbSchedule(date: string): Promise<Array<{ gamePk: number; home: string; away: string; gameState: string; gameDate: string }>> {
  try {
    const res = await fetch(
      `${MLB_API_V1}/schedule?sportId=1&date=${date}`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) return []
    const data = await res.json()
    const games: any[] = data?.dates?.[0]?.games ?? []
    return games.map((g) => ({
      gamePk: g.gamePk,
      home: g.teams?.home?.team?.name ?? '',
      away: g.teams?.away?.team?.name ?? '',
      gameState: g.status?.abstractGameState ?? '',
      gameDate: g.gameDate ?? '',
    })).filter((g) => g.gamePk)
  } catch (e) {
    console.warn('[sync-baseball-events] schedule fetch failed:', (e as Error).message)
    return []
  }
}

// 오늘+어제 schedule에서 abstractGameState='Live' 게임의 gamePk 집합 반환
async function fetchLiveGamePks(): Promise<Set<number>> {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const [todayGames, yesterdayGames] = await Promise.all([
    fetchMlbSchedule(today),
    fetchMlbSchedule(yesterday),
  ])
  const liveSet = new Set<number>()
  for (const g of [...todayGames, ...yesterdayGames]) {
    if (g.gameState === 'Live') liveSet.add(g.gamePk)
  }
  return liveSet
}

// mlb_game_pk 없는 라이브 매치들에 매핑 채워줌
async function backfillGamePks(matches: any[]): Promise<Map<number, number>> {
  // api_match_id → gamePk 매핑
  const result = new Map<number, number>()
  const missing = matches.filter((m) => !m.mlb_game_pk)
  if (missing.length === 0) return result

  // 날짜별로 그룹핑 (schedule 호출 최소화)
  // ⚠️ 우리 match_date는 KST 기준이라 미국 저녁 경기는 MLB 스케줄(미국 날짜)에선 전날에 있음.
  //    → match_date 와 그 전날을 모두 조회해 매칭한다.
  const prevDay = (d: string) => new Date(new Date(d).getTime() - 86_400_000).toISOString().slice(0, 10)
  const datesSet = new Set<string>()
  for (const m of missing) {
    datesSet.add(m.match_date)
    datesSet.add(prevDay(m.match_date))
  }

  // 날짜별 schedule 가져옴
  const dateSchedules = new Map<string, Array<{ gamePk: number; home: string; away: string }>>()
  for (const d of datesSet) {
    const games = await fetchMlbSchedule(d)
    dateSchedules.set(d, games)
  }

  // 매핑: (match_date 또는 전날) + (home/away team) 일치하는 게임 찾음
  const updates: Array<{ id: number; gamePk: number }> = []
  for (const m of missing) {
    const home = normalizeTeamName(m.home_team)
    const away = normalizeTeamName(m.away_team)
    const candidateGames = [
      ...(dateSchedules.get(m.match_date) ?? []),
      ...(dateSchedules.get(prevDay(m.match_date)) ?? []),
    ]
    const found = candidateGames.find(
      (g) => normalizeTeamName(g.home) === home && normalizeTeamName(g.away) === away,
    )
    if (found) {
      result.set(m.api_match_id, found.gamePk)
      updates.push({ id: m.id, gamePk: found.gamePk })
    }
  }

  // DB에 한 번에 업데이트 (Promise.all)
  if (updates.length > 0) {
    await Promise.all(
      updates.map((u) =>
        supabase.from('baseball_matches').update({ mlb_game_pk: u.gamePk }).eq('id', u.id),
      ),
    )
    console.log(`[sync-baseball-events] mlb_game_pk 매핑 ${updates.length}건 보강`)
  }
  return result
}

interface MlbPlay {
  result?: {
    type?: string
    event?: string
    eventType?: string
    description?: string
    rbi?: number
    awayScore?: number
    homeScore?: number
    isOut?: boolean
  }
  about?: {
    atBatIndex?: number
    halfInning?: string         // 'top' | 'bottom'
    inning?: number
    isComplete?: boolean
    isScoringPlay?: boolean
    startTime?: string
    endTime?: string
    isTopInning?: boolean
  }
  matchup?: {
    batter?: { id: number; fullName: string }
    pitcher?: { id: number; fullName: string }
  }
}

interface DBMatch {
  id: number
  api_match_id: number
  mlb_game_pk: number | null
  match_date: string
  match_timestamp?: string | null
  home_team: string
  away_team: string
  status: string
}

// feed/live 결과 + 응답의 teams.home/away 이름 + 현재 status/score 반환
async function fetchLiveFeed(gamePk: number): Promise<{
  plays: MlbPlay[]
  homeTeamName: string | null
  awayTeamName: string | null
  gameState: string | null               // 'Preview' | 'Live' | 'Final'
  currentInning: number | null           // 1~9 등
  inningHalf: string | null              // 'Top' | 'Bottom'
  homeRuns: number | null                // 현재 홈팀 점수
  awayRuns: number | null                // 현재 원정팀 점수
  inningsArr: Array<{ num: number; home: number | null; away: number | null }> // 이닝별 득점(연장 포함)
}> {
  try {
    const res = await fetch(`${MLB_API}/game/${gamePk}/feed/live`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.warn(`[sync-baseball-events] feed/live failed gamePk=${gamePk}:`, res.status)
      return {
        plays: [], homeTeamName: null, awayTeamName: null, gameState: null,
        currentInning: null, inningHalf: null, homeRuns: null, awayRuns: null, inningsArr: [],
      }
    }
    const data = await res.json()
    const linescore = data?.liveData?.linescore
    return {
      plays: data?.liveData?.plays?.allPlays ?? [],
      homeTeamName: data?.gameData?.teams?.home?.name ?? null,
      awayTeamName: data?.gameData?.teams?.away?.name ?? null,
      gameState: data?.gameData?.status?.abstractGameState ?? null,
      currentInning: linescore?.currentInning ?? null,
      inningHalf: linescore?.inningHalf ?? null,
      inningsArr: Array.isArray(linescore?.innings)
        ? linescore.innings.map((i: any) => ({ num: i.num, home: i.home?.runs ?? null, away: i.away?.runs ?? null }))
        : [],
      homeRuns: linescore?.teams?.home?.runs ?? null,
      awayRuns: linescore?.teams?.away?.runs ?? null,
    }
  } catch (e) {
    console.warn(`[sync-baseball-events] feed/live error gamePk=${gamePk}:`, (e as Error).message)
    return {
      plays: [], homeTeamName: null, awayTeamName: null, gameState: null,
      currentInning: null, inningHalf: null, homeRuns: null, awayRuns: null, inningsArr: [],
    }
  }
}

// MLB 이닝 배열 → DB inning 포맷 { home:{'1'..'9','extra'}, away:{...} }. 10회+는 extra로 합산.
function buildInningData(
  inningsArr: Array<{ num: number; home: number | null; away: number | null }>,
): { home: Record<string, number | null>; away: Record<string, number | null> } | null {
  if (!inningsArr || inningsArr.length === 0) return null
  const home: Record<string, number | null> = {}
  const away: Record<string, number | null> = {}
  let extraHome: number | null = null
  let extraAway: number | null = null
  for (const i of inningsArr) {
    if (i.num <= 9) {
      home[String(i.num)] = i.home
      away[String(i.num)] = i.away
    } else {
      extraHome = (extraHome ?? 0) + (i.home ?? 0)
      extraAway = (extraAway ?? 0) + (i.away ?? 0)
    }
  }
  home.extra = extraHome
  away.extra = extraAway
  return { home, away }
}

// gameState → 우리 DB status 변환
function mapGameStateToStatus(gameState: string | null, inning: number | null): string | null {
  if (gameState === 'Final') return 'FT'
  if (gameState === 'Preview') return 'NS'
  if (gameState === 'Live') return inning != null ? `IN${inning}` : 'LIVE' // 이닝 파싱 실패해도 라이브로 갱신(NS 박힘 방지)
  return null
}

// 플레이 → events 행 변환 (1 play가 최대 2 event row 생성 가능: score+homerun)
function playsToEventRows(matchId: number, plays: MlbPlay[]): any[] {
  const rows: any[] = []

  for (const p of plays) {
    if (!p.about || p.about.atBatIndex == null) continue
    if (!p.about.isComplete) continue // 진행 중인 타석은 skip — 완료 후 detect

    const atBatIndex = p.about.atBatIndex
    const half = p.about.halfInning ?? 'top'
    const inning = p.about.inning ?? null
    const inningStr = inning ? `IN${inning}` : null
    const team = half === 'top' ? 'away' : 'home' // top = away 공격
    const eventType = p.result?.eventType ?? ''
    const eventName = p.result?.event ?? ''
    const isScoring = !!p.about.isScoringPlay
    const homeScore = p.result?.homeScore ?? null
    const awayScore = p.result?.awayScore ?? null

    // homerun 이벤트 (점수 났을 가능성 100%)
    if (eventType === 'home_run') {
      rows.push({
        match_id: matchId,
        external_event_id: `${atBatIndex}:homerun`,
        type: 'homerun',
        inning: inningStr,
        half_inning: half,
        team,
        player_id: p.matchup?.batter?.id ?? null,
        player_name: p.matchup?.batter?.fullName ?? null,
        detail: p.result?.description ?? null,
        home_score: homeScore,
        away_score: awayScore,
        raw: p as any,
      })
      continue // homerun이면 score 이벤트 별도 안 만듦 (homerun에 포함)
    }

    // 일반 score 이벤트 — 점수가 났을 때만
    if (isScoring) {
      rows.push({
        match_id: matchId,
        external_event_id: `${atBatIndex}:score`,
        type: 'score',
        inning: inningStr,
        half_inning: half,
        team,
        player_id: p.matchup?.batter?.id ?? null,
        player_name: p.matchup?.batter?.fullName ?? null,
        detail: p.result?.description ?? eventName,
        home_score: homeScore,
        away_score: awayScore,
        raw: p as any,
      })
      continue
    }

    // 인상적인 비득점 이벤트만 선별 (strikeout — 알림은 별도 옵트인 후 발송)
    if (eventType === 'strikeout') {
      rows.push({
        match_id: matchId,
        external_event_id: `${atBatIndex}:strikeout`,
        type: 'strikeout',
        inning: inningStr,
        half_inning: half,
        team,
        player_id: p.matchup?.batter?.id ?? null,
        player_name: p.matchup?.batter?.fullName ?? null,
        detail: p.result?.description ?? null,
        home_score: homeScore,
        away_score: awayScore,
        raw: p as any,
      })
    }
  }

  return rows
}

// 이닝 전환 이벤트 (top → bottom, bottom → top of next)
function detectInningChangeRows(matchId: number, plays: MlbPlay[]): any[] {
  // 마지막 완료된 plays 그룹화: 각 (inning, half)별로 마지막 play 끝나면 inningChange 발생
  const completed = plays.filter((p) => p.about?.isComplete)
  const rows: any[] = []
  let prevHalf: string | null = null
  let prevInning: number | null = null

  for (const p of completed) {
    const half = p.about?.halfInning ?? null
    const inning = p.about?.inning ?? null
    if (half == null || inning == null) continue

    if (prevHalf !== null && (half !== prevHalf || inning !== prevInning)) {
      rows.push({
        match_id: matchId,
        external_event_id: `IN${inning}:${half}:start`,
        type: 'inningChange',
        inning: `IN${inning}`,
        half_inning: half,
        team: half === 'top' ? 'away' : 'home',
        player_id: null,
        player_name: null,
        detail: null,
        home_score: p.result?.homeScore ?? null,
        away_score: p.result?.awayScore ?? null,
        raw: { from: { inning: prevInning, half: prevHalf }, to: { inning, half } } as any,
      })
    }
    prevHalf = half
    prevInning = inning
  }

  return rows
}

export async function GET(_req: NextRequest) {
  const startedAt = Date.now()

  try {
    // 0) MLB 공식 schedule에서 진짜 라이브 게임 gamePk 집합 (status=Live)
    //    우리 DB가 NS/IN%으로 잘못 표시된 stale 매치도 정정하기 위해 schedule 신뢰
    const liveGamePks = await fetchLiveGamePks()

    // 1) 라이브 매치 대상: status가 IN% (정상 표시) ∪ mlb_game_pk가 schedule Live에 포함된 매치 (stale 정정)
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

    // 1-a) DB에 IN% 표시된 매치
    const { data: inMatches, error: e1 } = await supabase
      .from('baseball_matches')
      .select('id, api_match_id, mlb_game_pk, match_date, match_timestamp, home_team, away_team, status')
      .eq('league', 'MLB')
      .like('status', 'IN%')
      .gte('match_date', yesterday)
      .limit(50)
    if (e1) {
      return NextResponse.json({ success: false, error: e1.message }, { status: 500 })
    }

    // 1-b) schedule이 Live라고 알려준 gamePk와 매핑된 매치 (NS로 잘못 stale된 매치 포함)
    let scheduleLiveMatches: any[] = []
    if (liveGamePks.size > 0) {
      const { data, error: e2 } = await supabase
        .from('baseball_matches')
        .select('id, api_match_id, mlb_game_pk, match_date, match_timestamp, home_team, away_team, status')
        .eq('league', 'MLB')
        .in('mlb_game_pk', Array.from(liveGamePks))
        .gte('match_date', yesterday)
      if (e2) console.warn('[sync-baseball-events] schedule 매치 조회 실패:', e2.message)
      else scheduleLiveMatches = data ?? []
    }

    // 1-c) 시작 시간이 지난 최근 MLB 경기 — status 무관하게 MLB 원본으로 재검증/최종화.
    //   (api-sports가 FT로 잘못된 점수/9회 데이터를 박은 케이스도 MLB 원본으로 교정)
    const nowIso = new Date().toISOString()
    const { data: startedMatches, error: e3 } = await supabase
      .from('baseball_matches')
      .select('id, api_match_id, mlb_game_pk, match_date, match_timestamp, home_team, away_team, status')
      .eq('league', 'MLB')
      .gte('match_date', yesterday)
      .lte('match_timestamp', nowIso)
      .order('match_timestamp', { ascending: false })
      .limit(40)
    if (e3) console.warn('[sync-baseball-events] started 매치 조회 실패:', e3.message)

    // union — id 기준 중복 제거
    const merged = new Map<number, any>()
    for (const m of [...(inMatches ?? []), ...scheduleLiveMatches, ...(startedMatches ?? [])]) merged.set(m.id, m)
    const liveMatches = Array.from(merged.values())

    if (!liveMatches || liveMatches.length === 0) {
      return NextResponse.json({
        success: true,
        liveGames: 0,
        liveGamePksFromSchedule: liveGamePks.size,
        backfilled: 0,
        eventsInserted: 0,
        eventsSkipped: 0,
        elapsedMs: Date.now() - startedAt,
      })
    }

    // 1-b) mlb_game_pk 비어있는 매치들 자동 매핑 (MLB schedule에서 team_name 매칭)
    const backfillMap = await backfillGamePks(liveMatches as DBMatch[])
    const backfilled = backfillMap.size

    // 🩹 1-c) gamePk 시각 보정: 같은 팀이 연속일에 경기하면 팀명만으로는 엉뚱한(다음날 Preview) gamePk가
    //   매핑될 수 있음 → 팀 + 경기시각(match_timestamp ≈ gameDate)으로 올바른 gamePk를 재해석.
    let pkTimeFixed = 0
    {
      const prevDay = (d: string) => new Date(new Date(d).getTime() - 86_400_000).toISOString().slice(0, 10)
      const dates = new Set<string>()
      for (const m of liveMatches) {
        if (m.match_date) { dates.add(m.match_date); dates.add(prevDay(m.match_date)) }
      }
      const sched = new Map<string, Awaited<ReturnType<typeof fetchMlbSchedule>>>()
      await Promise.all(Array.from(dates).map(async (d) => { sched.set(d, await fetchMlbSchedule(d)) }))

      const pkUpdates: Array<{ id: number; pk: number }> = []
      for (const m of liveMatches) {
        if (!m.match_timestamp || !m.match_date) continue
        const tsMs = new Date(m.match_timestamp).getTime()
        const home = normalizeTeamName(m.home_team)
        const away = normalizeTeamName(m.away_team)
        const cands = [...(sched.get(m.match_date) ?? []), ...(sched.get(prevDay(m.match_date)) ?? [])]
          .filter((g) => normalizeTeamName(g.home) === home && normalizeTeamName(g.away) === away && g.gameDate)
        if (cands.length === 0) continue
        let best = cands[0]
        let bestDiff = Math.abs(new Date(best.gameDate).getTime() - tsMs)
        for (const g of cands.slice(1)) {
          const diff = Math.abs(new Date(g.gameDate).getTime() - tsMs)
          if (diff < bestDiff) { best = g; bestDiff = diff }
        }
        // 경기 시각이 1시간 이내로 일치하는 게임만 신뢰 (연속일 중복 경기 구분)
        if (bestDiff <= 60 * 60 * 1000 && best.gamePk !== m.mlb_game_pk) {
          pkUpdates.push({ id: m.id, pk: best.gamePk })
          m.mlb_game_pk = best.gamePk
        }
      }
      if (pkUpdates.length > 0) {
        await Promise.all(pkUpdates.map((u) => supabase.from('baseball_matches').update({ mlb_game_pk: u.pk }).eq('id', u.id)))
        pkTimeFixed = pkUpdates.length
        console.log(`[sync-baseball-events] gamePk 시각보정 ${pkTimeFixed}건`)
      }
    }

    let eventsInserted = 0
    let eventsSkipped = 0
    let processed = 0

    let mismatchedReset = 0

    // 2) 각 매치별 feed/live 가져와 events 적재 (mlb_game_pk 있는 매치만)
    const CONCURRENCY = 5
    for (let i = 0; i < liveMatches.length; i += CONCURRENCY) {
      const chunk = liveMatches.slice(i, i + CONCURRENCY) as DBMatch[]
      await Promise.all(
        chunk.map(async (m) => {
          // 기존 mlb_game_pk 또는 방금 backfill한 값 사용
          let gamePk = m.mlb_game_pk ?? backfillMap.get(m.api_match_id) ?? null
          if (!gamePk) return

          const feed = await fetchLiveFeed(gamePk)

          // 🛡️ 검증: feed/live 응답의 teams.home/away가 DB 매치와 일치하는지 확인
          //   불일치면 잘못 매핑된 케이스 — mlb_game_pk 리셋 후 재매핑 시도
          const feedHomeNorm = normalizeTeamName(feed.homeTeamName)
          const feedAwayNorm = normalizeTeamName(feed.awayTeamName)
          const dbHomeNorm = normalizeTeamName(m.home_team)
          const dbAwayNorm = normalizeTeamName(m.away_team)
          const teamsMatch =
            feedHomeNorm && feedAwayNorm &&
            feedHomeNorm === dbHomeNorm && feedAwayNorm === dbAwayNorm

          if (!teamsMatch) {
            console.warn(
              `[sync-baseball-events] mlb_game_pk 불일치 match=${m.api_match_id} ` +
              `(DB: ${m.home_team} vs ${m.away_team} / feed: ${feed.homeTeamName} vs ${feed.awayTeamName}) ` +
              `→ 리셋 후 재매핑`,
            )
            // 잘못된 mlb_game_pk 리셋 (다음 cron에서 재매핑됨)
            await supabase
              .from('baseball_matches')
              .update({ mlb_game_pk: null })
              .eq('id', m.id)
            mismatchedReset++
            return
          }

          // 🔥 매치 정보 fresh 갱신 — MLB Stats API가 1차 source (lag 최소화)
          //   기존 api-sports baseball 데이터는 2~5분 lag 있어서 알림 늦음 문제 해결
          const newStatus = mapGameStateToStatus(feed.gameState, feed.currentInning)
          const updateMatch: Record<string, any> = {}
          if (newStatus && newStatus !== m.status) updateMatch.status = newStatus
          if (feed.homeRuns != null) updateMatch.home_score = feed.homeRuns
          if (feed.awayRuns != null) updateMatch.away_score = feed.awayRuns
          // 이닝별 스코어(연장 포함) — MLB 원본을 권위로 사용
          const inningData = buildInningData(feed.inningsArr)
          if (inningData) updateMatch.inning = inningData
          if (Object.keys(updateMatch).length > 0) {
            updateMatch.updated_at = new Date().toISOString()
            await supabase.from('baseball_matches').update(updateMatch).eq('id', m.id)

            // 🛡️ 알림 폭주 방지: match_event_state도 함께 sync해서 옛 push cron이
            //   stale 정정된 매치를 catch-up처럼 detect 못하게 차단
            //   (sync 이전에 옛 cron이 못 보던 상태였으니, 이번 정정은 새 detect 대상 X)
            const stateUpsert = {
              match_id: m.api_match_id,
              sport: 'baseball',
              last_status: newStatus ?? m.status,
              last_home_score: feed.homeRuns ?? null,
              last_away_score: feed.awayRuns ?? null,
              last_inning: feed.currentInning ? String(feed.currentInning) : null,
              last_run_at: new Date().toISOString(),
            }
            await supabase
              .from('match_event_state')
              .upsert(stateUpsert, { onConflict: 'match_id,sport' })

            console.log(
              `[sync-baseball-events] fresh sync + state sealed match=${m.api_match_id} ` +
              `status=${newStatus ?? m.status} home=${feed.homeRuns ?? '?'} away=${feed.awayRuns ?? '?'}`,
            )
          }

          if (feed.plays.length === 0) return

          const eventRows = playsToEventRows(m.api_match_id, feed.plays)
          const inningRows = detectInningChangeRows(m.api_match_id, feed.plays)
          const rows = [...eventRows, ...inningRows]
          if (rows.length === 0) return

          const { data, error: insErr } = await supabase
            .from('baseball_events')
            .upsert(rows, { onConflict: 'match_id,external_event_id', ignoreDuplicates: true })
            .select('id')

          if (insErr) {
            console.warn(`[sync-baseball-events] upsert error match=${m.api_match_id}:`, insErr.message)
            return
          }
          const insertedCount = data?.length ?? 0
          eventsInserted += insertedCount
          eventsSkipped += rows.length - insertedCount
          processed++
        }),
      )
    }

    return NextResponse.json({
      success: true,
      liveGames: liveMatches.length,
      backfilled,
      processed,
      mismatchedReset,
      eventsInserted,
      eventsSkipped,
      startedCount: startedMatches?.length ?? 0,
      pkTimeFixed,
      elapsedMs: Date.now() - startedAt,
    })
  } catch (error: any) {
    console.error('[sync-baseball-events] crash:', error.message)
    return NextResponse.json(
      { success: false, error: error.message, elapsedMs: Date.now() - startedAt },
      { status: 500 },
    )
  }
}
