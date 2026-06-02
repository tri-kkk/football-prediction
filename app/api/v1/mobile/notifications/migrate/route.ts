/**
 * POST /api/v1/mobile/notifications/migrate
 *
 * 익명 디바이스(device_token 기반)의 알림 설정을 로그인한 사용자에게 병합.
 * 로그인 직후 1회 호출 (또는 매번 호출해도 멱등).
 *
 * Body: { token: string }   // FCM device token
 *
 * 처리:
 *  1. JWT로 사용자 식별 (필수)
 *  2. device_tokens 행의 user_id가 NULL이면 현재 user_id로 업데이트
 *  3. match_notifications에서 device_token=X & user_id IS NULL 행들을:
 *     - 이미 같은 user의 같은 (match_id, sport) 설정이 있으면 → 익명 row 삭제 (사용자 설정 우선)
 *     - 없으면 → user_id 채움 + device_token NULL로 (사용자 모드로 전환)
 *  4. 카운트 반환
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

export async function POST(request: NextRequest) {
  try {
    const session = await getMobileSession(request)
    const authError = requireAuth(session)
    if (authError) return authError
    const userId = session!.userId

    let body: any
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'Invalid JSON body')
    }

    const { token } = body || {}
    if (!token || typeof token !== 'string' || token.length < 10) {
      return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'token (FCM device token) is required')
    }

    const supabase = getServerSupabase()
    const now = new Date().toISOString()

    // 1. device_tokens — user_id 채움 (이미 다른 user에 등록된 경우는 그 user로 재할당)
    const { data: deviceRow, error: deviceUpdateErr } = await supabase
      .from('device_tokens')
      .update({
        user_id: userId,
        updated_at: now,
        last_active_at: now,
      })
      .eq('token', token)
      .select('id, user_id')
      .maybeSingle()

    if (deviceUpdateErr) {
      console.error('[migrate] device update error:', deviceUpdateErr.message)
    }

    // 2. match_notifications — 익명 설정 row 조회
    const { data: anonNotifs, error: anonFetchErr } = await supabase
      .from('match_notifications')
      .select('id, match_id, sport, enabled, events')
      .eq('device_token', token)
      .is('user_id', null)

    if (anonFetchErr) {
      console.error('[migrate] anon fetch error:', anonFetchErr.message)
      return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Failed to fetch anonymous settings', {
        details: anonFetchErr.message,
      })
    }

    let migrated = 0
    let skippedConflict = 0

    for (const anon of anonNotifs ?? []) {
      // 같은 user의 같은 (match_id, sport) 설정이 이미 있는지
      const { data: existingUserNotif } = await supabase
        .from('match_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('match_id', anon.match_id)
        .eq('sport', anon.sport)
        .maybeSingle()

      if (existingUserNotif) {
        // 사용자 설정 우선 — 익명 row 삭제
        await supabase.from('match_notifications').delete().eq('id', anon.id)
        skippedConflict++
      } else {
        // 익명 → 사용자로 전환 (device_token NULL로 비워서 user 모드 unique 충돌 방지)
        await supabase
          .from('match_notifications')
          .update({
            user_id: userId,
            device_token: null,
            updated_at: now,
          })
          .eq('id', anon.id)
        migrated++
      }
    }

    return successResponse({
      deviceLinked: deviceRow !== null,
      migrated,
      skippedConflict,
    })
  } catch (error) {
    console.error('[migrate] unexpected error:', error)
    return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error')
  }
}
