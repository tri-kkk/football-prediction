/**
 * GET /api/cron/push-baseball-events
 *
 * Supabase pg_cron이 1분마다 호출.
 *
 * 야구는 축구처럼 풍부한 events 배열이 없으므로 DB의 baseball_matches
 * (이미 baseball update-results cron이 1분마다 갱신 중)를 diff로 감지.
 *
 *  - firstPitch: NS → IN1
 *  - inningChange: IN5 → IN6 같은 이닝 번호 증가
 *  - score: home_score/away_score 변화 (homerun 별도 데이터 없음 → score 이벤트로 통합)
 *  - homerun: 별도 데이터 부족으로 일단 score와 같이 처리 (외주 합의 가능)
 *  - gameEnd: ? → FT/AET/POST/CANC/ABD/AWD/WO
 *
 * 상태 저장: match_event_state(sport='baseball')
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { sendToTokens, toFCMData, type FCMSendOptions } from '@/lib/fcm'
import {
  renderBaseballNotification,
  buildEventPayload,
  type BaseballEvent,
  type EventContext,
  type Locale,
} from '@/lib/push-templates'
import {
  isLiveBaseballStatus,
  isFinishedBaseballStatus,
  extractInningNumber,
} from '@/lib/baseballStatus'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface DBMatch {
  api_match_id: number
  league: string
  status: string                   // NS, IN1~IN15, BT, HT, FT, AET, POST, ...
  home_team: string
  away_team: string
  home_team_ko: string | null
  away_team_ko: string | null
  home_team_logo: string | null
  away_team_logo: string | null
  home_score: number | null
  away_score: number | null
  updated_at: string
}

// 외주 규약대로 이벤트별 로고 결정
// - score/homerun: 득점한 팀
// - firstPitch: 홈팀
// - inningChange: 공격 시작 팀 = 원정팀 (이닝 시작은 방문팀 공격부터)
// - gameEnd: 승리 팀 (무승부면 홈팀)
function getBaseballTeamLogo(
  event: BaseballEvent,
  match: DBMatch,
  scoringTeam?: 'home' | 'away'
): string | null {
  const homeLogo = match.home_team_logo || null
  const awayLogo = match.away_team_logo || null

  switch (event) {
    case 'score':
    case 'homerun':
      return scoringTeam === 'away' ? awayLogo : homeLogo
    case 'firstPitch':
      return homeLogo
    case 'inningChange':
      return awayLogo
    case 'gameEnd': {
      const hs = match.home_score ?? 0
      const as = match.away_score ?? 0
      if (hs > as) return homeLogo
      if (as > hs) return awayLogo
      return homeLogo                  // 무승부 → 홈팀
    }
    default:
      return homeLogo
  }
}

interface DetectedEvent {
  event: BaseballEvent
  ctx: EventContext
}

function detectEvents(
  match: DBMatch,
  prev: {
    last_status?: string | null
    last_home_score?: number | null
    last_away_score?: number | null
    last_inning?: string | null
  }
): DetectedEvent[] {
  const detected: DetectedEvent[] = []
  const prevStatus = prev.last_status ?? 'NS'
  const prevHome = prev.last_home_score ?? 0
  const prevAway = prev.last_away_score ?? 0
  const prevInning = prev.last_inning ?? null

  const homeTeam = match.home_team_ko || match.home_team
  const awayTeam = match.away_team_ko || match.away_team
  const homeScore = match.home_score ?? 0
  const awayScore = match.away_score ?? 0
  const currentInning = extractInningNumber(match.status)

  const baseCtx: EventContext = {
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    inning: currentInning ?? undefined,
  }

  // 1. firstPitch — NS → 라이브성 상태
  if (prevStatus === 'NS' && isLiveBaseballStatus(match.status)) {
    detected.push({ event: 'firstPitch', ctx: baseCtx })
  }

  // 2. gameEnd — 미종료 → 종료
  if (
    !isFinishedBaseballStatus(prevStatus) &&
    isFinishedBaseballStatus(match.status)
  ) {
    detected.push({ event: 'gameEnd', ctx: baseCtx })
  }

  // 3. inningChange — 이닝 번호 증가
  if (currentInning && currentInning !== prevInning) {
    // 첫 이닝(IN1) 진입은 firstPitch에서 잡았으므로 inningChange는 IN2부터
    const inningNum = parseInt(currentInning, 10)
    if (inningNum > 1) {
      detected.push({ event: 'inningChange', ctx: baseCtx })
    }
  }

  // 4. score — home_score 또는 away_score 변화
  if (homeScore > prevHome) {
    detected.push({
      event: 'score',
      ctx: { ...baseCtx, scoringTeam: 'home' },
    })
  }
  if (awayScore > prevAway) {
    detected.push({
      event: 'score',
      ctx: { ...baseCtx, scoringTeam: 'away' },
    })
  }

  return detected
}

async function loadTargetTokens(
  supabase: any,
  matchId: number,
  event: BaseballEvent
): Promise<Array<{ token: string; locale: Locale }>> {
  const { data: notifs, error } = await supabase
    .from('match_notifications')
    .select('user_id, device_token, events')
    .eq('match_id', matchId)
    .eq('sport', 'baseball')
    .eq('enabled', true)

  if (error || !notifs?.length) return []

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

  const seen = new Set<string>()
  return out.filter((t) => {
    if (seen.has(t.token)) return false
    seen.add(t.token)
    return true
  })
}

async function dispatchEvent(
  supabase: any,
  matchId: number,
  detected: DetectedEvent,
  match: DBMatch
): Promise<{ sent: number; failed: number; cleaned: number }> {
  const tokens = await loadTargetTokens(supabase, matchId, detected.event)
  if (!tokens.length) return { sent: 0, failed: 0, cleaned: 0 }

  const byLocale: Record<Locale, string[]> = { ko: [], en: [] }
  for (const t of tokens) byLocale[t.locale].push(t.token)

  const teamLogo = getBaseballTeamLogo(detected.event, match, detected.ctx.scoringTeam)

  const data = toFCMData(
    buildEventPayload({
      sport: 'baseball',
      matchId,
      event: detected.event,
      extra: {
        homeTeam: detected.ctx.homeTeam,
        awayTeam: detected.ctx.awayTeam,
        homeScore: detected.ctx.homeScore,
        awayScore: detected.ctx.awayScore,
        inning: detected.ctx.inning,
        teamLogo,
      },
    })
  )

  let sent = 0
  let failed = 0
  const allInvalid: string[] = []

  for (const locale of ['ko', 'en'] as const) {
    if (!byLocale[locale].length) continue
    const notification = renderBaseballNotification(detected.event, detected.ctx, locale)
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

export async function GET(_request: NextRequest) {
  const startedAt = Date.now()

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 오늘 + 어제 라이브성 / 방금 종료된 매치 조회
    // (baseball update-results cron이 1분마다 status/score 갱신하므로 DB가 최신)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const { data: matches, error } = await supabase
      .from('baseball_matches')
      .select(
        'api_match_id, league, status, home_team, away_team, home_team_ko, away_team_ko, home_team_logo, away_team_logo, home_score, away_score, updated_at'
      )
      .gte('match_date', yesterday)
      .limit(100)

    if (error) {
      console.error('[push-baseball] DB query error:', error.message)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        success: true,
        matches: 0,
        events: 0,
        elapsedMs: Date.now() - startedAt,
      })
    }

    const matchIds = matches.map((m) => m.api_match_id)
    const { data: prevStates } = await supabase
      .from('match_event_state')
      .select('*')
      .in('match_id', matchIds)
      .eq('sport', 'baseball')

    const prevMap = new Map<number, any>()
    for (const s of prevStates ?? []) prevMap.set(Number(s.match_id), s)

    let totalEvents = 0
    let totalSent = 0
    let totalFailed = 0
    let totalCleaned = 0

    // ⚡ 최적화: state upsert는 변화 있을 때만 + 한 번에 batch
    const statesToUpsert: any[] = []

    for (const match of matches as DBMatch[]) {
      const prev = prevMap.get(match.api_match_id) ?? {}
      const detected = detectEvents(match, prev)

      // 신규 매치 (DB에 처음 보임)인데 이미 종료/라이브 상태라면 — 첫 cron 실행이라
      // false-positive(놓친 이벤트 폭주) 방지. 단순화: 이전 state 없으면 알림 발송 X, state만 기록
      const isFirstSeen = !prevMap.has(match.api_match_id)

      if (!isFirstSeen && detected.length > 0) {
        for (const ev of detected) {
          const result = await dispatchEvent(supabase, match.api_match_id, ev, match)
          totalEvents++
          totalSent += result.sent
          totalFailed += result.failed
          totalCleaned += result.cleaned

          console.log(
            `[push-baseball] match=${match.api_match_id} event=${ev.event} sent=${result.sent}`
          )
        }
      }

      const currentInning = extractInningNumber(match.status)
      const currentHome = match.home_score ?? 0
      const currentAway = match.away_score ?? 0

      // ⚡ state 변화 있을 때만 upsert (NS/FT 머무는 매치 95% skip)
      const hasChange =
        isFirstSeen ||
        prev.last_status !== match.status ||
        prev.last_home_score !== currentHome ||
        prev.last_away_score !== currentAway ||
        prev.last_inning !== currentInning ||
        detected.length > 0

      if (hasChange) {
        statesToUpsert.push({
          match_id: match.api_match_id,
          sport: 'baseball',
          last_status: match.status,
          last_home_score: currentHome,
          last_away_score: currentAway,
          last_inning: currentInning,
          last_event_ids: [],
          last_run_at: new Date().toISOString(),
        })
      }
    }

    // 한 번에 batch upsert
    if (statesToUpsert.length > 0) {
      const { error: upsertErr } = await supabase
        .from('match_event_state')
        .upsert(statesToUpsert, { onConflict: 'match_id,sport' })
      if (upsertErr) {
        console.warn('[push-baseball] batch state upsert error:', upsertErr.message)
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
    console.error('[push-baseball] unexpected error:', error)
    return NextResponse.json(
      { success: false, error: error.message, elapsedMs: Date.now() - startedAt },
      { status: 500 }
    )
  }
}
