'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useLanguage } from '../contexts/LanguageContext'
import { TEAM_NAME_KR } from '../teamLogos'

// 🏆 리그 정보
const LEAGUES = [
  { 
    code: 'ALL', 
    nameKo: '전체',
    nameEn: 'All Leagues',
    logo: '🌍',
    isEmoji: true 
  },
  { 
    code: 'CL', 
    nameKo: '챔스',
    nameEn: 'Champions League',
    logo: 'https://media.api-sports.io/football/leagues/2.png',
    isEmoji: false 
  },
  { 
    code: 'EL', 
    nameKo: '유로파',
    nameEn: 'Europa League',
    logo: 'https://media.api-sports.io/football/leagues/3.png',
    isEmoji: false 
  },
  { 
    code: 'UECL', 
    nameKo: '컨퍼런스',
    nameEn: 'UEFA Conference League',
    logo: 'https://media.api-sports.io/football/leagues/848.png',
    isEmoji: false 
  },
  { 
    code: 'UNL', 
    nameKo: '네이션스',
    nameEn: 'UEFA Nations League',
    logo: 'https://media.api-sports.io/football/leagues/5.png',
    isEmoji: false 
  },
  { 
    code: 'PL', 
    nameKo: 'EPL',
    nameEn: 'Premier League',
    logo: 'https://media.api-sports.io/football/leagues/39.png',
    isEmoji: false 
  },
  { 
    code: 'ELC', 
    nameKo: '챔피언십',
    nameEn: 'Championship',
    logo: 'https://media.api-sports.io/football/leagues/40.png',
    isEmoji: false 
  },
  { 
    code: 'PD', 
    nameKo: '라리가',
    nameEn: 'La Liga',
    logo: 'https://media.api-sports.io/football/leagues/140.png',
    isEmoji: false 
  },
  { 
    code: 'BL1', 
    nameKo: '분데스',
    nameEn: 'Bundesliga',
    logo: 'https://media.api-sports.io/football/leagues/78.png',
    isEmoji: false 
  },
  { 
    code: 'SA', 
    nameKo: '세리에',
    nameEn: 'Serie A',
    logo: 'https://media.api-sports.io/football/leagues/135.png',
    isEmoji: false 
  },
  { 
    code: 'FL1', 
    nameKo: '리그1',
    nameEn: 'Ligue 1',
    logo: 'https://media.api-sports.io/football/leagues/61.png',
    isEmoji: false 
  },
  { 
    code: 'PPL', 
    nameKo: '포르투갈',
    nameEn: 'Primeira Liga',
    logo: 'https://media.api-sports.io/football/leagues/94.png',
    isEmoji: false 
  },
  { 
    code: 'DED', 
    nameKo: '네덜란드',
    nameEn: 'Eredivisie',
    logo: 'https://media.api-sports.io/football/leagues/88.png',
    isEmoji: false 
  },
]

interface Match {
  match_id: string
  home_team: string
  away_team: string
  home_crest?: string
  away_crest?: string
  match_date: string
  league: string
  final_score_home: number
  final_score_away: number
  statistics?: {
    shots_on_goal_home?: number
    shots_on_goal_away?: number
    shots_total_home?: number
    shots_total_away?: number
    possession_home?: number
    possession_away?: number
    passes_home?: number
    passes_away?: number
    pass_accuracy_home?: number
    pass_accuracy_away?: number
    fouls_home?: number
    fouls_away?: number
    yellow_cards_home?: number
    yellow_cards_away?: number
    red_cards_home?: number
    red_cards_away?: number
    offsides_home?: number
    offsides_away?: number
    corners_home?: number
    corners_away?: number
  }
}

// 하이라이트 정보 인터페이스
interface Highlight {
  eventId: string
  event: string
  videoUrl: string
  thumbnail?: string
  youtubeId: string | null
}

// 하이라이트 캐시 (메모리)
const highlightCache: Record<string, Highlight | null> = {}

export default function MatchResultsPage() {
  const { t, language: currentLanguage } = useLanguage()
  const [matches, setMatches] = useState<Match[]>([])
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('week')
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)
  
  // 하이라이트 관련 상태
  const [highlights, setHighlights] = useState<Record<string, Highlight | null>>({})
  const [loadingHighlight, setLoadingHighlight] = useState<string | null>(null)
  const [showVideoModal, setShowVideoModal] = useState<string | null>(null)

  // 경기 데이터 로드 (최초 1회만)
  useEffect(() => {
    loadMatches()
  }, [])

  // 필터링 (클라이언트 사이드)
  useEffect(() => {
    filterMatches()
  }, [selectedLeague, selectedPeriod, allMatches])

  const loadMatches = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/match-results?league=ALL&period=month&stats=true`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch match results')
      }
      
      const data = await response.json()
      console.log('🔍 Received data:', data)

      if (data.success) {
        const matchesArray = data.matches || []
        setAllMatches(matchesArray)
        console.log(`✅ Loaded ${data.count} match results`)
      } else {
        console.error('❌ API returned error:', data.error)
        setAllMatches([])
      }
    } catch (error) {
      console.error('❌ Failed to load matches:', error)
      setAllMatches([])
    } finally {
      setLoading(false)
    }
  }

  // 하이라이트 로드 함수
  const loadHighlight = useCallback(async (match: Match) => {
    const cacheKey = `${match.home_team}-${match.away_team}-${match.match_date.split('T')[0]}`
    
    // 캐시 확인
    if (highlightCache[cacheKey] !== undefined) {
      setHighlights(prev => ({ ...prev, [match.match_id]: highlightCache[cacheKey] }))
      return
    }

    setLoadingHighlight(match.match_id)

    try {
      const matchDate = match.match_date.split('T')[0]
      // match-highlights API 사용 (메인 페이지의 highlights API와 분리)
      const response = await fetch(
        `/api/match-highlights?date=${matchDate}&homeTeam=${encodeURIComponent(match.home_team)}&awayTeam=${encodeURIComponent(match.away_team)}&league=${match.league}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch highlight')
      
      const data = await response.json()
      
      const highlight = data.highlights?.[0] || null
      highlightCache[cacheKey] = highlight
      setHighlights(prev => ({ ...prev, [match.match_id]: highlight }))
      
      console.log(`🎬 Highlight for ${match.home_team} vs ${match.away_team}:`, highlight ? 'Found' : 'Not found')
    } catch (error) {
      console.error('❌ Failed to load highlight:', error)
      highlightCache[cacheKey] = null
      setHighlights(prev => ({ ...prev, [match.match_id]: null }))
    } finally {
      setLoadingHighlight(null)
    }
  }, [])

  // 경기 확장 시 하이라이트 로드
  const handleMatchExpand = useCallback((match: Match) => {
    const matchId = match.match_id
    
    if (expandedMatch === matchId) {
      setExpandedMatch(null)
    } else {
      setExpandedMatch(matchId)
      // 하이라이트가 아직 로드되지 않았으면 로드
      if (highlights[matchId] === undefined) {
        loadHighlight(match)
      }
    }
  }, [expandedMatch, highlights, loadHighlight])

  // 클라이언트 사이드 필터링
  const filterMatches = () => {
    let filtered = allMatches

    // 리그 필터
    if (selectedLeague !== 'ALL') {
      filtered = filtered.filter(match => match.league === selectedLeague)
    }

    // 기간 필터
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    if (selectedPeriod === 'today') {
      filtered = filtered.filter(match => {
        const matchDate = new Date(match.match_date)
        const matchDay = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate())
        return matchDay.getTime() === today.getTime()
      })
    } else if (selectedPeriod === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      filtered = filtered.filter(match => {
        const matchDate = new Date(match.match_date)
        return matchDate >= weekAgo && matchDate <= now
      })
    } else if (selectedPeriod === 'month') {
      const monthAgo = new Date(today)
      monthAgo.setDate(monthAgo.getDate() - 30)
      filtered = filtered.filter(match => {
        const matchDate = new Date(match.match_date)
        return matchDate >= monthAgo && matchDate <= now
      })
    }

    setMatches(filtered)
  }

  // 필터링된 경기 목록
  const filteredMatches = matches.filter(match => 
    selectedLeague === 'ALL' || match.league === selectedLeague
  )

  // 날짜순 정렬 (최신순)
  filteredMatches.sort((a, b) => 
    new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
  )

  // 리그별 그룹화
  const groupedMatches = filteredMatches.reduce((acc, match) => {
    const leagueName = getLeagueName(match.league, currentLanguage)
    if (!acc[leagueName]) {
      acc[leagueName] = []
    }
    acc[leagueName].push(match)
    return acc
  }, {} as Record<string, Match[]>)

  // 각 리그 내에서도 날짜순 정렬
  Object.keys(groupedMatches).forEach(leagueName => {
    groupedMatches[leagueName].sort((a, b) => 
      new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
    )
  })

  function translateTeamName(englishName: string, language: string): string {
    if (language !== 'ko') return englishName
    return TEAM_NAME_KR[englishName] || englishName
  }

  function getLeagueName(code: string, lang: string): string {
    const league = LEAGUES.find(l => l.code === code)
    return league ? (lang === 'ko' ? league.nameKo : league.nameEn) : code
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    const today = new Date()
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear()
    
    if (isToday) {
      return `${hours}:${minutes}`
    }
    
    return `${month}/${day}`
  }

  // 비디오 모달 컴포넌트
  const VideoModal = ({ youtubeId, onClose }: { youtubeId: string; onClose: () => void }) => (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl aspect-video"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300"
        >
          ✕
        </button>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
          className="w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto flex">
          {/* 좌측 사이드바 스켈레톤 (데스크탑) */}
          <aside className="hidden md:block w-64 min-h-screen bg-[#1a1a1a] border-r border-gray-800 sticky top-0">
            <div className="p-4 space-y-6">
              <div className="space-y-2">
                <div className="h-4 bg-gray-800 rounded w-20 animate-pulse"></div>
                <div className="space-y-1">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-10 bg-gray-800 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-800 rounded w-16 animate-pulse"></div>
                <div className="space-y-1">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-10 bg-gray-800 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* 메인 컨텐츠 */}
          <main className="flex-1">
            <div className="px-4 py-8 space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="bg-[#1a1a1a] rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-800 rounded w-24 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-800 rounded"></div>
                    <div className="h-6 bg-gray-800 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-20 md:pb-0">
      {/* 비디오 모달 */}
      {showVideoModal && (
        <VideoModal 
          youtubeId={showVideoModal} 
          onClose={() => setShowVideoModal(null)} 
        />
      )}

      {/* 중앙 컨테이너 */}
      <div className="max-w-7xl mx-auto flex">
        {/* 좌측 사이드바 (데스크탑만) */}
        <aside className="hidden md:block w-64 min-h-screen bg-[#1a1a1a] border-r border-gray-800 sticky top-0 overflow-y-auto">
          <div className="p-4">
            {/* 기간 필터 */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">
                {currentLanguage === 'ko' ? '기간' : 'Period'}
              </h3>
              <div className="space-y-1">
                {[
                  { value: 'today', labelKo: '오늘', labelEn: 'Today' },
                  { value: 'week', labelKo: '최근 7일', labelEn: 'Last 7 days' },
                  { value: 'month', labelKo: '최근 30일', labelEn: 'Last 30 days' },
                ].map(period => (
                  <button
                    key={period.value}
                    onClick={() => setSelectedPeriod(period.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedPeriod === period.value
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {currentLanguage === 'ko' ? period.labelKo : period.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* 리그 필터 */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">
                {currentLanguage === 'ko' ? '리그' : 'League'}
              </h3>
              <div className="space-y-1">
                {LEAGUES.map(league => (
                  <button
                    key={league.code}
                    onClick={() => setSelectedLeague(league.code)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedLeague === league.code
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {league.isEmoji ? (
                      <span className="text-lg">{league.logo}</span>
                    ) : (
                      <Image
                        src={league.logo}
                        alt={league.nameEn}
                        width={20}
                        height={20}
                        className="w-5 h-5 object-contain"
                      />
                    )}
                    <span>{currentLanguage === 'ko' ? league.nameKo : league.nameEn}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* 메인 컨텐츠 */}
        <main className="flex-1">
          {/* 모바일 필터 */}
          <div className="md:hidden sticky top-0 z-10 bg-[#0f0f0f] border-b border-gray-800">
            {/* 기간 필터 */}
            <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
              {[
                { value: 'today', labelKo: '오늘', labelEn: 'Today' },
                { value: 'week', labelKo: '7일', labelEn: '7 days' },
                { value: 'month', labelKo: '30일', labelEn: '30 days' },
              ].map(period => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedPeriod === period.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {currentLanguage === 'ko' ? period.labelKo : period.labelEn}
                </button>
              ))}
            </div>
            
            {/* 리그 필터 */}
            <div className="flex gap-2 px-3 pb-3 overflow-x-auto scrollbar-hide">
              {LEAGUES.map(league => (
                <button
                  key={league.code}
                  onClick={() => setSelectedLeague(league.code)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedLeague === league.code
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {league.isEmoji ? (
                    <span>{league.logo}</span>
                  ) : (
                    <Image
                      src={league.logo}
                      alt={league.nameEn}
                      width={16}
                      height={16}
                      className="w-4 h-4 object-contain"
                    />
                  )}
                  <span>{currentLanguage === 'ko' ? league.nameKo : league.nameEn}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 경기 결과 목록 */}
          <div className="px-4 py-4 space-y-6">
            {/* 결과 요약 */}
            <div className="text-sm text-gray-400">
              {currentLanguage === 'ko' 
                ? `총 ${filteredMatches.length}경기`
                : `${filteredMatches.length} matches`
              }
            </div>

            {/* 리그별 그룹 */}
            {Object.entries(groupedMatches).map(([leagueName, leagueMatches]) => (
              <div key={leagueName} className="space-y-2">
                {/* 리그 헤더 */}
                <div className="flex items-center gap-2 mb-3">
                  {(() => {
                    const league = LEAGUES.find(l => 
                      (currentLanguage === 'ko' ? l.nameKo : l.nameEn) === leagueName
                    )
                    if (league?.isEmoji) {
                      return <span className="text-lg">{league.logo}</span>
                    } else if (league?.logo) {
                      return (
                        <Image
                          src={league.logo}
                          alt={leagueName}
                          width={20}
                          height={20}
                          className="w-5 h-5 object-contain"
                        />
                      )
                    }
                    return null
                  })()}
                  <h2 className="text-sm font-bold text-white">{leagueName}</h2>
                  <span className="text-xs text-gray-500">({leagueMatches.length})</span>
                </div>

                {/* 경기 카드들 */}
                {leagueMatches.map((match) => {
                  const isExpanded = expandedMatch === match.match_id
                  const homeWin = match.final_score_home > match.final_score_away
                  const awayWin = match.final_score_away > match.final_score_home
                  const hasStats = match.statistics && Object.keys(match.statistics).length > 0
                  const highlight = highlights[match.match_id]
                  const isLoadingHighlight = loadingHighlight === match.match_id

                  return (
                    <div 
                      key={match.match_id}
                      className="bg-[#1a1a1a] rounded-lg overflow-hidden"
                    >
                      {/* 경기 카드 메인 */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-[#222]"
                        onClick={() => handleMatchExpand(match)}
                      >
                        {/* 날짜/시간 */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-gray-500">
                            {formatDate(match.match_date)}
                          </span>
                          <div className="flex items-center gap-2">
                            {/* 하이라이트 아이콘 표시 (있을 경우) */}
                            {highlight?.youtubeId && (
                              <span className="text-red-500 text-xs">▶ 하이라이트</span>
                            )}
                            <span className="text-xs text-gray-500">
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          </div>
                        </div>

                        {/* 홈팀 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 flex-1">
                            {match.home_crest ? (
                              <Image 
                                src={match.home_crest} 
                                alt={match.home_team}
                                width={28}
                                height={28}
                                className="w-7 h-7 object-contain"
                              />
                            ) : (
                              <div className="w-7 h-7 flex items-center justify-center">
                                ⚽
                              </div>
                            )}
                            <span className={`text-sm font-medium ${
                              homeWin ? 'text-white' : 'text-gray-400'
                            }`}>
                              {translateTeamName(match.home_team, currentLanguage)}
                            </span>
                          </div>
                          <span className={`text-2xl font-black ${
                            homeWin ? 'text-white' : 'text-gray-500'
                          }`}>
                            {match.final_score_home}
                          </span>
                        </div>

                        {/* 원정팀 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {match.away_crest ? (
                              <Image 
                                src={match.away_crest} 
                                alt={match.away_team}
                                width={28}
                                height={28}
                                className="w-7 h-7 object-contain"
                              />
                            ) : (
                              <div className="w-7 h-7 flex items-center justify-center">
                                ⚽
                              </div>
                            )}
                            <span className={`text-sm font-medium ${
                              awayWin ? 'text-white' : 'text-gray-400'
                            }`}>
                              {translateTeamName(match.away_team, currentLanguage)}
                            </span>
                          </div>
                          <span className={`text-2xl font-black ${
                            awayWin ? 'text-white' : 'text-gray-500'
                          }`}>
                            {match.final_score_away}
                          </span>
                        </div>
                      </div>

                      {/* 확장 영역 - 하이라이트 + 경기 통계 */}
                      {isExpanded && (
                        <div className="bg-[#151515] border-t border-gray-800">
                          {/* 🎬 하이라이트 섹션 */}
                          <div className="px-4 py-3 border-b border-gray-800">
                            <h3 className="text-xs font-bold text-gray-400 mb-3">
                              {currentLanguage === 'ko' ? '🎬 하이라이트' : '🎬 Highlights'}
                            </h3>
                            
                            {isLoadingHighlight ? (
                              <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                                {currentLanguage === 'ko' ? '하이라이트 검색 중...' : 'Searching highlights...'}
                              </div>
                            ) : highlight?.youtubeId ? (
                              <div className="space-y-3">
                                {/* 썸네일 + 재생 버튼 */}
                                <div 
                                  className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden cursor-pointer group"
                                  onClick={() => setShowVideoModal(highlight.youtubeId!)}
                                >
                                  <Image
                                    src={`https://img.youtube.com/vi/${highlight.youtubeId}/maxresdefault.jpg`}
                                    alt="Highlight thumbnail"
                                    fill
                                    className="object-cover"
                                    onError={(e) => {
                                      // 고해상도 썸네일 없으면 기본 썸네일로
                                      (e.target as HTMLImageElement).src = 
                                        `https://img.youtube.com/vi/${highlight.youtubeId}/hqdefault.jpg`
                                    }}
                                  />
                                  {/* 재생 버튼 오버레이 */}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"/>
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* YouTube에서 보기 링크 */}
                                <a
                                  href={highlight.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                                  </svg>
                                  {currentLanguage === 'ko' ? 'YouTube에서 보기' : 'Watch on YouTube'}
                                </a>
                              </div>
                            ) : (
                              <div className="text-gray-500 text-sm py-2">
                                {currentLanguage === 'ko' 
                                  ? '하이라이트 영상이 없습니다' 
                                  : 'No highlights available'}
                              </div>
                            )}
                          </div>

                          {/* 경기 통계 섹션 */}
                          <div className="px-4 py-3">
                            {hasStats ? (
                              <div>
                                <h3 className="text-xs font-bold text-gray-400 mb-3">
                                  {currentLanguage === 'ko' ? '📊 경기 통계' : '📊 Match Stats'}
                                </h3>
                                
                                <div className="space-y-3">
                                  {/* 점유율 */}
                                  {match.statistics?.possession_home !== undefined && (
                                    <div>
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-white font-medium">
                                          {match.statistics.possession_home}%
                                        </span>
                                        <span className="text-gray-400">
                                          {currentLanguage === 'ko' ? '점유율' : 'Possession'}
                                        </span>
                                        <span className="text-white font-medium">
                                          {match.statistics.possession_away}%
                                        </span>
                                      </div>
                                      <div className="flex h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                          className="bg-blue-500"
                                          style={{ width: `${match.statistics.possession_home}%` }}
                                        />
                                        <div 
                                          className="bg-red-500"
                                          style={{ width: `${match.statistics.possession_away}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* 슈팅 */}
                                  {match.statistics?.shots_total_home !== undefined && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-white font-medium">
                                        {match.statistics.shots_total_home}
                                      </span>
                                      <span className="text-gray-400">
                                        {currentLanguage === 'ko' ? '슈팅' : 'Shots'}
                                      </span>
                                      <span className="text-white font-medium">
                                        {match.statistics.shots_total_away}
                                      </span>
                                    </div>
                                  )}

                                  {/* 유효슈팅 */}
                                  {match.statistics?.shots_on_goal_home !== undefined && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-white font-medium">
                                        {match.statistics.shots_on_goal_home}
                                      </span>
                                      <span className="text-gray-400">
                                        {currentLanguage === 'ko' ? '유효슈팅' : 'Shots on Target'}
                                      </span>
                                      <span className="text-white font-medium">
                                        {match.statistics.shots_on_goal_away}
                                      </span>
                                    </div>
                                  )}

                                  {/* 패스 정확도 */}
                                  {match.statistics?.pass_accuracy_home !== undefined && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-white font-medium">
                                        {match.statistics.pass_accuracy_home}%
                                      </span>
                                      <span className="text-gray-400">
                                        {currentLanguage === 'ko' ? '패스 정확도' : 'Pass Accuracy'}
                                      </span>
                                      <span className="text-white font-medium">
                                        {match.statistics.pass_accuracy_away}%
                                      </span>
                                    </div>
                                  )}

                                  {/* 코너킥 */}
                                  {match.statistics?.corners_home !== undefined && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-white font-medium">
                                        {match.statistics.corners_home}
                                      </span>
                                      <span className="text-gray-400">
                                        {currentLanguage === 'ko' ? '코너킥' : 'Corners'}
                                      </span>
                                      <span className="text-white font-medium">
                                        {match.statistics.corners_away}
                                      </span>
                                    </div>
                                  )}

                                  {/* 파울 */}
                                  {match.statistics?.fouls_home !== undefined && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-white font-medium">
                                        {match.statistics.fouls_home}
                                      </span>
                                      <span className="text-gray-400">
                                        {currentLanguage === 'ko' ? '파울' : 'Fouls'}
                                      </span>
                                      <span className="text-white font-medium">
                                        {match.statistics.fouls_away}
                                      </span>
                                    </div>
                                  )}

                                  {/* 옐로카드 */}
                                  {match.statistics?.yellow_cards_home !== undefined && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-yellow-400 font-medium">
                                        {match.statistics.yellow_cards_home}
                                      </span>
                                      <span className="text-gray-400">
                                        {currentLanguage === 'ko' ? '옐로카드' : 'Yellow Cards'}
                                      </span>
                                      <span className="text-yellow-400 font-medium">
                                        {match.statistics.yellow_cards_away}
                                      </span>
                                    </div>
                                  )}

                                  {/* 오프사이드 */}
                                  {match.statistics?.offsides_home !== undefined && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-white font-medium">
                                        {match.statistics.offsides_home}
                                      </span>
                                      <span className="text-gray-400">
                                        {currentLanguage === 'ko' ? '오프사이드' : 'Offsides'}
                                      </span>
                                      <span className="text-white font-medium">
                                        {match.statistics.offsides_away}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="py-4 text-center">
                                <div className="text-gray-500 text-xs">
                                  {currentLanguage === 'ko' 
                                    ? '경기 통계를 불러올 수 없습니다' 
                                    : 'Statistics not available'}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

            {/* 경기 없음 */}
            {filteredMatches.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {currentLanguage === 'ko' 
                  ? '표시할 경기 결과가 없습니다'
                  : 'No match results available'
                }
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}