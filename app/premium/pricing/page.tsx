'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useLanguage } from '../../contexts/LanguageContext'

// ✅ SeedPay pgAsistant.js 동적 로드
declare global {
  interface Window {
    SendPay?: (form: HTMLFormElement, mode?: string) => void
  }
}

export default function PricingPage() {
  const { language } = useLanguage()
  const { data: session } = useSession()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'quarterly'>('quarterly')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showMaintenance, setShowMaintenance] = useState(false)  // ✅ 유지보수 모달

  // ✅ pgAsistant.js 로드
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://pay.seedpayments.co.kr/js/pgAsistant.js'
    script.async = true
    script.onload = () => {
      console.log('✅ [Payment] pgAsistant.js 로드 완료')
    }
    script.onerror = () => {
      console.error('❌ [Payment] pgAsistant.js 로드 실패')
    }
    document.head.appendChild(script)
    
    return () => {
      // cleanup 불필요 (스크립트는 재사용)
    }
  }, [])

  // ✅ SeedPay postMessage 수신 (payData2에서 보냄)
  useEffect(() => {
    const handleSeedPayMessage = (event: MessageEvent) => {
      console.log('📨 [Payment] SeedPay postMessage 수신')
      
      // SeedPay 메시지 형식:
      // event.data = [
      //   "SUCCESS",
      //   { 결제 데이터 },
      //   "returnUrl",
      //   "POST",
      //   "utf-8"
      // ]
      
      if (Array.isArray(event.data) && event.data[0] === 'SUCCESS') {
        const paymentData = event.data[1]
        
        console.log('📦 [Payment] 결제 인증 완료 (resultCd: ' + paymentData.resultCd + ')')
        
        // ✅ resultCd 조건 수정: 0000(인증) 또는 3001(승인) 모두 성공
        if (paymentData.resultCd === '0000' || paymentData.resultCd === '3001') {
          console.log('✅ [Payment] 결제 성공 (resultCd:', paymentData.resultCd, '), Callback으로 데이터 전송...')
          
          // Callback으로 POST 전송
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
          console.log('📤 [Payment] Form submit 실행')
          form.submit()
        } else {
          console.error('❌ [Payment] 결제 실패:', paymentData.resultMsg)
          window.location.href = `/premium/pricing/result?status=failed&message=${encodeURIComponent(paymentData.resultMsg || '결제 실패')}`
        }
      }
    }
    
    window.addEventListener('message', handleSeedPayMessage)
    return () => window.removeEventListener('message', handleSeedPayMessage)
  }, [])
  
  // ✅ Hydration 문제 해결

  // ✅ payData2 페이지에서 데이터 추출 및 처리
  useEffect(() => {
    // URL이 payData2인지 확인
    if (window.location.href.includes('payData2')) {
      console.log('📨 [Payment] payData2 페이지 감지')
      
      // URL의 모든 파라미터를 가져오기
      const params = new URLSearchParams(window.location.search)
      const data: Record<string, string> = {}
      params.forEach((value, key) => {
        data[key] = value
      })

      console.log('📦 [Payment] 결제 데이터:', {
        resultCd: data.resultCd,
        resultMsg: data.resultMsg,
        ordNo: data.ordNo,
      })

      // 결제 성공 확인
      if (data.resultCd === '0000') {
        console.log('✅ [Payment] 인증 성공, 승인 처리 중...')

        // 우리 Backend에 승인 요청
        fetch('/api/payment/seedpay/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(data).toString(),
        })
          .then(res => {
            if (res.redirected) {
              // Callback에서 리다이렉트된 경우
              window.location.href = res.url
            }
            return res.json()
          })
          .then(result => {
            console.log('✅ [Payment] 처리 완료')
          })
          .catch(error => {
            console.error('❌ [Payment] 처리 오류:', error)
          })
      } else {
        console.error('❌ [Payment] 결제 실패:', data.resultMsg)
      }
    }
  }, [])
  
  // ✅ Hydration 문제 해결
  
  const isPremium = (session?.user as any)?.tier === 'premium'
  
  // 🎉 프로모션 기간 체크
  const PROMO_END = new Date('2026-02-01T00:00:00+09:00')
  const isPromoPeriod = new Date() < PROMO_END
  
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

  // ============================================
  // SeedPay 결제 실행
  // ============================================
  const handlePayment = async () => {
    // ✅ 유지보수 모달 표시
    setShowMaintenance(true)
  }

  // ✅ 실제 결제 함수 (숨겨진 버튼용)
  const handleRealPayment = async () => {
    if (!session?.user?.email) {
      window.location.href = '/login'
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

      // ✅ Content-Type 확인 (HTML vs JSON)
      const contentType = res.headers.get('content-type')
      
      if (contentType?.includes('text/html')) {
        // ✅ HTML 결제 페이지를 팝업에서 열기
        console.log('✅ [Payment] HTML 결제 페이지 받음, 팝업 열기')
        const html = await res.text()
        
        // ✅ Blob URL 방식으로 변경
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const blobUrl = URL.createObjectURL(blob)
        
        const popup = window.open(blobUrl, 'SeedPayment', 'width=800,height=600,top=100,left=100')
        if (popup) {
          console.log('✅ [Payment] 팝업 창에 결제 페이지 표시 완료')
        } else {
          console.error('❌ [Payment] 팝업 차단됨 - 팝업 차단 설정 확인')
          throw new Error('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.')
        }
        setLoading(false)
        return
      }

      // JSON 응답 처리
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || '결제 초기화 실패')
      }

      console.log('✅ [Payment] Init API 응답 성공')

      // ✅ nonce와 ediDate를 sessionStorage에 저장 (Hash 검증용)
      if (data.nonce) {
        sessionStorage.setItem('seedpay_nonce', data.nonce)
        console.log('✅ nonce를 sessionStorage에 저장')
      }
      if (data.ediDate) {
        sessionStorage.setItem('seedpay_ediDate', data.ediDate)
        console.log('✅ ediDate를 sessionStorage에 저장')
      }
      
      // ✅ null인 약관 4번을 우리 약관으로 채우기
      if (data.data && Array.isArray(data.data)) {
        data.data = data.data.map((term, index) => {
          if (term.termTitle === null || term.termContents === null) {
            return {
              termTitle: '에스크로 서비스 이용약관',
              termContents: '/html/term/term4.html'
            }
          }
          return term
        })
      }

      // 2. 기존 Form 제거
      const existingForm = document.querySelector('form[name="payInit"]')
      if (existingForm) existingForm.remove()

      // 3. Form 생성 (같은 페이지에서 처리)
      const form = document.createElement('form')
      form.name = 'payInit'
      form.method = 'post'
      form.action = 'https://pay.seedpayments.co.kr/payment/v1/view/request'
      form.style.display = 'none'

      // Form 필드 추가 (이전 버전과 정확히 동일)
      const fields: Record<string, string> = {
        method: 'CARD',
        mid: data.mid,
        goodsNm: data.goodsNm,
        ordNo: data.ordNo,
        goodsAmt: data.goodsAmt,
        ordNm: data.ordNm,
        ordEmail: data.ordEmail,
        returnUrl: data.returnUrl,
        ediDate: data.ediDate,
        hashString: data.hashString,
        initEdiDate: data.ediDate,  // ✅ 추가!
        //nonce: data.nonce,  // ✅ 추가!
      }

      // Form에 필드 추가
      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = name
        input.value = value
        form.appendChild(input)
      })

      // ✅ sessionStorage 저장
      if (data.ediDate) {
        sessionStorage.setItem('seedpay_ediDate', data.ediDate)
      }
      if (data.nonce) {
        sessionStorage.setItem('seedpay_nonce', data.nonce)
      }

      // 🔍 Form action 확인
      console.log('🔍 [Payment] Form action:', form.action)
      console.log('📋 Form 필드 개수:', form.children.length)

      // ✅ 주 창에서 Form 생성 및 SendPay 호출 (팝업 아님)
      document.body.appendChild(form)

      // ✅ SendPay 함수 사용 (주 창에서)
      setTimeout(() => {
        if (window.SendPay && typeof window.SendPay === 'function') {
          console.log('📱 [Payment] 주 창에서 SendPay 함수로 결제 창 오픈')
          window.SendPay(form)
        } else {
          console.warn('⚠️ [Payment] SendPay 함수 없음, 직접 submit 실행')
          form.submit()
        }
      }, 100)
      
      setLoading(false)

    } catch (err) {
      console.error('[Payment] 에러:', err)
      alert(
        language === 'ko' 
          ? `결제 처리 중 오류: ${err instanceof Error ? err.message : '알 수 없음'}`
          : `Error: ${err instanceof Error ? err.message : 'Unknown'}`
      )
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* ✅ 유지보수 모달 */}
      {showMaintenance && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-2xl p-8 max-w-sm mx-4 text-center">
            <div className="text-4xl mb-4">🔧</div>
            <h2 className="text-2xl font-bold mb-4">
              {language === 'ko' ? '서비스 점검 중' : 'Service Under Maintenance'}
            </h2>
            <p className="text-gray-400 mb-8">
              {language === 'ko' 
                ? '결제 서비스를 점검하고 있습니다.\n잠시 후 다시 시도해주세요.' 
                : 'We are currently maintaining our payment service.\nPlease try again later.'}
            </p>
            <button
              onClick={() => setShowMaintenance(false)}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors"
            >
              {language === 'ko' ? '확인' : 'OK'}
            </button>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        
        {/* 🎉 프로모션 배너 - 비로그인 + 프로모션 기간 */}
        {mounted && !session && isPromoPeriod && (
          <div className="bg-gradient-to-r from-[#1a2a1a] to-[#1a1a2a] border border-green-500/30 rounded-2xl p-6 mb-8">
            <div className="text-center">
              <div className="inline-block px-3 py-1 bg-green-500/20 rounded-full mb-3">
                <span className="text-green-400 text-xs font-bold tracking-wider">OPEN EVENT</span>
              </div>
              <h3 className="text-white font-bold text-xl mb-2">
                {language === 'ko' ? '1월 31일까지 가입하면' : 'Sign up by Jan 31'}
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
              <p className="text-gray-500 text-xs mt-3">
                {language === 'ko' ? '* 프로모션 기간: ~2026.01.31' : '* Promo period: ~2026.01.31'}
              </p>
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
              <span className="text-cyan-400 text-sm font-medium tracking-wider">PREMIUM</span>
              <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-3">
                <span className="text-white">{language === 'ko' ? '트렌드사커' : 'TrendSoccer'}</span>
                <br />
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {language === 'ko' ? '프리미엄 픽' : 'Premium Picks'}
                </span>
              </h1>
              <p className="text-gray-400">
                {language === 'ko' 
                  ? '적중률 68% · 매일 저녁 6시 갱신 · 확신 있을 때만' 
                  : '68% accuracy · Updated 6 PM daily · Only when confident'}
              </p>
            </div>

            {/* 가격 카드 2개 - 나란히 */}
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
                  <span className="text-gray-400 text-sm">{language === 'ko' ? '월간' : 'Monthly'}</span>
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
                {/* 할인 뱃지 */}
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
                // 비로그인: 로그인 페이지로
                <Link
                  href="/login"
                  className="inline-block w-full max-w-md py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-xl font-bold text-lg transition-all text-center"
                >
                  {language === 'ko' 
                    ? isPromoPeriod ? '무료로 시작하기' : '로그인하고 시작하기'
                    : isPromoPeriod ? 'Start Free' : 'Sign in to Start'}
                </Link>
              ) : (
                <>
                  {/* 일반 사용자: 결제 버튼 (클릭 시 유지보수 모달) */}
                  <button
                    onClick={handlePayment}
                    disabled={loading}
                    className={`w-full max-w-md py-4 rounded-xl font-bold text-lg transition-all ${
                      loading
                        ? 'bg-gray-600 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white'
                    }`}
                  >
                    {loading 
                      ? (language === 'ko' ? '처리 중...' : 'Processing...')
                      : (language === 'ko' ? '프리미엄 시작하기' : 'Start Premium')}
                  </button>

                  {/* 🧪 개발자용: 숨겨진 테스트 버튼 */}
                  <button
                    onClick={handleRealPayment}
                    style={{
                      position: 'fixed',
                      bottom: '10px',
                      right: '10px',
                      width: '30px',
                      height: '30px',
                      opacity: '0.1',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      zIndex: 9999,
                    }}
                    title="개발자 테스트 버튼"
                    className="hover:opacity-30 transition-opacity"
                  >
                    🧪
                  </button>
                </>
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