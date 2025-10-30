export const dynamic = 'force-dynamic'

interface OddsOutcome {
  name: string
  price: number
}

interface OddsMarket {
  key: string
  outcomes: OddsOutcome[]
}

interface Bookmaker {
  key: string
  title: string
  markets: OddsMarket[]
}

interface OddsAPIMatch {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: Bookmaker[]
}

interface ProcessedOdds {
  matchId: string
  homeTeam: string
  awayTeam: string
  homeOdds: number
  drawOdds: number
  awayOdds: number
  homeProbability: number
  drawProbability: number
  awayProbability: number
  timestamp: string
  commenceTime: string
}

function oddsToImpliedProbability(odds: number): number {
  // 오즈를 확률로 변환 (%)
  return (1 / odds) * 100
}

function normalizeTeamName(name: string): string {
  // 팀 이름 정규화 (매칭용)
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') || 'soccer_epl' // 기본: EPL
    
    const API_KEY = process.env.ODDS_API_KEY
    
    if (!API_KEY) {
      console.warn('⚠️ ODDS_API_KEY not found - using dummy data')
      
      // Fallback: 더미 데이터
      return Response.json({
        success: true,
        data: [
          {
            matchId: 'dummy-1',
            homeTeam: 'Manchester United',
            awayTeam: 'Liverpool',
            homeOdds: 2.5,
            drawOdds: 3.2,
            awayOdds: 2.8,
            homeProbability: 40,
            drawProbability: 31.25,
            awayProbability: 35.71,
            timestamp: new Date().toISOString(),
            commenceTime: new Date(Date.now() + 86400000).toISOString()
          },
          {
            matchId: 'dummy-2',
            homeTeam: 'Arsenal',
            awayTeam: 'Chelsea',
            homeOdds: 2.1,
            drawOdds: 3.5,
            awayOdds: 3.4,
            homeProbability: 47.6,
            drawProbability: 28.6,
            awayProbability: 29.4,
            timestamp: new Date().toISOString(),
            commenceTime: new Date(Date.now() + 172800000).toISOString()
          }
        ],
        source: 'dummy',
        remainingRequests: 'N/A'
      })
    }
    
    console.log('🔍 Fetching odds from The Odds API...')
    console.log('Sport:', sport)
    
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/${sport}/odds/?` +
      `apiKey=${API_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`,
      { 
        next: { revalidate: 3600 }, // 1시간 캐싱
        headers: { 'Accept': 'application/json' }
      }
    )
    
    // API 사용량 체크
    const remainingRequests = response.headers.get('x-requests-remaining')
    const usedRequests = response.headers.get('x-requests-used')
    
    console.log('📊 API Usage:', {
      remaining: remainingRequests,
      used: usedRequests
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }
    
    const data: OddsAPIMatch[] = await response.json()
    
    console.log(`✅ Received ${data.length} matches`)
    
    const oddsData: ProcessedOdds[] = data
      .map((match) => {
        // 첫 번째 북메이커 사용 (보통 가장 신뢰할만함)
        const bookmaker = match.bookmakers?.[0]
        if (!bookmaker) {
          console.warn(`⚠️ No bookmaker data for match: ${match.home_team} vs ${match.away_team}`)
          return null
        }
        
        // h2h 마켓 찾기
        const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h')
        if (!h2hMarket || h2hMarket.outcomes.length < 2) {
          console.warn(`⚠️ No h2h market for match: ${match.home_team} vs ${match.away_team}`)
          return null
        }
        
        const outcomes = h2hMarket.outcomes
        
        // 홈/무승부/원정 오즈 찾기
        const homeOutcome = outcomes.find(o => o.name === match.home_team)
        const awayOutcome = outcomes.find(o => o.name === match.away_team)
        const drawOutcome = outcomes.find(o => o.name === 'Draw')
        
        // 오즈가 없으면 기본값 사용
        const homeOdds = homeOutcome?.price || 2.5
        const drawOdds = drawOutcome?.price || 3.0
        const awayOdds = awayOutcome?.price || 2.5
        
        // 확률 계산
        const homeProbability = oddsToImpliedProbability(homeOdds)
        const drawProbability = oddsToImpliedProbability(drawOdds)
        const awayProbability = oddsToImpliedProbability(awayOdds)
        
        // 총합이 100%가 넘으면 정규화 (북메이커 마진 제거)
        const total = homeProbability + drawProbability + awayProbability
        const normalizedHome = (homeProbability / total) * 100
        const normalizedDraw = (drawProbability / total) * 100
        const normalizedAway = (awayProbability / total) * 100
        
        return {
          matchId: match.id,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          homeOdds: Number(homeOdds.toFixed(2)),
          drawOdds: Number(drawOdds.toFixed(2)),
          awayOdds: Number(awayOdds.toFixed(2)),
          homeProbability: Number(normalizedHome.toFixed(1)),
          drawProbability: Number(normalizedDraw.toFixed(1)),
          awayProbability: Number(normalizedAway.toFixed(1)),
          timestamp: new Date().toISOString(),
          commenceTime: match.commence_time
        }
      })
      .filter((item): item is ProcessedOdds => item !== null)
    
    console.log(`✅ Processed ${oddsData.length} matches with odds`)
    
    return Response.json({
      success: true,
      data: oddsData,
      source: 'the-odds-api',
      remainingRequests: remainingRequests || 'Unknown',
      usedRequests: usedRequests || 'Unknown'
    })
    
  } catch (error) {
    console.error('❌ Odds API Error:', error)
    return Response.json(
      { 
        success: false,
        error: 'Failed to fetch odds',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
