// remotion/result/types.ts
// /api/admin/shorts-result 응답과 1:1 대응

export interface ResultTeam {
  name: string
  logo: string
}

export interface MatchResult {
  matchId: string | number
  league: string
  leagueLabel: string
  leagueLogo: string
  home: ResultTeam
  away: ResultTeam
  homeScore: number | null
  awayScore: number | null
  pickSide: 'HOME' | 'DRAW' | 'AWAY'
  pickTeam: string
  probability: number
  isCorrect: boolean
  /** 무승부로 끝난 경기 — 모델이 애초에 예측하지 않는 결과라 ❌ 와 구분해 표시한다 */
  isDraw: boolean
}

export interface ResultProps {
  date: string
  sport: 'football' | 'baseball'
  groupLabel: string
  /** "어제" / "오늘 새벽" — 유럽 축구는 한국시간 새벽에 끝나 "어제" 가 안 맞는다 */
  windowLabel?: string
  results: MatchResult[]
  summary: {
    total: number
    correct: number
    draws: number
    accuracy: number
  }
  cumulative: {
    decisive: number
    correct: number
    accuracy: number
    drawCount: number
    drawRate: number
  } | null
  bgm: string
  backgrounds: {
    hook?: string | null
    results?: string | null
    score?: string | null
    cta?: string | null
  }
}
