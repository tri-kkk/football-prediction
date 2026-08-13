// app/api/coach/match/[matchId]/route.ts
// GET /api/coach/match/:id — 회원 전용 경기 세부 데이터.
// KSM 시그널(모델·시장·이견) + 최근 5경기 폼 + H2H + 배당(확률) 변동 추이.
import { NextRequest, NextResponse } from 'next/server';
import { getCoachUser } from '@/lib/coachAuth';
import { checkCoachMembership } from '@/lib/checkCoachMembership';
import { getMatchSignal } from '@/lib/coachMatchService';
import { af } from '@/lib/ksmModel';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function toForm(fixtures: any[], teamId: number) {
  return (fixtures || []).slice(0, 5).map((m: any) => {
    const isHome = m.teams.home.id === teamId;
    const result = m.teams.home.winner ? (isHome ? 'W' : 'L') : m.teams.away.winner ? (isHome ? 'L' : 'W') : 'D';
    return {
      opponent: isHome ? m.teams.away.name : m.teams.home.name,
      score: `${m.goals.home ?? '-'}-${m.goals.away ?? '-'}`,
      result, isHome, date: m.fixture.date,
    };
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await ctx.params;
  const user = await getCoachUser(req);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  if (!(await checkCoachMembership(user.userId)))
    return NextResponse.json({ error: '멤버쉽 전용', code: 'MEMBERSHIP_REQUIRED' }, { status: 402 });

  const sig = await getMatchSignal(matchId);
  if (!sig) return NextResponse.json({ error: '경기를 찾을 수 없습니다' }, { status: 404 });

  const [homeFix, awayFix, h2hRes, trendRes] = await Promise.all([
    af(`/fixtures?team=${sig.homeId}&last=5`).catch(() => ({ response: [] })),
    af(`/fixtures?team=${sig.awayId}&last=5`).catch(() => ({ response: [] })),
    af(`/fixtures/headtohead?h2h=${sig.homeId}-${sig.awayId}&last=6`).catch(() => ({ response: [] })),
    supabaseAdmin
      .from('match_odds_history')
      .select('created_at,home_probability,draw_probability,away_probability')
      .eq('match_id', String(matchId))
      .order('created_at', { ascending: true }),
  ]);

  // H2H (sig.home 관점 집계)
  const h2hRows = (h2hRes.response || []).map((m: any) => ({
    date: m.fixture.date,
    home: m.teams.home.name, away: m.teams.away.name,
    homeScore: m.goals.home, awayScore: m.goals.away,
  }));
  let hw = 0, d = 0, aw = 0;
  for (const m of h2hRes.response || []) {
    const homeIsSig = m.teams.home.id === sig.homeId;
    if (!m.teams.home.winner && !m.teams.away.winner) d++;
    else {
      const sigWon = (m.teams.home.winner && homeIsSig) || (m.teams.away.winner && !homeIsSig);
      sigWon ? hw++ : aw++;
    }
  }

  const trend = (trendRes.data || []).map((p: any) => ({
    t: p.created_at,
    h: Number(p.home_probability), d: Number(p.draw_probability), a: Number(p.away_probability),
  }));

  return NextResponse.json({
    match: { matchId: sig.matchId, league: sig.league, round: sig.round, kickoff: sig.kickoff, home: sig.home, away: sig.away, homeId: sig.homeId, awayId: sig.awayId },
    model: sig.model, market: sig.market, odds: sig.odds, signal: sig.signal,
    homeForm: toForm(homeFix.response, sig.homeId),
    awayForm: toForm(awayFix.response, sig.awayId),
    h2h: h2hRows, h2hSummary: { home: hw, draw: d, away: aw },
    trend,
  });
}
