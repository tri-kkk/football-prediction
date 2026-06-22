// app/api/cron/collect-baseball-toto-results/route.ts
// 야구 승1패 결과 판정 — 경기 종료 후 실제 스코어로 승/1/패 결과 + 적중 여부 기록
//
// 결과 규칙 (기준: 홈팀)
//   승(W)  : 홈 2점차 이상 승리   (margin >= 2)
//   1(O)   : 1점차 승부            (|margin| == 1)
//   패(L)  : 홈 2점차 이상 패배   (margin <= -2)
//   무(D)  : 동점 (적특/환급 처리, 적중계산 제외)
//
// GET /api/cron/collect-baseball-toto-results            → 미판정 회차 자동 처리
// GET /api/cron/collect-baseball-toto-results?round=35   → 특정 회차
//
// Supabase Cron (1시간마다):
// SELECT cron.schedule('baseball-toto-results','0 * * * *',$$
//   SELECT net.http_post(url:='https://trendsoccer.com/api/cron/collect-baseball-toto-results',
//     headers:=jsonb_build_object('Content-Type','application/json'), body:='{}'::jsonb); $$);

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function searchKey(name: string): string {
  const stop = new Set(['New', 'Los', 'San', 'Saint', 'St.', 'St'])
  const words = (name || '').replace(/\./g, '').split(/\s+/)
  const distinctive = words.filter(w => !stop.has(w))
  return distinctive[distinctive.length - 1] || words[0] || name
}

function calcResult(margin: number): 'W' | 'O' | 'L' | 'D' {
  if (margin >= 2) return 'W'
  if (margin <= -2) return 'L'
  if (margin === 0) return 'D'
  return 'O'
}

async function resolveRound(roundId: number) {
  const { data: matches } = await supabase
    .from('baseball_toto_matches')
    .select('id, home_team_en, away_team_en, league, match_date, primary_pick, result')
    .eq('round_id', roundId)
    .is('result', null)

  if (!matches?.length) return { updated: 0, pending: 0 }

  let updated = 0
  let pending = 0

  for (const m of matches) {
    // 경기 시간 안 지났으면 스킵
    if (m.match_date && new Date(m.match_date).getTime() > Date.now()) { pending++; continue }

    const homeKey = searchKey(m.home_team_en)
    const awayKey = searchKey(m.away_team_en)

    let q = supabase
      .from('baseball_matches')
      .select('home_team, away_team, home_score, away_score, status, match_date')
      .eq('league', m.league)
      .eq('status', 'FT')
    if (m.match_date) {
      const d = new Date(m.match_date)
      q = q.gte('match_date', new Date(d.getTime() - 2 * 864e5).toISOString())
           .lte('match_date', new Date(d.getTime() + 2 * 864e5).toISOString())
    }
    q = q.or(`home_team.ilike.%${homeKey}%,away_team.ilike.%${homeKey}%`).limit(20)
    const { data: rows } = await q

    let row: any = null
    let reversed = false
    if (rows?.length) {
      row = rows.find(r =>
        r.home_team?.toLowerCase().includes(homeKey.toLowerCase()) &&
        r.away_team?.toLowerCase().includes(awayKey.toLowerCase()))
      if (!row) {
        const rev = rows.find(r =>
          r.away_team?.toLowerCase().includes(homeKey.toLowerCase()) &&
          r.home_team?.toLowerCase().includes(awayKey.toLowerCase()))
        if (rev) { row = rev; reversed = true }
      }
    }

    if (!row || row.home_score == null || row.away_score == null) { pending++; continue }

    const hs = Number(row.home_score)
    const as = Number(row.away_score)
    if (isNaN(hs) || isNaN(as)) { pending++; continue }

    // 토토 기준 홈/원정 정렬
    const totoHome = reversed ? as : hs
    const totoAway = reversed ? hs : as
    const result = calcResult(totoHome - totoAway)
    const isCorrect = result === 'D' ? null : (result === m.primary_pick)

    const { error } = await supabase
      .from('baseball_toto_matches')
      .update({ result, is_correct: isCorrect, updated_at: new Date().toISOString() })
      .eq('id', m.id)
    if (!error) updated++
  }

  // 모든 경기 판정되면 회차 마감 처리
  if (pending === 0) {
    await supabase.from('baseball_toto_rounds')
      .update({ status: 'finished', updated_at: new Date().toISOString() })
      .eq('id', roundId)
  }

  return { updated, pending }
}

export async function GET(request: NextRequest) {
  const start = Date.now()
  const { searchParams } = new URL(request.url)
  const yearP = searchParams.get('year')
  const roundP = searchParams.get('round')

  try {
    let roundIds: number[] = []

    if (yearP && roundP) {
      const { data } = await supabase.from('baseball_toto_rounds')
        .select('id').eq('year', +yearP).eq('round_number', +roundP).limit(1).maybeSingle()
      if (data) roundIds = [data.id]
    } else {
      // 마감 안 된(미판정 가능) 최근 회차들
      const { data } = await supabase.from('baseball_toto_rounds')
        .select('id').neq('status', 'finished')
        .order('year', { ascending: false }).order('round_number', { ascending: false })
        .limit(5)
      roundIds = (data || []).map(r => r.id)
    }

    if (!roundIds.length) {
      return NextResponse.json({ success: true, message: '처리할 회차 없음', duration_ms: Date.now() - start })
    }

    const results = []
    for (const id of roundIds) {
      const r = await resolveRound(id)
      results.push({ round_id: id, ...r })
    }

    return NextResponse.json({ success: true, rounds: results, duration_ms: Date.now() - start })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, duration_ms: Date.now() - start }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
