// app/api/baseball/combo-picks/route.ts
// 다경기 분석 조회 API
// GET /api/baseball/combo-picks?league=KBO&date=2026-04-01
// 🌐 ?language=en 으로 호출 시 ai_analysis / picks[].reason 영문 응답
//    - ai_analysis_en 컬럼 lazy fill: 없으면 Claude로 번역 후 DB 저장 (이후 캐시 hit)
//    - picks[].reason 은 응답 시점 매핑 변환

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// --------- reason 영문 매핑 (generate-combo-picks 크론에서 만드는 토큰 기준) ---------
const REASON_PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^배당 확률 ([\d.]+)%$/, (m) => `Bookmaker prob ${m[1]}%`],
  [/^홈팀 최근 폼 우세$/, () => 'Home team recent form advantage'],
  [/^원정팀 최근 폼 우세$/, () => 'Away team recent form advantage'],
  [/^선발투수 ERA 우위$/, () => 'Starting pitcher ERA edge'],
  [/^득실차 \+([\d.]+)$/, (m) => `Run differential +${m[1]}`],
]

function translateReasonToEn(reason: string | null | undefined): string | null | undefined {
  if (!reason) return reason
  return reason.split(',').map((tok) => {
    const t = tok.trim()
    for (const [re, fn] of REASON_PATTERNS) {
      const match = t.match(re)
      if (match) return fn(match)
    }
    return t // 매핑 없는 토큰은 그대로
  }).join(', ')
}

// --------- ai_analysis 한→영 Claude Haiku 번역 ---------
async function translateAnalysisToEn(ko: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || !ko?.trim()) return null
  try {
    const anthropic = new Anthropic({ apiKey: key })
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `다음 한국어 야구 다경기 분석을 영문으로 자연스럽게 번역해 주세요.

원본 형식([총평]/[1경기]/[2경기]/[3경기]/[주의]) 그대로 유지하되, 영문 태그로 변환:
- [총평] → [Summary]
- [1경기] → [Game 1]
- [2경기] → [Game 2]
- [3경기] → [Game 3]
- [주의] → [Caution]

각 항목 한 줄 유지, 마크다운(**굵게**) 금지, 순수 텍스트만.

원본:
${ko}`,
      }],
    })
    const text = (res.content[0] as any)?.text?.trim()
    return text || null
  } catch (e) {
    console.warn('[combo-picks/translate]', (e as Error).message)
    return null
  }
}

// --------- 한 행을 영문 응답 형태로 변환 (필요시 DB에 ai_analysis_en lazy fill) ---------
async function localizeCombo(row: any): Promise<any> {
  // picks[] reason 영문화
  const localizedPicks = Array.isArray(row.picks)
    ? row.picks.map((p: any) => ({ ...p, reason: translateReasonToEn(p?.reason) }))
    : row.picks

  // ai_analysis: 캐시된 영문 있으면 사용, 없으면 Claude로 번역 후 저장
  let analysisEn: string | null = row.ai_analysis_en ?? null
  if (!analysisEn && row.ai_analysis) {
    analysisEn = await translateAnalysisToEn(row.ai_analysis)
    if (analysisEn) {
      // best-effort 캐시 — 실패해도 응답은 보냄
      supabase
        .from('baseball_combo_picks')
        .update({ ai_analysis_en: analysisEn })
        .eq('id', row.id)
        .then(({ error }) => {
          if (error) console.warn('[combo-picks] ai_analysis_en cache 실패:', error.message)
        })
    }
  }

  return {
    ...row,
    picks: localizedPicks,
    ai_analysis: analysisEn ?? row.ai_analysis, // 영문 환경에서 ai_analysis 자리에 영문 반환
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const league = searchParams.get('league') // MLB, KBO, NPB
  const date = searchParams.get('date') // YYYY-MM-DD
  const startDate = searchParams.get('start_date') // YYYY-MM-DD (주간 범위 시작)
  const endDate = searchParams.get('end_date') // YYYY-MM-DD (주간 범위 끝)
  const days = parseInt(searchParams.get('days') || '7') // 최근 N일
  // 🌐 language=en|ko (lang fallback)
  const langParam = (searchParams.get('language') ?? searchParams.get('lang') ?? 'ko').toLowerCase()
  const isEn = langParam === 'en'

  async function maybeLocalize(picks: any[]): Promise<any[]> {
    if (!isEn) return picks
    // 영문 응답 — 병렬 localize
    return Promise.all(picks.map((p) => localizeCombo(p)))
  }

  // 로고 없는 픽에 DB에서 로고 URL 보강
  async function enrichPicksWithLogos(picks: any[]) {
    // 모든 matchId 수집
    const matchIds = new Set<number>()
    for (const combo of picks) {
      for (const p of combo.picks || []) {
        if (!p.homeLogo && !p.awayLogo && p.matchId) {
          matchIds.add(p.matchId)
        }
      }
    }
    if (matchIds.size === 0) return picks

    // 매치 데이터에서 로고 조회
    const { data: matches } = await supabase
      .from('baseball_matches')
      .select('api_match_id, home_team_logo, away_team_logo')
      .in('api_match_id', Array.from(matchIds))

    if (!matches || matches.length === 0) return picks

    const logoMap = new Map<number, { homeLogo: string; awayLogo: string }>()
    for (const m of matches) {
      logoMap.set(m.api_match_id, {
        homeLogo: m.home_team_logo || '',
        awayLogo: m.away_team_logo || '',
      })
    }

    // 픽에 로고 보강
    for (const combo of picks) {
      for (const p of combo.picks || []) {
        if (!p.homeLogo || !p.awayLogo) {
          const logos = logoMap.get(p.matchId)
          if (logos) {
            if (!p.homeLogo) p.homeLogo = logos.homeLogo
            if (!p.awayLogo) p.awayLogo = logos.awayLogo
          }
        }
      }
    }
    return picks
  }

  try {
    // 특정 날짜 조회
    if (date) {
      let query = supabase
        .from('baseball_combo_picks')
        .select('*')
        .eq('pick_date', date)
        .order('fold_count', { ascending: true })

      if (league) query = query.eq('league', league)

      const { data, error } = await query

      if (error) throw error

      const enriched = await enrichPicksWithLogos(data || [])
      const localized = await maybeLocalize(enriched)
      return NextResponse.json({ picks: localized })
    }

    // 주간 범위 조회 (start_date ~ end_date)
    if (startDate && endDate) {
      let query = supabase
        .from('baseball_combo_picks')
        .select('*')
        .gte('pick_date', startDate)
        .lte('pick_date', endDate)
        .order('pick_date', { ascending: false })
        .order('fold_count', { ascending: true })

      if (league) query = query.eq('league', league)

      const { data, error } = await query
      if (error) throw error

      const enriched = await enrichPicksWithLogos(data || [])

      // 적중 통계
      const stats: Record<string, { total: number; wins: number; rate: number }> = {}
      const safeStats = { total: 0, wins: 0, rate: 0 }
      const highStats = { total: 0, wins: 0, rate: 0 }

      for (const pick of enriched) {
        const key = `${pick.league}_${pick.fold_count}`
        if (!stats[key]) stats[key] = { total: 0, wins: 0, rate: 0 }
        // 🆕 partial(일부 적중)도 조합 베팅 관점에서는 실패 → 분모에 포함
        if (pick.result === 'win' || pick.result === 'lose' || pick.result === 'partial') {
          stats[key].total++
          if (pick.result === 'win') stats[key].wins++
          const target = pick.fold_count === 2 ? safeStats : highStats
          target.total++
          if (pick.result === 'win') target.wins++
        }
      }
      for (const key in stats) {
        stats[key].rate = stats[key].total > 0
          ? Math.round((stats[key].wins / stats[key].total) * 100) : 0
      }
      safeStats.rate = safeStats.total > 0 ? Math.round((safeStats.wins / safeStats.total) * 100) : 0
      highStats.rate = highStats.total > 0 ? Math.round((highStats.wins / highStats.total) * 100) : 0

      const localized = await maybeLocalize(enriched)
      return NextResponse.json({
        picks: localized,
        stats,
        typeStats: { safe: safeStats, high: highStats },
        period: { from: startDate, to: endDate },
      })
    }

    // 최근 N일 조회
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const today = kstNow.toISOString().split('T')[0]
    const fromDate = new Date(kstNow.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    let query = supabase
      .from('baseball_combo_picks')
      .select('*')
      .gte('pick_date', fromDate)
      .lte('pick_date', today)
      .order('pick_date', { ascending: false })
      .order('fold_count', { ascending: true })

    if (league) query = query.eq('league', league)

    const { data, error } = await query

    if (error) throw error

    const enriched = await enrichPicksWithLogos(data || [])

    // 적중 통계 계산 (기존 리그_폴드별)
    const stats: Record<string, { total: number; wins: number; rate: number }> = {}
    // 안전형/고배당 분리 통계
    const safeStats = { total: 0, wins: 0, rate: 0 }
    const highStats = { total: 0, wins: 0, rate: 0 }

    for (const pick of enriched) {
      const key = `${pick.league}_${pick.fold_count}`
      if (!stats[key]) stats[key] = { total: 0, wins: 0, rate: 0 }
      // 🆕 partial(일부 적중)도 조합 베팅 관점에서는 실패 → 분모에 포함
      if (pick.result === 'win' || pick.result === 'lose' || pick.result === 'partial') {
        stats[key].total++
        if (pick.result === 'win') stats[key].wins++

        // fold_count === 2 → 안전형, 나머지 → 고배당
        const target = pick.fold_count === 2 ? safeStats : highStats
        target.total++
        if (pick.result === 'win') target.wins++
      }
    }
    for (const key in stats) {
      stats[key].rate = stats[key].total > 0
        ? Math.round((stats[key].wins / stats[key].total) * 100)
        : 0
    }
    safeStats.rate = safeStats.total > 0 ? Math.round((safeStats.wins / safeStats.total) * 100) : 0
    highStats.rate = highStats.total > 0 ? Math.round((highStats.wins / highStats.total) * 100) : 0

    const localized = await maybeLocalize(enriched)
    return NextResponse.json({
      picks: localized,
      stats,
      typeStats: { safe: safeStats, high: highStats },
      period: { from: fromDate, to: today },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
