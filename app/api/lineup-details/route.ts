import { NextResponse } from 'next/server'

const APIFOOTBALL_KEY = process.env.APIFOOTBALL_KEY!

interface Player {
  player: {
    id: number
    name: string
    number: number
    pos: string
    grid: string | null
  }
}

interface Lineup {
  team: {
    id: number
    name: string
    logo: string
  }
  coach: {
    id: number
    name: string
    photo: string
  }
  formation: string
  startXI: Player[]
  substitutes: Player[]
}

// 🧪 테스트 라인업 데이터
const TEST_LINEUP_DATA = {
  success: true,
  available: true,
  home: {
    team: {
      id: 33,
      name: "Manchester United",
      logo: "https://media.api-sports.io/football/teams/33.png"
    },
    coach: {
      id: 4,
      name: "Erik ten Hag",
      photo: "https://media.api-sports.io/football/coachs/4.png"
    },
    formation: "4-2-3-1",
    formationArray: [4, 2, 3, 1],
    startXI: [
      { id: 18835, name: "André Onana", number: 24, position: "G", grid: "1:1", coordinates: { x: 1, y: 1 } },
      { id: 2935, name: "Diogo Dalot", number: 20, position: "D", grid: "2:1", coordinates: { x: 1, y: 2 } },
      { id: 909, name: "Lisandro Martínez", number: 6, position: "D", grid: "2:2", coordinates: { x: 2, y: 2 } },
      { id: 882, name: "Harry Maguire", number: 5, position: "D", grid: "2:3", coordinates: { x: 3, y: 2 } },
      { id: 18767, name: "Noussair Mazraoui", number: 3, position: "D", grid: "2:4", coordinates: { x: 4, y: 2 } },
      { id: 640, name: "Casemiro", number: 18, position: "M", grid: "3:1", coordinates: { x: 1, y: 3 } },
      { id: 888, name: "Christian Eriksen", number: 14, position: "M", grid: "3:2", coordinates: { x: 2, y: 3 } },
      { id: 2930, name: "Bruno Fernandes", number: 8, position: "M", grid: "4:1", coordinates: { x: 1, y: 4 } },
      { id: 889, name: "Alejandro Garnacho", number: 17, position: "M", grid: "4:2", coordinates: { x: 2, y: 4 } },
      { id: 1461, name: "Amad Diallo", number: 16, position: "M", grid: "4:3", coordinates: { x: 3, y: 4 } },
      { id: 1503, name: "Rasmus Højlund", number: 11, position: "F", grid: "5:1", coordinates: { x: 1, y: 5 } }
    ],
    substitutes: [
      { id: 18893, name: "Altay Bayındır", number: 1, position: "G" },
      { id: 2836, name: "Jonny Evans", number: 35, position: "D" },
      { id: 20153, name: "Leny Yoro", number: 15, position: "D" },
      { id: 325, name: "Luke Shaw", number: 23, position: "D" },
      { id: 891, name: "Mason Mount", number: 7, position: "M" },
      { id: 163503, name: "Kobbie Mainoo", number: 37, position: "M" },
      { id: 30503, name: "Manuel Ugarte", number: 25, position: "M" },
      { id: 893, name: "Marcus Rashford", number: 10, position: "F" },
      { id: 1484, name: "Joshua Zirkzee", number: 9, position: "F" }
    ]
  },
  away: {
    team: {
      id: 42,
      name: "Arsenal",
      logo: "https://media.api-sports.io/football/teams/42.png"
    },
    coach: {
      id: 16,
      name: "Mikel Arteta",
      photo: "https://media.api-sports.io/football/coachs/16.png"
    },
    formation: "4-3-3",
    formationArray: [4, 3, 3],
    startXI: [
      { id: 18846, name: "David Raya", number: 22, position: "G", grid: "1:1", coordinates: { x: 1, y: 1 } },
      { id: 18855, name: "Jurriën Timber", number: 12, position: "D", grid: "2:1", coordinates: { x: 1, y: 2 } },
      { id: 626, name: "Gabriel Magalhães", number: 6, position: "D", grid: "2:2", coordinates: { x: 2, y: 2 } },
      { id: 627, name: "William Saliba", number: 2, position: "D", grid: "2:3", coordinates: { x: 3, y: 2 } },
      { id: 18933, name: "Riccardo Calafiori", number: 33, position: "D", grid: "2:4", coordinates: { x: 4, y: 2 } },
      { id: 642, name: "Thomas Partey", number: 5, position: "M", grid: "3:1", coordinates: { x: 1, y: 3 } },
      { id: 30986, name: "Declan Rice", number: 41, position: "M", grid: "3:2", coordinates: { x: 2, y: 3 } },
      { id: 19193, name: "Martin Ødegaard", number: 8, position: "M", grid: "3:3", coordinates: { x: 3, y: 3 } },
      { id: 645, name: "Bukayo Saka", number: 7, position: "F", grid: "4:1", coordinates: { x: 1, y: 4 } },
      { id: 30846, name: "Kai Havertz", number: 29, position: "F", grid: "4:2", coordinates: { x: 2, y: 4 } },
      { id: 31, name: "Gabriel Martinelli", number: 11, position: "F", grid: "4:3", coordinates: { x: 3, y: 4 } }
    ],
    substitutes: [
      { id: 643, name: "Aaron Ramsdale", number: 1, position: "G" },
      { id: 18750, name: "Neto", number: 32, position: "G" },
      { id: 644, name: "Ben White", number: 4, position: "D" },
      { id: 18932, name: "Jakub Kiwior", number: 15, position: "D" },
      { id: 2935, name: "Oleksandr Zinchenko", number: 35, position: "D" },
      { id: 640, name: "Jorginho", number: 20, position: "M" },
      { id: 18860, name: "Mikel Merino", number: 23, position: "M" },
      { id: 18877, name: "Ethan Nwaneri", number: 53, position: "M" },
      { id: 647, name: "Leandro Trossard", number: 19, position: "F" },
      { id: 2841, name: "Gabriel Jesus", number: 9, position: "F" }
    ]
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fixtureId = searchParams.get('fixtureId')
    const testMode = searchParams.get('test') === 'true'  // 🧪 테스트 모드 체크

    if (!fixtureId) {
      return NextResponse.json(
        { error: 'fixtureId is required' },
        { status: 400 }
      )
    }

    // 🧪 테스트 모드일 때는 테스트 데이터 반환
    if (testMode) {
      console.log(`🧪 Test mode: Returning mock lineup data for fixture ${fixtureId}`)
      return NextResponse.json(TEST_LINEUP_DATA)
    }

    console.log(`🔍 Fetching lineup details for fixture ${fixtureId}`)

    // API-Football에서 라인업 조회
    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
      {
        headers: {
          'x-rapidapi-key': APIFOOTBALL_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    const lineups: Lineup[] = data.response || []

    if (lineups.length !== 2) {
      return NextResponse.json({
        success: true,
        available: false,
        message: 'Lineups not available yet',
      })
    }

    const [homeLineup, awayLineup] = lineups

    // 포메이션 파싱 (예: "4-4-2" -> [4, 4, 2])
    const parseFormation = (formation: string): number[] => {
      return formation.split('-').map(n => parseInt(n))
    }

    // Grid 기반 포지션 계산
    const calculatePosition = (grid: string | null, formation: string): { x: number; y: number } => {
      if (!grid) return { x: 0, y: 0 }
      
      const [row, col] = grid.split(':').map(n => parseInt(n))
      const formationArray = parseFormation(formation)
      const maxInRow = Math.max(...formationArray)
      
      return {
        x: col, // 가로 위치 (1부터 시작)
        y: row, // 세로 위치 (1=골키퍼, 2=수비, ...)
      }
    }

    // 선수 데이터 변환
    const transformLineup = (lineup: Lineup) => {
      const formation = parseFormation(lineup.formation)
      
      return {
        team: lineup.team,
        coach: lineup.coach,
        formation: lineup.formation,
        formationArray: formation,
        startXI: lineup.startXI.map(p => ({
          id: p.player.id,
          name: p.player.name,
          number: p.player.number,
          position: p.player.pos,
          grid: p.player.grid,
          coordinates: calculatePosition(p.player.grid, lineup.formation),
        })),
        substitutes: lineup.substitutes.map(p => ({
          id: p.player.id,
          name: p.player.name,
          number: p.player.number,
          position: p.player.pos,
        })),
      }
    }

    const result = {
      success: true,
      available: true,
      home: transformLineup(homeLineup),
      away: transformLineup(awayLineup),
    }

    console.log(`✅ Lineup details fetched: ${homeLineup.formation} vs ${awayLineup.formation}`)

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('❌ Error fetching lineup details:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch lineup details',
        details: error.message 
      },
      { status: 500 }
    )
  }
}