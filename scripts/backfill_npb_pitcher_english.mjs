// scripts/backfill_npb_pitcher_english.mjs
//
// NPB 매치의 home_pitcher / away_pitcher(영문) 컬럼 백필.
// - 대상: baseball_matches WHERE league='NPB' AND (home_pitcher IS NULL AND home_pitcher_ko IS NOT NULL)
//   또는 away_pitcher 쪽 동일 조건
// - 방식: 한국어 표기 → Claude Haiku로 일본 이름(헵번 로마자) 변환 → DB UPDATE
// - 배치: 한 번 호출에 30명까지 묶음 (토큰 비용·시간 최적화)
//
// 사용 (Node 20.6+ 내장 --env-file 옵션 사용):
//   node --env-file=.env.local scripts/backfill_npb_pitcher_english.mjs --dry-run --limit 10
//   node --env-file=.env.local scripts/backfill_npb_pitcher_english.mjs
//   node --env-file=.env.local scripts/backfill_npb_pitcher_english.mjs --limit 100
//
// 환경변수 (.env.local 또는 셸 환경):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(1)
}
if (!ANTHROPIC_KEY) {
  console.error('❌ ANTHROPIC_API_KEY required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null

console.log(`🚀 NPB 투수 영문 백필 시작 ${DRY_RUN ? '(DRY RUN)' : ''}${LIMIT ? ` [limit=${LIMIT}]` : ''}`)

// 1) 대상 매치 가져오기 — NPB 전체에서 한쪽 ko가 있는 행만 (페이지네이션)
const ALL_ROWS = []
const PAGE = 1000
let offset = 0
while (true) {
  const { data, error: fetchErr } = await supabase
    .from('baseball_matches')
    .select('id, api_match_id, match_date, home_team, away_team, home_pitcher, home_pitcher_ko, away_pitcher, away_pitcher_ko')
    .eq('league', 'NPB')
    .order('match_date', { ascending: false })
    .range(offset, offset + PAGE - 1)
  if (fetchErr) {
    console.error('❌ fetch failed:', fetchErr.message)
    process.exit(1)
  }
  if (!data || data.length === 0) break
  ALL_ROWS.push(...data)
  if (data.length < PAGE) break
  offset += PAGE
}

// 진단용 통계
const stats = {
  home_pitcher_null: 0,
  home_pitcher_empty: 0,
  home_pitcher_filled: 0,
  home_pitcher_ko_filled: 0,
  away_pitcher_null: 0,
  away_pitcher_empty: 0,
  away_pitcher_filled: 0,
  away_pitcher_ko_filled: 0,
}
for (const r of ALL_ROWS) {
  if (r.home_pitcher === null) stats.home_pitcher_null++
  else if (r.home_pitcher === '') stats.home_pitcher_empty++
  else stats.home_pitcher_filled++
  if (r.home_pitcher_ko) stats.home_pitcher_ko_filled++
  if (r.away_pitcher === null) stats.away_pitcher_null++
  else if (r.away_pitcher === '') stats.away_pitcher_empty++
  else stats.away_pitcher_filled++
  if (r.away_pitcher_ko) stats.away_pitcher_ko_filled++
}
console.log('🔍 컬럼 상태:', stats)

// 샘플 5건
console.log('🔍 샘플 (처음 5건):')
for (const r of ALL_ROWS.slice(0, 5)) {
  console.log('   ', JSON.stringify({
    id: r.id,
    home_pitcher: r.home_pitcher,
    home_pitcher_ko: r.home_pitcher_ko,
    away_pitcher: r.away_pitcher,
    away_pitcher_ko: r.away_pitcher_ko,
  }))
}

// JS-side filter (PostgREST OR-with-AND 신뢰성 이슈 회피)
let rows = ALL_ROWS.filter(r =>
  ((!r.home_pitcher || r.home_pitcher === '') && r.home_pitcher_ko) ||
  ((!r.away_pitcher || r.away_pitcher === '') && r.away_pitcher_ko)
)
if (LIMIT) rows = rows.slice(0, LIMIT)
console.log(`📋 전체 NPB ${ALL_ROWS.length}건 → 변환 대상 ${rows.length}건${LIMIT ? ` (limit=${LIMIT})` : ''}`)

// 2) unique 한글 투수명 추출 (중복 제거)
const koreanNames = new Set()
for (const r of rows) {
  if (!r.home_pitcher && r.home_pitcher_ko) koreanNames.add(r.home_pitcher_ko.trim())
  if (!r.away_pitcher && r.away_pitcher_ko) koreanNames.add(r.away_pitcher_ko.trim())
}
const uniqueList = Array.from(koreanNames).filter(Boolean)
console.log(`👥 unique 한글 투수명: ${uniqueList.length}명`)

if (uniqueList.length === 0) {
  console.log('✅ 변환할 이름 없음 — 종료')
  process.exit(0)
}

// 3) Claude Haiku로 배치 변환 (30명씩)
const BATCH = 30
const map = {} // korean → english

for (let i = 0; i < uniqueList.length; i += BATCH) {
  const chunk = uniqueList.slice(i, i + BATCH)
  console.log(`\n🤖 Claude 변환 ${i + 1} ~ ${i + chunk.length} / ${uniqueList.length}`)

  const prompt = `다음은 NPB(일본 프로야구) 투수의 한국어 표기 이름 목록입니다. 각 이름을 영문(헵번 로마자, 영어권 NPB 보도 기준 표기)으로 변환해 주세요.

규칙:
- 일본 이름 순서는 "FirstName LastName" (영어식). 예: "야마모토 요시노부" → "Yoshinobu Yamamoto"
- 외국인 선수는 본인 영문 등록명 그대로. 예: "쿠리 아렌" → "Aren Kuri" (성·이름 영어권 순서)
- 정확한 영문 등록명을 모르겠으면 한국어 발음을 최대한 헵번 로마자로 변환
- 공백 1개로 first/last 구분
- JSON만 출력, 다른 텍스트/마크다운 금지

입력: ${JSON.stringify(chunk)}

출력 형식: {"이름1": "English Name 1", "이름2": "English Name 2", ...}`

  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = res.content[0]?.type === 'text' ? res.content[0].text : ''
    // JSON 추출 (markdown 코드블록이 섞여올 수도 있어서)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn(`⚠️ Claude 응답에서 JSON을 찾지 못함:\n${text.slice(0, 200)}`)
      continue
    }
    const parsed = JSON.parse(jsonMatch[0])
    let count = 0
    for (const [ko, en] of Object.entries(parsed)) {
      if (typeof en === 'string' && en.trim()) {
        map[ko] = en.trim()
        count++
      }
    }
    console.log(`  ✅ ${count}/${chunk.length} 변환`)
  } catch (e) {
    console.error(`  ❌ batch 실패:`, e.message)
  }
}

console.log(`\n🗺️  변환 완료: ${Object.keys(map).length}/${uniqueList.length}`)

// 샘플 출력
const sample = Object.entries(map).slice(0, 10)
console.log('📝 샘플:')
for (const [ko, en] of sample) console.log(`   ${ko}  →  ${en}`)

if (DRY_RUN) {
  console.log('\n💡 DRY RUN — DB 미적용. 실제 적용은 --dry-run 빼고 다시 실행.')
  process.exit(0)
}

// 4) DB update
let updated = 0
let skipped = 0
let failed = 0

for (const r of rows) {
  const update = {}
  if (!r.home_pitcher && r.home_pitcher_ko && map[r.home_pitcher_ko.trim()]) {
    update.home_pitcher = map[r.home_pitcher_ko.trim()]
  }
  if (!r.away_pitcher && r.away_pitcher_ko && map[r.away_pitcher_ko.trim()]) {
    update.away_pitcher = map[r.away_pitcher_ko.trim()]
  }
  if (Object.keys(update).length === 0) {
    skipped++
    continue
  }
  const { error } = await supabase.from('baseball_matches').update(update).eq('id', r.id)
  if (error) {
    failed++
    console.error(`❌ id=${r.id} update 실패: ${error.message}`)
  } else {
    updated++
  }
}

console.log(`\n✅ 완료 — updated=${updated}, skipped=${skipped}, failed=${failed}`)
process.exit(0)
