/**
 * GET /api/v1/mobile/me
 *
 * 인증된 사용자의 통합 프로필 응답.
 *  - 기본 정보 (이메일, 이름, 아바타)
 *  - tier (DB 재조회로 최신 상태 보장)
 *  - 트라이얼 상태
 *  - 활성 구독 정보
 *  - 약관 동의 상태
 *  - 프로모 코드
 *
 * 약관 미동의 사용자도 호출 가능 — `requiresConsent: true`로 응답.
 */

import { NextRequest } from 'next/server'

import {
  getMobileSession,
  getServerSupabase,
  resolveCurrentTier,
} from '@/lib/mobile-auth'
import {
  ErrorCode,
  errorResponse,
  successResponse,
} from '@/lib/mobile-api'

export async function GET(request: NextRequest) {
  try {
    const session = await getMobileSession(request)
    if (!session) {
      return errorResponse(401, ErrorCode.UNAUTHORIZED, 'Authentication required')
    }

    const supabase = getServerSupabase()

    // 1. users 테이블 조회 — 약관 동의 완료 사용자
    const { data: user } = await supabase
      .from('users')
      .select(
        'id, email, name, avatar_url, tier, premium_expires_at, ' +
          'trial_used, trial_started_at, promo_code, promo_applied_at, ' +
          'terms_agreed_at, privacy_agreed_at, marketing_agreed, marketing_agreed_at, ' +
          'created_at, last_login_at'
      )
      .eq('id', session.userId)
      .single()

    if (user) {
      // 효력 있는 tier 재계산
      const { tier, premiumExpiresAt } = await resolveCurrentTier(user.id)

      // 활성 구독 조회 (있으면)
      let subscription = null
      if (tier === 'premium') {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan, status, started_at, expires_at, price')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (sub) {
          const expiresAt = new Date(sub.expires_at as string)
          subscription = {
            plan: sub.plan,
            status: sub.status,
            startedAt: sub.started_at,
            expiresAt: sub.expires_at,
            price: sub.price ?? null,
            daysLeft: Math.max(
              0,
              Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            ),
          }
        }
      }

      // 트라이얼 정보 (premium_expires_at이 살아있고 trial_used=true면 트라이얼 중)
      let trial = null
      if (user.trial_used) {
        const isTrialActive =
          tier === 'premium' &&
          user.premium_expires_at &&
          !subscription // 정기 구독 없으면 = 트라이얼/프로모
        trial = {
          used: true,
          startedAt: user.trial_started_at,
          expiresAt: isTrialActive ? user.premium_expires_at : null,
          active: !!isTrialActive,
        }
      } else {
        trial = { used: false, startedAt: null, expiresAt: null, active: false }
      }

      return successResponse({
        userId: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        tier,
        premiumExpiresAt,
        trial,
        subscription,
        consents: {
          terms: !!user.terms_agreed_at,
          privacy: !!user.privacy_agreed_at,
          marketing: !!user.marketing_agreed,
          consentedAt: user.terms_agreed_at,
        },
        promoCode: user.promo_code || null,
        promoAppliedAt: user.promo_applied_at || null,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        requiresConsent: false,
      })
    }

    // 2. pending_users 테이블 조회 — 약관 미동의 사용자
    const { data: pending } = await supabase
      .from('pending_users')
      .select('id, email, name, avatar_url, pending_promo, created_at, expires_at')
      .eq('id', session.userId)
      .single()

    if (pending) {
      return successResponse({
        userId: pending.id,
        email: pending.email,
        name: pending.name,
        avatarUrl: pending.avatar_url,
        tier: 'free',
        premiumExpiresAt: null,
        trial: { used: false, startedAt: null, expiresAt: null, active: false },
        subscription: null,
        consents: {
          terms: false,
          privacy: false,
          marketing: false,
          consentedAt: null,
        },
        promoCode: null,
        promoAppliedAt: null,
        pendingPromo: pending.pending_promo,
        createdAt: pending.created_at,
        lastLoginAt: null,
        requiresConsent: true,
      })
    }

    // 3. 둘 다 없음 — 토큰은 유효하지만 DB에 없는 케이스 (탈퇴 등)
    return errorResponse(404, ErrorCode.RESOURCE_NOT_FOUND, '사용자 정보를 찾을 수 없습니다.')
  } catch (error) {
    console.error('[Mobile /me] error:', error)
    return errorResponse(500, ErrorCode.INTERNAL_ERROR, 'Internal server error')
  }
}
