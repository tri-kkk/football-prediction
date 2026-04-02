// app/api/baseball/combo-picks/route.ts
// 조합 픽 조회 API
// GET /api/baseball/combo-picks?league=KBO&date=2026-04-01

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const league = searchParams.get('league') // MLB, KBO, NPB
  const date = searchParams.get('date') // YYYY-MM-DD
  const days = parseInt(searchParams.get('days') || '7') // 최근 N일

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
      return NextResponse.json({ picks: enriched })
    }

    // 최근 N일 조회
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const today = kstNow.toISOString().split('T')[0]
    const startDate = new Date(kstNow.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    let query = supabase
      .from('baseball_combo_picks')
      .select('*')
      .gte('pick_date', startDate)
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
      if (pick.result === 'win' || pick.result === 'lose') {
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

    return NextResponse.json({
      picks: enriched,
      stats,
      typeStats: { safe: safeStats, high: highStats },
      period: { from: startDate, to: today },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
