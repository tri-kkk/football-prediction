import { NextResponse } from 'next/server'

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || ''
const BASE_URL = 'https://v3.football.api-sports.io'

// ============================================================
// 🔥 API-Football 리그 ID 매핑 (50개 리그 - 아프리카 추가!)
// ============================================================
const LEAGUES: { [key: string]: number } = {
  // ===== 🏆 국제대회 =====
  'WC': 1,       // World Cup 2026
  'CL': 2,       // Champions League
  'EL': 3,       // Europa League
  'UECL': 848,   // Conference League
  'UNL': 5,      // Nations League
  'COP': 13,     // Copa Libertadores
  'COS': 11,     // Copa Sudamericana
  'AFCON': 6,    // Africa Cup of Nations
  
  // ===== 🌍 아프리카 리그 (5개) - NEW! =====
  'EGY': 233,    // Egyptian Premier League
  'RSA': 288,    // South African Premier League
  'MAR': 200,    // Botola Pro (Morocco)
  'DZA': 187,    // Ligue 1 Algeria
  'TUN': 202,    // Ligue 1 Tunisia
  
  // ===== 🏴󠁧󠁢󠁥󠁮󠁧󠁿 잉글랜드 (4개) =====
  'PL': 39,      // Premier League
  'ELC': 40,     // Championship
  'FAC': 45,     // FA Cup
  'EFL': 48,     // EFL Cup
  
  // ===== 🇪🇸 스페인 (3개) =====
  'PD': 140,     // La Liga
  'SD': 141,     // La Liga 2
  'CDR': 143,    // Copa del Rey
  
  // ===== 🇩🇪 독일 (3개) =====
  'BL1': 78,     // Bundesliga
  'BL2': 79,     // Bundesliga 2
  'DFB': 81,     // DFB Pokal
  
  // ===== 🇮🇹 이탈리아 (3개) =====
  'SA': 135,     // Serie A
  'SB': 136,     // Serie B
  'CIT': 137,    // Coppa Italia
  
  // ===== 🇫🇷 프랑스 (3개) =====
  'FL1': 61,     // Ligue 1
  'FL2': 62,     // Ligue 2
  'CDF': 66,     // Coupe de France
  
  // ===== 🇵🇹 포르투갈 (2개) =====
  'PPL': 94,     // Primeira Liga
  'TDP': 96,     // Taca de Portugal
  
  // ===== 🇳🇱 네덜란드 (2개) =====
  'DED': 88,     // Eredivisie
  'KNV': 90,     // KNVB Beker
  
  // ===== 🇹🇷 터키 (1개) =====
  'TSL': 203,    // Süper Lig
  
  // ===== 🇧🇪 벨기에 (1개) =====
  'JPL': 144,    // Jupiler Pro League
  
  // ===== 🏴󠁧󠁢󠁳󠁣󠁴󠁿 스코틀랜드 (1개) =====
  'SPL': 179,    // Scottish Premiership
  
  // ===== 🇨🇭 스위스 (1개) =====
  'SSL': 207,    // Swiss Super League
  
  // ===== 🇦🇹 오스트리아 (1개) =====
  'ABL': 218,    // Austrian Bundesliga
  
  // ===== 🇬🇷 그리스 (1개) =====
  'GSL': 197,    // Super League Greece
  
  // ===== 🇩🇰 덴마크 (1개) =====
  'DSL': 119,    // Danish Superliga
  
  // ===== 🇰🇷 한국 (2개) =====
  'KL1': 292,    // K League 1
  'KL2': 293,    // K League 2
  
  // ===== 🇯🇵 일본 (2개) =====
  'J1': 98,      // J1 League
  'J2': 99,      // J2 League
  
  // ===== 🇸🇦 사우디아라비아 (1개) =====
  'SAL': 307,    // Saudi Pro League
  
  // ===== 🇦🇺 호주 (1개) =====
  'ALG': 188,    // A-League
  
  // ===== 🇨🇳 중국 (1개) =====
  'CSL': 169,    // Chinese Super League
  
  // ===== 🇧🇷 브라질 (1개) =====
  'BSA': 71,     // Brasileirão
  
  // ===== 🇦🇷 아르헨티나 (1개) =====
  'ARG': 128,    // Liga Profesional
  
  // ===== 🇺🇸 미국 (1개) =====
  'MLS': 253,    // MLS
  
  // ===== 🇲🇽 멕시코 (1개) =====
  'LMX': 262,    // Liga MX
}

// 리그 이름 매핑 (더미 데이터용)
const LEAGUE_NAMES: { [key: string]: string } = {
  // 국제대회
  'CL': 'Champions League',
  'EL': 'Europa League',
  'UECL': 'Conference League',
  'UNL': 'Nations League',
  'COP': 'Copa Libertadores',
  'COS': 'Copa Sudamericana',
  'AFCON': 'Africa Cup of Nations',
  // 아프리카
  'EGY': 'Egyptian Premier League',
  'RSA': 'South African Premier League',
  'MAR': 'Botola Pro',
  'DZA': 'Ligue 1 Algeria',
  'TUN': 'Ligue 1 Tunisia',
  // 잉글랜드
  'PL': 'Premier League',
  'ELC': 'Championship',
  'FAC': 'FA Cup',
  'EFL': 'EFL Cup',
  // 스페인
  'PD': 'La Liga',
  'SD': 'La Liga 2',
  'CDR': 'Copa del Rey',
  // 독일
  'BL1': 'Bundesliga',
  'BL2': 'Bundesliga 2',
  'DFB': 'DFB Pokal',
  // 이탈리아
  'SA': 'Serie A',
  'SB': 'Serie B',
  'CIT': 'Coppa Italia',
  // 프랑스
  'FL1': 'Ligue 1',
  'FL2': 'Ligue 2',
  'CDF': 'Coupe de France',
  // 포르투갈/네덜란드
  'PPL': 'Primeira Liga',
  'TDP': 'Taça de Portugal',
  'DED': 'Eredivisie',
  'KNV': 'KNVB Beker',
  // 기타 유럽
  'TSL': 'Süper Lig',
  'JPL': 'Jupiler Pro League',
  'SPL': 'Scottish Premiership',
  'SSL': 'Swiss Super League',
  'ABL': 'Austrian Bundesliga',
  'GSL': 'Super League Greece',
  'DSL': 'Danish Superliga',
  // 아시아
  'KL1': 'K League 1',
  'KL2': 'K League 2',
  'J1': 'J1 League',
  'J2': 'J2 League',
  'SAL': 'Saudi Pro League',
  'ALG': 'A-League',
  'CSL': 'Chinese Super League',
  // 아메리카
  'BSA': 'Brasileirão',
  'ARG': 'Liga Profesional',
  'MLS': 'MLS',
  'LMX': 'Liga MX',
}

// 리그 로고 매핑
const LEAGUE_LOGOS: { [key: string]: string } = {
  // 국제대회
  'WC': 'https://media.api-sports.io/football/leagues/1.png',
  'CL': 'https://media.api-sports.io/football/leagues/2.png',
  'EL': 'https://media.api-sports.io/football/leagues/3.png',
  'UECL': 'https://media.api-sports.io/football/leagues/848.png',
  'UNL': 'https://media.api-sports.io/football/leagues/5.png',
  'COP': 'https://media.api-sports.io/football/leagues/13.png',
  'COS': 'https://media.api-sports.io/football/leagues/11.png',
  'AFCON': 'https://media.api-sports.io/football/leagues/6.png',
  // 아프리카
  'EGY': 'https://media.api-sports.io/football/leagues/233.png',
  'RSA': 'https://media.api-sports.io/football/leagues/288.png',
  'MAR': 'https://media.api-sports.io/football/leagues/200.png',
  'DZA': 'https://media.api-sports.io/football/leagues/187.png',
  'TUN': 'https://media.api-sports.io/football/leagues/202.png',
  // 잉글랜드
  'PL': 'https://media.api-sports.io/football/leagues/39.png',
  'ELC': 'https://media.api-sports.io/football/leagues/40.png',
  'FAC': 'https://media.api-sports.io/football/leagues/45.png',
  'EFL': 'https://media.api-sports.io/football/leagues/48.png',
  // 스페인
  'PD': 'https://media.api-sports.io/football/leagues/140.png',
  'SD': 'https://media.api-sports.io/football/leagues/141.png',
  'CDR': 'https://media.api-sports.io/football/leagues/143.png',
  // 독일
  'BL1': 'https://media.api-sports.io/football/leagues/78.png',
  'BL2': 'https://media.api-sports.io/football/leagues/79.png',
  'DFB': 'https://media.api-sports.io/football/leagues/81.png',
  // 이탈리아
  'SA': 'https://media.api-sports.io/football/leagues/135.png',
  'SB': 'https://media.api-sports.io/football/leagues/136.png',
  'CIT': 'https://media.api-sports.io/football/leagues/137.png',
  // 프랑스
  'FL1': 'https://media.api-sports.io/football/leagues/61.png',
  'FL2': 'https://media.api-sports.io/football/leagues/62.png',
  'CDF': 'https://media.api-sports.io/football/leagues/66.png',
  // 포르투갈/네덜란드
  'PPL': 'https://media.api-sports.io/football/leagues/94.png',
  'TDP': 'https://media.api-sports.io/football/leagues/96.png',
  'DED': 'https://media.api-sports.io/football/leagues/88.png',
  'KNV': 'https://media.api-sports.io/football/leagues/90.png',
  // 기타 유럽
  'TSL': 'https://media.api-sports.io/football/leagues/203.png',
  'JPL': 'https://media.api-sports.io/football/leagues/144.png',
  'SPL': 'https://media.api-sports.io/football/leagues/179.png',
  'SSL': 'https://media.api-sports.io/football/leagues/207.png',
  'ABL': 'https://media.api-sports.io/football/leagues/218.png',
  'GSL': 'https://media.api-sports.io/football/leagues/197.png',
  'DSL': 'https://media.api-sports.io/football/leagues/119.png',
  // 아시아
  'KL1': 'https://media.api-sports.io/football/leagues/292.png',
  'KL2': 'https://media.api-sports.io/football/leagues/293.png',
  'J1': 'https://media.api-sports.io/football/leagues/98.png',
  'J2': 'https://media.api-sports.io/football/leagues/99.png',
  'SAL': 'https://media.api-sports.io/football/leagues/307.png',
  'ALG': 'https://media.api-sports.io/football/leagues/188.png',
  'CSL': 'https://media.api-sports.io/football/leagues/169.png',
  // 아메리카
  'BSA': 'https://media.api-sports.io/football/leagues/71.png',
  'ARG': 'https://media.api-sports.io/football/leagues/128.png',
  'MLS': 'https://media.api-sports.io/football/leagues/253.png',
  'LMX': 'https://media.api-sports.io/football/leagues/262.png',
}

// 🔥 리그별 시즌 계산 (아시아/남미는 단일 연도)
function getCurrentSeason(leagueCode: string): number {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // 아시아/남미/북미 리그는 단일 연도 시즌
  // 시즌 시작 시기에 따라 다름:
  // - K리그/J리그/중국: 2~3월 시작, 11~12월 종료
  // - MLS: 2~3월 시작, 12월 종료
  // - 브라질/아르헨: 4월 시작, 12월 종료
  // - 멕시코: 1월(Clausura), 7월(Apertura) 두 시즌
  // - 사우디: 8월 시작, 5월 종료 (유럽식)
  // - 호주: 10월 시작, 5월 종료
  
  const singleYearLeagues: { [key: string]: number } = {
    'KL1': 3,   // K리그 3월 시작
    'KL2': 3,
    'J1': 2,    // J리그 2월 시작
    'J2': 2,
    'MLS': 3,   // MLS 3월 시작
    'BSA': 4,   // 브라질 4월 시작
    'ARG': 2,   // 아르헨티나 2월 시작
    'CSL': 3,   // 중국 3월 시작
    'LMX': 2,   // 멕시코 2월로 조정 (Clausura)
  }
  
  if (leagueCode in singleYearLeagues) {
    const startMonth = singleYearLeagues[leagueCode]
    // 시즌 시작월 이전이면 전년도 시즌
    if (month < startMonth) {
      return year - 1
    }
    return year
  }
  
  // 호주/사우디는 유럽식 (크로스 시즌)
  if (['SAL', 'ALG'].includes(leagueCode)) {
    return month >= 8 ? year : year - 1
  }

  // 유럽 리그: 8월 이후면 현재 연도, 그 전이면 전년도
  return month >= 8 ? year : year - 1
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const league = searchParams.get('league') || 'PL'
    const debug = searchParams.get('debug')
    
    const season = getCurrentSeason(league)
    
    // 디버그 모드
    if (debug === '1') {
      return NextResponse.json({
        hasApiKey: !!API_FOOTBALL_KEY,
        keyLength: API_FOOTBALL_KEY.length,
        keyFirst5: API_FOOTBALL_KEY.substring(0, 5),
        keyLast5: API_FOOTBALL_KEY.substring(API_FOOTBALL_KEY.length - 5),
        league: league,
        leagueId: LEAGUES[league],
        season: season,
        url: `${BASE_URL}/standings?league=${LEAGUES[league]}&season=${season}`
      })
    }
    
    if (!API_FOOTBALL_KEY) {
      console.error('❌ API_FOOTBALL_KEY가 없습니다')
      return NextResponse.json(getDummyStandings(league))
    }
    
    const leagueId = LEAGUES[league]
    if (!leagueId) {
      console.error('❌ 지원하지 않는 리그:', league)
      return NextResponse.json(getDummyStandings('PL'))
    }
    
    const url = `${BASE_URL}/standings?league=${leagueId}&season=${season}`
    
    console.log('🔍 API-Football Standings 요청:', {
      league,
      leagueId,
      season,
      url
    })
    
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      next: { revalidate: 300 } // 5분 캐시
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API-Football 에러:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      return NextResponse.json({
        error: true,
        status: response.status,
        statusText: response.statusText,
        message: errorText,
        fallbackToDummy: true,
        ...getDummyStandings(league)
      })
    }
    
    const data = await response.json()
    
    console.log('✅ API-Football 응답:', {
      results: data.results,
      league: data.response?.[0]?.league?.name
    })
    
    // API-Football 응답 구조 변환
    if (!data.response || data.response.length === 0) {
      console.warn('⚠️ 순위표 데이터 없음')
      return NextResponse.json(getDummyStandings(league))
    }
    
    const apiData = data.response[0]
    const leagueData = apiData.league
    
    // 컵 대회는 그룹이 여러 개
    const isGroupStage = ['CL', 'EL', 'UECL', 'COP', 'COS'].includes(league)
    
    let standingsData
    let groupedStandings = null
    
    if (isGroupStage && leagueData.standings.length > 1) {
      // 그룹 스테이지: 여러 그룹을 하나로 합치거나 첫 번째 그룹만
      console.log('🔍 그룹 스테이지 감지:', leagueData.standings.length, '개 그룹')
      
      // CL, EL, UECL은 그룹별로 분리
      groupedStandings = leagueData.standings.map((group: any[], index: number) => ({
        groupName: `Group ${String.fromCharCode(65 + index)}`, // A, B, C...
        standings: group
      }))
      standingsData = leagueData.standings[0] // 일단 첫 그룹을 기본으로
    } else {
      // 일반 리그: standings[0]에 전체 순위표
      standingsData = leagueData.standings[0]
    }
    
    const standings = {
      competition: {
        name: leagueData.name || LEAGUE_NAMES[league] || league,
        emblem: leagueData.logo || LEAGUE_LOGOS[league] || '',
        code: league,
        country: leagueData.country || '',
        flag: leagueData.flag || ''
      },
      season: {
        year: leagueData.season || season,
        currentMatchday: standingsData?.[0]?.all?.played || 0
      },
      isGroupStage,
      groups: groupedStandings,
      standings: standingsData?.map((team: any) => ({
        position: team.rank,
        team: {
          name: team.team.name,
          shortName: team.team.name.split(' ').slice(-1)[0], // 간단한 short name
          crest: team.team.logo,
          id: team.team.id
        },
        playedGames: team.all.played,
        won: team.all.win,
        draw: team.all.draw,
        lost: team.all.lose,
        points: team.points,
        goalsFor: team.all.goals.for,
        goalsAgainst: team.all.goals.against,
        goalDifference: team.goalsDiff,
        form: team.form || null,
        status: team.status || null,
        description: team.description || null,
        group: team.group || null
      })) || []
    }
    
    console.log('✅ 변환 완료:', {
      competition: standings.competition.name,
      teams: standings.standings.length
    })
    
    return NextResponse.json(standings)
    
  } catch (error: any) {
    console.error('❌ Standings API 에러:', error)
    return NextResponse.json({
      error: true,
      message: error.message,
      stack: error.stack,
      fallbackToDummy: true
    })
  }
}

function getDummyStandings(league: string) {
  return {
    competition: {
      name: LEAGUE_NAMES[league] || 'Premier League',
      emblem: LEAGUE_LOGOS[league] || 'https://media.api-sports.io/football/leagues/39.png',
      code: league
    },
    season: {
      year: getCurrentSeason(league),
      currentMatchday: 12
    },
    standings: [
      {
        position: 1,
        team: {
          name: 'Team 1',
          shortName: 'T1',
          crest: 'https://media.api-sports.io/football/teams/40.png',
          id: 1
        },
        playedGames: 12,
        won: 10,
        draw: 1,
        lost: 1,
        points: 31,
        goalsFor: 28,
        goalsAgainst: 10,
        goalDifference: 18,
        form: 'WWWWW',
        status: null,
        description: null
      },
      {
        position: 2,
        team: {
          name: 'Team 2',
          shortName: 'T2',
          crest: 'https://media.api-sports.io/football/teams/50.png',
          id: 2
        },
        playedGames: 12,
        won: 9,
        draw: 2,
        lost: 1,
        points: 29,
        goalsFor: 30,
        goalsAgainst: 12,
        goalDifference: 18,
        form: 'WWDWW',
        status: null,
        description: null
      },
      {
        position: 3,
        team: {
          name: 'Team 3',
          shortName: 'T3',
          crest: 'https://media.api-sports.io/football/teams/42.png',
          id: 3
        },
        playedGames: 12,
        won: 8,
        draw: 3,
        lost: 1,
        points: 27,
        goalsFor: 26,
        goalsAgainst: 11,
        goalDifference: 15,
        form: 'WDWDW',
        status: null,
        description: null
      },
      {
        position: 4,
        team: {
          name: 'Team 4',
          shortName: 'T4',
          crest: 'https://media.api-sports.io/football/teams/49.png',
          id: 4
        },
        playedGames: 12,
        won: 7,
        draw: 3,
        lost: 2,
        points: 24,
        goalsFor: 24,
        goalsAgainst: 14,
        goalDifference: 10,
        form: 'WWDLW',
        status: null,
        description: null
      },
      {
        position: 5,
        team: {
          name: 'Team 5',
          shortName: 'T5',
          crest: 'https://media.api-sports.io/football/teams/33.png',
          id: 5
        },
        playedGames: 12,
        won: 6,
        draw: 4,
        lost: 2,
        points: 22,
        goalsFor: 20,
        goalsAgainst: 14,
        goalDifference: 6,
        form: 'WDWDL',
        status: null,
        description: null
      }
    ]
  }
}