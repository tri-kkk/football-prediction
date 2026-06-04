'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { Link } from '@/i18n/navigation'
import { track } from '../../../lib/analytics'

export default function SignupPage() {
  const { language } = useLanguage()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  // 약관 동의는 OAuth 이후 /auth/terms 단계에서 한 번만 진행 (login과 동일)
  const handleSignIn = async (provider: string) => {
    setIsLoading(provider)
    // 📊 가입 시도 이벤트 (OAuth 리다이렉트 직전)
    track.signupStarted(provider)
    try {
      await signIn(provider, { callbackUrl: '/auth/terms' })
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
          <h2 className="text-xl font-bold text-white text-center mb-4">
            {language === 'ko' ? '회원가입' : 'Sign Up'}
          </h2>

          {/* 🎁 신규 가입 혜택 강조 배너 — 48시간 프리미엄 무료 체험 */}
          <div className="mb-5 rounded-xl overflow-hidden border border-yellow-500/40 bg-gradient-to-br from-yellow-500/15 via-amber-500/10 to-yellow-500/5 p-4 relative">
            {/* 글로우 효과 */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-3 relative">
              <div className="text-3xl shrink-0 leading-none mt-0.5">🎁</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-yellow-300 text-[14px] font-extrabold tracking-tight">
                    {language === 'ko'
                      ? '신규 가입 시 48시간 프리미엄 무료!'
                      : '48-Hour Free Premium Trial for New Users'}
                  </p>
                </div>
                <p className="text-yellow-100/85 text-[12px] leading-relaxed">
                  {language === 'ko'
                    ? '가입 즉시 모든 프리미엄 기능을 이틀간 자유롭게 사용하실 수 있습니다. 결제 정보 입력 불필요.'
                    : 'Unlock all premium features for 2 days right after signup. No credit card required.'}
                </p>
              </div>
            </div>
          </div>

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
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-yellow-400 text-sm font-bold">
                    {language === 'ko' ? '프리미엄' : 'Premium'}
                  </span>
                  <span className="text-[10px] text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded font-bold">
                    {language === 'ko' ? '추천' : 'Recommended'}
                  </span>
                  <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded font-bold border border-emerald-500/40">
                    {language === 'ko' ? '신규 가입 48h 무료' : 'Free 48h trial'}
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

          {/* 약관 안내 — 실제 동의는 다음 단계(/auth/terms)에서 진행 */}
          <p className="mt-4 text-center text-[11px] leading-relaxed text-gray-500">
            {language === 'ko' ? '계속 진행하면 다음 단계에서 ' : 'By continuing, you will review and agree to the '}
            <a href="/terms" className="underline hover:text-gray-300">
              {language === 'ko' ? '이용약관' : 'Terms'}
            </a>
            {language === 'ko' ? '과 ' : ' and '}
            <a href="/privacy" className="underline hover:text-gray-300">
              {language === 'ko' ? '개인정보처리방침' : 'Privacy Policy'}
            </a>
            {language === 'ko' ? '에 동의하게 됩니다.' : ' in the next step.'}
          </p>

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
