// utils/apiFootballAdapter.ts
// API-Football 데이터를 우리 프로젝트 형식으로 변환

interface APIFootballFixture {
  fixture: {
    id: number
    date: string
    timestamp: number
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
      winner: boolean | null
    }
    away: {
      id: number
      name: string
      logo: string
      winner: boolean | null
    }
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
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

interface APIFootballOdds {
  fixture: {
    id: number
  }
  league: {
    id: number
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

interface OurMatchFormat {
  id: string
  league: string
  leagueCode: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  homeTeamKR: string
  awayTeamKR: string
  homeCrest: string
  awayCrest: string
  homeWinRate: number
  drawRate: number
  awayWinRate: number
  homeOdds?: number
  drawOdds?: number
  awayOdds?: number
}

// 팀명 한글 번역 (기존 함수 재사용)
const TEAM_TRANSLATIONS: { [key: string]: string } = {
  // Premier League
  'Manchester United': '맨체스터 유나이티드',
  'Manchester City': '맨체스터 시티',
  'Liverpool': '리버풀',
  'Chelsea': '첼시',
  'Arsenal': '아스널',
  'Tottenham': '토트넘',
  // ... 기존 번역 사용
}

function translateTeamName(englishName: string): string {
  return TEAM_TRANSLATIONS[englishName] || englishName
}

// 리그 코드 매핑
const LEAGUE_CODE_MAP: { [key: number]: string } = {
  39: 'PL',
  140: 'PD',
  78: 'BL1',
  135: 'SA',
  61: 'FL1',
  2: 'CL',
  94: 'PPL',
  88: 'DED',
  3: 'EL',
  40: 'ELC'
}

// 오즈를 확률로 변환
function oddsToProbability(odds: number): number {
  return (1 / odds) * 100
}

// API-Football Fixture → 우리 형식
export function convertFixtureToOurFormat(
  fixture: APIFootballFixture,
  odds?: APIFootballOdds
): OurMatchFormat {
  const leagueId = fixture.league.id
  const leagueCode = LEAGUE_CODE_MAP[leagueId] || 'UNKNOWN'
  
  // 오즈 추출 (첫 번째 북메이커 사용)
  let homeOdds = 2.5
  let drawOdds = 3.0
  let awayOdds = 2.5
  
  if (odds && odds.bookmakers.length > 0) {
    const bookmaker = odds.bookmakers[0]
    const matchWinnerBet = bookmaker.bets.find(bet => bet.name === 'Match Winner')
    
    if (matchWinnerBet) {
      const homeValue = matchWinnerBet.values.find(v => v.value === 'Home')
      const drawValue = matchWinnerBet.values.find(v => v.value === 'Draw')
      const awayValue = matchWinnerBet.values.find(v => v.value === 'Away')
      
      homeOdds = homeValue ? parseFloat(homeValue.odd) : 2.5
      drawOdds = drawValue ? parseFloat(drawValue.odd) : 3.0
      awayOdds = awayValue ? parseFloat(awayValue.odd) : 2.5
    }
  }
  
  // 확률 계산
  const homeProb = oddsToProbability(homeOdds)
  const drawProb = oddsToProbability(drawOdds)
  const awayProb = oddsToProbability(awayOdds)
  
  // 정규화
  const total = homeProb + drawProb + awayProb
  const homeWinRate = (homeProb / total) * 100
  const drawRate = (drawProb / total) * 100
  const awayWinRate = (awayProb / total) * 100
  
  // 시간 포맷 (GMT+9)
  const date = new Date(fixture.fixture.date)
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000))
  const time = kstDate.toTimeString().slice(0, 5)
  
  return {
    id: fixture.fixture.id.toString(),
    league: fixture.league.name,
    leagueCode: leagueCode,
    date: fixture.fixture.date,
    time: time,
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    homeTeamKR: translateTeamName(fixture.teams.home.name),
    awayTeamKR: translateTeamName(fixture.teams.away.name),
    homeCrest: fixture.teams.home.logo,
    awayCrest: fixture.teams.away.logo,
    homeWinRate: Number(homeWinRate.toFixed(2)),
    drawRate: Number(drawRate.toFixed(2)),
    awayWinRate: Number(awayWinRate.toFixed(2)),
    homeOdds: Number(homeOdds.toFixed(2)),
    drawOdds: Number(drawOdds.toFixed(2)),
    awayOdds: Number(awayOdds.toFixed(2))
  }
}

// 여러 경기 변환
export function convertFixturesToOurFormat(
  fixtures: APIFootballFixture[],
  oddsMap?: Map<number, APIFootballOdds>
): OurMatchFormat[] {
  return fixtures.map(fixture => {
    const fixtureId = fixture.fixture.id
    const odds = oddsMap?.get(fixtureId)
    return convertFixtureToOurFormat(fixture, odds)
  })
}
