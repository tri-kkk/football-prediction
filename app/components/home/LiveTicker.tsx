'use client'

// 상단 라이브 스코어 티커 — /api/live-matches (축구) 실시간 스코어
// 라이브 경기가 없으면 렌더링하지 않음 (null)

import { useEffect, useState } from 'react'

interface LiveMatch {
  id: number
  league: string
  status: string
  elapsed: number | null
  homeTeam: string
  awayTeam: string
  homeTeamKR?: string
  awayTeamKR?: string
  homeScore: number
  awayScore: number
}

export default function LiveTicker({ locale = 'ko' }: { locale?: string }) {
  const isKo = locale !== 'en'
  const [matches, setMatches] = useState<LiveMatch[]>([])

  useEffect(() => {
    let cancel = false
    const load = async () => {
      try {
        const res = await fetch('/api/live-matches').then((r) => r.json())
        if (!cancel && res?.success && Array.isArray(res.matches)) {
          setMatches(res.matches.slice(0, 12))
        }
      } catch {
        /* noop */
      }
    }
    load()
    const t = setInterval(load, 60_000) // 1분마다 갱신
    return () => {
      cancel = true
      clearInterval(t)
    }
  }, [])

  if (matches.length === 0) return null

  const name = (en: string, kr?: string) => (isKo && kr ? kr : en)

  return (
    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar rounded-xl border border-gray-800 bg-gray-900/60 px-3 py-2">
      <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-red-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
        LIVE
      </span>
      <div className="flex items-center gap-4">
        {matches.map((m) => (
          <a
            key={m.id}
            href={`/${locale}/live`}
            className="flex shrink-0 items-center gap-1.5 text-[12px] text-gray-300 hover:text-white"
          >
            <span className="max-w-[84px] truncate">{name(m.homeTeam, m.homeTeamKR)}</span>
            <span className="font-semibold text-white">
              {m.homeScore}-{m.awayScore}
            </span>
            <span className="max-w-[84px] truncate">{name(m.awayTeam, m.awayTeamKR)}</span>
            {m.elapsed != null && (
              <span className="text-[10px] font-medium text-emerald-400">{m.elapsed}'</span>
            )}
          </a>
        ))}
      </div>
      <a
        href={`/${locale}/live`}
        className="ml-auto shrink-0 text-[11px] text-emerald-400 hover:text-emerald-300"
      >
        {isKo ? '전체 ▸' : 'All ▸'}
      </a>
    </div>
  )
}
