// ─── 야구 데이터 수집 모듈 ───
// Supabase에서 야구 경기 데이터를 직접 수집 (기존 generate-blog의 collectBaseballData 로직 재활용)

import { createClient } from '@supabase/supabase-js'
import { CONFIG } from './config.js'

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY)

/**
 * 특정 날짜의 야구 경기 목록 조회
 * @param {string} targetDate - YYYY-MM-DD 형식
 * @param {string[]} leagues - 대상 리그 배열 ['KBO', 'MLB', 'NPB']
 */
export async function getBaseballMatches(targetDate, leagues = CONFIG.TARGET_LEAGUES) {
  const { data, error } = await supabase
    .from('baseball_matches')
    .select('id, api_match_id, home_team, away_team, home_team_ko, away_team_ko, league, match_date, match_time, status, home_pitcher, away_pitcher, home_pitcher_ko, away_pitcher_ko, home_pitcher_era, away_pitcher_era, home_pitcher_whip, away_pitcher_whip, home_pitcher_k, away_pitcher_k')
    .eq('match_date', targetDate)
    .in('league', leagues)
    .not('status', 'in', '("POST","CANC","PST")')
    .order('match_time', { ascending: true })

  if (error) throw new Error(`경기 목록 조회 실패: ${error.message}`)

  console.log(`📋 ${targetDate} 경기 ${data?.length || 0}개 조회됨 (리그: ${leagues.join(', ')})`)
  return data || []
}

/**
 * 단일 경기의 상세 데이터 수집
 * @param {object} match - baseball_matches 테이블 row
 */
export async function collectMatchData(match) {
  const matchId = match.api_match_id || match.id
  const season = String(new Date(match.match_date).getFullYear())

  // 병렬 조회
  const [odds, homeSeason, awaySeason, homeRecent, awayRecent, h2h] = await Promise.all([
    // 1) 배당 데이터
    getOdds(matchId),
    // 2) 홈팀 시즌 스탯
    getTeamSeasonStats(match.home_team, match.league, season),
    // 3) 원정팀 시즌 스탯
    getTeamSeasonStats(match.away_team, match.league, season),
    // 4) 홈팀 최근 10경기
    getRecentGames(match.home_team, match.match_date, 10),
    // 5) 원정팀 최근 10경기
    getRecentGames(match.away_team, match.match_date, 10),
    // 6) 상대 전적
    getH2H(match.home_team, match.away_team, 10),
  ])

  return {
    matchId: String(matchId),
    homeTeam: match.home_team_ko || match.home_team,
    awayTeam: match.away_team_ko || match.away_team,
    homeTeamEn: match.home_team,
    awayTeamEn: match.away_team,
    league: match.league,
    matchDate: match.match_date,
    matchTime: match.match_time || '',
    pitcher: {
      home: {
        name: match.home_pitcher_ko || match.home_pitcher || '미정',
        nameEn: match.home_pitcher || '',
        era: match.home_pitcher_era,
        whip: match.home_pitcher_whip,
        k: match.home_pitcher_k,
      },
      away: {
        name: match.away_pitcher_ko || match.away_pitcher || '미정',
        nameEn: match.away_pitcher || '',
        era: match.away_pitcher_era,
        whip: match.away_pitcher_whip,
        k: match.away_pitcher_k,
      },
    },
    odds: odds || null,
    homeSeason: homeSeason || null,
    awaySeason: awaySeason || null,
    homeRecent: homeRecent || [],
    awayRecent: awayRecent || [],
    h2h: h2h || [],
  }
}

// ─── 배당 조회 ───
async function getOdds(apiMatchId) {
  const { data } = await supabase
    .from('baseball_odds_latest')
    .select('home_win_odds, away_win_odds, home_win_prob, away_win_prob, over_under_line, over_odds, under_odds')
    .eq('api_match_id', apiMatchId)
    .single()
  return data
}

// ─── 시즌 팀 스탯 ───
async function getTeamSeasonStats(teamName, league, season) {
  const { data } = await supabase
    .from('baseball_team_season_stats')
    .select('*')
    .eq('team_name', teamName)
    .eq('league', league)
    .eq('season', season)
    .single()
  return data
}

// ─── 최근 경기 ───
async function getRecentGames(teamName, beforeDate, limit) {
  const { data } = await supabase
    .from('baseball_matches')
    .select('home_team, away_team, home_team_ko, away_team_ko, home_score, away_score, match_date, status')
    .or(`home_team.eq.${teamName},away_team.eq.${teamName}`)
    .lt('match_date', beforeDate)
    .eq('status', 'FT')
    .order('match_date', { ascending: false })
    .limit(limit)
  return data
}

// ─── 상대 전적 ───
async function getH2H(homeTeam, awayTeam, limit) {
  const { data } = await supabase
    .from('baseball_matches')
    .select('home_team, away_team, home_team_ko, away_team_ko, home_score, away_score, match_date')
    .or(`and(home_team.eq.${homeTeam},away_team.eq.${awayTeam}),and(home_team.eq.${awayTeam},away_team.eq.${homeTeam})`)
    .eq('status', 'FT')
    .order('match_date', { ascending: false })
    .limit(limit)
  return data
}

/**
 * 최근 경기 전적 요약 계산
 */
export function calcRecentRecord(games, teamNameEn) {
  if (!games || games.length === 0) return { wins: 0, losses: 0, text: '데이터 없음' }
  let w = 0, l = 0
  games.forEach(g => {
    const isHome = g.home_team === teamNameEn
    const won = isHome ? g.home_score > g.away_score : g.away_score > g.home_score
    if (won) w++; else l++
  })
  return { wins: w, losses: l, text: `${w}승 ${l}패` }
}

/**
 * 내일 날짜 (KST)
 */
export function getTomorrowKST() {
  const now = new Date()
  now.setHours(now.getHours() + 9) // UTC → KST
  now.setDate(now.getDate() + 1)
  return now.toISOString().split('T')[0]
}

/**
 * 오늘 날짜 (KST)
 */
export function getTodayKST() {
  const now = new Date()
  now.setHours(now.getHours() + 9)
  return now.toISOString().split('T')[0]
}
