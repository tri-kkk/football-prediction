// POST /api/internal/generate-blog
// Step 2: 블로그 AI 자동생성 API
// match_id + sport_type 기반으로 DB 데이터 조회 → Gemini 프롬프트 → 4섹션 블로그 반환

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BLOG_SECRET = process.env.BLOG_API_SECRET || process.env.CRON_SECRET
const GEMINI_API_KEY = process.env.GEMINI_BLOG_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

export async function POST(req: NextRequest) {
  // 인증
  const auth = req.headers.get('authorization')
  if (!auth || auth !== `Bearer ${BLOG_SECRET}`) {
    return NextResponse.json(
      { success: false, data: null, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { match_id, sport_type } = body

  if (!match_id || !sport_type) {
    return NextResponse.json(
      { success: false, data: null, error: 'match_id and sport_type are required' },
      { status: 400 }
    )
  }

  if (!['soccer', 'baseball'].includes(sport_type)) {
    return NextResponse.json(
      { success: false, data: null, error: 'sport_type must be "soccer" or "baseball"' },
      { status: 400 }
    )
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, data: null, error: 'GEMINI_BLOG_API_KEY not configured' },
      { status: 500 }
    )
  }

  try {
    // 1. DB에서 경기 데이터 수집
    const matchData = sport_type === 'soccer'
      ? await collectSoccerData(match_id)
      : await collectBaseballData(match_id)

    if (!matchData) {
      return NextResponse.json(
        { success: false, data: null, error: `Match not found: ${match_id}` },
        { status: 404 }
      )
    }

    // 2. 프롬프트 생성
    const prompt = sport_type === 'soccer'
      ? buildSoccerPrompt(matchData)
      : buildBaseballPrompt(matchData)

    // 3. Gemini 호출
    const aiResult = await callGemini(prompt)

    // 4. 응답 파싱
    const parsed = parseGeminiResponse(aiResult, matchData)

    return NextResponse.json({ success: true, data: parsed, error: null })
  } catch (err: any) {
    console.error('[generate-blog] Error:', err)
    return NextResponse.json(
      { success: false, data: null, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════
// 축구 데이터 수집
// ═══════════════════════════════════════════
async function collectSoccerData(matchId: string) {
  // 1) match_odds_latest에서 기본 정보
  const { data: match } = await supabase
    .from('match_odds_latest')
    .select('*')
    .eq('match_id', matchId)
    .single()

  if (!match) return null

  // 2) 홈팀/원정팀 통계
  const season = String(new Date().getFullYear())
  const [homeStats, awayStats] = await Promise.all([
    getTeamStats(match.home_team, season),
    getTeamStats(match.away_team, season),
  ])

  // 3) 상대 전적 (fg_match_history)
  const { data: h2h } = await supabase
    .from('fg_match_history')
    .select('home_team, away_team, home_score, away_score, match_date, league_code')
    .or(`and(home_team.eq.${match.home_team},away_team.eq.${match.away_team}),and(home_team.eq.${match.away_team},away_team.eq.${match.home_team})`)
    .order('match_date', { ascending: false })
    .limit(10)

  // 4) 예측 결과
  const { data: prediction } = await supabase
    .from('match_results')
    .select('predicted_winner, predicted_home_probability, predicted_draw_probability, predicted_away_probability')
    .eq('match_id', matchId)
    .single()

  return {
    sport: 'soccer',
    matchId,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    league: match.league_code || '',
    commenceTime: match.commence_time,
    odds: {
      home: match.home_odds,
      draw: match.draw_odds,
      away: match.away_odds,
    },
    probability: {
      home: match.home_probability,
      draw: match.draw_probability,
      away: match.away_probability,
    },
    homeStats: homeStats || null,
    awayStats: awayStats || null,
    h2h: h2h || [],
    prediction: prediction || null,
  }
}

async function getTeamStats(teamName: string, season: string) {
  const { data } = await supabase
    .from('fg_team_stats')
    .select('*')
    .eq('team_name', teamName)
    .eq('season', season)
    .single()
  return data
}

// ═══════════════════════════════════════════
// 야구 데이터 수집
// ═══════════════════════════════════════════
async function collectBaseballData(matchId: string) {
  // 1) baseball_matches
  const { data: match } = await supabase
    .from('baseball_matches')
    .select('*')
    .or(`api_match_id.eq.${matchId},id.eq.${matchId}`)
    .single()

  if (!match) return null

  // 2) 배당
  const { data: odds } = await supabase
    .from('baseball_odds_latest')
    .select('*')
    .eq('api_match_id', match.api_match_id || match.id)
    .single()

  // 3) 시즌 팀 스탯
  const season = String(new Date(match.match_date).getFullYear())
  const [homeSeason, awaySeason] = await Promise.all([
    getBaseballTeamStats(match.home_team, match.league, season),
    getBaseballTeamStats(match.away_team, match.league, season),
  ])

  // 4) 최근 10경기 성적
  const [homeRecent, awayRecent] = await Promise.all([
    getRecentBaseballGames(match.home_team, match.match_date, 10),
    getRecentBaseballGames(match.away_team, match.match_date, 10),
  ])

  return {
    sport: 'baseball',
    matchId: String(match.api_match_id || match.id),
    homeTeam: match.home_team_ko || match.home_team,
    awayTeam: match.away_team_ko || match.away_team,
    homeTeamEn: match.home_team,
    awayTeamEn: match.away_team,
    league: match.league,
    matchDate: match.match_date,
    matchTime: match.match_time,
    pitcher: {
      home: {
        name: match.home_pitcher_ko || match.home_pitcher || '미정',
        era: match.home_pitcher_era,
        whip: match.home_pitcher_whip,
        k: match.home_pitcher_k,
      },
      away: {
        name: match.away_pitcher_ko || match.away_pitcher || '미정',
        era: match.away_pitcher_era,
        whip: match.away_pitcher_whip,
        k: match.away_pitcher_k,
      },
    },
    odds: odds ? {
      homeWin: odds.home_win_odds,
      awayWin: odds.away_win_odds,
      homeProb: odds.home_win_prob,
      awayProb: odds.away_win_prob,
      ouLine: odds.over_under_line,
      overOdds: odds.over_odds,
      underOdds: odds.under_odds,
    } : null,
    homeSeason: homeSeason || null,
    awaySeason: awaySeason || null,
    homeRecent: homeRecent || [],
    awayRecent: awayRecent || [],
  }
}

async function getBaseballTeamStats(teamName: string, league: string, season: string) {
  const { data } = await supabase
    .from('baseball_team_season_stats')
    .select('*')
    .eq('team_name', teamName)
    .eq('league', league)
    .eq('season', season)
    .single()
  return data
}

async function getRecentBaseballGames(teamName: string, beforeDate: string, limit: number) {
  const { data } = await supabase
    .from('baseball_matches')
    .select('home_team, away_team, home_score, away_score, match_date, status')
    .or(`home_team.eq.${teamName},away_team.eq.${teamName}`)
    .lt('match_date', beforeDate)
    .eq('status', 'FT')
    .order('match_date', { ascending: false })
    .limit(limit)
  return data
}

// ═══════════════════════════════════════════
// 축구 프롬프트
// ═══════════════════════════════════════════
function buildSoccerPrompt(data: any): string {
  const { homeTeam, awayTeam, league, odds, probability, homeStats, awayStats, h2h, prediction } = data

  const homeStatsStr = homeStats ? `
[${homeTeam} 시즌 통계]
- 전체: ${homeStats.total_played}경기 ${homeStats.total_wins}승 ${homeStats.total_draws}무 ${homeStats.total_losses}패
- 득실: ${homeStats.total_goals_for}득점 ${homeStats.total_goals_against}실점
- 홈: ${homeStats.home_played}경기 ${homeStats.home_wins}승 ${homeStats.home_draws}무 ${homeStats.home_losses}패 (${homeStats.home_goals_for}득 ${homeStats.home_goals_against}실)
- 최근 폼: 최근5 ${homeStats.form_last_5?.toFixed(2) || 'N/A'} / 최근8 ${homeStats.form_last_8?.toFixed(2) || 'N/A'}
- 홈 선제골 승률: ${homeStats.home_first_goal_games}경기 중 ${homeStats.home_first_goal_wins}승
- 홈 무득점 경기: ${homeStats.home_scoreless_games}회` : `[${homeTeam} 통계: 데이터 없음]`

  const awayStatsStr = awayStats ? `
[${awayTeam} 시즌 통계]
- 전체: ${awayStats.total_played}경기 ${awayStats.total_wins}승 ${awayStats.total_draws}무 ${awayStats.total_losses}패
- 득실: ${awayStats.total_goals_for}득점 ${awayStats.total_goals_against}실점
- 원정: ${awayStats.away_played}경기 ${awayStats.away_wins}승 ${awayStats.away_draws}무 ${awayStats.away_losses}패 (${awayStats.away_goals_for}득 ${awayStats.away_goals_against}실)
- 최근 폼: 최근5 ${awayStats.form_last_5?.toFixed(2) || 'N/A'} / 최근8 ${awayStats.form_last_8?.toFixed(2) || 'N/A'}
- 원정 선제골 승률: ${awayStats.away_first_goal_games}경기 중 ${awayStats.away_first_goal_wins}승
- 원정 무득점 경기: ${awayStats.away_scoreless_games}회` : `[${awayTeam} 통계: 데이터 없음]`

  const h2hStr = h2h.length > 0
    ? `[상대 전적 최근 ${h2h.length}경기]\n` + h2h.map((m: any) =>
      `  ${m.match_date} ${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team}`
    ).join('\n')
    : '[상대 전적: 데이터 없음]'

  const oddsStr = odds.home
    ? `[배당] 홈승 ${odds.home?.toFixed(2)} / 무승부 ${odds.draw?.toFixed(2)} / 원정승 ${odds.away?.toFixed(2)}`
    : '[배당: 데이터 없음]'

  const probStr = probability.home
    ? `[AI 승률] 홈 ${probability.home}% / 무 ${probability.draw}% / 원정 ${probability.away}%`
    : ''

  return `당신은 축구 전문 블로그 라이터입니다. 아래 데이터를 기반으로 블로그 포스팅을 작성해주세요.

=== 경기 정보 ===
리그: ${league}
대진: ${homeTeam} (홈) vs ${awayTeam} (원정)
${oddsStr}
${probStr}

${homeStatsStr}

${awayStatsStr}

${h2hStr}

=== 작성 규칙 ===
1. 반드시 "~입니다", "~합니다" 존댓말 사용
2. 마크다운(표, 굵은 글씨, # 등) 절대 금지. 순수 텍스트만 작성
3. 줄바꿈 포함 서술형으로 구성
4. 각 섹션 300~400자 내외

=== 반드시 아래 JSON 형식으로만 응답하세요 ===
{
  "title": "[${league}] ${homeTeam} vs ${awayTeam} 분석 리포트",
  "body1": "양 팀 최근 폼, 득실점 흐름 기반 매치 프리뷰 (300~400자)",
  "body2": "핵심 스탯 비교 및 상대 전적 기반 객관적 전력 분석 (300~400자)",
  "body3": "홈/원정 데이터 분석 기반 전술 포인트 및 승부처 3가지 (300~400자)",
  "body4": "TrendSoccer 데이터 기반 최종 승부예측, 픽 추천, 예상 배당 및 마무리 인사 (300~400자)",
  "tags": ["트렌드사커", "리그명", "팀명1", "팀명2", "승부예측"]
}

JSON만 응답하세요. 다른 텍스트 없이 JSON 객체만 반환하세요.`
}

// ═══════════════════════════════════════════
// 야구 프롬프트
// ═══════════════════════════════════════════
function buildBaseballPrompt(data: any): string {
  const { homeTeam, awayTeam, league, pitcher, odds, homeSeason, awaySeason, homeRecent, awayRecent } = data

  // 최근 10경기 전적 계산
  const calcRecent = (games: any[], teamName: string) => {
    if (!games || games.length === 0) return '데이터 없음'
    let w = 0, l = 0
    games.forEach((g: any) => {
      const isHome = g.home_team === teamName
      const won = isHome ? g.home_score > g.away_score : g.away_score > g.home_score
      if (won) w++; else l++
    })
    return `${w}승 ${l}패`
  }

  const homeRecentStr = calcRecent(homeRecent, data.homeTeamEn)
  const awayRecentStr = calcRecent(awayRecent, data.awayTeamEn)

  const pitcherStr = `
[선발 투수 매치업]
- ${homeTeam}: ${pitcher.home.name} (ERA ${pitcher.home.era ?? 'N/A'}, WHIP ${pitcher.home.whip ?? 'N/A'}, K ${pitcher.home.k ?? 'N/A'})
- ${awayTeam}: ${pitcher.away.name} (ERA ${pitcher.away.era ?? 'N/A'}, WHIP ${pitcher.away.whip ?? 'N/A'}, K ${pitcher.away.k ?? 'N/A'})`

  const seasonStr = (stats: any, name: string) => {
    if (!stats) return `[${name} 시즌 스탯: 데이터 없음]`
    return `[${name} 시즌 스탯]
- 팀 타율: ${stats.team_avg || 'N/A'} / OBP: ${stats.team_obp || 'N/A'} / SLG: ${stats.team_slg || 'N/A'} / OPS: ${stats.team_ops || 'N/A'}
- 팀 홈런: ${stats.team_hr || 'N/A'}
- 팀 ERA: ${stats.team_era_real || 'N/A'} / WHIP: ${stats.team_whip || 'N/A'}
- 상대 타율: ${stats.team_opp_avg || 'N/A'} / K: ${stats.team_k || 'N/A'} / BB: ${stats.team_bb || 'N/A'}`
  }

  const oddsStr = odds
    ? `[배당] ${homeTeam} ${odds.homeWin?.toFixed(2) || 'N/A'} / ${awayTeam} ${odds.awayWin?.toFixed(2) || 'N/A'}
[AI 승률] ${homeTeam} ${odds.homeProb}% / ${awayTeam} ${odds.awayProb}%
[오버언더] ${odds.ouLine || 'N/A'} (Over ${odds.overOdds?.toFixed(2) || 'N/A'} / Under ${odds.underOdds?.toFixed(2) || 'N/A'})`
    : '[배당: 데이터 없음]'

  return `당신은 야구 전문 블로그 라이터입니다. 아래 데이터를 기반으로 블로그 포스팅을 작성해주세요.

=== 경기 정보 ===
리그: ${league}
대진: ${homeTeam} (홈) vs ${awayTeam} (원정)
${pitcherStr}

[최근 10경기 성적]
- ${homeTeam}: ${homeRecentStr}
- ${awayTeam}: ${awayRecentStr}

${seasonStr(homeSeason, homeTeam)}

${seasonStr(awaySeason, awayTeam)}

${oddsStr}

=== 작성 규칙 ===
1. 반드시 "~입니다", "~합니다" 존댓말 사용
2. 마크다운(표, 굵은 글씨, # 등) 절대 금지. 순수 텍스트만 작성
3. 줄바꿈 포함 서술형으로 구성
4. 각 섹션 300~400자 내외

=== 반드시 아래 JSON 형식으로만 응답하세요 ===
{
  "title": "[${league}] ${homeTeam} vs ${awayTeam} 분석 리포트",
  "body1": "최근 10경기 승률 흐름 및 팀 뉴스 기반 매치 프리뷰 (300~400자)",
  "body2": "선발 투수 매치업 분석 - ERA, WHIP 등 핵심 지표 및 강약점 비교 (300~400자)",
  "body3": "최근 10경기 팀 생산력 및 시즌 스탯 비교, 타선 및 전력 분석 (300~400자)",
  "body4": "AI 전력 분석(승패 확률, 언더오버), 배당률 기반 최종 승부예측 및 픽 추천, 마무리 인사 (300~400자)",
  "tags": ["트렌드사커", "리그명", "팀명1", "팀명2", "승부예측"]
}

JSON만 응답하세요. 다른 텍스트 없이 JSON 객체만 반환하세요.`
}

// ═══════════════════════════════════════════
// Gemini API 호출
// ═══════════════════════════════════════════
async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${errText}`)
  }

  const json = await res.json()
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned empty response')
  return text
}

// ═══════════════════════════════════════════
// 응답 파싱
// ═══════════════════════════════════════════
function parseGeminiResponse(raw: string, matchData: any) {
  try {
    // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
    let jsonStr = raw.trim()
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)```/)
    if (jsonMatch) jsonStr = jsonMatch[1].trim()

    const parsed = JSON.parse(jsonStr)

    return {
      title: parsed.title || `${matchData.homeTeam} vs ${matchData.awayTeam} 분석`,
      body1: parsed.body1 || '',
      body2: parsed.body2 || '',
      body3: parsed.body3 || '',
      body4: parsed.body4 || '',
      tags: parsed.tags || ['트렌드사커', matchData.league, matchData.homeTeam, matchData.awayTeam],
    }
  } catch (e) {
    // JSON 파싱 실패 시 raw 텍스트를 body1에 넣어서 반환
    console.error('[generate-blog] JSON parse failed, returning raw:', e)
    return {
      title: `${matchData.homeTeam} vs ${matchData.awayTeam} 분석`,
      body1: raw,
      body2: '',
      body3: '',
      body4: '',
      tags: ['트렌드사커', matchData.league, matchData.homeTeam, matchData.awayTeam],
    }
  }
}
