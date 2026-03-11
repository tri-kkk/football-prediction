import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * MLB 선발투수 수집 API (v2 - mlb_game_pk 기반)
 * GET /api/baseball/collect-mlb-pitchers?days=2
 * GET /api/baseball/collect-mlb-pitchers?days=7
 *
 * mlb_game_pk로 직접 조회하므로 팀명 매핑 불필요
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PitcherStats {
  name: string
  era: number | null
  whip: number | null
  strikeouts: number | null
}

async function getPitcherStats(playerId: number, fallbackName: string): Promise<PitcherStats> {
  const currentYear = new Date().getFullYear()

  for (const season of [currentYear, currentYear - 1]) {
    try {
      const res = await fetch(
        `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&group=pitching&season=${season}`,
        { cache: 'no-store' }
      )
      if (!res.ok) continue

      const data = await res.json()
      const stats = data.stats?.[0]?.splits?.[0]?.stat
      const fullName = data.people?.[0]?.fullName || fallbackName

      if (stats) {
        return {
          name: fullName || fallbackName,
          era: stats.era ? parseFloat(stats.era) : null,
          whip: stats.whip ? parseFloat(stats.whip) : null,
          strikeouts: stats.strikeOuts ?? null,
        }
      }
    } catch {
      continue
    }
  }

  return { name: fallbackName, era: null, whip: null, strikeouts: null }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const daysParam = parseInt(searchParams.get('days') || '2')
    const days = Math.min(daysParam, 7)
    const dateParam = searchParams.get('date') // 특정 날짜 지정 (YYYY-MM-DD)

    // 오늘부터 N일치 날짜 목록 (date 파라미터 있으면 그 날짜 기준)
    const dates: string[] = []
    for (let i = 0; i < days; i++) {
      const d = dateParam ? new Date(dateParam) : new Date()
      d.setDate(d.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }

    // DB에서 해당 날짜 MLB 경기 조회 (mlb_game_pk 있는 것만)
    const { data: dbMatches, error: dbError } = await supabase
      .from('baseball_matches')
      .select('api_match_id, mlb_game_pk, home_team, away_team, match_date')
      .eq('league', 'MLB')
      .in('match_date', dates)
      .not('mlb_game_pk', 'is', null)

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 })
    }

    if (!dbMatches || dbMatches.length === 0) {
      return NextResponse.json({ success: true, processed: 0, updated: 0, results: [] })
    }

    const results: Array<{
      matchId: number
      mlbGamePk: number
      homeTeam: string
      awayTeam: string
      homePitcher: PitcherStats | null
      awayPitcher: PitcherStats | null
      updated: boolean
    }> = []

    for (const match of dbMatches) {
      try {
        // mlb_game_pk로 직접 선발투수 조회
        const res = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule?sportId=1&gamePk=${match.mlb_game_pk}&hydrate=probablePitcher`,
          { cache: 'no-store' }
        )
        if (!res.ok) continue

        const data = await res.json()
        const game = data.dates?.[0]?.games?.[0]
        if (!game) continue

        const homePitcherId: number | undefined = game.teams?.home?.probablePitcher?.id
        const awayPitcherId: number | undefined = game.teams?.away?.probablePitcher?.id
        const homeFallback: string = game.teams?.home?.probablePitcher?.fullName || ''
        const awayFallback: string = game.teams?.away?.probablePitcher?.fullName || ''

        const [homePitcher, awayPitcher] = await Promise.all([
          homePitcherId ? getPitcherStats(homePitcherId, homeFallback) : Promise.resolve(null),
          awayPitcherId ? getPitcherStats(awayPitcherId, awayFallback) : Promise.resolve(null),
        ])

        // DB 업데이트
        const updateData: Record<string, unknown> = {}

        if (homePitcher?.name) {
          updateData.home_starting_pitcher = homePitcher.name
          if (homePitcher.era !== null) updateData.home_pitcher_era = homePitcher.era
          if (homePitcher.whip !== null) updateData.home_pitcher_whip = homePitcher.whip
          if (homePitcher.strikeouts !== null) updateData.home_pitcher_k = homePitcher.strikeouts
        }
        if (awayPitcher?.name) {
          updateData.away_starting_pitcher = awayPitcher.name
          if (awayPitcher.era !== null) updateData.away_pitcher_era = awayPitcher.era
          if (awayPitcher.whip !== null) updateData.away_pitcher_whip = awayPitcher.whip
          if (awayPitcher.strikeouts !== null) updateData.away_pitcher_k = awayPitcher.strikeouts
        }

        let updated = false
        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from('baseball_matches')
            .update(updateData)
            .eq('api_match_id', match.api_match_id)

          updated = !error
          if (error) console.error('Update error:', match.api_match_id, error.message)
        }

        results.push({
          matchId: match.api_match_id,
          mlbGamePk: match.mlb_game_pk,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          homePitcher,
          awayPitcher,
          updated,
        })

      } catch (e) {
        console.error(`Error processing match ${match.api_match_id}:`, e)
      }
    }

    const updatedCount = results.filter((r) => r.updated).length

    return NextResponse.json({
      success: true,
      processed: results.length,
      updated: updatedCount,
      results,
    })

  } catch (error) {
    console.error('MLB pitcher collection error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}