'use client'

// 월드컵 하이라이트 — ScoreBat 피드(/api/highlights/worldcup) 기반. 개막 전엔 안내 노출.

import { useEffect, useState } from 'react'

interface WCItem {
  title: string
  competition: string
  thumbnail: string
  matchviewUrl: string
  date: string
  embed: string | null
}

export default function WorldCupHighlights({ language = 'ko' }: { language?: 'ko' | 'en' }) {
  const isKo = language !== 'en'
  const [items, setItems] = useState<WCItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    fetch('/api/highlights/worldcup')
      .then((r) => r.json())
      .then((j) => {
        if (!cancel) setItems(j?.highlights || [])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [])

  if (loading) return null

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1 h-6 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
        <h2 className="text-lg font-black tracking-tight">
          {isKo ? '월드컵 하이라이트' : 'World Cup Highlights'}
        </h2>
        <span className="w-5 h-5 rounded bg-white p-0.5 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://media.api-sports.io/football/leagues/1.png" alt="" className="w-full h-full object-contain" />
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-[#252829] p-6 text-center">
          <p className="text-sm text-gray-300">
            {isKo ? '2026 FIFA 월드컵 개막과 함께 하이라이트가 제공됩니다' : 'Highlights arrive with the 2026 FIFA World Cup'}
          </p>
          <p className="mt-1 text-xs text-gray-500">{isKo ? '개막 2026년 6월 11일' : 'Kicks off Jun 11, 2026'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {items.map((h, i) => (
            <a
              key={i}
              href={h.matchviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-xl border border-gray-800 bg-[#252829] transition-colors hover:border-emerald-500/40"
            >
              <div className="relative aspect-video overflow-hidden bg-gray-800">
                {h.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={h.thumbnail}
                    alt={h.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
              </div>
              <div className="p-2.5">
                <p className="line-clamp-2 text-[12px] font-medium text-gray-100">{h.title}</p>
                <span className="mt-1 block text-[10px] text-gray-500">{h.competition}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
