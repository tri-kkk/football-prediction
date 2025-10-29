import { NextResponse } from 'next/server'

const FOOTBALL_API_KEY = process.env.FOOTBALL_DATA_API_KEY || ''
const BASE_URL = 'https://api.football-data.org/v4'

// 리그 코드 매핑
const LEAGUES = {
  'PL': 2021,    // Premier League
  'PD': 2014,    // La Liga
  'SA': 2019,    // Serie A
  'BL1': 2002,   // Bundesliga
  'FL1': 2015,   // Ligue 1
  'CL': 2001,    // Champions League
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'scheduled'
    
    console.log('🔄 API 호출:', `matches-${type}`)
    
    // API 키 확인
    if (!FOOTBALL_API_KEY) {
      console.warn('⚠️ FOOTBALL_DATA_API_KEY가 설정되지 않음 - 더미 데이터 반환')
      return NextResponse.json(getDummyMatches(type))
    }
    
    const allMatches: any[] = []
    
    // 주요 리그들의 경기 가져오기
    const leagueCodes = ['PL', 'PD', 'SA', 'BL1', 'FL1']
    
    for (const code of leagueCodes) {
      try {
        const leagueId = LEAGUES[code as keyof typeof LEAGUES]
        const status = type === 'scheduled' ? 'SCHEDULED' : 'FINISHED'
        
        const response = await fetch(
          `${BASE_URL}/competitions/${leagueId}/matches?status=${status}`,
          {
            headers: {
              'X-Auth-Token': FOOTBALL_API_KEY
            },
            next: { revalidate: 60 } // 1분 캐시
          }
        )
        
        if (!response.ok) {
          console.error(`❌ ${code} API 에러:`, response.status)
          continue
        }
        
        const data = await response.json()
        
        if (data.matches && Array.isArray(data.matches)) {
          const formattedMatches = data.matches.slice(0, 10).map((match: any) => ({
            id: match.id,
            league: data.competition?.name || code,
            leagueLogo: data.competition?.emblem || '',
            date: match.utcDate?.split('T')[0] || '',
            time: match.utcDate?.split('T')[1]?.substring(0, 5) || '',
            homeTeam: match.homeTeam?.name || '',
            awayTeam: match.awayTeam?.name || '',
            homeCrest: match.homeTeam?.crest || '',
            awayCrest: match.awayTeam?.crest || '',
            homeScore: match.score?.fullTime?.home ?? null,
            awayScore: match.score?.fullTime?.away ?? null,
            status: match.status || 'SCHEDULED'
          }))
          
          allMatches.push(...formattedMatches)
        }
      } catch (error) {
        console.error(`❌ ${code} 리그 에러:`, error)
      }
    }
    
    // 경기가 없으면 더미 데이터 반환
    if (allMatches.length === 0) {
      console.warn('⚠️ 실제 경기 데이터 없음 - 더미 데이터 반환')
      return NextResponse.json(getDummyMatches(type))
    }
    
    console.log(`✅ ${allMatches.length}개 경기 로드 완료`)
    return NextResponse.json(allMatches)
    
  } catch (error) {
    console.error('❌ Matches API 에러:', error)
    return NextResponse.json(getDummyMatches('scheduled'))
  }
}

// 더미 데이터 (API 실패 시 백업용)
function getDummyMatches(type: string) {
  const baseMatches = [
    {
      id: 1,
      league: 'Premier League',
      leagueLogo: 'https://crests.football-data.org/PL.png',
      date: '2025-01-30',
      time: '20:00',
      homeTeam: 'Manchester United FC',
      awayTeam: 'Liverpool FC',
      homeCrest: 'https://crests.football-data.org/66.png',
      awayCrest: 'https://crests.football-data.org/64.png',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED'
    },
    {
      id: 2,
      league: 'Primera Division',
      leagueLogo: 'https://crests.football-data.org/PD.png',
      date: '2025-01-30',
      time: '21:00',
      homeTeam: 'FC Barcelona',
      awayTeam: 'Real Madrid CF',
      homeCrest: 'https://crests.football-data.org/81.png',
      awayCrest: 'https://crests.football-data.org/86.png',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED'
    },
    {
      id: 3,
      league: 'Serie A',
      leagueLogo: 'https://crests.football-data.org/SA.png',
      date: '2025-01-31',
      time: '19:00',
      homeTeam: 'Inter Milan',
      awayTeam: 'AC Milan',
      homeCrest: 'https://crests.football-data.org/108.png',
      awayCrest: 'https://crests.football-data.org/98.png',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED'
    },
    {
      id: 4,
      league: 'Bundesliga',
      leagueLogo: 'https://crests.football-data.org/BL1.png',
      date: '2025-02-01',
      time: '18:30',
      homeTeam: 'FC Bayern München',
      awayTeam: 'Borussia Dortmund',
      homeCrest: 'https://crests.football-data.org/5.png',
      awayCrest: 'https://crests.football-data.org/4.png',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED'
    },
    {
      id: 5,
      league: 'Ligue 1',
      leagueLogo: 'https://crests.football-data.org/FL1.png',
      date: '2025-02-01',
      time: '20:45',
      homeTeam: 'Paris Saint-Germain FC',
      awayTeam: 'Olympique de Marseille',
      homeCrest: 'https://crests.football-data.org/524.png',
      awayCrest: 'https://crests.football-data.org/516.png',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED'
    }
  ]
  
  if (type === 'results') {
    return baseMatches.map(match => ({
      ...match,
      homeScore: Math.floor(Math.random() * 4),
      awayScore: Math.floor(Math.random() * 4),
      status: 'FINISHED'
    }))
  }
  
  return baseMatches
}
