// 🔥 매치 리포트 가로 행 — 통합 홈 중앙 삽입용
// 기존 BlogPreviewSidebar 와 같은 데이터 사용, 가로 카드 3개로 표시
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../contexts/LanguageContext'

interface BlogPost {
  id: number
  slug: string
  title: string
  title_kr: string
  excerpt: string
  excerpt_en: string | null
  cover_image: string
  published_at: string
  category: string
}

export default function MatchReportsRow() {
  const { language } = useLanguage()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/blog/posts?published=true&limit=6&offset=0')
        if (!res.ok) throw new Error('blog fetch failed')
        const json = await res.json()
        // /api/blog/posts 응답 형태: { success, data: [...], count }
        const list =
          (Array.isArray(json?.data) && json.data) ||
          (Array.isArray(json?.posts) && json.posts) ||
          (Array.isArray(json) && json) ||
          []
        if (!cancelled) setPosts(list)
      } catch {
        if (!cancelled) setPosts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl bg-gray-900/40 border border-gray-800 h-32 animate-pulse" />
    )
  }
  if (posts.length === 0) return null

  // 상위 3개 표시
  const display = posts.slice(0, 3)

  return (
    <section className="space-y-3 my-2">
      <header className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="text-base">📰</span>
          매치 리포트
        </h3>
        <Link
          href="/blog"
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          전체 보기 →
        </Link>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {display.map((post) => {
          const title = language === 'ko' ? post.title_kr || post.title : post.title
          const excerpt = language === 'ko' ? post.excerpt : post.excerpt_en || post.excerpt
          return (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group block rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 overflow-hidden transition-all"
            >
              {post.cover_image ? (
                <div className="relative aspect-[16/9] bg-gray-950 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.cover_image}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    loading="lazy"
                  />
                  {post.category && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-bold uppercase">
                      {post.category}
                    </span>
                  )}
                </div>
              ) : (
                <div className="aspect-[16/9] bg-gradient-to-br from-indigo-900/40 to-gray-900 flex items-center justify-center text-gray-700 text-3xl">
                  📊
                </div>
              )}
              <div className="p-3">
                <h4 className="text-sm font-bold text-gray-100 leading-snug line-clamp-2 group-hover:text-white">
                  {title}
                </h4>
                {excerpt && (
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2 leading-snug">
                    {excerpt}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
