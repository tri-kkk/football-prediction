'use client'
import NewsKeywords from './components/NewsKeywords'
import React, { useState, useEffect, useRef } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import { getTeamLogo, TEAM_NAME_KR } from './teamLogos'

// 리그 정보 (국기 이미지 포함)
const LEAGUES = [
  { 
    code: 'ALL', 
    name: '전체', 
    flag: '🌍',
    logo: '🌍',
    isEmoji: true
  },
  { 
    code: 'PL', 
    name: '프리미어리그', 
    flag: 'https://flagcdn.com/w40/gb-eng.png',
    logo: 'https://crests.football-data.org/PL.png',
    isEmoji: false
  },
  { 
    code: 'PD', 
    name: '라리가', 
    flag: 'https://flagcdn.com/w40/es.png',
    logo: 'https://crests.football-data.org/PD.png',
    isEmoji: false
  },
  { 
    code: 'BL1', 
    name: '분데스리가', 
    flag: 'https://flagcdn.com/w40/de.png',
    logo: 'https://crests.football-data.org/BL1.png',
    isEmoji: false
  },
  { 
    code: 'SA', 
    name: '세리에A', 
    flag: 'https://flagcdn.com/w40/it.png',
    logo: 'https://crests.football-data.org/SA.png',
    isEmoji: false
  },
  { 
    code: 'FL1', 
    name: '리그1', 
    flag: 'https://flagcdn.com/w40/fr.png',
    logo: 'https://crests.football-data.org/FL1.png',
    isEmoji: false
  },
  { 
    code: 'CL', 
    name: '챔피언스리그', 
    flag: '⭐',
    logo: 'https://crests.football-data.org/CL.png',
    isEmoji: false
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
  homeTeam: string      // 팀명 (영문 - 화면 표시용)
  awayTeam: string      // 팀명 (영문 - 화면 표시용)
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

// 📦 캐시 헬퍼 함수
const CACHE_DURATION = 5 * 60 * 1000 // 5분
const CACHE_KEY_PREFIX = 'football_'

function getCachedData(key: string) {
  try {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + key)
    if (!cached) return null
    
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    
    // 캐시가 유효한지 확인
    if (now - timestamp < CACHE_DURATION) {
      console.log('📦 캐시에서 로드:', key)
      return data
    }
    
    // 만료된 캐시 삭제
    localStorage.removeItem(CACHE_KEY_PREFIX + key)
    return null
  } catch (error) {
    console.error('캐시 로드 실패:', error)
    return null
  }
}

function setCachedData(key: string, data: any) {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheData))
    console.log('💾 캐시에 저장:', key)
  } catch (error) {
    console.error('캐시 저장 실패:', error)
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
  // AI 논평 상태
  const [aiCommentaries, setAiCommentaries] = useState<{ [key: number]: string }>({})
  const [commentaryLoading, setCommentaryLoading] = useState<{ [key: number]: boolean }>({})
  // 날짜 필터와 페이지네이션
  const [selectedDate, setSelectedDate] = useState<string>('week')  // 기본값 'week'로 변경
  const [currentPage, setCurrentPage] = useState(1)
  const MATCHES_PER_PAGE = 15
  const [showFallbackBanner, setShowFallbackBanner] = useState(false)
  const [standings, setStandings] = useState<any[]>([])
  const [standingsLoading, setStandingsLoading] = useState(false)
  const [currentLeagueIndex, setCurrentLeagueIndex] = useState(0)
  const [allLeagueStandings, setAllLeagueStandings] = useState<{ [key: string]: any[] }>({})

  // 전체 리그 목록 (전체 제외)
  const availableLeagues = LEAGUES.filter(l => l.code !== 'ALL')

  // 다크모드 토글
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // HilltopAds 광고 로드
  useEffect(() => {
    const container = document.getElementById('hilltop-ad-container')
    if (!container) return

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = `
      (function(ttf){
        var d = document,
            s = d.createElement('script'),
            l = d.scripts[d.scripts.length - 1];
        s.settings = ttf || {};
        s.src = "//aggressivestruggle.com/b/XtV.sjd/GOlv0kYAWjcW/vezm_9euJZKUJlakZP/TGYC2OOUTvYq0jMCz_QZtRNljGYg5/NSjTQ/zjNaQN";
        s.async = true;
        s.referrerPolicy = 'no-referrer-when-downgrade';
        l.parentNode.insertBefore(s, l);
      })({})
    `
    container.appendChild(script)

    return () => {
      if (container && script.parentNode) {
        container.removeChild(script)
      }
    }
  }, [])

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

  // 트렌드 데이터 로드 함수 (useEffect 밖으로 이동)
  const fetchTrendData = async (matchId: string, match?: any) => {
    try {
      // 🚀 캐시 확인
      const cacheKey = `trend_${matchId}`
      const cachedTrend = getCachedData(cacheKey)
      
      if (cachedTrend) {
        setTrendData(prev => ({ ...prev, [matchId]: cachedTrend }))
        console.log(`📦 캐시에서 트렌드 로드: ${matchId}`)
        return cachedTrend
      }
      
      // ⏱️ 5초 타임아웃 설정
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`/api/match-trend?matchId=${matchId}`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      const result = await response.json()
      
      if (result.success && result.data.length > 0) {
        // 💾 캐시에 저장
        setCachedData(cacheKey, result.data)
        
        setTrendData(prev => ({ ...prev, [matchId]: result.data }))
        console.log(`📈 Loaded trend for match ${matchId}:`, result.data.length, 'points')
        return result.data
      } else {
        throw new Error('No trend data available')
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('⏱️ 트렌드 API 타임아웃')
      } else {
        console.warn('⚠️ 트렌드 API 호출 실패:', err)
      }
      setTrendData(prev => ({
        ...prev,
        [matchId]: []
      }))
      return []
    }
  }

  // Supabase에서 실제 오즈 데이터 직접 가져오기
  useEffect(() => {
    async function fetchMatches() {
      setLoading(true)
      setError(null)
      
      try {
        // 🚀 캐시 확인
        const cacheKey = `matches_${selectedLeague}`
        const cachedMatches = getCachedData(cacheKey)
        
        if (cachedMatches) {
          // 캐시된 데이터 사용
          setMatches(cachedMatches)
          setLoading(false)
          console.log('✅ 캐시에서 경기 로드:', cachedMatches.length)
          return
        }
        
        // DB에서 실제 오즈만 가져오기
        let allMatches = []
        
        if (selectedLeague === 'ALL') {
          // 모든 리그의 오즈 가져오기
          const leagues = ['PL', 'PD', 'BL1', 'SA', 'FL1' ,'CL']
          const promises = leagues.map(league => 
            fetch(`/api/odds-from-db?league=${league}`, {
              headers: {
                'Cache-Control': 'public, max-age=300' // 5분 캐시
              }
            })
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
            `/api/odds-from-db?league=${selectedLeague}`,
            {
              headers: {
                'Cache-Control': 'public, max-age=300' // 5분 캐시
              }
            }
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
          
          return {
            id: odds.match_id || Math.random(),
            league: getLeagueName(leagueCode),  // 리그 코드를 한글 이름으로 변환
            leagueCode: leagueCode,
            leagueLogo: getLeagueLogo(leagueCode),
            date: formatDate(odds.commence_time),
            time: formatTime(odds.commence_time),
            homeTeam: homeTeamEng,           // 영문 팀명 사용
            awayTeam: awayTeamEng,           // 영문 팀명 사용
            homeCrest: getTeamLogo(homeTeamEng),  // 영문으로 로고 매칭
            awayCrest: getTeamLogo(awayTeamEng),  // 영문으로 로고 매칭
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
        
        // 💾 캐시에 저장
        setCachedData(cacheKey, futureMatches)
        
        setMatches(futureMatches)
        
        // ⚡ 트렌드 데이터는 카드 클릭 시에만 로드 (자동 로딩 비활성화)
        console.log('✅ 경기 데이터 로드 완료. 트렌드는 카드 클릭 시 로드됩니다.')
        
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
        // 🚀 캐시 확인
        const cacheKey = `trend_${matchId}`
        const cachedTrend = getCachedData(cacheKey)
        
        if (cachedTrend) {
          setTrendData(prev => ({ ...prev, [matchId]: cachedTrend }))
          return cachedTrend
        }
        
        // ⏱️ 3초 타임아웃 설정
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        
        const response = await fetch(`/api/match-trend?matchId=${matchId}`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        const result = await response.json()
        
        if (result.success && result.data.length > 0) {
          console.log(`📈 Loaded trend for match ${matchId}:`, result.data.length, 'points')
          
          // 💾 캐시에 저장
          setCachedData(cacheKey, result.data)
          
          setTrendData(prev => ({ ...prev, [matchId]: result.data }))
          return result.data
        } else {
          // API 응답은 있지만 데이터가 없는 경우
          throw new Error('No trend data available')
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.warn(`⏱️ 트렌드 로딩 타임아웃 (match ${matchId})`)
        } else {
          console.warn(`⚠️ 트렌드 데이터 로드 실패 (match ${matchId}):`, err)
        }
        return [] // 빈 배열 반환 (차트 표시 안 함)
      }
    }

  fetchMatches()
}, [selectedLeague])

  // 순위표 데이터 가져오기
  const fetchStandings = async (league: string) => {
    if (league === 'ALL') {
      // 전체 리그 선택 시 모든 리그의 순위표 로드
      setStandingsLoading(true)
      const allStandings: { [key: string]: any[] } = {}
      
      for (const l of availableLeagues) {
        try {
          const cacheKey = `standings_${l.code}`
          const cached = getCachedData(cacheKey)
          
          if (cached) {
            allStandings[l.code] = cached
          } else {
            const response = await fetch(`/api/standings?league=${l.code}`)
            if (response.ok) {
              const data = await response.json()
              const standingsData = data.standings || []
              allStandings[l.code] = standingsData
              setCachedData(cacheKey, standingsData)
            }
          }
        } catch (error) {
          console.error(`순위표 로드 실패 (${l.code}):`, error)
        }
      }
      
      setAllLeagueStandings(allStandings)
      setStandingsLoading(false)
      
      // 첫 번째 리그 표시
      if (availableLeagues.length > 0) {
        setStandings(allStandings[availableLeagues[0].code] || [])
      }
      return
    }
    
    // 🚀 캐시 확인
    const cacheKey = `standings_${league}`
    const cachedStandings = getCachedData(cacheKey)
    
    if (cachedStandings) {
      setStandings(cachedStandings)
      console.log('📦 캐시에서 순위표 로드:', league)
      return
    }
    
    setStandingsLoading(true)
    try {
      const response = await fetch(`/api/standings?league=${league}`, {
        headers: {
          'Cache-Control': 'public, max-age=300' // 5분 캐시
        }
      })
      if (!response.ok) throw new Error('Failed to fetch standings')
      const data = await response.json()
      const standingsData = data.standings || []
      
      // 💾 캐시에 저장
      setCachedData(cacheKey, standingsData)
      
      setStandings(standingsData)
    } catch (error) {
      console.error('Error fetching standings:', error)
      setStandings([])
    } finally {
      setStandingsLoading(false)
    }
  }

  // 리그 변경 시 순위표도 로드
  useEffect(() => {
    fetchStandings(selectedLeague)
  }, [selectedLeague])

  // 🎯 폴백 배너 상태 관리
  useEffect(() => {
    // 날짜 필터링 계산
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + 7)
    
    if (selectedDate === 'week') {
      // 이번 주 경기 확인
      const weekMatches = matches.filter(match => {
        const matchDate = new Date(match.utcDate)
        return matchDate >= today && matchDate < weekEnd
      })
      
      // 이번 주에 경기가 없으면 배너 표시
      if (weekMatches.length === 0 && matches.length > 0) {
        setShowFallbackBanner(true)
      } else {
        setShowFallbackBanner(false)
      }
    } else {
      // 다른 탭 선택 시 배너 숨김
      setShowFallbackBanner(false)
    }
  }, [selectedDate, matches])

  // AI 논평 기능 일시 비활성화 (Rate Limit 때문)
  // TODO: 나중에 큐잉 시스템으로 개선
  // useEffect(() => {
  //   if (matches.length > 0) {
  //     matches.forEach(match => {
  //       if (!aiCommentaries[match.id]) {
  //         fetchAICommentary(match)
  //       }
  //     })
  //   }
  // }, [matches])

  // 트렌드 데이터 변경 시 차트 렌더링
  useEffect(() => {
    if (expandedMatchId) {
      const currentTrend = trendData[expandedMatchId]
      if (currentTrend && currentTrend.length > 0) {
        setTimeout(() => {
          const chartContainer = document.getElementById(`trend-chart-${expandedMatchId}`)
          if (chartContainer) {
            console.log('📈 차트 자동 렌더링:', currentTrend.length, 'points')
            renderChart(chartContainer, currentTrend)
          }
        }, 200)
      }
    }
  }, [trendData, expandedMatchId, darkMode])

  // 뉴스 키워드 가져오기
  const fetchNewsKeywords = async (homeTeam: string, awayTeam: string) => {
    try {
      console.log(`🔍 뉴스 키워드 요청: ${homeTeam} vs ${awayTeam}`)
      
      const response = await fetch(
        `/api/news?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}`
      )
      
      if (!response.ok) {
        throw new Error('뉴스 데이터 로드 실패')
      }
      
      const data = await response.json()
      console.log('📰 뉴스 키워드 응답:', data)
      
      // API 응답의 keywords를 NewsKeyword 형식으로 변환
      if (data.keywords && Array.isArray(data.keywords)) {
        const formattedKeywords: NewsKeyword[] = data.keywords.map((kw: any) => ({
          keyword: kw.keyword,
          count: kw.count,
          sentiment: 'neutral' as const  // API에서 sentiment를 제공하지 않으면 neutral로 설정
        }))
        
        setNewsKeywords(formattedKeywords)
        console.log('✅ 뉴스 키워드 설정 완료:', formattedKeywords.length, '개')
      } else {
        // 데이터가 없으면 빈 배열
        setNewsKeywords([])
        console.log('⚠️ 뉴스 키워드 없음')
      }
      
    } catch (error) {
      console.error('❌ 뉴스 키워드 로드 에러:', error)
      // 에러 시 더미 데이터 사용
      setNewsKeywords(generateNewsKeywords())
    }
  }

  // AI 논평 가져오기 (Claude API 사용)
  const fetchAICommentary = async (match: Match) => {
    try {
      console.log(`🤖 AI 논평 요청: ${match.homeTeam} vs ${match.awayTeam}`)
      
      // 로딩 상태 설정
      setCommentaryLoading(prev => ({ ...prev, [match.id]: true }))
      
      const response = await fetch('/api/ai-commentary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ match })
      })
      
      if (!response.ok) {
        throw new Error('AI 논평 생성 실패')
      }
      
      const data = await response.json()
      console.log('✅ AI 논평 응답:', data.commentary)
      
      // 논평 저장
      setAiCommentaries(prev => ({ ...prev, [match.id]: data.commentary }))
      
    } catch (error) {
      console.error('❌ AI 논평 로드 에러:', error)
      
      // 폴백: 기본 논평
      const homeWin = typeof match.homeWinRate === 'number' 
        ? match.homeWinRate 
        : parseFloat(String(match.homeWinRate))
      const awayWin = typeof match.awayWinRate === 'number'
        ? match.awayWinRate
        : parseFloat(String(match.awayWinRate))
      const homeAwayDiff = Math.abs(homeWin - awayWin)
      
      let fallback = ''
      if (homeAwayDiff < 10) {
        fallback = `${match.homeTeam}와 ${match.awayTeam}의 팽팽한 승부가 예상됩니다.`
      } else if (homeWin > awayWin) {
        fallback = `${match.homeTeam}이 홈에서 유리한 경기를 펼칠 것으로 보입니다.`
      } else {
        fallback = `${match.awayTeam}의 강력한 원정 경기력이 기대됩니다.`
      }
      
      setAiCommentaries(prev => ({ ...prev, [match.id]: fallback }))
    } finally {
      setCommentaryLoading(prev => ({ ...prev, [match.id]: false }))
    }
  }

  // 경기 클릭 핸들러
  const handleMatchClick = async (match: Match) => {
    if (expandedMatchId === match.id) {
      setExpandedMatchId(null)
    } else {
      setExpandedMatchId(match.id)
      
      // 실제 뉴스 API 호출 (영문 팀명 사용)
      fetchNewsKeywords(match.homeTeam, match.awayTeam)
      
      // 🔥 트렌드 데이터가 없으면 로드
      if (!trendData[match.id] || trendData[match.id].length === 0) {
        console.log('📊 트렌드 데이터 로딩 시작:', match.id)
        await fetchTrendData(match.id.toString(), match)
      }
                  
      setTimeout(() => {
        const chartContainer = document.getElementById(`trend-chart-${match.id}`)
        const currentTrend = trendData[match.id]
        
        // 트렌드 데이터가 있을 때만 차트 렌더링
        if (chartContainer && currentTrend && currentTrend.length > 0) {
          console.log('📈 차트 렌더링 시작:', currentTrend.length, 'points')
          renderChart(chartContainer, currentTrend)
        } else {
          console.log('⚠️ 차트 렌더링 실패 - 데이터 없음')
        }
      }, 100)
    }
  }

  // 차트 렌더링 함수
  function renderChart(container: HTMLElement, trend: TrendData[]) {
    container.innerHTML = ''

    // Y축 범위 동적 계산
    const allValues = trend.flatMap(point => [
      point.homeWinProbability,
      point.drawProbability,
      point.awayWinProbability
    ])
    const minValue = Math.min(...allValues)
    const maxValue = Math.max(...allValues)
    
    // 여유 공간 추가 (변화를 더 크게 보이도록)
    const range = maxValue - minValue
    const padding = Math.max(range * 0.2, 5) // 최소 5% 패딩
    const yMin = Math.max(0, minValue - padding)
    const yMax = Math.min(100, maxValue + padding)

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
        // 동적 Y축 범위 적용
        autoScale: false,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    })

    // 홈팀 승률 (파란색 영역)
    const homeSeries = chart.addAreaSeries({
      topColor: 'rgba(59, 130, 246, 0.4)',
      bottomColor: 'rgba(59, 130, 246, 0.05)',
      lineColor: '#3b82f6',
      lineWidth: 3,
    })

    // 무승부 (회색 선)
    const drawSeries = chart.addLineSeries({
      color: '#9ca3af',
      lineWidth: 3,
      lineStyle: 2, // 점선
    })

    // 원정팀 승률 (빨간색 영역)
    const awaySeries = chart.addAreaSeries({
      topColor: 'rgba(239, 68, 68, 0.4)',
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

    // 데이터 포인트 마커 추가 (각 시간대별)
    const markers = trend.map((point, index) => {
      const time = Math.floor(new Date(point.timestamp).getTime() / 1000) as any
      
      // 최고값을 가진 팀에만 마커 표시
      const maxProb = Math.max(
        point.homeWinProbability,
        point.drawProbability,
        point.awayWinProbability
      )
      
      let color = '#9ca3af'
      let position: 'belowBar' | 'aboveBar' = 'aboveBar'
      
      if (maxProb === point.homeWinProbability) {
        color = '#3b82f6'
        position = 'aboveBar'
      } else if (maxProb === point.awayWinProbability) {
        color = '#ef4444'
        position = 'belowBar'
      }
      
      return {
        time,
        position,
        color,
        shape: 'circle' as const,
        size: 0.5,
      }
    })
    
    // 홈팀 시리즈에 마커 추가
    homeSeries.setMarkers(markers.filter(m => m.color === '#3b82f6'))
    // 원정팀 시리즈에 마커 추가
    awaySeries.setMarkers(markers.filter(m => m.color === '#ef4444'))

    // Y축 범위 수동 설정
    chart.priceScale('right').applyOptions({
      autoScale: false,
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    })
    
    // 모든 시리즈에 동일한 Y축 범위 적용
    homeSeries.priceScale().applyOptions({
      autoScale: false,
      mode: 0, // Normal
      invertScale: false,
      alignLabels: true,
      borderVisible: true,
      borderColor: darkMode ? '#1f1f1f' : '#e5e7eb',
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    })

    chart.timeScale().fitContent()
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* 헤더 */}
    

      {/* 승률 배너 (자동 스크롤) */}
      <div className="bg-[#0f0f0f] border-b border-gray-900">
        <div className="py-4 overflow-hidden">
          <div 
            ref={scrollContainerRef}
            className="flex gap-4 px-4 overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'auto' }}
          >
            {(() => {
              // 필터링된 경기에서 20개 추출 (중복 제거)
              const uniqueMatches = matches.slice(0, 20)
              // 무한 스크롤을 위해 2번 반복
              return [...uniqueMatches, ...uniqueMatches].map((match, index) => {
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
                  onClick={() => {
                    // 경기 카드로 스크롤
                    const element = document.getElementById(`match-card-${match.id}`)
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                    // 경기 확장
                    handleMatchClick(match)
                  }}
                  className={`flex flex-col p-3 rounded-lg min-w-[160px] cursor-pointer transition-all bg-[#1a1a1a] border border-gray-800 ${
                    expandedMatchId === match.id ? 'ring-2 ring-blue-500' : 'hover:scale-105 hover:border-gray-700'
                  }`}
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
                    {match.homeTeam} - {match.awayTeam}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    {match.time}
                  </div>
                </div>
              )
            })
          })()}
          </div>
        </div>
      </div>

      {/* 트렌드 컨텐츠 영역 */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* 왼쪽 사이드바 (데스크톱만) */}
          <aside className={`hidden lg:block w-64 flex-shrink-0`}>
            <div className={`sticky top-24 rounded-2xl p-4 ${
              darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
            }`}>
              <h2 className={`text-lg font-bold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Popular Leagues
              </h2>
              <nav className="space-y-2">
                {LEAGUES.map((league) => (
                  <button
                    key={league.code}
                    onClick={() => setSelectedLeague(league.code)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left ${
                      selectedLeague === league.code
                        ? darkMode 
                          ? 'bg-white text-black shadow-lg'
                          : 'bg-black text-white shadow-lg'
                        : darkMode
                          ? 'text-gray-300 hover:bg-gray-800'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {league.isEmoji ? (
                      <span className="text-2xl">{league.logo}</span>
                    ) : (
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1 flex-shrink-0">
                        <img 
                          src={league.logo} 
                          alt={league.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <span className="text-sm">{league.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* 메인 콘텐츠 */}
          <main className="flex-1 min-w-0">
            {/* 리그 필터 (모바일만) */}
            <div className={`lg:hidden mb-6 p-3 rounded-2xl ${
              darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
            }`}>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {LEAGUES.map((league) => (
                  <button
                    key={league.code}
                    onClick={() => {
                      setSelectedLeague(league.code)
                      setCurrentPage(1) // 리그 변경 시 1페이지로 리셋
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      selectedLeague === league.code
                        ? darkMode 
                          ? 'bg-white text-black shadow-lg transform scale-105'
                          : 'bg-black text-white shadow-lg transform scale-105'
                        : darkMode
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    {/* 모바일/데스크탑 모두: 국기 + 이름 */}
                    <span className="flex items-center gap-2">
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

        {/* 날짜 필터 */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
            {[
              { value: 'today', label: '오늘' },
              { value: 'tomorrow', label: '내일' },
              { value: 'week', label: '이번 주' },
              { value: 'upcoming', label: '다가오는 경기' }
            ].map((date) => (
              <button
                key={date.value}
                onClick={() => {
                  setSelectedDate(date.value)
                  setCurrentPage(1) // 날짜 변경 시 1페이지로 리셋
                  setShowFallbackBanner(false) // 배너 숨김
                }}
                className={`px-6 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  selectedDate === date.value
                    ? darkMode 
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-blue-500 text-white shadow-lg'
                    : darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {date.label}
              </button>
            ))}
          </div>
        </div>

        {/* 상단 광고 배너 */}
        

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

        {/* 경기 목록 - 1열 레이아웃 */}
        {!loading && !error && (
          <div className="grid gap-6 grid-cols-1">
            {(() => {
              // 날짜 필터링
              const now = new Date()
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
              const tomorrow = new Date(today)
              tomorrow.setDate(tomorrow.getDate() + 1)
              const weekEnd = new Date(today)
              weekEnd.setDate(weekEnd.getDate() + 7)
              
              let filteredMatches = matches.filter(match => {
                const matchDate = new Date(match.utcDate)
                
                if (selectedDate === 'today') {
                  return matchDate >= today && matchDate < tomorrow
                } else if (selectedDate === 'tomorrow') {
                  const dayAfter = new Date(tomorrow)
                  dayAfter.setDate(dayAfter.getDate() + 1)
                  return matchDate >= tomorrow && matchDate < dayAfter
                } else if (selectedDate === 'week') {
                  return matchDate >= today && matchDate < weekEnd
                } else if (selectedDate === 'upcoming') {
                  // 다가오는 경기: 모든 미래 경기 (이미 fetchMatches에서 필터링됨)
                  return true
                }
                return true
              })
              
              // 🎯 폴백 체크: 이번 주에 경기가 없으면 모든 경기 표시
              const shouldShowFallback = selectedDate === 'week' && filteredMatches.length === 0 && matches.length > 0
              if (shouldShowFallback) {
                filteredMatches = matches // 모든 미래 경기 표시
              }
              
              // 페이지네이션
              const totalMatches = filteredMatches.length
              const totalPages = Math.ceil(totalMatches / MATCHES_PER_PAGE)
              const startIndex = (currentPage - 1) * MATCHES_PER_PAGE
              const endIndex = startIndex + MATCHES_PER_PAGE
              const paginatedMatches = filteredMatches.slice(startIndex, endIndex)
              
              return (
                <>
                  {/* 폴백 배너 */}
                  {showFallbackBanner && (
                    <div className="mb-6 bg-blue-900/20 border border-blue-700/50 rounded-xl p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-blue-300">
                              이번 주 예정된 경기가 없습니다
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              가장 가까운 경기를 보여드립니다
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowFallbackBanner(false)}
                          className="text-gray-400 hover:text-white transition-colors ml-4"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {paginatedMatches.length === 0 ? (
                    <div className={`text-center py-20 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div className="text-6xl mb-4">📅</div>
                      <p className="text-xl mb-2">선택한 날짜에 예정된 경기가 없습니다.</p>
                      <p className="text-sm">다른 날짜를 선택해보세요!</p>
                    </div>
                  ) : (
                    <>
                      {paginatedMatches.map((match, index) => {
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
                <React.Fragment key={match.id}>
                  <div id={`match-card-${match.id}`}>
                  {/* 경기 카드 - 가로 배치 */}
                  <div
                    onClick={() => handleMatchClick(match)}
                    className={`
                      relative rounded-2xl transition-all duration-200 cursor-pointer group
                      ${darkMode 
                        ? 'bg-[#1a1a1a] border border-gray-800 hover:border-blue-500' 
                        : 'bg-white border border-gray-200 hover:border-blue-400'
                      } 
                      ${expandedMatchId === match.id 
                        ? 'ring-2 ring-blue-500 scale-[1.02]' 
                        : 'hover:shadow-xl hover:scale-[1.02]'
                      }
                    `}
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
                      <div className="flex flex-col items-center gap-3 mb-6">
                        {/* 엠블럼과 VS */}
                        <div className="flex items-center justify-center gap-4">
                          {/* 홈팀 엠블럼 */}
                          <img src={match.homeCrest} alt={match.homeTeam} className="w-12 h-12" />
                          
                          {/* VS 배지 */}
                          <div className={`px-3 py-1 rounded-lg text-xs font-black ${
                            darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
                          }`}>
                            VS
                          </div>
                          
                          {/* 원정팀 엠블럼 */}
                          <img src={match.awayCrest} alt={match.awayTeam} className="w-12 h-12" />
                        </div>
                        
                        {/* 팀 이름 - VS 중심 */}
                        <div className="w-full flex items-center justify-center gap-4">
                          {/* 홈팀 이름 - 오른쪽 정렬 */}
                          <span className={`font-bold text-sm text-right flex-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {match.homeTeam}
                          </span>
                          
                          {/* VS 공간 유지 */}
                          <div className="w-12"></div>
                          
                          {/* 원정팀 이름 - 왼쪽 정렬 */}
                          <span className={`font-bold text-sm text-left flex-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {match.awayTeam}
                          </span>
                        </div>
                      </div>

                      {/* 승률 표시 - 프로그레스 바 포함 */}
                      <div className="grid grid-cols-3 gap-3">
                        {/* 홈팀 승률 */}
                        <div className="relative overflow-hidden rounded-xl py-2 px-3 bg-[#0f0f0f]">
                          {/* 프로그레스 바 */}
                          <div 
                            className="absolute bottom-0 left-0 h-1 transition-all duration-500 bg-blue-500"
                            style={{ 
                              width: `${latestTrend ? latestTrend.homeWinProbability : match.homeWinRate}%` 
                            }}
                          ></div>
                          
                          <div className="relative z-10 flex flex-col items-center">
                            <div className="text-xs font-medium mb-1 text-gray-500">
                              홈
                            </div>
                            <div className={`text-2xl md:text-4xl font-black transition-all duration-500 ${
                              darkMode ? 'text-white' : 'text-black'
                            } ${homeChange > 0 ? 'animate-pulse' : ''}`}>
                              {latestTrend ? Math.round(latestTrend.homeWinProbability) : match.homeWinRate}%
                            </div>
                            <div className="h-4 mt-1">
                              {homeChange !== 0 && (
                                <div className={`text-xs font-bold ${
                                  homeChange > 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  {homeChange > 0 ? '↑' : '↓'} {Math.abs(Math.round(homeChange))}%
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 무승부 */}
                        <div className="relative overflow-hidden rounded-xl py-2 px-3 bg-[#0f0f0f]">
                          {/* 프로그레스 바 */}
                          <div 
                            className="absolute bottom-0 left-0 h-1 transition-all duration-500 bg-gray-600"
                            style={{ 
                              width: `${latestTrend ? latestTrend.drawProbability : match.drawRate}%` 
                            }}
                          ></div>
                          
                          <div className="relative z-10 flex flex-col items-center">
                            <div className="text-xs font-medium mb-1 text-gray-500">
                              무승부
                            </div>
                            <div className="text-2xl md:text-4xl font-black text-gray-400">
                              {latestTrend ? Math.round(latestTrend.drawProbability) : match.drawRate}%
                            </div>
                            <div className="h-4 mt-1"></div>
                          </div>
                        </div>

                        {/* 원정팀 승률 */}
                        <div className="relative overflow-hidden rounded-xl py-2 px-3 bg-[#0f0f0f]">
                          {/* 프로그레스 바 */}
                          <div 
                            className="absolute bottom-0 left-0 h-1 transition-all duration-500 bg-red-500"
                            style={{ 
                              width: `${latestTrend ? latestTrend.awayWinProbability : match.awayWinRate}%` 
                            }}
                          ></div>
                          
                          <div className="relative z-10 flex flex-col items-center">
                            <div className="text-xs font-medium mb-1 text-gray-500">
                              원정
                            </div>
                            <div className={`text-2xl md:text-4xl font-black transition-all duration-500 text-white ${
                              awayChange > 0 ? 'animate-pulse' : ''
                            }`}>
                              {latestTrend ? Math.round(latestTrend.awayWinProbability) : match.awayWinRate}%
                            </div>
                            <div className="h-4 mt-1">
                              {awayChange !== 0 && (
                                <div className={`text-xs font-bold ${
                                  awayChange > 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  {awayChange > 0 ? '↑' : '↓'} {Math.abs(Math.round(awayChange))}%
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* AI 한줄 논평 */}
                      <div className={`mt-4 px-4 py-3 rounded-xl ${
                        darkMode ? 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30' : 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200'
                      }`}>
                        <div className="flex items-start gap-2">
                          <div className="text-lg mt-0.5">🤖</div>
                          <div className="flex-1">
                            <div className={`text-xs font-semibold mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              AI 경기 분석
                            </div>
                            <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {(() => {
                                try {
                                  const homeWin = typeof match.homeWinRate === 'number'
                                    ? match.homeWinRate
                                    : parseFloat(String(match.homeWinRate)) || 0
                                  const draw = typeof match.drawRate === 'number'
                                    ? match.drawRate
                                    : parseFloat(String(match.drawRate)) || 0
                                  const awayWin = typeof match.awayWinRate === 'number'
                                    ? match.awayWinRate
                                    : parseFloat(String(match.awayWinRate)) || 0
                                  const homeAwayDiff = Math.abs(homeWin - awayWin)
                                  
                                  // 디버깅
                                  console.log('Match:', match.homeTeam, 'vs', match.awayTeam)
                                  console.log('Rates:', homeWin, draw, awayWin, 'Diff:', homeAwayDiff)
                                
                                // 논평 패턴 라이브러리
                                const patterns = {
                                  // 압도적 우세 (20% 이상 차이)
                                  dominant_home: [
                                    `${match.homeTeam}의 압도적인 우세가 예상됩니다. 홈 어드밴티지를 최대한 활용할 것으로 보입니다.`,
                                    `${match.homeTeam}이 경기를 장악할 것으로 전망됩니다. 공격적인 경기 운영이 기대됩니다.`,
                                    `${match.homeTeam}의 강력한 전력이 돋보입니다. 안정적인 승리가 예상됩니다.`,
                                    `홈팀 ${match.homeTeam}의 기세가 등등합니다. 원정팀을 압도할 가능성이 높습니다.`,
                                    `${match.homeTeam}이 주도권을 쥐고 경기를 풀어갈 것으로 보입니다.`
                                  ],
                                  dominant_away: [
                                    `${match.awayTeam}의 강력한 원정 경기력이 돋보입니다. 승리 가능성이 매우 높습니다.`,
                                    `원정팀 ${match.awayTeam}이 경기를 지배할 것으로 예상됩니다. 공격 화력이 인상적입니다.`,
                                    `${match.awayTeam}의 뛰어난 전술이 빛을 발할 전망입니다. 안정적인 승리가 기대됩니다.`,
                                    `${match.awayTeam}이 원정에서도 강력한 모습을 보여줄 것으로 전망됩니다.`,
                                    `원정 경기지만 ${match.awayTeam}의 우세가 뚜렷합니다. 승점 3점 확보가 유력합니다.`
                                  ],
                                  
                                  // 일반 우세 (10-20% 차이)
                                  advantage_home: [
                                    `${match.homeTeam}이 홈에서 유리한 경기를 펼칠 것으로 예상됩니다.`,
                                    `${match.homeTeam}의 홈 경기력이 승부의 열쇠가 될 전망입니다.`,
                                    `홈팀 ${match.homeTeam}이 다소 우위를 점하고 있습니다. 홈 관중의 응원이 힘이 될 것입니다.`,
                                    `${match.homeTeam}이 경기 흐름을 주도할 가능성이 높습니다.`,
                                    `홈 어드밴티지를 앞세운 ${match.homeTeam}이 승리에 근접해 있습니다.`
                                  ],
                                  advantage_away: [
                                    `${match.awayTeam}이 원정에서도 좋은 경기력을 보여줄 것으로 전망됩니다.`,
                                    `${match.awayTeam}의 탄탄한 조직력이 승부를 가를 것으로 보입니다.`,
                                    `원정팀 ${match.awayTeam}이 다소 유리한 고지를 선점하고 있습니다.`,
                                    `${match.awayTeam}의 최근 상승세가 경기 결과에 영향을 미칠 전망입니다.`,
                                    `${match.awayTeam}이 원정 경기에서 강점을 발휘할 것으로 기대됩니다.`
                                  ],
                                  
                                  // 박빙 승부 (10% 미만 차이)
                                  close_match: [
                                    `${match.homeTeam}와 ${match.awayTeam}의 팽팽한 승부가 예상됩니다. 양 팀 모두 승점 3점을 노립니다.`,
                                    `접전이 예상됩니다. ${match.homeTeam}과 ${match.awayTeam} 모두 승리 가능성이 열려있습니다.`,
                                    `박빙의 경기가 펼쳐질 전망입니다. 작은 실수가 승부를 가를 수 있습니다.`,
                                    `양 팀의 전력이 균형을 이루고 있습니다. 세트피스가 승부처가 될 수 있습니다.`,
                                    `한 골 차이로 승부가 갈릴 수 있는 경기입니다. 긴장감 넘치는 90분이 예상됩니다.`,
                                    `${match.homeTeam}과 ${match.awayTeam} 모두 기회가 있는 접전입니다.`,
                                    `예측하기 어려운 경기입니다. 선수들의 컨디션이 변수가 될 것입니다.`
                                  ],
                                  
                                  // 무승부 가능성 높음
                                  draw_likely: [
                                    `팽팽한 승부가 예상됩니다. 무승부 가능성도 ${Math.round(draw)}%로 높은 편입니다.`,
                                    `양 팀 모두 신중한 경기 운영이 예상됩니다. 무승부로 끝날 가능성이 높습니다.`,
                                    `수비적인 경기가 펼쳐질 전망입니다. 스코어리스 무승부 가능성도 있습니다.`,
                                    `두 팀의 전력이 비슷해 무승부 가능성이 ${Math.round(draw)}%로 높습니다.`,
                                    `득점 기회가 많지 않을 것으로 보입니다. 1-1 무승부도 충분히 가능합니다.`,
                                    `전술 싸움이 치열할 전망입니다. 승부를 가르기 어려운 경기가 될 것입니다.`
                                  ]
                                }
                                
                                // 패턴 선택 로직
                                let selectedPattern: string[] = []
                                
                                if (homeAwayDiff > 20) {
                                  // 압도적 우세
                                  selectedPattern = homeWin > awayWin ? patterns.dominant_home : patterns.dominant_away
                                  console.log('Pattern: dominant', homeWin > awayWin ? 'home' : 'away')
                                } else if (homeAwayDiff > 10) {
                                  // 일반 우세
                                  selectedPattern = homeWin > awayWin ? patterns.advantage_home : patterns.advantage_away
                                  console.log('Pattern: advantage', homeWin > awayWin ? 'home' : 'away')
                                } else {
                                  // 박빙의 승부
                                  if (draw > 28) {
                                    selectedPattern = patterns.draw_likely
                                    console.log('Pattern: draw_likely')
                                  } else {
                                    selectedPattern = patterns.close_match
                                    console.log('Pattern: close_match')
                                  }
                                }
                                
                                console.log('Selected pattern length:', selectedPattern.length)
                                
                                // 폴백
                                if (!selectedPattern || selectedPattern.length === 0) {
                                  console.error('No pattern selected!')
                                  return '경기 분석을 준비 중입니다.'
                                }
                                
                                // 랜덤으로 논평 선택 (경기 ID 기반 시드로 일관성 유지)
                                const matchId = typeof match.id === 'number' ? match.id : parseInt(String(match.id)) || 0
                                const seed = matchId % selectedPattern.length
                                const commentary = selectedPattern[seed]
                                console.log('Match ID:', matchId, 'Seed:', seed, 'Commentary:', commentary)
                                
                                // 최종 폴백
                                if (!commentary) {
                                  return selectedPattern[0] || '경기 분석을 준비 중입니다.'
                                }
                                
                                return commentary
                              } catch (error) {
                                console.error('논평 생성 오류:', error)
                                return '경기 분석을 준비 중입니다.'
                              }
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* 트렌드 보기 힌트 - hover 시에만 표시 */}
                      <div className={`
                        mt-3 flex items-center justify-center gap-2
                        text-xs font-medium
                        opacity-0 group-hover:opacity-100
                        transition-opacity duration-200
                        ${darkMode ? 'text-gray-400' : 'text-gray-500'}
                      `}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>클릭하면 24시간 트렌드를 볼 수 있습니다</span>
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
                      darkMode ? 'bg-[#0f0f0f] border border-gray-800' : 'bg-white border border-gray-200'
                    }`}>
                      <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        📈 24시간 트렌드
                      </h3>
                      
                      {/* 트렌드 데이터 로딩 중 */}
                      {!trendData[match.id] || trendData[match.id].length === 0 ? (
                        <div className="text-center py-12">
                          <div className="text-4xl mb-3 animate-bounce">📊</div>
                          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                            트렌드 데이터 로딩 중...
                          </p>
                        </div>
                      ) : (
                        <div id={`trend-chart-${match.id}`} className="mb-4"></div>
                      )}

                    </div>
                  )}
                </div>
              </React.Fragment>
              )
            })}
            
            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentPage === 1
                      ? darkMode 
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : darkMode
                        ? 'bg-gray-800 text-white hover:bg-gray-700'
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  이전
                </button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // 현재 페이지 근처만 표시
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-lg font-medium transition-all ${
                            currentPage === page
                              ? darkMode
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-500 text-white'
                              : darkMode
                                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="text-gray-500">...</span>
                    }
                    return null
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentPage === totalPages
                      ? darkMode 
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : darkMode
                        ? 'bg-gray-800 text-white hover:bg-gray-700'
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  다음
                </button>
                
                <span className={`ml-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {currentPage} / {totalPages} 페이지 (총 {totalMatches}경기)
                </span>
              </div>
            )}
            </>
          )}
        </>
      )
    })()}
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
          </main>

          {/* 우측 순위표 사이드바 */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            {/* HilltopAds - 순위표 위 배너 */}
            <div className={`mb-6 rounded-xl overflow-hidden ${
              darkMode ? 'bg-[#1a1a1a]' : 'bg-white border border-gray-200'
            }`}>
              <div className="p-4">
                <div id="hilltop-ad-container"></div>
              </div>
            </div>
            
            {/* 전체 리그 선택 시 - 캐러셀 */}
            {selectedLeague === 'ALL' && (
              <div className={`sticky top-24 rounded-xl overflow-hidden ${
                darkMode ? 'bg-[#1a1a1a]' : 'bg-white border border-gray-200'
              }`}>
                {/* 헤더 with 좌우 화살표 */}
                <div className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    {/* 왼쪽 화살표 */}
                    <button
                      onClick={() => {
                        const newIndex = currentLeagueIndex === 0 
                          ? availableLeagues.length - 1 
                          : currentLeagueIndex - 1
                        setCurrentLeagueIndex(newIndex)
                        setStandings(allLeagueStandings[availableLeagues[newIndex].code] || [])
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    {/* 리그명 + 로고 */}
                    <div className="flex items-center gap-3">
                      <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {availableLeagues[currentLeagueIndex]?.name || '프리미어리그'}
                      </h2>
                      <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center">
                        {availableLeagues[currentLeagueIndex]?.isEmoji ? (
                          <span className="text-2xl">{availableLeagues[currentLeagueIndex]?.logo}</span>
                        ) : (
                          <img 
                            src={availableLeagues[currentLeagueIndex]?.logo}
                            alt={availableLeagues[currentLeagueIndex]?.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/40?text=?'
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* 오른쪽 화살표 */}
                    <button
                      onClick={() => {
                        const newIndex = currentLeagueIndex === availableLeagues.length - 1 
                          ? 0 
                          : currentLeagueIndex + 1
                        setCurrentLeagueIndex(newIndex)
                        setStandings(allLeagueStandings[availableLeagues[newIndex].code] || [])
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 테이블 헤더 */}
                <div className={`px-4 py-2 flex items-center text-xs font-semibold ${
                  darkMode ? 'text-gray-500 bg-[#0f0f0f]' : 'text-gray-600 bg-gray-50'
                }`}>
                  <div className="w-8">#</div>
                  <div className="flex-1">경기</div>
                  <div className="w-12 text-center">=</div>
                  <div className="w-12 text-right">승점</div>
                </div>

                {/* 순위표 내용 */}
                <div className="p-0">
                  {standingsLoading ? (
                    <div className="text-center py-12">
                      <div className="text-3xl mb-2 animate-bounce">⚽</div>
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        로딩 중...
                      </p>
                    </div>
                  ) : standings.length > 0 ? (
                    <div>
                      {standings.slice(0, 20).map((team: any, index: number) => {
                        const position = team.position || index + 1
                        const isTopFour = position <= 4
                        const isRelegation = position >= 18
                        
                        return (
                          <div 
                            key={team.team?.id || index}
                            className={`flex items-center px-4 py-2.5 transition-colors ${
                              darkMode 
                                ? 'hover:bg-gray-800/50 border-b border-gray-800' 
                                : 'hover:bg-gray-50 border-b border-gray-100'
                            }`}
                          >
                            <div className="w-8 flex items-center">
                              <span className={`text-sm font-bold ${
                                isRelegation 
                                  ? 'text-red-500' 
                                  : isTopFour 
                                    ? 'text-green-500' 
                                    : darkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {position}
                              </span>
                            </div>

                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <img 
                                src={team.team?.crest || getTeamLogo(team.team?.name || '')}
                                alt={team.team?.name}
                                className="w-5 h-5 object-contain flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/20?text=?'
                                }}
                              />
                              <span className={`text-sm font-medium truncate ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {team.team?.name}
                              </span>
                            </div>

                            <div className={`w-12 text-center text-sm ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {team.playedGames || 10}
                            </div>
                            
                            <div className={`w-12 text-center text-sm ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {team.goalDifference > 0 ? '+' : ''}{team.goalDifference || 0}
                            </div>

                            <div className="w-12 text-right">
                              <span className="text-sm font-bold text-white">
                                {team.points || 0}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        순위표 정보가 없습니다
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 특정 리그 선택 시 - 기존 순위표 */}
            {selectedLeague !== 'ALL' && (
              <div className={`sticky top-24 rounded-xl overflow-hidden ${
                darkMode ? 'bg-[#1a1a1a]' : 'bg-white border border-gray-200'
              }`}>
                {/* 헤더 */}
                <div className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {getLeagueName(selectedLeague)}
                    </h2>
                    {/* 리그 로고 */}
                    <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center">
                      {LEAGUES.find(l => l.code === selectedLeague)?.isEmoji ? (
                        <span className="text-2xl">{LEAGUES.find(l => l.code === selectedLeague)?.logo}</span>
                      ) : (
                        <img 
                          src={LEAGUES.find(l => l.code === selectedLeague)?.logo}
                          alt={getLeagueName(selectedLeague)}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/40?text=?'
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* 테이블 헤더 */}
                <div className={`px-4 py-2 flex items-center text-xs font-semibold ${
                  darkMode ? 'text-gray-500 bg-[#0f0f0f]' : 'text-gray-600 bg-gray-50'
                }`}>
                  <div className="w-8">#</div>
                  <div className="flex-1">경기</div>
                  <div className="w-12 text-center">=</div>
                  <div className="w-12 text-right">승점</div>
                </div>

                {/* 순위표 내용 */}
                <div className="p-0">
                  {standingsLoading ? (
                    <div className="text-center py-12">
                      <div className="text-3xl mb-2 animate-bounce">⚽</div>
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        로딩 중...
                      </p>
                    </div>
                  ) : standings.length > 0 ? (
                    <div>
                      {standings.slice(0, 20).map((team: any, index: number) => {
                        const position = team.position || index + 1
                        const isTopFour = position <= 4
                        const isRelegation = position >= 18
                        
                        return (
                          <div 
                            key={team.team?.id || index}
                            className={`flex items-center px-4 py-2.5 transition-colors ${
                              darkMode 
                                ? 'hover:bg-gray-800/50 border-b border-gray-800' 
                                : 'hover:bg-gray-50 border-b border-gray-100'
                            }`}
                          >
                            {/* 순위 */}
                            <div className="w-8 flex items-center">
                              <span className={`text-sm font-bold ${
                                isRelegation 
                                  ? 'text-red-500' 
                                  : isTopFour 
                                    ? 'text-green-500' 
                                    : darkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {position}
                              </span>
                            </div>

                            {/* 팀 로고 + 이름 */}
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <img 
                                src={team.team?.crest || getTeamLogo(team.team?.name || '')}
                                alt={team.team?.name}
                                className="w-5 h-5 object-contain flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/20?text=?'
                                }}
                              />
                              <span className={`text-sm font-medium truncate ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {team.team?.name}
                              </span>
                            </div>

                            {/* 경기 수 */}
                            <div className={`w-12 text-center text-sm ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {team.playedGames || 10}
                            </div>
                            
                            {/* 득실차 */}
                            <div className={`w-12 text-center text-sm ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {team.goalDifference > 0 ? '+' : ''}{team.goalDifference || 0}
                            </div>

                            {/* 승점 */}
                            <div className="w-12 text-right">
                              <span className="text-sm font-bold text-white">
                                {team.points || 0}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        순위표 정보가 없습니다
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
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