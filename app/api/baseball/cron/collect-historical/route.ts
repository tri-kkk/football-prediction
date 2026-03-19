// app/api/baseball/cron/collect-historical/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_KEY = process.env.API_FOOTBALL_KEY!
const API_HOST = 'v1.baseball.api-sports.io'

const LEAGUE_MAP: Record<string, { id: number; code: string; isSpring?: boolean }[]> = {
  MLB:  [{ id: 1, code: 'MLB' }, { id: 71, code: 'MLB', isSpring: true }],
  NPB:  [{ id: 2, code: 'NPB' }],
  KBO:  [{ id: 5, code: 'KBO' }],
  CPBL: [{ id: 29, code: 'CPBL' }],
  ALL:  [
    { id: 1,  code: 'MLB' },
    { id: 71, code: 'MLB', isSpring: true },
    { id: 2,  code: 'NPB' },
    { id: 5,  code: 'KBO' },
    { id: 29, code: 'CPBL' },
  ],
}

// IN%(진행중), LIVE 제외하고 모두 저장
const SKIP_STATUSES = ['LIVE']

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season') || '2026'
  const leagueParam = searchParams.get('league') || 'ALL'
  const startDate = searchParams.get('startDate') || `${season}-02-01`
  const endDate = searchParams.get('endDate') || `${season}-11-01`
  const overwrite = searchParams.get('overwrite') === 'true'

  const leagues = LEAGUE_MAP[leagueParam] || LEAGUE_MAP['ALL']

  console.log(`⚾ 수집 시작: ${season} (${startDate} ~ ${endDate}) 리그: ${leagueParam} overwrite: ${overwrite}`)

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const dates = generateDateRange(startDate, endDate)
    console.log(`📅 수집 날짜: ${dates.length}일, 리그: ${leagues.length}개`)

    let totalCollected = 0
    let totalUpdated = 0
    let totalErrors = 0

    for (const league of leagues) {
      console.log(`\n🏟️ [${league.code}${league.isSpring ? ' Spring' : ''}] league_id: ${league.id}`)

      for (const date of dates) {
        try {
          const url = `https://${API_HOST}/games?league=${league.id}&season=${season}&date=${date}`
          const response = await fetch(url, { headers: { 'x-apisports-key': API_KEY } })

          if (!response.ok) {
            totalErrors++
            await new Promise(r => setTimeout(r, 500))
            continue
          }

          const data = await response.json()
          if (!data.response || data.response.length === 0) {
            await new Promise(r => setTimeout(r, 300))
            continue
          }

          console.log(`  📊 ${date} [${league.code}]: ${data.response.length}개`)

          for (const game of data.response) {
            try {
              const status = game.status.short

              // 진행중 경기 스킵 (live API가 처리)
              if (status.startsWith('IN') || SKIP_STATUSES.includes(status)) continue

              let inningData = null
              if (game.scores?.home?.innings && game.scores?.away?.innings) {
                inningData = { home: {} as any, away: {} as any }
                for (const [k, v] of Object.entries(game.scores.home.innings)) {
                  if (k !== 'extra') inningData.home[k] = v
                }
                for (const [k, v] of Object.entries(game.scores.away.innings)) {
                  if (k !== 'extra') inningData.away[k] = v
                }
              }

              const matchData = {
                api_match_id: game.id,
                league: league.code,
                league_name: game.league.name,
                season,
                match_date: game.date.split('T')[0],
                match_timestamp: game.date,
                home_team: game.teams.home.name,
                home_team_ko: null,
                home_team_id: game.teams.home.id,
                home_team_logo: game.teams.home.logo,
                away_team: game.teams.away.name,
                away_team_ko: null,
                away_team_id: game.teams.away.id,
                away_team_logo: game.teams.away.logo,
                home_score: game.scores?.home?.total ?? null,
                away_score: game.scores?.away?.total ?? null,
                home_hits: game.scores?.home?.hits ?? null,
                away_hits: game.scores?.away?.hits ?? null,
                home_errors: game.scores?.home?.errors ?? null,
                away_errors: game.scores?.away?.errors ?? null,
                status,
                inning: inningData,
                venue: game.venue || null,
                is_spring_training: league.isSpring || false,
              }

              if (overwrite) {
                const { error } = await supabase
                  .from('baseball_matches')
                  .upsert(matchData, { onConflict: 'api_match_id' })
                if (error) { console.error(`  ❌ upsert ${game.id}: ${error.message}`); totalErrors++ }
                else totalUpdated++
              } else {
                const { data: existing } = await supabase
                  .from('baseball_matches').select('id').eq('api_match_id', game.id).single()
                if (existing) continue

                const { error } = await supabase.from('baseball_matches').insert(matchData)
                if (error) { console.error(`  ❌ insert ${game.id}: ${error.message}`); totalErrors++ }
                else {
                  console.log(`  ✅ [${status}] ${league.code} ${game.teams.away.name} vs ${game.teams.home.name}`)
                  totalCollected++
                }
              }

            } catch (e: any) {
              console.error(`  ❌ ${game.id}: ${e.message}`)
              totalErrors++
            }
          }

          await new Promise(r => setTimeout(r, 400))

        } catch (e: any) {
          console.error(`❌ ${date}: ${e.message}`)
          totalErrors++
        }
      }
    }

    console.log(`\n✅ 완료! 신규: ${totalCollected}, 업데이트: ${totalUpdated}, 오류: ${totalErrors}`)

    return NextResponse.json({
      success: true,
      season,
      league: leagueParam,
      dateRange: { start: startDate, end: endDate },
      collected: totalCollected,
      updated: totalUpdated,
      errors: totalErrors,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}