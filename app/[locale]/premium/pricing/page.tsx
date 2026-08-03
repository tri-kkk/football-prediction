'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Link } from '@/i18n/navigation'
import { useLanguage } from '../../../contexts/LanguageContext'
import { track } from '../../../../lib/analytics'

declare global {
  interface Window {
    SendPay?: (form: HTMLFormElement, mode?: string) => void
  }
}

export default function PricingPage() {
  const { language } = useLanguage()
  const isKo = language === 'ko'
  const { data: session } = useSession()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'quarterly'>('quarterly')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  // 📊 AI 적중률 (신뢰 요소) — best-effort
  const [accuracy, setAccuracy] = useState<number | null>(null)

  // ✅ pgAsistant.js 로드
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://pay.seedpayments.co.kr/js/pgAsistant.js'
    script.async = true
    document.head.appendChild(script)
    setMounted(true)
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

  // ✅ SeedPay postMessage 수신
  useEffect(() => {
    const handleSeedPayMessage = (event: MessageEvent) => {
      if (Array.isArray(event.data) && event.data[0] === 'SUCCESS') {
        const paymentData = event.data[1]

        if (paymentData.resultCd === '0000') {
          const form = document.createElement('form')
          form.method = 'POST'
          form.action = '/api/payment/seedpay/callback'
          form.style.display = 'none'

          Object.entries(paymentData).forEach(([key, value]) => {
            const input = document.createElement('input')
            input.type = 'hidden'
            input.name = key
            input.value = String(value)
            form.appendChild(input)
          })

          document.body.appendChild(form)
          form.submit()
        } else {
          window.location.href = `/premium/pricing/result?status=failed&message=${encodeURIComponent(paymentData.resultMsg || '결제 실패')}`
        }
      }
    }

    window.addEventListener('message', handleSeedPayMessage)
    return () => window.removeEventListener('message', handleSeedPayMessage)
  }, [])

  // ✅ SeedPay 콜백 함수들
  useEffect(() => {
    (window as any).pay_result_submit = () => {
      // SeedPay 콜백
    }

    (window as any).pay_result_close = () => {
      alert(language === 'ko' ? '결제를 취소하였습니다.' : 'Payment cancelled.')
    }
  }, [language])

  const isPremium = (session?.user as any)?.tier === 'premium'

  const plans = {
    monthly: {
      price: language === 'ko' ? 4900 : 3.99,
      priceDisplay: language === 'ko' ? '₩4,900' : '$3.99',
      period: language === 'ko' ? '/월' : '/mo',
    },
    quarterly: {
      price: language === 'ko' ? 9900 : 7.99,
      priceDisplay: language === 'ko' ? '₩9,900' : '$7.99',
      period: language === 'ko' ? '/3개월' : '/3mo',
      monthlyEquivalent: language === 'ko' ? '₩3,300' : '$2.66',
    },
  }

  // ✅ 실제 결제 함수
  const handlePayment = async () => {
    if (!session?.user?.email) {
      // 📊 비로그인 상태에서 결제 시도 → 가입 유도 흐름
      track.premiumCtaClicked('pricing_page_no_session')
      window.location.href = '/login'
      return
    }

    setLoading(true)

    // 📊 결제 시작 이벤트 (퍼널 핵심 지표)
    const planAmount = (plans as any)[selectedPlan]?.price ?? 0
    track.checkoutStarted({
      plan: selectedPlan === 'monthly' ? 'monthly' : 'yearly',
      amount: planAmount,
    })

    try {
      // 1️⃣ Init API 호출
      const response = await fetch('/api/payment/seedpay/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '결제 초기화 실패')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '결제 초기화 실패')
      }

      sessionStorage.setItem('initEdiDate', data.formData.ediDate)

      // 2️⃣ Form 생성
      const form = document.createElement('form')
      form.name = 'payInit'
      form.method = 'POST'
      form.action = ''

      // 3️⃣ formData의 모든 필드를 form에 추가
      const formData = data.formData
      Object.entries(formData).forEach(([key, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = String(value)
        form.appendChild(input)
      })

      document.body.appendChild(form)

      // 4️⃣ SendPay() 호출
      if (typeof window.SendPay === 'undefined') {
        throw new Error('SendPay 함수를 찾을 수 없습니다.')
      }

      window.SendPay(form)

    } catch (error) {
      alert(
        language === 'ko'
          ? `결제 처리 중 오류: ${error instanceof Error ? error.message : '알 수 없음'}`
          : `Error: ${error instanceof Error ? error.message : 'Unknown'}`
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <main className="mx-auto max-w-4xl px-4 py-8 md:py-12">
        {/* 이미 프리미엄인 경우 */}
        {isPremium ? (
          <div className="py-20 text-center">
            <div className="mb-4 text-5xl">✅</div>
            <h1 className="mb-4 text-2xl font-bold text-emerald-400">
              {isKo ? '이미 프리미엄 회원입니다!' : 'You are already Premium!'}
            </h1>
            <Link
              href="/premium"
              className="inline-block rounded-lg bg-emerald-500 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-600"
            >
              {isKo ? '프리미엄 리포트 보기' : 'View Premium Picks'}
            </Link>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="mb-8 text-center">
              <span className="text-sm font-medium tracking-wider text-emerald-400">PREMIUM</span>
              <h1 className="mb-3 mt-2 text-3xl font-bold md:text-4xl">
                <span className="text-white">{isKo ? '트렌드사커' : 'TrendSoccer'}</span>
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-[#A3FF4C] bg-clip-text text-transparent">
                  {isKo ? '프리미엄 리포트' : 'Premium Picks'}
                </span>
              </h1>
              <p className="text-gray-400">
                {isKo
                  ? '축구 6대 리그 + 야구 KBO·MLB·NPB AI 분석'
                  : 'Football 6 Leagues + Baseball KBO·MLB·NPB AI Analysis'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {isKo
                  ? '매일 갱신 · 확신 있을 때만 · 하나의 구독으로 모두 이용'
                  : 'Updated daily · Only when confident · All-in-one subscription'}
              </p>

              {/* 신뢰 요소 — 적중률 (있을 때만) */}
              {accuracy != null && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-4 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[13px] text-gray-300">
                    {isKo ? '최근 AI 예측 적중률' : 'Recent AI hit rate'}{' '}
                    <b className="text-emerald-400">{accuracy}%</b>
                  </span>
                </div>
              )}
            </div>

            {/* 가격 카드 2개 - 나란히 */}
            <div className="mx-auto mb-10 grid max-w-2xl gap-4 md:grid-cols-2">
              {/* 월간 */}
              <div
                onClick={() => setSelectedPlan('monthly')}
                className={`cursor-pointer rounded-2xl border-2 p-6 text-left transition-all ${
                  selectedPlan === 'monthly'
                    ? 'border-[#A3FF4C] bg-[#A3FF4C]/10'
                    : 'border-gray-700 bg-[#1a1a1a] hover:border-gray-600'
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-gray-400">{isKo ? '월간' : 'Monthly'}</span>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      selectedPlan === 'monthly' ? 'border-[#A3FF4C] bg-[#A3FF4C]' : 'border-gray-600'
                    }`}
                  >
                    {selectedPlan === 'monthly' && <span className="text-xs text-black">✔</span>}
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">
                  {plans.monthly.priceDisplay}
                  <span className="text-lg font-normal text-gray-400">{plans.monthly.period}</span>
                </div>
              </div>

              {/* 3개월 */}
              <div
                onClick={() => setSelectedPlan('quarterly')}
                className={`relative cursor-pointer rounded-2xl border-2 p-6 text-left transition-all ${
                  selectedPlan === 'quarterly'
                    ? 'border-[#A3FF4C] bg-[#A3FF4C]/10'
                    : 'border-gray-700 bg-[#1a1a1a] hover:border-gray-600'
                }`}
              >
                {/* 할인 뱃지 */}
                <div className="absolute -top-3 right-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-black">
                  -33%
                </div>

                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-gray-400">{isKo ? '3개월' : 'Quarterly'}</span>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      selectedPlan === 'quarterly' ? 'border-[#A3FF4C] bg-[#A3FF4C]' : 'border-gray-600'
                    }`}
                  >
                    {selectedPlan === 'quarterly' && <span className="text-xs text-black">✔</span>}
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">
                  {plans.quarterly.priceDisplay}
                  <span className="text-lg font-normal text-gray-400">{plans.quarterly.period}</span>
                </div>
                <div className="mt-1 text-sm text-emerald-400">
                  {isKo
                    ? `월 ${plans.quarterly.monthlyEquivalent} (1개월 무료)`
                    : `${plans.quarterly.monthlyEquivalent}/mo (1 month free)`}
                </div>
              </div>
            </div>

            {/* CTA 버튼 */}
            <div className="mb-4 text-center">
              {!session ? (
                // 비로그인: 로그인 페이지로
                <Link
                  href="/login"
                  className="inline-block w-full max-w-md rounded-xl bg-gradient-to-r from-[#A3FF4C] to-emerald-400 py-4 text-center text-lg font-bold text-black transition-all hover:brightness-105"
                >
                  {isKo ? '로그인하고 시작하기' : 'Sign in to Start'}
                </Link>
              ) : (
                // 로그인된 일반 사용자: 결제 버튼
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className={`w-full max-w-md rounded-xl py-4 text-lg font-bold transition-all ${
                    loading
                      ? 'cursor-not-allowed bg-gray-600 opacity-50'
                      : 'bg-gradient-to-r from-[#A3FF4C] to-emerald-400 text-black hover:brightness-105'
                  }`}
                >
                  {loading
                    ? isKo
                      ? '처리 중...'
                      : 'Processing...'
                    : isKo
                    ? '프리미엄 시작하기'
                    : 'Start Premium'}
                </button>
              )}
              {/* 안내 문구 (결제 후 즉시 적용) */}
              <p className="mx-auto mt-3 max-w-md text-[12px] text-gray-500">
                {isKo
                  ? '결제 후 즉시 로그인 계정에 프리미엄이 적용됩니다.'
                  : 'Premium is applied to your account immediately after payment.'}
              </p>
            </div>

            {/* 프리미엄 혜택 */}
            <div className="mx-auto mb-12 mt-8 max-w-2xl">
              <h3 className="mb-4 text-center font-bold text-white">
                {isKo ? '프리미엄 전용 혜택' : 'Premium Benefits'}
              </h3>

              <div className="space-y-4 rounded-xl bg-[#1a1a1a] p-6">
                {[
                  {
                    icon: '⚽',
                    title: isKo ? '축구 AI 프리미엄 리포트' : 'Football AI Premium Picks',
                    desc: isKo ? '6대 리그 엄선 경기 데이터 분석' : 'Top 6 league curated match analysis',
                  },
                  {
                    icon: '⚾',
                    title: isKo ? '야구 AI 프리미엄 리포트' : 'Baseball AI Premium Picks',
                    desc: isKo ? 'KBO·MLB·NPB 경기 데이터 분석' : 'KBO·MLB·NPB match analysis',
                  },
                  {
                    icon: '⏰',
                    title: isKo ? '24시간 선공개' : '24h Early Access',
                    desc: isKo ? '분석을 남들보다 먼저 확인' : 'Get predictions before others',
                  },
                  {
                    icon: '📊',
                    title: isKo ? '상세 AI 분석 리포트' : 'Detailed AI Analysis Report',
                    desc: isKo ? '팀 전력, 상대전적, 세이버메트릭스' : 'Team stats, H2H, sabermetrics',
                  },
                  {
                    icon: '🚫',
                    title: isKo ? '광고 완전 제거' : 'Ad-free Experience',
                    desc: isKo ? '깔끔한 화면으로 분석에 집중' : 'Clean interface, no distractions',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#A3FF4C]/10">
                      <span className="text-lg">{item.icon}</span>
                    </div>
                    <div>
                      <div className="font-medium text-white">{item.title}</div>
                      <div className="text-sm text-gray-500">{item.desc}</div>
                    </div>
                    <span className="ml-auto text-emerald-400">✔</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
