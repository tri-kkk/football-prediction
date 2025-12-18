'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

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
  nameEn?: string
  displayName?: string
  logo: string
  hasImage: boolean
  articles: NewsArticle[]
}

interface Match {
  id: number
  homeTeam: string
  awayTeam: string
  homeLogo: string
  awayLogo: string
  league: string
  leagueLogo: string
  matchDate: string
  homeWinRate: number
  awayWinRate: number
}

export default function NewsPage() {
  const { language } = useLanguage()
  const [categories, setCategories] = useState<NewsCategory[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  
  const uiLang = language === 'ko' ? 'ko' : 'en'

  // 다국어 텍스트
  const t = {
    ko: {
      title: 'Football News',
      subtitle: '유럽 축구 소식을 한눈에',
      all: '전체',
      headline: '헤드라인',
      mainNews: '주요 뉴스',
      trending: '실시간 인기',
      leagueNews: '리그별 뉴스',
      more: '더보기',
      autoUpdate: '30분마다 자동 업데이트',
      terms: '이용약관',
      privacy: '개인정보처리방침',
      bigMatch: '이번 주 빅매치',
      viewPrediction: '예측 보기',
    },
    en: {
      title: 'Football News',
      subtitle: 'European Football at a Glance',
      all: 'All',
      headline: 'Headline',
      mainNews: 'Featured',
      trending: 'Trending',
      leagueNews: 'By League',
      more: 'More',
      autoUpdate: 'Updates every 30 minutes',
      terms: 'Terms',
      privacy: 'Privacy',
      bigMatch: 'Big Matches',
      viewPrediction: 'View Prediction',
    }
  }

  const text = t[uiLang]

  // 언어 변경 시 뉴스 다시 fetch
  useEffect(() => {
    fetchNews()
    fetchMatches()
  }, [language])

  const fetchNews = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/news?ui=${uiLang}`)
      const data = await response.json()
      if (data.success && data.categories) {
        // 각 카테고리 내 기사들을 최신순으로 정렬
        const sortedCategories = data.categories.map((cat: NewsCategory) => ({
          ...cat,
          articles: [...cat.articles].sort((a, b) => 
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          )
        }))
        setCategories(sortedCategories)
      }
    } catch (err) {
      console.error('News fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/odds-from-db?league=ALL')
      const data = await response.json()
      if (data.matches && Array.isArray(data.matches)) {
        // 향후 3일 이내 경기만 필터링하고 최대 4개
        const now = new Date()
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        
        const upcomingMatches = data.matches
          .filter((m: any) => {
            const matchDate = new Date(m.matchDate || m.match_date)
            return matchDate >= now && matchDate <= threeDaysLater
          })
          .slice(0, 4)
          .map((m: any) => ({
            id: m.id || m.match_id,
            homeTeam: m.homeTeam || m.home_team,
            awayTeam: m.awayTeam || m.away_team,
            homeLogo: m.homeLogo || m.home_logo || '',
            awayLogo: m.awayLogo || m.away_logo || '',
            league: m.league || m.league_name || '',
            leagueLogo: m.leagueLogo || m.league_logo || '',
            matchDate: m.matchDate || m.match_date,
            homeWinRate: m.homeWinRate || m.home_win_rate || 0,
            awayWinRate: m.awayWinRate || m.away_win_rate || 0,
          }))
        
        setMatches(upcomingMatches)
      }
    } catch (err) {
      console.error('Matches fetch error:', err)
    }
  }

  // 경기 날짜 포맷
  const formatMatchDate = (dateString: string) => {
    const date = new Date(dateString)
    const days = uiLang === 'ko' 
      ? ['일', '월', '화', '수', '목', '금', '토']
      : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    const day = days[date.getDay()]
    const hours = date.getHours().toString().padStart(2, '0')
    const mins = date.getMinutes().toString().padStart(2, '0')
    return `${day} ${hours}:${mins}`
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (uiLang === 'ko') {
      if (diffMins < 1) return '방금 전'
      if (diffMins < 60) return `${diffMins}분 전`
      if (diffHours < 24) return `${diffHours}시간 전`
      if (diffDays < 7) return `${diffDays}일 전`
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    } else {
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  // 모든 기사를 하나의 배열로 합침 (최신순)
  const getAllArticles = () => {
    const all: (NewsArticle & { league: string; leagueLogo: string })[] = []
    categories.forEach(cat => {
      cat.articles.forEach(article => {
        all.push({ 
          ...article, 
          league: cat.displayName || (uiLang === 'ko' ? cat.nameKo : cat.nameEn) || cat.nameKo, 
          leagueLogo: cat.logo 
        })
      })
    })
    // 최신순 정렬
    return all.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  }

  // Hero 기사 (최신 기사 중 이미지 있는 것)
  const getHeroArticle = () => {
    const allWithImages = getAllArticles().filter(a => a.imageUrl)
    return allWithImages[0] || null
  }

  // Featured 기사들 (최신순, 이미지 있는 것)
  const getFeaturedArticles = () => {
    const allWithImages = getAllArticles().filter(a => a.imageUrl)
    return allWithImages.slice(1, 5) // Hero 다음 4개
  }

  // 트렌딩 (최신 순)
  const getTrendingArticles = () => {
    return getAllArticles().slice(0, 8)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-white/5 rounded w-48 mb-8" />
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 aspect-[16/9] bg-white/5 rounded-2xl" />
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-white/5 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const heroArticle = getHeroArticle()
  const featuredArticles = getFeaturedArticles()
  const trendingArticles = getTrendingArticles()
  const allArticles = getAllArticles()
  
  // 티커용 기사: 현재 UI 언어에 맞는 기사 우선
  const tickerArticles = allArticles.slice(0, 5)

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      {/* Breaking News 티커 - 세련된 다크 스타일 */}
      <div className="bg-[#111] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-10 gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
            </div>
            <div className="h-4 w-px bg-white/10"></div>
            <div className="overflow-hidden flex-1">
              <div className="animate-marquee whitespace-nowrap">
                {tickerArticles.map((article, i) => (
                  <span key={article.id} className="inline-block text-sm text-white/50">
                    <span className="text-white/70">{article.title}</span>
                    {i < tickerArticles.length - 1 && <span className="mx-6 text-white/20">•</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 - 필터만 */}
        <header className="mb-8">
          {/* 리그 필터 탭 */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-[#1e1e1e] text-white/70 hover:bg-[#252525] hover:text-white'
              }`}
            >
              {text.all}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2.5 ${
                  activeTab === cat.id
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-[#1e1e1e] text-white/70 hover:bg-[#252525] hover:text-white'
                }`}
              >
                <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <img 
                    src={cat.logo} 
                    alt="" 
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </span>
                {cat.displayName || (uiLang === 'ko' ? cat.nameKo : cat.nameEn) || cat.nameKo}
              </button>
            ))}
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* 왼쪽: 메인 뉴스 영역 */}
          <main className="lg:col-span-8 space-y-8">
            {/* Hero 섹션 */}
            {heroArticle && (
              <section>
                <a
                  href={heroArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <article className="relative rounded-xl overflow-hidden bg-[#161616]">
                    <div className="aspect-[16/9] relative">
                      <img
                        src={heroArticle.imageUrl}
                        alt={heroArticle.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/60 to-transparent" />
                      
                      {/* 콘텐츠 오버레이 */}
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded text-xs font-medium border border-emerald-500/20">
                            {text.headline}
                          </span>
                          <div className="flex items-center gap-2 text-white/40 text-xs">
                            <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                              <img src={heroArticle.leagueLogo} alt="" className="w-4 h-4 object-contain" />
                            </span>
                            <span>{heroArticle.league}</span>
                          </div>
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold leading-tight mb-3 text-white/90 group-hover:text-emerald-400 transition-colors">
                          {heroArticle.title}
                        </h2>
                        {heroArticle.description && (
                          <p className="text-white/50 text-sm line-clamp-2 mb-4 max-w-2xl">
                            {heroArticle.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-white/30">
                          <span className="text-white/50">{heroArticle.source}</span>
                          <span className="w-1 h-1 rounded-full bg-white/20"></span>
                          <span>{getTimeAgo(heroArticle.publishedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                </a>
              </section>
            )}

            {/* Featured Grid */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">{text.mainNews}</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {featuredArticles.slice(1, 5).map((article) => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <article className="relative rounded-xl overflow-hidden bg-[#161616] border border-white/5 hover:border-white/10 transition-colors">
                      <div className="aspect-video relative">
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80'
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#161616] via-transparent to-transparent" />
                        
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-4 h-4 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                              <img src={article.leagueLogo} alt="" className="w-3 h-3 object-contain" />
                            </span>
                            <span className="text-white/40 text-xs">{article.league}</span>
                          </div>
                          <h4 className="font-semibold text-sm leading-snug text-white/80 group-hover:text-emerald-400 transition-colors line-clamp-2">
                            {article.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-white/30 mt-2">
                            <span>{article.source}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <span>{getTimeAgo(article.publishedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  </a>
                ))}
              </div>
            </section>

            {/* 리그별 뉴스 섹션 */}
            {categories.map((category, catIndex) => (
              (activeTab === 'all' || activeTab === category.id) && (
                <section key={category.id} className="pt-6">
                  {/* 카테고리 헤더 */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
                        <img 
                          src={category.logo} 
                          alt={category.name}
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                      <h3 className="font-semibold text-white/80">
                        {category.displayName || (uiLang === 'ko' ? category.nameKo : category.nameEn) || category.nameKo}
                      </h3>
                      <span className="text-white/20 text-xs">{category.articles.length}</span>
                    </div>
                  </div>

                  {/* 뉴스 그리드 */}
                  {category.hasImage ? (
                    <div className="grid md:grid-cols-3 gap-4">
                      {category.articles.slice(0, 6).map((article, index) => (
                        <a
                          key={article.id}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`group ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
                        >
                          <article className="h-full bg-[#161616] rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-colors">
                            <div className={`relative ${index === 0 ? 'aspect-[4/3]' : 'aspect-video'}`}>
                              <img
                                src={article.imageUrl}
                                alt={article.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80'
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#161616] to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <h4 className={`font-semibold leading-snug text-white/80 group-hover:text-emerald-400 transition-colors line-clamp-2 ${
                                  index === 0 ? 'text-base' : 'text-sm'
                                }`}>
                                  {article.title}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-white/30 mt-2">
                                  <span>{article.source}</span>
                                  <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                  <span>{getTimeAgo(article.publishedAt)}</span>
                                </div>
                              </div>
                            </div>
                          </article>
                        </a>
                      ))}
                    </div>
                  ) : (
                    // 텍스트 기반 뉴스
                    <div className="space-y-1">
                      {category.articles.slice(0, 8).map((article) => (
                        <a
                          key={article.id}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors"
                        >
                          <span className="w-1 h-1 rounded-full bg-emerald-500/50 mt-2 flex-shrink-0"></span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm text-white/60 leading-snug group-hover:text-emerald-400 transition-colors line-clamp-1">
                              {article.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-white/25 mt-1">
                              <span>{article.source}</span>
                              <span className="w-1 h-1 rounded-full bg-white/15"></span>
                              <span>{getTimeAgo(article.publishedAt)}</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </section>
              )
            ))}
          </main>

          {/* 오른쪽: 사이드바 */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="sticky top-4 space-y-6">
              {/* 실시간 트렌딩 */}
              <section className="bg-[#161616] rounded-xl border border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-white/80">
                    <span className="text-orange-400">🔥</span>
                    {text.trending}
                  </h3>
                </div>
                <div className="divide-y divide-white/5">
                  {trendingArticles.slice(0, 6).map((article, index) => (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors group"
                    >
                      <span className={`text-base font-bold w-5 tabular-nums ${
                        index < 3 ? 'text-emerald-400/80' : 'text-white/15'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm text-white/60 leading-snug group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {article.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-white/25 mt-1.5">
                          <span className="w-4 h-4 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                            <img 
                              src={article.leagueLogo} 
                              alt="" 
                              className="w-3 h-3 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          </span>
                          <span>{article.league}</span>
                          <span className="w-1 h-1 rounded-full bg-white/15"></span>
                          <span>{getTimeAgo(article.publishedAt)}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>

              {/* 트렌드 PICK 배너 - 메인 페이지 스타일 */}
              <section>
                <a href="/premium" className="block group">
                  <div className="relative bg-gradient-to-b from-[#2a1a1a] to-[#1a1a1a] rounded-2xl border border-orange-500/30 overflow-hidden hover:border-orange-500/50 transition-all shadow-lg shadow-orange-500/10">
                    {/* 상단 글로우 효과 */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
                    
                    <div className="p-5">
                      {/* 헤더 */}
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-xl">🔥</span>
                        <span className="text-base font-bold text-orange-400">
                          {uiLang === 'ko' ? '트렌드 PICK' : 'Trend PICK'}
                        </span>
                        <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded animate-pulse">
                          LIVE
                        </span>
                      </div>
                      
                      {/* 적중률 */}
                      <div className="text-center mb-4">
                        <p className="text-white/50 text-xs mb-1">
                          {uiLang === 'ko' ? '평균 적중률' : 'Avg. Accuracy'}
                        </p>
                        <div className="text-4xl font-bold text-white">
                          67%
                        </div>
                      </div>
                      
                      {/* CTA 버튼 */}
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg py-3 px-4 text-center group-hover:from-orange-400 group-hover:to-orange-500 transition-all">
                        <span className="text-white font-semibold text-sm">
                          {uiLang === 'ko' ? '무료로 예측 확인 →' : 'Check Predictions →'}
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              </section>
            </div>
          </aside>
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
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
      `}</style>
    </div>
  )
}