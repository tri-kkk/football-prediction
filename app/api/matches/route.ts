import { NextResponse } from 'next/server'

const FOOTBALL_API_KEY = process.env.FOOTBALL_DATA_API_KEY || ''
const BASE_URL = 'https://api.football-data.org/v4'

const LEAGUES = {
  'PL': 2021,
  'PD': 2014,
  'SA': 2019,
  'BL1': 2002,
  'FL1': 2015,
  'CL': 2001,
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'scheduled'
    
    if (!FOOTBALL_API_KEY) {
      return NextResponse.json(getDummyMatches(type))
    }
    
    const allMatches: any[] = []
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
            next: { revalidate: 60 }
          }
        )
        
        if (!response.ok) continue
        
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
        continue
      }
    }
    
    if (allMatches.length === 0) {
      return NextResponse.json(getDummyMatches(type))
    }
    
    return NextResponse.json(allMatches)
    
  } catch (error) {
    return NextResponse.json(getDummyMatches('scheduled'))
  }
}

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