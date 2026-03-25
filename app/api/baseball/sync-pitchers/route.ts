// app/api/baseball/sync-pitchers/route.ts
// MLB Stats API에서 선발투수 정보를 가져와 baseball_matches 테이블에 업데이트
// GET /api/baseball/sync-pitchers?date=2026-03-12  (날짜 지정)
// GET /api/baseball/sync-pitchers  (오늘 날짜)
// 
// [v2] UTC 오프셋 문제 해결: MLB API를 전날/오늘/내일 3일치 조회 후 pool 합산

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MLB_API = 'https://statsapi.mlb.com/api/v1'

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  console.log(`🔍 Syncing pitchers for date: ${date}`)

  try {
    // 1. DB에서 전날 ~ 내일 MLB 정규시즌 경기 조회 (스프링트레이닝 제외)
    const dateFrom = addDays(date, -1)
    const dateTo = addDays(date, 1)

    const { data: dbMatches, error: dbError } = await supabase
      .from('baseball_matches')
      .select('id, api_match_id, home_team, away_team, match_date')
      .eq('league', 'MLB')
      .eq('is_spring_training', false)
      .gte('match_date', dateFrom)
      .lte('match_date', dateTo)

    if (dbError) throw dbError

    if (!dbMatches || dbMatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No MLB regular season matches found in DB for ${dateFrom} ~ ${dateTo}`,
        updated: 0,
      })
    }

    console.log(`📋 Found ${dbMatches.length} MLB matches in DB (${dateFrom} ~ ${dateTo})`)

    // 2. MLB Stats API에서 전날/오늘/내일 3일치 조회 → 전체 pool 합산
    // UTC 오프셋으로 날짜가 하루 엇갈리는 문제 방지
    const mlbGamePool: any[] = []
    const fetchDates = [addDays(date, -1), date, addDays(date, 1)]

    for (const fetchDate of fetchDates) {
      try {
        const res = await fetch(
          `${MLB_API}/schedule?sportId=1&date=${fetchDate}&hydrate=probablePitcher(note)`,
          {
            headers: { 'User-Agent': 'TrendSoccer/1.0' },
            signal: AbortSignal.timeout(8000),
          }
        )
        if (!res.ok) continue

        const data = await res.json()
        const games = data.dates?.[0]?.games || []
        console.log(`⚾ MLB API ${fetchDate}: ${games.length}경기`)
        mlbGamePool.push(...games)
      } catch (e) {
        console.error(`MLB API fetch error for ${fetchDate}:`, e)
      }
    }

    // gamePk 기준 중복 제거
    const seenPks = new Set<number>()
    const uniqueGames = mlbGamePool.filter((g) => {
      if (seenPks.has(g.gamePk)) return false
      seenPks.add(g.gamePk)
      return true
    })

    console.log(`⚾ Total unique MLB games in pool: ${uniqueGames.length}`)

    if (uniqueGames.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No games from MLB API for ${dateFrom} ~ ${dateTo}`,
        updated: 0,
      })
    }

    // 3. 매핑 & 업데이트
    const results = []
    let updatedCount = 0

    for (const dbMatch of dbMatches) {
      const dbHome = normalizeName(dbMatch.home_team)
      const dbAway = normalizeName(dbMatch.away_team)

      const mlbGame = uniqueGames.find((g: any) => {
        const mlbHome = normalizeName(g.teams?.home?.team?.name || '')
        const mlbAway = normalizeName(g.teams?.away?.team?.name || '')
        return (
          (mlbHome === dbHome && mlbAway === dbAway) ||
          (mlbHome === dbAway && mlbAway === dbHome)
        )
      })

      if (!mlbGame) {
        results.push({
          match: `${dbMatch.home_team} vs ${dbMatch.away_team}`,
          date: dbMatch.match_date,
          status: 'NOT_MATCHED',
        })
        continue
      }

      const homePitcher = mlbGame.teams?.home?.probablePitcher
      const awayPitcher = mlbGame.teams?.away?.probablePitcher

      if (!homePitcher && !awayPitcher) {
        results.push({
          match: `${dbMatch.home_team} vs ${dbMatch.away_team}`,
          date: dbMatch.match_date,
          status: 'NO_PITCHER',
        })
        continue
      }

      const updateData: Record<string, any> = {}

      if (homePitcher) {
        updateData.home_pitcher = homePitcher.fullName
        updateData.home_pitcher_id = homePitcher.id
        const homeStats = homePitcher.stats?.[0]?.stats
        if (homeStats?.era) updateData.home_pitcher_era = parseFloat(homeStats.era)
      }

      if (awayPitcher) {
        updateData.away_pitcher = awayPitcher.fullName
        updateData.away_pitcher_id = awayPitcher.id
        const awayStats = awayPitcher.stats?.[0]?.stats
        if (awayStats?.era) updateData.away_pitcher_era = parseFloat(awayStats.era)
      }

      const { error: updateError } = await supabase
        .from('baseball_matches')
        .update(updateData)
        .eq('id', dbMatch.id)

      if (updateError) {
        results.push({
          match: `${dbMatch.home_team} vs ${dbMatch.away_team}`,
          date: dbMatch.match_date,
          status: 'UPDATE_ERROR',
          error: updateError.message,
        })
      } else {
        updatedCount++
        results.push({
          match: `${dbMatch.home_team} vs ${dbMatch.away_team}`,
          date: dbMatch.match_date,
          status: 'UPDATED',
          homePitcher: homePitcher?.fullName || null,
          awayPitcher: awayPitcher?.fullName || null,
        })
      }
    }

    console.log(`✅ Updated ${updatedCount}/${dbMatches.length} matches`)

    return NextResponse.json({
      success: true,
      date,
      dateRange: `${dateFrom} ~ ${dateTo}`,
      dbMatches: dbMatches.length,
      mlbGamesInPool: uniqueGames.length,
      updated: updatedCount,
      results,
    })

  } catch (error: any) {
    console.error('❌ Sync pitchers error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}