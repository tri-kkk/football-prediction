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
  homeId?: number; awayId?: number;
  model: { home: number; draw: number; away: number };
  market: { home: number; draw: number; away: number } | null;
  odds: { home: number | null; draw: number | null; away: number | null };
  signal: Signal | null; teaser?: boolean; locked?: boolean;
}

export const coachApi = {
  matches: (league = 'ALL') => req<{ league: string; member: boolean; count: number; matches: MatchSignal[] }>(`/api/coach/matches?league=${league}`),
  dashboard: () => req(`/api/coach/dashboard`),
  report: () => req(`/api/coach/report`),
  bets: (status?: 'open' | 'settled') => req(`/api/coach/bets${status ? `?status=${status}` : ''}`),
  createBet: (b: { matchId: string; pick: string; stake: number; betOdds: number }) =>
    req(`/api/coach/bets`, { method: 'POST', body: JSON.stringify(b) }),
};
