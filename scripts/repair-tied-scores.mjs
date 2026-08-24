#!/usr/bin/env node
// scripts/repair-tied-scores.mjs
//
// 동점으로 굳어버린 과거 경기 스코어를 api-sports 에서 다시 받아 고친다.
//
// 왜 별도 스크립트인가:
//   update-results 크론은 조회 창이 최근 4일이다. 그걸 넓히면 매 실행마다
//   수백 경기를 훑게 되고 Vercel 함수 타임아웃에 걸린다.
//   과거 복구는 한 번만 하면 되는 일이라 로컬에서 따로 돌리는 편이 맞다.
//
// 두 단계로 돈다:
//   1단계 스코어 복구  — 동점으로 굳은 경기를 api-sports 에 다시 물어본다
//   2단계 재정산       — 고쳐진 스코어로 조합 픽의 적중 여부를 다시 계산한다
//
// ⚠ 2단계가 왜 필요한가
//   /api/baseball/cron/update-combo-results 는 result='pending' 인 조합만 본다.
//   과거 기록은 이미 win/lose/partial 로 확정돼 있어서 그 크론으로는
//   아무리 호출해도 다시 계산되지 않는다. 그래서 여기서 직접 한다.
//
// 사용법 (프로젝트 루트에서):
//   node scripts/repair-tied-scores.mjs --dry                     # 확인만
//   node scripts/repair-tied-scores.mjs --from=2026-03-25         # 1+2단계 실행
//   node scripts/repair-tied-scores.mjs --league=MLB --from=2026-03-25
//   node scripts/repair-tied-scores.mjs --resettle-only           # 2단계만
//
// ⚠ --from 을 쓰는 이유
//   MLB 시범경기(2~3월)는 api-sports 가 스코어를 아예 안 채워서
//   0:0 인 채로 FT 가 된 게 많다. 다시 물어봐도 0:0 이 돌아온다.
//   정규시즌 개막일 이후만 고치는 게 시간도 아끼고 결과도 깨끗하다.
//

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT = process.cwd()

// .env.local 을 직접 읽는다 (next 런타임 밖이라 자동 로드가 안 된다)
function loadEnv() {
  const p = path.join(ROOT, '.env.local')
  if (!fs.existsSync(p)) {
    console.error('✖ .env.local 이 없습니다. 프로젝트 루트에서 실행하세요.')
    process.exit(1)
  }
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const arg = (n, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${n}=`))
  return h ? h.split('=').slice(1).join('=') : d
}
const DRY = process.argv.includes('--dry')
const RESETTLE_ONLY = process.argv.includes('--resettle-only')
const FROM = arg('from', '')
const LEAGUE = arg('league', '')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_KEY = process.env.API_FOOTBALL_KEY
const API_HOST = 'v1.baseball.api-sports.io'

if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
  console.error('✖ .env.local 에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / API_FOOTBALL_KEY 가 필요합니다')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * 2단계 — 조합 픽 재정산.
 *
 * baseball_matches 의 현재 스코어를 진실로 보고 적중 여부를 다시 계산한다.
 * API 를 부르지 않으므로 빠르고, 몇 번을 돌려도 결과가 같다.
 *
 * 동점은 어느 쪽 픽도 적중이 아니다 (isTie 로 표시해 적중률 분모에서 뺄 수 있게 한다).
 */
async function resettle() {
  console.log('\n─────────────────────────────────────')
  console.log('2단계 — 조합 픽 재정산')

  let q = supabase
    .from('baseball_combo_picks')
    .select('id, league, pick_date, picks, result, correct_count')
    .neq('result', 'pending')
    .order('pick_date', { ascending: false })
  if (LEAGUE) q = q.eq('league', LEAGUE.toUpperCase())
  if (FROM) q = q.gte('pick_date', FROM)

  const { data: combos, error } = await q.limit(5000)
  if (error) {
    console.error('✖ 조합 조회 실패:', error.message)
    return
  }
  if (!combos?.length) {
    console.log('  재정산할 조합이 없습니다')
    return
  }

  // 관련 경기 스코어를 한 번에 받아 둔다
  const ids = [...new Set(combos.flatMap((c) => (c.picks || []).map((p) => p.matchId)).filter((v) => v != null))]
  const scoreById = new Map()
  for (let i = 0; i < ids.length; i += 500) {
    const { data: ms } = await supabase
      .from('baseball_matches')
      .select('api_match_id, home_score, away_score, status')
      .in('api_match_id', ids.slice(i, i + 500))
    for (const m of ms || []) scoreById.set(m.api_match_id, m)
  }

  console.log(`  조합 ${combos.length}개 · 경기 ${scoreById.size}/${ids.length}개 조회됨`)

  let changed = 0
  let flipped = 0

  for (const c of combos) {
    const picks = c.picks || []
    let dirty = false
    let correctCount = 0

    const next = picks.map((p) => {
      const m = scoreById.get(p.matchId)
      if (!m || m.status !== 'FT' || m.home_score == null || m.away_score == null) {
        if (p.isCorrect === true) correctCount++
        return p
      }
      const hs = m.home_score
      const as = m.away_score
      const isTie = hs === as
      const ok = (p.pick === 'home' && hs > as) || (p.pick === 'away' && as > hs)
      if (ok) correctCount++

      if (p.homeScore !== hs || p.awayScore !== as || p.isCorrect !== ok || p.isTie !== isTie) {
        dirty = true
        if (p.isCorrect !== ok) flipped++
      }
      return { ...p, homeScore: hs, awayScore: as, isCorrect: ok, isTie, matchStatus: 'FT' }
    })

    const result =
      correctCount === picks.length ? 'win' : correctCount === 0 ? 'lose' : 'partial'

    if (!dirty && result === c.result && correctCount === c.correct_count) continue

    changed++
    if (!DRY) {
      await supabase
        .from('baseball_combo_picks')
        .update({ picks: next, correct_count: correctCount, result, updated_at: new Date().toISOString() })
        .eq('id', c.id)
    }
  }

  console.log(`  조합 ${changed}개 갱신 · 개별 픽 판정 ${flipped}건 변경${DRY ? ' (dry — 반영 안 함)' : ''}`)
}

async function main() {
  if (RESETTLE_ONLY) {
    await resettle()
    return
  }

  let q = supabase
    .from('baseball_matches')
    .select('api_match_id, league, match_date, home_team, away_team, home_score, away_score, status, inning')
    .eq('status', 'FT')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)
    .order('match_date', { ascending: false })

  if (LEAGUE) q = q.eq('league', LEAGUE.toUpperCase())
  if (FROM) q = q.gte('match_date', FROM)

  const { data, error } = await q.limit(2000)
  if (error) {
    console.error('✖ DB 조회 실패:', error.message)
    process.exit(1)
  }

  // PostgREST 로는 컬럼끼리 비교를 못 하므로 여기서 동점만 남긴다
  const tied = (data || []).filter((m) => m.home_score === m.away_score)

  console.log(`\n동점으로 FT 처리된 경기: ${tied.length}개`)
  if (FROM) console.log(`  (${FROM} 이후만)`)
  if (LEAGUE) console.log(`  (${LEAGUE} 만)`)
  if (DRY) console.log('  ※ --dry — 실제로 고치지 않습니다')
  if (!tied.length) return

  let fixed = 0
  let same = 0
  let noData = 0
  let failed = 0
  const changes = []

  for (let i = 0; i < tied.length; i++) {
    const m = tied[i]
    process.stdout.write(`\r  진행 ${i + 1}/${tied.length}   `)

    try {
      const r = await fetch(`https://${API_HOST}/games?id=${m.api_match_id}`, {
        headers: { 'x-apisports-key': API_KEY },
      })
      if (!r.ok) {
        failed++
        await sleep(120)
        continue
      }
      const j = await r.json()
      const game = j?.response?.[0]
      if (!game) {
        noData++
        await sleep(120)
        continue
      }

      const hs = game.scores?.home?.total ?? null
      const as = game.scores?.away?.total ?? null

      if (hs == null || as == null) {
        noData++
        await sleep(120)
        continue
      }

      // 값이 그대로면 건드리지 않는다 (진짜 무승부이거나 API 에도 없는 경기)
      if (hs === m.home_score && as === m.away_score) {
        same++
        await sleep(120)
        continue
      }

      changes.push(
        `  ${m.match_date} ${m.league}  ${m.home_team} ${m.home_score}:${m.away_score} ${m.away_team}` +
          `  →  ${hs}:${as}`
      )

      if (!DRY) {
        // 이닝 데이터도 같이 갱신 (연장 이닝 포함)
        let inningData = null
        if (game.scores?.home?.innings && game.scores?.away?.innings) {
          inningData = { home: {}, away: {} }
          for (const [k, v] of Object.entries(game.scores.home.innings)) inningData.home[k] = v
          for (const [k, v] of Object.entries(game.scores.away.innings)) inningData.away[k] = v
        }

        const { error: uerr } = await supabase
          .from('baseball_matches')
          .update({
            home_score: hs,
            away_score: as,
            ...(inningData ? { inning: inningData } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('api_match_id', m.api_match_id)

        if (uerr) {
          failed++
          await sleep(120)
          continue
        }
      }
      fixed++
      await sleep(120)
    } catch {
      failed++
      await sleep(120)
    }
  }

  console.log('\n')
  if (changes.length) {
    console.log('바뀐 경기:')
    for (const c of changes) console.log(c)
    console.log('')
  }

  console.log(`1단계 결과 — 고침 ${fixed}개 · 그대로 ${same}개 · API에 없음 ${noData}개 · 실패 ${failed}개`)
  console.log('')
  console.log('"그대로" 는 진짜 무승부이거나 api-sports 에도 결과가 없는 경기입니다.')
  console.log('MLB 는 무승부가 없으니, MLB 에서 "그대로" 로 남은 건 api-sports 쪽 데이터 공백입니다.')

  // 스코어를 고쳤으면 적중 판정도 다시 해야 한다.
  // 안 고쳤어도 동점 버그로 잘못 기록된 isCorrect 가 남아 있으므로 항상 돌린다.
  await resettle()

  if (DRY) {
    console.log('')
    console.log('--dry 를 빼고 다시 돌리면 실제로 반영됩니다.')
  } else {
    console.log('')
    console.log('완료. 적중률을 다시 보려면 sql/accuracy-impact.sql 을 돌리세요.')
    console.log('(수정 후 컬럼과 현재 컬럼이 이제 같아야 정상입니다)')
  }
}

main().catch((e) => {
  console.error('\n실패:', e.message)
  process.exit(1)
})
