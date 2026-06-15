// app/api/cron/collect-match-results-fast/route.ts
//
// 🚀 축구 매치 status/score 빠른 sync (5분 주기)
//   - 기존 collect-match-results-30min은 모든 리그 fixtures 폴링 → 부하 큼 → 30분 주기 유지
//   - 이 라우트는 api-football /fixtures?live=all + 최근 종료 매치(FT 30분 이내)만 처리
//   - 매치 종료 시점부터 약 5분 안에 status 갱신 → 외주 앱 fixture 화면 lag 단축
//
// 사용:
//   GET /api/cron/collect-match-results-fast
//
// 동작:
//   1) api-football /fixtures?live=all → 현재 라이브 fixture 목록
//   2) DB matches 테이블 검색 — 최근 종료(FT) 1시간 안 매치도 함께 처리 (이전 cron에서 sync 늦은 케이스 대응)
//   3) 각 매치의 status/score를 match_odds_latest에 update
//   4) 응답: { liveCount, recentEndedCount, updated, errors }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!
const API_FOOTBALL_HOST = 'v3.football.api-sports.io'

interface ApiFootballFixture {
  fixture: {
    id: number
    status: { short: string; elapsed: number | null }
    timestamp: number
  }
  teams: { home: { name: string }; away: { name: string } }
  goals: { home: number | null; away: number | null }
}

async function fetchLiveFixtures(): Promise<ApiFootballFixture[]> {
  const res = await fetch(`https://${API_FOOTBALL_HOST}/fixtures?live=all`, {
    headers: {
      'x-rapidapi-key': API_FOOTBALL_KEY,
      'x-rapidapi-host': API_FOOTBALL_HOST,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    console.warn('[collect-fast] /fixtures?live=all failed:', res.status)
    return []
  }
  const data = await res.json()
  return Array.isArray(data?.response) ? data.response : []
}

async function fetchFixturesByIds(ids: number[]): Promise<ApiFootballFixture[]> {
  if (ids.length === 0) return []
  // api-football fixtures?ids= 한 번에 최대 20개
  const chunks: ApiFootballFixture[] = []
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20)
    try {
      const res = await fetch(
        `https://${API_FOOTBALL_HOST}/fixtures?ids=${chunk.join('-')}`,
        {
          headers: {
            'x-rapidapi-key': API_FOOTBALL_KEY,
            'x-rapidapi-host': API_FOOTBALL_HOST,
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        },
      )
      if (!res.ok) continue
      const data = await res.json()
      if (Array.isArray(data?.response)) chunks.push(...data.response)
    } catch (e) {
      console.warn('[collect-fast] fetchFixturesByIds chunk error:', (e as Error).message)
    }
  }
  return chunks
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
    // 1) 라이브 매치 가져옴
    const liveFixtures = await fetchLiveFixtures()

    // 2) 최근 1시간 안 종료된 매치도 다시 한 번 확인 (sync lag 마지막 보정)
    //    matches.status가 1H/2H/HT/ET/BT/P 같은 라이브 상태로 stuck된 케이스 대응
    const recentLiveOrEndedCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: stillLiveDb } = await supabase
      .from('match_odds_latest')
      .select('match_id, status')
      .in('status', ['1H', '2H', 'HT', 'ET', 'BT', 'P'])
      .gte('updated_at', recentLiveOrEndedCutoff)
      .limit(100)

    const liveIds = new Set<number>(
      liveFixtures.map((f) => f.fixture.id).filter((id) => typeof id === 'number'),
    )
    const stuckIds = (stillLiveDb ?? [])
      .map((r) => Number(r.match_id))
      .filter((id) => !liveIds.has(id) && Number.isFinite(id))

    // 3) 라이브 + 의심 stuck 매치 = 총 sync 대상
    const stuckFixtures = await fetchFixturesByIds(stuckIds)
    const allFixtures = [...liveFixtures, ...stuckFixtures]

    let updated = 0
    let errors = 0

    // 4) match_odds_latest 갱신 (개별 호출 — match_id별로)
    for (const f of allFixtures) {
      const mid = f.fixture?.id
      const newStatus = f.fixture?.status?.short
      if (!mid || !newStatus) continue
      const homeScore = f.goals?.home ?? null
      const awayScore = f.goals?.away ?? null
      const update: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }
      if (homeScore !== null) update.home_score = homeScore
      if (awayScore !== null) update.away_score = awayScore

      const { error } = await supabase
        .from('match_odds_latest')
        .update(update)
        .eq('match_id', mid)
      if (error) {
        errors++
        console.warn(`[collect-fast] update error match=${mid}:`, error.message)
      } else {
        updated++
      }
    }

    return NextResponse.json({
      success: true,
      liveCount: liveFixtures.length,
      stuckCount: stuckFixtures.length,
      updated,
      errors,
      elapsedMs: Date.now() - startedAt,
    })
  } catch (e: any) {
    console.error('[collect-fast] crash:', e.message)
    return NextResponse.json(
      { success: false, error: e.message, elapsedMs: Date.now() - startedAt },
      { status: 500 },
    )
  }
}
