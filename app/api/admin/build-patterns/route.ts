// app/api/admin/build-patterns/route.ts
// 리그별 fg_patterns 재빌드 (라이브와 동일한 KSM 모델 재사용).
// 과거 경기(fg_match_history)에 모델이 매기는 패턴코드를 산출 → 실제 결과로 승률 집계.
//
// 사용:
//   GET /api/admin/build-patterns?league=J1&secret=<KSM_BUILD_SECRET>         → 미리보기(dry, DB 변경 없음)
//   GET /api/admin/build-patterns?league=J1&secret=<...>&commit=1             → 실제 기록(해당 리그 fg_patterns 재빌드)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LEAGUES, buildTeamStats, predict, patternCode } from '@/lib/ksmModel';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function fetchAllHistory(supabase: ReturnType<typeof db>, leagueId: number) {
  const rows: any[] = [];
  let from = 0; const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from('fg_match_history')
      .select('home_team_id,away_team_id,home_score,away_score,result')
      .eq('league_id', leagueId)
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < page) break;
    from += page;
  }
  return rows;
}

function outcome(m: any): 'HOME' | 'DRAW' | 'AWAY' | null {
  if (m.result === 'HOME' || m.result === 'DRAW' || m.result === 'AWAY') return m.result;
  const h = m.home_score, a = m.away_score;
  if (h == null || a == null) return null;
  return h > a ? 'HOME' : h < a ? 'AWAY' : 'DRAW';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('secret') !== (process.env.KSM_BUILD_SECRET || 'ksm-build')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const code = (searchParams.get('league') || 'J1').toUpperCase();
  const cfg = LEAGUES[code];
  if (!cfg) return NextResponse.json({ error: 'unknown league' }, { status: 400 });
  const commit = searchParams.get('commit') === '1';

  const supabase = db();
  const stats = await buildTeamStats(cfg.id); // 라이브와 동일한 팀 통계
  const history = await fetchAllHistory(supabase, cfg.id);

  const agg: Record<string, { h: number; d: number; a: number }> = {};
  let used = 0, skipped = 0;
  for (const m of history) {
    const h = stats[m.home_team_id], a = stats[m.away_team_id];
    const res = outcome(m);
    if (!h || !a || !res) { skipped++; continue; }
    const p = predict(h, a);
    const pc = patternCode(p.home, p.draw, p.away);
    const bucket = (agg[pc] = agg[pc] || { h: 0, d: 0, a: 0 });
    bucket[res === 'HOME' ? 'h' : res === 'DRAW' ? 'd' : 'a']++;
    used++;
  }

  const rows = Object.entries(agg).map(([pattern, c]) => {
    const total = c.h + c.d + c.a;
    const hr = c.h / total, dr = c.d / total, ar = c.a / total;
    const conf = total >= 40 ? 'HIGH' : total >= 15 ? 'MEDIUM' : 'LOW';
    const rec = hr >= dr && hr >= ar ? 'HOME' : dr >= ar ? 'DRAW' : 'AWAY';
    const recKo = rec === 'HOME' ? '홈' : rec === 'DRAW' ? '무' : '원정';
    return {
      league_id: cfg.id,
      pattern,
      total_matches: total,
      home_win_rate: +hr.toFixed(4),
      draw_rate: +dr.toFixed(4),
      away_win_rate: +ar.toFixed(4),
      confidence: conf,
      recommendation: rec,
      description: `${cfg.name} 패턴 ${pattern} · ${total}경기 · ${recKo} ${Math.round(Math.max(hr, dr, ar) * 100)}%`,
      _hwa: `${c.h}/${c.d}/${c.a}`, // 미리보기용(삽입 안 함)
    };
  }).sort((a, b) => b.total_matches - a.total_matches);

  const summary = { league: code, leagueId: cfg.id, totalHistory: history.length, used, skipped, patterns: rows.length };

  if (!commit) {
    return NextResponse.json({ mode: 'dry (미리보기)', ...summary, note: '실제 기록하려면 &commit=1 추가', rows });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: '집계된 패턴이 없어 기록 취소', ...summary }, { status: 400 });
  }

  // 삽입 컬럼(앱이 읽는 것 + 확인된 것만). _hwa 제거.
  const insertRows = rows.map(({ _hwa, ...r }) => r);
  const del = await supabase.from('fg_patterns').delete().eq('league_id', cfg.id);
  if (del.error) return NextResponse.json({ error: `삭제 실패: ${del.error.message}`, ...summary }, { status: 500 });
  const ins = await supabase.from('fg_patterns').insert(insertRows);
  if (ins.error) {
    return NextResponse.json({ error: `삽입 실패: ${ins.error.message}`, hint: '컬럼 불일치일 수 있음 — 에러 메시지 알려주면 컬럼 조정', sample: insertRows[0] }, { status: 500 });
  }
  return NextResponse.json({ mode: 'committed (기록 완료)', ...summary });
}
