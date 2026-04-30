'use client'

import { useState, useEffect, useCallback } from 'react'
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

interface MobileMatchReportsProps {
  darkMode: boolean
  autoSlideInterval?: number // ms, default 4000
}

export default function MobileMatchReports({ darkMode, autoSlideInterval = 4000 }: MobileMatchReportsProps) {
  const { language } = useLanguage()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      // 롤링을 위해 더 많은 포스트 가져오기 (최대 10개)
      const res = await fetch('/api/blog/posts?published=true&limit=10&offset=0')
      const result = await res.json()
      
      if (result.success && result.data) {
        setPosts(result.data)
        // 🎲 랜덤 시작 위치 설정
        if (result.data.length > 2) {
          const maxStartIndex = Math.max(0, result.data.length - 2)
          setCurrentIndex(Math.floor(Math.random() * (maxStartIndex + 1)))
        }
      }
    } catch (error) {
      console.error('Failed to fetch blog posts:', error)
    } finally {
      setLoading(false)
    }
  }

  // 자동 롤링
  useEffect(() => {
    if (posts.length <= 2 || isPaused) return

    const timer = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(prev => {
          // 2개씩 보여주므로, 마지막 2개 전까지만 이동
          const maxIndex = Math.max(0, posts.length - 2)
          return prev >= maxIndex ? 0 : prev + 1
        })
        setIsTransitioning(false)
      }, 300)
    }, autoSlideInterval)

    return () => clearInterval(timer)
  }, [posts.length, autoSlideInterval, isPaused])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}.${day}`
  }

  const getTitle = (post: BlogPost) => {
    if (language === 'en' && post.title) {
      return post.title
    }
    return post.title_kr || post.title
  }

  const getCategoryStyle = (category: string) => {
    const cat = category?.toLowerCase().trim()
    if (cat === 'preview') {
      return 'bg-gradient-to-r from-rose-500 to-pink-500'
    } else if (cat === 'weekly') {
      return 'bg-gradient-to-r from-amber-500 to-orange-500'
    } else if (cat === 'news') {
      return 'bg-green-500'
    }
    return 'bg-gray-500'
  }

  const getCategoryLabel = (category: string) => {
    const cat = category?.toLowerCase().trim()
    if (language === 'ko') {
      if (cat === 'preview') return '프리뷰'
      if (cat === 'weekly') return '주간'
      if (cat === 'news') return '뉴스'
      return category
    } else {
      if (cat === 'preview') return 'Preview'
      if (cat === 'weekly') return 'Weekly'
      if (cat === 'news') return 'News'
      return category
    }
  }

  // 현재 보여줄 2개의 포스트
  const visiblePosts = posts.slice(currentIndex, currentIndex + 2)
  // 만약 끝에서 1개만 남았다면 처음 것을 추가
  if (visiblePosts.length === 1 && posts.length > 1) {
    visiblePosts.push(posts[0])
  }

  if (loading) {
    return (
      <div className={`rounded-xl p-3 mb-3 ${darkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-base">📰</span>
            <h2 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {language === 'ko' ? '매치 리포트' : 'Match Reports'}
            </h2>
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div 
              key={i}
              className={`h-10 rounded-lg animate-pulse ${
                darkMode ? 'bg-gray-800' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    )
  }

  if (posts.length === 0) return null

  return (
    <div 
      className={`rounded-xl overflow-hidden mb-3 ${
        darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
      }`}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 헤더 */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b ${
        darkMode ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <span className="text-base">📰</span>
          <h2 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {language === 'ko' ? '매치 리포트' : 'Match Reports'}
          </h2>
        </div>
        <Link 
          href="/blog"
          className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
        >
          {language === 'ko' ? '전체보기 →' : 'View All →'}
        </Link>
      </div>

      {/* 리스트 - 롤링 애니메이션 적용 */}
      <div 
        className={`divide-y transition-opacity duration-300 ${
          darkMode ? 'divide-gray-800' : 'divide-gray-200'
        } ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {visiblePosts.map((post) => (
          <Link
            key={`${post.id}-${currentIndex}`}
            href={`/blog/${post.slug}`}
            className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors ${
              darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
            }`}
          >
            {/* 카테고리 배지 */}
            <span className={`flex-shrink-0 px-1.5 py-0.5 text-white text-[10px] font-bold rounded ${
              getCategoryStyle(post.category)
            }`}>
              {getCategoryLabel(post.category)}
            </span>
            
            {/* 제목 */}
            <span className={`flex-1 text-xs font-medium truncate ${
              darkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              {getTitle(post)}
            </span>
            
            {/* 날짜 */}
            <span className={`flex-shrink-0 text-[10px] ${
              darkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {formatDate(post.published_at)}
            </span>
          </Link>
        ))}
      </div>

      {/* 하단 프로그레스 바 (3개 이상일 때만) - 미니멀 스타일 */}
      {posts.length > 2 && (
        <div className={`px-3 pb-2 pt-1`}>
          <div className={`flex gap-0.5 ${darkMode ? 'opacity-40' : 'opacity-30'}`}>
            {Array.from({ length: Math.min(posts.length - 1, 6) }).map((_, idx) => (
              <div
                key={idx}
                className={`h-[2px] flex-1 rounded-full transition-colors ${
                  idx === currentIndex % Math.min(posts.length - 1, 6)
                    ? darkMode ? 'bg-white' : 'bg-gray-900'
                    : darkMode ? 'bg-gray-700' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
