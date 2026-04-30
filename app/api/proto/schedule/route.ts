import { NextRequest, NextResponse } from 'next/server'

// sportstoto.co.kr 공식 API 프록시
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const gmTs = searchParams.get('round') || '260009'
  const yearMonth = searchParams.get('yearMonth') || '202601'
  
  console.log('🎯 프로토 API 요청:', { gmTs, yearMonth })

  // sportstoto.co.kr 공식 사이트 시도
  let data = await trySportstoto(gmTs, yearMonth)
  if (data) {
    return NextResponse.json({ success: true, source: 'sportstoto', ...data })
  }

  // 실패 시 더미 데이터
  console.log('❌ API 실패, 더미 데이터 반환')
  return NextResponse.json(getDummyResponse(gmTs, yearMonth))
}

// sportstoto.co.kr API 호출
async function trySportstoto(gmTs: string, yearMonth: string) {
  try {
    console.log('📡 sportstoto.co.kr API 시도')
    
    const response = await fetch('https://www.sportstoto.co.kr/detailSchedule.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Origin': 'https://www.sportstoto.co.kr',
        'Referer': 'https://www.sportstoto.co.kr/schedule.php'
      },
      body: JSON.stringify({
        draw: 1,
        start: 1,
        perPage: -1,
        searchValue: '',
        gmId: 'G101',
        gmTs: parseInt(gmTs),
        yearMonth: yearMonth,
        sortName: 'matchSeq',
        _sbmInfo: { debugMode: 'false' }
      })
    })

    const text = await response.text()
    console.log('📥 응답 길이:', text.length, '상태:', response.status)
    
    // HTML 응답 체크
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html') || text.startsWith('<')) {
      console.log('❌ HTML 응답 받음')
      return null
    }

    const data = JSON.parse(text)
    
    if (data.rsMsg?.statusCode !== 'S') {
      console.log('❌ API 에러:', data.rsMsg?.message)
      return null
    }

    console.log('✅ sportstoto 성공!')
    return transformData(data, gmTs, yearMonth)
    
  } catch (e: any) {
    console.log('❌ sportstoto 실패:', e.message)
    return null
  }
}

// 데이터 변환
function transformData(data: any, gmTs: string, yearMonth: string) {
  // schedules.data 안에 경기 목록이 있음
  const allMatches = data.schedules?.data || data.schedules || []
  
  // 축구 경기만 필터 (itemCode: "SC")
  const soccerMatches = allMatches.filter(
    (match: any) => match.itemCode === 'SC'
  )
  
  console.log('📊 전체:', allMatches.length, '축구:', soccerMatches.length)

  const matches = soccerMatches.map((match: any) => {
    const gameDate = new Date(match.gameDate)
    
    return {
      matchSeq: match.matchSeq,
      gameDate: gameDate.toISOString(),
      koreanDate: formatKoreanDate(gameDate),
      koreanTime: gameDate.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Seoul'
      }),
      homeTeam: match.homeTmNm || match.homeNm || 'Home',
      awayTeam: match.awayTmNm || match.awayNm || 'Away',
      leagueName: match.gameNm || match.lgNm || match.leagueNm || 'League',
      homeOdds: parseFloat(match.homeRto) || null,
      drawOdds: parseFloat(match.drawRto) || null,
      awayOdds: parseFloat(match.awayRto) || null,
      saleSt: match.saleSt,
      resultCode: match.resultCode,
      matchType: match.matchType,
      gameId: match.gameId
    }
  })

  return {
    round: gmTs,
    yearMonth: yearMonth,
    total: allMatches.length,
    soccerCount: matches.length,
    matches: matches
  }
}

// 더미 데이터
function getDummyResponse(round: string, yearMonth: string) {
  const now = new Date()
  
  const dummyMatches = [
    { matchSeq: 1, gameDate: addDays(now, 1).toISOString(), koreanDate: formatKoreanDate(addDays(now, 1)), koreanTime: '22:00', homeTeam: 'Manchester United', awayTeam: 'Chelsea', leagueName: 'EPL', homeOdds: 2.15, drawOdds: 3.40, awayOdds: 3.20, saleSt: 'Y', resultCode: null },
    { matchSeq: 2, gameDate: addDays(now, 1).toISOString(), koreanDate: formatKoreanDate(addDays(now, 1)), koreanTime: '19:30', homeTeam: 'Liverpool', awayTeam: 'Arsenal', leagueName: 'EPL', homeOdds: 1.85, drawOdds: 3.60, awayOdds: 4.10, saleSt: 'Y', resultCode: null },
    { matchSeq: 3, gameDate: addDays(now, 2).toISOString(), koreanDate: formatKoreanDate(addDays(now, 2)), koreanTime: '04:00', homeTeam: 'Real Madrid', awayTeam: 'Barcelona', leagueName: 'La Liga', homeOdds: 2.20, drawOdds: 3.30, awayOdds: 3.10, saleSt: 'Y', resultCode: null },
    { matchSeq: 4, gameDate: addDays(now, 2).toISOString(), koreanDate: formatKoreanDate(addDays(now, 2)), koreanTime: '22:30', homeTeam: 'Bayern Munich', awayTeam: 'Dortmund', leagueName: 'Bundesliga', homeOdds: 1.65, drawOdds: 4.00, awayOdds: 4.50, saleSt: 'Y', resultCode: null },
    { matchSeq: 5, gameDate: addDays(now, 3).toISOString(), koreanDate: formatKoreanDate(addDays(now, 3)), koreanTime: '03:45', homeTeam: 'Inter', awayTeam: 'Juventus', leagueName: 'Serie A', homeOdds: 2.00, drawOdds: 3.20, awayOdds: 3.50, saleSt: 'Y', resultCode: null },
    { matchSeq: 6, gameDate: addDays(now, 3).toISOString(), koreanDate: formatKoreanDate(addDays(now, 3)), koreanTime: '04:00', homeTeam: 'PSG', awayTeam: 'Monaco', leagueName: 'Ligue 1', homeOdds: 1.45, drawOdds: 4.50, awayOdds: 6.00, saleSt: 'Y', resultCode: null }
  ]

  return {
    success: true,
    source: 'dummy',
    round: round,
    yearMonth: yearMonth,
    total: dummyMatches.length,
    soccerCount: dummyMatches.length,
    matches: dummyMatches,
    notice: '⚠️ API 접근 불가 - 샘플 데이터 표시'
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatKoreanDate(date: Date): string {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dayOfWeek = days[date.getDay()]
  return `${month}/${day}(${dayOfWeek})`
}
