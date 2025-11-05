'use client'

import { useMemo } from 'react'

export interface Match {
  id: number
  homeTeamKR: string
  awayTeamKR: string
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
  label: string
  description: string
  icon: string
  color: string
  filter: (match: Match) => boolean
  priority: number
}

// ===============================
// 유틸리티 함수들
// ===============================

// 변동성 계산 (최근 6시간 기준)
function calculateVolatility(trendData?: TrendPoint[]): number {
  if (!trendData || trendData.length < 2) return 0
  
  const recent = trendData.slice(-6) // 최근 6개 포인트
  const values = recent.map(t => t.homeWinProbability)
  
  const max = Math.max(...values)
  const min = Math.min(...values)
  
  return max - min
}

// 트렌드 방향 분석
function getTrendDirection(trendData?: TrendPoint[]): { home: 'up' | 'down' | 'stable', away: 'up' | 'down' | 'stable' } {
  if (!trendData || trendData.length < 3) {
    return { home: 'stable', away: 'stable' }
  }
  
  const recent = trendData.slice(-3)
  const homeChange = recent[recent.length - 1].homeWinProbability - recent[0].homeWinProbability
  const awayChange = recent[recent.length - 1].awayWinProbability - recent[0].awayWinProbability
  
  return {
    home: homeChange > 2 ? 'up' : homeChange < -2 ? 'down' : 'stable',
    away: awayChange > 2 ? 'up' : awayChange < -2 ? 'down' : 'stable'
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
// 스마트 필터 정의
// ===============================

export const smartFilters: SmartFilter[] = [
  {
    id: 'high-value',
    label: '고가치 경기',
    description: '배당 변동 폭이 5% 이상인 경기',
    icon: '💎',
    color: '#a855f7', // purple
    priority: 1,
    filter: (match) => {
      const volatility = calculateVolatility(match.trendData)
      return volatility >= 5
    }
  },
  {
    id: 'upset-potential',
    label: '이변 가능성',
    description: '약팀이 강팀을 이길 수 있는 경기',
    icon: '🎭',
    color: '#f97316', // orange
    priority: 2,
    filter: (match) => {
      const homeUnderdog = match.homeWinRate >= 20 && match.homeWinRate < 35
      const awayUnderdog = match.awayWinRate >= 20 && match.awayWinRate < 35
      return homeUnderdog || awayUnderdog
    }
  },
  {
    id: 'close-match',
    label: '박빙 승부',
    description: '승률 차이가 10% 이내인 경기',
    icon: '⚖️',
    color: '#3b82f6', // blue
    priority: 3,
    filter: (match) => {
      const diff = Math.abs(match.homeWinRate - match.awayWinRate)
      return diff < 10
    }
  },
  {
    id: 'trending-up',
    label: '상승 추세',
    description: '최근 배당이 상승하는 팀이 있는 경기',
    icon: '📈',
    color: '#10b981', // green
    priority: 4,
    filter: (match) => {
      const trend = getTrendDirection(match.trendData)
      return trend.home === 'up' || trend.away === 'up'
    }
  },
  {
    id: 'trending-down',
    label: '하락 추세',
    description: '최근 배당이 하락하는 팀이 있는 경기',
    icon: '📉',
    color: '#ef4444', // red
    priority: 5,
    filter: (match) => {
      const trend = getTrendDirection(match.trendData)
      return trend.home === 'down' || trend.away === 'down'
    }
  },
  {
    id: 'today',
    label: '오늘 경기',
    description: '오늘 열리는 경기',
    icon: '📅',
    color: '#8b5cf6', // violet
    priority: 6,
    filter: (match) => isToday(match.utcDate)
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
    .sort((a, b) => a.priority - b.priority) // 우선순위 순 정렬
    .slice(0, 3) // 최대 3개만 표시
}

// ===============================
// 사용 예시 (주석)
// ===============================

/*
// 컴포넌트에서 사용

const [activeFilters, setActiveFilters] = useState<string[]>([])
const filteredMatches = useSmartFilters(matches, activeFilters)

const toggleFilter = (filterId: string) => {
  setActiveFilters(prev => 
    prev.includes(filterId)
      ? prev.filter(id => id !== filterId)
      : [...prev, filterId]
  )
}

// 배지 표시
const badges = getMatchBadges(match)
badges.map(badge => (
  <Badge key={badge.id} color={badge.color}>
    {badge.icon} {badge.label}
  </Badge>
))
*/