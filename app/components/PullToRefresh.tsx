'use client'
// app/components/PullToRefresh.tsx
// 당겨서 새로고침 (6안) — 콘텐츠는 이동 안 하고 상단 인디케이터만 노출(레이아웃/fixed 안전).
// 스크롤 최상단에서 아래로 당길 때만 활성. 모바일 전용 제스처.
import { useEffect, useRef, useState } from 'react'

export default function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh?: () => Promise<void> | void
  children?: React.ReactNode
}) {
  const [pull, setPull] = useState(0)       // 0~MAX
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const pullRef = useRef(0)
  const refRef = useRef(false)

  const MAX = 84
  const TRIGGER = 60

  useEffect(() => { pullRef.current = pull }, [pull])
  useEffect(() => { refRef.current = refreshing }, [refreshing])

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      startY.current = (window.scrollY <= 0 && !refRef.current) ? e.touches[0].clientY : null
    }
    const onMove = (e: TouchEvent) => {
      if (startY.current === null || refRef.current) return
      const dy = e.touches[0].clientY - startY.current
      if (dy > 0 && window.scrollY <= 0) {
        setPull(Math.min(dy * 0.5, MAX))
      } else if (pullRef.current !== 0) {
        setPull(0)
      }
    }
    const onEnd = async () => {
      if (startY.current === null) return
      startY.current = null
      if (pullRef.current >= TRIGGER) {
        setRefreshing(true)
        setPull(TRIGGER)
        if (onRefresh) {
          try { await onRefresh() } catch {}
          setTimeout(() => { setRefreshing(false); setPull(0) }, 450)
        } else {
          // 기본 동작: 페이지 새로고침 (전역 사용)
          if (typeof window !== 'undefined') window.location.reload()
        }
      } else {
        setPull(0)
      }
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
  }, [onRefresh])

  const active = pull > 0 || refreshing
  const progress = Math.min(pull / TRIGGER, 1)

  return (
    <>
      <div
        aria-hidden
        className="sm:hidden"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 40,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          transform: `translateY(${(refreshing ? TRIGGER : pull) + 4}px)`,
          opacity: active ? 1 : 0,
          transition: startY.current === null ? 'transform .25s ease, opacity .25s ease' : 'none',
        }}
      >
        <span
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(20,20,20,.92)',
            border: '1px solid rgba(255,255,255,.12)',
            boxShadow: '0 6px 16px rgba(0,0,0,.4)',
            display: 'grid', placeItems: 'center',
          }}
        >
          <svg
            width={18} height={18} viewBox="0 0 24 24" fill="none"
            stroke="#6dff5c" strokeWidth={2.4} strokeLinecap="round"
            style={{
              transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
              animation: refreshing ? 'tsSpin .7s linear infinite' : undefined,
            }}
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            {!refreshing && <path d="M21 4v5h-5" />}
          </svg>
        </span>
      </div>
      {children}
    </>
  )
}
