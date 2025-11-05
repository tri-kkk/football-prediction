'use client'

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
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedUrl, setSelectedUrl] = useState<string>('')
  const [iframeLoading, setIframeLoading] = useState(false)

  // 키워드 감성 분석 (긍정/부정/중립)
  const analyzeKeywordSentiment = (keyword: string): 'positive' | 'negative' | 'neutral' => {
    const positiveWords = ['연승', '승리', '강세', '복귀', '호조', '상승', '득점', '공격', '압박', '선두', '우승', '질주']
    const negativeWords = ['부상', '결장', '연패', '패배', '약세', '부진', '실점', '수비', '위기', '하락', '출전']
    
    const lowerKeyword = keyword.toLowerCase()
    
    if (positiveWords.some(word => lowerKeyword.includes(word))) return 'positive'
    if (negativeWords.some(word => lowerKeyword.includes(word))) return 'negative'
    return 'neutral'
  }

  // 키워드를 팀별로 분류
  const categorizeKeywords = () => {
    if (!newsData?.keywords) return { home: [], away: [], neutral: [] }
    
    const homeKeywords: NewsKeyword[] = []
    const awayKeywords: NewsKeyword[] = []
    const neutralKeywords: NewsKeyword[] = []
    
    newsData.keywords.forEach(kw => {
      const keyword = kw.keyword.toLowerCase()
      const homeTeamLower = homeTeam.toLowerCase()
      const awayTeamLower = awayTeam.toLowerCase()
      
      // 팀 이름이 포함되어 있거나 관련 키워드 판단
      if (keyword.includes(homeTeamLower) || keyword.includes('홈') || keyword.includes('home')) {
        homeKeywords.push(kw)
      } else if (keyword.includes(awayTeamLower) || keyword.includes('원정') || keyword.includes('away')) {
        awayKeywords.push(kw)
      } else {
        neutralKeywords.push(kw)
      }
    })
    
    return { home: homeKeywords, away: awayKeywords, neutral: neutralKeywords }
  }

  // 헤드라인에서 인사이트 추출
  const extractInsights = () => {
    if (!newsData?.headlines) return { home: [], away: [], general: [] }
    
    const homeInsights: string[] = []
    const awayInsights: string[] = []
    const generalInsights: string[] = []
    
    const homeTeamLower = homeTeam.toLowerCase()
    const awayTeamLower = awayTeam.toLowerCase()
    
    newsData.headlines.forEach(headline => {
      const title = headline.title.toLowerCase()
      
      // 선수 관련 정보 추출 (득점, 부상 등)
      let insight = ''
      
      if (title.includes('score') || title.includes('goal')) {
        // 득점 관련
        const playerMatch = headline.title.match(/^([A-Za-z\s]+)\s+vs/)
        if (playerMatch) {
          const player = playerMatch[1].trim()
          insight = `${player} 득점 예상`
        }
      } else if (title.includes('injury') || title.includes('out') || title.includes('doubt')) {
        // 부상 관련
        const playerMatch = headline.title.match(/^([A-Za-z\s]+)\s+/)
        if (playerMatch) {
          const player = playerMatch[1].trim()
          insight = `${player} 부상 우려`
        }
      } else if (title.includes('lineup') || title.includes('starting')) {
        insight = '선발 라인업 발표'
      } else if (title.includes('preview') || title.includes('prediction')) {
        insight = '경기 프리뷰'
      }
      
      if (insight) {
        // 어느 팀인지 판단
        if (title.includes(homeTeamLower)) {
          homeInsights.push(insight)
        } else if (title.includes(awayTeamLower)) {
          awayInsights.push(insight)
        } else {
          generalInsights.push(insight)
        }
      }
    })
    
    return { 
      home: homeInsights.slice(0, 3), 
      away: awayInsights.slice(0, 3), 
      general: generalInsights.slice(0, 2) 
    }
  }

  useEffect(() => {
    fetchNewsKeywords()
  }, [homeTeam, awayTeam, matchId])

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen) {
        setModalOpen(false)
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [modalOpen])

  const fetchNewsKeywords = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(
        `/api/news?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}`
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
      <div className="rounded-lg p-4 animate-pulse">
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
    <div className="rounded-lg p-4 space-y-4">
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
                    onClick={() => {
                      // Google News, Naver News 등은 CORS로 차단되므로 바로 새 탭에서 열기
                      const corsBlockedDomains = [
                        'news.google.com',
                        'news.naver.com',
                        'sports.news.naver.com',
                        'm.news.naver.com'
                      ]
                      
                      const isBlocked = corsBlockedDomains.some(domain => 
                        headline.url.includes(domain)
                      )
                      
                      if (isBlocked) {
                        // CORS 차단 사이트는 바로 새 탭에서 열기
                        window.open(headline.url, '_blank')
                      } else {
                        // 일반 사이트는 모달로 열기
                        setSelectedUrl(headline.url)
                        setModalOpen(true)
                        setIframeLoading(true)
                      }
                    }}
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

      {/* 뉴스 모달 */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-5xl h-[85vh] bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-xl">📰</span>
                <h3 className="text-lg font-bold text-white">뉴스 기사</h3>
              </div>
              
              <div className="flex items-center gap-2">
                {/* 새 탭에서 열기 버튼 */}
                <button
                  onClick={() => window.open(selectedUrl, '_blank')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  새 탭에서 열기
                </button>
                
                {/* 닫기 버튼 */}
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 로딩 표시 */}
            {iframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-400">기사를 불러오는 중...</p>
                </div>
              </div>
            )}

            {/* iframe으로 뉴스 기사 표시 */}
            <iframe
              src={selectedUrl}
              className="w-full h-[calc(100%-65px)] bg-white"
              onLoad={() => setIframeLoading(false)}
              onError={() => {
                setIframeLoading(false)
                setModalOpen(false)
                // 자동으로 새 탭에서 열기
                window.open(selectedUrl, '_blank')
              }}
              title="뉴스 기사"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        </div>
      )}
    </div>
  )
}