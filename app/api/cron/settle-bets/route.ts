// app/api/cron/settle-bets/route.ts
// POST (Supabase Cron) — 종료 경기의 open user_bets 일괄 정산 + CLV 자동 채점.
// 결과: fg_match_history.result / 마감배당: match_odds_latest. service_role로 실행.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/mobile-auth';
import { settleBet, pickKey, type Pick } from '@/lib/coachSignal';
import { settleSlip, type SettleLeg } from '@/lib/coachSlip';
import { FINISHED } from '@/lib/ksmModel';

const closeOddsFor = (oc: any, pick: string): number | null =>
  oc ? (pick === 'HOME' ? oc.home_odds : pick === 'DRAW' ? oc.draw_odds : oc.away_odds) : null;

export const dynamic = 'force-dynamic';

// API-Football 결과 폴백 — fg_match_history에 결과가 없는 경기(미수집 리그 등)를 API에서 직접 조회.
// 정산은 최신 결과가 필요하므로 캐시 미사용(no-store).
const AF_HOST = 'v3.football.api-sports.io';
function apiResult(f: any): 'HOME' | 'AWAY' | 'DRAW' | null {
  const short = f?.fixture?.status?.short;
  if (!FINISHED.has(short)) return null;
  if (f?.teams?.home?.winner === true) return 'HOME';
  if (f?.teams?.away?.winner === true) return 'AWAY';
  return 'DRAW'; // 종료됐는데 승자 없음 = 무승부
}
async function fetchApiResults(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const key = process.env.API_FOOTBALL_KEY;
  if (!key || !ids.length) return out;
  for (let i = 0; i < ids.length; i += 20) { // API-Football ids= 최대 20개 배치
    const batch = ids.slice(i, i + 20);
    try {
      const res = await fetch(`https://${AF_HOST}/fixtures?ids=${batch.join('-')}`, {
        headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': AF_HOST },
        cache: 'no-store',
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const f of data.response || []) {
        const r = apiResult(f);
        if (r && f?.fixture?.id != null) out[String(f.fixture.id)] = r;
      }
    } catch { /* skip batch */ }
  }
  return out;
}
// 진단용 — 경기별 API 상태(종료 여부)·결과 원시값 조회
async function fetchApiRaw(ids: string[]): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  const key = process.env.API_FOOTBALL_KEY;
  if (!key || !ids.length) return { _error: 'API_FOOTBALL_KEY 없음' } as any;
  for (let i = 0; i < ids.length; i += 20) {
    const batch = ids.slice(i, i + 20);
    try {
      const res = await fetch(`https://${AF_HOST}/fixtures?ids=${batch.join('-')}`, {
        headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': AF_HOST }, cache: 'no-store',
      });
      const data = await res.json();
      for (const f of data.response || []) {
        out[String(f?.fixture?.id)] = {
          status: f?.fixture?.status?.short,
          date: f?.fixture?.date,
          league: `${f?.league?.id} ${f?.league?.name}`,
          season: f?.league?.season,
          match: `${f?.teams?.home?.name} vs ${f?.teams?.away?.name}`,
          result: apiResult(f),
        };
      }
    } catch (e: any) { out['_err' + i] = String(e?.message || e); }
  }
  return out;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServerSupabase();

  // 1) 미정산(open) 기록
  const { data: open, error: e1 } = await supabase
    .from('user_bets').select('id, user_id, match_id, pick, stake, bet_odds').eq('status', 'open');
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const openBets = open ?? [];
  const matchIds = Array.from(new Set(openBets.map((b) => String(b.match_id))));

  // 2) 결과(fg_match_history.fixture_id 는 number)
  const { data: fins } = await supabase
    .from('fg_match_history').select('fixture_id, result').in('fixture_id', matchIds.map(Number));
  const finMap: Record<string, string> = {};
  for (const f of fins || []) finMap[String(f.fixture_id)] = f.result; // 'HOME'|'AWAY'|'DRAW'
  // 폴백: DB에 결과 없는 경기는 API-Football에서 직접 조회 (J리그 등 미수집 리그 정산)
  const missing = matchIds.filter((id) => !finMap[id]);
  if (missing.length) Object.assign(finMap, await fetchApiResults(missing));

  // 진단 모드: ?debug=1 → 정산 안 하고 경기별 상태만 반환
  if (new URL(req.url).searchParams.get('debug') === '1') {
    const dbHad = matchIds.filter((id) => (fins || []).some((f) => String(f.fixture_id) === id));
    const api = await fetchApiRaw(matchIds);
    return NextResponse.json({
      debug: true, openTotal: openBets.length,
      bets: openBets.map((b) => ({ match_id: String(b.match_id), pick: b.pick, dbResult: dbHad.includes(String(b.match_id)), resultUsed: finMap[String(b.match_id)] || null })),
      apiRaw: api,
    });
  }

  // 3) 마감배당 스냅샷
  const { data: ocs } = await supabase
    .from('match_odds_latest').select('match_id, home_odds, draw_odds, away_odds').in('match_id', matchIds);
  const ocMap: Record<string, any> = {};
  for (const o of ocs || []) ocMap[String(o.match_id)] = o;

  let settled = 0, voided = 0, scoredCLV = 0, skipped = 0;
  // 정산 알림용: 유저별 결과 집계
  const notifyMap: Record<string, { won: number; lost: number; count: number }> = {};
  const bump = (uid: string | null | undefined, st: string) => {
    if (!uid) return;
    const n = notifyMap[uid] || (notifyMap[uid] = { won: 0, lost: 0, count: 0 });
    n.count++;
    if (st === 'won') n.won++; else if (st === 'lost') n.lost++;
  };
  for (const b of openBets) {
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
    bump(b.user_id, status);
    if (status === 'void') voided++;
    if (clv != null) scoredCLV++;
  }

  // ── 조합(슬립) 정산 ──
  const { data: slips } = await supabase
    .from('user_slips').select('id, user_id, stake, legs:user_slip_legs(*)').eq('status', 'open');
  let slipsSettled = 0;
  if (slips?.length) {
    // 슬립 레그의 결과·마감배당 조회 (위 finMap/ocMap 재사용 위해 필요한 match_id 추가 로드)
    const slipMatchIds = Array.from(new Set(slips.flatMap((s: any) => (s.legs || []).map((l: any) => String(l.match_id)))));
    const { data: sFins } = await supabase
      .from('fg_match_history').select('fixture_id, result').in('fixture_id', slipMatchIds.map(Number));
    const sFinMap: Record<string, string> = {};
    for (const f of sFins || []) sFinMap[String(f.fixture_id)] = f.result;
    const sMissing = slipMatchIds.filter((id) => !sFinMap[id]);
    if (sMissing.length) Object.assign(sFinMap, await fetchApiResults(sMissing));
    const { data: sOcs } = await supabase
      .from('match_odds_latest').select('match_id, home_odds, draw_odds, away_odds').in('match_id', slipMatchIds);
    const sOcMap: Record<string, any> = {};
    for (const o of sOcs || []) sOcMap[String(o.match_id)] = o;

    for (const slip of slips as any[]) {
      const legs = slip.legs || [];
      if (!legs.length) continue;
      const settleLegs: SettleLeg[] = legs.map((l: any) => {
        const res = sFinMap[String(l.match_id)];
        const outcome = res ? (res === 'HOME' ? 'HOME' : res === 'AWAY' ? 'AWAY' : 'DRAW') : null;
        return { pick: l.pick as Pick, result: outcome as any, betOdds: Number(l.bet_odds), closeOdds: closeOddsFor(sOcMap[String(l.match_id)], l.pick) };
      });
      const result = settleSlip(settleLegs, slip.stake);
      if (!result) continue; // 전 레그 결과 안 나옴 → 대기

      // 레그별 close_odds/result/leg_status 업데이트
      for (let i = 0; i < legs.length; i++) {
        await supabase.from('user_slip_legs').update({
          close_odds: settleLegs[i].closeOdds,
          result: settleLegs[i].result,
          leg_status: result.legStatuses[i],
        }).eq('id', legs[i].id);
      }
      const { error: sErr } = await supabase.from('user_slips').update({
        status: result.status, payout: result.payout, clv: result.clv, settled_at: new Date().toISOString(),
      }).eq('id', slip.id).eq('status', 'open');
      if (!sErr) { slipsSettled++; bump(slip.user_id, result.status); }
    }
  }

  // ── 정산 알림 푸시 (구독한 유저에게만) ──
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com';
  const pushSecret = process.env.PUSH_SEND_SECRET;
  let pushed = 0;
  if (pushSecret) {
    await Promise.all(Object.entries(notifyMap).map(async ([userId, n]) => {
      const parts: string[] = [`베팅 ${n.count}건 정산`];
      if (n.won) parts.push(`적중 ${n.won}`);
      if (n.lost) parts.push(`실패 ${n.lost}`);
      try {
        const r = await fetch(`${baseUrl}/api/coach/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: pushSecret, userId, title: 'TrendCoach 정산 완료', body: parts.join(' · '), url: '/coach/bets' }),
        });
        if (r.ok) pushed++;
      } catch (_) { /* 발송 실패는 정산 성공에 영향 없음 */ }
    }));
  }

  return NextResponse.json({ ok: true, settled, voided, scoredCLV, skipped, openTotal: openBets.length, slipsSettled, pushed });
}
