/**
 * Mobile Device Token API
 *
 * POST   /api/v1/mobile/devices    — 토큰 등록 (upsert). JWT 옵셔널 (익명 디바이스 허용)
 * DELETE /api/v1/mobile/devices    — 토큰 폐기. JWT 또는 X-Device-Token 또는 body.token
 *
 * 익명 모드:
 *  - JWT 없이 POST하면 user_id=NULL로 등록
 *  - 이후 로그인 시 POST /api/v1/mobile/notifications/migrate 호출하면
 *    해당 device_token의 user_id가 갱신됨 (병합)
 */

import { NextRequest } from 'next/server'

import {
  ErrorCode,
  errorResponse,
  successResponse,
} from '@/lib/mobile-api'
import {
  getMobileSession,
  getServerSupabase,
} from '@/lib/mobile-auth'

// ──────────────────────────────────────────────────────────────────
// POST — 등록/갱신 (upsert). JWT 옵셔널.
// ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // JWT는 옵셔널 — 있으면 user_id 채움, 없으면 익명
    const session = await getMobileSession(request)
    const userId = session?.termsAgreed ? session.userId : null

    let body: any
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'Invalid JSON body')
    }

    const { token, platform, appVersion, locale } = body || {}

    if (!token || typeof token !== 'string' || token.length < 10) {
      return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'token is required (min 10 chars)')
    }
    if (!platform || (platform !== 'android' && platform !== 'ios')) {
      return errorResponse(
        400,
        ErrorCode.VALIDATION_ERROR,
        'platform must be "android" or "ios"'
      )
    }

    const supabase = getServerSupabase()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,            // null이면 익명
          token,
          platform,
          app_version: appVersion ?? null,
          locale: locale ?? null,
          updated_at: now,
          last_active_at: now,
        },
        { onConflict: 'token' }
      )
      .select('id, platform, user_id, created_at')
      .single()

    if (error) {
      console.error('[devices POST] upsert error:', error.message)
      return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Failed to register device', {
        details: error.message,
      })
    }

    return successResponse({
      deviceId: data?.id,
      platform: data?.platform,
      anonymous: data?.user_id === null,
      registeredAt: data?.created_at,
    })
  } catch (error) {
    console.error('[devices POST] unexpected error:', error)
    return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error')
  }
}

// ──────────────────────────────────────────────────────────────────
// DELETE — 토큰 폐기
// ──────────────────────────────────────────────────────────────────
//
// 우선순위:
//  1) body.token 지정 → 해당 token 1개 삭제
//  2) JWT 있고 body.token 없음 → 그 user의 모든 토큰 일괄 삭제
//  3) X-Device-Token 헤더 → 해당 token 1개 삭제 (익명 모드 로그아웃)
//  4) 위 셋 다 없음 → 400 VALIDATION_ERROR

export async function DELETE(request: NextRequest) {
  try {
    const session = await getMobileSession(request)
    const userId = session?.termsAgreed ? session.userId : null

    let bodyToken: string | null = null
    try {
      const body = await request.json()
      bodyToken = typeof body?.token === 'string' ? body.token : null
    } catch {
      /* body 없음 OK */
    }

    const headerToken = request.headers.get('x-device-token')
    const tokenToDelete = bodyToken ?? headerToken

    const supabase = getServerSupabase()

    if (tokenToDelete) {
      const { error, count } = await supabase
        .from('device_tokens')
        .delete()
        .eq('token', tokenToDelete)
        .select('id', { count: 'exact' })

      if (error) {
        console.error('[devices DELETE] error:', error.message)
        return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Failed to delete device', {
          details: error.message,
        })
      }
      return successResponse({
        removed: count ?? 0,
        scope: 'single_token',
      })
    }

    // body.token도 없고 헤더도 없음 → JWT 있어야 전체 삭제 가능
    if (!userId) {
      return errorResponse(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Provide body.token, X-Device-Token header, or Authorization (Bearer) for bulk delete'
      )
    }

    const { error, count } = await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', userId)
      .select('id', { count: 'exact' })

    if (error) {
      console.error('[devices DELETE bulk] error:', error.message)
      return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Failed to delete devices', {
        details: error.message,
      })
    }

    return successResponse({
      removed: count ?? 0,
      scope: 'all_user_devices',
    })
  } catch (error) {
    console.error('[devices DELETE] unexpected error:', error)
    return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error')
  }
}
