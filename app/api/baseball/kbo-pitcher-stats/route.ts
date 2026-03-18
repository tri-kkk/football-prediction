// app/api/baseball/kbo-pitcher-stats/route.ts
// KBO 선발 투수 이름으로 DB에서 스탯 조회
//
// GET /api/baseball/kbo-pitcher-stats?homePitcher=고영표&awayPitcher=원태인&season=2025

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface KboPitcherStat {
  name: string
  team: string
  season: string
  era: number | null
  games: number | null
  wins: number | null
  losses: number | null
  saves: number | null
  holds: number | null
  wpct: number | null
  hits: number | null
  home_runs: number | null
  walks: number | null
  hit_by_pitch: number | null
  strikeouts: number | null
  runs: number | null
  earned_runs: number | null
  whip: number | null
  strengths: string[]
  weakness: string[]
  summary: string
}

function buildAnalysis(s: any): { strengths: string[]; weakness: string[]; summary: string } {
  const strengths: string[] = []
  const weakness: string[] = []

  const era  = s.era  ?? null
  const whip = s.whip ?? null
  const k    = s.strikeouts ?? 0
  const bb   = s.walks ?? 0
  const g    = s.games ?? 0

  if (era !== null) {
    if (era <= 3.00)       strengths.push(`에이스급 ERA (${era.toFixed(2)})`)
    else if (era <= 3.75)  strengths.push(`안정적인 ERA (${era.toFixed(2)})`)
    else if (era >= 5.50)  weakness.push(`높은 ERA (${era.toFixed(2)})`)
  }

  if (whip !== null) {
    if (whip <= 1.10)      strengths.push(`출루 억제 탁월 (WHIP ${whip.toFixed(2)})`)
    else if (whip >= 1.50) weakness.push(`주자 허용 많음 (WHIP ${whip.toFixed(2)})`)
  }

  if (k > 0 && g > 0) {
    const kPerGame = parseFloat((k / g).toFixed(1))
    if (kPerGame >= 7)      strengths.push(`탈삼진 능력 우수 (경기당 ${kPerGame}K)`)
    else if (kPerGame < 4)  weakness.push(`낮은 삼진율 (경기당 ${kPerGame}K)`)
  }

  if (bb > 0 && k > 0) {
    const kbb = parseFloat((k / bb).toFixed(1))
    if (kbb >= 3.0)         strengths.push(`제구력 우수 (K/BB ${kbb})`)
    else if (kbb < 1.5)     weakness.push(`볼넷 허용 잦음 (K/BB ${kbb})`)
  }

  if (s.home_runs && g > 0) {
    const hrPerGame = parseFloat((s.home_runs / g).toFixed(2))
    if (hrPerGame >= 0.5)   weakness.push(`홈런 허용 주의 (경기당 ${hrPerGame}HR)`)
  }

  const w = s.wins ?? 0
  const l = s.losses ?? 0
  let summary = `${s.name}`
  if (era !== null && g > 0) {
    summary += `은 ${w}승 ${l}패 ERA ${era.toFixed(2)}`
    if (era <= 3.75)       summary += '로 안정적인 피칭을 보여주고 있습니다.'
    else if (era >= 5.50)  summary += '로 다소 고전 중입니다.'
    else                   summary += '를 기록 중입니다.'
    if (k > 0 && g > 0) {
      const kPerGame = parseFloat((k / g).toFixed(1))
      if (kPerGame >= 7)   summary += ` 경기당 ${kPerGame}개의 탈삼진으로 지배적인 피칭을 보여줍니다.`
    }
  } else {
    summary += ' — 이번 시즌 기록 집계 중입니다.'
  }

  return { strengths, weakness, summary }
}

async function fetchKboPitcherStat(name: string, season: string, league: string = 'kbo'): Promise<KboPitcherStat | null> {
  if (!name) return null
  const table = league === 'npb' ? 'npb_pitcher_stats' : 'kbo_pitcher_stats'

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('season', season)
    .ilike('name', name.trim())
    .maybeSingle()

  if (error || !data) {
    const keyword = name.trim().slice(0, 2)
    const { data: fallback } = await supabase
      .from(table)
      .select('*')
      .eq('season', season)
      .ilike('name', `${keyword}%`)
      .maybeSingle()

    if (!fallback) return null

    const { strengths, weakness, summary } = buildAnalysis(fallback)
    return { ...fallback, strengths, weakness, summary }
  }

  const { strengths, weakness, summary } = buildAnalysis(data)
  return { ...data, strengths, weakness, summary }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const homePitcher = searchParams.get('homePitcher') ?? ''
  const awayPitcher = searchParams.get('awayPitcher') ?? ''
  const season      = searchParams.get('season') ?? '2025'
  const league      = searchParams.get('league') ?? 'kbo'

  if (!homePitcher && !awayPitcher) {
    return NextResponse.json(
      { success: false, error: 'homePitcher 또는 awayPitcher 파라미터 필요' },
      { status: 400 }
    )
  }

  try {
    const [homeStats, awayStats] = await Promise.all([
      homePitcher ? fetchKboPitcherStat(homePitcher, season, league) : Promise.resolve(null),
      awayPitcher ? fetchKboPitcherStat(awayPitcher, season, league) : Promise.resolve(null),
    ])

    return NextResponse.json({
      success: true,
      season,
      homePitcher: homeStats,
      awayPitcher: awayStats,
    })

  } catch (error: any) {
    console.error('kbo-pitcher-stats error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}