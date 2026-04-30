// 🔥 매치 정규화 — UnifiedMatch
import type { UnifiedMatch } from './types'

const BASEBALL_LEAGUE_LOGO: Record<string, string> = {
  MLB: 'https://media.api-sports.io/baseball/leagues/1.png',
  NPB: 'https://media.api-sports.io/baseball/leagues/2.png',
  KBO: 'https://media.api-sports.io/baseball/leagues/5.png',
  CPBL: 'https://media.api-sports.io/baseball/leagues/6.png',
}

const LIVE_TOKENS = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'IN_PROGRESS', 'IP'])
const SCHEDULED_TOKENS = new Set(['NS', 'TBD', 'SCHEDULED', 'NOT_STARTED'])
const FINISHED_TOKENS = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO', 'FINISHED', 'FT_PEN', 'FT_AET', 'END'])

export function isLiveStatus(status: string | null | undefined): boolean {
  if (!status) return false
  return LIVE_TOKENS.has(String(status).toUpperCase())
}

export function isScheduledStatus(status: string | null | undefined): boolean {
  if (!status) return true
  return SCHEDULED_TOKENS.has(String(status).toUpperCase())
}

export function isFinishedStatus(status: string | null | undefined): boolean {
  if (!status) return false
  return FINISHED_TOKENS.has(String(status).toUpperCase())
}

const POSTPONED_TOKENS = new Set(['POST', 'POSTPONED', 'PST', 'CANC', 'CANCELLED', 'CANCELED', 'ABD', 'ABANDONED', 'INT'])

export function isPostponedStatus(status: string | null | undefined): boolean {
  if (!status) return false
  return POSTPONED_TOKENS.has(String(status).toUpperCase())
}

export function normalizeFootballMatch(m: any): UnifiedMatch {
  const homeProb = (m.home_probability ?? 0) / 100
  const drawProb = (m.draw_probability ?? 0) / 100
  const awayProb = (m.away_probability ?? 0) / 100
  let aiPick: string | null = null
  if (m.predicted_winner === 'home') aiPick = `${m.home_team} 승`
  else if (m.predicted_winner === 'away') aiPick = `${m.away_team} 승`
  else if (m.predicted_winner === 'draw') aiPick = '무승부'
  return {
    id: m.id ?? m.match_id ?? `f-${m.home_team}-${m.away_team}-${m.commence_time}`,
    sport: 'football',
    league: m.league_code ?? 'UNKNOWN',
    leagueName: m.leagueName,
    leagueLogo: m.leagueLogo,
    date: (m.commence_time ?? '').slice(0, 10),
    time: m.commence_time ? new Date(m.commence_time).toISOString().slice(11, 16) : null,
    timestamp: m.commence_time ?? null,
    status: m.status ?? m.matchStatus ?? 'NS',
    homeTeam: m.home_team ?? '',
    homeTeamKo: m.home_team_ko,
    homeLogo: m.home_team_logo ?? '',
    homeScore: m.finalScoreHome ?? null,
    awayTeam: m.away_team ?? '',
    awayTeamKo: m.away_team_ko,
    awayLogo: m.away_team_logo ?? '',
    awayScore: m.finalScoreAway ?? null,
    odds: (homeProb || awayProb) ? { homeWinProb: homeProb, awayWinProb: awayProb, drawProb } : null,
    aiPick,
    aiPickConfidence: null,
    predictedWinner: m.predicted_winner ?? null,
    predictedScoreHome: m.predicted_score_home ?? null,
    predictedScoreAway: m.predicted_score_away ?? null,
  }
}

export function normalizeBaseballMatch(m: any): UnifiedMatch {
  let aiPick: string | null = null
  if (m.aiPrediction) {
    const hp = m.aiPrediction.homeWinProb ?? 0
    const ap = m.aiPrediction.awayWinProb ?? 0
    const home = m.homeTeamKo || m.homeTeam
    const away = m.awayTeamKo || m.awayTeam
    if (hp > ap) aiPick = `${home} 승`
    else if (ap > hp) aiPick = `${away} 승`
  }
  const gradeParts: string[] = []
  if (m.aiPick) gradeParts.push(m.aiPick)
  if (m.aiPickConfidence) gradeParts.push(m.aiPickConfidence)
  const aiPickConfidence = gradeParts.length > 0 ? gradeParts.join(' · ') : null
  const homeWP = (m.aiPrediction?.homeWinProb ?? 0) / 100
  const awayWP = (m.aiPrediction?.awayWinProb ?? 0) / 100
  return {
    id: m.id ?? `b-${m.homeTeam}-${m.awayTeam}-${m.date}`,
    sport: 'baseball',
    league: m.league ?? 'UNKNOWN',
    leagueName: m.leagueName ?? m.league,
    leagueLogo: m.leagueLogo ?? BASEBALL_LEAGUE_LOGO[m.league] ?? undefined,
    date: m.date ?? '',
    time: m.time ?? null,
    timestamp: m.timestamp ?? m.date ?? null,
    status: m.status ?? m.matchStatus ?? 'NS',
    homeTeam: m.homeTeam ?? '',
    homeTeamKo: m.homeTeamKo,
    homeLogo: m.homeLogo ?? '',
    homeScore: m.homeScore ?? null,
    awayTeam: m.awayTeam ?? '',
    awayTeamKo: m.awayTeamKo,
    awayLogo: m.awayLogo ?? '',
    awayScore: m.awayScore ?? null,
    odds: (homeWP || awayWP) ? { homeWinProb: homeWP, awayWinProb: awayWP } : null,
    aiPick,
    aiPickConfidence,
    innings: m.innings ?? null,
    homePitcher: m.homePitcher ?? null,
    awayPitcher: m.awayPitcher ?? null,
  }
}
