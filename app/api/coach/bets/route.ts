// app/api/coach/bets/route.ts
// POST: 기록 생성(서버가 KSM 시그널 스냅샷 자동 첨부) / GET: 내 기록 목록
// 멤버쉽 전용. 배당·시그널은 서버 확정(조작 방지).
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/mobile-auth';
import { getCoachUser } from '@/lib/coachAuth';
import { checkCoachMembership } from '@/lib/checkCoachMembership';
import { getMatchSignal, type MatchSignal } from '@/lib/coachMatchService';
import { modelMarketGap, pickKey, type Pick } from '@/lib/coachSignal';

const PICKS: Pick[] = ['HOME', 'DRAW', 'AWAY'];

interface CreateBetBody { matchId: string; pick: Pick; stake: number; betOdds: number }
function validateBetInput(b: Partial<CreateBetBody>): { ok: boolean; error?: string } {
  if (!b.matchId) return { ok: false, error: 'matchId 누락' };
  if (!b.pick || !PICKS.includes(b.pick)) return { ok: false, error: 'pick은 HOME/DRAW/AWAY' };
  if (typeof b.stake !== 'number' || !Number.isFinite(b.stake) || b.stake <= 0) return { ok: false, error: 'stake는 양수' };
  if (typeof b.betOdds !== 'number' || b.betOdds < 1.01 || b.betOdds > 1000) return { ok: false, error: '배당 범위(1.01~1000)' };
  return { ok: true };
}
function snapshotForBet(sig: MatchSignal, pick: Pick) {
  const key = pickKey(pick);
  return {
    league: sig.league ?? null,
    home_team: sig.home ?? null,
    away_team: sig.away ?? null,
    kickoff: sig.kickoff ?? null,
    round: sig.round ?? null,
    model_prob: sig.model?.[key] ?? null,
    model_market_gap: sig.market ? modelMarketGap(sig.model, sig.market, key) : null,
    signal_grade: sig.signal?.grade ?? null,
    form_type: sig.signal?.formType ?? null,
    pattern_code: sig.signal?.patternCode ?? null,
  };
}

export async function POST(req: NextRequest) {
  const user = await getCoachUser(req);
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
  if (!(await checkCoachMembership(user.userId)))
    return NextResponse.json({ error: '멤버쉽 전용', code: 'MEMBERSHIP_REQUIRED' }, { status: 402 });

  let body: Partial<CreateBetBody>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON 파싱 실패' }, { status: 400 }); }
  const v = validateBetInput(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const { matchId, pick, stake, betOdds } = body as CreateBetBody;

  const sig = await getMatchSignal(matchId);
  if (!sig) return NextResponse.json({ error: '경기를 찾을 수 없음' }, { status: 404 });
  if (new Date(sig.kickoff).getTime() < Date.now())
    return NextResponse.json({ error: '이미 시작된 경기' }, { status: 409 });

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('user_bets')
    .insert({
      user_id: user.userId, match_id: matchId, pick, stake, bet_odds: betOdds, status: 'open',
      ...snapshotForBet(sig, pick),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bet: data }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const user = await getCoachUser(req);
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });
  if (!(await checkCoachMembership(user.userId)))
    return NextResponse.json({ error: '멤버쉽 전용', code: 'MEMBERSHIP_REQUIRED' }, { status: 402 });

  const status = req.nextUrl.searchParams.get('status');
  const supabase = getServerSupabase();
  let q = supabase.from('user_bets').select('*').eq('user_id', user.userId).order('created_at', { ascending: false });
  if (status === 'open') q = q.eq('status', 'open');
  else if (status === 'settled') q = q.in('status', ['won', 'lost', 'void']);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bets: data ?? [] });
}
