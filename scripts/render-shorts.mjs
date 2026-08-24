#!/usr/bin/env node
// scripts/render-shorts.mjs
//
// 승부예측 숏폼 자동 렌더링.
// shorts-data API 에서 경기를 가져와 경기별로 1080x1920 mp4 를 뽑는다.
// 화면 녹화가 없으므로 사람이 붙어 있을 필요가 없고, cron 에 그대로 걸 수 있다.
//
// 사용법:
//   # 포맷 A — 데일리 픽 리포트 (매일)
//   node scripts/render-shorts.mjs --format=daily --sport=football --group=euro
//   node scripts/render-shorts.mjs --format=daily --sport=football --group=kleague
//   node scripts/render-shorts.mjs --format=daily --sport=baseball --league=KBO
//
//   # 포맷 E — 주말 TOP 5 (금요일)
//   node scripts/render-shorts.mjs --format=top5 --group=euro
//
//   # 포맷 B — 어제 성적표 (매일)
//   node scripts/render-shorts.mjs --format=result --sport=football --group=euro
//   node scripts/render-shorts.mjs --format=result --sport=baseball --league=KBO
//
//   # 포맷 D — 빅매치 딥다이브
//   node scripts/render-shorts.mjs --format=match --league=KBO --limit=3
//
// 환경변수:
//   SHORTS_BASE_URL   데이터를 가져올 origin (기본 http://localhost:3000)

import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeUpload } from './upload-text.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : fallback
}

const FORMAT = arg('format', 'match')       // daily | result | top5 | match
const SPORT = arg('sport', 'football')      // daily 전용: football | baseball
const GROUP = arg('group', 'euro')          // daily + football 전용: euro | kleague | jleague
const COUNT = Number(arg('count', '3'))     // daily 전용: 픽 개수
const LEAGUE = arg('league', 'KBO')
const LIMIT = Number(arg('limit', '1'))
// 포맷별 기본 배경음 (public/sounds/).
//
// 전부 유튜브 스튜디오 오디오 보관함에서 받은 음원이다.
// 유튜브가 직접 제공하는 것이라 Content ID 소유권 주장이 걸리지 않는다.
// (2026-08 에 무료 사이트 음원 하나가 주장을 먹고 전량 교체했다)
//
// 성적표에 승리 팡파레 계열을 쓰지 않는 건 의도적이다.
// 이 포맷은 성적이 나쁜 날에도 올린다. 5경기 중 1개 맞힌 날에
// 승리 음악이 깔리면 우스워지므로, 결과 어느 쪽으로도 안 기우는 톤을 쓴다.
const DEFAULT_BGM = {
  daily: 'soundlings-sigma-slide.mp3',   // 밝고 일정한 그루브
  result: 'density-standoff.mp3',        // 긴장감 있되 승패 중립
  top5: 'neffex-catch-me-if-i-fall.mp3', // 카운트다운용 하이프
  match: 'soundlings-sigma-slide.mp3',
}

// 예비 음원 — 위 곡이 물리면 --bgm= 으로 바꿔 끼운다
//   soundlings-delulu-dancer.mp3   / soundlings-best-besties.mp3   (밝은 계열)
//   rodkim-duty-calls.mp3          / soundlings-keys-to-unravel.mp3 (성적표 계열)

// Content ID 소유권 주장이 실제로 걸린 음원.
// 다시 쓰면 그 영상 광고 수익이 주장한 쪽으로 넘어가므로 자동으로 차단한다.
// (경고가 아니라 수익 문제라 조용히 넘어가면 나중에 한꺼번에 손해다)
const CLAIMED_BGM = new Set([
  'rockot-cinematic.mp3', // 2026-08 "Experimental Cinematic Hip-..." / Rockot 주장 확인
])

// 위와 같은 출처로 보이는 음원들 (파일명이 아티스트명 형식).
// 아직 주장이 안 걸렸을 뿐 안전이 확인된 건 아니다.
const UNVERIFIED_BGM = new Set([
  'bombin-chill.mp3',
  'kontraa-uk-drill.mp3',
  'leberch-hiphop.mp3',
  'delo-energetic.mp3',
  'sport-energetic.mp3',
  'sports-rock.mp3',
])

// --bgm=none 이면 무음
const bgmArg = arg('bgm', '')
const BGM_REQUESTED = bgmArg === 'none' ? '' : (bgmArg || DEFAULT_BGM[FORMAT] || '')
const OUT_DIR = path.resolve(ROOT, arg('out', './out'))
const SHOW_LOGOS = arg('logos', 'false') === 'true'
const BASE_URL = process.env.SHORTS_BASE_URL || 'http://localhost:3000'
const BROWSER = process.env.REMOTION_BROWSER || null

// 씬별 배경 영상 (public/videos/). 파일이 없으면 자동으로 그라디언트 폴백.
//
// 씬은 9개지만 배경 파일은 4개만 만들면 된다.
// 성격이 비슷한 씬끼리 같은 소재를 돌려 쓰는 게 톤도 일관되고 크레딧도 아낀다.
//
//   bg-stadium.mp4  경기장 분위기   → opener / hook / matchup
//   bg-data.mp4     데이터·전술 톤  → pick / summary / pitcher / analysis
//   bg-impact.mp4   임팩트·공개     → reveal
//   bg-cta.mp4      마무리          → cta
const BACKGROUNDS_DAILY = {
  opener: 'bg-stadium.mp4',
  pick: 'bg-data.mp4',
  summary: 'bg-data.mp4',
  cta: 'bg-cta.mp4',
}

const BACKGROUNDS_MATCH = {
  hook: 'bg-stadium.mp4',
  matchup: 'bg-stadium.mp4',
  pitcher: 'bg-data.mp4',
  analysis: 'bg-data.mp4',
  reveal: 'bg-impact.mp4',
  cta: 'bg-cta.mp4',
}

const BACKGROUNDS_RESULT = {
  hook: 'bg-stadium.mp4',
  results: 'bg-data.mp4',
  score: 'bg-impact.mp4',
  cta: 'bg-cta.mp4',
}

const BACKGROUNDS =
  FORMAT === 'daily' || FORMAT === 'top5' ? BACKGROUNDS_DAILY
  : FORMAT === 'result' ? BACKGROUNDS_RESULT
  : BACKGROUNDS_MATCH

/**
 * 배경음 확정.
 *
 * 세 가지를 막는다.
 *   1. Content ID 주장이 걸린 음원 → 무음으로 대체하고 크게 알린다
 *   2. 출처가 같아 위험한 음원 → 쓰긴 하되 경고를 남긴다
 *   3. 파일이 아예 없는 경우 → 무음 (렌더는 계속돼야 한다)
 */
async function resolveBgm(file) {
  if (!file) return ''

  if (CLAIMED_BGM.has(file)) {
    console.log(`  ⛔ ${file} 은 Content ID 주장이 걸린 음원입니다 — 무음으로 렌더합니다`)
    console.log(`     유튜브 스튜디오 → 오디오 보관함에서 받은 음원으로 교체하세요`)
    console.log(`     (--bgm=파일명 으로 직접 지정할 수 있습니다)`)
    return ''
  }

  try {
    await fs.access(path.join(ROOT, 'public', 'sounds', file))
  } catch {
    console.log(`  ⚠ public/sounds/${file} 이 없습니다 — 무음으로 렌더합니다`)
    return ''
  }

  if (UNVERIFIED_BGM.has(file)) {
    console.log(`  ⚠ ${file} 은 저작권 확인이 안 된 음원입니다 (같은 출처에서 이미 주장 발생)`)
  }
  return file
}

/** public/videos 에 실제로 존재하는 것만 남긴다 */
async function resolveBackgrounds() {
  const out = {}
  for (const [k, file] of Object.entries(BACKGROUNDS)) {
    try {
      await fs.access(path.join(ROOT, 'public', 'videos', file))
      out[k] = file
    } catch {
      out[k] = null
    }
  }
  return out
}

async function fetchGames() {
  const url = `${BASE_URL}/api/admin/shorts-data?league=${encodeURIComponent(LEAGUE)}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`shorts-data ${r.status} — ${url}`)
  const j = await r.json()
  const games = Array.isArray(j?.games) ? j.games : []
  if (!games.length) throw new Error(`${LEAGUE} 예정 경기가 없습니다`)
  return games
}

async function fetchDaily(range = 'today', count = COUNT) {
  const qs =
    SPORT === 'baseball'
      ? `sport=baseball&league=${encodeURIComponent(LEAGUE)}&count=${count}`
      : `sport=football&group=${encodeURIComponent(GROUP)}&count=${count}&range=${range}`
  const url = `${BASE_URL}/api/admin/shorts-daily?${qs}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`shorts-daily ${r.status} — ${url}`)
  const j = await r.json()
  if (!j.success) throw new Error(j.error || 'shorts-daily 실패')
  if (!Array.isArray(j.picks) || j.picks.length === 0) {
    throw new Error('오늘 조건을 통과한 픽이 없습니다 (영상 생성 스킵)')
  }
  return j
}

/**
 * 팀 로고를 미리 받아 data URI 로 바꿔 넣는다.
 *
 * 렌더 중에 외부 URL 을 그대로 물리면 Remotion 이 프레임마다 이미지를 기다리고,
 * URL 이 죽어 있으면 매 프레임 네트워크 타임아웃을 먹어 렌더가 10배 이상 느려진다.
 * 폰트를 인라인한 것과 같은 이유다. 실패한 로고는 빈 문자열로 두면
 * 컴포넌트가 팀명 이니셜 크레스트로 폴백한다.
 */
async function inlineLogos(picks) {
  const cache = new Map()

  const toDataUri = async (url) => {
    if (!url) return ''
    if (cache.has(url)) return cache.get(url)
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!r.ok) throw new Error(String(r.status))
      const buf = Buffer.from(await r.arrayBuffer())
      const mime = r.headers.get('content-type') || 'image/png'
      const uri = `data:${mime};base64,${buf.toString('base64')}`
      cache.set(url, uri)
      return uri
    } catch {
      cache.set(url, '')
      return ''
    }
  }

  const out = []
  for (const p of picks) {
    out.push({
      ...p,
      // 리그 엠블럼도 반드시 인라인해야 한다.
      // 빼먹으면 리그 로고가 매 프레임 네트워크를 타면서 렌더가 다시 느려진다.
      leagueLogo: await toDataUri(p.leagueLogo),
      home: { ...p.home, logo: await toDataUri(p.home.logo) },
      away: { ...p.away, logo: await toDataUri(p.away.logo) },
    })
  }

  const ok = out.filter((p) => p.home.logo && p.away.logo).length
  const okLeague = out.filter((p) => p.leagueLogo).length
  console.log(`▶ 팀 로고 인라인: ${ok}/${out.length} 경기 (실패분은 팀명 크레스트로 대체)`)
  console.log(`▶ 리그 엠블럼 인라인: ${okLeague}/${out.length} 경기`)
  return out
}

async function fetchResult() {
  const qs =
    SPORT === 'baseball'
      ? `sport=baseball&league=${encodeURIComponent(LEAGUE)}`
      : `sport=football&group=${encodeURIComponent(GROUP)}`
  const url = `${BASE_URL}/api/admin/shorts-result?${qs}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`shorts-result ${r.status} — ${url}`)
  const j = await r.json()
  if (!j.success) throw new Error(j.error || 'shorts-result 실패')
  if (!Array.isArray(j.results) || j.results.length === 0) {
    // 그냥 "데이터 없음" 이라고만 하면 원인을 알 수 없어 매번 DB 를 뒤져야 한다.
    // 어느 날짜를 봤고 픽이 몇 개였고 그중 정산된 게 몇 개인지까지 찍어 준다.
    //   picks 0            → 그날 픽 자체가 생성되지 않았다 (픽 생성 크론 확인)
    //   picks N / settled 0 → 픽은 있는데 아직 경기 결과가 안 들어왔다 (정산 크론 확인)
    const detail = (j.diag?.checked || [])
      .map((c) => `${c.date}: 픽 ${c.picks}개 / 정산 ${c.settled}개`)
      .join(' · ')
    throw new Error(
      detail
        ? `정산된 픽이 없습니다 — ${detail}`
        : '정산된 픽이 없습니다 (영상 생성 스킵)'
    )
  }
  return j
}

/**
 * 누적 적중률만 따로 얻어온다.
 *
 * 오늘의 픽(shorts-daily) 응답에는 누적 성적이 없는데, 업로드 설명란에는
 * "누적 596경기 기준 73%" 같은 근거 한 줄이 있어야 신뢰가 붙는다.
 * shorts-result 가 이미 계산해 두므로 거기서 빌려 쓴다.
 * 실패해도 영상은 나와야 하므로 조용히 null 을 돌려준다.
 */
async function fetchCumulative() {
  try {
    const qs =
      SPORT === 'baseball'
        ? `sport=baseball&league=${encodeURIComponent(LEAGUE)}`
        : `sport=football&group=${encodeURIComponent(GROUP)}`
    const r = await fetch(`${BASE_URL}/api/admin/shorts-result?${qs}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
    if (!r.ok) return null
    const j = await r.json()
    return j?.cumulative ?? null
  } catch {
    return null
  }
}

/** 성적표 카드의 로고도 data URI 로 인라인 */
async function inlineResultLogos(results) {
  const picks = results.map((r) => ({ ...r }))
  const inlined = await inlineLogos(picks)
  return inlined
}

const slug = (s) => String(s).replace(/[^\w가-힣]+/g, '_').slice(0, 40)

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  console.log('▶ 번들링...')
  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, 'remotion', 'index.ts'),
    publicDir: path.join(ROOT, 'public'),
    onProgress: (p) => process.stdout.write(`\r  bundle ${p}%   `),
  })
  console.log('\n▶ 번들 완료')

  const backgrounds = await resolveBackgrounds()
  const BGM = await resolveBgm(BGM_REQUESTED)

  const render = async (compositionId, inputProps, name) => {
    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps,
      browserExecutable: BROWSER,
    })
    const outputLocation = path.join(OUT_DIR, name)
    console.log(`▶ ${name}`)
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      // 화질 핵심: crf 18 + slow preset. 구버전(crf 22 + veryfast) 대비 확연히 선명하다.
      crf: 18,
      x264Preset: 'slow',
      pixelFormat: 'yuv420p',
      jpegQuality: 95,
      outputLocation,
      inputProps,
      browserExecutable: BROWSER,
      concurrency: null,
      onProgress: ({ progress }) => process.stdout.write(`\r  ${Math.round(progress * 100)}%   `),
    })
    console.log(`\n  ✓ ${outputLocation}`)
  }

  if (FORMAT === 'daily') {
    const data = await fetchDaily()
    console.log(`▶ ${data.groupLabel} · ${data.totalMatches}경기 중 ${data.picks.length}개 픽`)
    if (data.missingLogos) console.log(`  ⚠ 로고 미확인 ${data.missingLogos}개`)
    if (data.missingStandings) console.log(`  ⚠ 순위 미확인 ${data.missingStandings}개 (시즌 초에는 정상)`)
    if (data.missingKoNames?.length)
      console.log(`  ⚠ 한글 팀명 없음: ${data.missingKoNames.join(', ')} — teamLogos.ts 의 TEAM_NAME_KR 에 추가하세요`)
    // 업로드 문구는 로고를 data URI 로 바꾸기 전에 만든다.
    // 인라인 후에는 픽 객체가 수 MB 짜리 base64 를 물고 있어 다루기 번거롭다.
    const cumulative = await fetchCumulative()
    const tag = SPORT === 'baseball' ? LEAGUE : GROUP
    const name = `daily_${tag}_${data.date}.mp4`
    await writeUpload(OUT_DIR, name, 'daily', { ...data, cumulative }, tag)

    data.picks = await inlineLogos(data.picks)
    await render('DailyPicks', { ...data, bgm: BGM, backgrounds }, name)
  } else if (FORMAT === 'top5') {
    // 주말 TOP 5 — 항상 5개를 채운다
    const data = await fetchDaily('weekend', 5)
    console.log(`▶ ${data.groupLabel} · 주말 ${data.totalMatches}경기 중 TOP ${data.picks.length}`)
    if (data.missingStandings) console.log(`  ⚠ 순위 미확인 ${data.missingStandings}개 (시즌 초에는 정상)`)
    if (data.missingKoNames?.length)
      console.log(`  ⚠ 한글 팀명 없음: ${data.missingKoNames.join(', ')} — teamLogos.ts 의 TEAM_NAME_KR 에 추가하세요`)
    const cumulative = await fetchCumulative()
    const name = `top5_${GROUP}_${data.date}.mp4`
    await writeUpload(OUT_DIR, name, 'top5', { ...data, cumulative }, GROUP)

    data.picks = await inlineLogos(data.picks)
    await render('WeekendTop5', { ...data, bgm: BGM, backgrounds }, name)
  } else if (FORMAT === 'result') {
    const data = await fetchResult()
    console.log(`▶ ${data.groupLabel} · 어제 ${data.summary.total}경기 · ${data.summary.correct} 적중`)

    const tag = SPORT === 'baseball' ? LEAGUE : GROUP
    const name = `result_${tag}_${data.date}.mp4`
    await writeUpload(OUT_DIR, name, 'result', data, tag)

    data.results = await inlineResultLogos(data.results)
    await render('DailyResults', { ...data, bgm: BGM, backgrounds }, name)
  } else {
    const games = await fetchGames()
    const picked = games.slice(0, LIMIT)
    console.log(`▶ ${LEAGUE} · ${picked.length}경기 렌더링`)
    for (const game of picked) {
      await render(
        'Shorts',
        { game, showLogos: SHOW_LOGOS, bgm: BGM, backgrounds },
        `${LEAGUE}_${slug(game.home.ko)}_vs_${slug(game.away.ko)}.mp4`
      )
    }
  }

  console.log('\n완료')
}

main().catch((e) => {
  console.error('\n렌더 실패:', e.message)
  process.exit(1)
})
