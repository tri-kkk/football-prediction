'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useLanguage } from '../contexts/LanguageContext'
import { useSession } from 'next-auth/react'
import AdSenseAd from '../components/AdSenseAd'

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
  tags: string[]
}

const categories = [
  { value: 'all', labelKo: '전체', labelEn: 'All', icon: '◉' },
  { value: 'weekly', labelKo: '주간', labelEn: 'Weekly', icon: '▤' },
  { value: 'preview', labelKo: '프리뷰', labelEn: 'Preview', icon: '◎' },
  { value: 'analysis', labelKo: '분석', labelEn: 'Analysis', icon: '◇' },
]

const POSTS_PER_PAGE = 12

export default function BlogPage() {
  const { language: currentLanguage } = useLanguage()
  const { data: session } = useSession()
  const isPremium = (session?.user as any)?.tier === 'premium'
  
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [offset, setOffset] = useState(0)

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


  // 포스트 카드 컴포넌트
  const PostCard = ({ post }: { post: BlogPost }) => {
    return (
      <Link href={`/blog/${post.slug}`} className="group">
        <article className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-[#A3FF4C] transition-all duration-300 h-full flex flex-col">
          {post.cover_image && (
            <div className="aspect-video bg-gray-800 relative overflow-hidden">
              <img 
                src={post.cover_image} 
                alt={getTitle(post)}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
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
            <h2 className="text-lg font-bold mb-2 group-hover:text-[#A3FF4C] transition line-clamp-2">
              {getTitle(post)}
            </h2>
            <p className="text-gray-400 text-sm mb-3 line-clamp-2 flex-1">
              {getExcerpt(post)}
            </p>
            <div className="text-xs text-gray-500 pt-3 border-t border-gray-800">
              <span>{formatDate(post.published_at)}</span>
            </div>
            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {[...post.tags]
                  .sort((a, b) => {
                    const aIsKorean = /[가-힣]/.test(a)
                    const bIsKorean = /[가-힣]/.test(b)
                    if (aIsKorean === bIsKorean) return 0
                    return aIsKorean ? 1 : -1
                  })
                  .slice(0, 3)
                  .map(tag => (
                  <span key={tag} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* 카테고리 필터 */}
      <div className="border-b border-gray-800 bg-[#0f0f0f] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-2">
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
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-[#A3FF4C]"></div>
          <p className="mt-4 text-gray-400">
            {currentLanguage === 'ko' ? '로딩 중...' : 'Loading...'}
          </p>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      {!loading && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-8">
            {/* 메인 콘텐츠 영역 */}
            <main className="flex-1 min-w-0">
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

                  {/* 포스트 그리드 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                    {posts.flatMap((post, index) => {
                      const postCard = <PostCard key={post.id} post={post} />

                      {/* 💎 프리미엄 유저는 광고 제거 */}
                      if (isPremium) {
                        return [postCard]
                      }

                      // 📢 모바일: 3번째, 6번째, 9번째 포스트 뒤 인피드 광고
                      if ((index === 2 || index === 5 || index === 8)) {
                        return [
                          postCard,
                          <div key={`mobile-ad-${index}`} className="xl:hidden col-span-1 py-2">
                            <div className="text-[10px] text-center mb-1 text-gray-600">스폰서</div>
                            <AdSenseAd slot="mobile_infeed" format="auto" responsive={true} darkMode={true} />
                          </div>
                        ]
                      }

                      // 📢 PC: 6번째 포스트 뒤 가로 배너
                      if (index === 5 && posts.length > 6) {
                        return [
                          postCard,
                          <div key={`pc-ad-${index}`} className="hidden xl:flex col-span-full justify-center py-3">
                            <div className="w-full max-w-[728px]">
                              <div className="text-[10px] text-center mb-1 text-gray-600">스폰서</div>
                              <AdSenseAd slot="horizontal" format="horizontal" responsive={false} darkMode={true} />
                            </div>
                          </div>
                        ]
                      }

                      return [postCard]
                    })}
                  </div>

                  {/* 더보기 버튼 */}
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
                          <span>{currentLanguage === 'ko' ? '더보기' : 'Load More'}</span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* 모든 포스트 로드 완료 */}
                  {!hasMore && posts.length > POSTS_PER_PAGE && (
                    <div className="mt-8 text-center">
                      <p className="text-gray-600 text-xs">
                        {currentLanguage === 'ko' ? '모든 포스트를 불러왔습니다' : 'All posts loaded'}
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

            {/* 📢 우측 사이드바 - PC 전용 (💎 프리미엄은 광고 없음) */}
            {!isPremium && (
              <aside className="hidden lg:block w-[300px] flex-shrink-0">
                <div className="sticky top-20 space-y-4">
                  {/* 상단 광고 */}
                  <div className="rounded-xl overflow-hidden bg-[#1a1a1a]">
                    <div className="text-[10px] text-center py-1 text-gray-600">AD</div>
                    <div className="p-2">
                      <AdSenseAd slot="sidebar_right_top" format="rectangle" darkMode={true} />
                    </div>
                  </div>

                  {/* 하단 광고 */}
                  <div className="rounded-xl overflow-hidden bg-[#1a1a1a]">
                    <div className="text-[10px] text-center py-1 text-gray-600">AD</div>
                    <div className="p-2">
                      <AdSenseAd slot="sidebar_right_bottom" format="rectangle" darkMode={true} />
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
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