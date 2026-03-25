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

interface OULine {
  line: number
  over: number
  under: number
  diff: number // |over - under| 작을수록 맞배당
}

/**
 * ouBet에서 전체 라인 추출 + 맞배당 기준선 선택
 * 반환: { bestLine, ouLines }
 * - bestLine: 맞배당에 가장 가까운 단일 라인
 * - ouLines: 전체 라인 배열 (정렬됨), UI에서 3개 표시용
 */
function extractAllOULines(ouBet: any): {
  bestLine: number | null
  bestOver: number | null
  bestUnder: number | null
  ouLines: OULine[]
} {
  if (!ouBet?.values) return { bestLine: null, bestOver: null, bestUnder: null, ouLines: [] }

  const lines: OULine[] = []

  // Over X.X 값 파싱
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

  // 라인 오름차순 정렬
  lines.sort((a, b) => a.line - b.line)

  // 맞배당 기준: diff가 가장 작은 라인
  const best = lines.reduce((prev, curr) => curr.diff < prev.diff ? curr : prev)

  return {
    bestLine: best.line,
    bestOver: best.over,
    bestUnder: best.under,
    ouLines: lines,
  }
}

/**
 * ouLines 배열에서 UI 표시용 3개 선택
 * - best 라인 기준으로 위아래 1개씩
 * - 없으면 best 포함 인접 라인들
 */
export function selectDisplayLines(ouLines: OULine[], bestLine: number): OULine[] {
  if (ouLines.length === 0) return []
  if (ouLines.length === 1) return ouLines

  const bestIdx = ouLines.findIndex(l => l.line === bestLine)
  if (bestIdx === -1) return ouLines.slice(0, 3)

  const result: OULine[] = []

  // 아래 라인
  if (bestIdx > 0) result.push(ouLines[bestIdx - 1])
  // 기준 라인
  result.push(ouLines[bestIdx])
  // 위 라인
  if (bestIdx < ouLines.length - 1) result.push(ouLines[bestIdx + 1])

  // 2개밖에 없으면 추가
  if (result.length < 3) {
    if (bestIdx > 1) result.unshift(ouLines[bestIdx - 2])
    else if (bestIdx + 2 < ouLines.length) result.push(ouLines[bestIdx + 2])
  }

  return result.sort((a, b) => a.line - b.line).slice(0, 3)
}

export async function GET() {
  const startTime = Date.now()

  try {
    const apiKey = process.env.API_FOOTBALL_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const now = new Date()
    const currentMonth = now.getMonth() + 1

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

          // ✅ Home/Away: Bet365(2) → Pinnacle(4) → 10Bet(9) → Unibet(11) → 첫 번째
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

          // ✅ O/U: Pinnacle(4) → Fonbet(27) → 10Bet(9) → Unibet(11) → Betfair(13) → 나머지
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

          // fallback: 나머지 북메이커
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

          // Runline (bet id: 2)
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

          // UI 표시용 3개 라인 선택
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