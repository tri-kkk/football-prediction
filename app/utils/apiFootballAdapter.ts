// API-Football 데이터를 우리 프로젝트 형식으로 변환하는 어댑터

// API-Football 리그 ID 매핑
export const API_FOOTBALL_LEAGUES: Record<string, number> = {
  PL: 39,   // 프리미어리그
  PD: 140,  // 라리가
  BL1: 78,  // 분데스리가
  SA: 135,  // 세리에A
  FL1: 61,  // 리그1
  CL: 2,    // 챔피언스리그
}

// 리그 ID → 리그 코드 역매핑
export const LEAGUE_ID_TO_CODE: Record<number, string> = {
  39: 'PL',
  140: 'PD',
  78: 'BL1',
  135: 'SA',
  61: 'FL1',
  2: 'CL',
}

// API-Football Fixture 응답 인터페이스
export interface ApiFootballFixture {
  fixture: {
    id: number
    date: string
    timezone: string
    status: {
      short: string
      long: string
    }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
  }
  teams: {
    home: {
      id: number
      name: string
      logo: string
    }
    away: {
      id: number
      name: string
      logo: string
    }
  }
  goals?: {
    home: number | null
    away: number | null
  }
  score?: {
    halftime: {
      home: number | null
      away: number | null
    }
    fulltime: {
      home: number | null
      away: number | null
    }
  }
}

// API-Football Odds 응답 인터페이스
export interface ApiFootballOdds {
  fixture: {
    id: number
  }
  league: {
    id: number
    name: string
  }
  bookmakers: Array<{
    id: number
    name: string
    bets: Array<{
      id: number
      name: string
      values: Array<{
        value: string
        odd: string
      }>
    }>
  }>
}

// 우리 프로젝트의 Match 인터페이스
export interface ConvertedMatch {
  id: number
  league: string
  leagueCode: string
  leagueLogo: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  homeTeamKR: string
  awayTeamKR: string
  homeCrest: string
  awayCrest: string
  homeScore: number | null
  awayScore: number | null
  status: string
  homeWinRate: number
  drawRate: number
  awayWinRate: number
  utcDate?: string
}

/**
 * 오즈를 확률로 변환
 * 예: 오즈 2.50 → 확률 40%
 */
function oddsToPercentage(odds: number): number {
  if (!odds || odds <= 0) return 0
  const percentage = (1 / odds) * 100
  return Math.round(percentage * 10) / 10 // 소수점 1자리
}

/**
 * 확률 정규화 (합이 100%가 되도록)
 */
function normalizePercentages(home: number, draw: number, away: number) {
  const total = home + draw + away
  if (total === 0) return { home: 33.3, draw: 33.3, away: 33.3 }
  
  return {
    home: Math.round((home / total) * 100 * 10) / 10,
    draw: Math.round((draw / total) * 100 * 10) / 10,
    away: Math.round((away / total) * 100 * 10) / 10,
  }
}

/**
 * API-Football Fixture 데이터를 Match 형식으로 변환
 */
export function convertFixtureToMatch(
  fixture: ApiFootballFixture,
  odds?: ApiFootballOdds
): ConvertedMatch {
  // 리그 코드 가져오기
  const leagueCode = LEAGUE_ID_TO_CODE[fixture.league.id] || 'XX'
  
  // 오즈가 있으면 승률 계산, 없으면 기본값
  let homeWinRate = 33.3
  let drawRate = 33.3
  let awayWinRate = 33.3
  
  if (odds && odds.bookmakers.length > 0) {
    // 첫 번째 북메이커의 오즈 사용
    const bookmaker = odds.bookmakers[0]
    const matchWinnerBet = bookmaker.bets.find(
      bet => bet.name === 'Match Winner' || bet.id === 1
    )
    
    if (matchWinnerBet) {
      const homeOdds = parseFloat(
        matchWinnerBet.values.find(v => v.value === 'Home')?.odd || '0'
      )
      const drawOdds = parseFloat(
        matchWinnerBet.values.find(v => v.value === 'Draw')?.odd || '0'
      )
      const awayOdds = parseFloat(
        matchWinnerBet.values.find(v => v.value === 'Away')?.odd || '0'
      )
      
      const homePercent = oddsToPercentage(homeOdds)
      const drawPercent = oddsToPercentage(drawOdds)
      const awayPercent = oddsToPercentage(awayOdds)
      
      const normalized = normalizePercentages(homePercent, drawPercent, awayPercent)
      homeWinRate = normalized.home
      drawRate = normalized.draw
      awayWinRate = normalized.away
    }
  }
  
  // 날짜/시간 포맷팅 (UTC → KST)
  const utcDate = new Date(fixture.fixture.date)
  const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000))
  
  const dateString = kstDate.toISOString().split('T')[0]
  const timeString = kstDate.toTimeString().slice(0, 5)
  
  return {
    id: fixture.fixture.id,
    league: fixture.league.name,
    leagueCode: leagueCode,
    leagueLogo: fixture.league.logo,
    date: dateString,
    time: timeString,
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    homeTeamKR: fixture.teams.home.name, // 나중에 번역 함수 적용
    awayTeamKR: fixture.teams.away.name, // 나중에 번역 함수 적용
    homeCrest: fixture.teams.home.logo,
    awayCrest: fixture.teams.away.logo,
    homeScore: fixture.goals?.home ?? null,
    awayScore: fixture.goals?.away ?? null,
    status: fixture.fixture.status.long,
    homeWinRate,
    drawRate,
    awayWinRate,
    utcDate: fixture.fixture.date,
  }
}

/**
 * 여러 Fixture를 한 번에 변환
 */
export function convertFixturesToMatches(
  fixtures: ApiFootballFixture[],
  oddsData?: ApiFootballOdds[]
): ConvertedMatch[] {
  return fixtures.map(fixture => {
    // 해당 fixture의 오즈 찾기
    const odds = oddsData?.find(o => o.fixture.id === fixture.fixture.id)
    return convertFixtureToMatch(fixture, odds)
  })
}

/**
 * 날짜 범위 생성 (오늘 ~ 7일 후)
 */
export function getDateRange() {
  const today = new Date()
  const sevenDaysLater = new Date()
  sevenDaysLater.setDate(today.getDate() + 7)
  
  return {
    from: today.toISOString().split('T')[0],
    to: sevenDaysLater.toISOString().split('T')[0],
  }
}

/**
 * API-Football 에러 처리
 */
export function handleApiFootballError(error: any) {
  console.error('❌ API-Football Error:', error)
  
  if (error.response) {
    const status = error.response.status
    const message = error.response.data?.message || 'Unknown error'
    
    switch (status) {
      case 401:
        return 'API 키가 유효하지 않습니다'
      case 429:
        return 'API 요청 한도를 초과했습니다'
      case 499:
        return 'API 구독이 필요합니다'
      default:
        return `API 오류 (${status}): ${message}`
    }
  }
  
  return '네트워크 오류가 발생했습니다'
}
