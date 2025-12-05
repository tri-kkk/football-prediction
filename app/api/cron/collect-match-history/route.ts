// app/api/cron/collect-match-history/route.ts
// 선제골 예측 시스템용 경기 데이터 수집 API
// API-Football에서 경기 결과, 선제골, 배당 데이터를 가져와 fg_match_history에 저장
// 승격팀: 이전 시즌 1부 기록이 없으면 자동 판별

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// API-Football 설정
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!
const API_FOOTBALL_HOST = 'v3.football.api-sports.io'

// 리그 설정
const LEAGUES = [
  { id: 39, code: 'PL', name: 'Premier League', country: 'England' },
  { id: 140, code: 'PD', name: 'La Liga', country: 'Spain' },
  { id: 78, code: 'BL1', name: 'Bundesliga', country: 'Germany' },
  { id: 135, code: 'SA', name: 'Serie A', country: 'Italy' },
  { id: 61, code: 'FL1', name: 'Ligue 1', country: 'France' },
  { id: 88, code: 'DED', name: 'Eredivisie', country: 'Netherlands' },
]

// 수집할 시즌
const SEASONS = [2022, 2023, 2024, 2025]

// 승격팀 캐시 (시즌별 팀 목록)
const promotedTeamsCache: Map<string, Set<number>> = new Map()

// API-Football 호출 함수
async function fetchFromApiFootball(endpoint: string): Promise<any> {
  const url = `https://${API_FOOTBALL_HOST}${endpoint}`
  
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': API_FOOTBALL_KEY,
      'x-rapidapi-host': API_FOOTBALL_HOST,
    },
  })

  if (!response.ok) {
    throw new Error(`API-Football error: ${response.status}`)
  }

  const data = await response.json()
  return data
}

// 이전 시즌 팀 목록 가져오기 (승격팀 판별용)
async function getPreviousSeasonTeams(leagueId: number, season: number): Promise<Set<number>> {
  const cacheKey = `${leagueId}-${season}`
  
  if (promotedTeamsCache.has(cacheKey)) {
    return promotedTeamsCache.get(cacheKey)!
  }

  const previousSeason = season - 1
  
  // DB에서 이전 시즌 팀 조회
  const { data: dbTeams } = await supabase
    .from('fg_match_history')
    .select('home_team_id, away_team_id')
    .eq('league_id', leagueId)
    .eq('season', previousSeason.toString())

  const teamIds = new Set<number>()
  
  if (dbTeams && dbTeams.length > 0) {
    dbTeams.forEach((match: any) => {
      if (match.home_team_id) teamIds.add(match.home_team_id)
      if (match.away_team_id) teamIds.add(match.away_team_id)
    })
    console.log(`📋 Found ${teamIds.size} teams from DB for ${leagueId} season ${previousSeason}`)
  } else {
    // DB에 없으면 API에서 조회
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      const teamsData = await fetchFromApiFootball(
        `/teams?league=${leagueId}&season=${previousSeason}`
      )
      
      if (teamsData.response) {
        teamsData.response.forEach((t: any) => {
          if (t.team?.id) teamIds.add(t.team.id)
        })
        console.log(`📋 Found ${teamIds.size} teams from API for ${leagueId} season ${previousSeason}`)
      }
    } catch (e) {
      console.log(`Could not fetch previous season teams for ${leagueId}`)
    }
  }

  promotedTeamsCache.set(cacheKey, teamIds)
  return teamIds
}

// 팀이 승격팀인지 자동 판별
async function checkIfPromoted(
  teamId: number, 
  teamName: string,
  leagueId: number, 
  season: number
): Promise<boolean> {
  // 첫 시즌(2022)은 기준이 없으므로 false
  if (season <= 2022) return false
  
  const previousTeams = await getPreviousSeasonTeams(leagueId, season)
  
  // 이전 시즌에 없었으면 승격팀
  const isPromoted = previousTeams.size > 0 && !previousTeams.has(teamId)
  
  if (isPromoted) {
    console.log(`  🆕 Promoted team detected: ${teamName} (${season})`)
  }
  
  return isPromoted
}

// 선제골 찾기
function findFirstGoal(events: any[], homeTeamId: number, awayTeamId: number): {
  team: string
  minute: number | null
  player: string | null
  type: string | null
} {
  if (!events || events.length === 0) {
    return { team: 'none', minute: null, player: null, type: null }
  }

  const goals = events.filter((e: any) => e.type === 'Goal')
  
  if (goals.length === 0) {
    return { team: 'none', minute: null, player: null, type: null }
  }

  goals.sort((a: any, b: any) => {
    const timeA = (a.time?.elapsed || 0) + (a.time?.extra || 0)
    const timeB = (b.time?.elapsed || 0) + (b.time?.extra || 0)
    return timeA - timeB
  })

  const firstGoal = goals[0]
  const goalTeamId = firstGoal.team?.id

  return {
    team: goalTeamId === homeTeamId ? 'home' : goalTeamId === awayTeamId ? 'away' : 'unknown',
    minute: firstGoal.time?.elapsed || null,
    player: firstGoal.player?.name || null,
    type: firstGoal.detail || 'Normal Goal',
  }
}

// 배당 추출
function extractOdds(oddsData: any): {
  home: number | null
  draw: number | null
  away: number | null
  bookmaker: string | null
} {
  if (!oddsData?.response?.[0]?.bookmakers?.[0]) {
    return { home: null, draw: null, away: null, bookmaker: null }
  }

  const bookmaker = oddsData.response[0].bookmakers[0]
  const matchWinner = bookmaker.bets?.find((b: any) => b.name === 'Match Winner')
  
  if (!matchWinner?.values) {
    return { home: null, draw: null, away: null, bookmaker: bookmaker.name }
  }

  const homeOdd = matchWinner.values.find((v: any) => v.value === 'Home')?.odd
  const drawOdd = matchWinner.values.find((v: any) => v.value === 'Draw')?.odd
  const awayOdd = matchWinner.values.find((v: any) => v.value === 'Away')?.odd

  return {
    home: homeOdd ? parseFloat(homeOdd) : null,
    draw: drawOdd ? parseFloat(drawOdd) : null,
    away: awayOdd ? parseFloat(awayOdd) : null,
    bookmaker: bookmaker.name,
  }
}

// 결과 계산
function calculateResult(homeScore: number, awayScore: number): string {
  if (homeScore > awayScore) return 'HOME'
  if (awayScore > homeScore) return 'AWAY'
  return 'DRAW'
}

// 게임 코드 생성
function generateGameCode(leagueCode: string, season: number): string {
  const shortSeason = `${season.toString().slice(2)}-${(season + 1).toString().slice(2)}`
  return `${leagueCode.toLowerCase()}-${shortSeason}`
}

// 승격팀 플래그 업데이트/생성
async function updatePromotedTeamFlag(
  teamId: number, 
  teamName: string, 
  league: typeof LEAGUES[0], 
  season: number
) {
  const { data: existing } = await supabase
    .from('fg_team_stats')
    .select('id')
    .eq('team_id', teamId)
    .eq('league_id', league.id)
    .eq('season', season.toString())
    .single()

  if (existing) {
    await supabase
      .from('fg_team_stats')
      .update({ is_promoted: true, promotion_factor: 0.85 })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('fg_team_stats')
      .insert({
        team_id: teamId,
        team_name: teamName,
        league_id: league.id,
        league_code: league.code,
        season: season.toString(),
        is_promoted: true,
        promotion_factor: 0.85,
      })
  }
}

// 단일 경기 처리
async function processFixture(
  fixture: any,
  league: typeof LEAGUES[0],
  season: number,
  skipOdds: boolean = false
): Promise<any> {
  const fixtureId = fixture.fixture.id
  
  // 이미 저장된 경기인지 확인
  const { data: existing } = await supabase
    .from('fg_match_history')
    .select('id')
    .eq('fixture_id', fixtureId)
    .single()

  if (existing) {
    return { skipped: true, fixtureId }
  }

  const homeTeamName = fixture.teams.home.name
  const awayTeamName = fixture.teams.away.name
  const homeTeamId = fixture.teams.home.id
  const awayTeamId = fixture.teams.away.id

  // 1. 이벤트 데이터 가져오기 (선제골용)
  await new Promise(resolve => setTimeout(resolve, 200))
  let events: any[] = []
  try {
    const eventsData = await fetchFromApiFootball(`/fixtures/events?fixture=${fixtureId}`)
    events = eventsData.response || []
  } catch (e) {
    console.log(`Events not available for fixture ${fixtureId}`)
  }

  // 2. 배당 데이터 가져오기
  let odds = { home: null, draw: null, away: null, bookmaker: null }
  if (!skipOdds) {
    await new Promise(resolve => setTimeout(resolve, 200))
    try {
      const oddsData = await fetchFromApiFootball(`/odds?fixture=${fixtureId}&bet=1`)
      odds = extractOdds(oddsData)
    } catch (e) {
      console.log(`Odds not available for fixture ${fixtureId}`)
    }
  }

  // 3. 선제골 분석
  const firstGoal = findFirstGoal(events, homeTeamId, awayTeamId)

  // 4. 스코어 계산
  const homeScore = fixture.goals.home ?? 0
  const awayScore = fixture.goals.away ?? 0
  const htHome = fixture.score.halftime.home ?? 0
  const htAway = fixture.score.halftime.away ?? 0

  // 5. 승격팀 자동 판별
  const homeIsPromoted = await checkIfPromoted(homeTeamId, homeTeamName, league.id, season)
  const awayIsPromoted = await checkIfPromoted(awayTeamId, awayTeamName, league.id, season)

  // 6. 데이터 구성
  const matchData = {
    fixture_id: fixtureId,
    league_id: league.id,
    league_name: league.name,
    league_code: league.code,
    season: season.toString(),
    game_code: generateGameCode(league.code, season),
    
    match_date: fixture.fixture.date.split('T')[0],
    match_time: fixture.fixture.date.split('T')[1]?.slice(0, 5) || null,
    round: fixture.league.round,
    venue: fixture.fixture.venue?.name || null,
    
    home_team_id: homeTeamId,
    home_team: homeTeamName,
    away_team_id: awayTeamId,
    away_team: awayTeamName,
    
    home_score: homeScore,
    away_score: awayScore,
    first_half_home: htHome,
    first_half_away: htAway,
    second_half_home: homeScore - htHome,
    second_half_away: awayScore - htAway,
    
    odds_home: odds.home,
    odds_draw: odds.draw,
    odds_away: odds.away,
    odds_bookmaker: odds.bookmaker,
    
    first_goal_team: firstGoal.team,
    first_goal_minute: firstGoal.minute,
    first_goal_player: firstGoal.player,
    first_goal_type: firstGoal.type,
    
    result: calculateResult(homeScore, awayScore),
    winner: homeScore > awayScore ? homeTeamName :
            awayScore > homeScore ? awayTeamName : 'DRAW',
    
    status: 'FINISHED',
    data_source: 'api',
    is_verified: true,
  }

  // 7. DB 저장
  const { error } = await supabase
    .from('fg_match_history')
    .insert(matchData)

  if (error) {
    console.error(`Error inserting fixture ${fixtureId}:`, error.message)
    return { error: error.message, fixtureId }
  }

  // 8. 승격팀 플래그 저장
  if (homeIsPromoted) {
    await updatePromotedTeamFlag(homeTeamId, homeTeamName, league, season)
  }
  if (awayIsPromoted) {
    await updatePromotedTeamFlag(awayTeamId, awayTeamName, league, season)
  }

  return { 
    inserted: true, 
    fixtureId, 
    homeTeam: homeTeamName, 
    awayTeam: awayTeamName,
    firstGoal: firstGoal.team,
    promoted: { home: homeIsPromoted, away: awayIsPromoted }
  }
}

// 리그+시즌 수집
async function collectLeagueSeason(
  league: typeof LEAGUES[0],
  season: number,
  skipOdds: boolean = false
): Promise<{ collected: number; skipped: number; errors: number }> {
  console.log(`\n📊 Collecting: ${league.name} ${season}-${season+1}`)
  
  // 완료된 경기 목록 가져오기
  const fixturesData = await fetchFromApiFootball(
    `/fixtures?league=${league.id}&season=${season}&status=FT`
  )
  
  const fixtures = fixturesData.response || []
  console.log(`Found ${fixtures.length} finished matches`)

  let collected = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < fixtures.length; i++) {
    const fixture = fixtures[i]
    
    try {
      const result = await processFixture(fixture, league, season, skipOdds)
      
      if (result.skipped) {
        skipped++
      } else if (result.inserted) {
        collected++
        if (collected % 20 === 0) {
          console.log(`  Progress: ${collected}/${fixtures.length - skipped} new (${skipped} skipped)`)
        }
      } else if (result.error) {
        errors++
      }
    } catch (e: any) {
      console.error(`Error processing fixture:`, e.message)
      errors++
    }

    // API Rate limit 방지
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log(`✅ ${league.name} ${season}: ${collected} new, ${skipped} skipped, ${errors} errors`)
  return { collected, skipped, errors }
}

// GET: 상태 확인
export async function GET(request: NextRequest) {
  const { data, count } = await supabase
    .from('fg_match_history')
    .select('*', { count: 'exact', head: true })

  const { data: byLeague } = await supabase
    .from('fg_match_history')
    .select('league_code, season')

  const stats: Record<string, Record<string, number>> = {}
  byLeague?.forEach((row: any) => {
    if (!stats[row.league_code]) stats[row.league_code] = {}
    stats[row.league_code][row.season] = (stats[row.league_code][row.season] || 0) + 1
  })

  // 승격팀 목록
  const { data: promoted } = await supabase
    .from('fg_team_stats')
    .select('team_name, league_code, season')
    .eq('is_promoted', true)

  return NextResponse.json({
    status: 'ready',
    totalMatches: count || 0,
    byLeagueSeason: stats,
    promotedTeams: promoted || [],
    supportedLeagues: LEAGUES.map(l => ({ code: l.code, name: l.name })),
    supportedSeasons: SEASONS.map(s => `${s}-${s+1}`),
    currentSeason: '2025-26',
    usage: {
      status: 'GET /api/cron/collect-match-history',
      collectAll: 'POST { "mode": "all" }',
      collectAllFast: 'POST { "mode": "all", "skipOdds": true }',
      collectLeague: 'POST { "mode": "league", "league": "PL", "season": 2025 }',
      collectRecent: 'POST { "mode": "recent", "days": 7 }',
    },
    note: '승격팀은 이전 시즌 1부 기록 없으면 자동 판별됩니다.'
  })
}

// POST: 데이터 수집 실행
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, league: leagueCode, season, days, skipOdds = false } = body

    const startTime = Date.now()
    let totalCollected = 0
    let totalSkipped = 0
    let totalErrors = 0

    // 캐시 초기화
    promotedTeamsCache.clear()

    if (mode === 'all') {
      // 전체 수집 (모든 리그, 모든 시즌) - 순서대로!
      for (const s of SEASONS) {
        for (const league of LEAGUES) {
          const result = await collectLeagueSeason(league, s, skipOdds)
          totalCollected += result.collected
          totalSkipped += result.skipped
          totalErrors += result.errors
          
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    } else if (mode === 'league' && leagueCode && season) {
      const league = LEAGUES.find(l => l.code === leagueCode)
      if (!league) {
        return NextResponse.json({ error: `Unknown league: ${leagueCode}` }, { status: 400 })
      }
      
      const result = await collectLeagueSeason(league, season, skipOdds)
      totalCollected = result.collected
      totalSkipped = result.skipped
      totalErrors = result.errors
      
    } else if (mode === 'recent') {
      const daysBack = days || 3
      const toDate = new Date().toISOString().split('T')[0]
      const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      for (const league of LEAGUES) {
        console.log(`\n📊 Recent matches: ${league.name}`)
        
        const fixturesData = await fetchFromApiFootball(
          `/fixtures?league=${league.id}&season=2025&from=${fromDate}&to=${toDate}&status=FT`
        )
        
        const fixtures = fixturesData.response || []
        console.log(`Found ${fixtures.length} recent matches`)
        
        for (const fixture of fixtures) {
          try {
            const result = await processFixture(fixture, league, 2025, skipOdds)
            if (result.inserted) totalCollected++
            else if (result.skipped) totalSkipped++
            else totalErrors++
          } catch (e) {
            totalErrors++
          }
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } else {
      return NextResponse.json({
        error: 'Invalid mode. Use: all, league, or recent',
        examples: {
          all: { mode: 'all' },
          allFast: { mode: 'all', skipOdds: true },
          league: { mode: 'league', league: 'PL', season: 2025 },
          recent: { mode: 'recent', days: 7 },
        }
      }, { status: 400 })
    }

    const duration = Math.round((Date.now() - startTime) / 1000)

    return NextResponse.json({
      success: true,
      mode,
      collected: totalCollected,
      skipped: totalSkipped,
      errors: totalErrors,
      duration: `${Math.floor(duration / 60)}m ${duration % 60}s`,
    })

  } catch (error: any) {
    console.error('Collection error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}