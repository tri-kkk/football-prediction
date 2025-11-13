import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const API_KEY = process.env.API_FOOTBALL_KEY || '87fdad3a68c6386ce1921080461e91e6'
const BASE_URL = 'https://v3.football.api-sports.io'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    console.log('⚽ ========== Lineup Collection Started ==========')
    console.log('⏰ Time:', new Date().toISOString())

    const results = {
      success: true,
      totalChecked: 0,
      totalAvailable: 0,
      errors: [] as string[],
    }

    // 1. match_odds_latest에서 앞으로 24시간 이내 경기 가져오기
    const now = new Date()
    const twentyFourHoursLater = new Date()
    twentyFourHoursLater.setHours(now.getHours() + 24)

    const { data: upcomingMatches, error: matchError } = await supabase
      .from('match_odds_latest')
      .select('match_id, home_team, away_team, home_team_id, away_team_id, commence_time')
      .gte('commence_time', now.toISOString())
      .lte('commence_time', twentyFourHoursLater.toISOString())

    if (matchError) {
      throw new Error(`Failed to fetch matches: ${matchError.message}`)
    }

    console.log(`📊 Found ${upcomingMatches?.length || 0} upcoming matches`)

    if (!upcomingMatches || upcomingMatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No upcoming matches in next 24 hours',
        results,
      })
    }

    // 2. 각 경기의 라인업 체크
    for (const match of upcomingMatches) {
      try {
        results.totalChecked++

        // 라인업 API 호출
        const lineupData = await fetchFromApiFootball(
          `/fixtures/lineups?fixture=${match.match_id}`
        )

        const lineups = lineupData.response || []

        if (lineups.length >= 2) {
          // 라인업 발표됨!
          const homeLineup = lineups.find((l: any) => l.team.id === match.home_team_id) || lineups[0]
          const awayLineup = lineups.find((l: any) => l.team.id === match.away_team_id) || lineups[1]

          // DB 저장 (UPSERT)
          const { error: upsertError } = await supabase
            .from('lineup_status')
            .upsert({
              fixture_id: match.match_id,
              home_team: match.home_team,
              away_team: match.away_team,
              home_team_id: match.home_team_id,
              away_team_id: match.away_team_id,
              lineup_available: true,
              home_formation: homeLineup.formation,
              away_formation: awayLineup.formation,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'fixture_id'
            })

          if (upsertError) {
            console.error(`❌ Upsert error for ${match.match_id}:`, upsertError.message)
            results.errors.push(`${match.home_team} vs ${match.away_team}: ${upsertError.message}`)
          } else {
            results.totalAvailable++
            console.log(`✅ Lineup available: ${match.home_team} (${homeLineup.formation}) vs ${match.away_team} (${awayLineup.formation})`)
          }
        } else {
          // 라인업 아직 없음 - 상태만 업데이트
          const { error: updateError } = await supabase
            .from('lineup_status')
            .upsert({
              fixture_id: match.match_id,
              home_team: match.home_team,
              away_team: match.away_team,
              home_team_id: match.home_team_id,
              away_team_id: match.away_team_id,
              lineup_available: false,
              checked_at: new Date().toISOString(),
            }, {
              onConflict: 'fixture_id'
            })

          if (updateError) {
            console.error(`❌ Update error for ${match.match_id}:`, updateError.message)
          } else {
            console.log(`⏳ Lineup not yet: ${match.home_team} vs ${match.away_team}`)
          }
        }

        // API 제한 방지 (0.5초 대기)
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (matchError: any) {
        console.error(`❌ Error checking lineup for ${match.match_id}:`, matchError.message)
        results.errors.push(`${match.home_team} vs ${match.away_team}: ${matchError.message}`)
      }
    }

    console.log('\n🎉 ========== Lineup Collection Completed ==========')
    console.log(`📊 Summary: ${results.totalAvailable}/${results.totalChecked} lineups available`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalChecked: results.totalChecked,
        totalAvailable: results.totalAvailable,
        errorCount: results.errors.length,
      },
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