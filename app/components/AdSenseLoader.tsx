'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Script from 'next/script'

const ADSENSE_CLIENT_ID = 'ca-pub-7853814871438044'

// ========== 🛡️ 무효 트래픽 방지 함수들 ==========

// 봇 감지
function isBot(): boolean {
  if (typeof window === 'undefined') return false
  
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /crawling/i,
    /headless/i, /phantom/i, /selenium/i, /puppeteer/i,
    /scraper/i, /scraping/i, /lighthouse/i, /pagespeed/i
  ]
  
  const ua = navigator.userAgent || ''
  for (const pattern of botPatterns) {
    if (pattern.test(ua)) return true
  }
  
  // webdriver 속성 체크 (자동화 도구)
  if ((navigator as any).webdriver) return true
  
  return false
}

// 새로고침 남용 체크
function checkRefreshAbuse(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const now = Date.now()
    const key = 'ts_page_loads'
    let loads: number[] = []
    
    try {
      loads = JSON.parse(sessionStorage.getItem(key) || '[]')
    } catch (e) {}
    
    // 2분 이내 로드 기록만 유지
    loads = loads.filter(t => now - t < 120000)
    loads.push(now)
    
    sessionStorage.setItem(key, JSON.stringify(loads))
    
    // 2분 내 8회 이상 페이지 로드 = 의심
    return loads.length >= 8
  } catch (e) {
    return false
  }
}

// 광고 숨김 상태 체크
function isAdsBlocked(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    return sessionStorage.getItem('ts_ads_blocked') === 'true'
  } catch (e) {
    return false
  }
}

// 광고 차단 설정
function blockAds(reason: string): void {
  if (typeof window === 'undefined') return
  
  try {
    sessionStorage.setItem('ts_ads_blocked', 'true')
    console.warn(`🚫 광고 차단됨: ${reason}`)
  } catch (e) {}
}

export default function AdSenseLoader() {
  const { data: session, status } = useSession()
  const [isLoaded, setIsLoaded] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)

  const isPremium = (session?.user as any)?.tier === 'premium'

  // 🛡️ 무효 트래픽 체크 + 로드 결정
  useEffect(() => {
    if (status === 'loading') return
    if (isPremium) return
    
    // 1초 딜레이 후 체크 (봇 우회 방지)
    const timer = setTimeout(() => {
      // 이미 차단된 경우
      if (isAdsBlocked()) {
        console.log('🚫 이전에 차단된 세션 - 광고 로드 안 함')
        return
      }
      
      // 봇 감지
      if (isBot()) {
        blockAds('봇/크롤러 감지')
        return
      }
      
      // 새로고침 남용
      if (checkRefreshAbuse()) {
        blockAds('새로고침 남용 감지')
        return
      }
      
      // 모든 체크 통과 - 광고 로드 허용
      setShouldLoad(true)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [status, isPremium])

  // 디버그 로그
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      console.log('👤 비로그인 사용자 - 광고 체크 중...')
    } else if (isPremium) {
      console.log('🎫 프리미엄 사용자 - 광고 스크립트 로드 건너뜀')
    } else {
      console.log('🆓 무료 사용자 - 광고 체크 중...')
    }
  }, [session, status, isPremium])

  // 세션 로딩 중
  if (status === 'loading') {
    return null
  }

  // 프리미엄 사용자
  if (isPremium) {
    return null
  }

  // 이미 로드됨
  if (isLoaded) {
    return null
  }

  // 🛡️ 보호 체크 미통과
  if (!shouldLoad) {
    return null
  }

  // 비프리미엄 사용자 + 보호 체크 통과 → AdSense 스크립트 로드
  return (
    <Script
      id="google-adsense"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"  // ✅ afterInteractive → lazyOnload (성능 + 봇 우회)
      onLoad={() => {
        console.log('📢 AdSense 스크립트 로드 완료 (보호됨)')
        setIsLoaded(true)
      }}
      onError={(e) => {
        console.error('❌ AdSense 스크립트 로드 실패:', e)
      }}
    />
  )
}