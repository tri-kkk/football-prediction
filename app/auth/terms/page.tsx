'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../contexts/LanguageContext'
import Link from 'next/link'

export default function TermsAgreementPage() {
  const { data: session, status, update } = useSession()
  const { language } = useLanguage()
  const router = useRouter()
  
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [agreedPrivacy, setAgreedPrivacy] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showError, setShowError] = useState(false)

  // 🎉 프로모션 기간 체크
  const PROMO_END = new Date('2026-02-01T00:00:00+09:00')
  const now = new Date()
  const isPromoPeriod = now < PROMO_END

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    
    if (session?.user?.termsAgreed) {
      router.push('/')
    }
  }, [session, status, router])

  const handleAgreeAll = () => {
    const newState = !(agreedTerms && agreedPrivacy)
    setAgreedTerms(newState)
    setAgreedPrivacy(newState)
    if (newState) setShowError(false)
  }

  const handleSubmit = async () => {
    if (!agreedTerms || !agreedPrivacy) {
      setShowError(true)
      return
    }

    setIsLoading(true)
    
    try {
      const res = await fetch('/api/auth/agree-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreedTerms,
          agreedPrivacy,
        }),
      })

      if (res.ok) {
        await update()
        router.push('/')
      } else {
        const data = await res.json()
        alert(data.error || '오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Terms agreement error:', error)
      alert('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const pendingPromo = session?.user?.pendingPromo

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center px-4 py-10 overflow-auto">
      {/* 그라데이션 배경 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full relative z-10" style={{ maxWidth: '480px' }}>
        {/* 로고 */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <img 
              src="/logo.svg" 
              alt="트랜드사커" 
              className="h-10 w-auto mx-auto mb-4"
            />
          </Link>
        </div>

        {/* 환영 메시지 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {language === 'ko' ? '환영합니다! 🎉' : 'Welcome! 🎉'}
          </h1>
          <p className="text-gray-400">
            {session?.user?.name}{language === 'ko' ? '님, 서비스 이용을 위해' : ', please agree to'}
            <br />
            {language === 'ko' ? '약관에 동의해주세요.' : 'the terms to continue.'}
          </p>
        </div>

        {/* 프로모션 안내 */}
        {pendingPromo && isPromoPeriod && (
          <div className="bg-gradient-to-r from-[#1a2a1a] to-[#1a1a2a] border border-green-500/30 rounded-2xl p-4 mb-6">
            <div className="text-center">
              <div className="inline-block px-3 py-1 bg-green-500/20 rounded-full mb-2">
                <span className="text-green-400 text-xs font-bold">🎁 OPEN EVENT</span>
              </div>
              <p className="text-white font-medium">
                {language === 'ko' 
                  ? '약관 동의 후 프리미엄 혜택이 적용됩니다!' 
                  : 'Premium benefits will be applied after agreement!'}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {language === 'ko' ? '무료 체험 기간: ~2026.01.31' : 'Free trial: ~2026.01.31'}
              </p>
            </div>
          </div>
        )}

        {/* 약관 동의 카드 */}
        <div className="bg-gradient-to-b from-[#1a1a1a] to-[#141414] rounded-3xl p-6 shadow-2xl border border-gray-800/50">
          
          {/* 전체 동의 */}
          <div 
            onClick={handleAgreeAll}
            className="flex items-center gap-3 p-4 bg-[#0f0f0f] rounded-xl cursor-pointer group mb-4 border border-gray-800 hover:border-green-500/30 transition-colors"
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              agreedTerms && agreedPrivacy
                ? 'bg-green-500 border-green-500' 
                : 'border-gray-500 group-hover:border-green-400'
            }`}>
              {agreedTerms && agreedPrivacy && (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-white font-medium">
              {language === 'ko' ? '전체 동의' : 'Agree to all'}
            </span>
          </div>

          <div className="border-t border-gray-800 pt-4 space-y-3">
            {/* 이용약관 (필수) */}
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
              <div className="flex-1 flex items-center justify-between">
                <span className="text-gray-300 text-sm">
                  <a href="/terms" target="_blank" onClick={e => e.stopPropagation()} className="underline hover:text-white">
                    {language === 'ko' ? '이용약관' : 'Terms of Service'}
                  </a>
                  {language === 'ko' ? ' 동의 (필수)' : ' (Required)'}
                </span>
                <a href="/terms" target="_blank" onClick={e => e.stopPropagation()} className="text-gray-500 text-xs hover:text-gray-300">
                  {language === 'ko' ? '보기' : 'View'} →
                </a>
              </div>
            </div>

            {/* 개인정보처리방침 (필수) */}
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
              <div className="flex-1 flex items-center justify-between">
                <span className="text-gray-300 text-sm">
                  <a href="/privacy" target="_blank" onClick={e => e.stopPropagation()} className="underline hover:text-white">
                    {language === 'ko' ? '개인정보처리방침' : 'Privacy Policy'}
                  </a>
                  {language === 'ko' ? ' 동의 (필수)' : ' (Required)'}
                </span>
                <a href="/privacy" target="_blank" onClick={e => e.stopPropagation()} className="text-gray-500 text-xs hover:text-gray-300">
                  {language === 'ko' ? '보기' : 'View'} →
                </a>
              </div>
            </div>

            {/* 에러 메시지 */}
            {showError && (
              <p className="text-red-400 text-sm mt-2">
                {language === 'ko' 
                  ? '※ 필수 약관에 모두 동의해주세요' 
                  : '※ Please agree to all required terms'}
              </p>
            )}
          </div>

          {/* 동의 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full mt-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{language === 'ko' ? '처리 중...' : 'Processing...'}</span>
              </div>
            ) : (
              language === 'ko' ? '동의하고 시작하기' : 'Agree and Continue'
            )}
          </button>
        </div>

        {/* 로그아웃 링크 */}
        <div className="text-center mt-6">
          <button 
            onClick={() => {
              if (confirm(language === 'ko' 
                ? '동의하지 않으면 서비스를 이용할 수 없습니다. 정말 나가시겠습니까?' 
                : 'You cannot use the service without agreeing. Are you sure you want to leave?'
              )) {
                window.location.href = '/api/auth/signout'
              }
            }}
            className="text-gray-600 hover:text-gray-400 text-sm transition-colors"
          >
            ← {language === 'ko' ? '다음에 할게요' : 'Maybe later'}
          </button>
        </div>
      </div>
    </div>
  )
}