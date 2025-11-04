'use client'
import NewsKeywords from './components/NewsKeywords'
import { useState, useEffect, useRef } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import { getTeamLogo, TEAM_NAME_KR } from './teamLogos'

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
    'PL': 'https://logoapi.dev/epl/512.png',
    'PD': 'https://logoapi.dev/laliga/512.png',
    'BL1': 'https://logoapi.dev/bundesliga/512.png',
    'SA': 'https://logoapi.dev/seriea/512.png',
    'FL1': 'https://logoapi.dev/ligue1/512.png',
    'CL': 'https://logoapi.dev/ucl/512.png',
  }
  return leagueMap[league] || ''
}

// 리그 국기 이미지 가져오기 (필터와 동일)
function getLeagueFlag(leagueCode: string): { url: string; isEmoji: boolean } {
  const flagMap: Record<string, { url: string; isEmoji: boolean }> = {
    'PL': { url: 'https://flagcdn.com/w40/gb-eng.png', isEmoji: false },
    'PD': { url: 'https://flagcdn.com/w40/es.png', isEmoji: false },
    'BL1': { url: 'https://flagcdn.com/w40/de.png', isEmoji: false },
    'SA': { url: 'https://flagcdn.com/w40/it.png', isEmoji: false },
    'FL1': { url: 'https://flagcdn.com/w40/fr.png', isEmoji: false },
    'CL': { url: '⭐', isEmoji: true },
  }
  return flagMap[leagueCode] || { url: '🌍', isEmoji: true }
}

// 리그 코드를 한글 이름으로 변환
function getLeagueName(leagueCode: string): string {
  const leagueNames: Record<string, string> = {
    'PL': '프리미어리그',
    'PD': '라리가',
    'BL1': '분데스리가',
    'SA': '세리에A',
    'FL1': '리그1',
    'CL': '챔피언스리그',
  }
  return leagueNames[leagueCode] || leagueCode
}

// Match 인터페이스
interface Match {
  id: number
  league: string
  leagueCode: string
  leagueLogo: string
  date: string
  time: string
  homeTeam: string      // 영문 팀명 (API에서 받은 원본)
  awayTeam: string      // 영문 팀명 (API에서 받은 원본)
  homeTeamKR: string    // 한글 팀명 (화면 표시용)
  awayTeamKR: string    // 한글 팀명 (화면 표시용)
  homeCrest: string
  awayCrest: string
  homeScore: number | null
  awayScore: number | null
  status: string
  utcDate: string       // 원본 UTC 날짜
  homeWinRate: number
  drawRate: number
  awayWinRate: number
  oddsSource: 'live' | 'historical'
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

// 팀명을 한글로 번역하는 함수
function translateTeamName(englishName: string): string {
  // TEAM_NAME_KR에서 한글명 찾기
  if (TEAM_NAME_KR[englishName]) {
    return TEAM_NAME_KR[englishName]
  }
  
  // 대소문자 무시하고 찾기
  const normalized = englishName.toLowerCase()
  for (const [key, value] of Object.entries(TEAM_NAME_KR)) {
    if (key.toLowerCase() === normalized) {
      return value
    }
  }
  
  // 부분 매칭 시도
  for (const [key, value] of Object.entries(TEAM_NAME_KR)) {
    if (key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase())) {
      return value
    }
  }
  
  // 번역 실패 시 원본 반환 (영문 그대로)
  return englishName
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
  const [darkMode, setDarkMode] = useState(true)
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

  // 자동 스크롤 효과 + 터치/마우스 드래그 지원
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || matches.length === 0) return

    let scrollPosition = 0
    const scrollSpeed = 0.5
    let intervalId: NodeJS.Timeout | null = null
    let isScrolling = true
    let isDragging = false
    let startX = 0
    let scrollLeft = 0
    let resumeTimer: NodeJS.Timeout | null = null

    const startScrolling = () => {
      intervalId = setInterval(() => {
        if (!isScrolling || isDragging) return
        
        scrollPosition += scrollSpeed
        if (container) {
          container.scrollLeft = scrollPosition
          
          const maxScroll = container.scrollWidth / 2
          if (scrollPosition >= maxScroll) {
            scrollPosition = 0
            container.scrollLeft = 0
          }
        }
      }, 20)
    }

    const stopScrolling = () => {
      isScrolling = false
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const resumeScrollAfterDelay = () => {
      if (resumeTimer) clearTimeout(resumeTimer)
      resumeTimer = setTimeout(() => {
        scrollPosition = container.scrollLeft
        isScrolling = true
        startScrolling()
      }, 2000)
    }

    // 터치 이벤트
    const handleTouchStart = (e: TouchEvent) => {
      isDragging = true
      stopScrolling()
      startX = e.touches[0].pageX - container.offsetLeft
      scrollLeft = container.scrollLeft
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return
      e.preventDefault()
      const x = e.touches[0].pageX - container.offsetLeft
      const walk = (x - startX) * 2
      container.scrollLeft = scrollLeft - walk
    }

    const handleTouchEnd = () => {
      isDragging = false
      resumeScrollAfterDelay()
    }

    // 마우스 드래그
    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true
      stopScrolling()
      startX = e.pageX - container.offsetLeft
      scrollLeft = container.scrollLeft
      container.style.cursor = 'grabbing'
      container.style.userSelect = 'none'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      e.preventDefault()
      const x = e.pageX - container.offsetLeft
      const walk = (x - startX) * 2
      container.scrollLeft = scrollLeft - walk
    }

    const handleMouseUp = () => {
      if (!isDragging) return
      isDragging = false
      container.style.cursor = 'grab'
      container.style.userSelect = ''
      resumeScrollAfterDelay()
    }

    const handleMouseLeave = () => {
      if (isDragging) {
        isDragging = false
        container.style.cursor = 'grab'
        container.style.userSelect = ''
        resumeScrollAfterDelay()
      }
    }

    // 커서 스타일
    container.style.cursor = 'grab'

    // 이벤트 리스너 등록
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('mouseleave', handleMouseLeave)

    startScrolling()

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (resumeTimer) clearTimeout(resumeTimer)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('mouseleave', handleMouseLeave)
      container.style.cursor = ''
      container.style.userSelect = ''
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
            fetch(`/api/odds-from-db?league=${league}`)
              .then(r => r.json())
              .then(result => ({
                league,  // 리그 코드 추가로 전달
                data: result.success ? result.data : []
              }))
          )
          const results = await Promise.all(promises)
          
          // 모든 결과 합치기 - 리그 코드 명시적으로 추가
          allMatches = results.flatMap(result => 
            result.data.map((match: any) => ({
              ...match,
              league: match.league || result.league  // API에서 누락 시 URL 파라미터 사용
            }))
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
          
          // 리그 코드 명시적으로 추가
          allMatches = (result.data || []).map((match: any) => ({
            ...match,
            league: match.league || selectedLeague  // API에서 누락 시 선택된 리그 사용
          }))
        }
        
        console.log('🔍 DB에서 가져온 오즈:', allMatches.length)
        
        // DB 데이터를 Match 형식으로 변환
        const convertedMatches = allMatches.map((odds: any) => {
          const homeTeamEng = odds.home_team || 'Unknown'
          const awayTeamEng = odds.away_team || 'Unknown'
          const leagueCode = odds.league || odds.league_code || 'XX'
          
          // 디버깅: 리그 코드 확인
          if (leagueCode === 'XX') {
            console.warn('⚠️ 리그 코드 누락:', odds)
          }
          
          // 영문 팀명 → 한글 팀명 번역
          const homeTeamKR = translateTeamName(homeTeamEng)
          const awayTeamKR = translateTeamName(awayTeamEng)
          
          return {
            id: odds.match_id || Math.random(),
            league: getLeagueName(leagueCode),  // 리그 코드를 한글 이름으로 변환
            leagueCode: leagueCode,
            leagueLogo: getLeagueLogo(leagueCode),
            date: formatDate(odds.commence_time),
            time: formatTime(odds.commence_time),
            homeTeam: homeTeamEng,           // 영문 원본 (API 데이터)
            awayTeam: awayTeamEng,           // 영문 원본 (API 데이터)
            homeTeamKR: homeTeamKR,          // 한글 번역 (화면 표시용)
            awayTeamKR: awayTeamKR,          // 한글 번역 (화면 표시용)
            homeCrest: getTeamLogo(homeTeamKR),  // 한글명으로 로고 매칭
            awayCrest: getTeamLogo(awayTeamKR),  // 한글명으로 로고 매칭
            homeScore: null,
            awayScore: null,
            status: 'SCHEDULED',
            utcDate: odds.commence_time,
            homeWinRate: odds.home_probability || 0,
            drawRate: odds.draw_probability || 0,
            awayWinRate: odds.away_probability || 0,
            oddsSource: 'live' as const
          }
        })
        
        // 현재 시간 기준으로 미래 경기만 필터링
        const now = new Date()
        const futureMatches = convertedMatches.filter((match: any) => {
          const matchDate = new Date(match.utcDate)
          return matchDate > now  // 현재 시간보다 이후 경기만
        })
        
        // 날짜순 정렬 (가까운 경기부터)
        futureMatches.sort((a, b) => {
          return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
        })
        
        console.log('✅ 전체 경기:', convertedMatches.length)
        console.log('📅 예정된 경기:', futureMatches.length)
        console.log('🗑️ 제외된 과거 경기:', convertedMatches.length - futureMatches.length)
        
        // 리그 정보 확인
        if (futureMatches.length > 0) {
          console.log('🏆 첫 번째 경기 리그 정보:', {
            leagueCode: futureMatches[0].leagueCode,
            league: futureMatches[0].league
          })
        }
        
        setMatches(futureMatches)
        
        // 🔥 트렌드 데이터를 병렬로 모두 로드 (초기 화면에 증감 표시하기 위해)
        const trendPromises = futureMatches.map((match: any) => 
          fetchTrendDataSync(match.id, match)
        )
        
        // 모든 트렌드 데이터 로드 완료 대기
        const trendResults = await Promise.all(trendPromises)
        
        // 배치 업데이트: 모든 트렌드 데이터를 한 번에 설정
        const allTrendData: { [key: number]: TrendData[] } = {}
        trendResults.forEach((result, index) => {
          if (result) {
            allTrendData[futureMatches[index].id] = result
          }
        })
        
        setTrendData(allTrendData)
        console.log('✅ 모든 트렌드 데이터 로드 완료:', Object.keys(allTrendData).length, '경기')
        
      } catch (error: any) {
        console.error('❌ 에러:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }
    
    // 트렌드 데이터 로드 (동기 버전 - Promise 반환)
    async function fetchTrendDataSync(matchId: string, match: any): Promise<TrendData[] | null> {
      try {
        const response = await fetch(`/api/match-trend?matchId=${matchId}`)
        const result = await response.json()
        
        if (result.success && result.data.length > 0) {
          console.log(`📈 Loaded trend for match ${matchId}:`, result.data.length, 'points')
          return result.data
        } else {
          // API 응답은 있지만 데이터가 없는 경우
          throw new Error('No trend data available')
        }
      } catch (err) {
  console.warn('⚠️ 트렌드 데이터 로드 실패 (match ${matchId}):', err)
  return [] // 빈 배열 반환 (차트 표시 안 함)
}
    }
    
    // 트렌드 데이터 로드 (기존 함수 - 카드 클릭 시 사용)
    async function fetchTrendData(matchId: string, match?: any) {
      try {
        const response = await fetch(`/api/match-trend?matchId=${matchId}`)
        const result = await response.json()
        
        if (result.success && result.data.length > 0) {
          setTrendData(prev => ({ ...prev, [matchId]: result.data }))
          console.log(`📈 Loaded trend for match ${matchId}:`, result.data.length, 'points')
          return result.data
        } else {
          // API 응답은 있지만 데이터가 없는 경우
          throw new Error('No trend data available')
        }
      } catch (err) {
    console.warn('⚠️ 트렌드 API 호출 실패:', err)
    // 트렌드 데이터 없음을 표시
    setTrendData(prev => ({
      ...prev,
      [matchId]: []
    }))
    return []
  }
}  // ← fetchTrendData 함수 닫기

  fetchMatches()
}, [selectedLeague])

  // 경기 클릭 핸들러
  const handleMatchClick = (match: Match) => {
    if (expandedMatchId === match.id) {
      setExpandedMatchId(null)
    } else {
      setExpandedMatchId(match.id)
      setNewsKeywords(generateNewsKeywords())
                  
      setTimeout(() => {
  const chartContainer = document.getElementById(`trend-chart-${match.id}`)
  const currentTrend = trendData[match.id]
  
  // 트렌드 데이터가 있을 때만 차트 렌더링
  if (chartContainer && currentTrend && currentTrend.length > 0) {
    renderChart(chartContainer, currentTrend)
  }
}, 100)
    }
  }

  // 차트 렌더링 함수
  function renderChart(container: HTMLElement, trend: TrendData[]) {
    container.innerHTML = ''

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: darkMode ? '#000000' : '#ffffff' },
        textColor: darkMode ? '#ffffff' : '#000000',
      },
      grid: {
        vertLines: { color: darkMode ? '#1f1f1f' : '#f3f4f6' },
        horzLines: { color: darkMode ? '#1f1f1f' : '#f3f4f6' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: darkMode ? '#1f1f1f' : '#e5e7eb',
      },
      rightPriceScale: {
        borderColor: darkMode ? '#1f1f1f' : '#e5e7eb',
      },
    })

    const homeSeries = chart.addAreaSeries({
      topColor: 'rgba(59, 130, 246, 0.3)',
      bottomColor: 'rgba(59, 130, 246, 0.05)',
      lineColor: '#3b82f6',
      lineWidth: 3,
    })

    const drawSeries = chart.addLineSeries({
      color: '#9ca3af',
      lineWidth: 2,
      lineStyle: 2,
    })

    const awaySeries = chart.addAreaSeries({
      topColor: 'rgba(239, 68, 68, 0.3)',
      bottomColor: 'rgba(239, 68, 68, 0.05)',
      lineColor: '#ef4444',
      lineWidth: 3,
    })

    const homeData = trend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.homeWinProbability,
    }))

    const drawData = trend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.drawProbability,
    }))

    const awayData = trend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.awayWinProbability,
    }))

    homeSeries.setData(homeData)
    drawSeries.setData(drawData)
    awaySeries.setData(awayData)

    chart.timeScale().fitContent()
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-white'}`}>
      {/* 헤더 */}
      <header className={`sticky top-0 z-50 ${
        darkMode ? 'bg-black border-b border-gray-800' : 'bg-white border-b border-gray-200'
      } shadow-lg`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
<div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
  <img 
    src="/logo.svg" 
    alt="Trend Soccer" 
    className="h-14 w-auto"
  />
</div>
            

          </div>
        </div>
      </header>

      {/* 승률 배너 (자동 스크롤) */}
      <div className={`${darkMode ? 'bg-black border-b border-gray-900' : 'bg-white border-b border-gray-100'}`}>
        <div className="py-4 overflow-hidden">
          <div 
            ref={scrollContainerRef}
            className="flex gap-4 px-4 overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'auto' }}
          >
            {[...matches.slice(0, 10), ...matches.slice(0, 10)].map((match, index) => {
              const currentTrend = trendData[match.id]
              const latestTrend = currentTrend?.[currentTrend.length - 1]
              
              const homeWin = latestTrend 
                ? Math.round(latestTrend.homeWinProbability)
                : match.homeWinRate
              const awayWin = latestTrend 
                ? Math.round(latestTrend.awayWinProbability)
                : match.awayWinRate
              
              const homeTeam = match.homeTeamKR.length > 15 
                ? match.homeTeamKR.substring(0, 15) + '...' 
                : match.homeTeamKR
              const awayTeam = match.awayTeamKR.length > 15 
                ? match.awayTeamKR.substring(0, 15) + '...' 
                : match.awayTeamKR
              
              const isHomeWinning = homeWin > awayWin
              const winningTeam = isHomeWinning ? homeTeam : awayTeam
              const winningCrest = isHomeWinning ? match.homeCrest : match.awayCrest
              const winProbability = isHomeWinning ? homeWin : awayWin
              
              return (
                <div
                  key={`${match.id}-${index}`}
                  onClick={() => {
                    // 경기 카드로 스크롤
                    const element = document.getElementById(`match-card-${match.id}`)
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                    // 경기 확장
                    handleMatchClick(match)
                  }}
                  className={`flex flex-col p-3 rounded-lg min-w-[160px] cursor-pointer transition-all ${
                    darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-gray-50 border border-gray-200'
                  } ${expandedMatchId === match.id ? 'ring-2 ring-white' : 'hover:scale-105'}`}
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
                        {winningTeam}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {isHomeWinning ? 'Home' : 'Away'}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`text-2xl font-black mb-1 ${
                    darkMode ? 'text-white' : 'text-black'
                  }`}>
                    {winProbability}%
                  </div>
                  <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Win Probability
                  </div>
                  
                  <div className={`text-xs font-medium mt-2 pt-2 border-t ${
                    darkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-600'
                  }`}>
                    {match.homeTeamKR} - {match.awayTeamKR}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    {match.time}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 트렌드 컨텐츠 영역 */}
      <div className="container mx-auto px-4 py-8">
        {/* 리그 필터 */}
        <div className={`mb-6 p-3 rounded-2xl ${
          darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex flex-wrap gap-2">
            {LEAGUES.map((league) => (
              <button
                key={league.code}
                onClick={() => setSelectedLeague(league.code)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  selectedLeague === league.code
                    ? darkMode 
                      ? 'bg-white text-black shadow-lg transform scale-105'
                      : 'bg-black text-white shadow-lg transform scale-105'
                    : darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {/* 모바일: 약자만, 데스크탑: 국기 + 이름 */}
                <span className="sm:hidden font-bold">{league.code}</span>
                <span className="hidden sm:flex items-center gap-2">
                  {league.isEmoji ? (
                    <span className="text-base">{league.flag}</span>
                  ) : (
                    <img 
                      src={league.flag} 
                      alt={league.name}
                      className="w-4 h-3 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  <span>{league.name}</span>
                </span>
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
          <div className={`p-6 rounded-2xl text-center ${darkMode ? 'bg-gray-900 text-gray-300 border border-gray-800' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
            <p className="text-lg font-medium">{error}</p>
          </div>
        )}

        {/* 경기 목록 - 데스크탑: 1열, 모바일: 2열 */}
        {!loading && !error && (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-1">
            {matches.map((match) => {
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
                <div key={match.id} id={`match-card-${match.id}`}>
                  {/* 경기 카드 - 가로 배치 */}
                  <div
                    onClick={() => handleMatchClick(match)}
                    className={`rounded-2xl transition-all cursor-pointer ${
                      darkMode 
                        ? 'bg-gray-900 border border-gray-800' 
                        : 'bg-white border border-gray-200'
                    } ${expandedMatchId === match.id ? 'ring-2 ring-white scale-105' : 'hover:shadow-xl'}`}
                  >
                    {/* 상단: 리그 정보 + 날짜/시간 - 한 줄 중앙 배치 */}
                    <div className={`flex items-center justify-center gap-3 px-4 pt-4 pb-3 border-b ${
                      darkMode ? 'border-gray-800' : 'border-gray-200'
                    }`}>
                      {/* 리그 국기 이미지 */}
                      {(() => {
                        const flag = getLeagueFlag(match.leagueCode)
                        if (flag.isEmoji) {
                          return <span className="text-xl">{flag.url}</span>
                        } else {
                          return (
                            <img 
                              src={flag.url} 
                              alt={match.league}
                              className="w-6 h-6 object-contain"
                            />
                          )
                        }
                      })()}
                      
                      {/* 리그명 */}
                      <span className={`text-base font-bold ${
                        darkMode ? 'text-white' : 'text-black'
                      }`}>
                        {match.league}
                      </span>
                      
                      {/* 구분선 */}
                      <span className={`text-base ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>|</span>
                      
                      {/* 날짜 */}
                      <span className={`text-sm font-semibold ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {formatDate(match.utcDate)}
                      </span>
                      
                      {/* 구분선 */}
                      <span className={`text-base ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>|</span>
                      
                      {/* 시간 */}
                      <span className={`text-lg font-bold ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {match.time}
                      </span>
                    </div>

                    {/* 메인 콘텐츠 영역 */}
                    <div className="p-4">
                      {/* 팀 대결 - 중앙 집중 */}
                      <div className="flex items-center justify-center gap-3 mb-6">
                        {/* 홈팀 */}
                        <div className="flex items-center gap-2">
                          <img src={match.homeCrest} alt={match.homeTeamKR} className="w-12 h-12" />
                          <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {match.homeTeamKR}
                          </span>
                        </div>
                        
                        {/* VS 배지 */}
                        <div className={`px-3 py-1 rounded-lg text-xs font-black ${
                          darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
                        }`}>
                          VS
                        </div>
                        
                        {/* 원정팀 */}
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {match.awayTeamKR}
                          </span>
                          <img src={match.awayCrest} alt={match.awayTeamKR} className="w-12 h-12" />
                        </div>
                      </div>

                      {/* 승률 표시 - 프로그레스 바 포함 */}
                      <div className="grid grid-cols-3 gap-3">
                        {/* 홈팀 승률 */}
                        <div className={`relative overflow-hidden rounded-xl p-3 ${
                          darkMode ? 'bg-gray-800' : 'bg-gray-100'
                        }`}>
                          {/* 프로그레스 바 */}
                          <div 
                            className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ${
                              darkMode ? 'bg-white' : 'bg-black'
                            }`}
                            style={{ 
                              width: `${latestTrend ? latestTrend.homeWinProbability : match.homeWinRate}%` 
                            }}
                          ></div>
                          
                          <div className="relative z-10 flex flex-col items-center">
                            <div className={`text-sm font-medium mb-2 ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              홈
                            </div>
                            <div className={`text-3xl font-black transition-all duration-500 ${
                              darkMode ? 'text-white' : 'text-black'
                            } ${homeChange > 0 ? 'animate-pulse' : ''}`}>
                              {latestTrend ? Math.round(latestTrend.homeWinProbability) : match.homeWinRate}%
                            </div>
                            <div className="h-5 mt-2">
                              {homeChange !== 0 && (
                                <div className={`text-xs font-bold ${
                                  homeChange > 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  {homeChange > 0 ? '↑' : '↓'} {Math.abs(homeChange).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 무승부 */}
                        <div className={`relative overflow-hidden rounded-xl p-3 ${
                          darkMode ? 'bg-gray-800' : 'bg-gray-100'
                        }`}>
                          {/* 프로그레스 바 */}
                          <div 
                            className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ${
                              darkMode ? 'bg-gray-600' : 'bg-gray-400'
                            }`}
                            style={{ 
                              width: `${latestTrend ? latestTrend.drawProbability : match.drawRate}%` 
                            }}
                          ></div>
                          
                          <div className="relative z-10 flex flex-col items-center">
                            <div className={`text-sm font-medium mb-2 ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              무승부
                            </div>
                            <div className={`text-3xl font-black ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {latestTrend ? Math.round(latestTrend.drawProbability) : match.drawRate}%
                            </div>
                            <div className="h-5 mt-2"></div>
                          </div>
                        </div>

                        {/* 원정팀 승률 */}
                        <div className={`relative overflow-hidden rounded-xl p-3 ${
                          darkMode ? 'bg-gray-800' : 'bg-gray-100'
                        }`}>
                          {/* 프로그레스 바 */}
                          <div 
                            className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ${
                              darkMode ? 'bg-white' : 'bg-black'
                            }`}
                            style={{ 
                              width: `${latestTrend ? latestTrend.awayWinProbability : match.awayWinRate}%` 
                            }}
                          ></div>
                          
                          <div className="relative z-10 flex flex-col items-center">
                            <div className={`text-sm font-medium mb-2 ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              원정
                            </div>
                            <div className={`text-3xl font-black transition-all duration-500 ${
                              darkMode ? 'text-white' : 'text-black'
                            } ${awayChange > 0 ? 'animate-pulse' : ''}`}>
                              {latestTrend ? Math.round(latestTrend.awayWinProbability) : match.awayWinRate}%
                            </div>
                            <div className="h-5 mt-2">
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
                    </div>
                  </div>
<div className={`mt-3 pt-3 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
  <NewsKeywords
    homeTeam={match.homeTeam}
    awayTeam={match.awayTeam}
    matchId={match.id}
  />
</div>
                  {/* 확장된 트렌드 차트 */}
                  {expandedMatchId === match.id && (
                    <div className={`mt-4 p-6 rounded-2xl animate-fadeIn ${
                      darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
                    }`}>
                      <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        📈 24시간 트렌드
                      </h3>
                      <div id={`trend-chart-${match.id}`} className="mb-4"></div>


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
 <footer className={`mt-12 py-6 border-t ${darkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'}`}>
        <div className="container mx-auto px-4 text-center">
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            © 2025 tri-k. All rights reserved.
          </p>
        </div>
      </footer>
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