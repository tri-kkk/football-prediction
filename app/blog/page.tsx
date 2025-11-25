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
  cover_image: string
  category: string
  published_at: string
  views: number
  tags: string[]
}

const categories = [
  { value: 'all', labelKo: '전체', labelEn: 'All', emoji: '⚽' },
  { value: 'weekly', labelKo: '주간 분석', labelEn: 'Weekly', emoji: '📊' },
  { value: 'preview', labelKo: '경기 프리뷰', labelEn: 'Preview', emoji: '🎯' },
  { value: 'analysis', labelKo: '심층 분석', labelEn: 'Analysis', emoji: '🔍' },
]

export default function BlogPage() {
  const { language: currentLanguage } = useLanguage()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [selectedCategory])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const category = selectedCategory === 'all' ? '' : `&category=${selectedCategory}`
      const res = await fetch(`/api/blog/posts?published=true${category}`)
      const result = await res.json()
      
      if (result.success) {
        setPosts(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* 헤더 타이틀 */}
      

      {/* 카테고리 필터 - 모바일 최적화 */}
      <div className="border-b border-gray-800 bg-[#0f0f0f] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          {/* Desktop: 가로 배치 */}
          <div className="hidden md:flex gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg whitespace-nowrap transition-all font-medium ${
                  selectedCategory === cat.value
                    ? 'bg-[#A3FF4C] text-gray-900 shadow-lg'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="text-lg">{cat.emoji}</span>
                <span>{currentLanguage === 'ko' ? cat.labelKo : cat.labelEn}</span>
              </button>
            ))}
          </div>

          {/* Mobile: 2x2 그리드 */}
          <div className="md:hidden grid grid-cols-2 gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-[#A3FF4C] text-gray-900 shadow-lg'
                    : 'bg-gray-800 text-gray-300 active:bg-gray-700'
                }`}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-xs font-medium">{currentLanguage === 'ko' ? cat.labelKo : cat.labelEn}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-[#A3FF4C]"></div>
          <p className="mt-4 text-gray-400">로딩 중...</p>
        </div>
      )}

      {/* 포스트 그리드 */}
      {!loading && (
        <main className="max-w-6xl mx-auto px-4 py-8">
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(post => (
                <Link 
                  key={post.id} 
                  href={`/blog/${post.slug}`}
                  className="group"
                >
                  <article className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-[#A3FF4C] transition-all duration-300 h-full flex flex-col">
                    {/* 커버 이미지 */}
                    {post.cover_image && (
                      <div className="aspect-video bg-gray-800 relative overflow-hidden">
                        <img 
                          src={post.cover_image} 
                          alt={post.title_kr}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        {/* 카테고리 배지 */}
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 bg-[#A3FF4C]/90 backdrop-blur-sm text-gray-900 text-xs font-bold rounded-full">
                            {currentLanguage === 'ko' 
                              ? categories.find(c => c.value === post.category)?.labelKo 
                              : categories.find(c => c.value === post.category)?.labelEn
                            }
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-5 flex-1 flex flex-col">
                      {/* 제목 */}
                      <h2 className="text-xl font-bold mb-3 group-hover:text-[#A3FF4C] transition line-clamp-2">
                        {post.title_kr}
                      </h2>

                      {/* 요약 */}
                      <p className="text-gray-400 text-sm mb-4 line-clamp-3 flex-1">
                        {post.excerpt}
                      </p>

                      {/* 메타 정보 */}
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-800">
                        <span>{formatDate(post.published_at)}</span>
                        <span className="flex items-center gap-1">
                          👁️ {post.views.toLocaleString()}
                        </span>
                      </div>

                      {/* 태그 */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {post.tags.slice(0, 3).map(tag => (
                            <span 
                              key={tag}
                              className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-400 text-lg mb-2">아직 포스트가 없습니다</p>
              <p className="text-gray-600 text-sm">곧 흥미로운 콘텐츠로 찾아뵙겠습니다!</p>
            </div>
          )}
        </main>
      )}

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