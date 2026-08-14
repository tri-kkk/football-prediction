// lib/ksmModel.ts
// KSM 예측 모델 코어 — app/api/admin/ksm/route.ts에서 추출(부작용 제거).
// admin/ksm 와 TrendCoach(app/api/coach/*)가 공유하는 단일 진실원(single source of truth).
// 데이터: fg_team_stats(다시즌 팀통계), fg_patterns(패턴 실적), API-Football(fixtures).

import { supabaseAdmin } from './supabase';

export const LEAGUES: Record<string, { id: number; name: string }> = {
  PL: { id: 39, name: '프리미어리그' },
  BL1: { id: 78, name: '분데스리가' },
  PD: { id: 140, name: '라리가' },
  FL1: { id: 61, name: '리그1' },
  SA: { id: 135, name: '세리에A' },
  J1: { id: 98, name: 'J1리그' },
  KL1: { id: 292, name: 'K리그1' },
};
// 상위리그 → 2부리그 매핑. 승격팀(상위리그 표본이 얇은 팀)은 2부 데이터로 환산.
export const SECOND_DIV: Record<number, number> = { 39: 40, 78: 79, 140: 141, 135: 136, 61: 62, 98: 99, 292: 293 };
export const FINISHED = new Set(['FT', 'AET', 'PEN']);

const AF_HOST = 'v3.football.api-sports.io';
export function currentSeason(): number {
  const now = new Date();
  return now.getMonth() + 1 >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}
export async function af(endpoint: string) {
  const res = await fetch(`https://${AF_HOST}${endpoint}`, {
    headers: { 'x-rapidapi-key': process.env.API_FOOTBALL_KEY!, 'x-rapidapi-host': AF_HOST },
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}`);
  return res.json();
}

const SUMKEYS = [
  'home_played', 'home_wins', 'home_goals_for', 'home_goals_against',
  'home_first_goal_games', 'home_first_goal_wins', 'home_concede_first_games', 'home_concede_first_wins',
  'away_played', 'away_wins', 'away_goals_for', 'away_goals_against',
  'away_first_goal_games', 'away_first_goal_wins', 'away_concede_first_games', 'away_concede_first_wins',
];
function aggregate(src: any[], promoted: boolean) {
  const F: any = { promoted };
  for (const k of SUMKEYS) F[k] = src.reduce((s: number, r: any) => s + (r[k] || 0), 0);
  const latest = src.reduce((a: any, b: any) => (parseInt(b.season) > parseInt(a.season) ? b : a));
  F.form_home_5 = latest.form_home_5; F.form_away_5 = latest.form_away_5;
  if (promoted) {
    F.home_goals_for *= 0.6; F.away_goals_for *= 0.6;
    F.home_goals_against *= 2.32; F.away_goals_against *= 2.32;
    F.home_first_goal_wins *= 0.51; F.away_first_goal_wins *= 0.51;
    F.home_concede_first_wins *= 0.51; F.away_concede_first_wins *= 0.51;
    if (F.form_home_5 != null) F.form_home_5 *= 0.6;
    if (F.form_away_5 != null) F.form_away_5 *= 0.6;
  }
  return F;
}

/** 리그별 팀 통계 (fg_team_stats 다시즌 합산, PL 승격팀 챔스 환산) */
// 팀 스탯은 크론으로만 갱신되는 DB 데이터 → 리그별 120초 인메모리 캐시 + dedup.
// 상세 라우트에서 getMatchSignal + 직접 호출로 2번 부르던 중복도 캐시로 흡수됨.
const _tsCache = new Map<number, { t: number; data: Record<number, any> }>();
const _tsInflight = new Map<number, Promise<Record<number, any>>>();
const TS_TTL = 120_000;
export async function buildTeamStats(leagueId: number): Promise<Record<number, any>> {
  const now = Date.now();
  const hit = _tsCache.get(leagueId);
  if (hit && now - hit.t < TS_TTL) return hit.data;
  const inflight = _tsInflight.get(leagueId);
  if (inflight) return inflight;
  const p = _buildTeamStatsRaw(leagueId)
    .then((d) => { _tsCache.set(leagueId, { t: Date.now(), data: d }); _tsInflight.delete(leagueId); return d; })
    .catch((e) => { _tsInflight.delete(leagueId); throw e; });
  _tsInflight.set(leagueId, p);
  return p;
}
async function _buildTeamStatsRaw(leagueId: number): Promise<Record<number, any>> {
  const { data: rows } = await supabaseAdmin.from('fg_team_stats').select('*')
    .eq('league_id', leagueId).in('season', ['2023', '2024', '2025', '2026']);
  const byTeam: Record<number, any[]> = {};
  for (const r of rows || []) (byTeam[r.team_id] = byTeam[r.team_id] || []).push(r);

  // 승격팀 보강: 해당 상위리그의 2부 데이터 로드(모든 2부 팀). 상위리그에 자리잡은 팀은 스킵.
  const secondId = SECOND_DIV[leagueId];
  const secByTeam: Record<number, any[]> = {};
  if (secondId) {
    const { data: sec } = await supabaseAdmin.from('fg_team_stats').select('*')
      .eq('league_id', secondId).in('season', ['2024', '2025', '2026']);
    for (const r of sec || []) (secByTeam[r.team_id] = secByTeam[r.team_id] || []).push(r);
  }

  const stats: Record<number, any> = {};
  const ids = new Set<number>([...Object.keys(byTeam).map(Number), ...Object.keys(secByTeam).map(Number)]);
  for (const tid of ids) {
    const top = byTeam[tid] || [];
    const top2026 = top.find((r: any) => r.season === '2026');
    const played2026 = top2026?.total_played || 0;
    // 상위리그 표본이 얇고(<5경기) 2부 데이터가 있으면 승격팀 → 2부 데이터 환산 사용
    const usePromo = played2026 < 5 && (secByTeam[tid]?.length ?? 0) > 0;
    const src = usePromo ? secByTeam[tid] : top;
    if (!src.length) continue;
    stats[tid] = aggregate(src, usePromo);
  }
  return stats;
}

// ── 3방법 재보정 모델 ──
const PA = (gf: number, ga: number) => (ga === 0 ? (gf > 0 ? 2 : 1) : gf / ga);
const WR = (w: number, g: number) => (g < 4 ? 0.5 : w / g);
export function predict(h: any, a: any): { home: number; draw: number; away: number } {
  const hSplit = PA(h.home_goals_for, h.home_goals_against);
  const hO = PA(h.home_goals_for + h.away_goals_for, h.home_goals_against + h.away_goals_against);
  const aSplit = PA(a.away_goals_for, a.away_goals_against);
  const aO = PA(a.home_goals_for + a.away_goals_for, a.home_goals_against + a.away_goals_against);
  const hPA = 0.6 * hSplit + 0.4 * hO, aPA = 0.6 * aSplit + 0.4 * aO;
  const hPA5 = h.form_home_5 ? h.form_home_5 / 1.5 : hPA;
  const aPA5 = a.form_away_5 ? a.form_away_5 / 1.5 : aPA;
  const hFG = WR(h.home_first_goal_wins, h.home_first_goal_games);
  const aFG = WR(a.away_first_goal_wins, a.away_first_goal_games);
  const hCB = WR(h.home_concede_first_wins, h.home_concede_first_games);
  const aCB = WR(a.away_concede_first_wins, a.away_concede_first_games);
  const hAdv = (hPA + hPA5) / 2, aAdv = (aPA + aPA5) / 2, tot = hAdv + aAdv;
  const m1w = hAdv / tot + (hFG - 0.5) * 0.15, m1l = aAdv / tot + (aFG - 0.5) * 0.15;
  const m1d = Math.max(1 - m1w - m1l, 0.15);
  const hmin = Math.min(hPA, hPA5), hmax = Math.max(hPA, hPA5), amax = Math.max(aPA, aPA5), amin = Math.min(aPA, aPA5);
  const m2w = (hmin / (hmin + amax) + hmax / (hmax + amax) + hmin / (hmin + amin)) / 3;
  const m2d = Math.max(0.18, 0.3 - Math.abs(hAdv - aAdv) * 0.15), m2l = 1 - m2w - m2d;
  const hSF = hPA / (hPA + aPA), aSF = 1 - hSF;
  const m3w = hSF * hFG + aSF * hCB, m3l = aSF * aFG + hSF * aCB;
  const m3d = Math.min(Math.max(1 - m3w - m3l, 0.15), 0.35);
  const w = (m1w + m2w + m3w) / 3, d = (m1d + m2d + m3d) / 3, l = (m1l + m2l + m3l) / 3;
  const t = w + d + l;
  return { home: w / t, draw: d / t, away: l / t };
}

/** 배당 → 시장 확률 (마진/오버라운드 제거, power) */
export function devig(oh: number, odw: number, oa: number): { home: number; draw: number; away: number } {
  const raw = [1 / oh, 1 / odw, 1 / oa];
  let lo = 0.5, hi = 1.5;
  for (let i = 0; i < 50; i++) {
    const k = (lo + hi) / 2;
    const s = raw.reduce((x, r) => x + Math.pow(r, k), 0);
    if (s > 1) lo = k; else hi = k;
  }
  const k = (lo + hi) / 2;
  const p = raw.map((r) => Math.pow(r, k));
  const s = p[0] + p[1] + p[2];
  return { home: p[0] / s, draw: p[1] / s, away: p[2] / s };
}

/** KSM 패턴 코드 "1-2-3" (홈-무-원정 등급: 1강/2중/3약, 0극단) */
export function patternCode(hp: number, dp: number, ap: number): string {
  const mx = Math.max(hp, dp, ap), mn = Math.min(hp, dp, ap);
  const c = (v: number) => (v <= 0.05 ? 0 : v >= 0.85 ? 0 : v >= mx - 0.03 ? 1 : v <= mn + 0.05 ? 3 : 2);
  return `${c(hp)}-${c(dp)}-${c(ap)}`;
}

/** 추천(무승부 라벨 포함) */
export function recommend(p: { home: number; draw: number; away: number }): string {
  const arr: [string, number][] = [['홈승', p.home], ['무', p.draw], ['원정승', p.away]];
  arr.sort((a, b) => b[1] - a[1]);
  const [label, top] = arr[0];
  const gap = top - arr[1][1];
  const s = (v: number) => `${(v * 100).toFixed(0)}%`;
  const ds = s(p.draw);
  if (label === '무') return p.draw >= 0.30 ? `무승부 추천 (${ds})` : `무승부 우세 (${ds})`;
  if (top >= 0.60 || gap >= 0.20) return `${label} 추천 (${s(top)})`;
  if (top >= 0.48 || gap >= 0.10) return `${label} 우세 (${s(top)})`;
  if (p.draw >= 0.25) return `무승부 고려 (${ds})`;
  return `접전 - 주의`;
}
