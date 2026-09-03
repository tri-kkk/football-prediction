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
 * - 미시작(NS), 라이브(LIVE / IN1~IN15 / 1H~15H), 라이브성 휴식(BT, HT)
 * - 일시 중단(INTR): API가 재개를 알려줄 수도, 영구 중단을 알려줄 수도 있어서 계속 폴링 필요
 */
export const REQUERY_STATUSES: string[] = [
  'NS', 'SCHEDULED', 'TBD',
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

// =====================================================================
// 화면 표시용 상태 보정 — 제공사 피드가 멈춘 경기를 걸러낸다 (2026-09-03 추가)
// =====================================================================
//
// ⚠️ 배경
// MLB 180103 (LAD vs STL, 09-03 02:10 UTC 시작)이 시작 4.5시간 뒤에도
// 화면에 "● LIVE IN9 5:5"로 남아 있었다. 원인은 우리 크론이 아니라 제공사다.
//   GET v1.baseball.api-sports.io/games?id=180103
//   → status {"long":"Inning 9","short":"IN9"}, 양팀 1~9회 모두 기록, extra: null, 5:5
// 크론은 매 회차 정상 기록(updated_at 06:40:02)했지만 원본이 IN9에 멈춰 있었다.
//
// 기존 보정(matches/route.ts 로컬 함수)은 "6시간 지나면 FT"뿐이라
//  (a) 4~6시간 구간이 뚫려 있었고
//  (b) MLB 무승부(5:5)를 최종 결과처럼 보여주는 더 나쁜 문제가 있었다.
// → 경과 시간 + 정규이닝 완주 + 리그별 무승부 가능 여부를 같이 본다.

/** 화면에서 "결과 확인중"으로 표시할 의사 상태. 제공사 데이터가 멈춘 경기. */
export const STALE_STATUS = 'STALE'

/** 더 이상 바뀌지 않는 확정 상태 */
const SETTLED_FOR_DISPLAY = new Set([...FINISHED_STATUSES, 'PST', 'SUSP', 'POSTPONED'])
const SCHEDULED_FOR_DISPLAY = new Set(['NS', 'SCHEDULED', 'TBD'])

/** 무승부가 없는 리그 — 동점 상태로는 끝날 수 없다 */
const NO_TIE_LEAGUES = new Set(['MLB'])

/** 이닝 스코어가 하나라도 있는지 */
export function hasInningData(innings: any): boolean {
  if (!innings || typeof innings !== 'object') return false
  for (const side of ['home', 'away'] as const) {
    const o = innings[side]
    if (o && typeof o === 'object') {
      for (const k of Object.keys(o)) {
        if (o[k] !== null && o[k] !== undefined) return true
      }
    }
  }
  return false
}

/** 정규이닝(기본 9회)까지 양팀 모두 기록이 찼는지 */
function regulationComplete(innings: any, regulation = 9): boolean {
  if (!innings || typeof innings !== 'object') return false
  for (const side of ['home', 'away'] as const) {
    const o = innings[side]
    if (!o || typeof o !== 'object') return false
    for (let i = 1; i <= regulation; i++) {
      if (o[String(i)] === null || o[String(i)] === undefined) {
        // 홈팀이 앞서면 9회말을 치지 않으므로 홈의 마지막 회 누락은 허용
        if (side === 'home' && i === regulation) continue
        return false
      }
    }
  }
  return true
}

export type CorrectStatusArgs = {
  status?: string | null
  timestamp?: any
  innings?: any
  league?: string | null
  homeScore?: number | null
  awayScore?: number | null
}

/**
 * 제공사 상태를 화면용 상태로 보정한다.
 * 반환값은 원본 상태 / 'FT' / 'LIVE' / STALE_STATUS 중 하나.
 */
export function correctBaseballStatus(args: CorrectStatusArgs): string {
  const status = args.status || 'NS'
  const t = args.timestamp ? new Date(args.timestamp).getTime() : 0
  const elapsedH = t ? (Date.now() - t) / 3_600_000 : 0

  // 확정 상태는 손대지 않는다
  if (SETTLED_FOR_DISPLAY.has(status)) return status

  const isScheduled = SCHEDULED_FOR_DISPLAY.has(status)
  const noTie = NO_TIE_LEAGUES.has(String(args.league || ''))
  const hs = args.homeScore
  const as = args.awayScore
  const tied = typeof hs === 'number' && typeof as === 'number' && hs === as

  // 동점인데 무승부가 없는 리그면 그 점수는 최종이 될 수 없다 → FT로 못 바꾼다
  const settleAs = () => (tied && noTie ? STALE_STATUS : 'FT')

  if (!isScheduled) {
    // 라이브(IN9 등)로 표시 중
    //  - 4h+ 이고 정규이닝 완주 → 사실상 끝난 경기
    //  - 단, status가 IN10 이상이면 실제로 연장 진행 중일 수 있으므로 6h까지 기다린다
    //    (긴 연장 경기를 조기에 '종료'로 확정해버리는 것을 방지)
    const inning = Number(extractInningNumber(status) ?? 0)
    const inExtras = inning >= 10
    if (!inExtras && elapsedH >= 4 && regulationComplete(args.innings)) return settleAs()
    if (elapsedH >= 6) return settleAs()
    return status
  }

  // 예정(NS)인데 이닝 기록이 들어온 경우 = 시작은 했는데 상태가 안 넘어옴
  if (hasInningData(args.innings)) {
    return elapsedH >= 4 ? settleAs() : 'LIVE'
  }
  return elapsedH >= 6 ? STALE_STATUS : status
}
