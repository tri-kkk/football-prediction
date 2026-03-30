// app/api/baseball/kbo-pitcher-stats/route.ts
// KBO 선발 투수 이름으로 DB에서 스탯 조회
//
// GET /api/baseball/kbo-pitcher-stats?homePitcher=고영표&awayPitcher=원태인&season=2025&homeTeam=한화 이글스&awayTeam=KT 위즈

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

// DB 팀명으로 정규화 (풀네임 → DB 저장명)
const KBO_TEAM_NORMALIZE: Record<string, string> = {
  '한화 이글스': '한화',
  'KT 위즈': 'KT',
  'LG 트윈스': 'LG',
  'SSG 랜더스': 'SSG',
  '키움 히어로즈': '키움',
  '롯데 자이언츠': '롯데',
  '삼성 라이온즈': '삼성',
  '두산 베어스': '두산',
  'KIA 타이거즈': 'KIA',
  'NC 다이노스': 'NC',
}

const NPB_TEAM_NORMALIZE: Record<string, string> = {
  '요미우리 자이언츠': '요미우리',
  '한신 타이거즈': '한신',
  '한신 타이거스': '한신',
  '히로시마 카프': '히로시마',
  '주니치 드래곤스': '주니치',
  '야쿠르트 스왈로스': '야쿠르트',
  '도쿄 야쿠르트 스왈로즈': '야쿠르트',
  '도쿄 야쿠르트 스왈로스': '야쿠르트',
  '요코하마 DeNA 베이스타스': '요코하마',
  '요코하마 베이스타즈': '요코하마',
  '소프트뱅크 호크스': '소프트뱅크',
  '오릭스 버팔로스': '오릭스',
  '지바 롯데 마린스': '지바롯데',
  '롯데 마린즈': '지바롯데',
  '라쿠텐 골든이글스': '라쿠텐',
  '세이부 라이온즈': '세이부',
  '닛폰햄 파이터즈': '니혼햄',
  '히로시마 도요 카프': '히로시마',
  '주니치 드래곤즈': '주니치',
  '야쿠르트 스왈로즈': '야쿠르트',
  '요코하마 DeNA 베이스타즈': '요코하마',
  '후쿠오카 소프트뱅크 호크스': '소프트뱅크',
  '오릭스 버팔로즈': '오릭스',
  '지바 롯데 마린즈': '지바롯데',
  '도호쿠 라쿠텐 골든이글스': '라쿠텐',
  '사이타마 세이부 라이온즈': '세이부',
  '홋카이도 닛폰햄 파이터즈': '니혼햄',
}

function normalizeTeam(team: string, league: string): string {
  if (league === 'npb') return NPB_TEAM_NORMALIZE[team] ?? team
  return KBO_TEAM_NORMALIZE[team] ?? team
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

async function fetchKboPitcherStat(
  name: string,
  season: string,
  league: string = 'kbo',
  team?: string
): Promise<KboPitcherStat | null> {
  if (!name) return null
  const table = league === 'npb' ? 'npb_pitcher_stats' : 'kbo_pitcher_stats'

  // 팀명 있으면 같이 조회 (동명이인 방지)
  let query = supabase
    .from(table)
    .select('*')
    .eq('season', season)
    .ilike('name', name.trim())

  if (team) query = (query as any).ilike('team', team.trim())

  const { data, error } = await (query as any).maybeSingle()

  if (error || !data) {
    // fallback: 이름 앞 2글자로 조회
    const keyword = name.trim().slice(0, 2)
    let fallbackQuery = supabase
      .from(table)
      .select('*')
      .eq('season', season)
      .ilike('name', `${keyword}%`)

    if (team) fallbackQuery = (fallbackQuery as any).ilike('team', team.trim())

    const { data: fallback } = await (fallbackQuery as any).maybeSingle()

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
  const homeTeamRaw = searchParams.get('homeTeam') ?? ''
  const awayTeamRaw = searchParams.get('awayTeam') ?? ''

  // 팀명 정규화 (한화 이글스 → 한화 등)
  const homeTeam = homeTeamRaw ? normalizeTeam(homeTeamRaw, league) : ''
  const awayTeam = awayTeamRaw ? normalizeTeam(awayTeamRaw, league) : ''

  if (!homePitcher && !awayPitcher) {
    return NextResponse.json(
      { success: false, error: 'homePitcher 또는 awayPitcher 파라미터 필요' },
      { status: 400 }
    )
  }

  try {
    const [homeStats, awayStats] = await Promise.all([
      homePitcher ? fetchKboPitcherStat(homePitcher, season, league, homeTeam || undefined) : Promise.resolve(null),
      awayPitcher ? fetchKboPitcherStat(awayPitcher, season, league, awayTeam || undefined) : Promise.resolve(null),
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