'use client'

// 프리미엄 설정/마이페이지에 넣는 텔레그램 연동 버튼
//   <TelegramLinkButton />
// - 상태 조회(GET) → 연동/해제 토글
// - 연동 클릭 시 딥링크(POST)를 새 창으로 열고, 완료될 때까지 상태 폴링

import { useCallback, useEffect, useRef, useState } from 'react'

export default function TelegramLinkButton() {
  const [status, setStatus] = useState<{ linked: boolean; tier: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [waiting, setWaiting] = useState(false) // 딥링크 연동 대기중
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/telegram/link')
      if (!r.ok) return
      setStatus(await r.json())
    } catch {
      /* noop */
    }
  }, [])

  useEffect(() => {
    refresh()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [refresh])

  const connect = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/telegram/link', { method: 'POST' })
      const d = await r.json()
      if (r.ok && d.deepLink) {
        window.open(d.deepLink, '_blank', 'noopener,noreferrer')
        // 텔레그램에서 /start 처리 → 웹훅이 DB 갱신될 때까지 폴링
        setWaiting(true)
        let tries = 0
        pollRef.current = setInterval(async () => {
          tries += 1
          await refresh()
          const res = await fetch('/api/telegram/link').then((x) => x.json()).catch(() => null)
          if (res?.linked || tries >= 20) {
            if (pollRef.current) clearInterval(pollRef.current)
            setWaiting(false)
            if (res?.linked) setStatus(res)
          }
        }, 3000)
      } else if (d.error === 'premium_only') {
        alert('텔레그램 알림은 프리미엄 전용 기능이에요.')
      } else {
        alert('잠시 후 다시 시도해 주세요.')
      }
    } catch {
      alert('연결에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  const disconnect = async () => {
    setLoading(true)
    try {
      await fetch('/api/telegram/link', { method: 'DELETE' })
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  if (!status) return null

  const linked = status.linked

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
          style={{ background: '#229ED9' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
            <path d="M9.8 15.6l-.4 4.1c.5 0 .8-.2 1-.5l2.4-2.3 5 3.6c.9.5 1.6.2 1.8-.8l3.3-15.5c.3-1.2-.5-1.7-1.3-1.4L1.2 9.6C0 10 0 10.7 1 11l5 1.6L18.4 5c.6-.4 1.1-.2.7.2z" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">텔레그램 알림</p>
          <p className="text-xs text-gray-400 truncate">
            {waiting
              ? '텔레그램에서 연동을 완료해 주세요…'
              : linked
              ? '경기 전 데일리 AI 픽 리포트를 받고 있어요'
              : '경기 전 AI 강추 픽을 텔레그램으로 받아보세요'}
          </p>
        </div>
      </div>

      {linked ? (
        <button
          onClick={disconnect}
          disabled={loading}
          className="flex-none rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-gray-300 transition hover:bg-white/[0.08] disabled:opacity-50"
        >
          해제
        </button>
      ) : (
        <button
          onClick={connect}
          disabled={loading || waiting}
          className="flex-none rounded-lg px-4 py-2 text-sm font-bold text-white transition disabled:opacity-50"
          style={{ background: '#229ED9' }}
        >
          {waiting ? '연동 대기중' : loading ? '연결중…' : '알림 받기'}
        </button>
      )}
    </div>
  )
}
