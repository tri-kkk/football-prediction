// app/api/baseball/cron/collect-odds/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getKoreanTeamName } from '../../../../../lib/baseball_teams'

export const maxDuration = 300 // Vercel Pro: 최대 300초

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// 리그 설정
const leagues = [
  { id: 71, code: 'MLB', name: 'MLB - Spring Training', season: 2026, isSpring: true },
  { id: 1,  code: 'MLB', name: 'MLB', season: 2026 },
  { id: 2,  code: 'NPB', name: 'NPB', season: 2026 },
  { id: 5,  code: 'KBO', name: 'KBO', season: 2026 },
  { id: 29, code: 'CPBL', name: 'CPBL', season: 2026 },
]

export async function GET() {
  const startTime = Date.now()

  try {
    const apiKey = process.env.API_FOOTBALL_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const now = new Date()
    const currentMonth = now.getMonth() + 1

    // 오늘 ~ 14일 후 날짜 목록
    const dateList: string[] = []
    for (let i = 0; i <= 14; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() + i)
      dateList.push(d.toISOString().split('T')[0])
    }

    console.log(`🗓️ Date: ${now.toISOString()}`)
    console.log(`📅 Collecting odds for: ${dateList[0]} ~ ${dateList[dateList.length - 1]}`)

    // 활성 리그 필터링
    const activeLeagues = leagues.filter(league => {
      if (league.isSpring) return currentMonth >= 2 && currentMonth <= 3
      return currentMonth >= 3 && currentMonth <= 11
    })

    console.log(`🔍 Active leagues:`, activeLeagues.map(l => `${l.name}(${l.id})`).join(', '))

    const results = {
      leagues: [] as any[],
      totalOdds: 0,
      errors: [] as string[]
    }

    for (const league of activeLeagues) {
      console.log(`\n📊 Processing ${league.name}...`)
      let oddsSaved = 0

      // DB에서 해당 리그 경기 ID 목록 가져오기 (오늘~14일)
      const { data: savedMatches } = await supabase
        .from('baseball_matches')
        .select('api_match_id')
        .eq('league', league.code)
        .eq('is_spring_training', league.isSpring || false)
        .gte('match_date', dateList[0])
        .lte('match_date', dateList[dateList.length - 1])

      const savedMatchIds = new Set(savedMatches?.map(m => String(m.api_match_id)) || [])
      console.log(`  📋 DB matches in range: ${savedMatchIds.size}`)

      if (savedMatchIds.size === 0) {
        console.log(`  ⚠️ No matches in DB for this range, skipping odds`)
        results.leagues.push({ league: league.code, odds: 0 })
        continue
      }

      // 날짜별 odds 수집
      for (const date of dateList) {
        const oddsUrl = `https://v1.baseball.api-sports.io/odds?league=${league.id}&season=${league.season}&date=${date}`

        try {
          const oddsResponse = await fetch(oddsUrl, {
            headers: {
              'x-rapidapi-key': apiKey,
              'x-rapidapi-host': 'v1.baseball.api-sports.io'
            }
          })

          if (!oddsResponse.ok) {
            console.log(`  ❌ ${date}: HTTP ${oddsResponse.status}`)
            await new Promise(r => setTimeout(r, 300))
            continue
          }

          const oddsData = await oddsResponse.json()
          const count = oddsData.results || 0
          console.log(`  📅 ${date}: ${count} games with odds`)

          if (count === 0) {
            await new Promise(r => setTimeout(r, 300))
            continue
          }

          for (const oddsGame of oddsData.response || []) {
            try {
              const gameId = String(oddsGame.game.id)

              if (!savedMatchIds.has(gameId)) {
                console.log(`  ⏭️ Skip ${gameId} (not in DB)`)
                continue
              }

              // Bet365(id:2) 우선, 없으면 첫 번째 북메이커
              const bookmaker = oddsGame.bookmakers?.find((b: any) => b.id === 2) || oddsGame.bookmakers?.[0]
              if (!bookmaker) continue

              // Home/Away 배당 (bet id: 1)
              const homeAwayBet = bookmaker.bets?.find((b: any) => b.id === 1)
              if (!homeAwayBet) continue

              const homeOdds = homeAwayBet.values?.find((v: any) => v.value === 'Home')?.odd
              const awayOdds = homeAwayBet.values?.find((v: any) => v.value === 'Away')?.odd
              if (!homeOdds || !awayOdds) continue

              // 확률 계산 및 정규화
              const homeProb = (1 / parseFloat(homeOdds)) * 100
              const awayProb = (1 / parseFloat(awayOdds)) * 100
              const total = homeProb + awayProb
              const normalizedHome = parseFloat(((homeProb / total) * 100).toFixed(2))
              const normalizedAway = parseFloat(((awayProb / total) * 100).toFixed(2))

              const oddsRecord = {
                api_match_id: oddsGame.game.id,
                match_id: oddsGame.game.id,
                league: league.code,
                home_win_odds: parseFloat(homeOdds),
                away_win_odds: parseFloat(awayOdds),
                home_win_prob: normalizedHome,
                away_win_prob: normalizedAway,
                bookmaker: bookmaker.name
              }

              const historyRecord = {
                api_match_id: oddsGame.game.id,
                match_id: oddsGame.game.id,
                league: league.code,
                home_win_odds: parseFloat(homeOdds),
                away_win_odds: parseFloat(awayOdds),
                home_win_prob: normalizedHome,
                away_win_prob: normalizedAway
              }

              const { error: historyError } = await supabase
                .from('baseball_odds_history')
                .insert(historyRecord)

              if (historyError) {
                console.log(`  ❌ History error: ${historyError.message}`)
                continue
              }

              const { error: latestError } = await supabase
                .from('baseball_odds_latest')
                .upsert(oddsRecord, { onConflict: 'api_match_id' })

              if (latestError) {
                console.log(`  ❌ Latest error: ${latestError.message}`)
                continue
              }

              console.log(`  💰 ${getKoreanTeamName(oddsGame.game.teams.home.name)} vs ${getKoreanTeamName(oddsGame.game.teams.away.name)}: ${homeOdds} / ${awayOdds}`)
              oddsSaved++

            } catch (e: any) {
              console.error(`  ⚠️ Game error: ${e.message}`)
            }
          }

          // 날짜별 딜레이
          await new Promise(r => setTimeout(r, 300))

        } catch (e: any) {
          console.error(`  ❌ Date ${date} error: ${e.message}`)
        }
      }

      console.log(`  ✅ ${league.name}: ${oddsSaved} odds saved`)
      results.leagues.push({ league: league.code, odds: oddsSaved })
      results.totalOdds += oddsSaved
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