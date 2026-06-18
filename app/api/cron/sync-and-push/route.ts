// app/api/cron/sync-and-push/route.ts
//
// 🚀 sync + push 통합 라우트
//    sync-football-events / sync-baseball-events / push-rich-events를 한 번에 호출
//    → cron 주기를 짧게 가져갈 수 있음 (예: 30초 주기) → 일괄 발송 → 개별 발송
//
// 동작:
//   1) sync-football-events + sync-baseball-events 병렬 호출 (api-football/MLB Stats 폴링)
//   2) push-rich-events 호출 (events → FCM)
//
// 호출 주기 권장: 15~30초
//   - 매분 cron + pg_sleep으로 sub-minute 호출
//
// 응답: { success, sync, push, elapsedMs }

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getBaseUrl(): string {
  // Vercel 배포 환경에서는 동일 origin
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  return 'http://localhost:3000'
}

async function callJson(url: string): Promise<any> {
  try {
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(45000) })
    return await r.json().catch(() => ({ success: false, error: 'invalid_json' }))
  } catch (e: any) {
    return { success: false, error: e?.message ?? String(e) }
  }
}

export async function GET(_req: NextRequest) {
  const startedAt = Date.now()
  const base = getBaseUrl()

  try {
    // 1) sync 두 개 병렬 (서로 독립적)
    const [footballSync, baseballSync] = await Promise.all([
      callJson(`${base}/api/cron/sync-football-events`),
      callJson(`${base}/api/cron/sync-baseball-events`),
    ])

    // 2) sync 끝나면 push (events 적재 직후 즉시 발송)
    const push = await callJson(`${base}/api/cron/push-rich-events`)

    return NextResponse.json({
      success: true,
      sync: {
        football: footballSync,
        baseball: baseballSync,
      },
      push,
      elapsedMs: Date.now() - startedAt,
    })
  } catch (e: any) {
    console.error('[sync-and-push] crash:', e?.message ?? e)
    return NextResponse.json(
      { success: false, error: e?.message ?? String(e), elapsedMs: Date.now() - startedAt },
      { status: 500 },
    )
  }
}
