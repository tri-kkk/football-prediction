'use client'

import { useMemo } from 'react'

export interface Match {
  id: number
  homeTeamKR: string
  awayTeamKR: string
  homeCrest: string
  awayCrest: string
  homeWinRate: number
  drawRate: number
  awayWinRate: number
  trendData?: TrendPoint[]
  utcDate: string
  leagueCode: string
}

export interface TrendPoint {
  timestamp: string
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
}

export interface SmartFilter {
  id: string
  labelKo: string
  labelEn: string
  descriptionKo: string
  descriptionEn: string
  icon: string
  color: string
  filter: (match: Match) => boolean
  priority: number
}

// ===============================
// 리그별 설정
// ===============================

// 리그별 이변 가능성 임계값
const UPSET_THRESHOLDS: Record<string, { min: number, max: number }> = {
  'PL': { min: 25, max: 40 },      // 프리미어리그 (경쟁 치열)
  'PD': { min: 22, max: 38 },      // 라리가 (상위권 강세)
  'BL1': { min: 20, max: 35 },     // 분데스리가 (바이에른 독주)
  'SA': { min: 23, max: 37 },      // 세리에A (중위권 강함)
  'FL1': { min: 21, max: 36 },     // 리그1 (PSG 우세)
  'PPL': { min: 22, max: 37 },     // 프리메이라리가
  'DED': { min: 24, max: 39 },     // 에레디비시 (경쟁적)
  'CL': { min: 28, max: 42 },      // 챔피언스리그 (강팀 위주)
  'EL': { min: 25, max: 40 },      // 유로파리그
  'UECL': { min: 23, max: 38 },    // 컨퍼런스리그
  'UNL': { min: 26, max: 41 },     // 네이션스리그
  'ELC': { min: 20, max: 35 },     // 챔피언십 (혼전)
  'DEFAULT': { min: 20, max: 35 }
}

// ===============================
// 유틸리티 함수들
// ===============================

// 개선된 변동성 계산 (range, 표준편차, 평균 변화율)
function calculateVolatilityMetrics(trendData?: TrendPoint[]): {
  range: number
  stdDev: number
  avgChange: number
} {
  if (!trendData || trendData.length < 2) {
    return { range: 0, stdDev: 0, avgChange: 0 }
  }
  
  const recent = trendData.slice(-6) // 최근 6개 포인트
  const values = recent.map(t => t.homeWinProbability)
  
  // Range (최대-최소)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min
  
  // 표준편차
  const mean = values.reduce((a, b) => a + b) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  
  // 평균 변화율 (연속 포인트 간 차이의 평균)
  const changes = values.slice(1).map((v, i) => Math.abs(v - values[i]))
  const avgChange = changes.length > 0 
    ? changes.reduce((a, b) => a + b, 0) / changes.length 
    : 0
  
  return { range, stdDev, avgChange }
}

// 다중 시간대 트렌드 분석
function getDetailedTrend(trendData?: TrendPoint[]): {
  shortTerm: { home: number, away: number }
  mediumTerm: { home: number, away: number }
} | null {
  if (!trendData || trendData.length < 6) return null
  
  const current = trendData[trendData.length - 1]
  const threeHoursAgo = trendData.length >= 3 ? trendData[trendData.length - 3] : current
  const sixHoursAgo = trendData[0]
  
  return {
    shortTerm: {
      home: current.homeWinProbability - threeHoursAgo.homeWinProbability,
      away: current.awayWinProbability - threeHoursAgo.awayWinProbability
    },
    mediumTerm: {
      home: current.homeWinProbability - sixHoursAgo.homeWinProbability,
      away: current.awayWinProbability - sixHoursAgo.awayWinProbability
    }
  }
}

// 경기가 오늘인지 확인
function isToday(utcDate: string): boolean {
  const matchDate = new Date(utcDate)
  const today = new Date()
  
  return matchDate.toDateString() === today.toDateString()
}

// 경기가 라이브인지 확인
function isMatchLive(match: Match): boolean {
  const now = new Date()
  const matchTime = new Date(match.utcDate)
  const matchEnd = new Date(matchTime.getTime() + 120 * 60000) // 120분 후
  
  return now >= matchTime && now <= matchEnd
}

// ===============================
// 스마트 필터 정의 (다국어)
// ===============================

export const smartFilters: SmartFilter[] = [
  {
    id: 'high-value',
    labelKo: '고가치 경기',
    labelEn: 'High Value',
    descriptionKo: '배당 변동이 큰 경기 (range ≥ 8% 또는 stdDev ≥ 3)',
    descriptionEn: 'High volatility matches (range ≥ 8% or stdDev ≥ 3)',
    icon: '💎',
    color: '#a855f7', // purple
    priority: 1,
    filter: (match) => {
      const metrics = calculateVolatilityMetrics(match.trendData)
      return metrics.range >= 8 || metrics.stdDev >= 3
    }
  },
  {
    id: 'upset-potential',
    labelKo: '이변 가능성',
    labelEn: 'Upset Potential',
    descriptionKo: '약팀이 강팀을 이길 수 있는 경기',
    descriptionEn: 'Underdog can beat favorite',
    icon: '🎭',
    color: '#f97316', // orange
    priority: 2,
    filter: (match) => {
      const threshold = UPSET_THRESHOLDS[match.leagueCode] || UPSET_THRESHOLDS.DEFAULT
      
      const homeUnderdog = match.homeWinRate >= threshold.min && match.homeWinRate < threshold.max
      const awayUnderdog = match.awayWinRate >= threshold.min && match.awayWinRate < threshold.max
      
      return homeUnderdog || awayUnderdog
    }
  },
  {
    id: 'close-match',
    labelKo: '박빙 승부',
    labelEn: 'Close Match',
    descriptionKo: '승률 차이 10% 이내 + 무승부 확률 25% 이상',
    descriptionEn: 'Win rate diff < 10% + Draw ≥ 25%',
    icon: '⚖️',
    color: '#3b82f6', // blue
    priority: 3,
    filter: (match) => {
      const diff = Math.abs(match.homeWinRate - match.awayWinRate)
      return diff < 10 && match.drawRate >= 25
    }
  },
  {
    id: 'trending-up',
    labelKo: '상승 추세',
    labelEn: 'Trending Up',
    descriptionKo: '최근 3-6시간 배당 상승 (3% 이상)',
    descriptionEn: 'Odds rising in last 3-6 hours (≥3%)',
    icon: '📈',
    color: '#10b981', // green
    priority: 4,
    filter: (match) => {
      const trend = getDetailedTrend(match.trendData)
      if (!trend) return false
      
      return trend.shortTerm.home > 3 || trend.shortTerm.away > 3 ||
             trend.mediumTerm.home > 5 || trend.mediumTerm.away > 5
    }
  },
  {
    id: 'trending-down',
    labelKo: '하락 추세',
    labelEn: 'Trending Down',
    descriptionKo: '최근 3-6시간 배당 하락 (3% 이상)',
    descriptionEn: 'Odds falling in last 3-6 hours (≥3%)',
    icon: '📉',
    color: '#ef4444', // red
    priority: 5,
    filter: (match) => {
      const trend = getDetailedTrend(match.trendData)
      if (!trend) return false
      
      return trend.shortTerm.home < -3 || trend.shortTerm.away < -3 ||
             trend.mediumTerm.home < -5 || trend.mediumTerm.away < -5
    }
  },
  {
    id: 'today',
    labelKo: '오늘 경기',
    labelEn: 'Today',
    descriptionKo: '오늘 열리는 경기',
    descriptionEn: 'Matches today',
    icon: '📅',
    color: '#8b5cf6', // violet
    priority: 6,
    filter: (match) => isToday(match.utcDate)
  },
  {
    id: 'goal-fest',
    labelKo: '골잔치 예상',
    labelEn: 'Goal Fest',
    descriptionKo: '무승부 확률 낮고 공격적인 경기',
    descriptionEn: 'Low draw rate, offensive match',
    icon: '⚽',
    color: '#f59e0b', // amber
    priority: 7,
    filter: (match) => {
      return match.drawRate < 20 && 
             (match.homeWinRate > 35 || match.awayWinRate > 35)
    }
  },
  {
    id: 'defensive-battle',
    labelKo: '수비 대결',
    labelEn: 'Defensive Battle',
    descriptionKo: '무승부 가능성 높음 (30% 이상)',
    descriptionEn: 'High draw probability (≥30%)',
    icon: '🛡️',
    color: '#64748b', // slate
    priority: 8,
    filter: (match) => match.drawRate >= 30
  },
  {
    id: 'dominant-favorite',
    labelKo: '압도적 우세',
    labelEn: 'Dominant Favorite',
    descriptionKo: '한 팀의 승률이 65% 이상',
    descriptionEn: 'One team win rate ≥ 65%',
    icon: '🏆',
    color: '#dc2626', // red
    priority: 9,
    filter: (match) => {
      const maxWin = Math.max(match.homeWinRate, match.awayWinRate)
      return maxWin >= 65
    }
  },
  {
    id: 'live',
    labelKo: '라이브 경기',
    labelEn: 'Live',
    descriptionKo: '현재 진행 중인 경기',
    descriptionEn: 'Match in progress',
    icon: '🔴',
    color: '#ff0000', // bright red
    priority: 0, // 최우선
    filter: (match) => isMatchLive(match)
  }
]

// ===============================
// 필터 적용 Hook
// ===============================

export function useSmartFilters(matches: Match[], activeFilterIds: string[]) {
  const filteredMatches = useMemo(() => {
    if (activeFilterIds.length === 0) return matches
    
    const activeFilters = smartFilters.filter(f => activeFilterIds.includes(f.id))
    
    return matches.filter(match => {
      // 모든 활성 필터를 만족해야 함 (AND 조건)
      return activeFilters.every(filter => filter.filter(match))
    })
  }, [matches, activeFilterIds])
  
  return filteredMatches
}

// ===============================
// 배지 생성 함수
// ===============================

export function getMatchBadges(match: Match): SmartFilter[] {
  return smartFilters
    .filter(filter => filter.filter(match))
    .sort((a, b) => a.priority - b.priority) // 우선순위 순 정렬 (낮은 숫자가 우선)
    .slice(0, 3) // 최대 3개만 표시
}

// ===============================
// 필터별 매칭 카운트 (UI용)
// ===============================

export function getFilterMatchCounts(matches: Match[]): Record<string, number> {
  const counts: Record<string, number> = {}
  
  smartFilters.forEach(filter => {
    counts[filter.id] = matches.filter(match => filter.filter(match)).length
  })
  
  return counts
}
