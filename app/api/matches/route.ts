import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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

  return NextResponse.json(matches)
}