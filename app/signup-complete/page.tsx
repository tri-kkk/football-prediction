'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'
import Link from 'next/link'

export default function SignupCompletePage() {
  const { language } = useLanguage()
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [redirectCountdown, setRedirectCountdown] = useState(5)
  const [isPageReady, setIsPageReady] = useState(false)

  // ✅ 1단계: 인증 상태 확인 + 세션 폴링
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('🔐 로그인 필요')
      router.push('/login')
      return
    }


    if (status !== 'authenticated') return

    // ✅ 세션이 제대로 업데이트되었는지 확인
    const termsAgreed = (session?.user as any)?.termsAgreed
    console.log('🔍 세션 상태:', { email: session?.user?.email, termsAgreed })

    if (termsAgreed === true) {
      // ✅ 세션 업데이트 완료
      console.log('✅ 세션 업데이트 완료 - 가입 완료 페이지 표시')
      setIsPageReady(true)
    } else if (termsAgreed === false) {
      // ⏳ 아직 미업데이트 - 500ms 후 재확인
      console.log('⏳ 세션 미업데이트 - 500ms 후 재확인')
      const timer = setTimeout(() => {
        // 세션 재확인 (useEffect 재실행)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      // 불명확한 상태
      setIsPageReady(true)
    }
  }, [session?.user, status, router])

  // ✅ 2단계: 5초 카운트다운
  useEffect(() => {
    if (!isPageReady) return

    if (redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      console.log('🏠 홈으로 이동')
      router.push('/')
    }
  }, [redirectCountdown, isPageReady, router])

  // 로딩 중
  if (status === 'loading' || !isPageReady) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        <div className="ml-4 text-gray-400 text-sm">
          {language === 'ko' ? '가입을 완료하고 있습니다...' : 'Completing signup...'}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center px-4 py-10 overflow-auto">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full relative z-10" style={{ maxWidth: '500px' }}>
        <div className="text-center mb-12">
          <Link href="/" className="inline-block">
            <img 
              src="/logo.svg" 
              alt="트렌드사커" 
              className="h-10 w-auto mx-auto"
            />
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-6 animate-pulse">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-white mb-3">
            {language === 'ko' ? '가입 완료' : 'Welcome'}
          </h1>
          <p className="text-gray-400 text-base">
            {language === 'ko'
              ? 'TrendSoccer에 오신 것을 환영합니다'
              : 'Welcome to TrendSoccer'}
          </p>
        </div>

        <div className="bg-gradient-to-b from-[#1a1a1a] to-[#141414] rounded-2xl p-6 shadow-2xl border border-gray-800/50 mb-6">
          <p className="text-green-400 font-semibold text-sm mb-4">
            {language === 'ko' ? '무료회원 혜택' : 'Free Member Benefits'}
          </p>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-sm text-gray-300">
              <span className="text-green-500 text-lg">✓</span>
              <span>
                {language === 'ko'
                  ? '24시간 전 경기 예측 확인'
                  : 'View predictions 24 hours in advance'}
              </span>
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-300">
              <span className="text-green-500 text-lg">✓</span>
              <span>
                {language === 'ko'
                  ? '리그별 오즈 트렌드 분석'
                  : 'League odds trend analysis'}
              </span>
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-300">
              <span className="text-green-500 text-lg">✓</span>
              <span>
                {language === 'ko'
                  ? '24시간 배당률 변화 차트'
                  : '24-hour odds change charts'}
              </span>
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-300">
              <span className="text-green-500 text-lg">✓</span>
              <span>
                {language === 'ko'
                  ? '팀별 최근 폼 분석'
                  : 'Team form analysis'}
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-2xl p-6 mb-6">
          <p className="text-white font-semibold text-sm mb-4">
            {language === 'ko' ? '다음 단계' : 'Next Steps'}
          </p>
          <ol className="space-y-3 text-sm text-gray-300 mb-6">
            <li className="flex gap-3">
              <span className="text-green-400 font-bold flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-500/20 rounded-full text-xs">1</span>
              <span>
                {language === 'ko'
                  ? '경기 예측과 트렌드 분석 시작'
                  : 'Start exploring predictions'}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-400 font-bold flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-500/20 rounded-full text-xs">2</span>
              <span>
                {language === 'ko'
                  ? 'Premium으로 업그레이드'
                  : 'Upgrade to Premium'}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-400 font-bold flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-500/20 rounded-full text-xs">3</span>
              <span>
                {language === 'ko'
                  ? '친구 초대하고 보상 받기'
                  : 'Refer friends and earn rewards'}
              </span>
            </li>
          </ol>

          <Link
            href="/premium/pricing"
            className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 active:scale-[0.98] text-center block text-sm"
          >
            {language === 'ko' ? 'Premium으로 업그레이드' : 'Upgrade to Premium'}
          </Link>
        </div>

        <Link
          href="/"
          className="w-full py-3 px-4 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white font-semibold rounded-lg transition-all duration-200 text-center block text-sm"
        >
          {language === 'ko' ? '홈으로 돌아가기' : 'Go to Home'}
        </Link>

        <p className="text-center text-gray-600 text-xs mt-4">
          {language === 'ko'
            ? `${redirectCountdown}초 후 홈으로 이동됩니다`
            : `Redirecting in ${redirectCountdown}s`}
        </p>
      </div>
    </div>
  )
}