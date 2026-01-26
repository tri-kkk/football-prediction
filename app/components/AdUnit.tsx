'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'

interface AdUnitProps {
  slot: string
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal'
  responsive?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * 🛡️ AdUnit - 무효 트래픽 방지 기능이 포함된 광고 유닛
 * 
 * 기능:
 * 1. 프리미엄 사용자 광고 숨김
 * 2. 의심스러운 활동 감지 시 광고 숨김
 * 3. 광고 주변 실수 클릭 방지 여백
 * 4. 중복 광고 로드 방지
 */
export default function AdUnit({ 
  slot, 
  format = 'auto', 
  responsive = true,
  className = '',
  style = {}
}: AdUnitProps) {
  const { data: session, status } = useSession()
  const adRef = useRef<HTMLModElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  
  const isPremium = session?.user?.tier === 'premium'
  
  // 광고 숨김 상태 체크
  const shouldHideAds = () => {
    if (typeof window === 'undefined') return false
    try {
      return sessionStorage.getItem('ts_ads_hidden') === 'true' || 
             (window as any).__adsHidden === true
    } catch (e) {
      return false
    }
  }
  
  useEffect(() => {
    // 프리미엄 사용자거나 광고 숨김 상태면 표시 안 함
    if (isPremium || shouldHideAds()) {
      setIsVisible(false)
      return
    }
    
    // Intersection Observer로 뷰포트에 들어왔을 때만 광고 로드
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoaded) {
            setIsVisible(true)
          }
        })
      },
      {
        rootMargin: '100px', // 100px 전에 미리 로드
        threshold: 0.1
      }
    )
    
    if (adRef.current) {
      observer.observe(adRef.current)
    }
    
    return () => observer.disconnect()
  }, [isPremium, isLoaded])
  
  // 광고 로드
  useEffect(() => {
    if (!isVisible || isLoaded || isPremium) return
    
    // adsbygoogle가 로드되었는지 확인
    if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
      try {
        // 약간의 딜레이 후 푸시 (중복 방지)
        const timer = setTimeout(() => {
          (window as any).adsbygoogle.push({})
          setIsLoaded(true)
          console.log(`[AdUnit] Loaded slot: ${slot}`)
        }, 100)
        
        return () => clearTimeout(timer)
      } catch (e) {
        console.error('[AdUnit] Error pushing ad:', e)
      }
    }
  }, [isVisible, isLoaded, slot, isPremium])
  
  // 프리미엄 사용자면 렌더링 안 함
  if (status === 'loading') {
    return <div className={`bg-gray-900/30 animate-pulse ${className}`} style={{ minHeight: '90px', ...style }} />
  }
  
  if (isPremium || shouldHideAds()) {
    return null
  }
  
  return (
    <div 
      className={`ad-container ${className}`}
      style={{
        // 실수 클릭 방지를 위한 여백
        padding: '8px',
        margin: '16px 0',
        ...style
      }}
    >
      {/* 광고 라벨 (Google 정책 권장) */}
      <div className="text-[10px] text-gray-600 mb-1 text-center">
        Advertisement
      </div>
      
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: 'block',
          minHeight: '90px',
          backgroundColor: 'transparent'
        }}
        data-ad-client="ca-pub-7853814871438044"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  )
}


/**
 * 인피드 광고용 컴포넌트 (목록 사이에 삽입)
 */
export function InFeedAd({ slot, className = '' }: { slot: string, className?: string }) {
  return (
    <AdUnit 
      slot={slot}
      format="fluid"
      responsive={true}
      className={`in-feed-ad ${className}`}
      style={{
        margin: '24px 0',
        padding: '12px 8px'
      }}
    />
  )
}


/**
 * 디스플레이 광고용 컴포넌트 (배너형)
 */
export function DisplayAd({ 
  slot, 
  size = 'responsive',
  className = '' 
}: { 
  slot: string
  size?: 'responsive' | 'rectangle' | 'leaderboard' | 'skyscraper'
  className?: string 
}) {
  const sizeStyles: Record<string, React.CSSProperties> = {
    responsive: { minHeight: '90px' },
    rectangle: { width: '300px', height: '250px' },
    leaderboard: { width: '728px', height: '90px', maxWidth: '100%' },
    skyscraper: { width: '160px', height: '600px' }
  }
  
  return (
    <AdUnit 
      slot={slot}
      format={size === 'responsive' ? 'auto' : 'rectangle'}
      responsive={size === 'responsive'}
      className={`display-ad ${className}`}
      style={sizeStyles[size]}
    />
  )
}
