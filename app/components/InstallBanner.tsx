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
      titleAndroid: '트렌드사커 앱 출시! 🎉',
      subtitleAndroid: '더 빠르고 편리하게 앱으로 이용하세요',
      titlePwa: '앱으로 더 빠르게! ⚡',
      subtitlePwa: '홈 화면에서 바로 경기 분석 확인',
      tag1: '즉시 접속',
      tag2: '알림 지원',
      tag3: '용량 0MB',
      tagPlayStore: '⭐ 구글 플레이',
      buttonAndroid: '구글 플레이에서 다운로드',
      buttonIOS: '설치 방법 보기',
      buttonPwaAndroid: '홈 화면에 추가'
    },
    en: {
      titleAndroid: 'TrendSoccer App Released! 🎉',
      subtitleAndroid: 'Faster and easier with our official app',
      titlePwa: 'Faster with App! ⚡',
      subtitlePwa: 'Check match analysis from home screen',
      tag1: 'Instant Access',
      tag2: 'Notifications',
      tag3: '0MB Storage',
      tagPlayStore: '⭐ Google Play',
      buttonAndroid: 'Download on Google Play',
      buttonIOS: 'See How to Install',
      buttonPwaAndroid: 'Add to Home Screen'
    }
  }

  const t = texts[language] || texts.ko

  useEffect(() => {
    if (isInstalled) return
    // 🆕 Android는 canInstall과 무관하게 Play Store 유도 배너 표시 (구글 플레이 앱 출시)
    // iOS/기타는 기존 PWA canInstall 기반
    if (!isAndroid && !canInstall) return

    // 이전에 닫았는지 체크 (7일 동안)
    const dismissedTime = localStorage.getItem('installBannerDismissed')
    if (dismissedTime) {
      const elapsed = Date.now() - parseInt(dismissedTime)
      if (elapsed < 7 * 24 * 60 * 60 * 1000) return
    }

    // 3초 후 배너 표시
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
    // 🆕 Android면 Play Store로 이동 (앱 출시 후)
    if (isAndroid) {
      window.open('https://play.google.com/store/apps/details?id=com.trendsoccer.app', '_blank')
      handleClose()
      return
    }
    // iOS / 기타는 기존 PWA install
    const result = await triggerInstall()
    if (result || isIOS) handleClose()
  }

  if (!showBanner || isInstalled) return null

  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />
      
      {/* 배너 */}
      <div 
        className={`fixed bottom-[72px] left-0 right-0 z-[70] md:hidden px-4 transition-all duration-300 ${
          isClosing ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
        style={{ 
          animation: !isClosing ? 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
        }}
      >
        <style jsx>{`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
        
        <div className="relative bg-gradient-to-b from-[#1e293b] to-[#0f172a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          
          {/* 상단 글로우 라인 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
          
          {/* 배경 장식 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          {/* 닫기 버튼 */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl transition-all z-10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative p-5">
            {/* 헤더 */}
            <div className="flex items-start gap-4 mb-4">
              {/* 아이콘 */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-emerald-500/30 rounded-xl blur-lg" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              
              {/* 텍스트 */}
              <div className="flex-1 pr-8">
                <h3 className="font-bold text-white text-[17px] leading-tight mb-1">
                  {isAndroid ? t.titleAndroid : t.titlePwa}
                </h3>
                <p className="text-slate-400 text-sm leading-snug">
                  {isAndroid ? t.subtitleAndroid : t.subtitlePwa}
                </p>
              </div>
            </div>

            {/* 혜택 태그 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { icon: '⚡', text: t.tag1 },
                { icon: '📱', text: t.tag2 },
                { icon: '💾', text: t.tag3 },
              ].map((tag, i) => (
                <span 
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-xs text-slate-300"
                >
                  <span>{tag.icon}</span>
                  <span>{tag.text}</span>
                </span>
              ))}
            </div>

            {/* 설치 버튼 */}
            <button
              onClick={handleInstall}
              className="relative w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 active:scale-[0.98] shadow-lg shadow-emerald-500/20 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {isAndroid ? t.buttonAndroid : isIOS ? t.buttonIOS : t.buttonPwaAndroid}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
