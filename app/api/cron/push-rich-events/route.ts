// app/api/cron/push-rich-events/route.ts
//
// 🚀 events 테이블 기반 통합 푸시 라우트 (v2)
//    sync-football-events / sync-baseball-events cron이 적재한 풍부한 이벤트를
//    push_event_cursor로 매치별 마지막 처리 id 추적하면서 FCM 발송.
//
// 흐름:
//   1) football_events / baseball_events 에서 push_event_cursor.last_pushed_event_id 보다 큰 신규 row만 fetch
//   2) 매치 정보 join (팀명/리그/상태)
//   3) match_notifications 구독자 토큰 조회 → event 타입별 옵트인 필터
//   4) FCM 전송 (ko/en 별 메시지)
//   5) push_event_cursor 업데이트
//
// 응답:
//   { success, footballPushed, baseballPushed, footballEventsSeen, baseballEventsSeen, elapsedMs }
//
// 호출 빈도: 1분 (pg_cron)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import {
  buildEventPayload,
  renderSoccerNotification,
  renderBaseballNotification,
  type Locale,
  type SoccerEvent,
  type BaseballEvent,
  type EventContext,
} from '@/lib/push-templates'
import { sendToTokens, toFCMData } from '@/lib/fcm'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ─────────────────────────────────────────────────────────────
// 매핑: events 테이블의 type/detail → 푸시 템플릿 SoccerEvent/BaseballEvent
// ─────────────────────────────────────────────────────────────

function mapFootballEventType(type: string, detail: string | null): SoccerEvent | null {
  if (type === 'Goal') return 'goal'              // Normal/Penalty/Own/VAR Goal 모두 'goal'로
  if (type === 'Card') {
    if (detail?.toLowerCase().includes('red')) return 'redCard'
    return 'yellowCard'
  }
  if (type === 'subst') return 'substitution'
  return null // Var(코멘트형)는 별도 알림 안 함
}

function mapBaseballEventType(type: string): BaseballEvent | null {
  if (type === 'homerun') return 'homerun'
  if (type === 'score') return 'score'
  if (type === 'inningChange') return 'inningChange'
  // strikeout 등은 아직 템플릿 없음 — skip
  return null
}

// ─────────────────────────────────────────────────────────────
// 구독자 토큰 로드 (sport 공통)
// ─────────────────────────────────────────────────────────────

async function loadTargetTokens(
  matchId: number,
  sport: 'soccer' | 'baseball',
  event: SoccerEvent | BaseballEvent,
): Promise<Array<{ token: string; locale: Locale }>> {
  const { data: notifs } = await supabase
    .from('match_notifications')
    .select('user_id, device_token, events')
    .eq('match_id', matchId)
    .eq('sport', sport)
    .eq('enabled', true)

  if (!notifs?.length) return []
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
    for (const r of dt || []) out.push({ token: r.token, locale: r.locale === 'en' ? 'en' : 'ko' })
  }
  if (directTokens.length) {
    const { data: dt } = await supabase
      .from('device_tokens')
      .select('token, locale')
      .in('token', directTokens)
    for (const r of dt || []) out.push({ token: r.token, locale: r.locale === 'en' ? 'en' : 'ko' })
  }
  // 중복 제거
  const seen = new Set<string>()
  return out.filter((t) => {
    if (seen.has(t.token)) return false
    seen.add(t.token)
    return true
  })
}

// ─────────────────────────────────────────────────────────────
// FCM 발송 (ko/en 분기)
// ─────────────────────────────────────────────────────────────

async function dispatchPush(
  matchId: number,
  sport: 'soccer' | 'baseball',
  event: SoccerEvent | BaseballEvent,
  ctxByLocale: { ko: EventContext; en: EventContext },
  eventSourceId?: number,            // football_events.id 또는 baseball_events.id (옵션, 로그용)
): Promise<{ sent: number; failed: number }> {
  const tokens = await loadTargetTokens(matchId, sport, event)
  if (!tokens.length) {
    // 구독자 0명 — 로그만 남기고 종료
    await safeInsertLog({
      match_id: matchId, sport, event_type: event, event_source_id: eventSourceId ?? null,
      tokens_attempted: 0, tokens_success: 0, tokens_failed: 0,
      invalid_tokens: null, error_message: 'no_subscribers',
      notification_title: null, notification_body: null,
    })
    return { sent: 0, failed: 0 }
  }

  const byLocale: Record<Locale, string[]> = { ko: [], en: [] }
  for (const t of tokens) byLocale[t.locale].push(t.token)

  let sent = 0
  let failed = 0
  const invalidTokens: string[] = []
  let lastErr: string | null = null
  let lastTitle: string | null = null
  let lastBody: string | null = null

  for (const locale of ['ko', 'en'] as const) {
    if (!byLocale[locale].length) continue
    const ctx = ctxByLocale[locale]
    const text =
      sport === 'soccer'
        ? renderSoccerNotification(event as SoccerEvent, ctx, locale)
        : renderBaseballNotification(event as BaseballEvent, ctx, locale)
    lastTitle = text.title
    lastBody = text.body
    const data = toFCMData(
      buildEventPayload({ sport, matchId, event, extra: ctx as any }),
    )
    try {
      const result = await sendToTokens(byLocale[locale], {
        notification: { title: text.title, body: text.body },
        data,
        android: { priority: 'high', notification: { sound: 'default' } },
        apns: { payload: { aps: { sound: 'default' } } },
      })
      sent += result.success ?? 0
      failed += result.failed ?? 0
      // FCM이 invalid라고 응답한 토큰 prefix 수집 (개인정보 보호 위해 앞 30자만)
      if (Array.isArray(result.invalidTokens)) {
        for (const t of result.invalidTokens) {
          invalidTokens.push((t || '').slice(0, 30))
        }
      }
      // 개별 실패 메시지 수집 (lastErr 로깅용)
      const firstErr = result.results.find((r) => !r.ok && r.error)?.error
      if (firstErr) lastErr = `${firstErr.code}: ${firstErr.message ?? ''}`.trim()
    } catch (e: any) {
      failed += byLocale[locale].length
      lastErr = e?.message ?? String(e)
    }
  }

  // 발송 결과 로그 (best-effort, 실패해도 알림 자체에 영향 없음)
  await safeInsertLog({
    match_id: matchId, sport, event_type: event, event_source_id: eventSourceId ?? null,
    tokens_attempted: tokens.length,
    tokens_success: sent,
    tokens_failed: failed,
    invalid_tokens: invalidTokens.length > 0 ? invalidTokens : null,
    error_message: lastErr,
    notification_title: lastTitle,
    notification_body: lastBody,
  })

  return { sent, failed }
}

// 로그 insert (실패해도 throw 안 함)
async function safeInsertLog(row: any) {
  try {
    await supabase.from('push_event_log').insert(row)
  } catch (e) {
    console.warn('[push-rich-events] log insert failed:', (e as Error).message)
  }
}

// ─────────────────────────────────────────────────────────────
// 축구 처리
// ─────────────────────────────────────────────────────────────

async function processFootballEvents(): Promise<{ pushed: number; seen: number }> {
  // 1) 최근 신규 events 가져옴 (id 오름차순 — 매치별 cursor 비교 위해)
  const { data: events } = await supabase
    .from('football_events')
    .select('id, match_id, type, detail, minute, team_id, team_name, player_name, assist_name, comments')
    .order('id', { ascending: true })
    .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // 최근 30분
    .limit(500)

  if (!events?.length) return { pushed: 0, seen: 0 }

  // 2) match별 cursor 가져옴
  const matchIds = Array.from(new Set(events.map((e) => e.match_id)))
  const { data: cursors } = await supabase
    .from('push_event_cursor')
    .select('match_id, last_pushed_event_id')
    .eq('sport', 'soccer')
    .in('match_id', matchIds)
  const cursorMap = new Map<number, number>()
  for (const c of cursors ?? []) cursorMap.set(Number(c.match_id), Number(c.last_pushed_event_id ?? 0))

  // 3) 매치 정보 join
  //    매치 본체는 match_odds_latest (text match_id 사용 — API-football fixture id)
  //    한국어 팀명은 별도 team_translations(있을 경우)에서 fallback
  const matchIdStrings = matchIds.map((m) => String(m))
  const { data: matches } = await supabase
    .from('match_odds_latest')
    .select('match_id, home_team, away_team, home_team_id, away_team_id')
    .in('match_id', matchIdStrings)
  const matchMap = new Map<number, any>()
  for (const m of matches ?? []) matchMap.set(Number(m.match_id), m)

  // 4) 매치별 신규 이벤트 처리
  let pushed = 0
  const lastPushedByMatch = new Map<number, number>()

  for (const e of events) {
    const matchId = Number(e.match_id)
    const lastCursor = lastPushedByMatch.get(matchId) ?? cursorMap.get(matchId) ?? 0
    if (e.id <= lastCursor) continue

    const eventType = mapFootballEventType(e.type, e.detail)
    if (!eventType) {
      lastPushedByMatch.set(matchId, e.id) // skip해도 cursor 진행
      continue
    }

    const match = matchMap.get(matchId)
    if (!match) {
      lastPushedByMatch.set(matchId, e.id)
      continue
    }

    // scoringTeam — events.team_id 와 match.home_team_id 비교
    const scoringTeam: 'home' | 'away' =
      e.team_id && match.home_team_id && Number(e.team_id) === Number(match.home_team_id)
        ? 'home'
        : 'away'

    // 골 이벤트면 누적 스코어 계산 (이 골 포함, Missed Penalty 제외, Own Goal은 상대팀 점수)
    let homeScore: number | undefined
    let awayScore: number | undefined
    if (eventType === 'goal' && e.detail !== 'Missed Penalty') {
      const { data: goalsSoFar } = await supabase
        .from('football_events')
        .select('team_id, detail')
        .eq('match_id', matchId)
        .eq('type', 'Goal')
        .neq('detail', 'Missed Penalty')
        .lte('id', e.id)
      let h = 0, a = 0
      for (const g of goalsSoFar ?? []) {
        const teamIsHome = match.home_team_id && Number(g.team_id) === Number(match.home_team_id)
        const isOwnGoal = g.detail === 'Own Goal'
        const homeGoal = isOwnGoal ? !teamIsHome : teamIsHome
        if (homeGoal) h++
        else a++
      }
      homeScore = h
      awayScore = a
    }

    // 한·영 context (팀명 분기 + assist + 스코어 포함)
    const ctxKo: EventContext = {
      homeTeam: match.home_team_ko || match.home_team,
      awayTeam: match.away_team_ko || match.away_team,
      elapsed: e.minute ?? undefined,
      player: e.player_name ?? undefined,
      assist: e.assist_name ?? undefined,
      scoringTeam,
      detail: e.detail ?? undefined,
      homeScore,
      awayScore,
    }
    const ctxEn: EventContext = {
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      elapsed: e.minute ?? undefined,
      player: e.player_name ?? undefined,
      assist: e.assist_name ?? undefined,
      scoringTeam,
      detail: e.detail ?? undefined,
      homeScore,
      awayScore,
    }

    const r = await dispatchPush(matchId, 'soccer', eventType, { ko: ctxKo, en: ctxEn }, Number(e.id))
    if (r.sent > 0 || r.failed > 0) pushed++
    lastPushedByMatch.set(matchId, e.id)
  }

  // 5) cursor 업데이트
  if (lastPushedByMatch.size > 0) {
    const updates = Array.from(lastPushedByMatch.entries()).map(([match_id, last_pushed_event_id]) => ({
      match_id,
      sport: 'soccer',
      last_pushed_event_id,
      last_pushed_at: new Date().toISOString(),
    }))
    await supabase
      .from('push_event_cursor')
      .upsert(updates, { onConflict: 'match_id,sport' })
  }

  return { pushed, seen: events.length }
}

// ─────────────────────────────────────────────────────────────
// 야구 처리
// ─────────────────────────────────────────────────────────────

async function processBaseballEvents(): Promise<{ pushed: number; seen: number }> {
  const { data: events } = await supabase
    .from('baseball_events')
    .select('id, match_id, type, inning, half_inning, team, player_name, detail, home_score, away_score')
    .order('id', { ascending: true })
    .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .limit(500)

  if (!events?.length) return { pushed: 0, seen: 0 }

  const matchIds = Array.from(new Set(events.map((e) => e.match_id)))
  const { data: cursors } = await supabase
    .from('push_event_cursor')
    .select('match_id, last_pushed_event_id')
    .eq('sport', 'baseball')
    .in('match_id', matchIds)
  const cursorMap = new Map<number, number>()
  for (const c of cursors ?? []) cursorMap.set(Number(c.match_id), Number(c.last_pushed_event_id ?? 0))

  const { data: matches } = await supabase
    .from('baseball_matches')
    .select('api_match_id, home_team, away_team, home_team_ko, away_team_ko')
    .in('api_match_id', matchIds)
  const matchMap = new Map<number, any>()
  for (const m of matches ?? []) matchMap.set(Number(m.api_match_id), m)

  let pushed = 0
  const lastPushedByMatch = new Map<number, number>()

  for (const e of events) {
    const matchId = Number(e.match_id)
    const lastCursor = lastPushedByMatch.get(matchId) ?? cursorMap.get(matchId) ?? 0
    if (e.id <= lastCursor) continue

    const eventType = mapBaseballEventType(e.type)
    if (!eventType) {
      lastPushedByMatch.set(matchId, e.id)
      continue
    }
    const match = matchMap.get(matchId)
    if (!match) {
      lastPushedByMatch.set(matchId, e.id)
      continue
    }

    const scoringTeam = e.team === 'home' ? 'home' : 'away'
    const inningNum = e.inning ? e.inning.replace(/^IN/, '') : undefined

    const ctxKo: EventContext = {
      homeTeam: match.home_team_ko || match.home_team,
      awayTeam: match.away_team_ko || match.away_team,
      homeScore: e.home_score ?? 0,
      awayScore: e.away_score ?? 0,
      inning: inningNum,
      player: e.player_name ?? undefined,
      scoringTeam,
      detail: e.detail ?? undefined,
    }
    const ctxEn: EventContext = {
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      homeScore: e.home_score ?? 0,
      awayScore: e.away_score ?? 0,
      inning: inningNum,
      player: e.player_name ?? undefined,
      scoringTeam,
      detail: e.detail ?? undefined,
    }

    const r = await dispatchPush(matchId, 'baseball', eventType, { ko: ctxKo, en: ctxEn }, Number(e.id))
    if (r.sent > 0 || r.failed > 0) pushed++
    lastPushedByMatch.set(matchId, e.id)
  }

  if (lastPushedByMatch.size > 0) {
    const updates = Array.from(lastPushedByMatch.entries()).map(([match_id, last_pushed_event_id]) => ({
      match_id,
      sport: 'baseball',
      last_pushed_event_id,
      last_pushed_at: new Date().toISOString(),
    }))
    await supabase
      .from('push_event_cursor')
      .upsert(updates, { onConflict: 'match_id,sport' })
  }

  return { pushed, seen: events.length }
}


// ====================================
// 메인 핸들러
// ====================================

export async function GET(_req: NextRequest) {
  const startedAt = Date.now()
  try {
    const [football, baseball] = await Promise.all([
      processFootballEvents(),
      processBaseballEvents(),
    ])
    return NextResponse.json({
      success: true,
      footballPushed: football.pushed,
      footballEventsSeen: football.seen,
      baseballPushed: baseball.pushed,
      baseballEventsSeen: baseball.seen,
      elapsedMs: Date.now() - startedAt,
    })
  } catch (e: any) {
    console.error('[push-rich-events] crash:', e?.message ?? e)
    return NextResponse.json(
      { success: false, error: e?.message ?? String(e), elapsedMs: Date.now() - startedAt },
      { status: 500 },
    )
  }
}
