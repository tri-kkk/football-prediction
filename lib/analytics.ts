/**
 * TrendSoccer 통합 이벤트 추적 헬퍼
 *
 * 한 번의 호출로 PostHog + Clarity 양쪽에 이벤트를 기록한다.
 * BM(비회원→무료→프리미엄)의 전환 퍼널 분석에 사용되는 표준 이벤트들을 정의.
 *
 * 사용 예:
 *   import { track } from '@/lib/analytics'
 *
 *   track.signupStarted('google')
 *   track.pickClicked({ matchId: 'm123', league: 'PL', tier: 'free' })
 *   track.subscriptionCompleted({ plan: 'monthly', amount: 9900 })
 */

import posthog from 'posthog-js'

type EventProps = Record<string, any>

function emit(event: string, props?: EventProps) {
  if (typeof window === 'undefined') return
  try {
    // PostHog
    if (posthog && (posthog as any).__loaded) {
      posthog.capture(event, props)
    }
    // Clarity 커스텀 이벤트 (대시보드의 "Smart Events" 와 함께 필터로 사용)
    if (window.clarity) {
      window.clarity('event', event)
    }
    // GTM dataLayer (이미 깔린 GA4 도 동일 이벤트로 추적)
    if (window.dataLayer) {
      window.dataLayer.push({ event, ...props })
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.warn('[analytics]', e)
  }
}

export const track = {
  // ────────── 회원가입 / 로그인 ──────────
  signupStarted: (provider: 'google' | 'naver' | string) =>
    emit('signup_started', { provider }),
  signupCompleted: (provider: string, userId?: string) =>
    emit('signup_completed', { provider, userId }),
  loginCompleted: (provider: string) => emit('login_completed', { provider }),

  // ────────── 핵심 콘텐츠 인터랙션 ──────────
  matchCardClicked: (props: { matchId: string; league: string }) =>
    emit('match_card_clicked', props),
  pickClicked: (props: {
    matchId: string
    league: string
    tier: 'guest' | 'free' | 'premium'
  }) => emit('pick_clicked', props),
  pickGated: (props: { matchId: string; tier: 'guest' | 'free' }) =>
    emit('pick_gated', props), // 잠금 모달 노출 = 가입/구독 유도 핵심 지점
  leagueChanged: (league: string) => emit('league_changed', { league }),
  reportOpened: (props: { matchId: string; type: 'summary' | 'full' }) =>
    emit('report_opened', props),
  trendChartViewed: (props: { matchId: string }) =>
    emit('trend_chart_viewed', props),

  // ────────── 결제 / 구독 퍼널 ──────────
  premiumCtaClicked: (location: string) =>
    emit('premium_cta_clicked', { location }), // "어디서" 클릭됐는지 중요
  checkoutStarted: (props: { plan: 'monthly' | 'yearly'; amount: number }) =>
    emit('checkout_started', props),
  subscriptionCompleted: (props: {
    plan: 'monthly' | 'yearly'
    amount: number
  }) => emit('subscription_completed', props),
  subscriptionCancelled: (props: { reason?: string }) =>
    emit('subscription_cancelled', props),

  // ────────── 광고 / 제휴 ──────────
  adImpression: (slot: string) => emit('ad_impression', { slot }),
  adClicked: (slot: string) => emit('ad_clicked', { slot }),
  affiliateClicked: (partner: string) =>
    emit('affiliate_clicked', { partner }),

  // ────────── 일반 ──────────
  custom: (event: string, props?: EventProps) => emit(event, props),
}

export default track
