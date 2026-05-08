// 🔥 트렌드사커 통합 브랜드 — Step 2 (2026-04-29)
// 축구·야구 매치를 단일 타입으로 통합 (UnifiedMatch)

export type Sport = 'football' | 'baseball'
export type SportFilter = 'all' | Sport

export interface UnifiedMatch {
  // 식별
  id: string | number
  sport: Sport
  league: string         // PL, PD, KBO, MLB, NPB...
  leagueName?: string    // 표시용 (야구 응답에 있음)
  leagueLogo?: string    // 리그 엠블럼 이미지 URL

  // 시간
  date: string
  time: string | null
  timestamp: string | null  // ISO

  // 상태
  status: string          // 'NS' | 'LIVE' | 'FT' | 'IN_PROGRESS' | ...

  // 홈/원정 (KO 우선)
  homeTeam: string
  homeTeamKo?: string
  homeLogo: string
  homeScore: number | null

  awayTeam: string
  awayTeamKo?: string
  awayLogo: string
  awayScore: number | null

  // 배당/분석 (있는 경우만)
  odds?: {
    homeWinProb: number
    awayWinProb: number
    drawProb?: number     // 축구만
  } | null

  aiPick?: string | null
  aiPickConfidence?: string | null

  // 분석 정보 (축구 우선)
  predictedWinner?: 'home' | 'draw' | 'away' | null
  predictedScoreHome?: number | null
  predictedScoreAway?: number | null

  // 야구 전용 (있어도 무시 가능)
  innings?: any
  homePitcher?: string | null
  awayPitcher?: string | null
}

// 빅 매치 화이트리스트 — Hero "오늘의 PICK" 후보
