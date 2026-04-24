// app/api/baseball/cron/batch-predict/route.ts
// 예정된 야구 경기들의 AI 예측을 배치로 실행하고 DB에 저장
// pg_cron에서 매시간 호출 → baseball_odds_latest.ai_* 컬럼 자동 갱신
// 덕분에 사용자가 상세 페이지를 열지 않아도 메인 목록에 AI 예측 표시됨

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const API_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  'https://trendsoccer.com'

// 상태 확인용
export async function GET() {
  // 저장된 예측 수 통계
  const { count: totalWithAi } = await supabase
    .from('baseball_odds_latest')
    .select('*', { count: 'exact', head: true })
    .not('ai_home_win_prob', 'is', null)

  return NextResponse.json({
    status: 'ready',
    apiBase: API_BASE,
    currentAiPredictionsInDb: totalWithAi ?? 0,
    usage: {
      runAll: 'POST {} — 예정 48시간 내 전체 리그',
      runLeague: 'POST { "league": "MLB" }',
      narrowWindow: 'POST { "hoursAhead": 24 }',
      dryRun: 'POST { "dryRun": true } — 실제 호출 없이 대상만 확인',
    },
    note: 'pg_cron에서 매시간 호출 권장. Vercel Pro 800초 내에서 직렬 실행.',
  })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  let body: any = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const {
    league = 'ALL',
    hoursAhead = 48,
    dryRun = false,
    skipFreshHours = 1, // 최근 N시간 내 ai_updated_at이 있는 경기는 skip
  } = body

  // 1. 예정된 경기 조회
  const now = new Date()
  const future = new Date(now.getTime() + hoursAhead * 3600 * 1000)

  let q = supabase
    .from('baseball_matches')
    .select(
      'id, api_match_id, home_team, away_team, league, match_timestamp, match_date, status'
    )
    .in('status', ['NS', 'SCHEDULED', 'TBD'])
    .gte('match_timestamp', now.toISOString())
    .lte('match_timestamp', future.toISOString())
    .order('match_timestamp', { ascending: true })

  if (league !== 'ALL') {
    q = q.eq('league', league)
  }

  const { data: matches, error } = await q
  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
  if (!matches || matches.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'no upcoming matches in window',
      total: 0,
      duration: `${Math.round((Date.now() - startTime) / 1000)}s`,
    })
  }

  // 2. 이미 최근에 예측된 경기 skip
  const apiMatchIds = matches.map((m) => m.api_match_id)
  const { data: freshOdds } = await supabase
    .from('baseball_odds_latest')
    .select('api_match_id, ai_updated_at')
    .in('api_match_id', apiMatchIds)

  const freshCutoff = Date.now() - skipFreshHours * 3600 * 1000
  const freshMap = new Map<number, string | null>(
    (freshOdds || []).map((o: any) => [o.api_match_id, o.ai_updated_at])
  )

  const targets = matches.filter((m) => {
    const updatedAt = freshMap.get(m.api_match_id)
    if (!updatedAt) return true
    return new Date(updatedAt).getTime() < freshCutoff
  })

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      totalCandidates: matches.length,
      toRun: targets.length,
      skipped: matches.length - targets.length,
      sample: targets.slice(0, 10).map((m) => ({
        api_match_id: m.api_match_id,
        league: m.league,
        teams: `${m.home_team} vs ${m.away_team}`,
        startsAt: m.match_timestamp,
      })),
    })
  }

  if (targets.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'all matches already have fresh predictions',
      totalCandidates: matches.length,
      skipped: matches.length,
      duration: `${Math.round((Date.now() - startTime) / 1000)}s`,
    })
  }

  // 3. 각 경기에 대해 full predict 호출 (predict route가 DB upsert)
  let ok = 0
  let failed = 0
  const errors: Array<{ api_match_id: number; reason: string }> = []
  const TIMEOUT_GUARD_MS = 700 * 1000 // Vercel Pro 800초 여유

  for (const m of targets) {
    if (Date.now() - startTime > TIMEOUT_GUARD_MS) {
      console.log(
        `⏱️ batch-predict timeout guard: stopping at ${ok + failed}/${
          targets.length
        }`
      )
      break
    }

    try {
      const res = await fetch(`${API_BASE}/api/baseball/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: m.api_match_id,
          homeTeam: m.home_team,
          awayTeam: m.away_team,
          // quick: false (기본) → full 모드 호출 → predict 내부에서 DB upsert
        }),
        signal: AbortSignal.timeout(30000),
      })
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        ok++
      } else {
        failed++
        errors.push({
          api_match_id: m.api_match_id,
          reason: data.error || `HTTP ${res.status}`,
        })
      }
    } catch (e: any) {
      failed++
      errors.push({
        api_match_id: m.api_match_id,
        reason: e?.message || 'fetch failed',
      })
    }

    // API/Railway 부하 방지 간격
    await new Promise((r) => setTimeout(r, 200))
  }

  const duration = Math.round((Date.now() - startTime) / 1000)

  return NextResponse.json({
    success: true,
    totalCandidates: matches.length,
    attempted: ok + failed,
    ok,
    failed,
    skipped: matches.length - targets.length,
    duration: `${duration}s`,
    errors: errors.slice(0, 10),
    note:
      ok + failed < targets.length
        ? 'early exit due to timeout guard'
        : undefined,
  })
}
