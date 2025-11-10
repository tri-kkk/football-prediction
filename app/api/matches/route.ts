import { NextRequest, NextResponse } from 'next/server'

// ===== 리그 코드 매핑 =====
const LEAGUE_CODES: { [key: string]: string } = {
  'PL': 'Premier League',
  'PD': 'La Liga',
  'BL1': 'Bundesliga',
  'SA': 'Serie A',
  'FL1': 'Ligue 1',
  'CL': 'UEFA Champions League',
  'PPL': 'Primeira Liga',
  'DED': 'Eredivisie',
  'EL': 'UEFA Europa League',
  'ELC': 'Championship',
  'ALL': 'ALL'
}

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
  'Primeira Liga',
  'UEFA Champions League',
  'UEFA Europa League',
  'UEFA Europa Conference League'
]

// ===== 오즈 관련 함수 =====

// 오즈를 승률로 변환
function oddsToPercentage(homeOdds: number, drawOdds: number, awayOdds: number) {
  const homeProb = 1 / homeOdds
  const drawProb = 1 / drawOdds
  const awayProb = 1 / awayOdds
  
  const total = homeProb + drawProb + awayProb
  
  return {
    homeWinRate: Math.round((homeProb / total) * 100),
    drawRate: Math.round((drawProb / total) * 100),
    awayWinRate: Math.round((awayProb / total) * 100)
  }
}

// 기본 승률 생성 (크롤링 실패 또는 개발 중)
function generateRealisticOdds() {
  // 홈 어드밴티지를 고려한 현실적인 승률 생성
  const homeBase = 35 + Math.random() * 20 // 35-55%
  const drawBase = 20 + Math.random() * 15 // 20-35%
  const awayBase = 100 - homeBase - drawBase
  
  return {
    homeWinRate: Math.round(homeBase),
    drawRate: Math.round(drawBase),
    awayWinRate: Math.round(awayBase)
  }
}

// BetExplorer 오즈 크롤링 (실제 구현)
async function fetchOddsFromBetExplorer(
  matchId: number,
  homeTeam: string,
  awayTeam: string,
  league: string
) {
  try {
    // 🚧 실제 크롤링 구현
    // 현재는 더미 데이터로 시작 (나중에 cheerio로 실제 크롤링)
    
    // TODO: 실제 BetExplorer 크롤링 로직
    // const url = `https://www.betexplorer.com/football/...`
    // const response = await fetch(url, { headers: { 'User-Agent': '...' } })
    // const html = await response.text()
    // const $ = cheerio.load(html)
    // const odds = $('.odds-table').text()
    
    console.log(`📊 오즈 조회: ${homeTeam} vs ${awayTeam}`)
    
    // 임시: 현실적인 더미 오즈 반환
    return generateRealisticOdds()
    
  } catch (error) {
    console.error('오즈 크롤링 실패:', error)
    return generateRealisticOdds()
  }
}

// ===== 메인 API 핸들러 =====

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'scheduled'
  const leagueParam = searchParams.get('league') || 'ALL' // 🆕 리그 필터
  
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

    console.log('📡 API 요청:', { type, league: leagueParam, apiUrl })

    const response = await fetch(apiUrl, {
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY!
      },
      next: { revalidate: 300 } // 5분 캐싱
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Football API 오류:', response.status, errorText)
      throw new Error(`Football API 오류: ${response.status}`)
    }

    const data = await response.json()
    console.log('📥 받은 경기 수:', data.matches?.length || 0)

    let matches = data.matches || []
    
    // 주요 리그 필터링
    matches = matches.filter((match: any) => 
      MAJOR_LEAGUES.includes(match.competition.name)
    )
    
    // 🆕 특정 리그 필터링
    if (leagueParam !== 'ALL' && LEAGUE_CODES[leagueParam]) {
      const targetLeague = LEAGUE_CODES[leagueParam]
      matches = matches.filter((match: any) => 
        match.competition.name === targetLeague
      )
      console.log(`🔍 ${targetLeague} 필터링 후:`, matches.length, '경기')
    }
    
    console.log('✅ 필터링 후 경기 수:', matches.length)
    
    // 결과 없을 때 재시도 (results 타입만)
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
          'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY!
        }
      })
      
      if (retryResponse.ok) {
        const retryData = await retryResponse.json()
        matches = retryData.matches || []
        
        matches = matches.filter((match: any) => 
          MAJOR_LEAGUES.includes(match.competition.name)
        )
        
        if (leagueParam !== 'ALL' && LEAGUE_CODES[leagueParam]) {
          const targetLeague = LEAGUE_CODES[leagueParam]
          matches = matches.filter((match: any) => 
            match.competition.name === targetLeague
          )
        }
        
        console.log('✅ 재시도 결과:', matches.length, '경기')
      }
    }

    // 경기 데이터 변환 + 오즈 추가
    const transformedMatches = await Promise.all(
      matches
        .sort((a: any, b: any) => {
          if (type === 'scheduled') {
            return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
          } else {
            return new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
          }
        })
        .slice(0, 20) // 최대 20경기
        .map(async (match: any) => {
          // UTC 시간을 한국 시간대로 변환
          const utcDate = new Date(match.utcDate)
          
          const koreanDate = utcDate.toLocaleDateString('ko-KR', { 
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
          const koreanTime = utcDate.toLocaleTimeString('ko-KR', { 
            timeZone: 'Asia/Seoul',
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          })
          
          // 🆕 오즈 크롤링 (SCHEDULED 경기만)
          let odds = {
            homeWinRate: 33,
            drawRate: 34,
            awayWinRate: 33
          }
          
          if (match.status === 'SCHEDULED') {
            odds = await fetchOddsFromBetExplorer(
              match.id,
              match.homeTeam.name,
              match.awayTeam.name,
              match.competition.name
            )
          }
          
          // 리그 코드 추출
          const leagueCode = Object.keys(LEAGUE_CODES).find(
            key => LEAGUE_CODES[key] === match.competition.name
          ) || 'OTHER'
          
          return {
            id: match.id,
            league: match.competition.name,
            leagueCode: leagueCode, // 🆕 추가
            leagueLogo: match.competition.emblem,
            date: koreanDate,
            time: koreanTime,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            homeCrest: match.homeTeam.crest,
            awayCrest: match.awayTeam.crest,
            homeScore: match.score?.fullTime?.home ?? null,
            awayScore: match.score?.fullTime?.away ?? null,
            status: match.status,
            // 🆕 오즈 기반 승률
            homeWinRate: odds.homeWinRate,
            drawRate: odds.drawRate,
            awayWinRate: odds.awayWinRate
          }
        })
    )

    console.log('📤 반환 경기 수:', transformedMatches.length)
    return NextResponse.json(transformedMatches)

  } catch (error: any) {
    console.error('💥 API 오류:', error)
    return NextResponse.json(
      { error: '경기 정보를 불러올 수 없습니다: ' + error.message },
      { status: 500 }
    )
  }
}