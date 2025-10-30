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
      homeWinProbability: Math.max(5, Math.min(95, currentHomeRate + homeVariation)),
      drawProbability: Math.max(5, Math.min(95, currentDrawRate + drawVariation)),
      awayWinProbability: Math.max(5, Math.min(95, currentAwayRate + awayVariation))
    })
  }
  
  return data
}

// 더미 뉴스 키워드
function generateNewsKeywords(): NewsKeyword[] {
  return [
    { keyword: '부상자 복귀', count: 12, sentiment: 'positive' },
    { keyword: '전술 변화', count: 8, sentiment: 'neutral' },
    { keyword: '최근 폼', count: 15, sentiment: 'positive' },
    { keyword: '주전 결장', count: 6, sentiment: 'negative' },
    { keyword: '홈 경기', count: 10, sentiment: 'positive' },
    { keyword: '연패 중', count: 5, sentiment: 'negative' },
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

export default function TestTrendPage() {
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null)
  const [trendData, setTrendData] = useState<{ [key: number]: TrendData[] }>({})
  const [newsKeywords, setNewsKeywords] = useState<NewsKeyword[]>([])
  const [darkMode, setDarkMode] = useState(false)

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

  // 통계 계산
  const calculateStats = (data: number[]) => {
    const max = Math.max(...data)
    const min = Math.min(...data)
    const avg = data.reduce((a, b) => a + b, 0) / data.length
    const change = data[data.length - 1] - data[0]
    return { max, min, avg, change }
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* 헤더 */}
      <header className={`sticky top-0 z-50 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">⚽ 매치 트렌드</h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-4 py-2 rounded-lg ${
                darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* 리그 네비게이션 - 국기 + 리그명 */}
      <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {LEAGUES.map((league) => (
              <button
                key={league.code}
                onClick={() => setSelectedLeague(league.code)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap flex items-center gap-2 transition-all ${
                  selectedLeague === league.code
                    ? 'bg-blue-600 text-white'
                    : darkMode
                    ? 'bg-slate-700 hover:bg-slate-600'
                    : 'bg-gray-100 hover:bg-gray-200'
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
                <span className="font-medium">{league.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className={`${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-8 text-center`}>
            <p className="text-gray-500">해당 리그의 예정된 경기가 없습니다</p>
          </div>
        )}

        {!loading && !error && matches.length > 0 && (
          <div className="space-y-4">
            {matches.map((match) => {
              const isExpanded = expandedMatchId === match.id
              const currentTrend = trendData[match.id]
              
              const homeStats = currentTrend 
                ? calculateStats(currentTrend.map(d => d.homeWinProbability))
                : null
              const awayStats = currentTrend
                ? calculateStats(currentTrend.map(d => d.awayWinProbability))
                : null

              return (
                <div key={match.id} className="space-y-0">
                  {/* 경기 카드 */}
                  <div
                    onClick={() => handleMatchClick(match)}
                    className={`${
                      darkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-white hover:bg-gray-50 border-gray-200'
                    } border-2 rounded-2xl p-4 cursor-pointer transition-all ${
                      isExpanded ? 'ring-2 ring-blue-600 rounded-b-none' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={match.leagueLogo}
                          alt={match.league}
                          className="w-5 h-5"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect fill="%23ddd"/></svg>'
                          }}
                        />
                        <span className="text-sm">{formatDate(match.date)} {match.time}</span>
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {match.league}
                        </span>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <img src={match.homeCrest} alt={match.homeTeam} className="w-8 h-8" />
                        <span className="font-bold text-sm">{match.homeTeam}</span>
                      </div>
                      <span className="font-bold mx-4">vs</span>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="font-bold text-sm">{match.awayTeam}</span>
                        <img src={match.awayCrest} alt={match.awayTeam} className="w-8 h-8" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{match.homeWinRate}%</span>
                        <span>{match.drawRate}%</span>
                        <span>{match.awayWinRate}%</span>
                      </div>
                      <div className="flex h-1.5 rounded-full overflow-hidden">
                        <div style={{ width: `${match.homeWinRate}%` }} className="bg-blue-600"></div>
                        <div style={{ width: `${match.drawRate}%` }} className="bg-gray-600"></div>
                        <div style={{ width: `${match.awayWinRate}%` }} className="bg-red-600"></div>
                      </div>
                    </div>
                  </div>

                  {/* 트렌드 차트 (확장 시) */}
                  {isExpanded && (
                    <div className={`${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
                    } border-2 border-t-0 rounded-b-2xl p-6`}>
                      <h3 className="text-lg font-bold mb-4">📊 24시간 매치 모멘텀</h3>
                      
                      {homeStats && awayStats && (
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                              {match.homeTeam}
                            </p>
                            <p className={`text-lg font-bold ${homeStats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {homeStats.change >= 0 ? '▲' : '▼'} {Math.abs(homeStats.change).toFixed(1)}%
                            </p>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} space-y-0.5 mt-1`}>
                              <p>최고: {homeStats.max.toFixed(1)}%</p>
                              <p>평균: {homeStats.avg.toFixed(1)}%</p>
                              <p>최저: {homeStats.min.toFixed(1)}%</p>
                            </div>
                          </div>
                          <div>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                              {match.awayTeam}
                            </p>
                            <p className={`text-lg font-bold ${awayStats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {awayStats.change >= 0 ? '▲' : '▼'} {Math.abs(awayStats.change).toFixed(1)}%
                            </p>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} space-y-0.5 mt-1`}>
                              <p>최고: {awayStats.max.toFixed(1)}%</p>
                              <p>평균: {awayStats.avg.toFixed(1)}%</p>
                              <p>최저: {awayStats.min.toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div id={`trend-chart-${match.id}`} className="w-full mb-4"></div>

                      <div className="mb-4">
                        <h4 className="text-sm font-bold mb-2">📰 경기 관련 주요 키워드 (최근 24시간)</h4>
                        <div className="flex flex-wrap gap-2">
                          {newsKeywords.map((keyword, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-1 rounded-full text-xs ${
                                keyword.sentiment === 'positive'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                  : keyword.sentiment === 'negative'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              }`}
                            >
                              {keyword.keyword} {keyword.count}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className={`${darkMode ? 'bg-slate-700/50' : 'bg-blue-50'} rounded-lg p-3`}>
                        <p className="text-xs">
                          💡 {awayStats && awayStats.change > 0 
                            ? `${match.awayTeam} 쪽으로 모멘텀이 이동하고 있습니다`
                            : homeStats && homeStats.change > 0
                            ? `${match.homeTeam} 쪽으로 모멘텀이 이동하고 있습니다`
                            : '양 팀의 모멘텀이 균형을 이루고 있습니다'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
