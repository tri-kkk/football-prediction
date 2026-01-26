'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'

// ==========================================
// 🎯 Google AdSense 설정
// ==========================================
const ADSENSE_CLIENT_ID = 'ca-pub-7853814871438044'

// AdSense 광고 슬롯
const ADSENSE_SLOTS = {
  // 사이드바 (세로) - 5548152134
  sidebar_right_top: '5548152134',
  sidebar_right_bottom: '5548152134',
  
  // 가로 배너 - 8741291685
  infeed: '8741291685',
  horizontal: '8741291685',
  
  // 모바일 전용 - 8741291685
  mobile_top: '8741291685',
  mobile_infeed: '8741291685',
  
  // 인아티클 (본문 중간) - 5614960119
  in_article: '5614960119',
}

// 슬롯별 크기 설정
const SLOT_SIZES: Record<string, { width: string; minHeight: string; maxHeight?: string }> = {
  sidebar_right_top: { width: '100%', minHeight: '250px' },
  sidebar_right_bottom: { width: '100%', minHeight: '250px' },
  infeed: { width: '100%', minHeight: '100px', maxHeight: '250px' },
  horizontal: { width: '100%', minHeight: '90px', maxHeight: '90px' },
  mobile_top: { width: '100%', minHeight: '50px', maxHeight: '100px' },
  mobile_infeed: { width: '100%', minHeight: '100px', maxHeight: '150px' },
  in_article: { width: '100%', minHeight: '100px' },
}

// ==========================================
// 🛡️ 무효 트래픽 방지 함수들
// ==========================================

// 광고 차단 상태 체크
function isAdsBlocked(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem('ts_ads_blocked') === 'true'
  } catch (e) {
    return false
  }
}

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
  
  if ((navigator as any).webdriver) return true
  
  return false
}

// 광고 차단 설정
function blockAds(reason: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem('ts_ads_blocked', 'true')
    console.warn(`🚫 [AdSenseAd] 광고 차단: ${reason}`)
  } catch (e) {}
}

interface AdSenseAdProps {
  slot: keyof typeof ADSENSE_SLOTS
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal'
  className?: string
  style?: React.CSSProperties
  responsive?: boolean
  darkMode?: boolean
}

declare global {
  interface Window {
    adsbygoogle: any[]
  }
}

export default function AdSenseAd({ 
  slot, 
  format = 'auto',
  className = '',
  style = {},
  responsive = true,
  darkMode = true
}: AdSenseAdProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isProduction, setIsProduction] = useState(false)
  const [shouldShowAd, setShouldShowAd] = useState(false)
  
  const { data: session, status } = useSession()

  const adSlot = ADSENSE_SLOTS[slot]
  const slotSize = SLOT_SIZES[slot] || { width: '100%', minHeight: '90px', maxHeight: '90px' }

  // ✅ NextAuth에서 프리미엄 체크
  const isPremium = (session?.user as any)?.tier === 'premium'

  // 🛡️ 무효 트래픽 보호 체크
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (status === 'loading') return
    if (isPremium) return
    
    // 1초 딜레이 후 보호 체크 (봇 우회 방지)
    const timer = setTimeout(() => {
      // 이미 차단된 세션
      if (isAdsBlocked()) {
        console.log(`🚫 [AdSenseAd] ${slot}: 이전에 차단된 세션`)
        setShouldShowAd(false)
        return
      }
      
      // 봇 감지
      if (isBot()) {
        blockAds('봇/크롤러 감지')
        setShouldShowAd(false)
        return
      }
      
      // 모든 체크 통과
      setShouldShowAd(true)
    }, 500) // 0.5초 딜레이
    
    return () => clearTimeout(timer)
  }, [status, isPremium, slot])

  useEffect(() => {
    // 세션 로딩 중이면 스킵
    if (status === 'loading') return
    
    // 프리미엄 사용자는 광고 로드 스킵
    if (isPremium) return
    
    // 🛡️ 보호 체크 미통과
    if (!shouldShowAd) return

    // 프로덕션 환경 체크
    const isProd = typeof window !== 'undefined' && 
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')
    
    setIsProduction(isProd)

    // 로컬 환경에서는 광고 로드 스킵
    if (!isProd) {
      return
    }

    // 이미 로드되었으면 스킵
    if (isLoaded) return

    const loadAd = () => {
      try {
        const container = adRef.current
        if (!container) return

        // ✅ ins 요소가 이미 로드됐는지 확인
        const insElement = container.querySelector('ins.adsbygoogle')
        if (insElement?.getAttribute('data-adsbygoogle-status') === 'done') {
          setIsLoaded(true)
          return
        }

        window.adsbygoogle = window.adsbygoogle || []
        window.adsbygoogle.push({})
        setIsLoaded(true)
        console.log(`📢 [AdSenseAd] ${slot}: 광고 로드 완료 (보호됨)`)
      } catch (error: any) {
        // 모든 에러 조용히 처리
        if (error?.message?.includes('already have ads')) {
          setIsLoaded(true)
        }
      }
    }

    // ✅ ResizeObserver로 컨테이너 크기가 잡히면 로드
    const container = adRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        
        if (width > 50 && height > 50 && !isLoaded) {
          const computedStyle = window.getComputedStyle(container)
          if (computedStyle.display === 'none') {
            return
          }
          
          setTimeout(loadAd, 100)
          observer.disconnect()
        }
      }
    })

    observer.observe(container)

    const fallbackTimer = setTimeout(() => {
      if (!isLoaded && container.offsetWidth > 50) {
        loadAd()
      }
    }, 2000)

    return () => {
      observer.disconnect()
      clearTimeout(fallbackTimer)
    }
  }, [isLoaded, slot, isPremium, status, shouldShowAd])

  // 세션 로딩 중
  if (status === 'loading') {
    return <div style={{ minHeight: slotSize.minHeight }} />
  }

  // ✅ 프리미엄 사용자는 아무것도 렌더링 안 함
  if (isPremium) {
    return null
  }

  // 🛡️ 보호 체크 미통과 시 빈 공간
  if (!shouldShowAd) {
    return <div style={{ minHeight: slotSize.minHeight }} />
  }

  // 로컬 환경 플레이스홀더
  if (!isProduction) {
    return (
      <div 
        ref={adRef}
        className={`flex items-center justify-center border border-dashed rounded-lg ${
          darkMode ? 'border-gray-700 bg-gray-800/20' : 'border-gray-300 bg-gray-100'
        } ${className}`}
        style={{ 
          width: slotSize.width,
          minHeight: slotSize.minHeight,
          maxHeight: slotSize.maxHeight,
          ...style 
        }}
      >
        <div className="text-center py-2">
          <span className="text-lg">📢</span>
          <span className={`text-[10px] ml-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            {slot}
          </span>
        </div>
      </div>
    )
  }

  // 에러 시 빈 공간
  if (hasError) {
    return <div style={{ minHeight: slotSize.minHeight }} />
  }

  return (
    <div 
      ref={adRef}
      className={`overflow-hidden ${className}`}
      style={{ 
        width: slotSize.width,
        minHeight: slotSize.minHeight,
        maxHeight: slotSize.maxHeight,
        ...style 
      }}
    >
      {/* 🛡️ 실수 클릭 방지를 위한 여백 */}
      <div style={{ padding: '4px' }}>
        <ins
          key={`adsense-${slot}-${adSlot}`}
          className="adsbygoogle"
          style={{ display: 'block', textAlign: 'center' }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={adSlot}
          data-ad-format={slot === 'in_article' ? 'fluid' : format}
          data-ad-layout={slot === 'in_article' ? 'in-article' : undefined}
          data-full-width-responsive={responsive ? 'true' : 'false'}
        />
      </div>
    </div>
  )
}