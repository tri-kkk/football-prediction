'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

// 리그 정보 (8개)
const LEAGUES = [
  { code: 'ALL', name: '전체', nameEN: 'All', logo: null },
  { code: 'PL', name: '프리미어리그', nameEN: 'EPL', logo: 'https://media.api-sports.io/football/leagues/39.png' },
  { code: 'PD', name: '라리가', nameEN: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png' },
  { code: 'BL1', name: '분데스리가', nameEN: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png' },
  { code: 'SA', name: '세리에A', nameEN: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png' },
  { code: 'FL1', name: '리그1', nameEN: 'Ligue 1', logo: 'https://media.api-sports.io/football/leagues/61.png' },
  { code: 'CL', name: 'UCL', nameEN: 'UCL', logo: 'https://media.api-sports.io/football/leagues/2.png' },
  { code: 'DED', name: '에레디비시', nameEN: 'Eredivisie', logo: 'https://media.api-sports.io/football/leagues/88.png' },
  { code: 'ELC', name: '챔피언십', nameEN: 'Championship', logo: 'https://media.api-sports.io/football/leagues/40.png' },
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
    // 비로그인 → 로그인 모달
    if (!session) {
      setShowLoginModal(true)
      return
    }

    // 프리미엄 → 바로 재생
    if (isPremium) {
      setSelectedVideo(video)
      // 통계용 기록 (실패해도 무시)
      fetch('/api/highlights/check-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, videoTitle: video.title })
      }).catch(() => {})
      return
    }

    // 무료회원 → 시청 가능 여부 체크
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
        // 시청 제한 초과 → 프리미엄 모달
        setShowPremiumModal(true)
      } else if (data.reason === 'login_required') {
        // 로그인 필요
        setShowLoginModal(true)
      } else {
        // 기타 에러 → 그냥 재생 허용
        console.error('View check failed:', data)
        setSelectedVideo(video)
      }
    } catch (err) {
      console.error('Check view error:', err)
      setSelectedVideo(video) // 에러 시 재생 허용
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* 고정 헤더 영역 (제목 + 필터) */}
      <div className="fixed top-[60px] left-0 right-0 z-40 bg-[#0a0a0a] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          {/* 헤더 */}
          <div className="py-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold mb-1 flex items-center gap-2">
                  
                  {language === 'ko' ? '경기 하이라이트' : 'Match Highlights'}
                </h1>
                <p className="text-gray-400 text-xs md:text-sm">
                  {language === 'ko' ? '유럽 주요 리그의 최신 하이라이트 영상' : 'Latest highlights from major European leagues'}
                </p>
              </div>
              
              {/* 시청 횟수 표시 (무료회원만) */}
              {session && !isPremium && viewsRemaining !== null && (
                <div className="text-right">
                  <div className="text-xs text-gray-400">
                    {language === 'ko' ? '오늘 남은 시청' : 'Views left'}
                  </div>
                  <div className={`text-lg font-bold ${viewsRemaining === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {viewsRemaining}/3
                  </div>
                </div>
              )}
              
              {/* 프리미엄 배지 */}
              {isPremium && (
                <div className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full text-black text-sm font-bold">
                  👑 PREMIUM
                </div>
              )}
            </div>
          </div>

          {/* 리그 필터 */}
          <div className="pb-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {LEAGUES.map((league) => (
                <button
                  key={league.code}
                  onClick={() => setSelectedLeague(league.code)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap flex-shrink-0 transition-all ${
                    selectedLeague === league.code
                      ? 'bg-gray-800 border border-gray-600 text-white'
                      : 'bg-transparent border border-gray-700 text-gray-400 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {league.logo ? (
                    <div className="w-5 h-5 rounded bg-white/90 p-0.5 flex items-center justify-center">
                      <img src={league.logo} alt="" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <span>🌍</span>
                  )}
                  <span className="text-sm">{language === 'ko' ? league.name : league.nameEN}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 고정 헤더 높이만큼 여백 */}
      <div className="h-[160px] md:h-[140px]"></div>

      <main className="max-w-7xl mx-auto px-4 pb-6">

        {/* 로딩 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
            <p className="text-gray-400">{language === 'ko' ? '하이라이트 로딩 중...' : 'Loading...'}</p>
          </div>
        )}

        {/* 에러 */}
        {error && !loading && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">😢</div>
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={() => setSelectedLeague(selectedLeague)} className="px-6 py-2.5 bg-emerald-500 rounded-xl hover:bg-emerald-600">
              {language === 'ko' ? '다시 시도' : 'Retry'}
            </button>
          </div>
        )}

        {/* 비디오 그리드 */}
        {!loading && !error && videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {videos.map((video) => (
              <div
                key={video.id}
                className={`bg-gradient-to-b from-gray-800/50 to-gray-900/50 rounded-2xl overflow-hidden border border-gray-800 hover:border-emerald-500/50 transition-all cursor-pointer group ${checkingView ? 'pointer-events-none opacity-70' : ''}`}
                onClick={() => handleVideoClick(video)}
              >
                {/* 썸네일 */}
                <div className="relative aspect-video bg-gray-900">
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><span className="text-5xl opacity-50">🎬</span></div>
                  )}
                  
                  {/* 비로그인 잠금 오버레이 */}
                  {!session && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-2">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <p className="text-gray-300 text-sm">{language === 'ko' ? '로그인 후 시청' : 'Login to watch'}</p>
                      </div>
                    </div>
                  )}

                  {/* 재생 버튼 (로그인 시) */}
                  {session && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                  )}
                  
                  {/* 리그 배지 */}
                  <div className="absolute top-3 left-3 px-2 py-1.5 bg-black/70 backdrop-blur-sm rounded-lg text-xs flex items-center gap-1.5">
                    {video.leagueInfo?.logo && (
                      <div className="w-5 h-5 rounded bg-white/90 p-0.5 flex items-center justify-center">
                        <img src={video.leagueInfo.logo} alt="" className="w-full h-full object-contain" />
                      </div>
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
                  <h3 className="font-semibold text-sm md:text-base line-clamp-2 group-hover:text-emerald-400 transition-colors">{video.title}</h3>
                  {video.videos?.length > 1 && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                      <span>📁 {video.videos.length} {language === 'ko' ? '클립' : 'clips'}</span>
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
            <div className="text-5xl mb-4">🎬</div>
            <p className="text-gray-400">{language === 'ko' ? '하이라이트가 없습니다' : 'No highlights available'}</p>
          </div>
        )}
      </main>

      {/* 비디오 모달 */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95" onClick={() => setSelectedVideo(null)}>
          <div className="bg-gray-900 rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-800" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur p-4 border-b border-gray-800 flex items-center justify-between z-10">
              <div className="flex items-center gap-3 pr-4 min-w-0">
                {selectedVideo.leagueInfo?.logo && <img src={selectedVideo.leagueInfo.logo} alt="" className="w-6 h-6 object-contain flex-shrink-0" />}
                <h2 className="font-bold text-base md:text-lg truncate">{selectedVideo.title}</h2>
              </div>
              <button onClick={() => setSelectedVideo(null)} className="p-2 hover:bg-gray-800 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
                <span>{getLeagueName(selectedVideo.leagueCode)}</span>
                <span className="text-gray-600">•</span>
                <span>{formatDate(selectedVideo.date)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowLoginModal(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-gray-700 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">{language === 'ko' ? '로그인이 필요합니다' : 'Login Required'}</h3>
            <p className="text-gray-400 mb-6">{language === 'ko' ? '하이라이트를 시청하려면 로그인해주세요' : 'Please login to watch'}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLoginModal(false)} className="flex-1 px-4 py-2.5 border border-gray-600 rounded-xl hover:bg-gray-800">
                {language === 'ko' ? '취소' : 'Cancel'}
              </button>
              <Link href="/login" className="flex-1 px-4 py-2.5 bg-emerald-500 rounded-xl hover:bg-emerald-600 font-medium text-center">
                {language === 'ko' ? '로그인' : 'Login'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 프리미엄 유도 모달 */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowPremiumModal(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-gray-700 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">👑</span>
            </div>
            <h3 className="text-xl font-bold mb-2">{language === 'ko' ? '오늘 시청 횟수 초과' : 'Daily Limit Reached'}</h3>
            <p className="text-gray-400 mb-2">{language === 'ko' ? '무료 회원은 하루 3회까지 시청 가능합니다' : 'Free: 3 videos per day'}</p>
            <p className="text-emerald-400 font-medium mb-6">{language === 'ko' ? '프리미엄 회원은 무제한 시청!' : 'Premium: Unlimited!'}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowPremiumModal(false)} className="flex-1 px-4 py-2.5 border border-gray-600 rounded-xl hover:bg-gray-800">
                {language === 'ko' ? '닫기' : 'Close'}
              </button>
              <Link href="/pricing" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl hover:opacity-90 font-medium text-black text-center">
                {language === 'ko' ? '프리미엄 가입' : 'Go Premium'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className="border-t border-gray-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2025 TrendSoccer. Highlights by ScoreBat</p>
        </div>
      </footer>
    </div>
  )
}