// app/api/baseball/pitcher-stats/route.ts
// DB baseball_matches의 home_pitcher_id / away_pitcher_id 기반으로
// MLB Stats API에서 상세 투수 스탯 조회
//
// GET /api/baseball/pitcher-stats?matchId=123          ← DB 내부 PK 또는 api_match_id (자동 fallback)
// GET /api/baseball/pitcher-stats?apiMatchId=179016    ← 명시적으로 api_match_id (MLB Game ID)
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

async function fetchPitcherStats(pitcherId: number, language: 'ko' | 'en' = 'ko'): Promise<PitcherStat | null> {
  const en = language === 'en'
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
      const eraStr = era.toFixed(2)
      const whipStr = whip.toFixed(2)
      if (era > 0 && era <= 3.00) strengths.push(en ? `Ace-level ERA (${eraStr})` : `에이스급 ERA (${eraStr})`)
      else if (era > 0 && era <= 3.75) strengths.push(en ? `Stable ERA (${eraStr})` : `안정적인 ERA (${eraStr})`)
      else if (era >= 5.00) weakness.push(en ? `High ERA (${eraStr})` : `높은 ERA (${eraStr})`)

      if (k9 >= 10) strengths.push(en ? `K machine (K/9 ${k9})` : `탈삼진 머신 (K/9 ${k9})`)
      else if (k9 >= 8.5) strengths.push(en ? `High K rate (K/9 ${k9})` : `높은 삼진율 (K/9 ${k9})`)
      else if (k9 < 6) weakness.push(en ? `Low K rate (K/9 ${k9})` : `낮은 삼진율 (K/9 ${k9})`)

      if (whip > 0 && whip <= 1.10) strengths.push(en ? `Excellent WHIP (${whipStr})` : `출루 억제 탁월 (WHIP ${whipStr})`)
      else if (whip >= 1.45) weakness.push(en ? `Many baserunners (WHIP ${whipStr})` : `주자 허용 많음 (WHIP ${whipStr})`)

      if (kbb >= 3.5) strengths.push(en ? `Good command (K/BB ${kbb})` : `제구력 우수 (K/BB ${kbb})`)
      else if (kbb < 2.0 && bb > 5) weakness.push(en ? `High walk rate (K/BB ${kbb})` : `볼넷 허용 잦음 (K/BB ${kbb})`)

      if (s.homeRuns) {
        const hr9 = parseFloat(((s.homeRuns / ip) * 9).toFixed(1))
        if (hr9 >= 1.5) weakness.push(en ? `HR vulnerability (HR/9 ${hr9})` : `홈런 허용 주의 (HR/9 ${hr9})`)
      }
    } else {
      strengths.push(en ? 'Pre-season — stats being compiled' : '시즌 개막 전 (통계 집계 중)')
    }

    const handCode = person.pitchHand?.code
    const hand = en
      ? (handCode === 'L' ? 'LHP' : 'RHP')
      : (handCode === 'L' ? '좌완' : '우완')
    const wins = s.wins ?? 0
    const losses = s.losses ?? 0
    const eraStr = era.toFixed(2)
    let summary = `${hand} ${person.fullName}`
    if (ip > 0) {
      if (en) {
        summary += ` has a ${wins}W-${losses}L record with a ${eraStr} ERA`
        if (era <= 3.75) summary += ', showing stable pitching.'
        else if (era >= 5.00) summary += ', currently struggling.'
        else summary += '.'
        if (k9 >= 9) summary += ` Strong K rate (K/9 ${k9}) stands out.`
      } else {
        summary += `은 ${wins}승 ${losses}패 ERA ${eraStr}`
        if (era <= 3.75) summary += '로 안정적인 피칭을 보여주고 있습니다.'
        else if (era >= 5.00) summary += '로 다소 고전 중입니다.'
        else summary += '를 기록 중입니다.'
        if (k9 >= 9) summary += ` 탈삼진 능력(K/9 ${k9})이 돋보이는 투수입니다.`
      }
    } else {
      summary += en ? ' — making season debut.' : ` — 이번 시즌 첫 등판 예정입니다.`
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

function buildMatchupNote(home: PitcherStat | null, away: PitcherStat | null, language: 'ko' | 'en' = 'ko'): string {
  const en = language === 'en'
  if (!home && !away) return en ? 'Starting pitchers not yet announced.' : '선발투수 정보가 아직 발표되지 않았습니다.'
  if (!home) return en
    ? `Only away starter ${away!.fullName} confirmed. Home starter TBD.`
    : `원정 선발 ${away!.fullName}의 정보만 확인됩니다. 홈 선발은 미정입니다.`
  if (!away) return en
    ? `Only home starter ${home.fullName} confirmed. Away starter TBD.`
    : `홈 선발 ${home.fullName}의 정보만 확인됩니다. 원정 선발은 미정입니다.`

  const homeIp = parseFloat(home.inningsPitched)
  const awayIp = parseFloat(away.inningsPitched)

  if (homeIp === 0 && awayIp === 0) {
    return en
      ? `${home.fullName} vs ${away.fullName} — both starters making season debuts. Previous season stats and spring training performance are key indicators.`
      : `${home.fullName} vs ${away.fullName} — 두 선발 모두 이번 시즌 첫 등판입니다. 지난 시즌 기록과 스프링트레이닝 퍼포먼스가 주요 판단 기준입니다.`
  }

  const eraGap = Math.abs(home.era - away.era)
  const homeBetter = home.era <= away.era
  const betterEn = homeBetter ? `home starter ${home.fullName}` : `away starter ${away.fullName}`
  const betterKo = homeBetter ? `홈 선발 ${home.fullName}` : `원정 선발 ${away.fullName}`
  const worse = homeBetter ? away : home
  const worseEraStr = worse.era.toFixed(2)
  const gapStr = eraGap.toFixed(2)

  if (eraGap >= 1.5) {
    return en
      ? `Clear ERA gap (${gapStr}) in this matchup. ${betterEn} holds a decisive edge, and whether ${worse.fullName} (ERA ${worseEraStr}) can contain opposing bats is the key variable.`
      : `ERA 격차(${gapStr})가 뚜렷한 매치업입니다. ${betterKo}이 확연히 우세하며, ${worse.fullName}(ERA ${worseEraStr})의 제압 여부가 경기의 핵심 변수입니다.`
  } else if (eraGap >= 0.75) {
    return en
      ? `${betterEn} has a slight edge but both starters are competitive — a tight matchup. Bullpen usage and defense should decide the outcome.`
      : `${betterKo}이 소폭 유리하나 두 선발 모두 경쟁력 있는 박빙의 매치업입니다. 불펜 운용과 수비가 승패를 가를 것으로 예상됩니다.`
  } else {
    return en
      ? `${home.fullName} (ERA ${home.era.toFixed(2)}) vs ${away.fullName} (ERA ${away.era.toFixed(2)}) — stats are nearly even. Run support and ballpark factors will be key variables.`
      : `${home.fullName}(ERA ${home.era.toFixed(2)}) vs ${away.fullName}(ERA ${away.era.toFixed(2)}) — 스탯이 거의 대등합니다. 타선 지원과 구장 요소가 핵심 변수가 될 것입니다.`
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const matchId = searchParams.get('matchId')
  const apiMatchIdParam = searchParams.get('apiMatchId')
  const homePitcherId = searchParams.get('homePitcherId')
  const awayPitcherId = searchParams.get('awayPitcherId')
  // 🌐 language=en|ko (lang fallback)
  const langParam = (searchParams.get('language') ?? searchParams.get('lang') ?? 'ko').toLowerCase()
  const language: 'ko' | 'en' = langParam === 'en' ? 'en' : 'ko'

  try {
    let homeId: number | null = null
    let awayId: number | null = null

    if (matchId || apiMatchIdParam) {
      // 우선순위: apiMatchId 명시 > matchId
      // matchId가 들어왔을 때도 내부 PK(id)로 먼저 시도, 못 찾으면 api_match_id로 fallback
      // (외주 앱이 api_match_id를 matchId 자리에 넣어서 보내는 케이스 호환)
      let match: any = null
      if (apiMatchIdParam) {
        const r = await supabase
          .from('baseball_matches')
          .select('home_pitcher_id, away_pitcher_id, home_pitcher, away_pitcher')
          .eq('api_match_id', apiMatchIdParam)
          .maybeSingle()
        if (r.error) throw r.error
        match = r.data
      } else if (matchId) {
        // 1차: 내부 PK
        const r1 = await supabase
          .from('baseball_matches')
          .select('home_pitcher_id, away_pitcher_id, home_pitcher, away_pitcher')
          .eq('id', matchId)
          .maybeSingle()
        if (r1.error) throw r1.error
        match = r1.data
        // 2차 fallback: api_match_id (앱이 잘못 보낸 케이스 자동 보정)
        if (!match) {
          const r2 = await supabase
            .from('baseball_matches')
            .select('home_pitcher_id, away_pitcher_id, home_pitcher, away_pitcher')
            .eq('api_match_id', matchId)
            .maybeSingle()
          if (r2.error) throw r2.error
          match = r2.data
        }
      }

      homeId = match?.home_pitcher_id ?? null
      awayId = match?.away_pitcher_id ?? null

      // pitcher_id 없으면 이름만 반환 (선발 미발표 OR KBO/NPB처럼 MLB Stats API ID 부재)
      if (!homeId && !awayId) {
        return NextResponse.json({
          success: true,
          homePitcher: null,
          awayPitcher: null,
          homePitcherName: match?.home_pitcher ?? null,
          awayPitcherName: match?.away_pitcher ?? null,
          matchupNote: match
            ? (language === 'en'
              ? 'Starting pitchers not yet announced.'
              : '선발투수가 아직 발표되지 않았습니다.')
            : 'match not found — matchId 또는 apiMatchId가 DB와 매칭되지 않습니다.',
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
      homeId ? fetchPitcherStats(homeId, language) : Promise.resolve(null),
      awayId ? fetchPitcherStats(awayId, language) : Promise.resolve(null),
    ])

    return NextResponse.json({
      success: true,
      season: SEASON,
      homePitcher,
      awayPitcher,
      matchupNote: buildMatchupNote(homePitcher, awayPitcher, language),
    })

  } catch (error: any) {
    console.error('pitcher-stats error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
