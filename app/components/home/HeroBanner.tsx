'use client'

// 강화 히어로 — 데스크탑: 톱 뉴스 2~3개 자동 롤링(크로스페이드 + 인디케이터).
// 모바일: 롤링 끄고 단일 정적 히어로(겹침 잔상·인디케이터 제거). 시즌 라벨 표시. 이모지 미사용.

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
  const [isDesktop, setIsDesktop] = useState(false)

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

  // 데스크탑 여부 (640px 이상)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // 자동 롤링 — 데스크탑에서만
  useEffect(() => {
    if (!isDesktop || leads.length <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % leads.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [isDesktop, leads.length])

  // 모바일로 전환되면 첫 슬라이드로 고정
  useEffect(() => {
    if (!isDesktop) setIdx(0)
  }, [isDesktop])

  if (loading) {
    return <div className="h-full min-h-[170px] w-full animate-pulse rounded-2xl bg-gray-800 sm:min-h-[230px]" />
  }

  if (leads.length === 0) {
    return (
      <a
        href={`/${locale}/news`}
        className="flex h-full min-h-[170px] flex-col justify-end rounded-2xl border border-gray-800 bg-gradient-to-t from-gray-900 to-gray-800 p-4 sm:min-h-[230px] sm:p-5"
      >
        <span className="text-xs text-emerald-400">{isKo ? '오늘의 헤드라인' : "Today's headline"}</span>
        <span className="mt-1 text-lg font-bold text-white sm:text-2xl">
          {isKo ? '최신 스포츠 뉴스 보기' : 'See the latest sports news'}
        </span>
      </a>
    )
  }

  // 모바일은 첫 슬라이드만 렌더(겹침 없음), 데스크탑은 전체 스택 크로스페이드
  const slides = isDesktop ? leads : leads.slice(0, 1)

  return (
    <div className="relative h-full min-h-[170px] overflow-hidden rounded-2xl border border-gray-800 sm:min-h-[230px]">
      {slides.map((lead, i) => (
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/5" />
          <div className="relative z-10 p-4 sm:p-5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/30 sm:px-2.5 sm:py-1 sm:text-[11px]">
              {isKo ? '오늘의 헤드라인' : 'Top story'} · {isKo ? '시즌' : 'Season'}: {seasonLabel()}
            </span>
            <h2 className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug text-white sm:mt-2 sm:text-2xl">
              {lead.title}
            </h2>
            {lead.description && (
              <p className="mt-1 hidden line-clamp-2 text-sm text-gray-300 sm:block">{lead.description}</p>
            )}
            <span className="mt-1.5 inline-block text-[10px] text-gray-400 sm:mt-2 sm:text-[11px]">{lead.source}</span>
          </div>
        </a>
      ))}

      {/* 인디케이터 — 데스크탑에서만, 하단 가운데 작은 점 */}
      {isDesktop && leads.length > 1 && (
        <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
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
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
