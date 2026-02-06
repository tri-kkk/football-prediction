'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../../contexts/LanguageContext'

function ResultContent() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const message = searchParams.get('message')
  const amount = searchParams.get('amount')

  const isSuccess = status === 'success'
  const isCancelled = message === '사용자 종료' || message === 'User cancelled'

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        
        {isSuccess ? (
          <>
            
            <h1 className="text-2xl font-bold mb-2">
              {language === 'ko' ? '프리미엄 구독 완료' : 'Premium Activated'}
            </h1>
            <p className="text-gray-500 text-sm mb-8">
              {language === 'ko' 
                ? '지금부터 모든 프리미엄 혜택을 이용할 수 있습니다.' 
                : 'You can now enjoy all premium features.'}
            </p>

            {amount && (
              <div className="bg-[#1a1a1a] rounded-xl p-5 mb-8 text-left">
                <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                  <span className="text-gray-500 text-sm">{language === 'ko' ? '결제금액' : 'Amount'}</span>
                  <span className="font-bold">₩{Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500 text-sm">{language === 'ko' ? '플랜' : 'Plan'}</span>
                  <span className="font-medium text-yellow-400">
                    {Number(amount) >= 9900 
                      ? (language === 'ko' ? '3개월' : 'Quarterly')
                      : (language === 'ko' ? '1개월' : 'Monthly')}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Link href="/premium" className="block w-full py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black rounded-xl font-bold transition-all">
                {language === 'ko' ? '프리미엄 픽 보기' : 'View Premium Picks'}
              </Link>
              <Link href="/" className="block w-full py-3.5 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-800 rounded-xl font-medium transition-colors">
                {language === 'ko' ? '홈으로' : 'Home'}
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">
              {isCancelled
                ? (language === 'ko' ? '결제가 취소되었습니다' : 'Payment Cancelled')
                : (language === 'ko' ? '결제 실패' : 'Payment Failed')}
            </h1>
            <p className="text-gray-500 text-sm mb-8">
              {isCancelled
                ? (language === 'ko' ? '결제를 다시 진행하시려면 아래 버튼을 눌러주세요.' : 'Tap below to try again.')
                : (message || (language === 'ko' ? '결제 처리 중 문제가 발생했습니다.' : 'An error occurred.'))}
            </p>

            <div className="space-y-3">
              <Link href="/premium/pricing" className="block w-full py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black rounded-xl font-bold transition-all">
                {language === 'ko' ? '다시 시도하기' : 'Try Again'}
              </Link>
              <Link href="/" className="block w-full py-3.5 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-800 rounded-xl font-medium transition-colors">
                {language === 'ko' ? '홈으로' : 'Home'}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function PricingResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f0f0f]" />}>
      <ResultContent />
    </Suspense>
  )
}