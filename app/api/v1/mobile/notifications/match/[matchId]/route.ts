/**
 * Mobile Match Notification API
 *
 * 식별 방식 (우선순위):
 *  1) Authorization: Bearer <JWT>   → 사용자 단위 설정
 *  2) X-Device-Token: <FCM token>   → 익명 디바이스 단위 설정
 *
 * GET /api/v1/mobile/notifications/match/{matchId}?sport=soccer|baseball
 * PUT /api/v1/mobile/notifications/match/{matchId}
 *   Body: { sport: 'soccer'|'baseball', enabled?: boolean, events?: object }
 *
 * matchId = api_match_id (축구: API-Football fixture id, 야구: API-Baseball api_match_id)
 */

import { NextRequest } from 'next/server'

import {
  ErrorCode,
  errorResponse,
  successResponse,
} from '@/lib/mobile-api'
import {
  getMobileIdentity,
  requireIdentity,
  getServerSupabase,
} from '@/lib/mobile-auth'

// 지원 sport
const SPORTS = ['soccer', 'baseball'] as const
type Sport = (typeof SPORTS)[number]

// 이벤트 키 화이트리스트
const SOCCER_EVENT_KEYS = ['kickoff', 'goal', 'halftime', 'secondHalf', 'fulltime', 'yellowCard', 'redCard', 'substitution']
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
// GET
// ──────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const identity = await getMobileIdentity(request)
    const idError = requireIdentity(identity)
    if (idError) return idError

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
    let query = supabase
      .from('match_notifications')
      .select('id, enabled, events, updated_at, user_id, device_token')
      .eq('match_id', matchId)
      .eq('sport', sport)

    if (identity!.type === 'user') {
      query = query.eq('user_id', identity!.userId)
    } else {
      query = query.eq('device_token', identity!.deviceToken).is('user_id', null)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('[notifications/match GET] error:', error.message)
      return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Failed to fetch settings', {
        details: error.message,
      })
    }

    if (!data) {
      return successResponse({
        matchId,
        sport,
        enabled: false,
        events: defaultEvents(sport),
        configured: false,
        identity: identity!.type,
      })
    }

    return successResponse({
      matchId,
      sport,
      enabled: data.enabled,
      events: { ...defaultEvents(sport), ...(data.events as Record<string, boolean>) },
      configured: true,
      identity: identity!.type,
      updatedAt: data.updated_at,
    })
  } catch (error) {
    console.error('[notifications/match GET] unexpected error:', error)
    return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error')
  }
}

// ──────────────────────────────────────────────────────────────────
// PUT
// ──────────────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const identity = await getMobileIdentity(request)
    const idError = requireIdentity(identity)
    if (idError) return idError

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

    const baseRow = {
      match_id: matchId,
      sport,
      enabled,
      events,
      updated_at: now,
      user_id: identity!.type === 'user' ? identity!.userId : null,
      device_token: identity!.type === 'device' ? identity!.deviceToken : null,
    }

    const conflictTarget =
      identity!.type === 'user' ? 'user_id,match_id,sport' : 'device_token,match_id,sport'

    const { data, error } = await supabase
      .from('match_notifications')
      .upsert(baseRow, { onConflict: conflictTarget })
      .select('id, enabled, events, updated_at, user_id, device_token')
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
      identity: identity!.type,
      updatedAt: data.updated_at,
    })
  } catch (error) {
    console.error('[notifications/match PUT] unexpected error:', error)
    return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error')
  }
}
