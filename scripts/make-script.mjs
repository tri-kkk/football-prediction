#!/usr/bin/env node
// scripts/make-script.mjs
//
// 경기 데이터를 모아 롱폼 프리뷰 나레이션 스크립트를 만든다.
// 설계 근거는 VIDEO_PREVIEW_SPEC.md 참고.
//
// 사용법:
//   ★ 권장 — 발행된 프리뷰 기사를 나레이션으로 변환:
//   node scripts/make-script.mjs --from=blog --count=3
//   node scripts/make-script.mjs --from=blog --date=2026-09-04 --count=3 --dry
//
//   데이터에서 직접 생성 (기사가 없을 때):
//   node scripts/make-script.mjs --group=euro --count=3
//   node scripts/make-script.mjs --group=euro --range=weekend --count=3   ← 주말 유럽 축구
//
//   과거 경기로 테스트 (데이터가 다 갖춰진 날로 원고 품질만 확인):
//   node scripts/make-script.mjs --date=2026-08-31 --count=3 --dry
//
//   문체 비교 — 같은 데이터로 세 버전을 뽑아 읽어보고 고른다:
//   node scripts/make-script.mjs --group=euro --range=weekend --voice=analyst
//   node scripts/make-script.mjs --group=euro --range=weekend --voice=caster
//   node scripts/make-script.mjs --group=euro --range=weekend --voice=podcast
//   node scripts/make-script.mjs --sport=baseball --league=KBO --count=2
//   node scripts/make-script.mjs --group=euro --dry     # 도시에만 뽑고 LLM 호출 안 함
//
// 결과:
//   out/scripts/2026-08-24-euro.json   렌더 파이프라인이 먹는 형식
//   out/scripts/2026-08-24-euro.txt    검수용 (소리 내어 읽어보세요)
//
// 환경변수 (.env.local 에서 읽음):
//   ANTHROPIC_API_KEY  또는  OPENAI_API_KEY
//   SHORTS_BASE_URL    기본 https://www.trendsoccer.com

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()

const todayKST = () => {
  const k = new Date(Date.now() + 9 * 3600_000)
  return (
    k.getUTCFullYear() +
    '-' + String(k.getUTCMonth() + 1).padStart(2, '0') +
    '-' + String(k.getUTCDate()).padStart(2, '0')
  )
}

// ── 설정 ─────────────────────────────────────────────────
const arg = (n, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${n}=`))
  return h ? h.split('=').slice(1).join('=') : d
}
const DRY = process.argv.includes('--dry')

const SPORT = arg('sport', 'football')
const GROUP = arg('group', 'euro')
const LEAGUE = arg('league', 'KBO')
const COUNT = Number(arg('count', '3'))
// today = 지금부터 30시간 안에 열리는 경기
// weekend = 다가오는 토·일 경기 (유럽 리그는 여기 몰린다)
const RANGE = arg('range', 'today')
// 지난 시즌 — 시즌 초에는 올해 데이터가 거의 없어 이게 기준선이 된다
const LAST_SEASON = arg('lastSeason', '2025')
const CURRENT_SEASON = arg('season', '2026')

// ── 페르소나 ─────────────────────────────────────────────
//
// ⚠ 페르소나는 **문체와 접근만** 바꾼다.
//   지어내기 금지, 금지어, 반론 요건 같은 사실 규칙은 셋 다 똑같이 적용된다.
//   그래야 세 버전을 비교할 때 "문체 차이" 만 보인다.
//
// '픽스터' 는 일부러 넣지 않았다.
//   픽을 파는 사람이라는 뜻이라 수익화 심사에 걸리고,
//   무엇보다 채널 성격이 '분석' 에서 '적중 자랑' 으로 바뀐다.
//   검증된 적중률을 가진 채널에겐 그 프레임이 자산을 깎아먹는다.
const PERSONAS = {
  analyst: {
    label: '전문 애널리스트',
    block: [
      '너는 스포츠 데이터 애널리스트다. 확률로 사고하고 확률로 말한다.',
      '',
      '- 결론보다 **왜 그 결론인가**에 시간을 더 써라.',
      '- 확신의 정도를 정확히 표현해라. "이길 것" 이 아니라 "72%로 본다".',
      '- 우리 모델이 시장과 다르게 보는 지점을 즐겨 파고들어라. 그게 네 일이다.',
      '- 불확실성을 숨기지 마라. 표본이 작으면 작다고 말하는 게 네 신뢰의 근거다.',
      '- 담백하게. 감탄사나 과장된 수식어를 쓰지 마라.',
      '',
      '예: "우리 모델이 시장보다 8%포인트 높게 봤습니다.',
      '     그 차이는 대부분 랑스의 홈 기록에서 나옵니다.',
      '     지난 시즌 홈 17경기에서 무승부가 한 번도 없었거든요. 14승 3패."',
    ].join('\n'),
  },

  caster: {
    label: '해설위원',
    block: [
      '너는 20년차 축구 해설위원이다. 경기를 눈에 보이게 설명한다.',
      '',
      '- 숫자를 읽지 말고 **그 숫자가 만드는 장면**을 말해라.',
      '- 선수 이름을 적극적으로 불러라. 사람이 나와야 경기가 산다.',
      '- 문장에 리듬이 있어야 한다. 짧게 끊었다가 길게 풀어라.',
      '- 중계석 톤이되 격앙되지 마라. TTS 로 읽히면 과장은 다 어색해진다.',
      '',
      '예: "랑스 홈에서 비긴다는 선택지는 없습니다.',
      '     지난 시즌 홈 17경기, 무승부가 한 번도 없었어요.',
      '     이기거나 지거나 둘 중 하나였습니다. 14승 3패."',
    ].join('\n'),
  },

  podcast: {
    label: '팟캐스터',
    block: [
      '너는 축구 팟캐스트 진행자다. 청취자에게 말을 건다.',
      '',
      '- 대화체로 써라. 질문을 던지고 네가 답하는 구조가 잘 맞는다.',
      '- 데이터에서 **네가 놀란 지점**을 공유해라. 그게 청취자도 놀라는 지점이다.',
      '- 어미를 다양하게. "~습니다" 만 반복하면 딱딱해진다. "~거든요", "~더라고요" 를 섞어라.',
      '- 다만 잡담으로 흐르지 마라. 20초 안에 근거가 나와야 한다.',
      '',
      '예: "랑스 홈 기록을 보다가 좀 놀랐는데요.',
      '     지난 시즌 홈에서 무승부가 아예 없어요. 한 번도.',
      '     14승 3패. 비기는 법을 모르는 팀이었던 거죠."',
    ].join('\n'),
  },
}

const VOICE = arg('voice', 'analyst')
// 과거 경기로 테스트할 때 쓴다 (--date=2026-08-31).
// 시즌 초 데이터 빈곤과 원고 품질 문제를 분리해서 보기 위한 것.
const PAST_DATE = arg('date', '')
// --from=blog : 발행된 프리뷰 기사를 나레이션으로 변환한다 (권장)
const FROM_BLOG = arg('from', '') === 'blog'


async function loadEnv() {
  try {
    const raw = await fs.readFile(path.join(ROOT, '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* 환경변수가 이미 잡혀 있을 수도 있다 */
  }
}

// ── 데이터 수집 ──────────────────────────────────────────
const jget = async (url) => {
  const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json()
}

/**
 * 경기 하나에 대해 LLM 에게 줄 "도시에" 를 만든다.
 *
 * 여기가 스크립트 품질을 좌우한다.
 * 픽 확률만 넘기면 "AI가 68%를 줬습니다" 밖에 못 쓴다.
 * 순위·폼·홈원정 분리·상대전적·확률 분포까지 넘겨야
 * 데이터 **사이의 관계**를 말할 수 있다.
 */
/**
 * 시장 흐름 요약.
 *
 * ⚠ 원본은 경기당 90개가 넘는 시계열인데 값이 거의 다 같다.
 *   그대로 넘기면 토큰만 수천 개 먹고, LLM 은 숫자 더미에서 신호를 못 찾는다.
 *
 * 여기서 뽑아내는 건 결국 하나다 — **우리 모델과 시장이 얼마나 다르게 보는가.**
 * "시장은 65% 로 보는데 우리는 71% 를 줍니다" 는 이 데이터에서만 나오는 문장이고,
 * 스크랩으로 만드는 채널은 절대 못 쓴다.
 */
function summarizeTrend(trend, ourProb, pickSide) {
  const d = trend?.data
  if (!Array.isArray(d) || d.length < 2) return null

  const key =
    pickSide === 'HOME' ? 'homeWinProbability'
    : pickSide === 'AWAY' ? 'awayWinProbability'
    : 'drawProbability'

  const series = d.map((x) => Number(x[key])).filter((v) => Number.isFinite(v))
  if (series.length < 2) return null

  const r1 = (v) => Math.round(v * 10) / 10
  const open = series[0]
  const close = series[series.length - 1]
  const gap = r1(ourProb - close)

  return {
    관측기간_일: Number(trend?.metadata?.timespanDays ?? 0),
    시장_최초: r1(open),
    시장_현재: r1(close),
    시장_변동_퍼센트포인트: r1(close - open),
    시장_최저: r1(Math.min(...series)),
    시장_최고: r1(Math.max(...series)),
    우리모델: ourProb,
    // + 면 우리가 시장보다 더 확신, - 면 시장이 더 확신
    우리_시장_격차_퍼센트포인트: gap,
    // 계산된 사실만 적는다. 해석은 LLM 이 한다.
    격차_방향:
      Math.abs(gap) < 2 ? '시장과 거의 일치'
      : gap > 0 ? '우리 모델이 시장보다 더 확신'
      : '시장이 우리 모델보다 더 확신',
  }
}

// ── 리그 ID (api-sports) ──────────────────────────────────
// team-statistics / h2h 가 리그 ID 를 요구한다.
const LEAGUE_API_ID = {
  PL: 39, PD: 140, SA: 135, BL1: 78, FL1: 61, DED: 88, PPL: 94,
  CL: 2, EL: 3, UECL: 848, KL1: 292, KL2: 293, J1: 98, J2: 99,
}

// 리그 라벨 → 코드 (도시에에는 라벨만 들어온다)
const LABEL_TO_CODE = {
  '프리미어리그': 'PL', '라리가': 'PD', '세리에A': 'SA', '분데스리가': 'BL1',
  '리그1': 'FL1', '에레디비시': 'DED', '프리메이라리가': 'PPL',
  '챔피언스리그': 'CL', '유로파리그': 'EL', '컨퍼런스리그': 'UECL',
}

/**
 * 로고 URL 에서 팀 ID 를 뽑는다.
 *
 * 픽 데이터에 팀 ID 가 없지만 로고가 api-sports 주소라
 * (https://media.api-sports.io/football/teams/42.png) 거기서 꺼낼 수 있다.
 * 이게 있어야 지난 시즌 팀 스탯을 가져온다.
 */
const teamIdFromLogo = (url) => {
  const m = String(url || '').match(/\/teams\/(\d+)\.png/)
  return m ? Number(m[1]) : null
}


/**
 * 팀명 한글화.
 *
 * 오늘의 픽은 API 가 한글로 내려주지만, 과거 픽(pick_recommendations)은 영문이다.
 * "Rayo Vallecano" 를 그대로 읽으면 TTS 가 영어로 발음해버린다.
 */
const nameCache = new Map()
async function koTeamName(base, teamId, fallback) {
  if (!teamId) return fallback
  if (nameCache.has(teamId)) return nameCache.get(teamId)
  try {
    const j = await jget(base + '/api/team-translate?teamId=' + teamId)
    const ko = j?.korean || j?.name_kr || j?.nameKr || j?.translated || null
    const out = ko || fallback
    nameCache.set(teamId, out)
    return out
  } catch {
    nameCache.set(teamId, fallback)
    return fallback
  }
}

/**
 * 상대 전적 요약 — **킥오프 이후 경기를 반드시 잘라낸다.**
 *
 * ⚠ 여기서 크게 틀렸던 적이 있다.
 *   과거 경기로 테스트할 때 h2h API 가 **지금 프리뷰하려는 그 경기 자체를**
 *   상대전적 목록에 넣어서 돌려준다. 이미 끝난 경기니까 당연하다.
 *   그대로 넘기면 "바르셀로나가 5-2로 이겼습니다" 가 프리뷰 원고에 박힌다.
 *
 *   homeForm / awayForm 도 마찬가지다. 최근 폼 맨 앞이 그 경기다.
 *
 *   그래서 킥오프 **이전** 경기만 남기고, 통계도 그 기준으로 다시 계산한다.
 *   오늘 경기를 미리 볼 때는 어차피 미래라 아무것도 안 잘린다.
 */
function summarizeH2H(h2h, kickoffISO, homeName) {
  if (!h2h) return null
  const cut = new Date(kickoffISO).getTime()
  const before = (d) => {
    const t = new Date(d).getTime()
    return Number.isFinite(t) && Number.isFinite(cut) ? t < cut : true
  }

  const past = (h2h.h2hMatches || []).filter((m) => before(m.date))
  if (!past.length) return null

  // 통계는 원본 것을 쓰면 안 된다 — 그 안에 이 경기가 섞여 있다.
  let hw = 0, aw = 0, dr = 0
  for (const m of past) {
    if (m.winner === 'draw') dr++
    else if (m.homeTeam === homeName ? m.winner === 'home' : m.winner === 'away') hw++
    else aw++
  }

  const fmt = (m) =>
    `${String(m.date).slice(0, 10)} ${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam}`

  const form = (arr) =>
    (arr || [])
      .filter((f) => before(f.date))
      .slice(0, 5)
      .map((f) => `${f.result} ${f.score} vs ${f.opponent}${f.isHome ? ' (홈)' : ' (원정)'}`)

  return {
    최근_맞대결: past.slice(0, 5).map(fmt),
    전적: `${homeName} 기준 ${hw}승 ${dr}무 ${aw}패 (최근 ${past.length}경기)`,
    home_최근5: form(h2h.homeForm),
    away_최근5: form(h2h.awayForm),
  }
}

/**
 * 지난 시즌 팀 통계.
 *
 * 시즌 초에는 올해 데이터가 1~2경기뿐이라 할 말이 없다.
 * 지난 시즌 성적은 "이 팀이 원래 어떤 팀인가" 의 기준선이 된다.
 * 다만 이적·감독 교체가 있으므로 **반드시 '지난 시즌' 이라고 못박아** 써야 한다.
 */
function compactStats(raw) {
  const st = raw?.statistics
  if (!st?.fixtures) return null

  const f = st.fixtures

  // api-sports 원본은 goals.for.total 이 {home,away,total} 객체이고,
  // 프로젝트 라우트를 거치면 이미 평탄화돼 있다. 양쪽 다 받는다.
  const flat = (side) => {
    const raw = st.goals?.[side]
    if (!raw) return { home: 0, away: 0, total: 0, minute: null }
    const t = raw.total
    if (t && typeof t === 'object') {
      return { home: t.home || 0, away: t.away || 0, total: t.total || 0, minute: raw.minute }
    }
    return { home: raw.home || 0, away: raw.away || 0, total: raw.total || 0, minute: raw.minute }
  }
  const g = { for: flat('for'), against: flat('against') }

  // ⚠ 0 으로 가득 찬 응답은 "성적이 0" 이 아니라 **그 시즌 그 리그에 없었다** 는 뜻이다.
  //   승격팀이나 다른 리그 소속이었던 팀을 조회하면 api-sports 가 이렇게 돌려준다.
  //   이걸 그대로 넘기면 LLM 이 "지난 시즌 무득점" 같은 문장을 만든다.
  //   실제로 코번트리(지난 시즌 챔피언십)가 이 함수 없이 0 으로 들어왔다.
  if (!f.played?.total) return { 해당시즌_이_리그_기록없음: true }

  const r1 = (n, d) => (d ? Math.round((n / d) * 10) / 10 : null)

  return {
    경기: f.played.total,
    홈: {
      전적: `${f.wins.home}승 ${f.draws.home}무 ${f.loses.home}패`,
      득점: g.for.home,
      실점: g.against.home,
      경기당득점: r1(g.for.home, f.played.home),
      경기당실점: r1(g.against.home, f.played.home),
      클린시트: st.cleanSheet?.home,
      무득점경기: st.failedToScore?.home,
    },
    원정: {
      전적: `${f.wins.away}승 ${f.draws.away}무 ${f.loses.away}패`,
      득점: g.for.away,
      실점: g.against.away,
      경기당득점: r1(g.for.away, f.played.away),
      경기당실점: r1(g.against.away, f.played.away),
      클린시트: st.cleanSheet?.away,
      무득점경기: st.failedToScore?.away,
    },
    최다연승: st.biggest?.streak?.wins,
    최다연패: st.biggest?.streak?.loses,

    // 전술 재료 — 처음엔 버렸는데, 이게 없으면 원고가 숫자 낭독이 된다.
    // 포메이션은 감독의 성향이고, 시간대별 득점은 경기 운영 방식이다.
    포메이션: (st.lineups || [])
      .filter((l) => l.formation && l.played)
      .sort((a, b) => b.played - a.played)
      .slice(0, 3)
      .map((l) => `${l.formation} (${l.played}경기)`),

    // "이 팀은 후반 막판에 몰아친다" 같은 서사가 여기서 나온다
    득점시간대: minuteBuckets(g.for?.minute),
    실점시간대: minuteBuckets(g.against?.minute),

    카드: {
      옐로: sumCards(st.cards?.yellow),
      레드: sumCards(st.cards?.red),
    },
  }
}

/** 시간대별 득점 분포에서 의미 있는 구간만 남긴다 */
function minuteBuckets(m) {
  if (!m) return null
  const out = {}
  for (const [k, v] of Object.entries(m)) {
    if (v?.total) out[k + '분'] = v.total
  }
  return Object.keys(out).length ? out : null
}

const sumCards = (obj) =>
  obj ? Object.values(obj).reduce((a, v) => a + (v?.total || 0), 0) : null

async function lastSeasonStats(base, teamId, leagueCode, season) {
  const leagueId = LEAGUE_API_ID[leagueCode]
  if (!teamId || !leagueId) return null

  // ⚠ 프로젝트의 /api/team-statistics 는 응답을 재조립하면서
  //   lineups(포메이션) 와 goals.for.minute(시간대별 득점) 를 버린다.
  //   그 둘이 전술 얘기의 유일한 근거라 없으면 원고가 다시 숫자 낭독이 된다.
  //   그래서 api-sports 를 직접 부른다. 실패하면 기존 라우트로 폴백한다.
  if (process.env.API_FOOTBALL_KEY) {
    try {
      const r = await fetch(
        'https://v3.football.api-sports.io/teams/statistics?team=' + teamId +
        '&league=' + leagueId + '&season=' + season,
        {
          headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
          signal: AbortSignal.timeout(15000),
        }
      )
      const j = await r.json()
      if (j?.response) return compactStats({ statistics: j.response })
    } catch {
      /* 폴백으로 넘어간다 */
    }
  }

  try {
    const j = await jget(
      base + '/api/team-statistics?team=' + teamId + '&league=' + leagueId + '&season=' + season
    )
    if (!j || j.error) return null
    return compactStats(j)
  } catch {
    return null
  }
}

/*
 * 선수 단위 데이터는 의도적으로 다루지 않는다.
 *
 * 지난 시즌 득점자를 쓰려면 "지금도 그 팀에 있는가" 를 확인해야 하는데,
 * 명단 API 는 이적 반영이 늦고(떠난 페란 토레스가 그대로 잡혔다),
 * 출전 기록으로 확인하면 시즌 초에는 표본이 없다.
 *
 * 틀린 선수 이름 하나면 축구를 아는 시청자는 그 영상을 끈다.
 * 검증 비용은 큰데 틀렸을 때 손해가 훨씬 크다.
 * 팀 단위 데이터(전적·홈원정 분리·득실·상대전적·시장)만으로도
 * 할 얘기는 충분하다.
 */

/**
 * 같은 경기의 블로그 프리뷰를 찾는다.
 *
 * 이미 써 둔 기사가 있으면 그게 가장 좋은 재료다.
 * 구조화된 데이터에 없는 맥락이 거기 들어 있다.
 *
 * ⚠ 처음엔 목록 40개만 훑어서 못 찾았다.
 *   주요 경기마다 글이 올라가면 이틀치도 40개를 넘는다.
 *   슬러그 규칙이 일정하므로 **직접 조합해서 먼저 시도**하고,
 *   실패할 때만 목록을 뒤진다.
 *
 *   패턴: {홈}-vs-{원정}-{리그}-preview-{YYYYMMDD}
 *   예: barcelona-vs-rayo-vallecano-la-liga-preview-20260831
 */
const LEAGUE_SLUG = {
  PL: 'premier-league', PD: 'la-liga', SA: 'serie-a', BL1: 'bundesliga',
  FL1: 'ligue-1', DED: 'eredivisie', PPL: 'primeira-liga',
  CL: 'champions-league', EL: 'europa-league', UECL: 'conference-league',
}

const slugify = (n) =>
  String(n || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * 블로그 본문에서 필요한 섹션만 뽑는다.
 *
 * ⚠ 처음엔 앞에서부터 2,500자를 잘랐는데 그게 정확히 틀린 방법이었다.
 *   블로그는 [인트로 → 최근 폼 → 성적 비교 → 핵심 스탯 → **전술 포인트**
 *   → 예상 라인업 → **승부처** → 예측] 순서다.
 *   앞부분은 우리가 이미 구조화된 데이터로 갖고 있는 것들이고,
 *   정작 데이터에 없는 전술·승부처는 뒤에 있어서 통째로 잘려나갔다.
 *
 *   그래서 위치가 아니라 **제목으로** 뽑는다.
 */
/**
 * 블로그 전문을 섹션별로 나눈다 (변환 모드용).
 *
 * 발췌 모드(extractBlogSections)는 전술·승부처만 뽑지만,
 * 블로그를 원본으로 삼는 변환 모드에서는 기사 전체가 재료다.
 */
function splitAllSections(md) {
  if (!md) return null
  const blocks = String(md).split(/\n(?=\s*#{1,4}\s)/)
  const out = []
  for (const b of blocks) {
    const lines = b.split('\n')
    const head = (lines[0] || '').trim()
    if (/^#{1,4}\s/.test(head)) {
      out.push({
        제목: head.replace(/^#+\s*/, '').trim(),
        내용: lines.slice(1).join('\n').trim(),
      })
    } else if (b.trim()) {
      out.push({ 제목: '인트로', 내용: b.trim() })
    }
  }
  // 라인업은 선수 이름 덩어리라 뺀다 (팀 데이터만 쓰기로 했다)
  // 해시태그 섹션도 나레이션에 쓸 게 없다
  return out.filter((x) => x.내용 && !/라인업|lineup|tags|해시태그/i.test(x.제목))
}

function extractBlogSections(md) {
  if (!md) return null
  const text = String(md)

  const WANT = [
    { key: '전술포인트', re: /전술|택틱|tactic/i },
    { key: '승부처', re: /승부처|키포인트|key\s*point|관전\s*포인트/i },
  ]
  // 라인업은 선수 이름 덩어리라 일부러 안 가져온다.
  // 예측 섹션도 뺀다 — 우리 결론을 그대로 베껴 쓰게 만든다.
  const SKIP = /라인업|lineup|예측|prediction|tags|해시태그|면책/i

  const out = {}
  const take = (key, body) => {
    const t = String(body || '').trim()
    if (t && !out[key]) out[key] = t.slice(0, 1500)
  }

  // 1) 마크다운 헤더 (## 🎯 전술 포인트)
  const byHeader = text.split(/\n(?=\s*#{2,4}\s)/)
  if (byHeader.length > 1) {
    for (const block of byHeader) {
      const head = (block.split('\n')[0] || '').trim()
      if (!/^#{2,4}\s/.test(head)) continue
      if (SKIP.test(head)) continue
      const hit = WANT.find((w) => w.re.test(head))
      if (hit) take(hit.key, block.split('\n').slice(1).join('\n'))
    }
  }

  // 2) 헤더 형식이 다를 수 있다 (굵게, HTML, 이모지만 있는 줄 등).
  //    못 찾은 항목만 줄 단위로 다시 훑는다.
  if (WANT.some((w) => !out[w.key])) {
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // 제목처럼 보이는 짧은 줄만 후보로 본다 (본문 중 언급과 구분)
      const looksLikeHeading = line.trim().length > 0 && line.trim().length <= 30
      if (!looksLikeHeading || SKIP.test(line)) continue
      const hit = WANT.find((w) => w.re.test(line) && !out[w.key])
      if (!hit) continue

      const body = []
      for (let j = i + 1; j < lines.length; j++) {
        const nxt = lines[j]
        // 다음 제목처럼 보이는 줄을 만나면 멈춘다
        if (/^\s*#{2,4}\s/.test(nxt)) break
        if (nxt.trim().length > 0 && nxt.trim().length <= 30 &&
            /전술|승부처|라인업|예측|스탯|폼|성적|tags/i.test(nxt)) break
        body.push(nxt)
        if (body.join('\n').length > 1600) break
      }
      take(hit.key, body.join('\n'))
    }
  }

  return Object.keys(out).length ? out : null
}

async function fetchBlogBySlug(base, slug) {
  try {
    const full = await jget(base + '/api/blog/post/' + encodeURIComponent(slug))
    const post = full?.post || full
    const body = post?.content || ''
    if (!body) return null

    const sections = extractBlogSections(body)
    return {
      제목: post.title_kr || post.title,
      슬러그: slug,
      // 원하는 섹션이 잡히면 그것만, 못 잡으면 앞부분으로 폴백
      ...(sections
        ? { 섹션: sections }
        : { 본문_발췌: body.slice(0, 2000) }),
    }
  } catch {
    return null
  }
}

/**
 * 팀 이름의 후보 토큰들.
 *
 * ⚠ DB 의 팀명과 블로그 슬러그의 팀명이 다를 수 있다.
 *   DB: "Olympique Lyonnais"  →  슬러그: "lyon"
 *   DB: "Paris Saint Germain"  →  슬러그: "psg" 또는 "paris-saint-germain"
 *   전체 이름만으로 맞추려 들면 이런 경기는 영영 못 찾는다.
 */
function nameTokens(name) {
  const full = slugify(name)
  const parts = full.split('-').filter((w) => w.length >= 3)
  const out = new Set([full])
  // 흔한 접두어를 뺀 나머지 (Olympique Lyonnais → lyonnais, lyon)
  const NOISE = new Set(['fc', 'ac', 'as', 'sc', 'cf', 'club', 'olympique', 'real', 'atletico', 'sporting'])
  for (const w of parts) {
    if (NOISE.has(w)) continue
    out.add(w)
    // 어미가 다른 경우까지 (lyonnais → lyon)
    if (w.length > 5) out.add(w.slice(0, 4))
  }
  return [...out].filter(Boolean)
}

const ymdOf = (d) =>
  d.getUTCFullYear() +
  String(d.getUTCMonth() + 1).padStart(2, '0') +
  String(d.getUTCDate()).padStart(2, '0')

async function findBlogPreview(base, homeEn, awayEn, leagueCode, kickoffISO) {
  const lg = LEAGUE_SLUG[leagueCode]
  const d = new Date(kickoffISO)
  const validDate = Number.isFinite(d.getTime())

  // 킥오프가 자정 근처면 블로그 날짜가 하루 다를 수 있다
  const days = validDate
    ? [0, -1, 1].map((off) => ymdOf(new Date(d.getTime() + off * 86400000)))
    : []

  const hs = nameTokens(homeEn)
  const as = nameTokens(awayEn)

  // ── 1) 목록에서 찾기 (요청 1번) ──────────────────────
  //
  // 슬러그 조합을 먼저 돌리면 이름 변형 × 날짜로 요청이 수십 번 나간다.
  // 목록은 한 번이면 되고, 날짜로 좁힌 뒤 팀 토큰을 맞추면 정확도도 충분하다.
  let sameDay = []
  let listCount = 0
  try {
    const j = await jget(base + '/api/blog/posts?category=preview&limit=100')
    const posts = j?.posts || j?.data || (Array.isArray(j) ? j : [])
    if (Array.isArray(posts) && posts.length) {
      listCount = posts.length
      sameDay = posts.filter((p) => days.some((y) => String(p.slug || '').endsWith(y)))
      const pool = sameDay.length ? sameDay : posts

      const score = (p) => {
        const hay = slugify([p.slug, p.title, p.title_kr].filter(Boolean).join(' '))
        return (hs.some((t) => hay.includes(t)) ? 1 : 0) + (as.some((t) => hay.includes(t)) ? 1 : 0)
      }

      // 날짜로 좁혀졌으면 한쪽만 맞아도 되고, 아니면 양쪽 다 맞아야 한다
      const need = sameDay.length ? 1 : 2
      const best = pool
        .map((p) => ({ p, s: score(p) }))
        .filter((x) => x.s >= need)
        .sort((a, b) => b.s - a.s)[0]

      if (best?.p?.slug) {
        const full = await fetchBlogBySlug(base, best.p.slug)
        if (full) return full
      }
    }
  } catch {
    /* 슬러그 조합으로 넘어간다 */
  }

  // ── 2) 슬러그 직접 조합 (대비책) ─────────────────────
  //    목록 API 가 죽었거나 페이지를 넘어간 오래된 글일 때만 여기까지 온다.
  const tried = []
  if (lg && days.length) {
    outer: for (const ymd of days) {
      for (const h of hs.slice(0, 3)) {
        for (const a of as.slice(0, 3)) {
          const slug = `${h}-vs-${a}-${lg}-preview-${ymd}`
          if (tried.includes(slug)) continue
          tried.push(slug)
          const hit = await fetchBlogBySlug(base, slug)
          if (hit) return hit
          if (tried.length >= 12) break outer   // 요청이 과해지지 않게 자른다
        }
      }
    }
  }

  return {
    찾지못함: true,
    조회한_프리뷰_수: listCount,
    같은날짜_글: sameDay.map((p) => p.slug).slice(0, 8),
    시도한_슬러그: tried.slice(0, 6),
  }
}

async function buildDossier(base, pick) {
  const d = {
    league: pick.leagueLabel,
    kickoff: pick.matchTime,
    home: {
      name: pick.home.name,
      rank: pick.home.position,
      points: pick.home.points,
      form: pick.home.form,
    },
    away: {
      name: pick.away.name,
      rank: pick.away.position,
      points: pick.away.points,
      form: pick.away.form,
    },
    pick: { team: pick.pickTeam, side: pick.pickSide, probability: pick.probability },
    // 3-way 분포는 "왜 68% 인가" 를 설명할 때 필수다.
    // 무승부 확률이 높은 경기는 픽 확률이 같아도 성격이 완전히 다르다.
    distribution: pick.odds3,
    stars: pick.stars,
  }

  const code = LABEL_TO_CODE[pick.leagueLabel] || pick.league

  // 상대 전적.
  // ⚠ league 파라미터가 빠지면 이 API 는 결과를 못 찾는다 (첫 시도에서 전부 비었던 원인).
  let h2hRaw = null
  try {
    h2hRaw = await jget(
      base + '/api/h2h?homeTeam=' + encodeURIComponent(pick.home.name) +
      '&awayTeam=' + encodeURIComponent(pick.away.name) +
      (code ? '&league=' + encodeURIComponent(code) : '')
    )
    if (h2hRaw?.error) h2hRaw = null
  } catch {
    h2hRaw = null
  }
  const h2hSum = summarizeH2H(h2hRaw, pick.matchTime, pick.home.name)
  if (h2hSum) d.h2h = h2hSum

  // 지난 시즌 성적 — 시즌 초 데이터 공백을 메우는 핵심 재료
  //
  // 팀 ID 는 보통 로고 URL 에서 뽑는데, pick_recommendations 의 로고가
  // 비어 있거나 형식이 다르면 실패해서 지난 시즌 통계가 통째로 빈다.
  // h2h 응답이 팀 ID 를 들고 있으므로 그걸 대체로 쓴다.
  const hid = teamIdFromLogo(pick.home.logo) || h2hRaw?.homeTeamId || null
  const aid = teamIdFromLogo(pick.away.logo) || h2hRaw?.awayTeamId || null
  const homeEnOriginal = pick.home.name
  const awayEnOriginal = pick.away.name

  // 영문 팀명이면 한글로 바꾼다 (과거 모드)
  if (/^[A-Za-z0-9 .'&-]+$/.test(d.home.name)) {
    d.home.name = await koTeamName(base, hid, d.home.name)
    d.away.name = await koTeamName(base, aid, d.away.name)
    if (pick.pickSide === 'HOME') d.pick.team = d.home.name
    else if (pick.pickSide === 'AWAY') d.pick.team = d.away.name
  }

  const [hs, as_] = await Promise.all([
    lastSeasonStats(base, hid, code, LAST_SEASON),
    lastSeasonStats(base, aid, code, LAST_SEASON),
  ])
  const noRecord = []
  const useHs = hs?.해당시즌_이_리그_기록없음 ? null : hs
  const useAs = as_?.해당시즌_이_리그_기록없음 ? null : as_
  if (hs?.해당시즌_이_리그_기록없음) noRecord.push(pick.home.name)
  if (as_?.해당시즌_이_리그_기록없음) noRecord.push(pick.away.name)

  if (useHs || useAs) {
    d.지난시즌 = { 시즌: LAST_SEASON, home: useHs, away: useAs }
  }
  // "지난 시즌 이 리그에 없었다" 는 그 자체로 쓸 만한 사실이다.
  // 승격팀인지 다른 리그였는지까지는 우리 데이터로 모르므로 거기까지만 말한다.
  if (noRecord.length) {
    d.지난시즌_이_리그_기록없음 = noRecord
  }

  // 같은 경기 블로그 프리뷰.
  // ⚠ 슬러그는 영문 팀명으로 만들어지므로 **한글 변환 전 원본**을 넘겨야 한다.
  const blog = await findBlogPreview(base, homeEnOriginal, awayEnOriginal, code, pick.matchTime)
  if (blog?.찾지못함) {
    d._블로그_진단 = blog   // LLM 에게 주는 게 아니라 사람이 보는 용도
  } else if (blog) {
    d.블로그_프리뷰 = blog
  }

  // 시장 흐름 — 원본이 아니라 요약본을 넣는다 (위 summarizeTrend 주석 참고)
  try {
    const trend = await jget(`${base}/api/match-trend?matchId=${encodeURIComponent(pick.matchId)}`)
    const sum = summarizeTrend(trend, pick.probability, pick.pickSide)
    if (sum) d.market = sum
  } catch {
    /* 없어도 된다 */
  }

  // ⚠ 없는 데이터를 명시한다.
  //   비워두면 LLM 이 "3위 팀" 같은 걸 지어낸다. 시즌 초에는 순위·폼이 실제로 없다.
  const missing = []
  if (d.home.rank == null && d.away.rank == null) missing.push('순위·승점 (시즌 초라 집계 전)')
  // h2h 요약이 최근 5경기를 주면 폼이 없는 게 아니다.
  // 예전엔 그걸 안 보고 "폼 0경기" 라고 적어서, 정작 데이터가 있는데도
  // LLM 이 최근 경기 얘기를 못 하게 막고 있었다.
  const h2hForm = Math.min(d.h2h?.home_최근5?.length || 0, d.h2h?.away_최근5?.length || 0)
  const formLen = Math.max(
    Math.min(d.home.form?.length || 0, d.away.form?.length || 0),
    h2hForm
  )
  if (formLen < 3) missing.push(`최근 폼이 ${formLen}경기뿐 (시즌 초)`)
  if (!d.h2h) missing.push('상대 전적')
  if (!d.지난시즌) missing.push('지난 시즌 팀 통계')
  for (const t of d.지난시즌_이_리그_기록없음 || []) {
    missing.push(`${t}의 지난 시즌 이 리그 기록 (그 시즌 이 리그에서 안 뛰었음)`)
  }
  if (!d.블로그_프리뷰) missing.push('블로그 프리뷰 기사')

  if (!d.market) missing.push('시장 흐름')
  d.없는_데이터 = missing

  // 킥오프 이후 정보가 섞였는지 확인 (위 findLeaks 주석 참고)
  const leaks = findLeaks(d)
  if (leaks.length) {
    d._유출경고 = leaks
  }

  return d
}


/**
 * 과거 경기로 도시에를 만든다 (--date=YYYY-MM-DD).
 *
 * 왜 필요한가:
 *   시즌 초에는 순위도 폼도 없고 블로그도 아직 안 올라와서,
 *   원고가 부실할 때 **생성이 문제인지 재료가 없어서인지 구분이 안 된다.**
 *   데이터가 다 갖춰진 과거 경기로 뽑아보면 그게 갈린다.
 *
 * ⚠ 결과(스코어·적중 여부)는 일부러 도시에에 넣지 않는다.
 *   결과를 알고 쓴 원고는 프리뷰가 아니다. 실제 상황을 그대로 재현해야
 *   이 테스트가 의미가 있다.
 */
async function fetchPastPicks(base, date, count) {
  const j = await jget(base + '/api/pick-recommendations?date=' + encodeURIComponent(date))
  const rows = j?.picks || []
  if (!rows.length) return null

  const EURO = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'DED', 'PPL', 'CL', 'EL', 'UECL']
  const pct = (v) => {
    if (v == null) return 0
    const n = Number(v)
    return Math.round(n <= 1 ? n * 100 : n)
  }

  // shorts-daily 와 같은 기준으로 고른다.
  // 다른 기준으로 뽑으면 이 테스트 결과를 실제 운영에 대입할 수 없다.
  const usable = rows
    .filter((r) => EURO.includes(r.league_code) && r.pick_result && r.pick_probability != null)
    .map((r) => ({ r, prob: pct(r.pick_probability) }))
    .filter((x) => x.prob >= 60)
    .sort((a, b) => b.prob - a.prob)

  const perLeague = {}
  const picked = []
  for (const x of usable) {
    if (picked.length >= count) break
    const used = perLeague[x.r.league_code] || 0
    if (used >= 2) continue
    perLeague[x.r.league_code] = used + 1
    picked.push(x)
  }

  return picked.map(({ r, prob }) => {
    const side = String(r.pick_result).toUpperCase()
    return {
      matchId: r.match_id,
      league: r.league_code,
      leagueLabel: LEAGUE_LABEL[r.league_code] || r.league_code,
      leagueLogo: '',
      matchTime: r.commence_time,
      home: { name: r.home_team, logo: r.home_team_logo || '', position: null, points: null, form: [] },
      away: { name: r.away_team, logo: r.away_team_logo || '', position: null, points: null, form: [] },
      pickSide: side,
      pickTeam: side === 'HOME' ? r.home_team : side === 'AWAY' ? r.away_team : '무승부',
      probability: prob,
      odds3: null,
      stars: prob >= 75 ? 5 : prob >= 68 ? 4 : 3,
      // 결과는 의도적으로 뺀다 (위 주석 참고)
    }
  })
}

const LEAGUE_LABEL = {
  PL: '프리미어리그', PD: '라리가', SA: '세리에A', BL1: '분데스리가',
  FL1: '리그1', DED: '에레디비시', PPL: '프리메이라리가',
  CL: '챔피언스리그', EL: '유로파리그', UECL: '컨퍼런스리그',
}


/**
 * 최종 유출 검사.
 *
 * 프리뷰 원고에 경기 결과가 들어가면 안 된다.
 * h2h 가 그 경기를 상대전적에 넣어 돌려주는 걸 한 번 놓친 적이 있어서,
 * 개별 API 를 믿지 않고 완성된 도시에를 통째로 다시 훑는다.
 *
 * 킥오프 이후 날짜가 도시에 안에 남아 있으면 뭔가 잘못된 것이다.
 */
function findLeaks(dossier) {
  const cut = new Date(dossier.kickoff).getTime()
  if (!Number.isFinite(cut)) return []

  const leaks = []
  const walk = (node, path) => {
    if (node == null) return
    if (typeof node === 'string') {
      // ISO 날짜나 YYYY-MM-DD 형태를 찾아 킥오프와 비교
      const m = node.match(/\d{4}-\d{2}-\d{2}/g) || []
      for (const dstr of m) {
        const t = new Date(dstr + 'T23:59:59Z').getTime()
        if (t >= cut) leaks.push(`${path}: ${node.slice(0, 60)}`)
      }
      return
    }
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`))
      return
    }
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (k === 'kickoff') continue          // 킥오프 자체는 당연히 있어야 한다
        if (k.startsWith('_')) continue        // 진단 필드는 LLM 에 안 간다
        walk(v, path ? `${path}.${k}` : k)
      }
    }
  }
  walk(dossier, '')
  return [...new Set(leaks)]
}

// ── LLM ──────────────────────────────────────────────────

const buildSystem = (voice) => [
  '유튜브 축구 프리뷰 영상의 나레이션 원고를 쓴다.',
  '이 원고는 한국어 TTS 로 읽히고 자막으로도 노출된다.',
  '',
  '## 네가 어떤 사람인지',
  '',
  (PERSONAS[voice] || PERSONAS.analyst).block,
  '',
  '## 공통 — 숫자를 낭독하지 마라',
  '',
  '어떤 문체로 쓰든 이건 같다.',
  '숫자는 주장을 뒷받침하는 근거지 그 자체가 내용이 아니다.',
  '',
  '나쁜 원고: "맨시티는 지난 시즌 홈에서 14승 3무 2패를 기록했습니다."',
  '좋은 원고: "맨시티 홈에서 이기려면 일단 한 골은 넣어야 합니다.',
  '           지난 시즌 홈 19경기 중 9번이 무실점이었거든요."',
  '',
  '두 번째는 **그 숫자가 무슨 의미인지**를 말한다. 항상 그렇게 써라.',
  '',
  '## 선수 이름을 쓰지 마라',
  '',
  '이 파이프라인은 **팀 단위 데이터만** 다룬다. 선수 데이터는 일부러 넣지 않았다.',
  '이적으로 소속이 바뀌면 확인할 방법이 없고, 틀린 이름 하나면 신뢰가 끝나기 때문이다.',
  '',
  '네가 학습으로 아는 선수라도 이름을 꺼내지 마라. 감독 이름도 마찬가지다.',
  '지금 그 팀에 있는지 우리는 알 수 없다.',
  '',
  '대신 **팀을 주인공으로 써라.** 축구 콘텐츠는 사람 이름 없이도 성립한다.',
  '"이 팀은 홈에서 다른 팀이 된다", "원정만 가면 골이 막힌다" 같은',
  '팀의 성격이 곧 캐릭터다.',
  '',
  '## 전술을 말해라',
  '',
  '포메이션 이 있으면 그 팀이 어떤 축구를 하는지 한 마디 붙여라.',
  '득점시간대 / 실점시간대 가 한쪽에 몰려 있으면 그건 경기 운영의 특징이다.',
  '후반에 골이 몰리는 팀, 초반에 실점이 많은 팀 — 이런 게 볼거리를 만든다.',
  '',
  '다만 데이터에 없는 전술은 지어내지 마라.',
  '포메이션 숫자와 시간대 분포에서 읽히는 것까지만 말해라.',
  '"높은 라인을 쓴다", "역습이 강하다" 같은 건 우리 데이터로 알 수 없다.',
  '',
  '## 절대 규칙',
  '',
  '1. **주어진 데이터에 없는 내용을 쓰지 마라.**',
  '   감독 발언, 이적 소문, 날씨, 관중 — 데이터에 없으면 존재하지 않는다.',
  '   선수 이름과 감독 이름은 아예 쓰지 마라 (아래 참고).',
  '',
  '2. **숫자에는 기준을 붙여라.** "적중률 72%" 가 아니라',
  '   "유럽 6개 리그 696경기 기준 72%" 로 써라.',
  '',
  '3. **금지어**: 베팅, 배팅, 토토, 스포츠토토, 배당률, 수익, 적중 시, 픽스터, 환급',
  '   "배당" 대신 "시장" 을 써라. 수익화 심사에 걸린다.',
  '',
  '4. **단정하지 마라.** "무조건", "확실히", "이변은 없다" 금지.',
  '',
  '## counter 는 진짜 반론이어야 한다',
  '',
  '**이게 이 원고에서 가장 중요하고, 가장 자주 실패하는 부분이다.**',
  '',
  'counter 는 "우리 픽이 틀릴 수 있는 이유" 다. 반드시 우리 픽에 불리한 내용이어야 한다.',
  '',
  '흔한 실패 — 시장 격차를 그냥 되풀이하는 것:',
  '  "시장은 80%로 보는데 우리는 74%입니다. 시장이 더 확신합니다."',
  '  → 이건 반론이 아니다. 시장이 우리보다 이 팀을 **더 높게** 본다는 건',
  '     오히려 우리 픽을 지지하는 정보다. 이런 문장을 counter 에 넣지 마라.',
  '',
  '시장이 우리보다 확신이 큰 경기라면, counter 는 다른 데서 찾아라.',
  '상대 팀이 잘하는 것, 우리 픽 팀의 약점, 표본의 한계 같은 실제 위험 요인이어야 한다.',
  '',
  '좋은 반론의 예:',
  '  "다만 로리앙은 지난 시즌 홈에서 8승을 거뒀습니다. 문제는 원정이었죠."',
  '  "레버쿠젠은 지난 시즌 홈에서도 4번 졌습니다. 홈이라고 안심할 팀은 아닙니다."',
  '',
  '반론에는 **숫자가 최소 하나** 들어가야 한다. 없으면 그건 반론인 척하는 문장이다.',
  '',
  '## 가장 강한 재료 — 우리 모델과 시장의 격차',
  '',
  'market 의 우리_시장_격차_퍼센트포인트 는 이 채널만 할 수 있는 얘기다.',
  '',
  '- **양수**면 우리가 시장보다 이 팀을 높게 본다 → evidence 의 핵심 소재.',
  '  "시장은 65%로 보는데 우리 모델은 71%를 줍니다. 그 차이는 …에서 옵니다."',
  '  차이가 **어디서 오는지**를 지난 시즌 데이터로 설명해라. 격차만 말하면 의미가 없다.',
  '',
  '- **음수**면 시장이 더 확신한다는 뜻이다. evidence 로도 counter 로도 쓰지 말고,',
  '  matchup 이나 caveat 에서 "우리 모델은 보수적으로 봤다" 정도로만 짧게 언급해라.',
  '',
  '## 지난 시즌 데이터 쓰는 법',
  '',
  '시즌 초라 올 시즌 표본이 1~2경기뿐이다. 그래서 지난시즌 항목을 준다.',
  '**반드시 "지난 시즌" 이라고 못박아라.** 안 그러면 올 시즌 얘기로 읽힌다.',
  '',
  '## ⚠ 우리가 뭘 모르는지 설명하지 마라',
  '',
  '데이터가 없는 항목은 **그냥 말을 안 하면 된다.** 없다고 말하지 마라.',
  '',
  '실제로 이런 문장이 나온 적이 있다:',
  '  "이적 시장은 우리 데이터에 없거든요."',
  '  "올 시즌 데이터가 2경기뿐이라 반영되지 않았습니다."',
  '',
  '시청자는 우리 데이터 파이프라인 사정에 관심이 없다.',
  '이건 겸손이 아니라 변명처럼 들리고, 원고를 급하게 쓴 티만 난다.',
  '',
  '- 금지: "우리 데이터에 없습니다", "반영되지 않았습니다", "확인할 수 없습니다"',
  '- 금지: "표본이 적어서", "데이터가 부족해서" 같은 자기 변명',
  '',
  '경기 자체의 불확실성을 말하는 건 좋다. 우리 도구의 한계를 말하는 게 나쁜 것이다.',
  '  좋음: "시즌 두 경기째라 아직 이 팀의 색깔이 다 드러나지 않았습니다."',
  '  나쁨: "올 시즌 표본이 2경기뿐이라 우리 모델이 반영하지 못했습니다."',
  '',
  '앞은 경기 얘기고 뒤는 우리 얘기다. 영상은 경기를 다루는 것이다.',
  '',
  '## 지난 시즌 그 리그에 없던 팀',
  '',
  '지난시즌_이_리그_기록없음 에 있는 팀은 그 시즌 이 리그에서 안 뛰었다.',
  '성적이 0 인 게 아니다. 그 팀의 지난 시즌 수치는 하나도 인용하지 마라.',
  '',
  '이 사실 자체는 좋은 소재다. 다만 승격인지 강등 후 복귀인지는 우리 데이터로 모르니',
  '"지난 시즌 이 리그에 없었다" 까지만 말하고 이유는 추측하지 마라.',
  '어색하게 한 문장 끼워넣지 말고, 자연스럽게 맥락으로 녹여라.',
  '',
  '## 블로그 프리뷰 — 전술 얘기는 여기서 나온다',
  '',
  '블로그_프리뷰.섹션 에 전술포인트 와 승부처 가 들어 있다.',
  '**구조화된 데이터로는 절대 쓸 수 없는 내용이 여기 있다.**',
  '숫자만으로는 "누가 어떻게 이기려 하는가" 를 말할 수 없기 때문이다.',
  '',
  '전술포인트 는 evidence 와 matchup 의 재료다.',
  '승부처 는 counter 와 caveat 의 재료다. 경기가 갈리는 지점이 곧 우리 픽이 틀릴 지점이다.',
  '',
  '**세 가지를 지켜라.**',
  '',
  '1. 문장을 그대로 옮기지 마라. 글로 읽는 것과 귀로 듣는 건 다르다.',
  '   블로그가 세 문단으로 설명한 걸 한 문장으로 줄이는 게 네 일이다.',
  '',
  '2. **블로그에 선수 이름이 나와도 원고에는 쓰지 마라.**',
  '   그 기사는 과거 시점에 쓰였고 이적으로 소속이 바뀌었을 수 있다.',
  '',
  '3. 숫자는 블로그가 아니라 구조화된 데이터가 기준이다. 둘이 다르면 데이터가 맞다.',
  '   블로그의 자체 지표(파워지수 등)는 시청자가 모르는 개념이라 쓰지 마라.',
  '',
  '## 없는 데이터',
  '',
  '없는_데이터 배열에 적힌 항목은 존재하지 않는다.',
  '"순위" 가 있으면 순위·상위권·중위권 전부 금지다.',
  '"최근 폼이 N경기뿐" 이면 그 N경기까지만 말해라.',
  '',
  '적은 데이터로 정직하게 쓰는 게 많은 척 꾸미는 것보다 낫다.',
  '',
  '## 채널·사이트 정보 — 이것만 쓴다',
  '',
  '채널/사이트 이름: TrendSoccer (트렌드사커)',
  '주소: trendsoccer.com',
  '',
  '**다른 이름을 지어내지 마라.** 실제로 "벳로그" 같은 없는 브랜드를 만들어낸 적이 있다.',
  '"벳", "베팅" 이 들어간 이름은 특히 위험하다. 우리 채널 성격과 정반대다.',
  'cta 에는 반드시 위 이름과 주소만 쓴다.',
  '',
  '## 말투 — 하나로 통일해라',
  '',
  '**전부 존댓말(합니다체)로 쓴다.** 예외 없다.',
  '',
  '실제로 한 원고 안에서 이렇게 섞인 적이 있다:',
  '  "바르셀로나가 라요를 맞는다" (반말) → "72%입니다" (존댓말) → "10패를 당했다" (반말)',
  'TTS 로 읽으면 이게 가장 어색하다. 사람이 읽어도 원고를 급하게 쓴 티가 난다.',
  '',
  '- 문장은 "~습니다", "~입니다", "~죠", "~거든요", "~네요" 로 끝낸다.',
  '- "~다", "~했다", "~이다", "~는다" 로 끝내지 마라.',
  '- hook 부터 cta 까지 전부 같은 말투다. 훅만 반말로 쓰지 마라.',
  '',
  '## 팀 이름 표기를 통일해라',
  '',
  '한 원고 안에서 "바르셀로나" 와 "바르사" 를 섞지 마라.',
  '처음에 정한 표기를 끝까지 쓴다.',
  '',
  '## 문체',
  '',
  '- 중계석에서 옆자리 해설위원에게 말하듯. 격앙되지도, 건조하지도 않게.',
  '- 한 문장에 한 정보. TTS 는 긴 문장에서 호흡이 무너진다.',
  '- 문장 길이를 섞어라. 짧은 문장 뒤에 긴 문장을 붙이면 리듬이 산다.',
  '- 인사말 금지. 바로 내용으로.',
  '- 팀명은 짧게 (맨체스터 시티 → 맨시티).',
  '- 세 경기의 문장 구조가 서로 달라야 한다. 같은 틀을 반복하면 티가 난다.',
  '',
  '## 분량 — 반드시 지켜라',
  '',
  '한국어 TTS 는 초당 약 4.3자를 읽는다. 글자 수가 어긋나면 자막 타이밍이 무너진다.',
  '괄호 안 글자 수를 넘기지도, 모자라지도 마라.',
  '',
  '## 출력',
  '',
  '아래 JSON 만 출력해라. 설명이나 코드펜스 금지.',
  '',
  '{',
  '  "hook": "가장 흥미로운 경기의 결론을 먼저 던진다 (60~70자)",',
  '  "credibility": "누적 성적과 기준 (85~95자)",',
  '  "matches": [',
  '    {',
  '      "matchup": "이 경기가 왜 볼 만한지. 선수 이름이 들어가면 좋다 (40~48자)",',
  '      "evidence": "우리 픽의 가장 강한 근거. 숫자의 의미를 풀어서 (63~72자)",',
  '      "counter": "우리 픽이 틀릴 수 있는 이유. 숫자 필수 (63~72자)",',
  '      "verdict": "우리 픽과 확률 (40~48자)",',
  '      "caveat": "이 예측이 틀어질 **경기 안에서의** 조건. 데이터 부족 얘기 금지 (40~48자)"',
  '    }',
  '  ],',
  '  "summary": "세 경기를 묶어 정리 (150~165자)",',
  '  "cta": "사이트 안내 (85~95자)"',
  '}',
].join('\n')

function userPrompt(payload) {
  const cum = payload.cumulative
    ? payload.cumulative.decisive +
      '경기 기준 승패 예측 적중률 ' +
      payload.cumulative.accuracy +
      '% (무승부 제외 · ' +
      payload.groupLabel +
      ')'
    : '누적 성적 데이터 없음 — credibility 에서 성적을 언급하지 말고 분석 방식만 짧게 소개해라'

  // 백틱을 피해 배열로 조립한다.
  // 프롬프트 안에 코드 식별자를 백틱으로 감싸고 싶어질 때가 많은데,
  // 템플릿 리터럴 안이면 그때마다 문자열이 깨진다.
  return [
    '아래는 ' + payload.groupLabel + ' 경기 중 우리 모델이 고른 ' + payload.dossiers.length + '경기다.',
    '',
    '## 우리 모델의 누적 성적',
    cum,
    '',
    '## 오늘 분석한 전체 경기 수',
    payload.totalMatches + '경기 중 ' + payload.dossiers.length + '경기가 기준을 통과',
    '',
    '## 경기별 데이터',
    JSON.stringify(payload.dossiers, null, 2),
    '',
    '---',
    '',
    '위 데이터만 써서 JSON 을 만들어라.',
    '',
    '- form: 최근 경기 결과. W=승 D=무 L=패, 맨 뒤가 가장 최근.',
    '- distribution: 우리 모델의 홈승/무승부/원정승 확률.',
    '- market: 시장 흐름 요약. 우리_시장_격차_퍼센트포인트 를 최우선 소재로 써라.',
    '- 지난시즌: 지난 시즌 팀 통계. 반드시 "지난 시즌" 이라고 밝히고 써라.',
    '  포메이션 / 득점시간대 / 실점시간대 가 전술 소재다.',
    '- 블로그_프리뷰.섹션.전술포인트 / .승부처: 데이터에 없는 전술 맥락. 적극 활용하되 문장은 새로 지어라.',
    '- 없는_데이터: 여기 적힌 건 존재하지 않는다. 언급 금지.',
    '',
    'rank 가 null 이면 순위를 한 글자도 쓰지 마라.',
  ].join('\n')
}

async function callAnthropic(payload, system, user) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.SCRIPT_MODEL || 'claude-sonnet-4-5',
      max_tokens: 4000,
      system: system || buildSystem(VOICE),
      messages: [{ role: 'user', content: user || userPrompt(payload) }],
    }),
  })
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const j = await r.json()
  return j.content?.[0]?.text || ''
}

async function callOpenAI(payload, system, user) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.SCRIPT_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: system || buildSystem(VOICE) },
        { role: 'user', content: user || userPrompt(payload) },
      ],
      response_format: { type: 'json_object' },
    }),
  })
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const j = await r.json()
  return j.choices?.[0]?.message?.content || ''
}

// ── 검증 ─────────────────────────────────────────────────

const BANNED = ['베팅', '배팅', '토토', '배당률', '수익', '적중 시', '픽스터', '환급',
                '무조건', '확실합니다', '이변은 없']

/**
 * 생성된 원고를 기계적으로 훑는다.
 * 사람 검수 전에 걸러낼 수 있는 것만 본다 — 내용의 옳고 그름은 사람이 봐야 한다.
 */
function lint(script) {
  const problems = []
  const seg = (s) => (s || '').length

  const all = JSON.stringify(script)
  for (const w of BANNED) {
    if (all.includes(w)) problems.push(`금지어 "${w}" 포함`)
  }

  // 분량 — TTS 초당 4.3자 기준에서 크게 벗어나면 타이밍이 무너진다
  const check = (label, text, lo, hi) => {
    const n = seg(text)
    if (n < lo) problems.push(`${label} 너무 짧음 (${n}자, 목표 ${lo}~${hi})`)
    if (n > hi) problems.push(`${label} 너무 김 (${n}자, 목표 ${lo}~${hi})`)
  }

  check('hook', script.hook, 50, 85)
  check('credibility', script.credibility, 70, 110)
  check('summary', script.summary, 130, 180)
  check('cta', script.cta, 70, 110)

  script.matches?.forEach((m, i) => {
    check(`경기${i + 1}.matchup`, m.matchup, 32, 55)
    check(`경기${i + 1}.evidence`, m.evidence, 52, 80)
    check(`경기${i + 1}.counter`, m.counter, 52, 80)
    check(`경기${i + 1}.verdict`, m.verdict, 32, 55)
    check(`경기${i + 1}.caveat`, m.caveat, 32, 55)
  })

  // 반론이 실제 반론인지 최소한의 검사.
  // 데이터를 안 쓰고 관용구로 때운 문장을 잡는다.
  script.matches?.forEach((m, i) => {
    const c = m.counter || ''

    // 반론에 숫자가 없으면 근거 없는 문장이다
    if (!/\d/.test(c)) {
      problems.push(`경기${i + 1} 반론에 숫자가 없습니다 — 근거 없는 반론입니다`)
    }

    // 시장 격차를 되풀이한 가짜 반론.
    // "시장이 더 확신한다" 는 우리 픽에 불리한 정보가 아니라 유리한 정보다.
    if (/시장/.test(c) && /(더 확신|높게|높습니다|높은)/.test(c)) {
      problems.push(
        `경기${i + 1} 반론이 시장 격차 되풀이입니다 — 우리 픽이 틀릴 이유가 아닙니다`
      )
    }
  })

  // ── 말투 검사 ──────────────────────────────────────
  // 반말과 존댓말이 섞이면 TTS 로 읽었을 때 가장 어색하다.
  // "~다." 로 끝나되 "~니다." 가 아닌 문장을 반말로 본다.
  const allSegments = [
    ['hook', script.hook],
    ['credibility', script.credibility],
    ['summary', script.summary],
    ['cta', script.cta],
    ...(script.matches || []).flatMap((m, i) => [
      [`경기${i + 1}.matchup`, m.matchup],
      [`경기${i + 1}.evidence`, m.evidence],
      [`경기${i + 1}.counter`, m.counter],
      [`경기${i + 1}.verdict`, m.verdict],
      [`경기${i + 1}.caveat`, m.caveat],
    ]),
  ]

  for (const [label, text] of allSegments) {
    if (!text) continue
    for (const sent of String(text).split(/(?<=[.!?])\s+/)) {
      const t = sent.trim()
      if (!t) continue
      // 존댓말 종결: ~니다 / ~요 / ~죠 / ~네요 / ~까요
      const polite = /(니다|요|죠)[.!?]?$/.test(t)
      // 반말 종결: ~다 로 끝나는데 ~니다 가 아닌 경우
      const plain = /(?<!니)다[.!?]?$/.test(t)
      if (plain && !polite) {
        problems.push(`${label} 반말 종결: "${t.slice(-18)}"`)
        break
      }
    }
  }

  // ── 자기 변명 검사 ─────────────────────────────────
  // "우리 데이터에 없거든요" 같은 문장은 시청자에게 아무 의미가 없다.
  // 모르는 건 그냥 말을 안 하면 되는데, 없다고 굳이 말하면 변명처럼 들린다.
  const EXCUSES = [
    '데이터에 없',
    '데이터가 없',
    '데이터가 부족',
    '반영되지 않',
    '반영하지 못',
    '표본이 적',
    '표본이 부족',
    '확인할 수 없',
    '알 수 없습니다',
    '정보가 없',
  ]
  for (const [label, text] of allSegments) {
    if (!text) continue
    const hit = EXCUSES.find((e) => String(text).includes(e))
    if (hit) {
      problems.push(`${label} 자기 변명 문구: "${hit}…" — 모르는 건 그냥 말하지 않으면 됩니다`)
    }
  }

  // ── 지어낸 브랜드 검사 ─────────────────────────────
  // 실제로 "벳로그" 라는 없는 이름을 만들어낸 적이 있다.
  const cta = script.cta || ''
  if (cta && !/trendsoccer|트렌드사커/i.test(cta)) {
    problems.push('cta 에 사이트 이름(TrendSoccer / trendsoccer.com)이 없습니다 — 브랜드를 지어냈을 수 있습니다')
  }
  if (/벳|베팅|bet/i.test(all)) {
    problems.push('원고에 "벳/베팅" 이 들어갔습니다 — 채널 성격과 반대이고 수익화에도 걸립니다')
  }

  // 선수 이름이 한 명도 안 나오면 해설이 아니라 통계 낭독이다
  const body = [
    script.hook,
    ...(script.matches || []).flatMap((m) => [m.matchup, m.evidence, m.counter]),
  ].join(' ')
  if (!/[가-힣]{2,}\s*(선수|가|이)\s|[A-Z][a-z]+/.test(body)) {
    // 느슨한 검사라 참고용으로만 남긴다
  }

  // 세 경기가 같은 문장 구조면 템플릿 티가 난다
  if (script.matches?.length >= 2) {
    const heads = script.matches.map((m) => (m.matchup || '').slice(0, 6))
    if (new Set(heads).size === 1) problems.push('경기 도입부가 전부 같은 문구로 시작합니다')
  }

  return problems
}

// ── 검수용 텍스트 ────────────────────────────────────────
/**
 * 원고 위에 "무슨 재료로 썼는지" 를 붙인다.
 *
 * 원고만 보면 전술 얘기가 없을 때 그게 LLM 이 안 쓴 건지
 * 애초에 재료가 없었던 건지 알 수가 없다. 매번 도시에 파일을 따로 열어야 했다.
 * 검수는 한 파일 안에서 끝나야 한다.
 */
function materialsSummary(dossiers) {
  const L = ['━━━━━━━━━━ 이 원고가 쓴 재료 ━━━━━━━━━━', '']
  for (const d of dossiers || []) {
    L.push(`· ${d.home?.name} vs ${d.away?.name}`)
    const has = []
    const no = []
    ;(d.블로그_프리뷰?.섹션?.전술포인트 ? has : no).push('블로그 전술포인트')
    ;(d.블로그_프리뷰?.섹션?.승부처 ? has : no).push('블로그 승부처')
    ;(d.h2h ? has : no).push('상대전적')
    ;(d.지난시즌 ? has : no).push('지난시즌 통계')
    ;(d.지난시즌?.home?.포메이션?.length ? has : no).push('포메이션')
    ;(d.지난시즌?.home?.득점시간대 ? has : no).push('시간대별 득점')
    ;(d.market ? has : no).push('시장 흐름')
    L.push(`   있음: ${has.join(', ') || '없음'}`)
    L.push(`   없음: ${no.join(', ') || '없음'}`)
    if (d._블로그_진단) {
      L.push(`   ⚠ 블로그 못 찾음 — 시도한 슬러그: ${(d._블로그_진단.시도한_슬러그 || []).join(', ')}`)
    }
  }
  L.push('')
  L.push('"없음" 항목은 원고에 안 나오는 게 정상입니다.')
  L.push('"있음" 인데 원고에 안 쓰였다면 프롬프트 문제입니다.')
  L.push('')
  return L.join('\n')
}

function toReadable(script, meta) {
  const dur = (t) => `${Math.round((t || '').length / 4.3)}초`
  const L = []
  L.push(`${meta.date} · ${meta.groupLabel} · ${script.matches.length}경기 · ${meta.voiceLabel}`)
  L.push(`예상 길이 약 ${Math.round(
    ([script.hook, script.credibility, script.summary, script.cta].join('').length +
      script.matches.reduce(
        (a, m) => a + [m.matchup, m.evidence, m.counter, m.verdict, m.caveat].join('').length,
        0
      )) / 4.3 / 60 * 10
  ) / 10}분`)
  L.push('')
  L.push('※ 반드시 소리 내어 읽어보세요. 눈으로 괜찮던 문장이 TTS 에서 무너집니다.')
  L.push('')
  if (meta.problems?.length) {
    L.push('━━━━━━━━━━ ⚠ 기계 검사에서 걸린 것 ━━━━━━━━━━')
    L.push('')
    for (const p of meta.problems) L.push(`  · ${p}`)
    L.push('')
  }
  if (meta.materials) {
    L.push(meta.materials)
  }
  L.push('━━━━━━━━━━ 훅 ━━━━━━━━━━ ' + dur(script.hook))
  L.push(script.hook)
  L.push('')
  L.push('━━━━━━━━━━ 신뢰 ━━━━━━━━━━ ' + dur(script.credibility))
  L.push(script.credibility)
  L.push('')
  script.matches.forEach((m, i) => {
    L.push(`━━━━━━━━━━ 경기 ${i + 1} ━━━━━━━━━━`)
    L.push(`[매치업 ${dur(m.matchup)}]  ${m.matchup}`)
    L.push('')
    L.push(`[근거 ${dur(m.evidence)}]  ${m.evidence}`)
    L.push('')
    L.push(`[반론 ${dur(m.counter)}]  ${m.counter}`)
    L.push('')
    L.push(`[결론 ${dur(m.verdict)}]  ${m.verdict}`)
    L.push('')
    L.push(`[단서 ${dur(m.caveat)}]  ${m.caveat}`)
    L.push('')
  })
  L.push('━━━━━━━━━━ 정리 ━━━━━━━━━━ ' + dur(script.summary))
  L.push(script.summary)
  L.push('')
  L.push('━━━━━━━━━━ CTA ━━━━━━━━━━ ' + dur(script.cta))
  L.push(script.cta)
  L.push('')
  return '﻿' + L.join('\n')
}


// ══════════════════════════════════════════════════════════
// 블로그 → 나레이션 변환 모드
//
// 왜 이쪽이 나은가:
//   블로그는 이미 검수를 거쳐 발행된 완성 분석이다.
//   데이터를 여러 API 에서 긁어모아 같은 걸 다시 만들 이유가 없다.
//   h2h 결과 유출, 팀 ID 폴백, 슬러그 매칭 —
//   전부 블로그를 안 쓰려다 생긴 문제였다.
//
//   그리고 일이 **생성**에서 **변환**으로 바뀐다.
//   "데이터로 분석을 써라" 보다 "이 기사를 말로 바꿔라" 가 훨씬 안정적이다.
// ══════════════════════════════════════════════════════════

/** 해당 날짜에 발행된 프리뷰 글들을 가져온다 */
async function fetchBlogPreviews(base, date, count) {
  const j = await jget(base + '/api/blog/posts?category=preview&limit=100')
  const posts = j?.posts || j?.data || (Array.isArray(j) ? j : [])
  if (!Array.isArray(posts) || !posts.length) return []

  const ymd = String(date).replace(/-/g, '')
  // 슬러그 끝의 날짜로 그날 글만 추린다
  let pool = posts.filter((p) => String(p.slug || '').endsWith(ymd))
  if (!pool.length) {
    // 날짜가 안 맞으면 최신 글부터 (슬러그 규칙이 바뀐 경우 대비)
    pool = posts
  }

  const out = []
  for (const p of pool.slice(0, count)) {
    try {
      const full = await jget(base + '/api/blog/post/' + encodeURIComponent(p.slug))
      const post = full?.post || full
      const body = post?.content || ''
      if (!body) continue
      out.push({
        슬러그: p.slug,
        제목: post.title_kr || post.title || p.title_kr || p.title,
        섹션: splitAllSections(body),
      })
    } catch {
      /* 한 편 실패해도 나머지는 간다 */
    }
    if (out.length >= count) break
  }
  return out
}

const BLOG_SYSTEM = [
  '너는 축구 콘텐츠 편집자다. **이미 발행된 프리뷰 기사를 영상 나레이션으로 바꾼다.**',
  '',
  '## 이건 창작이 아니라 변환이다',
  '',
  '기사에 있는 내용만 쓴다. 없는 걸 채워 넣지 마라.',
  '기사가 다루지 않은 경기, 기사에 없는 수치, 기사에 없는 판단 — 전부 금지다.',
  '',
  '네가 할 일은 **글로 읽을 것을 귀로 들을 것으로 바꾸는 것**이다.',
  '- 긴 문단을 짧은 문장으로 쪼갠다',
  '- 표와 목록을 말로 푼다 ("경기당 1.57골 대 1.14골" → "경기당 득점이 1.6골과 1.1골로 갈립니다")',
  '- 눈으로 훑는 순서를 귀로 듣는 순서로 다시 짠다',
  '',
  '## 순서를 바꿔라',
  '',
  '기사는 배경부터 시작해도 되지만 영상은 아니다. 앞 15초에서 이탈이 갈린다.',
  '기사에서 **가장 흥미로운 지점을 찾아 맨 앞으로** 끌어와라.',
  '보통 예측 근거나 승부처에 있다. 인트로를 그대로 옮기지 마라.',
  '',
  '## 선수 이름은 쓰지 마라',
  '',
  '기사에 선수 이름이 나와도 나레이션에는 넣지 않는다. 감독 이름도 마찬가지다.',
  '이적으로 소속이 바뀌었을 수 있고 영상에서 확인할 방법이 없다.',
  '팀을 주인공으로 써라.',
  '',
  '## 문장을 그대로 옮기지 마라',
  '',
  '읽는 글과 듣는 말은 다르다. 같은 내용을 말로 다시 지어라.',
  '기사 문장을 복사하면 문어체가 그대로 남아 TTS 에서 어색해진다.',
  '',
  '## 말투',
  '',
  '**전부 존댓말(합니다체)로 통일한다.** 반말과 섞지 마라.',
  '"~습니다", "~입니다", "~죠", "~거든요" 로 끝낸다.',
  '"~다", "~했다", "~이다" 로 끝내지 마라. hook 부터 cta 까지 같은 말투다.',
  '',
  '한 문장에 한 정보. 문장 길이를 섞어라. 인사말 금지.',
  '팀 이름 표기는 한 원고 안에서 통일한다.',
  '',
  '## 금지어',
  '',
  '베팅, 배팅, 토토, 스포츠토토, 배당률, 수익, 적중 시, 픽스터, 환급.',
  '"배당" 대신 "시장" 을 쓴다. 수익화 심사에 걸린다.',
  '"무조건", "확실히", "이변은 없다" 같은 단정도 금지다.',
  '',
  '## 채널 정보',
  '',
  '이름: TrendSoccer (트렌드사커) · 주소: trendsoccer.com',
  '**다른 이름을 지어내지 마라.** cta 에는 이 이름과 주소만 쓴다.',
  '',
  '## 우리가 뭘 모르는지 설명하지 마라',
  '',
  '"데이터가 없습니다", "반영되지 않았습니다", "표본이 적어서" 같은 문장 금지.',
  '기사에 없는 내용은 그냥 말을 안 하면 된다.',
  '',
  '## counter 는 진짜 반론이어야 한다',
  '',
  'counter 는 우리 예측이 틀릴 수 있는 이유다. 기사의 승부처 섹션에서 찾아라.',
  '경기가 갈리는 지점이 곧 우리가 틀릴 지점이다.',
  '반론에는 숫자가 최소 하나 들어가야 한다.',
  '',
  '## 분량',
  '',
  '한국어 TTS 는 초당 약 4.3자를 읽는다. 괄호 안 글자 수를 지켜라.',
  '',
  '## 출력',
  '',
  '아래 JSON 만 출력해라. 설명이나 코드펜스 금지.',
  '',
  '{',
  '  "hook": "가장 흥미로운 지점을 먼저 던진다 (60~70자)",',
  '  "credibility": "누적 성적과 기준 (85~95자)",',
  '  "matches": [',
  '    {',
  '      "matchup": "이 경기가 왜 볼 만한지 (40~48자)",',
  '      "evidence": "예측의 가장 강한 근거 (63~72자)",',
  '      "counter": "틀릴 수 있는 이유. 숫자 필수 (63~72자)",',
  '      "verdict": "예측과 확률 (40~48자)",',
  '      "caveat": "경기 안에서 이게 틀어질 조건 (40~48자)"',
  '    }',
  '  ],',
  '  "summary": "전체를 묶어 정리 (150~165자)",',
  '  "cta": "사이트 안내 (85~95자)"',
  '}',
].join('\n')

function blogUserPrompt(articles, cumulative, markets) {
  const L = [
    `아래는 우리가 발행한 프리뷰 기사 ${articles.length}편이다. 이걸 영상 나레이션으로 바꿔라.`,
    '',
  ]

  if (cumulative) {
    L.push('## 우리 모델의 누적 성적 (credibility 에 쓴다)')
    L.push(
      `${cumulative.decisive}경기 기준 승패 예측 적중률 ${cumulative.accuracy}% (무승부 제외)`
    )
    L.push('')
  }

  articles.forEach((a, i) => {
    L.push(`## [기사 ${i + 1}] ${a.제목}`)
    for (const sec of a.섹션 || []) {
      L.push('')
      L.push(`### ${sec.제목}`)
      L.push(sec.내용.slice(0, 1200))
    }
    const m = markets?.[a.슬러그]
    if (m) {
      L.push('')
      L.push('### 시장 흐름 (기사에는 없는 우리 데이터)')
      L.push(
        `우리 모델 ${m.우리모델}% · 시장 현재 ${m.시장_현재}% · 격차 ${m.우리_시장_격차_퍼센트포인트}%p (${m.격차_방향})`
      )
      L.push('이 정보는 기사에 없으니 써도 좋다. 다만 격차만 말하지 말고 왜 다른지 기사 내용으로 설명해라.')
    }
    L.push('')
  })

  L.push('---')
  L.push('')
  L.push(`matches 배열은 기사 순서대로 ${articles.length}개를 만들어라.`)
  L.push('기사에 없는 내용은 절대 넣지 마라.')
  return L.join('\n')
}


/** 블로그 변환 모드의 마무리 — 원고 생성·검사·저장 */
async function finishFromBlog(articles, date) {
  let cumulative = null
  try {
    const res = await jget(BASE + '/api/admin/shorts-result?sport=football&group=euro')
    cumulative = res?.cumulative ?? null
  } catch {
    /* 없으면 없는 대로 */
  }

  const outDir = path.join(ROOT, 'out', 'scripts')
  await fs.mkdir(outDir, { recursive: true })
  const stem = path.join(outDir, `${date}-blog${DRY ? '' : '-' + VOICE}`)

  if (DRY) {
    await fs.writeFile(
      `${stem}.source.json`,
      JSON.stringify({ date, cumulative, articles }, null, 2),
      'utf8'
    )
    console.log(`\n--dry — LLM 호출 없이 기사 원문만 저장했습니다`)
    console.log(`  ${stem}.source.json`)
    console.log('\n여기 없는 내용은 원고에도 나오지 않습니다.')
    return
  }

  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  if (!hasAnthropic && !hasOpenAI) {
    return bail(
      '\n✖ .env.local 에 ANTHROPIC_API_KEY 또는 OPENAI_API_KEY 가 필요합니다',
      '  기사 원문만 보려면: --dry'
    )
  }

  console.log(`\n▶ 나레이션 변환 (${hasAnthropic ? 'Anthropic' : 'OpenAI'})...`)
  const user = blogUserPrompt(articles, cumulative, null)
  const raw = hasAnthropic
    ? await callAnthropic(null, BLOG_SYSTEM, user)
    : await callOpenAI(null, BLOG_SYSTEM, user)

  let script
  try {
    const m = raw.match(/\{[\s\S]*\}/)
    script = JSON.parse(m ? m[0] : raw)
  } catch {
    await fs.writeFile(`${stem}.raw.txt`, raw, 'utf8')
    return bail(`✖ JSON 파싱 실패. 원본을 저장했습니다: ${stem}.raw.txt`)
  }

  const problems = lint(script)
  const materials = [
    '━━━━━━━━━━ 이 원고가 쓴 기사 ━━━━━━━━━━',
    '',
    ...articles.map((a) => `· ${a.제목}\n   ${a.슬러그}\n   섹션: ${a.섹션.map((x) => x.제목).join(', ')}`),
    '',
    '원고 내용은 전부 위 기사에서 나와야 합니다.',
    '기사에 없는 얘기가 보이면 지어낸 것입니다.',
    '',
  ].join('\n')

  const meta = {
    date,
    groupLabel: '블로그 변환',
    voiceLabel: (PERSONAS[VOICE] || PERSONAS.analyst).label,
    problems,
    materials,
  }

  await fs.writeFile(
    `${stem}.json`,
    JSON.stringify({ ...meta, script, articles }, null, 2),
    'utf8'
  )
  await fs.writeFile(`${stem}.txt`, toReadable(script, meta), 'utf8')

  console.log('')
  if (problems.length) {
    console.log('⚠ 확인이 필요한 부분:')
    for (const p of problems) console.log(`   · ${p}`)
  } else {
    console.log('✓ 기계 검사 통과')
  }
  console.log('')
  console.log(`검수용: ${stem}.txt`)
  console.log(`원문 대조: ${stem}.json 의 articles`)
}

// ── 실행 ─────────────────────────────────────────────────
/**
 * 종료 코드만 세우고 조용히 빠져나온다.
 *
 * ⚠ 여기서 process.exit() 를 부르면 안 된다.
 *   아직 정리되지 않은 fetch 핸들이 남아 있으면 Windows Node 가
 *   "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" 로 죽는다.
 *   메시지는 이미 다 찍힌 뒤라 사용자에겐 성공한 것처럼 보이는 크래시라 더 나쁘다.
 */
function bail(...lines) {
  for (const l of lines) console.error(l)
  process.exitCode = 1
  return null
}

let BASE = 'https://www.trendsoccer.com'

async function main() {
  await loadEnv()
  BASE = process.env.SHORTS_BASE_URL || BASE

  const qs =
    SPORT === 'baseball'
      ? `sport=baseball&league=${encodeURIComponent(LEAGUE)}&count=${COUNT}`
      : `sport=football&group=${encodeURIComponent(GROUP)}&count=${COUNT}&range=${RANGE}`

  // ── 블로그 변환 모드 ────────────────────────────────
  if (FROM_BLOG) {
    const date = PAST_DATE || todayKST()
    console.log(`▶ ${date} 프리뷰 기사 수집...`)
    const articles = await fetchBlogPreviews(BASE, date, COUNT)
    if (!articles.length) {
      return bail(
        `✖ ${date} 에 발행된 프리뷰 기사를 찾지 못했습니다.`,
        '',
        '  프리뷰는 보통 경기 당일에 올라옵니다. 날짜를 바꿔 보세요:',
        '    node scripts/make-script.mjs --from=blog --date=2026-09-04'
      )
    }
    console.log(`▶ 기사 ${articles.length}편`)
    for (const a of articles) {
      console.log(`   · ${a.제목}  (섹션 ${a.섹션.length}개)`)
    }
    return finishFromBlog(articles, date)
  }

  console.log('▶ 경기 데이터 수집...')

  // ── 과거 모드 ────────────────────────────────────────
  if (PAST_DATE) {
    const picks = await fetchPastPicks(BASE, PAST_DATE, COUNT)
    if (!picks?.length) {
      return bail(
        `✖ ${PAST_DATE} 에 기준을 통과한 유럽 축구 픽이 없습니다.`,
        '',
        '  다른 날짜로 시도해 보세요. 주말(토·일)에 경기가 몰립니다.'
      )
    }
    console.log(`▶ ${PAST_DATE} · ${picks.length}경기 (과거 모드 — 결과는 가림)`)
    console.log('▶ 경기별 상세 수집...')

    const ds = []
    for (const p of picks) {
      ds.push(await buildDossier(BASE, p))
      process.stdout.write('.')
    }
    console.log('')

    const daily = {
      success: true,
      date: PAST_DATE,
      groupLabel: '유럽 축구',
      totalMatches: picks.length,
      picks,
      _dossiers: ds,
    }
    return finish(daily, ds)
  }

  const daily = await jget(`${BASE}/api/admin/shorts-daily?${qs}`)
  if (!daily.success || !daily.picks?.length) {
    // "픽이 없다" 만 찍으면 고장인지 정상인지 구분이 안 된다.
    // 분석 대상 경기가 0개면 그날 리그가 안 열린 것이고(A매치 기간 등),
    // 경기는 있는데 픽이 0개면 기준을 통과한 경기가 없는 것이다. 원인이 다르다.
    const total = daily?.totalMatches ?? 0
    if (total === 0) {
      return bail(
        `✖ ${daily?.groupLabel || GROUP}에 예정된 경기가 없습니다.`,
        '',
        '  리그가 쉬는 기간일 수 있습니다 (A매치 기간, 시즌 오프, 휴식기).',
        '',
        '  유럽 리그는 주말에 몰립니다. 주말 경기를 보려면:',
        '    node scripts/make-script.mjs --group=euro --range=weekend --count=3 --dry',
        '',
        '  야구는 A매치와 무관하게 열립니다:',
        '    node scripts/make-script.mjs --sport=baseball --league=KBO --count=3 --dry',
        '    node scripts/make-script.mjs --sport=baseball --league=MLB --count=3 --dry'
      )
    }
    return bail(
      `✖ ${total}경기 중 기준(승률 60% 이상)을 통과한 경기가 없습니다.`,
      '',
      '  경기는 있는데 확신도가 낮은 날입니다. 이런 날은 영상을 안 만드는 게 맞습니다.',
      '  억지로 만들면 근거가 약한 원고가 나옵니다.'
    )
  }

  console.log(`▶ ${daily.groupLabel} · ${daily.picks.length}경기`)
  console.log('▶ 경기별 상세 수집 (상대전적 · 시장 흐름)...')

  const dossiers = []
  for (const p of daily.picks) {
    dossiers.push(await buildDossier(BASE, p))
    process.stdout.write('.')
  }
  console.log('')

  return finish(daily, dossiers)
}

/** 도시에가 준비된 뒤의 공통 처리 (오늘 모드 · 과거 모드 공용) */
async function finish(daily, dossiers) {
  let cumulative = null
  try {
    const res = await jget(
      `${BASE}/api/admin/shorts-result?${
        SPORT === 'baseball' ? `sport=baseball&league=${LEAGUE}` : `sport=football&group=${GROUP}`
      }`
    )
    cumulative = res?.cumulative ?? null
  } catch {
    /* 없으면 없는 대로 */
  }

  // _ 로 시작하는 필드는 사람이 보는 진단용이라 LLM 에는 넘기지 않는다
  const forLLM = dossiers.map((d) => {
    const c = { ...d }
    for (const k of Object.keys(c)) if (k.startsWith('_')) delete c[k]
    return c
  })

  const payload = {
    groupLabel: daily.groupLabel,
    totalMatches: daily.totalMatches,
    cumulative,
    dossiers: forLLM,
  }

  const outDir = path.join(ROOT, 'out', 'scripts')
  await fs.mkdir(outDir, { recursive: true })
  const tag = SPORT === 'baseball' ? LEAGUE : GROUP
  const suffix =
    (PAST_DATE ? '-past' : RANGE === 'weekend' ? '-weekend' : '') + (DRY ? '' : `-${VOICE}`)
  const stem = path.join(outDir, `${daily.date}-${tag}${suffix}`)

  if (DRY) {
    await fs.writeFile(
      `${stem}.dossier.json`,
      JSON.stringify({ ...payload, dossiers }, null, 2),
      'utf8'
    )
    console.log(`\n--dry — LLM 호출 없이 도시에만 저장했습니다`)
    console.log(`  ${stem}.dossier.json`)
    console.log('\n이 파일을 보시면 LLM 이 뭘 근거로 쓰는지 알 수 있습니다.')
    console.log('여기 없는 정보는 원고에도 나오면 안 됩니다.')
    return
  }

  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  if (!hasAnthropic && !hasOpenAI) {
    return bail(
      '\n✖ .env.local 에 ANTHROPIC_API_KEY 또는 OPENAI_API_KEY 가 필요합니다',
      '  키 없이 데이터만 보려면: --dry'
    )
  }

  const persona = PERSONAS[VOICE] || PERSONAS.analyst
  console.log(`▶ 원고 생성 — ${persona.label} (${hasAnthropic ? 'Anthropic' : 'OpenAI'})...`)
  const raw = hasAnthropic ? await callAnthropic(payload) : await callOpenAI(payload)

  let script
  try {
    // 코드펜스를 붙여 오는 경우가 있어 JSON 부분만 떼어낸다
    const m = raw.match(/\{[\s\S]*\}/)
    script = JSON.parse(m ? m[0] : raw)
  } catch {
    await fs.writeFile(`${stem}.raw.txt`, raw, 'utf8')
    return bail(`✖ JSON 파싱 실패. 원본을 저장했습니다: ${stem}.raw.txt`)
  }

  const meta = {
    date: daily.date,
    groupLabel: daily.groupLabel,
    sport: SPORT,
    tag,
    voice: VOICE,
    voiceLabel: persona.label,
  }
  const problems = lint(script)
  const meta2 = { ...meta, problems, materials: materialsSummary(dossiers) }

  await fs.writeFile(`${stem}.json`, JSON.stringify({ ...meta, script, dossiers }, null, 2), 'utf8')
  await fs.writeFile(`${stem}.txt`, toReadable(script, meta2), 'utf8')

  const leaked = dossiers.filter((d) => d._유출경고?.length)
  if (leaked.length) {
    console.log('')
    console.log('⛔ 경기 결과가 도시에에 섞여 있습니다 — 프리뷰 원고가 오염됩니다:')
    for (const d of leaked) {
      console.log(`   ${d.home.name} vs ${d.away.name}`)
      for (const l of d._유출경고.slice(0, 3)) console.log(`     · ${l}`)
    }
  }

  console.log('')
  if (problems.length) {
    console.log('⚠ 확인이 필요한 부분:')
    for (const p of problems) console.log(`   · ${p}`)
  } else {
    console.log('✓ 기계 검사 통과 (분량 · 금지어 · 반론 형식)')
  }

  console.log('')
  console.log(`검수용:  ${stem}.txt`)
  console.log(`렌더용:  ${stem}.json`)
  console.log('')
  console.log('기계 검사는 형식만 봅니다. 내용이 맞는지는 사람이 봐야 합니다.')
  console.log('특히 반론이 진짜 반론인지, 데이터에 없는 얘기가 없는지 확인하세요.')
}

main().catch((e) => {
  console.error('\n실패:', e.message)
  process.exitCode = 1
})
