'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Script from 'next/script'

const ADSENSE_CLIENT_ID = 'ca-pub-7853814871438044'

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * AdSense 스크립트 조건부 로더
 * 
 * - 비로그인 사용자: 광고 스크립트 로드 ✅
 * - 무료 회원: 광고 스크립트 로드 ✅
 * - 프리미엄 회원: 광고 스크립트 로드 안 함 ❌
 */
export default function AdSenseLoader() {
  const [isPremium, setIsPremium] = useState<boolean | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    async function checkSubscription() {
      try {
        // 현재 로그인한 사용자 확인
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          // 비로그인 사용자 = 광고 표시
          setIsPremium(false)
          return
        }

        // 사용자의 구독 상태 확인
        const { data: profile } = await supabase
          .from('users')
          .select('tier')
          .eq('id', user.id)
          .single()

        const userIsPremium = profile?.tier === 'premium'
        setIsPremium(userIsPremium)

        if (userIsPremium) {
          console.log('🎫 프리미엄 사용자 - 광고 스크립트 로드 건너뜀')
        }
      } catch (error) {
        console.error('구독 상태 확인 실패:', error)
        // 에러 시 광고 표시 (안전한 기본값)
        setIsPremium(false)
      }
    }

    checkSubscription()

    // 인증 상태 변경 감지 (로그인/로그아웃 시)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 인증 상태 변경:', event)
        checkSubscription()
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 아직 확인 중이면 아무것도 렌더링 안 함
  if (isPremium === null) {
    return null
  }

  // 프리미엄 사용자면 스크립트 로드 안 함
  if (isPremium === true) {
    return null
  }

  // 이미 로드됐으면 스킵
  if (isLoaded) {
    return null
  }

  // 비프리미엄 사용자에게만 AdSense 스크립트 로드
  return (
    <Script
      id="google-adsense"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
      onLoad={() => {
        console.log('📢 AdSense 스크립트 로드 완료')
        setIsLoaded(true)
      }}
      onError={(e) => {
        console.error('❌ AdSense 스크립트 로드 실패:', e)
      }}
    />
  )
}