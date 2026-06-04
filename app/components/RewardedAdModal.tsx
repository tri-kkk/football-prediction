'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import AdSenseAd from './AdSenseAd'

// =====================================================
// 광고 시청 후 보상 모달
// - 카운트다운 동안 닫기 비활성
// - 카운트다운 종료 후 X 활성 → 닫으면 onComplete 콜백
// - createPortal로 document.body에 렌더 (ancestor transform 회피)
// =====================================================

interface RewardedAdModalProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
  countdownSec?: number
  title?: string
  subtitle?: string
  rewardLabel?: string
}

export default function RewardedAdModal({
  open,
  onClose,
  onComplete,
  countdownSec = 15,
  title = '광고 시청 후 잠금 해제',
  subtitle = '아래 광고를 보시면 오늘 하루 야구 조합 분석이 무료로 풀립니다.',
  rewardLabel = '오늘의 조합 분석 잠금 해제',
}: RewardedAdModalProps) {
  const [mounted, setMounted] = useState(false)
  const [remaining, setRemaining] = useState(countdownSec)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // open 시 카운트다운 리셋
  useEffect(() => {
    if (!open) return
    setRemaining(countdownSec)
    setCompleted(false)
  }, [open, countdownSec])

  // 1초 인터벌 카운트다운
  useEffect(() => {
    if (!open) return
    if (remaining <= 0) return
    const t = setTimeout(() => setRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearTimeout(t)
  }, [open, remaining])

  // 카운트다운 종료 → completed
  useEffect(() => {
    if (open && remaining === 0 && !completed) {
      setCompleted(true)
    }
  }, [open, remaining, completed])

  // body 스크롤 잠금
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  const handleClose = () => {
    if (!completed) return
    onComplete()
    onClose()
  }

  if (!mounted || !open) return null

  const node = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
      style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rewarded-ad-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.1)',
        }}
      >
        {/* 헤더 */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 id="rewarded-ad-title" className="text-[15px] font-black text-white mb-1">
                {title}
              </h3>
              <p className="text-[12px] text-gray-400 leading-relaxed">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={!completed}
              aria-label="닫기"
              className={[
                'shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold transition-all',
                completed
                  ? 'bg-emerald-500 text-white hover:bg-emerald-400 cursor-pointer'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed',
              ].join(' ')}
              title={completed ? '잠금 해제하기' : `${remaining}초 후 닫기 가능`}
            >
              {completed ? '✓' : remaining}
            </button>
          </div>
        </div>

        {/* 광고 영역 */}
        <div className="px-4 py-4 bg-[#0f0f0f]">
          <AdSenseAd slot="in_article" darkMode />
        </div>

        {/* 푸터 */}
        <div className="px-5 py-4 border-t border-gray-800">
          {completed ? (
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 rounded-xl text-[13px] font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 18px rgba(16,185,129,0.35)',
              }}
            >
              {rewardLabel}
            </button>
          ) : (
            <div className="text-center">
              <div className="text-[11px] text-gray-500 mb-2">
                광고 시청 중 · <span className="text-emerald-400 font-bold">{remaining}초</span> 후 잠금 해제
              </div>
              <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${((countdownSec - remaining) / countdownSec) * 100}%`,
                    background: 'linear-gradient(90deg, #10b981, #34d399)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
