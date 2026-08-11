'use client'

// 프리미엄 페이지 상단 안내 배너
// - 프리미엄 & 미연동 유저에게만 노출 (연동/닫음 시 사라짐)
// - /premium 페이지에서만 표시 (pricing 등 하위 경로 제외)
// - 닫으면 7일간 숨김

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'

const DISMISS_KEY = 'ts_tg_promo_dismissed_at'
const DISMISS_DAYS = 7

export default function TelegramPromoBanner() {
  const pathname = usePathname() || ''
  const { language } = useLanguage()
  const ko = language === 'ko'

  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const onPremium = pathname.endsWith('/premium')

  useEffect(() => {
    if (!onPremium) {
      setShow(false)
      return
    }
    // 최근 닫음 여부
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || '0')
      if (at && Date.now() - at < DISMISS_DAYS * 86400000) {
        setShow(false)
        return
      }
    } catch {
      /* noop */
    }
    // 프리미엄 & 미연동일 때만
    let cancel = false
    fetch('/api/telegram/link')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancel || !d) return
        setShow(d.tier === 'premium' && !d.linked)
      })
      .catch(() => {})
    return () => {
      cancel = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [onPremium, pathname])

  const connect = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/telegram/link', { method: 'POST' })
      const d = await r.json()
      if (r.ok && d.deepLink) {
        window.open(d.deepLink, '_blank', 'noopener,noreferrer')
        setWaiting(true)
        let n = 0
        pollRef.current = setInterval(async () => {
          n += 1
          const res = await fetch('/api/telegram/link')
            .then((x) => x.json())
            .catch(() => null)
          if (res?.linked || n >= 20) {
            if (pollRef.current) clearInterval(pollRef.current)
            setWaiting(false)
            if (res?.linked) setShow(false)
          }
        }, 3000)
      } else {
        alert(ko ? '잠시 후 다시 시도해 주세요.' : 'Please try again later.')
      }
    } catch {
      alert(ko ? '연결에 실패했어요.' : 'Connection failed.')
    } finally {
      setBusy(false)
    }
  }

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* noop */
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <div
        className="relative flex items-center gap-3 rounded-2xl border p-3.5 md:p-4"
        style={{
          borderColor: 'rgba(34,158,217,0.35)',
          background:
            'linear-gradient(90deg, rgba(34,158,217,0.14) 0%, rgba(16,185,129,0.08) 100%)',
        }}
      >
        {/* 텔레그램 아이콘 */}
        <span
          className="hidden sm:flex h-10 w-10 flex-none items-center justify-center rounded-full"
          style={{ background: '#229ED9' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
            <path d="M9.8 15.6l-.4 4.1c.5 0 .8-.2 1-.5l2.4-2.3 5 3.6c.9.5 1.6.2 1.8-.8l3.3-15.5c.3-1.2-.5-1.7-1.3-1.4L1.2 9.6C0 10 0 10.7 1 11l5 1.6L18.4 5c.6-.4 1.1-.2.7.2z" />
          </svg>
        </span>

        <div className="flex-1 min-w-0 pr-6">
          <p className="text-sm md:text-base font-extrabold text-white leading-tight">
            {ko
              ? '경기 전, 오늘의 AI 픽을 텔레그램으로'
              : 'Today’s AI picks on Telegram, before kickoff'}
          </p>
          <p className="text-xs md:text-sm text-gray-300 mt-0.5 truncate">
            {ko
              ? '프리미엄 전용 · 축구·야구 강추 PICK + 최근 적중률'
              : 'Premium only · football & baseball top picks + recent hit rate'}
          </p>
        </div>

        <button
          onClick={connect}
          disabled={busy || waiting}
          className="flex-none rounded-lg px-3.5 md:px-4 py-2 text-xs md:text-sm font-bold text-white transition disabled:opacity-60 whitespace-nowrap"
          style={{ background: '#229ED9' }}
        >
          {waiting
            ? ko
              ? '연동 대기중…'
              : 'Waiting…'
            : busy
            ? ko
              ? '연결중…'
              : 'Connecting…'
            : ko
            ? '텔레그램 연동'
            : 'Connect'}
        </button>

        {/* 닫기 */}
        <button
          onClick={dismiss}
          aria-label={ko ? '닫기' : 'Dismiss'}
          className="absolute right-2 top-2 h-6 w-6 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
