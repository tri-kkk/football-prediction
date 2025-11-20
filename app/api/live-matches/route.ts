import { NextRequest, NextResponse } from 'next/server'
import { TEAM_NAME_KR } from '../../teamLogos'

// 리그 ID 매핑
const LEAGUE_IDS: Record<string, number> = {
  'PL': 39,    // Premier League
  'PD': 140,   // La Liga
  'BL1': 78,   // Bundesliga
  'SA': 135,   // Serie A
  'FL1': 61,   // Ligue 1
  'CL': 2,     // Champions League
  'PPL': 94,   // Primeira Liga
  'DED': 88,   // Eredivisie
  'EL': 3,     // Europa League
  'ELC': 40    // Championship
}

export async function GET(request: NextRequest) {
  try {
    // 🧪 테스트 모드: ?test=true 로 활성화
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get('test') === 'true'

    if (testMode) {
      console.log('🧪 테스트 모드: 임시 데이터 반환')
      return NextResponse.json(generateTestData())
    }

    const apiKey = process.env.API_FOOTBALL_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    console.log('🔴 라이브 경기 조회 시작...')

    // API-Football에서 현재 라이브 경기 조회
    const response = await fetch(
      'https://v3.football.api-sports.io/fixtures?live=all',
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        next: { revalidate: 0 } // 캐싱 안 함
      }
    )

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`)
    }

    const data = await response.json()
    console.log('📥 받은 라이브 경기 수:', data.response?.length || 0)

    // 우리가 지원하는 리그만 필터링
    const supportedLeagueIds = Object.values(LEAGUE_IDS)
    const liveMatches = data.response.filter((match: any) =>
      supportedLeagueIds.includes(match.league.id)
    )

    console.log('✅ 필터링된 경기 수:', liveMatches.length)

    // 한글 팀명 및 추가 정보 추가
    const matchesWithKorean = liveMatches.map((match: any) => {
      // 리그 코드 찾기 (역매핑)
      const leagueCode = Object.keys(LEAGUE_IDS).find(
        key => LEAGUE_IDS[key] === match.league.id
      ) || 'UNKNOWN'

      return {
        id: match.fixture.id,
        leagueCode: leagueCode,
        league: match.league.name,
        leagueLogo: match.league.logo,
        country: match.league.country,
        
        // 경기 시간
        date: match.fixture.date,
        timestamp: match.fixture.timestamp,
        
        // 경기 상태
        status: match.fixture.status.short, // 'LIVE', '1H', '2H', 'HT', 'ET', 'P', 'FT' 등
        statusLong: match.fixture.status.long,
        elapsed: match.fixture.status.elapsed, // 진행 시간 (분)
        
        // 팀 정보
        homeTeam: match.teams.home.name,
        awayTeam: match.teams.away.name,
        homeTeamKR: translateTeamName(match.teams.home.name),
        awayTeamKR: translateTeamName(match.teams.away.name),
        homeCrest: match.teams.home.logo,
        awayCrest: match.teams.away.logo,
        
        // 현재 스코어
        homeScore: match.goals.home,
        awayScore: match.goals.away,
        
        // 하프타임 스코어
        halftimeHomeScore: match.score.halftime.home,
        halftimeAwayScore: match.score.halftime.away
      }
    })

    return NextResponse.json({
      success: true,
      count: matchesWithKorean.length,
      matches: matchesWithKorean,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ 라이브 경기 조회 실패:', error)
    return NextResponse.json(
      { 
        error: '라이브 경기를 불러올 수 없습니다.',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// 팀명 번역 함수 (teamLogos.ts의 TEAM_NAME_KR 활용)
function translateTeamName(englishName: string): string {
  // 먼저 TEAM_NAME_KR 객체에서 검색
  if (TEAM_NAME_KR[englishName]) {
    return TEAM_NAME_KR[englishName]
  }
  
  // 없으면 영문 그대로 반환
  return englishName
}

// 🧪 테스트 데이터 생성 함수
function generateTestData() {
  const now = new Date()
  
  const testMatches = [
    {
      id: 1234567,
      leagueCode: 'PL',
      league: 'Premier League',
      leagueLogo: 'https://media.api-sports.io/football/leagues/39.png',
      country: 'England',
      date: now.toISOString(),
      timestamp: Math.floor(now.getTime() / 1000),
      status: '2H',
      statusLong: 'Second Half',
      elapsed: 67,
      homeTeam: 'Manchester City',
      awayTeam: 'Liverpool',
      homeTeamKR: '맨체스터 시티',
      awayTeamKR: '리버풀',
      homeCrest: 'https://media.api-sports.io/football/teams/50.png',
      awayCrest: 'https://media.api-sports.io/football/teams/40.png',
      homeScore: 2,
      awayScore: 1,
      halftimeHomeScore: 1,
      halftimeAwayScore: 0
    },
    {
      id: 1234568,
      leagueCode: 'PD',
      league: 'La Liga',
      leagueLogo: 'https://media.api-sports.io/football/leagues/140.png',
      country: 'Spain',
      date: now.toISOString(),
      timestamp: Math.floor(now.getTime() / 1000),
      status: '1H',
      statusLong: 'First Half',
      elapsed: 23,
      homeTeam: 'Real Madrid',
      awayTeam: 'Barcelona',
      homeTeamKR: '레알 마드리드',
      awayTeamKR: '바르셀로나',
      homeCrest: 'https://media.api-sports.io/football/teams/541.png',
      awayCrest: 'https://media.api-sports.io/football/teams/529.png',
      homeScore: 0,
      awayScore: 0,
      halftimeHomeScore: null,
      halftimeAwayScore: null
    },
    {
      id: 1234569,
      leagueCode: 'BL1',
      league: 'Bundesliga',
      leagueLogo: 'https://media.api-sports.io/football/leagues/78.png',
      country: 'Germany',
      date: now.toISOString(),
      timestamp: Math.floor(now.getTime() / 1000),
      status: 'HT',
      statusLong: 'Halftime',
      elapsed: 45,
      homeTeam: 'Bayern Munich',
      awayTeam: 'Borussia Dortmund',
      homeTeamKR: '바이에른 뮌헨',
      awayTeamKR: '보루시아 도르트문트',
      homeCrest: 'https://media.api-sports.io/football/teams/157.png',
      awayCrest: 'https://media.api-sports.io/football/teams/165.png',
      homeScore: 1,
      awayScore: 1,
      halftimeHomeScore: 1,
      halftimeAwayScore: 1
    },
    {
      id: 1234570,
      leagueCode: 'CL',
      league: 'Champions League',
      leagueLogo: 'https://media.api-sports.io/football/leagues/2.png',
      country: 'Europe',
      date: now.toISOString(),
      timestamp: Math.floor(now.getTime() / 1000),
      status: '2H',
      statusLong: 'Second Half',
      elapsed: 78,
      homeTeam: 'Inter',
      awayTeam: 'AC Milan',
      homeTeamKR: '인테르',
      awayTeamKR: 'AC 밀란',
      homeCrest: 'https://media.api-sports.io/football/teams/505.png',
      awayCrest: 'https://media.api-sports.io/football/teams/489.png',
      homeScore: 3,
      awayScore: 2,
      halftimeHomeScore: 2,
      halftimeAwayScore: 1
    },
    {
      id: 1234571,
      leagueCode: 'FL1',
      league: 'Ligue 1',
      leagueLogo: 'https://media.api-sports.io/football/leagues/61.png',
      country: 'France',
      date: now.toISOString(),
      timestamp: Math.floor(now.getTime() / 1000),
      status: '1H',
      statusLong: 'First Half',
      elapsed: 12,
      homeTeam: 'Paris Saint Germain',
      awayTeam: 'Marseille',
      homeTeamKR: '파리 생제르맹',
      awayTeamKR: '마르세유',
      homeCrest: 'https://media.api-sports.io/football/teams/85.png',
      awayCrest: 'https://media.api-sports.io/football/teams/79.png',
      homeScore: 0,
      awayScore: 1,
      halftimeHomeScore: null,
      halftimeAwayScore: null
    }
  ]

  return {
    success: true,
    count: testMatches.length,
    matches: testMatches,
    timestamp: now.toISOString(),
    testMode: true
  }
}