// app/api/admin/predict-backtest/route.ts
// [진단·1.5단계] 두 예측 공식의 적중 비교. READ-ONLY, 저장 안 함.
//   메인: pick_recommendations 저장분(경기 전 시점 = 편향 없음)
//   코치: ksmModel 재계산(현재 시즌 통계 포함 → 살짝 낙관 편향 주의)
//   핵심 지표: 두 모델이 픽이 갈린 경기에서 누가 맞았나
//   GET ?days=30&league=PD
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LEAGUES, currentSeason, af, buildTeamStats, predict, FINISHED } from '@/lib/ksmModel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Out = 'HOME' | 'DRAW' | 'AWAY'
const outcome = (hg: number, ag: number): Out => (hg > ag ? 'HOME' : hg < ag ? 'AWAY' : 'DRAW')
const argmax = (p: { home: number; draw: number; away: number }): Out =>
  p.home >= p.draw && p.home >= p.away ? 'HOME' : p.away >= p.home && p.away >= p.draw ? 'AWAY' : 'DRAW'
const brier = (p: { home: number; draw: number; away: number }, o: Out) => {
  const y = { home: o === 'HOME' ? 1 : 0, draw: o === 'DRAW' ? 1 : 0, away: o === 'AWAY' ? 1 : 0 }
  return (p.home - y.home) ** 2 + (p.draw - y.draw) ** 2 + (p.away - y.away) ** 2
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const days = Math.max(3, Math.min(120, parseInt(url.searchParams.get('days') || '30', 10) || 30))
  const one = url.searchParams.get('league')
  const leagues = one ? [one] : Object.keys(LEAGUES)
  const season = currentSeason()
  const cutoff = Date.now() - days * 24 * 3600 * 1000

  let mainCorrect = 0, ksmCorrect = 0, n = 0, agree = 0
  let disagree = 0, mainWonDisagree = 0, ksmWonDisagree = 0, drawOnDisagree = 0
  let mainBrier = 0, ksmBrier = 0
  const samples: any[] = []

  for (const lc of leagues) {
    const cfg = LEAGUES[lc]
    if (!cfg) continue
    const stats = await buildTeamStats(cfg.id).catch(() => ({} as Record<number, any>))
    const fx = await af(`/fixtures?league=${cfg.id}&season=${season}`).catch(() => ({ response: [] }))
    const finished = (fx.response || []).filter((f: any) => {
      const s = f.fixture?.status?.short
      return FINISHED.has(s) && new Date(f.fixture.date).getTime() >= cutoff &&
        f.goals?.home != null && f.goals?.away != null
    })
    if (!finished.length) continue

    const ids = finished.map((f: any) => String(f.fixture.id))
    const recMap = new Map<string, any>()
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await supabase
        .from('pick_recommendations')
        .select('match_id, pick_result, home_probability, draw_probability, away_probability')
        .in('match_id', ids.slice(i, i + 200))
      for (const r of data || []) recMap.set(String(r.match_id), r)
    }

    for (const f of finished) {
      const rec = recMap.get(String(f.fixture.id))
      const hId = f.teams?.home?.id, aId = f.teams?.away?.id
      const h = stats[hId], a = stats[aId]
      if (!rec || !h || !a) continue
      const o = outcome(f.goals.home, f.goals.away)
      const km = predict(h, a)
      const ksmPick = argmax(km)
      const mainPick = (rec.pick_result || '').toUpperCase() as Out
      const mainP = { home: rec.home_probability / 100, draw: rec.draw_probability / 100, away: rec.away_probability / 100 }

      n++
      const mc = mainPick === o, kc = ksmPick === o
      if (mc) mainCorrect++
      if (kc) ksmCorrect++
      mainBrier += brier(mainP, o)
      ksmBrier += brier(km, o)
      if (mainPick === ksmPick) { agree++; continue }
      disagree++
      if (mc && !kc) mainWonDisagree++
      else if (kc && !mc) ksmWonDisagree++
      else drawOnDisagree++ // 둘 다 틀림(무 등)
      if (samples.length < 25) samples.push({
        match: `${f.teams.home.name} vs ${f.teams.away.name}`, league: lc, outcome: o,
        main: { pick: mainPick, correct: mc }, ksm: { pick: ksmPick, correct: kc, p: { h: Math.round(km.home * 100), d: Math.round(km.draw * 100), a: Math.round(km.away * 100) } },
      })
    }
  }

  return NextResponse.json({
    caveat: 'ksm은 현재 시즌 통계 재계산이라 낙관 편향 가능 — 절대적중률보다 disagree 승자 지표를 신뢰',
    window: `${days}d`,
    n,
    accuracy: { main: n ? Math.round((mainCorrect / n) * 100) : 0, ksm: n ? Math.round((ksmCorrect / n) * 100) : 0 },
    calibrationBrier: { main: n ? Math.round((mainBrier / n) * 1000) / 1000 : null, ksm: n ? Math.round((ksmBrier / n) * 1000) / 1000 : null },
    pickAgreePct: n ? Math.round((agree / n) * 100) : 0,
    onDisagreement: { total: disagree, mainWon: mainWonDisagree, ksmWon: ksmWonDisagree, bothWrong: drawOnDisagree },
    samples,
  })
}
