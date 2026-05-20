/**
 * POST /api/v1/mobile/auth/google
 *
 * Flutter 앱에서 google_sign_in으로 받은 accessToken을 검증하고
 * NextAuth 호환 JWT를 발급.
 *
 * 흐름:
 *  1. accessToken → Google userinfo 검증
 *  2. lib/mobile-auth.ts의 handleMobileOAuthLogin이 users/pending/deleted 로직 처리
 *  3. 응답 envelope으로 반환
 *
 * 참고: Flutter google_sign_in은 accessToken과 idToken을 모두 발급함.
 * 본 엔드포인트는 accessToken 기반 — Naver와 인터페이스 통일.
 */

import { NextRequest } from 'next/server'
import { headers } from 'next/headers'

import { handleMobileOAuthLogin } from '@/lib/mobile-auth'
import { ErrorCode, errorResponse, getRequestIP, successResponse } from '@/lib/mobile-api'

interface GoogleProfile {
  sub: string // Google user ID (안정적 식별자)
  email?: string
  email_verified?: boolean
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
  locale?: string
}

async function verifyGoogleToken(accessToken: string): Promise<GoogleProfile | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.warn('[Google] verify status:', res.status)
      return null
    }
    const data: GoogleProfile = await res.json()
    if (!data.sub || !data.email) {
      console.warn('[Google] verify missing sub/email')
      return null
    }
    return data
  } catch (e) {
    console.error('[Google] verify error:', e)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'Invalid JSON body')
    }
    const { accessToken, deviceInfo } = body || {}

    if (!accessToken || typeof accessToken !== 'string') {
      return errorResponse(400, ErrorCode.VALIDATION_ERROR, 'accessToken is required')
    }

    const googleUser = await verifyGoogleToken(accessToken)
    if (!googleUser) {
      return errorResponse(401, ErrorCode.GOOGLE_TOKEN_INVALID, 'Invalid or expired Google token')
    }

    if (!googleUser.email) {
      return errorResponse(
        400,
        ErrorCode.EMAIL_REQUIRED,
        '구글 계정에서 이메일 정보를 받을 수 없습니다.'
      )
    }

    // email_verified=false인 경우 차단 (선택적)
    if (googleUser.email_verified === false) {
      return errorResponse(
        400,
        ErrorCode.EMAIL_REQUIRED,
        '이메일 인증되지 않은 구글 계정입니다. 다른 계정으로 시도해주세요.'
      )
    }

    const headersList = await headers()
    const ip = getRequestIP(headersList)

    const result = await handleMobileOAuthLogin(
      {
        provider: 'google',
        providerId: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name || googleUser.given_name || null,
        avatarUrl: googleUser.picture || null,
      },
      { ip, deviceInfo }
    )

    if (!result.ok) {
      return errorResponse(result.status, result.code, result.message, result.extra)
    }

    return successResponse({
      session: result.session,
      user: result.user,
    })
  } catch (error) {
    console.error('[Google Mobile Auth] unexpected error:', error)
    return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error')
  }
}
