// app/api/admin/pitcher/route.ts
// 선발 투수 관리 API
//
// GET  /api/admin/pitcher?league=KBO&date=2025-03-29   → 경기 목록
// GET  /api/admin/pitcher?type=list&season=2025         → KBO 투수 목록
// POST /api/admin/pitcher                               → 선발 저장

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type   = searchParams.get('type')
  const league = searchParams.get('league')
  const date   = searchParams.get('date')
  const season = searchParams.get('season') ?? '2025'

  // KBO / NPB 투수 목록
  if (type === 'list') {
    const leagueParam = searchParams.get('league') ?? 'kbo'
    const isNpb = leagueParam === 'npb'
    const table = isNpb ? 'npb_pitcher_stats' : 'kbo_pitcher_stats'
    const selectCols = isNpb ? 'name, team, pitch_hand' : 'name, team'

    const { data, error } = await supabase
      .from(table)
      .select(selectCols)
      .eq('season', season)
      .order('team', { ascending: true })
      .order('name', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ pitchers: data })
  }

  // 경기 목록
  if (!league || !date) {
    return NextResponse.json({ error: 'league, date 필요' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('baseball_matches')
    .select('id, match_date, match_time, home_team, away_team, home_team_ko, away_team_ko, home_pitcher_ko, away_pitcher_ko, status')
    .eq('league', league)
    .eq('match_date', date)
    .order('match_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ matches: data })
}

export async function POST(request: NextRequest) {
  const { matchId, homePitcher, awayPitcher } = await request.json()

  if (!matchId) {
    return NextResponse.json({ error: 'matchId 필요' }, { status: 400 })
  }

  const { error } = await supabase
    .from('baseball_matches')
    .update({
      home_pitcher_ko: homePitcher ?? null,
      away_pitcher_ko: awayPitcher ?? null,
    })
    .eq('id', matchId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}