'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// 리그 정보 (엠블럼 사용)
const LEAGUES = [
  { 
    code: 'ALL', 
    name: '전체',
    nameEN: 'All',
    logo: null
  },
  { 
    code: 'PL', 
    name: '프리미어리그',
    nameEN: 'EPL',
    logo: 'https://crests.football-data.org/PL.png'
  },
  { 
    code: 'PD', 
    name: '라리가',
    nameEN: 'La Liga',
    logo: 'https://crests.football-data.org/PD.png'
  },
  { 
    code: 'BL1', 
    name: '분데스리가',
    nameEN: 'Bundesliga',
    logo: 'https://crests.football-data.org/BL1.png'
  },
  { 
    code: 'SA', 
    name: '세리에A',
    nameEN: 'Serie A',
    logo: 'https://crests.football-data.org/SA.png'
  },
  { 
    code: 'FL1', 
    name: '리그1',
    nameEN: 'Ligue 1',
    logo: 'https://crests.football-data.org/FL1.png'
  },
  { 
    code: 'CL', 
    name: 'UCL',
    nameEN: 'UCL',
    logo: 'https://crests.football-data.org/CL.png'
  },
]

interface Video {
  id: string
  title: string
  thumbnail: string
  embed: string
  url: string
  date: string
  competition: string
  leagueCode: string
  leagueInfo: {
    id: string
    name: string
    nameKR: string
    logo: string
  }
  videos: { title: string; embed: string }[]
}

export default function HighlightsPage() {
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')

  // 다크모드 설정
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  // 하이라이트 가져오기
  useEffect(() => {
    async function fetchHighlights() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/highlights/scorebat?league=${selectedLeague}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch highlights')
        }
        
        const data = await response.json()
        setVideos(data.videos || [])
      } catch (err) {
        console.error('Error fetching highlights:', err)
        setError(language === 'ko' ? '하이라이트를 불러오는데 실패했습니다.' : 'Failed to load highlights.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchHighlights()
  }, [selectedLeague, language])

  // 날짜 포맷
  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffHours < 1) {
        return language === 'ko' ? '방금 전' : 'Just now'
      } else if (diffHours < 24) {
        return language === 'ko' ? `${diffHours}시간 전` : `${diffHours}h ago`
      } else if (diffDays < 7) {
        return language === 'ko' ? `${diffDays}일 전` : `${diffDays}d ago`
      } else {
        return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
          month: 'short',
          day: 'numeric'
        })
      }
    } catch {
      return dateStr
    }
  }

  // 리그 이름 가져오기
  function getLeagueName(code: string): string {
    const league = LEAGUES.find(l => l.code === code)
    return language === 'ko' ? (league?.name || code) : (league?.nameEN || code)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 페이지 타이틀 */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <span className="text-3xl">🎬</span>
            {language === 'ko' ? '경기 하이라이트' : 'Match Highlights'}
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            {language === 'ko' 
              ? '유럽 주요 리그의 최신 하이라이트 영상'
              : 'Latest highlights from major European leagues'}
          </p>
        </div>

        {/* 리그 필터 - 엠블럼 사용, 개선된 디자인 */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {LEAGUES.map((league) => (
              <button
                key={league.code}
                onClick={() => setSelectedLeague(league.code)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  selectedLeague === league.code
                    ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                    : 'bg-gray-800/50 border-2 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                }`}
              >
                {league.logo ? (
                  <img 
                    src={league.logo} 
                    alt={league.name}
                    className="w-5 h-5 object-contain"
                  />
                ) : (
                  <span className="text-lg">🌍</span>
                )}
                <span className="text-sm font-medium">
                  {language === 'ko' ? league.name : league.nameEN}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
            <p className="text-gray-400">
              {language === 'ko' ? '하이라이트 로딩 중...' : 'Loading highlights...'}
            </p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !loading && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">😢</div>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => setSelectedLeague(selectedLeague)}
              className="px-6 py-2.5 bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-colors font-medium"
            >
              {language === 'ko' ? '다시 시도' : 'Try Again'}
            </button>
          </div>
        )}

        {/* 비디오 그리드 */}
        {!loading && !error && (
          <>
            {videos.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🎬</div>
                <p className="text-gray-400 text-lg mb-2">
                  {language === 'ko' ? '하이라이트가 없습니다' : 'No highlights available'}
                </p>
                <p className="text-gray-500 text-sm">
                  {language === 'ko' 
                    ? '다른 리그를 선택해보세요'
                    : 'Try selecting another league'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="bg-gradient-to-b from-gray-800/50 to-gray-900/50 rounded-2xl overflow-hidden border border-gray-800 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer group"
                    onClick={() => setSelectedVideo(video)}
                  >
                    {/* 썸네일 */}
                    <div className="relative aspect-video bg-gray-900">
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                          <span className="text-5xl opacity-50">🎬</span>
                        </div>
                      )}
                      
                      {/* 재생 버튼 오버레이 */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 transform group-hover:scale-110 transition-transform">
                          <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                      
                      {/* 리그 배지 */}
                      <div className="absolute top-3 left-3 px-2.5 py-1.5 bg-black/70 backdrop-blur-sm rounded-lg text-xs flex items-center gap-1.5">
                        {video.leagueInfo?.logo ? (
                          <img 
                            src={video.leagueInfo.logo} 
                            alt=""
                            className="w-4 h-4 object-contain"
                          />
                        ) : (
                          <span>⚽</span>
                        )}
                        <span className="font-medium">{getLeagueName(video.leagueCode)}</span>
                      </div>

                      {/* 시간 배지 */}
                      <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-xs text-gray-300">
                        {formatDate(video.date)}
                      </div>
                    </div>
                    
                    {/* 정보 */}
                    <div className="p-4">
                      <h3 className="font-semibold text-sm md:text-base line-clamp-2 group-hover:text-emerald-400 transition-colors leading-snug">
                        {video.title}
                      </h3>
                      {video.videos && video.videos.length > 1 && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span>{video.videos.length} {language === 'ko' ? '클립' : 'clips'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 비디오 결과 카운트 */}
        {!loading && !error && videos.length > 0 && (
          <div className="mt-8 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full text-gray-400 text-sm">
              <span>🎬</span>
              {language === 'ko' 
                ? `총 ${videos.length}개의 하이라이트`
                : `${videos.length} highlights`}
            </span>
          </div>
        )}
      </main>

      {/* 비디오 모달 */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95"
          onClick={() => setSelectedVideo(null)}
        >
          <div 
            className="bg-gray-900 rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur p-4 border-b border-gray-800 flex items-center justify-between z-10">
              <div className="flex items-center gap-3 pr-4 min-w-0">
                {selectedVideo.leagueInfo?.logo && (
                  <img 
                    src={selectedVideo.leagueInfo.logo} 
                    alt=""
                    className="w-6 h-6 object-contain flex-shrink-0"
                  />
                )}
                <h2 className="font-bold text-base md:text-lg truncate">{selectedVideo.title}</h2>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2 hover:bg-gray-800 rounded-xl transition-colors flex-shrink-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 비디오 플레이어 */}
            <div 
              dangerouslySetInnerHTML={{ 
                __html: selectedVideo.embed || selectedVideo.videos?.[0]?.embed || '' 
              }}
              className="w-full [&>div]:!relative [&>div]:!h-auto [&>div]:!pb-[56.25%] [&_iframe]:!absolute [&_iframe]:!inset-0 [&_iframe]:!w-full [&_iframe]:!h-full"
            />
            
            {/* 비디오 정보 */}
            <div className="p-5">
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  {selectedVideo.leagueInfo?.logo ? (
                    <img 
                      src={selectedVideo.leagueInfo.logo} 
                      alt=""
                      className="w-5 h-5 object-contain"
                    />
                  ) : (
                    <span>⚽</span>
                  )}
                  {getLeagueName(selectedVideo.leagueCode)}
                </span>
                <span className="text-gray-600">•</span>
                <span>{formatDate(selectedVideo.date)}</span>
              </div>
              
              {/* 추가 클립이 있는 경우 */}
              {selectedVideo.videos && selectedVideo.videos.length > 1 && (
                <div className="mt-5 pt-5 border-t border-gray-800">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {language === 'ko' ? '관련 클립' : 'Related Clips'}
                  </h3>
                  <div className="space-y-2">
                    {selectedVideo.videos.slice(1).map((clip, index) => (
                      <div 
                        key={index}
                        className="p-3 bg-gray-800/50 rounded-xl text-sm hover:bg-gray-800 transition-colors cursor-pointer border border-gray-700/50"
                      >
                        {clip.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* ScoreBat 링크 */}
              {selectedVideo.url && (
                <a
                  href={selectedVideo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                >
                  <span>{language === 'ko' ? '원본 보기' : 'View Original'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className="border-t border-gray-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2025 TrendSoccer. All rights reserved.</p>
          <p className="mt-1 text-gray-600">
            {language === 'ko' 
              ? '하이라이트 제공: ScoreBat'
              : 'Highlights powered by ScoreBat'}
          </p>
        </div>
      </footer>
    </div>
  )
}