'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { Link } from '@/i18n/navigation'
import { track } from '../../../lib/analytics'

export default function SignupPage() {
  const { language } = useLanguage()
  const isKo = language === 'ko'
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
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#0a0b0d] flex items-start justify-center px-4 py-8 sm:py-12">
      {/* 브랜드 톤 그라디언트 글로우 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-emerald-500/[0.07] blur-3xl" />
      </div>

      <div className="relative z-10 w-full" style={{ maxWidth: '420px' }}>
        {/* 로고 */}
        <div className="mb-5 text-center">
          <Link href="/" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="트렌드사커" className="mx-auto h-9 w-auto" />
          </Link>
        </div>

        {/* 가치 제안 헤드라인 (H1 — SEO) */}
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold leading-tight md:text-[26px]">
            <span className="text-white">{isKo ? 'AI로 이기는 ' : 'Win with '}</span>
            <span className="text-emerald-400">{isKo ? '축구 · 야구 분석' : 'AI Football · Baseball'}</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isKo ? '6대 리그 + KBO · MLB · NPB · 30초 소셜 가입' : '6 Major Leagues + KBO · MLB · NPB · 30s signup'}
          </p>
        </div>

        {/* 48시간 무료 체험 배너 — 브랜드 에메랄드 톤 */}
        <div className="mb-5 flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <p className="text-center text-[13px] font-medium text-emerald-300">
            {isKo ? (
              <>
                신규 가입 시 <b className="text-white">48시간 프리미엄 무료</b> · 결제정보 불필요
              </>
            ) : (
              <>
                <b className="text-white">48h free Premium</b> for new users · no card
              </>
            )}
          </p>
        </div>

        {/* 인증 카드 */}
        <div className="rounded-3xl border border-gray-800 bg-[#15181a] p-6 shadow-2xl sm:p-7">
          <h2 className="text-center text-lg font-bold text-white">{isKo ? '회원가입' : 'Sign Up'}</h2>
          <p className="mb-6 mt-1 text-center text-sm text-gray-500">
            {isKo ? '소셜 계정으로 간편하게 시작하세요' : 'Get started with your social account'}
          </p>

          <div className="space-y-3">
            {/* Google */}
            <button
              onClick={() => handleSignIn('google')}
              disabled={isLoading !== null}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 font-semibold text-gray-800 shadow-lg shadow-white/10 transition-all duration-200 hover:bg-gray-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading === 'google' ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {isKo ? 'Google로 시작하기' : 'Continue with Google'}
            </button>

            {/* Naver */}
            <button
              onClick={() => handleSignIn('naver')}
              disabled={isLoading !== null}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#03C75A] px-6 py-4 font-semibold text-white shadow-lg shadow-green-500/20 transition-all duration-200 hover:bg-[#02b351] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading === 'naver' ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                </svg>
              )}
              {isKo ? 'Naver로 시작하기' : 'Continue with Naver'}
            </button>
          </div>

          {/* 등급별 혜택 — 무료 / 프리미엄 2칸 카드 (브랜드 톤) */}
          <div className="mt-5 border-t border-gray-800 pt-5">
            <div className="grid grid-cols-2 gap-2.5">
              {/* 무료 */}
              <div className="rounded-2xl border border-gray-800 bg-[#101315] p-3.5">
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="text-[13px] font-extrabold text-emerald-400">{isKo ? '무료' : 'Free'}</span>
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                    {isKo ? '가입 즉시' : 'Instant'}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  <li className="flex gap-1.5 text-[11.5px] text-gray-300">
                    <span className="text-emerald-400">·</span>
                    {isKo ? '경기 데이터·통계 분석' : 'Match data & stats'}
                  </li>
                  <li className="flex gap-1.5 text-[11.5px] text-gray-300">
                    <span className="text-emerald-400">·</span>
                    {isKo ? '기본 분석 리포트' : 'Basic reports'}
                  </li>
                  <li className="flex gap-1.5 text-[11.5px] text-gray-300">
                    <span className="text-emerald-400">·</span>
                    {isKo ? '광고 시청 시 조합 분석' : 'Combos via ad view'}
                  </li>
                </ul>
              </div>
              {/* 프리미엄 */}
              <div className="rounded-2xl border border-[#A3FF4C]/35 bg-gradient-to-b from-[#A3FF4C]/[0.06] to-transparent p-3.5">
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="text-[13px] font-extrabold text-[#A3FF4C]">{isKo ? '프리미엄' : 'Premium'}</span>
                  <span className="rounded bg-[#A3FF4C] px-1.5 py-0.5 text-[9px] font-bold text-black">
                    {isKo ? '48h 무료' : '48h free'}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  <li className="flex gap-1.5 text-[11.5px] font-medium text-gray-200">
                    <span className="text-[#A3FF4C]">★</span>
                    {isKo ? '축구 AI 픽 (전 리그)' : 'Football AI picks'}
                  </li>
                  <li className="flex gap-1.5 text-[11.5px] font-medium text-gray-200">
                    <span className="text-[#A3FF4C]">★</span>
                    {isKo ? '야구 조합 분석 무제한' : 'Unlimited baseball combos'}
                  </li>
                  <li className="flex gap-1.5 text-[11.5px] text-gray-300">
                    <span className="text-[#A3FF4C]">·</span>
                    {isKo ? 'AI 심층 팀 분석' : 'In-depth AI analysis'}
                  </li>
                  <li className="flex gap-1.5 text-[11.5px] text-gray-300">
                    <span className="text-[#A3FF4C]">·</span>
                    {isKo ? '광고 완전 제거' : 'Ad-free'}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 약관 안내 */}
          <p className="mt-4 text-center text-[11px] leading-relaxed text-gray-500">
            {isKo ? '계속 진행하면 다음 단계에서 ' : 'By continuing, you will review and agree to the '}
            <a href="/terms" className="underline hover:text-gray-300">
              {isKo ? '이용약관' : 'Terms'}
            </a>
            {isKo ? '과 ' : ' and '}
            <a href="/privacy" className="underline hover:text-gray-300">
              {isKo ? '개인정보처리방침' : 'Privacy Policy'}
            </a>
            {isKo ? '에 동의하게 됩니다.' : ' in the next step.'}
          </p>
        </div>

        {/* 로그인 링크 */}
        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500">{isKo ? '이미 회원이신가요? ' : 'Already have an account? '}</span>
          <Link href="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
            {isKo ? '로그인' : 'Sign In'}
          </Link>
        </div>

        {/* 홈으로 */}
        <div className="mt-3 text-center">
          <Link href="/" className="text-xs text-gray-600 transition-colors hover:text-gray-400">
            ← {isKo ? '홈으로' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  )
}
