// app/api/baseball/cron/collect-odds/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getKoreanTeamName } from '../../../../../lib/baseball_teams'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// 리그 설정 (시범경기 포함!)
const leagues = [
  // 시범경기 (2-3월)
  { id: 71, code: 'MLB', name: 'MLB - Spring Training', season: 2026, isSpring: true },
  
  // 정규시즌 (3월 이후)
  { id: 1, code: 'MLB', name: 'MLB', season: 2026 },
  { id: 2, code: 'NPB', name: 'NPB', season: 2026 },
  { id: 5, code: 'KBO', name: 'KBO', season: 2026 },
  { id: 29, code: 'CPBL', name: 'CPBL', season: 2026 },
]

export async function GET() {
  const startTime = Date.now()
  
  try {
    const apiKey = process.env.API_FOOTBALL_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const results = {
      leagues: [] as any[],
      totalMatches: 0,
      totalOdds: 0,
      errors: [] as string[]
    }

    // 현재 월 확인 (시범경기 필터링용)
    const currentMonth = new Date().getMonth() + 1 // 1-12
    const today = new Date()
    
    console.log('🗓️ Current date:', today.toISOString())
    console.log('📅 Current month:', currentMonth)
    
    // 활성 리그 필터링
    const activeLeagues = leagues.filter(league => {
      if (league.isSpring) {
        // 시범경기는 2-3월만
        const isActive = currentMonth >= 2 && currentMonth <= 3
        console.log(`  Spring Training (${league.id}): ${isActive ? 'ACTIVE' : 'INACTIVE'}`)
        return isActive
      }
      // 정규시즌은 3-11월
      const isActive = currentMonth >= 3 && currentMonth <= 11
      console.log(`  Regular Season ${league.code} (${league.id}): ${isActive ? 'ACTIVE' : 'INACTIVE'}`)
      return isActive
    })

    console.log(`🔍 Active leagues for month ${currentMonth}:`, activeLeagues.map(l => `${l.name} (ID:${l.id})`))

    // 각 리그별로 순차 처리
    for (const league of activeLeagues) {
      console.log(`\n📊 Processing ${league.name} (ID: ${league.id})...`)
      
      try {
        // 1. 경기 목록 가져오기 (전체 시즌)
        // Baseball API는 season 단위로 조회
        const fixturesUrl = `https://v1.baseball.api-sports.io/games?league=${league.id}&season=${league.season}`
        
        console.log(`  📡 Fetching fixtures...`)
        console.log(`     URL: ${fixturesUrl}`)
        console.log(`     Season: ${league.season}`)
        
        // 날짜 범위 계산 (과거 7일 + 미래 14일)
        const now = new Date()
        const pastDate = new Date(now)
        pastDate.setDate(pastDate.getDate() - 7)
        const futureDate = new Date(now)
        futureDate.setDate(futureDate.getDate() + 14)
        
        const pastDateStr = pastDate.toISOString().split('T')[0]
        const futureDateStr = futureDate.toISOString().split('T')[0]
        
        console.log(`     Date range: ${pastDateStr} ~ ${futureDateStr}`)
        
        const fixturesResponse = await fetch(fixturesUrl, {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'v1.baseball.api-sports.io'
          }
        })

        console.log(`  📥 Response status: ${fixturesResponse.status}`)

        if (!fixturesResponse.ok) {
          const errorText = await fixturesResponse.text()
          console.error(`  ❌ API Error (${fixturesResponse.status}):`, errorText)
          throw new Error(`Fixtures API failed: ${fixturesResponse.status}`)
        }

        const fixturesData = await fixturesResponse.json()
        console.log(`  ✅ Found ${fixturesData.results} fixtures`)
        
        if (fixturesData.results > 0) {
          console.log(`  📋 First game:`, {
            home: fixturesData.response[0]?.teams?.home?.name,
            away: fixturesData.response[0]?.teams?.away?.name,
            date: fixturesData.response[0]?.date
          })
        }

        if (!fixturesData.response || fixturesData.results === 0) {
          results.leagues.push({
            league: league.code,
            matches: 0,
            odds: 0
          })
          continue
        }
        
        // 날짜 범위로 필터링 (과거 7일 ~ 미래 14일)
        const filteredFixtures = fixturesData.response.filter((game: any) => {
          const gameDate = game.date.split('T')[0]
          return gameDate >= pastDateStr && gameDate <= futureDateStr
        })
        
        console.log(`  🎯 Filtered to ${filteredFixtures.length} games (${pastDateStr} ~ ${futureDateStr})`)

        let matchesSaved = 0
        let oddsSaved = 0

        // 2. 각 경기 처리 (필터링된 경기만)
        for (const fixture of filteredFixtures) {
          try {
            const matchId = fixture.id.toString()
            const homeTeam = fixture.teams.home.name
            const awayTeam = fixture.teams.away.name
            const homeTeamId = fixture.teams.home.id
            const awayTeamId = fixture.teams.away.id
            const matchDate = new Date(fixture.date)

            // 팀 로고 URL (API-Sports 패턴)
            const homeTeamLogo = `https://media.api-sports.io/baseball/teams/${homeTeamId}.png`
            const awayTeamLogo = `https://media.api-sports.io/baseball/teams/${awayTeamId}.png`

            // 3. 경기 데이터 저장
            const matchData = {
              id: parseInt(matchId),
              api_match_id: matchId,
              league: league.code,
              league_name: league.name,
              season: league.season.toString(),
              home_team: homeTeam,
              home_team_ko: getKoreanTeamName(homeTeam),
              home_team_id: homeTeamId,
              home_team_logo: homeTeamLogo,
              away_team: awayTeam,
              away_team_ko: getKoreanTeamName(awayTeam),
              away_team_id: awayTeamId,
              away_team_logo: awayTeamLogo,
              match_date: matchDate.toISOString().split('T')[0],  // 날짜만 (YYYY-MM-DD)
              match_timestamp: matchDate.toISOString(),  // UTC timestamp (프론트에서 변환)
              status: fixture.status.short || 'NS',
              venue: fixture.venue || null,
              home_score: fixture.scores?.home?.total || null,
              away_score: fixture.scores?.away?.total || null,
              is_spring_training: league.isSpring || false
            }

            const { error: matchError } = await supabase
              .from('baseball_matches')
              .upsert(matchData, { onConflict: 'id' })

            if (matchError) {
              console.error(`  ❌ Failed to save match ${matchId}:`, matchError)
              continue
            }

            matchesSaved++
            console.log(`  ✅ Saved match: ${getKoreanTeamName(homeTeam)} vs ${getKoreanTeamName(awayTeam)} (${homeTeam} vs ${awayTeam})`)

          } catch (error: any) {
            console.error(`  ❌ Error processing fixture:`, error.message)
            results.errors.push(`${league.code}: ${error.message}`)
          }

          // Rate limiting (0.5초 딜레이)
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        // 배당률 수집 (경기 저장 후)
        console.log(`\n💰 Collecting odds for ${league.name}...`)
        
        // 저장된 경기 ID 목록 가져오기
        const { data: savedMatches } = await supabase
          .from('baseball_matches')
          .select('api_match_id')
          .eq('league', league.code)
          .eq('is_spring_training', league.isSpring || false)
        
        const savedMatchIds = new Set(savedMatches?.map(m => m.api_match_id) || [])
        console.log(`  📋 Found ${savedMatchIds.size} saved matches in DB`)
        
        try {
          const oddsUrl = `https://v1.baseball.api-sports.io/odds?league=${league.id}&season=${league.season}`
          
          console.log(`  📡 Fetching odds: ${oddsUrl}`)
          
          const oddsResponse = await fetch(oddsUrl, {
            headers: {
              'x-rapidapi-key': apiKey,
              'x-rapidapi-host': 'v1.baseball.api-sports.io'
            }
          })

          console.log(`  📥 Odds Response Status: ${oddsResponse.status}`)

          if (oddsResponse.ok) {
            const oddsData = await oddsResponse.json()
            console.log(`  ✅ Found ${oddsData.results} games with odds`)

            if (oddsData.results === 0) {
              console.log(`  ⚠️ No odds available for league ${league.id}`)
            }

            let processedCount = 0
            
            for (const oddsGame of oddsData.response || []) {
              try {
                processedCount++
                
                // 저장된 경기인지 확인
                if (!savedMatchIds.has(oddsGame.game.id)) {
                  console.log(`  ⏭️  Skipping game ${processedCount}/${oddsData.results}: ${oddsGame.game.teams.home.name} vs ${oddsGame.game.teams.away.name} (ID: ${oddsGame.game.id} - Not in DB)`)
                  continue
                }
                
                console.log(`  🎯 Processing game ${processedCount}/${oddsData.results}: ${oddsGame.game.teams.home.name} vs ${oddsGame.game.teams.away.name}`)
                console.log(`     Game ID: ${oddsGame.game.id}`)
                console.log(`     Bookmakers: ${oddsGame.bookmakers?.length || 0}`)
                
                // Bet365 북메이커 사용 (id: 2)
                const bookmaker = oddsGame.bookmakers?.find((b: any) => b.id === 2) || oddsGame.bookmakers?.[0]
                
                if (!bookmaker) {
                  console.log(`     ❌ No bookmakers found`)
                  continue
                }
                
                console.log(`     Bookmaker: ${bookmaker.name} (${bookmaker.bets?.length || 0} bets)`)

                // Home/Away 배당 찾기 (id: 1)
                const homeAwayBet = bookmaker.bets?.find((b: any) => b.id === 1)
                
                if (!homeAwayBet) {
                  console.log(`     ❌ No Home/Away bet found`)
                  console.log(`     Available bets: ${bookmaker.bets?.map((b: any) => `${b.name}(${b.id})`).join(', ')}`)
                  continue
                }
                
                console.log(`     Bet: ${homeAwayBet.name}, Values: ${homeAwayBet.values?.length || 0}`)

                const homeOdds = homeAwayBet.values?.find((v: any) => v.value === 'Home')?.odd
                const awayOdds = homeAwayBet.values?.find((v: any) => v.value === 'Away')?.odd

                if (!homeOdds || !awayOdds) {
                  console.log(`     ❌ Missing odds - Home: ${homeOdds}, Away: ${awayOdds}`)
                  continue
                }
                
                console.log(`     Odds: Home ${homeOdds}, Away ${awayOdds}`)

                // 확률 계산
                const homeProb = (1 / parseFloat(homeOdds)) * 100
                const awayProb = (1 / parseFloat(awayOdds)) * 100
                const total = homeProb + awayProb
                
                const normalizedHome = (homeProb / total) * 100
                const normalizedAway = (awayProb / total) * 100

                const oddsRecord = {
                  api_match_id: oddsGame.game.id,
                  match_id: oddsGame.game.id,
                  league: league.code,
                  home_win_odds: parseFloat(homeOdds),
                  away_win_odds: parseFloat(awayOdds),
                  home_win_prob: parseFloat(normalizedHome.toFixed(2)),
                  away_win_prob: parseFloat(normalizedAway.toFixed(2)),
                  bookmaker: bookmaker.name
                }
                
                // History용 레코드 (bookmaker 제외)
                const historyRecord = {
                  api_match_id: oddsGame.game.id,
                  match_id: oddsGame.game.id,
                  league: league.code,
                  home_win_odds: parseFloat(homeOdds),
                  away_win_odds: parseFloat(awayOdds),
                  home_win_prob: parseFloat(normalizedHome.toFixed(2)),
                  away_win_prob: parseFloat(normalizedAway.toFixed(2))
                }
                
                console.log(`     💾 Saving odds record:`, oddsRecord)

                // History 저장 (bookmaker 없이)
                const { error: historyError } = await supabase
                  .from('baseball_odds_history')
                  .insert(historyRecord)

                if (historyError) {
                  console.log(`     ❌ History save error:`, historyError.message)
                  continue
                }
                
                console.log(`     ✅ History saved`)

                // Latest 업데이트
                const { error: latestError } = await supabase
                  .from('baseball_odds_latest')
                  .upsert(oddsRecord, { onConflict: 'api_match_id' })
                
                if (latestError) {
                  console.log(`     ❌ Latest save error:`, latestError.message)
                  continue
                }
                
                console.log(`     ✅ Latest saved`)

                console.log(`  💰 SUCCESS: ${getKoreanTeamName(oddsGame.game.teams.home.name)} vs ${getKoreanTeamName(oddsGame.game.teams.away.name)} (${homeOdds} vs ${awayOdds})`)
                oddsSaved++

              } catch (oddsError: any) {
                console.error(`  ⚠️ Error processing odds game:`, oddsError.message)
              }
            }
            
            console.log(`\n💰 Total odds saved: ${oddsSaved}/${oddsData.results}`)

          } else {
            console.log(`  ❌ Odds API failed with status: ${oddsResponse.status}`)
          }

        } catch (oddsError: any) {
          console.error(`❌ Odds collection failed:`, oddsError.message)
        }

        results.leagues.push({
          league: league.code,
          matches: matchesSaved,
          odds: oddsSaved
        })

        results.totalMatches += matchesSaved
        results.totalOdds += oddsSaved

      } catch (error: any) {
        console.error(`❌ League ${league.code} failed:`, error.message)
        results.errors.push(`${league.code}: ${error.message}`)
        
        results.leagues.push({
          league: league.code,
          matches: 0,
          odds: 0,
          error: error.message
        })
      }
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'Baseball odds collection completed',
      duration: `${duration}ms`,
      results
    })

  } catch (error: any) {
    console.error('❌ Collection failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: `${Date.now() - startTime}ms`
    }, { status: 500 })
  }
}