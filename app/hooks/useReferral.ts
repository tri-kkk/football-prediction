'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

/**
 * 레퍼럴 시스템 훅
 * - 로그인 후 저장된 레퍼럴 코드 적용
 * - 재방문 시 보상 확정 (confirm)
 * 
 * 사용: 메인 페이지나 레이아웃에서 호출
 * ```tsx
 * import { useReferral } from '@/hooks/useReferral'
 * 
 * export default function Page() {
 *   useReferral()
 *   return <div>...</div>
 * }
 * ```
 */
export function useReferral() {
  const { data: session, status } = useSession()
  const hasApplied = useRef(false)
  const hasConfirmed = useRef(false)

  const userId = (session?.user as any)?.id

  useEffect(() => {
    if (status !== 'authenticated' || !userId) return

    // 1. 저장된 레퍼럴 코드 적용 (가입 직후 1회)
    const applyReferral = async () => {
      if (hasApplied.current) return
      
      const refCode = sessionStorage.getItem('referral_code')
      if (!refCode) return

      hasApplied.current = true
      console.log('🎁 레퍼럴 코드 적용 시도:', refCode)

      try {
        const response = await fetch('/api/referral/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refereeId: userId,
            referralCode: refCode
          })
        })

        const data = await response.json()
        
        if (data.success) {
          console.log('✅ 레퍼럴 적용 성공:', data)
          sessionStorage.removeItem('referral_code') // 사용 완료
        } else {
          console.log('⚠️ 레퍼럴 적용 실패:', data.error, data.code)
          // 이미 사용된 코드 등의 경우 제거
          if (data.code === 'ALREADY_REFERRED' || data.code === 'SELF_REFERRAL') {
            sessionStorage.removeItem('referral_code')
          }
        }
      } catch (error) {
        console.error('❌ 레퍼럴 적용 에러:', error)
      }
    }

    // 2. 재방문 시 보상 확정 (매 방문 1회)
    const confirmReferral = async () => {
      if (hasConfirmed.current) return
      hasConfirmed.current = true

      try {
        const response = await fetch('/api/referral/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        })

        const data = await response.json()
        
        if (data.success && data.rewardDaysGiven > 0) {
          console.log('✅ 레퍼럴 보상 확정:', data.rewardDaysGiven, '일')
        }
      } catch (error) {
        // 조용히 실패 (없으면 그냥 넘어감)
      }
    }

    applyReferral()
    confirmReferral()
  }, [status, userId])
}

export default useReferral
