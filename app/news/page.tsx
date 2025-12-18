'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

// 타입 정의
interface NewsArticle {
  id: string
  title: string
  description: string
  imageUrl: string
  url: string
  source: string
  publishedAt: string
}

interface NewsCategory {
  id: string
  name: string
  nameKo: string
  nameEn: string
  displayName?: string
  logo: string
  articles: NewsArticle[]
  hasImage: boolean
  color: string // 카테고리별 색상
}

// 카테고리별 색상 정의
const CATEGORY_COLORS: { [key: string]: string } = {
  'korean-football': '#10b981',      // 에메랄드
  'premier-league': '#8b5cf6',       // 보라
  'premier-league-ko': '#8b5cf6',
  'laliga-ko': '#ef4444',            // 레드
  'champions-league-ko': '#3b82f6',  // 블루
  'european-football-ko': '#f59e0b', // 앰버
  'champions-league': '#3b82f6',     // 블루
  'la-liga': '#ef4444',              // 레드
  'bundesliga': '#ec4899',           // 핑크
  'serie-a': '#06b6d4',              // 시안
  'default': '#10b981'
}

export default function NewsPage() {
  const { language } = useLanguage()
  const uiLang = language === 'ko' ? 'ko' : 'en'
  
  const [categories, setCategories] = useState<NewsCategory[]>([])
  const [loading, setLoading] = useState(true)

  // 텍스트 번역
  const text = uiLang === 'ko' ? {
    latestNews: '최신 뉴스',
    moreStories: '더 많은 기사',
    features: '주요 기사',
    viewAll: '전체 보기',
    noNews: '뉴스가 없습니다',
  } : {
    latestNews: 'Latest News',
    moreStories: 'More Stories',
    features: 'Features',
    viewAll: 'View All',
    noNews: 'No news available',
  }

  const fetchNews = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/news?ui=${uiLang}`)
      const data = await response.json()
      if (data.success && data.categories) {
        // 카테고리에 색상 추가 및 최신순 정렬
        const categoriesWithColor = data.categories.map((cat: NewsCategory) => ({
          ...cat,
          color: CATEGORY_COLORS[cat.id] || CATEGORY_COLORS['default'],
          articles: [...cat.articles].sort((a, b) => 
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          )
        }))
        setCategories(categoriesWithColor)
      }
    } catch (err) {
      console.error('News fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
  }, [language])

  // 30분마다 자동 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNews()
    }, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [uiLang])

  // 시간 포맷
  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) {
      return `${diffMins} min`
    } else if (diffHours < 24) {
      return `${diffHours} hr`
    } else {
      return `${diffDays}d`
    }
  }

  // 모든 기사 합치기 (최신순)
  const getAllArticles = () => {
    const all: (NewsArticle & { category: string; color: string })[] = []
    categories.forEach(cat => {
      cat.articles.forEach(article => {
        all.push({ 
          ...article, 
          category: cat.displayName || (uiLang === 'ko' ? cat.nameKo : cat.nameEn),
          color: cat.color
        })
      })
    })
    return all.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  }

  const allArticles = getAllArticles()
  const heroArticle = allArticles.find(a => a.imageUrl) || allArticles[0]
  const sideArticles = allArticles.filter(a => a.id !== heroArticle?.id && a.imageUrl).slice(0, 4)
  const bottomArticles = allArticles.filter(a => 
    a.id !== heroArticle?.id && !sideArticles.find(s => s.id === a.id) && a.imageUrl
  ).slice(0, 5)
  const featuredArticles = allArticles.slice(0, 5)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6 bg-white/5 rounded-xl aspect-[4/3]"></div>
              <div className="col-span-3 space-y-4">
                <div className="bg-white/5 rounded-xl aspect-video"></div>
                <div className="bg-white/5 rounded-xl aspect-video"></div>
              </div>
              <div className="col-span-3 space-y-4">
                <div className="bg-white/5 rounded-xl aspect-video"></div>
                <div className="bg-white/5 rounded-xl aspect-video"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* 메인 히어로 섹션 */}
        <section className="mb-8">
          <div className="grid lg:grid-cols-12 gap-4">
            {/* 큰 히어로 */}
            <div className="lg:col-span-6">
              {heroArticle && (
                <a 
                  href={heroArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group h-full"
                >
                  <article className="relative h-full rounded-xl overflow-hidden bg-[#161616]">
                    <div className="aspect-[4/3] lg:aspect-auto lg:h-full">
                      <img
                        src={heroArticle.imageUrl}
                        alt={heroArticle.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80'
                        }}
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h2 className="text-xl md:text-2xl font-bold leading-tight mb-3 text-white group-hover:text-emerald-400 transition-colors">
                        {heroArticle.title}
                      </h2>
                      <div className="flex items-center gap-2 text-sm">
                        <span style={{ color: heroArticle.color }} className="font-semibold">
                          {heroArticle.category}
                        </span>
                        <span className="text-white/40">•</span>
                        <span className="text-white/50">{getTimeAgo(heroArticle.publishedAt)}</span>
                      </div>
                    </div>
                  </article>
                </a>
              )}
            </div>

            {/* 오른쪽 4개 카드 (2x2) */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              {sideArticles.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <article className="bg-[#161616] rounded-xl overflow-hidden h-full">
                    <div className="aspect-video relative">
                      <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80'
                        }}
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm leading-snug text-white/90 group-hover:text-emerald-400 transition-colors line-clamp-2 mb-2">
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span style={{ color: article.color }} className="font-semibold">
                          {article.category}
                        </span>
                        <span className="text-white/40">•</span>
                        <span className="text-white/40">{getTimeAgo(article.publishedAt)}</span>
                      </div>
                    </div>
                  </article>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* 트렌드 PICK 배너 - 광고 스타일 */}
        <section className="mb-8">
          <a href="/premium" className="block group">
            <div className="relative bg-gradient-to-r from-[#2a1a1a] via-[#1a1a1a] to-[#2a1a1a] rounded-xl border border-orange-500/30 overflow-hidden hover:border-orange-500/50 transition-all py-4 px-6">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">🔥</span>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-orange-400">
                      {uiLang === 'ko' ? '트렌드 PICK' : 'Trend PICK'}
                    </span>
                    <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded animate-pulse">
                      LIVE
                    </span>
                    <span className="text-white/50 text-sm hidden sm:block">
                      {uiLang === 'ko' ? '평균 적중률 67%' : 'Avg. Accuracy 67%'}
                    </span>
                  </div>
                </div>
                <span className="text-orange-400 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                  {uiLang === 'ko' ? '무료 예측 보기 →' : 'View Predictions →'}
                </span>
              </div>
            </div>
          </a>
        </section>

        {/* 하단 5개 카드 */}
        <section className="mb-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {bottomArticles.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <article className="bg-[#161616] rounded-xl overflow-hidden h-full">
                  <div className="aspect-video relative">
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80'
                      }}
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm leading-snug text-white/90 group-hover:text-emerald-400 transition-colors line-clamp-2 mb-2">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span style={{ color: article.color }} className="font-semibold">
                        {article.category}
                      </span>
                      <span className="text-white/40">•</span>
                      <span className="text-white/40">{getTimeAgo(article.publishedAt)}</span>
                    </div>
                  </div>
                </article>
              </a>
            ))}
          </div>
        </section>

        {/* 카테고리별 섹션 */}
        {categories.map((category) => (
          <section key={category.id} className="mb-10">
            {/* 카테고리 헤더 */}
            <div className="flex items-center gap-2 mb-4">
              <h2 
                className="text-xl font-bold"
                style={{ color: category.color }}
              >
                {category.displayName || (uiLang === 'ko' ? category.nameKo : category.nameEn)}
              </h2>
              <span className="text-white/30">›</span>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              {/* 왼쪽: 큰 카드 */}
              <div className="lg:col-span-4">
                {category.articles[0] && (
                  <a
                    href={category.articles[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <article className="relative rounded-xl overflow-hidden bg-[#161616]">
                      <div className="aspect-[4/3]">
                        <img
                          src={category.articles[0].imageUrl}
                          alt={category.articles[0].title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80'
                          }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="font-bold text-base leading-snug text-white group-hover:text-emerald-400 transition-colors line-clamp-3 mb-2">
                          {category.articles[0].title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs">
                          <span style={{ color: category.color }} className="font-semibold">
                            {category.displayName || (uiLang === 'ko' ? category.nameKo : category.nameEn)}
                          </span>
                          <span className="text-white/40">•</span>
                          <span className="text-white/40">{getTimeAgo(category.articles[0].publishedAt)}</span>
                        </div>
                      </div>
                    </article>
                  </a>
                )}
              </div>

              {/* 가운데: 썸네일 + 제목 리스트 */}
              <div className="lg:col-span-5 space-y-3">
                {category.articles.slice(1, 5).map((article) => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-3 group"
                  >
                    <div className="w-28 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-[#161616]">
                      <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80'
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm leading-snug text-white/90 group-hover:text-emerald-400 transition-colors line-clamp-2 mb-1.5">
                        {article.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs">
                        <span style={{ color: category.color }} className="font-semibold">
                          {category.displayName || (uiLang === 'ko' ? category.nameKo : category.nameEn)}
                        </span>
                        <span className="text-white/40">•</span>
                        <span className="text-white/40">{getTimeAgo(article.publishedAt)}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {/* 오른쪽: Features (제목만) */}
              <div className="lg:col-span-3">
                <div className="bg-[#161616] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-white/70 mb-4 uppercase tracking-wider">
                    {text.features}
                  </h3>
                  <div className="space-y-3">
                    {category.articles.slice(0, 5).map((article, index) => (
                      <a
                        key={article.id}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-3 group"
                      >
                        <span 
                          className="text-lg font-bold w-6 flex-shrink-0"
                          style={{ color: category.color }}
                        >
                          {index + 1}
                        </span>
                        <p className="text-sm text-white/70 leading-snug group-hover:text-white transition-colors line-clamp-2">
                          {article.title}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}

      </div>

      <style jsx global>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}