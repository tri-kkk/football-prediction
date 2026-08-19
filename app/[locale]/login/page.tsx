'use client'

import { signIn, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../contexts/LanguageContext'
import { Link } from '@/i18n/navigation'
import { track } from '../../../lib/analytics'

export default function LoginPage() {
  const { language } = useLanguage()
  const isKo = language === 'ko'
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  // 🔗 레퍼럴 코드 (URL 또는 sessionStorage)
  const [refCode, setRefCode] = useState<string | null>(null)
  // 🚫 재가입 쿨다운
  const [cooldownDays, setCooldownDays] = useState<number | null>(null)
  // 📊 AI 적중률 (신뢰 요소) — best-effort
  const [accuracy, setAccuracy] = useState<number | null>(null)

  const NAVER_ENABLED = true

  useEffect(() => {
    if (typeof window === 'undefined') return

    const urlParams = new URLSearchParams(window.location.search)
    const urlRef = urlParams.get('ref')

    // 재가입 쿨다운 에러
    const errorType = urlParams.get('error')
    const days = urlParams.get('days')
    if (errorType === 'cooldown' && days) setCooldownDays(parseInt(days))

    if (urlRef) {
      const code = urlRef.toUpperCase()
      try {
        sessionStorage.setItem('referral_code', code)
      } catch {}
      setRefCode(code)
    } else {
      try {
        const storedRef = sessionStorage.getItem('referral_code')
        if (storedRef) setRefCode(storedRef)
      } catch {}
    }
  }, [])

  // 적중률 — 비차단 + 5초 타임아웃
  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const c = new AbortController()
        const id = setTimeout(() => c.abort(), 5000)
        const res = await fetch('/api/accuracy-stats', { signal: c.signal }).then((r) => r.json())
        clearTimeout(id)
        const acc =
          res?.accuracy ?? res?.overall?.accuracy ?? res?.pickAccuracy ?? res?.stats?.accuracy ?? null
        if (!cancel && typeof acc === 'number') setAccuracy(Math.round(acc))
      } catch {
        /* noop */
      }
    })()
    return () => {
      cancel = true
    }
  }, [])

  // TrendCoach: 로그인 후 돌아갈 주소(.trendsoccer.com 서브도메인만 허용)
  const safeReturnTo = (): string | null => {
    if (typeof window === 'undefined') return null
    const rt = new URLSearchParams(window.location.search).get('returnTo')
    return rt && /^https?:\/\/([a-z0-9-]+\.)*trendsoccer\.com/i.test(rt) ? rt : null
  }

  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const rt = safeReturnTo()
      if (!(session.user as any).termsAgreed) {
        router.push(rt ? `/auth/terms?returnTo=${encodeURIComponent(rt)}` : '/auth/terms')
      } else if (rt) {
        window.location.href = rt
      } else {
        router.push('/')
      }
    }
  }, [session, status, router])

  const handleSignIn = async (provider: string) => {
    setIsLoading(provider)
    track.signupStarted(provider)
    const rt = safeReturnTo()
    const cb = rt ? `/auth/terms?returnTo=${encodeURIComponent(rt)}` : '/auth/terms'
    try {
      await signIn(provider, { callbackUrl: cb })
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#08080a]">
        <span className="ts-spinner" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#08080a] flex items-start justify-center px-4 py-8 sm:py-12">
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

        {/* 헤드라인 (H1) */}
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold leading-tight md:text-[26px]">
            <span className="text-white">{isKo ? '다시 오신 걸 ' : 'Welcome '}</span>
            <span className="text-emerald-400">{isKo ? '환영해요' : 'back'}</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isKo ? '소셜 계정으로 3초 만에 로그인' : 'Sign in with your social account in seconds'}
          </p>
        </div>

        {/* 재가입 쿨다운 */}
        {cooldownDays !== null && (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/[0.08] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20">
                <span className="text-xl">⏳</span>
              </div>
              <div>
                <p className="text-sm font-bold text-red-400">
                  {isKo ? '재가입 대기 기간입니다' : 'Re-registration Cooldown'}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {isKo
                    ? `회원 탈퇴 후 ${cooldownDays}일 후에 재가입이 가능합니다.`
                    : `You can re-register in ${cooldownDays} day(s) after account deletion.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 레퍼럴 배너 (ref 코드가 있을 때만) */}
        {refCode && !cooldownDays && (
          <div className="mb-5 flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/[0.06] px-4 py-3">
            <span className="text-base">🎁</span>
            <p className="text-center text-[13px] font-medium text-cyan-300">
              {isKo ? (
                <>
                  친구 초대 혜택 · <b className="text-white">프리미엄 3일 무료</b>
                </>
              ) : (
                <>
                  Referral bonus · <b className="text-white">3 days free Premium</b>
                </>
              )}
            </p>
          </div>
        )}

        {/* 48시간 무료 체험 배너 (레퍼럴/쿨다운 없을 때) */}
        {!refCode && !cooldownDays && (
          <div className="relative overflow-hidden mb-5 flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3">
            <span className="ts-shine" style={{ background: 'linear-gradient(110deg, transparent, rgba(163,255,140,.22), transparent)' }} />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <p className="text-center text-[13px] font-medium text-emerald-300">
              {isKo ? (
                <>
                  신규라면 <b className="text-white">48시간 프리미엄 무료 체험</b>
                </>
              ) : (
                <>
                  New here? <b className="text-white">48h free Premium trial</b>
                </>
              )}
            </p>
          </div>
        )}

        {/* 인증 카드 */}
        <div className="relative rounded-3xl p-6 sm:p-7 overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(30,30,33,.98), rgba(18,18,20,.98))', border: '1px solid rgba(163,255,140,.16)', boxShadow: '0 28px 64px -16px rgba(0,0,0,.85), 0 10px 46px -10px rgba(120,240,150,.18), inset 0 1px 0 rgba(255,255,255,.06)' }}>
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(163,255,140,.6), transparent)' }} />
          <h2 className="text-center text-lg font-bold text-white">{isKo ? '로그인' : 'Sign In'}</h2>
          <p className="mb-6 mt-1 text-center text-sm text-gray-500">
            {isKo ? '가입했던 소셜 계정을 선택하세요' : 'Choose the account you signed up with'}
          </p>

          <div className="space-y-3">
            {/* Google */}
            <button
              onClick={() => handleSignIn('google')}
              disabled={isLoading !== null || cooldownDays !== null}
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
              {isKo ? 'Google로 계속하기' : 'Continue with Google'}
            </button>

            {/* Naver */}
            {NAVER_ENABLED && (
              <button
                onClick={() => handleSignIn('naver')}
                disabled={isLoading !== null || cooldownDays !== null}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#03C75A] px-6 py-4 font-semibold text-white shadow-lg shadow-green-500/20 transition-all duration-200 hover:bg-[#02b351] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading === 'naver' ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                  </svg>
                )}
                {isKo ? 'Naver로 계속하기' : 'Continue with Naver'}
              </button>
            )}
          </div>

          {/* 신뢰 요소 — 적중률 / 커버리지 / 광고제거 */}
          <div className="mt-5 border-t border-white/[0.08] pt-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2.5 text-center">
                <div className="text-[15px] font-black leading-none text-emerald-400">
                  {accuracy != null ? `${accuracy}%` : 'AI'}
                </div>
                <div className="mt-1 text-[9.5px] text-gray-500">
                  {accuracy != null ? (isKo ? '최근 적중률' : 'Hit rate') : isKo ? '예측 분석' : 'Analysis'}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2.5 text-center">
                <div className="text-[15px] font-black leading-none text-emerald-400">10</div>
                <div className="mt-1 text-[9.5px] text-gray-500">{isKo ? '리그 커버' : 'Leagues'}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2.5 text-center">
                <div className="text-[15px] font-black leading-none text-emerald-400">{isKo ? '광고X' : 'Ad-free'}</div>
                <div className="mt-1 text-[9.5px] text-gray-500">{isKo ? '프리미엄' : 'Premium'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 회원가입 안내 */}
        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500">{isKo ? '아직 회원이 아니신가요? ' : "Don't have an account? "}</span>
          <Link href="/signup" className="font-medium text-emerald-400 hover:text-emerald-300">
            {isKo ? '회원가입 →' : 'Sign Up →'}
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
