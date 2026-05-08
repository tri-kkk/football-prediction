'use client'

/**
 * PostHog 통합 Provider
 *
 * - 제품 분석 (이벤트, 퍼널, 코호트, 리텐션)
 * - 세션 녹화 (Clarity와 별개로 PostHog Replay)
 * - A/B 테스트, 피처 플래그 (선택)
 *
 * 무료 티어:
 *   - 1M events / month
 *   - 5K session replays / month
 *
 * 환경변수:
 *   NEXT_PUBLIC_POSTHOG_KEY     (phc_... 로 시작하는 Project API Key)
 *   NEXT_PUBLIC_POSTHOG_HOST    (기본: https://us.i.posthog.com / EU 권역은 https://eu.i.posthog.com)
 */

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useSession } from 'next-auth/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

// 클라이언트 진입 시 1회 초기화
if (typeof window !== 'undefined') {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (key && !posthog.__loaded) {
    posthog.init(key, {
      api_host: host,
      // 개인정보 보호: 식별된 사용자만 프로필 생성 → 익명 사용자 이벤트 비용 절감
      person_profiles: 'identified_only',
      capture_pageview: false, // App Router에서는 수동으로 처리
      capture_pageleave: true,
      // 세션 녹화 (필요 없으면 false)
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: {
          password: true,
          email: false,
        },
      },
      // 콘솔 디버그 끄기 (개발 시 true)
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.debug()
      },
    })
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <PostHogIdentify />
      {children}
    </PHProvider>
  )
}

/**
 * App Router는 라우트 변경 시 페이지뷰가 자동 발생하지 않음.
 * pathname/searchParams 변화를 감지해 수동 capture.
 */
function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ph = usePostHog()

  useEffect(() => {
    if (!pathname || !ph) return
    let url = window.origin + pathname
    const qs = searchParams?.toString()
    if (qs) url += `?${qs}`
    ph.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, ph])

  return null
}

/**
 * NextAuth 세션과 PostHog identify 자동 동기화
 * - 로그인 → identify(userId) + tier/provider 속성 부착
 * - 로그아웃 → reset()
 */
function PostHogIdentify() {
  const { data: session, status } = useSession()
  const ph = usePostHog()

  useEffect(() => {
    if (!ph) return

    if (status === 'authenticated' && session?.user) {
      const u: any = session.user
      const userId = u.id || u.email
      if (!userId) return

      const provider = u.provider || 'unknown'
      const tier = u.tier || 'free'

      ph.identify(String(userId), {
        email: u.email,
        name: u.name,
        tier,
        provider,
      })

      // 📊 신규 가입 vs 재방문 로그인 자동 구분 → 퍼널 정확도 ↑
      try {
        const knownKey = `ts_known_user_${userId}`
        const isKnown = localStorage.getItem(knownKey) === '1'
        if (!isKnown) {
          ph.capture('signup_completed', { provider, userId })
          localStorage.setItem(knownKey, '1')
        } else {
          ph.capture('login_completed', { provider, userId })
        }
      } catch {}
    }

    if (status === 'unauthenticated') {
      // 새 익명 ID 부여 (이전 사용자와 데이터 섞이지 않게)
      ph.reset()
    }
  }, [session, status, ph])

  return null
}
