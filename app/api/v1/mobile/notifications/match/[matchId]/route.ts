/**
 * Mobile Match Notification API
 *
 * GET /api/v1/mobile/notifications/match/{matchId}?sport=soccer|baseball
 *   — 해당 매치의 알림 설정 조회. 미설정 시 기본값 응답 (enabled=false, 모든 이벤트 false).
 *
 * PUT /api/v1/mobile/notifications/match/{matchId}
 *   Body: { sport: 'soccer'|'baseball', enabled?: boolean, events?: object }
 *   — 알림 설정 저장/갱신 (upsert).
 *
 * matchId = api_match_id (축구는 API-Football fixture id, 야구는 API-Baseball api_match_id)
 *
 * 인증: Bearer JWT 필수.
 */

import { NextRequest } from 'next/server'

import {
  ErrorCode,
  errorResponse,
  successResponse,
} from '@/lib/mobile-api'
import {
  getMobileSession,
  requireAuth,
  getServerSupabase,
} from '@/lib/mobile-auth'

// 지원 sport
const SPORTS = ['soccer', 'baseball'] as const
type Sport = (typeof SPORTS)[number]

// 이벤트 키 화이트리스트 — 알 수 없는 키가 들어오면 무시
const SOCCER_EVENT_KEYS = ['kickoff', 'goal', 'halftime', 'fulltime', 'yellowCard', 'redCard', 'substitution']
const BASEBALL_EVENT_KEYS = ['firstPitch', 'score', 'inningChange', 'homerun', 'gameEnd']

function defaultEvents(sport: Sport): Record<string, boolean> {
  const keys = sport === 'soccer' ? SOCCER_EVENT_KEYS : BASEBALL_EVENT_KEYS
  return Object.fromEntries(keys.map((k) => [k, false]))
}

function sanitizeEvents(sport: Sport, raw: any): Record<string, boolean> {
  const allowed = sport === 'soccer' ? SOCCER_EVENT_KEYS : BASEBALL_EVENT_KEYS
  const out: Record<string, boolean> = {}
  for (const key of allowed) {
    out[key] = !!raw?.[key]
  }
  return out
}

function parseMatchId(raw: string): number | null {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function parseSport(value: string | null): Sport | null {
  if (!value) return null
  return (SPORTS as readonly string[]).includes(value) ? (value as Sport) : null
}

// ──────────────────────────────────────────────────────────────────
// GET — 설정 조회 (없으면 default)
// ──────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await getMobileSession(request)
    const authError = requireAuth(session)
    if (authError) return authError
    const userId = session!.userId

    const { matchId: matchIdRaw } = await params
    const matchId = parseMatchId(matchIdRaw)
    if (matchId === null) {
      return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'Invalid matchId')
    }

    const { searchParams } = new URL(request.url)
    const sport = parseSport(searchParams.get('sport'))
    if (!sport) {
      return errorResponse(
        400,
        ErrorCode.VALIDATION_ERROR,
        'sport query param required ("soccer" | "baseball")'
      )
    }

    const supabase = getServerSupabase()
    const { data, error } = await supabase
      .from('match_notifications')
      .select('id, enabled, events, updated_at')
      .eq('user_id', userId)
      .eq('match_id', matchId)
      .eq('sport', sport)
      .maybeSingle()

    if (error) {
      console.error('[notifications/match GET] error:', error.message)
      return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Failed to fetch settings', {
        details: error.message,
      })
    }

    if (!data) {
      // 미설정 — 기본값 반환 (앱이 default 표시)
      return successResponse({
        matchId,
        sport,
        enabled: false,
        events: defaultEvents(sport),
        configured: false,
      })
    }

    return successResponse({
      matchId,
      sport,
      enabled: data.enabled,
      events: { ...defaultEvents(sport), ...(data.events as Record<string, boolean>) },
      configured: true,
      updatedAt: data.updated_at,
    })
  } catch (error) {
    console.error('[notifications/match GET] unexpected error:', error)
    return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error')
  }
}

// ──────────────────────────────────────────────────────────────────
// PUT — 저장/갱신 (upsert)
// ──────────────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await getMobileSession(request)
    const authError = requireAuth(session)
    if (authError) return authError
    const userId = session!.userId

    const { matchId: matchIdRaw } = await params
    const matchId = parseMatchId(matchIdRaw)
    if (matchId === null) {
      return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'Invalid matchId')
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'Invalid JSON body')
    }

    const sport = parseSport(body?.sport)
    if (!sport) {
      return errorResponse(
        400,
        ErrorCode.VALIDATION_ERROR,
        'sport required in body ("soccer" | "baseball")'
      )
    }

    const enabled = typeof body?.enabled === 'boolean' ? body.enabled : true
    const events = sanitizeEvents(sport, body?.events ?? {})

    const supabase = getServerSupabase()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('match_notifications')
      .upsert(
        {
          user_id: userId,
          match_id: matchId,
          sport,
          enabled,
          events,
          updated_at: now,
        },
        { onConflict: 'user_id,match_id,sport' }
      )
      .select('id, enabled, events, updated_at')
      .single()

    if (error) {
      console.error('[notifications/match PUT] error:', error.message)
      return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Failed to save settings', {
        details: error.message,
      })
    }

    return successResponse({
      matchId,
      sport,
      enabled: data.enabled,
      events: data.events,
      updatedAt: data.updated_at,
    })
  } catch (error) {
    console.error('[notifications/match PUT] unexpected error:', error)
    return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error')
  }
}
