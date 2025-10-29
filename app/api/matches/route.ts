import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'scheduled'

  try {
    let apiUrl = ''
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(today.getDate() - 3)
    
    const sevenDaysLater = new Date(today)
    sevenDaysLater.setDate(today.getDate() + 7)
    
    if (type === 'scheduled') {
      const dateFrom = today.toISOString().split('T')[0]
      const dateTo = sevenDaysLater.toISOString().split('T')[0]
      apiUrl = `https://api.football-data.org/v4/matches?status=SCHEDULED&dateFrom=${dateFrom}&dateTo=${dateTo}`
    } else if (type === 'results') {
      const dateFrom = threeDaysAgo.toISOString().split('T')[0]
      const dateTo = yesterday.toISOString().split('T')[0]
      apiUrl = `https://api.football-data.org/v4/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`
    }

    console.log('API 요청:', { type, apiUrl })

    const response = await fetch(apiUrl, {
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY!  // 👈 수정!
      },
      next: { revalidate: 300 }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Football API 오류:', response.status, errorText)
      throw new Error(`Football API 오류: ${response.status}`)
    }

    const data = await response.json()
    console.log('받은 경기 수:', data.matches?.length || 0)

    const MAJOR_LEAGUES = [
      'Premier League',
      'Championship',
      'Bundesliga',
      '2. Bundesliga',
      'Serie A',
      'Serie B',
      'La Liga',
      'Segunda División',
      'Ligue 1',
      'Ligue 2',
      'Eredivisie',
      'Eerste Divisie',
      'UEFA Champions League',
      'UEFA Europa League',
      'UEFA Europa Conference League'
    ]

    let matches = data.matches || []
    
    matches = matches.filter((match: any) => 
      MAJOR_LEAGUES.includes(match.competition.name)
    )
    
    console.log('필터링 후 경기 수:', matches.length)
    
    if (matches.length === 0 && type === 'results') {
      console.log('결과 없음, 지난 7일로 범위 확대...')
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(today.getDate() - 7)
      const dateFrom = sevenDaysAgo.toISOString().split('T')[0]
      const dateTo = yesterday.toISOString().split('T')[0]
      
      const retryUrl = `https://api.football-data.org/v4/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`
      console.log('재시도 URL:', retryUrl)
      
      const retryResponse = await fetch(retryUrl, {
        headers: {
          'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY!  // 👈 수정!
        }
      })
      
      if (retryResponse.ok) {
        const retryData = await retryResponse.json()
        matches = retryData.matches || []
        
        matches = matches.filter((match: any) => 
          MAJOR_LEAGUES.includes(match.competition.name)
        )
        
        console.log('재시도 결과:', matches.length, '경기')
      }
    }

    const transformedMatches = matches
      .sort((a: any, b: any) => {
        if (type === 'scheduled') {
          return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
        } else {
          return new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
        }
      })
      .slice(0, 20)
      .map((match: any) => ({
        id: match.id,
        league: match.competition.name,
        leagueLogo: match.competition.emblem,
        date: new Date(match.utcDate).toLocaleDateString('ko-KR'),
        time: new Date(match.utcDate).toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        homeCrest: match.homeTeam.crest,
        awayCrest: match.awayTeam.crest,
        homeScore: match.score?.fullTime?.home ?? null,
        awayScore: match.score?.fullTime?.away ?? null,
        status: match.status
      }))

    console.log('반환 경기 수:', transformedMatches.length)
    return NextResponse.json(transformedMatches)

  } catch (error: any) {
    console.error('API 오류:', error)
    return NextResponse.json(
      { error: '경기 정보를 불러올 수 없습니다: ' + error.message },
      { status: 500 }
    )
  }
}