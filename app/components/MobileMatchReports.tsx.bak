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

interface MobileMatchReportsProps {
  darkMode: boolean
}

export default function MobileMatchReports({ darkMode }: MobileMatchReportsProps) {
  const { language } = useLanguage()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/blog/posts?published=true&limit=2&offset=0')
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
    <div className={`rounded-xl overflow-hidden mb-3 ${
      darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
    }`}>
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

      {/* 리스트 */}
      <div className="divide-y divide-gray-800">
        {posts.map((post) => (
          <Link
            key={post.id}
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
    </div>
  )
}