'use client'

// 종합 뉴스 — /api/news. 히어로(0번) 제외 후 전체 폭 카드 그리드(2/3/4열).

import { useEffect, useState } from 'react'

interface Article {
  id: string
  title: string
  description: string
  imageUrl: string
  url: string
  source: string
  publishedAt: string
}

export default function NewsGrid({ locale = 'ko', count = 8 }: { locale?: string; count?: number }) {
  const isKo = locale !== 'en'
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    const load = async () => {
      try {
        const res = await fetch(`/api/news?lang=${isKo ? 'ko' : 'en'}`).then((r) => r.json())
        const list: Article[] = res?.articles || []
        if (!cancel) setArticles(list.slice(1, 1 + count))
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
  }, [isKo, count])

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{isKo ? '종합 뉴스' : 'Sports news'}</h3>
        <a href={`/${locale}/news`} className="text-[11px] text-emerald-400 hover:text-emerald-300">
          {isKo ? '더보기 ▸' : 'More ▸'}
        </a>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-gray-800" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-500">
          {isKo ? '뉴스를 불러오는 중입니다' : 'No news available'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {articles.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition-colors hover:border-gray-700"
            >
              <div className="aspect-video overflow-hidden bg-gray-800">
                {a.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.imageUrl}
                    alt={a.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col p-2.5">
                <p className="line-clamp-2 text-[12px] font-medium leading-snug text-gray-100 group-hover:text-white">
                  {a.title}
                </p>
                <span className="mt-auto pt-1.5 text-[10px] text-gray-500">{a.source}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
