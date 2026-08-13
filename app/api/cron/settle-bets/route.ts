// app/api/cron/settle-bets/route.ts
// POST (Supabase Cron) — 종료 경기의 open user_bets 일괄 정산 + CLV 자동 채점.
// 결과: fg_match_history.result / 마감배당: match_odds_latest. service_role로 실행.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/mobile-auth';
import { settleBet, pickKey, type Pick } from '@/lib/coachSignal';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServerSupabase();

  // 1) 미정산(open) 기록
  const { data: open, error: e1 } = await supabase
    .from('user_bets').select('id, match_id, pick, stake, bet_odds').eq('status', 'open');
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  if (!open?.length) return NextResponse.json({ ok: true, settled: 0, note: 'no open bets' });

  const matchIds = Array.from(new Set(open.map((b) => String(b.match_id))));

  // 2) 결과(fg_match_history.fixture_id 는 number)
  const { data: fins } = await supabase
    .from('fg_match_history').select('fixture_id, result').in('fixture_id', matchIds.map(Number));
  const finMap: Record<string, string> = {};
  for (const f of fins || []) finMap[String(f.fixture_id)] = f.result; // 'HOME'|'AWAY'|'DRAW'

  // 3) 마감배당 스냅샷
  const { data: ocs } = await supabase
    .from('match_odds_latest').select('match_id, home_odds, draw_odds, away_odds').in('match_id', matchIds);
  const ocMap: Record<string, any> = {};
  for (const o of ocs || []) ocMap[String(o.match_id)] = o;

  let settled = 0, voided = 0, scoredCLV = 0, skipped = 0;
  for (const b of open) {
    const res = finMap[String(b.match_id)];
    if (!res) { skipped++; continue; } // 아직 결과 없음
    const outcome = (res === 'HOME' ? 'HOME' : res === 'AWAY' ? 'AWAY' : 'DRAW') as Pick;
    const oc = ocMap[String(b.match_id)];
    const key = pickKey(b.pick as Pick);
    const closeOdds = oc ? (key === 'home' ? oc.home_odds : key === 'draw' ? oc.draw_odds : oc.away_odds) : null;

    const { status, payout, clv } = settleBet(b.pick as Pick, outcome, b.stake, b.bet_odds, closeOdds);
    const { error: upErr } = await supabase
      .from('user_bets')
      .update({ status, payout, close_odds: closeOdds, clv, settled_at: new Date().toISOString() })
      .eq('id', b.id).eq('status', 'open');
    if (upErr) { skipped++; continue; }
    settled++;
    if (status === 'void') voided++;
    if (clv != null) scoredCLV++;
  }

  return NextResponse.json({ ok: true, settled, voided, scoredCLV, skipped, openTotal: open.length });
}
