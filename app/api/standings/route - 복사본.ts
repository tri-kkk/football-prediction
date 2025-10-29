import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const leagueCode = searchParams.get('league') || 'PL' // 기본값: 프리미어리그

  try {
    console.log('🏆 순위표 요청:', leagueCode)

    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${leagueCode}/standings`,
      {
        headers: {
          'X-Auth-Token': process.env.FOOTBALL_API_KEY || '',
        },
      }
    )

    if (!response.ok) {
      console.error('❌ API 오류:', response.status, response.statusText)
      throw new Error(`API 오류: ${response.status}`)
    }

    const data = await response.json()
    
    // 전체 순위표 추출 (TOTAL)
    const standings = data.standings?.find((s: any) => s.type === 'TOTAL')?.table || []
    
    console.log('✅ 순위표 데이터:', standings.length, '팀')

    // 필요한 데이터만 추출
    const formattedStandings = standings.map((team: any) => ({
      position: team.position,
      team: {
        name: team.team.name,
        shortName: team.team.shortName,
        crest: team.team.crest,
      },
      playedGames: team.playedGames,
      won: team.won,
      draw: team.draw,
      lost: team.lost,
      points: team.points,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst,
      goalDifference: team.goalDifference,
      form: team.form, // 최근 5경기 (예: "W,W,L,D,W")
    }))

    return NextResponse.json({
      competition: {
        name: data.competition?.name || '',
        emblem: data.competition?.emblem || '',
        code: data.competition?.code || '',
      },
      season: {
        currentMatchday: data.season?.currentMatchday || 0,
      },
      standings: formattedStandings,
    })
  } catch (error) {
    console.error('순위표 로드 실패:', error)
    return NextResponse.json(
      { error: '순위표를 불러올 수 없습니다' },
      { status: 500 }
    )
  }
}
