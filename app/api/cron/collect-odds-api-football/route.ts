import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// API-Football 설정
const API_KEY = process.env.API_FOOTBALL_KEY || '87fdad3a68c6386ce1921080461e91e6'
const BASE_URL = 'https://v3.football.api-sports.io'

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 리그 설정
const LEAGUES = [
  { code: 'PL', id: 39, name: 'Premier League' },
  { code: 'PD', id: 140, name: 'La Liga' },
  { code: 'BL1', id: 78, name: 'Bundesliga' },
  { code: 'SA', id: 135, name: 'Serie A' },
  { code: 'FL1', id: 61, name: 'Ligue 1' },
  { code: 'CL', id: 2, name: 'Champions League' },
]

const LEAGUE_ID_TO_CODE: Record<number, string> = {
  39: 'PL',
  140: 'PD',
  78: 'BL1',
  135: 'SA',
  61: 'FL1',
  2: 'CL',
}

// 오즈를 확률로 변환
function oddsToPercentage(odds: number): number {
  if (!odds || odds <= 0) return 0
  return (1 / odds) * 100
}

// 확률 정규화
function normalizePercentages(home: number, draw: number, away: number) {
  const total = home + draw + away
  if (total === 0) return { home: 33.3, draw: 33.3, away: 33.3 }
  
  return {
    home: (home / total) * 100,
    draw: (draw / total) * 100,
    away: (away / total) * 100,
  }
}

// API-Football 요청
async function fetchFromApiFootball(endpoint: string) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'x-apisports-key': API_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  return await response.json()
}

export async function POST(request: Request) {
  try {
    // Authorization 체크
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'random_secret_string'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🏈 ========== API-Football Odds Collection Started ==========')
    console.log('⏰ Time:', new Date().toISOString())

    const results = {
      success: true,
      leagues: [] as any[],
      totalMatches: 0,
      totalSaved: 0,
      errors: [] as string[],
    }

    // 날짜 범위 (오늘부터 3일 후까지)
    const today = new Date()
    const threeDaysLater = new Date()
    threeDaysLater.setDate(today.getDate() + 3)
    
    const from = today.toISOString().split('T')[0]
    const to = threeDaysLater.toISOString().split('T')[0]

    console.log('📅 Date range:', from, '~', to)

    // 각 리그별로 처리
    for (const league of LEAGUES) {
      try {
        console.log(`\n🔍 Processing ${league.name} (${league.code})...`)

        // 1. 경기 목록 가져오기
        const fixturesData = await fetchFromApiFootball(
          `/fixtures?league=${league.id}&season=2025&from=${from}&to=${to}`
        )

        const fixtures = fixturesData.response || []
        console.log(`📊 Found ${fixtures.length} fixtures`)

        if (fixtures.length === 0) {
          results.leagues.push({
            league: league.code,
            matches: 0,
            saved: 0,
            status: 'no_matches',
          })
          continue
        }

        let savedCount = 0
        const now = Date.now()

        // 각 경기마다 오즈 가져오기
        for (const fixture of fixtures) {
          try {
            // 시간 필터링 (경기 72시간 전 ~ 종료 후 1시간)
            const commenceTime = new Date(fixture.fixture.date).getTime()
            const hoursUntilMatch = (commenceTime - now) / (1000 * 60 * 60)

            if (hoursUntilMatch < -1 || hoursUntilMatch > 72) {
              console.log(`⏭️ Skip: ${fixture.teams.home.name} vs ${fixture.teams.away.name} (${hoursUntilMatch.toFixed(1)}h)`)
              continue
            }

            // 2. 오즈 가져오기
            const oddsData = await fetchFromApiFootball(
              `/odds?fixture=${fixture.fixture.id}&bet=1` // bet=1: Match Winner
            )

            const oddsResponse = oddsData.response?.[0]
            
            if (!oddsResponse || !oddsResponse.bookmakers || oddsResponse.bookmakers.length === 0) {
              console.log(`⚠️ No odds: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`)
              continue
            }

            // 첫 번째 북메이커의 오즈 사용
            const bookmaker = oddsResponse.bookmakers[0]
            const matchWinnerBet = bookmaker.bets.find(
              (bet: any) => bet.name === 'Match Winner' || bet.id === 1
            )

            if (!matchWinnerBet) {
              continue
            }

            const homeOdds = parseFloat(
              matchWinnerBet.values.find((v: any) => v.value === 'Home')?.odd || '0'
            )
            const drawOdds = parseFloat(
              matchWinnerBet.values.find((v: any) => v.value === 'Draw')?.odd || '0'
            )
            const awayOdds = parseFloat(
              matchWinnerBet.values.find((v: any) => v.value === 'Away')?.odd || '0'
            )

            if (!homeOdds || !drawOdds || !awayOdds) {
              continue
            }

            // 확률 계산
            const homePercent = oddsToPercentage(homeOdds)
            const drawPercent = oddsToPercentage(drawOdds)
            const awayPercent = oddsToPercentage(awayOdds)

            const normalized = normalizePercentages(homePercent, drawPercent, awayPercent)

            // 3. DB 저장 (history)
            const historyData = {
              match_id: fixture.fixture.id.toString(),
              home_team: fixture.teams.home.name,
              away_team: fixture.teams.away.name,
              league_code: league.code,
              commence_time: fixture.fixture.date,
              home_odds: homeOdds,
              draw_odds: drawOdds,
              away_odds: awayOdds,
              home_probability: normalized.home,
              draw_probability: normalized.draw,
              away_probability: normalized.away,
              odds_source: bookmaker.name,
            }

            const { error: historyError } = await supabase
              .from('match_odds_history')
              .insert(historyData)

            if (historyError) {
              console.error('❌ History save error:', historyError.message)
              results.errors.push(`${fixture.teams.home.name} vs ${fixture.teams.away.name}: ${historyError.message}`)
              continue
            }

            // 4. DB 저장 (latest) - UPSERT
            const { error: latestError } = await supabase
              .rpc('upsert_match_odds_latest', {
                p_match_id: fixture.fixture.id.toString(),
                p_home_team: fixture.teams.home.name,
                p_away_team: fixture.teams.away.name,
                p_league_code: league.code,
                p_commence_time: fixture.fixture.date,
                p_home_odds: homeOdds,
                p_draw_odds: drawOdds,
                p_away_odds: awayOdds,
                p_home_probability: normalized.home,
                p_draw_probability: normalized.draw,
                p_away_probability: normalized.away,
                p_odds_source: bookmaker.name,
              })

            if (latestError) {
              console.error('❌ Latest save error:', latestError.message)
            } else {
              savedCount++
              console.log(`✅ Saved: ${fixture.teams.home.name} vs ${fixture.teams.away.name} (${normalized.home.toFixed(1)}% / ${normalized.draw.toFixed(1)}% / ${normalized.away.toFixed(1)}%)`)
            }

            // API 제한 방지 (경기 간 0.5초 대기)
            await new Promise(resolve => setTimeout(resolve, 500))

          } catch (matchError: any) {
            console.error(`❌ Match error:`, matchError.message)
            results.errors.push(`${fixture.teams.home.name} vs ${fixture.teams.away.name}: ${matchError.message}`)
          }
        }

        results.leagues.push({
          league: league.code,
          matches: fixtures.length,
          saved: savedCount,
          status: 'success',
        })

        results.totalMatches += fixtures.length
        results.totalSaved += savedCount

        // 리그 간 1초 대기
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (leagueError: any) {
        console.error(`❌ League error (${league.code}):`, leagueError.message)
        results.errors.push(`${league.code}: ${leagueError.message}`)
        results.leagues.push({
          league: league.code,
          matches: 0,
          saved: 0,
          status: 'error',
          error: leagueError.message,
        })
      }
    }

    console.log('\n🎉 ========== Collection Completed ==========')
    console.log('📊 Summary:')
    console.log(`  - Total matches found: ${results.totalMatches}`)
    console.log(`  - Total saved: ${results.totalSaved}`)
    console.log(`  - Errors: ${results.errors.length}`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalMatches: results.totalMatches,
        totalSaved: results.totalSaved,
        errorCount: results.errors.length,
      },
      leagues: results.leagues,
      errors: results.errors,
    })

  } catch (error: any) {
    console.error('❌ Fatal error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
