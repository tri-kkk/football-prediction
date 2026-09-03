// =============================================================================
// lib/currentSeason.ts
//
// 리그의 '현재 시즌'을 API-Football 기준으로 해석한다.
//
// 배경 (실측 2026-09-03):
//   코드 곳곳에 리그별 시작월을 하드코딩한 getCurrentSeason() 이 4벌 복제돼 있었고,
//   J리그가 2026-27부터 추춘제로 전환하면서 전부 어긋났다.
//
//     J1(98)  season 2026 = 2026-02-06 ~ 2026-06-06  (전환기, 종료)
//     J1(98)  season 2027 = 2026-08-07 ~ 2027-06-06  (current)
//
//   그 결과 J1 은 `season=2026` 으로 조회돼 예정 경기 0건, 종료 경기 0건이 되었고
//   fg_match_history / match_results / fg_team_stats 에 2026-06-06 이후 데이터가
//   전혀 쌓이지 않았다.
//
//   더 고약한 건 라벨링이 리그마다 다르다는 점이다. J2(99)도 2026-08-08 시작이지만
//   API-Football 은 이를 season 2026 으로 부른다. 즉 규칙으로 추론할 수 없고
//   반드시 물어봐야 한다.
//
// 실패 시에는 호출자가 넘긴 fallback(기존 하드코딩 계산)으로 떨어지므로
// API 장애가 곧 기능 중단이 되지는 않는다.
// =============================================================================

const BASE_URL = 'https://v3.football.api-sports.io'
const TTL_MS = 6 * 60 * 60 * 1000

const cache = new Map<number, { at: number; season: number }>()

export async function resolveCurrentSeason(
  leagueId: number,
  fallback: number
): Promise<number> {
  const key = process.env.API_FOOTBALL_KEY
  if (!leagueId || !key) return fallback

  const hit = cache.get(leagueId)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.season

  try {
    const res = await fetch(`${BASE_URL}/leagues?id=${leagueId}`, {
      headers: { 'x-apisports-key': key },
      next: { revalidate: 21600 },
    })
    if (!res.ok) return fallback

    const json = await res.json()
    const seasons = json?.response?.[0]?.seasons
    const current = Array.isArray(seasons)
      ? seasons.find((s: any) => s?.current === true)
      : null

    const year = Number(current?.year)
    if (Number.isFinite(year) && year > 2000) {
      cache.set(leagueId, { at: Date.now(), season: year })
      return year
    }
  } catch {
    /* 폴백 */
  }
  return fallback
}

/** 테스트/운영용 — 캐시 강제 비우기 */
export function clearSeasonCache() {
  cache.clear()
}
