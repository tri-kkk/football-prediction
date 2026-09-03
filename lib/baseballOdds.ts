// lib/baseballOdds.ts
// 야구 배당 → 내재확률(implied probability) 계산 단일 유틸
//
// ⚠️ 배경 (2026-09-03)
// baseball_odds_latest.home_win_prob / away_win_prob 컬럼은 신뢰할 수 없다.
//  - collect-odds cron: 배당 기반 내재확률(정상)을 기록
//  - Railway ML 서비스: /predict 호출 시 "모델 원시 확률"을 같은 컬럼에 덮어씀
// → 마지막에 실행된 쪽이 이기므로, 같은 경기의 값이 시점마다 달라진다.
//   (예: 181355 배당 2.65/1.44 → 정상 35.21%인데 76.48%가 저장돼 있음)
//
// 따라서 화면에 노출하는 "배당 기반 확률"은 저장 컬럼을 읽지 말고
// 항상 home_win_odds / away_win_odds에서 즉석 계산한다.

export type ImpliedProb = { home: number; away: number } | null

/** 소수 배당 2개 → 오버라운드 제거한 내재확률(%) */
export function impliedFromOdds(
  homeOdds: number | null | undefined,
  awayOdds: number | null | undefined
): ImpliedProb {
  const h = Number(homeOdds)
  const a = Number(awayOdds)
  if (!Number.isFinite(h) || !Number.isFinite(a) || h <= 1 || a <= 1) return null
  const rawH = 1 / h
  const rawA = 1 / a
  const total = rawH + rawA
  if (!(total > 0)) return null
  return {
    home: Math.round((rawH / total) * 10000) / 100,
    away: Math.round((rawA / total) * 10000) / 100,
  }
}

/**
 * baseball_odds_latest / baseball_odds_history 행의 home_win_prob·away_win_prob를
 * 배당에서 재계산한 값으로 교체한다. 배당이 없으면 확률을 null로 지운다
 * (저장돼 있는 값은 배당 확률이 아니라 ML 원시값이라 의미가 다르다).
 */
export function sanitizeOddsRow<T extends Record<string, any> | null | undefined>(row: T): T {
  if (!row) return row
  const im = impliedFromOdds((row as any).home_win_odds, (row as any).away_win_odds)
  return {
    ...(row as any),
    home_win_prob: im?.home ?? null,
    away_win_prob: im?.away ?? null,
  } as T
}
