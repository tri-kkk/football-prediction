// app/api/baseball/cron/generate-combo-picks/route.ts
// 야구 조합 픽 자동 생성 크론
// v2: 배당 없으면 스킵, 배당 있으면 배당확률 70% + Railway 30% 가중 평균

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RAILWAY_URL = 'https://web-production-efc2e.up.railway.app'
const WINDOW = 10
const PITCHER_DEFAULTS = { era: 4.20, whip: 1.30, k: 150 }

// ==================== 팀 이름 매핑 ====================
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

// ==================== 팀 롤링 스탯 ====================
async function getTeamStats(team: string, league: string) {
  const [{ data: homeGames }, { data: awayGames }] = await Promise.all([
    supabase
      .from('baseball_matches')
      .select('home_score, away_score, home_hits, match_date, innings_score')
      .eq('home_team', team).eq('status', 'FT').eq('league', league)
      .order('match_date', { ascending: false }).limit(WINDOW),
    supabase
      .from('baseball_matches')
      .select('home_score, away_score, away_hits, match_date, innings_score')
      .eq('away_team', team).eq('status', 'FT').eq('league', league)
      .order('match_date', { ascending: false }).limit(WINDOW),
  ])

  const all: Array<{ scored: number; conceded: number; hits: number; won: number; is_home: number; match_date: string }> = []
  for (const g of homeGames || []) {
    all.push({ scored: g.home_score, conceded: g.away_score, hits: g.home_hits ?? 8, won: g.home_score > g.away_score ? 1 : g.home_score === g.away_score ? -1 : 0, is_home: 1, match_date: g.match_date })
  }
  for (const g of awayGames || []) {
    all.push({ scored: g.away_score, conceded: g.home_score, hits: g.away_hits ?? 8, won: g.away_score > g.home_score ? 1 : g.away_score === g.home_score ? -1 : 0, is_home: 0, match_date: g.match_date })
  }
  all.sort((a, b) => a.match_date.localeCompare(b.match_date))
  const recent = all.slice(-WINDOW)
  const avg = (arr: number[]) => {
    const valid = arr.filter(v => v !== -1)
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0.5
  }

  const homeOnly = recent.filter(g => g.is_home === 1)
  const awayOnly = recent.filter(g => g.is_home === 0)

  return {
    win_pct: avg(recent.map(g => g.won)),
    avg_scored: avg(recent.map(g => g.scored)),
    avg_conceded: avg(recent.map(g => g.conceded)),
    avg_hits: avg(recent.map(g => g.hits)),
    home_win_pct: homeOnly.length > 0 ? avg(homeOnly.map(g => g.won)) : 0.5,
    away_win_pct: awayOnly.length > 0 ? avg(awayOnly.map(g => g.won)) : 0.5,
    recent_form: avg(recent.slice(-5).map(g => g.won)),
    run_diff: avg(recent.map(g => g.scored - g.conceded)),
    games_played: recent.length,
    recent_wins: recent.filter(g => g.won === 1).length,
    recent_total: recent.filter(g => g.won !== -1).length,
  }
}

// ==================== Railway 예측 ====================
async function predictMatch(match: any, league: string) {
  try {
    const [homeStats, awayStats] = await Promise.all([
      getTeamStats(match.home_team, league),
      getTeamStats(match.away_team, league),
    ])

    const homePitcherEra = match.home_pitcher_era ?? PITCHER_DEFAULTS.era
    const homePitcherWhip = match.home_pitcher_whip ?? PITCHER_DEFAULTS.whip
    const homePitcherK = match.home_pitcher_k ?? PITCHER_DEFAULTS.k
    const awayPitcherEra = match.away_pitcher_era ?? PITCHER_DEFAULTS.era
    const awayPitcherWhip = match.away_pitcher_whip ?? PITCHER_DEFAULTS.whip
    const awayPitcherK = match.away_pitcher_k ?? PITCHER_DEFAULTS.k

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

    const res = await fetch(`${RAILWAY_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features, league, match_id: match.api_match_id }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) throw new Error(`Railway error: ${res.status}`)
    const result = await res.json()

    return {
      homeWinProb: Math.round(result.home_win_prob * 100),
      awayWinProb: Math.round(result.away_win_prob * 100),
      homeStats,
      awayStats,
      pitcherData: {
        homeEra: homePitcherEra,
        awayEra: awayPitcherEra,
        homeWhip: homePitcherWhip,
        awayWhip: awayPitcherWhip,
      },
    }
  } catch (e) {
    console.error(`  ❌ Railway 예측 실패 (${match.api_match_id}):`, e)
    return null
  }
}

// ==================== 조합 생성 로직 ====================
interface MatchPrediction {
  matchId: number
  apiMatchId: number
  homeTeam: string
  awayTeam: string
  homeTeamKo: string
  awayTeamKo: string
  homeLogo: string
  awayLogo: string
  matchTime: string
  pick: 'home' | 'away'
  pickTeam: string
  pickTeamKo: string
  winProb: number
  odds: number
  reason: string
  homeStats: any
  awayStats: any
}

function generateSafeCombos(predictions: MatchPrediction[]): MatchPrediction[][] {
  const eligible = predictions.filter(p => p.winProb >= 55)
  if (eligible.length < 2) return []

  eligible.sort((a, b) => b.winProb - a.winProb)

  const combos: { combo: MatchPrediction[]; score: number }[] = []
  for (let i = 0; i < Math.min(eligible.length, 6); i++) {
    for (let j = i + 1; j < Math.min(eligible.length, 6); j++) {
      const combo = [eligible[i], eligible[j]]
      const avgProb = combo.reduce((s, p) => s + p.winProb, 0) / 2
      combos.push({ combo, score: avgProb * 0.9 + Math.min(combo.reduce((s, p) => s * p.odds, 1) * 5, 15) * 0.1 })
    }
  }
  combos.sort((a, b) => b.score - a.score)
  return combos.slice(0, 1).map(c => c.combo)
}

function generateHighOddsCombos(predictions: MatchPrediction[], usedMatchIds: Set<number>): MatchPrediction[][] {
  const eligible = predictions.filter(p => p.winProb >= 52)
  if (eligible.length < 3) return []

  const combos: { combo: MatchPrediction[]; score: number }[] = []
  for (let i = 0; i < Math.min(eligible.length, 6); i++) {
    for (let j = i + 1; j < Math.min(eligible.length, 6); j++) {
      for (let k = j + 1; k < Math.min(eligible.length, 6); k++) {
        const combo = [eligible[i], eligible[j], eligible[k]]
        const overlapCount = combo.filter(p => usedMatchIds.has(p.apiMatchId)).length
        if (usedMatchIds.size > 0 && overlapCount >= 2) continue

        const avgProb = combo.reduce((s, p) => s + p.winProb, 0) / 3
        const totalOdds = combo.reduce((s, p) => s * p.odds, 1)
        combos.push({ combo, score: avgProb * 0.4 + Math.min(totalOdds * 8, 40) * 0.6 })
      }
    }
  }
  combos.sort((a, b) => b.score - a.score)
  return combos.slice(0, 1).map(c => c.combo)
}

// ==================== Claude AI 분석문 생성 ====================
async function generateAIAnalysis(combo: MatchPrediction[], league: string): Promise<string> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const matchSummaries = combo.map((p, i) => {
      return `${i + 1}. ${p.awayTeamKo}(원정) vs ${p.homeTeamKo}(홈)
   - 픽: ${p.pickTeamKo} 승 (승률 ${p.winProb}%, 배당 ${p.odds})
   - ${p.awayTeamKo}(원정) 최근 10경기: ${p.awayStats.recent_wins}/${p.awayStats.recent_total}승 (득점 ${p.awayStats.avg_scored.toFixed(1)}, 실점 ${p.awayStats.avg_conceded.toFixed(1)})
   - ${p.homeTeamKo}(홈) 최근 10경기: ${p.homeStats.recent_wins}/${p.homeStats.recent_total}승 (득점 ${p.homeStats.avg_scored.toFixed(1)}, 실점 ${p.homeStats.avg_conceded.toFixed(1)})
   - 근거: ${p.reason}`
    }).join('\n\n')

    const avgProb = combo.reduce((s, p) => s + p.winProb, 0) / combo.length
    const totalOdds = combo.reduce((s, p) => s * p.odds, 1)

    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `당신은 프로 야구 분석가입니다. 아래 ${league} ${combo.length}폴드 조합 픽에 대해 한국어로 간결한 분석 요약문을 작성해주세요.

${matchSummaries}

조합 평균 승률: ${avgProb.toFixed(1)}%
조합 배당: ${totalOdds.toFixed(2)}

반드시 아래 형식대로만 작성하세요. 마크다운(**볼드**) 절대 금지. 순수 텍스트만.

[총평] 전체 조합에 대한 한줄 평가
[1경기] 첫번째 경기 핵심 포인트 한줄
[2경기] 두번째 경기 핵심 포인트 한줄
${combo.length >= 3 ? '[3경기] 세번째 경기 핵심 포인트 한줄\n' : ''}[주의] 주의사항 한줄

각 항목은 반드시 [총평], [1경기], [2경기], [주의] 태그로 시작해야 합니다.
각 항목 최대 50자. 총 200자 내외.`
      }],
    })

    return (res.content[0] as any).text || ''
  } catch (e) {
    console.error('  ❌ AI 분석문 생성 실패:', e)
    return ''
  }
}

// ==================== 배당 수집 트리거 ====================
async function triggerOddsCollection(league: string): Promise<boolean> {
  try {
    const oddsLeague = league === 'MLB' ? 'MLB' : 'NPB_KBO'
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}` : 'https://trendsoccer.com'
    const url = `${baseUrl}/api/baseball/cron/collect-odds?league=${oddsLeague}`
    console.log(`  🔄 배당 수집 트리거: ${oddsLeague}`)
    const res = await fetch(url, { signal: AbortSignal.timeout(120000) })
    if (!res.ok) {
      console.log(`  ⚠️ 배당 수집 실패: ${res.status}`)
      return false
    }
    const data = await res.json()
    console.log(`  ✅ 배당 수집 완료:`, JSON.stringify(data).slice(0, 200))
    return true
  } catch (e) {
    console.error(`  ❌ 배당 수집 트리거 에러:`, e)
    return false
  }
}

// ==================== 메인 핸들러 ====================
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const targetLeague = searchParams.get('league')
  const force = searchParams.get('force') === 'true'

  const leagues = targetLeague ? [targetLeague] : ['MLB', 'KBO', 'NPB']
  const results: Record<string, any> = {}

  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const today = kstNow.toISOString().split('T')[0]
  // MLB는 한국시간 기준 다음날 경기를 전날 저녁에 미리 생성
  const kstTomorrow = new Date(kstNow.getTime() + 24 * 60 * 60 * 1000)
  const tomorrow = kstTomorrow.toISOString().split('T')[0]

  for (const league of leagues) {
    const targetDate = league === 'MLB' ? tomorrow : today
    console.log(`\n🎯 [${league}] 조합 픽 생성 시작 - ${targetDate} (force=${force})`)

    // 1. 이미 생성된 픽이 있으면 스킵 (force 모드에서는 기존 삭제 후 재생성)
    const { data: existing } = await supabase
      .from('baseball_combo_picks')
      .select('id')
      .eq('league', league)
      .eq('pick_date', targetDate)
      .limit(1)

    if (existing && existing.length > 0) {
      if (!force) {
        console.log(`  ⏭️ 이미 생성됨 - 스킵 (force=true로 재생성 가능)`)
        results[league] = { status: 'skipped', reason: 'already_generated' }
        continue
      }
      // force 모드: 기존 픽 삭제 후 재생성
      console.log(`  🔄 force 모드 - 기존 ${existing.length}개 삭제 후 재생성`)
      await supabase
        .from('baseball_combo_picks')
        .delete()
        .eq('league', league)
        .eq('pick_date', targetDate)
    }

    // 2. 오늘 예정 경기 조회
    const { data: matches, error } = await supabase
      .from('baseball_matches')
      .select('id, api_match_id, home_team, away_team, home_team_ko, away_team_ko, home_team_logo, away_team_logo, match_time, home_pitcher_era, home_pitcher_whip, home_pitcher_k, away_pitcher_era, away_pitcher_whip, away_pitcher_k, home_pitcher_ko, away_pitcher_ko')
      .eq('league', league)
      .eq('match_date', targetDate)
      .eq('status', 'NS')
      .order('match_time', { ascending: true })

    if (error || !matches || matches.length === 0) {
      console.log(`  ⚠️ 경기 없음 (league=${league}, date=${targetDate})`)
      results[league] = { status: 'no_matches' }
      continue
    }

    console.log(`  📋 경기 ${matches.length}개 발견`)

    // 3. 배당 데이터 사전 확인 - 없으면 수집 트리거
    const matchIds = matches.map(m => m.api_match_id)
    const { data: existingOdds } = await supabase
      .from('baseball_odds_latest')
      .select('api_match_id')
      .in('api_match_id', matchIds)

    const oddsCount = existingOdds?.length || 0
    console.log(`  📊 배당 보유: ${oddsCount}/${matches.length}개`)

    if (oddsCount < matches.length * 0.5) {
      // 배당이 절반 미만이면 수집 먼저 트리거
      console.log(`  ⚠️ 배당 부족 - 수집 트리거 시도`)
      const collected = await triggerOddsCollection(league)
      if (collected) {
        // 수집 후 5초 대기
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }

    // 4. 각 경기에 대해 Railway 예측 + 배당 조회
    const predictions: MatchPrediction[] = []
    let skippedNoOdds = 0

    for (const match of matches) {
      // Railway 예측
      const prediction = await predictMatch(match, league)
      if (!prediction) continue

      // 배당 데이터 조회
      const { data: oddsData } = await supabase
        .from('baseball_odds_latest')
        .select('home_win_odds, away_win_odds, home_win_prob, away_win_prob')
        .eq('api_match_id', match.api_match_id)
        .limit(1)
        .maybeSingle()

      // 배당 없으면 스킵 (배당 기반 픽만 생성)
      if (!oddsData || !oddsData.home_win_odds || !oddsData.away_win_odds) {
        skippedNoOdds++
        console.log(`  ⚠️ 배당 없음 - 스킵: ${match.home_team} vs ${match.away_team} (matchId: ${match.api_match_id})`)
        continue
      }

      const homeOdds = oddsData.home_win_odds
      const awayOdds = oddsData.away_win_odds

      // ✅ 배당 확률 계산 (노마진 정규화) - 실수(0~1) 유지
      const homeBookProb = (1 / homeOdds)
      const awayBookProb = (1 / awayOdds)
      const bookTotal = homeBookProb + awayBookProb
      const normHome = homeBookProb / bookTotal
      const normAway = awayBookProb / bookTotal

      // ✅ 블렌딩: predict API와 동일하게 배당 60% + Railway 40% (실수 연산 후 정규화)
      const ODDS_WEIGHT = 0.6
      const MODEL_WEIGHT = 0.4
      let blendedHome = normHome * ODDS_WEIGHT + (prediction.homeWinProb / 100) * MODEL_WEIGHT
      let blendedAway = normAway * ODDS_WEIGHT + (prediction.awayWinProb / 100) * MODEL_WEIGHT
      const blendTotal = blendedHome + blendedAway
      blendedHome = blendedHome / blendTotal
      blendedAway = blendedAway / blendTotal

      // ✅ KBO/NPB 투수 매치업 휴리스틱 보정 (predict API와 동일)
      // Railway 모델이 MLB 위주로 학습돼서 KBO/NPB 투수 피처를 무시하므로
      // 양팀 모두 실제 ERA 데이터가 있을 때만 후보정 적용. cap ±8%p
      const isMlb = league === 'MLB'
      const homeEraReal = match.home_pitcher_era
      const awayEraReal = match.away_pitcher_era
      const homeWhipReal = match.home_pitcher_whip
      const awayWhipReal = match.away_pitcher_whip
      const hasRealPitcher = homeEraReal != null && awayEraReal != null
      let pitcherAdjustment = 0
      if (!isMlb && hasRealPitcher) {
        const eraDiff = awayEraReal - homeEraReal // (+) → 홈 우세
        const eraAdj = Math.max(-0.08, Math.min(0.08, eraDiff * 0.04))
        let whipAdj = 0
        if (homeWhipReal != null && awayWhipReal != null) {
          const whipDiff = awayWhipReal - homeWhipReal
          whipAdj = Math.max(-0.04, Math.min(0.04, whipDiff * 0.10))
        }
        pitcherAdjustment = Math.max(-0.08, Math.min(0.08, eraAdj + whipAdj))

        blendedHome = Math.max(0.05, Math.min(0.95, blendedHome + pitcherAdjustment))
        blendedAway = Math.max(0.05, Math.min(0.95, blendedAway - pitcherAdjustment))
        const adjTotal = blendedHome + blendedAway
        blendedHome = blendedHome / adjTotal
        blendedAway = blendedAway / adjTotal
      }

      const finalHomeProb = Math.round(blendedHome * 100)
      const finalAwayProb = Math.round(blendedAway * 100)
      const normalizedHomeBookProb = Math.round(normHome * 100)
      const normalizedAwayBookProb = Math.round(normAway * 100)

      // 가중 평균 기준으로 픽 결정
      const pickHome = finalHomeProb > finalAwayProb
      const winProb = pickHome ? finalHomeProb : finalAwayProb
      const pickTeam = pickHome ? match.home_team : match.away_team
      const pickTeamKo = pickHome
        ? (match.home_team_ko || TEAM_NAME_KO[match.home_team] || match.home_team)
        : (match.away_team_ko || TEAM_NAME_KO[match.away_team] || match.away_team)

      // 최종 승률 52% 이하 제외
      if (winProb <= 52) {
        console.log(`  ⚠️ 승률 낮음 제외: ${pickTeamKo} (${winProb}%)`)
        continue
      }

      // 근거 텍스트 생성
      const reasons: string[] = []
      reasons.push(`배당 확률 ${pickHome ? normalizedHomeBookProb : normalizedAwayBookProb}%`)
      if (prediction.homeStats.recent_form > prediction.awayStats.recent_form && pickHome) {
        reasons.push('홈팀 최근 폼 우세')
      } else if (prediction.awayStats.recent_form > prediction.homeStats.recent_form && !pickHome) {
        reasons.push('원정팀 최근 폼 우세')
      }
      if (prediction.pitcherData.homeEra < prediction.pitcherData.awayEra && pickHome) {
        reasons.push('선발투수 ERA 우위')
      } else if (prediction.pitcherData.awayEra < prediction.pitcherData.homeEra && !pickHome) {
        reasons.push('선발투수 ERA 우위')
      }
      if (pickHome && prediction.homeStats.run_diff > 0) {
        reasons.push(`득실차 +${prediction.homeStats.run_diff.toFixed(1)}`)
      } else if (!pickHome && prediction.awayStats.run_diff > 0) {
        reasons.push(`득실차 +${prediction.awayStats.run_diff.toFixed(1)}`)
      }

      predictions.push({
        matchId: match.id,
        apiMatchId: match.api_match_id,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        homeTeamKo: match.home_team_ko || TEAM_NAME_KO[match.home_team] || match.home_team,
        awayTeamKo: match.away_team_ko || TEAM_NAME_KO[match.away_team] || match.away_team,
        homeLogo: match.home_team_logo || '',
        awayLogo: match.away_team_logo || '',
        matchTime: match.match_time || '',
        pick: pickHome ? 'home' : 'away',
        pickTeam,
        pickTeamKo,
        winProb,
        odds: pickHome ? homeOdds : awayOdds,
        reason: reasons.join(', '),
        homeStats: prediction.homeStats,
        awayStats: prediction.awayStats,
      })

      const adjLabel = !isMlb && hasRealPitcher
        ? ` +투수보정${pitcherAdjustment >= 0 ? '+' : ''}${(pitcherAdjustment * 100).toFixed(1)}%p`
        : ''
      console.log(`  ✅ ${match.home_team_ko || match.home_team} vs ${match.away_team_ko || match.away_team} → ${pickTeamKo} 승 (배당${pickHome ? normalizedHomeBookProb : normalizedAwayBookProb}%×0.6 + Railway${pickHome ? prediction.homeWinProb : prediction.awayWinProb}%×0.4${adjLabel} = 최종${winProb}%)`)
    }

    if (predictions.length < 2) {
      console.log(`  ⚠️ 유효한 예측 ${predictions.length}개 - 조합 불가 (배당 없어서 스킵: ${skippedNoOdds}개)`)
      results[league] = { status: 'insufficient', count: predictions.length, skippedNoOdds, totalMatches: matches.length }
      continue
    }

    // 4. 조합 생성
    const combosToSave = []

    // 2 COMBO: 안전형
    const safeCombos = generateSafeCombos(predictions)
    const usedMatchIds = new Set<number>()
    for (const combo of safeCombos) {
      combo.forEach(p => usedMatchIds.add(p.apiMatchId))
      const avgConf = combo.reduce((s, p) => s + p.winProb, 0) / combo.length
      const totalOdds = combo.reduce((s, p) => s * p.odds, 1)
      const analysis = await generateAIAnalysis(combo, league)

      combosToSave.push({
        league,
        pick_date: targetDate,
        fold_count: 2,
        picks: combo.map(p => ({
          matchId: p.apiMatchId,
          homeTeam: p.homeTeam,
          awayTeam: p.awayTeam,
          homeTeamKo: p.homeTeamKo,
          awayTeamKo: p.awayTeamKo,
          homeLogo: p.homeLogo,
          awayLogo: p.awayLogo,
          matchTime: p.matchTime,
          pick: p.pick,
          pickTeam: p.pickTeam,
          pickTeamKo: p.pickTeamKo,
          winProb: p.winProb,
          odds: p.odds,
          reason: p.reason,
        })),
        total_odds: parseFloat(totalOdds.toFixed(2)),
        avg_confidence: parseFloat(avgConf.toFixed(1)),
        ai_analysis: analysis,
        result: 'pending',
      })
      console.log(`  📦 2 COMBO 안전형: 평균 ${avgConf.toFixed(1)}% / 배당 ${totalOdds.toFixed(2)}`)
    }

    // 3 COMBO: 고배당형
    if (predictions.length >= 3) {
      const highOddsCombos = generateHighOddsCombos(predictions, usedMatchIds)
      for (const combo of highOddsCombos) {
        const avgConf = combo.reduce((s, p) => s + p.winProb, 0) / combo.length
        const totalOdds = combo.reduce((s, p) => s * p.odds, 1)
        const analysis = await generateAIAnalysis(combo, league)

        combosToSave.push({
          league,
          pick_date: targetDate,
          fold_count: 3,
          picks: combo.map(p => ({
            matchId: p.apiMatchId,
            homeTeam: p.homeTeam,
            awayTeam: p.awayTeam,
            homeTeamKo: p.homeTeamKo,
            awayTeamKo: p.awayTeamKo,
            homeLogo: p.homeLogo,
            awayLogo: p.awayLogo,
            matchTime: p.matchTime,
            pick: p.pick,
            pickTeam: p.pickTeam,
            pickTeamKo: p.pickTeamKo,
            winProb: p.winProb,
            odds: p.odds,
            reason: p.reason,
          })),
          total_odds: parseFloat(totalOdds.toFixed(2)),
          avg_confidence: parseFloat(avgConf.toFixed(1)),
          ai_analysis: analysis,
          result: 'pending',
        })
        console.log(`  📦 3 COMBO 고배당: 평균 ${avgConf.toFixed(1)}% / 배당 ${totalOdds.toFixed(2)}`)
      }
    }

    // 5. DB 저장
    if (combosToSave.length > 0) {
      const { error: insertError } = await supabase
        .from('baseball_combo_picks')
        .insert(combosToSave)

      if (insertError) {
        console.error(`  ❌ 저장 실패:`, insertError)
        results[league] = { status: 'error', error: insertError.message }
      } else {
        console.log(`  💾 ${combosToSave.length}개 조합 저장 완료`)
        results[league] = { status: 'success', combos: combosToSave.length, predictions: predictions.length }
      }
    } else {
      console.log(`  ⚠️ 생성된 조합 없음`)
      results[league] = { status: 'no_combos' }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n⏱️ 완료 (${elapsed}s)`)
  console.log(`📊 결과 요약:`, JSON.stringify(results))

  return NextResponse.json({
    success: true,
    date: today, // KST 기준 오늘 (MLB는 내부적으로 tomorrow 사용)
    force,
    results,
    elapsed: `${elapsed}s`,
  })
}