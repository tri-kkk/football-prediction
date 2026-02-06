'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useLanguage } from '../../contexts/LanguageContext'

declare global {
  interface Window {
    SendPay: (form: HTMLFormElement) => void
    pay_result_submit: () => void
    pay_result_close: () => void
  }
}

export default function PricingPage() {
  const { language } = useLanguage()
  const { data: session } = useSession()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'quarterly'>('quarterly')
  const [loading, setLoading] = useState(false)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  
  const isPremium = (session?.user as any)?.tier === 'premium'

// SeedPay SDK 로드
useEffect(() => {
  // 1. 콜백 함수 먼저 등록
  window.pay_result_submit = function() {
    if (typeof (window as any).payResultSubmit === 'function') {
      (window as any).payResultSubmit()
    }
  }
  window.pay_result_close = function() {
    alert('결제를 취소하였습니다.')
  }

  // 2. SDK 로드
  const script = document.createElement('script')
  script.src = 'https://pay.seedpayments.co.kr/js/pgAsistant.js'
  script.onload = () => setSdkLoaded(true)
  document.head.appendChild(script)

  return () => {
    if (script.parentNode) script.parentNode.removeChild(script)
  }
}, [])
  
  // 프로모션 기간 체크
  const PROMO_END = new Date('2026-03-01T00:00:00+09:00')
  const isPromoPeriod = new Date() < PROMO_END
  
  const plans = {
    monthly: {
      price: language === 'ko' ? 4900 : 3.99,
      priceDisplay: language === 'ko' ? '₩4,900' : '$3.99',
      period: language === 'ko' ? '/1개월' : '/1mo',
    },
    quarterly: {
      price: language === 'ko' ? 9900 : 7.99,
      priceDisplay: language === 'ko' ? '₩9,900' : '$7.99',
      period: language === 'ko' ? '/3개월' : '/3mo',
      monthlyEquivalent: language === 'ko' ? '₩3,300' : '$2.66',
    },
  }

  // SeedPay 결제 실행
  const handlePayment = async () => {
    if (!session?.user?.email) {
      window.location.href = '/login'
      return
    }
    if (!sdkLoaded) {
      alert(language === 'ko' ? '결제 시스템 로딩 중입니다.' : 'Payment system loading...')
      return
    }

    setLoading(true)
    try {
      // 1. init API 호출
      const res = await fetch('/api/payment/seedpay/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })
      const data = await res.json()

      if (!data.success) {
        alert(data.error || '결제 초기화 실패')
        setLoading(false)
        return
      }

      // 2. 동적 Form 생성
      const existingForm = document.querySelector('form[name="payInit"]')
      if (existingForm) existingForm.remove()

      const form = document.createElement('form')
      form.name = 'payInit'
      form.method = 'post'
      form.style.display = 'none'

      const fields: Record<string, string> = {
        mid: data.mid,
        method: 'CARD',
        goodsNm: data.goodsNm,
        ordNo: data.ordNo,
        goodsAmt: data.goodsAmt,
        ordNm: data.userName,
        ordEmail: data.userEmail,
        returnUrl: `${window.location.origin}/api/payment/seedpay/callback`,
        ediDate: data.ediDate,
        hashString: data.hashString,
        mbsReserved: JSON.stringify({ email: data.userEmail, plan: data.plan }),
      }

      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = name
        input.value = value
        form.appendChild(input)
      })

      document.body.appendChild(form)

      // 3. SeedPay 결제창 호출
      window.SendPay(form)

    } catch (err) {
      console.error('Payment error:', err)
      alert(language === 'ko' ? '결제 처리 중 오류가 발생했습니다.' : 'Payment error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        
        {/* 프로모션 배너 - 비로그인 + 프로모션 기간 */}
        {!session && isPromoPeriod && (
          <div className="bg-gradient-to-r from-[#1a2a1a] to-[#1a1a2a] border border-green-500/30 rounded-2xl p-6 mb-8">
            <div className="text-center">
              <div className="inline-block px-3 py-1 bg-green-500/20 rounded-full mb-3">
                <span className="text-green-400 text-xs font-bold tracking-wider">OPEN EVENT</span>
              </div>
              <h3 className="text-white font-bold text-xl mb-2">
                {language === 'ko' ? '가입하면 프리미엄 무료!' : 'Sign up for FREE Premium!'}
              </h3>
              <p className="text-3xl font-black mb-4" style={{ 
                background: 'linear-gradient(to right, #22d3ee, #34d399)', 
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {language === 'ko' ? '프리미엄 예측픽 무료' : 'FREE Premium Picks'}
              </p>
              <Link
                href="/login"
                className="inline-block px-8 py-3 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all"
              >
                {language === 'ko' ? '지금 무료로 가입하기 →' : 'Join Free Now →'}
              </Link>
            </div>
          </div>
        )}
        
        {/* 이미 프리미엄인 경우 */}
        {isPremium ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-400 mb-4">
              {language === 'ko' ? '이미 프리미엄 회원입니다!' : 'You are already Premium!'}
            </h1>
            <Link 
              href="/premium"
              className="inline-block px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              {language === 'ko' ? '프리미엄 픽 보기' : 'View Premium Picks'}
            </Link>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="text-center mb-8">
              
              <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-3">
                <span className="text-white">{language === 'ko' ? '트렌드사커' : 'TrendSoccer'}</span>
                <br />
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {language === 'ko' ? '프리미엄 구독' : 'Premium Picks'}
                </span>
              </h1>
              
            </div>

            {/* 가격 카드 2개 */}
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10">
              {/* 월간 */}
              <div
                onClick={() => setSelectedPlan('monthly')}
                className={`p-6 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  selectedPlan === 'monthly'
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-gray-700 bg-[#1a1a1a] hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400 text-sm">{language === 'ko' ? '1개월' : 'Monthly'}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === 'monthly' 
                      ? 'border-yellow-500 bg-yellow-500' 
                      : 'border-gray-600'
                  }`}>
                    {selectedPlan === 'monthly' && <span className="text-black text-xs">✔</span>}
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">
                  {plans.monthly.priceDisplay}
                  <span className="text-lg text-gray-400 font-normal">{plans.monthly.period}</span>
                </div>
              </div>

              {/* 3개월 */}
              <div
                onClick={() => setSelectedPlan('quarterly')}
                className={`p-6 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                  selectedPlan === 'quarterly'
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-gray-700 bg-[#1a1a1a] hover:border-gray-600'
                }`}
              >
                <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                  -33%
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400 text-sm">{language === 'ko' ? '3개월' : 'Quarterly'}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === 'quarterly' 
                      ? 'border-yellow-500 bg-yellow-500' 
                      : 'border-gray-600'
                  }`}>
                    {selectedPlan === 'quarterly' && <span className="text-black text-xs">✔</span>}
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">
                  {plans.quarterly.priceDisplay}
                  <span className="text-lg text-gray-400 font-normal">{plans.quarterly.period}</span>
                </div>
                <div className="text-green-400 text-sm mt-1">
                  {language === 'ko' 
                    ? `월 ${plans.quarterly.monthlyEquivalent} (1개월 무료)` 
                    : `${plans.quarterly.monthlyEquivalent}/mo (1 month free)`}
                </div>
              </div>
            </div>

            {/* CTA 버튼 */}
            <div className="text-center mb-12">
              {!session ? (
                <Link
                  href="/login"
                  className="inline-block w-full max-w-md py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-xl font-bold text-lg transition-all text-center"
                >
                  {language === 'ko' 
                    ? isPromoPeriod ? '무료로 시작하기' : '로그인하고 시작하기'
                    : isPromoPeriod ? 'Start Free' : 'Sign in to Start'}
                </Link>
              ) : (
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full max-w-md py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-bold text-lg transition-all"
                >
                  {loading 
                    ? (language === 'ko' ? '결제 처리 중...' : 'Processing...') 
                    : (language === 'ko' ? '프리미엄 시작하기' : 'Start Premium')}
                </button>
              )}
              
            </div>

            {/* 프리미엄 혜택 */}
            <div className="max-w-2xl mx-auto mb-12">
              <h3 className="text-center text-white font-bold mb-4">
                {language === 'ko' ? '프리미엄 전용 혜택' : 'Premium Benefits'}
              </h3>
              
              <div className="bg-[#1a1a1a] rounded-xl p-6 space-y-4">
                {[
                  { 
                    title: language === 'ko' ? '트렌드사커 픽' : 'TrendSoccer Picks',
                    desc: language === 'ko' ? '엄선된 확신 경기만' : 'Curated confident matches only'
                  },
                  { 
                    title: language === 'ko' ? '24시간 선공개' : '24h Early Access',
                    desc: language === 'ko' ? '예측을 남들보다 먼저' : 'Get predictions before others'
                  },
                  { 
                    title: language === 'ko' ? '광고 완전 제거' : 'Ad-free Experience',
                    desc: language === 'ko' ? '깔끔한 화면으로 집중' : 'Clean interface, no distractions'
                  },
                   { 
    title: language === 'ko' ? '하이라이트 무제한' : 'Unlimited Highlights',
    desc: language === 'ko' ? '모든 경기 하이라이트 무제한 시청' : 'Watch all match highlights unlimited'
  },
  { 
    title: language === 'ko' ? '프로토 계산기' : 'Proto Calculator',
    desc: language === 'ko' ? '무제한 저장 및 관리' : 'Unlimited saves & management'
  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-yellow-400 font-bold">{idx + 1}</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">{item.title}</div>
                      <div className="text-gray-500 text-sm">{item.desc}</div>
                    </div>
                    <span className="ml-auto text-green-400">✔</span>
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