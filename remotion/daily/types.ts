// remotion/daily/types.ts
// /api/admin/shorts-daily 응답과 1:1 대응

export interface DailyTeam {
  name: string
  logo: string
  /** 리그 순위 — standings 조회 실패 시 null */
  position: number | null
  points: number | null
  /** 최근 5경기, 최신이 뒤. 'W' | 'D' | 'L' */
  form: string[]
}

export interface DailyPick {
  matchId: string | number
  league: string
  leagueLabel: string
  /** 리그 엠블럼 URL — 없으면 빈 문자열 */
  leagueLogo: string
  home: DailyTeam
  away: DailyTeam
  pickSide: 'HOME' | 'DRAW' | 'AWAY'
  pickTeam: string
  probability: number
  /** 승 / 무 / 패 3-way 확률 */
  odds3: { home: number; draw: number; away: number }
  stars: number
  matchTime: string
}

export interface DailyProps {
  date: string
  sport: 'football' | 'baseball'
  groupLabel: string
  /** 오늘 분석한 전체 경기 수 — "N경기 중 3경기 통과" 서사의 분모 */
  totalMatches: number
  picks: DailyPick[]
  bgm: string
  backgrounds: {
    opener?: string | null
    pick?: string | null
    summary?: string | null
    cta?: string | null
  }
}
