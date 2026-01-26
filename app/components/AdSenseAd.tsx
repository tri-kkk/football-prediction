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
  
  if (rect.width < 50 || rect.height < 50) return false
  if (style.display === 'none') return false
  if (style.visibility === 'hidden') return false
  if (style.opacity === '0') return false
  
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
  const [adStatus, setAdStatus] = useState<'loading' | 'success' | 'failed' | 'hidden'>('loading')
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
    if (adStatus === 'success' || adStatus === 'hidden') return
    if (!containerRef.current) return
    if (loadAttempts >= 3) {
      // 🔧 3번 실패하면 숨김
      setAdStatus('hidden')
      return
    }
    
    // 요소가 보이는지 확인
    if (!isElementVisible(containerRef.current)) {
      return // 보이지 않으면 스킵 (나중에 다시 시도)
    }

    const insElement = containerRef.current.querySelector('ins.adsbygoogle')
    if (!insElement) return
    
    // 이미 로드된 광고인지 확인
    if (insElement.getAttribute('data-adsbygoogle-status') === 'done') {
      setAdStatus('success')
      return
    }

    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
      setAdStatus('success')
      console.log(`📢 [AdSenseAd] ${slot}: 광고 로드 완료`)
    } catch (error: any) {
      setLoadAttempts(prev => prev + 1)
      
      if (error?.message?.includes('already have ads')) {
        setAdStatus('success')
      } else {
        // 실패 카운트 증가, 3번 이상이면 숨김
        if (loadAttempts >= 2) {
          setAdStatus('hidden')
        }
      }
    }
  }, [adStatus, slot, loadAttempts])

  // 🔧 광고 로드 성공 여부 감지 (MutationObserver)
  useEffect(() => {
    if (!isMounted || !isProduction) return
    if (adStatus !== 'loading') return
    if (!containerRef.current) return

    const insElement = containerRef.current.querySelector('ins.adsbygoogle')
    if (!insElement) return

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-adsbygoogle-status') {
          const status = insElement.getAttribute('data-adsbygoogle-status')
          if (status === 'done') {
            // 광고 로드 성공 - 실제로 콘텐츠가 있는지 확인
            const hasContent = insElement.querySelector('iframe') || 
                              insElement.querySelector('ins') ||
                              (insElement as HTMLElement).offsetHeight > 10
            
            if (hasContent) {
              setAdStatus('success')
            } else {
              // 콘텐츠 없음 = 광고 없음
              setAdStatus('hidden')
            }
          }
        }
      })
    })

    observer.observe(insElement, { attributes: true })

    return () => observer.disconnect()
  }, [isMounted, isProduction, adStatus])

  // 광고 로드 시도
  useEffect(() => {
    if (!isMounted) return
    if (status === 'loading') return
    if (isPremium || isAdsBlocked || !isProduction) return
    if (adStatus === 'success' || adStatus === 'hidden') return

    const timer1 = setTimeout(() => loadAd(), 2000)
    const timer2 = setTimeout(() => loadAd(), 5000)
    const timer3 = setTimeout(() => {
      loadAd()
      // 🔧 10초 후에도 loading이면 숨김
      setTimeout(() => {
        if (adStatus === 'loading') {
          setAdStatus('hidden')
        }
      }, 1000)
    }, 10000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [isMounted, status, isPremium, isAdsBlocked, isProduction, adStatus, loadAd])

  // 🔧 실패/숨김 상태면 아무것도 렌더링 안 함
  if (adStatus === 'hidden' || adStatus === 'failed') {
    return null
  }

  // 서버 렌더링 / 마운트 전
  if (!isMounted) {
    return null // 🔧 빈 박스 대신 null 반환
  }

  if (status === 'loading') {
    return null // 🔧 빈 박스 대신 null 반환
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
        minHeight: adStatus === 'success' ? slotSize.minHeight : '0',
        maxHeight: slotSize.maxHeight,
        // 🔧 로딩 중에는 높이 0, 성공하면 원래 높이
        transition: 'min-height 0.3s ease',
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