// scripts/backfill_kn_pitchers.mjs
// KBO/NPB 시즌 초반(선발명 누락) 경기 투수 백필
// 배포된 sync 엔드포인트를 과거 날짜로 순차 호출 → 선발투수명 + 가능한 ERA 채움.
// 로컬 실행(시간제한 없음):  node scripts/backfill_kn_pitchers.mjs
//
// 주의: CRON_SECRET 은 아래 상수 또는 환경변수 CRON_SECRET 로 주입.

const SECRET = process.env.CRON_SECRET || 'random_secret_string'
const BASE = 'https://www.trendsoccer.com/api/baseball/cron'

// 선발명이 비어있던 날짜 (2026 시즌 초반)
const KBO_DATES = [
  '2026-03-12','2026-03-13','2026-03-14','2026-03-15','2026-03-16','2026-03-17',
  '2026-03-20','2026-03-21','2026-03-22','2026-03-23','2026-03-24','2026-03-28',
  '2026-03-29','2026-04-04','2026-04-05',
]
const NPB_DATES = [
  '2026-03-01','2026-03-03','2026-03-04','2026-03-05','2026-03-06','2026-03-07',
  '2026-03-08','2026-03-10','2026-03-11','2026-03-12','2026-03-13','2026-03-14',
  '2026-03-15','2026-03-17','2026-03-18','2026-03-20','2026-03-21','2026-03-22',
  '2026-03-27','2026-03-28','2026-03-29','2026-03-31','2026-04-01','2026-04-02',
  '2026-04-03','2026-04-04','2026-04-05','2026-04-07','2026-04-08',
]

async function call(endpoint, date) {
  const url = `${BASE}/${endpoint}?date=${date}`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${SECRET}` },
      redirect: 'follow',
    })
    const txt = await res.text()
    let updated = '?'
    try {
      const j = JSON.parse(txt)
      updated = j?.pitchers?.updated ?? j?.updated ?? 0
    } catch {
      updated = `(non-JSON ${res.status})`
    }
    console.log(`  ${date}: updated ${updated}`)
    return typeof updated === 'number' ? updated : 0
  } catch (e) {
    console.log(`  ${date}: ERROR ${String(e).slice(0, 60)}`)
    return 0
  }
}

async function run(name, endpoint, dates) {
  console.log(`\n=== ${name} (${dates.length}일) ===`)
  let total = 0
  for (const d of dates) {
    total += await call(endpoint, d)
    await new Promise(r => setTimeout(r, 800)) // 서버 부하 방지
  }
  console.log(`${name} 총 updated: ${total}`)
}

;(async () => {
  console.log('KBO/NPB 투수 백필 시작 (각 날짜 스크래핑이라 수십 분 걸릴 수 있음)')
  await run('KBO', 'sync-kbo-pitchers', KBO_DATES)
  await run('NPB', 'sync-npb-pitchers', NPB_DATES)
  console.log('\n완료. 이후 ERA가 비는 게 있으면 이름매칭 보정으로 마저 채울 수 있음.')
})()
