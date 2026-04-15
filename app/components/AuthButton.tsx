'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

export default function AuthButton() {
  const { data: session, status } = useSession()
  const { language } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setIsLoading(true)
    await signOut({ callbackUrl: '/' })
  }

  // 로딩 중
  if (status === 'loading') {
    return (
      <div className="w-16 md:w-20 h-7 md:h-8 bg-gray-700 rounded-lg animate-pulse" />
    )
  }

  // 로그인 상태
  if (session?.user) {
    const isPremium = (session.user as any).tier === 'premium'
    const userEmail = session.user.email || ''
    const userName = session.user.name || userEmail.split('@')[0]
    const premiumExpiresAt = (session.user as any).premium_expires_at
    const promoCode = (session.user as any).promo_code

    return (
      <>
        <div className="relative z-[100] flex items-center gap-1.5 md:gap-2" ref={dropdownRef}>
          {/* 🔥 무료 회원 전용: 프리미엄 구독 버튼 (헤더에 바로 노출) */}
          {!isPremium && (
            <Link
              href="/premium/pricing"
              className="flex items-center gap-1 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-lg font-bold text-[11px] md:text-xs text-white transition-all shadow-md hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              }}
            >
              <span className="hidden md:inline">💎</span>
              <span>{language === 'ko' ? '프리미엄 구독' : 'Go Premium'}</span>
            </Link>
          )}

          {/* 프로필 버튼 - 모바일 최적화 */}
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {/* 티어 배지 */}
            <span className={`px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-bold rounded ${
              isPremium
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-600 text-gray-200'
            }`}>
              {isPremium ? 'PRO' : 'FREE'}
            </span>

            {/* 화살표 */}
            <svg
              className={`w-3 h-3 md:w-4 md:h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 드롭다운 메뉴 */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-44 md:w-48 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-[100] overflow-hidden">
              {/* 유저 정보 */}
              <div className="px-3 md:px-4 py-2.5 md:py-3 border-b border-gray-700">
                <div className="text-white text-xs md:text-sm font-medium truncate">{userName}</div>
                <div className="text-gray-500 text-[10px] md:text-xs truncate">{userEmail}</div>
              </div>
              
              {/* 메뉴 항목 */}
              <div className="py-1">
                {/* 프로토 계산기 - 한국어만 */}
                {language === 'ko' && (
                  <Link
                    href="/proto"
                    onClick={() => setShowDropdown(false)}
                    className="block px-3 md:px-4 py-2 text-xs md:text-sm text-gray-300 hover:bg-gray-800"
                  >
                    <span className="mr-2">🎫</span>
                    프로토 계산기
                  </Link>
                )}
                
                {isPremium && (
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      setShowModal(true)
                    }}
                    className="w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                  >
                    <span className="text-yellow-400">💎</span>
                    {language === 'ko' ? '구독 관리' : 'Manage Subscription'}
                  </button>
                )}
                
                {!isPremium && (
                  <Link
                    href="/premium/pricing"
                    onClick={() => setShowDropdown(false)}
                    className="block px-3 md:px-4 py-2 text-xs md:text-sm text-yellow-400 hover:bg-gray-800"
                  >
                    {language === 'ko' ? '프리미엄 구독하기' : 'Subscribe to Premium'}
                  </Link>
                )}
                
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400"
                >
                  {isLoading 
                    ? (language === 'ko' ? '로그아웃 중...' : 'Signing out...') 
                    : (language === 'ko' ? '로그아웃' : 'Sign out')}
                </button>
                
                <div className="border-t border-gray-700 my-1"></div>
                
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    setShowDeleteModal(true)
                  }}
                  className="w-full px-3 md:px-4 py-2 text-left text-[10px] md:text-xs text-gray-500 hover:bg-gray-800 hover:text-red-400"
                >
                  {language === 'ko' ? '회원 탈퇴' : 'Delete Account'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 구독 관리 모달 */}
        {showModal && (
          <SubscriptionModal 
            onClose={() => setShowModal(false)} 
            userEmail={userEmail}
            language={language}
            premiumExpiresAt={premiumExpiresAt}
            promoCode={promoCode}
          />
        )}
        
        {/* 회원 탈퇴 모달 */}
        {showDeleteModal && (
          <DeleteAccountModal
            onClose={() => setShowDeleteModal(false)}
            language={language}
            userEmail={userEmail}
          />
        )}
      </>
    )
  }

  // 비로그인 상태 - 모바일 최적화
  return (
    <div className="flex items-center gap-1.5 md:gap-2">
      <Link
        href="/login"
        className="flex items-center justify-center px-2.5 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium whitespace-nowrap"
      >
        {language === 'ko' ? '로그인' : 'Login'}
      </Link>
    </div>
  )
}

/**
 * ✅ 수정된 구독 관리 모달
 * - API에서 구독 정보 조회 ✅
 * - 구독기간 정확히 표시 ✅
 * - 에러 처리 개선 ✅
 */
function SubscriptionModal({ 
  onClose, 
  userEmail,
  language,
  premiumExpiresAt,
  promoCode
}: { 
  onClose: () => void
  userEmail: string
  language: 'ko' | 'en'
  premiumExpiresAt?: string
  promoCode?: string
}) {
  const [subscription, setSubscription] = useState<{
    plan: string
    status: string
    startedAt: string | null
    expiresAt: string | null
    tier?: string
    daysRemaining?: number | null
  } | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ✅ 구독 정보 로드 (개선됨)
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setLoadingData(true)
        setError(null)
        
        console.log('🔍 구독 정보 조회:', userEmail)
        
        // ✅ API 호출
        const response = await fetch(
          `/api/subscription?email=${encodeURIComponent(userEmail)}`
        )
        
        const data = await response.json()
        
        if (response.ok) {
          console.log('✅ 구독 정보 조회 성공:', data)
          setSubscription(data)
        } else {
          console.error('❌ API 응답 실패:', data)
          throw new Error(data.error || 'Failed to fetch subscription')
        }
        
      } catch (err) {
        console.error('⚠️ 구독 조회 에러:', err)
        
        // ❌ Fallback: 세션 정보 사용
        const daysRemaining = premiumExpiresAt 
          ? calculateDaysRemaining(premiumExpiresAt) 
          : null
          
        setSubscription({
          plan: 'Premium',
          status: 'active',
          startedAt: null,
          expiresAt: premiumExpiresAt || null,
          tier: 'premium',
          daysRemaining
        })
        
        setError(language === 'ko' 
          ? '구독 정보를 불러올 수 없습니다' 
          : 'Failed to load subscription info')
      } finally {
        setLoadingData(false)
      }
    }
    
    fetchSubscription()
  }, [userEmail, premiumExpiresAt, language])

  // ✅ 날짜 포맷팅
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return language === 'ko' ? '정보 없음' : 'N/A'
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return language === 'ko' ? '정보 없음' : 'N/A'
      
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Seoul'
      }
      return date.toLocaleDateString(
        language === 'ko' ? 'ko-KR' : 'en-US',
        options
      )
    } catch {
      return language === 'ko' ? '정보 없음' : 'N/A'
    }
  }

  // ✅ 플랜 표시
  const getPlanDisplay = (): string => {
    if (!subscription) return '-'
    
    const planType = subscription.plan.toLowerCase().includes('yearly') 
      ? 'yearly' 
      : 'monthly'
    
    if (language === 'ko') {
      return planType === 'yearly' ? '연간 이용권' : '월간 이용권'
    } else {
      return planType === 'yearly' ? 'Yearly Plan' : 'Monthly Plan'
    }
  }

  // ✅ 남은 일수 계산
  const calculateDaysRemaining = (expiresAt: string | null): number | null => {
    if (!expiresAt) return null
    
    try {
      const expireDate = new Date(expiresAt)
      const today = new Date()
      
      today.setHours(0, 0, 0, 0)
      expireDate.setHours(0, 0, 0, 0)
      
      const diffTime = expireDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return diffDays
    } catch {
      return null
    }
  }

  const daysRemaining = subscription?.daysRemaining 
    ?? calculateDaysRemaining(subscription?.expiresAt || null)
  const startedAt = subscription?.startedAt || null
  const expiresAt = subscription?.expiresAt || null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 모달 */}
      <div className="relative bg-[#1a1a1a] border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
        {loadingData ? (
          // 로딩 상태
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-400 text-sm">{language === 'ko' ? '로딩 중...' : 'Loading...'}</div>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="text-center mb-6">
              <div className="text-3xl mb-2">💎</div>
              <h2 className="text-white font-bold text-xl">
                {language === 'ko' ? '프리미엄 이용권' : 'Premium Pass'}
              </h2>
              {promoCode && (
                <div className="inline-block mt-2 px-3 py-1 bg-green-500/20 rounded-full">
                  <span className="text-green-400 text-xs font-bold">{promoCode}</span>
                </div>
              )}
            </div>
            
            {/* 에러 메시지 */}
            {error && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-3 mb-4">
                <div className="text-yellow-400 text-xs">{error}</div>
              </div>
            )}
            
            {/* 남은 기간 강조 */}
            {daysRemaining !== null && daysRemaining > 0 && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 mb-4 text-center">
                <div className="text-yellow-400 text-sm mb-1">
                  {language === 'ko' ? '남은 기간' : 'Days Remaining'}
                </div>
                <div className="text-white text-3xl font-bold">
                  {daysRemaining}{language === 'ko' ? '일' : ' days'}
                </div>
                <div className="text-gray-400 text-xs mt-2">
                  {language === 'ko' ? '만료일: ' : 'Expires: '}{formatDate(expiresAt)}
                </div>
              </div>
            )}

            {daysRemaining === 0 && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-4 text-center">
                <div className="text-red-400 text-sm font-medium">
                  {language === 'ko' ? '이용권이 만료되었습니다' : 'Your pass has expired'}
                </div>
              </div>
            )}

            {daysRemaining !== null && daysRemaining < 0 && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-4 text-center">
                <div className="text-red-400 text-sm font-medium">
                  {language === 'ko' ? '이용권이 만료되었습니다' : 'Your pass has expired'}
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  {language === 'ko' ? `${Math.abs(daysRemaining)}일 전에 만료됨` : `Expired ${Math.abs(daysRemaining)} days ago`}
                </div>
              </div>
            )}
            
            {/* 구독 정보 */}
            <div className="bg-black/30 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{language === 'ko' ? '이용권' : 'Plan'}</span>
                <span className="text-white">{getPlanDisplay()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{language === 'ko' ? '상태' : 'Status'}</span>
                <span className="text-white capitalize">{subscription?.status || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{language === 'ko' ? '시작일' : 'Started'}</span>
                <span className="text-white">{formatDate(startedAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{language === 'ko' ? '만료일' : 'Expires'}</span>
                <span className="text-white">{formatDate(expiresAt)}</span>
              </div>
            </div>
            
            {/* 버튼 */}
            <div className="space-y-3">
              {daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0 && (
                <Link
                  href="/premium/pricing"
                  onClick={onClose}
                  className="block w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-xl text-sm font-bold text-center transition-all"
                >
                  {language === 'ko' ? '이용권 연장하기' : 'Extend Pass'}
                </Link>
              )}
              {(daysRemaining === null || daysRemaining <= 0) && (
                <Link
                  href="/premium/pricing"
                  onClick={onClose}
                  className="block w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-xl text-sm font-bold text-center transition-all"
                >
                  {language === 'ko' ? '이용권 구매하기' : 'Buy Pass'}
                </Link>
              )}
              <button
                onClick={onClose}
                className="w-full py-3 text-gray-400 hover:text-white rounded-xl text-sm transition-colors"
              >
                {language === 'ko' ? '닫기' : 'Close'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * ✅ 회원 탈퇴 모달
 */
function DeleteAccountModal({
  onClose,
  language,
  userEmail
}: {
  onClose: () => void
  language: 'ko' | 'en'
  userEmail: string
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  
  const requiredText = language === 'ko' ? '탈퇴' : 'DELETE'
  const isConfirmed = confirmText === requiredText

  const handleDelete = async () => {
    if (!isConfirmed) return
    
    setIsDeleting(true)
    
    try {
      console.log('🔍 탈퇴 시작:', userEmail)
      
      // ✅ 이메일과 함께 요청
      const response = await fetch('/api/user/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
      })
      
      const data = await response.json()
      
      console.log('📊 응답:', data)
      
      if (response.ok) {
        // 성공 - 로그아웃 처리
        alert(language === 'ko' 
          ? '회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.' 
          : 'Account deleted. Thank you for using our service.')
        
        // NextAuth signOut 사용
        await signOut({ redirect: true, callbackUrl: '/' })
      } else {
        console.error('❌ Delete failed:', data)
        alert(data.error || (language === 'ko' ? '탈퇴 처리 중 오류가 발생했습니다.' : 'Error deleting account.'))
        setIsDeleting(false)
      }
    } catch (error) {
      console.error('❌ Delete error:', error)
      alert(language === 'ko' ? '서버 오류가 발생했습니다.' : 'Server error.')
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 모달 */}
      <div className="relative bg-[#1a1a1a] border border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-white font-bold text-xl">
            {language === 'ko' ? '회원 탈퇴' : 'Delete Account'}
          </h2>
        </div>
        
        {/* 경고 */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <ul className="text-red-400 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span>•</span>
              {language === 'ko' 
                ? '모든 데이터가 영구적으로 삭제됩니다.' 
                : 'All data will be permanently deleted.'}
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              {language === 'ko' 
                ? '삭제된 데이터는 복구할 수 없습니다.' 
                : 'Deleted data cannot be recovered.'}
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              {language === 'ko'
                ? '재가입 시 프로모션 혜택이 적용되지 않습니다.'
                : 'Promo benefits will not apply on re-signup.'}
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              {language === 'ko'
                ? '탈퇴 후 7일간 재가입이 제한됩니다.'
                : 'Re-registration is restricted for 7 days after deletion.'}
            </li>
          </ul>
        </div>
        
        {/* 확인 입력 */}
        <div className="mb-6">
          <label className="text-gray-400 text-sm block mb-2">
            {language === 'ko' 
              ? `탈퇴를 확인하려면 "${requiredText}"를 입력하세요` 
              : `Type "${requiredText}" to confirm`}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-white text-center focus:outline-none focus:border-red-500"
            placeholder={requiredText}
            disabled={isDeleting}
          />
        </div>
        
        {/* 버튼 */}
        <div className="space-y-3">
          <button
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              isConfirmed && !isDeleting
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isDeleting 
              ? (language === 'ko' ? '처리 중...' : 'Processing...') 
              : (language === 'ko' ? '회원 탈퇴' : 'Delete Account')}
          </button>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-full py-3 text-gray-400 hover:text-white rounded-xl text-sm transition-colors"
          >
            {language === 'ko' ? '취소' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}