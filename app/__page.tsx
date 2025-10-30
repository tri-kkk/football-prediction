'use client'

import { useState, useEffect } from 'react'
import { createChart, ColorType } from 'lightweight-charts'

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

// 날짜 포맷
function formatDate(dateString: string): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const matchDate = new Date(dateString.replace(/\. /g, '-').replace('.', ''))
  
  if (matchDate.toDateString() === today.toDateString()) {
    return '오늘'
  } else if (matchDate.toDateString() === tomorrow.toDateString()) {
    return '내일'
  } else {
    return dateString.replace(/\. /g, '/').replace(/\.$/, '')
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
  const [darkMode, setDarkMode] = useState(false)
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')

  // 다크모드 토글
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // 실제 API에서 경기 데이터 가져오기
  useEffect(() => {
    async function fetchMatches() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(
          `/api/matches?type=scheduled&league=${selectedLeague}`
        )
        
        if (!response.ok) {
          throw new Error('경기 데이터를 불러올 수 없습니다')
        }
        
        const data = await response.json()
        
        const filteredMatches = data.filter(
          (match: Match) => match.status === 'SCHEDULED' || match.status === 'TIMED'
        )
        
        setMatches(filteredMatches)
      } catch (err) {
        console.error('경기 데이터 로드 실패:', err)
        setError('경기 데이터를 불러오는데 실패했습니다')
        setMatches([])
      } finally {
        setLoading(false)
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
        vertLines: { color: darkMode ? '#334155' : '#e2e8f0' },
        horzLines: { color: darkMode ? '#334155' : '#e2e8f0' },
      },
      crosshair: { mode: 1 },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })

    const homeSeries = chart.addLineSeries({ color: '#3b82f6', lineWidth: 2 })
    const drawSeries = chart.addLineSeries({ color: '#6b7280', lineWidth: 2 })
    const awaySeries = chart.addLineSeries({ color: '#ef4444', lineWidth: 2 })

    const chartData = currentTrend.map(d => ({
      time: Math.floor(new Date(d.timestamp).getTime() / 1000),
      home: d.homeWinProbability,
      draw: d.drawProbability,
      away: d.awayWinProbability,
    }))

    homeSeries.setData(chartData.map(d => ({ time: d.time, value: d.home })))
    drawSeries.setData(chartData.map(d => ({ time: d.time, value: d.draw })))
    awaySeries.setData(chartData.map(d => ({ time: d.time, value: d.away })))

    const handleResize = () => {
      chart.applyOptions({ width: chartContainer.clientWidth })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [expandedMatchId, trendData, darkMode])

  return (
    <div className={darkMode ? 'bg-slate-900 min-h-screen' : 'bg-gray-50 min-h-screen'}>
      {/* 헤더 */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 로고 */}
            <div className="flex items-center gap-3">
              <div className="text-2xl">⚽</div>
              <div>
                <h1 className="text-white text-xl font-black tracking-tight">
                  FOOTBALL PREDICT
                </h1>
              </div>
            </div>

            {/* 우측 버튼들 */}
            <div className="flex items-center gap-3">
              {/* 다크모드 토글 */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                {darkMode ? '🌞' : '🌙'}
              </button>

              {/* 언어 전환 */}
              <button
                onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
                className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white text-sm font-medium"
              >
                {language === 'ko' ? '🇰🇷 KO' : '🇺🇸 EN'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 승률 배너 (가로 스크롤 - 카드 형태) */}
      <div className={`py-4 border-b ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 px-4 min-w-max">
            {matches.slice(0, 10).map((match) => {
              // 트렌드 데이터가 있으면 최신 승률 사용, 없으면 기본 승률 사용
              const currentTrend = trendData[match.id]
              const latestTrend = currentTrend && currentTrend.length > 0 
                ? currentTrend[currentTrend.length - 1] 
                : null
              
              const homeWin = latestTrend 
                ? Math.round(latestTrend.homeWinProbability)
                : match.homeWinRate
              const awayWin = latestTrend 
                ? Math.round(latestTrend.awayWinProbability)
                : match.awayWinRate
              
              // 승률이 높은 팀 결정
              const isHomeWinning = homeWin > awayWin
              const winningTeam = isHomeWinning ? match.homeTeam : match.awayTeam
              const winningCrest = isHomeWinning ? match.homeCrest : match.awayCrest
              const winProbability = isHomeWinning ? homeWin : awayWin
              
              return (
                <div
                  key={match.id}
                  onClick={() => handleMatchClick(match)}
                  className={`flex flex-col p-3 rounded-lg min-w-[160px] cursor-pointer transition-all hover:shadow-lg ${
                    darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'
                  } ${expandedMatchId === match.id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  {/* 팀 정보 */}
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
                  
                  {/* 승률 */}
                  <div className={`text-2xl font-black mb-1 ${
                    winProbability > 50 ? 'text-green-500' : 'text-blue-500'
                  }`}>
                    {winProbability}%
                  </div>
                  <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Win Probability
                  </div>
                  
                  {/* 경기 정보 */}
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

      {/* 공백 */}
      <div className="h-12"></div>

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
            <div className="text-6xl mb-4">⚽</div>
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
            {matches.map((match) => (
              <div key={match.id}>
                {/* 경기 카드 */}
                <div
                  onClick={() => handleMatchClick(match)}
                  className={`p-6 rounded-2xl cursor-pointer transition-all hover:shadow-2xl ${
                    darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-50'
                  } ${expandedMatchId === match.id ? 'ring-2 ring-blue-500' : ''}`}
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

                  {/* 승률 */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">홈</div>
                      <div className="text-2xl font-black text-blue-500">{match.homeWinRate}%</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">무승부</div>
                      <div className={`text-2xl font-black ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                        {match.drawRate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">원정</div>
                      <div className="text-2xl font-black text-red-500">{match.awayWinRate}%</div>
                    </div>
                  </div>
                </div>

                {/* 확장된 트렌드 차트 */}
                {expandedMatchId === match.id && trendData[match.id] && (
                  <div className={`mt-4 p-6 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
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
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              keyword.sentiment === 'positive'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : keyword.sentiment === 'negative'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}
                          >
                            {keyword.keyword} ({keyword.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
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
      `}</style>
    </div>
  )
}
