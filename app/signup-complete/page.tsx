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
  
  const [redirectCountdown, setRedirectCountdown] = useState(8)
  const [isPageReady, setIsPageReady] = useState(false)
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState({ hours: 47, minutes: 59, seconds: 59 })
  const [isTrial, setIsTrial] = useState(false)

  // ✅ 1단계: 인증 상태 확인
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    const termsAgreed = (session?.user as any)?.termsAgreed
    const premiumExpiresAt = (session?.user as any)?.premiumExpiresAt
    const trialUsed = (session?.user as any)?.trialUsed

    if (termsAgreed === true) {
      // 체험판 여부 판단: premium_expires_at이 있고 48시간 이내면 trial
      if (premiumExpiresAt) {
        const expiresDate = new Date(premiumExpiresAt)
        const now = new Date()
        const diffHours = (expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60)
        if (trialUsed && diffHours > 0 && diffHours <= 48) {
          setIsTrial(true)
          setTrialEndsAt(expiresDate)
        }
      }
      setIsPageReady(true)
    } else if (termsAgreed === false) {
      const timer = setTimeout(() => {}, 500)
      return () => clearTimeout(timer)
    } else {
      setIsPageReady(true)
    }
  }, [session?.user, status, router])

  // ✅ 체험판 남은 시간 카운트다운
  useEffect(() => {
    if (!trialEndsAt) return

    const tick = () => {
      const now = new Date()
      const diff = trialEndsAt.getTime() - now.getTime()
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        return
      }
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft({ hours, minutes, seconds })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [trialEndsAt])

  // ✅ 2단계: 카운트다운 후 홈 이동
  useEffect(() => {
    if (!isPageReady) return
    if (redirectCountdown > 0) {
      const timer = setTimeout(() => setRedirectCountdown(redirectCountdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      router.push('/')
    }
  }, [redirectCountdown, isPageReady, router])

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

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center px-4 py-10 overflow-auto">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full relative z-10" style={{ maxWidth: '500px' }}>
        {/* 로고 */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <img src="/logo.svg" alt="트렌드사커" className="h-10 w-auto mx-auto" />
          </Link>
        </div>

        {/* 완료 아이콘 + 타이틀 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-6 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            {language === 'ko' ? '가입 완료!' : 'Welcome!'}
          </h1>
          <p className="text-gray-400 text-base">
            {language === 'ko' ? 'TrendSoccer에 오신 것을 환영합니다' : 'Welcome to TrendSoccer'}
          </p>
        </div>

        {/* ✅ 체험판 카드 */}
        {isTrial ? (
          <div className="rounded-2xl p-6 mb-6 border border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-amber-500/10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎁</span>
              <p className="text-yellow-400 font-bold text-base">
                {language === 'ko' ? '48시간 프리미엄 체험 시작!' : '48-Hour Premium Trial Started!'}
              </p>
            </div>

            {/* 타이머 */}
            <div className="flex justify-center gap-3 mb-4">
              {[
                { label: language === 'ko' ? '시간' : 'HRS', value: pad(timeLeft.hours) },
                { label: language === 'ko' ? '분' : 'MIN', value: pad(timeLeft.minutes) },
                { label: language === 'ko' ? '초' : 'SEC', value: pad(timeLeft.seconds) },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 bg-black/40 border border-yellow-500/30 rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-black text-yellow-400 font-mono">{item.value}</span>
                  </div>
                  <p className="text-yellow-600 text-xs mt-1 tracking-wider">{item.label}</p>
                </div>
              ))}
            </div>

            <p className="text-gray-400 text-xs text-center mb-4">
              {language === 'ko'
                ? `체험 종료 후 구독하지 않으면 무료 플랜으로 전환됩니다`
                : `After trial ends, you'll be moved to the free plan`}
            </p>

            {/* 프리미엄 혜택 */}
            <ul className="space-y-2 mb-5">
              {[
                { ko: '✓ PICK 예측 상세 분석 열람', en: '✓ Full PICK analysis access' },
                { ko: '✓ 트렌드 차트 전체 기간 조회', en: '✓ Full trend chart history' },
                { ko: '✓ 광고 없이 쾌적한 이용', en: '✓ Ad-free experience' },
                { ko: '✓ 24시간 전 경기 예측 선공개', en: '✓ 24h early predictions' },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-yellow-400">{language === 'ko' ? item.ko.split(' ')[0] : item.en.split(' ')[0]}</span>
                  <span>{language === 'ko' ? item.ko.slice(2) : item.en.slice(2)}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/premium/pricing"
              className="w-full py-3 px-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold rounded-lg transition-all duration-200 active:scale-[0.98] text-center block text-sm"
            >
              {language === 'ko' ? '체험 후 바로 구독하기 →' : 'Subscribe Now →'}
            </Link>
          </div>
        ) : (
          /* ✅ 일반 무료회원 카드 (프로모션 유저 등) */
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#141414] rounded-2xl p-6 shadow-2xl border border-gray-800/50 mb-6">
            <p className="text-green-400 font-semibold text-sm mb-4">
              {language === 'ko' ? '무료회원 혜택' : 'Free Member Benefits'}
            </p>
            <ul className="space-y-3">
              {[
                { ko: '리그별 오즈 트렌드 분석', en: 'League odds trend analysis' },
                { ko: '24시간 배당률 변화 차트', en: '24-hour odds change charts' },
                { ko: '팀별 최근 폼 분석', en: 'Team form analysis' },
                { ko: '경기 예측 기본 데이터', en: 'Basic prediction data' },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="text-green-500 text-lg">✓</span>
                  <span>{language === 'ko' ? item.ko : item.en}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 다음 단계 */}
        {!isTrial && (
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-2xl p-6 mb-6">
            <p className="text-white font-semibold text-sm mb-4">
              {language === 'ko' ? '다음 단계' : 'Next Steps'}
            </p>
            <ol className="space-y-3 text-sm text-gray-300 mb-6">
              {[
                { ko: '경기 예측과 트렌드 분석 시작', en: 'Start exploring predictions' },
                { ko: 'Premium으로 업그레이드', en: 'Upgrade to Premium' },
                { ko: '친구 초대하고 보상 받기', en: 'Refer friends and earn rewards' },
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-green-400 font-bold flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-500/20 rounded-full text-xs">{i + 1}</span>
                  <span>{language === 'ko' ? item.ko : item.en}</span>
                </li>
              ))}
            </ol>
            <Link
              href="/premium/pricing"
              className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 active:scale-[0.98] text-center block text-sm"
            >
              {language === 'ko' ? 'Premium으로 업그레이드' : 'Upgrade to Premium'}
            </Link>
          </div>
        )}

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