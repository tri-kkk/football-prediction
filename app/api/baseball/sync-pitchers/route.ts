// app/api/baseball/sync-pitchers/route.ts
// MLB Stats API에서 선발투수 정보를 가져와 baseball_matches 테이블에 업데이트
// GET /api/baseball/sync-pitchers?date=2026-03-12  (날짜 지정)
// GET /api/baseball/sync-pitchers  (오늘 날짜)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// MLB Stats API - 키 불필요, 무료
const MLB_API = 'https://statsapi.mlb.com/api/v1'

// DB 팀명 → MLB Stats API 팀명 매핑
// (MLB API는 teamId로 매칭하는 게 더 정확하지만 이름으로도 가능)
const TEAM_NAME_MAP: Record<string, string[]> = {
  'Arizona Diamondbacks': ['Arizona Diamondbacks', 'D-backs'],
  'Atlanta Braves': ['Atlanta Braves', 'Braves'],
  'Baltimore Orioles': ['Baltimore Orioles', 'Orioles'],
  'Boston Red Sox': ['Boston Red Sox', 'Red Sox'],
  'Chicago Cubs': ['Chicago Cubs', 'Cubs'],
  'Chicago White Sox': ['Chicago White Sox', 'White Sox'],
  'Cincinnati Reds': ['Cincinnati Reds', 'Reds'],
  'Cleveland Guardians': ['Cleveland Guardians', 'Guardians'],
  'Colorado Rockies': ['Colorado Rockies', 'Rockies'],
  'Detroit Tigers': ['Detroit Tigers', 'Tigers'],
  'Houston Astros': ['Houston Astros', 'Astros'],
  'Kansas City Royals': ['Kansas City Royals', 'Royals'],
  'Los Angeles Angels': ['Los Angeles Angels', 'Angels'],
  'Los Angeles Dodgers': ['Los Angeles Dodgers', 'Dodgers'],
  'Miami Marlins': ['Miami Marlins', 'Marlins'],
  'Milwaukee Brewers': ['Milwaukee Brewers', 'Brewers'],
  'Minnesota Twins': ['Minnesota Twins', 'Twins'],
  'New York Mets': ['New York Mets', 'Mets'],
  'New York Yankees': ['New York Yankees', 'Yankees'],
  'Oakland Athletics': ['Oakland Athletics', 'Athletics', "A's"],
  'Philadelphia Phillies': ['Philadelphia Phillies', 'Phillies'],
  'Pittsburgh Pirates': ['Pittsburgh Pirates', 'Pirates'],
  'San Diego Padres': ['San Diego Padres', 'Padres'],
  'San Francisco Giants': ['San Francisco Giants', 'Giants'],
  'Seattle Mariners': ['Seattle Mariners', 'Mariners'],
  'St.Louis Cardinals': ['St. Louis Cardinals', 'Cardinals'],  // DB는 St.Louis (점 뒤 공백 없음)
  'St. Louis Cardinals': ['St. Louis Cardinals', 'Cardinals'],
  'Tampa Bay Rays': ['Tampa Bay Rays', 'Rays'],
  'Texas Rangers': ['Texas Rangers', 'Rangers'],
  'Toronto Blue Jays': ['Toronto Blue Jays', 'Blue Jays'],
  'Washington Nationals': ['Washington Nationals', 'Nationals'],
}

// 팀명 정규화 (비교용)
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
}

// DB 팀명 → MLB API 팀명 변환
function mapTeamName(dbTeam: string): string {
  const mapped = TEAM_NAME_MAP[dbTeam]
  return mapped ? mapped[0] : dbTeam
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  console.log(`🔍 Syncing pitchers for date: ${date}`)

  try {
    // 1. DB에서 해당 날짜 MLB 경기 조회
    const { data: dbMatches, error: dbError } = await supabase
      .from('baseball_matches')
      .select('id, api_match_id, home_team, away_team, match_date')
      .eq('league', 'MLB')
      .eq('match_date', date)

    if (dbError) throw dbError

    if (!dbMatches || dbMatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No MLB matches found in DB for ${date}`,
        updated: 0,
      })
    }

    console.log(`📋 Found ${dbMatches.length} MLB matches in DB for ${date}`)

    // 2. MLB Stats API에서 해당 날짜 스케줄 조회
    // sportId=1: MLB 정규시즌
    // sportId=17: 스프링트레이닝 (Cactus/Grapefruit League)
    const mlbRes = await fetch(
      `${MLB_API}/schedule?sportId=1,17&date=${date}&hydrate=probablePitcher(note)`,
      {
        headers: { 'User-Agent': 'TrendSoccer/1.0' },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!mlbRes.ok) {
      throw new Error(`MLB API error: ${mlbRes.status}`)
    }

    const mlbData = await mlbRes.json()
    const mlbGames = mlbData.dates?.[0]?.games || []

    console.log(`⚾ Found ${mlbGames.length} games from MLB Stats API`)

    if (mlbGames.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No games from MLB API for ${date}`,
        updated: 0,
      })
    }

    // 3. 매핑 & 업데이트
    const results = []
    let updatedCount = 0

    for (const dbMatch of dbMatches) {
      const dbHome = normalizeName(dbMatch.home_team)
      const dbAway = normalizeName(dbMatch.away_team)

      // MLB API 경기와 팀명 매핑
      const mlbGame = mlbGames.find((g: any) => {
        const mlbHome = normalizeName(g.teams?.home?.team?.name || '')
        const mlbAway = normalizeName(g.teams?.away?.team?.name || '')
        return mlbHome === dbHome && mlbAway === dbAway
      })

      if (!mlbGame) {
        // 정규화 후에도 못 찾으면 부분 매칭 시도
        const mlbGameFuzzy = mlbGames.find((g: any) => {
          const mlbHome = normalizeName(g.teams?.home?.team?.name || '')
          const mlbAway = normalizeName(g.teams?.away?.team?.name || '')
          return mlbHome.includes(dbHome.split(' ').pop()!) ||
                 mlbAway.includes(dbAway.split(' ').pop()!)
        })

        if (!mlbGameFuzzy) {
          results.push({ match: `${dbMatch.home_team} vs ${dbMatch.away_team}`, status: 'NOT_MATCHED' })
          continue
        }
      }

      const game = mlbGame || mlbGames.find((g: any) => {
        const mlbHome = normalizeName(g.teams?.home?.team?.name || '')
        const mlbAway = normalizeName(g.teams?.away?.team?.name || '')
        return mlbHome.includes(dbHome.split(' ').pop()!) ||
               mlbAway.includes(dbAway.split(' ').pop()!)
      })

      const homePitcher = game.teams?.home?.probablePitcher
      const awayPitcher = game.teams?.away?.probablePitcher

      // 선발투수 없으면 skip
      if (!homePitcher && !awayPitcher) {
        results.push({ match: `${dbMatch.home_team} vs ${dbMatch.away_team}`, status: 'NO_PITCHER' })
        continue
      }

      // DB 업데이트
      const updateData: Record<string, any> = {}

      if (homePitcher) {
        updateData.home_pitcher = homePitcher.fullName
        updateData.home_pitcher_id = homePitcher.id
        // ERA 등 stats가 있으면 업데이트
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
        results.push({ match: `${dbMatch.home_team} vs ${dbMatch.away_team}`, status: 'UPDATE_ERROR', error: updateError.message })
      } else {
        updatedCount++
        results.push({
          match: `${dbMatch.home_team} vs ${dbMatch.away_team}`,
          status: 'UPDATED',
          homePitcher: homePitcher?.fullName || null,
          homePitcherId: homePitcher?.id || null,
          awayPitcher: awayPitcher?.fullName || null,
          awayPitcherId: awayPitcher?.id || null,
        })
      }
    }

    console.log(`✅ Updated ${updatedCount}/${dbMatches.length} matches`)

    return NextResponse.json({
      success: true,
      date,
      dbMatches: dbMatches.length,
      mlbGames: mlbGames.length,
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
