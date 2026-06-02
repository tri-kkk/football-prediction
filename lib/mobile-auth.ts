/**
 * 모바일 API 인증 헬퍼
 *
 * - NextAuth JWT 호환 토큰 발급/검증 (NEXTAUTH_SECRET 공유)
 * - 모바일 토큰은 platform='mobile' 태그로 웹 쿠키 토큰과 구분
 * - tier 판정은 DB의 users.premium_expires_at + subscriptions 활성 여부 종합
 *
 * 통합 가이드 v3.1 §2, §5 기준
 */

import { NextRequest, NextResponse } from 'next/server'
import { encode, decode } from 'next-auth/jwt'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

import {
  ErrorCode,
  errorResponse,
  getCountryFromIP,
  hashEmail,
  capturePostHogEvent,
} from './mobile-api'

// ──────────────────────────────────────────────────────────────────
// 상수
// ──────────────────────────────────────────────────────────────────

export const TOKEN_MAX_AGE_SEC = 30 * 24 * 60 * 60 // 30일
export const COOLDOWN_DAYS = 7
export const PROMO_END_DATE = new Date('2026-03-01T00:00:00+09:00')

// ──────────────────────────────────────────────────────────────────
// 타입
// ──────────────────────────────────────────────────────────────────

export interface MobileTokenPayload {
  userId: string
  email: string
  name: string | null
  avatarUrl: string | null
  tier: 'free' | 'premium'
  premiumExpiresAt: string | null
  termsAgreed: boolean
}

export interface MobileSession extends MobileTokenPayload {}

export interface OAuthUserInfo {
  provider: 'google' | 'naver'
  providerId: string
  email: string
  name: string | null
  avatarUrl: string | null
}

export interface MobileLoginResult {
  ok: true
  session: {
    accessToken: string
    tokenType: 'Bearer'
    expiresAt: string
  }
  user: {
    userId: string
    email: string
    name: string | null
    avatarUrl: string | null
    tier: 'free' | 'premium'
    premiumExpiresAt: string | null
    isNewUser: boolean
    requiresConsent: boolean
    pendingPromo: string | null
  }
}

export interface MobileLoginError {
  ok: false
  status: number
  code: string
  message: string
  extra?: Record<string, any>
}

// ──────────────────────────────────────────────────────────────────
// Supabase 서버 클라이언트
// ──────────────────────────────────────────────────────────────────

let _supabase: SupabaseClient | null = null

export function getServerSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _supabase
}

// ──────────────────────────────────────────────────────────────────
// JWT 발급/검증
// ──────────────────────────────────────────────────────────────────

export async function signMobileJWT(
  payload: MobileTokenPayload,
  maxAgeSec: number = TOKEN_MAX_AGE_SEC
): Promise<string> {
  return encode({
    token: {
      sub: payload.userId,
      email: payload.email,
      name: payload.name,
      picture: payload.avatarUrl,
      tier: payload.tier,
      premiumExpiresAt: payload.premiumExpiresAt,
      termsAgreed: payload.termsAgreed,
      platform: 'mobile',
    },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: maxAgeSec,
  })
}

export async function getMobileSession(request: NextRequest): Promise<MobileSession | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) return null

  const token = authHeader.slice(7).trim()
  if (!token) return null

  try {
    const decoded = await decode({
      token,
      secret: process.env.NEXTAUTH_SECRET!,
    })

    if (!decoded || !decoded.sub) return null
    // platform 태그가 mobile인 경우만 인정 — 웹 쿠키 토큰 혼입 차단
    if (decoded.platform !== 'mobile') return null

    return {
      userId: decoded.sub,
      email: (decoded.email as string) || '',
      name: (decoded.name as string) || null,
      avatarUrl: (decoded.picture as string) || null,
      tier: (decoded.tier as string) === 'premium' ? 'premium' : 'free',
      premiumExpiresAt: (decoded.premiumExpiresAt as string) || null,
      termsAgreed: !!decoded.termsAgreed,
    }
  } catch (e) {
    console.warn('[mobile-auth] decode failed:', (e as Error)?.message)
    return null
  }
}

// ──────────────────────────────────────────────────────────────────
// 권한 가드 (핸들러 진입부에서 사용)
// ──────────────────────────────────────────────────────────────────

/**
 * 인증 필요 — 토큰 없거나 만료면 401, 약관 미동의면 409
 */
export function requireAuth(session: MobileSession | null): NextResponse | null {
  if (!session) {
    return errorResponse(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
  }
  if (!session.termsAgreed) {
    return errorResponse(409, ErrorCode.CONSENT_REQUIRED, '약관 동의가 필요합니다.')
  }
  return null
}

// ──────────────────────────────────────────────────────────────────
// 신원(identity) — 익명 디바이스도 허용
// ──────────────────────────────────────────────────────────────────
//
// FCM 알림 등 비로그인 사용자도 접근 가능한 엔드포인트용.
// 우선순위: JWT (사용자 식별, 더 강력) > X-Device-Token 헤더 (익명 디바이스)
//
// 'X-Device-Token' 헤더 값은 FCM device token. 토큰 자체가 인증 역할을 하므로
// 도용 시 알림 설정 변조 가능 — 영향 범위가 작아 수용 가능한 트레이드오프.

export interface MobileIdentity {
  type: 'user' | 'device'
  userId: string | null
  deviceToken: string | null
  // 사용자 모드면 세션도 함께 (tier 체크 등에 사용 가능)
  session?: MobileSession
}

export async function getMobileIdentity(
  request: NextRequest
): Promise<MobileIdentity | null> {
  // 1순위: JWT
  const session = await getMobileSession(request)
  if (session && session.termsAgreed) {
    return {
      type: 'user',
      userId: session.userId,
      deviceToken: null,
      session,
    }
  }

  // 2순위: X-Device-Token 헤더
  const deviceToken = request.headers.get('x-device-token')
  if (deviceToken && deviceToken.length >= 10) {
    return {
      type: 'device',
      userId: null,
      deviceToken,
      session: undefined,
    }
  }

  return null
}

/**
 * 신원 필수 (사용자 또는 익명 디바이스) — 둘 다 없으면 401
 */
export function requireIdentity(identity: MobileIdentity | null): NextResponse | null {
  if (!identity) {
    return errorResponse(
      401,
      ErrorCode.UNAUTHORIZED,
      'Authentication required (JWT or X-Device-Token header)'
    )
  }
  return null
}

/**
 * 프리미엄 필요 — 인증 + 프리미엄 검증
 */
export function requirePremium(session: MobileSession | null): NextResponse | null {
  const authError = requireAuth(session)
  if (authError) return authError

  if (session!.tier !== 'premium') {
    return errorResponse(402, ErrorCode.SUBSCRIPTION_REQUIRED, '프리미엄 구독이 필요합니다.')
  }
  return null
}

// ──────────────────────────────────────────────────────────────────
// 최신 tier 재조회 (DB 기준)
// ──────────────────────────────────────────────────────────────────

/**
 * users.premium_expires_at + subscriptions 활성 여부로 최신 tier 결정.
 * NextAuth session 콜백과 동일한 정책.
 *
 * 토큰의 tier는 발급 시점 스냅샷이므로, 결제 직후/만료 직후 정확한 tier가 필요하면 이 함수 사용.
 *
 * @returns 효력 있는 tier + 만료시점
 */
export async function resolveCurrentTier(userId: string): Promise<{
  tier: 'free' | 'premium'
  premiumExpiresAt: string | null
}> {
  const supabase = getServerSupabase()
  const now = new Date()
  const nowIso = now.toISOString()

  const { data: user } = await supabase
    .from('users')
    .select('tier, premium_expires_at')
    .eq('id', userId)
    .single()

  if (!user) return { tier: 'free', premiumExpiresAt: null }

  // 1순위: users.premium_expires_at (트라이얼/프로모/직접 부여)
  if (user.premium_expires_at) {
    const expires = new Date(user.premium_expires_at)
    if (now < expires) {
      return { tier: 'premium', premiumExpiresAt: user.premium_expires_at as string }
    }
    // 만료됨 → free 다운그레이드
    await supabase
      .from('users')
      .update({ tier: 'free', updated_at: nowIso })
      .eq('id', userId)
    return { tier: 'free', premiumExpiresAt: null }
  }

  // 2순위: subscriptions 활성
  if (user.tier === 'premium') {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('expires_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sub?.expires_at) {
      return { tier: 'premium', premiumExpiresAt: sub.expires_at as string }
    }
    // 활성 구독 없음 → free 다운그레이드
    await supabase
      .from('users')
      .update({ tier: 'free', updated_at: nowIso })
      .eq('id', userId)
  }

  return { tier: 'free', premiumExpiresAt: null }
}

// ──────────────────────────────────────────────────────────────────
// OAuth 로그인 공통 처리
// ──────────────────────────────────────────────────────────────────

/**
 * Google/Naver OAuth 공통 로그인 흐름.
 * 토큰 검증은 호출 측에서 미리 수행해서 OAuthUserInfo로 정제해서 전달.
 *
 * 처리 순서:
 *  1. users + terms_agreed_at → 기존 정식 가입자 (login)
 *  2. pending_users → 약관 동의 전 단계 재로그인 (consent required)
 *  3. deleted_users 쿨다운 체크 → 7일 이내면 차단
 *  4. pending_users insert → 신규 (consent required)
 *
 * 각 케이스마다 JWT 발급 + PostHog 캡처.
 */
export async function handleMobileOAuthLogin(
  userInfo: OAuthUserInfo,
  context: {
    ip: string
    deviceInfo?: { platform?: string; appVersion?: string }
  }
): Promise<MobileLoginResult | MobileLoginError> {
  const supabase = getServerSupabase()
  const emailLower = userInfo.email.toLowerCase()
  const userName = userInfo.name
  const avatarUrl = userInfo.avatarUrl
  const now = new Date()
  const nowIso = now.toISOString()

  // 1. 기존 정식 가입자
  const { data: existingUser } = await supabase
    .from('users')
    .select(
      'id, name, tier, terms_agreed_at, premium_expires_at, trial_used, trial_started_at, promo_code'
    )
    .eq('email', emailLower)
    .single()

  if (existingUser && existingUser.terms_agreed_at) {
    const updateData: Record<string, any> = {
      last_login_at: nowIso,
      last_login_ip: context.ip,
    }
    if (!existingUser.name && userName) updateData.name = userName
    await supabase.from('users').update(updateData).eq('id', existingUser.id)

    // 효력 있는 tier 재계산
    const { tier: effectiveTier, premiumExpiresAt } = await resolveCurrentTier(existingUser.id)

    const tokenPayload: MobileTokenPayload = {
      userId: existingUser.id,
      email: emailLower,
      name: existingUser.name || userName,
      avatarUrl,
      tier: effectiveTier,
      premiumExpiresAt,
      termsAgreed: true,
    }
    const token = await signMobileJWT(tokenPayload)

    capturePostHogEvent('login_completed', existingUser.id, {
      provider: userInfo.provider,
      email: emailLower,
      platform: context.deviceInfo?.platform || 'mobile',
      appVersion: context.deviceInfo?.appVersion || null,
    })

    return {
      ok: true,
      session: {
        accessToken: token,
        tokenType: 'Bearer',
        expiresAt: new Date(now.getTime() + TOKEN_MAX_AGE_SEC * 1000).toISOString(),
      },
      user: {
        userId: existingUser.id,
        email: emailLower,
        name: existingUser.name || userName,
        avatarUrl,
        tier: effectiveTier,
        premiumExpiresAt,
        isNewUser: false,
        requiresConsent: false,
        pendingPromo: null,
      },
    }
  }

  // 2. 약관 동의 전 단계
  const { data: pendingUser } = await supabase
    .from('pending_users')
    .select('id, pending_promo')
    .eq('email', emailLower)
    .single()

  if (pendingUser) {
    await supabase
      .from('pending_users')
      .update({
        updated_at: nowIso,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', pendingUser.id)

    const token = await signMobileJWT({
      userId: pendingUser.id,
      email: emailLower,
      name: userName,
      avatarUrl,
      tier: 'free',
      premiumExpiresAt: null,
      termsAgreed: false,
    })

    return {
      ok: true,
      session: {
        accessToken: token,
        tokenType: 'Bearer',
        expiresAt: new Date(now.getTime() + TOKEN_MAX_AGE_SEC * 1000).toISOString(),
      },
      user: {
        userId: pendingUser.id,
        email: emailLower,
        name: userName,
        avatarUrl,
        tier: 'free',
        premiumExpiresAt: null,
        isNewUser: false,
        requiresConsent: true,
        pendingPromo: pendingUser.pending_promo || null,
      },
    }
  }

  // 3. 신규 → 탈퇴 쿨다운 체크
  const emailHash = hashEmail(emailLower)
  const { data: deletedUser } = await supabase
    .from('deleted_users')
    .select('promo_code, deleted_at, subscription_tier')
    .eq('email_hash', emailHash)
    .single()

  if (deletedUser?.deleted_at) {
    const deletedAt = new Date(deletedUser.deleted_at)
    const cooldownEnd = new Date(deletedAt.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
    if (now < cooldownEnd) {
      const daysLeft = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return {
        ok: false,
        status: 403,
        code: ErrorCode.COOLDOWN_ACTIVE,
        message: `재가입은 탈퇴 후 ${COOLDOWN_DAYS}일이 지난 뒤 가능합니다. ${daysLeft}일 남음.`,
        extra: { daysLeft, cooldownEnd: cooldownEnd.toISOString() },
      }
    }
  }

  // 4. pending_users insert
  const { country, countryCode } = await getCountryFromIP(context.ip)
  const isPromoPeriod = now < PROMO_END_DATE
  const hadPromo = !!deletedUser?.promo_code
  const canGetPromo = isPromoPeriod && !hadPromo

  const { data: insertedPending, error: insertError } = await supabase
    .from('pending_users')
    .insert({
      email: emailLower,
      name: userName,
      avatar_url: avatarUrl,
      provider: userInfo.provider,
      provider_id: userInfo.providerId,
      signup_ip: context.ip,
      signup_country: country,
      signup_country_code: countryCode,
      pending_promo: canGetPromo ? 'LAUNCH_2026' : null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id, pending_promo')
    .single()

  if (insertError || !insertedPending) {
    console.error('[mobile-auth] pending_users insert failed:', insertError)
    return {
      ok: false,
      status: 500,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Failed to create user record',
    }
  }

  const token = await signMobileJWT({
    userId: insertedPending.id,
    email: emailLower,
    name: userName,
    avatarUrl,
    tier: 'free',
    premiumExpiresAt: null,
    termsAgreed: false,
  })

  capturePostHogEvent('signup_completed', insertedPending.id, {
    provider: userInfo.provider,
    email: emailLower,
    country: countryCode,
    platform: context.deviceInfo?.platform || 'mobile',
    appVersion: context.deviceInfo?.appVersion || null,
  })

  return {
    ok: true,
    session: {
      accessToken: token,
      tokenType: 'Bearer',
      expiresAt: new Date(now.getTime() + TOKEN_MAX_AGE_SEC * 1000).toISOString(),
    },
    user: {
      userId: insertedPending.id,
      email: emailLower,
      name: userName,
      avatarUrl,
      tier: 'free',
      premiumExpiresAt: null,
      isNewUser: true,
      requiresConsent: true,
      pendingPromo: insertedPending.pending_promo || null,
    },
  }
}
