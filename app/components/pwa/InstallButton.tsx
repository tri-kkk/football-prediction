'use client'

import { usePWAInstall } from './PWAInstallContext'

interface InstallButtonProps {
  className?: string
  variant?: 'default' | 'compact' | 'banner'
}

// 메뉴나 헤더에 넣을 설치 버튼
export function InstallButton({ className = '', variant = 'default' }: InstallButtonProps) {
  const { canInstall, isInstalled, triggerInstall } = usePWAInstall()

  // 이미 설치됨 또는 설치 불가능 → 버튼 숨김
  if (isInstalled || !canInstall) return null

  const handleClick = async () => {
    await triggerInstall()
  }

  // 컴팩트 버전 (아이콘만)
  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className={`p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all ${className}`}
        title="앱 설치하기"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>
    )
  }

  // 배너 버전 (넓은 영역)
  if (variant === 'banner') {
    return (
      <button
        onClick={handleClick}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-500 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-green-400 active:scale-[0.98] transition-all shadow-lg ${className}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        앱으로 설치하기
      </button>
    )
  }

  // 기본 버전
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 py-2 px-4 bg-emerald-500/20 text-emerald-400 font-medium rounded-lg hover:bg-emerald-500/30 active:scale-[0.98] transition-all ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      앱 설치
    </button>
  )
}

// 메뉴 아이템 형태 (드롭다운 메뉴 등에서 사용)
export function InstallMenuItem({ className = '' }: { className?: string }) {
  const { canInstall, isInstalled, triggerInstall } = usePWAInstall()

  if (isInstalled || !canInstall) return null

  return (
    <button
      onClick={() => triggerInstall()}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left text-gray-200 hover:bg-white/5 transition-colors ${className}`}
    >
      <div className="p-2 bg-emerald-500/20 rounded-lg">
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </div>
      <div>
        <div className="font-medium">앱으로 설치</div>
        <div className="text-xs text-gray-400">홈 화면에 추가</div>
      </div>
      <div className="ml-auto">
        <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
          NEW
        </span>
      </div>
    </button>
  )
}
