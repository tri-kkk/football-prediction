import { NextResponse } from 'next/server'

// 🔥 앱용 배너 경기 데이터 API
// GET /api/banner-matches
// 상단 스크롤 배너에 필요한 경량화된 데이터 제공

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 리그 ID 매핑 (API-Football)
const LEAGUE_IDS: Record<string, number> = {
  'PL': 39,    // 프리미어리그
  'PD': 140,   // 라리가
  'BL1': 78,   // 분데스리가
  'SA': 135,   // 세리에A
  'FL1': 61,   // 리그1
  'CL': 2,     // 챔피언스리그
  'EL': 3,     // 유로파리그
  'PPL': 94,   // 프리메이라리가
  'DED': 88,   // 에레디비시
  'ELC': 40,   // 챔피언십
}

// 리그 이름 (한글)
const LEAGUE_NAMES_KR: Record<string, string> = {
  'PL': '프리미어리그',
  'PD': '라리가',
  'BL1': '분데스리가',
  'SA': '세리에A',
  'FL1': '리그1',
  'CL': '챔피언스리그',
  'EL': '유로파리그',
  'PPL': '프리메이라리가',
  'DED': '에레디비시',
  'ELC': '챔피언십',
}

// 리그 이름 (영문)
const LEAGUE_NAMES_EN: Record<string, string> = {
  'PL': 'Premier League',
  'PD': 'La Liga',
  'BL1': 'Bundesliga',
  'SA': 'Serie A',
  'FL1': 'Ligue 1',
  'CL': 'Champions League',
  'EL': 'Europa League',
  'PPL': 'Primeira Liga',
  'DED': 'Eredivisie',
  'ELC': 'Championship',
}

// 배너 아이템 인터페이스
interface BannerItem {
  matchId: number
  winningTeam: string        // 우세팀 (한글)
  winningTeamEn: string      // 우세팀 (영문)
  winningCrest: string       // 우세팀 로고
  winProbability: number     // 우세팀 승률
  isHome: boolean            // 홈팀 우세 여부
  versus: string             // 대진 (한글)
  versusEn: string           // 대진 (영문)
  homeTeam: string           // 홈팀 (한글)
  homeTeamEn: string         // 홈팀 (영문)
  awayTeam: string           // 원정팀 (한글)
  awayTeamEn: string         // 원정팀 (영문)
  homeCrest: string          // 홈팀 로고
  awayCrest: string          // 원정팀 로고
  homeWinRate: number        // 홈팀 승률
  drawRate: number           // 무승부 확률
  awayWinRate: number        // 원정팀 승률
  matchTime: string          // 경기 시간 (HH:MM)
  matchDate: string          // 경기 날짜 (YYYY-MM-DD)
  utcDate: string            // UTC 날짜/시간
  leagueCode: string         // 리그 코드
  leagueName: string         // 리그 이름 (한글)
  leagueNameEn: string       // 리그 이름 (영문)
  leagueLogo: string         // 리그 로고
  status: string             // 경기 상태
}

// 시간 포맷 (KST)
function formatTimeKST(utcDateString: string): string {
  try {
    let normalizedDate = utcDateString
    if (!utcDateString.endsWith('Z') && !utcDateString.includes('+')) {
      normalizedDate = utcDateString.replace(' ', 'T') + 'Z'
    }
    
    const date = new Date(normalizedDate)
    const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000))
    const hours = String(kstDate.getUTCHours()).padStart(2, '0')
    const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  } catch {
    return '--:--'
  }
}

// 날짜 포맷
function formatDateKST(utcDateString: string): string {
  try {
    let normalizedDate = utcDateString
    if (!utcDateString.endsWith('Z') && !utcDateString.includes('+')) {
      normalizedDate = utcDateString.replace(' ', 'T') + 'Z'
    }
    
    const date = new Date(normalizedDate)
    const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000))
    const year = kstDate.getUTCFullYear()
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(kstDate.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

// 리그 로고 URL
function getLeagueLogo(leagueCode: string): string {
  const leagueId = LEAGUE_IDS[leagueCode]
  if (leagueId) {
    return `https://media.api-sports.io/football/leagues/${leagueId}.png`
  }
  return ''
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const league = searchParams.get('league') || 'ALL'
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { success: false, error: 'Database configuration missing' },
        { status: 500 }
      )
    }

    // 현재 시간 기준 미래 경기만 (7일 범위)
    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    // Supabase에서 경기 데이터 조회
    let query = `${SUPABASE_URL}/rest/v1/match_odds_latest?` +
      `commence_time=gte.${now.toISOString()}&` +
      `commence_time=lte.${sevenDaysLater.toISOString()}&` +
      `select=*&` +
      `order=commence_time.asc&` +
      `limit=${limit}`
    
    // 특정 리그 필터
    if (league !== 'ALL') {
      query += `&league_code=eq.${league}`
    }

    const response = await fetch(query, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 } // 1분 캐시
    })

    if (!response.ok) {
      console.error('Supabase error:', response.status)
      return NextResponse.json(
        { success: false, error: 'Database query failed' },
        { status: 500 }
      )
    }

    const matches = await response.json()

    // 🔥 배너 아이템으로 변환
    const bannerItems: BannerItem[] = matches.map((match: any) => {
      const homeWinRate = match.home_probability || 33.33
      const drawRate = match.draw_probability || 33.34
      const awayWinRate = match.away_probability || 33.33
      
      // 우세팀 결정
      const isHome = homeWinRate >= awayWinRate
      const winProbability = isHome ? homeWinRate : awayWinRate
      
      // 팀명 (한글 fallback to 영문)
      const homeTeamKR = match.home_team_kr || match.home_team || 'Home'
      const awayTeamKR = match.away_team_kr || match.away_team || 'Away'
      const homeTeamEN = match.home_team || 'Home'
      const awayTeamEN = match.away_team || 'Away'
      
      const winningTeam = isHome ? homeTeamKR : awayTeamKR
      const winningTeamEn = isHome ? homeTeamEN : awayTeamEN
      const winningCrest = isHome 
        ? (match.home_team_logo || `https://media.api-sports.io/football/teams/${match.home_team_id || 0}.png`)
        : (match.away_team_logo || `https://media.api-sports.io/football/teams/${match.away_team_id || 0}.png`)
      
      const leagueCode = match.league_code || 'PL'
      
      return {
        matchId: match.match_id || match.id,
        winningTeam,
        winningTeamEn,
        winningCrest,
        winProbability: Math.round(winProbability * 10) / 10,
        isHome,
        versus: `${homeTeamKR} vs ${awayTeamKR}`,
        versusEn: `${homeTeamEN} vs ${awayTeamEN}`,
        homeTeam: homeTeamKR,
        homeTeamEn: homeTeamEN,
        awayTeam: awayTeamKR,
        awayTeamEn: awayTeamEN,
        homeCrest: match.home_team_logo || `https://media.api-sports.io/football/teams/${match.home_team_id || 0}.png`,
        awayCrest: match.away_team_logo || `https://media.api-sports.io/football/teams/${match.away_team_id || 0}.png`,
        homeWinRate: Math.round(homeWinRate * 10) / 10,
        drawRate: Math.round(drawRate * 10) / 10,
        awayWinRate: Math.round(awayWinRate * 10) / 10,
        matchTime: formatTimeKST(match.commence_time || match.utc_date),
        matchDate: formatDateKST(match.commence_time || match.utc_date),
        utcDate: match.commence_time || match.utc_date,
        leagueCode,
        leagueName: LEAGUE_NAMES_KR[leagueCode] || leagueCode,
        leagueNameEn: LEAGUE_NAMES_EN[leagueCode] || leagueCode,
        leagueLogo: getLeagueLogo(leagueCode),
        status: match.status || 'SCHEDULED',
      }
    })

    // 응답
    return NextResponse.json({
      success: true,
      data: bannerItems,
      count: bannerItems.length,
      updatedAt: new Date().toISOString(),
      meta: {
        league,
        limit,
        timezone: 'KST (UTC+9)',
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    })

  } catch (error: any) {
    console.error('Banner matches API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        data: [],
        count: 0
      },
      { status: 500 }
    )
  }
}
