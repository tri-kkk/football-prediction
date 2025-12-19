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
  content_en: string | null
  cover_image: string
  category: string
  published_at: string
  published: boolean
  published_en: boolean
  views: number
  tags: string[]
}

const categories = [
  { value: 'all', labelKo: '전체', labelEn: 'All', icon: '●' },
  { value: 'weekly', labelKo: '주간', labelEn: 'Weekly', icon: '▤' },
  { value: 'preview', labelKo: '프리뷰', labelEn: 'Preview', icon: '◎' },
  { value: 'analysis', labelKo: '분석', labelEn: 'Analysis', icon: '◇' },
]

const POSTS_PER_PAGE = 12

export default function BlogPage() {
  const { language: currentLanguage } = useLanguage()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [offset, setOffset] = useState(0)

  // 카테고리 변경 시 초기화
  useEffect(() => {
    setPosts([])
    setOffset(0)
    setHasMore(true)
    fetchPosts(0, true)
  }, [selectedCategory, currentLanguage])

  const fetchPosts = async (currentOffset: number, isInitial: boolean = false) => {
    if (isInitial) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const category = selectedCategory === 'all' ? '' : `&category=${selectedCategory}`
      // 언어에 따라 발행된 글만 필터링
      const langFilter = currentLanguage === 'en' ? '&lang=en' : ''
      const res = await fetch(
        `/api/blog/posts?published=true${category}${langFilter}&limit=${POSTS_PER_PAGE}&offset=${currentOffset}`
      )
      const result = await res.json()
      
      if (result.success) {
        const newPosts = result.data || []
        
        if (isInitial) {
          setPosts(newPosts)
        } else {
          setPosts(prev => [...prev, ...newPosts])
        }
        
        if (result.count !== undefined) {
          setTotalCount(result.count)
        }
        
        setHasMore(newPosts.length === POSTS_PER_PAGE)
        setOffset(currentOffset + newPosts.length)
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(offset, false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(currentLanguage === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // 언어에 따른 콘텐츠 선택
  const getTitle = (post: BlogPost) => {
    if (currentLanguage === 'en' && post.title) {
      return post.title
    }
    return post.title_kr || post.title
  }

  const getExcerpt = (post: BlogPost) => {
    if (currentLanguage === 'en' && post.excerpt_en) {
      return post.excerpt_en
    }
    return post.excerpt
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* 카테고리 필터 - 컴팩트 버전 */}
      <div className="border-b border-gray-800 bg-[#0f0f0f] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2">
          {/* 모바일 & 데스크톱 통합: 가로 스크롤 */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-medium shrink-0 ${
                  selectedCategory === cat.value
                    ? 'bg-[#A3FF4C] text-gray-900'
                    : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className={`text-xs ${selectedCategory === cat.value ? 'text-gray-800' : 'text-gray-500'}`}>
                  {cat.icon}
                </span>
                <span>{currentLanguage === 'ko' ? cat.labelKo : cat.labelEn}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-[#A3FF4C]"></div>
          <p className="mt-4 text-gray-400">
            {currentLanguage === 'ko' ? '로딩 중...' : 'Loading...'}
          </p>
        </div>
      )}

      {/* 포스트 그리드 */}
      {!loading && (
        <main className="max-w-6xl mx-auto px-4 py-8">
          {posts.length > 0 ? (
            <>
              {/* 포스트 개수 */}
              <div className="mb-4">
                <p className="text-gray-500 text-xs">
                  {currentLanguage === 'ko' 
                    ? `총 ${totalCount > 0 ? totalCount : posts.length}개 포스트`
                    : `${totalCount > 0 ? totalCount : posts.length} posts`
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
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
                            alt={getTitle(post)}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                          {/* 카테고리 뱃지 */}
                          <div className="absolute top-3 left-3">
                            <span className="px-2.5 py-1 bg-[#A3FF4C]/90 backdrop-blur-sm text-gray-900 text-xs font-bold rounded-full">
                              {currentLanguage === 'ko' 
                                ? categories.find(c => c.value === post.category)?.labelKo 
                                : categories.find(c => c.value === post.category)?.labelEn
                              }
                            </span>
                          </div>
                          {/* 언어 뱃지 */}
                          {currentLanguage === 'en' && !post.content_en && (
                            <div className="absolute top-3 right-3">
                              <span className="px-2 py-1 bg-gray-900/80 backdrop-blur-sm text-gray-300 text-xs rounded">
                                🇰🇷 Korean
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-4 flex-1 flex flex-col">
                        {/* 제목 */}
                        <h2 className="text-lg font-bold mb-2 group-hover:text-[#A3FF4C] transition line-clamp-2">
                          {getTitle(post)}
                        </h2>

                        {/* 요약 */}
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2 flex-1">
                          {getExcerpt(post)}
                        </p>

                        {/* 메타 정보 */}
                        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-800">
                          <span>{formatDate(post.published_at)}</span>
                          <span className="flex items-center gap-1">
                            👁️ {post.views?.toLocaleString() || 0}
                          </span>
                        </div>

                        {/* 태그 */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex gap-1.5 mt-3 flex-wrap">
                            {post.tags.slice(0, 3).map(tag => (
                              <span 
                                key={tag}
                                className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded"
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

              {/* 더 보기 버튼 */}
              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 text-white rounded-lg transition-all text-sm font-medium border border-gray-700 hover:border-[#A3FF4C]"
                  >
                    {loadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-[#A3FF4C]"></div>
                        <span>{currentLanguage === 'ko' ? '로딩...' : 'Loading...'}</span>
                      </>
                    ) : (
                      <span>{currentLanguage === 'ko' ? '더 보기' : 'Load More'}</span>
                    )}
                  </button>
                </div>
              )}

              {/* 모든 포스트 로드 완료 */}
              {!hasMore && posts.length > POSTS_PER_PAGE && (
                <div className="mt-8 text-center">
                  <p className="text-gray-600 text-xs">
                    {currentLanguage === 'ko' 
                      ? '모든 포스트를 불러왔습니다'
                      : 'All posts loaded'
                    }
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <div className="text-5xl mb-4 opacity-50">📝</div>
              <p className="text-gray-400 mb-2">
                {currentLanguage === 'ko' ? '아직 포스트가 없습니다' : 'No posts yet'}
              </p>
              <p className="text-gray-600 text-sm">
                {currentLanguage === 'ko' 
                  ? '곧 흥미로운 콘텐츠로 찾아뵙겠습니다!'
                  : 'Exciting content coming soon!'
                }
              </p>
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