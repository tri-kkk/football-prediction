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
}

// 슬롯별 크기 설정
const SLOT_SIZES: Record<string, { width: string; minHeight: string; maxHeight?: string }> = {
  sidebar_right_top: { width: '300px', minHeight: '250px' },
  sidebar_right_bottom: { width: '300px', minHeight: '250px' },
  infeed: { width: '100%', minHeight: '100px', maxHeight: '250px' },
  horizontal: { width: '728px', minHeight: '90px', maxHeight: '90px' },
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

    const loadAd = () => {
      try {
        // 컨테이너 너비 체크
        if (adRef.current && adRef.current.offsetWidth === 0) {
          setTimeout(loadAd, 100)
          return
        }

        window.adsbygoogle = window.adsbygoogle || []
        window.adsbygoogle.push({})
        setIsLoaded(true)
      } catch (error) {
        console.error('[AdSenseAd] 로드 실패:', error)
        setHasError(true)
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
        className={`flex items-center justify-center border-2 border-dashed rounded-lg ${
          darkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-100'
        } ${className}`}
        style={{ 
          width: slotSize.width,
          minHeight: slotSize.minHeight,
          maxHeight: slotSize.maxHeight,
          ...style 
        }}
      >
        <div className="text-center p-4">
          <div className="text-2xl mb-2">📢</div>
          <div className={`text-xs font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            AdSense
          </div>
          <div className={`text-[10px] mt-1 ${darkMode ? 'text-gray-600' : 'text-gray-500'}`}>
            {slot}
          </div>
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
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  )
}