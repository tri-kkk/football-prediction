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
        <div className="relative z-[100]" ref={dropdownRef}>
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
          />
        )}
      </>
    )
  }

  // 비로그인 상태 - 모바일 최적화
  return (
 <Link
    href="/login"
    className="flex items-center justify-center px-2.5 md:px-4 py-1 md:py-1.5 text-xs md:text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium whitespace-nowrap"
  >
      {language === 'ko' ? '로그인' : 'Login'}
    </Link>
  )
}

// 구독 관리 모달
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
  } | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  // 구독 정보 로드
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch('/api/subscription')
        if (response.ok) {
          const data = await response.json()
          if (data.subscription) {
            setSubscription(data.subscription)
          }
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error)
      }
      setLoadingData(false)
    }
    fetchSubscription()
  }, [])

  // 날짜 포맷
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return language === 'ko'
      ? date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
      : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  // 플랜 표시
  const getPlanDisplay = () => {
    // 프로모션 코드가 있으면 프로모션 표시
    if (promoCode) {
      return language === 'ko' ? '오픈 프로모션' : 'Launch Promo'
    }
    if (subscription?.plan) {
      if (language === 'ko') {
        switch (subscription.plan) {
          case 'monthly': return '1개월'
          case 'yearly': return '1년'
          default: return subscription.plan
        }
      } else {
        switch (subscription.plan) {
          case 'monthly': return 'Monthly'
          case 'yearly': return 'Yearly'
          default: return subscription.plan
        }
      }
    }
    return '-'
  }

  // D-Day 계산
  const getDaysRemaining = () => {
    const expiresAt = subscription?.expiresAt || premiumExpiresAt
    if (!expiresAt) return null
    const expires = new Date(expiresAt)
    const now = new Date()
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  const daysRemaining = getDaysRemaining()
  
  // 만료일 - 세션 데이터 또는 subscription 데이터 사용
  const expiresAt = subscription?.expiresAt || premiumExpiresAt
  const startedAt = subscription?.startedAt

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 모달 */}
      <div className="relative bg-[#1a1a1a] border border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        {loadingData ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
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
            
            {/* 남은 기간 강조 */}
            {daysRemaining !== null && daysRemaining > 0 && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 mb-4 text-center">
                <div className="text-yellow-400 text-sm mb-1">
                  {language === 'ko' ? '남은 기간' : 'Days Remaining'}
                </div>
                <div className="text-white text-3xl font-bold">
                  {daysRemaining}{language === 'ko' ? '일' : ' days'}
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
            
            {/* 구독 정보 */}
            <div className="bg-black/30 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{language === 'ko' ? '이용권' : 'Plan'}</span>
                <span className="text-white">{getPlanDisplay()}</span>
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
              {daysRemaining !== null && daysRemaining <= 7 && (
                <Link
                  href="/premium/pricing"
                  onClick={onClose}
                  className="block w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-xl text-sm font-bold text-center transition-all"
                >
                  {language === 'ko' ? '이용권 연장하기' : 'Extend Pass'}
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

// 회원 탈퇴 모달
function DeleteAccountModal({
  onClose,
  language
}: {
  onClose: () => void
  language: 'ko' | 'en'
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  
  const requiredText = language === 'ko' ? '탈퇴' : 'DELETE'
  const isConfirmed = confirmText === requiredText

  const handleDelete = async () => {
    if (!isConfirmed) return
    
    setIsDeleting(true)
    
    try {
      const response = await fetch('/api/user/delete', {
        method: 'POST',
      })
      
      if (response.ok) {
        // 성공 - 로그아웃 처리
        alert(language === 'ko' 
          ? '회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.' 
          : 'Account deleted. Thank you for using our service.')
        window.location.href = '/api/auth/signout?callbackUrl=/'
      } else {
        const data = await response.json()
        alert(data.error || (language === 'ko' ? '탈퇴 처리 중 오류가 발생했습니다.' : 'Error deleting account.'))
        setIsDeleting(false)
      }
    } catch (error) {
      console.error('Delete error:', error)
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