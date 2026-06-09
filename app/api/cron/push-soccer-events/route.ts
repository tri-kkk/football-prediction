/**
 * GET /api/cron/push-soccer-events
 *
 * Supabase pg_cron이 1분마다 호출.
 *
 * 흐름:
 *  1. /api/live-matches 호출 → 현재 라이브 축구 매치 목록 + events 배열
 *  2. 각 매치별로 match_event_state(이전 상태)와 비교 → 새 이벤트 추출
 *     - status diff: NS→1H = kickoff, ?→HT = halftime, ?→FT/AET/PEN = fulltime
 *     - events diff: time+type+player로 만든 unique id로 중복 제거
 *       - type='goal' → goal
 *       - type='card', detail에 'Red' → redCard, 그 외 → yellowCard
 *       - type='subst' → substitution
 *  3. 각 이벤트마다 match_notifications에서 해당 이벤트 ON된 사용자/디바이스 조회
 *  4. user → device_tokens 조인, device_token → device_tokens 직접 조회
 *  5. locale별로 그룹화 → FCM 발송
 *  6. match_event_state 갱신 + invalid 토큰 정리
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import {
  sendToTokens,
  toFCMData,
  type FCMSendOptions,
} from '@/lib/fcm'
import {
  renderSoccerNotification,
  buildEventPayload,
  type SoccerEvent,
  type EventContext,
  type Locale,
} from '@/lib/push-templates'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN'])
const LIVE_STATUSES_KICKOFF = new Set(['1H']) // NS→1H = kickoff

interface LiveMatch {
  id: number
  leagueCode: string
  status: string                       // NS/1H/HT/2H/ET/FT/AET/PEN/...
  elapsed: number
  homeTeam: string
  awayTeam: string
  homeTeamKR?: string
  awayTeamKR?: string
  homeCrest?: string                   // 팀 로고 URL
  awayCrest?: string
  homeScore: number
  awayScore: number
  events?: Array<{
    time: number
    type: 'goal' | 'card' | 'subst'
    team: 'home' | 'away'
    player: string
    detail?: string
  }>
}

// 외주 규약대로 이벤트별 로고 결정
function getSoccerTeamLogo(
  event: SoccerEvent,
  match: LiveMatch,
  scoringTeam?: 'home' | 'away'
): string | null {
  const homeLogo = match.homeCrest || null
  const awayLogo = match.awayCrest || null

  switch (event) {
    case 'goal':
      return scoringTeam === 'away' ? awayLogo : homeLogo
    case 'kickoff':
      return homeLogo
    case 'fulltime': {
      const hs = match.homeScore ?? 0
      const as = match.awayScore ?? 0
      if (hs > as) return homeLogo
      if (as > hs) return awayLogo
      return homeLogo                  // 무승부 → 홈팀
    }
    case 'halftime':
    case 'yellowCard':
    case 'redCard':
    case 'substitution':
    default:
      return homeLogo
  }
}

interface DetectedEvent {
  event: SoccerEvent
  eventId?: string                     // events 배열에서 온 unique id
  ctx: EventContext
}

async function fetchLiveMatches(baseUrl: string): Promise<LiveMatch[]> {
  try {
    const res = await fetch(`${baseUrl}/api/live-matches`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      console.warn(`[push-soccer] /api/live-matches HTTP ${res.status}`)
      return []
    }
    const data = await res.json()
    return data?.matches ?? []
  } catch (e) {
    console.error('[push-soccer] live-matches fetch failed:', (e as Error).message)
    return []
  }
}

function detectEvents(
  match: LiveMatch,
  prev: {
    last_status?: string | null
    last_home_score?: number | null
    last_away_score?: number | null
    last_event_ids?: any
  }
): DetectedEvent[] {
  const detected: DetectedEvent[] = []
  const prevStatus = prev.last_status ?? 'NS'
  const prevEventIds: string[] = Array.isArray(prev.last_event_ids)
    ? prev.last_event_ids
    : []

  const baseCtx: EventContext = {
    homeTeam: match.homeTeamKR || match.homeTeam,
    awayTeam: match.awayTeamKR || match.awayTeam,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
  }

  // 1. status diff
  if (prevStatus === 'NS' && LIVE_STATUSES_KICKOFF.has(match.status)) {
    detected.push({ event: 'kickoff', ctx: baseCtx })
  }
  if (prevStatus !== 'HT' && match.status === 'HT') {
    detected.push({ event: 'halftime', ctx: baseCtx })
  }
  if (!FINISHED_STATUSES.has(prevStatus) && FINISHED_STATUSES.has(match.status)) {
    detected.push({ event: 'fulltime', ctx: baseCtx })
  }

  // 2. events 배열 diff (goal/card/subst)
  const seen = new Set(prevEventIds)
  for (const e of match.events ?? []) {
    const id = `${e.time}-${e.type}-${e.player}-${e.team}`
    if (seen.has(id)) continue
    seen.add(id)

    let pushEvent: SoccerEvent | null = null
    if (e.type === 'goal') pushEvent = 'goal'
    else if (e.type === 'card') {
      pushEvent = (e.detail ?? '').toLowerCase().includes('red')
        ? 'redCard'
        : 'yellowCard'
    } else if (e.type === 'subst') {
      pushEvent = 'substitution'
    }

    if (pushEvent) {
      detected.push({
        event: pushEvent,
        eventId: id,
        ctx: {
          ...baseCtx,
          elapsed: e.time,
          player: e.player,
          scoringTeam: e.team,
        },
      })
    }
  }

  return detected
}

// match_notifications에서 이 이벤트 ON된 row 조회 → token+locale 리스트로 변환
async function loadTargetTokens(
  supabase: any,
  matchId: number,
  event: SoccerEvent
): Promise<Array<{ token: string; locale: Locale }>> {
  const { data: notifs, error } = await supabase
    .from('match_notifications')
    .select('user_id, device_token, events')
    .eq('match_id', matchId)
    .eq('sport', 'soccer')
    .eq('enabled', true)

  if (error || !notifs?.length) return []

  // 클라이언트 사이드에서 events JSON 필터
  const filtered = notifs.filter((n: any) => n.events?.[event] === true)
  if (!filtered.length) return []

  const userIds = filtered.filter((n: any) => n.user_id).map((n: any) => n.user_id)
  const directTokens = filtered
    .filter((n: any) => n.device_token && !n.user_id)
    .map((n: any) => n.device_token)

  const out: Array<{ token: string; locale: Locale }> = []

  if (userIds.length) {
    const { data: dt } = await supabase
      .from('device_tokens')
      .select('token, locale')
      .in('user_id', userIds)
    for (const r of dt || []) {
      out.push({ token: r.token, locale: r.locale === 'en' ? 'en' : 'ko' })
    }
  }
  if (directTokens.length) {
    const { data: dt } = await supabase
      .from('device_tokens')
      .select('token, locale')
      .in('token', directTokens)
    for (const r of dt || []) {
      out.push({ token: r.token, locale: r.locale === 'en' ? 'en' : 'ko' })
    }
  }

  // 중복 토큰 제거 (user + device 둘 다 잡힐 수도)
  const seenTokens = new Set<string>()
  return out.filter((t) => {
    if (seenTokens.has(t.token)) return false
    seenTokens.add(t.token)
    return true
  })
}

async function dispatchEvent(
  supabase: any,
  matchId: number,
  detected: DetectedEvent,
  match: LiveMatch
): Promise<{ sent: number; failed: number; cleaned: number }> {
  const tokens = await loadTargetTokens(supabase, matchId, detected.event)
  if (!tokens.length) return { sent: 0, failed: 0, cleaned: 0 }

  const byLocale: Record<Locale, string[]> = { ko: [], en: [] }
  for (const t of tokens) byLocale[t.locale].push(t.token)

  const teamLogo = getSoccerTeamLogo(detected.event, match, detected.ctx.scoringTeam)

  const data = toFCMData(
    buildEventPayload({
      sport: 'soccer',
      matchId,
      event: detected.event,
      extra: {
        homeTeam: detected.ctx.homeTeam,
        awayTeam: detected.ctx.awayTeam,
        homeScore: detected.ctx.homeScore,
        awayScore: detected.ctx.awayScore,
        teamLogo,
      },
    })
  )

  let sent = 0
  let failed = 0
  const allInvalid: string[] = []

  for (const locale of ['ko', 'en'] as const) {
    if (!byLocale[locale].length) continue

    const notification = renderSoccerNotification(detected.event, detected.ctx, locale)
    const options: FCMSendOptions = {
      notification,
      data,
      android: {
        priority: 'high',
        notification: { sound: 'default', channel_id: 'match_events' },
      },
      apns: { payload: { aps: { sound: 'default' } } },
    }

    const result = await sendToTokens(byLocale[locale], options)
    sent += result.success
    failed += result.failed
    allInvalid.push(...result.invalidTokens)
  }

  // invalid 토큰 정리
  let cleaned = 0
  if (allInvalid.length) {
    const { count } = await supabase
      .from('device_tokens')
      .delete()
      .in('token', allInvalid)
      .select('id', { count: 'exact' })
    cleaned = count ?? 0
  }

  return { sent, failed, cleaned }
}

// ──────────────────────────────────────────────────────────────────
// 메인 GET
// ──────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const startedAt = Date.now()

  try {
    const baseUrl = new URL(request.url).origin
    const matches = await fetchLiveMatches(baseUrl)

    if (matches.length === 0) {
      return NextResponse.json({
        success: true,
        matches: 0,
        events: 0,
        message: 'No live matches',
        elapsedMs: Date.now() - startedAt,
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 이전 상태 일괄 조회
    const matchIds = matches.map((m) => m.id)
    const { data: prevStates } = await supabase
      .from('match_event_state')
      .select('*')
      .in('match_id', matchIds)
      .eq('sport', 'soccer')

    const prevMap = new Map<number, any>()
    for (const s of prevStates ?? []) prevMap.set(s.match_id, s)

    let totalEvents = 0
    let totalSent = 0
    let totalFailed = 0
    let totalCleaned = 0

    // ⚡ 최적화: state upsert는 변화 있을 때만 + 병렬 호출 (Promise.all)
    const statesToUpsert: any[] = []

    for (const match of matches) {
      const prev = prevMap.get(match.id) ?? {}
      const detected = detectEvents(match, prev)

      for (const ev of detected) {
        const result = await dispatchEvent(supabase, match.id, ev, match)
        totalEvents++
        totalSent += result.sent
        totalFailed += result.failed
        totalCleaned += result.cleaned

        console.log(
          `[push-soccer] match=${match.id} event=${ev.event} sent=${result.sent} failed=${result.failed}`
        )
      }

      // 새 event_id 누적 (최대 200개)
      const prevIds: string[] = Array.isArray(prev.last_event_ids)
        ? prev.last_event_ids
        : []
      const newIds = detected.map((d) => d.eventId).filter(Boolean) as string[]
      const mergedIds = newIds.length > 0 ? [...prevIds, ...newIds].slice(-200) : prevIds

      // ⚡ 변화 있을 때만 upsert
      const hasChange =
        prev.last_status !== match.status ||
        prev.last_home_score !== match.homeScore ||
        prev.last_away_score !== match.awayScore ||
        detected.length > 0

      if (hasChange) {
        statesToUpsert.push({
          match_id: match.id,
          sport: 'soccer',
          last_status: match.status,
          last_home_score: match.homeScore,
          last_away_score: match.awayScore,
          last_event_ids: mergedIds,
          last_run_at: new Date().toISOString(),
        })
      }
    }

    // 변화 있는 매치만 병렬 upsert (Promise.all)
    if (statesToUpsert.length > 0) {
      const results = await Promise.all(
        statesToUpsert.map((row) =>
          supabase
            .from('match_event_state')
            .upsert(row, { onConflict: 'match_id,sport' })
            .then((r) => r.error)
            .catch((e) => e as Error)
        )
      )
      const errs = results.filter(Boolean)
      if (errs.length) {
        console.warn(
          `[push-soccer] ${errs.length}/${statesToUpsert.length} state upsert errors. First:`,
          (errs[0] as any)?.message ?? String(errs[0])
        )
      }
    }

    return NextResponse.json({
      success: true,
      matches: matches.length,
      events: totalEvents,
      sent: totalSent,
      failed: totalFailed,
      cleanedInvalidTokens: totalCleaned,
      elapsedMs: Date.now() - startedAt,
    })
  } catch (error: any) {
    console.error('[push-soccer] unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        elapsedMs: Date.now() - startedAt,
      },
      { status: 500 }
    )
  }
}
