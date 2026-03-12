// app/api/baseball/pitcher-stats/route.ts
// DB baseball_matches의 home_pitcher_id / away_pitcher_id 기반으로
// MLB Stats API에서 상세 투수 스탯 조회
//
// GET /api/baseball/pitcher-stats?matchId=123
// GET /api/baseball/pitcher-stats?homePitcherId=592450&awayPitcherId=660271

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MLB_API = 'https://statsapi.mlb.com/api/v1'
const SEASON = new Date().getFullYear()

export interface PitcherStat {
  playerId: number
  fullName: string
  photo: string
  team: string
  throwingHand: string
  era: number
  wins: number
  losses: number
  gamesStarted: number
  inningsPitched: string
  strikeOuts: number
  baseOnBalls: number
  homeRuns: number
  whip: number
  strikeoutsPer9Inn: number
  walksPer9Inn: number
  strikeoutWalkRatio: number
  strengths: string[]
  weakness: string[]
  summary: string
}

async function fetchPitcherStats(pitcherId: number): Promise<PitcherStat | null> {
  try {
    const [personRes, statsRes] = await Promise.all([
      fetch(`${MLB_API}/people/${pitcherId}?hydrate=currentTeam`, {
        signal: AbortSignal.timeout(5000),
      }),
      fetch(`${MLB_API}/people/${pitcherId}/stats?stats=season&group=pitching&season=${SEASON}&sportId=1`, {
        signal: AbortSignal.timeout(5000),
      }),
    ])

    if (!personRes.ok || !statsRes.ok) return null

    const [personData, statsData] = await Promise.all([
      personRes.json(),
      statsRes.json(),
    ])

    const person = personData.people?.[0]
    if (!person) return null

    const splits = statsData.stats?.[0]?.splits
    const s = splits?.[0]?.stat ?? {}

    const era = parseFloat(s.era ?? '0') || 0
    const whip = parseFloat(s.whip ?? '0') || 0
    const ip = parseFloat(s.inningsPitched ?? '0') || 0
    const k = s.strikeOuts ?? 0
    const bb = s.baseOnBalls ?? 0
    const k9 = ip > 0 ? parseFloat(((k / ip) * 9).toFixed(1)) : 0
    const bb9 = ip > 0 ? parseFloat(((bb / ip) * 9).toFixed(1)) : 0
    const kbb = bb > 0 ? parseFloat((k / bb).toFixed(1)) : k

    const strengths: string[] = []
    const weakness: string[] = []

    if (ip > 0) {
      if (era > 0 && era <= 3.00) strengths.push(`에이스급 ERA (${era.toFixed(2)})`)
      else if (era > 0 && era <= 3.75) strengths.push(`안정적인 ERA (${era.toFixed(2)})`)
      else if (era >= 5.00) weakness.push(`높은 ERA (${era.toFixed(2)})`)

      if (k9 >= 10) strengths.push(`탈삼진 머신 (K/9 ${k9})`)
      else if (k9 >= 8.5) strengths.push(`높은 삼진율 (K/9 ${k9})`)
      else if (k9 < 6) weakness.push(`낮은 삼진율 (K/9 ${k9})`)

      if (whip > 0 && whip <= 1.10) strengths.push(`출루 억제 탁월 (WHIP ${whip.toFixed(2)})`)
      else if (whip >= 1.45) weakness.push(`주자 허용 많음 (WHIP ${whip.toFixed(2)})`)

      if (kbb >= 3.5) strengths.push(`제구력 우수 (K/BB ${kbb})`)
      else if (kbb < 2.0 && bb > 5) weakness.push(`볼넷 허용 잦음 (K/BB ${kbb})`)

      if (s.homeRuns) {
        const hr9 = parseFloat(((s.homeRuns / ip) * 9).toFixed(1))
        if (hr9 >= 1.5) weakness.push(`홈런 허용 주의 (HR/9 ${hr9})`)
      }
    } else {
      strengths.push('시즌 개막 전 (통계 집계 중)')
    }

    const hand = person.pitchHand?.code === 'L' ? '좌완' : '우완'
    const wins = s.wins ?? 0
    const losses = s.losses ?? 0
    let summary = `${hand} ${person.fullName}`
    if (ip > 0) {
      summary += `은 ${wins}승 ${losses}패 ERA ${era.toFixed(2)}`
      if (era <= 3.75) summary += '로 안정적인 피칭을 보여주고 있습니다.'
      else if (era >= 5.00) summary += '로 다소 고전 중입니다.'
      else summary += '를 기록 중입니다.'
      if (k9 >= 9) summary += ` 탈삼진 능력(K/9 ${k9})이 돋보이는 투수입니다.`
    } else {
      summary += ` — 이번 시즌 첫 등판 예정입니다.`
    }

    return {
      playerId: pitcherId,
      fullName: person.fullName,
      photo: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${pitcherId}/headshot/67/current`,
      team: person.currentTeam?.name ?? '',
      throwingHand: person.pitchHand?.code ?? '?',
      era, wins, losses,
      gamesStarted: s.gamesStarted ?? 0,
      inningsPitched: s.inningsPitched ?? '0.0',
      strikeOuts: k,
      baseOnBalls: bb,
      homeRuns: s.homeRuns ?? 0,
      whip,
      strikeoutsPer9Inn: k9,
      walksPer9Inn: bb9,
      strikeoutWalkRatio: kbb,
      strengths,
      weakness,
      summary,
    }
  } catch (e) {
    console.error(`fetchPitcherStats(${pitcherId}) error:`, e)
    return null
  }
}

function buildMatchupNote(home: PitcherStat | null, away: PitcherStat | null): string {
  if (!home && !away) return '선발투수 정보가 아직 발표되지 않았습니다.'
  if (!home) return `원정 선발 ${away!.fullName}의 정보만 확인됩니다. 홈 선발은 미정입니다.`
  if (!away) return `홈 선발 ${home.fullName}의 정보만 확인됩니다. 원정 선발은 미정입니다.`

  const homeIp = parseFloat(home.inningsPitched)
  const awayIp = parseFloat(away.inningsPitched)

  if (homeIp === 0 && awayIp === 0) {
    return `${home.fullName} vs ${away.fullName} — 두 선발 모두 이번 시즌 첫 등판입니다. 지난 시즌 기록과 스프링트레이닝 퍼포먼스가 주요 판단 기준입니다.`
  }

  const eraGap = Math.abs(home.era - away.era)
  const better = home.era <= away.era ? `홈 선발 ${home.fullName}` : `원정 선발 ${away.fullName}`
  const worse = home.era <= away.era ? away : home

  if (eraGap >= 1.5) {
    return `ERA 격차(${eraGap.toFixed(2)})가 뚜렷한 매치업입니다. ${better}이 확연히 우세하며, ${worse.fullName}(ERA ${worse.era.toFixed(2)})의 제압 여부가 경기의 핵심 변수입니다.`
  } else if (eraGap >= 0.75) {
    return `${better}이 소폭 유리하나 두 선발 모두 경쟁력 있는 박빙의 매치업입니다. 불펜 운용과 수비가 승패를 가를 것으로 예상됩니다.`
  } else {
    return `${home.fullName}(ERA ${home.era.toFixed(2)}) vs ${away.fullName}(ERA ${away.era.toFixed(2)}) — 스탯이 거의 대등합니다. 타선 지원과 구장 요소가 핵심 변수가 될 것입니다.`
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const matchId = searchParams.get('matchId')
  const homePitcherId = searchParams.get('homePitcherId')
  const awayPitcherId = searchParams.get('awayPitcherId')

  try {
    let homeId: number | null = null
    let awayId: number | null = null

    if (matchId) {
      // DB에서 pitcher_id 조회
      const { data: match, error } = await supabase
        .from('baseball_matches')
        .select('home_pitcher_id, away_pitcher_id, home_pitcher, away_pitcher')
        .eq('id', matchId)
        .maybeSingle()

      if (error) throw error

      homeId = match?.home_pitcher_id ?? null
      awayId = match?.away_pitcher_id ?? null

      // pitcher_id 없으면 이름만 반환 (선발 미발표)
      if (!homeId && !awayId) {
        return NextResponse.json({
          success: true,
          homePitcher: null,
          awayPitcher: null,
          homePitcherName: match?.home_pitcher ?? null,
          awayPitcherName: match?.away_pitcher ?? null,
          matchupNote: '선발투수가 아직 발표되지 않았습니다.',
        })
      }
    } else {
      homeId = homePitcherId ? parseInt(homePitcherId) : null
      awayId = awayPitcherId ? parseInt(awayPitcherId) : null
    }

    if (!homeId && !awayId) {
      return NextResponse.json({
        success: false,
        error: 'matchId 또는 homePitcherId/awayPitcherId 필요',
      }, { status: 400 })
    }

    const [homePitcher, awayPitcher] = await Promise.all([
      homeId ? fetchPitcherStats(homeId) : Promise.resolve(null),
      awayId ? fetchPitcherStats(awayId) : Promise.resolve(null),
    ])

    return NextResponse.json({
      success: true,
      season: SEASON,
      homePitcher,
      awayPitcher,
      matchupNote: buildMatchupNote(homePitcher, awayPitcher),
    })

  } catch (error: any) {
    console.error('pitcher-stats error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
