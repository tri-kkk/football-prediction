'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * 비회원 전용 가입 유도 배너
 * - 헤더(NavMenu) 바로 아래 노출
 * - 로그인 사용자에게는 표시 안 됨
 * - 닫기(X) 클릭 시 세션 동안 안 보임 (sessionStorage)
 * - 가입/로그인 페이지에서는 노출 안 됨 (중복 방지)
 */
const HIDDEN_PATHS = ['/signup', '/login']

export default function SignupIncentiveBanner() {
  const { status } = useSession()
  const { language } = useLanguage()
  const pathname = usePathname()
  const [isClosed, setIsClosed] = useState(true) // SSR 가드: 기본 닫힘
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const closed = sessionStorage.getItem('signup_banner_closed')
      setIsClosed(closed === 'true')
    } catch {}
  }, [])

  const handleClose = () => {
    setIsClosed(true)
    try {
      sessionStorage.setItem('signup_banner_closed', 'true')
    } catch {}
  }

  // 가입/로그인 페이지에서는 노출 안 함 (중복 방지)
  if (pathname && HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null
  // 로그인 사용자 또는 닫힌 상태면 렌더링 안 함
  if (!mounted || status !== 'unauthenticated' || isClosed) return null

  // 모바일/데스크톱 카피 분리 (모바일은 좁은 화면에서 truncate 방지)
  // 신규 가입 48시간 프리미엄 무료 체험을 메인 후크로 사용 (전환율 ↑)
  const messageMobile =
    language === 'ko'
      ? '🎁 가입하고 프리미엄 48시간 무료'
      : '🎁 Sign up, get 48h Premium free'
  const messageDesktop =
    language === 'ko'
      ? '🎁 무료 회원가입 시 프리미엄 기능 48시간 무료 체험'
      : '🎁 Sign up free — unlock Premium features for 48 hours, no credit card'
  const ctaMobile = language === 'ko' ? '무료 체험' : 'Try free'
  const ctaDesktop = language === 'ko' ? '48시간 무료 체험' : 'Start 48h free trial'

  return (
    <div
      className="hidden md:block relative overflow-hidden border-b border-green-500/20"
      style={{ background: 'linear-gradient(90deg, #0d1f15 0%, #11301f 50%, #0d1f15 100%)' }}
    >
      {/* 좌측 강조 라인 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] md:w-[3px]"
        style={{ background: 'linear-gradient(180deg, #6dff5c 0%, #36e07a 100%)' }}
      />
      <div className="max-w-7xl mx-auto pl-3 pr-2 md:px-6 py-2 md:py-3 flex items-center justify-between gap-1.5 md:gap-3">
        {/* 메시지 영역 */}
        <div className="flex items-center flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center md:gap-3 min-w-0">
            {/* 모바일 카피 (짧게) */}
            <span className="md:hidden text-[12px] font-semibold text-white truncate leading-tight">
              {messageMobile}
            </span>
            {/* 데스크톱 카피 (길게) */}
            <span className="hidden md:inline text-sm font-semibold text-white truncate">
              {messageDesktop}
            </span>
            {/* 데스크톱 전용 부가 설명 */}
            <span className="hidden md:inline text-xs text-green-300/80 whitespace-nowrap">
              {language === 'ko'
                ? '심층 리포트 · 광고 감소 · 30초 가입'
                : 'In-depth reports · fewer ads · 30s signup'}
            </span>
          </div>
        </div>

        {/* 가입 버튼 */}
        <Link
          href="/signup"
          className="flex-shrink-0 inline-flex items-center justify-center h-7 md:h-8 px-3.5 md:px-5 text-xs md:text-sm font-bold text-black rounded-md whitespace-nowrap transition-all active:scale-95 hover:brightness-110"
          style={{
            background: 'linear-gradient(90deg, #6dff5c 0%, #36e07a 100%)',
          }}
        >
          <span className="md:hidden">{ctaMobile}</span>
          <span className="hidden md:inline">{ctaDesktop}</span>
        </Link>

        {/* 닫기 버튼 (터치 영역 32x32 보장) */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-white w-8 h-8 -mr-1 md:mr-0 flex items-center justify-center rounded transition-colors"
          aria-label="Close banner"
        >
          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
