'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '../contexts/LanguageContext'

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

interface BlogPreviewSidebarProps {
  darkMode: boolean
}

export default function BlogPreviewSidebar({ darkMode }: BlogPreviewSidebarProps) {
  const { language } = useLanguage()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      // '경기 프리뷰' 카테고리만, 최신 3개
      const res = await fetch('/api/blog/posts?published=true&category=preview&limit=3&offset=0')
      const result = await res.json()
      
      if (result.success && result.data) {
        setPosts(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch blog posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  // 언어에 따른 제목 선택
  const getTitle = (post: BlogPost) => {
    if (language === 'en' && post.title) {
      return post.title
    }
    return post.title_kr || post.title
  }

  if (loading || posts.length === 0) return null

  return (
    <div className={`rounded-2xl overflow-hidden ${
      darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
    }`}>
      {/* 헤더 */}
      <div className={`px-4 py-3 border-b ${
        darkMode ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">📰</span>
          <h3 className={`font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {language === 'ko' ? '매치 리포트' : 'Match Reports'}
          </h3>
        </div>
      </div>

      {/* 포스트 목록 */}
      <div className="p-3 space-y-3">
        {posts.map((post) => (
          <Link 
            key={post.id} 
            href={`/blog/${post.slug}`}
            className="block group"
          >
            <div className={`rounded-xl overflow-hidden transition-all ${
              darkMode 
                ? 'bg-gray-900 hover:bg-gray-800 border border-gray-800' 
                : 'bg-gray-50 hover:bg-gray-100'
            }`}>
              {/* 썸네일 */}
              {post.cover_image && (
                <div className="aspect-video bg-gray-800 relative overflow-hidden">
                  <img 
                    src={post.cover_image} 
                    alt={getTitle(post)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      // 이미지 로드 실패 시 플레이스홀더
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="280" height="157"><rect width="280" height="157" fill="%23334155"/><text x="50%" y="50%" fill="%239CA3AF" font-size="40" text-anchor="middle" dominant-baseline="middle">⚽</text></svg>'
                    }}
                  />
                  {/* 카테고리 배지 */}
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 bg-blue-500/90 backdrop-blur-sm text-white text-xs font-bold rounded-full">
                      {language === 'ko' ? '경기 프리뷰' : 'Preview'}
                    </span>
                  </div>
                </div>
              )}

              {/* 내용 */}
              <div className="p-3">
                {/* 제목 */}
                <h4 className={`text-sm font-bold mb-2 line-clamp-2 group-hover:text-blue-400 transition ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {getTitle(post)}
                </h4>

                {/* 날짜 */}
                <div className={`text-xs ${
                  darkMode ? 'text-slate-400' : 'text-gray-500'
                }`}>
                  📅 {formatDate(post.published_at)}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 더보기 버튼 */}
      <div className="px-3 pb-3">
        <Link 
          href="/blog"
          className={`block w-full py-2 rounded-lg text-center text-sm font-medium transition-all ${
            darkMode 
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {language === 'ko' ? '전체 보기 →' : 'View All →'}
        </Link>
      </div>
    </div>
  )
}