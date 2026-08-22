// scripts/upload-text.mjs
//
// 렌더한 영상 옆에 유튜브 업로드용 제목·설명·해시태그를 같이 떨어뜨린다.
// 하루 8~9개를 손으로 쓰면 부담이고, 실제 팀명·승률이 들어가야 클릭이 나온다.
//
// 영상 하나마다 daily_euro_2026-08-22.mp4.txt 가 옆에 떨어진다.
// 메모장으로 열어 제목·설명·고정댓글을 그대로 복사해 붙여넣으면 된다.
//
// ⚠ 수익화 관련 — 아래 단어는 절대 쓰지 않는다.
//    베팅 / 배팅 / 토토 / 스포츠토토 / 배당률 / 수익 / 적중 시
//    "배당 흐름" 도 쓰지 않고 "시장 흐름", "데이터 흐름" 으로 바꿔 쓴다.
//    유튜브는 도박 관련 콘텐츠에 광고를 제한하는데, 설명란 텍스트만으로도 걸린다.

import fs from 'node:fs/promises'
import path from 'node:path'

const SITE = 'https://www.trendsoccer.com'

// 금지어 — 최종 출력에 섞여 있으면 렌더 로그에 경고를 띄운다
const BANNED = ['베팅', '배팅', '토토', '배당', '수익', '적중 시', '환급', '픽스터']

// ── 해시태그 ─────────────────────────────────────────────
// 유튜브 쇼츠는 4~5개가 적당하다. 많이 달면 오히려 스팸으로 취급된다.
const TAGS = {
  euro: ['축구', '해외축구', 'AI예측', '프리미어리그', 'Shorts'],
  kleague: ['K리그', '축구', 'AI예측', '프로축구', 'Shorts'],
  jleague: ['J리그', '축구', 'AI예측', '일본축구', 'Shorts'],
  KBO: ['KBO', '프로야구', 'AI예측', '야구', 'Shorts'],
  NPB: ['NPB', '일본야구', 'AI예측', '야구', 'Shorts'],
  MLB: ['MLB', '메이저리그', 'AI예측', '야구', 'Shorts'],
}

const tagsFor = (key) => TAGS[key] || ['AI예측', '스포츠분석', 'Shorts']

const hashline = (key) => tagsFor(key).map((t) => `#${t}`).join(' ')

// ── 공통 꼬리말 ──────────────────────────────────────────
// 면책 문구는 반드시 넣는다. 예측 정보라는 걸 명시하지 않으면
// 채널 전체가 도박 홍보로 오인될 여지가 있다.
const DISCLAIMER =
  '※ 데이터 기반 분석 정보이며 경기 결과를 보장하지 않습니다. 만 19세 미만 시청 권장하지 않습니다.'

/**
 * 누적 적중률 문구.
 * 숫자만 크게 쓰면 체리피킹이 된다. 기준(무승부 제외 · 리그 · 표본 수)을 반드시 붙인다.
 */
const accuracyLine = (cumulative, groupLabel) => {
  if (!cumulative || !cumulative.decisive || cumulative.decisive < 50) return null
  return `📊 누적 ${cumulative.decisive.toLocaleString()}경기 기준 승패 예측 적중률 ${cumulative.accuracy}% (${groupLabel} · 무승부 제외)`
}

/**
 * 제목에 쓸 짧은 팀명.
 *
 * 설명란에는 정식 팀명을 그대로 둔다 — 검색에 걸려야 하기 때문이다.
 * 제목만은 짧아야 해서 별명 어절을 떼어낸다.
 * ("요코하마 DeNA 베이스타즈 68%" 는 쇼츠 제목으로 너무 길다)
 *
 * 렌더 쪽 remotion/components/teamName.ts 에 더 정교한 매핑이 있지만,
 * 그건 TS 라 이 .mjs 에서 바로 못 불러온다. 제목 한 줄에 쓰는 용도라
 * 여기서는 가벼운 규칙으로 충분하다.
 */
const NICK = /(자이언츠|타이거즈|타이거스|드래곤즈|베이스타즈|스왈로즈|버팔로즈|호크스|마린즈|골든이글스|파이터스|라이온즈|트윈스|위즈|랜더스|다이노스|베어스|이글스|히어로즈|양키스|레드삭스|블루제이스|오리올스|레이스|가디언스|로열스|화이트삭스|애스트로스|레인저스|매리너스|에인절스|애슬레틱스|다저스|파드리스|다이아몬드백스|로키스|브레이브스|필리스|메츠|말린스|내셔널스|브루어스|컵스|카디널스|레즈|파이리츠|유나이티드|원더러스|홋스퍼|포레스트)$/

const shortName = (name) => {
  const raw = String(name || '').trim()
  if (raw.length <= 7) return raw
  const parts = raw.split(/\s+/)
  if (parts.length >= 2 && NICK.test(parts[parts.length - 1])) {
    const dropped = parts.slice(0, -1).join(' ')
    if (dropped.length >= 2) return dropped
  }
  return raw
}

const dateKo = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number)
  const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${m}월 ${d}일 (${wd})`
}

// ── 포맷 A — 오늘의 픽 ───────────────────────────────────
function buildDaily(data, tagKey) {
  const picks = data.picks || []
  const n = picks.length
  const top = [...picks].sort((a, b) => b.probability - a.probability)[0]
  const filtered = data.totalMatches > n

  const titles = filtered
    ? [
        `${data.totalMatches}경기 중 AI가 고른 ${n}경기`,
        `${shortName(top.pickTeam)} ${top.probability}% | 오늘의 AI 픽 ${n}경기`,
        `${dateKo(data.date)} AI 픽 ${n}경기 공개`,
      ]
    : [
        `오늘의 AI 픽 ${n}경기`,
        `${shortName(top.pickTeam)} ${top.probability}% | ${data.groupLabel} AI 분석`,
        `${dateKo(data.date)} ${data.groupLabel} AI 픽`,
      ]

  const lines = picks.map(
    (p) =>
      `▪ ${p.leagueLabel} ${p.home.name} vs ${p.away.name}\n   → ${p.pickTeam} ${p.probability}%`
  )

  const description = [
    `${dateKo(data.date)} ${data.groupLabel} AI 분석 리포트`,
    '',
    filtered
      ? `${data.totalMatches}경기를 분석해 ${n}경기가 기준을 통과했습니다.`
      : `${data.groupLabel} ${data.windowLabel || '오늘'} 경기 AI 분석 결과입니다.`,
    '',
    ...lines,
    '',
    `전체 경기 분석과 실시간 데이터 흐름 👉 ${SITE}`,
    '',
    accuracyLine(data.cumulative, data.groupLabel),
    DISCLAIMER,
    '',
    hashline(tagKey),
  ]
    .filter((l) => l !== null && l !== undefined)
    .join('\n')

  return { titles, description, tags: tagsFor(tagKey) }
}

// ── 포맷 B — 어제 성적표 ─────────────────────────────────
function buildResult(data, tagKey) {
  const { total, correct, draws, accuracy } = data.summary
  const decisive = total - draws

  // 성적이 나쁜 날도 그대로 올린다.
  // 좋은 날만 올리면 누적 적중률과 앞뒤가 안 맞고, 그건 시청자가 먼저 알아챈다.
  const titles = [
    `어제 AI 픽 ${total}경기, ${correct}개 적중`,
    correct >= decisive && decisive > 0
      ? `어제 AI 예측 ${decisive}경기 전부 적중`
      : `${total}경기 예측 결과 공개 | 적중률 ${accuracy}%`,
    `${dateKo(data.date)} AI 예측 성적표`,
  ]

  const lines = (data.results || []).map((r) => {
    const mark = r.isCorrect ? '✅' : r.isDraw ? '➖' : '❌'
    const score = `${r.homeScore ?? '-'} : ${r.awayScore ?? '-'}`
    return `${mark} ${r.home.name} ${score} ${r.away.name}\n   AI 예측 ${r.pickTeam} (${r.probability}%)`
  })

  const description = [
    `${dateKo(data.date)} ${data.groupLabel} AI 예측 결과입니다.`,
    '',
    `${total}경기 중 ${correct}경기 적중 (적중률 ${accuracy}%)`,
    draws > 0 ? `※ ${draws}경기는 무승부 — 이 모델은 무승부를 예측하지 않습니다.` : null,
    '',
    ...lines,
    '',
    `오늘 경기 예측도 이미 올라와 있습니다 👉 ${SITE}`,
    '',
    accuracyLine(data.cumulative, data.groupLabel),
    DISCLAIMER,
    '',
    hashline(tagKey),
  ]
    .filter((l) => l !== null && l !== undefined)
    .join('\n')

  return { titles, description, tags: tagsFor(tagKey) }
}

// ── 포맷 E — 주말 TOP 5 ──────────────────────────────────
function buildTop5(data, tagKey) {
  const ranked = [...(data.picks || [])].sort((a, b) => b.probability - a.probability)
  const n = ranked.length
  const top = ranked[0]

  const titles = [
    `이번 주말 AI가 가장 확신한 ${n}경기`,
    `주말 TOP ${n} | 1위는 ${top.probability}%`,
    `${data.totalMatches}경기 중 주말 TOP ${n}`,
  ]

  const lines = ranked.map(
    (p, i) =>
      `${i + 1}위 ${p.leagueLabel} ${p.home.name} vs ${p.away.name}\n     → ${p.pickTeam} ${p.probability}%`
  )

  const description = [
    `이번 주말 ${data.groupLabel} AI 분석 TOP ${n}`,
    '',
    `주말 ${data.totalMatches}경기 중 승률 상위 ${n}경기를 뽑았습니다.`,
    '',
    ...lines,
    '',
    `주말 전 경기 분석 👉 ${SITE}`,
    '',
    accuracyLine(data.cumulative, data.groupLabel),
    DISCLAIMER,
    '',
    hashline(tagKey),
  ]
    .filter((l) => l !== null && l !== undefined)
    .join('\n')

  return { titles, description, tags: tagsFor(tagKey) }
}

/** 포맷별로 갈라 문구 묶음을 만든다 */
export function buildUpload(format, data, tagKey) {
  if (format === 'result') return buildResult(data, tagKey)
  if (format === 'top5') return buildTop5(data, tagKey)
  return buildDaily(data, tagKey)
}

/**
 * 영상 옆에 업로드용 .txt 를 쓴다.
 *
 * BOM 을 붙인다. Windows 메모장이 BOM 없는 UTF-8 을 cp949 로 읽어
 * 한글이 깨지기 때문이다. (PowerShell 스크립트에서 겪은 것과 같은 문제)
 */
export async function writeUpload(outDir, videoName, format, data, tagKey) {
  const built = buildUpload(format, data, tagKey)
  const [title, ...alts] = built.titles

  const txt =
    '﻿' +
    [
      '━━━━━━━━━━━ 제목 (복사) ━━━━━━━━━━━',
      title,
      '',
      '── 다른 제목 후보 ──',
      ...alts.map((t) => `· ${t}`),
      '',
      '━━━━━━━━━━━ 설명 (복사) ━━━━━━━━━━━',
      built.description,
      '',
      '━━━━━━━━━━━ 고정 댓글 (복사) ━━━━━━━━━━━',
      // 쇼츠는 설명란이 거의 안 보인다. 링크는 고정 댓글이 훨씬 잘 먹는다.
      `오늘 경기 전체 분석은 여기서 확인하세요 👉 ${SITE}`,
      '',
      '━━━━━━━━━━━ 태그 ━━━━━━━━━━━',
      built.tags.join(', '),
      '',
    ].join('\n')

  await fs.writeFile(path.join(outDir, `${videoName}.txt`), txt, 'utf8')

  // 금지어가 섞였는지 마지막에 한 번 훑는다
  const hay = `${title} ${built.description}`
  const hits = BANNED.filter((w) => hay.includes(w))
  if (hits.length) {
    console.log(`  ⚠ 수익화 위험 단어 발견: ${hits.join(', ')} — ${videoName}.txt 확인 필요`)
  }

  console.log(`  ✓ ${videoName}.txt`)
  return built
}
