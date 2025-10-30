'use client'

import { useState, useEffect, useRef } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import { getTeamLogo } from './teamLogos'

// 리그 정보 (국기 이미지 포함)
const LEAGUES = [
  { 
    code: 'ALL', 
    name: '전체', 
    flag: '🌍',
    isEmoji: true
  },
  { 
    code: 'PL', 
    name: '프리미어리그', 
    flag: 'https://flagcdn.com/w40/gb-eng.png',
    isEmoji: false
  },
  { 
    code: 'PD', 
    name: '라리가', 
    flag: 'https://flagcdn.com/w40/es.png',
    isEmoji: false
  },
  { 
    code: 'BL1', 
    name: '분데스리가', 
    flag: 'https://flagcdn.com/w40/de.png',
    isEmoji: false
  },
  { 
    code: 'SA', 
    name: '세리에A', 
    flag: 'https://flagcdn.com/w40/it.png',
    isEmoji: false
  },
  { 
    code: 'FL1', 
    name: '리그1', 
    flag: 'https://flagcdn.com/w40/fr.png',
    isEmoji: false
  },
  { 
    code: 'CL', 
    name: '챔피언스리그', 
    flag: '⭐',
    isEmoji: true
  },
]

// 헬퍼 함수들
function getLeagueLogo(league: string): string {
  const leagueMap: Record<string, string> = {
    'PL': 'https://crests.football-data.org/PL.png',
    'PD': 'https://crests.football-data.org/PD.png',
    'BL1': 'https://crests.football-data.org/BL1.png',
    'SA': 'https://crests.football-data.org/SA.png',
    'FL1': 'https://crests.football-data.org/FL1.png',
    'CL': 'https://crests.football-data.org/CL.png',
  }
  return leagueMap[league] || ''
}

// Match 인터페이스
interface Match {
  id: number
  league: string
  leagueCode: string
  leagueLogo: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  homeCrest: string
  awayCrest: string
  homeScore: number | null
  awayScore: number | null
  status: string
  homeWinRate: number
  drawRate: number
  awayWinRate: number
}

// 트렌드 데이터 인터페이스
interface TrendData {
  timestamp: string
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
}

// 뉴스 키워드 인터페이스
interface NewsKeyword {
  keyword: string
  count: number
  sentiment: 'positive' | 'negative' | 'neutral'
}

// 24시간 트렌드 데이터 생성
function generate24HourTrend(currentHomeRate: number, currentDrawRate: number, currentAwayRate: number): TrendData[] {
  const data: TrendData[] = []
  const now = new Date()
  
  for (let i = 24; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
    
    const homeVariation = (Math.random() - 0.5) * 10
    const drawVariation = (Math.random() - 0.5) * 10
    const awayVariation = -(homeVariation + drawVariation)
    
    data.push({
      timestamp: timestamp.toISOString(),
      homeWinProbability: Math.max(0, Math.min(100, currentHomeRate + homeVariation)),
      drawProbability: Math.max(0, Math.min(100, currentDrawRate + drawVariation)),
      awayWinProbability: Math.max(0, Math.min(100, currentAwayRate + awayVariation)),
    })
  }
  
  return data
}

// 뉴스 키워드 생성
function generateNewsKeywords(): NewsKeyword[] {
  return [
    { keyword: '부상자 복귀', count: 15, sentiment: 'positive' },
    { keyword: '연승행진', count: 12, sentiment: 'positive' },
    { keyword: '주전 선수 결장', count: 8, sentiment: 'negative' },
    { keyword: '감독 전술 변경', count: 7, sentiment: 'neutral' },
    { keyword: '홈 경기 강세', count: 6, sentiment: 'positive' },
  ]
}

// 시간 포맷 함수
function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('ko-KR', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  })
}

// 날짜 포맷
function formatDate(dateString: string): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // ISO 형식이나 다른 형식 모두 처리
  const matchDate = new Date(dateString)
  
  if (matchDate.toDateString() === today.toDateString()) {
    return '오늘'
  } else if (matchDate.toDateString() === tomorrow.toDateString()) {
    return '내일'
  } else {
    // YYYY/MM/DD 형식으로 변환
    const year = matchDate.getFullYear()
    const month = String(matchDate.getMonth() + 1).padStart(2, '0')
    const day = String(matchDate.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }
}

export default function Home() {
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null)
  const [trendData, setTrendData] = useState<{ [key: number]: TrendData[] }>({})
  const [newsKeywords, setNewsKeywords] = useState<NewsKeyword[]>([])
  const [darkMode, setDarkMode] = useState(true) // 기본값을 true로 변경
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 다크모드 토글
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // 자동 스크롤 효과
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || matches.length === 0) return

    let scrollPosition = 0
    const scrollSpeed = 0.5 // 픽셀/프레임
    let intervalId: NodeJS.Timeout | null = null
    let isScrolling = true

    const scroll = () => {
      if (!isScrolling) return
      
      scrollPosition += scrollSpeed
      
      // 스크롤이 끝에 도달하면 처음으로
      if (scrollPosition >= container.scrollWidth / 2) {
        scrollPosition = 0
      }
      
      container.scrollLeft = scrollPosition
    }

    const startScroll = () => {
      if (intervalId) clearInterval(intervalId)
      isScrolling = true
      intervalId = setInterval(scroll, 16) // 60fps
    }

    const stopScroll = () => {
      isScrolling = false
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    // 마우스 이벤트 핸들러
    const handleMouseEnter = () => {
      stopScroll()
    }

    const handleMouseLeave = () => {
      startScroll()
    }

    // 클릭 시 정지
    const handleClick = () => {
      stopScroll()
    }

    // 이벤트 리스너 등록
    container.addEventListener('mouseenter', handleMouseEnter)
    container.addEventListener('mouseleave', handleMouseLeave)
    container.addEventListener('click', handleClick)
    
    // 초기 스크롤 시작
    startScroll()
    
    return () => {
      stopScroll()
      container.removeEventListener('mouseenter', handleMouseEnter)
      container.removeEventListener('mouseleave', handleMouseLeave)
      container.removeEventListener('click', handleClick)
    }
  }, [matches])

  // Supabase에서 실제 오즈 데이터 직접 가져오기
  useEffect(() => {
    async function fetchMatches() {
      setLoading(true)
      setError(null)
      
      try {
        // DB에서 실제 오즈만 가져오기
        let allMatches = []
        
        if (selectedLeague === 'ALL') {
          // 모든 리그의 오즈 가져오기
          const leagues = ['PL', 'PD', 'BL1', 'SA', 'FL1']
          const promises = leagues.map(league => 
            fetch(`/api/odds-from-db?league=${league}`).then(r => r.json())
          )
          const results = await Promise.all(promises)
          
          // 모든 결과 합치기
          allMatches = results.flatMap(result => 
            result.success ? result.data : []
          )
        } else {
          // 단일 리그 오즈 가져오기
          const response = await fetch(
            `/api/odds-from-db?league=${selectedLeague}`
          )
          
          if (!response.ok) {
            throw new Error('오즈 데이터를 불러올 수 없습니다')
          }
          
          const result = await response.json()
          
          if (!result.success) {
            throw new Error(result.error || '데이터 로드 실패')
          }
          
          allMatches = result.data || []
        }
        
        console.log('🔍 DB에서 가져온 오즈:', allMatches.length)
        
        // DB 데이터를 Match 형식으로 변환
        const convertedMatches = allMatches.map((odds: any) => ({
          id: odds.match_id || Math.random(),
          league: odds.league || 'Unknown',
          leagueCode: odds.league || 'XX',
          leagueLogo: getLeagueLogo(odds.league),
          date: formatDate(odds.commence_time),
          time: formatTime(odds.commence_time),
          homeTeam: odds.home_team || 'Unknown',
          awayTeam: odds.away_team || 'Unknown',
          homeCrest: getTeamLogo(odds.home_team),
          awayCrest: getTeamLogo(odds.away_team),
          homeScore: null,
          awayScore: null,
          status: 'SCHEDULED',
          utcDate: odds.commence_time,
          homeWinRate: odds.home_probability || 0,
          drawRate: odds.draw_probability || 0,
          awayWinRate: odds.away_probability || 0,
          oddsSource: 'live' as const
        }))
        
        // 날짜순 정렬
        convertedMatches.sort((a, b) => {
          return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
        })
        
        console.log('✅ 변환된 경기:', convertedMatches.length)
        console.log('📊 모든 경기가 Live odds!')
        
        setMatches(convertedMatches)
        
        // 트렌드 데이터 로드 (각 경기마다)
        convertedMatches.forEach((match: any) => {
          fetchTrendData(match.id)
        })
        
      } catch (err) {
        console.error('경기 데이터 로드 실패:', err)
        setError('경기 데이터를 불러오는데 실패했습니다')
        setMatches([])
      } finally {
        setLoading(false)
      }
    }
    
    // 트렌드 데이터 로드 (24시간)
    async function fetchTrendData(matchId: string) {
      try {
        const response = await fetch(`/api/match-trend?matchId=${matchId}`)
        const result = await response.json()
        
        if (result.success && result.data.length > 0) {
          setTrendData(prev => ({ ...prev, [matchId]: result.data }))
          console.log(`📈 Loaded trend for match ${matchId}:`, result.data.length, 'points')
        }
      } catch (err) {
        console.error('트렌드 데이터 로드 실패:', err)
      }
    }
    
    fetchMatches()
  }, [selectedLeague])

  // 경기 클릭 핸들러
  const handleMatchClick = (match: Match) => {
    if (expandedMatchId === match.id) {
      setExpandedMatchId(null)
      return
    }

    setExpandedMatchId(match.id)
    
    if (!trendData[match.id]) {
      const trend = generate24HourTrend(
        match.homeWinRate,
        match.drawRate,
        match.awayWinRate
      )
      setTrendData(prev => ({ ...prev, [match.id]: trend }))
    }
    
    setNewsKeywords(generateNewsKeywords())
  }

  // 차트 렌더링
  useEffect(() => {
    if (!expandedMatchId) return

    const chartContainer = document.getElementById(`trend-chart-${expandedMatchId}`)
    if (!chartContainer) return

    const currentTrend = trendData[expandedMatchId]
    if (!currentTrend || currentTrend.length === 0) return

    chartContainer.innerHTML = ''

    const chart = createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: 200,
      layout: {
        background: { type: ColorType.Solid, color: darkMode ? '#1e293b' : '#ffffff' },
        textColor: darkMode ? '#e2e8f0' : '#1e293b',
      },
      grid: {
        vertLines: { color: darkMode ? '#334155' : '#f1f5f9' },
        horzLines: { color: darkMode ? '#334155' : '#f1f5f9' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: darkMode ? '#475569' : '#e2e8f0',
      },
      rightPriceScale: {
        borderColor: darkMode ? '#475569' : '#e2e8f0',
      },
    })

    const homeSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      title: '홈팀',
    })

    const drawSeries = chart.addLineSeries({
      color: '#6b7280',
      lineWidth: 2,
      title: '무승부',
    })

    const awaySeries = chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 2,
      title: '원정팀',
    })

    const homeData = currentTrend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.homeWinProbability,
    }))

    const drawData = currentTrend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.drawProbability,
    }))

    const awayData = currentTrend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.awayWinProbability,
    }))

    homeSeries.setData(homeData)
    drawSeries.setData(drawData)
    awaySeries.setData(awayData)

    chart.timeScale().fitContent()

    return () => {
      chart.remove()
    }
  }, [expandedMatchId, trendData, darkMode])

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* 헤더 */}
      <header className={`sticky top-0 z-50 ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">⚽</span>
              <h1 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                SOCCER TREND
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* 언어 전환 */}
              <button
                onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {language === 'ko' ? '🇰🇷 KO' : '🇺🇸 EN'}
              </button>
              
              {/* 다크모드 토글 */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-all ${
                  darkMode ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {darkMode ? '🌙' : '🌞'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 승률 배너 (자동 스크롤) */}
      <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="py-4 overflow-hidden">
          <div 
            ref={scrollContainerRef}
            className="flex gap-4 px-4 overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'auto' }}
          >
            {/* 배너 카드들 2번 복제 (무한 스크롤 효과) */}
            {[...matches.slice(0, 10), ...matches.slice(0, 10)].map((match, index) => {
              const currentTrend = trendData[match.id]
              const latestTrend = currentTrend?.[currentTrend.length - 1]
              
              const homeWin = latestTrend 
                ? Math.round(latestTrend.homeWinProbability)
                : match.homeWinRate
              const awayWin = latestTrend 
                ? Math.round(latestTrend.awayWinProbability)
                : match.awayWinRate
              
              const homeTeam = match.homeTeam.length > 15 
                ? match.homeTeam.substring(0, 15) + '...' 
                : match.homeTeam
              const awayTeam = match.awayTeam.length > 15 
                ? match.awayTeam.substring(0, 15) + '...' 
                : match.awayTeam
              
              const isHomeWinning = homeWin > awayWin
              const winningTeam = isHomeWinning ? homeTeam : awayTeam
              const winningCrest = isHomeWinning ? match.homeCrest : match.awayCrest
              const winProbability = isHomeWinning ? homeWin : awayWin
              
              return (
                <div
                  key={`${match.id}-${index}`}
                  onClick={() => handleMatchClick(match)}
                  className={`flex flex-col p-3 rounded-lg min-w-[160px] cursor-pointer transition-all hover:shadow-lg ${
                    darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'
                  } ${expandedMatchId === match.id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <img 
                      src={winningCrest} 
                      alt={winningTeam} 
                      className="w-8 h-8"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">⚽</text></svg>'
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {winningTeam.split(' ')[0]}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {isHomeWinning ? 'Home' : 'Away'}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`text-2xl font-black mb-1 ${
                    winProbability > 50 ? 'text-green-500' : 'text-blue-500'
                  }`}>
                    {winProbability}%
                  </div>
                  <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Win Probability
                  </div>
                  
                  <div className={`text-xs font-medium mt-2 pt-2 border-t ${
                    darkMode ? 'border-slate-600 text-slate-400' : 'border-gray-200 text-gray-500'
                  }`}>
                    {match.homeTeam.split(' ')[0]} - {match.awayTeam.split(' ')[0]}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    {match.time}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 광고 배너 영역 */}
      <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="container mx-auto px-4 py-8">
          <div className={`flex items-center justify-center h-32 rounded-2xl border-2 border-dashed ${
            darkMode ? 'border-slate-600 bg-slate-700/50' : 'border-gray-300 bg-gray-50'
          }`}>
            <div className="text-center">
              <div className="text-4xl mb-2">📢</div>
              <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                광고 배너 영역 (728x90 또는 반응형)
              </p>
              <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                PropellerAds / Adsterra
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 트렌드 컨텐츠 영역 */}
      <div className="container mx-auto px-4 py-8">
        {/* 리그 필터 */}
        <div className={`mb-6 p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <div className="flex flex-wrap gap-3">
            {LEAGUES.map((league) => (
              <button
                key={league.code}
                onClick={() => setSelectedLeague(league.code)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedLeague === league.code
                    ? 'bg-blue-600 text-white shadow-lg'
                    : darkMode
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {league.isEmoji ? (
                  <span className="text-lg">{league.flag}</span>
                ) : (
                  <img 
                    src={league.flag} 
                    alt={league.name}
                    className="w-5 h-4 object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
                <span>{league.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">⚽</div>
            <p className={`text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              로딩 중...
            </p>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className={`p-6 rounded-2xl text-center ${darkMode ? 'bg-red-900/20 text-red-200' : 'bg-red-50 text-red-800'}`}>
            <p className="text-lg font-medium">{error}</p>
          </div>
        )}

        {/* 경기 목록 */}
        {!loading && !error && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => {
              // 트렌드 변동 계산
              const currentTrend = trendData[match.id]
              const latestTrend = currentTrend?.[currentTrend.length - 1]
              const previousTrend = currentTrend?.[currentTrend.length - 2]
              
              const homeChange = latestTrend && previousTrend 
                ? latestTrend.homeWinProbability - previousTrend.homeWinProbability
                : 0
              const awayChange = latestTrend && previousTrend 
                ? latestTrend.awayWinProbability - previousTrend.awayWinProbability
                : 0
              
              return (
                <div key={match.id}>
                  {/* 경기 카드 */}
                  <div
                    onClick={() => handleMatchClick(match)}
                    className={`p-6 rounded-2xl cursor-pointer transition-all hover:shadow-2xl transform hover:scale-105 ${
                      darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-50'
                    } ${expandedMatchId === match.id ? 'ring-2 ring-blue-500 scale-105' : ''}`}
                  >
                    {/* 날짜/시간 */}
                    <div className={`text-sm font-medium mb-4 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {formatDate(match.date)} • {match.time}
                    </div>

                    {/* 팀 정보 */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <img src={match.homeCrest} alt={match.homeTeam} className="w-12 h-12" />
                        <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {match.homeTeam}
                        </span>
                      </div>
                      <span className={`text-2xl font-black mx-4 ${darkMode ? 'text-slate-600' : 'text-gray-300'}`}>
                        VS
                      </span>
                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {match.awayTeam}
                        </span>
                        <img src={match.awayCrest} alt={match.awayTeam} className="w-12 h-12" />
                      </div>
                    </div>

                    {/* 승률 (트렌드 애니메이션 포함) - 고정 높이 */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="relative">
                        <div className="text-xs font-medium text-gray-500 mb-1">홈</div>
                        <div className={`text-2xl font-black text-blue-500 transition-all duration-500 ${
                          homeChange > 0 ? 'animate-pulse' : ''
                        }`}>
                          {latestTrend ? Math.round(latestTrend.homeWinProbability) : match.homeWinRate}%
                        </div>
                        {/* 트렌드 변동 표시 - 항상 공간 확보 */}
                        <div className="h-5 mt-1">
                          {homeChange !== 0 && (
                            <div className={`text-xs font-bold ${
                              homeChange > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {homeChange > 0 ? '↑' : '↓'} {Math.abs(homeChange).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">무승부</div>
                        <div className={`text-2xl font-black ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                          {latestTrend ? Math.round(latestTrend.drawProbability) : match.drawRate}%
                        </div>
                        {/* 공간 확보 (높이 맞추기) */}
                        <div className="h-5 mt-1"></div>
                      </div>
                      <div className="relative">
                        <div className="text-xs font-medium text-gray-500 mb-1">원정</div>
                        <div className={`text-2xl font-black text-red-500 transition-all duration-500 ${
                          awayChange > 0 ? 'animate-pulse' : ''
                        }`}>
                          {latestTrend ? Math.round(latestTrend.awayWinProbability) : match.awayWinRate}%
                        </div>
                        {/* 트렌드 변동 표시 - 항상 공간 확보 */}
                        <div className="h-5 mt-1">
                          {awayChange !== 0 && (
                            <div className={`text-xs font-bold ${
                              awayChange > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {awayChange > 0 ? '↑' : '↓'} {Math.abs(awayChange).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 확장된 트렌드 차트 */}
                  {expandedMatchId === match.id && trendData[match.id] && (
                    <div className={`mt-4 p-6 rounded-2xl animate-fadeIn ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                      <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        📈 24시간 트렌드
                      </h3>
                      <div id={`trend-chart-${match.id}`} className="mb-4"></div>

                      {/* 뉴스 키워드 */}
                      <div className="mt-4">
                        <h4 className={`text-sm font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          🔍 주요 이슈
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {newsKeywords.map((keyword, index) => (
                            <span
                              key={index}
                              className={`px-3 py-1 rounded-full text-xs font-medium animate-fadeIn ${
                                keyword.sentiment === 'positive'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : keyword.sentiment === 'negative'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              }`}
                              style={{ animationDelay: `${index * 100}ms` }}
                            >
                              {keyword.keyword} ({keyword.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 경기 없음 */}
        {!loading && !error && matches.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚽</div>
            <p className={`text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              예정된 경기가 없습니다
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
