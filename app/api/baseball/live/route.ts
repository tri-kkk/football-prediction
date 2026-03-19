import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// =====================================================
// 🔴 Baseball Live API
// GET /api/baseball/live
// API-Sports Baseball → 라이브 스코어 실시간 조회
// 동시에 DB 업데이트 (status, score, innings, hits, errors)
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BASEBALL_API_KEY = process.env.API_FOOTBALL_KEY!

// 지원 리그 ID
const SUPPORTED_LEAGUES: Record<number, string> = {
  1:  'KBO',
  2:  'NPB',
  3:  'MLB',
  4:  'CPBL',
  70: 'WBC',
  71: 'MLB', // MLB Spring Training → MLB로 통합
}

export async function GET(request: NextRequest) {
  try {
    if (!BASEBALL_API_KEY) {
      return NextResponse.json({ success: false, error: 'API 키 없음' }, { status: 500 })
    }

    // KST 오늘 날짜
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const today = kst.toISOString().split('T')[0]

    console.log(`🔴 야구 라이브 조회: ${today}`)

    // API-Sports Baseball - 오늘 전체 경기 조회
    const res = await fetch(
      `https://v1.baseball.api-sports.io/games?date=${today}`,
      {
        headers: { 'x-apisports-key': BASEBALL_API_KEY },
        next: { revalidate: 0 },
      }
    )

    if (!res.ok) {
      throw new Error(`API 요청 실패: ${res.status}`)
    }

    const data = await res.json()
    const allGames = data.response || []

    // 라이브 + 오늘 종료 경기 필터 (IN% + FT)
    const liveGames = allGames.filter((g: any) =>
      g.status?.short?.startsWith('IN') || g.status?.short === 'FT'
    )

    console.log(`✅ 전체 ${allGames.length}경기 중 업데이트 대상 ${liveGames.length}경기`)

    if (liveGames.length === 0) {
      return NextResponse.json({ success: true, count: 0, matches: [] })
    }

    // DB 업데이트 (service role key 사용)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 전체(라이브+종료) DB 업데이트, 응답은 라이브만
    const allUpdated = await Promise.all(
      liveGames.map(async (g: any) => {
        const leagueCode = SUPPORTED_LEAGUES[g.league.id] || 'MLB'
        const status = g.status.short
        const isLive = status.startsWith('IN')
        const homeScore = g.scores.home.total ?? 0
        const awayScore = g.scores.away.total ?? 0
        const homeHits = g.scores.home.hits ?? 0
        const awayHits = g.scores.away.hits ?? 0
        const homeErrors = g.scores.home.errors ?? 0
        const awayErrors = g.scores.away.errors ?? 0

        // innings JSON → DB inning 컬럼 형식으로 변환
        const inningData = {
          home: g.scores.home.innings,
          away: g.scores.away.innings,
        }

        // DB upsert - 없으면 INSERT, 있으면 UPDATE
        const { error: updateError } = await supabase
          .from('baseball_matches')
          .upsert({
            api_match_id: g.id,
            league: leagueCode,
            match_date: today,
            match_time: g.time || null,
            match_timestamp: g.timestamp ? new Date(g.timestamp * 1000).toISOString() : null,
            home_team: g.teams.home.name,
            home_team_ko: null,
            home_team_logo: g.teams.home.logo || null,
            home_team_id: g.teams.home.id || null,
            away_team: g.teams.away.name,
            away_team_ko: null,
            away_team_logo: g.teams.away.logo || null,
            away_team_id: g.teams.away.id || null,
            status,
            home_score: homeScore,
            away_score: awayScore,
            home_hits: homeHits,
            away_hits: awayHits,
            home_errors: homeErrors,
            away_errors: awayErrors,
            inning: inningData,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'api_match_id' })

        if (updateError) {
          console.error(`❌ DB upsert 실패 (${g.id}):`, updateError.message)
        } else {
          console.log(`✅ DB upsert: ${g.id} [${status}] ${homeScore}-${awayScore}`)
        }

        if (!isLive) return null // 종료 경기는 응답에서 제외

        return {
          id: g.id,
          league: leagueCode,
          leagueName: g.league.name,
          date: today,
          timestamp: g.timestamp,

          homeTeam: g.teams.home.name,
          homeLogo: g.teams.home.logo,
          homeScore,
          homeHits,
          homeErrors,

          awayTeam: g.teams.away.name,
          awayLogo: g.teams.away.logo,
          awayScore,
          awayHits,
          awayErrors,

          status,
          inningNum: status.replace('IN', ''),
          innings: inningData,
        }
      })
    )

    const matches = allUpdated.filter(Boolean)

    return NextResponse.json({
      success: true,
      count: matches.length,
      matches,
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('❌ 야구 라이브 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message, matches: [] },
      { status: 500 }
    )
  }
}