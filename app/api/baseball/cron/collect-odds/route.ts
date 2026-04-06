// app/api/baseball/cron/collect-odds/route.ts
import { NextRequest, NextResponse } from 'next/server'
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

interface OULine {
  line: number
  over: number
  under: number
  diff: number
}

function extractAllOULines(ouBet: any): {
  bestLine: number | null
  bestOver: number | null
  bestUnder: number | null
  ouLines: OULine[]
} {
  if (!ouBet?.values) return { bestLine: null, bestOver: null, bestUnder: null, ouLines: [] }

  const lines: OULine[] = []

  for (const val of ouBet.values) {
    if (!val.value?.startsWith('Over ')) continue
    const lineStr = val.value.replace('Over ', '')
    const lineNum = parseFloat(lineStr)
    if (isNaN(lineNum)) continue

    const underVal = ouBet.values.find((v: any) => v.value === `Under ${lineStr}`)
    if (!underVal) continue

    const overOdd = parseFloat(val.odd)
    const underOdd = parseFloat(underVal.odd)
    if (isNaN(overOdd) || isNaN(underOdd)) continue

    lines.push({
      line: lineNum,
      over: overOdd,
      under: underOdd,
      diff: Math.abs(overOdd - underOdd),
    })
  }

  if (lines.length === 0) return { bestLine: null, bestOver: null, bestUnder: null, ouLines: [] }

  lines.sort((a, b) => a.line - b.line)
  const best = lines.reduce((prev, curr) => curr.diff < prev.diff ? curr : prev)

  return {
    bestLine: best.line,
    bestOver: best.over,
    bestUnder: best.under,
    ouLines: lines,
  }
}

export function selectDisplayLines(ouLines: OULine[], bestLine: number): OULine[] {
  if (ouLines.length === 0) return []
  if (ouLines.length === 1) return ouLines

  const bestIdx = ouLines.findIndex(l => l.line === bestLine)
  if (bestIdx === -1) return ouLines.slice(0, 3)

  const result: OULine[] = []

  if (bestIdx > 0) result.push(ouLines[bestIdx - 1])
  result.push(ouLines[bestIdx])
  if (bestIdx < ouLines.length - 1) result.push(ouLines[bestIdx + 1])

  if (result.length < 3) {
    if (bestIdx > 1) result.unshift(ouLines[bestIdx - 2])
    else if (bestIdx + 2 < ouLines.length) result.push(ouLines[bestIdx + 2])
  }

  return result.sort((a, b) => a.line - b.line).slice(0, 3)
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // ✅ league 파라미터 지원: MLB / NPB_KBO / CPBL / 없으면 전체
  const { searchParams } = new URL(request.url)
  const leagueParam = searchParams.get('league') // 'MLB' | 'NPB_KBO' | 'CPBL' | null

  try {
    const apiKey = process.env.API_FOOTBALL_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // ✅ KST 기준 날짜 계산 (Vercel은 UTC 서버)
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const currentMonth = kstNow.getMonth() + 1

    const todayStr = kstNow.toISOString().split('T')[0]
    // MLB는 7일 범위 (오즈가 1~2일 전부터 나옴), KBO/NPB/CPBL은 3일 범위 (당일만 나옴)
    const futureDays = (leagueParam === 'NPB_KBO' || leagueParam === 'CPBL') ? 3 : 7
    const futureDate = new Date(kstNow.getTime() + futureDays * 24 * 60 * 60 * 1000)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    console.log(`🗓️ KST Date: ${kstNow.toISOString()} (UTC: ${new Date().toISOString()})`)
    console.log(`📅 Collecting odds for: ${todayStr} ~ ${futureDateStr} (${futureDays}일 범위)`)
    console.log(`🎯 League filter: ${leagueParam || 'ALL'}`)

    // ✅ 시즌 필터
    let activeLeagues = leagues.filter(league => {
      if (league.isSpring) return currentMonth >= 2 && currentMonth <= 3
      return currentMonth >= 3 && currentMonth <= 11
    })

    // ✅ league 파라미터로 추가 필터
    if (leagueParam === 'MLB') {
      activeLeagues = activeLeagues.filter(l => l.code === 'MLB')
    } else if (leagueParam === 'NPB_KBO') {
      activeLeagues = activeLeagues.filter(l => l.code === 'NPB' || l.code === 'KBO')
    } else if (leagueParam === 'CPBL') {
      activeLeagues = activeLeagues.filter(l => l.code === 'CPBL')
    }

    console.log(`🔍 Active leagues:`, activeLeagues.map(l => `${l.name}(${l.id})`).join(', '))

    const results = {
      leagues: [] as any[],
      totalOdds: 0,
      errors: [] as string[]
    }

    for (const league of activeLeagues) {
      console.log(`\n📊 Processing ${league.name}...`)
      let oddsSaved = 0

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

      for (const gameId of matchIds) {
        try {
          const oddsUrl = `https://v1.baseball.api-sports.io/odds?game=${gameId}`

          const oddsResponse = await fetch(oddsUrl, {
            headers: { 'x-apisports-key': apiKey }
          })

          if (!oddsResponse.ok) {
            console.log(`  ❌ Game ${gameId}: HTTP ${oddsResponse.status}`)
            await new Promise(r => setTimeout(r, 200))
            continue
          }

          const oddsData = await oddsResponse.json()

          if (!oddsData.results || oddsData.results === 0) {
            await new Promise(r => setTimeout(r, 200))
            continue
          }

          const oddsGame = oddsData.response?.[0]
          if (!oddsGame) continue

          const bookmakers = oddsGame.bookmakers || []

          const HOMEAWAY_PRIORITY = [2, 4, 9, 11, 13]
          let bookmaker: any = null
          for (const bmId of HOMEAWAY_PRIORITY) {
            const bm = bookmakers.find((b: any) => b.id === bmId)
            if (bm?.bets?.find((b: any) => b.id === 1)) {
              bookmaker = bm
              break
            }
          }
          if (!bookmaker) {
            bookmaker = bookmakers.find((b: any) => b.bets?.find((bet: any) => bet.id === 1))
          }
          if (!bookmaker) continue

          const homeAwayBet = bookmaker.bets?.find((b: any) => b.id === 1)
          if (!homeAwayBet) continue

          const homeOdds = homeAwayBet.values?.find((v: any) => v.value === 'Home')?.odd
          const awayOdds = homeAwayBet.values?.find((v: any) => v.value === 'Away')?.odd
          if (!homeOdds || !awayOdds) continue

          const homeProb = (1 / parseFloat(homeOdds)) * 100
          const awayProb = (1 / parseFloat(awayOdds)) * 100
          const total = homeProb + awayProb
          const normalizedHome = parseFloat(((homeProb / total) * 100).toFixed(2))
          const normalizedAway = parseFloat(((awayProb / total) * 100).toFixed(2))

          const OU_PRIORITY = [4, 27, 9, 11, 13, 30, 2]
          let bestLine: number | null = null
          let bestOver: number | null = null
          let bestUnder: number | null = null
          let ouLines: OULine[] = []

          for (const bmId of OU_PRIORITY) {
            const bm = bookmakers.find((b: any) => b.id === bmId)
            const ouBet = bm?.bets?.find((b: any) => b.id === 5)
            if (ouBet) {
              const extracted = extractAllOULines(ouBet)
              if (extracted.bestLine !== null) {
                bestLine = extracted.bestLine
                bestOver = extracted.bestOver
                bestUnder = extracted.bestUnder
                ouLines = extracted.ouLines
                console.log(`  📊 O/U from ${bm.name}: ${ouLines.length}개 라인, 기준=${bestLine}`)
                break
              }
            }
          }

          if (bestLine === null) {
            for (const bm of bookmakers) {
              const ouBet = bm.bets?.find((b: any) => b.id === 5)
              if (ouBet) {
                const extracted = extractAllOULines(ouBet)
                if (extracted.bestLine !== null) {
                  bestLine = extracted.bestLine
                  bestOver = extracted.bestOver
                  bestUnder = extracted.bestUnder
                  ouLines = extracted.ouLines
                  console.log(`  📊 O/U fallback from ${bm.name}: 기준=${bestLine}`)
                  break
                }
              }
            }
          }

          const runlineBm = bookmakers.find((b: any) => b.id === 2) || bookmakers.find((b: any) => b.bets?.find((bet: any) => bet.id === 2))
          const runlineBet = runlineBm?.bets?.find((b: any) => b.id === 2)
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
                runlineBet.values?.find((v: any) => v.value === 'Away +1.5')?.odd ?? '0'
              ) || null
            } else if (awayMinus) {
              runlineSpread = 1.5
              awayRunlineOdds = parseFloat(awayMinus.odd)
              homeRunlineOdds = parseFloat(
                runlineBet.values?.find((v: any) => v.value === 'Home +1.5')?.odd ?? '0'
              ) || null
            }
          }

          const displayLines = bestLine !== null ? selectDisplayLines(ouLines, bestLine) : []

          const oddsRecord = {
            api_match_id: parseInt(gameId),
            match_id: parseInt(gameId),
            league: league.code,
            home_win_odds: parseFloat(homeOdds),
            away_win_odds: parseFloat(awayOdds),
            home_win_prob: normalizedHome,
            away_win_prob: normalizedAway,
            over_under_line: bestLine,
            over_odds: bestOver,
            under_odds: bestUnder,
            ou_lines: displayLines.length > 0 ? displayLines.map(l => ({
              line: l.line,
              over: l.over,
              under: l.under,
            })) : null,
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
            over_under_line: bestLine,
            over_odds: bestOver,
            under_odds: bestUnder,
            ou_lines: displayLines.length > 0 ? displayLines.map(l => ({
              line: l.line,
              over: l.over,
              under: l.under,
            })) : null,
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
          console.log(`  💰 ${homeName} vs ${awayName}: ${homeOdds}/${awayOdds} O/U:${bestLine ?? 'N/A'} (${displayLines.length}개 라인)`)
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