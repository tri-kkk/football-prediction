import { NextResponse } from 'next/server'

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || ''
const BASE_URL = 'https://api.football-data.org/v4'

const LEAGUES: { [key: string]: number } = {
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
    const league = searchParams.get('league') || 'PL'
    
    console.log('=== STANDINGS DEBUG ===')
    console.log('Has API Key:', !!FOOTBALL_DATA_API_KEY)
    console.log('Key Length:', FOOTBALL_DATA_API_KEY.length)
    console.log('League:', league)
    
    if (!FOOTBALL_DATA_API_KEY) {
      console.log('NO API KEY')
      return NextResponse.json(getDummyStandings(league))
    }
    
    const leagueId = LEAGUES[league]
    if (!leagueId) {
      console.log('Unknown league:', league)
      return NextResponse.json(getDummyStandings('PL'))
    }
    
    const url = `${BASE_URL}/competitions/${leagueId}/standings`
    console.log('Fetching:', url)
    
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': FOOTBALL_DATA_API_KEY
      },
      next: { revalidate: 300 }
    })
    
    console.log('Response Status:', response.status)
    
    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      return NextResponse.json(getDummyStandings(league))
    }
    
    const data = await response.json()
    console.log('Teams count:', data.standings?.[0]?.table?.length || 0)
    
    const standings = {
      competition: {
        name: data.competition?.name || league,
        emblem: data.competition?.emblem || '',
        code: data.competition?.code || league
      },
      season: {
        currentMatchday: data.season?.currentMatchday || 1
      },
      standings: data.standings?.[0]?.table?.map((team: any) => ({
        position: team.position,
        team: {
          name: team.team?.name || '',
          shortName: team.team?.shortName || team.team?.name || '',
          crest: team.team?.crest || ''
        },
        playedGames: team.playedGames || 0,
        won: team.won || 0,
        draw: team.draw || 0,
        lost: team.lost || 0,
        points: team.points || 0,
        goalsFor: team.goalsFor || 0,
        goalsAgainst: team.goalsAgainst || 0,
        goalDifference: team.goalDifference || 0,
        form: team.form || null
      })) || []
    }
    
    console.log('SUCCESS: Returning real data')
    return NextResponse.json(standings)
    
  } catch (error) {
    console.error('Exception:', error)
    return NextResponse.json(getDummyStandings('PL'))
  }
}

function getDummyStandings(league: string) {
  console.log('RETURNING DUMMY DATA for:', league)
  
  const leagueNames: { [key: string]: string } = {
    'PL': 'Premier League',
    'PD': 'La Liga',
    'SA': 'Serie A',
    'BL1': 'Bundesliga',
    'FL1': 'Ligue 1',
    'CL': 'Champions League'
  }
  
  const leagueLogos: { [key: string]: string } = {
    'PL': 'https://crests.football-data.org/PL.png',
    'PD': 'https://crests.football-data.org/PD.png',
    'SA': 'https://crests.football-data.org/SA.png',
    'BL1': 'https://crests.football-data.org/BL1.png',
    'FL1': 'https://crests.football-data.org/FL1.png',
    'CL': 'https://crests.football-data.org/CL.png'
  }
  
  return {
    competition: {
      name: leagueNames[league] || 'Premier League',
      emblem: leagueLogos[league] || 'https://crests.football-data.org/PL.png',
      code: league
    },
    season: {
      currentMatchday: 20
    },
    standings: [
      {
        position: 1,
        team: {
          name: 'Liverpool FC',
          shortName: 'Liverpool',
          crest: 'https://crests.football-data.org/64.png'
        },
        playedGames: 20,
        won: 15,
        draw: 3,
        lost: 2,
        points: 48,
        goalsFor: 45,
        goalsAgainst: 20,
        goalDifference: 25,
        form: 'W,W,W,D,W'
      },
      {
        position: 2,
        team: {
          name: 'Manchester City FC',
          shortName: 'Man City',
          crest: 'https://crests.football-data.org/65.png'
        },
        playedGames: 20,
        won: 14,
        draw: 4,
        lost: 2,
        points: 46,
        goalsFor: 50,
        goalsAgainst: 22,
        goalDifference: 28,
        form: 'W,D,W,W,D'
      },
      {
        position: 3,
        team: {
          name: 'Arsenal FC',
          shortName: 'Arsenal',
          crest: 'https://crests.football-data.org/57.png'
        },
        playedGames: 20,
        won: 13,
        draw: 5,
        lost: 2,
        points: 44,
        goalsFor: 42,
        goalsAgainst: 18,
        goalDifference: 24,
        form: 'W,W,D,W,W'
      }
    ]
  }
}