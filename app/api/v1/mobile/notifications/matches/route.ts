/**
 * Mobile Match Notification — 배치 조회 API
 *
 * GET /api/v1/mobile/notifications/matches?sport=soccer|baseball&ids=1,2,3,...
 *
 * 응답:
 *   {
 *     success: true,
 *     results: {
 *       "1": { enabled: true, events: { kickoff: true, goal: true, ... } },
 *       "2": null,   // 구독 안 함
 *       ...
 *     }
 *   }
 *
 * 식별 방식 (우선순위, 단건 GET 라우트와 동일):
 *   1) Authorization: Bearer <JWT>
 *   2) X-Device-Token: <FCM token>
 *
 * 응답 시각 ~50개 매치 ID까지 한 번에 조회 가능 (앱 매치 리스트 렌더링용)
 */

import { NextRequest } from 'next/server'
import {
  getMobileIdentity,
  getServerSupabase,
} from '@/lib/mobile-auth'
import {
  ErrorCode,
  errorResponse,
  successResponse,
} from '@/lib/mobile-api'

const SPORTS = ['soccer', 'baseball'] as const
type Sport = (typeof SPORTS)[number]

function parseSport(raw: string | null): Sport | null {
  if (!raw) return null
  const s = raw.toLowerCase()
  return (SPORTS as readonly string[]).includes(s) ? (s as Sport) : null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sport = parseSport(searchParams.get('sport'))
  if (!sport) {
    return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'sport는 soccer 또는 baseball')
  }

  const idsParam = searchParams.get('ids') ?? ''
  const ids = idsParam
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)

  if (ids.length === 0) {
    return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'ids 파라미터 필요 (콤마 구분)')
  }
  if (ids.length > 50) {
    return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'ids는 최대 50개까지')
  }

  // 식별 (user_id 또는 device_token)
  const identity = await getMobileIdentity(request)
  if (!identity) {
    return errorResponse(401, ErrorCode.UNAUTHORIZED, '인증 필요 (JWT 또는 X-Device-Token)')
  }

  const supabase = getServerSupabase()

  // 식별자별로 다른 조건 적용
  let query = supabase
    .from('match_notifications')
    .select('match_id, enabled, events')
    .eq('sport', sport)
    .in('match_id', ids)

  if (identity.type === 'user') {
    query = query.eq('user_id', identity.userId)
  } else {
    query = query.eq('device_token', identity.deviceToken)
  }

  const { data, error } = await query
  if (error) {
    return errorResponse(500, ErrorCode.INTERNAL_ERROR, error.message)
  }

  // matchId → 구독 정보 매핑
  const map: Record<string, any> = {}
  for (const id of ids) map[String(id)] = null
  for (const row of data ?? []) {
    map[String(row.match_id)] = { enabled: row.enabled, events: row.events }
  }

  return successResponse({ results: map })
}
