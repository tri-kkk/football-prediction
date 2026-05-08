'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import Link from 'next/link'
import { track } from '../../lib/analytics'

export default function SignupPage() {
  const { language } = useLanguage()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [agreedPrivacy, setAgreedPrivacy] = useState(false)
  const [showError, setShowError] = useState(false)

  const handleSignIn = async (provider: string) => {
    if (!agreedTerms || !agreedPrivacy) {
      setShowError(true)
      return
    }

    setIsLoading(provider)
    // 📊 가입 시도 이벤트 (OAuth 리다이렉트 직전)
    track.signupStarted(provider)
    try {
      await signIn(provider, { callbackUrl: '/' })
    } catch (error) {
      console.error('Signup error:', error)
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* 그라데이션 배경 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full relative z-10" style={{ maxWidth: '420px' }}>
        {/* 회원가입 카드 */}
        <div className="bg-gradient-to-b from-[#1a1a1a] to-[#141414] rounded-3xl p-8 shadow-2xl border border-gray-800/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white text-center mb-6">
            {language === 'ko' ? '회원가입' : 'Sign Up'}
          </h2>

          {/* 가입 혜택 - 무료 vs 프리미엄 2단 비교 (실제 구현 기준) */}
          <div className="mb-6 bg-[#0f0f0f] rounded-xl overflow-hidden border border-gray-800">
            <div className="bg-green-500/10 px-4 py-2 border-b border-gray-800">
              <p className="text-center text-green-400 text-sm font-medium">
                {language === 'ko' ? '회원 등급별 혜택' : 'Membership Benefits'}
              </p>
            </div>
            <div className="p-4 space-y-3">
              {/* 무료 회원 */}
              <div className="py-2 border-b border-gray-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-400 text-sm font-bold">
                    {language === 'ko' ? '무료 회원' : 'Free'}
                  </span>
                  <span className="text-[10px] text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded">
                    {language === 'ko' ? '가입 시' : 'Sign Up'}
                  </span>
                </div>
                <ul className="space-y-1">
                  <li className="text-gray-300 text-[12px] flex items-start gap-1.5">
                    <span className="text-green-400 mt-0.5">·</span>
                    <span>{language === 'ko' ? '경기 데이터 & 통계 분석' : 'Match data & statistical analysis'}</span>
                  </li>
                  <li className="text-gray-300 text-[12px] flex items-start gap-1.5">
                    <span className="text-green-400 mt-0.5">·</span>
                    <span>{language === 'ko' ? '광고 시청 시 야구 다경기 분석 열람' : 'Baseball multi-match analysis via ad view'}</span>
                  </li>
                  <li className="text-gray-300 text-[12px] flex items-start gap-1.5">
                    <span className="text-green-400 mt-0.5">·</span>
                    <span>{language === 'ko' ? '기본 경기 분석 리포트' : 'Basic match analysis reports'}</span>
                  </li>
                </ul>
              </div>
              {/* 프리미엄 */}
              <div className="py-2 bg-yellow-500/[0.03] -mx-4 px-4 rounded relative">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-400 text-sm font-bold">
                    {language === 'ko' ? '프리미엄' : 'Premium'}
                  </span>
                  <span className="text-[10px] text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded font-bold">
                    {language === 'ko' ? '추천' : 'Recommended'}
                  </span>
                </div>
                <ul className="space-y-1">
                  <li className="text-yellow-100 text-[12px] flex items-start gap-1.5 font-medium">
                    <span className="text-yellow-400 mt-0.5">★</span>
                    <span>{language === 'ko' ? '축구 경기 AI 리포트 (전 리그)' : 'Football AI picks (all leagues)'}</span>
                  </li>
                  <li className="text-yellow-100 text-[12px] flex items-start gap-1.5 font-medium">
                    <span className="text-yellow-400 mt-0.5">★</span>
                    <span>{language === 'ko' ? '야구 다경기 분석 무제한 (KBO·MLB·NPB)' : 'Baseball multi-match analysis unlimited (KBO·MLB·NPB)'}</span>
                  </li>
                  <li className="text-yellow-100/90 text-[12px] flex items-start gap-1.5">
                    <span className="text-yellow-400 mt-0.5">·</span>
                    <span>{language === 'ko' ? 'AI 심층 팀 분석 (시간대별/상황별)' : 'In-depth AI team analysis'}</span>
                  </li>
                  <li className="text-yellow-100/90 text-[12px] flex items-start gap-1.5">
                    <span className="text-yellow-400 mt-0.5">·</span>
                    <span>{language === 'ko' ? '광고 완전 제거' : 'Ad-free experience'}</span>
                  </li>
                  <li className="text-yellow-100/90 text-[12px] flex items-start gap-1.5">
                    <span className="text-yellow-400 mt-0.5">·</span>
                    <span>{language === 'ko' ? '우선 콘텐츠 업데이트' : 'Priority content updates'}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Google 가입 */}
            <button
              onClick={() => handleSignIn('google')}
              disabled={isLoading !== null}
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
              {language === 'ko' ? 'Google로 시작하기' : 'Continue with Google'}
            </button>

            {/* Naver 가입 - 검수 통과 활성화됨 */}
            <button
              onClick={() => handleSignIn('naver')}
              disabled={isLoading !== null}
              className="w-full flex items-center justify-center gap-3 bg-[#03C75A] hover:bg-[#02b351] active:scale-[0.98] text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
            >
              {isLoading === 'naver' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                </svg>
              )}
              {language === 'ko' ? 'Naver로 시작하기' : 'Continue with Naver'}
            </button>
          </div>

          {/* 약관 동의 */}
          <div className="mt-6 space-y-3">
            {/* 이용약관 */}
            <div 
              onClick={() => {
                setAgreedTerms(!agreedTerms)
                if (!agreedTerms) setShowError(false)
              }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                agreedTerms 
                  ? 'bg-green-500 border-green-500' 
                  : showError && !agreedTerms 
                  ? 'border-red-500'
                  : 'border-gray-500 group-hover:border-gray-400'
              }`}>
                {agreedTerms && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-gray-300 text-sm">
                <a href="/terms" onClick={e => e.stopPropagation()} className="underline hover:text-white">
                  {language === 'ko' ? '이용약관' : 'Terms of Service'}
                </a>
                {language === 'ko' ? ' 동의 (필수)' : ' (Required)'}
              </span>
            </div>

            {/* 개인정보처리방침 */}
            <div 
              onClick={() => {
                setAgreedPrivacy(!agreedPrivacy)
                if (!agreedPrivacy) setShowError(false)
              }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                agreedPrivacy 
                  ? 'bg-green-500 border-green-500' 
                  : showError && !agreedPrivacy 
                  ? 'border-red-500'
                  : 'border-gray-500 group-hover:border-gray-400'
              }`}>
                {agreedPrivacy && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-gray-300 text-sm">
                <a href="/privacy" onClick={e => e.stopPropagation()} className="underline hover:text-white">
                  {language === 'ko' ? '개인정보처리방침' : 'Privacy Policy'}
                </a>
                {language === 'ko' ? ' 동의 (필수)' : ' (Required)'}
              </span>
            </div>

            {/* 에러 메시지 */}
            {showError && (
              <p className="text-red-400 text-sm">
                {language === 'ko' 
                  ? '※ 필수 약관에 동의해주세요' 
                  : '※ Please agree to required terms'}
              </p>
            )}
          </div>

          {/* 로그인 링크 */}
          <div className="mt-6 text-center">
            <span className="text-gray-500 text-sm">
              {language === 'ko' ? '이미 회원이신가요? ' : 'Already have an account? '}
            </span>
            <Link href="/login" className="text-green-400 hover:text-green-300 text-sm font-medium">
              {language === 'ko' ? '로그인' : 'Sign In'}
            </Link>
          </div>
        </div>

        {/* 홈으로 */}
        <div className="text-center mt-6">
          <a href="/" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
            ← {language === 'ko' ? '홈으로' : 'Home'}
          </a>
        </div>
      </div>
    </div>
  )
}
