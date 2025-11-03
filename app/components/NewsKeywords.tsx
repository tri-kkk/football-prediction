import { useState, useEffect } from 'react'

interface NewsKeyword {
  keyword: string
  count: number
  relevance: number
}

interface NewsHeadline {
  title: string
  url: string
  source: string
  date: string
}

interface NewsData {
  keywords: NewsKeyword[]
  headlines: NewsHeadline[]
  totalArticles: number
  sources: {
    google: number
    naver: number
    espn?: number
    bbc?: number
  }
}

interface NewsKeywordsProps {
  homeTeam: string
  awayTeam: string
  matchId: number
}

export default function NewsKeywords({ homeTeam, awayTeam, matchId }: NewsKeywordsProps) {
  const [newsData, setNewsData] = useState<NewsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showHeadlines, setShowHeadlines] = useState(false)

  useEffect(() => {
    fetchNewsKeywords()
  }, [homeTeam, awayTeam, matchId])

  const fetchNewsKeywords = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(
        `/api/news/keywords?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch news keywords')
      }
      
      const data = await response.json()
      
      // 디버깅: API 응답 확인
      console.log('📰 뉴스 API 응답:', data)
      console.log('📰 헤드라인 수:', data.headlines?.length)
      if (data.headlines?.length > 0) {
        console.log('📰 첫 번째 헤드라인:', data.headlines[0])
      }
      
      setNewsData(data)
    } catch (err) {
      console.error('Error fetching news keywords:', err)
      setError('뉴스 키워드를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-24 mb-3"></div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 bg-gray-700 rounded w-20"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !newsData) {
    return null
  }

  // 헤드라인 최대 5개로 제한
  const limitedHeadlines = newsData.headlines?.slice(0, 5) || []

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
      {/* 키워드 섹션 */}
      {newsData.keywords && newsData.keywords.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <span className="text-blue-400">💬</span>
              주요 이슈
            </h3>
            <span className="text-xs text-gray-500">
              {newsData.totalArticles}개 기사 분석
            </span>
          </div>
          
          {/* 키워드 배지들 */}
          <div className="flex flex-wrap gap-2">
            {newsData.keywords.map((kw, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium hover:bg-blue-500/30 transition-colors cursor-default"
                title={`${kw.count}회 언급`}
              >
                #{kw.keyword}
                <span className="ml-1 text-xs text-blue-400">
                  {kw.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 헤드라인 섹션 */}
      {limitedHeadlines.length > 0 && (
        <div>
          <button
            onClick={() => setShowHeadlines(!showHeadlines)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors mb-2"
          >
            <span className="text-yellow-400">📰</span>
            최신 뉴스 ({limitedHeadlines.length}개)
            <svg 
              className={`w-4 h-4 transition-transform ${showHeadlines ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showHeadlines && (
            <div className="space-y-2">
              {limitedHeadlines.map((headline, index) => {
                // 디버깅
                console.log(`헤드라인 ${index}:`, headline)
                
                return (
                  <div
                    key={index}
                    onClick={() => window.open(headline.url, '_blank')}
                    className="group cursor-pointer"
                  >
                    <div className="flex items-start gap-2 text-sm pl-4 border-l-2 border-blue-500/30 hover:border-blue-500 transition-all py-2">
                      <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                      <div className="flex-1 min-w-0">
                        {/* 제목 */}
                        <div className="text-gray-300 group-hover:text-blue-300 transition-colors break-words">
                          {headline.title || '제목 없음'}
                        </div>
                        
                        {/* 출처 + 날짜 */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span className="flex-shrink-0">{headline.source}</span>
                          {headline.date && (
                            <>
                              <span>•</span>
                              <span className="flex-shrink-0">{headline.date}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 출처 정보 */}
      {newsData.sources && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-2 border-t border-gray-700/50">
          <span>출처:</span>
          {newsData.sources.google > 0 && <span>Google ({newsData.sources.google})</span>}
          {newsData.sources.naver > 0 && <span>Naver ({newsData.sources.naver})</span>}
          {newsData.sources.espn && newsData.sources.espn > 0 && <span>ESPN ({newsData.sources.espn})</span>}
          {newsData.sources.bbc && newsData.sources.bbc > 0 && <span>BBC ({newsData.sources.bbc})</span>}
        </div>
      )}
    </div>
  )
}
