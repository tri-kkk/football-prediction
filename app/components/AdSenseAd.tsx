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

// ✅ AdSense 스크립트가 로드되었는지 확인
function isAdSenseReady(): boolean {
  if (typeof window === 'undefined') return false
  return typeof window.adsbygoogle !== 'undefined'
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
  const pushAttemptedRef = useRef(false)  // ✅ ref로 변경 (리렌더 없이 추적)
  const [adStatus, setAdStatus] = useState<'loading' | 'success' | 'failed'>('loading')
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
    
    if (isBot()) {
      try {
        sessionStorage.setItem('ts_ads_blocked', 'true')
        setIsAdsBlocked(true)
      } catch (e) {}
    }
  }, [])

  // ✅ 핵심 수정: 광고 로드 함수 - 스크립트 준비 상태 확인 후 push
  const loadAd = useCallback(() => {
    // 이미 성공했거나 이미 push 했으면 스킵
    if (pushAttemptedRef.current) return
    if (!containerRef.current) return
    
    // 컨테이너가 보이는지 확인
    if (!isElementVisible(containerRef.current)) {
      console.log(`⏸️ [AdSenseAd] ${slot}: 컨테이너가 보이지 않음, 대기 중...`)
      return
    }

    // ✅ AdSense 스크립트가 로드되었는지 확인
    if (!isAdSenseReady()) {
      console.log(`⏳ [AdSenseAd] ${slot}: AdSense 스크립트 아직 미로드, 대기 중...`)
      return  // 아직 준비 안 됨 → 다음 타이머에서 재시도
    }

    const insElement = containerRef.current.querySelector('ins.adsbygoogle')
    if (!insElement) return
    
    // 이미 로드된 광고인지 확인 (변수명 충돌 수정)
    const currentStatus = insElement.getAttribute('data-adsbygoogle-status')
    if (currentStatus === 'done') {
      console.log(`✅ [AdSenseAd] ${slot}: 이미 로드된 광고`)
      setAdStatus('success')
      pushAttemptedRef.current = true
      return
    }

    // ✅ 이미 push된 상태인지 확인 (data-adsbygoogle-status가 있으면 이미 처리 중)
    if (currentStatus) {
      console.log(`⏳ [AdSenseAd] ${slot}: 이미 처리 중 (status: ${currentStatus})`)
      pushAttemptedRef.current = true
      return
    }

    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
      pushAttemptedRef.current = true
      console.log(`🔄 [AdSenseAd] ${slot}: 광고 로드 요청 성공`)
    } catch (error: any) {
      console.error(`❌ [AdSenseAd] ${slot}: 광고 로드 에러:`, error?.message || error)
      
      if (error?.message?.includes('already have ads') || 
          error?.message?.includes('All ins elements')) {
        setAdStatus('success')
        pushAttemptedRef.current = true
      }
      // 다른 에러의 경우 pushAttemptedRef를 설정하지 않아 재시도 가능
    }
  }, [slot])

  // 광고 로드 성공 여부 감지 (MutationObserver)
  useEffect(() => {
    if (!isMounted || !isProduction) return
    if (!containerRef.current) return

    const insElement = containerRef.current.querySelector('ins.adsbygoogle')
    if (!insElement) return

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-adsbygoogle-status') {
          const newStatus = insElement.getAttribute('data-adsbygoogle-status')
          console.log(`📊 [AdSenseAd] ${slot}: 광고 상태 변경 →`, newStatus)
          
          if (newStatus === 'done') {
            setAdStatus('success')
            console.log(`✅ [AdSenseAd] ${slot}: 광고 로드 성공`)
          }
        }
        
        // ✅ 자식 요소 추가도 감지 (광고 iframe이 삽입되면 성공)
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          const hasIframe = insElement.querySelector('iframe')
          if (hasIframe) {
            setAdStatus('success')
            console.log(`✅ [AdSenseAd] ${slot}: 광고 iframe 감지 - 성공`)
          }
        }
      })
    })

    observer.observe(insElement, { 
      attributes: true, 
      childList: true,  // ✅ 자식 요소 변경도 감시
      subtree: true     // ✅ 하위 요소도 감시
    })

    return () => observer.disconnect()
  }, [isMounted, isProduction, slot])

  // ✅ 핵심 수정: 광고 로드 시도 - 스크립트 로드 대기 포함
  useEffect(() => {
    if (!isMounted) return
    if (status === 'loading') return
    if (isPremium || isAdsBlocked || !isProduction) return
    if (pushAttemptedRef.current) return

    // ✅ 더 넓은 간격으로 재시도 (스크립트 lazyOnload 대기)
    const timers = [
      setTimeout(() => loadAd(), 2000),   // 2초 (스크립트 로딩 대기)
      setTimeout(() => loadAd(), 4000),   // 4초
      setTimeout(() => loadAd(), 7000),   // 7초
      setTimeout(() => loadAd(), 12000),  // 12초
      setTimeout(() => loadAd(), 18000),  // 18초
      setTimeout(() => loadAd(), 25000),  // 25초
      setTimeout(() => loadAd(), 35000),  // 35초 (느린 네트워크 대비)
    ]

    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [isMounted, status, isPremium, isAdsBlocked, isProduction, loadAd])

  // ✅ 추가: IntersectionObserver로 뷰포트 진입 시 로드 시도
  useEffect(() => {
    if (!isMounted || !isProduction) return
    if (isPremium || isAdsBlocked) return
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !pushAttemptedRef.current) {
            console.log(`👁️ [AdSenseAd] ${slot}: 뷰포트 진입 - 로드 시도`)
            // 뷰포트 진입 후 약간의 딜레이
            setTimeout(() => loadAd(), 500)
          }
        })
      },
      { threshold: 0.1 }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [isMounted, isProduction, isPremium, isAdsBlocked, slot, loadAd])

  // 서버 렌더링 / 마운트 전
  if (!isMounted) return null
  if (status === 'loading') return null
  if (isPremium || isAdsBlocked) return null

  // 로컬 환경 - 플레이스홀더
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
            {slot} (로컬)
          </span>
        </div>
      </div>
    )
  }

  // 프로덕션 환경 - 실제 광고
  return (
    <div 
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      style={{ 
        width: slotSize.width,
        minHeight: slotSize.minHeight,
        // ✅ maxHeight 제거 - 광고 크기를 AdSense가 결정하도록
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