// app/api/baseball/cron/collect-odds/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getKoreanTeamName } from '../../../../../lib/baseball_teams'

export const maxDuration = 300

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

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

    // 오늘 ~ 7일 후 (API 문서: 1-7일 전 경기만 배당 제공)
    const todayStr = now.toISOString().split('T')[0]
    const futureDate = new Date(now)
    futureDate.setDate(futureDate.getDate() + 7)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    console.log(`🗓️ Date: ${now.toISOString()}`)
    console.log(`📅 Collecting odds for: ${todayStr} ~ ${futureDateStr}`)

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

      // DB에서 오늘~7일 경기 ID 목록 가져오기
      const { data: savedMatches } = await supabase
        .from('baseball_matches')
        .select('api_match_id')
        .eq('league', league.code)
        .eq('is_spring_training', league.isSpring || false)
        .gte('match_date', todayStr)
        .lte('match_date', futureDateStr)

      const matchIds = savedMatches?.map(m => String(m.api_match_id)) || []
      console.log(`  📋 DB matches in range: ${matchIds.length}`)

      if (matchIds.length === 0) {
        console.log(`  ⚠️ No matches in DB, skipping`)
        results.leagues.push({ league: league.code, odds: 0 })
        continue
      }

      // game ID별로 개별 odds 조회 (API 문서 방식)
      for (const gameId of matchIds) {
        try {
          const oddsUrl = `https://v1.baseball.api-sports.io/odds?game=${gameId}`

          const oddsResponse = await fetch(oddsUrl, {
            headers: {
              'x-apisports-key': apiKey  // ✅ 올바른 헤더
            }
          })

          if (!oddsResponse.ok) {
            console.log(`  ❌ Game ${gameId}: HTTP ${oddsResponse.status}`)
            await new Promise(r => setTimeout(r, 200))
            continue
          }

          const oddsData = await oddsResponse.json()

          if (!oddsData.results || oddsData.results === 0) {
            // 배당 없는 경기는 로그 생략 (너무 많아짐)
            await new Promise(r => setTimeout(r, 200))
            continue
          }

          const oddsGame = oddsData.response?.[0]
          if (!oddsGame) continue

          // Bet365(id:2) 우선, 없으면 첫 번째 북메이커
          const bookmaker = oddsGame.bookmakers?.find((b: any) => b.id === 2) || oddsGame.bookmakers?.[0]
          if (!bookmaker) continue

          // Home/Away 배당 (bet id: 1)
          const homeAwayBet = bookmaker.bets?.find((b: any) => b.id === 1)
          if (!homeAwayBet) {
            console.log(`  ⚠️ Game ${gameId}: No Home/Away bet. Available: ${bookmaker.bets?.map((b: any) => `${b.name}(${b.id})`).join(', ')}`)
            continue
          }

          const homeOdds = homeAwayBet.values?.find((v: any) => v.value === 'Home')?.odd
          const awayOdds = homeAwayBet.values?.find((v: any) => v.value === 'Away')?.odd
          if (!homeOdds || !awayOdds) continue

          // 확률 계산
          const homeProb = (1 / parseFloat(homeOdds)) * 100
          const awayProb = (1 / parseFloat(awayOdds)) * 100
          const total = homeProb + awayProb
          const normalizedHome = parseFloat(((homeProb / total) * 100).toFixed(2))
          const normalizedAway = parseFloat(((awayProb / total) * 100).toFixed(2))

          // Over/Under (bet id: 5) - 10.5 라인 우선, 없으면 첫 번째 라인
          const ouBet = bookmaker.bets?.find((b: any) => b.id === 5)
          let ouLine: number | null = null
          let overOdds: number | null = null
          let underOdds: number | null = null
          if (ouBet) {
            const preferred = ouBet.values?.find((v: any) => v.value === 'Over 10.5')
            if (preferred) {
              ouLine = 10.5
              overOdds = parseFloat(preferred.odd)
              underOdds = parseFloat(ouBet.values?.find((v: any) => v.value === 'Under 10.5')?.odd ?? '0') || null
            } else {
              // 10.5 없으면 첫 번째 Over 라인 사용
              const firstOver = ouBet.values?.find((v: any) => v.value?.startsWith('Over '))
              if (firstOver) {
                const lineStr = firstOver.value.replace('Over ', '')
                ouLine = parseFloat(lineStr)
                overOdds = parseFloat(firstOver.odd)
                underOdds = parseFloat(ouBet.values?.find((v: any) => v.value === `Under ${lineStr}`)?.odd ?? '0') || null
              }
            }
          }

          // Runline (bet id: 2) - Home -1.5 기준
          const runlineBet = bookmaker.bets?.find((b: any) => b.id === 2)
          let runlineSpread: number | null = null
          let homeRunlineOdds: number | null = null
          let awayRunlineOdds: number | null = null
          if (runlineBet) {
            const homeMinus = runlineBet.values?.find((v: any) => v.value === 'Home -1.5')
            const awayMinus = runlineBet.values?.find((v: any) => v.value === 'Away -1.5')
            if (homeMinus) {
              runlineSpread = -1.5
              homeRunlineOdds = parseFloat(homeMinus.odd)
              awayRunlineOdds = parseFloat(
                runlineBet.values?.find((v: any) => v.value === 'Away +1.5' || v.value === 'Away -1.5')?.odd ?? '0'
              ) || null
            } else if (awayMinus) {
              runlineSpread = 1.5
              awayRunlineOdds = parseFloat(awayMinus.odd)
              homeRunlineOdds = parseFloat(
                runlineBet.values?.find((v: any) => v.value === 'Home +1.5' || v.value === 'Home -1.5')?.odd ?? '0'
              ) || null
            }
          }

          const oddsRecord = {
            api_match_id: parseInt(gameId),
            match_id: parseInt(gameId),
            league: league.code,
            home_win_odds: parseFloat(homeOdds),
            away_win_odds: parseFloat(awayOdds),
            home_win_prob: normalizedHome,
            away_win_prob: normalizedAway,
            over_under_line: ouLine,
            over_odds: overOdds,
            under_odds: underOdds,
            runline_spread: runlineSpread,
            home_runline_odds: homeRunlineOdds,
            away_runline_odds: awayRunlineOdds,
            bookmaker: bookmaker.name
          }

          const historyRecord = {
            api_match_id: parseInt(gameId),
            match_id: parseInt(gameId),
            league: league.code,
            home_win_odds: parseFloat(homeOdds),
            away_win_odds: parseFloat(awayOdds),
            home_win_prob: normalizedHome,
            away_win_prob: normalizedAway,
            over_under_line: ouLine,
            over_odds: overOdds,
            under_odds: underOdds
          }

          const { error: historyError } = await supabase
            .from('baseball_odds_history')
            .insert(historyRecord)

          if (historyError) {
            console.log(`  ❌ History error (${gameId}): ${historyError.message}`)
            continue
          }

          const { error: latestError } = await supabase
            .from('baseball_odds_latest')
            .upsert(oddsRecord, { onConflict: 'api_match_id' })

          if (latestError) {
            console.log(`  ❌ Latest error (${gameId}): ${latestError.message}`)
            continue
          }

          const homeName = getKoreanTeamName(oddsGame.game?.teams?.home?.name || '')
          const awayName = getKoreanTeamName(oddsGame.game?.teams?.away?.name || '')
          console.log(`  💰 ${homeName} vs ${awayName}: ${homeOdds} / ${awayOdds} (${normalizedHome}% / ${normalizedAway}%)`)
          oddsSaved++

          await new Promise(r => setTimeout(r, 200))

        } catch (e: any) {
          console.error(`  ⚠️ Game ${gameId} error: ${e.message}`)
        }
      }

      console.log(`  ✅ ${league.name}: ${oddsSaved}/${matchIds.length} odds saved`)
      results.leagues.push({ league: league.code, odds: oddsSaved, total: matchIds.length })
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