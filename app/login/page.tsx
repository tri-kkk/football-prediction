'use client'

import { signIn, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'
import Link from 'next/link'

export default function LoginPage() {
  const { language } = useLanguage()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  // 🔗 레퍼럴 코드 파라미터 처리 (URL 또는 sessionStorage)
  const [refCode, setRefCode] = useState<string | null>(null)

  useEffect(() => {
    console.log('🔍 레퍼럴 체크 시작')
    
    if (typeof window === 'undefined') return
    
    // 1. URL 파라미터 우선
    const urlParams = new URLSearchParams(window.location.search)
    const urlRef = urlParams.get('ref')
    console.log('🔍 URL ref:', urlRef)
    
    if (urlRef) {
      const code = urlRef.toUpperCase()
      sessionStorage.setItem('referral_code', code)
      setRefCode(code)
      console.log('📌 레퍼럴 코드 저장 (URL):', code)
      return
    }
    
    // 2. sessionStorage에서 가져오기
    const storedRef = sessionStorage.getItem('referral_code')
    console.log('🔍 Storage ref:', storedRef)
    if (storedRef) {
      setRefCode(storedRef)
      console.log('📌 레퍼럴 코드 로드 (Storage):', storedRef)
    }
  }, [])

  // 네이버 로그인 활성화 여부 (검수 통과 후 true로 변경)
  const NAVER_ENABLED = true

  // 🎉 프로모션 기간 체크 (2월 28일까지 연장)
  const PROMO_END = new Date('2026-03-01T00:00:00+09:00')
  const now = new Date()
  const daysLeft = Math.ceil((PROMO_END.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isPromoPeriod = daysLeft > 0

  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      if (!session.user.termsAgreed) {
        router.push('/auth/terms')
      } else {
        router.push('/')
      }
    }
  }, [session, status, router])

  const handleSignIn = async (provider: string) => {
    setIsLoading(provider)
    try {
      await signIn(provider, { callbackUrl: '/auth/terms' })
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(null)
    }
  }

  // 로딩 중
  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center px-4 py-10 overflow-auto">
      {/* 그라데이션 배경 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* 스타일 정의 */}
      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(45deg); }
          50% { transform: translateY(-15px) rotate(50deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(12deg); }
          50% { transform: translateY(-12px) rotate(18deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 6s ease-in-out infinite; }
        .animate-float-fast { animation: float-fast 4s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 5s ease-in-out infinite; }
      `}</style>

      <div className="w-full relative z-10" style={{ maxWidth: '420px' }}>
        {/* 로고 */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <img 
              src="/logo.svg" 
              alt="트렌드사커" 
              className="h-10 w-auto mx-auto"
            />
          </Link>
        </div>

        {/* 타이틀 + 기하학적 배경 */}
        <div className="text-center mb-8 relative">
          {/* 기하학적 도형들 */}
          <div className="absolute -top-12 left-0 w-10 h-10 border border-green-500/30 rotate-45 animate-float-slow" />
          <div className="absolute -top-8 right-4 w-8 h-8 border border-cyan-500/25 rotate-12 animate-float-medium" />
          <div className="absolute -top-4 left-1/4 w-5 h-5 border border-emerald-500/20 -rotate-12 animate-float-fast" />
          <div className="absolute -top-14 right-1/4 w-6 h-6 border border-teal-500/25 rotate-45 animate-float-slow" />
          
          {/* 원형 점들 */}
          <div className="absolute -top-6 left-8 w-2 h-2 bg-green-500/40 rounded-full animate-pulse-glow" />
          <div className="absolute -top-2 right-12 w-2 h-2 bg-cyan-500/40 rounded-full animate-pulse-glow" style={{ animationDelay: '1s' }} />
          <div className="absolute -top-10 left-1/2 w-2 h-2 bg-emerald-500/30 rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }} />
          
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">
            <span className="text-white">{language === 'ko' ? '데이터로 읽는' : 'Read with Data'}</span>
            <br />
            <span style={{ 
              background: 'linear-gradient(to right, #22d3ee, #2dd4bf, #34d399)', 
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {language === 'ko' ? '축구의 흐름' : 'Football Flow'}
            </span>
          </h1>
        </div>

        {/* 🔗 레퍼럴 배너 (ref 코드가 있을 때만) */}
        {refCode && (
          <div className="bg-gradient-to-r from-[#1a2a2a] to-[#1a1a2a] border border-cyan-500/30 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
                <span className="text-xl">🎁</span>
              </div>
              <div>
                <p className="text-cyan-400 text-sm font-bold">
                  {language === 'ko' ? '친구 초대 혜택!' : 'Referral Bonus!'}
                </p>
                <p className="text-gray-400 text-xs">
                  {language === 'ko' 
                    ? '가입하면 프리미엄 3일 무료 체험' 
                    : 'Sign up for 3 days free Premium'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🎁 48시간 무료 체험 배너 */}
        {!refCode && (
          <div className="border border-yellow-500/25 rounded-2xl p-4 mb-6 flex items-center gap-4" style={{ background: 'rgba(234,179,8,0.06)' }}>
            <span className="text-2xl flex-shrink-0">🎁</span>
            <div>
              <p className="text-yellow-400 font-bold text-sm">
                {language === 'ko' ? '신규 가입 시 48시간 프리미엄 무료 체험' : '48-Hour Free Premium Trial'}
              </p>
              
            </div>
          </div>
        )}

        {/* 로그인 카드 */}
        <div className="bg-gradient-to-b from-[#1a1a1a] to-[#141414] rounded-3xl p-8 shadow-2xl border border-gray-800/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white text-center mb-2">
            {language === 'ko' ? '로그인 / 회원가입' : 'Sign In / Sign Up'}
          </h2>
          <p className="text-gray-500 text-sm text-center mb-8">
            {language === 'ko' ? '소셜 계정으로 간편하게 시작하세요' : 'Get started with your social account'}
          </p>

          <div className="space-y-3">
            {/* Google 로그인 */}
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
              {language === 'ko' ? 'Google로 계속하기' : 'Continue with Google'}
            </button>

            {/* Naver 로그인 - 검수 통과 후 활성화 */}
            {NAVER_ENABLED && (
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
                {language === 'ko' ? 'Naver로 계속하기' : 'Continue with Naver'}
              </button>
            )}
          </div>

          {/* 프리미엄 혜택 안내 */}
          <div className="mt-6 pt-6 border-t border-gray-800">
              <div className="text-gray-500 text-xs mb-3 text-center tracking-wider">PREMIUM BENEFITS</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-gray-400 bg-[#111] rounded-lg px-3 py-2">
                  <span className="text-green-500">◆</span>
                  {language === 'ko' ? '24시간 선공개' : '24h Early Access'}
                </div>
                <div className="flex items-center gap-2 text-gray-400 bg-[#111] rounded-lg px-3 py-2">
                  <span className="text-green-500">◆</span>
                  {language === 'ko' ? 'PICK 상세분석' : 'PICK Analysis'}
                </div>
                <div className="flex items-center gap-2 text-gray-400 bg-[#111] rounded-lg px-3 py-2">
                  <span className="text-green-500">◆</span>
                  {language === 'ko' ? '광고 제거' : 'Ad-free'}
                </div>
                <div className="flex items-center gap-2 text-gray-400 bg-[#111] rounded-lg px-3 py-2">
                  <span className="text-green-500">◆</span>
                  {language === 'ko' ? '픽 알림' : 'Pick Alerts'}
                </div>
              </div>
            </div>

          {/* 🎫 프로토 계산기 배너 - 한국어만 */}
          {language === 'ko' && (
            <div className="mt-6 pt-6 border-t border-gray-800">
              <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🎫</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-bold text-sm">프로토 계산기</span>
                      <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded">NEW</span>
                    </div>
                    <p className="text-gray-400 text-xs">
                      스포츠토토 배당 계산 & 조합 저장
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 홈으로 */}
        <div className="text-center mt-6">
          <Link href="/" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
            ← {language === 'ko' ? '홈으로' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  )
}