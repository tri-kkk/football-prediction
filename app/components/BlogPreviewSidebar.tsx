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
  
  // 🎡 롤링 설정
  const [currentIndex, setCurrentIndex] = useState(0)
  const DISPLAY_COUNT = 3      // 한 번에 보여줄 개수
  const ROTATE_INTERVAL = 8000 // 8초마다 교체

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      // 최신 9개 (롤링용으로 더 많이)
      const res = await fetch('/api/blog/posts?published=true&limit=9&offset=0')
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

  // 🎡 자동 롤링 효과
  useEffect(() => {
    // 포스트가 3개 이하면 롤링 필요 없음
    if (posts.length <= DISPLAY_COUNT) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + DISPLAY_COUNT
        // 다음 그룹이 없으면 처음으로
        if (nextIndex >= posts.length) {
          return 0
        }
        return nextIndex
      })
    }, ROTATE_INTERVAL)

    return () => clearInterval(interval)
  }, [posts.length])

  // 현재 표시할 포스트들
  const getVisiblePosts = () => {
    if (posts.length <= DISPLAY_COUNT) return posts
    
    const visible = posts.slice(currentIndex, currentIndex + DISPLAY_COUNT)
    // 부족하면 앞에서 채우기 (순환)
    if (visible.length < DISPLAY_COUNT) {
      return [...visible, ...posts.slice(0, DISPLAY_COUNT - visible.length)]
    }
    return visible
  }

  const visiblePosts = getVisiblePosts()

  // 총 그룹 수와 현재 그룹 계산
  const totalGroups = Math.ceil(posts.length / DISPLAY_COUNT)
  const currentGroup = Math.floor(currentIndex / DISPLAY_COUNT)

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📰</span>
            <h3 className={`font-bold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {language === 'ko' ? '매치 리포트' : 'Match Reports'}
            </h3>
          </div>
          
          {/* 🎡 인디케이터 도트 (3개 초과일 때만 표시) */}
          {posts.length > DISPLAY_COUNT && (
            <div className="flex gap-1.5">
              {Array.from({ length: totalGroups }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx * DISPLAY_COUNT)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentGroup
                      ? 'bg-blue-500 w-4'
                      : darkMode 
                        ? 'bg-gray-600 hover:bg-gray-500 w-2' 
                        : 'bg-gray-300 hover:bg-gray-400 w-2'
                  }`}
                  aria-label={`Go to group ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 포스트 목록 */}
      <div className="p-3 space-y-3">
        {visiblePosts.map((post) => (
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
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="280" height="157"><rect width="280" height="157" fill="%23334155"/><text x="50%" y="50%" fill="%239CA3AF" font-size="40" text-anchor="middle" dominant-baseline="middle">⚽</text></svg>'
                    }}
                  />
                </div>
              )}

              {/* 내용 */}
              <div className="p-3">
                {/* 제목 */}
                <h4 className={`text-sm font-bold line-clamp-2 group-hover:text-blue-400 transition ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {getTitle(post)}
                </h4>
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