'use client'

import Script from 'next/script'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

/**
 * Microsoft Clarity 통합 컴포넌트
 *
 * - 무료 / 무제한 세션 녹화 + 히트맵
 * - NEXT_PUBLIC_CLARITY_PROJECT_ID 환경변수 필수
 * - NextAuth 세션이 있으면 자동으로 user 식별 + tier 태그 부여
 * - 프리미엄 사용자는 광고/녹화에서 별도 코호트로 분리 가능
 */

declare global {
  interface Window {
    clarity?: (
      action: 'identify' | 'set' | 'event' | 'consent' | 'upgrade',
      ...args: any[]
    ) => void
  }
}

export default function Clarity() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID
  const { data: session, status } = useSession()

  // 로그인 상태 변화 시 Clarity에 user 식별 정보 전달
  useEffect(() => {
    if (typeof window === 'undefined' || !window.clarity) return
    if (status !== 'authenticated' || !session?.user) return

    const userId =
      (session.user as any).id ||
      (session.user as any).email ||
      undefined

    if (userId) {
      // identify: 동일 사용자의 여러 세션을 묶어서 봄
      window.clarity('identify', String(userId))
    }

    // 커스텀 태그: tier(free/premium), provider(google/naver) 등
    const tier = (session.user as any).tier || 'free'
    const provider = (session.user as any).provider || 'unknown'
    window.clarity('set', 'tier', tier)
    window.clarity('set', 'provider', provider)
  }, [session, status])

  // ID 누락 시 silent fail (개발 환경 대비)
  if (!projectId) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Clarity] NEXT_PUBLIC_CLARITY_PROJECT_ID 가 설정되어 있지 않습니다.')
    }
    return null
  }

  return (
    <Script
      id="ms-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${projectId}");
        `,
      }}
    />
  )
}
