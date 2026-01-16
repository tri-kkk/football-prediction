'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Script from 'next/script'

const ADSENSE_CLIENT_ID = 'ca-pub-7853814871438044'

export default function AdSenseLoader() {
  const { data: session, status } = useSession()
  const [isLoaded, setIsLoaded] = useState(false)

  // ✅ 모든 Hooks는 최상단에! (early return 전에)
  const isPremium = (session?.user as any)?.tier === 'premium'

  // 디버그 로그
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      console.log('👤 비로그인 사용자 - 광고 표시')
    } else if (isPremium) {
      console.log('🎫 프리미엄 사용자 - 광고 스크립트 로드 건너뜀')
    } else {
      console.log('🆓 무료 사용자 - 광고 표시')
    }
  }, [session, status, isPremium])

  // ✅ Hooks 이후에 조건부 렌더링
  // 세션 로딩 중
  if (status === 'loading') {
    return null
  }

  // 프리미엄 사용자면 스크립트 로드 안 함
  if (isPremium) {
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