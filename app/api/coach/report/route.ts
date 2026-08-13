// app/api/coach/report/route.ts
// GET /api/coach/report — 코치 리포트: 리그별 / 배당대별 / 등급별 CLV 분해 + 코치 코멘트.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/mobile-auth';
import { getCoachUser } from '@/lib/coachAuth';
import { checkCoachMembership } from '@/lib/checkCoachMembership';

export const dynamic = 'force-dynamic';

interface BetRow { league: string | null; bet_odds: number; clv: number | null; status: string; stake: number; payout: number | null; signal_grade: string | null }

const oddsBand = (o: number) => (o < 1.5 ? '~1.5' : o < 2.0 ? '1.5–2.0' : o < 3.0 ? '2.0–3.0' : '3.0+');

function groupStats(rows: BetRow[], keyFn: (r: BetRow) => string | null) {
  const g: Record<string, BetRow[]> = {};
  for (const r of rows) {
    const k = keyFn(r); if (!k) continue;
    (g[k] = g[k] || []).push(r);
  }
  return Object.entries(g).map(([key, list]) => {
    const clvs = list.map((r) => r.clv).filter((v): v is number => v != null);
    const settled = list.filter((r) => r.status === 'won' || r.status === 'lost');
    const won = settled.filter((r) => r.status === 'won').length;
    const staked = settled.reduce((s, r) => s + r.stake, 0);
    const ret = settled.reduce((s, r) => s + (r.payout ?? 0), 0);
    return {
      key,
      count: list.length,
      avgClv: clvs.length ? clvs.reduce((s, v) => s + v, 0) / clvs.length : null,
      clvSample: clvs.length,
      hitRate: settled.length ? won / settled.length : null,
      roi: staked ? (ret - staked) / staked : null,
    };
  }).sort((a, b) => (b.avgClv ?? -Infinity) - (a.avgClv ?? -Infinity));
}

export async function GET(req: NextRequest) {
  const user = await getCoachUser(req);
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
  if (!(await checkCoachMembership(user.userId)))
    return NextResponse.json({ error: '멤버쉽 전용', code: 'MEMBERSHIP_REQUIRED' }, { status: 402 });

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('user_bets')
    .select('league, bet_odds, clv, status, stake, payout, signal_grade')
    .eq('user_id', user.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as BetRow[];
  const byLeague = groupStats(rows, (r) => r.league);
  const byOddsBand = groupStats(rows, (r) => oddsBand(r.bet_odds));
  const byGrade = groupStats(rows, (r) => r.signal_grade);

  // 코치 코멘트: 표본 있는 리그 중 최고/최저 CLV
  const sig = byLeague.filter((g) => g.clvSample >= 5);
  const best = sig[0], worst = sig[sig.length - 1];
  const pct = (v: number | null) => (v == null ? '-' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`);
  let comment = '아직 표본이 부족해요. 기록이 쌓이면 리그별 강·약점을 짚어드릴게요.';
  if (best && worst && best.key !== worst.key) {
    comment = `${best.key}에서 시장을 이기고 있어요(CLV ${pct(best.avgClv)}). 반면 ${worst.key}는 CLV ${pct(worst.avgClv)}라 픽을 줄이는 게 좋아 보여요.`;
  } else if (best) {
    comment = `${best.key} CLV ${pct(best.avgClv)}. 표본이 더 쌓이면 리그별 비교가 정확해져요.`;
  }

  return NextResponse.json({ byLeague, byOddsBand, byGrade, comment });
}
