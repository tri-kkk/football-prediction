// app/api/coach/dashboard/route.ts
// GET /api/coach/dashboard — 내 성과 KPI (적중률·손익·ROI·평균CLV) + 진행중.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/mobile-auth';
import { getCoachUser } from '@/lib/coachAuth';
import { checkCoachMembership } from '@/lib/checkCoachMembership';
import { aggregate } from '@/lib/coachSignal';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCoachUser(req);
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
  if (!(await checkCoachMembership(user.userId)))
    return NextResponse.json({ error: '멤버쉽 전용', code: 'MEMBERSHIP_REQUIRED' }, { status: 402 });

  const supabase = getServerSupabase();
  const [betsRes, slipsRes] = await Promise.all([
    supabase.from('user_bets').select('status, stake, payout, clv').eq('user_id', user.userId),
    supabase.from('user_slips').select('status, stake, payout, clv').eq('user_id', user.userId),
  ]);
  if (betsRes.error) return NextResponse.json({ error: betsRes.error.message }, { status: 500 });

  // 단식 + 조합 통합 집계
  const rows = [...(betsRes.data ?? []), ...(slipsRes.data ?? [])];
  const agg = aggregate(rows as any);
  const open = rows.filter((b) => b.status === 'open');
  const openStake = open.reduce((s, b) => s + (b.stake ?? 0), 0);

  return NextResponse.json({
    hitRate: agg.hitRate,          // 0~1 or null
    profit: agg.profit,            // 원
    roi: agg.roi,                  // 0~1 or null
    avgClv: agg.avgClv,            // 소수(=+0.018) or null
    clvSampleEnough: agg.clvSampleEnough,
    settledCount: agg.count,
    open: { count: open.length, stake: openStake },
  });
}
