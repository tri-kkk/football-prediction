// app/api/baseball/predict/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RAILWAY_URL = 'https://web-production-efc2e.up.railway.app'
const WINDOW = 10

function parseInningStats(inningData: Record<string, Record<string, number>> | null) {
  if (!inningData) return { firstScorer: null, homeComeback: false, awayComeback: false, homeBlown: false, awayBlown: false }
  const home = inningData.home || {}
  const away = inningData.away || {}
  let homeCum = 0, awayCum = 0
  let firstScorer: 'home' | 'away' | null = null
  let homeEverLed = false, awayEverLed = false
  for (let i = 1; i <= 9; i++) {
    const k = String(i)
    if (home[k] == null || away[k] == null) continue
    awayCum += away[k] || 0
    if (!firstScorer && awayCum > 0) firstScorer = 'away'
    homeCum += home[k] || 0
    if (!firstScorer && homeCum > 0) firstScorer = 'home'
    if (homeCum > awayCum) homeEverLed = true
    else if (awayCum > homeCum) awayEverLed = true
  }
  const homeWon = homeCum > awayCum
  const awayWon = awayCum > homeCum
  return {
    firstScorer,
    homeComeback: homeWon && awayEverLed,
    awayComeback: awayWon && homeEverLed,
    homeBlown: awayWon && homeEverLed,
    awayBlown: homeWon && awayEverLed,
  }
}

async function getTeamRollingStats(team: string, league: string = 'MLB') {
  const [{ data: homeGames }, { data: awayGames }] = await Promise.all([
    supabase
      .from('baseball_matches')
      .select('match_date, home_score, away_score, home_hits, away_hits, innings_score')
      .eq('home_team', team)
      .eq('status', 'FT')
      .eq('league', league)
      .order('match_date', { ascending: false })
      .limit(WINDOW),
    supabase
      .from('baseball_matches')
      .select('match_date, home_score, away_score, home_hits, away_hits, innings_score')
      .eq('away_team', team)
      .eq('status', 'FT')
      .eq('league', league)
      .order('match_date', { ascending: false })
      .limit(WINDOW),
  ])

  const allGames: Array<{
    scored: number; conceded: number; hits: number; won: number
    is_home: number; match_date: string
    firstScorer: string | null; homeComeback: boolean; awayComeback: boolean
    homeBlown: boolean; awayBlown: boolean
  }> = []

  for (const g of homeGames || []) {
    const inn = parseInningStats(g.innings_score)
    allGames.push({
      scored: g.home_score, conceded: g.away_score,
      hits: g.home_hits ?? 8,
      won: g.home_score > g.away_score ? 1 : g.home_score === g.away_score ? -1 : 0,
      is_home: 1, match_date: g.match_date,
      firstScorer: inn.firstScorer,
      homeComeback: inn.homeComeback, awayComeback: inn.awayComeback,
      homeBlown: inn.homeBlown, awayBlown: inn.awayBlown,
    })
  }

  for (const g of awayGames || []) {
    const inn = parseInningStats(g.innings_score)
    allGames.push({
      scored: g.away_score, conceded: g.home_score,
      hits: g.away_hits ?? 8,
      won: g.away_score > g.home_score ? 1 : g.away_score === g.home_score ? -1 : 0,
      is_home: 0, match_date: g.match_date,
      firstScorer: inn.firstScorer,
      homeComeback: inn.awayComeback, awayComeback: inn.homeComeback,
      homeBlown: inn.awayBlown, awayBlown: inn.homeBlown,
    })
  }

  allGames.sort((a, b) => a.match_date.localeCompare(b.match_date))
  const recent = allGames.slice(-WINDOW)
  const recent5 = recent.slice(-5)

  if (recent.length === 0) {
    return {
      win_pct: 0.5, avg_scored: 4.5, avg_conceded: 4.5,
      avg_hits: 8.0, home_win_pct: 0.5, away_win_pct: 0.5,
      recent_form: 0.5, run_diff: 0.0, games_played: 0,
      first_score_win_rate: 0.5, comeback_rate: 0.2, blown_lead_rate: 0.2,
      home_record: 'N/A', away_record: 'N/A',
      recent_wins: 0, recent_total: 0,
    }
  }

  const avg = (arr: number[]) => {
    const valid = arr.filter(v => v !== -1)
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0.5
  }

  const homeOnly = recent.filter(g => g.is_home === 1)
  const awayOnly = recent.filter(g => g.is_home === 0)
  const homeWinPct = homeOnly.length > 0 ? avg(homeOnly.map(g => g.won)) : 0.5
  const awayWinPct = awayOnly.length > 0 ? avg(awayOnly.map(g => g.won)) : 0.5
  const recentForm = avg(recent.map(g => g.won))

  // 이닝 통계
  const firstScoreWins = recent.filter(g => g.firstScorer === 'home' && g.won === 1).length
  const firstScoreGames = recent.filter(g => g.firstScorer === 'home').length
  const firstScoreWinRate = firstScoreGames > 0 ? firstScoreWins / firstScoreGames : 0.5
  const comebackRate = avg(recent.map(g => g.homeComeback ? 1 : 0))
  const blownLeadRate = avg(recent.map(g => g.homeBlown ? 1 : 0))

  return {
    win_pct: avg(recent.map(g => g.won)),
    avg_scored: avg(recent.map(g => g.scored)),
    avg_conceded: avg(recent.map(g => g.conceded)),
    avg_hits: avg(recent.map(g => g.hits)),
    home_win_pct: homeWinPct,
    away_win_pct: awayWinPct,
    recent_form: recentForm,
    run_diff: avg(recent.map(g => g.scored - g.conceded)),
    games_played: recent.length,
    first_score_win_rate: firstScoreWinRate,
    comeback_rate: comebackRate,
    blown_lead_rate: blownLeadRate,
    home_record: homeOnly.length > 0 ? `${(homeWinPct * 100).toFixed(0)}%` : 'N/A',
    away_record: awayOnly.length > 0 ? `${(awayWinPct * 100).toFixed(0)}%` : 'N/A',
    recent_wins: recent.filter(g => g.won === 1).length,
    recent_total: recent.filter(g => g.won !== -1).length,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { matchId, homeTeam, awayTeam } = await request.json()

    if (!matchId) {
      return NextResponse.json({ error: 'matchId required' }, { status: 400 })
    }

    // 경기 날짜 + 투수 데이터 조회
    const { data: match, error } = await supabase
      .from('baseball_matches')
      .select('api_match_id, match_date, league, home_pitcher_era, home_pitcher_whip, home_pitcher_k, away_pitcher_era, away_pitcher_whip, away_pitcher_k')
      .or(`id.eq.${matchId},api_match_id.eq.${matchId}`)
      .limit(1)
      .single()

    if (error || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // 배당 데이터 조회 → implied probability 계산
    const { data: oddsData } = await supabase
      .from('baseball_odds_latest')
      .select('home_win_odds, away_win_odds')
      .eq('api_match_id', match.api_match_id)
      .limit(1)
      .maybeSingle()

    let oddsImpliedHome = 0.5
    let oddsImpliedAway = 0.5
    let hasOdds = false

    if (oddsData?.home_win_odds && oddsData?.away_win_odds) {
      hasOdds = true
      const rawHome = 1 / oddsData.home_win_odds
      const rawAway = 1 / oddsData.away_win_odds
      // overround 제거 (정규화)
      const total = rawHome + rawAway
      oddsImpliedHome = rawHome / total
      oddsImpliedAway = rawAway / total
    }

    // MLB만 AI 예측 지원 → 전체 리그 지원으로 변경
    // KBO/NPB는 투수 피처 없이 팀 스탯만으로 예측

    // Rolling feature 계산
    const [homeStats, awayStats] = await Promise.all([
      getTeamRollingStats(homeTeam, match.league),
      getTeamRollingStats(awayTeam, match.league),
    ])

    // 데이터 부족 경고
    const dataReliable =
      homeStats.games_played >= 5 && awayStats.games_played >= 5

    // 투수 데이터 (null이면 리그 평균으로 대체)
    const PITCHER_DEFAULTS = { era: 4.20, whip: 1.30, k: 150 }
    const homePitcherEraReal = match.home_pitcher_era
    const awayPitcherEraReal = match.away_pitcher_era
    const homePitcherWhipReal = match.home_pitcher_whip
    const awayPitcherWhipReal = match.away_pitcher_whip
    const homePitcherKReal = match.home_pitcher_k
    const awayPitcherKReal = match.away_pitcher_k
    const homePitcherEra = homePitcherEraReal ?? PITCHER_DEFAULTS.era
    const homePitcherWhip = homePitcherWhipReal ?? PITCHER_DEFAULTS.whip
    const homePitcherK = homePitcherKReal ?? PITCHER_DEFAULTS.k
    const awayPitcherEra = awayPitcherEraReal ?? PITCHER_DEFAULTS.era
    const awayPitcherWhip = awayPitcherWhipReal ?? PITCHER_DEFAULTS.whip
    const awayPitcherK = awayPitcherKReal ?? PITCHER_DEFAULTS.k
    // 양팀 모두 실제 ERA 데이터가 있을 때만 매치업 신뢰
    const hasPitcherData =
      homePitcherEraReal != null && awayPitcherEraReal != null

    // Railway 모델 feature
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
      home_first_score_win_rate: homeStats.first_score_win_rate,
      home_comeback_rate: homeStats.comeback_rate,
      home_blown_lead_rate: homeStats.blown_lead_rate,
      away_first_score_win_rate: awayStats.first_score_win_rate,
      away_comeback_rate: awayStats.comeback_rate,
      away_blown_lead_rate: awayStats.blown_lead_rate,
      first_score_win_rate_diff: homeStats.first_score_win_rate - awayStats.first_score_win_rate,
      comeback_rate_diff: homeStats.comeback_rate - awayStats.comeback_rate,
      // MLB 투수 피처
      home_pitcher_era: homePitcherEra,
      home_pitcher_whip: homePitcherWhip,
      home_pitcher_k: homePitcherK,
      away_pitcher_era: awayPitcherEra,
      away_pitcher_whip: awayPitcherWhip,
      away_pitcher_k: awayPitcherK,
      pitcher_era_diff: awayPitcherEra - homePitcherEra,
      pitcher_whip_diff: awayPitcherWhip - homePitcherWhip,
      pitcher_k_diff: homePitcherK - awayPitcherK,
    }

    // Railway API 호출
    const aiResponse = await fetch(`${RAILWAY_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features, league: match.league, match_id: matchId }),
      signal: AbortSignal.timeout(5000),
    })

    if (!aiResponse.ok) {
      throw new Error(`Railway API error: ${aiResponse.status}`)
    }

    const aiResult = await aiResponse.json()

    // 배당 implied probability + Railway 모델 블렌딩
    // 배당 데이터가 있으면: 배당 60% + 모델 40% (배당이 시장 평가라 더 신뢰)
    // 배당 데이터가 없으면: 모델 100%
    const ODDS_WEIGHT = 0.6
    const MODEL_WEIGHT = 0.4

    let blendedHome: number
    let blendedAway: number

    if (hasOdds) {
      blendedHome = oddsImpliedHome * ODDS_WEIGHT + aiResult.home_win_prob * MODEL_WEIGHT
      blendedAway = oddsImpliedAway * ODDS_WEIGHT + aiResult.away_win_prob * MODEL_WEIGHT
      // 정규화
      const blendTotal = blendedHome + blendedAway
      blendedHome = blendedHome / blendTotal
      blendedAway = blendedAway / blendTotal
    } else {
      blendedHome = aiResult.home_win_prob
      blendedAway = aiResult.away_win_prob
    }

    // KBO/NPB 투수 매치업 휴리스틱 보정
    // Railway 모델이 MLB 위주로 학습돼서 KBO/NPB 투수 피처를 무시하므로
    // 양팀 모두 실제 ERA 데이터가 있을 때만 후보정 적용. cap ±8%p
    const isMlb = match.league === 'MLB'
    let pitcherAdjustment = 0
    if (!isMlb && hasPitcherData) {
      const eraDiff = awayPitcherEra - homePitcherEra // (+) → 홈 우세
      // ERA 1.0 차 ≈ 4%p, cap ±8%p
      const eraAdj = Math.max(-0.08, Math.min(0.08, eraDiff * 0.04))
      // WHIP 0.20 차 ≈ 2%p, cap ±4%p (있을 때만)
      let whipAdj = 0
      if (homePitcherWhipReal != null && awayPitcherWhipReal != null) {
        const whipDiff = awayPitcherWhip - homePitcherWhip
        whipAdj = Math.max(-0.04, Math.min(0.04, whipDiff * 0.10))
      }
      pitcherAdjustment = Math.max(-0.08, Math.min(0.08, eraAdj + whipAdj))

      blendedHome = Math.max(0.05, Math.min(0.95, blendedHome + pitcherAdjustment))
      blendedAway = Math.max(0.05, Math.min(0.95, blendedAway - pitcherAdjustment))
      const adjTotal = blendedHome + blendedAway
      blendedHome = blendedHome / adjTotal
      blendedAway = blendedAway / adjTotal
    }

    const homeWinProb = Math.round(blendedHome * 100)
    const awayWinProb = Math.round(blendedAway * 100)
    const overProb = Math.round(aiResult.over_prob * 100)
    const underProb = Math.round(aiResult.under_prob * 100)

    // 인사이트 생성
    const winDiff = Math.abs(homeStats.win_pct - awayStats.win_pct)
    const formDiff = Math.abs(homeStats.recent_form - awayStats.recent_form)

    // ERA diff 기반 동적 impact (양팀 모두 실제 데이터 있을 때만)
    const eraDiffAbs = hasPitcherData ? Math.abs(awayPitcherEra - homePitcherEra) : 0
    // 1.0 ERA diff ≈ impact 25, cap 40
    const eraImpact = Math.min(40, Math.round(eraDiffAbs * 25))

    const keyFactors: Array<{ name: string; value: number; impact: number; description: string }> = []

    // 선발투수 카드는 양팀 모두 실제 데이터 있을 때만 노출
    if (hasPitcherData) {
      const pitcherFavor = awayPitcherEra > homePitcherEra ? '홈' : (awayPitcherEra < homePitcherEra ? '원정' : '대등')
      keyFactors.push({
        name: '선발투수 ERA',
        value: homePitcherEra,
        impact: eraImpact,
        description: `원정 ${awayPitcherEra.toFixed(2)} vs 홈 ${homePitcherEra.toFixed(2)} (${pitcherFavor} 우세)`,
      })
    }

    keyFactors.push(
      {
        name: '최근 10경기 안타',
        value: homeStats.avg_hits,
        impact: Math.round(8.04 * 100) / 100 * 10,
        description: `원정 ${awayStats.avg_hits.toFixed(1)}개 vs 홈 ${homeStats.avg_hits.toFixed(1)}개`,
      },
      {
        name: '득실점 차이',
        value: homeStats.run_diff,
        impact: Math.round(7.25 * 100) / 100 * 10,
        description: `원정 ${awayStats.run_diff > 0 ? '+' : ''}${awayStats.run_diff.toFixed(1)} vs 홈 ${homeStats.run_diff > 0 ? '+' : ''}${homeStats.run_diff.toFixed(1)}`,
      },
      {
        name: '최근 5경기 폼',
        value: homeStats.recent_form,
        impact: Math.round(formDiff * 100),
        description: `원정 ${awayStats.recent_wins}/${awayStats.recent_total}승 vs 홈 ${homeStats.recent_wins}/${homeStats.recent_total}승`,
      },
    )

    // impact 기준 내림차순 정렬해서 의미 있는 요인을 위로
    keyFactors.sort((a, b) => b.impact - a.impact)

    const favoredTeam = homeWinProb >= awayWinProb ? homeTeam : awayTeam
    const favoredProb = Math.max(homeWinProb, awayWinProb)

    // 선발 매치업 코멘트 (조사 없이 — 프론트에서 팀명 치환 시 받침 문제 회피)
    let pitcherLine = ''
    if (hasPitcherData) {
      const eraDiff = awayPitcherEra - homePitcherEra
      const absDiff = Math.abs(eraDiff)
      const aceTeam = eraDiff > 0 ? homeTeam : awayTeam
      const aceEra = Math.min(homePitcherEra, awayPitcherEra)
      if (absDiff >= 1.5) {
        pitcherLine = ` 선발 매치업은 ${aceTeam} 측 ERA ${aceEra.toFixed(2)}로 압도적 우세.`
      } else if (absDiff >= 0.75) {
        pitcherLine = ` 선발 매치업은 ${aceTeam} 측 ERA ${aceEra.toFixed(2)}로 우위.`
      } else if (absDiff < 0.3) {
        pitcherLine = ` 양팀 선발 ERA가 대등해 마운드 우열을 가리기 어려움.`
      }
    }

    const summary = dataReliable
      ? `${favoredTeam} 측 ${favoredProb}% 확률로 우세.${pitcherLine || ' 최근 득실점 흐름과 안타 생산력이 주요 예측 근거.'}`
      : `데이터가 부족하여 예측 신뢰도가 낮습니다. (홈 ${homeStats.games_played}경기, 원정 ${awayStats.games_played}경기)`

    return NextResponse.json({
      success: true,
      prediction: {
        homeWinProb,
        awayWinProb,
        overProb,
        underProb,
        confidence: aiResult.confidence,
        grade: aiResult.grade,
      },
      insights: {
        keyFactors,
        homeAdvantage: {
          homeRecord: homeStats.home_record,
          awayRecord: awayStats.away_record,
          advantage: homeStats.home_win_pct - homeStats.win_pct,
        },
        recentForm: {
          home: `${(homeStats.recent_form * 100).toFixed(0)}%`,
          away: `${(awayStats.recent_form * 100).toFixed(0)}%`,
        },
        summary,
      },
      dataQuality: {
        homeGamesPlayed: homeStats.games_played,
        awayGamesPlayed: awayStats.games_played,
        reliable: dataReliable,
        hasPitcherData,
        pitcherAdjustment: Math.round(pitcherAdjustment * 1000) / 10, // %p
      },
    })
  } catch (err) {
    console.error('AI predict error:', err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}