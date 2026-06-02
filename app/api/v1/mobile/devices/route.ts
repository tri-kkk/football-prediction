/**
 * Mobile Device Token API
 *
 * POST   /api/v1/mobile/devices    — 토큰 등록 (upsert) — 앱 시작 시 + 토큰 갱신 시
 * DELETE /api/v1/mobile/devices    — 토큰 삭제          — 로그아웃 / 알림 끔 / 앱 삭제 직전
 *
 * 토큰은 사용자 단위로 관리. 같은 사용자가 여러 기기에서 로그인하면
 * 각 기기마다 토큰이 추가됨. 한 토큰은 unique — Firebase가 같은 토큰을 다른
 * 사용자에게 발급하는 경우는 거의 없음.
 *
 * 인증: Bearer JWT 필수 (앱 사용자 식별 위해).
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

// ──────────────────────────────────────────────────────────────────
// POST — 등록/갱신 (upsert)
// ──────────────────────────────────────────────────────────────────

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

    const { token, platform, appVersion, locale } = body || {}

    if (!token || typeof token !== 'string') {
      return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'token is required')
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

    // upsert — 같은 token이 이미 다른 사용자에 등록되어 있으면 user_id를 갱신
    // (사용자 A에서 로그아웃 → 사용자 B 로그인한 같은 기기 케이스)
    const { data, error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          app_version: appVersion ?? null,
          locale: locale ?? null,
          updated_at: now,
          last_active_at: now,
        },
        { onConflict: 'token' }
      )
      .select('id, platform, created_at')
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

export async function DELETE(request: NextRequest) {
  try {
    const session = await getMobileSession(request)
    const authError = requireAuth(session)
    if (authError) return authError
    const userId = session!.userId

    // 두 가지 호출 방식 지원:
    //   1) body에 { token: "..." } — 특정 기기 토큰만 폐기 (로그아웃 시 일반적)
    //   2) body 없음 — 이 사용자의 모든 기기 토큰 폐기 (계정 탈퇴/전체 로그아웃 시)
    let token: string | null = null
    try {
      const body = await request.json()
      token = body?.token ?? null
    } catch {
      // 빈 body — 전체 폐기 모드
    }

    const supabase = getServerSupabase()
    let query = supabase.from('device_tokens').delete().eq('user_id', userId)

    if (token) {
      query = query.eq('token', token)
    }

    const { error, count } = await query.select('id', { count: 'exact' })

    if (error) {
      console.error('[devices DELETE] error:', error.message)
      return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Failed to delete device', {
        details: error.message,
      })
    }

    return successResponse({
      removed: count ?? 0,
      scope: token ? 'single' : 'all_user_devices',
    })
  } catch (error) {
    console.error('[devices DELETE] unexpected error:', error)
    return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error')
  }
}
