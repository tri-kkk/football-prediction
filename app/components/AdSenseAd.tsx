'use client'

import { useEffect, useRef, useState } from 'react'

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

  const adSlot = ADSENSE_SLOTS[slot]
  const slotSize = SLOT_SIZES[slot] || { width: '100%', minHeight: '90px', maxHeight: '90px' }

  useEffect(() => {
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

    let retryCount = 0
    const maxRetries = 5

    const loadAd = () => {
      try {
        // 컨테이너 체크
        const container = adRef.current
        if (!container) {
          return
        }

        // ✅ ins 요소 찾기
        const insElement = container.querySelector('ins.adsbygoogle')
        
        // ✅ 이미 광고가 로드되었는지 확인 (중복 방지!)
        if (insElement && insElement.getAttribute('data-adsbygoogle-status') === 'done') {
          setIsLoaded(true)
          return
        }

        // ✅ display: none 체크 (Tailwind hidden 클래스 등)
        const computedStyle = window.getComputedStyle(container)
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
          console.log(`[AdSenseAd] ${slot}: 숨겨진 요소, 광고 로드 스킵`)
          return  // 재시도 없이 완전 스킵
        }

        // ✅ 요소가 보이는지 확인
        const rect = container.getBoundingClientRect()
        const isVisible = rect.width > 0 && rect.height > 0
        
        // ✅ 너비가 0이거나 안 보이면 재시도 (최대 5회)
        if (!isVisible || container.offsetWidth === 0) {
          retryCount++
          if (retryCount < maxRetries) {
            setTimeout(loadAd, 200)
          } else {
            console.log(`[AdSenseAd] ${slot}: 표시 공간 없음, 광고 로드 스킵`)
          }
          return
        }

        window.adsbygoogle = window.adsbygoogle || []
        window.adsbygoogle.push({})
        setIsLoaded(true)
      } catch (error: any) {
        // ✅ 모든 에러 조용히 처리 (콘솔에 에러 대신 로그)
        if (error?.message?.includes('already have ads')) {
          setIsLoaded(true)
          return
        }
        if (error?.message?.includes('No slot size') || error?.message?.includes('availableWidth')) {
          console.log(`[AdSenseAd] ${slot}: 광고 공간 부족, 스킵`)
          return
        }
        console.log('[AdSenseAd] 로드 스킵:', slot)
      }
    }

    const timer = setTimeout(loadAd, 300)
    return () => clearTimeout(timer)
  }, [isLoaded, slot])

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
      {/* ✅ key로 중복 렌더링 방지 */}
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
  )
}