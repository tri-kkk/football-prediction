'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useLanguage } from '../contexts/LanguageContext'
import { useSession } from 'next-auth/react'
import { TEAM_NAME_KR } from '../teamLogos'
import AdSenseAd from '../components/AdSenseAd'

// 🏆 리그 정보 (50개 - 아프리카 추가!)
const LEAGUES = [
  { code: 'ALL', nameKo: '전체', nameEn: 'All', logo: '🌍', isEmoji: true },
  
  // ===== 🏆 국제대회 (7개) =====
  { code: 'CL', nameKo: '챔스', nameEn: 'UCL', logo: 'https://media.api-sports.io/football/leagues/2.png', isEmoji: false },
  { code: 'EL', nameKo: '유로파', nameEn: 'UEL', logo: 'https://media.api-sports.io/football/leagues/3.png', isEmoji: false },
  { code: 'UECL', nameKo: '컨퍼런스', nameEn: 'UECL', logo: 'https://media.api-sports.io/football/leagues/848.png', isEmoji: false },
  { code: 'UNL', nameKo: '네이션스', nameEn: 'UNL', logo: 'https://media.api-sports.io/football/leagues/5.png', isEmoji: false },
  { code: 'COP', nameKo: '리베르타', nameEn: 'Libertadores', logo: 'https://media.api-sports.io/football/leagues/13.png', isEmoji: false },
  { code: 'COS', nameKo: '수다메리카나', nameEn: 'Sudamericana', logo: 'https://media.api-sports.io/football/leagues/11.png', isEmoji: false },
  { code: 'AFCON', nameKo: '아프리카컵', nameEn: 'AFCON', logo: 'https://media.api-sports.io/football/leagues/6.png', isEmoji: false },
  
  // ===== 🌍 아프리카 리그 (5개) - NEW! =====
  { code: 'EGY', nameKo: '이집트', nameEn: 'Egypt', logo: 'https://media.api-sports.io/football/leagues/233.png', isEmoji: false },
  { code: 'RSA', nameKo: '남아공', nameEn: 'South Africa', logo: 'https://media.api-sports.io/football/leagues/288.png', isEmoji: false },
  { code: 'MAR', nameKo: '모로코', nameEn: 'Morocco', logo: 'https://media.api-sports.io/football/leagues/200.png', isEmoji: false },
  { code: 'DZA', nameKo: '알제리', nameEn: 'Algeria', logo: 'https://media.api-sports.io/football/leagues/187.png', isEmoji: false },
  { code: 'TUN', nameKo: '튀니지', nameEn: 'Tunisia', logo: 'https://media.api-sports.io/football/leagues/202.png', isEmoji: false },
  
  // ===== 🇰🇷 아시아 (7개) =====
  { code: 'KL1', nameKo: 'K리그1', nameEn: 'K League 1', logo: 'https://media.api-sports.io/football/leagues/292.png', isEmoji: false },
  { code: 'KL2', nameKo: 'K리그2', nameEn: 'K League 2', logo: 'https://media.api-sports.io/football/leagues/293.png', isEmoji: false },
  { code: 'J1', nameKo: 'J1리그', nameEn: 'J1 League', logo: 'https://media.api-sports.io/football/leagues/98.png', isEmoji: false },
  { code: 'J2', nameKo: 'J2리그', nameEn: 'J2 League', logo: 'https://media.api-sports.io/football/leagues/99.png', isEmoji: false },
  { code: 'SAL', nameKo: '사우디', nameEn: 'Saudi Pro', logo: 'https://media.api-sports.io/football/leagues/307.png', isEmoji: false },
  { code: 'CSL', nameKo: '중국', nameEn: 'CSL', logo: 'https://media.api-sports.io/football/leagues/169.png', isEmoji: false },
  { code: 'ALG', nameKo: 'A리그', nameEn: 'A-League', logo: 'https://media.api-sports.io/football/leagues/188.png', isEmoji: false },
  
  // ===== 🏴󠁧󠁢󠁥󠁮󠁧󠁿 잉글랜드 (4개) =====
  { code: 'PL', nameKo: 'EPL', nameEn: 'EPL', logo: 'https://media.api-sports.io/football/leagues/39.png', isEmoji: false },
  { code: 'ELC', nameKo: '챔피언십', nameEn: 'EFL Champ', logo: 'https://media.api-sports.io/football/leagues/40.png', isEmoji: false },
  { code: 'FAC', nameKo: 'FA컵', nameEn: 'FA Cup', logo: 'https://media.api-sports.io/football/leagues/45.png', isEmoji: false },
  { code: 'EFL', nameKo: 'EFL컵', nameEn: 'EFL Cup', logo: 'https://media.api-sports.io/football/leagues/48.png', isEmoji: false },
  
  // ===== 🇪🇸 스페인 (3개) =====
  { code: 'PD', nameKo: '라리가', nameEn: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png', isEmoji: false },
  { code: 'SD', nameKo: '라리가2', nameEn: 'La Liga 2', logo: 'https://media.api-sports.io/football/leagues/141.png', isEmoji: false },
  { code: 'CDR', nameKo: '코파델레이', nameEn: 'Copa del Rey', logo: 'https://media.api-sports.io/football/leagues/143.png', isEmoji: false },
  
  // ===== 🇩🇪 독일 (3개) =====
  { code: 'BL1', nameKo: '분데스', nameEn: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png', isEmoji: false },
  { code: 'BL2', nameKo: '분데스2', nameEn: 'Bundesliga 2', logo: 'https://media.api-sports.io/football/leagues/79.png', isEmoji: false },
  { code: 'DFB', nameKo: 'DFB포칼', nameEn: 'DFB Pokal', logo: 'https://media.api-sports.io/football/leagues/81.png', isEmoji: false },
  
  // ===== 🇮🇹 이탈리아 (3개) =====
  { code: 'SA', nameKo: '세리에A', nameEn: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png', isEmoji: false },
  { code: 'SB', nameKo: '세리에B', nameEn: 'Serie B', logo: 'https://media.api-sports.io/football/leagues/136.png', isEmoji: false },
  { code: 'CIT', nameKo: '코파이탈리아', nameEn: 'Coppa Italia', logo: 'https://media.api-sports.io/football/leagues/137.png', isEmoji: false },
  
  // ===== 🇫🇷 프랑스 (3개) =====
  { code: 'FL1', nameKo: '리그1', nameEn: 'Ligue 1', logo: 'https://media.api-sports.io/football/leagues/61.png', isEmoji: false },
  { code: 'FL2', nameKo: '리그2', nameEn: 'Ligue 2', logo: 'https://media.api-sports.io/football/leagues/62.png', isEmoji: false },
  { code: 'CDF', nameKo: '쿠프드프랑스', nameEn: 'Coupe de France', logo: 'https://media.api-sports.io/football/leagues/66.png', isEmoji: false },
  
  // ===== 🇵🇹 포르투갈 (2개) =====
  { code: 'PPL', nameKo: '포르투갈', nameEn: 'Primeira', logo: 'https://media.api-sports.io/football/leagues/94.png', isEmoji: false },
  { code: 'TDP', nameKo: '타사드포르투갈', nameEn: 'Taca', logo: 'https://media.api-sports.io/football/leagues/96.png', isEmoji: false },
  
  // ===== 🇳🇱 네덜란드 (2개) =====
  { code: 'DED', nameKo: '에레디비시', nameEn: 'Eredivisie', logo: 'https://media.api-sports.io/football/leagues/88.png', isEmoji: false },
  { code: 'KNV', nameKo: 'KNVB컵', nameEn: 'KNVB Cup', logo: 'https://media.api-sports.io/football/leagues/90.png', isEmoji: false },
  
  // ===== 🇪🇺 기타 유럽 (9개) =====
  { code: 'TSL', nameKo: '터키', nameEn: 'Super Lig', logo: 'https://media.api-sports.io/football/leagues/203.png', isEmoji: false },
  { code: 'JPL', nameKo: '벨기에', nameEn: 'Jupiler', logo: 'https://media.api-sports.io/football/leagues/144.png', isEmoji: false },
  { code: 'SPL', nameKo: '스코틀랜드', nameEn: 'Scottish', logo: 'https://media.api-sports.io/football/leagues/179.png', isEmoji: false },
  { code: 'SSL', nameKo: '스위스', nameEn: 'Swiss', logo: 'https://media.api-sports.io/football/leagues/207.png', isEmoji: false },
  { code: 'ABL', nameKo: '오스트리아', nameEn: 'Austrian', logo: 'https://media.api-sports.io/football/leagues/218.png', isEmoji: false },
  { code: 'GSL', nameKo: '그리스', nameEn: 'Greece', logo: 'https://media.api-sports.io/football/leagues/197.png', isEmoji: false },
  { code: 'DSL', nameKo: '덴마크', nameEn: 'Denmark', logo: 'https://media.api-sports.io/football/leagues/119.png', isEmoji: false },
  
  // ===== 🌎 아메리카 (4개) =====
  { code: 'BSA', nameKo: '브라질', nameEn: 'Brasileirao', logo: 'https://media.api-sports.io/football/leagues/71.png', isEmoji: false },
  { code: 'ARG', nameKo: '아르헨티나', nameEn: 'Argentina', logo: 'https://media.api-sports.io/football/leagues/128.png', isEmoji: false },
  { code: 'MLS', nameKo: 'MLS', nameEn: 'MLS', logo: 'https://media.api-sports.io/football/leagues/253.png', isEmoji: false },
  { code: 'LMX', nameKo: '멕시코', nameEn: 'Liga MX', logo: 'https://media.api-sports.io/football/leagues/262.png', isEmoji: false },
]

// 🔥 대륙별 리그 그룹 (PC 사이드바용)
const LEAGUE_GROUPS = [
  {
    id: 'all',
    region: '전체',
    regionEn: 'All',
    leagues: [
      { code: 'ALL', nameKo: '전체', nameEn: 'All', logo: '🌍', isEmoji: true }
    ]
  },
  {
    id: 'international',
    region: '국제대회',
    regionEn: 'International',
    leagues: [
      { code: 'CL', nameKo: '챔스', nameEn: 'UCL', logo: 'https://media.api-sports.io/football/leagues/2.png' },
      { code: 'EL', nameKo: '유로파', nameEn: 'UEL', logo: 'https://media.api-sports.io/football/leagues/3.png' },
      { code: 'UECL', nameKo: '컨퍼런스', nameEn: 'UECL', logo: 'https://media.api-sports.io/football/leagues/848.png' },
      { code: 'UNL', nameKo: '네이션스', nameEn: 'UNL', logo: 'https://media.api-sports.io/football/leagues/5.png' },
      { code: 'COP', nameKo: '리베르타', nameEn: 'Libertadores', logo: 'https://media.api-sports.io/football/leagues/13.png' },
      { code: 'COS', nameKo: '수다메리카나', nameEn: 'Sudamericana', logo: 'https://media.api-sports.io/football/leagues/11.png' },
      { code: 'AFCON', nameKo: '아프리카컵', nameEn: 'AFCON', logo: 'https://media.api-sports.io/football/leagues/6.png' },
    ]
  },
  {
    id: 'asia',
    region: '아시아',
    regionEn: 'Asia',
    leagues: [
      { code: 'KL1', nameKo: 'K리그1', nameEn: 'K League 1', logo: 'https://media.api-sports.io/football/leagues/292.png' },
      { code: 'KL2', nameKo: 'K리그2', nameEn: 'K League 2', logo: 'https://media.api-sports.io/football/leagues/293.png' },
      { code: 'J1', nameKo: 'J1리그', nameEn: 'J1 League', logo: 'https://media.api-sports.io/football/leagues/98.png' },
      { code: 'J2', nameKo: 'J2리그', nameEn: 'J2 League', logo: 'https://media.api-sports.io/football/leagues/99.png' },
      { code: 'SAL', nameKo: '사우디', nameEn: 'Saudi Pro', logo: 'https://media.api-sports.io/football/leagues/307.png' },
      { code: 'CSL', nameKo: '중국', nameEn: 'CSL', logo: 'https://media.api-sports.io/football/leagues/169.png' },
      { code: 'ALG', nameKo: 'A리그', nameEn: 'A-League', logo: 'https://media.api-sports.io/football/leagues/188.png' },
    ]
  },
  {
    id: 'africa',
    region: '아프리카',
    regionEn: 'Africa',
    leagues: [
      { code: 'EGY', nameKo: '이집트', nameEn: 'Egypt', logo: 'https://media.api-sports.io/football/leagues/233.png' },
      { code: 'RSA', nameKo: '남아공', nameEn: 'South Africa', logo: 'https://media.api-sports.io/football/leagues/288.png' },
      { code: 'MAR', nameKo: '모로코', nameEn: 'Morocco', logo: 'https://media.api-sports.io/football/leagues/200.png' },
      { code: 'DZA', nameKo: '알제리', nameEn: 'Algeria', logo: 'https://media.api-sports.io/football/leagues/187.png' },
      { code: 'TUN', nameKo: '튀니지', nameEn: 'Tunisia', logo: 'https://media.api-sports.io/football/leagues/202.png' },
    ]
  },
  {
    id: 'england',
    region: '잉글랜드',
    regionEn: 'England',
    leagues: [
      { code: 'PL', nameKo: 'EPL', nameEn: 'EPL', logo: 'https://media.api-sports.io/football/leagues/39.png' },
      { code: 'ELC', nameKo: '챔피언십', nameEn: 'EFL Champ', logo: 'https://media.api-sports.io/football/leagues/40.png' },
      { code: 'FAC', nameKo: 'FA컵', nameEn: 'FA Cup', logo: 'https://media.api-sports.io/football/leagues/45.png' },
      { code: 'EFL', nameKo: 'EFL컵', nameEn: 'EFL Cup', logo: 'https://media.api-sports.io/football/leagues/48.png' },
    ]
  },
  {
    id: 'spain',
    region: '스페인',
    regionEn: 'Spain',
    leagues: [
      { code: 'PD', nameKo: '라리가', nameEn: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png' },
      { code: 'SD', nameKo: '라리가2', nameEn: 'La Liga 2', logo: 'https://media.api-sports.io/football/leagues/141.png' },
      { code: 'CDR', nameKo: '코파델레이', nameEn: 'Copa del Rey', logo: 'https://media.api-sports.io/football/leagues/143.png' },
    ]
  },
  {
    id: 'germany',
    region: '독일',
    regionEn: 'Germany',
    leagues: [
      { code: 'BL1', nameKo: '분데스', nameEn: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png' },
      { code: 'BL2', nameKo: '분데스2', nameEn: 'Bundesliga 2', logo: 'https://media.api-sports.io/football/leagues/79.png' },
      { code: 'DFB', nameKo: 'DFB포칼', nameEn: 'DFB Pokal', logo: 'https://media.api-sports.io/football/leagues/81.png' },
    ]
  },
  {
    id: 'italy',
    region: '이탈리아',
    regionEn: 'Italy',
    leagues: [
      { code: 'SA', nameKo: '세리에A', nameEn: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png' },
      { code: 'SB', nameKo: '세리에B', nameEn: 'Serie B', logo: 'https://media.api-sports.io/football/leagues/136.png' },
      { code: 'CIT', nameKo: '코파이탈리아', nameEn: 'Coppa Italia', logo: 'https://media.api-sports.io/football/leagues/137.png' },
    ]
  },
  {
    id: 'france',
    region: '프랑스',
    regionEn: 'France',
    leagues: [
      { code: 'FL1', nameKo: '리그1', nameEn: 'Ligue 1', logo: 'https://media.api-sports.io/football/leagues/61.png' },
      { code: 'FL2', nameKo: '리그2', nameEn: 'Ligue 2', logo: 'https://media.api-sports.io/football/leagues/62.png' },
      { code: 'CDF', nameKo: '쿠프드프랑스', nameEn: 'Coupe de France', logo: 'https://media.api-sports.io/football/leagues/66.png' },
    ]
  },
  {
    id: 'europe_other',
    region: '기타 유럽',
    regionEn: 'Other Europe',
    leagues: [
      { code: 'PPL', nameKo: '포르투갈', nameEn: 'Primeira', logo: 'https://media.api-sports.io/football/leagues/94.png' },
      { code: 'DED', nameKo: '에레디비시', nameEn: 'Eredivisie', logo: 'https://media.api-sports.io/football/leagues/88.png' },
      { code: 'TSL', nameKo: '터키', nameEn: 'Super Lig', logo: 'https://media.api-sports.io/football/leagues/203.png' },
      { code: 'JPL', nameKo: '벨기에', nameEn: 'Jupiler', logo: 'https://media.api-sports.io/football/leagues/144.png' },
      { code: 'SPL', nameKo: '스코틀랜드', nameEn: 'Scottish', logo: 'https://media.api-sports.io/football/leagues/179.png' },
      { code: 'SSL', nameKo: '스위스', nameEn: 'Swiss', logo: 'https://media.api-sports.io/football/leagues/207.png' },
      { code: 'ABL', nameKo: '오스트리아', nameEn: 'Austrian', logo: 'https://media.api-sports.io/football/leagues/218.png' },
      { code: 'GSL', nameKo: '그리스', nameEn: 'Greece', logo: 'https://media.api-sports.io/football/leagues/197.png' },
      { code: 'DSL', nameKo: '덴마크', nameEn: 'Denmark', logo: 'https://media.api-sports.io/football/leagues/119.png' },
    ]
  },
  {
    id: 'americas',
    region: '아메리카',
    regionEn: 'Americas',
    leagues: [
      { code: 'BSA', nameKo: '브라질', nameEn: 'Brasileirao', logo: 'https://media.api-sports.io/football/leagues/71.png' },
      { code: 'ARG', nameKo: '아르헨티나', nameEn: 'Argentina', logo: 'https://media.api-sports.io/football/leagues/128.png' },
      { code: 'MLS', nameKo: 'MLS', nameEn: 'MLS', logo: 'https://media.api-sports.io/football/leagues/253.png' },
      { code: 'LMX', nameKo: '멕시코', nameEn: 'Liga MX', logo: 'https://media.api-sports.io/football/leagues/262.png' },
    ]
  },
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
  const { data: session } = useSession()
  const isPremium = (session?.user as any)?.tier === 'premium'
  
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL')
  const [selectedDate, setSelectedDate] = useState<Date>(getLocalToday())
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set())
  
  // 🔥 접이식 그룹 상태 (기본: 주요 리그만 펼침)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['international', 'england', 'spain', 'germany', 'italy']))
  
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

  // 데이터 로드 - ✅ 자동 최신 날짜 폴백 기능 추가 (v2)
  const loadMatchesByDate = async (dateKey: string, isRetry: boolean = false) => {
    // 캐시 체크 (리트라이가 아닐 때만)
    if (!isRetry && dataCache.current[dateKey]) {
      setMatches(dataCache.current[dateKey])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // ✅ autoLatest=true 파라미터 추가 - 데이터 없으면 최신 날짜로 자동 폴백
      const apiUrl = `/api/match-results?league=ALL&date=${dateKey}&stats=true&autoLatest=true`
      const response = await fetch(apiUrl)
      
      if (!response.ok) throw new Error('Failed to fetch match results')
      
      const data = await response.json()

      if (data.success) {
        // ✅ 폴백 처리: API가 다른 날짜 데이터를 반환한 경우
        if (data.usedFallback && data.actualDate && data.actualDate !== dateKey) {
          console.log(`📅 자동 폴백: ${dateKey} → ${data.actualDate}`)
          // 날짜를 실제 데이터가 있는 날짜로 변경
          const [year, month, day] = data.actualDate.split('-').map(Number)
          const newDate = new Date(year, month - 1, day)
          setSelectedDate(newDate)
          // 새 날짜의 캐시에 저장
          dataCache.current[data.actualDate] = data.matches || []
        }
        
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
        
        // 원래 요청한 날짜 또는 실제 날짜로 캐시 저장
        const cacheKey = data.usedFallback ? data.actualDate : dateKey
        dataCache.current[cacheKey] = matchesArray
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
      <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
        <div className="home-container mx-auto flex">
          <aside className="hidden md:block w-64 min-h-screen bg-[#252829] border-r border-gray-800">
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
                <div key={i} className="bg-[#252829] rounded-lg p-4">
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
    <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
      <div className="home-container mx-auto flex">
        {/* 좌측 사이드바 */}
        <aside className="hidden md:block w-64 min-h-screen bg-[#252829] border-r border-gray-800 sticky top-0 overflow-y-auto flex-shrink-0">
          <div className="p-4">
            {/* 🔥 대륙별 리그 그룹 (접이식) */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">
                {currentLanguage === 'ko' ? '리그' : 'Leagues'}
              </h3>
              <div className="space-y-1">
                {LEAGUE_GROUPS.map((group) => {
                  const isAllGroup = group.id === 'all'
                  const isExpanded = expandedGroups.has(group.id)
                  const hasSelectedLeague = group.leagues.some(l => l.code === selectedLeague)
                  
                  // 선택된 리그가 있는 그룹은 자동으로 펼침
                  const shouldShow = isExpanded || hasSelectedLeague
                  
                  return (
                    <div key={group.id}>
                      {isAllGroup ? (
                        // 전체 버튼
                        group.leagues.map((league) => (
                          <button
                            key={league.code}
                            onClick={() => setSelectedLeague(league.code)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                              selectedLeague === league.code
                                ? 'bg-emerald-500 text-gray-900 font-medium'
                                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
                            }`}
                          >
                            <span className="text-base">{league.logo}</span>
                            <span>{currentLanguage === 'ko' ? league.nameKo : league.nameEn}</span>
                          </button>
                        ))
                      ) : (
                        <>
                          {/* 🔥 대륙 헤더 (클릭 가능) */}
                          <button
                            onClick={() => {
                              setExpandedGroups(prev => {
                                const newSet = new Set(prev)
                                if (newSet.has(group.id)) {
                                  newSet.delete(group.id)
                                } else {
                                  newSet.add(group.id)
                                }
                                return newSet
                              })
                            }}
                            className="w-full flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase mt-3 mb-1 px-3 py-1 hover:text-gray-300 hover:bg-gray-800/30 rounded transition-all"
                          >
                            <span>{currentLanguage === 'ko' ? group.region : group.regionEn}</span>
                            <svg 
                              className={`w-3 h-3 transition-transform ${shouldShow ? 'rotate-180' : ''}`} 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {/* 리그 목록 (펼쳐진 경우만) */}
                          {shouldShow && group.leagues.map((league) => (
                            <button
                              key={league.code}
                              onClick={() => setSelectedLeague(league.code)}
                              className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-all ${
                                selectedLeague === league.code
                                  ? 'bg-emerald-500 text-gray-900 font-medium'
                                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
                              }`}
                            >
                              <div className="w-5 h-5 bg-white rounded flex items-center justify-center flex-shrink-0">
                                <Image src={league.logo} alt={league.nameEn} width={14} height={14} className="w-3.5 h-3.5 object-contain" />
                              </div>
                              <span>{currentLanguage === 'ko' ? league.nameKo : league.nameEn}</span>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* 메인 컨텐츠 */}
        <main className="flex-1 w-full md:min-h-screen">
          {/* 날짜 네비게이션 */}
          <div className="sticky top-0 bg-black z-10 border-b border-gray-800">
            <div className="px-4 py-3">
              <div className="flex items-center justify-center gap-4 mb-3">
                <button onClick={goToPreviousDay} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#252829] hover:bg-[#252525] transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button onClick={goToToday} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#252829] hover:bg-[#252525] transition-colors">
                  <span className="text-white font-medium">{formatDateDisplay(selectedDate)}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <button onClick={goToNextDay} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#252829] hover:bg-[#252525] transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* 모바일 리그 필터 */}
              <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
                <div className="flex gap-2 min-w-max">
                  {LEAGUES.map(league => (
                    <button
                      key={league.code}
                      onClick={() => setSelectedLeague(league.code)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                        selectedLeague === league.code
                          ? 'bg-emerald-500 text-gray-900 font-medium'
                          : 'bg-[#252829] text-gray-400'
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
                    {/* 📢 모바일 인피드 광고 - 2번째, 4번째 리그 뒤 (💎 프리미엄 제외) */}
                    {!isPremium && (leagueIndex === 1 || leagueIndex === 3) && (
                      <div className="md:hidden py-2">
                        <div className="text-[10px] text-center mb-1 text-gray-600">스폰서</div>
                        <AdSenseAd slot="mobile_infeed" format="auto" responsive={true} darkMode={true} />
                      </div>
                    )}
                    
                    <div className="bg-[#252829] rounded-xl overflow-hidden">
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
                          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px' }} className="gap-2 px-4 py-2 bg-[#252829] border-b border-gray-800 text-xs text-gray-500 font-medium">
                            <div className="text-center">{currentLanguage === 'ko' ? '시간' : 'Time'}</div>
                            <div className="text-center">{currentLanguage === 'ko' ? '경기' : 'Match'}</div>
                            <div className="text-center">{currentLanguage === 'ko' ? '결과' : 'Result'}</div>
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
                                    style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px' }}
                                    className="w-full gap-2 px-4 py-3 hover:bg-[#252829] transition-colors items-center"
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
                                  className="w-full px-3 py-2.5 hover:bg-[#252829] transition-colors"
                                >
                                  {/* 📱 2줄 스택 레이아웃 */}
                                  <div className="flex flex-col gap-1.5">
                                    {/* 홈팀 행 */}
                                    <div className="flex items-center">
                                      {/* 시간/상태 */}
                                      <div className="w-10 flex-shrink-0 text-xs font-bold text-gray-500">
                                        FT
                                      </div>
                                      {/* 홈 로고 */}
                                      {match.home_crest ? (
                                        <Image src={match.home_crest} alt={match.home_team} width={20} height={20} className="w-5 h-5 object-contain flex-shrink-0 mr-2" />
                                      ) : (
                                        <div className="w-5 h-5 bg-gray-700 rounded-full flex-shrink-0 mr-2" />
                                      )}
                                      {/* 홈팀명 */}
                                      <span className={`flex-1 text-sm font-medium truncate ${
                                        match.isPick && match.pickInfo?.pick_result === 'HOME' 
                                          ? 'text-yellow-400' 
                                          : match.final_score_home > match.final_score_away 
                                            ? 'text-white' 
                                            : 'text-gray-300'
                                      }`}>
                                        {translateTeamName(match.home_team, currentLanguage)}
                                      </span>
                                      {/* 홈 스코어 */}
                                      <span className={`w-6 text-right text-base font-bold tabular-nums ${
                                        match.final_score_home > match.final_score_away ? 'text-white' : 'text-gray-500'
                                      }`}>
                                        {match.final_score_home}
                                      </span>
                                    </div>
                                    
                                    {/* 원정팀 행 */}
                                    <div className="flex items-center">
                                      {/* 시간 영역 (PICK 배지) */}
                                      <div className="w-10 flex-shrink-0">
                                        {match.isPick && (
                                          <span className="text-[9px] text-yellow-400 font-bold">PICK</span>
                                        )}
                                      </div>
                                      {/* 원정 로고 */}
                                      {match.away_crest ? (
                                        <Image src={match.away_crest} alt={match.away_team} width={20} height={20} className="w-5 h-5 object-contain flex-shrink-0 mr-2" />
                                      ) : (
                                        <div className="w-5 h-5 bg-gray-700 rounded-full flex-shrink-0 mr-2" />
                                      )}
                                      {/* 원정팀명 */}
                                      <span className={`flex-1 text-sm font-medium truncate ${
                                        match.isPick && match.pickInfo?.pick_result === 'AWAY' 
                                          ? 'text-yellow-400' 
                                          : match.final_score_away > match.final_score_home 
                                            ? 'text-white' 
                                            : 'text-gray-300'
                                      }`}>
                                        {translateTeamName(match.away_team, currentLanguage)}
                                      </span>
                                      {/* 원정 스코어 */}
                                      <span className={`w-6 text-right text-base font-bold tabular-nums ${
                                        match.final_score_away > match.final_score_home ? 'text-white' : 'text-gray-500'
                                      }`}>
                                        {match.final_score_away}
                                      </span>
                                    </div>
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

        {/* 📢 우측 사이드바 - PC 전용 (💎 프리미엄 제외) */}
        {!isPremium && (
          <aside className="hidden lg:block w-[300px] flex-shrink-0 p-4">
            <div className="sticky top-4 space-y-4">
              {/* 상단 광고 */}
              <div className="rounded-xl overflow-hidden bg-[#252829]">
                <div className="text-[10px] text-center py-1 text-gray-600">AD</div>
                <div className="p-2">
                  <AdSenseAd slot="sidebar_right_top" format="rectangle" darkMode={true} />
                </div>
              </div>

              {/* 하단 광고 */}
              <div className="rounded-xl overflow-hidden bg-[#252829]">
                <div className="text-[10px] text-center py-1 text-gray-600">AD</div>
                <div className="p-2">
                  <AdSenseAd slot="sidebar_right_bottom" format="rectangle" darkMode={true} />
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
