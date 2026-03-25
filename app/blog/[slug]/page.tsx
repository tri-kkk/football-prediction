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
// 조회수 부스팅 설정
// =============================================================================
const VIEWS_BOOST_CONFIG = {
  enabled: true,
  baseBoost: { min: 50, max: 150 },
  timeBoost: { perDay: { min: 15, max: 40 }, maxDays: 30 },
  categoryMultiplier: {
    'preview': 1.5,
    'analysis': 1.3,
    'weekly': 1.2,
    'default': 1.0,
  },
  popularTags: ['프리미어리그', 'premier-league', '챔피언스리그', 'champions-league', '라리가', 'la-liga'],
  tagBonus: 30,
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000
  return x - Math.floor(x)
}

function seededRandomInt(seed: number, min: number, max: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min
}

function getBoostedViews(post: BlogPost): number {
  if (!VIEWS_BOOST_CONFIG.enabled) return post.views || 0
  const realViews = post.views || 0
  const seed = post.id

  const baseBoost = seededRandomInt(seed, VIEWS_BOOST_CONFIG.baseBoost.min, VIEWS_BOOST_CONFIG.baseBoost.max)

  const publishedDate = new Date(post.published_at)
  const now = new Date()
  const daysPassed = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24))
  const effectiveDays = Math.min(daysPassed, VIEWS_BOOST_CONFIG.timeBoost.maxDays)

  let timeBoost = 0
  for (let i = 0; i < effectiveDays; i++) {
    timeBoost += seededRandomInt(seed + i * 100, VIEWS_BOOST_CONFIG.timeBoost.perDay.min, VIEWS_BOOST_CONFIG.timeBoost.perDay.max)
  }

  const categoryMultiplier = VIEWS_BOOST_CONFIG.categoryMultiplier[post.category as keyof typeof VIEWS_BOOST_CONFIG.categoryMultiplier]
    || VIEWS_BOOST_CONFIG.categoryMultiplier.default

  let tagBonus = 0
  if (post.tags?.length) {
    const hasPopularTag = post.tags.some(tag =>
      VIEWS_BOOST_CONFIG.popularTags.some(popular =>
        tag.toLowerCase().includes(popular.toLowerCase())
      )
    )
    if (hasPopularTag) tagBonus = VIEWS_BOOST_CONFIG.tagBonus
  }

  return Math.floor((realViews + baseBoost + timeBoost + tagBonus) * categoryMultiplier)
}

function formatViews(views: number): string {
  if (views >= 10000) return (views / 1000).toFixed(0) + 'K'
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K'
  return views.toLocaleString()
}

const categoryColorMap: Record<string, { badge: string; bar: string }> = {
  weekly: { badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30', bar: 'from-blue-500 to-blue-600' },
  preview: { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', bar: 'from-emerald-500 to-emerald-600' },
  analysis: { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', bar: 'from-amber-500 to-amber-600' },
  guide: { badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', bar: 'from-purple-500 to-purple-600' },
  stats: { badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', bar: 'from-cyan-500 to-cyan-600' },
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
    if (slug) fetchPost()
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

  const getTitle = () => {
    if (!post) return ''
    if (currentLanguage === 'en' && post.title) return post.title
    return post.title_kr || post.title
  }

  const getExcerpt = () => {
    if (!post) return ''
    if (currentLanguage === 'en' && post.excerpt_en) return post.excerpt_en
    return post.excerpt
  }

  const getContent = () => {
    if (!post) return ''
    if (currentLanguage === 'en' && post.content_en) return post.content_en
    return post.content
  }

  const isShowingEnglish = () => {
    if (!post) return false
    return currentLanguage === 'en' && post.content_en
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#1e293b] border-t-emerald-500"></div>
          <p className="mt-4 text-gray-500 text-sm">
            {currentLanguage === 'ko' ? '로딩 중...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[#141824] border border-[#1e293b] flex items-center justify-center">
            <span className="text-3xl">😕</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {currentLanguage === 'ko' ? '포스트를 찾을 수 없습니다' : 'Post Not Found'}
          </h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/blog"
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl transition font-medium shadow-lg shadow-emerald-500/20"
          >
            {currentLanguage === 'ko' ? '블로그로 돌아가기' : 'Back to Blog'}
          </Link>
        </div>
      </div>
    )
  }

  const displayViews = getBoostedViews(post)
  const catColors = categoryColorMap[post.category] || { badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30', bar: 'from-gray-500 to-gray-600' }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* 커버 이미지 */}
      {post.cover_image && (
        <div className="relative w-full max-w-5xl mx-auto overflow-hidden bg-[#0f1623] rounded-b-2xl">
          <div className="relative w-full" style={{ paddingBottom: '52.5%' }}>
            <img
              src={post.cover_image}
              alt={getTitle()}
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent"></div>
        </div>
      )}

      {/* 포스트 내용 */}
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* 메타 정보 헤더 */}
        <div className="mb-8">
          {/* 카테고리 + 메타 */}
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-5 flex-wrap">
            <span className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${catColors.badge}`}>
              {post.category.toUpperCase()}
            </span>
            <span className="text-gray-500">{formatDate(post.published_at)}</span>
            <span className="text-gray-700">·</span>
            <span className="flex items-center gap-1 text-gray-500">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {formatViews(displayViews)}
            </span>
            {currentLanguage === 'en' && !post.content_en && (
              <span className="px-2 py-1 bg-[#141824] text-gray-400 rounded-lg text-xs border border-[#1e293b]">
                Korean version
              </span>
            )}
          </div>

          {/* 제목 */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-5 leading-tight tracking-tight">
            {getTitle()}
          </h1>

          {/* 요약 */}
          {getExcerpt() && (
            <p className="text-lg text-gray-400 leading-relaxed">
              {getExcerpt()}
            </p>
          )}

          {/* 작성자 */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-[#1e293b]">
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">
              ⚽
            </div>
            <div>
              <div className="font-bold text-sm">{post.author}</div>
              <div className="text-xs text-gray-500">
                {currentLanguage === 'ko' ? '축구 데이터 분석가' : 'Football Data Analyst'}
              </div>
            </div>
          </div>
        </div>

        {/* 영문 버전 없음 안내 */}
        {currentLanguage === 'en' && !post.content_en && (
          <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-amber-400 text-sm flex items-center gap-2">
              <span>💡</span>
              <span>This article is only available in Korean. English translation coming soon!</span>
            </p>
          </div>
        )}

        {/* 본문 */}
        <div className="prose prose-invert prose-lg max-w-none">
          {(() => {
            const content = getContent()
            const sections = content.split(/\n(?=##\s)/)

            const BLUR_KEYWORDS = [
              '전술 포인트', 'Tactical Points',
              '승부처', 'Key Factors',
              'TrendSoccer 예측', 'TrendSoccer Prediction',
            ]

            const isBlurSection = (section: string): boolean => {
              const firstLine = section.split('\n')[0] || ''
              return BLUR_KEYWORDS.some(kw => firstLine.includes(kw))
            }

            // 섹션 아이콘/색상 매핑
            const getSectionMeta = (section: string) => {
              const firstLine = section.split('\n')[0] || ''
              if (firstLine.includes('최근 폼') || firstLine.includes('Recent Form')) return { color: 'from-blue-500 to-blue-600', icon: '📊' }
              if (firstLine.includes('성적') || firstLine.includes('Record')) return { color: 'from-amber-500 to-amber-600', icon: '🏆' }
              if (firstLine.includes('스탯') || firstLine.includes('Stat')) return { color: 'from-cyan-500 to-cyan-600', icon: '📈' }
              if (firstLine.includes('전술') || firstLine.includes('Tactical')) return { color: 'from-purple-500 to-purple-600', icon: '🎯' }
              if (firstLine.includes('라인업') || firstLine.includes('Lineup')) return { color: 'from-green-500 to-green-600', icon: '👥' }
              if (firstLine.includes('승부처') || firstLine.includes('Key Factor')) return { color: 'from-rose-500 to-rose-600', icon: '💡' }
              if (firstLine.includes('예측') || firstLine.includes('Prediction')) return { color: 'from-emerald-500 to-emerald-600', icon: '📈' }
              if (firstLine.includes('상대 전적') || firstLine.includes('Head')) return { color: 'from-orange-500 to-orange-600', icon: '⚔️' }
              if (firstLine.includes('Tags') || firstLine.includes('태그')) return { color: 'from-gray-500 to-gray-600', icon: '🏷️' }
              return null
            }

            // 마크다운 컴포넌트
            const mdComponents = {
              h1: ({ children }: any) => (
                <h1 className="text-3xl font-bold mt-8 mb-4 text-white border-b border-[#1e293b] pb-3">{children}</h1>
              ),
              h2: ({ children }: any) => {
                // h2는 섹션 헤더에서 이미 처리하므로 심플하게
                return (
                  <h2 className="text-2xl font-bold mt-8 mb-4 text-white">{children}</h2>
                )
              },
              h3: ({ children }: any) => (
                <h3 className="text-xl font-bold mt-6 mb-3 text-white">{children}</h3>
              ),
              p: ({ children }: any) => (
                <p className="text-gray-300 leading-relaxed mb-4">{children}</p>
              ),
              strong: ({ children }: any) => (
                <strong className="text-white font-bold">{children}</strong>
              ),
              ul: ({ children }: any) => (
                <ul className="text-gray-300 mb-4 space-y-2 ml-1">{children}</ul>
              ),
              ol: ({ children }: any) => (
                <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2">{children}</ol>
              ),
              li: ({ children }: any) => (
                <li className="flex gap-2 items-start">
                  <span className="text-emerald-400 mt-1.5 text-[8px]">●</span>
                  <span className="flex-1">{children}</span>
                </li>
              ),
              blockquote: ({ children }: any) => (
                <blockquote className="border-l-3 border-emerald-500 pl-4 py-3 my-5 bg-emerald-500/5 rounded-r-xl text-gray-300 italic">{children}</blockquote>
              ),
              code: ({ children }: any) => {
                // 확률 바 텍스트 감지 (예: "████████████░░░░ 59%")
                const text = String(children)
                const barMatch = text.match(/^(.+?)\s+(█+░*)\s+(\d+)%\s*$/)
                if (barMatch) {
                  const [, label, , pct] = barMatch
                  const percent = parseInt(pct)
                  return (
                    <div className="flex items-center gap-3 py-1.5">
                      <span className="text-sm text-gray-300 w-28 shrink-0 truncate">{label.trim()}</span>
                      <div className="flex-1 h-6 bg-[#1e293b] rounded-lg overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-lg transition-all"
                          style={{ width: `${percent}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-bold text-white">
                          {percent}%
                        </span>
                      </div>
                    </div>
                  )
                }
                return <code className="bg-[#141824] text-emerald-400 px-2 py-1 rounded-lg text-sm border border-[#1e293b]">{children}</code>
              },
              pre: ({ children }: any) => {
                // pre 안의 code의 텍스트 확인 - 확률 차트인 경우 카드 스타일
                const codeChild = (children as any)?.props?.children
                const text = String(codeChild || '')
                const lines = text.trim().split('\n')
                const hasBarChart = lines.some((line: string) => /█/.test(line) && /%/.test(line))

                if (hasBarChart) {
                  return (
                    <div className="my-6 p-4 bg-[#141824] rounded-2xl border border-[#1e293b]">
                      <div className="space-y-2">
                        {lines.filter((l: string) => l.trim()).map((line: string, i: number) => {
                          const barMatch = line.match(/^(.+?)\s+(█+░*)\s+(\d+)%\s*$/)
                          if (barMatch) {
                            const [, label, , pct] = barMatch
                            const percent = parseInt(pct)
                            const isHighest = lines.every((l: string) => {
                              const m = l.match(/(\d+)%/)
                              return !m || parseInt(m[1]) <= percent
                            })
                            return (
                              <div key={i} className="flex items-center gap-3 py-1">
                                <span className="text-sm text-gray-300 w-28 shrink-0 truncate">{label.trim()}</span>
                                <div className="flex-1 h-7 bg-[#0f1623] rounded-lg overflow-hidden relative">
                                  <div
                                    className={`h-full rounded-lg transition-all ${isHighest ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-gray-600 to-gray-500'}`}
                                    style={{ width: `${percent}%` }}
                                  />
                                  <span className="absolute inset-0 flex items-center justify-end pr-3 text-xs font-bold text-white drop-shadow">
                                    {percent}%
                                  </span>
                                </div>
                              </div>
                            )
                          }
                          return <div key={i} className="text-gray-400 text-sm">{line}</div>
                        })}
                      </div>
                    </div>
                  )
                }

                return (
                  <pre className="bg-[#141824] p-4 rounded-2xl overflow-x-auto my-4 border border-[#1e293b] text-sm">{children}</pre>
                )
              },
              table: ({ children }: any) => (
                <div className="overflow-x-auto my-6 rounded-2xl border border-[#1e293b]">
                  <table className="w-full border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }: any) => (
                <thead className="bg-gradient-to-r from-[#141824] to-[#1a1f2e]">{children}</thead>
              ),
              th: ({ children }: any) => (
                <th className="border-b border-[#1e293b] px-4 py-3 text-left font-bold text-sm text-emerald-400">{children}</th>
              ),
              td: ({ children }: any) => (
                <td className="border-b border-[#1e293b]/50 px-4 py-3 text-sm">{children}</td>
              ),
              tr: ({ children }: any) => (
                <tr className="hover:bg-[#141824]/50 transition-colors">{children}</tr>
              ),
              a: ({ children, href }: any) => (
                <a href={href} className="text-emerald-400 hover:text-emerald-300 underline decoration-emerald-400/30 underline-offset-2" target="_blank" rel="noopener noreferrer">{children}</a>
              ),
              hr: () => <hr className="my-8 border-[#1e293b]" />,
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

            const midPoint = Math.floor(freeSections.length / 2)

            // 섹션에서 h2 제목을 분리하는 헬퍼
            const splitSectionHeading = (section: string) => {
              if (!section.startsWith('##')) return { heading: null, body: section }
              const lines = section.split('\n')
              const headingLine = lines[0]
              const heading = headingLine.replace(/^##\s*/, '').replace(/^[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\p{Emoji_Modifier}\p{Emoji_Component}\s]+/u, '').trim()
              const body = lines.slice(1).join('\n').trim()
              return { heading, body }
            }

            // 섹션 렌더링 헬퍼
            const renderSection = (section: string, keyPrefix: string, idx: number) => {
              const meta = getSectionMeta(section)
              const { heading, body } = splitSectionHeading(section)

              return (
                <div key={`${keyPrefix}-${idx}`}>
                  {meta && heading ? (
                    <>
                      <div className="mt-10 mb-4 flex items-center gap-2.5">
                        <div className={`w-1 h-7 rounded-full bg-gradient-to-b ${meta.color}`} />
                        <span className="text-sm text-gray-500">{meta.icon}</span>
                        <h2 className="text-2xl font-bold text-white">{heading}</h2>
                      </div>
                      {body && (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                          {body}
                        </ReactMarkdown>
                      )}
                    </>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {section}
                    </ReactMarkdown>
                  )}
                </div>
              )
            }

            return (
              <>
                {/* 무료 섹션들 */}
                {freeSections.map((section, idx) => (
                  <div key={`free-wrap-${idx}`}>
                    {renderSection(section, 'free', idx)}

                    {/* 중간 광고 */}
                    {idx === midPoint - 1 && !isPremium && (
                      <div className="my-8 rounded-2xl overflow-hidden">
                        <AdSenseAd slot="in_article" darkMode={true} />
                      </div>
                    )}
                  </div>
                ))}

                {/* 프리미엄 섹션들 */}
                {premiumSections.length > 0 && (
                  isPremium ? (
                    <>
                      {premiumSections.map((section, idx) => renderSection(section, 'prem', idx))}
                    </>
                  ) : (
                    <div className="relative mt-10">
                      {/* 블러 영역 */}
                      <div className="blur-[6px] opacity-30 pointer-events-none select-none max-h-[300px] overflow-hidden" aria-hidden="true">
                        {premiumSections.map((section, idx) => (
                          <ReactMarkdown key={`blur-${idx}`} remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {section}
                          </ReactMarkdown>
                        ))}
                      </div>

                      {/* 그라데이션 페이드아웃 */}
                      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent" />

                      {/* CTA 카드 */}
                      <div className="relative -mt-20 flex justify-center pb-4">
                        <div className="bg-[#141824] border border-[#1e293b] rounded-2xl px-8 py-8 text-center max-w-lg mx-4 shadow-2xl">
                          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/20 flex items-center justify-center">
                            <span className="text-2xl">🔒</span>
                          </div>
                          <p className="text-white font-bold text-xl mb-2">
                            {currentLanguage === 'ko' ? '프리미엄 전용 분석' : 'Premium Analysis'}
                          </p>
                          <p className="text-gray-400 text-sm mb-2">
                            {currentLanguage === 'ko'
                              ? '전술 분석 · 승부처 · 상세 예측 데이터'
                              : 'Tactical Analysis · Key Factors · Detailed Predictions'}
                          </p>
                          <p className="text-gray-600 text-xs mb-6">
                            {currentLanguage === 'ko'
                              ? '프리미엄 구독으로 모든 분석 콘텐츠를 잠금 해제하세요'
                              : 'Unlock all analysis content with a premium subscription'}
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {!session ? (
                              <>
                                <Link
                                  href="/login"
                                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-400 hover:to-emerald-500 transition-all text-sm no-underline shadow-lg shadow-emerald-500/20"
                                >
                                  {currentLanguage === 'ko' ? '무료 가입하기' : 'Sign Up Free'}
                                </Link>
                                <Link
                                  href="/premium/pricing"
                                  className="px-6 py-3 bg-transparent border border-[#1e293b] text-gray-300 font-medium rounded-xl hover:border-emerald-500/40 hover:text-white transition-all text-sm no-underline"
                                >
                                  {currentLanguage === 'ko' ? '요금제 보기' : 'View Plans'}
                                </Link>
                              </>
                            ) : (
                              <Link
                                href="/premium/pricing"
                                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-400 hover:to-emerald-500 transition-all text-sm no-underline shadow-lg shadow-emerald-500/20"
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

        {/* 광고 - 본문 하단 (프리미엄 제외) */}
        {!isPremium && (
          <div className="mt-10 mb-8">
            <div className="lg:hidden">
              <div className="text-[10px] text-center mb-1 text-gray-600">AD</div>
              <AdSenseAd slot="mobile_infeed" format="auto" responsive={true} darkMode={true} />
            </div>
            <div className="hidden lg:flex justify-center">
              <div className="w-full max-w-[728px]">
                <div className="text-[10px] text-center mb-1 text-gray-600">AD</div>
                <AdSenseAd slot="horizontal" format="horizontal" responsive={false} darkMode={true} />
              </div>
            </div>
          </div>
        )}

        {/* 태그 */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t border-[#1e293b]">
            <div className="flex flex-wrap gap-2">
              {[...new Set(post.tags)].map(tag => {
                const isKorean = /[가-힣]/.test(tag)
                return (
                  <span
                    key={tag}
                    className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                      isKorean
                        ? 'bg-emerald-500/10 text-emerald-400/80 hover:bg-emerald-500/20 border border-emerald-500/10'
                        : 'bg-[#141824] text-gray-400 hover:bg-[#1a1f2e] border border-[#1e293b]'
                    }`}
                  >
                    #{tag}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* 목록으로 돌아가기 */}
        <div className="mt-12 pt-8 border-t border-[#1e293b]">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#141824] hover:bg-[#1a1f2e] text-white rounded-xl transition-all font-medium border border-[#1e293b] hover:border-emerald-500/30 group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>{currentLanguage === 'ko' ? '목록으로' : 'Back to List'}</span>
          </Link>
        </div>
      </article>
    </div>
  )
}
