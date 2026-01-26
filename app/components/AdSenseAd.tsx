'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

// ==========================================
// 🎯 Google AdSense 설정
// ==========================================
const ADSENSE_CLIENT_ID = 'ca-pub-7853814871438044'

const ADSENSE_SLOTS = {
  sidebar_right_top: '5548152134',
  sidebar_right_bottom: '5548152134',
  infeed: '8741291685',
  horizontal: '8741291685',
  mobile_top: '8741291685',
  mobile_infeed: '8741291685',
  in_article: '5614960119',
}

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
  const ua = navigator.userAgent || ''
  const botPatterns = [/bot/i, /crawler/i, /spider/i, /headless/i, /phantom/i, /selenium/i, /puppeteer/i]
  for (const pattern of botPatterns) {
    if (pattern.test(ua)) return true
  }
  if ((navigator as any).webdriver) return true
  return false
}

// 요소가 실제로 보이는지 체크
function isElementVisible(element: HTMLElement | null): boolean {
  if (!element) return false
  
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)
  
  // 크기 체크
  if (rect.width < 50 || rect.height < 50) return false
  
  // display/visibility 체크
  if (style.display === 'none') return false
  if (style.visibility === 'hidden') return false
  if (style.opacity === '0') return false
  
  // 부모 요소들도 체크
  let parent = element.parentElement
  while (parent) {
    const parentStyle = window.getComputedStyle(parent)
    if (parentStyle.display === 'none') return false
    if (parentStyle.visibility === 'hidden') return false
    parent = parent.parentElement
  }
  
  return true
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
  const [isLoaded, setIsLoaded] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isAdsBlocked, setIsAdsBlocked] = useState(false)
  const [isProduction, setIsProduction] = useState(false)
  const [loadAttempts, setLoadAttempts] = useState(0)
  
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
    
    if (isBot()) {
      try {
        sessionStorage.setItem('ts_ads_blocked', 'true')
        setIsAdsBlocked(true)
      } catch (e) {}
    }
  }, [])

  // 광고 로드 함수
  const loadAd = useCallback(() => {
    if (isLoaded) return
    if (!containerRef.current) return
    if (loadAttempts >= 3) return // 최대 3번 시도
    
    // 요소가 보이는지 확인
    if (!isElementVisible(containerRef.current)) {
      console.log(`⏳ [AdSenseAd] ${slot}: 요소가 보이지 않음, 스킵`)
      return
    }

    const insElement = containerRef.current.querySelector('ins.adsbygoogle')
    if (!insElement) return
    
    // 이미 로드된 광고인지 확인
    if (insElement.getAttribute('data-adsbygoogle-status') === 'done') {
      setIsLoaded(true)
      return
    }

    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
      setIsLoaded(true)
      console.log(`📢 [AdSenseAd] ${slot}: 광고 로드 완료`)
    } catch (error: any) {
      // 🔧 모든 에러를 조용히 처리
      setLoadAttempts(prev => prev + 1)
      
      if (error?.message?.includes('already have ads')) {
        setIsLoaded(true)
      } else if (error?.message?.includes('No slot size')) {
        // No slot size 에러는 무시하고 나중에 재시도
        console.log(`⏳ [AdSenseAd] ${slot}: 슬롯 크기 에러, 나중에 재시도`)
      } else {
        // 다른 에러도 조용히 처리
        console.log(`⚠️ [AdSenseAd] ${slot}: 에러 발생, 스킵`)
      }
    }
  }, [isLoaded, slot, loadAttempts])

  // 광고 로드 시도 (여러 단계)
  useEffect(() => {
    if (!isMounted) return
    if (status === 'loading') return
    if (isPremium || isAdsBlocked || !isProduction) return
    if (isLoaded) return

    // 1단계: 2초 후 첫 시도
    const timer1 = setTimeout(() => {
      loadAd()
    }, 2000)

    // 2단계: 5초 후 재시도
    const timer2 = setTimeout(() => {
      if (!isLoaded) loadAd()
    }, 5000)

    // 3단계: 10초 후 마지막 시도
    const timer3 = setTimeout(() => {
      if (!isLoaded) loadAd()
    }, 10000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [isMounted, status, isPremium, isAdsBlocked, isProduction, isLoaded, loadAd])

  // 서버 렌더링 / 마운트 전
  if (!isMounted) {
    return <div style={{ minHeight: slotSize.minHeight }} />
  }

  if (status === 'loading') {
    return <div style={{ minHeight: slotSize.minHeight }} />
  }

  if (isPremium || isAdsBlocked) {
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