'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

// 광고 타입 정의
interface Advertisement {
  id: string
  name: string
  slot_type: string
  image_url: string
  link_url: string
  alt_text: string
  width: number
  height: number
}

interface AdBannerProps {
  slot: 'desktop_banner' | 'sidebar' | 'mobile_bottom'
  className?: string
  fallback?: React.ReactNode
  onClose?: () => void
}

export default function AdBanner({ slot, className = '', fallback, onClose }: AdBannerProps) {
  const [ad, setAd] = useState<Advertisement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isAdsBlocked, setIsAdsBlocked] = useState(false)
  
  // 🛡️ NextAuth 세션 + 프리미엄 체크
  const { data: session, status } = useSession()
  const isPremium = (session?.user as any)?.tier === 'premium'

  // 🔧 클라이언트 마운트 체크 (Hydration 에러 방지)
  useEffect(() => {
    setIsMounted(true)
    
    // 차단 상태 체크 (클라이언트에서만)
    try {
      setIsAdsBlocked(sessionStorage.getItem('ts_ads_blocked') === 'true')
    } catch (e) {}
  }, [])

  // 광고 로드 - 🆕 프리미엄도 광고 노출
  useEffect(() => {
    if (!isMounted) return
    if (status === 'loading') return
    // 🆕 isPremium 체크 제거 - 모든 티어에 광고 노출
    if (isAdsBlocked) {
      setLoading(false)
      return
    }

    const fetchAd = async () => {
      try {
        const response = await fetch(`/api/ads?slot=${slot}&active=true`)
        if (!response.ok) throw new Error('광고 로드 실패')
        
        const data = await response.json()
        const ads = data.ads || []
        
        if (ads.length > 0) {
          setAd(ads[0])
          
          // 노출 추적 (비동기)
          fetch(`/api/ads/track?id=${ads[0].id}&type=impression`, { method: 'POST' })
            .catch(() => {})
        }
      } catch (err) {
        console.error('광고 로드 에러:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchAd()
  }, [slot, isPremium, status, isMounted, isAdsBlocked])

  // 클릭 추적
  const handleClick = () => {
    if (ad) {
      fetch(`/api/ads/track?id=${ad.id}&type=click`, { method: 'POST' })
        .catch(() => {})
    }
  }

  // 🔧 서버 렌더링 시 플레이스홀더
  if (!isMounted) {
    return (
      <div className={`animate-pulse bg-gray-800 rounded-lg ${className}`}>
        <div className={`
          ${slot === 'desktop_banner' ? 'h-[90px]' : ''}
          ${slot === 'sidebar' ? 'h-[600px]' : ''}
          ${slot === 'mobile_bottom' ? 'h-[50px]' : ''}
        `} />
      </div>
    )
  }

  // 🆕 프리미엄 체크 제거 - 모든 티어에 광고 노출
  
  // 차단된 세션
  if (isAdsBlocked) {
    return null
  }

  // 로딩 중
  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-800 rounded-lg ${className}`}>
        <div className={`
          ${slot === 'desktop_banner' ? 'h-[90px]' : ''}
          ${slot === 'sidebar' ? 'h-[600px]' : ''}
          ${slot === 'mobile_bottom' ? 'h-[50px]' : ''}
        `} />
      </div>
    )
  }

  if (error || !ad) {
    return fallback ? <>{fallback}</> : null
  }

  // 슬롯별 스타일
  const slotStyles: Record<string, string> = {
    desktop_banner: 'w-full max-w-[728px] h-[90px]',
    sidebar: 'w-full max-w-[300px] h-auto',
    mobile_bottom: 'w-full max-w-[320px] h-[50px]',
  }

  return (
    <div className={`relative ${className}`}>
      <a
        href={ad.link_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
        className={`block ${slotStyles[slot]} overflow-hidden rounded-lg transition-opacity hover:opacity-90`}
      >
        <img
          src={ad.image_url}
          alt={ad.alt_text || ad.name}
          width={ad.width}
          height={ad.height}
          className={`w-full h-full object-contain ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setError(true)}
        />
      </a>
      
      {/* 광고 표시 레이블 */}
      <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/50 text-white text-[10px] rounded">
        AD
      </span>
      
      {/* 모바일 하단 광고 닫기 버튼 */}
      {slot === 'mobile_bottom' && onClose && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }}
          className="absolute top-1 left-1 w-5 h-5 bg-black/50 text-white text-xs rounded-full flex items-center justify-center hover:bg-black/70"
        >
          ✕
        </button>
      )}
    </div>
  )
}

// 🖥️ 데스크톱 배너 (728x90) - 🆕 모든 티어에 노출
export function DesktopBanner({ className = '' }: { className?: string }) {
  const [isMounted, setIsMounted] = useState(false)
  const [isAdsBlocked, setIsAdsBlocked] = useState(false)
  // 🆕 isPremium 체크 제거
  
  useEffect(() => {
    setIsMounted(true)
    try {
      setIsAdsBlocked(sessionStorage.getItem('ts_ads_blocked') === 'true')
    } catch (e) {}
  }, [])
  
  if (!isMounted) return <div className="hidden lg:block h-[90px]" />
  if (isAdsBlocked) return null  // 🆕 isPremium 제거
  
  return (
    <div className={`hidden lg:flex justify-center ${className}`}>
      <AdBanner slot="desktop_banner" />
    </div>
  )
}

// 📱 사이드바 배너 (300x600) - 🆕 모든 티어에 노출
export function SidebarBanner({ className = '' }: { className?: string }) {
  const [isMounted, setIsMounted] = useState(false)
  const [isAdsBlocked, setIsAdsBlocked] = useState(false)
  // 🆕 isPremium 체크 제거
  
  useEffect(() => {
    setIsMounted(true)
    try {
      setIsAdsBlocked(sessionStorage.getItem('ts_ads_blocked') === 'true')
    } catch (e) {}
  }, [])
  
  if (!isMounted) return <div className="hidden lg:block h-[600px]" />
  if (isAdsBlocked) return null  // 🆕 isPremium 제거
  
  return (
    <div className={`hidden lg:block ${className}`}>
      <AdBanner slot="sidebar" />
    </div>
  )
}

// 📱 모바일 하단 고정 배너 (320x50) - 🆕 모든 티어에 노출
export function MobileBottomBanner({ 
  className = '',
  onClose 
}: { 
  className?: string
  onClose?: () => void 
}) {
  const [isClosed, setIsClosed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isAdsBlocked, setIsAdsBlocked] = useState(false)
  // 🆕 isPremium 체크 제거

  useEffect(() => {
    setIsMounted(true)
    try {
      setIsAdsBlocked(sessionStorage.getItem('ts_ads_blocked') === 'true')
    } catch (e) {}
  }, [])

  if (!isMounted) return null
  if (isClosed || isAdsBlocked) return null  // 🆕 isPremium 제거

  return (
    <div className={`lg:hidden fixed left-0 right-0 bg-black/90 p-2 flex justify-center ${className}`} style={{ bottom: '60px', zIndex: 51 }}>
      <AdBanner
        slot="mobile_bottom"
        onClose={() => {
          setIsClosed(true)
          onClose?.()
        }}
      />
    </div>
  )
}

// 🎯 정적 광고 (DB 없이 하드코딩) - 🆕 모든 티어에 노출
export function StaticAdBanner({ 
  slot,
  className = '',
  onClose
}: { 
  slot: 'desktop_banner' | 'sidebar' | 'mobile_bottom'
  className?: string
  onClose?: () => void
}) {
  const [isMounted, setIsMounted] = useState(false)
  const [isAdsBlocked, setIsAdsBlocked] = useState(false)
  const [isClosed, setIsClosed] = useState(false)
  // 🆕 isPremium 체크 제거
  
  useEffect(() => {
    setIsMounted(true)
    try {
      setIsAdsBlocked(sessionStorage.getItem('ts_ads_blocked') === 'true')
    } catch (e) {}
  }, [])
  
  // 스폴라이브 광고 하드코딩
  const ADS = {
    desktop_banner: {
      image: '/ads/ad-banner-728x90.png',
      link: 'https://www.spolive.com/?ref=trendsoccer',
      alt: 'TrendSoccer 제휴 기념 - 스폴라이브 신규가입 시 1만원 상당 혜택 지급',
      width: 728,
      height: 90,
    },
    sidebar: {
      image: '/ads/ad-banner-300x600.png',
      link: 'https://www.spolive.com/?ref=trendsoccer',
      alt: 'TrendSoccer 제휴 기념 - 스폴라이브 신규가입 시 1만원 상당 혜택 지급',
      width: 300,
      height: 600,
    },
    mobile_bottom: {
      image: '/ads/ad-banner-320x50.png',
      link: 'https://www.spolive.com/?ref=trendsoccer',
      alt: 'TrendSoccer 제휴 기념 - 스폴라이브 신규가입 시 1만원 상당 혜택 지급',
      width: 320,
      height: 50,
    },
  }

  const ad = ADS[slot]

  if (!isMounted) return null
  if (isClosed || isAdsBlocked) return null  // 🆕 isPremium 제거

  return (
    <div className={`relative ${className}`}>
      <a
        href={ad.link}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block overflow-hidden rounded-lg transition-opacity hover:opacity-90"
      >
        <img
          src={ad.image}
          alt={ad.alt}
          width={ad.width}
          height={ad.height}
          className="w-full h-auto object-contain"
        />
      </a>
      
      {/* 광고 표시 레이블 */}
      <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/50 text-white text-[10px] rounded">
        AD
      </span>
      
      {/* 모바일 하단 광고 닫기 버튼 */}
      {slot === 'mobile_bottom' && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsClosed(true)
            onClose?.()
          }}
          className="absolute top-1 left-1 w-5 h-5 bg-black/50 text-white text-xs rounded-full flex items-center justify-center hover:bg-black/70"
        >
          ✕
        </button>
      )}
    </div>
  )
}

// 정적 버전 export - 🆕 모든 티어에 노출
export function StaticDesktopBanner({ className = '' }: { className?: string }) {
  const [isMounted, setIsMounted] = useState(false)
  const [isAdsBlocked, setIsAdsBlocked] = useState(false)
  // 🆕 isPremium 체크 제거
  
  useEffect(() => {
    setIsMounted(true)
    try {
      setIsAdsBlocked(sessionStorage.getItem('ts_ads_blocked') === 'true')
    } catch (e) {}
  }, [])
  
  if (!isMounted) return null
  if (isAdsBlocked) return null  // 🆕 isPremium 제거
  
  return (
    <div className={`hidden lg:flex justify-center ${className}`}>
      <StaticAdBanner slot="desktop_banner" />
    </div>
  )
}

export function StaticSidebarBanner({ className = '' }: { className?: string }) {
  const [isMounted, setIsMounted] = useState(false)
  const [isAdsBlocked, setIsAdsBlocked] = useState(false)
  // 🆕 isPremium 체크 제거
  
  useEffect(() => {
    setIsMounted(true)
    try {
      setIsAdsBlocked(sessionStorage.getItem('ts_ads_blocked') === 'true')
    } catch (e) {}
  }, [])
  
  if (!isMounted) return null
  if (isAdsBlocked) return null  // 🆕 isPremium 제거
  
  return (
    <div className={`hidden lg:block ${className}`}>
      <StaticAdBanner slot="sidebar" />
    </div>
  )
}

export function StaticMobileBottomBanner({ 
  className = '',
  onClose 
}: { 
  className?: string
  onClose?: () => void 
}) {
  const [isClosed, setIsClosed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isAdsBlocked, setIsAdsBlocked] = useState(false)
  // 🆕 isPremium 체크 제거

  useEffect(() => {
    setIsMounted(true)
    try {
      setIsAdsBlocked(sessionStorage.getItem('ts_ads_blocked') === 'true')
    } catch (e) {}
  }, [])

  if (!isMounted) return null
  if (isClosed || isAdsBlocked) return null  // 🆕 isPremium 제거

  return (
    <div className={`lg:hidden fixed left-0 right-0 bg-black/90 p-2 flex justify-center safe-area-bottom ${className}`} style={{ bottom: '60px', zIndex: 51 }}>
      <StaticAdBanner
        slot="mobile_bottom"
        onClose={() => {
          setIsClosed(true)
          onClose?.()
        }}
      />
    </div>
  )
}