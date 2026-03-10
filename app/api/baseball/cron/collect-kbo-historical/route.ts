// app/api/baseball/cron/collect-kbo-historical/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_KEY = process.env.API_FOOTBALL_KEY!
const API_HOST = 'v1.baseball.api-sports.io'

// KBO league ID = 5
const KBO_LEAGUE_ID = 5

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season') || '2024'
  // KBO 시즌: 3월 말 ~ 11월
  const startDate = searchParams.get('startDate') || `${season}-03-20`
  const endDate = searchParams.get('endDate') || `${season}-11-10`

  console.log(`⚾ KBO 과거 시즌 데이터 수집 시작: ${season} (${startDate} ~ ${endDate})`)

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const dates = generateDateRange(startDate, endDate)
    console.log(`📅 수집 날짜: ${dates.length}일`)

    let totalCollected = 0
    let totalSkipped = 0
    let totalErrors = 0

    for (const date of dates) {
      try {
        const url = `https://${API_HOST}/games?league=${KBO_LEAGUE_ID}&season=${season}&date=${date}`

        const response = await fetch(url, {
          headers: { 'x-apisports-key': API_KEY },
          signal: AbortSignal.timeout(5000),
        })

        if (!response.ok) {
          console.error(`❌ API 오류 ${date}: ${response.status}`)
          totalErrors++
          await sleep(500)
          continue
        }

        const data = await response.json()

        if (!data.response || data.response.length === 0) {
          await sleep(300)
          continue
        }

        console.log(`📆 ${date}: ${data.response.length}개 경기`)

        for (const game of data.response) {
          try {
            // 종료된 경기만
            if (game.status.short !== 'FT') {
              totalSkipped++
              continue
            }

            // 중복 체크
            const { data: existing } = await supabase
              .from('baseball_matches')
              .select('id')
              .eq('api_match_id', game.id)
              .maybeSingle()

            if (existing) {
              totalSkipped++
              continue
            }

            // 이닝 데이터
            let inningData = null
            if (game.scores.home.innings && game.scores.away.innings) {
              inningData = { home: {}, away: {} }
              for (const [inning, score] of Object.entries(game.scores.home.innings)) {
                if (inning !== 'extra') inningData.home[inning] = score
              }
              for (const [inning, score] of Object.entries(game.scores.away.innings)) {
                if (inning !== 'extra') inningData.away[inning] = score
              }
            }

            const matchData = {
              api_match_id: game.id,
              league: 'KBO',
              league_name: game.league.name,
              season: season,
              match_date: game.date.split('T')[0],
              match_timestamp: game.date,
              home_team: game.teams.home.name,
              home_team_id: game.teams.home.id,
              home_team_logo: game.teams.home.logo,
              away_team: game.teams.away.name,
              away_team_id: game.teams.away.id,
              away_team_logo: game.teams.away.logo,
              home_score: game.scores.home.total,
              away_score: game.scores.away.total,
              home_hits: game.scores.home.hits || null,
              away_hits: game.scores.away.hits || null,
              home_errors: game.scores.home.errors || null,
              away_errors: game.scores.away.errors || null,
              status: game.status.short,
              inning: inningData,
              venue: game.venue || null,
              is_spring_training: false,
            }

            const { error: insertError } = await supabase
              .from('baseball_matches')
              .insert(matchData)

            if (insertError) {
              console.error(`❌ 저장 실패 ${game.id}:`, insertError.message)
              totalErrors++
            } else {
              console.log(`✅ ${game.teams.away.name} ${game.scores.away.total} vs ${game.scores.home.total} ${game.teams.home.name}`)
              totalCollected++
            }

          } catch (e: any) {
            totalErrors++
          }
        }

        await sleep(500)

      } catch (e: any) {
        console.error(`❌ ${date} 오류:`, e.message)
        totalErrors++
      }
    }

    console.log(`✅ KBO ${season} 수집 완료: ${totalCollected}개 (스킵 ${totalSkipped}, 오류 ${totalErrors})`)

    return NextResponse.json({
      success: true,
      league: 'KBO',
      season,
      dateRange: { start: startDate, end: endDate },
      totalDates: dates.length,
      collected: totalCollected,
      skipped: totalSkipped,
      errors: totalErrors,
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
