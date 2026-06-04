'use client'

// 강화 히어로 — 톱 뉴스 2~3개 자동 롤링(크로스페이드 + 인디케이터). 시즌 라벨 표시. 이모지 미사용.

import { useEffect, useState } from 'react'
import { seasonLabel } from './season'

interface Article {
  id: string
  title: string
  description: string
  imageUrl: string
  url: string
  source: string
  publishedAt: string
}

const ROTATE_MS = 5500
const MAX_SLIDES = 3

export default function HeroBanner({ locale = 'ko' }: { locale?: string }) {
  const isKo = locale !== 'en'
  const [leads, setLeads] = useState<Article[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    const load = async () => {
      try {
        const res = await fetch(`/api/news?lang=${isKo ? 'ko' : 'en'}`).then((r) => r.json())
        const list: Article[] = res?.articles || []
        const withImg = list.filter((a) => a.imageUrl).slice(0, MAX_SLIDES)
        if (!cancel) setLeads(withImg.length ? withImg : list.slice(0, 1))
      } catch {
        /* noop */
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => {
      cancel = true
    }
  }, [isKo])

  // 자동 롤링
  useEffect(() => {
    if (leads.length <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % leads.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [leads.length])

  if (loading) {
    return <div className="h-full min-h-[230px] w-full animate-pulse rounded-2xl bg-gray-800" />
  }

  if (leads.length === 0) {
    return (
      <a
        href={`/${locale}/news`}
        className="flex h-full min-h-[230px] flex-col justify-end rounded-2xl border border-gray-800 bg-gradient-to-t from-gray-900 to-gray-800 p-5"
      >
        <span className="text-xs text-emerald-400">{isKo ? '오늘의 헤드라인' : "Today's headline"}</span>
        <span className="mt-1 text-2xl font-bold text-white">
          {isKo ? '최신 스포츠 뉴스 보기' : 'See the latest sports news'}
        </span>
      </a>
    )
  }

  return (
    <div className="relative h-full min-h-[230px] overflow-hidden rounded-2xl border border-gray-800">
      {leads.map((lead, i) => (
        <a
          key={lead.id}
          href={lead.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`group absolute inset-0 flex flex-col justify-end transition-opacity duration-700 ${i === idx ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lead.imageUrl}
            alt={lead.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ objectPosition: '50% 25%' }}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
          <div className="relative z-10 p-5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
              {isKo ? '오늘의 헤드라인' : 'Top story'} · {isKo ? '시즌' : 'Season'}: {seasonLabel()}
            </span>
            <h2 className="mt-2 line-clamp-2 text-xl font-bold leading-snug text-white sm:text-2xl">
              {lead.title}
            </h2>
            {lead.description && (
              <p className="mt-1.5 line-clamp-2 text-sm text-gray-300">{lead.description}</p>
            )}
            <span className="mt-2 inline-block text-[11px] text-gray-400">{lead.source}</span>
          </div>
        </a>
      ))}

      {/* 인디케이터 */}
      {leads.length > 1 && (
        <div className="absolute right-3 top-3 z-20 flex gap-1.5">
          {leads.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIdx(i)
              }}
              aria-label={`${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
