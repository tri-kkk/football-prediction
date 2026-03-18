import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// =====================================================
// Baseball Matches API - 프론트엔드용
// GET /api/baseball/matches
// ✅ ML 예측값(mlPrediction) 추가 - 원본 구조 유지
// =====================================================

const TEAM_NAME_KO: Record<string, string> = {
  'Hanwha Eagles': '한화', 'LG Twins': 'LG', 'Kiwoom Heroes': '키움',
  'Lotte Giants': '롯데', 'Samsung Lions': '삼성', 'Doosan Bears': '두산',
  'KT Wiz Suwon': 'KT', 'KT Wiz': 'KT', 'KIA Tigers': 'KIA',
  'NC Dinos': 'NC', 'SSG Landers': 'SSG',
  'Hanshin Tigers': '한신', 'Yomiuri Giants': '요미우리',
  'Hiroshima Carp': '히로시마', 'Hiroshima Toyo Carp': '히로시마',
  'Yakult Swallows': '야쿠르트', 'Yokohama BayStars': '요코하마',
  'Yokohama DeNA BayStars': '요코하마', 'Chunichi Dragons': '주니치',
  'Fukuoka S. Hawks': '소프트뱅크', 'SoftBank Hawks': '소프트뱅크',
  'Orix Buffaloes': '오릭스', 'Chiba Lotte Marines': '지바롯데',
  'Lotte Marines': '지바롯데', 'Rakuten Gold. Eagles': '라쿠텐',
  'Rakuten Eagles': '라쿠텐', 'Seibu Lions': '세이부',
  'Nippon Ham Fighters': '니혼햄',
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 상세 페이지 predict/route.ts와 동일한 Railway ML 서버
const RAILWAY_URL = 'https://web-production-efc2e.up.railway.app'
const WINDOW = 10
const PITCHER_DEFAULTS = { era: 4.20, whip: 1.30, k: 150 }

async function getTeamStats(supabase: any, team: string, beforeDate: string) {
  const [{ data: homeGames }, { data: awayGames }] = await Promise.all([
    supabase
      .from('baseball_matches')
      .select('home_score, away_score, home_hits, match_date')
      .eq('home_team', team).eq('status', 'FT').eq('league', 'MLB')
      .lt('match_date', beforeDate).order('match_date', { ascending: false }).limit(WINDOW),
    supabase
      .from('baseball_matches')
      .select('home_score, away_score, away_hits, match_date')
      .eq('away_team', team).eq('status', 'FT').eq('league', 'MLB')
      .lt('match_date', beforeDate).order('match_date', { ascending: false }).limit(WINDOW),
  ])

  const all: Array<{ scored: number; conceded: number; hits: number; won: number; is_home: number; match_date: string }> = []
  for (const g of homeGames || []) {
    all.push({ scored: g.home_score, conceded: g.away_score, hits: g.home_hits ?? 8, won: g.home_score > g.away_score ? 1 : 0, is_home: 1, match_date: g.match_date })
  }
  for (const g of awayGames || []) {
    all.push({ scored: g.away_score, conceded: g.home_score, hits: g.away_hits ?? 8, won: g.away_score > g.home_score ? 1 : 0, is_home: 0, match_date: g.match_date })
  }
  all.sort((a, b) => a.match_date.localeCompare(b.match_date))
  const recent = all.slice(-WINDOW)
  const recent5 = recent.slice(-5)
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0.5
  const homeOnly = recent.filter(g => g.is_home === 1)
  const awayOnly = recent.filter(g => g.is_home === 0)

  return {
    win_pct: avg(recent.map(g => g.won)),
    avg_scored: avg(recent.map(g => g.scored)),
    avg_conceded: avg(recent.map(g => g.conceded)),
    avg_hits: avg(recent.map(g => g.hits)),
    home_win_pct: homeOnly.length > 0 ? avg(homeOnly.map(g => g.won)) : 0.5,
    away_win_pct: awayOnly.length > 0 ? avg(awayOnly.map(g => g.won)) : 0.5,
    recent_form: avg(recent5.map(g => g.won)),
    run_diff: avg(recent.map(g => g.scored - g.conceded)),
  }
}

async function fetchMLPrediction(
  supabase: any,
  homeTeam: string,
  awayTeam: string,
  matchDate: string,
  pitcher: {
    home_pitcher_era: number | null
    home_pitcher_whip: number | null
    home_pitcher_k: number | null
    away_pitcher_era: number | null
    away_pitcher_whip: number | null
    away_pitcher_k: number | null
  }
): Promise<{ homeWinProb: number; awayWinProb: number } | null> {
  try {
    const [homeStats, awayStats] = await Promise.all([
      getTeamStats(supabase, homeTeam, matchDate),
      getTeamStats(supabase, awayTeam, matchDate),
    ])

    const hEra = pitcher.home_pitcher_era ?? PITCHER_DEFAULTS.era
    const hWhip = pitcher.home_pitcher_whip ?? PITCHER_DEFAULTS.whip
    const hK = pitcher.home_pitcher_k ?? PITCHER_DEFAULTS.k
    const aEra = pitcher.away_pitcher_era ?? PITCHER_DEFAULTS.era
    const aWhip = pitcher.away_pitcher_whip ?? PITCHER_DEFAULTS.whip
    const aK = pitcher.away_pitcher_k ?? PITCHER_DEFAULTS.k

    const features = {
      home_win_pct: homeStats.win_pct,
      home_avg_scored: homeStats.avg_scored,
      home_avg_conceded: homeStats.avg_conceded,
      home_avg_hits: homeStats.avg_hits,
      home_home_win_pct: homeStats.home_win_pct,
      home_recent_form: homeStats.recent_form,
      home_run_diff: homeStats.run_diff,
      away_win_pct: awayStats.win_pct,
      away_avg_scored: awayStats.avg_scored,
      away_avg_conceded: awayStats.avg_conceded,
      away_avg_hits: awayStats.avg_hits,
      away_away_win_pct: awayStats.away_win_pct,
      away_recent_form: awayStats.recent_form,
      away_run_diff: awayStats.run_diff,
      win_pct_diff: homeStats.win_pct - awayStats.win_pct,
      scored_diff: homeStats.avg_scored - awayStats.avg_scored,
      conceded_diff: homeStats.avg_conceded - awayStats.avg_conceded,
      form_diff: homeStats.recent_form - awayStats.recent_form,
      run_diff_diff: homeStats.run_diff - awayStats.run_diff,
      total_avg_scored: homeStats.avg_scored + awayStats.avg_scored,
      home_first_score_win_rate: 0.5,
      home_comeback_rate: 0.2,
      home_blown_lead_rate: 0.2,
      away_first_score_win_rate: 0.5,
      away_comeback_rate: 0.2,
      away_blown_lead_rate: 0.2,
      first_score_win_rate_diff: 0,
      comeback_rate_diff: 0,
      home_pitcher_era: hEra,
      home_pitcher_whip: hWhip,
      home_pitcher_k: hK,
      away_pitcher_era: aEra,
      away_pitcher_whip: aWhip,
      away_pitcher_k: aK,
      pitcher_era_diff: aEra - hEra,
      pitcher_whip_diff: aWhip - hWhip,
      pitcher_k_diff: hK - aK,
    }

    const aiResponse = await fetch(`${RAILWAY_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features }),
      signal: AbortSignal.timeout(5000),
    })

    if (!aiResponse.ok) return null
    const aiResult = await aiResponse.json()

    return {
      homeWinProb: Math.round(aiResult.home_win_prob * 100),
      awayWinProb: Math.round(aiResult.away_win_prob * 100),
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const matchId = searchParams.get('id')
  const league = searchParams.get('league') || 'ALL'
  const status = searchParams.get('status') || 'all'
  const limit = parseInt(searchParams.get('limit') || '50')
  const date = searchParams.get('date') || ''

  console.log('📊 Baseball Matches API:', { matchId, league, status, limit, date })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // =====================================================
    // 원본과 동일한 쿼리 구조
    // =====================================================
    let query = supabase
      .from('baseball_matches')
      .select(`
        id,
        api_match_id,
        league,
        match_date,
        match_time,
        match_timestamp,
        home_team,
        home_team_ko,
        home_team_id,
        home_team_logo,
        away_team,
        away_team_ko,
        away_team_id,
        away_team_logo,
        home_score,
        away_score,
        status,
        inning,
        is_spring_training,
        home_pitcher,
        home_pitcher_id,
        home_pitcher_ko,
        home_pitcher_era,
        home_pitcher_whip,
        home_pitcher_k,
        away_pitcher,
        away_pitcher_id,
        away_pitcher_ko,
        away_pitcher_era,
        away_pitcher_whip,
        away_pitcher_k
      `)

    if (matchId) {
      // 숫자면 DB id로, 아니면 api_match_id로 조회
      const isNumericId = /^\d+$/.test(matchId)
      if (isNumericId) {
        query = query.eq('id', parseInt(matchId)).limit(1)
      } else {
        query = query.eq('api_match_id', matchId).limit(1)
      }
    } else {
      if (league !== 'ALL') {
        query = query.eq('league', league)
      }

      if (status === 'scheduled') {
        const koreaOffset = 9 * 60
        const now = new Date(Date.now() + (koreaOffset + new Date().getTimezoneOffset()) * 60000)
        const today = now.toISOString().split('T')[0]
        query = query.in('status', ['NS', 'SCHEDULED', 'TBD']).gte('match_date', today)
      } else if (status === 'finished') {
        query = query.eq('status', 'FT')
      } else if (status === 'live') {
        // IN1, IN2, IN3 ... 등 이닝 진행 중 상태
        query = query.like('status', 'IN%')
      } else if (status === 'today') {
        // 오늘 전체 (라이브 + 예정 + 종료)
        const koreaOffset = 9 * 60
        const now = new Date(Date.now() + (koreaOffset + new Date().getTimezoneOffset()) * 60000)
        const today = now.toISOString().split('T')[0]
        query = query.eq('match_date', today)
      }

      if (date) {
        query = query.eq('match_date', date)
      }

      query = query
        .order('match_timestamp', { ascending: status === 'finished' ? false : true })
        .limit(limit)
    }

    const { data: matches, error } = await query

    if (error) {
      console.error('❌ 경기 조회 오류:', error)
      return NextResponse.json({ success: false, error: error.message, matches: [] }, { status: 500 })
    }

    console.log(`✅ Found ${matches?.length || 0} matches`)

    // =====================================================
    // 원본과 동일한 odds 조인 (api_match_id 기준)
    // =====================================================
    const matchApiIds = matches?.map(m => m.api_match_id) || []

    let odds: any[] = []
    if (matchApiIds.length > 0) {
      const { data: oddsData } = await supabase
        .from('baseball_odds_latest')
        .select('*')
        .in('api_match_id', matchApiIds)
      odds = oddsData || []
      console.log(`💰 Found ${odds.length} odds records`)
    }

    const oddsMap = new Map(odds.map(o => [o.api_match_id, o]))

    // =====================================================
    // ✅ MLB 경기만 ML 예측 병렬 호출 추가
    // =====================================================
    const mlPredictions = await Promise.all(
      (matches || []).map(m =>
        m.league === 'MLB' && ['NS', 'SCHEDULED', 'TBD'].includes(m.status)
          ? fetchMLPrediction(supabase, m.home_team, m.away_team, m.match_date, {
              home_pitcher_era: m.home_pitcher_era ?? null,
              home_pitcher_whip: m.home_pitcher_whip ?? null,
              home_pitcher_k: m.home_pitcher_k ?? null,
              away_pitcher_era: m.away_pitcher_era ?? null,
              away_pitcher_whip: m.away_pitcher_whip ?? null,
              away_pitcher_k: m.away_pitcher_k ?? null,
            })
          : Promise.resolve(null)
      )
    )

    // =====================================================
    // 원본과 동일한 포맷 + mlPrediction 추가
    // =====================================================
    const formattedMatches = matches?.map((match, idx) => {
      const matchOdds = oddsMap.get(match.api_match_id)
      const mlData = mlPredictions[idx]

      return {
        id: match.api_match_id,
        dbId: match.id,
        league: match.league,
        leagueName: match.league_name,
        date: match.match_date,
        time: match.match_time || null,
        timestamp: match.match_timestamp || match.match_date,

        homeTeam: match.home_team,
        homeTeamKo: match.home_team_ko || TEAM_NAME_KO[match.home_team] || match.home_team,
        homeTeamId: match.home_team_id,
        homeLogo: match.home_team_logo,
        homeScore: match.home_score,

        awayTeam: match.away_team,
        awayTeamKo: match.away_team_ko || TEAM_NAME_KO[match.away_team] || match.away_team,
        awayTeamId: match.away_team_id,
        awayLogo: match.away_team_logo,
        awayScore: match.away_score,

        status: match.status || 'NS',
        innings: match.inning,

        odds: matchOdds ? {
          homeWinProb: matchOdds.home_win_prob,
          awayWinProb: matchOdds.away_win_prob,
          homeWinOdds: matchOdds.home_win_odds,
          awayWinOdds: matchOdds.away_win_odds,
          overUnderLine: matchOdds.over_under_line,
          overOdds: matchOdds.over_odds,
          underOdds: matchOdds.under_odds,
        } : null,

        // ✅ Railway ML 승률 - 상세 페이지 BaseballAIPrediction과 동일한 값
        // MLB 예정 경기만, 실패 시 null → 프론트에서 odds로 fallback
        mlPrediction: mlData
          ? { homeWinProb: mlData.homeWinProb, awayWinProb: mlData.awayWinProb }
          : null,

        // ✅ 선발 투수 (MLB만, sync-pitchers API가 채워줌)
        homePitcher: match.home_pitcher ?? null,
        homePitcherId: match.home_pitcher_id ?? null,
        homePitcherKo: match.home_pitcher_ko ?? null,
        awayPitcher: match.away_pitcher ?? null,
        awayPitcherId: match.away_pitcher_id ?? null,
        awayPitcherKo: match.away_pitcher_ko ?? null,
      }
    }) || []

    return NextResponse.json({
      success: true,
      count: formattedMatches.length,
      filters: { league, status, limit, date },
      matches: formattedMatches,
    })

  } catch (error: any) {
    console.error('❌ API 오류:', error)
    return NextResponse.json({ success: false, error: error.message, matches: [] }, { status: 500 })
  }
}