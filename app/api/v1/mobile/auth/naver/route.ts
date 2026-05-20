/**
 * POST /api/v1/mobile/auth/naver
 *
 * Flutter 앱에서 flutter_naver_login으로 받은 accessToken을 검증하고
 * NextAuth 호환 JWT를 발급.
 *
 * 흐름:
 *  1. accessToken → 네이버 openapi 검증
 *  2. lib/mobile-auth.ts의 handleMobileOAuthLogin이 users/pending/deleted 로직 처리
 *  3. 응답 envelope으로 반환
 */

import { NextRequest } from 'next/server'
import { headers } from 'next/headers'

import { handleMobileOAuthLogin } from '@/lib/mobile-auth'
import { ErrorCode, errorResponse, getRequestIP, successResponse } from '@/lib/mobile-api'

interface NaverProfile {
  id: string
  email?: string
  name?: string
  nickname?: string
  profile_image?: string
}

async function verifyNaverToken(accessToken: string): Promise<NaverProfile | null> {
  try {
    const res = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.warn('[Naver] verify status:', res.status)
      return null
    }
    const data: { resultcode: string; message: string; response?: NaverProfile } =
      await res.json()
    if (data.resultcode !== '00' || !data.response) {
      console.warn('[Naver] verify resultcode:', data.resultcode, data.message)
      return null
    }
    return data.response
  } catch (e) {
    console.error('[Naver] verify error:', e)
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

    const naverUser = await verifyNaverToken(accessToken)
    if (!naverUser) {
      return errorResponse(401, ErrorCode.NAVER_TOKEN_INVALID, 'Invalid or expired Naver token')
    }

    if (!naverUser.email) {
      return errorResponse(
        400,
        ErrorCode.EMAIL_REQUIRED,
        '네이버 이메일 동의가 필요합니다. 동의 항목을 확인해주세요.'
      )
    }

    const headersList = await headers()
    const ip = getRequestIP(headersList)

    const result = await handleMobileOAuthLogin(
      {
        provider: 'naver',
        providerId: naverUser.id,
        email: naverUser.email,
        name: naverUser.name || naverUser.nickname || null,
        avatarUrl: naverUser.profile_image || null,
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
    console.error('[Naver Mobile Auth] unexpected error:', error)
    return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error')
  }
}
