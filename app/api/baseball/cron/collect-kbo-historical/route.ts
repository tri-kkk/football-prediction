// app/api/baseball/cron/collect-kbo-historical/route.ts
// KBO (league=5), NPB (league=2) 모두 지원
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_KEY = process.env.API_FOOTBALL_KEY!
const API_HOST = 'v1.baseball.api-sports.io'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season') || '2024'
  const leagueId = parseInt(searchParams.get('league') || '5')
  const leagueName = leagueId === 5 ? 'KBO' : leagueId === 2 ? 'NPB' : `LEAGUE_${leagueId}`
  const startDate = searchParams.get('startDate') || `${season}-03-20`
  const endDate = searchParams.get('endDate') || `${season}-11-10`

  console.log(`⚾ ${leagueName} 과거 시즌 데이터 수집 시작: ${season} (${startDate} ~ ${endDate})`)

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const dates = generateDateRange(startDate, endDate)
    let totalCollected = 0, totalSkipped = 0, totalErrors = 0

    for (const date of dates) {
      try {
        const url = `https://${API_HOST}/games?league=${leagueId}&season=${season}&date=${date}`
        const response = await fetch(url, {
          headers: { 'x-apisports-key': API_KEY },
          signal: AbortSignal.timeout(5000),
        })

        if (!response.ok) { totalErrors++; await sleep(500); continue }

        const data = await response.json()
        if (!data.response || data.response.length === 0) { await sleep(300); continue }

        console.log(`📆 ${date}: ${data.response.length}개 경기`)

        for (const game of data.response) {
          try {
            if (game.status.short !== 'FT') { totalSkipped++; continue }

            const { data: existing } = await supabase
              .from('baseball_matches').select('id')
              .eq('api_match_id', game.id).maybeSingle()
            if (existing) { totalSkipped++; continue }

            let inningData = null
            if (game.scores.home.innings && game.scores.away.innings) {
              inningData = { home: {}, away: {} }
              for (const [k, v] of Object.entries(game.scores.home.innings)) {
                if (k !== 'extra') inningData.home[k] = v
              }
              for (const [k, v] of Object.entries(game.scores.away.innings)) {
                if (k !== 'extra') inningData.away[k] = v
              }
            }

            const { error: insertError } = await supabase.from('baseball_matches').insert({
              api_match_id: game.id,
              league: leagueName,
              league_name: game.league.name,
              season,
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
            })

            if (insertError) { totalErrors++ }
            else {
              console.log(`✅ ${leagueName} ${game.teams.away.name} ${game.scores.away.total} vs ${game.scores.home.total} ${game.teams.home.name}`)
              totalCollected++
            }
          } catch { totalErrors++ }
        }
        await sleep(500)
      } catch (e: any) { totalErrors++ }
    }

    return NextResponse.json({
      success: true, league: leagueName, season,
      collected: totalCollected, skipped: totalSkipped, errors: totalErrors,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

function generateDateRange(start: string, end: string) {
  const dates: string[] = []
  const cur = new Date(start), last = new Date(end)
  while (cur <= last) { dates.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1) }
  return dates
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }