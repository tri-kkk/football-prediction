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
  { value: 'all', labelKo: '전체', labelEn: 'All', icon: '◉', color: 'from-gray-500 to-gray-600' },
  { value: 'weekly', labelKo: '주간', labelEn: 'Weekly', icon: '▤', color: 'from-blue-500 to-blue-600' },
  { value: 'preview', labelKo: '프리뷰', labelEn: 'Preview', icon: '◎', color: 'from-emerald-500 to-emerald-600' },
  { value: 'analysis', labelKo: '분석', labelEn: 'Analysis', icon: '◇', color: 'from-amber-500 to-amber-600' },
]

const categoryColorMap: Record<string, string> = {
  weekly: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  preview: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  analysis: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  guide: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  stats: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
}

const POSTS_PER_PAGE = 12

interface BlogListClientProps {
  initialPosts?: BlogPost[]
  initialCount?: number
}

export default function BlogListClient({ initialPosts, initialCount }: BlogListClientProps) {
  const { language: currentLanguage } = useLanguage()
  const { data: session } = useSession()
  const isPremium = (session?.user as any)?.tier === 'premium'

  const [posts, setPosts] = useState<BlogPost[]>(initialPosts || [])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(!initialPosts || initialPosts.length === 0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialPosts ? initialPosts.length >= POSTS_PER_PAGE : true)
  const [totalCount, setTotalCount] = useState(initialCount || 0)
  const [offset, setOffset] = useState(initialPosts?.length || 0)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    // 첫 로드 시 initialPosts가 있으면 fetch 스킵
    if (isInitialLoad && initialPosts && initialPosts.length > 0 && selectedCategory === 'all') {
      setIsInitialLoad(false)
      return
    }
    setIsInitialLoad(false)
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
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (currentLanguage === 'ko') {
      if (hours < 1) return '방금 전'
      if (hours < 24) return `${hours}시간 전`
      if (days < 7) return `${days}일 전`
      return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
    } else {
      if (hours < 1) return 'Just now'
      if (hours < 24) return `${hours}h ago`
      if (days < 7) return `${days}d ago`
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
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

  const getCategoryStyle = (cat: string) => {
    return categoryColorMap[cat] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  // 포스트 카드 컴포넌트
  const PostCard = ({ post, featured = false }: { post: BlogPost; featured?: boolean }) => {
    // 피처드 카드
    if (featured && post.cover_image) {
      const tagsContent = post.tags && post.tags.length > 0 ? (
        <div className="flex gap-1.5 flex-wrap">
          {[...post.tags]
            .filter((tag, i, arr) => arr.indexOf(tag) === i)
            .slice(0, 5)
            .map(tag => {
              const isKorean = /[가-힣]/.test(tag)
              return (
                <span
                  key={tag}
                  className={`text-xs px-2 py-0.5 rounded-md ${
                    isKorean
                      ? 'bg-emerald-500/15 text-emerald-400/80'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  #{tag}
                </span>
              )
            })}
        </div>
      ) : null

      return (
        <Link href={`/blog/${post.slug}`} className="group">
          <article className="rounded-2xl overflow-hidden border border-[#1e293b] hover:border-emerald-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
            {/* 모바일: 이미지 위 + 텍스트 아래 분리 */}
            <div className="md:hidden">
              <div className="relative aspect-video overflow-hidden bg-[#0f1623]">
                <img
                  src={post.cover_image}
                  alt={getTitle(post)}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                />
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border backdrop-blur-sm ${getCategoryStyle(post.category)}`}>
                    {post.category.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="bg-[#141824] p-4">
                <span className="text-xs text-gray-500">{formatDate(post.published_at)}</span>
                <h2 className="text-lg font-black mt-1.5 mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                  {getTitle(post)}
                </h2>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2 leading-relaxed">
                  {getExcerpt(post)}
                </p>
                {tagsContent}
              </div>
            </div>

            {/* 데스크탑: 오버레이 방식 */}
            <div className="hidden md:block">
              <div className="relative aspect-[3/1] overflow-hidden bg-[#0f1623]">
                <img
                  src={post.cover_image}
                  alt={getTitle(post)}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/80 to-transparent" />

                <div className="absolute top-4 left-4">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border backdrop-blur-sm ${getCategoryStyle(post.category)}`}>
                    {post.category.toUpperCase()}
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400">{formatDate(post.published_at)}</span>
                  </div>
                  <h2 className="text-3xl font-black mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-tight">
                    {getTitle(post)}
                  </h2>
                  <p className="text-gray-300 text-base mb-3 line-clamp-2 leading-relaxed max-w-2xl">
                    {getExcerpt(post)}
                  </p>
                  {tagsContent}
                </div>
              </div>
            </div>
          </article>
        </Link>
      )
    }

    return (
      <Link href={`/blog/${post.slug}`} className="group">
        <article className="bg-[#141824] rounded-2xl overflow-hidden border border-[#1e293b] hover:border-emerald-500/40 transition-all duration-300 h-full flex flex-col hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5">
          {post.cover_image && (
            <div className="relative overflow-hidden bg-[#0f1623] aspect-video">
              <img
                src={post.cover_image}
                alt={getTitle(post)}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              {/* 카테고리 뱃지 오버레이 */}
              <div className="absolute top-3 left-3">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border backdrop-blur-sm ${getCategoryStyle(post.category)}`}>
                  {post.category.toUpperCase()}
                </span>
              </div>
              {currentLanguage === 'en' && !post.content_en && (
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 bg-gray-900/80 backdrop-blur-sm text-gray-300 text-xs rounded-lg">
                    Korean
                  </span>
                </div>
              )}
              {/* 하단 그라데이션 */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#141824] to-transparent" />
            </div>
          )}

          <div className="p-5 flex-1 flex flex-col">
            {/* 날짜 */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs text-gray-500">{formatDate(post.published_at)}</span>
            </div>

            <h2 className="text-lg font-bold mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
              {getTitle(post)}
            </h2>
            <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-1 leading-relaxed">
              {getExcerpt(post)}
            </p>

            {/* 태그 */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {[...post.tags]
                  .sort((a, b) => {
                    const aIsKorean = /[가-힣]/.test(a)
                    const bIsKorean = /[가-힣]/.test(b)
                    if (aIsKorean === bIsKorean) return 0
                    return aIsKorean ? 1 : -1
                  })
                  .filter((tag, i, arr) => arr.indexOf(tag) === i)
                  .slice(0, 3)
                  .map(tag => {
                    const isKorean = /[가-힣]/.test(tag)
                    return (
                      <span
                        key={tag}
                        className={`text-xs px-2 py-0.5 rounded-md ${
                          isKorean
                            ? 'bg-emerald-500/10 text-emerald-400/70'
                            : 'bg-[#1e293b] text-gray-500'
                        }`}
                      >
                        #{tag}
                      </span>
                    )
                  })}
              </div>
            )}
          </div>
        </article>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* 히어로 섹션 */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 pt-8 pb-4 relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
            <h1 className="text-2xl font-black tracking-tight">
              {currentLanguage === 'ko' ? 'TrendSoccer Preview' : 'TrendSoccer Preview'}
            </h1>
          </div>
          <p className="text-gray-500 text-sm ml-4 pl-0.5">
            {currentLanguage === 'ko'
              ? '축구 분석, 프리뷰, 전술 인사이트'
              : 'Football analysis, previews & tactical insights'
            }
          </p>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {categories.map(cat => {
              const isActive = selectedCategory === cat.value
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl whitespace-nowrap transition-all text-sm font-medium shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r ' + cat.color + ' text-white shadow-lg'
                      : 'bg-[#141824] text-gray-400 hover:bg-[#1a1f2e] hover:text-white border border-[#1e293b]'
                  }`}
                >
                  <span className="text-xs opacity-70">{cat.icon}</span>
                  <span>{currentLanguage === 'ko' ? cat.labelKo : cat.labelEn}</span>
                </button>
              )
            })}

            {/* 포스트 카운트 */}
            {totalCount > 0 && (
              <span className="ml-auto text-xs text-gray-600 shrink-0 hidden sm:block">
                {totalCount} {currentLanguage === 'ko' ? '포스트' : 'posts'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#1e293b] border-t-emerald-500"></div>
          <p className="mt-4 text-gray-500 text-sm">
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
                  {/* 첫 번째 포스트: 피처드 카드 */}
                  {offset <= POSTS_PER_PAGE && posts.length > 0 && (
                    <div className="mb-6">
                      <PostCard post={posts[0]} featured={true} />
                    </div>
                  )}

                  {/* 포스트 그리드 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                    {posts.slice(offset <= POSTS_PER_PAGE ? 1 : 0).flatMap((post, index) => {
                      const postCard = <PostCard key={post.id} post={post} />

                      {/* 프리미엄 유저는 광고 제거 */}
                      if (isPremium) {
                        return [postCard]
                      }

                      // 모바일: 3번째, 6번째, 9번째 포스트 뒤 인피드 광고
                      if ((index === 2 || index === 5 || index === 8)) {
                        return [
                          postCard,
                          <div key={`mobile-ad-${index}`} className="xl:hidden col-span-1 py-2">
                            <div className="text-[10px] text-center mb-1 text-gray-600">AD</div>
                            <AdSenseAd slot="mobile_infeed" format="auto" responsive={true} darkMode={true} />
                          </div>
                        ]
                      }

                      // PC: 6번째 포스트 뒤 가로 배너
                      if (index === 5 && posts.length > 6) {
                        return [
                          postCard,
                          <div key={`pc-ad-${index}`} className="hidden xl:flex col-span-full justify-center py-3">
                            <div className="w-full max-w-[728px]">
                              <div className="text-[10px] text-center mb-1 text-gray-600">AD</div>
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
                    <div className="mt-10 text-center">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 px-8 py-3 bg-[#141824] hover:bg-[#1a1f2e] disabled:opacity-50 text-white rounded-xl transition-all text-sm font-medium border border-[#1e293b] hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5"
                      >
                        {loadingMore ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1e293b] border-t-emerald-500"></div>
                            <span>{currentLanguage === 'ko' ? '로딩...' : 'Loading...'}</span>
                          </>
                        ) : (
                          <>
                            <span>{currentLanguage === 'ko' ? '더 많은 포스트 보기' : 'Load More Posts'}</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* 모든 포스트 로드 완료 */}
                  {!hasMore && posts.length > POSTS_PER_PAGE && (
                    <div className="mt-10 text-center">
                      <div className="inline-flex items-center gap-2 text-gray-600 text-xs">
                        <div className="w-8 h-px bg-gray-800" />
                        <span>{currentLanguage === 'ko' ? '모든 포스트를 불러왔습니다' : 'All posts loaded'}</span>
                        <div className="w-8 h-px bg-gray-800" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[#141824] border border-[#1e293b] flex items-center justify-center">
                    <span className="text-3xl opacity-50">📝</span>
                  </div>
                  <p className="text-gray-400 mb-2 font-medium">
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

            {/* 우측 사이드바 - PC 전용 (프리미엄은 광고 없음) */}
            {!isPremium && (
              <aside className="hidden lg:block w-[300px] flex-shrink-0">
                <div className="sticky top-20 space-y-4">
                  {/* 상단 광고 */}
                  <div className="rounded-2xl overflow-hidden bg-[#141824] border border-[#1e293b]">
                    <div className="text-[10px] text-center py-1 text-gray-600">AD</div>
                    <div className="p-2">
                      <AdSenseAd slot="sidebar_right_top" format="rectangle" darkMode={true} />
                    </div>
                  </div>

                  {/* 하단 광고 */}
                  <div className="rounded-2xl overflow-hidden bg-[#141824] border border-[#1e293b]">
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
