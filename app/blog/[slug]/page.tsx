'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLanguage } from '../../contexts/LanguageContext'
import { useSession } from 'next-auth/react'
import AdSenseAd from '../../components/AdSenseAd'

interface BlogPost {
  id: number
  slug: string
  title: string
  title_kr: string
  excerpt: string
  excerpt_en: string | null
  content: string
  content_en: string | null
  cover_image: string
  category: string
  published_at: string
  published: boolean
  published_en: boolean
  views: number
  tags: string[]
  author: string
}

// =============================================================================
// 🆕 조회수 부스팅 설정 (메인 페이지와 동일하게 유지)
// =============================================================================
const VIEWS_BOOST_CONFIG = {
  enabled: true,
  
  // 기본 부스트 (모든 포스트)
  baseBoost: {
    min: 50,      // 최소 추가 조회수
    max: 150,     // 최대 추가 조회수
  },
  
  // 시간 경과에 따른 추가 부스트
  timeBoost: {
    perDay: {
      min: 15,    // 하루당 최소 추가
      max: 40,    // 하루당 최대 추가
    },
    maxDays: 30,  // 최대 30일까지만 계산
  },
  
  // 카테고리별 배수
  categoryMultiplier: {
    'preview': 1.5,   // 프리뷰는 1.5배
    'analysis': 1.3,  // 분석은 1.3배
    'weekly': 1.2,    // 주간은 1.2배
    'default': 1.0,
  },
  
  // 인기 태그 보너스
  popularTags: ['프리미어리그', 'premier-league', '챔피언스리그', 'champions-league', '라리가', 'la-liga'],
  tagBonus: 30,
}

/**
 * 🆕 Seed 기반 의사 랜덤 (일관된 결과)
 * 같은 seed면 항상 같은 값 반환
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000
  return x - Math.floor(x)
}

/**
 * 🆕 범위 내 seed 기반 랜덤 정수
 */
function seededRandomInt(seed: number, min: number, max: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min
}

/**
 * 🆕 부스트된 조회수 계산
 */
function getBoostedViews(post: BlogPost): number {
  if (!VIEWS_BOOST_CONFIG.enabled) {
    return post.views || 0
  }
  
  const realViews = post.views || 0
  const seed = post.id  // ID를 seed로 사용 → 항상 같은 결과
  
  // 1. 기본 부스트
  const baseBoost = seededRandomInt(
    seed,
    VIEWS_BOOST_CONFIG.baseBoost.min,
    VIEWS_BOOST_CONFIG.baseBoost.max
  )
  
  // 2. 시간 경과 부스트
  const publishedDate = new Date(post.published_at)
  const now = new Date()
  const daysPassed = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24))
  const effectiveDays = Math.min(daysPassed, VIEWS_BOOST_CONFIG.timeBoost.maxDays)
  
  let timeBoost = 0
  for (let i = 0; i < effectiveDays; i++) {
    // 각 날짜마다 다른 seed 사용
    timeBoost += seededRandomInt(
      seed + i * 100,
      VIEWS_BOOST_CONFIG.timeBoost.perDay.min,
      VIEWS_BOOST_CONFIG.timeBoost.perDay.max
    )
  }
  
  // 3. 카테고리 배수
  const categoryMultiplier = VIEWS_BOOST_CONFIG.categoryMultiplier[post.category as keyof typeof VIEWS_BOOST_CONFIG.categoryMultiplier] 
    || VIEWS_BOOST_CONFIG.categoryMultiplier.default
  
  // 4. 인기 태그 보너스
  let tagBonus = 0
  if (post.tags?.length) {
    const hasPopularTag = post.tags.some(tag => 
      VIEWS_BOOST_CONFIG.popularTags.some(popular => 
        tag.toLowerCase().includes(popular.toLowerCase())
      )
    )
    if (hasPopularTag) {
      tagBonus = VIEWS_BOOST_CONFIG.tagBonus
    }
  }
  
  // 최종 계산
  const boostedViews = Math.floor(
    (realViews + baseBoost + timeBoost + tagBonus) * categoryMultiplier
  )
  
  return boostedViews
}

/**
 * 🆕 조회수 포맷팅 (1.2K, 15K 등)
 */
function formatViews(views: number): string {
  if (views >= 10000) {
    return (views / 1000).toFixed(0) + 'K'
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K'
  }
  return views.toLocaleString()
}

export default function BlogPostPage() {
  const params = useParams()
  const slug = params?.slug as string
  const { language: currentLanguage } = useLanguage()
  const { data: session } = useSession()
  const isPremium = (session?.user as any)?.tier === 'premium'
  
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (slug) {
      fetchPost()
    }
  }, [slug])

  const fetchPost = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/blog/post/${slug}`)
      const result = await res.json()
      
      if (result.success) {
        setPost(result.data)
      } else {
        setError(currentLanguage === 'ko' ? '포스트를 찾을 수 없습니다' : 'Post not found')
      }
    } catch (err) {
      setError(currentLanguage === 'ko' ? '포스트를 불러오는데 실패했습니다' : 'Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(currentLanguage === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  // 언어에 따른 콘텐츠 선택
  const getTitle = () => {
    if (!post) return ''
    if (currentLanguage === 'en' && post.title) {
      return post.title
    }
    return post.title_kr || post.title
  }

  const getExcerpt = () => {
    if (!post) return ''
    if (currentLanguage === 'en' && post.excerpt_en) {
      return post.excerpt_en
    }
    return post.excerpt
  }

  const getContent = () => {
    if (!post) return ''
    if (currentLanguage === 'en' && post.content_en) {
      return post.content_en
    }
    return post.content
  }

  // 현재 보여지는 콘텐츠가 영문인지 한글인지
  const isShowingEnglish = () => {
    if (!post) return false
    return currentLanguage === 'en' && post.content_en
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-[#A3FF4C]"></div>
          <p className="mt-4 text-gray-400">
            {currentLanguage === 'ko' ? '로딩 중...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {currentLanguage === 'ko' ? '포스트를 찾을 수 없습니다' : 'Post Not Found'}
          </h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link 
            href="/blog"
            className="px-6 py-3 bg-[#A3FF4C] hover:bg-[#8FE040] text-gray-900 rounded-lg transition font-medium"
          >
            {currentLanguage === 'ko' ? '블로그로 돌아가기' : 'Back to Blog'}
          </Link>
        </div>
      </div>
    )
  }

  // 🆕 부스트된 조회수 계산
  const displayViews = getBoostedViews(post)

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* 커버 이미지 */}
      {post.cover_image && (
        <div className="relative w-full max-w-5xl mx-auto overflow-hidden bg-gray-900">
          <div className="relative w-full" style={{ paddingBottom: '52.5%' }}>
            <img 
              src={post.cover_image} 
              alt={getTitle()}
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0f0f0f] to-transparent"></div>
        </div>
      )}

      {/* 포스트 내용 */}
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* 메타 정보 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-4 flex-wrap">
            <span className="px-3 py-1 bg-[#A3FF4C]/20 text-[#A3FF4C] rounded-full font-medium">
              {post.category}
            </span>
            <span>{formatDate(post.published_at)}</span>
            <span>·</span>
            {/* 🆕 부스트된 조회수 사용 */}
            <span className="flex items-center gap-1">
              👁️ {formatViews(displayViews)}
            </span>
            {/* 언어 표시 */}
            {currentLanguage === 'en' && !post.content_en && (
              <span className="px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs">
                🇰🇷 {currentLanguage === 'ko' ? '한글 버전' : 'Korean version'}
              </span>
            )}
          </div>

          {/* 제목 */}
          <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
            {getTitle()}
          </h1>

          {/* 요약 */}
          {getExcerpt() && (
            <p className="text-xl text-gray-400 leading-relaxed">
              {getExcerpt()}
            </p>
          )}

          {/* 작성자 */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-800">
            <div className="w-12 h-12 bg-gradient-to-br from-[#A3FF4C] to-green-500 rounded-full flex items-center justify-center text-2xl">
              ⚽
            </div>
            <div>
              <div className="font-bold">{post.author}</div>
              <div className="text-sm text-gray-400">
                {currentLanguage === 'ko' ? '축구 데이터 분석가' : 'Football Data Analyst'}
              </div>
            </div>
          </div>
        </div>

        {/* 영문 버전 없음 안내 */}
        {currentLanguage === 'en' && !post.content_en && (
          <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm flex items-center gap-2">
              <span>💡</span>
              <span>This article is only available in Korean. English translation coming soon!</span>
            </p>
          </div>
        )}

        {/* 본문 */}
        <div className="prose prose-invert prose-lg max-w-none">
          {(() => {
            const content = getContent()
            // 본문을 ## 섹션 기준으로 분리
            const sections = content.split(/\n(?=##\s)/)
            
            // 블러 대상 섹션 키워드 (한글 + 영어)
            const BLUR_KEYWORDS = [
              '전술 포인트', 'Tactical Points',
              '승부처', 'Key Factors',
              'TrendSoccer 예측', 'TrendSoccer Prediction',
            ]
            
            const isBlurSection = (section: string): boolean => {
              const firstLine = section.split('\n')[0] || ''
              return BLUR_KEYWORDS.some(kw => firstLine.includes(kw))
            }

            // 공통 마크다운 컴포넌트
            const mdComponents = {
              h1: ({ children }: any) => (
                <h1 className="text-3xl font-bold mt-8 mb-4 text-white border-b border-gray-800 pb-3">{children}</h1>
              ),
              h2: ({ children }: any) => (
                <h2 className="text-2xl font-bold mt-8 mb-4 text-white">{children}</h2>
              ),
              h3: ({ children }: any) => (
                <h3 className="text-xl font-bold mt-6 mb-3 text-white">{children}</h3>
              ),
              p: ({ children }: any) => (
                <p className="text-gray-300 leading-relaxed mb-4">{children}</p>
              ),
              ul: ({ children }: any) => (
                <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">{children}</ul>
              ),
              ol: ({ children }: any) => (
                <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2">{children}</ol>
              ),
              blockquote: ({ children }: any) => (
                <blockquote className="border-l-4 border-[#A3FF4C] pl-4 py-2 my-4 bg-gray-900/50 text-gray-400 italic">{children}</blockquote>
              ),
              code: ({ children }: any) => (
                <code className="bg-gray-900 text-[#A3FF4C] px-2 py-1 rounded text-sm">{children}</code>
              ),
              pre: ({ children }: any) => (
                <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto my-4 border border-gray-800">{children}</pre>
              ),
              table: ({ children }: any) => (
                <div className="overflow-x-auto my-6"><table className="w-full border-collapse">{children}</table></div>
              ),
              th: ({ children }: any) => (
                <th className="border border-gray-700 bg-gray-800 px-4 py-2 text-left font-bold">{children}</th>
              ),
              td: ({ children }: any) => (
                <td className="border border-gray-700 px-4 py-2">{children}</td>
              ),
              a: ({ children, href }: any) => (
                <a href={href} className="text-[#A3FF4C] hover:text-[#8FE040] underline" target="_blank" rel="noopener noreferrer">{children}</a>
              ),
              hr: () => <hr className="my-8 border-gray-800" />,
            }

            // 블러 대상 섹션과 일반 섹션 분리
            const freeSections: string[] = []
            const premiumSections: string[] = []
            
            sections.forEach((section) => {
              if (isBlurSection(section)) {
                premiumSections.push(section)
              } else {
                freeSections.push(section)
              }
            })

            // 광고 삽입 위치 (무료 섹션 중간)
            const midPoint = Math.floor(freeSections.length / 2)
            
            return (
              <>
                {/* ✅ 무료 섹션들 (광고 포함) */}
                {freeSections.map((section, idx) => (
                  <div key={`free-${idx}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {section}
                    </ReactMarkdown>
                    
                    {/* 📢 중간 광고 */}
                    {idx === midPoint - 1 && !isPremium && (
                      <div className="my-8">
                        <AdSenseAd slot="in_article" darkMode={true} />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* 🔒 프리미엄 섹션들 */}
                {premiumSections.length > 0 && (
                  isPremium ? (
                    // 프리미엄 유저: 전체 표시
                    <>
                      {premiumSections.map((section, idx) => (
                        <ReactMarkdown key={`prem-${idx}`} remarkPlugins={[remarkGfm]} components={mdComponents}>
                          {section}
                        </ReactMarkdown>
                      ))}
                    </>
                  ) : (
                    // 비프리미엄: 블러 + CTA 1개
                    <div className="relative mt-8">
                      {/* 블러 영역 - 제목들만 살짝 보여주기 */}
                      <div className="blur-[6px] opacity-30 pointer-events-none select-none max-h-[300px] overflow-hidden" aria-hidden="true">
                        {premiumSections.map((section, idx) => (
                          <ReactMarkdown key={`blur-${idx}`} remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {section}
                          </ReactMarkdown>
                        ))}
                      </div>
                      
                      {/* 그라데이션 페이드아웃 */}
                      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0f0f0f] to-transparent" />
                      
                      {/* CTA 카드 (1개만) */}
                      <div className="relative -mt-16 flex justify-center pb-4">
                        <div className="bg-gray-900/95 border border-gray-700 rounded-xl px-8 py-8 text-center max-w-lg mx-4 shadow-2xl backdrop-blur-sm">
                          <div className="text-4xl mb-3">🔒</div>
                          <p className="text-white font-bold text-xl mb-2">
                            {currentLanguage === 'ko' ? '프리미엄 전용 분석' : 'Premium Analysis'}
                          </p>
                          <p className="text-gray-400 text-sm mb-2">
                            {currentLanguage === 'ko' 
                              ? '전술 분석 · 승부처 · 상세 예측 데이터'
                              : 'Tactical Analysis · Key Factors · Detailed Predictions'}
                          </p>
                          <p className="text-gray-500 text-xs mb-5">
                            {currentLanguage === 'ko'
                              ? '프리미엄 구독으로 모든 분석 콘텐츠를 잠금 해제하세요'
                              : 'Unlock all analysis content with a premium subscription'}
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {!session ? (
                              <>
                                <Link
                                  href="/login"
                                  className="px-6 py-3 bg-[#A3FF4C] text-black font-bold rounded-lg hover:bg-[#8FE040] transition-colors text-sm no-underline"
                                >
                                  {currentLanguage === 'ko' ? '무료 가입하기' : 'Sign Up Free'}
                                </Link>
                                <Link
                                  href="/premium/pricing"
                                  className="px-6 py-3 bg-transparent border border-gray-600 text-gray-300 font-medium rounded-lg hover:border-[#A3FF4C] hover:text-white transition-colors text-sm no-underline"
                                >
                                  {currentLanguage === 'ko' ? '요금제 보기' : 'View Plans'}
                                </Link>
                              </>
                            ) : (
                              <Link
                                href="/premium/pricing"
                                className="px-8 py-3 bg-[#A3FF4C] text-black font-bold rounded-lg hover:bg-[#8FE040] transition-colors text-sm no-underline"
                              >
                                {currentLanguage === 'ko' ? '프리미엄 구독하기' : 'Go Premium'}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </>
            )
          })()}
        </div>

        {/* 📢 광고 - 본문 하단 (💎 프리미엄 제외) */}
        {!isPremium && (
          <div className="mt-10 mb-8">
            {/* 모바일: 인피드 */}
            <div className="lg:hidden">
              <div className="text-[10px] text-center mb-1 text-gray-600">스폰서</div>
              <AdSenseAd slot="mobile_infeed" format="auto" responsive={true} darkMode={true} />
            </div>
            {/* PC: 가로 배너 */}
            <div className="hidden lg:flex justify-center">
              <div className="w-full max-w-[728px]">
                <div className="text-[10px] text-center mb-1 text-gray-600">스폰서</div>
                <AdSenseAd slot="horizontal" format="horizontal" responsive={false} darkMode={true} />
              </div>
            </div>
          </div>
        )}

        {/* 태그 */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-full text-sm hover:bg-gray-700 transition"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 목록으로 돌아가기 */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <Link 
            href="/blog"
            className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition font-medium"
          >
            {currentLanguage === 'ko' ? '← 목록으로' : '← Back to List'}
          </Link>
        </div>
      </article>
    </div>
  )
}