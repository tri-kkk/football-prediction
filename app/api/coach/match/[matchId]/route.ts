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

  // 합으로 정규화 → 0~1 소수 (저장 단위가 0~100%든 0~1이든, 오버라운드까지 정규화)
  const trend = (trendRes.data || []).map((p: any) => {
    const h = Number(p.home_probability) || 0, dr = Number(p.draw_probability) || 0, a = Number(p.away_probability) || 0;
    const sum = h + dr + a;
    return sum > 0
      ? { t: p.created_at, h: h / sum, d: dr / sum, a: a / sum }
      : { t: p.created_at, h: 0, d: 0, a: 0 };
  });

  // 국내 구매율(와이즈토토 toto_calc) — 팀명(영문)으로 매칭, 토토 홈/원정 뒤집힘 보정
  let toto: { home: number; draw: number; away: number; total: number } | null = null;
  try {
    const { data: totoRows } = await supabaseAdmin
      .from('toto_matches')
      .select('home_team_en, away_team_en, vote_win, vote_draw, vote_lose, vote_total')
      .or(`home_team_en.ilike.%${sig.home}%,away_team_en.ilike.%${sig.home}%,home_team_en.ilike.%${sig.away}%,away_team_en.ilike.%${sig.away}%`)
      .limit(30);
    const norm = (s = '') => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const H = norm(sig.home), A = norm(sig.away);
    for (const r of totoRows || []) {
      const th = norm(r.home_team_en), ta = norm(r.away_team_en);
      if (!th || !ta) continue;
      const sameH = th.includes(H) || H.includes(th), sameA = ta.includes(A) || A.includes(ta);
      const swapH = th.includes(A) || A.includes(th), swapA = ta.includes(H) || H.includes(ta);
      if (sameH && sameA) { toto = { home: r.vote_win, draw: r.vote_draw, away: r.vote_lose, total: r.vote_total }; break; }
      if (swapH && swapA) { toto = { home: r.vote_lose, draw: r.vote_draw, away: r.vote_win, total: r.vote_total }; break; }
    }
  } catch { /* 토토 데이터 없으면 생략 */ }

  return NextResponse.json({
    match: { matchId: sig.matchId, league: sig.league, round: sig.round, kickoff: sig.kickoff, home: sig.home, away: sig.away, homeId: sig.homeId, awayId: sig.awayId },
    model: sig.model, market: sig.market, odds: sig.odds, signal: sig.signal,
    homeForm: toForm(homeFix.response, sig.homeId),
    awayForm: toForm(awayFix.response, sig.awayId),
    h2h: h2hRows, h2hSummary: { home: hw, draw: d, away: aw },
    trend, toto,
  });
}
