// remotion/types.ts
// ShortsGenerator.tsx 의 Game 인터페이스와 1:1 호환 (shorts-data API 응답 그대로 사용 가능)

export interface TeamMeta {
  ko: string
  en: string
  ab: string
  c1: string
  c2: string
  logo: string
}

export interface Pitcher {
  name: string
  era: number | null
  whip: number | null
  k: number | null
}

export interface Game {
  id: number
  dbId?: number
  league: string
  home: TeamMeta
  away: TeamMeta
  winRate: { home: number; away: number }
  pick: {
    team: string
    side: 'home' | 'away'
    stars: number
    confidence: number | null
    grade: string | null
  }
  pitchers: { home: Pitcher; away: Pitcher } | null
  aiAnalysis: string | null
  matchTime: string
  matchDate: string
  status: string
}

/** 씬별 배경 영상 지정. public/videos/ 기준 파일명. null 이면 그라디언트 폴백. */
export interface BackgroundMap {
  hook?: string | null
  matchup?: string | null
  pitcher?: string | null
  analysis?: string | null
  reveal?: string | null
  cta?: string | null
}

export interface ShortsProps {
  game: Game
  showLogos: boolean
  /** public/sounds/ 기준 파일명. 빈 문자열이면 무음. */
  bgm: string
  backgrounds: BackgroundMap
}
