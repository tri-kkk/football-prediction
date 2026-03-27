// app/api/baseball/sync-pitchers/route.ts
// MLB Stats API에서 선발투수 정보를 가져와 baseball_matches 테이블에 업데이트
// GET /api/baseball/sync-pitchers?date=2026-03-28  (KST 날짜 지정)
// GET /api/baseball/sync-pitchers  (오늘 KST 날짜)
//
// [v4] 핵심 수정: match_timestamp(UTC) ↔ MLB gameDate(UTC) 직접 비교
//      match_date(KST) vs officialDate(미국현지) 불일치 문제 완전 해결

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
  // date 파라미터는 KST 기준 날짜 (사용자에게 보이는 날짜)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  console.log(`🔍 Syncing pitchers for KST date: ${date}`)

  try {
    // 1. DB에서 ±1일 범위 MLB 경기 조회
    const dateFrom = addDays(date, -1)
    const dateTo = addDays(date, 1)

    const { data: dbMatches, error: dbError } = await supabase
      .from('baseball_matches')
      .select('id, api_match_id, home_team, away_team, match_date, match_time, match_timestamp')
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

    // 2. MLB Stats API에서 4일치 조회
    // officialDate가 미국 현지시간 기준이므로 넉넉하게 fetch
    const mlbGamePool: any[] = []
    const fetchDates = [addDays(date, -2), addDays(date, -1), date, addDays(date, 1)]

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
        message: `No games from MLB API`,
        updated: 0,
      })
    }

    // 3. 매핑 & 업데이트
    // ✅ [v4 핵심] match_timestamp(UTC) ↔ MLB gameDate(UTC) 시간 차이로 매칭
    // 같은 경기라면 두 UTC 값의 차이가 30분 이내여야 함
    const results = []
    let updatedCount = 0
    const usedGamePks = new Set<number>()

    // DB 매치를 시간순 정렬
    const sortedDbMatches = [...dbMatches].sort((a, b) => {
      const tsA = a.match_timestamp || (a.match_date + 'T' + (a.match_time || '00:00:00') + 'Z')
      const tsB = b.match_timestamp || (b.match_date + 'T' + (b.match_time || '00:00:00') + 'Z')
      return new Date(tsA).getTime() - new Date(tsB).getTime()
    })

    for (const dbMatch of sortedDbMatches) {
      const dbHome = normalizeName(dbMatch.home_team)
      const dbAway = normalizeName(dbMatch.away_team)

      // DB match_timestamp → UTC milliseconds
      const dbTimestamp = dbMatch.match_timestamp
        ? new Date(dbMatch.match_timestamp).getTime()
        : null

      // ✅ 팀 이름 매칭 + UTC 시간 30분 이내 필터
      const candidates = uniqueGames
        .filter((g: any) => {
          if (usedGamePks.has(g.gamePk)) return false

          // 팀 이름 매칭
          const mlbHome = normalizeName(g.teams?.home?.team?.name || '')
          const mlbAway = normalizeName(g.teams?.away?.team?.name || '')
          const teamMatch =
            (mlbHome === dbHome && mlbAway === dbAway) ||
            (mlbHome === dbAway && mlbAway === dbHome)
          if (!teamMatch) return false

          // UTC 시간 매칭: 30분 이내만 허용
          if (dbTimestamp && g.gameDate) {
            const mlbTimestamp = new Date(g.gameDate).getTime()
            const diffMinutes = Math.abs(mlbTimestamp - dbTimestamp) / (1000 * 60)
            if (diffMinutes > 30) {
              console.log(
                `⚠️ 시간 불일치 제외: DB ${new Date(dbTimestamp).toISOString()} vs MLB ${g.gameDate} (diff: ${Math.round(diffMinutes)}분) - ${dbMatch.home_team} vs ${dbMatch.away_team}`
              )
              return false
            }
          }

          return true
        })
        .sort((a: any, b: any) => {
          if (!dbTimestamp) return 0
          const diffA = Math.abs(new Date(a.gameDate || 0).getTime() - dbTimestamp)
          const diffB = Math.abs(new Date(b.gameDate || 0).getTime() - dbTimestamp)
          return diffA - diffB
        })

      const mlbGame = candidates[0] || null
      if (mlbGame) usedGamePks.add(mlbGame.gamePk)

      if (!mlbGame) {
        results.push({
          match: `${dbMatch.home_team} vs ${dbMatch.away_team}`,
          date: dbMatch.match_date,
          dbTimestamp: dbMatch.match_timestamp,
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
          dbTimestamp: dbMatch.match_timestamp,
          mlbGameDate: mlbGame.gameDate,
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