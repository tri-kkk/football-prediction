export const dynamic = 'force-dynamic'

interface Sport {
  key: string
  group: string
  title: string
  description: string
  active: boolean
  has_outrights: boolean
}

export async function GET() {
  try {
    const API_KEY = process.env.ODDS_API_KEY
    
    if (!API_KEY) {
      // Fallback: 주요 축구 리그 목록
      return Response.json({
        success: true,
        data: [
          { key: 'soccer_epl', title: 'English Premier League', active: true },
          { key: 'soccer_spain_la_liga', title: 'La Liga', active: true },
          { key: 'soccer_germany_bundesliga', title: 'Bundesliga', active: true },
          { key: 'soccer_italy_serie_a', title: 'Serie A', active: true },
          { key: 'soccer_france_ligue_one', title: 'Ligue 1', active: true },
          { key: 'soccer_uefa_champs_league', title: 'UEFA Champions League', active: true },
          { key: 'soccer_uefa_europa_league', title: 'UEFA Europa League', active: true }
        ],
        source: 'dummy'
      })
    }
    
    console.log('🔍 Fetching sports list from The Odds API...')
    
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/?apiKey=${API_KEY}`,
      { 
        next: { revalidate: 86400 }, // 24시간 캐싱 (리그 목록은 자주 안바뀜)
        headers: { 'Accept': 'application/json' }
      }
    )
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const allSports: Sport[] = await response.json()
    
    // 축구 관련 리그만 필터링
    const soccerLeagues = allSports.filter(
      sport => sport.key.startsWith('soccer_') && sport.active
    )
    
    console.log(`✅ Found ${soccerLeagues.length} active soccer leagues`)
    
    return Response.json({
      success: true,
      data: soccerLeagues,
      source: 'the-odds-api'
    })
    
  } catch (error) {
    console.error('❌ Sports API Error:', error)
    return Response.json(
      { 
        success: false,
        error: 'Failed to fetch sports list'
      }, 
      { status: 500 }
    )
  }
}
