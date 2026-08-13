// lib/coachSlip.ts
// 조합(슬립) 순수 로직: 합산배당 · 조합 CLV · 정산. 부작용 없음.
import type { Pick, BetStatus } from './coachSignal';

/** 합산배당 = 각 레그 배당의 곱 */
export function combinedOdds(legs: { betOdds: number }[]): number {
  const p = legs.reduce((acc, l) => acc * (l.betOdds || 1), 1);
  return Math.round(p * 10000) / 10000;
}

/** 조합 CLV = ∏betOdds / ∏closeOdds − 1 (활성 레그 모두 마감배당 있어야) */
export function slipCLV(active: { betOdds: number; closeOdds: number | null }[]): number | null {
  if (!active.length || active.some((l) => !l.closeOdds || l.closeOdds <= 0)) return null;
  const bet = active.reduce((a, l) => a * l.betOdds, 1);
  const close = active.reduce((a, l) => a * (l.closeOdds as number), 1);
  return Math.round((bet / close - 1) * 10000) / 10000;
}

export interface SettleLeg { pick: Pick; result: Pick | 'VOID' | null; betOdds: number; closeOdds: number | null }
export interface SlipSettleResult {
  status: BetStatus;
  payout: number;
  clv: number | null;
  legStatuses: BetStatus[];
}

/**
 * 슬립 정산. 전 레그 결과가 있어야 정산(하나라도 없으면 null → open 유지).
 * - 하나라도 lost → 슬립 lost(payout 0)
 * - void 레그는 배당 1.0 취급(합산에서 제외)
 * - 활성 레그 전부 won → 슬립 won(payout = stake × 활성 합산배당)
 * - 전부 void → 슬립 void(payout = stake)
 */
export function settleSlip(legs: SettleLeg[], stake: number): SlipSettleResult | null {
  if (!legs.length || legs.some((l) => l.result == null)) return null;
  const legStatuses: BetStatus[] = legs.map((l) =>
    l.result === 'VOID' ? 'void' : l.pick === l.result ? 'won' : 'lost'
  );
  const active = legs.filter((_, i) => legStatuses[i] !== 'void');
  const clv = slipCLV(active);

  if (legStatuses.includes('lost')) return { status: 'lost', payout: 0, clv, legStatuses };
  if (active.length === 0) return { status: 'void', payout: stake, clv: null, legStatuses };
  const odds = combinedOdds(active);
  return { status: 'won', payout: Math.round(stake * odds), clv, legStatuses };
}
