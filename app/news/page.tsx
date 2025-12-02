'use client'

import { useState, useEffect } from 'react'

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
  logo: string
  hasImage: boolean
  articles: NewsArticle[]
}

export default function NewsPage() {
  const [categories, setCategories] = useState<NewsCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/news')
      const data = await response.json()
      if (data.success && data.categories) {
        setCategories(data.categories)
      }
    } catch (err) {
      console.error('News fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl p-5">
                <div className="h-6 bg-white/10 rounded w-40 mb-4" />
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="aspect-video bg-white/10 rounded-xl" />
                  <div className="space-y-2">
                    <div className="h-4 bg-white/10 rounded" />
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>⚽</span>
            <span>Football News</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">Latest updates</p>
        </div>

        {/* 카테고리별 뉴스 */}
        <div className="space-y-6">
          {categories.map((category) => (
            <section key={category.id} className="bg-[#111] rounded-2xl overflow-hidden">
              {/* 카테고리 헤더 */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center p-1">
                  <img 
                    src={category.logo} 
                    alt={category.name}
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
                <h2 className="font-bold">{category.nameKo}</h2>
              </div>

              {/* 뉴스 콘텐츠 */}
              <div className="p-4">
                {category.hasImage ? (
                  // 해외 뉴스 (이미지 레이아웃)
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* 메인 기사 */}
                    {category.articles[0] && (
                      <a
                        href={category.articles[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                      >
                        <div className="relative aspect-video rounded-xl overflow-hidden mb-2">
                          <img
                            src={category.articles[0].imageUrl}
                            alt={category.articles[0].title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80'
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h3 className="font-bold text-sm leading-tight group-hover:text-emerald-400 transition-colors line-clamp-2">
                              {category.articles[0].title}
                            </h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <span>{category.articles[0].source}</span>
                          <span>•</span>
                          <span>{getTimeAgo(category.articles[0].publishedAt)}</span>
                        </div>
                      </a>
                    )}

                    {/* 사이드 기사 */}
                    <div className="space-y-2">
                      {category.articles.slice(1, 4).map((article) => (
                        <a
                          key={article.id}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm leading-snug group-hover:text-emerald-400 transition-colors line-clamp-2">
                              {article.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                              <span>{article.source}</span>
                              <span>•</span>
                              <span>{getTimeAgo(article.publishedAt)}</span>
                            </div>
                          </div>
                          <div className="w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-white/5">
                            <img
                              src={article.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  // 한국 뉴스 (텍스트 리스트)
                  <div className="space-y-1">
                    {category.articles.map((article) => (
                      <a
                        key={article.id}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <span className="text-emerald-500 mt-0.5">•</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm leading-snug group-hover:text-emerald-400 transition-colors line-clamp-1">
                            {article.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                            <span>{article.source}</span>
                            <span>•</span>
                            <span>{getTimeAgo(article.publishedAt)}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* 푸터 */}
        <div className="mt-8 text-center text-white/20 text-xs">
          <p>30분마다 업데이트</p>
        </div>
      </div>

      <style jsx global>{`
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}