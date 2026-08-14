// lib/coachApi.ts — TrendCoach 브라우저 API 클라이언트
// 모바일/TWA는 로그인 시 발급받은 Bearer JWT(coach_token)를 localStorage에 저장 → 헤더로 첨부.

export class MembershipError extends Error {
  constructor() { super('MEMBERSHIP_REQUIRED'); this.name = 'MembershipError'; }
}
export class AuthError extends Error {
  constructor() { super('UNAUTHORIZED'); this.name = 'AuthError'; }
}

/** 로그인 URL — 코치 서브도메인이면 메인(www) 로그인으로, 그 외(프리뷰/로컬)는 동일 호스트 /login */
export function mainLoginUrl(): string {
  if (typeof window === 'undefined') return '/login';
  const rt = encodeURIComponent(window.location.origin + '/coach'); // 로그인 후 coach로 복귀
  return window.location.hostname.endsWith('trendsoccer.com')
    ? `https://www.trendsoccer.com/login?returnTo=${rt}`
    : `/login?returnTo=${rt}`;
}

export function getCoachToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('coach_token');
}
export function setCoachToken(t: string) {
  if (typeof window !== 'undefined') localStorage.setItem('coach_token', t);
}

async function req<T = any>(path: string, init?: RequestInit): Promise<T> {
  const token = getCoachToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) throw new AuthError();
  if (res.status === 402) throw new MembershipError();
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface Gap { outcome: 'HOME' | 'DRAW' | 'AWAY'; pp: number; strength: number }
export interface Signal {
  grade: 'S' | 'A' | 'B' | 'C'; score: number; formType: string;
  strengths: { home: string; draw: string; away: string };
  recommendation: 'HOME' | 'DRAW' | 'AWAY' | 'WATCH'; recommendationText: string;
  histRate: number | null; totalMatches: number | null; confidence: string | null;
  patternCode: string; ksmCode: string; gap: Gap | null;
}
export interface MatchSignal {
  matchId: string; league: string; kickoff: string; home: string; away: string;
  homeId?: number; awayId?: number; round?: string;
  model: { home: number; draw: number; away: number };
  market: { home: number; draw: number; away: number } | null;
  odds: { home: number | null; draw: number | null; away: number | null };
  signal: Signal | null; teaser?: boolean; locked?: boolean;
}

export interface SlipLegInput { matchId: string; pick: string; betOdds: number }

// 경기 목록 클라 캐시: 홈↔경기 이동/리그 전환 시 60초 내 재요청은 즉시 반환.
// 같은 리그 동시 요청은 dedup. force=true(당겨서 새로고침)면 캐시 무시하고 갱신.
type MatchesRes = { league: string; member: boolean; count: number; matches: MatchSignal[] };
const _matchCache = new Map<string, { t: number; data: MatchesRes }>();
const _matchInflight = new Map<string, Promise<MatchesRes>>();
const MATCHES_TTL = 60_000;

export const coachApi = {
  matches: (league = 'ALL', force = false): Promise<MatchesRes> => {
    const now = Date.now();
    const hit = _matchCache.get(league);
    if (!force && hit && now - hit.t < MATCHES_TTL) return Promise.resolve(hit.data);
    const inflight = _matchInflight.get(league);
    if (!force && inflight) return inflight;
    const p = req<MatchesRes>(`/api/coach/matches?league=${league}`)
      .then((d) => { _matchCache.set(league, { t: Date.now(), data: d }); _matchInflight.delete(league); return d; })
      .catch((e) => { _matchInflight.delete(league); throw e; });
    _matchInflight.set(league, p);
    return p;
  },
  dashboard: () => req(`/api/coach/dashboard`),
  report: () => req(`/api/coach/report`),
  bets: (status?: 'open' | 'settled') => req(`/api/coach/bets${status ? `?status=${status}` : ''}`),
  createBet: (b: { matchId: string; pick: string; stake: number; betOdds: number }) =>
    req(`/api/coach/bets`, { method: 'POST', body: JSON.stringify(b) }),
  slips: (status?: 'open' | 'settled') => req<{ slips: any[] }>(`/api/coach/slips${status ? `?status=${status}` : ''}`),
  createSlip: (s: { stake: number; legs: SlipLegInput[] }) =>
    req(`/api/coach/slips`, { method: 'POST', body: JSON.stringify(s) }),
};
