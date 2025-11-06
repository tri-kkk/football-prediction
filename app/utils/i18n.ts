// app/utils/i18n.ts
// 다국어 지원 유틸리티

export type Language = 'ko' | 'en'

// 번역 데이터
export const translations = {
  ko: {
    // 공통
    loading: '로딩 중...',
    error: '오류가 발생했습니다',
    
    // 리그
    allLeagues: '전체',
    premierLeague: '프리미어리그',
    laLiga: '라리가',
    bundesliga: '분데스리가',
    serieA: '세리에A',
    ligue1: '리그1',
    championsLeague: '챔피언스리그',
    
    // 필터
    smartFilters: '스마트 필터',
    leagueSelection: '리그 선택',
    scrollHint: '← 좌우로 스크롤하세요 →',
    
    // 경기 정보
    today: '오늘',
    tomorrow: '내일',
    home: '홈',
    draw: '무승부',
    away: '원정',
    vs: 'VS',
    
    // 통계
    totalMatches: '전체 경기',
    filterResults: '필터 결과',
    activeFilters: '활성 필터',
    filterRate: '필터율',
    
    // 승률
    winProbability: '승률',
    homeWin: '홈 승',
    awayWin: '원정 승',
    
    // 트렌드
    trend24h: '24시간 트렌드',
    trendChart: '트렌드 차트',
    clickToSeeChart: '클릭하면 24시간 트렌드를 볼 수 있습니다',
    trendDataLoading: '트렌드 데이터 로딩 중...',
    
    // 뉴스
    latestNews: '최신 뉴스',
    newsArticles: '개',
    sources: '출처',
    openInNewTab: '새 탭에서 열기',
    loadingArticle: '기사를 불러오는 중...',
    
    // 필터 초기화
    resetFilters: '필터 초기화',
    noMatches: '조건에 맞는 경기가 없습니다',
    noScheduledMatches: '예정된 경기가 없습니다',
    
    // 스마트 필터 설명
    filters: {
      highValue: {
        label: '고가치 경기',
        description: '배당 변동 폭이 5% 이상인 경기'
      },
      upsetPotential: {
        label: '이변 가능성',
        description: '약팀이 강팀을 이길 수 있는 경기'
      },
      closeMatch: {
        label: '박빙 승부',
        description: '승률 차이가 10% 이내인 경기'
      },
      trendingUp: {
        label: '상승 추세',
        description: '최근 배당이 상승하는 팀이 있는 경기'
      },
      trendingDown: {
        label: '하락 추세',
        description: '최근 배당이 하락하는 팀이 있는 경기'
      },
      today: {
        label: '오늘 경기',
        description: '오늘 열리는 경기'
      }
    }
  },
  
  en: {
    // Common
    loading: 'Loading...',
    error: 'An error occurred',
    
    // Leagues
    allLeagues: 'All',
    premierLeague: 'Premier League',
    laLiga: 'La Liga',
    bundesliga: 'Bundesliga',
    serieA: 'Serie A',
    ligue1: 'Ligue 1',
    championsLeague: 'Champions League',
    
    // Filters
    smartFilters: 'Smart Filters',
    leagueSelection: 'League Selection',
    scrollHint: '← Scroll left and right →',
    
    // Match Info
    today: 'Today',
    tomorrow: 'Tomorrow',
    home: 'Home',
    draw: 'Draw',
    away: 'Away',
    vs: 'VS',
    
    // Statistics
    totalMatches: 'Total Matches',
    filterResults: 'Filter Results',
    activeFilters: 'Active Filters',
    filterRate: 'Filter Rate',
    
    // Win Probability
    winProbability: 'Win Probability',
    homeWin: 'Home Win',
    awayWin: 'Away Win',
    
    // Trend
    trend24h: '24H Trend',
    trendChart: 'Trend Chart',
    clickToSeeChart: 'Click to see 24-hour trend chart',
    trendDataLoading: 'Loading trend data...',
    
    // News
    latestNews: 'Latest News',
    newsArticles: 'articles',
    sources: 'Sources',
    openInNewTab: 'Open in new tab',
    loadingArticle: 'Loading article...',
    
    // Reset Filters
    resetFilters: 'Reset Filters',
    noMatches: 'No matches found',
    noScheduledMatches: 'No scheduled matches',
    
    // Smart Filter Descriptions
    filters: {
      highValue: {
        label: 'High Value',
        description: 'Odds change >= 5%'
      },
      upsetPotential: {
        label: 'Upset Potential',
        description: 'Underdog has a chance'
      },
      closeMatch: {
        label: 'Close Match',
        description: 'Win probability difference < 10%'
      },
      trendingUp: {
        label: 'Trending Up',
        description: 'Team odds increasing recently'
      },
      trendingDown: {
        label: 'Trending Down',
        description: 'Team odds decreasing recently'
      },
      today: {
        label: 'Today',
        description: 'Matches today'
      }
    }
  }
}

// 브라우저 언어 감지
export function detectLanguage(): Language {
  if (typeof window === 'undefined') return 'ko' // SSR 기본값
  
  const browserLang = navigator.language.toLowerCase()
  
  // 한국어 감지
  if (browserLang.startsWith('ko')) return 'ko'
  
  // 기본값: 영어
  return 'en'
}

// 번역 함수
export function t(key: string, lang: Language): string {
  const keys = key.split('.')
  let value: any = translations[lang]
  
  for (const k of keys) {
    value = value?.[k]
  }
  
  return value || key
}

// Hook: useTranslation
import { useState, useEffect } from 'react'

export function useTranslation() {
  const [language, setLanguage] = useState<Language>('ko')
  
  useEffect(() => {
    const detected = detectLanguage()
    setLanguage(detected)
    
    // localStorage에 저장 (선택사항)
    const saved = localStorage.getItem('language') as Language
    if (saved && (saved === 'ko' || saved === 'en')) {
      setLanguage(saved)
    }
  }, [])
  
  const changeLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
  }
  
  const translate = (key: string) => t(key, language)
  
  return {
    language,
    changeLanguage,
    t: translate
  }
}
