// app/api/coach/slips/route.ts
// POST: 조합(슬립) 생성 / GET: 내 슬립 목록. 멤버쉽 전용.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/mobile-auth';
import { getCoachUser } from '@/lib/coachAuth';
import { checkCoachMembership } from '@/lib/checkCoachMembership';
import { getMatchSignal } from '@/lib/coachMatchService';
import { combinedOdds } from '@/lib/coachSlip';
import type { Pick } from '@/lib/coachSignal';

const PICKS: Pick[] = ['HOME', 'DRAW', 'AWAY'];
interface LegIn { matchId: string; pick: Pick; betOdds: number }
interface SlipBody { stake: number; legs: LegIn[] }

export async function POST(req: NextRequest) {
  const user = await getCoachUser(req);
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
  if (!(await checkCoachMembership(user.userId)))
    return NextResponse.json({ error: '멤버쉽 전용', code: 'MEMBERSHIP_REQUIRED' }, { status: 402 });

  let body: Partial<SlipBody>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON 파싱 실패' }, { status: 400 }); }
  const stake = body.stake;
  const legs = body.legs || [];
  if (typeof stake !== 'number' || !Number.isFinite(stake) || stake <= 0) return NextResponse.json({ error: 'stake는 양수' }, { status: 400 });
  if (!Array.isArray(legs) || legs.length < 2 || legs.length > 12) return NextResponse.json({ error: '조합은 2~12경기' }, { status: 400 });
  const ids = new Set<string>();
  for (const l of legs) {
    if (!l.matchId || ids.has(l.matchId)) return NextResponse.json({ error: '같은 경기 중복' }, { status: 400 });
    ids.add(l.matchId);
    if (!PICKS.includes(l.pick)) return NextResponse.json({ error: 'pick은 HOME/DRAW/AWAY' }, { status: 400 });
    if (typeof l.betOdds !== 'number' || l.betOdds < 1.01 || l.betOdds > 1000) return NextResponse.json({ error: '배당 범위(1.01~1000)' }, { status: 400 });
  }

  // 각 레그 검증·스냅샷 (경기 존재·미시작)
  const legRows: any[] = [];
  for (const l of legs) {
    const sig = await getMatchSignal(l.matchId);
    if (!sig) return NextResponse.json({ error: `경기 없음: ${l.matchId}` }, { status: 404 });
    if (new Date(sig.kickoff).getTime() < Date.now()) return NextResponse.json({ error: `이미 시작된 경기 포함: ${sig.home} vs ${sig.away}` }, { status: 409 });
    legRows.push({
      match_id: l.matchId, pick: l.pick, bet_odds: l.betOdds,
      league: sig.league ?? null, home_team: sig.home ?? null, away_team: sig.away ?? null,
      kickoff: sig.kickoff ?? null, round: sig.round ?? null, signal_grade: sig.signal?.grade ?? null,
    });
  }

  const combined = combinedOdds(legs);
  const supabase = getServerSupabase();
  const { data: slip, error } = await supabase
    .from('user_slips')
    .insert({ user_id: user.userId, stake, combined_odds: combined, legs_count: legs.length, status: 'open' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: legErr } = await supabase
    .from('user_slip_legs')
    .insert(legRows.map((r) => ({ ...r, slip_id: slip.id })));
  if (legErr) {
    await supabase.from('user_slips').delete().eq('id', slip.id); // 롤백
    return NextResponse.json({ error: legErr.message }, { status: 500 });
  }

  return NextResponse.json({ slip: { ...slip, legs: legRows } }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const user = await getCoachUser(req);
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
  if (!(await checkCoachMembership(user.userId)))
    return NextResponse.json({ error: '멤버쉽 전용', code: 'MEMBERSHIP_REQUIRED' }, { status: 402 });

  const status = req.nextUrl.searchParams.get('status');
  const supabase = getServerSupabase();
  let q = supabase.from('user_slips').select('*, legs:user_slip_legs(*)').eq('user_id', user.userId).order('created_at', { ascending: false });
  if (status === 'open') q = q.eq('status', 'open');
  else if (status === 'settled') q = q.in('status', ['won', 'lost', 'void']);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slips: data ?? [] });
}
