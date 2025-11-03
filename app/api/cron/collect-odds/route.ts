// Vercel Cron Job: 1시간마다 실행
// vercel.json에 설정 필요

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5분 타임아웃

interface OddsData {
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

// Supabase에 오즈 저장
async function saveOddsToDatabase(odds: OddsData, leagueCode: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY // 서비스 키 사용!
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured')
  }
  
  // 1. 히스토리 저장
  const historyResponse = await fetch(`${supabaseUrl}/rest/v1/match_odds_history`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      match_id: odds.matchId,
      home_team: odds.homeTeam,
      away_team: odds.awayTeam,
      league_code: leagueCode,
      commence_time: odds.commenceTime,
      home_odds: odds.homeOdds,
      draw_odds: odds.drawOdds,
      away_odds: odds.awayOdds,
      home_probability: odds.homeProbability,
      draw_probability: odds.drawProbability,
      away_probability: odds.awayProbability,
      odds_source: 'the-odds-api'
    })
  })
  
  if (!historyResponse.ok) {
    throw new Error(`Failed to save history: ${historyResponse.status}`)
  }
  
  // 2. 최신 오즈 업데이트 (UPSERT)
  const latestResponse = await fetch(`${supabaseUrl}/rest/v1/match_odds_latest`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({
      match_id: odds.matchId,
      home_team: odds.homeTeam,
      away_team: odds.awayTeam,
      league_code: leagueCode,
      commence_time: odds.commenceTime,
      home_odds: odds.homeOdds,
      draw_odds: odds.drawOdds,
      away_odds: odds.awayOdds,
      home_probability: odds.homeProbability,
      draw_probability: odds.drawProbability,
      away_probability: odds.awayProbability,
      odds_source: 'the-odds-api',
      updated_at: new Date().toISOString()
    })
  })
  
  if (!latestResponse.ok) {
    throw new Error(`Failed to save latest: ${latestResponse.status}`)
  }
}

export async function GET(request: Request) {
  try {
    // Cron Secret 검증 (보안)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // 프로덕션에서만 검증
    if (process.env.NODE_ENV === 'production' && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('🕐 Cron Job Started:', new Date().toISOString())
    
    // 주요 리그 목록
    const leagues = [
      { code: 'PL', sport: 'soccer_epl' },
      { code: 'PD', sport: 'soccer_spain_la_liga' },
      { code: 'BL1', sport: 'soccer_germany_bundesliga' },
      { code: 'SA', sport: 'soccer_italy_serie_a' },
      { code: 'FL1', sport: 'soccer_france_ligue_one' },
      { code: 'CL', sport: 'soccer_uefa_champs_league' }
    ]
    
    let totalSaved = 0
    let errors = 0
    
    // 각 리그별로 오즈 수집
    for (const league of leagues) {
      try {
        console.log(`📡 Fetching odds for ${league.code}...`)
        
        // The Odds API 호출
        const oddsApiKey = process.env.ODDS_API_KEY
        if (!oddsApiKey) {
          console.warn('⚠️ ODDS_API_KEY not found, skipping...')
          continue
        }
        
        const response = await fetch(
          `https://api.the-odds-api.com/v4/sports/${league.sport}/odds/?` +
          `apiKey=${oddsApiKey}&regions=eu&markets=h2h&oddsFormat=decimal`,
          { cache: 'no-store' }
        )
        
        if (!response.ok) {
          console.error(`❌ Failed to fetch ${league.code}: ${response.status}`)
          errors++
          continue
        }
        
        const data = await response.json()
        console.log(`✅ Got ${data.length} matches for ${league.code}`)
        
        // 각 경기 오즈 저장
for (const match of data) {
  try {
    // 🔥 경기 3일 전부터만 수집
    const commenceTime = new Date(match.commence_time).getTime()
    const now = Date.now()
    const hoursUntilMatch = (commenceTime - now) / (1000 * 60 * 60)
    
    // 경기가 이미 끝났거나 3일(72시간) 이상 남았으면 스킵
    if (hoursUntilMatch < 0 || hoursUntilMatch > 72) {
      continue
    }
    
    const bookmaker = match.bookmakers?.[0]
    if (!bookmaker) continue
    
    const h2hMarket = bookmaker.markets.find((m: any) => m.key === 'h2h')
    if (!h2hMarket || h2hMarket.outcomes.length < 2) continue
    
    const outcomes = h2hMarket.outcomes
    const homeOutcome = outcomes.find((o: any) => o.name === match.home_team)
    const awayOutcome = outcomes.find((o: any) => o.name === match.away_team)
    const drawOutcome = outcomes.find((o: any) => o.name === 'Draw')
    
    const homeOdds = homeOutcome?.price || 2.5
    const drawOdds = drawOutcome?.price || 3.0
    const awayOdds = awayOutcome?.price || 2.5
    
    const homeProbability = (1 / homeOdds) * 100
    const drawProbability = (1 / drawOdds) * 100
    const awayProbability = (1 / awayOdds) * 100
    
    // 정규화
    const total = homeProbability + drawProbability + awayProbability
    
    const oddsData: OddsData = {
      matchId: match.id,
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      homeOdds: Number(homeOdds.toFixed(2)),
      drawOdds: Number(drawOdds.toFixed(2)),
      awayOdds: Number(awayOdds.toFixed(2)),
      homeProbability: Number(((homeProbability / total) * 100).toFixed(2)),
      drawProbability: Number(((drawProbability / total) * 100).toFixed(2)),
      awayProbability: Number(((awayProbability / total) * 100).toFixed(2)),
      timestamp: new Date().toISOString(),
      commenceTime: match.commence_time
    }
    
    await saveOddsToDatabase(oddsData, league.code)
    totalSaved++
    
  } catch (matchError) {
    console.error('Error saving match:', matchError)
    errors++
  }
}
        
        // API 제한 방지 (리그 간 1초 대기)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (leagueError) {
        console.error(`Error processing league ${league.code}:`, leagueError)
        errors++
      }
    }
    
    console.log('✅ Cron Job Completed!')
    console.log(`📊 Saved: ${totalSaved}, Errors: ${errors}`)
    
    return Response.json({
      success: true,
      saved: totalSaved,
      errors: errors,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Cron Job Error:', error)
    return Response.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}


export async function POST(request: Request) {
  return GET(request)
}