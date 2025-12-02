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
      if (data.success) {
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

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl p-6">
                <div className="h-6 bg-white/10 rounded w-48 mb-4" />
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="aspect-video bg-white/10 rounded-xl" />
                  <div className="space-y-3">
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
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Football News</h1>
          <p className="text-white/40 mt-1">Latest updates from top leagues</p>
        </div>

        {/* 카테고리별 뉴스 */}
        <div className="space-y-8">
          {categories.map((category) => (
            <section key={category.id} className="bg-[#111] rounded-2xl overflow-hidden">
              {/* 카테고리 헤더 - 리그 엠블럼 with 흰색 배경 */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                {category.logo ? (
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center p-1">
                    <img 
                      src={category.logo} 
                      alt={category.name}
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                    <span className="text-lg">🔄</span>
                  </div>
                )}
                <h2 className="text-lg font-bold">{category.name}</h2>
              </div>

              {/* 뉴스 그리드 */}
              <div className="p-4">
                {category.articles.length > 0 && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* 메인 기사 (첫번째) */}
                    <a
                      href={category.articles[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group md:row-span-2"
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
                        <img
                          src={category.articles[0].imageUrl}
                          alt={category.articles[0].title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80'
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="font-bold text-lg leading-tight group-hover:text-emerald-400 transition-colors line-clamp-2">
                            {category.articles[0].title}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span className="font-medium">{category.articles[0].source}</span>
                        <span>•</span>
                        <span>{getTimeAgo(category.articles[0].publishedAt)}</span>
                      </div>
                    </a>

                    {/* 사이드 기사들 */}
                    <div className="space-y-3">
                      {category.articles.slice(1, 5).map((article) => (
                        <a
                          key={article.id}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm leading-snug group-hover:text-emerald-400 transition-colors line-clamp-2">
                              {article.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                              <span>{article.source}</span>
                              <span>•</span>
                              <span>{getTimeAgo(article.publishedAt)}</span>
                            </div>
                          </div>
                          <div className="w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-white/5">
                            <img
                              src={article.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200&q=80'
                              }}
                            />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* 푸터 */}
        <div className="mt-12 text-center text-white/20 text-sm">
          <p>Updates every 30 minutes • Powered by TheNewsAPI</p>
        </div>
      </div>

      <style jsx global>{`
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