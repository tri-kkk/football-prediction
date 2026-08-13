// lib/coachSignal.ts
// TrendCoach 순수 로직: 시그널 등급 · 형세 타입 · 모델−시장 이견 · CLV · 정산 · 집계.
// KSM 모델(ksmModel.ts) 위에 얹는 소비자용 레이어. 부작용 없음.

export type Grade = 'S' | 'A' | 'B' | 'C';
export type Pick = 'HOME' | 'DRAW' | 'AWAY';
export type BetStatus = 'won' | 'lost' | 'void';
export interface Probs { home: number; draw: number; away: number }

// ── 시그널 등급 ──
// score = 100 * (0.50*histRate + 0.35*pMax + 0.15*sampleFactor)
export function signalScore(histRate: number, pMax: number, totalMatches: number): number {
  const sampleFactor = Math.min(totalMatches / 40, 1);
  return Math.round(100 * (0.5 * histRate + 0.35 * pMax + 0.15 * sampleFactor) * 10) / 10;
}
export function signalGrade(histRate: number, pMax: number, totalMatches: number): { score: number; grade: Grade } {
  const score = signalScore(histRate, pMax, totalMatches);
  let grade: Grade;
  if (totalMatches < 15) grade = 'C';
  else if (score >= 78) grade = 'S';
  else if (score >= 68) grade = 'A';
  else if (score >= 55) grade = 'B';
  else grade = 'C';
  return { score, grade };
}
export const isWatch = (g: Grade) => g === 'C';

// ── 형세 타입 (patternCode: 'H1-D2-A3', 숫자 1강/2중/3약, 0극단) ──
const cls: Record<number, string> = { 1: '강', 2: '중', 3: '약', 0: '-' };
export function parsePattern(patternCode: string): { h: number; d: number; a: number } {
  const m = patternCode.match(/H(\d)-D(\d)-A(\d)/i);
  return m ? { h: +m[1], d: +m[2], a: +m[3] } : { h: 0, d: 0, a: 0 };
}
export function formType(patternCode: string): { type: string; strengths: { home: string; draw: string; away: string } } {
  const { h, d, a } = parsePattern(patternCode);
  const strengths = { home: cls[h] ?? '-', draw: cls[d] ?? '-', away: cls[a] ?? '-' };
  let type = '혼전 박빙형';
  if (h === 1 && d === 3 && a === 3) type = '홈 지배형';
  else if (h === 1) type = '홈 우세형';
  else if (a === 1 && h === 3 && d === 3) type = '원정 지배형';
  else if (a === 1) type = '원정 우세형';
  else if (d === 1) type = '무승부 경계형';
  return { type, strengths };
}
// KSM 내부코드 "1-2-3" → "H1-D2-A3"
export function ksmCodeToPattern(code: string): string {
  const m = code.match(/^\s*(\d)\s*-\s*(\d)\s*-\s*(\d)\s*$/);
  return m ? `H${m[1]}-D${m[2]}-A${m[3]}` : code;
}

// ── 모델 − 시장 이견 ──
export function modelMarketGap(model: Probs, market: Probs, outcome: keyof Probs): number {
  return Math.round((model[outcome] - market[outcome]) * 1000) / 10; // pp, 소수1
}
export function gapStrength(pp: number): number {
  const a = Math.abs(pp);
  return a >= 10 ? 5 : a >= 7 ? 4 : a >= 4 ? 3 : a >= 2 ? 2 : 1;
}

// ── CLV · 정산 ──
export function computeCLV(betOdds: number, closeOdds: number | null): number | null {
  if (!closeOdds || closeOdds <= 0) return null;
  return Math.round((betOdds / closeOdds - 1) * 10000) / 10000;
}
export function settleBet(
  pick: Pick, outcome: Pick | 'VOID', stake: number, betOdds: number, closeOdds: number | null
): { status: BetStatus; payout: number; clv: number | null } {
  if (outcome === 'VOID') return { status: 'void', payout: stake, clv: null };
  const status: BetStatus = pick === outcome ? 'won' : 'lost';
  const payout = status === 'won' ? Math.round(stake * betOdds) : 0;
  return { status, payout, clv: computeCLV(betOdds, closeOdds) };
}

// ── 대시보드 집계 ──
export function aggregate(bets: { status: BetStatus; stake: number; payout: number | null; clv: number | null }[]) {
  const settled = bets.filter((b) => b.status === 'won' || b.status === 'lost');
  const won = settled.filter((b) => b.status === 'won').length;
  const staked = settled.reduce((s, b) => s + b.stake, 0);
  const returned = settled.reduce((s, b) => s + (b.payout ?? 0), 0);
  const clvs = bets.map((b) => b.clv).filter((v): v is number => v != null);
  const avgClv = clvs.length ? clvs.reduce((s, v) => s + v, 0) / clvs.length : null;
  return {
    count: settled.length,
    hitRate: settled.length ? won / settled.length : null,
    profit: returned - staked,
    roi: staked ? (returned - staked) / staked : null,
    avgClv,
    clvSampleEnough: clvs.length >= 200,
  };
}

export const pickKey = (pk: Pick): keyof Probs => (pk === 'HOME' ? 'home' : pk === 'DRAW' ? 'draw' : 'away');
export const argmaxPick = (p: Probs): Pick =>
  p.home >= p.draw && p.home >= p.away ? 'HOME' : p.draw >= p.away ? 'DRAW' : 'AWAY';
