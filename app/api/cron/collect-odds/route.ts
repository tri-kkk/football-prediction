// app/api/cron/collect-odds/route.ts
// Vercel Cron Job: 2시간마다 실행

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

// 🔥 실제 Champions League 진출 팀 목록 (2024-25 시즌)
const CHAMPIONS_LEAGUE_TEAMS = new Set([
  // 영국
  'Manchester City', 'Liverpool', 'Arsenal', 'Aston Villa',
  // 스페인  
  'Real Madrid', 'Barcelona', 'Atlético Madrid', 'Girona',
  // 독일
  'Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen', 'VfB Stuttgart',
  // 이탈리아
  'Inter Milan', 'AC Milan', 'Juventus', 'Bologna', 'Atalanta',
  // 프랑스
  'Paris Saint Germain', 'AS Monaco', 'Lille', 'Brest',
  // 네덜란드
  'PSV Eindhoven', 'Feyenoord',
  // 포르투갈
  'Sporting Lisbon', 'Benfica', 'Sporting CP', 'FC Porto',
  // 벨기에
  'Club Brugge',
  // 스코틀랜드
  'Celtic',
  // 오스트리아
  'Red Bull Salzburg', 'Sturm Graz',
  // 스위스
  'Young Boys',
  // 체코
  'Sparta Praha', 'Slavia Prague',
  // 크로아티아
  'Dinamo Zagreb',
  // 세르비아
  'Red Star Belgrade', 'Crvena Zvezda',
  // 덴마크
  'FC Copenhagen',
  // 노르웨이
  'Bodø/Glimt', 'Bodo/Glimt',
  // 그리스
  'Olympiakos', 'Olympiacos', 'Olympiakos Piraeus',
  // 슬로바키아
  'Slovan Bratislava',
  // 우크라이나
  'Shakhtar Donetsk',
  // 터키 (Champions League만)
  'Galatasaray', // 없음 - 2024-25는 Champions League 불참
]);

// 🔥 실제 Europa League 진출 팀 목록 (2024-25 시즌)
const EUROPA_LEAGUE_TEAMS = new Set([
  // 영국
  'Manchester United', 'Tottenham', 'Rangers',
  // 스페인
  'Athletic Bilbao', 'Real Sociedad',
  // 독일
  'Eintracht Frankfurt', 'TSG Hoffenheim',
  // 이탈리아
  'Roma', 'Lazio',
  // 프랑스
  'Lyon', 'Nice', 'Olympique Lyonnais', 'OGC Nice',
  // 네덜란드
  'Ajax', 'AZ Alkmaar', 'Twente',
  // 포르투갈
  'Braga', 'Vitória Guimarães', 'Vitoria Guimaraes',
  // 벨기에
  'Anderlecht', 'Union SG', 'Union Saint-Gilloise',
  // 스코틀랜드
  'Rangers',
  // 터키
  'Galatasaray', 'Fenerbahce', 'Besiktas',
  // 그리스
  'PAOK', 'Panathinaikos',
  // 체코
  'Viktoria Plzen',
  // 스웨덴
  'Malmö', 'Malmo FF',
  // 스페인
  'Athletic Club', 'Real Sociedad',
  // 이스라엘
  'Maccabi Tel Aviv',
  // 노르웨이
  'Molde'
]);

// 🔥 영국 Championship 팀 목록
const CHAMPIONSHIP_TEAMS = new Set([
  'Sheffield United', 'Burnley', 'Luton Town',
  'Leeds United', 'Middlesbrough', 'West Bromwich Albion', 'West Brom',
  'Norwich City', 'Coventry City', 'Bristol City',
  'Hull City', 'Preston North End', 'Cardiff City',
  'Millwall', 'Blackburn Rovers', 'Queens Park Rangers', 'QPR',
  'Stoke City', 'Swansea City', 'Watford',
  'Plymouth Argyle', 'Sheffield Wednesday', 'Oxford United',
  'Portsmouth', 'Derby County'
]);

// 팀명 정규화 (다양한 표기법 통일)
function normalizeTeamName(teamName: string): string {
  const normalizations: { [key: string]: string } = {
    'PSG': 'Paris Saint Germain',
    'Paris SG': 'Paris Saint Germain',
    'Inter': 'Inter Milan',
    'Internazionale': 'Inter Milan',
    'AC Milan': 'AC Milan',
    'Milan': 'AC Milan',
    'Man City': 'Manchester City',
    'Bayern': 'Bayern Munich',
    'Bayern München': 'Bayern Munich',
    'BVB': 'Borussia Dortmund',
    'Dortmund': 'Borussia Dortmund',
    'Atleti': 'Atlético Madrid',
    'Atletico Madrid': 'Atlético Madrid',
    'Sporting': 'Sporting Lisbon',
    'Sporting Portugal': 'Sporting Lisbon',
    'FCB': 'Barcelona',
    'Barça': 'Barcelona',
    'RB Leipzig': 'RB Leipzig',
    'Leverkusen': 'Bayer Leverkusen',
  }
  
  return normalizations[teamName] || teamName
}

// Champions League 경기인지 확인
function isChampionsLeagueMatch(homeTeam: string, awayTeam: string): boolean {
  const normalizedHome = normalizeTeamName(homeTeam)
  const normalizedAway = normalizeTeamName(awayTeam)
  
  const homeInCL = CHAMPIONS_LEAGUE_TEAMS.has(normalizedHome)
  const awayInCL = CHAMPIONS_LEAGUE_TEAMS.has(normalizedAway)
  
  // 양쪽 팀 모두 Champions League 팀이어야 함
  return homeInCL && awayInCL
}

// Europa League 경기인지 확인
function isEuropaLeagueMatch(homeTeam: string, awayTeam: string): boolean {
  const normalizedHome = normalizeTeamName(homeTeam)
  const normalizedAway = normalizeTeamName(awayTeam)
  
  const homeInEL = EUROPA_LEAGUE_TEAMS.has(normalizedHome)
  const awayInEL = EUROPA_LEAGUE_TEAMS.has(normalizedAway)
  
  return homeInEL && awayInEL
}

// Championship 경기인지 확인
function isChampionshipMatch(homeTeam: string, awayTeam: string): boolean {
  const homeInChamp = CHAMPIONSHIP_TEAMS.has(homeTeam)
  const awayInChamp = CHAMPIONSHIP_TEAMS.has(awayTeam)
  
  return homeInChamp && awayInChamp
}

// Supabase에 오즈 저장
async function saveOddsToDatabase(odds: OddsData, leagueCode: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY
  
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
  
  // 2. 최신 오즈 UPSERT (RPC 함수 사용)
  const latestResponse = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_match_odds_latest`,
    {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_match_id: odds.matchId,
        p_home_team: odds.homeTeam,
        p_away_team: odds.awayTeam,
        p_league_code: leagueCode,
        p_commence_time: odds.commenceTime,
        p_home_odds: odds.homeOdds,
        p_draw_odds: odds.drawOdds,
        p_away_odds: odds.awayOdds,
        p_home_probability: odds.homeProbability,
        p_draw_probability: odds.drawProbability,
        p_away_probability: odds.awayProbability,
        p_odds_source: 'the-odds-api'
      })
    }
  )
  
  if (!latestResponse.ok) {
    const errorText = await latestResponse.text()
    throw new Error(`Failed to save latest: ${latestResponse.status} - ${errorText}`)
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
    
    // 주요 리그 목록 (11개)
    const leagues = [
      { code: 'PL', sport: 'soccer_epl' },                      // 프리미어리그
      { code: 'PD', sport: 'soccer_spain_la_liga' },            // 라리가
      { code: 'BL1', sport: 'soccer_germany_bundesliga' },      // 분데스리가
      { code: 'SA', sport: 'soccer_italy_serie_a' },            // 세리에A
      { code: 'FL1', sport: 'soccer_france_ligue_one' },        // 리그1
      { code: 'CL', sport: 'soccer_uefa_champs_league' },       // 챔피언스리그
      { code: 'PPL', sport: 'soccer_portugal_primeira_liga' },  // 프리메이라리가
      { code: 'DED', sport: 'soccer_netherlands_eredivisie' },  // 에레디비시
      { code: 'EL', sport: 'soccer_uefa_europa_league' },       // 유로파리그
      { code: 'ELC', sport: 'soccer_england_league_championship' } // 챔피언십
    ]
    
    let totalSaved = 0
    let totalSkipped = 0
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
            // 🔥 특정 리그는 팀 필터링 적용
            if (league.code === 'CL') {
              const isCLMatch = isChampionsLeagueMatch(match.home_team, match.away_team)
              if (!isCLMatch) {
                console.log(`⏭️ Skipping non-CL match: ${match.home_team} vs ${match.away_team}`)
                totalSkipped++
                continue
              }
            } else if (league.code === 'EL') {
              const isELMatch = isEuropaLeagueMatch(match.home_team, match.away_team)
              if (!isELMatch) {
                console.log(`⏭️ Skipping non-EL match: ${match.home_team} vs ${match.away_team}`)
                totalSkipped++
                continue
              }
            } else if (league.code === 'ELC') {
              const isChampMatch = isChampionshipMatch(match.home_team, match.away_team)
              if (!isChampMatch) {
                console.log(`⏭️ Skipping non-Championship match: ${match.home_team} vs ${match.away_team}`)
                totalSkipped++
                continue
              }
            }
            // PPL, DED는 필터링 없음 (모든 경기 수집)
            
            // 경기 3일 전부터 경기 종료 후 1시간까지 수집
            const commenceTime = new Date(match.commence_time).getTime()
            const now = Date.now()
            const hoursUntilMatch = (commenceTime - now) / (1000 * 60 * 60)
            
            // 경기 종료 후 1시간 지났거나 3일(72시간) 이상 남았으면 스킵
            if (hoursUntilMatch < -1 || hoursUntilMatch > 72) {
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
            console.log(`✅ Saved: ${match.home_team} vs ${match.away_team}`)
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
    console.log(`📊 Saved: ${totalSaved}, Skipped: ${totalSkipped}, Errors: ${errors}`)
    
    return Response.json({
      success: true,
      saved: totalSaved,
      skipped: totalSkipped,
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