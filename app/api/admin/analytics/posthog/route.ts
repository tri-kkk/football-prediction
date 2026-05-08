/**
 * Admin Analytics — PostHog 통합 메트릭 API
 *
 * PostHog HogQL 쿼리를 서버 측에서 실행해
 * 어드민 대시보드용 핵심 지표를 한 번에 반환한다.
 *
 * 환경변수:
 *   POSTHOG_PERSONAL_API_KEY  (phx_... 시크릿)
 *   POSTHOG_PROJECT_ID        (PostHog 프로젝트 ID, 예: 414922)
 *   NEXT_PUBLIC_POSTHOG_HOST  (기본 https://us.i.posthog.com)
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PH_HOST_RAW =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
// HogQL Query 엔드포인트는 ingestion 호스트(us.i.) 가 아니라 app 호스트를 써야 함
const PH_APP_HOST = PH_HOST_RAW.replace('us.i.posthog.com', 'us.posthog.com').replace(
  'eu.i.posthog.com',
  'eu.posthog.com'
).replace(/\/$/, '')

const PROJECT_ID = process.env.POSTHOG_PROJECT_ID
const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY

type RangeKey = '24h' | '7d' | '30d'
const RANGE_TO_INTERVAL: Record<RangeKey, string> = {
  '24h': 'INTERVAL 1 DAY',
  '7d': 'INTERVAL 7 DAY',
  '30d': 'INTERVAL 30 DAY',
}

async function hogql(query: string): Promise<any> {
  if (!API_KEY || !PROJECT_ID) {
    throw new Error('POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID 환경변수 누락')
  }
  const res = await fetch(`${PH_APP_HOST}/api/projects/${PROJECT_ID}/query/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PostHog ${res.status}: ${text.slice(0, 300)}`)
  }
  return res.json()
}

function rowsToObjects(result: any): Record<string, any>[] {
  const cols: string[] = result.columns || []
  const rows: any[][] = result.results || []
  return rows.map((r) => {
    const o: Record<string, any> = {}
    cols.forEach((c, i) => (o[c] = r[i]))
    return o
  })
}

export async function GET(req: NextRequest) {
  try {
    const range = (req.nextUrl.searchParams.get('range') || '7d') as RangeKey
    const interval = RANGE_TO_INTERVAL[range] || RANGE_TO_INTERVAL['7d']
    const since = `now() - ${interval}`

    const [summaryRaw, dailyRaw, topPagesRaw, topEventsRaw, funnelRaw] = await Promise.all([
      // 1) 요약 카드
      hogql(`
        SELECT
          uniq(person_id) AS users,
          uniq(distinct_id) AS visitors,
          countIf(event = '$pageview') AS pageviews,
          countIf(event = 'signup_completed') AS signups,
          countIf(event = 'subscription_completed') AS subs,
          sumIf(toFloat(properties.amount), event = 'subscription_completed') AS revenue
        FROM events
        WHERE timestamp >= ${since}
      `),

      // 2) 일자별 트래픽
      hogql(`
        SELECT
          toDate(timestamp) AS date,
          countIf(event = '$pageview') AS pageviews,
          uniqIf(distinct_id, event = '$pageview') AS visitors,
          countIf(event = 'signup_completed') AS signups,
          countIf(event = 'subscription_completed') AS subs
        FROM events
        WHERE timestamp >= ${since}
        GROUP BY date
        ORDER BY date ASC
      `),

      // 3) 인기 페이지 TOP 10
      hogql(`
        SELECT
          properties.$pathname AS path,
          count() AS views
        FROM events
        WHERE event = '$pageview' AND timestamp >= ${since} AND properties.$pathname IS NOT NULL
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10
      `),

      // 4) 커스텀 이벤트 랭킹
      hogql(`
        SELECT event, count() AS c
        FROM events
        WHERE timestamp >= ${since}
          AND NOT startsWith(event, '$')
        GROUP BY event
        ORDER BY c DESC
        LIMIT 20
      `),

      // 5) 회원가입 + 결제 퍼널 (단계별 카운트)
      hogql(`
        SELECT
          countIf(event = 'signup_started') AS signup_started,
          countIf(event = 'signup_completed') AS signup_completed,
          countIf(event = 'login_completed') AS login_completed,
          countIf(event = 'pick_gated') AS pick_gated,
          countIf(event = 'premium_cta_clicked') AS premium_cta_clicked,
          countIf(event = 'checkout_started') AS checkout_started,
          countIf(event = 'subscription_completed') AS subscription_completed
        FROM events
        WHERE timestamp >= ${since}
      `),
    ])

    return NextResponse.json({
      range,
      summary: rowsToObjects(summaryRaw)[0] || {},
      daily: rowsToObjects(dailyRaw),
      topPages: rowsToObjects(topPagesRaw),
      topEvents: rowsToObjects(topEventsRaw),
      funnel: rowsToObjects(funnelRaw)[0] || {},
      generatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('[admin/analytics/posthog] error:', e?.message)
    return NextResponse.json(
      { error: e?.message || 'analytics fetch failed' },
      { status: 500 }
    )
  }
}
