'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../contexts/LanguageContext'
import Link from 'next/link'

export default function TermsPage() {
  const { language } = useLanguage()
  const { data: session, status } = useSession()  // ✅ update 제거!
  const router = useRouter()
  
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [marketingAgreed, setMarketingAgreed] = useState(false)
  const [allAgreed, setAllAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingPromo, setPendingPromo] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  const PROMO_END = new Date('2026-03-01T00:00:00+09:00')
  const now = new Date()
  const daysLeft = Math.ceil((PROMO_END.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isPromoPeriod = daysLeft > 0


  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('🔐 로그인 필요')
      router.push('/login')
      return
    }

    if (status === 'loading') {
      return
    }

    if (status === 'authenticated' && session?.user?.email) {
      const termsAgreed = (session?.user as any)?.termsAgreed
      const pendingPromo = (session?.user as any)?.pendingPromo

      console.log('🔍 약관 페이지 진입, termsAgreed:', termsAgreed)

      if (termsAgreed === true) {
        console.log('✅ 기존 회원 - 홈으로')
        router.replace('/')
        return
      }

      if (termsAgreed === false) {
        console.log('⏳ 신규 회원 - 약관 페이지')
        setPendingPromo(pendingPromo)
        setIsReady(true)
        return
      }

      console.log('⚠️ 불명확한 상태')
      setIsReady(true)
    }
  }, [status, session?.user, router])

  useEffect(() => {
    if (allAgreed) {
      setTermsAgreed(true)
      setPrivacyAgreed(true)
      setMarketingAgreed(true)
    }
  }, [allAgreed])

  useEffect(() => {
    setAllAgreed(termsAgreed && privacyAgreed && marketingAgreed)
  }, [termsAgreed, privacyAgreed, marketingAgreed])

  const handleAllAgree = () => {
    setAllAgreed(!allAgreed)
  }

  // ✅ 최종: update() 없이 바로 이동
  const handleSubmit = async () => {
    console.log('동의 버튼 클릭:', { termsAgreed, privacyAgreed })

    if (!termsAgreed || !privacyAgreed) {
      setError(language === 'ko' ? '필수 약관에 동의해주세요.' : 'Please agree to required terms.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const email = session?.user?.email
      if (!email) {
        throw new Error('User email not found')
      }

      console.log('📝 약관 동의 제출:', email)

      const response = await fetch('/api/auth/agree-terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          termsAgreed: true,
          privacyAgreed: true,
          marketingAgreed: marketingAgreed,
        }),
      })

      const data = await response.json()

      console.log('✅ 약관 동의 완료:', data)

      if (!response.ok) {
        throw new Error(data.error || '약관 동의 처리 중 오류가 발생했습니다.')
      }

      // ✅ update() 없이 바로 이동
      console.log('🎯 /signup-complete로 이동')
      window.location.replace('/signup-complete')
      
    } catch (err) {
      console.error('❌ 오류:', err)
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      setIsSubmitting(false)
    }
  }

  if (status === 'loading' || !isReady) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center px-4 py-10 overflow-auto">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full relative z-10" style={{ maxWidth: '480px' }}>
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <img 
              src="/logo.svg" 
              alt="트렌드사커" 
              className="h-10 w-auto mx-auto"
            />
          </Link>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            {language === 'ko' ? '약관 동의' : 'Terms Agreement'}
          </h1>
          <p className="text-gray-500 text-sm">
            {language === 'ko' 
              ? '서비스 이용을 위해 약관에 동의해주세요.' 
              : 'Please agree to the terms to use the service.'}
          </p>
        </div>

        {isPromoPeriod && pendingPromo === 'LAUNCH_2026' && (
          <div className="bg-gradient-to-r from-[#1a2a1a] to-[#1a1a2a] border border-green-500/30 rounded-2xl p-4 mb-6">
            <div className="text-center">
              <div className="inline-block px-3 py-1 bg-green-500/20 rounded-full mb-2">
                <span className="text-green-400 text-xs font-bold">🎁 SPECIAL OFFER</span>
              </div>
              <p className="text-white font-bold">
                {language === 'ko' 
                  ? '약관 동의 시 프리미엄 무료!' 
                  : 'Free Premium on agreement!'}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {language === 'ko' 
                  ? `~2026.03.01까지 (D-${daysLeft})`
                  : `Until 2026.03.01 (D-${daysLeft})`}
              </p>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-b from-[#1a1a1a] to-[#141414] rounded-3xl p-6 shadow-2xl border border-gray-800/50">
          
          <div 
            onClick={() => setAllAgreed(!allAgreed)}
            className="flex items-center gap-3 p-4 bg-[#111] rounded-xl cursor-pointer hover:bg-[#1a1a1a] transition-colors mb-4"
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              allAgreed 
                ? 'bg-green-500 border-green-500' 
                : 'border-gray-600'
            }`}>
              {allAgreed && (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-white font-semibold">
              {language === 'ko' ? '전체 동의' : 'Agree to all'}
            </span>
          </div>

          <div className="border-t border-gray-800 my-4" />

          <div className="space-y-3">
            <div 
              onClick={() => setTermsAgreed(!termsAgreed)}
              className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-[#111] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  termsAgreed 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-gray-600'
                }`}>
                  {termsAgreed && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-gray-300">
                  <span className="text-red-400 text-xs mr-1">[필수]</span>
                  {language === 'ko' ? '이용약관 동의' : 'Terms of Service'}
                </span>
              </div>
              <Link 
                href="/terms" 
                onClick={(e) => e.stopPropagation()}
                className="text-gray-500 text-sm hover:text-gray-400"
              >
                {language === 'ko' ? '보기' : 'View'}
              </Link>
            </div>

            <div 
              onClick={() => setPrivacyAgreed(!privacyAgreed)}
              className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-[#111] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  privacyAgreed 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-gray-600'
                }`}>
                  {privacyAgreed && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-gray-300">
                  <span className="text-red-400 text-xs mr-1">[필수]</span>
                  {language === 'ko' ? '개인정보처리방침 동의' : 'Privacy Policy'}
                </span>
              </div>
              <Link 
                href="/privacy" 
                onClick={(e) => e.stopPropagation()}
                className="text-gray-500 text-sm hover:text-gray-400"
              >
                {language === 'ko' ? '보기' : 'View'}
              </Link>
            </div>

            <div 
              onClick={() => setMarketingAgreed(!marketingAgreed)}
              className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-[#111] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  marketingAgreed 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-gray-600'
                }`}>
                  {marketingAgreed && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-gray-300">
                  <span className="text-gray-500 text-xs mr-1">[선택]</span>
                  {language === 'ko' ? '마케팅 정보 수신 동의' : 'Marketing emails'}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!termsAgreed || !privacyAgreed || isSubmitting}
            className={`w-full mt-6 py-4 rounded-2xl font-semibold text-white transition-all duration-200 ${
              termsAgreed && privacyAgreed && !isSubmitting
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 active:scale-[0.98]'
                : 'bg-gray-700 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{language === 'ko' ? '처리 중...' : 'Processing...'}</span>
              </div>
            ) : (
              language === 'ko' ? '동의하고 시작하기' : 'Agree and Start'
            )}
          </button>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
            ← {language === 'ko' ? '홈으로' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  )
}