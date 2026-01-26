'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

// ==========================================
// 🎯 Google AdSense 설정
// ==========================================
const ADSENSE_CLIENT_ID = 'ca-pub-7853814871438044'

// AdSense 광고 슬롯
const ADSENSE_SLOTS = {
  sidebar_right_top: '5548152134',
  sidebar_right_bottom: '5548152134',
  infeed: '8741291685',
  horizontal: '8741291685',
  mobile_top: '8741291685',
  mobile_infeed: '8741291685',
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
  const containerRef = useRef<HTMLDivElement>(null)
  const insRef = useRef<HTMLModElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isAdsBlocked, setIsAdsBlocked] = useState(false)
  const [isProduction, setIsProduction] = useState(false)
  
  const { data: session, status } = useSession()

  const adSlot = ADSENSE_SLOTS[slot]
  const slotSize = SLOT_SIZES[slot] || { width: '100%', minHeight: '90px' }
  const isPremium = (session?.user as any)?.tier === 'premium'

  // 클라이언트 마운트
  useEffect(() => {
    setIsMounted(true)
    
    try {
      setIsAdsBlocked(sessionStorage.getItem('ts_ads_blocked') === 'true')
    } catch (e) {}
    
    const isProd = typeof window !== 'undefined' && 
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')
    setIsProduction(isProd)
    
    // 봇이면 차단
    if (isBot()) {
      try {
        sessionStorage.setItem('ts_ads_blocked', 'true')
        setIsAdsBlocked(true)
      } catch (e) {}
    }
  }, [])

  // 🔧 IntersectionObserver로 실제 보일 때만 감지
  useEffect(() => {
    if (!isMounted) return
    if (!containerRef.current) return
    if (isPremium || isAdsBlocked || !isProduction) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            // 실제로 화면에 보이고, 크기가 있을 때만
            const rect = entry.boundingClientRect
            if (rect.width > 50 && rect.height > 50) {
              setIsVisible(true)
              observer.disconnect()
            }
          }
        })
      },
      {
        threshold: [0.1, 0.5],
        rootMargin: '50px'
      }
    )

    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [isMounted, isPremium, isAdsBlocked, isProduction])

  // 🔧 광고 로드 (보일 때만)
  const loadAd = useCallback(() => {
    if (isLoaded) return
    if (!insRef.current) return
    if (!containerRef.current) return

    // 크기 재확인
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width < 100) {
      console.log(`⏳ [AdSenseAd] ${slot}: 너비 부족 (${rect.width}px), 스킵`)
      return
    }

    // 이미 로드된 광고인지 확인
    if (insRef.current.getAttribute('data-adsbygoogle-status') === 'done') {
      setIsLoaded(true)
      return
    }

    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
      setIsLoaded(true)
      console.log(`📢 [AdSenseAd] ${slot}: 광고 로드 완료`)
    } catch (error: any) {
      if (error?.message?.includes('already have ads')) {
        setIsLoaded(true)
      } else {
        console.error(`❌ [AdSenseAd] ${slot}: 로드 실패`, error)
      }
    }
  }, [isLoaded, slot])

  // 보이면 광고 로드 (딜레이 추가)
  useEffect(() => {
    if (!isVisible) return
    if (isLoaded) return
    if (!isProduction) return

    // 1초 딜레이 후 로드 (레이아웃 안정화 대기)
    const timer = setTimeout(() => {
      loadAd()
    }, 1000)

    return () => clearTimeout(timer)
  }, [isVisible, isLoaded, isProduction, loadAd])

  // 서버 렌더링 / 마운트 전
  if (!isMounted) {
    return <div style={{ minHeight: slotSize.minHeight }} />
  }

  // 세션 로딩 중
  if (status === 'loading') {
    return <div style={{ minHeight: slotSize.minHeight }} />
  }

  // 프리미엄 사용자
  if (isPremium) {
    return null
  }

  // 차단된 세션
  if (isAdsBlocked) {
    return null
  }

  // 로컬 환경
  if (!isProduction) {
    return (
      <div 
        ref={containerRef}
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

  return (
    <div 
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      style={{ 
        width: slotSize.width,
        minHeight: slotSize.minHeight,
        maxHeight: slotSize.maxHeight,
        ...style 
      }}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={adSlot}
        data-ad-format={slot === 'in_article' ? 'fluid' : format}
        data-ad-layout={slot === 'in_article' ? 'in-article' : undefined}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  )
}