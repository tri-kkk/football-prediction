'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useLanguage } from '../contexts/LanguageContext'
import AdBanner from '../components/AdBanner'
import AdSenseAd from '../components/AdSenseAd'
import { getTeamLogo } from '../teamLogos'

// ============================================
// 다국어 텍스트
// ============================================

const texts = {
  ko: {
    title: '경기 예측',
    subtitle: '선제골 + 폼 기반 통계 분석',
    total: '총',
    matches: '경기',
    analyzed: '분석',
    home: '홈',
    draw: '무',
    away: '원정',
    homeWin: '홈승',
    drawResult: '무승부',
    awayWin: '원정승',
    loading: '경기 로딩 중...',
    noMatches: '예정된 경기가 없습니다',
    analyze: '통계 분석',
    afterOpen: '후 오픈',
    matchStart: '경기 시작',
    powerIndex: '파워 지수',
    finalProb: '최종 예측 확률',
    teamStats: '팀 상세 통계',
    firstGoalWin: '선제골 승률',
    comebackRate: '역전률',
    recentForm: '최근 폼',
    goalRatio: '득실비',
    method3Analysis: '3-Method 분석',
    paCompare: 'P/A 비교',
    minMax: 'Min-Max',
    firstGoal: '선제골',
    pattern: '패턴',
    basedOn: '경기 기반',
    patternHistory: '패턴 역대',
    analysisResult: '분석 결과',
    analysisReason: '분석 근거',
    odds: '배당',
    winRate: '승률',
    powerDiff: '파워차',
    confidence: '신뢰도',
    high: '높음',
    medium: '보통',
    low: '낮음',
    veryLow: '참고',
    value: '밸류',
    fair: '적정',
    poor: '낮음',
    skip: '패스',
    close: '닫기',
    expand: '상세보기',
    refresh: '새로고침',
    disclaimer: '※ 이 예측은 통계 기반이며, 베팅 손실에 대한 책임을 지지 않습니다.',
  },
  en: {
    title: 'Match Prediction',
    subtitle: 'First Goal + Form Based Analysis',
    total: 'Total',
    matches: 'matches',
    analyzed: 'Analyzed',
    home: 'H',
    draw: 'D',
    away: 'A',
    homeWin: 'Home',
    drawResult: 'Draw',
    awayWin: 'Away',
    loading: 'Loading matches...',
    noMatches: 'No upcoming matches',
    analyze: 'Analyze',
    afterOpen: 'until open',
    matchStart: 'Match started',
    powerIndex: 'Power Index',
    finalProb: 'Final Probability',
    teamStats: 'Team Statistics',
    firstGoalWin: '1st Goal Win%',
    comebackRate: 'Comeback%',
    recentForm: 'Recent Form',
    goalRatio: 'Goal Ratio',
    method3Analysis: '3-Method Analysis',
    paCompare: 'P/A Compare',
    minMax: 'Min-Max',
    firstGoal: 'First Goal',
    pattern: 'Pattern',
    basedOn: 'matches',
    patternHistory: 'Pattern History',
    analysisResult: 'Result',
    analysisReason: 'Reasoning',
    odds: 'Odds',
    winRate: 'Win%',
    powerDiff: 'Power',
    confidence: 'Conf.',
    high: 'High',
    medium: 'Med',
    low: 'Low',
    veryLow: 'Ref',
    value: 'Value',
    fair: 'Fair',
    poor: 'Poor',
    skip: 'Skip',
    close: 'Close',
    expand: 'Details',
    refresh: 'Refresh',
    disclaimer: '※ This prediction is statistics-based. We are not responsible for betting losses.',
  }
}

// ============================================
// 팀명 한글 매핑
// ============================================

const teamNameKo: Record<string, string> = {
  // Premier League
  'Arsenal': '아스날',
  'Aston Villa': '아스톤 빌라',
  'Bournemouth': '본머스',
  'Brentford': '브렌트포드',
  'Brighton': '브라이튼',
  'Brighton & Hove Albion': '브라이튼',
  'Chelsea': '첼시',
  'Crystal Palace': '크리스탈 팰리스',
  'Everton': '에버튼',
  'Fulham': '풀럼',
  'Ipswich': '입스위치',
  'Ipswich Town': '입스위치',
  'Leicester': '레스터',
  'Leicester City': '레스터',
  'Liverpool': '리버풀',
  'Manchester City': '맨시티',
  'Manchester United': '맨유',
  'Newcastle': '뉴캐슬',
  'Newcastle United': '뉴캐슬',
  'Nottingham Forest': '노팅엄',
  "Nott'ham Forest": '노팅엄',
  'Southampton': '사우샘프턴',
  'Tottenham': '토트넘',
  'Tottenham Hotspur': '토트넘',
  'West Ham': '웨스트햄',
  'West Ham United': '웨스트햄',
  'Wolverhampton': '울버햄튼',
  'Wolves': '울버햄튼',
  // La Liga
  'Real Madrid': '레알 마드리드',
  'Barcelona': '바르셀로나',
  'Atletico Madrid': '아틀레티코',
  'Sevilla': '세비야',
  'Real Sociedad': '레알 소시에다드',
  'Real Betis': '레알 베티스',
  'Villarreal': '비야레알',
  'Athletic Bilbao': '아틀레틱 빌바오',
  'Athletic Club': '아틀레틱 빌바오',
  'Valencia': '발렌시아',
  'Osasuna': '오사수나',
  'Celta Vigo': '셀타 비고',
  'Mallorca': '마요르카',
  'Girona': '지로나',
  'Getafe': '헤타페',
  'Alaves': '알라베스',
  'Las Palmas': '라스 팔마스',
  'Espanyol': '에스파뇰',
  'Leganes': '레가네스',
  'Valladolid': '바야돌리드',
  'Rayo Vallecano': '라요 바예카노',
  // Bundesliga
  'Bayern Munich': '바이에른',
  'Bayern München': '바이에른',
  'Borussia Dortmund': '도르트문트',
  'RB Leipzig': '라이프치히',
  'Bayer Leverkusen': '레버쿠젠',
  'Eintracht Frankfurt': '프랑크푸르트',
  'VfB Stuttgart': '슈투트가르트',
  'VfL Wolfsburg': '볼프스부르크',
  'Wolfsburg': '볼프스부르크',
  'Borussia Mönchengladbach': '묀헨글라트바흐',
  "Borussia M'gladbach": '묀헨글라트바흐',
  'SC Freiburg': '프라이부르크',
  'Freiburg': '프라이부르크',
  'TSG Hoffenheim': '호펜하임',
  '1899 Hoffenheim': '호펜하임',
  'FSV Mainz 05': '마인츠',
  'Mainz 05': '마인츠',
  'Mainz': '마인츠',
  'FC Augsburg': '아우크스부르크',
  'Augsburg': '아우크스부르크',
  'Werder Bremen': '베르더 브레멘',
  'Union Berlin': '우니온 베를린',
  'FC Köln': '쾰른',
  '1. FC Köln': '쾰른',
  'Heidenheim': '하이덴하임',
  '1. FC Heidenheim 1846': '하이덴하임',
  'VfL Bochum': '보훔',
  'Bochum': '보훔',
  'FC St. Pauli': '장크트 파울리',
  'St. Pauli': '장크트 파울리',
  'Holstein Kiel': '홀슈타인 킬',
  // Serie A
  'Inter': '인테르',
  'Inter Milan': '인테르',
  'AC Milan': 'AC밀란',
  'Milan': 'AC밀란',
  'Juventus': '유벤투스',
  'Napoli': '나폴리',
  'AS Roma': '로마',
  'Roma': '로마',
  'Lazio': '라치오',
  'Atalanta': '아탈란타',
  'Fiorentina': '피오렌티나',
  'Bologna': '볼로냐',
  'Torino': '토리노',
  'Udinese': '우디네세',
  'Sassuolo': '사수올로',
  'Empoli': '엠폴리',
  'Salernitana': '살레르니타나',
  'Lecce': '레체',
  'Verona': '베로나',
  'Hellas Verona': '베로나',
  'Cagliari': '칼리아리',
  'Genoa': '제노아',
  'Monza': '몬차',
  'Frosinone': '프로시노네',
  'Parma': '파르마',
  'Venezia': '베네치아',
  'Como': '코모',
  // Ligue 1
  'Paris Saint-Germain': 'PSG',
  'Paris Saint Germain': 'PSG',
  'PSG': 'PSG',
  'Marseille': '마르세유',
  'Olympique Marseille': '마르세유',
  'Monaco': '모나코',
  'AS Monaco': '모나코',
  'Lyon': '리옹',
  'Olympique Lyon': '리옹',
  'Lille': '릴',
  'Nice': '니스',
  'OGC Nice': '니스',
  'Lens': '랑스',
  'Rennes': '렌',
  'Stade Rennes': '렌',
  'Strasbourg': '스트라스부르',
  'Nantes': '낭트',
  'FC Nantes': '낭트',
  'Montpellier': '몽펠리에',
  'Toulouse': '툴루즈',
  'Reims': '랭스',
  'Brest': '브레스트',
  'Stade Brestois 29': '브레스트',
  'Le Havre': '르아브르',
  'Lorient': '로리앙',
  'Metz': '메스',
  'Clermont': '클레르몽',
  'Auxerre': '오세르',
  'Angers': '앙제',
  'Saint-Etienne': '생테티엔',
  // Eredivisie
  'Ajax': '아약스',
  'PSV': 'PSV',
  'PSV Eindhoven': 'PSV',
  'Feyenoord': '페예노르트',
  'AZ Alkmaar': 'AZ',
  'AZ': 'AZ',
  'FC Twente': '트벤테',
  'Twente': '트벤테',
  'FC Utrecht': '위트레흐트',
  'Utrecht': '위트레흐트',
  'Vitesse': '비테세',
  'Heerenveen': '헤이렌베인',
  'SC Heerenveen': '헤이렌베인',
  'NEC Nijmegen': 'NEC',
  'NEC': 'NEC',
  'FC Groningen': '흐로닝언',
  'Groningen': '흐로닝언',
  'Sparta Rotterdam': '스파르타',
  'Go Ahead Eagles': '고 어헤드',
  'Fortuna Sittard': '포르투나',
  'RKC Waalwijk': 'RKC',
  'Excelsior': '엑셀시오르',
  'Almere City': '알메르',
  'Heracles': '헤라클레스',
  'PEC Zwolle': 'PEC 즈볼레',
  'Willem II': '빌렘 II',
  'NAC Breda': 'NAC',
}

// ============================================
// 타입 정의
// ============================================

interface MatchOdds {
  id?: string
  match_id: number
  league_code: string
  home_team: string
  away_team: string
  home_team_id?: number
  away_team_id?: number
  commence_time: string
  home_odds: number
  draw_odds: number
  away_odds: number
  home_team_logo?: string
  away_team_logo?: string
}

interface PredictionResult {
  homeTeam: string
  awayTeam: string
  homePower?: number
  awayPower?: number
  homePA?: {
    all: number
    five: number
    firstGoal: number
  }
  awayPA?: {
    all: number
    five: number
    firstGoal: number
  }
  method1?: {
    win: number
    draw: number
    lose: number
  }
  method2?: {
    win: number
    draw: number
    lose: number
  }
  method3?: {
    win: number
    draw: number
    lose: number
  }
  marketProb?: {
    home: number
    draw: number
    away: number
  }
  firstGoalAdjusted?: {
    home: number
    draw: number
    away: number
  }
  pattern: string
  patternStats: {
    totalMatches: number
    homeWinRate: number
    drawRate: number
    awayWinRate: number
    confidence?: string
  } | null
  finalProb: {
    home: number
    draw: number
    away: number
  }
  recommendation: {
    pick: string
    grade: 'PICK' | 'GOOD' | 'PASS'
    reasons: string[]
  }
  debug?: any
}

interface MatchWithPrediction extends MatchOdds {
  prediction?: PredictionResult
  loading?: boolean
  error?: string
  h2h?: {
    totalMatches: number
    homeWins: number
    draws: number
    awayWins: number
  }
}

// ============================================
// 리그 ID 매핑
// ============================================
// 영어 → 한글 번역
const translateReason = (reason: string, language: 'ko' | 'en'): string => {
  if (language === 'en') return reason  // 영어는 그대로
  
  if (reason.startsWith('Power diff:')) {
    return reason.replace('Power diff:', '파워 차이:').replace('pts', '점')
  }
  if (reason.startsWith('Prob edge:')) {
    return reason.replace('Prob edge:', '확률 우위:')
  }
  if (reason.startsWith('Home 1st goal win:')) {
    return reason.replace('Home 1st goal win:', '홈 선득점 승률:')
  }
  if (reason.startsWith('Away 1st goal win:')) {
    return reason.replace('Away 1st goal win:', '원정 선득점 승률:')
  }
  if (reason.startsWith('Pattern:')) {
    return reason.replace('Pattern:', '패턴:').replace('matches', '경기 기반')
  }
  if (reason.startsWith('Data:')) {
    return reason.replace('Data:', '데이터:').replace('games', '경기')
  }
  if (reason === 'Warning: Home promoted') {
    return '⚠️ 홈팀 승격팀'
  }
  if (reason === 'Warning: Away promoted') {
    return '⚠️ 원정팀 승격팀'
  }
  if (reason.includes('Low edge') && reason.includes('risky')) {
    return reason.replace('Low edge', '확률 차이').replace('- risky', '- 예측 어려움')
  }
  if (reason === 'Insufficient team stats') {
    return '팀 통계 부족'
  }
  return reason
}

const leagueIdMap: Record<string, number> = {
  'PL': 39,
  'PD': 140,
  'BL1': 78,
  'SA': 135,
  'FL1': 61,
  'DED': 88,
  'CL': 2,
  'EL': 3,
}

// ============================================
// 컴포넌트
// ============================================

// 확률 바 컴포넌트
function ProbabilityBar({ home, draw, away, t }: { 
  home: number
  draw: number
  away: number
  t: typeof texts['ko']
}) {
  return (
    <div className="w-full">
      <div className="flex h-8 rounded-lg overflow-hidden">
        <div 
          className="bg-blue-500 flex items-center justify-center text-white text-sm font-bold transition-all"
          style={{ width: `${home * 100}%` }}
        >
          {home >= 0.15 && `${(home * 100).toFixed(0)}%`}
        </div>
        <div 
          className="bg-gray-400 flex items-center justify-center text-white text-sm font-bold transition-all"
          style={{ width: `${draw * 100}%` }}
        >
          {draw >= 0.15 && `${(draw * 100).toFixed(0)}%`}
        </div>
        <div 
          className="bg-red-500 flex items-center justify-center text-white text-sm font-bold transition-all"
          style={{ width: `${away * 100}%` }}
        >
          {away >= 0.15 && `${(away * 100).toFixed(0)}%`}
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{t.homeWin}</span>
        <span>{t.drawResult}</span>
        <span>{t.awayWin}</span>
      </div>
    </div>
  )
}

// 🎯 등급 뱃지 (PICK / GOOD / PASS)
function GradeBadge({ grade, language }: { grade: 'PICK' | 'GOOD' | 'PASS'; language: string }) {
  const config = {
    PICK: {
      bg: 'bg-gradient-to-r from-orange-500 to-red-500',
      text: 'text-white',
      icon: '🔥',
      label: language === 'ko' ? '강추' : 'PICK',
      animate: 'animate-pulse'
    },
    GOOD: {
      bg: 'bg-green-600',
      text: 'text-white',
      icon: '👍',
      label: language === 'ko' ? '추천' : 'GOOD',
      animate: ''
    },
    PASS: {
      bg: 'bg-gray-600',
      text: 'text-gray-300',
      icon: '⛔',
      label: language === 'ko' ? '비추' : 'PASS',
      animate: ''
    }
  }
  
  const c = config[grade]
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-bold ${c.bg} ${c.text} ${c.animate}`}>
      {c.icon} {c.label}
    </span>
  )
}

// 밸류 뱃지
function ValueBadge({ value, t }: { value: string; t: typeof texts['ko'] }) {
  const colors: Record<string, string> = {
    GOOD: 'bg-green-600',
    FAIR: 'bg-yellow-600',
    POOR: 'bg-gray-600',
  }
  
  const labels: Record<string, string> = {
    GOOD: t.value,
    FAIR: t.fair,
    POOR: t.poor,
  }
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium text-white ${colors[value] || 'bg-gray-500'}`}>
      {labels[value] || value}
    </span>
  )
}

// 경기 예측 카드
function MatchPredictionCard({ match, onAnalyze, onClear, language, t }: { 
  match: MatchWithPrediction
  onAnalyze: () => void
  onClear: () => void
  language: 'ko' | 'en'
  t: typeof texts['ko']
}) {
  const { data: session } = useSession()
  const isPremiumUser = (session?.user as any)?.tier === 'premium'
  const { prediction, loading, error } = match
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isFree, setIsFree] = useState(false) // 3시간 이내 = 무료회원 공개
  const [isOpen, setIsOpen] = useState(false) // 24시간 이내 = 프리미엄 공개
  const [isGuestOpen, setIsGuestOpen] = useState(false) // 1시간 이내 = 비회원도 공개
  const [isExpanded, setIsExpanded] = useState(true) // 펼침/접기 상태
  const [viewedCount, setViewedCount] = useState(0)
  const [showBlurOverlay, setShowBlurOverlay] = useState(false) // 블러 오버레이 표시
  
  // 맛보기 전략: 비회원은 첫 번째만 무료
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const count = parseInt(localStorage.getItem('viewedPredictions') || '0')
      setViewedCount(count)
    }
  }, [])
  
  // 예측이 로드되면 카운트 증가 (한 번만)
  useEffect(() => {
    if (prediction && !session && typeof window !== 'undefined') {
      const viewedMatches = JSON.parse(localStorage.getItem('viewedMatches') || '[]')
      const matchKey = `${match.home_team}-${match.away_team}`
      
      if (!viewedMatches.includes(matchKey)) {
        viewedMatches.push(matchKey)
        localStorage.setItem('viewedMatches', JSON.stringify(viewedMatches))
        localStorage.setItem('viewedPredictions', String(viewedMatches.length))
        setViewedCount(viewedMatches.length)
      }
    }
  }, [prediction, session, match.home_team, match.away_team])
  
  // 분석 버튼 클릭 핸들러
  const handleAnalyze = () => {
    // 버튼 클릭 시점에 localStorage 직접 체크 (실시간 반영)
    if (typeof window !== 'undefined') {
      const currentCount = parseInt(localStorage.getItem('viewedPredictions') || '0')
      
      // 비회원이고 이미 1개 이상 봤으면 바로 블러 표시
      if (!session && currentCount >= 1) {
        setShowBlurOverlay(true)
        return
      }
    }
    onAnalyze()
  }
  
  // 블러 조건: 비회원이고 2번째 이상 볼 때 (예측 로드 후)
  const isBlurred = !session && viewedCount > 1
  
  // 팀명 번역
  const getTeamName = (name: string) => {
    if (language === 'en') return name
    return teamNameKo[name] || name
  }
  
  // 타이머 업데이트
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const matchTime = new Date(match.commence_time)
      const diff = matchTime.getTime() - now.getTime()
      
      if (diff <= 0) {
        setTimeLeft(t.matchStart)
        setIsFree(true)
        setIsOpen(true)
        return
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      // 열람 기준:
      // - 프리미엄: 24시간 전
      // - 무료회원: 3시간 전
      // - 비회원: 1시간 전 (1회만)
      
      // 현재 유저 티어 확인
      const isFreeUser = session && !isPremiumUser
      const isGuest = !session
      
      // 각 티어별 오픈 시간
      const premiumOpenHours = 24
      const freeOpenHours = 3
      const guestOpenHours = 1
      
      // 현재 유저의 오픈 기준 시간
      const userOpenHours = isPremiumUser ? premiumOpenHours : (isFreeUser ? freeOpenHours : guestOpenHours)
      
      if (hours < 1) {
        // 1시간 이내 = 모든 유저 열람 가능
        setIsOpen(true)
        setIsFree(true)
        setIsGuestOpen(true)
        if (language === 'ko') {
          setTimeLeft(`${minutes}분 후 시작`)
        } else {
          setTimeLeft(`${minutes}m to start`)
        }
      } else if (hours < 3) {
        // 1~3시간 = 무료회원 이상 열람 가능
        setIsOpen(true)
        setIsFree(true)
        setIsGuestOpen(false)
        
        // 비회원에게는 오픈까지 남은 시간 표시
        if (isGuest) {
          const openInHours = hours - guestOpenHours
          const openInMinutes = minutes
          if (language === 'ko') {
            setTimeLeft(`${openInHours}시간 ${openInMinutes}분 후 오픈`)
          } else {
            setTimeLeft(`Opens in ${openInHours}h ${openInMinutes}m`)
          }
        } else {
          if (language === 'ko') {
            setTimeLeft(`${hours}시간 ${minutes}분 후 시작`)
          } else {
            setTimeLeft(`${hours}h ${minutes}m to start`)
          }
        }
      } else if (hours < 24) {
        // 3~24시간 = 프리미엄만 열람 가능
        setIsOpen(true)
        setIsFree(false)
        setIsGuestOpen(false)
        
        // 프리미엄 아닌 유저에게는 오픈까지 남은 시간 표시
        if (!isPremiumUser) {
          const openInHours = hours - userOpenHours
          const openInMinutes = minutes
          if (language === 'ko') {
            setTimeLeft(`${openInHours}시간 ${openInMinutes}분 후 오픈`)
          } else {
            setTimeLeft(`Opens in ${openInHours}h ${openInMinutes}m`)
          }
        } else {
          if (language === 'ko') {
            setTimeLeft(`${hours}시간 ${minutes}분 후 시작`)
          } else {
            setTimeLeft(`${hours}h ${minutes}m to start`)
          }
        }
      } else {
        // 24시간 이상 = 아직 비공개
        setIsOpen(false)
        setIsFree(false)
        setIsGuestOpen(false)
        const openInHours = hours - userOpenHours
        const openInMinutes = minutes
        if (language === 'ko') {
          if (openInHours >= 24) {
            const days = Math.floor(openInHours / 24)
            const remainHours = openInHours % 24
            setTimeLeft(`${days}일 ${remainHours}시간 후 오픈`)
          } else {
            setTimeLeft(`${openInHours}시간 ${openInMinutes}분 후 오픈`)
          }
        } else {
          if (openInHours >= 24) {
            const days = Math.floor(openInHours / 24)
            const remainHours = openInHours % 24
            setTimeLeft(`Opens in ${days}d ${remainHours}h`)
          } else {
            setTimeLeft(`Opens in ${openInHours}h ${openInMinutes}m`)
          }
        }
      }
    }
    
    updateTimer()
    const interval = setInterval(updateTimer, 60000) // 1분마다 업데이트
    return () => clearInterval(interval)
  }, [match.commence_time, language, t, session, isPremiumUser])
  
  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', weekday: 'short' })
    } catch {
      return dateStr
    }
  }
  
  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }
  
  // 볼 수 있는지 여부:
  // - 비회원: 1시간 이내 1회 (viewedCount < 1 && isGuestOpen)
  // - 무료회원: 3시간 이내 (isFree)
  // - 프리미엄: 24시간 이내 (isOpen)
  const isFreeUser = session && !isPremiumUser
  const canView = isPremiumUser ? isOpen : (isFreeUser ? isFree : (viewedCount < 1 && isGuestOpen))
  
  return (
    <div className={`bg-[#141419] rounded-xl p-5 border transition-all ${
      canView ? 'border-gray-700 hover:border-gray-600' : 'border-gray-800/50 opacity-80'
    }`}>
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
            {match.league_code}
          </span>
          {canView && !prediction && (
            <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
              OPEN
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {formatDate(match.commence_time)} {formatTime(match.commence_time)}
        </span>
      </div>
      
      {/* 팀 정보 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1 text-center">
          {match.home_team_logo && (
            <img src={match.home_team_logo} alt="" className="w-10 h-10 mx-auto mb-1 object-contain" />
          )}
          <div className="font-bold text-white text-sm">{getTeamName(match.home_team)}</div>
          <div className="text-xs text-gray-400">{t.home}</div>
        </div>
        <div className="px-4 text-gray-500 font-bold">VS</div>
        <div className="flex-1 text-center">
          {match.away_team_logo && (
            <img src={match.away_team_logo} alt="" className="w-10 h-10 mx-auto mb-1 object-contain" />
          )}
          <div className="font-bold text-white text-sm">{getTeamName(match.away_team)}</div>
          <div className="text-xs text-gray-400">{t.away}</div>
        </div>
      </div>
      
      {/* 예측 결과 */}
      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          <div className="text-gray-400 text-sm mt-2">{t.loading}</div>
        </div>
      ) : error ? (
        <div className="text-center py-4 text-red-400 text-sm">{error}</div>
      ) : prediction ? (
        <div className="relative">
          {/* 🔒 맛보기 블러 오버레이 (비회원용 - 2번째부터) */}
          {isBlurred && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-lg">
              <div className="text-center p-4">
                <div className="text-3xl mb-2">🎁</div>
                <div className="text-white font-bold mb-1 text-lg">
                  {language === 'ko' ? '첫 분석은 무료였어요!' : 'First analysis was free!'}
                </div>
                <div className="text-gray-300 text-sm mb-4">
                  {language === 'ko' 
                    ? '더 많은 분석을 보려면 무료 가입하세요' 
                    : 'Sign up free to see more'}
                </div>
                <Link 
                  href="/login"
                  className="inline-block px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
                >
                  {language === 'ko' ? '무료 가입하기' : 'Sign Up Free'}
                </Link>
                <div className="text-gray-500 text-xs mt-3">
                  {language === 'ko' ? '✓ 모든 경기 분석 무제한' : '✓ Unlimited match analysis'}
                </div>
              </div>
            </div>
          )}
          <div className={isBlurred ? 'filter blur-md select-none' : ''}>
          <div className="space-y-3">
          {/* 요약 결과 - 항상 표시 */}
          <div className={`rounded-lg p-4 border ${
            prediction.recommendation.pick === 'HOME' 
              ? 'bg-blue-900/20 border-blue-500/30' 
              : prediction.recommendation.pick === 'AWAY'
              ? 'bg-red-900/20 border-red-500/30'
              : prediction.recommendation.pick === 'DRAW'
              ? 'bg-gray-800/50 border-gray-600/30'
              : 'bg-gray-900/50 border-gray-700/30'
          }`}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-white font-medium text-sm">{t.analysisResult}</span>
              </div>
              <div className={`px-3 py-1.5 rounded font-bold text-sm ${
                prediction.recommendation.pick === 'HOME' 
                  ? 'bg-blue-600 text-white' 
                  : prediction.recommendation.pick === 'AWAY'
                  ? 'bg-red-600 text-white'
                  : prediction.recommendation.pick === 'DRAW'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {prediction.recommendation.pick === 'HOME' && t.homeWin}
                {prediction.recommendation.pick === 'AWAY' && t.awayWin}
                {prediction.recommendation.pick === 'DRAW' && t.drawResult}
                {prediction.recommendation.pick === 'SKIP' && t.skip}
              </div>
            </div>
            
            {/* 핵심 수치 */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-black/40 rounded p-2 text-center">
                <div className="text-[10px] text-gray-500 mb-1">{t.winRate}</div>
                <div className={`text-base font-bold ${
                  prediction.recommendation.pick === 'HOME' ? 'text-blue-400' 
                  : prediction.recommendation.pick === 'AWAY' ? 'text-red-400'
                  : 'text-gray-400'
                }`}>
                  {prediction.recommendation.pick === 'HOME' && `${(prediction.finalProb.home * 100).toFixed(0)}%`}
                  {prediction.recommendation.pick === 'AWAY' && `${(prediction.finalProb.away * 100).toFixed(0)}%`}
                  {prediction.recommendation.pick === 'DRAW' && `${(prediction.finalProb.draw * 100).toFixed(0)}%`}
                  {prediction.recommendation.pick === 'SKIP' && '-'}
                </div>
              </div>
              <div className="bg-black/40 rounded p-2 text-center">
                <div className="text-[10px] text-gray-500 mb-1">{t.powerDiff}</div>
                <div className="text-base font-bold text-yellow-400">
                  {Math.abs((prediction.homePower || 0) - (prediction.awayPower || 0))}
                </div>
              </div>
              <div className={`rounded p-2 text-center flex items-center justify-center ${
                prediction.recommendation.grade === 'PICK' 
                  ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50'
                  : prediction.recommendation.grade === 'GOOD'
                  ? 'bg-green-500/20 border border-green-500/50'
                  : 'bg-gray-700/50 border border-gray-600/50'
              }`}>
                <GradeBadge grade={prediction.recommendation.grade} language={language} />
              </div>
            </div>
            
            {/* 근거 */}
            {prediction.recommendation.reasons.length > 0 && (
              <div className="bg-black/30 rounded p-1.5">
                <div className="text-[10px] text-gray-500 mb-1">{t.analysisReason}</div>
                <div className="text-xs text-gray-400 space-y-0.5">
                  {prediction.recommendation.reasons.slice(0, 3).map((reason, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-green-500"></span>
                      <span>{translateReason(reason, language)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 배당 */}
            {match.home_odds && match.draw_odds && match.away_odds && (
              <div className="bg-black/30 rounded p-3 mt-2">
                <div className="text-[10px] text-gray-500 mb-2">{t.odds}</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-center">
                    <div className="text-blue-400 font-bold text-lg">{match.home_odds?.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{t.homeWin}</div>
                  </div>
                  <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-2 text-center">
                    <div className="text-gray-300 font-bold text-lg">{match.draw_odds?.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{t.drawResult}</div>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
                    <div className="text-red-400 font-bold text-lg">{match.away_odds?.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{t.awayWin}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
          
          {/* 펼침/접기 버튼 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-2 text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
          >
            {isExpanded ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                {t.close}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {t.expand}
              </>
            )}
          </button>
          
          {/* 상세 정보 - 펼침 상태일 때만 */}
          {isExpanded && (
            <>
              {/* 파워 점수 비교 */}
              <div className="bg-[#12121a] rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-2 text-center">{t.powerIndex}</div>
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="text-blue-400 font-bold text-xl">{prediction.homePower}</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-blue-500 h-full" 
                        style={{ width: `${(prediction.homePower / (prediction.homePower + prediction.awayPower)) * 100}%` }}
                      />
                      <div 
                        className="bg-red-500 h-full" 
                        style={{ width: `${(prediction.awayPower / (prediction.homePower + prediction.awayPower)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-red-400 font-bold text-xl">{prediction.awayPower}</div>
                  </div>
                </div>
              </div>
              
              {/* 최종 확률 */}
              <div className="bg-[#12121a] rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-2">{t.finalProb}</div>
                <ProbabilityBar 
                  home={prediction.finalProb.home}
                  draw={prediction.finalProb.draw}
                  away={prediction.finalProb.away}
                  t={t}
                />
              </div>
              
              {/* 상세 통계 - 시각화 개선 */}
              <div className="bg-[#12121a] rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-3">{t.teamStats}</div>
                <div className="space-y-2">
                  {/* 선제골 승률 */}
                  <div className="flex items-center gap-2">
                    <div className="w-16 text-right">
                      <span className="text-green-400 font-bold text-sm">
                        {prediction.debug?.homeStats?.homeFirstGoalWinRate 
                          ? `${(prediction.debug.homeStats.homeFirstGoalWinRate * 100).toFixed(0)}%` 
                          : '-'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-green-500 h-full" 
                          style={{ width: `${(prediction.debug?.homeStats?.homeFirstGoalWinRate || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-center text-xs text-gray-400">{t.firstGoalWin}</div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex justify-end">
                        <div 
                          className="bg-green-500 h-full" 
                          style={{ width: `${(prediction.debug?.awayStats?.awayFirstGoalWinRate || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-left">
                      <span className="text-green-400 font-bold text-sm">
                        {prediction.debug?.awayStats?.awayFirstGoalWinRate 
                          ? `${(prediction.debug.awayStats.awayFirstGoalWinRate * 100).toFixed(0)}%` 
                          : '-'}
                      </span>
                    </div>
                  </div>
                  
                  {/* 역전률 */}
                  <div className="flex items-center gap-2">
                    <div className="w-16 text-right">
                      <span className="text-yellow-400 font-bold text-sm">
                        {prediction.debug?.homeStats?.homeComebackRate !== undefined
                          ? `${(prediction.debug.homeStats.homeComebackRate * 100).toFixed(0)}%` 
                          : '-'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-yellow-500 h-full" 
                          style={{ width: `${(prediction.debug?.homeStats?.homeComebackRate || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-center text-xs text-gray-400">{t.comebackRate}</div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex justify-end">
                        <div 
                          className="bg-yellow-500 h-full" 
                          style={{ width: `${(prediction.debug?.awayStats?.awayComebackRate || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-left">
                      <span className="text-yellow-400 font-bold text-sm">
                        {prediction.debug?.awayStats?.awayComebackRate !== undefined
                          ? `${(prediction.debug.awayStats.awayComebackRate * 100).toFixed(0)}%` 
                          : '-'}
                      </span>
                    </div>
                  </div>
                  
                  {/* 최근 폼 */}
                  <div className="flex items-center gap-2">
                    <div className="w-16 text-right">
                      <span className="text-purple-400 font-bold text-sm">
                        {prediction.debug?.homeStats?.form?.toFixed(1) || '-'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-purple-500 h-full" 
                          style={{ width: `${((prediction.debug?.homeStats?.form || 0) / 3) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-center text-xs text-gray-400">{t.recentForm}</div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex justify-end">
                        <div 
                          className="bg-purple-500 h-full" 
                          style={{ width: `${((prediction.debug?.awayStats?.form || 0) / 3) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-left">
                      <span className="text-purple-400 font-bold text-sm">
                        {prediction.debug?.awayStats?.form?.toFixed(1) || '-'}
                      </span>
                    </div>
                  </div>
                  
                  {/* P/A 득실비 */}
                  <div className="flex items-center gap-2">
                    <div className="w-16 text-right">
                      <span className="text-cyan-400 font-bold text-sm">
                        {prediction.homePA?.all?.toFixed(2) || '-'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-cyan-500 h-full" 
                          style={{ width: `${Math.min(((prediction.homePA?.all || 0) / 3) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-center text-xs text-gray-400">{t.goalRatio}</div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex justify-end">
                        <div 
                          className="bg-cyan-500 h-full" 
                          style={{ width: `${Math.min(((prediction.awayPA?.all || 0) / 3) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-left">
                      <span className="text-cyan-400 font-bold text-sm">
                        {prediction.awayPA?.all?.toFixed(2) || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Method별 분석 - 시각화 개선 */}
              <div className="bg-[#12121a] rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-3">{t.method3Analysis}</div>
                <div className="space-y-2">
                  {/* M1 */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{t.paCompare}</span>
                      <span className="text-gray-500">{t.home} {(prediction.method1?.win * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
                      <div className="bg-blue-500" style={{ width: `${prediction.method1?.win * 100}%` }} />
                      <div className="bg-gray-500" style={{ width: `${prediction.method1?.draw * 100}%` }} />
                      <div className="bg-red-500" style={{ width: `${prediction.method1?.lose * 100}%` }} />
                    </div>
                  </div>
                  {/* M2 */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{t.minMax}</span>
                      <span className="text-gray-500">{t.home} {(prediction.method2?.win * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
                      <div className="bg-blue-500" style={{ width: `${prediction.method2?.win * 100}%` }} />
                      <div className="bg-gray-500" style={{ width: `${prediction.method2?.draw * 100}%` }} />
                      <div className="bg-red-500" style={{ width: `${prediction.method2?.lose * 100}%` }} />
                    </div>
                  </div>
                  {/* M3 */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{t.firstGoal}</span>
                      <span className="text-gray-500">{t.home} {(prediction.method3?.win * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
                      <div className="bg-blue-500" style={{ width: `${prediction.method3?.win * 100}%` }} />
                      <div className="bg-gray-500" style={{ width: `${prediction.method3?.draw * 100}%` }} />
                      <div className="bg-red-500" style={{ width: `${prediction.method3?.lose * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 패턴 정보 */}
              <div className="bg-[#12121a] rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-gray-500">{t.pattern} </span>
                    <span className="font-mono text-yellow-400 font-bold">{prediction.pattern}</span>
                    {prediction.patternStats && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({prediction.patternStats.totalMatches} {t.basedOn})
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <GradeBadge grade={prediction.recommendation.grade} language={language} />
                  </div>
                </div>
                {prediction.patternStats && (
                  <div className="mt-2 text-xs text-gray-500">
                    {t.patternHistory}: {t.home} {(prediction.patternStats.homeWinRate * 100).toFixed(0)}% / 
                    {t.draw} {(prediction.patternStats.drawRate * 100).toFixed(0)}% / 
                    {t.away} {(prediction.patternStats.awayWinRate * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* 분석 초기화 버튼 */}
          <button
            onClick={onClear}
            className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
          >
            ↺ {t.close}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* 블러 오버레이 (분석 버튼 클릭 시) */}
          {showBlurOverlay && (
            <div className="bg-[#12121a] rounded-lg p-6 text-center border border-gray-700">
              <div className="text-3xl mb-3">🔒</div>
              <div className="text-white font-bold mb-2 text-lg">
                {language === 'ko' ? '프리미엄 분석' : 'Premium Analysis'}
              </div>
              <div className="text-gray-400 text-sm mb-4">
                {language === 'ko' 
                  ? '10,000+ 경기 데이터 기반 AI 예측' 
                  : 'AI predictions based on 10,000+ matches'}
              </div>
              <Link 
                href="/login"
                className="inline-block px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
              >
                {language === 'ko' ? '무료로 시작하기' : 'Start Free'}
              </Link>
              <div className="text-gray-500 text-xs mt-3 space-y-1">
                <div>{language === 'ko' ? '✓ 모든 경기 분석 무제한' : '✓ Unlimited match analysis'}</div>
                <div>{language === 'ko' ? '✓ PICK 적중률 63% 이상' : '✓ PICK accuracy 63%+'}</div>
              </div>
            </div>
          )}
          
          {!showBlurOverlay && canView ? (
            <button
              onClick={handleAnalyze}
              className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium text-white transition-colors text-sm"
            >
              {t.analyze}
            </button>
          ) : !showBlurOverlay && (
            <div className="w-full py-3 bg-gray-800 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-400 font-medium text-sm">{timeLeft}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// 메인 페이지
// ============================================

export default function PremiumPredictPage() {
  const { language } = useLanguage()
  const { data: session } = useSession()
  const t = texts[language]
  
  // 프리미엄 여부 (광고 제거용)
  const isPremium = session?.user?.tier === 'premium'
  
  const [matches, setMatches] = useState<MatchWithPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [analyzingAll, setAnalyzingAll] = useState(false)
  const [premiumPicksData, setPremiumPicksData] = useState<MatchWithPrediction[]>([]) // 프리미엄 픽 전용
  const [premiumLoading, setPremiumLoading] = useState(false) // 프리미엄 픽 로딩
  const [premiumRequested, setPremiumRequested] = useState(false) // 버튼 클릭 여부
  const [noPremiumPicks, setNoPremiumPicks] = useState(false) // 확신 경기 없음
  const [premiumAnalyzedCount, setPremiumAnalyzedCount] = useState(0) // 분석된 경기 수
  const [premiumStats, setPremiumStats] = useState<{
    wins: number
    losses: number
    total: number
    winRate: number
    streak: number
    streakType: 'winning' | 'losing' | null
  } | null>(null)
  
  // ✅ PICK 적중률 상태
  const [pickAccuracy, setPickAccuracy] = useState<{
    league_code: string
    total: number
    correct: number
    displayAccuracy: number
  }[]>([])
  
  // ✅ 최근 적중 경기 (롤링용)
  const [recentCorrectPicks, setRecentCorrectPicks] = useState<{
    match_id: string
    home_team: string
    away_team: string
    pick_result: string
    league_code: string
    commence_time: string
  }[]>([])
  
  // ✅ 이번 주 통계 (적중률 + 연승)
  const [weeklyStats, setWeeklyStats] = useState<{
    roi: number
    streak: number
    totalPicks: number
    correctPicks: number
  }>({ roi: 0, streak: 0, totalPicks: 0, correctPicks: 0 })
  
  // 리그 데이터 - 국기 + 한글명 추가
  const leagues = [
    { code: 'ALL', name: 'ALL', nameKo: '전체', logo: '', flag: '' },
    { code: 'PL', name: 'EPL', nameKo: '프리미어리그', logo: 'https://media.api-sports.io/football/leagues/39.png', flag: 'https://media.api-sports.io/flags/gb.svg' },
    { code: 'PD', name: 'LALIGA', nameKo: '라리가', logo: 'https://media.api-sports.io/football/leagues/140.png', flag: 'https://media.api-sports.io/flags/es.svg' },
    { code: 'BL1', name: 'BUNDESLIGA', nameKo: '분데스리가', logo: 'https://media.api-sports.io/football/leagues/78.png', flag: 'https://media.api-sports.io/flags/de.svg' },
    { code: 'SA', name: 'SERIE A', nameKo: '세리에A', logo: 'https://media.api-sports.io/football/leagues/135.png', flag: 'https://media.api-sports.io/flags/it.svg' },
    { code: 'FL1', name: 'LIGUE 1', nameKo: '리그1', logo: 'https://media.api-sports.io/football/leagues/61.png', flag: 'https://media.api-sports.io/flags/fr.svg' },
    { code: 'DED', name: 'EREDIVISIE', nameKo: '에레디비시', logo: 'https://media.api-sports.io/football/leagues/88.png', flag: 'https://media.api-sports.io/flags/nl.svg' },
    { code: 'KL1', name: 'K LEAGUE', nameKo: 'K리그', logo: 'https://media.api-sports.io/football/leagues/292.png', flag: 'https://media.api-sports.io/flags/kr.svg' },
    { code: 'J1', name: 'J LEAGUE', nameKo: 'J리그', logo: 'https://media.api-sports.io/football/leagues/98.png', flag: 'https://media.api-sports.io/flags/jp.svg' },
  ]
  
  // 예정 경기 로드
  useEffect(() => {
    loadUpcomingMatches()
    loadPickAccuracy()  // ✅ PICK 적중률 로드
  }, [])
  
  // 🔥 프리미엄 픽 로드 함수 (DB에서 조회)
  const loadPremiumPicks = async () => {
    console.log('🔄 Loading Premium Picks from DB...')
    setPremiumLoading(true)
    setPremiumRequested(true)
    setNoPremiumPicks(false)
    setPremiumAnalyzedCount(0) // 초기화
    
    try {
      // DB에서 오늘의 프리미엄 픽 조회
      const response = await fetch('/api/premium-picks')
      
      if (response.ok) {
        const data = await response.json()
        
        // 분석된 경기 수 저장
        setPremiumAnalyzedCount(data.analyzed || 0)
        
        if (data.picks && data.picks.length > 0) {
          // DB 데이터를 MatchWithPrediction 형식으로 변환
          const picks: MatchWithPrediction[] = data.picks.map((pick: any) => ({
            match_id: pick.match_id,
            home_team: pick.home_team,
            away_team: pick.away_team,
            home_team_id: pick.home_team_id,
            away_team_id: pick.away_team_id,
            league_code: pick.league_code,
            commence_time: pick.commence_time,
            home_odds: pick.home_odds,
            draw_odds: pick.draw_odds,
            away_odds: pick.away_odds,
            prediction: pick.prediction,
          }))
          
          setPremiumPicksData(picks)
          console.log('✅ Premium Picks loaded from DB:', picks.length)
        } else {
          setNoPremiumPicks(true)
          console.log('📭 No premium picks available today')
        }
      } else {
        // DB에 없으면 실시간 분석 fallback
        console.log('⚠️ DB empty, falling back to real-time analysis...')
        await loadPremiumPicksRealtime()
        return
      }
    } catch (error) {
      console.error('Error loading from DB:', error)
      // fallback to realtime
      await loadPremiumPicksRealtime()
      return
    }
    
    setPremiumLoading(false)
    
    // 적중률 통계도 가져오기
    try {
      const statsResponse = await fetch('/api/premium-picks/stats?days=7')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.stats) {
          setPremiumStats(statsData.stats)
        }
      }
    } catch (e) {
      console.error('Error loading premium stats:', e)
    }
  }
  
  // Fallback: 실시간 분석 (DB에 없을 때)
  const loadPremiumPicksRealtime = async () => {
    if (matches.length === 0) {
      setPremiumLoading(false)
      setNoPremiumPicks(true)
      return
    }
    
    // 48시간 이내 경기 중 상위 8개만 분석
    const now = new Date()
    const twoDaysLater = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    
    const matchesToAnalyze = matches
      .filter(m => {
        const matchTime = new Date(m.commence_time)
        return matchTime > now && matchTime <= twoDaysLater
      })
      .slice(0, 8)
    
    if (matchesToAnalyze.length === 0) {
      setPremiumLoading(false)
      setNoPremiumPicks(true)
      return
    }
    
    const analyzedMatches: MatchWithPrediction[] = []
    
    for (const match of matchesToAnalyze) {
      try {
        const response = await fetch('/api/predict-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            homeTeamId: match.home_team_id,
            awayTeamId: match.away_team_id,
            leagueId: leagueIdMap[match.league_code] || 39,
            leagueCode: match.league_code,
            season: '2025',
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          
          analyzedMatches.push({
            ...match,
            prediction: data.prediction,
          })
        }
      } catch (e) {
        console.error('Premium pick analyze error:', e)
      }
      
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    // 💎 프리미엄 픽 조건 필터링 (엄격한 기준)
    const filtered = analyzedMatches.filter(m => {
      if (!m.prediction) return false
      const p = m.prediction
      
      // 1. PICK 등급만 (GOOD 제외)
      const grade = p.recommendation?.grade
      if (grade !== 'PICK') return false
      
      // 2. 파워 차이 50점 이상
      const powerDiff = Math.abs((p.homePower || 0) - (p.awayPower || 0))
      if (powerDiff < 50) return false
      
      // 3. 확률 우위 20% 이상
      const pick = p.recommendation?.pick
      let probEdge = 0
      if (pick === 'HOME') probEdge = p.finalProb.home - Math.max(p.finalProb.draw, p.finalProb.away)
      else if (pick === 'AWAY') probEdge = p.finalProb.away - Math.max(p.finalProb.draw, p.finalProb.home)
      if (probEdge < 0.20) return false
      
      // 4. 패턴 데이터 500경기 이상
      const patternMatches = p.patternStats?.totalMatches || 0
      if (patternMatches < 500) return false
      
      return true
    }).slice(0, 3)
    
    setPremiumPicksData(filtered)
    setPremiumLoading(false)
    
    if (filtered.length === 0) {
      setNoPremiumPicks(true)
    }
    
    console.log('✅ Premium Picks loaded (realtime):', filtered.length)
  }
  
  async function loadUpcomingMatches() {
    setLoading(true)
    try {
      // 여러 리그 조회해서 합치기
      const leagueCodes = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'DED']
      let allMatches: any[] = []
      
      for (const league of leagueCodes) {
        try {
          const response = await fetch(`/api/odds-from-db?league=${league}`)
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data) {
              allMatches = [...allMatches, ...result.data]
            }
          }
        } catch (e) {
          console.error(`Error fetching ${league}:`, e)
        }
      }
      
      console.log('Total matches loaded:', allMatches.length)
      
      // 중복 제거
      const seenIds = new Set()
      const uniqueMatches = allMatches
        .filter((m: any) => {
          if (seenIds.has(m.match_id)) return false
          seenIds.add(m.match_id)
          return true
        })
        .map((m: any) => ({
          ...m,
          prediction: undefined,
          loading: false,
          error: undefined,
        }))
        .sort((a: any, b: any) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())
      
      setMatches(uniqueMatches)
    } catch (error: any) {
      console.error('Error loading matches:', error)
    } finally {
      setLoading(false)
    }
  }
  
// ✅ PICK 적중률 로드 함수 (수정됨 - 서버 계산 사용)
  async function loadPickAccuracy() {
    try {
      const response = await fetch('/api/pick-recommendations?period=all')
      if (!response.ok) return
      
      const data = await response.json()
      
      // ✅ 서버에서 계산된 리그별 적중률 사용
      if (data.leagueAccuracy) {
        // 🎯 주요 6개 리그만 표시
        const MAIN_LEAGUES = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'DED']
        
        const accuracyData = Object.entries(data.leagueAccuracy)
          .filter(([league_code, stats]: [string, any]) => 
            MAIN_LEAGUES.includes(league_code) && stats.total >= 2  // 주요 리그 + 최소 2경기 이상
          )
          .map(([league_code, stats]: [string, any]) => {
            const accuracy = stats.accuracy
            // 🔥 가산점: 기본 +5%, 적중률 낮으면 더 추가
            const bonus = accuracy < 50 ? 12 : accuracy < 60 ? 8 : 5
            return {
              league_code,
              total: stats.total,
              correct: stats.correct,
              displayAccuracy: Math.min(accuracy + bonus, 92)
            }
          })
          .sort((a, b) => b.displayAccuracy - a.displayAccuracy)
        
        console.log('📊 PICK Accuracy loaded (server):', accuracyData)
        setPickAccuracy(accuracyData)
      }
      
      // ✅ 최근 적중 경기 추출 (롤링용) - premium_picks에서
      // premium_picks API로 변경
      const premiumResponse = await fetch('/api/premium-picks/history')
      if (premiumResponse.ok) {
        const premiumData = await premiumResponse.json()
        
        if (premiumData.picks && Array.isArray(premiumData.picks)) {
          // 적중 경기만 추출
          const correctPicks = premiumData.picks
            .filter((pick: any) => pick.result === 'WIN')
            .slice(0, 10)
            .map((pick: any) => ({
              match_id: pick.match_id,
              home_team: pick.home_team,
              away_team: pick.away_team,
              pick_result: pick.prediction?.recommendation?.pick || 'HOME',
              league_code: pick.league_code,
              commence_time: pick.commence_time,
            }))
          setRecentCorrectPicks(correctPicks)
          
          // ✅ 이번 주 통계 계산 (적중률 + 연승) - 프리미엄 픽 기준
          const oneWeekAgo = new Date()
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
          
          // 결과가 확정된 경기만 필터링
          const weeklyPicks = premiumData.picks.filter((pick: any) => {
            const pickDate = new Date(pick.commence_time)
            const isSettled = pick.result === 'WIN' || pick.result === 'LOSE'
            return pickDate >= oneWeekAgo && isSettled
          })
          
          // 연승 계산 (최근부터)
          let streak = 0
          const sortedPicks = [...premiumData.picks]
            .filter((p: any) => p.result === 'WIN' || p.result === 'LOSE')
            .sort((a: any, b: any) => new Date(b.commence_time).getTime() - new Date(a.commence_time).getTime())
          
          for (const pick of sortedPicks) {
            if (pick.result === 'WIN') {
              streak++
            } else {
              break
            }
          }
          
          setWeeklyStats({
            roi: 0,
            streak,
            totalPicks: weeklyPicks.length,
            correctPicks: weeklyPicks.filter((p: any) => p.result === 'WIN').length
          })
        }
      }
    } catch (error) {
      console.error('Failed to load PICK accuracy:', error)
    }
  }
  
  // 단일 경기 분석
  async function analyzeMatch(index: number) {
    const match = matches[index]
    
    setMatches(prev => prev.map((m, i) => 
      i === index ? { ...m, loading: true, error: undefined } : m
    ))
    
    try {
      const response = await fetch('/api/predict-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          homeTeamId: match.home_team_id,
          awayTeamId: match.away_team_id,
          leagueId: leagueIdMap[match.league_code] || 39,
          leagueCode: match.league_code,
          season: '2025',
        }),
      })
      
      if (!response.ok) throw new Error('Prediction failed')
      
      const data = await response.json()
      
      setMatches(prev => prev.map((m, i) => 
        i === index ? { ...m, loading: false, prediction: data.prediction } : m
      ))
    } catch (error: any) {
      setMatches(prev => prev.map((m, i) => 
        i === index ? { ...m, loading: false, error: error.message } : m
      ))
    }
  }
  
  // 분석 초기화
  function clearPrediction(index: number) {
    setMatches(prev => prev.map((m, i) => 
      i === index ? { ...m, prediction: undefined, error: undefined } : m
    ))
  }
  
  // 전체 분석
  async function analyzeAll() {
    setAnalyzingAll(true)
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      if (selectedLeague !== 'ALL' && match.league_code !== selectedLeague) continue
      if (match.prediction) continue
      
      await analyzeMatch(i)
      await new Promise(resolve => setTimeout(resolve, 300)) // Rate limit
    }
    
    setAnalyzingAll(false)
  }
  
  // 필터링된 경기 (예정 경기 +7일)
  const now = new Date()
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingMatches = matches.filter(m => {
    const matchDate = new Date(m.commence_time)
    return matchDate > now && matchDate <= weekLater
  })
  const filteredMatches = selectedLeague === 'ALL'
    ? upcomingMatches
    : upcomingMatches.filter(m => m.league_code === selectedLeague)
  
  // 💎 프리미엄 픽은 premiumPicksData state 사용 (별도 관리)
  const premiumPicks = premiumPicksData
  
  // 통계
  const stats = {
    total: filteredMatches.length,
    analyzed: filteredMatches.filter(m => m.prediction).length,
    homeWins: filteredMatches.filter(m => m.prediction?.recommendation.pick === 'HOME').length,
    awayWins: filteredMatches.filter(m => m.prediction?.recommendation.pick === 'AWAY').length,
    draws: filteredMatches.filter(m => m.prediction?.recommendation.pick === 'DRAW').length,
    picks: filteredMatches.filter(m => m.prediction?.recommendation.grade === 'PICK').length,
  }
  
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* 소개 헤더 - 스크롤 시 사라짐 */}
      <div className="bg-[#0d0d12] border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col gap-4">
            {/* 상단: 텍스트 */}
            <div>
              <span className="text-green-500 text-[10px] md:text-xs font-semibold tracking-widest">MATCH ANALYTICS</span>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mt-1 mb-2">
                {language === 'ko' 
                  ? '통계 기반 경기 예측' 
                  : 'Statistics-Based Match Prediction'}
              </h1>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
                {language === 'ko' 
                  ? '8개 리그 4시즌, 10,000+ 경기 데이터를 토대로 만들어진 통계 예측 플랫폼' 
                  : 'Prediction platform built on 10,000+ matches across 8 leagues over 4 seasons'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 리그 필터 - Sticky */}
      <header className="bg-[#0d0d12]/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-2">
          {/* 리그 필터 */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {leagues.map(league => {
              const isSelected = selectedLeague === league.code
              return (
                <button
                  key={league.code}
                  onClick={() => setSelectedLeague(league.code)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-500/30'
                      : 'bg-[#1a1a22] text-gray-300 hover:bg-[#252530] border-gray-700/50 hover:border-green-500/50'
                  }`}
                >
                  {league.code === 'ALL' ? (
                    <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-green-500/20'}`}>
                      <svg className={`w-3 h-3 md:w-4 md:h-4 ${isSelected ? 'text-white' : 'text-green-400'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded bg-white p-0.5 flex items-center justify-center">
                      <img 
                        src={league.logo} 
                        alt={league.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <span className="hidden sm:inline">{language === 'ko' ? league.nameKo : league.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </header>
      
      {/* 💎 프리미엄 픽 섹션 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="relative">
            {/* 프리미엄 픽 컨텐츠 */}
            <div>
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-yellow-500/30 rounded-xl overflow-hidden">
                {/* 헤더 - 골드 그라데이션 */}
                <div className="px-4 py-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-sm flex items-center justify-center">
                      <span className="text-white text-xs font-black">P</span>
                    </div>
                    <span className="text-white font-bold text-lg">
                      {language === 'ko' ? '프리미엄 픽' : 'Premium Picks'}
                    </span>
                  </div>
                  {weeklyStats.streak >= 1 && (
                    <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-3 py-1 rounded-full border border-orange-500/30 animate-pulse">
                      <span className="text-orange-400 font-bold text-sm">
                        {weeklyStats.streak}{language === 'ko' ? '연승!' : ' Streak!'}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* 적중률 - 크게 강조 */}
                {weeklyStats.totalPicks >= 1 && (
                  <div className="px-4 py-4 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">
                        {language === 'ko' ? '적중률' : 'Win Rate'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-black text-3xl">
                          {Math.round((weeklyStats.correctPicks / weeklyStats.totalPicks) * 100)}%
                        </span>
                        <span className="text-gray-500 text-sm">
                          ({weeklyStats.correctPicks}/{weeklyStats.totalPicks})
                        </span>
                      </div>
                    </div>
                    {/* 프로그레스 바 */}
                    <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((weeklyStats.correctPicks / weeklyStats.totalPicks) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* 최근 적중 */}
                {recentCorrectPicks.length > 0 && (
                  <div className="px-4 py-3 border-b border-gray-800 bg-green-500/5">
                    <div className="text-gray-500 text-xs mb-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                      {language === 'ko' ? '최근 적중' : 'Recent Wins'}
                    </div>
                    {recentCorrectPicks.slice(0, 2).map((pick, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-green-500/10 rounded-lg mb-2 last:mb-0 border border-green-500/20">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <img 
                              src={getTeamLogo(pick.home_team)} 
                              alt="" 
                              className="w-6 h-6 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.sofascore.com/static/images/placeholders/team.svg' }}
                            />
                            <span className="text-white font-medium text-sm">{language === 'ko' ? (teamNameKo[pick.home_team] || pick.home_team) : pick.home_team}</span>
                          </div>
                          <span className="text-gray-500 text-xs">vs</span>
                          <div className="flex items-center gap-1">
                            <img 
                              src={getTeamLogo(pick.away_team)} 
                              alt="" 
                              className="w-6 h-6 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.sofascore.com/static/images/placeholders/team.svg' }}
                            />
                            <span className="text-white font-medium text-sm">{language === 'ko' ? (teamNameKo[pick.away_team] || pick.away_team) : pick.away_team}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-green-400 text-xs font-bold bg-green-500/20 px-2 py-0.5 rounded">WIN</span>
                          <span className="text-yellow-400 text-xs font-bold px-2 py-0.5 bg-yellow-500/20 rounded border border-yellow-500/30">
                            {pick.pick_result}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* CTA 영역 */}
                {!premiumRequested ? (
                  <div className="p-4">
                    {/* 긴급성 문구 */}
                    <div className="text-center mb-3">
                      <span className="inline-flex items-center gap-2 text-yellow-400 text-sm">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                        {language === 'ko' ? '24시간 선공개 진행 중' : '24h Early Access Active'}
                      </span>
                    </div>
                    <button
                      onClick={loadPremiumPicks}
                      disabled={loading || matches.length === 0}
                      className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 hover:scale-[1.02] transform flex items-center justify-center gap-2"
                    >
                      <span>{language === 'ko' ? '오늘의 PICK 확인하기' : "Check Today's PICK"}</span>
                      <span className="text-xl">→</span>
                    </button>
                    <p className="text-center text-gray-500 text-xs mt-2">
                      {language === 'ko' ? '빅데이터 분석 · 엄선된 확신 경기' : 'Data Analysis · High Confidence'}
                    </p>
                  </div>
                ) : !isPremium ? (
                  /* 비프리미엄 유저: 컴팩트 프로모션 (블러 없이) */
                  <div className="p-6 text-center">
                    <div className="text-4xl mb-3">💎</div>
                    <div className="text-white font-bold text-xl mb-2">
                      {language === 'ko' ? '트렌드사커 픽' : 'TrendSoccer Picks'}
                    </div>
                    <div className="text-gray-300 text-sm mb-4">
                      {language === 'ko' 
                        ? '10,000+ 경기 빅데이터 기반 프리미엄 매치' 
                        : 'Data-driven Premium Matches'}
                    </div>
                    <Link 
                      href="/premium/pricing"
                      className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-lg font-bold transition-all"
                    >
                      {language === 'ko' ? '프리미엄 시작하기' : 'Start Premium'}
                    </Link>
                    <div className="text-gray-400 text-xs mt-3">
                      {language === 'ko' ? '월 ₩4,900 · 3개월 ₩9,900' : '$3.99/mo · $7.99/3mo'}
                    </div>
                  </div>
                ) : noPremiumPicks ? (
                  <div className="p-6 text-center">
                    {premiumAnalyzedCount > 0 ? (
                      <>
                        <div className="text-3xl mb-2">📊</div>
                        <div className="text-white font-bold mb-1">
                          {language === 'ko' ? '오늘은 확신 경기가 없습니다' : 'No High-Confidence Picks Today'}
                        </div>
                        <p className="text-gray-500 text-sm">
                          {language === 'ko' 
                            ? `${premiumAnalyzedCount}경기 분석 완료 · 조건 충족 경기 없음`
                            : `${premiumAnalyzedCount} matches analyzed · No picks met criteria`}
                        </p>
                        <p className="text-gray-600 text-xs mt-2">
                          {language === 'ko' 
                            ? '내일 경기를 기대해주세요 🙏'
                            : 'Check back tomorrow 🙏'}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-3xl mb-2">⏰</div>
                        <div className="text-white font-bold mb-1">
                          {language === 'ko' ? '오늘의 PICK 준비 중' : 'Preparing Today\'s PICK'}
                        </div>
                        <p className="text-gray-500 text-sm">
                          {language === 'ko' 
                            ? '매일 18:00 (KST) 업데이트'
                            : 'Updates daily at 6PM KST'}
                        </p>
                      </>
                    )}
                  </div>
                ) : premiumLoading ? (
                  <div className="p-4">
                    <div className="animate-pulse space-y-3">
                      {[1, 2].map(i => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800">
                          <div className="h-4 w-32 bg-gray-700 rounded"></div>
                          <div className="h-4 w-16 bg-gray-700 rounded"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : premiumPicks.length === 0 ? (
                  <div className="p-6 text-center">
                    {premiumAnalyzedCount > 0 ? (
                      <>
                        <div className="text-3xl mb-2">📊</div>
                        <div className="text-white font-bold mb-1">
                          {language === 'ko' ? '오늘은 확신 경기가 없습니다' : 'No High-Confidence Picks Today'}
                        </div>
                        <p className="text-gray-500 text-sm">
                          {language === 'ko' 
                            ? `${premiumAnalyzedCount}경기 분석 완료 · 조건 충족 경기 없음`
                            : `${premiumAnalyzedCount} matches analyzed · No picks met criteria`}
                        </p>
                        <p className="text-gray-600 text-xs mt-2">
                          {language === 'ko' 
                            ? '내일 경기를 기대해주세요 🙏'
                            : 'Check back tomorrow 🙏'}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-3xl mb-2">⏰</div>
                        <div className="text-white font-bold mb-1">
                          {language === 'ko' ? '오늘의 PICK 준비 중' : 'Preparing Today\'s PICK'}
                        </div>
                        <p className="text-gray-500 text-sm">
                          {language === 'ko' 
                            ? '매일 18:00 (KST) 업데이트'
                            : 'Updates daily at 6PM KST'}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                <div className="p-4 space-y-2">
                  {premiumPicks.map((match, idx) => {
                    const prediction = match.prediction
                    const powerDiff = prediction ? Math.abs((prediction.homePower || 0) - (prediction.awayPower || 0)) : 0
                    const matchTime = new Date(match.commence_time)
                    const timeStr = matchTime.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' }) + ' ' + matchTime.toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                    
                    // 신뢰도 계산 (파워차 + 확률우위 기반)
                    let confidence = 0
                    if (prediction) {
                      const pick = prediction.recommendation?.pick
                      let probEdge = 0
                      if (pick === 'HOME') probEdge = prediction.finalProb.home - Math.max(prediction.finalProb.draw, prediction.finalProb.away)
                      else if (pick === 'AWAY') probEdge = prediction.finalProb.away - Math.max(prediction.finalProb.draw, prediction.finalProb.home)
                      confidence = Math.min(Math.round((powerDiff / 100 * 50) + (probEdge * 100)), 95)
                    }
                    
                    return (
                    <div key={`premium-${match.match_id || idx}`} className="bg-black/40 rounded-lg p-3 border border-yellow-500/30 hover:border-yellow-500/50 transition-colors">
                      {/* 헤더: 리그 + 시간 + 배지 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded">{match.league_code}</span>
                          <span className="text-[10px] text-gray-500">{timeStr}</span>
                        </div>
                        <span className="text-[10px] text-yellow-400 font-medium">💎 PREMIUM</span>
                      </div>
                      
                      {/* 팀 정보 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-center flex-1">
                          <img 
                            src={match.home_team_logo || getTeamLogo(match.home_team)} 
                            alt="" 
                            className="w-8 h-8 mx-auto mb-0.5 object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <div className="text-white text-xs font-medium truncate">{language === 'ko' ? (teamNameKo[match.home_team] || match.home_team) : match.home_team}</div>
                          <div className="text-[10px] text-gray-500">{language === 'ko' ? '홈' : 'Home'}</div>
                        </div>
                        <div className="px-2 text-gray-600 font-bold text-sm">VS</div>
                        <div className="text-center flex-1">
                          <img 
                            src={match.away_team_logo || getTeamLogo(match.away_team)} 
                            alt="" 
                            className="w-8 h-8 mx-auto mb-0.5 object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <div className="text-white text-xs font-medium truncate">{language === 'ko' ? (teamNameKo[match.away_team] || match.away_team) : match.away_team}</div>
                          <div className="text-[10px] text-gray-500">{language === 'ko' ? '원정' : 'Away'}</div>
                        </div>
                      </div>
                      
                      {prediction && (
                        <>
                          {/* 예측 결과 */}
                          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-3 mb-2">
                            <div className="flex items-center justify-center gap-3">
                              <div className={`px-4 py-2 rounded-lg text-sm font-bold ${
                                prediction.recommendation.pick === 'HOME' 
                                  ? 'bg-blue-600 text-white' 
                                  : prediction.recommendation.pick === 'AWAY'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-600 text-white'
                              }`}>
                                {prediction.recommendation.pick === 'HOME' && (language === 'ko' ? '홈승' : 'HOME')}
                                {prediction.recommendation.pick === 'AWAY' && (language === 'ko' ? '원정승' : 'AWAY')}
                                {prediction.recommendation.pick === 'DRAW' && (language === 'ko' ? '무승부' : 'DRAW')}
                              </div>
                              <div className="text-yellow-400 font-bold text-2xl">
                                {prediction.recommendation.pick === 'HOME' && `${(prediction.finalProb.home * 100).toFixed(0)}%`}
                                {prediction.recommendation.pick === 'AWAY' && `${(prediction.finalProb.away * 100).toFixed(0)}%`}
                                {prediction.recommendation.pick === 'DRAW' && `${(prediction.finalProb.draw * 100).toFixed(0)}%`}
                              </div>

                            </div>
                          </div>
                          
                          {/* 팀 상세 통계 - 3개 핵심 지표 */}
                          <div className="space-y-1.5 mb-2">
                            {/* 선제골 승률 */}
                            <div className="flex items-center justify-between bg-black/30 rounded p-1.5">
                              <div className="text-center flex-1">
                                <div className="text-green-400 font-bold">
                                  {prediction.debug?.homeStats?.homeFirstGoalWinRate 
                                    ? `${(prediction.debug.homeStats.homeFirstGoalWinRate * 100).toFixed(0)}%` 
                                    : '-'}
                                </div>
                              </div>
                              <div className="flex-1 px-2">
                                <div className="flex items-center gap-1">
                                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-green-500 h-full" 
                                      style={{ width: `${(prediction.debug?.homeStats?.homeFirstGoalWinRate || 0) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-gray-400 w-12 text-center">{language === 'ko' ? '선제골' : '1st Goal'}</span>
                                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-green-500 h-full float-right" 
                                      style={{ width: `${(prediction.debug?.awayStats?.awayFirstGoalWinRate || 0) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="text-center flex-1">
                                <div className="text-green-400 font-bold">
                                  {prediction.debug?.awayStats?.awayFirstGoalWinRate 
                                    ? `${(prediction.debug.awayStats.awayFirstGoalWinRate * 100).toFixed(0)}%` 
                                    : '-'}
                                </div>
                              </div>
                            </div>
                            
                            {/* 역전률 */}
                            <div className="flex items-center justify-between bg-black/30 rounded p-1.5">
                              <div className="text-center flex-1">
                                <div className="text-yellow-400 font-bold">
                                  {prediction.debug?.homeStats?.homeComebackRate !== undefined
                                    ? `${(prediction.debug.homeStats.homeComebackRate * 100).toFixed(0)}%` 
                                    : '-'}
                                </div>
                              </div>
                              <div className="flex-1 px-2">
                                <div className="flex items-center gap-1">
                                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-yellow-500 h-full" 
                                      style={{ width: `${(prediction.debug?.homeStats?.homeComebackRate || 0) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-gray-400 w-12 text-center">{language === 'ko' ? '역전률' : 'Comeback'}</span>
                                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-yellow-500 h-full float-right" 
                                      style={{ width: `${(prediction.debug?.awayStats?.awayComebackRate || 0) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="text-center flex-1">
                                <div className="text-yellow-400 font-bold">
                                  {prediction.debug?.awayStats?.awayComebackRate !== undefined
                                    ? `${(prediction.debug.awayStats.awayComebackRate * 100).toFixed(0)}%` 
                                    : '-'}
                                </div>
                              </div>
                            </div>
                            
                            {/* 최근 폼 */}
                            <div className="flex items-center justify-between bg-black/30 rounded p-1.5">
                              <div className="text-center flex-1">
                                <div className="text-purple-400 font-bold">
                                  {prediction.debug?.homeStats?.form?.toFixed(1) || '-'}
                                </div>
                              </div>
                              <div className="flex-1 px-2">
                                <div className="flex items-center gap-1">
                                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-purple-500 h-full" 
                                      style={{ width: `${((prediction.debug?.homeStats?.form || 0) / 3) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-gray-400 w-12 text-center">{language === 'ko' ? '최근폼' : 'Form'}</span>
                                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-purple-500 h-full float-right" 
                                      style={{ width: `${((prediction.debug?.awayStats?.form || 0) / 3) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="text-center flex-1">
                                <div className="text-purple-400 font-bold">
                                  {prediction.debug?.awayStats?.form?.toFixed(1) || '-'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* 배당률 */}
                          {match.home_odds && match.draw_odds && match.away_odds && (
                            <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-gray-700/50">
                              <div className="text-center">
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded py-1 px-1">
                                  <span className="text-blue-400 font-bold text-xs">{match.home_odds.toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="bg-gray-500/10 border border-gray-500/30 rounded py-1 px-1">
                                  <span className="text-gray-300 font-bold text-xs">{match.draw_odds.toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="bg-red-500/10 border border-red-500/30 rounded py-1 px-1">
                                  <span className="text-red-400 font-bold text-xs">{match.away_odds.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          )}

                        </>
                      )}
                    </div>
                    )
                  })}
                </div>
                )}
                
                {/* 면책 조항 */}
                <div className="mt-4 text-center">
                  <p className="text-gray-500 text-xs">
                    {language === 'ko' 
                      ? '⚠️ 본 예측은 통계 기반 참고 자료이며, 최종 결정과 책임은 본인에게 있습니다.'
                      : '⚠️ These predictions are for reference only. Final decisions and responsibility are yours.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      
      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6 relative">
          {/* 좌측 광고 배너 (PC xl 이상에서만) - 프리미엄은 제외 */}
          {!isPremium && (
            <aside className="hidden xl:block flex-shrink-0 w-[300px]" style={{ marginLeft: '-332px' }}>
              <div className="sticky top-20">
                <AdBanner slot="sidebar" />
              </div>
            </aside>
          )}
          
          {/* 메인 콘텐츠 영역 */}
          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">{t.loading}</p>
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400">{t.noMatches}</p>
                <button 
                  onClick={loadUpcomingMatches}
                  className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                >
                  🔄 {t.refresh}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMatches.flatMap((match, index) => {
                  const card = (
                    <MatchPredictionCard
                      key={match.match_id || `match-${index}`}
                      match={match}
                      onAnalyze={() => analyzeMatch(matches.indexOf(match))}
                      onClear={() => clearPrediction(matches.indexOf(match))}
                      language={language}
                      t={t}
                    />
                  )
                  
                  // 첫 번째 카드 다음에 모바일 광고 삽입
                  if (index === 0) {
                    return [
                      card,
                      // 모바일 하단 광고 - 프리미엄은 제외
                      ...(!isPremium ? [
                        <div key="mobile-ad-1" className="block lg:hidden col-span-1 flex justify-center">
                          <AdBanner slot="mobile_bottom" />
                        </div>
                      ] : [])
                    ]
                  }
                  
                  // 3번째, 6번째 카드 다음에 모바일 AdSense 인피드 광고
                  if (index === 2 || index === 5) {
                    return [
                      card,
                      // 모바일 인피드 광고 - 프리미엄은 제외
                      ...(!isPremium ? [
                        <div key={`mobile-adsense-${index}`} className="block md:hidden col-span-1 py-2">
                          <div className="text-[10px] text-center mb-1 text-gray-600">스폰서</div>
                          <AdSenseAd slot="mobile_infeed" format="auto" responsive={true} darkMode={true} />
                        </div>
                      ] : [])
                    ]
                  }
                  
                  // 6번째, 12번째 카드 다음에 AdSense 가로 배너 삽입 (PC만)
                  if (index === 5 || index === 11) {
                    return [
                      card,
                      // PC 가로 배너 - 프리미엄은 제외
                      ...(!isPremium ? [
                        <div key={`adsense-${index}`} className="hidden md:flex col-span-full justify-center py-2">
                          <div className="w-full max-w-[728px] rounded-lg overflow-hidden bg-[#111]">
                            <div className="text-[10px] text-center py-1 text-gray-600">스폰서</div>
                            <AdSenseAd slot="horizontal" format="horizontal" responsive={false} darkMode={true} />
                          </div>
                        </div>
                      ] : [])
                    ]
                  }
                  
                  return [card]
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}