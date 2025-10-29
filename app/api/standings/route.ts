import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const standings = {
    competition: {
      name: 'Premier League',
      emblem: 'https://crests.football-data.org/PL.png',
      code: 'PL'
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

  return NextResponse.json(standings)
}