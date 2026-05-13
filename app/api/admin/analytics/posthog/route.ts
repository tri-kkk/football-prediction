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
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PH_HOST_RAW = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
const PH_APP_HOST = PH_HOST_RAW.replace('us.i.posthog.com', 'us.posthog.com').replace('eu.i.posthog.com', 'eu.posthog.com').replace(/\/$/, '')
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID
const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY

type RangeKey = '24h' | '7d' | '30d'
const RANGE_TO_INTERVAL: Record<RangeKey, string> = {
  '24h': 'INTERVAL 1 DAY',
  '7d': 'INTERVAL 7 DAY',
  '30d': 'INTERVAL 30 DAY',
}

function getRangeStart(range: RangeKey): Date {
  const now = new Date()
  if (range === '24h') return new Date(now.getTime() - 24 * 60 * 60 * 1000)
  if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
}

async function hogql(query: string): Promise<any> {
  if (!API_KEY || !PROJECT_ID) throw new Error('POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID 환경변수 누락')
  const res = await fetch(`${PH_APP_HOST}/api/projects/${PROJECT_ID}/query/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
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

const toKstDate = (iso: string): string => {
  const d = new Date(iso)
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  try {
    const range = (req.nextUrl.searchParams.get('range') || '7d') as RangeKey
    const interval = RANGE_TO_INTERVAL[range] || RANGE_TO_INTERVAL['7d']
    const since = `now() - ${interval}`
    const rangeStartIso = getRangeStart(range).toISOString()

    const [
      summaryRaw, dailyRaw, topPagesRaw, topEventsRaw, funnelRaw,
      dbUsersTotal, dbUsersInRange, dbPendingInRange, dbSubsActive, dbSubsInRange,
      dbUsersDaily, dbSubsDaily,
    ] = await Promise.all([
      hogql(`SELECT uniq(person_id) AS users, uniq(distinct_id) AS visitors, countIf(event = '$pageview') AS pageviews FROM events WHERE timestamp >= ${since}`),
      hogql(`SELECT toDate(timestamp) AS date, countIf(event = '$pageview') AS pageviews, uniqIf(distinct_id, event = '$pageview') AS visitors FROM events WHERE timestamp >= ${since} GROUP BY date ORDER BY date ASC`),
      hogql(`SELECT properties.$pathname AS path, count() AS views FROM events WHERE event = '$pageview' AND timestamp >= ${since} AND properties.$pathname IS NOT NULL GROUP BY path ORDER BY views DESC LIMIT 10`),
      hogql(`SELECT event, count() AS c FROM events WHERE timestamp >= ${since} AND NOT startsWith(event, '$') GROUP BY event ORDER BY c DESC LIMIT 20`),
      hogql(`SELECT countIf(event = 'signup_started') AS signup_started, countIf(event = 'signup_completed') AS signup_completed, countIf(event = 'login_completed') AS login_completed, countIf(event = 'pick_gated') AS pick_gated, countIf(event = 'premium_cta_clicked') AS premium_cta_clicked, countIf(event = 'checkout_started') AS checkout_started, countIf(event = 'subscription_completed') AS subscription_completed FROM events WHERE timestamp >= ${since}`),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', rangeStartIso),
      supabase.from('pending_users').select('*', { count: 'exact', head: true }).gte('created_at', rangeStartIso),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).gte('created_at', rangeStartIso),
      supabase.from('users').select('created_at').gte('created_at', rangeStartIso),
      supabase.from('subscriptions').select('created_at,amount').gte('created_at', rangeStartIso),
    ])

    const dailySignupMap = new Map<string, number>()
    for (const r of ((dbUsersDaily as any).data || [])) {
      const k = toKstDate(r.created_at)
      dailySignupMap.set(k, (dailySignupMap.get(k) || 0) + 1)
    }
    const dailySubsMap = new Map<string, number>()
    let dbRevenue = 0
    for (const r of ((dbSubsDaily as any).data || [])) {
      const k = toKstDate(r.created_at)
      dailySubsMap.set(k, (dailySubsMap.get(k) || 0) + 1)
      dbRevenue += Number(r.amount) || 0
    }

    const dailyMerged = rowsToObjects(dailyRaw).map((row: any) => ({
      ...row,
      signups: dailySignupMap.get(row.date) || 0,
      subs: dailySubsMap.get(row.date) || 0,
    }))

    return NextResponse.json({
      range,
      summary: rowsToObjects(summaryRaw)[0] || {},
      daily: dailyMerged,
      topPages: rowsToObjects(topPagesRaw),
      topEvents: rowsToObjects(topEventsRaw),
      funnel: rowsToObjects(funnelRaw)[0] || {},
      db: {
        usersTotal: dbUsersTotal.count || 0,
        usersInRange: dbUsersInRange.count || 0,
        pendingInRange: dbPendingInRange.count || 0,
        subsActive: dbSubsActive.count || 0,
        subsInRange: dbSubsInRange.count || 0,
        revenue: dbRevenue,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('[admin/analytics/posthog] error:', e?.message)
    return NextResponse.json({ error: e?.message || 'analytics fetch failed' }, { status: 500 })
  }
}