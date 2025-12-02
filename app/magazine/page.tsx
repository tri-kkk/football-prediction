'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// 뉴스 타입 정의
interface NewsArticle {
  id: string
  title: string
  summary: string
  content: string
  imageUrl: string
  category: string
  league: string
  author: string
  publishedAt: string
  tags: string[]
  views: number
  likes: number
}

// 리그 필터 옵션
const LEAGUE_FILTERS = [
  { code: 'ALL', name: '전체', emoji: '🌍' },
  { code: 'PL', name: '프리미어리그', flag: 'https://flagcdn.com/w40/gb-eng.png' },
  { code: 'PD', name: '라리가', flag: 'https://flagcdn.com/w40/es.png' },
  { code: 'BL1', name: '분데스리가', flag: 'https://flagcdn.com/w40/de.png' },
  { code: 'SA', name: '세리에A', flag: 'https://flagcdn.com/w40/it.png' },
  { code: 'FL1', name: '리그1', flag: 'https://flagcdn.com/w40/fr.png' },
  { code: 'CL', name: '챔피언스리그', emoji: '⭐' },
]

// 카테고리 필터
const CATEGORIES = [
  { code: 'ALL', name: '전체', emoji: '📰' },
  { code: 'NEWS', name: '뉴스', emoji: '📢' },
  { code: 'ANALYSIS', name: '분석', emoji: '📊' },
  { code: 'INTERVIEW', name: '인터뷰', emoji: '🎤' },
  { code: 'TRANSFER', name: '이적', emoji: '✈️' },
  { code: 'MATCH', name: '경기', emoji: '⚽' },
]

export default function BlogPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const observerTarget = useRef<HTMLDivElement>(null)

  // 뉴스 데이터 가져오기
  const fetchNews = useCallback(async (pageNum: number, league: string, category: string) => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/news?page=${pageNum}&limit=10&league=${league}&category=${category}`
      )
      const data = await response.json()

      if (data.articles && data.articles.length > 0) {
        if (pageNum === 1) {
          setArticles(data.articles)
        } else {
          setArticles(prev => [...prev, ...data.articles])
        }
        setHasMore(data.hasMore)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('뉴스 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 초기 로드 및 필터 변경 시
  useEffect(() => {
    setPage(1)
    fetchNews(1, selectedLeague, selectedCategory)
  }, [selectedLeague, selectedCategory, fetchNews])

  // 무한 스크롤 구현
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1)
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading])

  // 페이지 증가 시 데이터 로드
  useEffect(() => {
    if (page > 1) {
      fetchNews(page, selectedLeague, selectedCategory)
    }
  }, [page, selectedLeague, selectedCategory, fetchNews])

  // 시간 포맷팅
  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return '방금 전'
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }

  // 안전하게 첫 글자 가져오기
  const getInitial = (name: string | undefined | null): string => {
    if (!name || typeof name !== 'string' || name.length === 0) {
      return 'T' // TrendSoccer의 T
    }
    return name.charAt(0).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">

      {/* 메인 피드 */}
      <main className="max-w-2xl mx-auto px-0 py-0">
        {loading && page === 1 ? (
          // 초기 로딩
          <div className="space-y-0">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-900/50 p-4 animate-pulse border-b border-gray-800">
                <div className="h-64 bg-gray-800/30 mb-4"></div>
                <div className="h-6 bg-gray-800/30 w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-800/30 w-full mb-2"></div>
                <div className="h-4 bg-gray-800/30 w-5/6"></div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          // 결과 없음
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📰</div>
            <p className="text-gray-400 text-lg">아직 게시된 기사가 없습니다</p>
            <p className="text-gray-500 text-sm mt-2">곧 다양한 축구 소식을 전해드리겠습니다!</p>
          </div>
        ) : (
          // 뉴스 피드
          <div className="space-y-0">
            {articles.map((article, index) => (
              <article
                key={`${article.id || index}-${index}`}
                className="bg-[#0a0a0a] border-b border-gray-800 transition-all hover:bg-[#111111]"
              >
                {/* 메타 정보 */}
                <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {getInitial(article.author)}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {article.author || 'TrendSoccer'}
                      </p>
                      <p className="text-gray-500 text-xs">{formatDate(article.publishedAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-gray-800/80 text-gray-400 rounded-md text-xs font-medium">
                      {article.category || '뉴스'}
                    </span>
                  </div>
                </div>

                {/* 이미지 */}
                {article.imageUrl && (
                  <div className="relative aspect-square bg-black overflow-hidden">
                    <img
                      src={article.imageUrl}
                      alt={article.title || '기사 이미지'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // 이미지 로드 실패 시 숨김
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                    {/* 리그 배지 */}
                    {article.league && (
                      <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/80 backdrop-blur-sm rounded-lg text-white text-xs font-semibold">
                        {article.league}
                      </div>
                    )}
                  </div>
                )}

                {/* 컨텐츠 */}
                <div className="px-4 py-3">
                  <h2 className="text-base font-bold text-white mb-2 leading-snug">
                    {article.title || '제목 없음'}
                  </h2>
                  
                  <p className="text-gray-400 text-sm leading-relaxed mb-3">
                    {article.summary || ''}
                  </p>

                  {/* 태그 */}
                  {article.tags && Array.isArray(article.tags) && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {article.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-blue-400 text-sm hover:underline cursor-pointer"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}

            {/* 무한 스크롤 트리거 */}
            <div ref={observerTarget} className="h-20 flex items-center justify-center">
              {loading && hasMore && (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className="text-sm">더 많은 기사 로딩 중...</span>
                </div>
              )}
              {!hasMore && articles.length > 0 && (
                <p className="text-gray-500 text-sm">모든 기사를 확인했습니다 ✨</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 맨 위로 버튼 */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-20 right-4 w-11 h-11 bg-gray-800/90 hover:bg-gray-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50 backdrop-blur-sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}