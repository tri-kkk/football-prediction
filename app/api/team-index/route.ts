// app/api/team-index/route.ts
// 팀 지수 보드 데이터. GET ?league=PL → 리더보드 + 팀별 지수 추이(차트용)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// 공개 읽기 전용 — anon 키 사용(RLS의 select 정책으로 제한). 서비스 롤(전권) 미사용.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const NAMES: Record<string, string> = {
  PL: 'Premier League', PD: 'La Liga', BL1: 'Bundesliga', SA: 'Serie A', FL1: 'Ligue 1',
  J1: 'J1 League',
}

export async function GET(req: NextRequest) {
  const code = (new URL(req.url).searchParams.get('league') || 'PL').toUpperCase()
  if (!NAMES[code]) return NextResponse.json({ error: 'unknown league' }, { status: 400 })
  try {
    const { data: latest } = await supabase
      .from('team_index_latest').select('*').eq('league_code', code).order('idx', { ascending: false })
    if (!latest || latest.length === 0)
      return NextResponse.json({ league: NAMES[code], leagueCode: code, teams: [], asOf: null, leagueIndex: null })

    const season = latest[0].season
    const { data: hist } = await supabase
      .from('team_index_history').select('team_id,match_date,idx,note')
      .eq('league_code', code).eq('season', season).order('match_date', { ascending: true })

    const seriesMap: Record<number, { date: string; v: number; note: string }[]> = {}
    for (const h of hist || []) (seriesMap[h.team_id] ??= []).push({ date: h.match_date, v: h.idx, note: h.note })

    const teams = latest.map((t: any) => ({
      team: t.team_name, teamId: t.team_id,
      index: t.idx, lastChange: Number(t.change ?? 0),
      hi: t.hi, lo: t.lo, played: t.played, lastResult: t.last_result,
      series: seriesMap[t.team_id] || [{ date: '', v: t.idx, note: '' }],
    }))

    const asOf = (hist && hist.length) ? hist[hist.length - 1].match_date : null
    const leagueIndex = Math.round(teams.reduce((s, t) => s + t.index, 0) / teams.length)

    return NextResponse.json({
      league: NAMES[code], leagueCode: code, season, asOf, leagueIndex, teams,
    }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1800' } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
