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
  api_match_id: number
  mlb_game_pk: number | null
  status: string
}

async function fetchLiveFeed(gamePk: number): Promise<MlbPlay[]> {
  try {
    const res = await fetch(`${MLB_API}/game/${gamePk}/feed/live`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.warn(`[sync-baseball-events] feed/live failed gamePk=${gamePk}:`, res.status)
      return []
    }
    const data = await res.json()
    return data?.liveData?.plays?.allPlays ?? []
  } catch (e) {
    console.warn(`[sync-baseball-events] feed/live error gamePk=${gamePk}:`, (e as Error).message)
    return []
  }
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
    // 1) 라이브 MLB 매치 (status가 IN1~IN15) 가져옴
    const { data: liveMatches, error } = await supabase
      .from('baseball_matches')
      .select('api_match_id, mlb_game_pk, status')
      .eq('league', 'MLB')
      .like('status', 'IN%')
      .not('mlb_game_pk', 'is', null)
      .limit(50)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    if (!liveMatches || liveMatches.length === 0) {
      return NextResponse.json({
        success: true,
        liveGames: 0,
        eventsInserted: 0,
        eventsSkipped: 0,
        elapsedMs: Date.now() - startedAt,
      })
    }

    let eventsInserted = 0
    let eventsSkipped = 0

    // 2) 각 매치별 feed/live 가져와 events 적재
    const CONCURRENCY = 5
    for (let i = 0; i < liveMatches.length; i += CONCURRENCY) {
      const chunk = liveMatches.slice(i, i + CONCURRENCY) as DBMatch[]
      await Promise.all(
        chunk.map(async (m) => {
          if (!m.mlb_game_pk) return
          const plays = await fetchLiveFeed(m.mlb_game_pk)
          if (plays.length === 0) return

          const eventRows = playsToEventRows(m.api_match_id, plays)
          const inningRows = detectInningChangeRows(m.api_match_id, plays)
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
        }),
      )
    }

    return NextResponse.json({
      success: true,
      liveGames: liveMatches.length,
      eventsInserted,
      eventsSkipped,
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
