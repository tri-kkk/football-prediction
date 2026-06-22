// scripts/baseball-1run-calibration.mjs
//
// 야구 승1패 "1점차" 보정용 캘리브레이션.
// baseball_matches(FT)의 실제 스코어로:
//   1) 리그별 실제 1점차/2점차+승/2점차+패/무 비율
//   2) Skellam(포아송 마진) 모델의 예측 1점차율 vs 실제 1점차율 비교 (모델 검증)
//   3) 총득점 구간별 실제 1점차율 (저득점일수록 1점차↑ 가설 검증)
//
// 실행:
//   node --env-file=.env.local scripts/baseball-1run-calibration.mjs
//   node --env-file=.env.local scripts/baseball-1run-calibration.mjs --league KBO --season 2026

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
)

const args = process.argv.slice(2)
const getArg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const onlyLeague = getArg('--league', null)
const season = getArg('--season', null)

const LEAGUES = onlyLeague ? [onlyLeague] : ['KBO', 'MLB', 'NPB']

// ── Skellam helper (스크래퍼와 동일 로직) ──
const HOME_RUN_BONUS = 0.15
const clampLambda = x => Math.max(2.5, Math.min(7.5, x))
function poissonPmf(lambda, maxK = 22) {
  const arr = new Array(maxK + 1)
  let p = Math.exp(-lambda); arr[0] = p
  for (let k = 1; k <= maxK; k++) { p = (p * lambda) / k; arr[k] = p }
  return arr
}
function skellamOneRun(lh, la) {
  const H = poissonPmf(lh), A = poissonPmf(la)
  let w2 = 0, one = 0, l2 = 0
  for (let h = 0; h < H.length; h++) for (let a = 0; a < A.length; a++) {
    const pr = H[h] * A[a], d = h - a
    if (d >= 2) w2 += pr; else if (d <= -2) l2 += pr; else if (d === 0) {} else one += pr
  }
  const dec = w2 + one + l2
  return dec > 0 ? one / dec : 0.28
}

async function fetchAllFT(league) {
  const all = []
  let from = 0
  const PAGE = 1000
  while (true) {
    let q = supabase
      .from('baseball_matches')
      .select('home_team, away_team, home_score, away_score, match_date, season')
      .eq('league', league).eq('status', 'FT')
      .order('match_date', { ascending: true })
      .range(from, from + PAGE - 1)
    if (season) q = q.eq('season', season)
    const { data, error } = await q
    if (error) { console.error(league, error.message); break }
    if (!data?.length) break
    all.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

function pct(n, d) { return d ? (100 * n / d).toFixed(1) + '%' : '-' }

for (const league of LEAGUES) {
  const games = (await fetchAllFT(league)).filter(g =>
    g.home_score != null && g.away_score != null &&
    !isNaN(Number(g.home_score)) && !isNaN(Number(g.away_score)))

  if (!games.length) { console.log(`\n[${league}] FT 경기 없음`); continue }

  let w2 = 0, one = 0, l2 = 0, tie = 0, totalRuns = 0
  // 총득점 구간별 1점차
  const buckets = { '≤6': [0, 0], '7-8': [0, 0], '9-10': [0, 0], '11+': [0, 0] }
  // 팀별 롤링 평균 (Skellam 검증용) — 단순 시즌 평균 사용
  const teamScored = {}, teamConceded = {}, teamGames = {}
  for (const g of games) {
    const hs = Number(g.home_score), as = Number(g.away_score)
    for (const [t, sc, co] of [[g.home_team, hs, as], [g.away_team, as, hs]]) {
      teamScored[t] = (teamScored[t] || 0) + sc
      teamConceded[t] = (teamConceded[t] || 0) + co
      teamGames[t] = (teamGames[t] || 0) + 1
    }
  }
  const avgScored = t => teamGames[t] ? teamScored[t] / teamGames[t] : 4.5
  const avgConceded = t => teamGames[t] ? teamConceded[t] / teamGames[t] : 4.5

  let skellamSum = 0, skellamN = 0
  for (const g of games) {
    const hs = Number(g.home_score), as = Number(g.away_score)
    const d = hs - as, tot = hs + as
    totalRuns += tot
    if (d >= 2) w2++; else if (d <= -2) l2++; else if (d === 0) tie++; else one++
    const bk = tot <= 6 ? '≤6' : tot <= 8 ? '7-8' : tot <= 10 ? '9-10' : '11+'
    buckets[bk][1]++
    if (Math.abs(d) === 1) buckets[bk][0]++
    // Skellam 예측치 (시즌평균 기반 λ)
    const lh = clampLambda((avgScored(g.home_team) + avgConceded(g.away_team)) / 2 + HOME_RUN_BONUS)
    const la = clampLambda((avgScored(g.away_team) + avgConceded(g.home_team)) / 2)
    skellamSum += skellamOneRun(lh, la); skellamN++
  }

  const n = games.length
  const decided = w2 + one + l2
  console.log(`\n========== ${league} (${n}경기${season ? ', ' + season : ''}) ==========`)
  console.log(`평균 총득점       : ${(totalRuns / n).toFixed(2)}`)
  console.log(`2점차+ 홈승 (W)   : ${pct(w2, n)}`)
  console.log(`1점차      (1)    : ${pct(one, n)}   ← 핵심`)
  console.log(`2점차+ 홈패 (L)   : ${pct(l2, n)}`)
  console.log(`무승부      (D)   : ${pct(tie, n)}`)
  console.log(`1점차(무 제외 조건부): ${pct(one, decided)}   ← 스크래퍼 base율 후보`)
  console.log(`Skellam 예측 1점차 평균: ${(100 * skellamSum / skellamN).toFixed(1)}%   (실제와 가까울수록 좋음)`)
  console.log(`총득점 구간별 실제 1점차율:`)
  for (const [k, [a, b]] of Object.entries(buckets)) console.log(`   ${k.padEnd(5)} : ${pct(a, b)}  (${b}경기)`)
}

console.log('\n완료. 위 "1점차(무 제외 조건부)"를 ONE_RUN_BASE 폴백값으로,')
console.log('"Skellam 예측 평균"이 실제 1점차율과 차이 크면 HOME_RUN_BONUS/λ 보정 검토.')
process.exit(0)
