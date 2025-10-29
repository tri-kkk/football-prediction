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
      // 예정된 경기 (오늘부터 앞으로 7일)
      const dateFrom = today.toISOString().split('T')[0]
      const dateTo = sevenDaysLater.toISOString().split('T')[0]
      apiUrl = `https://api.football-data.org/v4/matches?status=SCHEDULED&dateFrom=${dateFrom}&dateTo=${dateTo}`
    } else if (type === 'results') {
      // 최근 완료된 경기 (지난 3일, 어제까지)
      const dateFrom = threeDaysAgo.toISOString().split('T')[0]
      const dateTo = yesterday.toISOString().split('T')[0]
      apiUrl = `https://api.football-data.org/v4/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`
    }

    console.log('🔍 API 요청:', { type, apiUrl })

    const response = await fetch(apiUrl, {
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_API_KEY!
      },
      next: { revalidate: 300 } // 5분 캐시
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Football API 오류:', response.status, errorText)
      throw new Error(`Football API 오류: ${response.status}`)
    }

    const data = await response.json()
    console.log('📊 받은 경기 수:', data.matches?.length || 0)

    // 주요 리그 필터링
    const MAJOR_LEAGUES = [
      // 영국
      'Premier League',              // 프리미어리그
      'Championship',                // 챔피언십 (2부)
      
      // 독일
      'Bundesliga',                  // 분데스리가
      '2. Bundesliga',               // 분데스리가 2부
      
      // 이탈리아
      'Serie A',                     // 세리에 A
      'Serie B',                     // 세리에 B
      
      // 스페인
      'La Liga',                     // 라리가
      'Segunda División',            // 세군다 디비시온 (2부)
      
      // 프랑스
      'Ligue 1',                     // 리그 1
      'Ligue 2',                     // 리그 2
      
      // 네덜란드
      'Eredivisie',                  // 에레디비시 (1부)
      'Eerste Divisie',              // 에레스테 디비시 (2부)
      
      // 유럽 대회
      'UEFA Champions League',      // 챔피언스리그
      'UEFA Europa League',         // 유로파리그
      'UEFA Europa Conference League' // 컨퍼런스리그
    ]

    let matches = data.matches || []
    
    // 주요 리그만 필터링
    matches = matches.filter((match: any) => 
      MAJOR_LEAGUES.includes(match.competition.name)
    )
    
    console.log('✅ 필터링 후 경기 수:', matches.length)
    
    // 경기가 없으면 더 넓은 범위로 다시 시도
    if (matches.length === 0 && type === 'results') {
      console.log('⚠️ 결과 없음, 지난 7일로 범위 확대...')
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(today.getDate() - 7)
      const dateFrom = sevenDaysAgo.toISOString().split('T')[0]
      const dateTo = yesterday.toISOString().split('T')[0]
      
      const retryUrl = `https://api.football-data.org/v4/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`
      console.log('🔄 재시도 URL:', retryUrl)
      
      const retryResponse = await fetch(retryUrl, {
        headers: {
          'X-Auth-Token': process.env.FOOTBALL_API_KEY!
        }
      })
      
      if (retryResponse.ok) {
        const retryData = await retryResponse.json()
        matches = retryData.matches || []
        
        // 재시도에서도 주요 리그만 필터링
        matches = matches.filter((match: any) => 
          MAJOR_LEAGUES.includes(match.competition.name)
        )
        
        console.log('✅ 재시도 결과:', matches.length, '경기')
      }
    }

    // 데이터 변환
    const transformedMatches = matches
      .sort((a: any, b: any) => {
        if (type === 'scheduled') {
          // 예정 경기는 가까운 순서대로 (오름차순)
          return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
        } else {
          // 결과 경기는 최신순으로 (내림차순)
          return new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
        }
      })
      .slice(0, 20) // 더 많은 경기 표시
      .map((match: any) => ({
        id: match.id,
        league: match.competition.name,
        leagueLogo: match.competition.emblem, // 리그 로고 추가
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

    console.log('✅ 반환 경기 수:', transformedMatches.length)
    return NextResponse.json(transformedMatches)

  } catch (error: any) {
    console.error('💥 API 오류:', error)
    return NextResponse.json(
      { error: '경기 정보를 불러올 수 없습니다: ' + error.message },
      { status: 500 }
    )
  }
}
