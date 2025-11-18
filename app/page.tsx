'use client'
import MatchPrediction from './components/MatchPrediction'
import React, { useState, useEffect, useRef } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import { getTeamLogo, TEAM_NAME_KR } from './teamLogos'
import H2HModal from './components/H2HModal'
import { getTeamId } from './utils/teamIdMapping'
import { useLanguage } from './contexts/LanguageContext'
import LineupModal from './components/LineupModal'
import BlogPreviewSidebar from './components/BlogPreviewSidebar'  

// 리그 정보 (국기 이미지 포함)
const LEAGUES = [
  { 
    code: 'ALL', 
    name: '전체',
    nameEn: 'All Leagues',
    flag: '🌍',
    logo: '🌍',
    isEmoji: true
  },
  { 
    code: 'CL', 
    name: '챔피언스리그',
    nameEn: 'Champions League',
    flag: '🌍',
    logo: 'https://media.api-sports.io/football/leagues/2.png',
    isEmoji: false
  },
    { 
    code: 'EL', 
    name: '유로파리그',
    nameEn: 'Europa League',
    flag: '🌍',
    logo: 'https://media.api-sports.io/football/leagues/3.png',
    isEmoji: false
  },
  { 
    code: 'UECL', 
    name: 'UEFA 컨퍼런스리그',
    nameEn: 'UEFA Conference League',
    flag: '🌍',
     logo: 'https://media.api-sports.io/football/leagues/848.png',
    isEmoji: false
  },
    { 
    code: 'UNL', 
    name: 'UEFA 네이션스리그',
    nameEn: 'UEFA Nations League',
    logo: 'https://media.api-sports.io/football/leagues/5.png', 
    flag: '🌍',
    isEmoji: false
  },

  { 
    code: 'PL', 
    name: '프리미어리그',
    nameEn: 'Premier League',
    flag: 'https://flagcdn.com/w40/gb-eng.png',
    logo: 'https://media.api-sports.io/football/leagues/39.png',
    isEmoji: false
  },
    { 
    code: 'ELC', 
    name: '챔피언십',
    nameEn: 'Championship',
    flag: 'https://flagcdn.com/w40/gb-eng.png',
    logo: 'https://media.api-sports.io/football/leagues/40.png',
    isEmoji: false
  },
  { 
    code: 'PD', 
    name: '라리가',
    nameEn: 'La Liga',
    flag: 'https://flagcdn.com/w40/es.png',
    logo: 'https://media.api-sports.io/football/leagues/140.png',
    isEmoji: false
  },
  { 
    code: 'BL1', 
    name: '분데스리가',
    nameEn: 'Bundesliga',
    flag: 'https://flagcdn.com/w40/de.png',
    logo: 'https://media.api-sports.io/football/leagues/78.png',
    isEmoji: false
  },
  { 
    code: 'SA', 
    name: '세리에A',
    nameEn: 'Serie A',
    flag: 'https://flagcdn.com/w40/it.png',
    logo: 'https://media.api-sports.io/football/leagues/135.png',
    isEmoji: false
  },
  { 
    code: 'FL1', 
    name: '리그1',
    nameEn: 'Ligue 1',
    flag: 'https://flagcdn.com/w40/fr.png',
    logo: 'https://media.api-sports.io/football/leagues/61.png',
    isEmoji: false
  },
  { 
    code: 'PPL', 
    name: '프리메이라리가',
    nameEn: 'Primeira Liga',
    flag: 'https://flagcdn.com/w40/pt.png',
    logo: 'https://media.api-sports.io/football/leagues/94.png',
    isEmoji: false
  },
  { 
    code: 'DED', 
    name: '에레디비시',
    nameEn: 'Eredivisie',
    flag: 'https://flagcdn.com/w40/nl.png',
    logo: 'https://media.api-sports.io/football/leagues/88.png',
    isEmoji: false
  },



]

// 오즈 데이터가 있는 리그만 (경기 목록 필터용)
const LEAGUES_WITH_ODDS = [
  'ALL', 'CL', 'EL', 'UECL', 'UNL', 'PL', 'ELC', 'PD', 'BL1', 'SA', 'FL1', 'PPL', 'DED'
]

// 헬퍼 함수들
function getLeagueLogo(league: string): string {
  const leagueMap: Record<string, string> = {
    'PL': 'https://media.api-sports.io/football/leagues/39.png',
    'PD': 'https://media.api-sports.io/football/leagues/140.png',
    'BL1': 'https://media.api-sports.io/football/leagues/78.png',
    'SA': 'https://media.api-sports.io/football/leagues/135.png',
    'FL1': 'https://media.api-sports.io/football/leagues/61.png',
    'CL': 'https://media.api-sports.io/football/leagues/2.png',
    'PPL': 'https://media.api-sports.io/football/leagues/94.png',
    'DED': 'https://media.api-sports.io/football/leagues/88.png',
    'EL': 'https://media.api-sports.io/football/leagues/3.png',
    'ELC': 'https://media.api-sports.io/football/leagues/40.png',
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
    'PPL': { url: 'https://flagcdn.com/w40/pt.png', isEmoji: false },
    'DED': { url: 'https://flagcdn.com/w40/nl.png', isEmoji: false },
    'CL': { url: '⭐', isEmoji: true },
    'EL': { url: '⭐', isEmoji: true },
    'ELC': { url: 'https://flagcdn.com/w40/gb-eng.png', isEmoji: false },
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
    'PPL': '프리메이라리가',
    'DED': '에레디비시',
    'EL': '유로파리그',
    'ELC': '챔피언십',
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
  homeTeam: string          // 영문 팀명
  awayTeam: string          // 영문 팀명
  home_team_id?: number     // 🆕 API에서 오는 형식 (snake_case)
  away_team_id?: number     // 🆕 API에서 오는 형식 (snake_case)
  homeTeamKR?: string       // 🆕 추가 (한글 팀명)
  awayTeamKR?: string       // 🆕 추가 (한글 팀명)
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
  // 🆕 라인업 관련 필드
  lineupAvailable?: boolean
  homeFormation?: string
  awayFormation?: string
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

// 여러 팀을 한번에 번역 (성능 최적화)
async function translateMatches(matches: any[]): Promise<any[]> {
  // 모든 팀 ID 수집
  const teamIds = new Set<number>()
  matches.forEach(match => {
    if (match.home_team_id) teamIds.add(match.home_team_id)
    if (match.away_team_id) teamIds.add(match.away_team_id)
  })

  // 한번에 번역 요청
  let translations: Record<number, string> = {}
  
  if (teamIds.size > 0) {
    try {
      const response = await fetch('/api/team-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamIds: Array.from(teamIds) })
      })
      const data = await response.json()
      
      // 팀 ID -> 한글명 매핑 생성
      data.teams?.forEach((team: any) => {
        translations[team.team_id] = team.korean_name
      })
    } catch (error) {
      console.error('팀명 일괄 번역 실패:', error)
    }
  }

  // 경기 데이터에 한글 팀명 추가
  return matches.map(match => ({
    ...match,
    homeTeamKR: translations[match.home_team_id] || match.homeTeam || match.home_team,
    awayTeamKR: translations[match.away_team_id] || match.awayTeam || match.away_team,
  }))
}

// 시간 포맷 함수 (UTC를 KST로 변환)
function formatTime(utcDateString: string): string {
  // API에서 UTC ISO 문자열을 받음: "2025-11-22T12:30:00+00:00" 또는 "2025-11-22T12:30:00Z"
  const utcDate = new Date(utcDateString)
  
  // UTC 시간에 9시간(KST 오프셋)을 더함
  const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000))
  
  // UTC 메서드를 사용하여 KST 시간 추출 (로컬 시간대 영향 받지 않음)
  const hours = String(kstDate.getUTCHours()).padStart(2, '0')
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0')
  
  return `${hours}:${minutes}`
}

// 날짜 포맷 (UTC를 KST로 변환)
function formatDate(utcDateString: string): string {
  // API에서 UTC ISO 문자열을 받음: "2025-11-22T12:30:00+00:00" 또는 "2025-11-22T12:30:00Z"
  const utcDate = new Date(utcDateString)
  
  // UTC 시간에 9시간(KST 오프셋)을 더함
  const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000))
  
  // 현재 한국 시간 계산
  const now = new Date()
  const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000))
  
  // 오늘/내일 비교를 위해 날짜만 추출 (시간 제거)
  const todayKST = new Date(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate())
  const tomorrowKST = new Date(todayKST)
  tomorrowKST.setDate(tomorrowKST.getDate() + 1)
  
  const matchDateKST = new Date(kstDate.getUTCFullYear(), kstDate.getUTCMonth(), kstDate.getUTCDate())
  
  if (matchDateKST.getTime() === todayKST.getTime()) {
    return '오늘'
  } else if (matchDateKST.getTime() === tomorrowKST.getTime()) {
    return '내일'
  } else {
    // YYYY/MM/DD 형식으로 변환
    const year = kstDate.getUTCFullYear()
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(kstDate.getUTCDate()).padStart(2, '0')
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
  const { t, language: currentLanguage } = useLanguage()
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [matches, setMatches] = useState<Match[]>([])
    const [h2hModalOpen, setH2hModalOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null)
  const [trendData, setTrendData] = useState<{ [key: number]: TrendData[] }>({})
  const [newsKeywords, setNewsKeywords] = useState<NewsKeyword[]>([])
  const [darkMode, setDarkMode] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const desktopScrollRef = useRef<HTMLDivElement>(null) // 🆕 데스크톱 전용
  // AI 논평 상태
  const [aiCommentaries, setAiCommentaries] = useState<{ [key: number]: string }>({})
  const [commentaryLoading, setCommentaryLoading] = useState<{ [key: number]: boolean }>({})
  // 🆕 라인업 상태
  const [lineupStatus, setLineupStatus] = useState<Record<number, {
    available: boolean
    homeFormation?: string
    awayFormation?: string
  }>>({})
  const [lineupModalOpen, setLineupModalOpen] = useState(false)
  const [selectedMatchForLineup, setSelectedMatchForLineup] = useState<Match | null>(null)
  // 날짜 필터와 페이지네이션
  const [selectedDate, setSelectedDate] = useState<string>('week')  // 기본값 'week'로 변경
  const [currentPage, setCurrentPage] = useState(1)
  const MATCHES_PER_PAGE = 15
  const [showFallbackBanner, setShowFallbackBanner] = useState(false)
  const [standings, setStandings] = useState<any[]>([])
  const [standingsLoading, setStandingsLoading] = useState(false)
  const [currentLeagueIndex, setCurrentLeagueIndex] = useState(0)
  const [allLeagueStandings, setAllLeagueStandings] = useState<{ [key: string]: any[] }>({})
  // 🔴 라이브 경기 수
  const [liveCount, setLiveCount] = useState(0)
  // 📊 배너 자동 롤링
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)

  // 전체 리그 목록 (전체 제외)
  const availableLeagues = LEAGUES.filter(l => l.code !== 'ALL')
  
  // 순위표용 리그 목록 (Nations League 제외)
  const standingsLeagues = availableLeagues.filter(l => l.code !== 'UNL')

  // 다크모드 토글
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // 📊 배너 자동 롤링 타이머 (5초마다)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % 3) // 0, 1, 2 순환
    }, 5000) // 5초마다 변경

    return () => clearInterval(timer)
  }, [])

  // HilltopAds 광고 로드 (임시 비활성화)
  /*
  useEffect(() => {
    // 모바일 체크 (lg 브레이크포인트: 1024px)
    const isMobile = window.innerWidth < 1024
    if (isMobile) return

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
  */


  // 🔴 라이브 경기 수 확인
  useEffect(() => {
    async function checkLive() {
      try {
        const response = await fetch('/api/live-matches')
        const data = await response.json()
        if (data.success) {
          setLiveCount(data.count)
          console.log('🔴 라이브 경기:', data.count, '개')
        }
      } catch (error) {
        console.error('❌ 라이브 경기 수 확인 실패:', error)
      }
    }

    checkLive()
    
    // 30초마다 확인
    const interval = setInterval(checkLive, 30000)
    return () => clearInterval(interval)
  }, [])

  // selectedLeague 변경 시 순위표 인덱스 동기화
  useEffect(() => {
    if (selectedLeague === 'ALL') return
    
    // Nations League 선택 시 순위표 숨김
    if (selectedLeague === 'UNL') {
      setStandings([])
      return
    }
    
    const leagueIndex = standingsLeagues.findIndex(l => l.code === selectedLeague)
    if (leagueIndex !== -1 && leagueIndex !== currentLeagueIndex) {
      setCurrentLeagueIndex(leagueIndex)
      setStandings(allLeagueStandings[selectedLeague] || [])
    }
  }, [selectedLeague, standingsLeagues, allLeagueStandings, currentLeagueIndex])

  // 자동 스크롤 효과 + 터치/마우스 드래그 지원 (데스크톱 & 모바일)
  useEffect(() => {
    // 🖥️ 데스크톱 자동 스크롤
    const desktopContainer = desktopScrollRef.current
    // 📱 모바일 자동 스크롤
    const mobileContainer = scrollContainerRef.current
    
    if (matches.length === 0) {
      console.log('⚠️ 자동 스크롤 중단: 경기 데이터 없음', { matchCount: matches.length })
      return
    }

    // 공통 설정
    const scrollSpeed = 0.5
    let desktopScrollPos = 0
    let mobileScrollPos = 0
    let desktopIntervalId: NodeJS.Timeout | null = null
    let mobileIntervalId: NodeJS.Timeout | null = null

    // 🖥️ 데스크톱 자동 스크롤
    if (desktopContainer) {
      console.log('✅ 데스크톱 자동 스크롤 시작:', { 
        matchCount: matches.length, 
        scrollWidth: desktopContainer.scrollWidth 
      })

      desktopIntervalId = setInterval(() => {
        desktopScrollPos += scrollSpeed
        desktopContainer.scrollLeft = desktopScrollPos
        
        const maxScroll = desktopContainer.scrollWidth / 2
        if (desktopScrollPos >= maxScroll) {
          desktopScrollPos = 0
          desktopContainer.scrollLeft = 0
        }
      }, 20)

      desktopContainer.style.cursor = 'grab'
    }

    // 📱 모바일 자동 스크롤
    if (mobileContainer) {
      console.log('✅ 모바일 자동 스크롤 시작:', { 
        matchCount: matches.length, 
        scrollWidth: mobileContainer.scrollWidth 
      })

      mobileIntervalId = setInterval(() => {
        mobileScrollPos += scrollSpeed
        mobileContainer.scrollLeft = mobileScrollPos
        
        const maxScroll = mobileContainer.scrollWidth / 2
        if (mobileScrollPos >= maxScroll) {
          mobileScrollPos = 0
          mobileContainer.scrollLeft = 0
        }
      }, 20)

      mobileContainer.style.cursor = 'grab'
    }

    // Cleanup
    return () => {
      if (desktopIntervalId) clearInterval(desktopIntervalId)
      if (mobileIntervalId) clearInterval(mobileIntervalId)
      if (desktopContainer) {
        desktopContainer.style.cursor = ''
      }
      if (mobileContainer) {
        mobileContainer.style.cursor = ''
      }
    }
  }, [matches])

  // 트렌드 데이터 로드 함수 (useEffect 밖으로 이동)
  const fetchTrendData = async (matchId: string, match?: any) => {
    try {
      // 🚀 캐시 확인
      const cacheKey = `trend_${matchId}`
      const cachedTrend = getCachedData(cacheKey)
      
      if (cachedTrend) {
        // 캐시 데이터도 시간순 정렬 확인
        const sortedCached = [...cachedTrend].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        setTrendData(prev => ({ ...prev, [matchId]: sortedCached }))
        console.log(`📦 캐시에서 트렌드 로드: ${matchId}`)
        return sortedCached
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
        // ✅ 시간순으로 정렬 (오름차순) - Lightweight Charts 요구사항
        const sortedData = [...result.data].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        
        // 💾 정렬된 데이터를 캐시에 저장
        setCachedData(cacheKey, sortedData)
        
        setTrendData(prev => ({ ...prev, [matchId]: sortedData }))
        console.log(`📈 Loaded trend for match ${matchId}:`, sortedData.length, 'points (sorted)')
        return sortedData
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
          // 캐시된 데이터도 번역 처리 🆕
          const translatedCached = await translateMatches(cachedMatches)
          setMatches(translatedCached)
          setLoading(false)
          console.log('✅ 캐시에서 경기 로드 (번역 완료):', translatedCached.length)
          return
        }
        
        // DB에서 실제 오즈만 가져오기
        let allMatches = []
        
        if (selectedLeague === 'ALL') {
          // 모든 리그의 경기 가져오기 (DB에서 오즈 포함)
          const leagues = ['CL', 'EL', 'UECL', 'UNL', 'PL', 'ELC', 'PD', 'BL1', 'SA', 'FL1']
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
          
          // 모든 결과 합치기 - 리그 코드 명시적으로 추가 및 필드 변환
          allMatches = results.flatMap(result => 
            result.data.map((match: any) => ({
              // DB 필드명을 프론트엔드 형식으로 변환
              id: match.match_id || match.id,  // ✅ match_id 우선!
              homeTeam: match.home_team || match.homeTeam,
              awayTeam: match.away_team || match.awayTeam,
              home_team_id: match.home_team_id,  // 🆕 팀 ID 추가
              away_team_id: match.away_team_id,  // 🆕 팀 ID 추가
              league: match.league || getLeagueName(match.league_code) || result.league,
              leagueCode: match.league_code || match.leagueCode || result.league,
              utcDate: match.commence_time || match.utcDate,
              homeCrest: match.home_team_logo || getTeamLogo(match.home_team || match.homeTeam),  // 🆕 DB 로고 우선
              awayCrest: match.away_team_logo || getTeamLogo(match.away_team || match.awayTeam),  // 🆕 DB 로고 우선
              // 확률 필드 변환
              homeWinRate: match.home_probability || match.homeWinRate || 33,
              drawRate: match.draw_probability || match.drawRate || 34,
              awayWinRate: match.away_probability || match.awayWinRate || 33,
              // 오즈 필드
              homeWinOdds: match.home_odds || match.homeWinOdds,
              drawOdds: match.draw_odds || match.drawOdds,
              awayWinOdds: match.away_odds || match.awayWinOdds,
              // 기타
              oddsSource: match.odds_source || match.oddsSource || 'db'
            }))
          )
        } else {
          // 단일 리그 경기 가져오기 (DB에서 오즈 포함)
          const response = await fetch(
            `/api/odds-from-db?league=${selectedLeague}`,
            {
              headers: {
                'Cache-Control': 'public, max-age=300' // 5분 캐시
              }
            }
          )
          
          if (!response.ok) {
            throw new Error('경기 데이터를 불러올 수 없습니다')
          }
          
          const result = await response.json()
          
          if (!result.success) {
            throw new Error(result.error || '데이터 로드 실패')
          }
          
          // 리그 코드 명시적으로 추가
          allMatches = (result.data || []).map((match: any) => ({
            // DB 필드명을 프론트엔드 형식으로 변환
            id: match.match_id || match.id,  // ✅ match_id 우선!
            homeTeam: match.home_team || match.homeTeam,
            awayTeam: match.away_team || match.awayTeam,
            home_team_id: match.home_team_id,  // 🆕 팀 ID 추가
            away_team_id: match.away_team_id,  // 🆕 팀 ID 추가
            league: match.league || getLeagueName(match.league_code) || selectedLeague,
            leagueCode: match.league_code || match.leagueCode,
            utcDate: match.commence_time || match.utcDate,
            homeCrest: match.home_team_logo || getTeamLogo(match.home_team || match.homeTeam),  // 🆕 DB 로고 우선
            awayCrest: match.away_team_logo || getTeamLogo(match.away_team || match.awayTeam),  // 🆕 DB 로고 우선
            // 확률 필드 변환 (probability → rate)
            homeWinRate: match.home_probability || match.homeWinRate || 33,
            drawRate: match.draw_probability || match.drawRate || 34,
            awayWinRate: match.away_probability || match.awayWinRate || 33,
            // 오즈 필드
            homeWinOdds: match.home_odds || match.homeWinOdds,
            drawOdds: match.draw_odds || match.drawOdds,
            awayWinOdds: match.away_odds || match.awayWinOdds,
            // 기타 필드
            oddsSource: match.odds_source || match.oddsSource || 'db'
          }))
        }
        
        console.log('🏈 DB에서 가져온 경기 (오즈 포함):', allMatches.length)
        if (allMatches.length > 0) {
          console.log('📋 첫 번째 경기 샘플:', {
            id: allMatches[0].id,
            homeTeam: allMatches[0].homeTeam,
            awayTeam: allMatches[0].awayTeam,
            homeWinRate: allMatches[0].homeWinRate,
            drawRate: allMatches[0].drawRate,
            awayWinRate: allMatches[0].awayWinRate
          })
        }
        
        // ✅ 중복 제거 (id + 팀 이름 조합 기준)
        const seenIds = new Set()
        const seenMatches = new Set()
        const uniqueMatches = allMatches.filter((match) => {
          const matchId = match.id || match.match_id
          
          // ID로 중복 체크
          if (matchId && seenIds.has(matchId)) {
            console.log('🔍 ID 중복 발견:', matchId, match.homeTeam, 'vs', match.awayTeam)
            return false
          }
          
          // 팀 이름 조합으로 중복 체크 (대소문자 무시, 공백 제거)
          const homeTeam = (match.homeTeam || '').toLowerCase().replace(/\s+/g, '')
          const awayTeam = (match.awayTeam || '').toLowerCase().replace(/\s+/g, '')
          const matchKey = `${homeTeam}-vs-${awayTeam}`
          
          if (seenMatches.has(matchKey)) {
            console.log('🔍 팀 조합 중복 발견:', match.homeTeam, 'vs', match.awayTeam)
            return false
          }
          
          // 중복이 아니면 추가
          if (matchId) seenIds.add(matchId)
          seenMatches.add(matchKey)
          return true
        })
        
        console.log('📊 중복 제거 결과:', allMatches.length, '→', uniqueMatches.length)
        
        // DB API는 이미 Match 형식으로 반환되며 실제 오즈 포함
        const convertedMatches = uniqueMatches
        
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
        
        // 🌐 팀명 한글 번역
        const translatedMatches = await translateMatches(futureMatches)
        
        setMatches(translatedMatches)
        
        // 🆕 라인업 상태 체크
        if (translatedMatches.length > 0) {
          checkLineupStatus(translatedMatches)
        }
        
        // 🆕 트렌드 데이터 자동 로드 (모든 경기)
        console.log('📊 트렌드 데이터 자동 로드 시작...')
        for (const match of translatedMatches.slice(0, 10)) { // 처음 10경기만
          fetchTrendData(match.id.toString(), match)
        }
        
      } catch (error: any) {
        console.error('❌ 에러:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }
    
    // 🆕 라인업 상태 체크 함수
    const checkLineupStatus = async (matches: Match[]) => {
      const statusMap: Record<number, any> = {}
      
      for (const match of matches) {
        try {
          const response = await fetch(`/api/lineup-status?fixtureId=${match.id}`)
          const data = await response.json()
          
          if (data.success && data.lineupAvailable) {
            statusMap[match.id] = {
              available: true,
              homeFormation: data.homeFormation,
              awayFormation: data.awayFormation,
            }
            console.log(`⚽ 라인업 발표: ${match.homeTeam} (${data.homeFormation}) vs ${match.awayTeam} (${data.awayFormation})`)
          }
        } catch (error) {
          console.error(`❌ Error checking lineup for match ${match.id}:`, error)
        }
      }
      
      setLineupStatus(statusMap)
    }
    
    // 트렌드 데이터 로드 (동기 버전 - Promise 반환)
    async function fetchTrendDataSync(matchId: string, match: any): Promise<TrendData[] | null> {
      try {
        // 🚀 캐시 확인
        const cacheKey = `trend_${matchId}`
        const cachedTrend = getCachedData(cacheKey)
        
        if (cachedTrend) {
          // 캐시 데이터도 시간순 정렬 확인
          const sortedCached = [...cachedTrend].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
          setTrendData(prev => ({ ...prev, [matchId]: sortedCached }))
          return sortedCached
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
          // ✅ 시간순으로 정렬 (오름차순) - Lightweight Charts 요구사항
          const sortedData = [...result.data].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
          
          console.log(`📈 Loaded trend for match ${matchId}:`, sortedData.length, 'points (sorted)')
          
          // 💾 정렬된 데이터를 캐시에 저장
          setCachedData(cacheKey, sortedData)
          
          setTrendData(prev => ({ ...prev, [matchId]: sortedData }))
          return sortedData
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
      // 전체 리그 선택 시 모든 리그의 순위표 로드 (Nations League 제외)
      setStandingsLoading(true)
      const allStandings: { [key: string]: any[] } = {}
      
      for (const l of standingsLeagues) {
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
      if (standingsLeagues.length > 0) {
        setStandings(allStandings[standingsLeagues[0].code] || [])
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
      setTimeout(() => {
        const chartContainer = document.getElementById(`trend-chart-${expandedMatchId}`)
        if (chartContainer) {
          // 데이터가 없어도 렌더링 시도 (renderChart가 메시지 표시)
          if (currentTrend && currentTrend.length > 0) {
            console.log('📈 차트 자동 렌더링:', currentTrend.length, 'points')
            renderChart(chartContainer, currentTrend)
          } else {
            console.log('📊 차트 렌더링: 데이터 수집 중 메시지 표시')
            renderChart(chartContainer, [])
          }
        }
      }, 200)
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
      
      // 🔥 카드 클릭 시 항상 트렌드 데이터 새로고침
      console.log('📊 트렌드 데이터 강제 새로고침:', match.id)
      const freshTrend = await fetchTrendData(match.id.toString(), match)
                  
      setTimeout(() => {
        const chartContainer = document.getElementById(`trend-chart-${match.id}`)
        const currentTrend = freshTrend || trendData[match.id]
        
        // 트렌드 데이터가 있을 때만 차트 렌더링
        if (chartContainer) {
          if (currentTrend && currentTrend.length > 0) {
            console.log('📈 차트 렌더링 시작:', currentTrend.length, 'points')
            renderChart(chartContainer, currentTrend)
          } else {
            console.log('⚠️ 차트 렌더링 실패 - 데이터 없음')
            // renderChart가 알아서 "데이터 수집 중" 메시지 표시
            renderChart(chartContainer, [])
          }
        }
      }, 100)
    }
  }

  // 차트 렌더링 함수
  function renderChart(container: HTMLElement, trend: TrendData[]) {
    container.innerHTML = ''

    // ✅ 최소 데이터 포인트 체크: 최소 2개 이상 필요
    if (!trend || trend.length < 2) {
      console.log('⚠️ 트렌드 데이터 부족:', trend?.length || 0, '개 (최소 2개 필요)')
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-[300px] text-center ${darkMode ? 'bg-black' : 'bg-white'} rounded-lg">
          <div class="text-6xl mb-4">📊</div>
          <div class="text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2">
            트렌드 데이터 수집 중...
          </div>
          <div class="text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
            30분마다 자동으로 데이터가 업데이트됩니다
          </div>
          <div class="flex items-center gap-4 px-6 py-3 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-gray-100'}">
            <div class="text-center">
              <div class="text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}">${trend?.length || 0}</div>
              <div class="text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}">현재</div>
            </div>
            <div class="text-2xl ${darkMode ? 'text-gray-700' : 'text-gray-300'}">/</div>
            <div class="text-center">
              <div class="text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}">48+</div>
              <div class="text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}">목표 (24시간)</div>
            </div>
          </div>
          <div class="mt-4 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}">
            💡 24시간 후 완전한 트렌드 차트를 확인하실 수 있습니다
          </div>
        </div>
      `
      return
    }

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

    // 중복 시간 제거 및 데이터 준비
    const uniqueTrend: TrendData[] = []
    const seenTimes = new Set<number>()
    
    for (const point of trend) {
      const timeInSeconds = Math.floor(new Date(point.timestamp).getTime() / 1000)
      if (!seenTimes.has(timeInSeconds)) {
        seenTimes.add(timeInSeconds)
        uniqueTrend.push(point)
      }
    }
    
    console.log(`📊 차트 데이터: 전체 ${trend.length}개, 고유 ${uniqueTrend.length}개`)

    const homeData = uniqueTrend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.homeWinProbability,
    }))

    const drawData = uniqueTrend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.drawProbability,
    }))

    const awayData = uniqueTrend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.awayWinProbability,
    }))

    homeSeries.setData(homeData)
    drawSeries.setData(drawData)
    awaySeries.setData(awayData)

    // 데이터 포인트 마커 추가 (각 시간대별)
    const markers = uniqueTrend.map((point, index) => {
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
      {/* SEO용 H1 태그 - 화면에서 숨김 */}
      <h1 className="sr-only">
        실시간 해외축구 경기 예측 & 프리뷰 플랫폼 · Trend Soccer
      </h1>
      
      {/* 승률 배너 (자동 스크롤) */}
      
      {/* 데스크톱: 세로형 카드 */}
      <div className="hidden md:block bg-[#0f0f0f] border-b border-gray-900">
        <div className="py-4 overflow-hidden">
          <div 
            ref={desktopScrollRef}
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
              
              const homeTeam = currentLanguage === 'ko' 
                ? (match.homeTeamKR || match.homeTeam)
                : match.homeTeam
              const homeTeamDisplay = homeTeam.length > 15 
                ? homeTeam.substring(0, 15) + '...' 
                : homeTeam
              
              const awayTeam = currentLanguage === 'ko'
                ? (match.awayTeamKR || match.awayTeam)
                : match.awayTeam
              const awayTeamDisplay = awayTeam.length > 15 
                ? awayTeam.substring(0, 15) + '...' 
                : awayTeam
              
              const isHomeWinning = homeWin > awayWin
              const winningTeam = isHomeWinning ? homeTeamDisplay : awayTeamDisplay
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
                        {isHomeWinning ? (currentLanguage === 'ko' ? '홈' : 'Home') : (currentLanguage === 'ko' ? '원정' : 'Away')}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`text-2xl font-black mb-1 ${
                    darkMode ? 'text-white' : 'text-black'
                  }`}>
                    {winProbability}%
                  </div>
                  <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {currentLanguage === 'ko' ? '승률' : 'Win Probability'}
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

      {/* 모바일: 콤팩트 가로형 */}
      <div className="md:hidden bg-[#0f0f0f] border-b border-gray-900">
        <div className="py-2 overflow-hidden">
          <div 
            ref={scrollContainerRef}
            className="flex gap-2 px-3 overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'auto' }}
          >
            {(() => {
              const uniqueMatches = matches.slice(0, 20)
              return [...uniqueMatches, ...uniqueMatches].map((match, index) => {
                const currentTrend = trendData[match.id]
                const latestTrend = currentTrend?.[currentTrend.length - 1]
                
                const homeWin = latestTrend 
                  ? Math.round(latestTrend.homeWinProbability)
                  : match.homeWinRate
                const awayWin = latestTrend 
                  ? Math.round(latestTrend.awayWinProbability)
                  : match.awayWinRate
                
                const homeTeam = currentLanguage === 'ko' 
                  ? (match.homeTeamKR || match.homeTeam)
                  : match.homeTeam
                const homeTeamDisplay = homeTeam.length > 8 
                  ? homeTeam.substring(0, 8) + '...' 
                  : homeTeam
                
                const awayTeam = currentLanguage === 'ko'
                  ? (match.awayTeamKR || match.awayTeam)
                  : match.awayTeam
                const awayTeamDisplay = awayTeam.length > 8 
                  ? awayTeam.substring(0, 8) + '...' 
                  : awayTeam
                
                const isHomeWinning = homeWin > awayWin
                const winningTeam = isHomeWinning ? homeTeamDisplay : awayTeamDisplay
                const winningCrest = isHomeWinning ? match.homeCrest : match.awayCrest
                const winProbability = isHomeWinning ? homeWin : awayWin
                
                return (
                  <div
                    key={`mobile-${match.id}-${index}`}
                    onClick={() => {
                      const element = document.getElementById(`match-card-${match.id}`)
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                      handleMatchClick(match)
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all bg-[#1a1a1a] border border-gray-800 whitespace-nowrap ${
                      expandedMatchId === match.id ? 'ring-2 ring-blue-500' : 'hover:border-gray-700'
                    }`}
                  >
                    <img 
                      src={winningCrest} 
                      alt={winningTeam} 
                      className="w-6 h-6 flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><text y="18" font-size="18">⚽</text></svg>'
                      }}
                    />
                    <span className="text-sm font-bold text-white">
                      {winningTeam}
                    </span>
                    <span className="text-lg font-black text-blue-400">
                      {winProbability}%
                    </span>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      </div>

      {/* 트렌드 컨텐츠 영역 */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8 relative">
          {/* 광고 배너 - Popular Leagues 왼쪽에 배치 (PC 전용) */}
          <aside className={`hidden xl:block flex-shrink-0 w-[300px]`} style={{ marginLeft: '-332px' }}>
            <div className="sticky top-20">
              <div className="overflow-hidden">
                <a 
                  href="https://spolive.com/affliate?recom=9074eed9688dbd8f22cb7175ebf3084b:71103256801980d9316782d7299c6bc0" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block hover:opacity-90 transition-opacity"
                  onClick={(e) => {
                    // URL이 설정될 때까지 클릭 방지
                    if (e.currentTarget.href === '#' || e.currentTarget.href.endsWith('#')) {
                      e.preventDefault()
                    }
                  }}
                >
                  <img 
                    src="/ad-banner-300x600.png" 
                    alt="Advertisement"
                    className="w-[300px] h-[600px] object-cover"
                    onError={(e) => {
                      // GIF 로드 실패 시 JPG로 폴백
                      if (e.currentTarget.src.endsWith('.gif')) {
                        e.currentTarget.src = '/ad-banner-300x600.jpg'
                      } else {
                        // JPG도 실패하면 플레이스홀더
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="600"><rect width="300" height="600" fill="%231a1a1a"/><text x="150" y="300" text-anchor="middle" fill="%23666" font-size="20">Advertisement</text><text x="150" y="330" text-anchor="middle" fill="%23444" font-size="14">300 x 600</text></svg>'
                      }
                    }}
                  />
                </a>
              </div>
            </div>
          </aside>

          {/* 왼쪽 사이드바: Popular Leagues (PC 전용) */}
          <aside className={`hidden lg:block w-64 flex-shrink-0`}>
            <div className="space-y-6">
              {/* Popular Leagues */}
              <div className={`rounded-2xl p-4 ${
                darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
              }`}>
                <h2 className={`text-lg font-bold mb-4 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {currentLanguage === 'ko' ? '인기 리그' : 'Popular Leagues'}
                </h2>
                <nav className="space-y-2">
                  {LEAGUES
                    .filter(league => LEAGUES_WITH_ODDS.includes(league.code))
                    .map((league) => (
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
                      <span className="text-sm">{currentLanguage === 'ko' ? league.name : league.nameEn}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* 블로그 미리보기 */}
              <BlogPreviewSidebar darkMode={darkMode} />
            </div>
          </aside>

          {/* 메인 콘텐츠 */}
          <main className="flex-1 min-w-0">
            
            {/* 🔴 라이브 중계 배너 */}
            {liveCount > 0 && (
              <a 
                href="/live"
                className={`block mb-6 rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.02] ${
                  darkMode 
                    ? 'bg-gradient-to-r from-red-600 via-pink-600 to-purple-600' 
                    : 'bg-gradient-to-r from-red-500 via-pink-500 to-purple-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">
                        🔴 {currentLanguage === 'ko' ? `지금 ${liveCount}개 경기 진행 중!` : `${liveCount} Live Matches Now!`}
                      </h2>
                      <p className="text-white/90 text-sm">
                        {currentLanguage === 'ko' 
                          ? '실시간 점수와 배당 변화를 확인하세요 • 15초마다 자동 업데이트'
                          : 'Check live scores and odds • Auto-update every 15 seconds'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-white text-5xl font-bold hidden sm:block">
                    →
                  </div>
                </div>
              </a>
            )}
            
            {/* 상단 배너 728x90 - 날짜 필터 위 (데스크톱 전용) */}
            <div className="hidden lg:block mb-6">
              <div className={`rounded-xl overflow-hidden mx-auto`} style={{ maxWidth: '728px' }}>
                <a 
                  href="https://spolive.com/affliate?recom=9074eed9688dbd8f22cb7175ebf3084b:71103256801980d9316782d7299c6bc0" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block hover:opacity-90 transition-opacity"
                >
                  <img 
                    src="/ad-banner-728x90.png" 
                    alt="Advertisement"
                    className="w-full h-[90px] object-cover"
                    onError={(e) => {
                      // PNG 로드 실패 시 GIF로 폴백
                      if (e.currentTarget.src.endsWith('.png')) {
                        e.currentTarget.src = '/ad-banner-728x90.gif'
                      } else if (e.currentTarget.src.endsWith('.gif')) {
                        e.currentTarget.src = '/ad-banner-728x90.jpg'
                      } else {
                        // 모두 실패하면 숨김
                        e.currentTarget.style.display = 'none'
                      }
                    }}
                  />
                </a>
              </div>
            </div>

        {/* 날짜 필터 */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 px-2">
            {[
              { value: 'today', labelKo: '오늘', labelEn: 'Today' },
              { value: 'tomorrow', labelKo: '내일', labelEn: 'Tomorrow' },
              { value: 'week', labelKo: '이번 주', labelEn: 'This Week' },
              { value: 'upcoming', labelKo: '다가오는 경기', labelEn: 'Upcoming' }
            ].map((date) => (
              <button
                key={date.value}
                onClick={() => {
                  setSelectedDate(date.value)
                  setCurrentPage(1) // 날짜 변경 시 1페이지로 리셋
                  setShowFallbackBanner(false) // 배너 숨김
                }}
                className={`px-4 md:px-6 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  selectedDate === date.value
                    ? darkMode 
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-blue-500 text-white shadow-lg'
                    : darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {currentLanguage === 'ko' ? date.labelKo : date.labelEn}
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
              {t.status.loading}
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
                              {currentLanguage === 'ko' ? '이번 주 예정된 경기가 없습니다' : 'No matches scheduled this week'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {currentLanguage === 'ko' ? '가장 가까운 경기를 보여드립니다' : 'Showing nearest available matches'}
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
                      <p className="text-xl mb-2">
                        {currentLanguage === 'ko' ? '선택한 날짜에 예정된 경기가 없습니다.' : 'No matches scheduled for the selected date.'}
                      </p>
                      <p className="text-sm">
                        {currentLanguage === 'ko' ? '다른 날짜를 선택해보세요!' : 'Try selecting a different date!'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {paginatedMatches.map((match, index) => {
              const currentTrend = trendData[match.id]
              const latestTrend = currentTrend?.[currentTrend.length - 1]
              const previousTrend = currentTrend?.[currentTrend.length - 2]
              
              // 표시할 확률 (트렌드 최신값 또는 DB의 초기값)
              const displayHomeProb = latestTrend ? latestTrend.homeWinProbability : (match.homeWinRate || 33.3)
              const displayDrawProb = latestTrend ? latestTrend.drawProbability : (match.drawRate || 33.3)
              const displayAwayProb = latestTrend ? latestTrend.awayWinProbability : (match.awayWinRate || 33.3)
              
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
                    className={`
                      relative rounded-2xl transition-all duration-200
                      ${darkMode 
                        ? 'bg-[#1a1a1a] border border-gray-800' 
                        : 'bg-white border border-gray-200'
                      }
                    `}
                  >
                    {/* 상단: 리그 정보 + 날짜/시간 + H2H 버튼 */}
                    <div className={`flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b ${
                      darkMode ? 'border-gray-800' : 'border-gray-200'
                    }`}>
                      {/* 왼쪽: 리그 정보 + 날짜/시간 */}
                      <div className="flex items-center gap-3">
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
                        
                        {/* 리그명 - 모바일 숨김 */}
                        <span className={`hidden md:inline text-base font-bold ${
                          darkMode ? 'text-white' : 'text-black'
                        }`}>
                          {match.league}
                        </span>
                        
                        {/* 구분선 - 모바일 숨김 */}
                        <span className={`hidden md:inline text-base ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>|</span>
                        
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
                          {formatTime(match.utcDate)}
                        </span>
                      </div>

                      {/* 오른쪽: 라인업 버튼 + 상대전적 버튼 */}
                      <div className="flex items-center gap-2">
                        {/* 🆕 라인업 보기 버튼 - 항상 표시, 발표 여부에 따라 스타일 변경 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (lineupStatus[match.id]?.available) {
                              setSelectedMatchForLineup(match)
                              setLineupModalOpen(true)
                            }
                          }}
                          disabled={!lineupStatus[match.id]?.available}
                          className={`
                            relative flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm
                            transition-all shadow-sm
                            ${lineupStatus[match.id]?.available
                              ? // 라인업 발표됨 - 활성화
                                darkMode 
                                  ? 'bg-green-600 hover:bg-green-500 text-white border border-green-500 hover:scale-105 active:scale-95 cursor-pointer' 
                                  : 'bg-green-600 hover:bg-green-700 text-white border border-green-500 hover:scale-105 active:scale-95 cursor-pointer'
                              : // 라인업 미발표 - 비활성화
                                darkMode
                                  ? 'bg-gray-700 text-gray-500 border border-gray-600 cursor-not-allowed opacity-50'
                                  : 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed opacity-50'
                            }
                          `}
                          title={
                            lineupStatus[match.id]?.available
                              ? `라인업: ${lineupStatus[match.id]?.homeFormation} vs ${lineupStatus[match.id]?.awayFormation}`
                              : '라인업 미발표 (경기 시작 1시간 전 발표 예정)'
                          }
                        >
                          {/* NEW 배지 - 라인업 발표시만 표시 */}
                          {lineupStatus[match.id]?.available && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                              NEW
                            </span>
                          )}
                          
                          {/* 아이콘 - 발표 여부에 따라 변경 */}
                          <span>
                            {lineupStatus[match.id]?.available ? '⚽' : '🔒'}
                          </span>
                          
                          {/* 텍스트 */}
                          <span className="hidden sm:inline">
                            {currentLanguage === 'ko' ? '라인업' : 'Lineup'}
                          </span>
                        </button>
                      </div>
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
                            {currentLanguage === 'ko' ? (match.homeTeamKR || match.homeTeam) : match.homeTeam}
                          </span>
                          
                          {/* VS 공간 유지 */}
                          <div className="w-12"></div>
                          
                          {/* 원정팀 이름 - 왼쪽 정렬 */}
                          <span className={`font-bold text-sm text-left flex-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {currentLanguage === 'ko' ? (match.awayTeamKR || match.awayTeam) : match.awayTeam}
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
                              width: `${displayHomeProb}%` 
                            }}
                          ></div>
                          
                          <div className="relative z-10 flex flex-col items-center">
                            <div className="text-xs font-medium mb-1 text-gray-500">
                              홈
                            </div>
                            <div className={`text-2xl md:text-4xl font-black transition-all duration-500 ${
                              darkMode ? 'text-white' : 'text-black'
                            } ${homeChange > 0 ? 'animate-pulse' : ''}`}>
                              {Math.round(displayHomeProb)}%
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
                              width: `${displayDrawProb}%` 
                            }}
                          ></div>
                          
                          <div className="relative z-10 flex flex-col items-center">
                            <div className="text-xs font-medium mb-1 text-gray-500">
                              무승부
                            </div>
                            <div className="text-2xl md:text-4xl font-black text-gray-400">
                              {Math.round(displayDrawProb)}%
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
                              width: `${displayAwayProb}%` 
                            }}
                          ></div>
                          
                          <div className="relative z-10 flex flex-col items-center">
                            <div className="text-xs font-medium mb-1 text-gray-500">
                              원정
                            </div>
                            <div className={`text-2xl md:text-4xl font-black transition-all duration-500 text-white ${
                              awayChange > 0 ? 'animate-pulse' : ''
                            }`}>
                              {Math.round(displayAwayProb)}%
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
                      
                      {/* AI 경기 예측 분석 */}
                      <MatchPrediction
                        fixtureId={match.id}
                        homeTeam={match.homeTeam}
                        awayTeam={match.awayTeam}
                        homeTeamKR={match.homeTeamKR}     // ✅ 한글 팀명
                        awayTeamKR={match.awayTeamKR}     // ✅ 한글 팀명
                        homeTeamId={match.home_team_id}
                        awayTeamId={match.away_team_id}
                        trendData={trendData[match.id] || []}  // 🆕 트렌드 데이터 전달
                        darkMode={darkMode}
                      />
                      
                    </div>
                  </div>

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
                  {currentLanguage === 'ko' ? '이전' : 'Previous'}
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
                  {currentLanguage === 'ko' ? '다음' : 'Next'}
                </button>
                
                <span className={`ml-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {currentLanguage === 'ko' 
                    ? `${currentPage} / ${totalPages} 페이지 (총 ${totalMatches}경기)`
                    : `Page ${currentPage} / ${totalPages} (${totalMatches} matches)`
                  }
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

          </main>

          {/* 우측 순위표 사이드바 */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            {/* HilltopAds - 순위표 위 배너 (데스크톱 전용) - 임시 비활성화 */}
            {/* 
            <div className={`hidden lg:block mb-6 rounded-xl overflow-hidden ${
              darkMode ? 'bg-[#1a1a1a]' : 'bg-white border border-gray-200'
            }`}>
              <div className="p-4">
                <div id="hilltop-ad-container"></div>
              </div>
            </div>
            */}
            
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
                          ? standingsLeagues.length - 1 
                          : currentLeagueIndex - 1
                        setCurrentLeagueIndex(newIndex)
                        setStandings(allLeagueStandings[standingsLeagues[newIndex].code] || [])
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
                        {standingsLeagues[currentLeagueIndex]?.name || '프리미어리그'}
                      </h2>
                      <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center">
                        {standingsLeagues[currentLeagueIndex]?.isEmoji ? (
                          <span className="text-2xl">{standingsLeagues[currentLeagueIndex]?.logo}</span>
                        ) : (
                          <img 
                            src={standingsLeagues[currentLeagueIndex]?.logo}
                            alt={standingsLeagues[currentLeagueIndex]?.name}
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
                        const newIndex = currentLeagueIndex === standingsLeagues.length - 1 
                          ? 0 
                          : currentLeagueIndex + 1
                        setCurrentLeagueIndex(newIndex)
                        setStandings(allLeagueStandings[standingsLeagues[newIndex].code] || [])
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

      {/* H2H 모달 */}
      {selectedMatch && (
        <H2HModal
          isOpen={h2hModalOpen}
          onClose={() => {
            setH2hModalOpen(false)
            setSelectedMatch(null)
          }}
          homeTeam={selectedMatch.homeTeam}
          awayTeam={selectedMatch.awayTeam}
          league={selectedMatch.leagueCode}
          homeTeamLogo={selectedMatch.homeCrest}
          awayTeamLogo={selectedMatch.awayCrest}
        />
      )}

      {/* 🆕 라인업 모달 */}
      {lineupModalOpen && selectedMatchForLineup && (
        <LineupModal
          isOpen={lineupModalOpen}
          onClose={() => {
            setLineupModalOpen(false)
            setSelectedMatchForLineup(null)
          }}
          fixtureId={selectedMatchForLineup.id}
          homeTeam={selectedMatchForLineup.homeTeam}
          awayTeam={selectedMatchForLineup.awayTeam}
          darkMode={darkMode}
        />
      )}
    </div>
  )
}