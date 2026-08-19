'use client'

// 헤더 유저 드롭다운용 텔레그램 연동 메뉴 항목 (프리미엄 전용)
// AuthButton 드롭다운의 "구독 관리" 아래에 배치.

import { useEffect, useRef, useState } from 'react'

export default function TelegramMenuItem({ language }: { language: 'ko' | 'en' }) {
  const ko = language === 'ko'
  const [linked, setLinked] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = async () => {
    try {
      const r = await fetch('/api/telegram/link')
      if (!r.ok) return setLinked(false)
      const d = await r.json()
      setLinked(!!d.linked)
    } catch {
      setLinked(false)
    }
  }

  useEffect(() => {
    load()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const connect = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/telegram/link', { method: 'POST' })
      const d = await r.json()
      if (r.ok && d.deepLink) {
        window.open(d.deepLink, '_blank', 'noopener,noreferrer')
        // 텔레그램에서 /start 처리 → 웹훅이 DB 갱신될 때까지 폴링
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
            if (res?.linked) setLinked(true)
          }
        }, 3000)
      } else if (d.error === 'premium_only') {
        alert(ko ? '텔레그램 알림은 프리미엄 전용이에요.' : 'Telegram alerts are premium only.')
      } else {
        alert(ko ? '잠시 후 다시 시도해 주세요.' : 'Please try again later.')
      }
    } catch {
      alert(ko ? '연결에 실패했어요.' : 'Connection failed.')
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      await fetch('/api/telegram/link', { method: 'DELETE' })
      setLinked(false)
    } finally {
      setBusy(false)
    }
  }

  const label = waiting
    ? ko
      ? '연동 대기중…'
      : 'Waiting…'
    : linked
    ? ko
      ? '텔레그램 알림 해제'
      : 'Disconnect Telegram'
    : ko
    ? '텔레그램 알림 받기'
    : 'Get Telegram alerts'

  return (
    <button
      onClick={linked ? disconnect : connect}
      disabled={busy || waiting || linked === null}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-gray-200 hover:bg-white/[0.06] transition-colors disabled:opacity-60"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="#229ED9" className="shrink-0">
        <path d="M9.8 15.6l-.4 4.1c.5 0 .8-.2 1-.5l2.4-2.3 5 3.6c.9.5 1.6.2 1.8-.8l3.3-15.5c.3-1.2-.5-1.7-1.3-1.4L1.2 9.6C0 10 0 10.7 1 11l5 1.6L18.4 5c.6-.4 1.1-.2.7.2z" />
      </svg>
      {label}
    </button>
  )
}
