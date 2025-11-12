// app/api/test-api-football/route.ts
// API-Football 테스트 엔드포인트 (환경 변수 버전)

export const dynamic = 'force-dynamic'

// ✅ 환경 변수에서 가져오기
const API_KEY = process.env.API_FOOTBALL_KEY
const BASE_URL = 'https://v3.football.api-sports.io'

// 리그 ID 매핑
const LEAGUE_IDS: { [key: string]: number } = {
  'PL': 39,   // Premier League
  'PD': 140,  // La Liga
  'BL1': 78,  // Bundesliga
  'SA': 135,  // Serie A
  'FL1': 61,  // Ligue 1
  'CL': 2,    // Champions League
  'PPL': 94,  // Primeira Liga
  'DED': 88,  // Eredivisie
  'EL': 3,    // Europa League
  'ELC': 40   // Championship
}

export async function GET(request: Request) {
  try {
    // ✅ API 키 체크
    if (!API_KEY) {
      console.error('❌ API_FOOTBALL_KEY not found in environment variables')
      return Response.json(
        { error: 'API key not configured' }, 
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const leagueCode = searchParams.get('league') || 'PL'
    const testType = searchParams.get('type') || 'fixtures'
    const dateParam = searchParams.get('date') // 날짜 파라미터 추가
    
    const leagueId = LEAGUE_IDS[leagueCode]
    if (!leagueId) {
      return Response.json({ error: 'Invalid league code' }, { status: 400 })
    }
    
    console.log(`🔍 Testing API-Football: ${testType} for ${leagueCode} (ID: ${leagueId})`)
    
    let url = ''
    // Ultra 플랜: 모든 날짜/시즌 접근 가능
    const today = new Date().toISOString().split('T')[0]
    const targetDate = dateParam || today // 파라미터로 받은 날짜 또는 오늘
    
    switch (testType) {
      case 'fixtures':
        // fixtures는 season 없이도 작동
        url = `${BASE_URL}/fixtures?date=${targetDate}&league=${leagueId}`
        break
      
      case 'odds':
        // odds는 season 필수! 2025/2026 시즌 = season=2025
        url = `${BASE_URL}/odds?date=${targetDate}&league=${leagueId}&season=2025`
        break
      
      case 'live':
        // 라이브 경기
        url = `${BASE_URL}/fixtures?live=all`
        break
      
      case 'standings':
        // 순위표 - 2025/2026 시즌 = season=2025
        url = `${BASE_URL}/standings?league=${leagueId}&season=2025`
        break
      
      default:
        url = `${BASE_URL}/fixtures?date=${today}&league=${leagueId}&season=2024`
    }
    
    console.log(`📡 API URL: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': API_KEY
      },
      next: { revalidate: 60 } // 1분 캐싱
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error:', response.status, errorText)
      throw new Error(`API-Football Error: ${response.status}`)
    }
    
    const data = await response.json()
    
    console.log(`✅ Success: ${data.results} results`)
    console.log(`📊 Requests: ${data.paging?.current || 0}/${data.paging?.total || 0}`)
    
    return Response.json({
      success: true,
      league: leagueCode,
      type: testType,
      results: data.results || 0,
      data: data.response || [],
      paging: data.paging || {},
      errors: data.errors || []
    })
    
  } catch (error) {
    console.error('❌ Test Error:', error)
    return Response.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
