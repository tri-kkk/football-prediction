import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// API-Football 설정
const API_KEY = process.env.API_FOOTBALL_KEY || '87fdad3a68c6386ce1921080461e91e6'
const BASE_URL = 'https://v3.football.api-sports.io'

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ============================================================
// 🔥 리그 설정 (50개 - 아프리카 추가!)
// ============================================================
const LEAGUES = [
  // ===== 🏆 국제 대회 (5개) =====
  { code: 'CL', id: 2, name: 'Champions League' },
  { code: 'EL', id: 3, name: 'Europa League' },
  { code: 'UECL', id: 848, name: 'UEFA Conference League' },
  { code: 'UNL', id: 5, name: 'UEFA Nations League' },
  { code: 'AFCON', id: 6, name: 'Africa Cup of Nations', season: 2025 },
  { code: 'ACL', id: 17, name: 'AFC Champions League Elite' },
  { code: 'ACL2', id: 18, name: 'AFC Champions League Two' },
  { code: 'AMATCH', id: 10, name: 'Friendlies' },
  
  // ===== 🌍 아프리카 리그 (5개) - NEW! =====
  { code: 'EGY', id: 233, name: 'Egyptian Premier League' },
  { code: 'RSA', id: 288, name: 'South African Premier League' },
  { code: 'MAR', id: 200, name: 'Botola Pro' },
  { code: 'DZA', id: 187, name: 'Ligue 1 Algeria' },
  { code: 'TUN', id: 202, name: 'Ligue 1 Tunisia' },
  
  // ===== 🏴󠁧󠁢󠁥󠁮󠁧󠁿 잉글랜드 (4개) =====
  { code: 'PL', id: 39, name: 'Premier League' },
  { code: 'ELC', id: 40, name: 'Championship' },
  { code: 'FAC', id: 45, name: 'FA Cup' },
  { code: 'EFL', id: 48, name: 'EFL Cup' },
  
  // ===== 🇪🇸 스페인 (3개) =====
  { code: 'PD', id: 140, name: 'La Liga' },
  { code: 'SD', id: 141, name: 'La Liga 2' },
  { code: 'CDR', id: 143, name: 'Copa del Rey' },
  
  // ===== 🇩🇪 독일 (3개) =====
  { code: 'BL1', id: 78, name: 'Bundesliga' },
  { code: 'BL2', id: 79, name: 'Bundesliga 2' },
  { code: 'DFB', id: 81, name: 'DFB Pokal' },
  
  // ===== 🇮🇹 이탈리아 (3개) =====
  { code: 'SA', id: 135, name: 'Serie A' },
  { code: 'SB', id: 136, name: 'Serie B' },
  { code: 'CIT', id: 137, name: 'Coppa Italia' },
  
  // ===== 🇫🇷 프랑스 (3개) =====
  { code: 'FL1', id: 61, name: 'Ligue 1' },
  { code: 'FL2', id: 62, name: 'Ligue 2' },
  { code: 'CDF', id: 66, name: 'Coupe de France' },
  
  // ===== 🇵🇹 포르투갈 (2개) =====
  { code: 'PPL', id: 94, name: 'Primeira Liga' },
  { code: 'TDP', id: 96, name: 'Taca de Portugal' },
  
  // ===== 🇳🇱 네덜란드 (2개) =====
  { code: 'DED', id: 88, name: 'Eredivisie' },
  { code: 'KNV', id: 90, name: 'KNVB Beker' },
  
  // ===== 🇰🇷 한국 (2개) - 핵심! =====
  { code: 'KL1', id: 292, name: 'K League 1' },
  { code: 'KL2', id: 293, name: 'K League 2' },
  
  // ===== 🇯🇵 일본 (2개) =====
  { code: 'J1', id: 98, name: 'J1 League' },
  { code: 'J2', id: 99, name: 'J2 League' },
  
  // ===== 🇸🇦 사우디아라비아 (1개) =====
  { code: 'SAL', id: 307, name: 'Saudi Pro League' },
  
  // ===== 🇦🇺 호주 (1개) =====
  { code: 'ALG', id: 188, name: 'A-League' },
  
  // ===== 🇨🇳 중국 (1개) =====
  { code: 'CSL', id: 169, name: 'Chinese Super League' },
  
  // ===== 🇹🇷 터키 (1개) =====
  { code: 'TSL', id: 203, name: 'Süper Lig' },
  
  // ===== 🇧🇪 벨기에 (1개) =====
  { code: 'JPL', id: 144, name: 'Jupiler Pro League' },
  
  // ===== 🏴󠁧󠁢󠁳󠁣󠁴󠁿 스코틀랜드 (1개) =====
  { code: 'SPL', id: 179, name: 'Scottish Premiership' },
  
  // ===== 🇨🇭 스위스 (1개) =====
  { code: 'SSL', id: 207, name: 'Swiss Super League' },
  
  // ===== 🇦🇹 오스트리아 (1개) =====
  { code: 'ABL', id: 218, name: 'Austrian Bundesliga' },
  
  // ===== 🇬🇷 그리스 (1개) =====
  { code: 'GSL', id: 197, name: 'Super League Greece' },
  
  // ===== 🇩🇰 덴마크 (1개) =====
  { code: 'DSL', id: 119, name: 'Danish Superliga' },
  
  // ===== 🇧🇷 브라질 (1개) =====
  { code: 'BSA', id: 71, name: 'Brasileirão Série A' },
  
  // ===== 🇦🇷 아르헨티나 (1개) =====
  { code: 'ARG', id: 128, name: 'Liga Profesional Argentina' },
  
  // ===== 🌎 남미 국제대회 (2개) =====
  { code: 'COP', id: 13, name: 'Copa Libertadores' },
  { code: 'COS', id: 11, name: 'Copa Sudamericana' },
  
  // ===== 🇺🇸 미국/멕시코 (2개) =====
  { code: 'MLS', id: 253, name: 'MLS' },
  { code: 'LMX', id: 262, name: 'Liga MX' },
]

// 리그 ID → 코드 매핑
const LEAGUE_ID_TO_CODE: Record<number, string> = {}
LEAGUES.forEach(league => {
  LEAGUE_ID_TO_CODE[league.id] = league.code
})

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

// 🔥 스코어 계산 함수
function calculateRealisticScore(
  avgHome: number, 
  avgAway: number, 
  homeWinPercent: number, 
  drawPercent: number, 
  awayWinPercent: number
): { home: number; away: number } {
  
  if (avgHome < 0 || avgAway < 0 || isNaN(avgHome) || isNaN(avgAway)) {
    const maxPercent = Math.max(homeWinPercent, drawPercent, awayWinPercent)
    
    if (maxPercent === homeWinPercent) {
      if (homeWinPercent > 50) return { home: 2, away: 0 }
      if (homeWinPercent > 40) return { home: 2, away: 1 }
      return { home: 1, away: 0 }
    } else if (maxPercent === awayWinPercent) {
      if (awayWinPercent > 50) return { home: 0, away: 2 }
      if (awayWinPercent > 40) return { home: 1, away: 2 }
      return { home: 0, away: 1 }
    } else {
      return { home: 1, away: 1 }
    }
  }
  
  let homeGoals = Math.floor(avgHome)
  let awayGoals = Math.floor(avgAway)
  
  const homeDecimal = avgHome - homeGoals
  const awayDecimal = avgAway - awayGoals
  
  const maxPercent = Math.max(homeWinPercent, drawPercent, awayWinPercent)
  
  if (maxPercent === homeWinPercent) {
    if (homeDecimal > 0.6) homeGoals += 1
    if (homeWinPercent > 60 && homeGoals <= awayGoals) {
      homeGoals = awayGoals + 1
    }
  } else if (maxPercent === awayWinPercent) {
    if (awayDecimal > 0.6) awayGoals += 1
    if (awayWinPercent > 60 && awayGoals <= homeGoals) {
      awayGoals = homeGoals + 1
    }
  } else {
    if (drawPercent > 35) {
      const avg = (homeGoals + awayGoals) / 2
      homeGoals = Math.round(avg)
      awayGoals = Math.round(avg)
    }
  }
  
  const totalGoals = homeGoals + awayGoals
  
  if (totalGoals > 5) {
    const scale = 4 / totalGoals
    homeGoals = Math.round(homeGoals * scale)
    awayGoals = Math.round(awayGoals * scale)
  }
  
  if (totalGoals === 0) {
    if (homeWinPercent > awayWinPercent) {
      homeGoals = 1
    } else if (awayWinPercent > homeWinPercent) {
      awayGoals = 1
    } else {
      homeGoals = 1
      awayGoals = 1
    }
  }
  
  const finalHome = homeGoals
  const finalAway = awayGoals
  
  if (homeWinPercent > awayWinPercent + 15 && finalHome <= finalAway) {
    return { home: finalAway + 1, away: finalAway }
  }
  if (awayWinPercent > homeWinPercent + 15 && finalAway <= finalHome) {
    return { home: finalHome, away: finalHome + 1 }
  }
  
  return { home: finalHome, away: finalAway }
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
    console.log('🔥 ========== EXPANDED Odds Collection Started ==========')
    console.log('⏰ Time:', new Date().toISOString())
    console.log(`📊 Total Leagues: ${LEAGUES.length}`)

    const results = {
      success: true,
      leagues: [] as any[],
      totalMatches: 0,
      totalSaved: 0,
      errors: [] as string[],
    }

    // 날짜 범위 (오늘부터 21일 후까지 - 확장!)
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + 21)  // 14일 → 21일
    
    const from = today.toISOString().split('T')[0]
    const to = futureDate.toISOString().split('T')[0]

    console.log('📅 Date range:', from, '~', to, '(21 days)')

    // 각 리그별로 처리
    for (const league of LEAGUES) {
      try {
        console.log(`\n🔍 Processing ${league.name} (${league.code})...`)

        // 시즌 결정
        const currentYear = new Date().getFullYear()
        const currentMonth = new Date().getMonth() + 1
        
        // 리그별 시즌 로직
        let season: number
        if ((league as any).season) {
          season = (league as any).season
        } else if (['KL1', 'KL2', 'J1', 'J2', 'MLS', 'BSA', 'ARG', 'CSL'].includes(league.code)) {
          // 아시아/남미/북미 리그는 단일 연도 시즌
          season = currentYear
        } else if (['AMATCH', 'UNL'].includes(league.code)) {
          // 국제 A매치/네이션스리그는 연도 기준
          season = currentYear
        } else {
          // 유럽 리그는 8월 이후면 현재 연도
          season = currentMonth >= 8 ? currentYear : currentYear - 1
        }

        // 1. 경기 목록 가져오기
        const fixturesData = await fetchFromApiFootball(
          `/fixtures?league=${league.id}&season=${season}&from=${from}&to=${to}`
        )

        const fixtures = fixturesData.response || []
        console.log(`📊 Found ${fixtures.length} fixtures (season: ${season})`)

        if (fixtures.length === 0) {
          results.leagues.push({
            league: league.code,
            name: league.name,
            matches: 0,
            saved: 0,
            status: 'no_matches',
          })
          continue
        }

        let savedCount = 0

        for (const fixture of fixtures) {
          try {
            // 🆕 경기 상태 추출
            const matchStatus = fixture.fixture.status?.short || 'NS'
            
            // 이미 종료된 경기는 건너뜀
            if (['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(matchStatus)) {
              continue
            }

            // 2. 해당 경기의 오즈 가져오기
            const oddsData = await fetchFromApiFootball(
              `/odds?fixture=${fixture.fixture.id}`
            )

            const oddsResponse = oddsData.response?.[0]
            if (!oddsResponse || !oddsResponse.bookmakers || oddsResponse.bookmakers.length === 0) {
              console.log(`⚠️ No odds: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`)
              continue
            }

            // 북메이커에서 오즈 추출 (최대 10개)
            const bookmakers = oddsResponse.bookmakers.slice(0, 10)
            let validOddsCount = 0
            let totalHomeOdds = 0
            let totalDrawOdds = 0
            let totalAwayOdds = 0
            const bookmakerNames: string[] = []

            for (const bookmaker of bookmakers) {
              const matchWinnerBet = bookmaker.bets.find(
                (bet: any) => bet.name === 'Match Winner' || bet.id === 1
              )

              if (!matchWinnerBet) continue

              const homeOdds = parseFloat(
                matchWinnerBet.values.find((v: any) => v.value === 'Home')?.odd || '0'
              )
              const drawOdds = parseFloat(
                matchWinnerBet.values.find((v: any) => v.value === 'Draw')?.odd || '0'
              )
              const awayOdds = parseFloat(
                matchWinnerBet.values.find((v: any) => v.value === 'Away')?.odd || '0'
              )

              if (homeOdds > 0 && drawOdds > 0 && awayOdds > 0) {
                totalHomeOdds += homeOdds
                totalDrawOdds += drawOdds
                totalAwayOdds += awayOdds
                validOddsCount++
                bookmakerNames.push(bookmaker.name)
              }
            }

            // 🔥 북메이커 기준 완화: 3개 → 1개
            if (validOddsCount < 1) {
              continue
            }

            // 평균 계산
            const homeOdds = totalHomeOdds / validOddsCount
            const drawOdds = totalDrawOdds / validOddsCount
            const awayOdds = totalAwayOdds / validOddsCount

            // 확률 계산
            const homePercent = oddsToPercentage(homeOdds)
            const drawPercent = oddsToPercentage(drawOdds)
            const awayPercent = oddsToPercentage(awayOdds)

            const normalized = normalizePercentages(homePercent, drawPercent, awayPercent)

            // 득점 예상 계산
            let avgHomeGoals = 1.0
            let avgAwayGoals = 1.0
            
            if (normalized.home > 60) avgHomeGoals = 2.0
            else if (normalized.home > 50) avgHomeGoals = 1.7
            else if (normalized.home > 40) avgHomeGoals = 1.4
            else if (normalized.home > 30) avgHomeGoals = 1.1
            else avgHomeGoals = 0.8
            
            if (normalized.away > 60) avgAwayGoals = 2.0
            else if (normalized.away > 50) avgAwayGoals = 1.7
            else if (normalized.away > 40) avgAwayGoals = 1.4
            else if (normalized.away > 30) avgAwayGoals = 1.1
            else avgAwayGoals = 0.8
            
            if (normalized.draw > 35) {
              const avg = (avgHomeGoals + avgAwayGoals) / 2
              avgHomeGoals = avg
              avgAwayGoals = avg
            }
            
            const predictedScore = calculateRealisticScore(
              avgHomeGoals,
              avgAwayGoals,
              normalized.home,
              normalized.draw,
              normalized.away
            )

            // 승자 결정
            let predictedWinner = 'draw'
            if (predictedScore.home > predictedScore.away) predictedWinner = 'home'
            else if (predictedScore.away > predictedScore.home) predictedWinner = 'away'

            const homeTeamId = fixture.teams?.home?.id || null
            const awayTeamId = fixture.teams?.away?.id || null

            // 3. DB 저장 (history) - 🆕 status 필드 추가!
            const historyData = {
              match_id: fixture.fixture.id.toString(),
              home_team: fixture.teams.home.name,
              away_team: fixture.teams.away.name,
              home_team_id: homeTeamId,
              away_team_id: awayTeamId,
              home_team_logo: fixture.teams.home.logo,
              away_team_logo: fixture.teams.away.logo,
              league_code: league.code,
              commence_time: fixture.fixture.date,
              home_odds: homeOdds,
              draw_odds: drawOdds,
              away_odds: awayOdds,
              home_probability: normalized.home,
              draw_probability: normalized.draw,
              away_probability: normalized.away,
              predicted_score_home: predictedScore.home,
              predicted_score_away: predictedScore.away,
              predicted_winner: predictedWinner,
              odds_source: `Averaged from ${validOddsCount} bookmakers`,
              status: matchStatus,  // 🆕 경기 상태 추가!
            }

            const { error: historyError } = await supabase
              .from('match_odds_history')
              .insert(historyData)

            if (historyError) {
              console.error('❌ History save error:', historyError.message)
              results.errors.push(`${fixture.teams.home.name} vs ${fixture.teams.away.name}: ${historyError.message}`)
              continue
            }

            // 4. DB 저장 (latest) - UPSERT - 🆕 status 필드 추가!
            const { error: latestError } = await supabase
              .from('match_odds_latest')
              .upsert({
                match_id: fixture.fixture.id.toString(),
                home_team: fixture.teams.home.name,
                away_team: fixture.teams.away.name,
                home_team_id: homeTeamId,
                away_team_id: awayTeamId,
                home_team_logo: fixture.teams.home.logo,
                away_team_logo: fixture.teams.away.logo,
                league_code: league.code,
                commence_time: fixture.fixture.date,
                home_odds: homeOdds,
                draw_odds: drawOdds,
                away_odds: awayOdds,
                home_probability: normalized.home,
                draw_probability: normalized.draw,
                away_probability: normalized.away,
                predicted_score_home: predictedScore.home,
                predicted_score_away: predictedScore.away,
                predicted_winner: predictedWinner,
                odds_source: `Averaged from ${validOddsCount} bookmakers`,
                status: matchStatus,  // 🆕 경기 상태 추가!
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'match_id'
              })

            if (latestError) {
              console.error('❌ Latest save error:', latestError.message)
            } else {
              savedCount++
              console.log(`✅ ${fixture.teams.home.name} vs ${fixture.teams.away.name} (${matchStatus})`)
            }

            // API 제한 방지 (경기 간 0.3초 대기 - 더 빠르게)
            await new Promise(resolve => setTimeout(resolve, 300))

          } catch (matchError: any) {
            console.error(`❌ Match error:`, matchError.message)
            results.errors.push(`${fixture.teams.home.name} vs ${fixture.teams.away.name}: ${matchError.message}`)
          }
        }

        results.leagues.push({
          league: league.code,
          name: league.name,
          matches: fixtures.length,
          saved: savedCount,
          status: savedCount > 0 ? 'success' : 'no_odds',
        })

        results.totalMatches += fixtures.length
        results.totalSaved += savedCount

        // 리그 간 0.5초 대기 (더 빠르게)
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (leagueError: any) {
        console.error(`❌ League error (${league.code}):`, leagueError.message)
        results.errors.push(`${league.code}: ${leagueError.message}`)
        results.leagues.push({
          league: league.code,
          name: league.name,
          matches: 0,
          saved: 0,
          status: 'error',
          error: leagueError.message,
        })
      }
    }

    console.log('\n🎉 ========== Collection Completed ==========')
    console.log('📊 Summary:')
    console.log(`  - Leagues processed: ${LEAGUES.length}`)
    console.log(`  - Total matches found: ${results.totalMatches}`)
    console.log(`  - Total saved: ${results.totalSaved}`)
    console.log(`  - Errors: ${results.errors.length}`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        leaguesProcessed: LEAGUES.length,
        totalMatches: results.totalMatches,
        totalSaved: results.totalSaved,
        errorCount: results.errors.length,
      },
      leagues: results.leagues,
      errors: results.errors.slice(0, 20), // 최대 20개만
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

// GET 요청도 지원 (테스트용)
export async function GET(request: Request) {
  return NextResponse.json({
    status: 'ready',
    leagues: LEAGUES.length,
    leagueList: LEAGUES.map(l => `${l.code}: ${l.name}`),
    message: 'Use POST to trigger collection',
  })
}