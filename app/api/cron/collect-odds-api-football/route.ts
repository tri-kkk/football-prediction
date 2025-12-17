import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// API-Football 설정
const API_KEY = process.env.API_FOOTBALL_KEY || '87fdad3a68c6386ce1921080461e91e6'
const BASE_URL = 'https://v3.football.api-sports.io'

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 리그 설정 (20개 - 12개 리그 + 8개 컵대회)
const LEAGUES = [
  // ===== 유럽 대항전 =====
  { code: 'CL', id: 2, name: 'Champions League' },
  { code: 'EL', id: 3, name: 'Europa League' },
  { code: 'UECL', id: 848, name: 'UEFA Conference League' },
  { code: 'UNL', id: 5, name: 'UEFA Nations League' },
  
  // ===== 잉글랜드 =====
  { code: 'PL', id: 39, name: 'Premier League' },
  { code: 'ELC', id: 40, name: 'Championship' },
  { code: 'FAC', id: 45, name: 'FA Cup' },           // 🆕 컵대회
  { code: 'EFL', id: 48, name: 'EFL Cup' },          // 🆕 컵대회
  
  // ===== 스페인 =====
  { code: 'PD', id: 140, name: 'La Liga' },
  { code: 'CDR', id: 143, name: 'Copa del Rey' },    // 🆕 컵대회
  
  // ===== 독일 =====
  { code: 'BL1', id: 78, name: 'Bundesliga' },
  { code: 'DFB', id: 81, name: 'DFB Pokal' },        // 🆕 컵대회
  
  // ===== 이탈리아 =====
  { code: 'SA', id: 135, name: 'Serie A' },
  { code: 'CIT', id: 137, name: 'Coppa Italia' },    // 🆕 컵대회
  
  // ===== 프랑스 =====
  { code: 'FL1', id: 61, name: 'Ligue 1' },
  { code: 'CDF', id: 66, name: 'Coupe de France' },  // 🆕 컵대회
  
  // ===== 포르투갈 =====
  { code: 'PPL', id: 94, name: 'Primeira Liga' },
  { code: 'TDP', id: 96, name: 'Taca de Portugal' }, // 🆕 컵대회
  
  // ===== 네덜란드 =====
  { code: 'DED', id: 88, name: 'Eredivisie' },
  { code: 'KNV', id: 90, name: 'KNVB Beker' },       // 🆕 컵대회
]

const LEAGUE_ID_TO_CODE: Record<number, string> = {
  // 유럽 대항전
  2: 'CL',
  3: 'EL',
  848: 'UECL',
  5: 'UNL',
  // 잉글랜드
  39: 'PL',
  40: 'ELC',
  45: 'FAC',   // 🆕
  46: 'EFL',   // 🆕
  // 스페인
  140: 'PD',
  143: 'CDR',  // 🆕
  // 독일
  78: 'BL1',
  81: 'DFB',   // 🆕
  // 이탈리아
  135: 'SA',
  137: 'CIT',  // 🆕
  // 프랑스
  61: 'FL1',
  66: 'CDF',   // 🆕
  // 포르투갈
  94: 'PPL',
  96: 'TDP',   // 🆕
  // 네덜란드
  88: 'DED',
  90: 'KNV',   // 🆕
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

// 🔥 스코어 계산 함수 (메인 페이지와 동일)
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
    console.log('🈴 ========== API-Football Odds Collection Started ==========')
    console.log('⏰ Time:', new Date().toISOString())

    const results = {
      success: true,
      leagues: [] as any[],
      totalMatches: 0,
      totalSaved: 0,
      errors: [] as string[],
    }

    // 날짜 범위 (오늘부터 14일 후까지)
    const today = new Date()
    const fourteenDaysLater = new Date()
    fourteenDaysLater.setDate(today.getDate() + 14)
    
    const from = today.toISOString().split('T')[0]
    const to = fourteenDaysLater.toISOString().split('T')[0]

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
            // 시간 필터링 (경기 336시간(14일) 전 ~ 종료 후 1시간)
            const commenceTime = new Date(fixture.fixture.date).getTime()
            const hoursUntilMatch = (commenceTime - now) / (1000 * 60 * 60)

            if (hoursUntilMatch < -1 || hoursUntilMatch > 336) {
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

            // 다중 북메이커 평균 로직 (3~10개)
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

            // 최소 3개 북메이커 필요
            if (validOddsCount < 3) {
              console.log(`⚠️ Not enough bookmakers (${validOddsCount}): ${fixture.teams.home.name} vs ${fixture.teams.away.name}`)
              continue
            }

            // 평균 계산
            const homeOdds = totalHomeOdds / validOddsCount
            const drawOdds = totalDrawOdds / validOddsCount
            const awayOdds = totalAwayOdds / validOddsCount

            console.log(`📊 ${validOddsCount} bookmakers averaged: ${bookmakerNames.slice(0, 3).join(', ')}${validOddsCount > 3 ? `... (+${validOddsCount - 3})` : ''}`)

            // 확률 계산
            const homePercent = oddsToPercentage(homeOdds)
            const drawPercent = oddsToPercentage(drawOdds)
            const awayPercent = oddsToPercentage(awayOdds)

            const normalized = normalizePercentages(homePercent, drawPercent, awayPercent)

            // 🔥 MatchPrediction과 동일한 득점 계산 로직
            let avgHomeGoals = 1.0
            let avgAwayGoals = 1.0
            
            // 홈팀 득점 예상
            if (normalized.home > 60) {
              avgHomeGoals = 2.0
            } else if (normalized.home > 50) {
              avgHomeGoals = 1.7
            } else if (normalized.home > 40) {
              avgHomeGoals = 1.4
            } else if (normalized.home > 30) {
              avgHomeGoals = 1.1
            } else {
              avgHomeGoals = 0.8
            }
            
            // 원정팀 득점 예상
            if (normalized.away > 60) {
              avgAwayGoals = 2.0
            } else if (normalized.away > 50) {
              avgAwayGoals = 1.7
            } else if (normalized.away > 40) {
              avgAwayGoals = 1.4
            } else if (normalized.away > 30) {
              avgAwayGoals = 1.1
            } else {
              avgAwayGoals = 0.8
            }
            
            // 무승부 확률이 높으면 양팀 득점을 비슷하게 조정
            if (normalized.draw > 35) {
              const avg = (avgHomeGoals + avgAwayGoals) / 2
              avgHomeGoals = avg
              avgAwayGoals = avg
            }
            
            console.log(`📊 승률 기반 득점: Home ${avgHomeGoals.toFixed(1)} - Away ${avgAwayGoals.toFixed(1)} (${normalized.home.toFixed(1)}% / ${normalized.draw.toFixed(1)}% / ${normalized.away.toFixed(1)}%)`)
            
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

            console.log(`⚽ Predicted: ${predictedScore.home} - ${predictedScore.away} (${predictedWinner})`)

            const homeTeamId = fixture.teams?.home?.id || null
            const awayTeamId = fixture.teams?.away?.id || null

            // 3. DB 저장 (history)
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
              predicted_score_home: predictedScore.home, // 🔥 추가
              predicted_score_away: predictedScore.away, // 🔥 추가
              predicted_winner: predictedWinner,          // 🔥 추가
              odds_source: `Averaged from ${validOddsCount} bookmakers`,
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
                predicted_score_home: predictedScore.home, // 🔥 추가
                predicted_score_away: predictedScore.away, // 🔥 추가
                predicted_winner: predictedWinner,          // 🔥 추가
                odds_source: `Averaged from ${validOddsCount} bookmakers`,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'match_id'
              })

            if (latestError) {
              console.error('❌ Latest save error:', latestError.message)
            } else {
              savedCount++
              console.log(`✅ Saved: ${fixture.teams.home.name} vs ${fixture.teams.away.name} - ${normalized.home.toFixed(1)}% / ${normalized.draw.toFixed(1)}% / ${normalized.away.toFixed(1)}% - Score: ${predictedScore.home}-${predictedScore.away}`)
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