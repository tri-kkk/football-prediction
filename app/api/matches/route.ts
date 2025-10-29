import { NextResponse } from 'next/server'

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || ''
const BASE_URL = 'https://api.football-data.org/v4'

const LEAGUES = {
  'PL': 2021,
  'PD': 2014,
  'SA': 2019,
  'BL1': 2002,
  'FL1': 2015,
}

export async function GET(request: Request) {
  console.log('=== API DEBUG ===')
  console.log('Has API Key:', !!FOOTBALL_DATA_API_KEY)
  console.log('Key Length:', FOOTBALL_DATA_API_KEY.length)
  
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'scheduled'
    
    if (!FOOTBALL_DATA_API_KEY) {
      console.log('NO KEY - dummy data')
      return NextResponse.json(getDummyMatches(type))
    }
    
    const matches: any[] = []
    
    for (const code of ['PL', 'PD', 'SA']) {
      try {
        const leagueId = LEAGUES[code as keyof typeof LEAGUES]
        const status = type === 'scheduled' ? 'SCHEDULED' : 'FINISHED'
        
        const response = await fetch(
          `${BASE_URL}/competitions/${leagueId}/matches?status=${status}`,
          {
            headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
            next: { revalidate: 60 }
          }
        )
        
        console.log(`${code}: ${response.status}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log(`${code} matches: ${data.matches?.length || 0}`)
          
          if (data.matches) {
            matches.push(...data.matches.slice(0, 5).map((m: any) => ({
              id: m.id,
              league: data.competition?.name || code,
              leagueLogo: data.competition?.emblem || '',
              date: m.utcDate?.split('T')[0] || '',
              time: m.utcDate?.split('T')[1]?.substring(0, 5) || '',
              homeTeam: m.homeTeam?.name || '',
              awayTeam: m.awayTeam?.name || '',
              homeCrest: m.homeTeam?.crest || '',
              awayCrest: m.awayTeam?.crest || '',
              homeScore: m.score?.fullTime?.home ?? null,
              awayScore: m.score?.fullTime?.away ?? null,
              status: m.status || 'SCHEDULED'
            })))
          }
        }
      } catch (err) {
        console.error(`${code} error:`, err)
      }
    }
    
    console.log(`Total: ${matches.length} matches`)
    
    if (matches.length === 0) {
      return NextResponse.json(getDummyMatches(type))
    }
    
    return NextResponse.json(matches)
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(getDummyMatches('scheduled'))
  }
}

function getDummyMatches(type: string) {
  const matches = [
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
      league: 'La Liga',
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
    return matches.map(m => ({
      ...m,
      homeScore: Math.floor(Math.random() * 4),
      awayScore: Math.floor(Math.random() * 4),
      status: 'FINISHED'
    }))
  }
  
  return matches
}