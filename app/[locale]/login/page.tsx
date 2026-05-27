'use client'

import { signIn, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../contexts/LanguageContext'
import { Link } from '@/i18n/navigation'
import { track } from '../../../lib/analytics'

export default function LoginPage() {
  const { language } = useLanguage()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  // 🔗 레퍼럴 코드 파라미터 처리 (URL 또는 sessionStorage)
  const [refCode, setRefCode] = useState<string | null>(null)

  // 🚫 재가입 쿨다운 에러 처리
  const [cooldownDays, setCooldownDays] = useState<number | null>(null)

  useEffect(() => {
    console.log('🔍 레퍼럴 체크 시작')

    if (typeof window === 'undefined') return

    // 1. URL 파라미터 우선
    const urlParams = new URLSearchParams(window.location.search)
    const urlRef = urlParams.get('ref')
    console.log('🔍 URL ref:', urlRef)

    // 🚫 쿨다운 에러 체크
    const errorType = urlParams.get('error')
    const days = urlParams.get('days')
    if (errorType === 'cooldown' && days) {
      setCooldownDays(parseInt(days))
      console.log('🚫 재가입 쿨다운:', days, '일 남음')
    }

    if (urlRef) {
      const code = urlRef.toUpperCase()
      sessionStorage.setItem('referral_code', code)
      setRefCode(code)
      console.log('📌 레퍼럴 코드 저장 (URL):', code)
      return
    }

    // 2. sessionStorage에서 가져오기
    const storedRef = sessionStorage.getItem('referral_code')
    console.log('🔍 Storage ref:', storedRef)
    if (storedRef) {
      setRefCode(storedRef)
      console.log('📌 레퍼럴 코드 로드 (Storage):', storedRef)
    }
  }, [])

  // 네이버 로그인 활성화 여부 (검수 통과 후 true로 변경)
  const NAVER_ENABLED = true

  // 🎉 프로모션 기간 체크 (현재 만료됨)
  const isPromoPeriod = false

  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      if (!session.user.termsAgreed) {
        router.push('/auth/terms')
      } else {
        router.push('/')
      }
    }
  }, [session, status, router])

  const handleSignIn = async (provider: string) => {
    setIsLoading(provider)
    // 📊 로그인 시도 이벤트 (OAuth 리다이렉트 직전)
    track.signupStarted(provider)
    try {
      await signIn(provider, { callbackUrl: '/auth/terms' })
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(null)
    }
  }

  // 로딩 중
  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-start justify-center px-4 py-8 sm:py-12 overflow-y-auto">
      {/* 미묘한 그라디언트 글로우 — 메인 톤 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/6 rounded-full blur-3xl" />
      </div>

      <div className="w-full relative z-10" style={{ maxWidth: '420px' }}>
        {/* 로고 */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <img
              src="/logo.svg"
              alt="트렌드사커"
              className="h-10 w-auto mx-auto"
            />
          </Link>
        </div>

        {/* 타이틀 — 깔끔하게 */}
        <div className="text-center mb-7">
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">
            <span className="text-white">{language === 'ko' ? 'AI가 분석하는' : 'AI-Powered'}</span>
            <br />
            <span className="text-emerald-400">
              {language === 'ko' ? '축구 · 야구 분석' : 'Football · Baseball Analysis'}
            </span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {language === 'ko' ? '6대 리그 + KBO · MLB · NPB 데이터 기반' : '6 Major Leagues + KBO · MLB · NPB Data-Driven'}
          </p>
        </div>

        {/* 🚫 재가입 쿨다운 안내 */}
        {cooldownDays !== null && (
          <div className="border border-red-500/30 rounded-2xl p-4 mb-4" style={{ background: 'rgba(239,68,68,0.08)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl">⏳</span>
              </div>
              <div>
                <p className="text-red-400 text-sm font-bold">
                  {language === 'ko' ? '재가입 대기 기간입니다' : 'Re-registration Cooldown'}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {language === 'ko'
                    ? `회원 탈퇴 후 ${cooldownDays}일 후에 재가입이 가능합니다.`
                    : `You can re-register in ${cooldownDays} day(s) after account deletion.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🔗 레퍼럴 배너 (ref 코드가 있을 때만) */}
        {refCode && (
          <div className="bg-gradient-to-r from-[#1a2a2a] to-[#1a1a2a] border border-cyan-500/30 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
                <span className="text-xl">🎁</span>
              </div>
              <div>
                <p className="text-cyan-400 text-sm font-bold">
                  {language === 'ko' ? '친구 초대 혜택!' : 'Referral Bonus!'}
                </p>
                <p className="text-gray-400 text-xs">
                  {language === 'ko' 
                    ? '가입하면 프리미엄 3일 무료 체험' 
                    : 'Sign up for 3 days free Premium'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 48시간 무료 체험 배너 — 에메랄드 톤 */}
        {!refCode && (
          <div className="border border-emerald-500/30 rounded-2xl px-4 py-3 mb-5 flex items-center justify-center gap-2 bg-emerald-500/5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <p className="text-emerald-300 font-medium text-sm text-center">
              {language === 'ko' ? '신규 가입 시 48시간 프리미엄 무료 체험' : '48-Hour Free Premium Trial for New Users'}
            </p>
          </div>
        )}

        {/* 로그인 카드 — 메인 톤 #252829 */}
        <div className="rounded-3xl p-7 sm:p-8 shadow-2xl border border-gray-800" style={{ backgroundColor: '#252829' }}>
          <h2 className="text-xl font-bold text-white text-center mb-2">
            {language === 'ko' ? '로그인' : 'Sign In'}
          </h2>
          <p className="text-gray-500 text-sm text-center mb-8">
            {language === 'ko' ? '소셜 계정으로 간편하게 로그인하세요' : 'Sign in with your social account'}
          </p>

          <div className="space-y-3">
            {/* Google 로그인 */}
            <button
              onClick={() => handleSignIn('google')}
              disabled={isLoading !== null || cooldownDays !== null}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-800 font-semibold py-4 px-6 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/10"
            >
              {isLoading === 'google' ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {language === 'ko' ? 'Google로 계속하기' : 'Continue with Google'}
            </button>

            {/* Naver 로그인 - 검수 통과 후 활성화 */}
            {NAVER_ENABLED && (
              <button
                onClick={() => handleSignIn('naver')}
                disabled={isLoading !== null || cooldownDays !== null}
                className="w-full flex items-center justify-center gap-3 bg-[#03C75A] hover:bg-[#02b351] active:scale-[0.98] text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
              >
                {isLoading === 'naver' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                  </svg>
                )}
                {language === 'ko' ? 'Naver로 계속하기' : 'Continue with Naver'}
              </button>
            )}
          </div>

          {/* 프리미엄 혜택 안내 — 한 줄로 압축 */}
          <div className="mt-5 pt-5 border-t border-gray-800">
            <div className="text-gray-500 text-[11px] mb-3 text-center tracking-wider uppercase">
              {language === 'ko' ? '프리미엄 혜택' : 'Premium Benefits'}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex flex-col items-center gap-1 text-gray-300 rounded-lg px-2 py-2.5 border border-gray-800" style={{ backgroundColor: '#1a1c1d' }}>
                <span className="text-emerald-400 text-base font-bold">AI</span>
                <span className="text-[10px] text-center text-gray-400">{language === 'ko' ? '축구·야구' : 'Football·Baseball'}</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-gray-300 rounded-lg px-2 py-2.5 border border-gray-800" style={{ backgroundColor: '#1a1c1d' }}>
                <span className="text-emerald-400 text-base font-bold">24h</span>
                <span className="text-[10px] text-center text-gray-400">{language === 'ko' ? '선공개' : 'Early'}</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-gray-300 rounded-lg px-2 py-2.5 border border-gray-800" style={{ backgroundColor: '#1a1c1d' }}>
                <span className="text-emerald-400 text-base font-bold">광고 X</span>
                <span className="text-[10px] text-center text-gray-400">{language === 'ko' ? '쾌적' : 'No Ads'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* 회원가입 안내 */}
        <div className="text-center mt-6">
          <span className="text-gray-500 text-sm">
            {language === 'ko' ? '아직 회원이 아니신가요? ' : "Don't have an account? "}
          </span>
          <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
            {language === 'ko' ? '회원가입 →' : 'Sign Up →'}
          </Link>
        </div>

        {/* 홈으로 */}
        <div className="text-center mt-4">
          <Link href="/" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
            ← {language === 'ko' ? '홈으로' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  )
}
