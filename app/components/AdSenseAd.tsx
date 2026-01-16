'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// ==========================================
// 🎯 Google AdSense 설정
// ==========================================
const ADSENSE_CLIENT_ID = 'ca-pub-7853814871438044'

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
  const [isPremium, setIsPremium] = useState<boolean | null>(null)

  const adSlot = ADSENSE_SLOTS[slot]
  const slotSize = SLOT_SIZES[slot] || { width: '100%', minHeight: '90px', maxHeight: '90px' }

  // ✅ 프리미엄 사용자 체크
  useEffect(() => {
    async function checkPremium() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          // 비로그인 사용자 = 광고 표시
          setIsPremium(false)
          return
        }

        // users 테이블에서 tier 확인
        const { data: profile } = await supabase
          .from('users')
          .select('tier')
          .eq('id', user.id)
          .single()

        setIsPremium(profile?.tier === 'premium')
      } catch (error) {
        // 에러 시 광고 표시 (안전한 기본값)
        setIsPremium(false)
      }
    }

    checkPremium()

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkPremium()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // 프리미엄 사용자는 광고 로드 스킵
    if (isPremium === null || isPremium === true) return

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
      } catch (error: any) {
        // 모든 에러 조용히 처리
        if (error?.message?.includes('already have ads')) {
          setIsLoaded(true)
        }
        // 다른 에러는 무시 (로그도 안 남김)
      }
    }

    // ✅ ResizeObserver로 컨테이너 크기가 잡히면 로드
    const container = adRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        
        // 너비와 높이가 둘 다 0보다 크면 로드 시도
        if (width > 50 && height > 50 && !isLoaded) {
          // display: none 체크
          const computedStyle = window.getComputedStyle(container)
          if (computedStyle.display === 'none') {
            return
          }
          
          // 약간의 딜레이 후 로드
          setTimeout(loadAd, 100)
          observer.disconnect()
        }
      }
    })

    observer.observe(container)

    // 폴백: 2초 후에도 안 됐으면 한 번 시도
    const fallbackTimer = setTimeout(() => {
      if (!isLoaded && container.offsetWidth > 50) {
        loadAd()
      }
    }, 2000)

    return () => {
      observer.disconnect()
      clearTimeout(fallbackTimer)
    }
  }, [isLoaded, slot, isPremium])

  // ✅ 프리미엄 사용자는 아무것도 렌더링 안 함
  if (isPremium === true) {
    return null
  }

  // 프리미엄 체크 중 (로딩 상태)
  if (isPremium === null) {
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