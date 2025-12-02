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

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNews = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/news?league=ALL&limit=10')
      const data = await response.json()
      if (data.success) {
        setArticles(data.articles)
      }
    } catch (err) {
      console.error('News fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
  }, [])

  // 상대 시간
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 타이틀 */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Football News</h1>
          <p className="text-white/40 mt-2">Latest updates from around the world</p>
        </div>

        {/* 로딩 */}
        {loading ? (
          <div className="space-y-8">
            <div className="animate-pulse aspect-[21/9] bg-white/5 rounded-3xl" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-video bg-white/5 rounded-2xl mb-4" />
                  <div className="h-4 bg-white/5 rounded w-1/4 mb-3" />
                  <div className="h-5 bg-white/5 rounded w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-20">⚽</div>
            <p className="text-white/40">No articles found</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {articles[0] && (
              <a
                href={articles[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block mb-10"
              >
                <div className="relative aspect-[21/9] rounded-3xl overflow-hidden bg-white/5">
                  <img
                    src={articles[0].imageUrl}
                    alt={articles[0].title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-emerald-500 text-black text-xs font-bold rounded-full uppercase tracking-wide">
                        Featured
                      </span>
                      <span className="text-white/60 text-sm">{articles[0].source}</span>
                      <span className="text-white/40 text-sm">{getTimeAgo(articles[0].publishedAt)}</span>
                    </div>
                    <h2 className="text-xl md:text-3xl lg:text-4xl font-bold leading-tight max-w-4xl group-hover:text-emerald-400 transition-colors">
                      {articles[0].title}
                    </h2>
                  </div>
                </div>
              </a>
            )}

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.slice(1).map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className="relative aspect-video rounded-2xl overflow-hidden mb-4 bg-white/5">
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80'
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="text-white/50 font-medium">{article.source}</span>
                    <span className="text-white/30">•</span>
                    <span className="text-white/30">{getTimeAgo(article.publishedAt)}</span>
                  </div>
                  
                  <h3 className="font-semibold leading-snug text-white/90 group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                </a>
              ))}
            </div>
          </>
        )}
      </main>

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