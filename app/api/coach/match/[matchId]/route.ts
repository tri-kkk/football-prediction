// app/api/coach/match/[matchId]/route.ts
// GET /api/coach/match/:id — 회원 전용 경기 세부 데이터.
// KSM 시그널(모델·시장·이견) + 최근 5경기 폼 + H2H + 배당(확률) 변동 추이.
import { NextRequest, NextResponse } from 'next/server';
import { getCoachUser } from '@/lib/coachAuth';
import { checkCoachMembership } from '@/lib/checkCoachMembership';
import { getMatchSignal } from '@/lib/coachMatchService';
import { af, buildTeamStats, LEAGUES, currentSeason } from '@/lib/ksmModel';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function toForm(fixtures: any[], teamId: number, ko: Record<number, string>) {
  return (fixtures || []).slice(0, 5).map((m: any) => {
    const isHome = m.teams.home.id === teamId;
    const result = m.teams.home.winner ? (isHome ? 'W' : 'L') : m.teams.away.winner ? (isHome ? 'L' : 'W') : 'D';
    const opp = isHome ? m.teams.away : m.teams.home;
    return {
      opponent: ko[opp.id] || opp.name,
      score: `${m.goals.home ?? '-'}-${m.goals.away ?? '-'}`,
      result, isHome, date: m.fixture.date,
    };
  });
}

// 세부 데이터 계산 (유저 무관). 회원 게이팅은 라우트에서 선처리.
async function computeDetail(matchId: string) {
  const sig = await getMatchSignal(matchId);
  if (!sig) return null;

  const leagueId = LEAGUES[sig.league]?.id || 0;
  const season = currentSeason();
  const [homeFix, awayFix, h2hRes, trendRes, teamStats, standRes, trRes, totoRes, homeStatRes, awayStatRes, injRes, scorersRes] = await Promise.all([
    af(`/fixtures?team=${sig.homeId}&last=5`).catch(() => ({ response: [] })),
    af(`/fixtures?team=${sig.awayId}&last=5`).catch(() => ({ response: [] })),
    af(`/fixtures/headtohead?h2h=${sig.homeId}-${sig.awayId}&last=6`).catch(() => ({ response: [] })),
    supabaseAdmin
      .from('match_odds_history')
      .select('created_at,home_probability,draw_probability,away_probability')
      .eq('match_id', String(matchId))
      .order('created_at', { ascending: true }),
    buildTeamStats(leagueId).catch(() => ({} as Record<number, any>)),
    af(`/standings?league=${leagueId}&season=${season}`).catch(() => ({ response: [] })),
    supabaseAdmin.from('team_translations').select('team_id, korean_name').in('team_id', [sig.homeId, sig.awayId]),
    // 국내 구매율(토토) — sig.home/away 로만 매칭되므로 병렬로 함께 조회.
    supabaseAdmin
      .from('toto_matches')
      .select('home_team_en, away_team_en, vote_win, vote_draw, vote_lose, vote_total')
      .or(`home_team_en.ilike.%${sig.home}%,away_team_en.ilike.%${sig.home}%,home_team_en.ilike.%${sig.away}%,away_team_en.ilike.%${sig.away}%`)
      .limit(30),
    // 팀 시즌 심층 스탯(팀별) · 결장/부상(경기별) · 리그 득점왕(리그별) — 전부 30분 fetch 캐시.
    af(`/teams/statistics?team=${sig.homeId}&league=${leagueId}&season=${season}`).catch(() => ({ response: null })),
    af(`/teams/statistics?team=${sig.awayId}&league=${leagueId}&season=${season}`).catch(() => ({ response: null })),
    af(`/injuries?fixture=${matchId}`).catch(() => ({ response: [] })),
    af(`/players/topscorers?league=${leagueId}&season=${season}`).catch(() => ({ response: [] })),
  ]);

  // 팀명 한글 (뉴스 검색·표기용)
  let homeKo: string | null = null, awayKo: string | null = null;
  for (const t of (trRes as any)?.data || []) {
    if (t.team_id === sig.homeId) homeKo = t.korean_name;
    if (t.team_id === sig.awayId) awayKo = t.korean_name;
  }

  // KSM 팀 스탯(모델 입력값): 경기당 득점·실점, 선제골 시 승률
  const stat = (s: any) => {
    if (!s) return null;
    const played = (s.home_played || 0) + (s.away_played || 0);
    if (!played) return null;
    const gf = (s.home_goals_for || 0) + (s.away_goals_for || 0);
    const ga = (s.home_goals_against || 0) + (s.away_goals_against || 0);
    const fgG = (s.home_first_goal_games || 0) + (s.away_first_goal_games || 0);
    const fgW = (s.home_first_goal_wins || 0) + (s.away_first_goal_wins || 0);
    return { gpg: gf / played, gapg: ga / played, fgWinRate: fgG ? fgW / fgG : null };
  };
  const ksmStats = { home: stat((teamStats as any)[sig.homeId]), away: stat((teamStats as any)[sig.awayId]) };

  // 리그 순위·골득실 — 현재 시즌이 개막 전(경기수 0)이면 직전 시즌 최종 순위로 폴백
  const rowsOf = (res: any) => (res as any)?.response?.[0]?.league?.standings?.[0] || [];
  let standRows: any[] = rowsOf(standRes);
  let standSeason = Number(season);
  const notStarted = standRows.length === 0 || standRows.every((x: any) => (x.all?.played || 0) === 0);
  if (notStarted) {
    const prev = await af(`/standings?league=${leagueId}&season=${standSeason - 1}`).catch(() => ({ response: [] }));
    const prevRows = rowsOf(prev);
    if (prevRows.length) { standRows = prevRows; standSeason = standSeason - 1; }
  }
  const wdl = (x: any) => (x ? { w: x.win ?? 0, d: x.draw ?? 0, l: x.lose ?? 0 } : null);
  const standOf = (id: number) => {
    const r = standRows.find((x: any) => x.team?.id === id);
    return r ? {
      rank: r.rank, points: r.points, gf: r.all?.goals?.for, ga: r.all?.goals?.against, gd: r.goalsDiff,
      form: r.form ?? null,          // 리그 폼 스트릭 (WWDLW) — standings에 포함, 추가 호출 0
      homeRec: wdl(r.home), awayRec: wdl(r.away), // 홈/원정 성적 분리 — 추가 호출 0
    } : null;
  };
  const standings = { home: standOf(sig.homeId), away: standOf(sig.awayId), season: standSeason, isPrevious: standSeason !== Number(season) };

  // 새 시즌 개막 전이면(순위가 직전 시즌으로 폴백됨) 심층 스탯·득점왕도 같은 직전 시즌으로 재조회.
  // 현재 시즌은 경기 수가 0이라 스탯이 전부 0/빈값으로 나오기 때문.
  let hStatRes = homeStatRes, aStatRes = awayStatRes, scRes = scorersRes;
  if (standSeason !== Number(season)) {
    const [h2, a2, sc2] = await Promise.all([
      af(`/teams/statistics?team=${sig.homeId}&league=${leagueId}&season=${standSeason}`).catch(() => ({ response: null })),
      af(`/teams/statistics?team=${sig.awayId}&league=${leagueId}&season=${standSeason}`).catch(() => ({ response: null })),
      af(`/players/topscorers?league=${leagueId}&season=${standSeason}`).catch(() => ({ response: [] })),
    ]);
    hStatRes = h2; aStatRes = a2; scRes = sc2;
  }

  // ── 팀 시즌 심층 스탯 (/teams/statistics) ──
  const extractDeep = (res: any) => {
    const r = res?.response;
    if (!r) return null;
    const num = (v: any) => (v == null || v === '' ? null : Number(v));
    // 득점 시간대: 퍼센트 최고 구간
    const mins = r.goals?.for?.minute || {};
    let peak: string | null = null, peakPct = -1;
    for (const k of Object.keys(mins)) {
      const p = mins[k]?.percentage ? parseFloat(String(mins[k].percentage)) : 0;
      if (p > peakPct) { peakPct = p; peak = k; }
    }
    const formation = Array.isArray(r.lineups) && r.lineups.length
      ? [...r.lineups].sort((a: any, b: any) => (b.played || 0) - (a.played || 0))[0]?.formation ?? null
      : null;
    return {
      played: r.fixtures?.played?.total ?? null,
      cleanSheet: r.clean_sheet?.total ?? null,
      failedToScore: r.failed_to_score?.total ?? null,
      avgFor: num(r.goals?.for?.average?.total),
      avgAgainst: num(r.goals?.against?.average?.total),
      streakWin: r.biggest?.streak?.wins ?? null,
      streakLose: r.biggest?.streak?.loses ?? null,
      formation,
      goalPeak: peakPct > 0 ? peak : null,
    };
  };
  const teamDeep = { home: extractDeep(hStatRes), away: extractDeep(aStatRes) };

  // ── 결장/부상 (/injuries?fixture) ──
  const inj: { home: string[]; away: string[] } = { home: [], away: [] };
  for (const it of (injRes as any)?.response || []) {
    const nm = it.player?.name; if (!nm) continue;
    const reason = it.player?.reason || it.reason || null;
    const label = reason ? `${nm} (${reason})` : nm;
    if (it.team?.id === sig.homeId && !inj.home.includes(label)) inj.home.push(label);
    else if (it.team?.id === sig.awayId && !inj.away.includes(label)) inj.away.push(label);
  }
  const injuries = { home: inj.home.slice(0, 6), away: inj.away.slice(0, 6) };

  // ── 팀 간판 득점원 (/players/topscorers, 리그 상위 내 매칭) ──
  const topScorerFor = (teamId: number) => {
    for (const p of (scRes as any)?.response || []) {
      const st = (p.statistics || []).find((s: any) => s.team?.id === teamId);
      if (st && (st.goals?.total ?? 0) > 0) return { name: p.player?.name ?? null, goals: st.goals?.total ?? null };
    }
    return null;
  };
  const topScorer = { home: topScorerFor(sig.homeId), away: topScorerFor(sig.awayId) };

  // 폼·H2H 상대팀 한글화: 관련 팀 id 전체 번역 로드
  const teamIdSet = new Set<number>();
  for (const arr of [homeFix.response, awayFix.response, h2hRes.response]) {
    for (const mm of arr || []) { if (mm.teams?.home?.id) teamIdSet.add(mm.teams.home.id); if (mm.teams?.away?.id) teamIdSet.add(mm.teams.away.id); }
  }
  const koMap: Record<number, string> = {};
  if (teamIdSet.size) {
    const { data: trAll } = await supabaseAdmin.from('team_translations').select('team_id, korean_name').in('team_id', [...teamIdSet]);
    for (const t of trAll || []) if (t.korean_name) koMap[t.team_id] = t.korean_name;
  }

  // H2H (sig.home 관점 집계)
  const h2hRows = (h2hRes.response || []).map((m: any) => ({
    date: m.fixture.date,
    home: koMap[m.teams.home.id] || m.teams.home.name, away: koMap[m.teams.away.id] || m.teams.away.name,
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
  const trend = ((trendRes as any).data || []).map((p: any) => {
    const h = Number(p.home_probability) || 0, dr = Number(p.draw_probability) || 0, a = Number(p.away_probability) || 0;
    const sum = h + dr + a;
    return sum > 0
      ? { t: p.created_at, h: h / sum, d: dr / sum, a: a / sum }
      : { t: p.created_at, h: 0, d: 0, a: 0 };
  });

  // 국내 구매율(와이즈토토 toto_calc) — 팀명(영문)으로 매칭, 토토 홈/원정 뒤집힘 보정
  let toto: { home: number; draw: number; away: number; total: number } | null = null;
  const totoRows = (totoRes as any)?.data || [];
  const norm = (s = '') => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const H = norm(sig.home), A = norm(sig.away);
  for (const r of totoRows) {
    const th = norm(r.home_team_en), ta = norm(r.away_team_en);
    if (!th || !ta) continue;
    const sameH = th.includes(H) || H.includes(th), sameA = ta.includes(A) || A.includes(ta);
    const swapH = th.includes(A) || A.includes(th), swapA = ta.includes(H) || H.includes(ta);
    if (sameH && sameA) { toto = { home: r.vote_win, draw: r.vote_draw, away: r.vote_lose, total: r.vote_total }; break; }
    if (swapH && swapA) { toto = { home: r.vote_lose, draw: r.vote_draw, away: r.vote_win, total: r.vote_total }; break; }
  }

  return {
    match: { matchId: sig.matchId, league: sig.league, round: sig.round, kickoff: sig.kickoff, home: sig.home, away: sig.away, homeId: sig.homeId, awayId: sig.awayId, homeKo, awayKo },
    model: sig.model, market: sig.market, odds: sig.odds, signal: sig.signal,
    homeForm: toForm(homeFix.response, sig.homeId, koMap),
    awayForm: toForm(awayFix.response, sig.awayId, koMap),
    h2h: h2hRows, h2hSummary: { home: hw, draw: d, away: aw },
    trend, toto, ksmStats, standings,
    teamDeep, injuries, topScorer,
  };
}

// 세부 데이터 60초 인메모리 캐시 + dedup (유저 무관 데이터 → 재조회/동시요청 흡수).
const _detailCache = new Map<string, { t: number; data: any }>();
const _detailInflight = new Map<string, Promise<any>>();
const DETAIL_TTL = 60_000;
function getDetailCached(matchId: string): Promise<any> {
  const now = Date.now();
  const hit = _detailCache.get(matchId);
  if (hit && now - hit.t < DETAIL_TTL) return Promise.resolve(hit.data);
  const inflight = _detailInflight.get(matchId);
  if (inflight) return inflight;
  const p = computeDetail(matchId)
    .then((d) => { if (d) _detailCache.set(matchId, { t: Date.now(), data: d }); _detailInflight.delete(matchId); return d; })
    .catch((e) => { _detailInflight.delete(matchId); throw e; });
  _detailInflight.set(matchId, p);
  return p;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await ctx.params;
  const user = await getCoachUser(req);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  if (!(await checkCoachMembership(user.userId)))
    return NextResponse.json({ error: '멤버쉽 전용', code: 'MEMBERSHIP_REQUIRED' }, { status: 402 });

  const data = await getDetailCached(matchId);
  if (!data) return NextResponse.json({ error: '경기를 찾을 수 없습니다' }, { status: 404 });
  return NextResponse.json(data);
}
