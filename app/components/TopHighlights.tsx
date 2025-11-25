'use client'

import { useState, useEffect } from 'react'

interface Highlight {
  id: number
  matchId: number
  homeTeam: string
  awayTeam: string
  league: string
  matchDate: string
  youtubeUrl: string      // ⭐ 추가!
  youtubeId: string
  youtube_url: string     // fallback
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
      const response = await fetch('/api/highlights?limit=8')
      
      if (!response.ok) {
        throw new Error('Failed to fetch highlights')
      }

      const data = await response.json()
      console.log('🎬 하이라이트 데이터:', data.highlights?.[0]) // 디버깅용
      setHighlights(data.highlights || [])
    } catch (error) {
      console.error('Error fetching highlights:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="mb-6">
        <div className={`flex items-center gap-1.5 mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <span className="text-lg">🔥</span>
          <h2 className="text-sm font-black">TODAY'S HIGHLIGHTS</h2>
        </div>
        
        {/* 모바일: 수평 스크롤 / PC: 그리드 */}
        <div className="lg:grid lg:grid-cols-8 lg:gap-2 flex flex-nowrap lg:flex-none overflow-x-auto gap-2.5 pb-2 scrollbar-hide">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div 
              key={i}
              className={`rounded overflow-hidden animate-pulse flex-shrink-0 w-[160px] lg:w-auto ${
                darkMode ? 'bg-slate-800' : 'bg-gray-200'
              }`}
            >
              <div className="aspect-video bg-slate-700" />
              <div className="p-1">
                <div className={`h-2 rounded mb-0.5 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'}`} />
                <div className={`h-1.5 rounded w-2/3 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'}`} />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (highlights.length === 0) {
    return null
  }

  return (
    <section className="mb-6">
      {/* 섹션 헤더 */}
      <div className={`flex items-center gap-1.5 mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <span className="text-lg">🔥</span>
        <h2 className="text-sm font-black">TODAY'S HIGHLIGHTS</h2>
      </div>

      {/* 하이라이트 그리드 
          모바일: 한 줄 수평 스크롤
          PC: 8열 그리드 (8개)
      */}
      <div className="lg:grid lg:grid-cols-8 lg:gap-2 flex flex-nowrap lg:flex-none overflow-x-auto gap-2.5 pb-2 scrollbar-hide">
        {highlights.map((highlight) => (
          <div
            key={highlight.id}
            onClick={() => {
              // 여러 필드명 시도 (camelCase, snake_case)
              const youtubeUrl = 
                highlight.youtubeUrl || 
                highlight.youtube_url || 
                `https://www.youtube.com/watch?v=${highlight.youtubeId}`
              
              console.log('🎬 클릭:', youtubeUrl)
              window.open(youtubeUrl, '_blank')
            }}
            className={`group cursor-pointer rounded overflow-hidden transition-all hover:scale-105 hover:shadow-lg flex-shrink-0 w-[160px] lg:w-auto ${
              darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-50'
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
            <div className="p-1">
              <p className={`text-[9px] font-bold line-clamp-1 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {highlight.homeTeam.split(' ')[0]} vs {highlight.awayTeam.split(' ')[0]}
              </p>
              <p className={`text-[8px] leading-tight ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {new Date(highlight.matchDate).toLocaleDateString('ko-KR', {
                  month: 'numeric',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CSS: 스크롤바 숨기기 + 부드러운 스크롤 */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}