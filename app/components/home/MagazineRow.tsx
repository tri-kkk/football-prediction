'use client'

// 매치 리포트 / 매거진 — 컴팩트 카드 그리드 (기존 사이드바형 대체, 최소화 버전)
// /api/blog/posts 최신 글을 작은 카드로.

import { useEffect, useState } from 'react'

interface BlogPost {
  id: number
  slug: string
  title: string
  title_kr: string
  cover_image: string
  published_at: string
  category: string
}

export default function MagazineRow({ locale = 'ko', count = 3 }: { locale?: string; count?: number }) {
  const isKo = locale !== 'en'
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    const load = async () => {
      try {
        const res = await fetch(`/api/blog/posts?published=true&limit=${count}&offset=0`).then((r) =>
          r.json(),
        )
        if (!cancel && res?.success && Array.isArray(res.data)) setPosts(res.data.slice(0, count))
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
  }, [count])

  if (!loading && posts.length === 0) return null

  const title = (p: BlogPost) => (!isKo && p.title ? p.title : p.title_kr || p.title)

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-white">
          {isKo ? '매치 리포트' : 'Match Reports'}
        </h3>
        <a href={`/${locale}/blog`} className="text-[11px] text-emerald-400 hover:text-emerald-300">
          {isKo ? '전체 보기 ▸' : 'View all ▸'}
        </a>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {posts.map((p) => (
            <a
              key={p.id}
              href={`/${locale}/blog/${p.slug}`}
              className="group overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition-colors hover:border-gray-700"
            >
              <div className="aspect-video overflow-hidden bg-gray-800">
                {p.cover_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.cover_image}
                    alt={title(p)}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="p-2.5">
                <p className="line-clamp-2 text-[12px] font-medium leading-snug text-gray-100 group-hover:text-white">
                  {title(p)}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
