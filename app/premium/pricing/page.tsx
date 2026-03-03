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
  const [errorMessage, setErrorMessage] = useState('')
  
  const isPremium = (session?.user as any)?.tier === 'premium'

  useEffect(() => {
    window.pay_result_submit = function() {
      console.log('[SeedPay] pay_result_submit called')
    }
    
    window.pay_result_close = function() {
      console.log('[SeedPay] pay_result_close called')
      alert(language === 'ko' ? '결제를 취소하였습니다.' : 'Payment cancelled.')
    }

    const script = document.createElement('script')
    script.src = 'https://pay.seedpayments.co.kr/js/pgAsistant.js'
    script.async = true
    
    script.onload = () => {
      console.log('[SeedPay] SDK loaded successfully')
      setSdkLoaded(true)
    }
    
    script.onerror = () => {
      console.warn('[SeedPay] SDK failed to load')
      setSdkLoaded(true)
    }
    
    document.head.appendChild(script)

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script)
    }
  }, [language])

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

  // ============================================
  // SeedPay 결제 실행
  // ============================================
  const handlePayment = async () => {
    setErrorMessage('')
    
    if (!session?.user?.email) {
      window.location.href = '/login'
      return
    }

    if (!sdkLoaded) {
      setErrorMessage(
        language === 'ko' 
          ? '결제 시스템이 준비 중입니다. 잠시만 기다려주세요.' 
          : 'Payment system initializing. Please wait.'
      )
      return
    }

    setLoading(true)

    try {
      console.log('[Payment] 결제 초기화 시작:', { plan: selectedPlan })

      // 1. API 호출
      const res = await fetch('/api/payment/seedpay/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || '결제 초기화 실패')
      }

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || '결제 초기화 실패')
      }

      console.log('[Payment] 초기화 성공:', {
        ordNo: data.ordNo,
        amount: data.goodsAmt,
        method: data.method,
        mid: data.mid.substring(0, 5) + '***',
      })

      // 2. 기존 Form 제거
      const existingForm = document.querySelector('form[name="payInit"]')
      if (existingForm) existingForm.remove()

      // 3. Form 생성 (SeedPay 공식 가이드 기준)
      const form = document.createElement('form')
      form.name = 'payInit'
      form.method = 'post'                    // ✅ POST 방식
      form.action = ''                        // ✅ 비워야 함! (SendPay가 처리)
      form.target = 'seedpay_popup'           // ✅ 팝업 이름
      form.style.display = 'none'

      // 4. Form 필드 추가 (SeedPay 공식 문서 기준)
      const fields: Record<string, string> = {
        // === 필수 필드 ===
        method: 'CARD',                  // CARD (필수)
        mid: data.mid,                        // 상점 아이디 (필수)
        goodsNm: data.goodsNm,                // 상품명 (필수)
        ordNo: data.ordNo,                    // 주문번호 (필수)
        goodsAmt: data.goodsAmt,              // 결제금액 (필수, 숫자)
        ordNm: data.ordNm,                    // 구매자명 (필수)
        
        // === 선택사항 ===
        ordTel: '0000000000',                 // 구매자 전화 (숫자만)
        ordEmail: data.ordEmail,              // 구매자 이메일
        
        // === 보안 및 결과 ===
        returnUrl: data.returnUrl,            // 결과 콜백 URL
        ediDate: data.ediDate,                // 타임스탬프
        hashString: data.hashString,          // SHA-256 해시
        
        // === 예약 필드 ===
        mbsReserved: data.mbsReserved || JSON.stringify({ 
          email: data.userEmail, 
          plan: data.plan,
          timestamp: new Date().toISOString()
        }),
      }

      // 5. Form에 필드 추가
      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = name
        input.value = value
        form.appendChild(input)
      })

      // 6. 최종 확인 로깅
      console.log('[Payment] ===== Form Ready to Submit =====')
      console.log('[Payment] form.method:', form.method)
      console.log('[Payment] form.action:', form.action)
      console.log('[Payment] form.target:', form.target)
      console.log('[Payment] form.name:', form.name)
      console.log('[Payment] Fields count:', Object.keys(fields).length)
      
      // 필드 목록
      form.querySelectorAll('input').forEach((input, idx) => {
        const value = input.value.length > 50 
          ? input.value.substring(0, 50) + '...' 
          : input.value
        console.log(`  [${idx + 1}] ${input.name}: ${value}`)
      })
      console.log('[Payment] ===== Ready to Submit =====\n')

      document.body.appendChild(form)

      // 7. ✅ SendPay 함수 호출 (form.submit() 대신!)
      console.log('[Payment] window.SendPay 존재?', typeof window.SendPay)
      
      if (typeof window.SendPay === 'function') {
        console.log('[Payment] window.SendPay(form) 호출...')
        try {
          window.SendPay(form)
        } catch (sendPayErr) {
          console.error('[Payment] ❌ SendPay 에러:', sendPayErr)
          console.log('[Payment] 폴백: form.submit() 사용')
          form.submit()
        }
      } else {
        console.error('[Payment] ❌ window.SendPay is not a function!')
        console.log('[Payment] 폴백: form.submit() 사용')
        form.submit()
      }

    } catch (err) {
      console.error('[Payment] 에러 발생:', err)
      setErrorMessage(
        language === 'ko' 
          ? `결제 처리 중 오류: ${err instanceof Error ? err.message : '알 수 없음'}`
          : `Payment error: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            <div className="font-semibold mb-1">⚠️ {language === 'ko' ? '오류' : 'Error'}</div>
            <div>{errorMessage}</div>
          </div>
        )}
        
        {!session && (
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
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-3">
                <span className="text-white">{language === 'ko' ? '트렌드사커' : 'TrendSoccer'}</span>
                <br />
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {language === 'ko' ? '프리미엄 구독' : 'Premium Picks'}
                </span>
              </h1>
            </div>

            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10">
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

            <div className="text-center mb-12">
              {!session ? (
                <Link
                  href="/login"
                  className="inline-block w-full max-w-md py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-xl font-bold text-lg transition-all text-center"
                >
                  {language === 'ko' 
                    ? '무료로 시작하기' 
                    : 'Start Free'}
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