// lib/baseballStatus.ts
// API-Football 야구 status 코드 통합 분류 헬퍼
//
// ⚠️ 주의: 이전 코드는 status.startsWith('IN')으로 LIVE를 판정했으나,
//   'INTR'(Interrupted)도 'IN'으로 시작하기 때문에 중단된 경기가 LIVE로 잘못 표시되는 버그가 있었음.
//   반드시 이 헬퍼 함수를 사용해 분류할 것.

// LIVE 상태(이닝 진행 중) 화이트리스트
// IN1~IN9 (정규 이닝) + IN10~IN15 (연장)
const LIVE_INNING_STATUSES = new Set([
  'IN1', 'IN2', 'IN3', 'IN4', 'IN5', 'IN6', 'IN7', 'IN8', 'IN9',
  'IN10', 'IN11', 'IN12', 'IN13', 'IN14', 'IN15',
])

// 일부 데이터에서 1H~9H 형태로 들어오는 케이스
const HALF_INNING_STATUSES = new Set([
  '1H', '2H', '3H', '4H', '5H', '6H', '7H', '8H', '9H',
  '10H', '11H', '12H', '13H', '14H', '15H',
])

// 이닝 사이 휴식 등 라이브성 상태
const LIVE_BREAK_STATUSES = new Set([
  'BT',    // Break Time (이닝 사이)
  'HT',    // Half Time (간혹 사용)
  'LIVE',  // 일반 LIVE 라벨
])

// 종료 상태(완전히 끝난 경기)
const FINISHED_STATUSES = new Set([
  'FT',    // Full Time
  'AET',   // After Extra Time
  'POST',  // Postponed (재경기 이전엔 종료처럼 취급)
  'CANC',  // Cancelled
  'ABD',   // Abandoned (조기 종료, 강수 콜드 등)
  'AWD',   // Awarded (기권승 등)
  'WO',    // Walkover
])

/**
 * 진행 중(LIVE)인 경기인지 판정.
 * 'INTR'은 일시 중단이므로 LIVE 아님.
 */
export function isLiveBaseballStatus(status?: string | null): boolean {
  if (!status) return false
  return (
    LIVE_INNING_STATUSES.has(status) ||
    HALF_INNING_STATUSES.has(status) ||
    LIVE_BREAK_STATUSES.has(status)
  )
}

/**
 * 완전히 종료된 경기인지 판정.
 */
export function isFinishedBaseballStatus(status?: string | null): boolean {
  if (!status) return false
  return FINISHED_STATUSES.has(status)
}

/**
 * 이닝 진행 중 status에서 이닝 번호만 추출 (예: 'IN9' → '9', '3H' → '3').
 * 라이브가 아니면 null.
 */
export function extractInningNumber(status?: string | null): string | null {
  if (!status) return null
  if (LIVE_INNING_STATUSES.has(status)) return status.replace('IN', '')
  if (HALF_INNING_STATUSES.has(status)) return status.replace('H', '')
  return null
}

/**
 * update-results cron 등에서 "다시 조회해야 할" status 목록.
 * - 미시작(NS), 라이브(LIVE/IN*/H*), 라이브성 휴식(BT/HT)
 * - 일시 중단(INTR): API가 재개를 알려줄 수도, 영구 중단을 알려줄 수도 있어서 계속 폴링 필요
 */
export const REQUERY_STATUSES: string[] = [
  'NS',
  'LIVE', 'BT', 'HT', 'INTR',
  ...Array.from(LIVE_INNING_STATUSES),
  ...Array.from(HALF_INNING_STATUSES),
]

/**
 * Supabase .or() 절에 쓸 수 있는 in (...) 리스트 문자열.
 * 예: status.in.(NS,LIVE,IN1,...)
 */
export const REQUERY_STATUSES_IN_CLAUSE = `status.in.(${REQUERY_STATUSES.join(',')})`

export const FINISHED_STATUSES_ARRAY = Array.from(FINISHED_STATUSES)
