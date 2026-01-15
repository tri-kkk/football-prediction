'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAInstallContextType {
  // 설치 가능 여부
  canInstall: boolean
  // iOS 여부 (수동 안내 필요)
  isIOS: boolean
  // 이미 설치됨 (standalone 모드)
  isInstalled: boolean
  // 설치 프롬프트 실행
  triggerInstall: () => Promise<boolean>
  // iOS 안내 모달 표시
  showIOSGuide: boolean
  setShowIOSGuide: (show: boolean) => void
}

const PWAInstallContext = createContext<PWAInstallContextType | null>(null)

export function PWAInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    // 이미 PWA로 실행 중인지 체크
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    // @ts-ignore - iOS Safari specific
    const isIOSStandalone = window.navigator?.standalone === true
    setIsInstalled(standalone || isIOSStandalone)

    // iOS 체크
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    // iOS는 수동 설치만 가능하지만, 버튼은 보여줌
    if (isIOSDevice && !standalone && !isIOSStandalone) {
      setCanInstall(true)
    }

    // Android/Chrome: beforeinstallprompt 이벤트 캐치
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
      console.log('✅ PWA 설치 가능!')
    }

    window.addEventListener('beforeinstallprompt', handler)

    // 설치 완료 감지
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
      console.log('🎉 PWA 설치 완료!')
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  // 설치 프롬프트 실행
  const triggerInstall = async (): Promise<boolean> => {
    // iOS: 안내 모달 표시
    if (isIOS) {
      setShowIOSGuide(true)
      return false
    }

    // Android/Chrome: 네이티브 설치 프롬프트
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        
        if (outcome === 'accepted') {
          console.log('✅ 사용자가 설치 수락')
          setCanInstall(false)
          setDeferredPrompt(null)
          return true
        } else {
          console.log('❌ 사용자가 설치 거절')
          return false
        }
      } catch (error) {
        console.error('설치 프롬프트 에러:', error)
        return false
      }
    }

    return false
  }

  return (
    <PWAInstallContext.Provider
      value={{
        canInstall,
        isIOS,
        isInstalled,
        triggerInstall,
        showIOSGuide,
        setShowIOSGuide,
      }}
    >
      {children}
    </PWAInstallContext.Provider>
  )
}

// Hook으로 쉽게 사용
export function usePWAInstall() {
  const context = useContext(PWAInstallContext)
  if (!context) {
    throw new Error('usePWAInstall must be used within PWAInstallProvider')
  }
  return context
}
