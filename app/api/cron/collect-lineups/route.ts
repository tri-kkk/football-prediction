import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const APIFOOTBALL_KEY = process.env.APIFOOTBALL_KEY!

export async function GET(request: Request) {
  try {
    console.log('🔄 Starting lineup collection...')

    // 오늘과 내일의 예정된 경기 가져오기
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayStr = today.toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    console.log(`📅 Checking matches for: ${todayStr} and ${tomorrowStr}`)

    // API-Football에서 경기 목록 가져오기
    const leagues = ['39', '140', '78', '135', '61', '2'] // PL, PD, BL1, SA, FL1, CL
    let totalUpdated = 0
    let totalChecked = 0

    for (const leagueId of leagues) {
      // 오늘 경기
      await checkLeagueLineups(leagueId, todayStr)
      // 내일 경기
      await checkLeagueLineups(leagueId, tomorrowStr)
    }

    async function checkLeagueLineups(leagueId: string, date: string) {
      try {
        // 경기 목록 조회
        const fixturesResponse = await fetch(
          `https://v3.football.api-sports.io/fixtures?league=${leagueId}&date=${date}&season=2024`,
          {
            headers: {
              'x-rapidapi-key': APIFOOTBALL_KEY,
              'x-rapidapi-host': 'v3.football.api-sports.io',
            },
          }
        )

        if (!fixturesResponse.ok) {
          throw new Error(`API request failed: ${fixturesResponse.status}`)
        }

        const fixturesData = await fixturesResponse.json()
        const fixtures = fixturesData.response || []

        console.log(`📋 League ${leagueId}, Date ${date}: ${fixtures.length} fixtures`)

        for (const fixture of fixtures) {
          totalChecked++
          const fixtureId = fixture.fixture.id

          // 라인업 조회 시도
          const lineupResponse = await fetch(
            `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
            {
              headers: {
                'x-rapidapi-key': APIFOOTBALL_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io',
              },
            }
          )

          if (!lineupResponse.ok) {
            console.log(`⚠️ Fixture ${fixtureId}: API error`)
            continue
          }

          const lineupData = await lineupResponse.json()
          const lineups = lineupData.response || []

          // 라인업이 있는지 확인
          const hasLineup = lineups.length === 2 && 
            lineups[0]?.startXI?.length > 0 && 
            lineups[1]?.startXI?.length > 0

          if (hasLineup) {
            const homeLineup = lineups[0]
            const awayLineup = lineups[1]

            // Supabase에 저장
            const { error: upsertError } = await supabase
              .from('lineup_status')
              .upsert({
                fixture_id: fixtureId,
                league_id: parseInt(leagueId),
                fixture_date: date,
                lineup_available: true,
                home_team: homeLineup.team.name,
                away_team: awayLineup.team.name,
                home_formation: homeLineup.formation,
                away_formation: awayLineup.formation,
                home_coach: homeLineup.coach.name,
                away_coach: awayLineup.coach.name,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'fixture_id'
              })

            if (upsertError) {
              console.error(`❌ Fixture ${fixtureId}: DB error`, upsertError)
            } else {
              console.log(`✅ Fixture ${fixtureId}: Lineup available! ${homeLineup.formation} vs ${awayLineup.formation}`)
              totalUpdated++
            }
          } else {
            // 라인업 없음 - 상태만 업데이트
            const { error: upsertError } = await supabase
              .from('lineup_status')
              .upsert({
                fixture_id: fixtureId,
                league_id: parseInt(leagueId),
                fixture_date: date,
                lineup_available: false,
                home_team: fixture.teams.home.name,
                away_team: fixture.teams.away.name,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'fixture_id'
              })

            if (!upsertError) {
              console.log(`⏳ Fixture ${fixtureId}: No lineup yet`)
            }
          }

          // API 호출 제한 방지 (200ms 대기)
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      } catch (error) {
        console.error(`Error checking league ${leagueId}:`, error)
      }
    }

    console.log(`✅ Lineup collection completed: ${totalUpdated} updated out of ${totalChecked} checked`)

    return NextResponse.json({
      success: true,
      message: 'Lineup collection completed',
      stats: {
        checked: totalChecked,
        updated: totalUpdated,
      },
    })

  } catch (error: any) {
    console.error('❌ Error in lineup collection:', error)
    return NextResponse.json(
      { 
        error: 'Failed to collect lineups',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
