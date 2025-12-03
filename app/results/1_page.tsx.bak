'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
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

export default function MatchResultsPage() {
  // 한국 시간 기준 현재 날짜 계산
  const getKoreanDate = (date: Date = new Date()): Date => {
    // UTC 시간에 9시간 추가하여 한국 시간 계산
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
    const kst = new Date(utc + (9 * 60 * 60 * 1000))
    return kst
  }

  // 한국 시간 기준 오늘 날짜로 초기화
  const getKoreanToday = (): Date => {
    const kst = getKoreanDate()
    return new Date(kst.getFullYear(), kst.getMonth(), kst.getDate())
  }

  const { t, language: currentLanguage } = useLanguage()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL')
  const [selectedDate, setSelectedDate] = useState<Date>(getKoreanToday()) // ✅ 한국 시간 기준 오늘
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set())
  
  // 하이라이트 관련 상태
  const [highlights, setHighlights] = useState<Record<string, any>>({})
  const [loadingHighlight, setLoadingHighlight] = useState<string | null>(null)
  const [showVideoModal, setShowVideoModal] = useState<string | null>(null)

  // 데이터 캐시 (날짜별로 저장)
  const dataCache = useRef<Record<string, Match[]>>({})
  
  // 하이라이트 캐시
  const highlightCache = useRef<Record<string, any>>({})

  // ✅ 날짜 변경 시 해당 날짜 데이터 로드
  useEffect(() => {
    const dateKey = formatDateKey(selectedDate)
    loadMatchesByDate(dateKey)
  }, [selectedDate])

  // 날짜 키 포맷 (YYYY-MM-DD)
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 날짜 표시 포맷 (한국 시간 기준)
  const formatDateDisplay = (date: Date): string => {
    const today = getKoreanToday()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 날짜만 비교 (시간 제외)
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const isToday = dateOnly.getTime() === today.getTime()
    const isYesterday = dateOnly.getTime() === yesterday.getTime()
    const isTomorrow = dateOnly.getTime() === tomorrow.getTime()

    if (currentLanguage === 'ko') {
      if (isToday) return '오늘'
      if (isYesterday) return '어제'
      if (isTomorrow) return '내일'
      return `${date.getMonth() + 1}월 ${date.getDate()}일`
    } else {
      if (isToday) return 'Today'
      if (isYesterday) return 'Yesterday'
      if (isTomorrow) return 'Tomorrow'
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  // 날짜 이동
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(getKoreanToday())
  }

  // 리그 필터링 (클라이언트 사이드)
  const filteredMatches = React.useMemo(() => {
    let filtered = matches
    
    // 리그 필터
    if (selectedLeague !== 'ALL') {
      filtered = filtered.filter(match => match.league === selectedLeague)
    }

    // 시간순 정렬
    return filtered.sort((a, b) => 
      new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    )
  }, [matches, selectedLeague])

  // 하이라이트 로드 함수
  const loadHighlight = useCallback(async (match: Match) => {
    const cacheKey = `${match.home_team}-${match.away_team}-${match.match_date.split('T')[0]}`
    
    if (highlightCache.current[cacheKey] !== undefined) {
      setHighlights(prev => ({ ...prev, [match.match_id]: highlightCache.current[cacheKey] }))
      return
    }

    setLoadingHighlight(match.match_id)

    try {
      const matchDate = match.match_date.split('T')[0]
      const response = await fetch(
        `/api/match-highlights?date=${matchDate}&homeTeam=${encodeURIComponent(match.home_team)}&awayTeam=${encodeURIComponent(match.away_team)}&league=${match.league}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch highlight')
      
      const data = await response.json()
      const highlight = data.highlights?.[0] || null
      highlightCache.current[cacheKey] = highlight
      setHighlights(prev => ({ ...prev, [match.match_id]: highlight }))
    } catch (error) {
      console.error('Failed to load highlight:', error)
      highlightCache.current[cacheKey] = null
      setHighlights(prev => ({ ...prev, [match.match_id]: null }))
    } finally {
      setLoadingHighlight(null)
    }
  }, [])

  // 경기 확장 핸들러
  const handleMatchExpand = useCallback((match: Match) => {
    const matchId = match.match_id
    if (expandedMatch === matchId) {
      setExpandedMatch(null)
    } else {
      setExpandedMatch(matchId)
      if (highlights[matchId] === undefined) {
        loadHighlight(match)
      }
    }
  }, [expandedMatch, highlights, loadHighlight])

  // ✅ 날짜별 경기 데이터 로드
  const loadMatchesByDate = async (dateKey: string) => {
    // 캐시에 있으면 캐시 데이터 사용
    if (dataCache.current[dateKey]) {
      console.log(`📦 Using cached data for date: ${dateKey}`)
      setMatches(dataCache.current[dateKey])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const apiUrl = `/api/match-results?league=ALL&date=${dateKey}&stats=true`
      console.log(`🔄 Fetching data for date: ${dateKey}`)
      console.log(`📡 API URL: ${apiUrl}`)
      
      const response = await fetch(apiUrl)
      
      console.log(`📊 Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Response error:', errorText)
        throw new Error('Failed to fetch match results')
      }
      
      const data = await response.json()
      console.log('🔍 Received data:', data)
      console.log('🔍 Matches count:', data.count)
      console.log('🔍 Season:', data.season)

      if (data.success) {
        const matchesArray = data.matches || []
        console.log(`✅ Loaded ${matchesArray.length} matches for ${dateKey}`)
        
        if (matchesArray.length > 0) {
          console.log('📦 First match:', matchesArray[0])
        }
        
        // 캐시에 저장
        dataCache.current[dateKey] = matchesArray
        setMatches(matchesArray)
      } else {
        console.error('❌ API returned error:', data.error)
        setMatches([])
      }
    } catch (error) {
      console.error('❌ Failed to load matches:', error)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }

  // 리그별 그룹화
  const groupedMatches = filteredMatches.reduce((acc, match) => {
    const leagueCode = match.league
    if (!acc[leagueCode]) {
      acc[leagueCode] = []
    }
    acc[leagueCode].push(match)
    return acc
  }, {} as Record<string, Match[]>)

  // 리그 접기/펼치기 토글
  const toggleLeague = (leagueCode: string) => {
    setCollapsedLeagues(prev => {
      const newSet = new Set(prev)
      if (newSet.has(leagueCode)) {
        newSet.delete(leagueCode)
      } else {
        newSet.add(leagueCode)
      }
      return newSet
    })
  }

  // 전체 접기/펼치기
  const toggleAllLeagues = () => {
    if (collapsedLeagues.size === Object.keys(groupedMatches).length) {
      // 모두 접혀있으면 모두 펼치기
      setCollapsedLeagues(new Set())
    } else {
      // 아니면 모두 접기
      setCollapsedLeagues(new Set(Object.keys(groupedMatches)))
    }
  }

  function translateTeamName(englishName: string, language: string): string {
    if (language !== 'ko') return englishName
    return TEAM_NAME_KR[englishName] || englishName
  }

  function getLeagueInfo(code: string) {
    return LEAGUES.find(l => l.code === code)
  }

  function getLeagueName(code: string, lang: string): string {
    const league = LEAGUES.find(l => l.code === code)
    return league ? (lang === 'ko' ? league.nameKo : league.nameEn) : code
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString)
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

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
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-8 bg-gray-800 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* 메인 컨텐츠 스켈레톤 */}
          <main className="flex-1 p-4">
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-gray-800 rounded w-full"></div>
              {[1,2,3,4,5].map(i => (
                <div key={i} className="bg-[#1a1a1a] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                      <div className="h-4 bg-gray-700 rounded w-24"></div>
                    </div>
                    <div className="h-6 bg-gray-700 rounded w-12"></div>
                    <div className="flex items-center gap-3">
                      <div className="h-4 bg-gray-700 rounded w-24"></div>
                      <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                    </div>
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
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowVideoModal(null)}
        >
          <div className="relative w-full max-w-4xl aspect-video">
            <button
              onClick={() => setShowVideoModal(null)}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300"
            >
              ✕
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${showVideoModal}?autoplay=1`}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* 중앙 컨테이너 */}
      <div className="max-w-7xl mx-auto flex">
        {/* 좌측 사이드바 (데스크탑만) */}
        <aside className="hidden md:block w-64 min-h-screen bg-[#1a1a1a] border-r border-gray-800 sticky top-0 overflow-y-auto">
          <div className="p-4">
            {/* 리그 필터 */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">
                {currentLanguage === 'ko' ? '리그' : 'Leagues'}
              </h3>
              <div className="space-y-1">
                {LEAGUES.map(league => (
                  <button
                    key={league.code}
                    onClick={() => setSelectedLeague(league.code)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedLeague === league.code
                        ? 'bg-[#A3FF4C] text-gray-900 font-medium'
                        : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
                    }`}
                  >
                    {league.isEmoji ? (
                      <span className="text-base">{league.logo}</span>
                    ) : (
                      <Image 
                        src={league.logo} 
                        alt={league.nameEn}
                        width={20}
                        height={20}
                        className="w-5 h-5"
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
        <main className="flex-1 w-full md:min-h-screen">
          {/* 날짜 네비게이션 헤더 */}
          <div className="sticky top-0 bg-[#0f0f0f] z-50 border-b border-gray-800">
            <div className="px-4 py-3">
              {/* 날짜 선택기 */}
              <div className="flex items-center justify-center gap-4 mb-3">
                <button
                  onClick={goToPreviousDay}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1a1a1a] hover:bg-[#252525] transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={goToToday}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] transition-colors"
                >
                  <span className="text-white font-medium">
                    {formatDateDisplay(selectedDate)}
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={goToNextDay}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1a1a1a] hover:bg-[#252525] transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* 리그 필터 - 가로 스크롤 (모바일) */}
              <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
                <div className="flex gap-2 min-w-max">
                  {LEAGUES.map(league => (
                    <button
                      key={league.code}
                      onClick={() => setSelectedLeague(league.code)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                        selectedLeague === league.code
                          ? 'bg-white text-black'
                          : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'
                      }`}
                    >
                      {league.isEmoji ? (
                        <span className="text-sm">{league.logo}</span>
                      ) : (
                        <Image 
                          src={league.logo} 
                          alt={league.nameEn}
                          width={16}
                          height={16}
                          className="w-4 h-4"
                        />
                      )}
                      <span className="text-xs font-medium">
                        {currentLanguage === 'ko' ? league.nameKo : league.nameEn}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 경기 목록 */}
          <div className="p-4 md:px-6 space-y-3">
            {Object.entries(groupedMatches).map(([leagueCode, leagueMatches]) => {
              const leagueInfo = getLeagueInfo(leagueCode)
              const isCollapsed = collapsedLeagues.has(leagueCode)

              return (
                <div key={leagueCode} className="bg-[#1a1a1a] rounded-lg overflow-hidden">
                  {/* 리그 헤더 */}
                  <button
                    onClick={() => toggleLeague(leagueCode)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#252525] hover:bg-[#2a2a2a] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {leagueInfo && !leagueInfo.isEmoji ? (
                        <Image 
                          src={leagueInfo.logo} 
                          alt={leagueInfo.nameEn}
                          width={20}
                          height={20}
                          className="w-5 h-5"
                        />
                      ) : (
                        <span className="text-base">{leagueInfo?.logo || '⚽'}</span>
                      )}
                      <span className="text-sm font-medium text-white">
                        {getLeagueName(leagueCode, currentLanguage)}
                      </span>
                      <span className="text-xs text-gray-500">({leagueMatches.length})</span>
                    </div>
                    <svg 
                      className={`w-4 h-4 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* 경기 목록 */}
                  {!isCollapsed && (
                    <div className="divide-y divide-gray-800">
                      {leagueMatches.map((match) => {
                        const isExpanded = expandedMatch === match.match_id
                        const highlight = highlights[match.match_id]
                        const hasStats = match.statistics && Object.keys(match.statistics).length > 0

                        return (
                          <div key={match.match_id}>
                            {/* 경기 요약 */}
                            <button
                              onClick={() => handleMatchExpand(match)}
                              className="w-full px-4 py-3 flex items-center hover:bg-[#252525] transition-colors"
                            >
                              {/* FT 표시 */}
                              <div className="w-8 flex-shrink-0">
                                <span className="text-[10px] text-gray-500 font-medium">FT</span>
                              </div>

                              {/* 홈팀 */}
                              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                <span className="text-sm truncate">
                                  {translateTeamName(match.home_team, currentLanguage)}
                                </span>
                                {match.home_crest ? (
                                  <Image 
                                    src={match.home_crest}
                                    alt={match.home_team}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 object-contain flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-6 h-6 bg-gray-700 rounded-full flex-shrink-0" />
                                )}
                              </div>

                              {/* 스코어 */}
                              <div className="flex items-center justify-center gap-1 px-4 min-w-[60px]">
                                <span className={`text-base font-bold ${
                                  match.final_score_home > match.final_score_away 
                                    ? 'text-white' 
                                    : 'text-gray-400'
                                }`}>
                                  {match.final_score_home}
                                </span>
                                <span className="text-gray-600">-</span>
                                <span className={`text-base font-bold ${
                                  match.final_score_away > match.final_score_home 
                                    ? 'text-white' 
                                    : 'text-gray-400'
                                }`}>
                                  {match.final_score_away}
                                </span>
                              </div>

                              {/* 원정팀 */}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {match.away_crest ? (
                                  <Image 
                                    src={match.away_crest}
                                    alt={match.away_team}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 object-contain flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-6 h-6 bg-gray-700 rounded-full flex-shrink-0" />
                                )}
                                <span className="text-sm truncate">
                                  {translateTeamName(match.away_team, currentLanguage)}
                                </span>
                              </div>

                              {/* 확장 아이콘 */}
                              <div className="w-8 flex-shrink-0 flex justify-end">
                                <svg 
                                  className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </button>

                            {/* 확장된 내용 */}
                            {isExpanded && (
                              <div className="px-4 pb-4 border-t border-gray-800 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#151515]">
                                {/* 하이라이트 섹션 */}
                                <div className="space-y-2">
                                  <h3 className="text-xs font-bold text-gray-400 mb-2">
                                    {currentLanguage === 'ko' ? '🎬 하이라이트' : '🎬 Highlights'}
                                  </h3>
                                  {loadingHighlight === match.match_id ? (
                                    <div className="flex items-center justify-center py-8">
                                      <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                  ) : highlight ? (
                                    <div className="space-y-2">
                                      <div 
                                        className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
                                        onClick={() => {
                                          const videoId = highlight.videoUrl?.split('v=')[1]?.split('&')[0]
                                          if (videoId) setShowVideoModal(videoId)
                                        }}
                                      >
                                        <Image
                                          src={highlight.thumbnail}
                                          alt="Highlight thumbnail"
                                          fill
                                          className="object-cover"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                                          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M8 5v14l11-7z"/>
                                            </svg>
                                          </div>
                                        </div>
                                      </div>
                                      <a
                                        href={highlight.videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                                      >
                                        <span>YouTube에서 보기 →</span>
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="text-gray-500 text-sm">
                                      {currentLanguage === 'ko' ? '하이라이트 없음' : 'No highlights'}
                                    </div>
                                  )}
                                </div>

                                {/* 경기 통계 섹션 */}
                                {hasStats ? (
                                  <div className="py-1">
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
                                  <div className="py-8 text-center">
                                    <div className="text-gray-500 text-xs">
                                      {currentLanguage === 'ko' 
                                        ? '경기 통계를 불러올 수 없습니다' 
                                        : 'Statistics not available'}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* 모두 숨기기/보이기 버튼 */}
            {Object.keys(groupedMatches).length > 1 && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={toggleAllLeagues}
                  className="flex items-center gap-2 px-4 py-2 bg-[#252525] hover:bg-[#2a2a2a] rounded-full text-sm text-gray-400 transition-colors"
                >
                  <span>
                    {collapsedLeagues.size === Object.keys(groupedMatches).length
                      ? (currentLanguage === 'ko' ? '모두 펼치기' : 'Expand All')
                      : (currentLanguage === 'ko' ? '모두 숨기기' : 'Collapse All')
                    }
                  </span>
                  <svg 
                    className={`w-4 h-4 transition-transform ${
                      collapsedLeagues.size === Object.keys(groupedMatches).length ? 'rotate-180' : ''
                    }`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* 경기 없음 */}
            {filteredMatches.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">⚽</div>
                {currentLanguage === 'ko' 
                  ? '이 날짜에 종료된 경기가 없습니다'
                  : 'No finished matches on this date'
                }
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}