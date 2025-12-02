'use client'

import { useState, useEffect } from 'react'

interface Highlight {
  id: number
  matchId: number
  homeTeam: string
  awayTeam: string
  league: string
  matchDate: string
  youtubeUrl: string
  youtubeId: string
  youtube_url: string
  thumbnailUrl: string
  videoTitle: string
}

interface TopHighlightsProps {
  darkMode?: boolean
}

export default function TopHighlights({ darkMode = true }: TopHighlightsProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHighlights()
  }, [])

  const fetchHighlights = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/highlights?limit=10')
      
      if (!response.ok) {
        throw new Error('Failed to fetch highlights')
      }

      const data = await response.json()
      console.log('🎬 하이라이트 데이터:', data.highlights?.[0])
      setHighlights(data.highlights || [])
    } catch (error) {
      console.error('Error fetching highlights:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="mb-2">
        <div className={`flex items-center gap-1.5 mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <span className="text-lg">🔥</span>
          <h2 className="text-sm font-black">TODAY'S HIGHLIGHTS</h2>
        </div>
        
        {/* 로딩 스켈레톤 - 수평 스크롤 */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div 
              key={i}
              className={`rounded-lg overflow-hidden animate-pulse flex-shrink-0 w-[140px] lg:w-[calc((100%-72px)/10)] ${
                darkMode ? 'bg-slate-800' : 'bg-gray-200'
              }`}
            >
              <div className={`aspect-video ${darkMode ? 'bg-slate-700' : 'bg-gray-300'}`} />
              <div className="p-1.5">
                <div className={`h-2.5 rounded mb-1 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'}`} />
                <div className={`h-2 rounded w-2/3 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'}`} />
              </div>
            </div>
          ))}
        </div>

        <style jsx>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </section>
    )
  }

  if (highlights.length === 0) {
    return null
  }

  return (
    <section className="mb-2">
      {/* 섹션 헤더 */}
      <div className={`flex items-center gap-1.5 mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <span className="text-lg">🔥</span>
        <h2 className="text-sm font-black">TODAY'S HIGHLIGHTS</h2>
      </div>

      {/* 하이라이트 - 전체 너비 사용, 수평 스크롤 */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {highlights.map((highlight) => (
          <div
            key={highlight.id}
            onClick={() => {
              const youtubeUrl = 
                highlight.youtubeUrl || 
                highlight.youtube_url || 
                `https://www.youtube.com/watch?v=${highlight.youtubeId}`
              
              console.log('🎬 클릭:', youtubeUrl)
              window.open(youtubeUrl, '_blank')
            }}
            className={`group cursor-pointer rounded-lg overflow-hidden transition-all hover:scale-105 hover:shadow-lg flex-shrink-0 w-[140px] lg:flex-1 lg:min-w-[120px] lg:max-w-[180px] ${
              darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-50 shadow-sm'
            }`}
          >
            {/* 썸네일 */}
            <div className="relative aspect-video overflow-hidden">
              <img
                src={highlight.thumbnailUrl}
                alt={highlight.videoTitle}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.src = `https://img.youtube.com/vi/${highlight.youtubeId}/maxresdefault.jpg`
                }}
              />
              
              {/* 재생 버튼 - 호버 시만 */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>
              </div>

              {/* 리그 배지 */}
              <div className="absolute top-1 left-1">
                <span className="px-1 py-0.5 bg-black/70 backdrop-blur-sm rounded text-white text-[8px] font-bold leading-none">
                  {highlight.league.length > 10 ? highlight.league.substring(0, 10) : highlight.league}
                </span>
              </div>
            </div>

            {/* 정보 */}
            <div className="p-1.5">
              <p className={`text-[10px] font-bold line-clamp-1 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {highlight.homeTeam.split(' ')[0]} vs {highlight.awayTeam.split(' ')[0]}
              </p>
              <p className={`text-[9px] leading-tight ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {new Date(highlight.matchDate).toLocaleDateString('ko-KR', {
                  month: 'numeric',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CSS: 스크롤바 숨기기 */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}