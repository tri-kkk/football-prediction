'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

// 리그 정보
const LEAGUES = [
  { code: 'ALL', name: '전체', nameEN: 'All', logo: null, gradient: 'linear-gradient(to right, #6b7280, #4b5563)' },
  { code: 'PL', name: '프리미어리그', nameEN: 'EPL', logo: 'https://media.api-sports.io/football/leagues/39.png', gradient: 'linear-gradient(to right, #8b5cf6, #7c3aed)' },
  { code: 'PD', name: '라리가', nameEN: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png', gradient: 'linear-gradient(to right, #f97316, #ea580c)' },
  { code: 'BL1', name: '분데스리가', nameEN: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png', gradient: 'linear-gradient(to right, #ef4444, #dc2626)' },
  { code: 'SA', name: '세리에A', nameEN: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png', gradient: 'linear-gradient(to right, #3b82f6, #2563eb)' },
  { code: 'FL1', name: '리그1', nameEN: 'Ligue 1', logo: 'https://media.api-sports.io/football/leagues/61.png', gradient: 'linear-gradient(to right, #06b6d4, #0891b2)' },
  { code: 'CL', name: 'UCL', nameEN: 'UCL', logo: 'https://media.api-sports.io/football/leagues/2.png', gradient: 'linear-gradient(to right, #2563eb, #4f46e5)' },
  { code: 'DED', name: '에레디비시', nameEN: 'Eredivisie', logo: 'https://media.api-sports.io/football/leagues/88.png', gradient: 'linear-gradient(to right, #f97316, #ef4444)' },
  { code: 'ELC', name: '챔피언십', nameEN: 'Championship', logo: 'https://media.api-sports.io/football/leagues/40.png', gradient: 'linear-gradient(to right, #10b981, #059669)' },
  { code: 'KL', name: 'K리그', nameEN: 'K League', logo: 'https://media.api-sports.io/football/leagues/292.png', gradient: 'linear-gradient(to right, #22c55e, #16a34a)' },
  { code: 'JL', name: 'J리그', nameEN: 'J.League', logo: 'https://media.api-sports.io/football/leagues/98.png', gradient: 'linear-gradient(to right, #f43f5e, #e11d48)' },
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
  const { data: session, status } = useSession()
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')

  // 티어 관련 상태
  const [viewsRemaining, setViewsRemaining] = useState<number | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [checkingView, setCheckingView] = useState(false)

  const userTier = (session?.user as any)?.tier || 'guest'
  const isPremium = userTier === 'premium'

  // 다크모드
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  // 남은 시청 횟수 가져오기
  useEffect(() => {
    async function fetchRemaining() {
      if (status === 'loading') return

      try {
        const res = await fetch('/api/highlights/check-view')
        const data = await res.json()
        setViewsRemaining(data.remaining)
      } catch (err) {
        console.error('Failed to fetch remaining views:', err)
      }
    }
    fetchRemaining()
  }, [status, session])

  // 하이라이트 가져오기
  useEffect(() => {
    async function fetchHighlights() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/highlights/scorebat?league=${selectedLeague}`)
        if (!response.ok) throw new Error('Failed to fetch highlights')
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

  // 영상 클릭 핸들러
  async function handleVideoClick(video: Video) {
    if (!session) {
      setShowLoginModal(true)
      return
    }

    if (isPremium) {
      setSelectedVideo(video)
      fetch('/api/highlights/check-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, videoTitle: video.title })
      }).catch(() => {})
      return
    }

    setCheckingView(true)
    try {
      const res = await fetch('/api/highlights/check-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, videoTitle: video.title })
      })

      const data = await res.json()

      if (data.canWatch) {
        setSelectedVideo(video)
        setViewsRemaining(data.remaining)
      } else if (data.reason === 'limit_exceeded') {
        setShowPremiumModal(true)
      } else if (data.reason === 'login_required') {
        setShowLoginModal(true)
      } else {
        console.error('View check failed:', data)
        setSelectedVideo(video)
      }
    } catch (err) {
      console.error('Check view error:', err)
      setSelectedVideo(video)
    } finally {
      setCheckingView(false)
    }
  }

  // 날짜 포맷
  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffHours < 1) return language === 'ko' ? '방금 전' : 'Just now'
      if (diffHours < 24) return language === 'ko' ? `${diffHours}시간 전` : `${diffHours}h ago`
      if (diffDays < 7) return language === 'ko' ? `${diffDays}일 전` : `${diffDays}d ago`
      return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  function getLeagueName(code: string): string {
    const league = LEAGUES.find(l => l.code === code)
    return language === 'ko' ? (league?.name || code) : (league?.nameEN || code)
  }

  function getLeagueGradient(code: string): string {
    const league = LEAGUES.find(l => l.code === code)
    return league?.gradient || 'linear-gradient(to right, #6b7280, #4b5563)'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* 헤더 영역 */}
      <div className="bg-[#0a0a0f]/95 backdrop-blur-sm sticky top-[65px] z-40">
        <div className="max-w-7xl mx-auto px-4">
          {/* 제목 + 시청 횟수 */}
          <div className="py-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-1 h-7 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
                  <h1 className="text-xl md:text-2xl font-black tracking-tight">
                    {language === 'ko' ? '경기 하이라이트' : 'Match Highlights'}
                  </h1>
                </div>
                <p className="text-gray-500 text-xs md:text-sm ml-4 pl-0.5">
                  {language === 'ko' ? '주요 리그의 최신 하이라이트 영상' : 'Latest highlights from major leagues'}
                </p>
              </div>

              {/* 시청 횟수 표시 (무료회원만) */}
              {session && !isPremium && viewsRemaining !== null && (
                <div className="bg-[#141824] border border-[#1e293b] rounded-xl px-4 py-2 text-right">
                  <div className="text-[10px] text-gray-500 mb-0.5">
                    {language === 'ko' ? '오늘 남은 시청' : 'Views left'}
                  </div>
                  <div className={`text-lg font-bold leading-none ${viewsRemaining === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {viewsRemaining}/3
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 리그 필터 */}
          <div className="pb-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {LEAGUES.map((league) => {
                const isActive = selectedLeague === league.code
                return (
                  <button
                    key={league.code}
                    onClick={() => setSelectedLeague(league.code)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap flex-shrink-0 transition-all text-sm font-medium ${
                      isActive
                        ? 'text-white shadow-lg'
                        : 'bg-[#141824] border border-[#1e293b] text-gray-400 hover:bg-[#1a1f2e] hover:text-white'
                    }`}
                    style={isActive ? { background: league.gradient } : undefined}
                  >
                    {league.logo ? (
                      <div className={`w-5 h-5 rounded p-0.5 flex items-center justify-center ${isActive ? 'bg-white/90' : 'bg-white/80'}`}>
                        <img src={league.logo} alt="" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <span className="text-xs">🌍</span>
                    )}
                    <span>{language === 'ko' ? league.name : league.nameEN}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* 로딩 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#1e293b] border-t-emerald-500 mb-4"></div>
            <p className="text-gray-500 text-sm">{language === 'ko' ? '하이라이트 로딩 중...' : 'Loading highlights...'}</p>
          </div>
        )}

        {/* 에러 */}
        {error && !loading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[#141824] border border-[#1e293b] flex items-center justify-center">
              <span className="text-3xl">😢</span>
            </div>
            <p className="text-red-400 mb-4 text-sm">{error}</p>
            <button
              onClick={() => setSelectedLeague(selectedLeague)}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:from-emerald-400 hover:to-emerald-500 transition-all text-sm font-medium shadow-lg shadow-emerald-500/20"
            >
              {language === 'ko' ? '다시 시도' : 'Retry'}
            </button>
          </div>
        )}

        {/* 비디오 그리드 */}
        {!loading && !error && videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {videos.map((video) => (
              <div
                key={video.id}
                className={`bg-[#141824] rounded-2xl overflow-hidden border border-[#1e293b] hover:border-emerald-500/40 transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 ${checkingView ? 'pointer-events-none opacity-70' : ''}`}
                onClick={() => handleVideoClick(video)}
              >
                {/* 썸네일 */}
                <div className="relative aspect-video bg-[#0f1623]">
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl opacity-30">🎬</span>
                    </div>
                  )}

                  {/* 비로그인 잠금 오버레이 */}
                  {!session && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-xl bg-[#141824] border border-[#1e293b] flex items-center justify-center mx-auto mb-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <p className="text-gray-400 text-xs">{language === 'ko' ? '로그인 후 시청' : 'Login to watch'}</p>
                      </div>
                    </div>
                  )}

                  {/* 재생 버튼 (로그인 시) */}
                  {session && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/90 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-emerald-500/30 transform group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                  )}

                  {/* 리그 배지 */}
                  <div className="absolute top-3 left-3 px-2 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-xs flex items-center gap-1.5">
                    {video.leagueInfo?.logo && (
                      <div className="w-4 h-4 rounded bg-white/90 p-0.5 flex items-center justify-center">
                        <img src={video.leagueInfo.logo} alt="" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <span className="font-medium text-white/90">{getLeagueName(video.leagueCode)}</span>
                  </div>

                  {/* 시간 배지 */}
                  <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-[11px] text-gray-300">
                    {formatDate(video.date)}
                  </div>

                  {/* 하단 그라데이션 */}
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#141824] to-transparent" />
                </div>

                {/* 정보 */}
                <div className="p-4">
                  <h3 className="font-bold text-sm md:text-base line-clamp-2 group-hover:text-emerald-400 transition-colors leading-snug">
                    {video.title}
                  </h3>
                  {video.videos?.length > 1 && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-gray-500 bg-[#0f1623] px-2.5 py-1 rounded-lg">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        {/* 결과 없음 */}
        {!loading && !error && videos.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[#141824] border border-[#1e293b] flex items-center justify-center">
              <span className="text-3xl opacity-50">🎬</span>
            </div>
            <p className="text-gray-400 font-medium mb-1">
              {language === 'ko' ? '하이라이트가 없습니다' : 'No highlights available'}
            </p>
            <p className="text-gray-600 text-sm">
              {language === 'ko' ? '다른 리그를 선택해보세요' : 'Try selecting a different league'}
            </p>
          </div>
        )}

        {/* 로드 완료 표시 */}
        {!loading && !error && videos.length > 0 && (
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 text-gray-600 text-xs">
              <div className="w-8 h-px bg-[#1e293b]" />
              <span>{videos.length} {language === 'ko' ? '개 하이라이트' : 'highlights'}</span>
              <div className="w-8 h-px bg-[#1e293b]" />
            </div>
          </div>
        )}
      </main>

      {/* 비디오 모달 */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm" onClick={() => setSelectedVideo(null)}>
          <div className="bg-[#141824] rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[#1e293b]" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="sticky top-0 bg-[#141824]/95 backdrop-blur-sm p-4 border-b border-[#1e293b] flex items-center justify-between z-10">
              <div className="flex items-center gap-3 pr-4 min-w-0">
                {selectedVideo.leagueInfo?.logo && (
                  <div className="w-6 h-6 rounded bg-white/90 p-0.5 flex items-center justify-center flex-shrink-0">
                    <img src={selectedVideo.leagueInfo.logo} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
                <h2 className="font-bold text-base md:text-lg truncate">{selectedVideo.title}</h2>
              </div>
              <button onClick={() => setSelectedVideo(null)} className="p-2 hover:bg-[#1e293b] rounded-xl transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 플레이어 */}
            <div
              dangerouslySetInnerHTML={{ __html: selectedVideo.embed || selectedVideo.videos?.[0]?.embed || '' }}
              className="w-full [&>div]:!relative [&>div]:!h-auto [&>div]:!pb-[56.25%] [&_iframe]:!absolute [&_iframe]:!inset-0 [&_iframe]:!w-full [&_iframe]:!h-full"
            />

            {/* 정보 */}
            <div className="p-5">
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span className="px-2 py-1 bg-[#0f1623] rounded-lg text-xs">{getLeagueName(selectedVideo.leagueCode)}</span>
                <span className="text-gray-600">·</span>
                <span className="text-xs">{formatDate(selectedVideo.date)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}>
          <div className="bg-[#141824] rounded-2xl p-6 max-w-sm w-full border border-[#1e293b] text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">{language === 'ko' ? '로그인이 필요합니다' : 'Login Required'}</h3>
            <p className="text-gray-400 text-sm mb-6">{language === 'ko' ? '하이라이트를 시청하려면 로그인해주세요' : 'Please login to watch'}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLoginModal(false)} className="flex-1 px-4 py-2.5 border border-[#1e293b] rounded-xl hover:bg-[#1a1f2e] transition-colors text-sm">
                {language === 'ko' ? '취소' : 'Cancel'}
              </button>
              <Link href="/login" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:from-emerald-400 hover:to-emerald-500 font-medium text-sm text-center shadow-lg shadow-emerald-500/20 transition-all">
                {language === 'ko' ? '로그인' : 'Login'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 프리미엄 유도 모달 */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowPremiumModal(false)}>
          <div className="bg-[#141824] rounded-2xl p-6 max-w-sm w-full border border-[#1e293b] text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👑</span>
            </div>
            <h3 className="text-xl font-bold mb-2">{language === 'ko' ? '오늘 시청 횟수 초과' : 'Daily Limit Reached'}</h3>
            <p className="text-gray-400 text-sm mb-2">{language === 'ko' ? '무료 회원은 하루 3회까지 시청 가능합니다' : 'Free: 3 videos per day'}</p>
            <p className="text-emerald-400 font-medium text-sm mb-6">{language === 'ko' ? '프리미엄 회원은 무제한 시청!' : 'Premium: Unlimited!'}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowPremiumModal(false)} className="flex-1 px-4 py-2.5 border border-[#1e293b] rounded-xl hover:bg-[#1a1f2e] transition-colors text-sm">
                {language === 'ko' ? '닫기' : 'Close'}
              </button>
              <Link href="/pricing" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl hover:from-amber-400 hover:to-amber-500 font-medium text-black text-sm text-center shadow-lg shadow-amber-500/20 transition-all">
                {language === 'ko' ? '프리미엄 가입' : 'Go Premium'}
              </Link>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
