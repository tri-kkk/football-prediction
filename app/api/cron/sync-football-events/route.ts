// app/api/cron/sync-football-events/route.ts
//
// 🟢 라이브 축구 매치의 실시간 이벤트(골/카드/교체/VAR)를 api-football에서 폴링해 football_events 테이블에 적재.
//    - 1분 주기 pg_cron으로 호출.
//    - push-football-events cron이 별도로 football_events 신규 row를 detect해 FCM 발송.
//
// 흐름:
//   1) GET /fixtures?live=all   → 현재 라이브 fixture id 목록
//   2) 각 fixture에 대해 GET /fixtures/events?fixture={id}
//   3) external_event_id 생성(type|detail|minute|extra|team|player hash) → upsert(중복 차단)
//
// 비용:
//   - 매분 라이브 매치 N개 × 1 호출 → 라이브 매치 N개일 때 (1 + N) 호출/분
//   - 무료 플랜 기준 100 req/분, 유료는 300+/분 → 동시 라이브 50개 안쪽이면 안전
//
// 응답:
//   { success, liveFixtures, eventsInserted, eventsSkipped, elapsedMs }
//
// 보안:
//   - 외부 노출 OK (read-only sync, Supabase service_role_key 사용)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!
const API_FOOTBALL_HOST = 'v3.football.api-sports.io'

interface ApiFootballEvent {
  time: { elapsed: number; extra: number | null }
  team: { id: number; name: string; logo: string | null }
  player: { id: number | null; name: string | null }
  assist: { id: number | null; name: string | null }
  type: string                                   // 'Goal' | 'Card' | 'subst' | 'Var'
  detail: string                                 // 'Normal Goal' | 'Yellow Card' | 'Substitution 1' | ...
  comments: string | null
}

function buildExternalEventId(matchId: number, e: ApiFootballEvent): string {
  // api-football events에 고유 id가 없으므로 핵심 필드 hash로 안정적 dedup key 생성
  const parts = [
    matchId,
    e.type,
    e.detail,
    e.time?.elapsed ?? '',
    e.time?.extra ?? '',
    e.team?.id ?? '',
    e.player?.id ?? '',
    e.player?.name ?? '',
    e.assist?.id ?? '',
  ].join('|')
  return crypto.createHash('sha1').update(parts).digest('hex').slice(0, 32)
}

async function fetchLiveFixtures(): Promise<number[]> {
  const res = await fetch(`https://${API_FOOTBALL_HOST}/fixtures?live=all`, {
    headers: {
      'x-rapidapi-key': API_FOOTBALL_KEY,
      'x-rapidapi-host': API_FOOTBALL_HOST,
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    console.error('[sync-football-events] /fixtures?live=all failed:', res.status)
    return []
  }
  const data = await res.json()
  const fixtures: any[] = data?.response ?? []
  return fixtures.map((f) => f?.fixture?.id).filter((id) => typeof id === 'number')
}

async function fetchEventsForFixture(fixtureId: number): Promise<ApiFootballEvent[]> {
  const res = await fetch(
    `https://${API_FOOTBALL_HOST}/fixtures/events?fixture=${fixtureId}`,
    {
      headers: {
        'x-rapidapi-key': API_FOOTBALL_KEY,
        'x-rapidapi-host': API_FOOTBALL_HOST,
      },
      signal: AbortSignal.timeout(8000),
    },
  )
  if (!res.ok) {
    console.warn(`[sync-football-events] /fixtures/events?fixture=${fixtureId} failed:`, res.status)
    return []
  }
  const data = await res.json()
  return Array.isArray(data?.response) ? data.response : []
}

export async function GET(_req: NextRequest) {
  const startedAt = Date.now()

  if (!API_FOOTBALL_KEY) {
    return NextResponse.json(
      { success: false, error: 'API_FOOTBALL_KEY missing' },
      { status: 500 },
    )
  }

  try {
    // 1) 라이브 fixture id 목록
    const fixtureIds = await fetchLiveFixtures()
    if (fixtureIds.length === 0) {
      return NextResponse.json({
        success: true,
        liveFixtures: 0,
        eventsInserted: 0,
        eventsSkipped: 0,
        elapsedMs: Date.now() - startedAt,
      })
    }

    let eventsInserted = 0
    let eventsSkipped = 0

    // 2) 매치별 이벤트 가져와서 upsert
    //    동시성: api-football quota 보호 위해 5개씩 병렬
    const CONCURRENCY = 5
    for (let i = 0; i < fixtureIds.length; i += CONCURRENCY) {
      const chunk = fixtureIds.slice(i, i + CONCURRENCY)
      await Promise.all(
        chunk.map(async (fixtureId) => {
          const events = await fetchEventsForFixture(fixtureId)
          if (events.length === 0) return

          const rows = events.map((e) => ({
            match_id: fixtureId,
            external_event_id: buildExternalEventId(fixtureId, e),
            type: e.type,
            detail: e.detail,
            minute: e.time?.elapsed ?? null,
            extra_minute: e.time?.extra ?? null,
            team_id: e.team?.id ?? null,
            team_name: e.team?.name ?? null,
            player_id: e.player?.id ?? null,
            player_name: e.player?.name ?? null,
            assist_id: e.assist?.id ?? null,
            assist_name: e.assist?.name ?? null,
            comments: e.comments ?? null,
            raw: e as any,
          }))

          // UNIQUE (match_id, external_event_id) 충돌 시 skip → ignoreDuplicates
          const { data, error } = await supabase
            .from('football_events')
            .upsert(rows, { onConflict: 'match_id,external_event_id', ignoreDuplicates: true })
            .select('id')

          if (error) {
            console.warn(`[sync-football-events] upsert error fixture=${fixtureId}:`, error.message)
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
      liveFixtures: fixtureIds.length,
      eventsInserted,
      eventsSkipped,
      elapsedMs: Date.now() - startedAt,
    })
  } catch (error: any) {
    console.error('[sync-football-events] crash:', error.message)
    return NextResponse.json(
      { success: false, error: error.message, elapsedMs: Date.now() - startedAt },
      { status: 500 },
    )
  }
}
