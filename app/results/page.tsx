'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useLanguage } from '../contexts/LanguageContext'
import { TEAM_NAME_KR } from '../teamLogos'
import AdSenseAd from '../components/AdSenseAd'

// 🏆 리그 정보
const LEAGUES = [
  { code: 'ALL', nameKo: '전체', nameEn: 'All Leagues', logo: '🌍', isEmoji: true },
  // 유럽 대항전
  { code: 'CL', nameKo: '챔스', nameEn: 'Champions League', logo: 'https://media.api-sports.io/football/leagues/2.png', isEmoji: false },
  { code: 'EL', nameKo: '유로파', nameEn: 'Europa League', logo: 'https://media.api-sports.io/football/leagues/3.png', isEmoji: false },
  { code: 'UECL', nameKo: '컨퍼런스', nameEn: 'UEFA Conference League', logo: 'https://media.api-sports.io/football/leagues/848.png', isEmoji: false },
  { code: 'UNL', nameKo: '네이션스', nameEn: 'UEFA Nations League', logo: 'https://media.api-sports.io/football/leagues/5.png', isEmoji: false },
  // 잉글랜드
  { code: 'PL', nameKo: 'EPL', nameEn: 'Premier League', logo: 'https://media.api-sports.io/football/leagues/39.png', isEmoji: false },
  { code: 'ELC', nameKo: '챔피언십', nameEn: 'Championship', logo: 'https://media.api-sports.io/football/leagues/40.png', isEmoji: false },
  { code: 'FAC', nameKo: 'FA컵', nameEn: 'FA Cup', logo: 'https://media.api-sports.io/football/leagues/45.png', isEmoji: false },
  { code: 'EFL', nameKo: 'EFL컵', nameEn: 'EFL Cup', logo: 'https://media.api-sports.io/football/leagues/46.png', isEmoji: false },
  // 스페인
  { code: 'PD', nameKo: '라리가', nameEn: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png', isEmoji: false },
  { code: 'CDR', nameKo: '코파델레이', nameEn: 'Copa del Rey', logo: 'https://media.api-sports.io/football/leagues/143.png', isEmoji: false },
  // 독일
  { code: 'BL1', nameKo: '분데스', nameEn: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png', isEmoji: false },
  { code: 'DFB', nameKo: 'DFB포칼', nameEn: 'DFB Pokal', logo: 'https://media.api-sports.io/football/leagues/81.png', isEmoji: false },
  // 이탈리아
  { code: 'SA', nameKo: '세리에', nameEn: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png', isEmoji: false },
  { code: 'CIT', nameKo: '코파이탈리아', nameEn: 'Coppa Italia', logo: 'https://media.api-sports.io/football/leagues/137.png', isEmoji: false },
  // 프랑스
  { code: 'FL1', nameKo: '리그1', nameEn: 'Ligue 1', logo: 'https://media.api-sports.io/football/leagues/61.png', isEmoji: false },
  { code: 'CDF', nameKo: '쿠프드프랑스', nameEn: 'Coupe de France', logo: 'https://media.api-sports.io/football/leagues/66.png', isEmoji: false },
  // 포르투갈
  { code: 'PPL', nameKo: '포르투갈', nameEn: 'Primeira Liga', logo: 'https://media.api-sports.io/football/leagues/94.png', isEmoji: false },
  { code: 'TDP', nameKo: '타사드포르투갈', nameEn: 'Taça de Portugal', logo: 'https://media.api-sports.io/football/leagues/96.png', isEmoji: false },
  // 네덜란드
  { code: 'DED', nameKo: '네덜란드', nameEn: 'Eredivisie', logo: 'https://media.api-sports.io/football/leagues/88.png', isEmoji: false },
  { code: 'KNV', nameKo: 'KNVB컵', nameEn: 'KNVB Cup', logo: 'https://media.api-sports.io/football/leagues/90.png', isEmoji: false },
  // 🆕 아프리카
  { code: 'AFCON', nameKo: '아프리카컵', nameEn: 'Africa Cup of Nations', logo: 'https://media.api-sports.io/football/leagues/6.png', isEmoji: false },
]

// 예측 정보 인터페이스
interface Prediction {
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
  predictedHomeScore: number
  predictedAwayScore: number
  predictedWinner: 'home' | 'draw' | 'away'
}

// ✅ PICK 정보 인터페이스 (NEW!)
interface PickInfo {
  match_id: string
  pick_result: 'HOME' | 'DRAW' | 'AWAY'
  pick_probability: number
  home_probability: number
  draw_probability: number
  away_probability: number
  home_power: number
  away_power: number
  pattern: string
  reasons: string[]
  is_correct: boolean | null
}

interface Match {
  match_id: string
  home_team: string
  away_team: string
  home_crest?: string
  away_crest?: string
  match_date: string
  match_time_kst?: string
  league: string
  final_score_home: number
  final_score_away: number
  statistics?: any
  predicted_winner?: string
  predicted_score_home?: number
  predicted_score_away?: number
  predicted_home_probability?: number
  predicted_draw_probability?: number
  predicted_away_probability?: number
  is_correct?: boolean
  prediction_type?: string
  prediction?: Prediction | null
  actualWinner?: 'home' | 'draw' | 'away'
  isWinnerCorrect?: boolean
  isScoreCorrect?: boolean
  // ✅ PICK 관련 필드 추가
  isPick?: boolean
  pickInfo?: PickInfo
}

interface Highlight {
  title: string
  thumbnail: string
  matchviewUrl: string
  embedCode?: string
  competition?: string
  date?: string
  matchScore?: number
}

interface PredictionStats {
  total: number
  withPredictions: number
  winnerCorrect: number
  scoreCorrect: number
  accuracy: number
}

// ✅ PICK 통계 인터페이스 (NEW!)
interface PickStats {
  total: number
  correct: number
  incorrect: number
  pending: number
  accuracy: number
}

export default function MatchResultsPage() {
  // 브라우저 로컬 시간대 자동 적용
  const getLocalDate = (date: Date = new Date()): Date => {
    return date
  }

  const getLocalToday = (): Date => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }

  const { language: currentLanguage } = useLanguage()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL')
  const [selectedDate, setSelectedDate] = useState<Date>(getLocalToday())
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set())
  
  const [highlights, setHighlights] = useState<Record<string, Highlight | null>>({})
  const [loadingHighlight, setLoadingHighlight] = useState<string | null>(null)

  const [predictionStats, setPredictionStats] = useState<PredictionStats>({
    total: 0,
    withPredictions: 0,
    winnerCorrect: 0,
    scoreCorrect: 0,
    accuracy: 0
  })

  // ✅ PICK 관련 상태 추가 (NEW!)
  const [pickStats, setPickStats] = useState<PickStats>({
    total: 0,
    correct: 0,
    incorrect: 0,
    pending: 0,
    accuracy: 0
  })
  const [pickMap, setPickMap] = useState<Record<string, PickInfo>>({})

  const dataCache = useRef<Record<string, Match[]>>({})
  const highlightCache = useRef<Record<string, Highlight | null>>({})

  useEffect(() => {
    const dateKey = formatDateKey(selectedDate)
    loadMatchesByDate(dateKey)
    loadPickData(dateKey)  // ✅ PICK 데이터 로드 추가
  }, [selectedDate])

  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDateDisplay = (date: Date): string => {
    const today = getLocalToday()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

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
    setSelectedDate(getLocalToday())
  }

  // ✅ PICK 데이터 로드 함수 (NEW!)
  const loadPickData = async (dateKey: string) => {
    try {
      const response = await fetch(`/api/pick-recommendations?date=${dateKey}`)
      if (!response.ok) return
      
      const data = await response.json()
      
      if (data.picks && Array.isArray(data.picks)) {
        const map: Record<string, PickInfo> = {}
        data.picks.forEach((pick: PickInfo) => {
          map[pick.match_id] = pick
        })
        setPickMap(map)
        
        // PICK 통계 설정
        setPickStats({
          total: data.stats?.total || 0,
          correct: data.stats?.correct || 0,
          incorrect: data.stats?.incorrect || 0,
          pending: data.stats?.pending || 0,
          accuracy: data.stats?.accuracy || 0
        })
      }
    } catch (error) {
      console.error('Failed to load PICK data:', error)
    }
  }

  // ✅ PICK 결과 텍스트 변환
  const getPickResultText = (pick: string, lang: string) => {
    const map: Record<string, Record<string, string>> = {
      HOME: { ko: '홈승', en: 'Home' },
      DRAW: { ko: '무승부', en: 'Draw' },
      AWAY: { ko: '원정승', en: 'Away' }
    }
    return map[pick]?.[lang] || pick
  }

  const filteredMatches = React.useMemo(() => {
    let filtered = matches.map(match => {
      // ✅ PICK 정보 병합
      const pickInfo = pickMap[match.match_id]
      return pickInfo ? { ...match, isPick: true, pickInfo } : match
    })
    
    if (selectedLeague !== 'ALL') {
      filtered = filtered.filter(match => match.league === selectedLeague)
    }
    return filtered.sort((a, b) => 
      new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    )
  }, [matches, selectedLeague, pickMap])

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

  // 데이터 로드 - 기존 API 구조 유지
  const loadMatchesByDate = async (dateKey: string) => {
    if (dataCache.current[dateKey]) {
      setMatches(dataCache.current[dateKey])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      const apiUrl = `/api/match-results?league=ALL&date=${dateKey}&stats=true`
      const response = await fetch(apiUrl)
      
      if (!response.ok) throw new Error('Failed to fetch match results')
      
      const data = await response.json()

      if (data.success) {
        const matchesArray: Match[] = data.matches || []
        
        let winnerCorrectCount = 0
        let scoreCorrectCount = 0
        let withPredictionsCount = 0

        matchesArray.forEach((match: any) => {
          const hasPrediction = match.predicted_home_probability !== null && 
                                match.predicted_home_probability !== undefined
          
          if (hasPrediction) {
            withPredictionsCount++
            
            let actualWinner: 'home' | 'draw' | 'away' = 'draw'
            if (match.final_score_home > match.final_score_away) {
              actualWinner = 'home'
            } else if (match.final_score_away > match.final_score_home) {
              actualWinner = 'away'
            }
            
            let predictedWinner: 'home' | 'draw' | 'away' = 'draw'
            const predHome = match.predicted_score_home ?? 0
            const predAway = match.predicted_score_away ?? 0
            if (predHome > predAway) {
              predictedWinner = 'home'
            } else if (predAway > predHome) {
              predictedWinner = 'away'
            }
            
            const isWinnerCorrect = predictedWinner === actualWinner
            const isScoreCorrect = 
              predHome === match.final_score_home &&
              predAway === match.final_score_away
            
            if (isWinnerCorrect) winnerCorrectCount++
            if (isScoreCorrect) scoreCorrectCount++
            
            match.prediction = {
              homeWinProbability: Math.round(match.predicted_home_probability ?? 0),
              drawProbability: Math.round(match.predicted_draw_probability ?? 0),
              awayWinProbability: Math.round(match.predicted_away_probability ?? 0),
              predictedHomeScore: predHome,
              predictedAwayScore: predAway,
              predictedWinner: predictedWinner
            }
            match.actualWinner = actualWinner
            match.isWinnerCorrect = isWinnerCorrect
            match.isScoreCorrect = isScoreCorrect
          }
        })

        setPredictionStats({
          total: matchesArray.length,
          withPredictions: withPredictionsCount,
          winnerCorrect: winnerCorrectCount,
          scoreCorrect: scoreCorrectCount,
          accuracy: withPredictionsCount > 0 
            ? Math.round((winnerCorrectCount / withPredictionsCount) * 100)
            : 0
        })
        
        dataCache.current[dateKey] = matchesArray
        setMatches(matchesArray)
      } else {
        setMatches([])
      }
    } catch (error) {
      console.error('Failed to load matches:', error)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }

  const groupedMatches = filteredMatches.reduce((acc, match) => {
    const leagueCode = match.league
    if (!acc[leagueCode]) acc[leagueCode] = []
    acc[leagueCode].push(match)
    return acc
  }, {} as Record<string, Match[]>)

  const toggleLeague = (leagueCode: string) => {
    setCollapsedLeagues(prev => {
      const newSet = new Set(prev)
      if (newSet.has(leagueCode)) newSet.delete(leagueCode)
      else newSet.add(leagueCode)
      return newSet
    })
  }

  const translateTeamName = (name: string, lang: string) => {
    if (lang === 'ko' && TEAM_NAME_KR[name]) {
      return TEAM_NAME_KR[name]
    }
    return name
  }

  const getLeagueInfo = (code: string) => LEAGUES.find(l => l.code === code)
  
  const getLeagueName = (code: string, lang: string) => {
    const league = getLeagueInfo(code)
    if (league) return lang === 'ko' ? league.nameKo : league.nameEn
    return code
  }

  // 브라우저 로컬 시간대로 자동 변환
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr + 'Z')  // 'Z' 붙여서 UTC임을 명시
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto flex">
          <aside className="hidden md:block w-64 min-h-screen bg-[#1a1a1a] border-r border-gray-800">
            <div className="p-4 space-y-4">
              <div className="h-24 bg-gray-800/50 rounded-lg animate-pulse"></div>
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-10 bg-gray-800/50 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </aside>
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
      <div className="max-w-7xl mx-auto flex">
        {/* 좌측 사이드바 */}
        <aside className="hidden md:block w-64 min-h-screen bg-[#1a1a1a] border-r border-gray-800 sticky top-0 overflow-y-auto flex-shrink-0">
          <div className="p-4">
            {/* ✅ PICK 적중률 통계 (NEW!) */}
            {pickStats.total > 0 && (
              <div className="mb-4 p-3 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-lg border border-yellow-600/30">
                <h4 className="text-xs font-bold text-yellow-400 uppercase mb-2 flex items-center gap-1">
                  ⭐ {currentLanguage === 'ko' ? 'PICK 적중률' : 'PICK Accuracy'}
                </h4>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    pickStats.accuracy >= 70 ? 'text-green-400' :
                    pickStats.accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {pickStats.total - pickStats.pending > 0 ? `${pickStats.accuracy}%` : '-'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {pickStats.correct} / {pickStats.total - pickStats.pending}
                    {currentLanguage === 'ko' ? ' 적중' : ' correct'}
                  </div>
                  {pickStats.pending > 0 && (
                    <div className="text-xs text-yellow-500/70 mt-1">
                      {pickStats.pending}{currentLanguage === 'ko' ? '개 진행중' : ' pending'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 예측 적중률 통계 */}
            {predictionStats.withPredictions > 0 && (
              <div className="mb-6 p-3 bg-[#252525] rounded-lg">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">
                  {currentLanguage === 'ko' ? '오늘의 적중률' : "Today's Accuracy"}
                </h4>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    predictionStats.accuracy >= 60 ? 'text-green-400' :
                    predictionStats.accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {predictionStats.accuracy}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {predictionStats.winnerCorrect} / {predictionStats.withPredictions}
                    {currentLanguage === 'ko' ? ' 적중' : ' correct'}
                  </div>
                </div>
              </div>
            )}

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
                      <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center flex-shrink-0">
                        <Image src={league.logo} alt={league.nameEn} width={18} height={18} className="w-[18px] h-[18px] object-contain" />
                      </div>
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
          {/* 날짜 네비게이션 */}
          <div className="sticky top-0 bg-[#0f0f0f] z-50 border-b border-gray-800">
            <div className="px-4 py-3">
              <div className="flex items-center justify-center gap-4 mb-3">
                <button onClick={goToPreviousDay} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1a1a1a] hover:bg-[#252525] transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button onClick={goToToday} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] transition-colors">
                  <span className="text-white font-medium">{formatDateDisplay(selectedDate)}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <button onClick={goToNextDay} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1a1a1a] hover:bg-[#252525] transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* ✅ 모바일 PICK 통계 (NEW!) */}
              {pickStats.total > 0 && (
                <div className="md:hidden mb-3 p-2 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg border border-yellow-600/30 flex items-center justify-between">
                  <span className="text-xs text-yellow-400 font-medium flex items-center gap-1">
                    ⭐ PICK
                  </span>
                  <span className={`text-sm font-bold ${
                    pickStats.accuracy >= 70 ? 'text-green-400' :
                    pickStats.accuracy >= 50 ? 'text-yellow-400' : 'text-gray-400'
                  }`}>
                    {pickStats.total - pickStats.pending > 0 
                      ? `${pickStats.correct}/${pickStats.total - pickStats.pending} (${pickStats.accuracy}%)`
                      : `${pickStats.pending} pending`
                    }
                  </span>
                </div>
              )}

              {/* 모바일 리그 필터 */}
              <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
                <div className="flex gap-2 min-w-max">
                  {LEAGUES.map(league => (
                    <button
                      key={league.code}
                      onClick={() => setSelectedLeague(league.code)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                        selectedLeague === league.code
                          ? 'bg-[#A3FF4C] text-gray-900 font-medium'
                          : 'bg-[#1a1a1a] text-gray-400'
                      }`}
                    >
                      {league.isEmoji ? (
                        <span>{league.logo}</span>
                      ) : (
                        <div className="w-5 h-5 bg-white rounded flex items-center justify-center flex-shrink-0">
                          <Image src={league.logo} alt={league.nameEn} width={14} height={14} className="w-3.5 h-3.5 object-contain" />
                        </div>
                      )}
                      <span>{currentLanguage === 'ko' ? league.nameKo : league.nameEn}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 📢 모바일 상단 광고 */}
              <div className="md:hidden mt-3">
                <div className="text-[10px] text-center mb-1 text-gray-600">AD</div>
                <AdSenseAd slot="mobile_top" format="horizontal" responsive={true} darkMode={true} />
              </div>
            </div>
          </div>

          {/* 경기 목록 */}
          <div className="p-4 space-y-4">
            {Object.keys(groupedMatches).length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl mb-4">⚽</div>
                <p className="text-gray-500">
                  {currentLanguage === 'ko' ? '경기 결과가 없습니다' : 'No match results'}
                </p>
              </div>
            ) : (
              Object.entries(groupedMatches).map(([leagueCode, leagueMatches], leagueIndex) => {
                const leagueInfo = getLeagueInfo(leagueCode)
                const isCollapsed = collapsedLeagues.has(leagueCode)
                // ✅ 해당 리그의 PICK 경기 수
                const pickCount = leagueMatches.filter(m => m.isPick).length

                return (
                  <React.Fragment key={leagueCode}>
                    {/* 📢 모바일 인피드 광고 - 2번째, 4번째 리그 뒤 */}
                    {(leagueIndex === 1 || leagueIndex === 3) && (
                      <div className="md:hidden py-2">
                        <div className="text-[10px] text-center mb-1 text-gray-600">스폰서</div>
                        <AdSenseAd slot="mobile_infeed" format="auto" responsive={true} darkMode={true} />
                      </div>
                    )}
                    
                    <div className="bg-[#1a1a1a] rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleLeague(leagueCode)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#202020] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {leagueInfo?.isEmoji ? (
                          <span className="text-lg">{leagueInfo.logo}</span>
                        ) : leagueInfo?.logo ? (
                          <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center flex-shrink-0">
                            <Image src={leagueInfo.logo} alt={leagueInfo.nameEn || leagueCode} width={20} height={20} className="w-5 h-5 object-contain" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 bg-gray-700 rounded-md" />
                        )}
                        <span className="font-medium">{getLeagueName(leagueCode, currentLanguage)}</span>
                        <span className="text-xs text-gray-500">
                          {leagueMatches.length}{currentLanguage === 'ko' ? '경기' : ' matches'}
                        </span>
                        {/* ✅ PICK 카운트 배지 */}
                        {pickCount > 0 && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                            ⭐ {pickCount}
                          </span>
                        )}
                      </div>
                      <svg className={`w-5 h-5 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {!isCollapsed && (
                      <>
                        {/* 데스크톱: 테이블 형식 */}
                        <div className="hidden md:block overflow-x-auto">
                          <div className="grid grid-cols-[80px_1fr_120px_80px_70px] gap-2 px-4 py-2 bg-[#1a1a1a] border-b border-gray-800 text-xs text-gray-500 font-medium">
                            <div className="text-center">{currentLanguage === 'ko' ? '시간' : 'Time'}</div>
                            <div className="text-center">{currentLanguage === 'ko' ? '경기' : 'Match'}</div>
                            <div className="text-center">{currentLanguage === 'ko' ? '확률 (1-X-2)' : 'Prob (1-X-2)'}</div>
                            <div className="text-center">{currentLanguage === 'ko' ? '결과' : 'Result'}</div>
                            <div className="text-center">{currentLanguage === 'ko' ? '적중' : 'Hit'}</div>
                          </div>
                          
                          <div className="divide-y divide-gray-800/50">
                            {leagueMatches.map((match) => {
                              const isExpanded = expandedMatch === match.match_id
                              const highlight = highlights[match.match_id]
                              const pred = match.prediction

                              return (
                                <div key={match.match_id} className={`${match.isPick ? 'bg-gradient-to-r from-yellow-900/10 to-transparent' : 'bg-[#151515]'}`}>
                                  <button
                                    onClick={() => handleMatchExpand(match)}
                                    className="w-full grid grid-cols-[80px_1fr_120px_80px_70px] gap-2 px-4 py-3 hover:bg-[#1a1a1a] transition-colors items-center"
                                  >
                                    {/* 시간 + PICK 배지 */}
                                    <div className="text-center">
                                      {match.isPick && (
                                        <div className="text-[10px] text-yellow-400 font-bold mb-0.5">⭐ PICK</div>
                                      )}
                                      <span className="text-xs text-gray-500 font-medium">
                                        {formatTime(match.match_date)}
                                      </span>
                                    </div>

                                    {/* 경기 */}
                                    <div className="flex items-center justify-center gap-2">
                                      <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                                        <span className={`text-sm truncate text-right ${match.isPick && match.pickInfo?.pick_result === 'HOME' ? 'text-yellow-400 font-medium' : ''}`}>
                                          {translateTeamName(match.home_team, currentLanguage)}
                                        </span>
                                        {match.home_crest ? (
                                          <Image src={match.home_crest} alt={match.home_team} width={20} height={20} className="w-5 h-5 object-contain flex-shrink-0" />
                                        ) : (
                                          <div className="w-5 h-5 bg-gray-700 rounded-full flex-shrink-0" />
                                        )}
                                      </div>
                                      <span className="text-gray-600 text-xs">vs</span>
                                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        {match.away_crest ? (
                                          <Image src={match.away_crest} alt={match.away_team} width={20} height={20} className="w-5 h-5 object-contain flex-shrink-0" />
                                        ) : (
                                          <div className="w-5 h-5 bg-gray-700 rounded-full flex-shrink-0" />
                                        )}
                                        <span className={`text-sm truncate ${match.isPick && match.pickInfo?.pick_result === 'AWAY' ? 'text-yellow-400 font-medium' : ''}`}>
                                          {translateTeamName(match.away_team, currentLanguage)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* 확률 - PICK이면 PICK 확률 표시 */}
                                    <div className="flex items-center justify-center gap-1 text-xs">
                                      {match.isPick && match.pickInfo ? (
                                        <>
                                          <span className={match.pickInfo.pick_result === 'HOME' ? 'text-yellow-400 font-bold' : 'text-gray-400'}>
                                            {match.pickInfo.home_probability}
                                          </span>
                                          <span className="text-gray-600">-</span>
                                          <span className={match.pickInfo.pick_result === 'DRAW' ? 'text-yellow-400 font-bold' : 'text-gray-400'}>
                                            {match.pickInfo.draw_probability}
                                          </span>
                                          <span className="text-gray-600">-</span>
                                          <span className={match.pickInfo.pick_result === 'AWAY' ? 'text-yellow-400 font-bold' : 'text-gray-400'}>
                                            {match.pickInfo.away_probability}
                                          </span>
                                        </>
                                      ) : pred ? (
                                        <>
                                          <span className={pred.predictedWinner === 'home' ? 'text-[#A3FF4C] font-bold' : 'text-gray-400'}>
                                            {pred.homeWinProbability || '-'}
                                          </span>
                                          <span className="text-gray-600">-</span>
                                          <span className={pred.predictedWinner === 'draw' ? 'text-[#A3FF4C] font-bold' : 'text-gray-400'}>
                                            {pred.drawProbability || '-'}
                                          </span>
                                          <span className="text-gray-600">-</span>
                                          <span className={pred.predictedWinner === 'away' ? 'text-[#A3FF4C] font-bold' : 'text-gray-400'}>
                                            {pred.awayWinProbability || '-'}
                                          </span>
                                        </>
                                      ) : (
                                        <span className="text-gray-600">-</span>
                                      )}
                                    </div>

                                    {/* 결과 */}
                                    <div className="flex items-center justify-center gap-1">
                                      <span className={`text-sm font-bold ${match.final_score_home > match.final_score_away ? 'text-white' : 'text-gray-400'}`}>
                                        {match.final_score_home}
                                      </span>
                                      <span className="text-gray-600">-</span>
                                      <span className={`text-sm font-bold ${match.final_score_away > match.final_score_home ? 'text-white' : 'text-gray-400'}`}>
                                        {match.final_score_away}
                                      </span>
                                    </div>

                                    {/* 적중 여부 */}
                                    <div className="flex justify-center">
                                      {match.isPick && match.pickInfo ? (
                                        match.pickInfo.is_correct === true ? (
                                          <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded">
                                            ⭐ {currentLanguage === 'ko' ? '적중' : 'Hit'}
                                          </span>
                                        ) : match.pickInfo.is_correct === false ? (
                                          <span className="px-2 py-1 text-xs font-bold bg-red-600 text-white rounded">
                                            {currentLanguage === 'ko' ? '실패' : 'Miss'}
                                          </span>
                                        ) : (
                                          <span className="px-2 py-1 text-xs font-bold bg-gray-600 text-white rounded">
                                            {currentLanguage === 'ko' ? '진행중' : 'Pending'}
                                          </span>
                                        )
                                      ) : pred ? (
                                        match.isWinnerCorrect ? (
                                          <span className="px-2 py-1 text-xs font-bold bg-[#A3FF4C] text-black rounded">{currentLanguage === 'ko' ? '적중' : 'Hit'}</span>
                                        ) : (
                                          <span className="px-2 py-1 text-xs font-bold bg-red-600 text-white rounded">{currentLanguage === 'ko' ? '실패' : 'Miss'}</span>
                                        )
                                      ) : (
                                        <span className="text-gray-600 text-xs">-</span>
                                      )}
                                    </div>
                                  </button>

                                  {/* PICK 상세 정보 */}
                                  {isExpanded && match.isPick && match.pickInfo && (
                                    <div className="px-4 py-3 bg-yellow-900/10 border-t border-yellow-600/20">
                                      <div className="flex items-center gap-4 text-xs">
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-400">{currentLanguage === 'ko' ? '예측' : 'Pick'}:</span>
                                          <span className="text-yellow-400 font-bold">
                                            {getPickResultText(match.pickInfo.pick_result, currentLanguage)} ({match.pickInfo.pick_probability}%)
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-400">{currentLanguage === 'ko' ? '파워' : 'Power'}:</span>
                                          <span className="text-blue-400">{match.pickInfo.home_power}</span>
                                          <span className="text-gray-500">vs</span>
                                          <span className="text-red-400">{match.pickInfo.away_power}</span>
                                        </div>
                                        {match.pickInfo.pattern && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-400">{currentLanguage === 'ko' ? '패턴' : 'Pattern'}:</span>
                                            <span className="text-gray-300">{match.pickInfo.pattern}</span>
                                          </div>
                                        )}
                                      </div>
                                      {match.pickInfo.reasons && match.pickInfo.reasons.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {match.pickInfo.reasons.slice(0, 3).map((reason, idx) => (
                                            <span key={idx} className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                                              {reason}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {isExpanded && (
                                    <div className="border-t border-gray-800 bg-[#0a0a0a]">
                                      {loadingHighlight === match.match_id ? (
                                        <div className="flex items-center justify-center py-12">
                                          <div className="w-8 h-8 border-2 border-gray-600 border-t-[#A3FF4C] rounded-full animate-spin"></div>
                                        </div>
                                      ) : highlight && highlight.matchviewUrl ? (
                                        <div className="relative">
                                          <iframe
                                            src={highlight.matchviewUrl}
                                            className="w-full border-0"
                                            style={{ height: '850px', minHeight: '700px' }}
                                            allow="autoplay; fullscreen"
                                            allowFullScreen
                                            loading="lazy"
                                          />
                                          <div className="absolute top-2 right-2">
                                            <a
                                              href={highlight.matchviewUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-1 px-3 py-1.5 bg-black/70 hover:bg-black/90 rounded-lg text-xs text-white transition-colors"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                              </svg>
                                              {currentLanguage === 'ko' ? '새 탭' : 'New tab'}
                                            </a>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="py-12 text-center">
                                          <div className="text-3xl mb-3">📺</div>
                                          <p className="text-gray-500">
                                            {currentLanguage === 'ko' ? '하이라이트 준비 중' : 'Highlights coming soon'}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* 모바일: 카드 형식 */}
                        <div className="md:hidden divide-y divide-gray-800/50">
                          {leagueMatches.map((match) => {
                            const isExpanded = expandedMatch === match.match_id
                            const highlight = highlights[match.match_id]
                            const pred = match.prediction

                            return (
                              <div key={match.match_id} className={`${match.isPick ? 'bg-gradient-to-r from-yellow-900/10 to-transparent' : 'bg-[#151515]'}`}>
                                <button
                                  onClick={() => handleMatchExpand(match)}
                                  className="w-full px-4 py-3 hover:bg-[#1a1a1a] transition-colors"
                                >
                                  {/* 상단: 시간 + PICK 배지 */}
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-500">{formatTime(match.match_date)}</span>
                                    {match.isPick && (
                                      <span className="text-[10px] bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold px-2 py-0.5 rounded-full">
                                        ⭐ PICK {getPickResultText(match.pickInfo?.pick_result || '', currentLanguage)}
                                      </span>
                                    )}
                                  </div>

                                  {/* 중앙: 팀 vs 팀 + 스코어 */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      {match.home_crest ? (
                                        <Image src={match.home_crest} alt={match.home_team} width={24} height={24} className="w-6 h-6 object-contain flex-shrink-0" />
                                      ) : (
                                        <div className="w-6 h-6 bg-gray-700 rounded-full flex-shrink-0" />
                                      )}
                                      <span className={`text-sm truncate ${match.isPick && match.pickInfo?.pick_result === 'HOME' ? 'text-yellow-400 font-medium' : ''}`}>
                                        {translateTeamName(match.home_team, currentLanguage)}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 px-3">
                                      <span className={`text-lg font-bold ${match.final_score_home > match.final_score_away ? 'text-white' : 'text-gray-400'}`}>
                                        {match.final_score_home}
                                      </span>
                                      <span className="text-gray-600">-</span>
                                      <span className={`text-lg font-bold ${match.final_score_away > match.final_score_home ? 'text-white' : 'text-gray-400'}`}>
                                        {match.final_score_away}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                      <span className={`text-sm truncate text-right ${match.isPick && match.pickInfo?.pick_result === 'AWAY' ? 'text-yellow-400 font-medium' : ''}`}>
                                        {translateTeamName(match.away_team, currentLanguage)}
                                      </span>
                                      {match.away_crest ? (
                                        <Image src={match.away_crest} alt={match.away_team} width={24} height={24} className="w-6 h-6 object-contain flex-shrink-0" />
                                      ) : (
                                        <div className="w-6 h-6 bg-gray-700 rounded-full flex-shrink-0" />
                                      )}
                                    </div>
                                  </div>

                                  {/* 하단: 확률 + 적중 */}
                                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800/50">
                                    {match.isPick && match.pickInfo ? (
                                      <span className="text-xs text-gray-500">
                                        PICK <span className="text-yellow-400">{match.pickInfo.home_probability}-{match.pickInfo.draw_probability}-{match.pickInfo.away_probability}</span>
                                      </span>
                                    ) : pred ? (
                                      <span className="text-xs text-gray-500">
                                        {currentLanguage === 'ko' ? '확률' : 'Prob'} <span className="text-gray-400">{pred.homeWinProbability}-{pred.drawProbability}-{pred.awayWinProbability}</span>
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-600">-</span>
                                    )}
                                    
                                    {match.isPick && match.pickInfo ? (
                                      match.pickInfo.is_correct === true ? (
                                        <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded">⭐ {currentLanguage === 'ko' ? '적중' : 'Hit'}</span>
                                      ) : match.pickInfo.is_correct === false ? (
                                        <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded">{currentLanguage === 'ko' ? '실패' : 'Miss'}</span>
                                      ) : (
                                        <span className="px-2 py-0.5 text-xs font-bold bg-gray-600 text-white rounded">{currentLanguage === 'ko' ? '진행중' : 'Pending'}</span>
                                      )
                                    ) : pred ? (
                                      match.isWinnerCorrect ? (
                                        <span className="px-2 py-0.5 text-xs font-bold bg-[#A3FF4C] text-black rounded">{currentLanguage === 'ko' ? '적중' : 'Hit'}</span>
                                      ) : (
                                        <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded">{currentLanguage === 'ko' ? '실패' : 'Miss'}</span>
                                      )
                                    ) : null}
                                  </div>
                                </button>

                                {/* 모바일 PICK 상세 */}
                                {isExpanded && match.isPick && match.pickInfo && (
                                  <div className="px-4 py-2 bg-yellow-900/10 border-t border-yellow-600/20">
                                    <div className="text-xs space-y-1">
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">{currentLanguage === 'ko' ? '파워' : 'Power'}</span>
                                        <span>
                                          <span className="text-blue-400">{match.pickInfo.home_power}</span>
                                          <span className="text-gray-500 mx-1">vs</span>
                                          <span className="text-red-400">{match.pickInfo.away_power}</span>
                                        </span>
                                      </div>
                                      {match.pickInfo.pattern && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">{currentLanguage === 'ko' ? '패턴' : 'Pattern'}</span>
                                          <span className="text-gray-300">{match.pickInfo.pattern}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {isExpanded && (
                                  <div className="border-t border-gray-800 bg-[#0a0a0a]">
                                    {loadingHighlight === match.match_id ? (
                                      <div className="flex items-center justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-gray-600 border-t-[#A3FF4C] rounded-full animate-spin"></div>
                                      </div>
                                    ) : highlight && highlight.matchviewUrl ? (
                                      <div className="relative">
                                        <iframe
                                          src={highlight.matchviewUrl}
                                          className="w-full border-0"
                                          style={{ height: '400px' }}
                                          allow="autoplay; fullscreen"
                                          allowFullScreen
                                          loading="lazy"
                                        />
                                      </div>
                                    ) : (
                                      <div className="py-8 text-center">
                                        <div className="text-2xl mb-2">📺</div>
                                        <p className="text-gray-500 text-sm">
                                          {currentLanguage === 'ko' ? '하이라이트 준비 중' : 'Highlights coming soon'}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </React.Fragment>
                )
              })
            )}
          </div>
        </main>

        {/* 📢 우측 사이드바 - PC 전용 */}
        <aside className="hidden lg:block w-[300px] flex-shrink-0 p-4">
          <div className="sticky top-4 space-y-4">
            {/* 상단 광고 */}
            <div className="rounded-xl overflow-hidden bg-[#1a1a1a]">
              <div className="text-[10px] text-center py-1 text-gray-600">AD</div>
              <div className="p-2">
                <AdSenseAd slot="sidebar_right_top" format="rectangle" darkMode={true} />
              </div>
            </div>

            {/* 하단 광고 */}
            <div className="rounded-xl overflow-hidden bg-[#1a1a1a]">
              <div className="text-[10px] text-center py-1 text-gray-600">AD</div>
              <div className="p-2">
                <AdSenseAd slot="sidebar_right_bottom" format="rectangle" darkMode={true} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}