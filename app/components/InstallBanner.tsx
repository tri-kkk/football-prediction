'use client'

import { useState, useEffect } from 'react'
import { usePWAInstall } from './pwa/PWAInstallContext'
import { useLanguage } from '../contexts/LanguageContext'

export default function InstallBanner() {
  const { canInstall, isInstalled, isIOS, triggerInstall } = usePWAInstall()
  const { language } = useLanguage()
  const [showBanner, setShowBanner] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  // 안드로이드 감지 (SSR 안전)
  const [isAndroid, setIsAndroid] = useState(false)
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsAndroid(/Android/i.test(navigator.userAgent))
    }
  }, [])

  const texts = {
    ko: {
      titleAndroid: '트렌드사커 앱',
      subtitleAndroid: '더 빠르고 편하게, 앱으로 만나보세요',
      titlePwa: '앱처럼 빠르게',
      subtitlePwa: '홈 화면에서 바로 경기 분석',
      tag1: '즉시 접속',
      tag2: '알림 지원',
      tag3: '가벼운 용량',
      buttonAndroid: 'Google Play에서 다운로드',
      buttonIOS: '설치 방법 보기',
      buttonPwaAndroid: '홈 화면에 추가',
    },
    en: {
      titleAndroid: 'TrendSoccer App',
      subtitleAndroid: 'Faster and smoother with our official app',
      titlePwa: 'Fast like an app',
      subtitlePwa: 'Match analysis right from your home screen',
      tag1: 'Instant access',
      tag2: 'Notifications',
      tag3: 'Lightweight',
      buttonAndroid: 'Get it on Google Play',
      buttonIOS: 'How to install',
      buttonPwaAndroid: 'Add to Home Screen',
    },
  }

  const t = texts[language] || texts.ko

  useEffect(() => {
    if (isInstalled) return
    if (!isAndroid && !canInstall) return

    const dismissedTime = localStorage.getItem('installBannerDismissed')
    if (dismissedTime) {
      const elapsed = Date.now() - parseInt(dismissedTime)
      if (elapsed < 7 * 24 * 60 * 60 * 1000) return
    }

    const timer = setTimeout(() => setShowBanner(true), 3000)
    return () => clearTimeout(timer)
  }, [canInstall, isInstalled, isAndroid])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setShowBanner(false)
      localStorage.setItem('installBannerDismissed', Date.now().toString())
    }, 300)
  }

  const handleInstall = async () => {
    if (isAndroid) {
      window.open('https://play.google.com/store/apps/details?id=com.trendsoccer.app', '_blank')
      handleClose()
      return
    }
    const result = await triggerInstall()
    if (result || isIOS) handleClose()
  }

  if (!showBanner || isInstalled) return null

  // 라인 아이콘 (이모지 대신)
  const chipIcons: Record<string, React.ReactNode> = {
    bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
    bell: <><path d="M6 9a6 6 0 1 1 12 0c0 5 2.5 6 2.5 6h-17S6 14 6 9Z" /><path d="M10.5 21a2 2 0 0 0 3 0" /></>,
    feather: <><path d="M20 4 9 15" /><path d="M15 4h5v5" /><path d="M4 20c3-6 7-9 11-11" /></>,
  }
  const chips = [
    { key: 'bolt', text: t.tag1 },
    { key: 'bell', text: t.tag2 },
    { key: 'feather', text: t.tag3 },
  ]

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-[3px] z-[60] md:hidden transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* 배너 */}
      <div
        className={`fixed bottom-[72px] left-0 right-0 z-[70] md:hidden px-4 transition-all duration-300 ${
          isClosing ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
        style={{ animation: !isClosing ? 'ibSlideUp 0.42s cubic-bezier(0.16, 1, 0.3, 1)' : undefined }}
      >
        <style jsx>{`
          @keyframes ibSlideUp {
            from { transform: translateY(110%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        <div
          className="relative rounded-[22px] border border-white/10 overflow-hidden"
          style={{
            background: 'radial-gradient(120% 90% at 82% 0%, #16233a 0%, #10151f 55%, #0c0f16 100%)',
            boxShadow: '0 20px 50px rgba(0,0,0,.55)',
          }}
        >
          {/* 상단 브랜드 하이라이트 라인 */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#62F4FF]/60 to-transparent" />
          {/* 코너 글로우 */}
          <div className="absolute -top-16 -right-10 w-44 h-44 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(120,230,140,.26), transparent 68%)', filter: 'blur(6px)' }} />

          {/* 닫기 */}
          <button
            onClick={handleClose}
            aria-label="닫기"
            className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all z-10"
          >
            <svg className="w-4.5 h-4.5" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative p-5">
            {/* 헤더 */}
            <div className="flex items-center gap-3.5 mb-4 pr-6">
              {/* 앱 아이콘 타일 */}
              <div
                className="relative flex-shrink-0 w-12 h-12 rounded-[14px] grid place-items-center"
                style={{ background: 'linear-gradient(160deg, #16281f, #101a15)', border: '1px solid rgba(120,230,140,.3)', boxShadow: '0 6px 16px rgba(0,0,0,.4)' }}
              >
                <img src="/logo.svg" alt="TrendSoccer" className="h-6 w-auto" />
              </div>

              {/* 텍스트 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-white text-[16px] leading-tight tracking-tight truncate">
                    {isAndroid ? t.titleAndroid : t.titlePwa}
                  </h3>
                  <span className="flex-shrink-0 text-[9px] font-extrabold tracking-wide px-1.5 py-0.5 rounded-full text-[#7de38a] bg-[#34d399]/[0.14] border border-[#34d399]/40">
                    NEW
                  </span>
                </div>
                <p className="text-slate-400 text-[12.5px] leading-snug mt-1 truncate">
                  {isAndroid ? t.subtitleAndroid : t.subtitlePwa}
                </p>
              </div>
            </div>

            {/* 혜택 칩 (라인 아이콘) */}
            <div className="flex flex-wrap gap-2 mb-4">
              {chips.map((c) => (
                <span
                  key={c.key}
                  className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold text-slate-300 bg-white/[0.04] border border-white/[0.08]"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7de38a" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                    {chipIcons[c.key]}
                  </svg>
                  {c.text}
                </span>
              ))}
            </div>

            {/* CTA */}
            {isAndroid ? (
              <button
                onClick={handleInstall}
                aria-label="Get it on Google Play"
                className="relative w-full py-3 rounded-[14px] transition-all duration-200 active:scale-[0.985] flex items-center justify-center gap-2.5"
                style={{ background: '#ffffff', boxShadow: '0 10px 26px rgba(0,0,0,.34)' }}
              >
                {/* 공식 Google Play 멀티컬러 마크 (클립패스로 4색) */}
                <svg width="21" height="23" viewBox="0 0 24 24" aria-hidden>
                  <defs>
                    <clipPath id="gpTri">
                      <path d="M4 2.6c0-.83.9-1.35 1.62-.94l13.1 7.56c.72.42.72 1.46 0 1.88L5.62 22.34C4.9 22.75 4 22.23 4 21.4z" />
                    </clipPath>
                  </defs>
                  <g clipPath="url(#gpTri)">
                    <rect x="0" y="0" width="24" height="12" fill="#17C3E8" />
                    <rect x="0" y="12" width="24" height="12" fill="#25D07C" />
                    <rect x="12.6" y="0" width="11.4" height="12" fill="#F8CE3B" />
                    <rect x="12.6" y="12" width="11.4" height="12" fill="#F1554C" />
                  </g>
                </svg>
                <span style={{ color: '#3c4043', fontSize: 17, fontWeight: 600, letterSpacing: .2 }}>Google Play</span>
              </button>
            ) : (
              <button
                onClick={handleInstall}
                className="relative w-full py-3.5 rounded-[14px] font-extrabold text-[14.5px] text-[#082018] transition-all duration-200 active:scale-[0.985] flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(120deg,#7DE38A,#3EC5E8)', boxShadow: '0 10px 24px rgba(62,197,232,.28)' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
                </svg>
                {isIOS ? t.buttonIOS : t.buttonPwaAndroid}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
