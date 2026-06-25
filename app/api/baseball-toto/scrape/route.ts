// app/api/baseball-toto/scrape/route.ts
// 야구토토 승1패 스크래퍼 (wisetoto game_type=bs & game_category=bs1)
//
// 승무패(축구)와 HTML 구조 동일하나 가운데 결과가 "무"가 아니라 "1점차 경기"
//   승(W)  = 기준(홈)팀 2점차 이상 승리
//   1(O)   = 1점차 승부 (승/패 무관)
//   패(L)  = 기준(홈)팀 2점차 이상 패배
//
// GET  /api/baseball-toto/scrape                    → 최신 회차 자동 스크래핑
// GET  /api/baseball-toto/scrape?year=2026&round=37 → 특정 회차
// GET  /api/baseball-toto/scrape?diag=true          → 진단 모드
// POST /api/baseball-toto/scrape                    → 수동 입력 (폴백)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WISETOTO_CALC = 'https://mw.wisetoto.com/gameinfo/toto_calc.htm'
const WISETOTO_CALC_PC = 'https://www.wisetoto.com/gameinfo/toto_calc.htm'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Referer': 'https://mw.wisetoto.com/',
}

// 1점차 경기 실측 발생률 (무 제외 조건부, baseball_matches 캘리브레이션 2026)
const ONE_RUN_BASE: Record<string, number> = {
  KBO: 0.252, MLB: 0.276, NPB: 0.322, Other: 0.27,
}
// Skellam(포아송)은 1점차를 과대예측 → 실측 대비 리그별 보정계수
// (포아송 < 실제분산: 블로우아웃 과소 → 접전 과대). 캘리브레이션으로 산출.
const ONE_RUN_CAL: Record<string, number> = {
  KBO: 0.90, MLB: 0.95, NPB: 0.96, Other: 0.94,
}

// ── Skellam(포아송 마진) 기반 1점차 확률 ──
// 두 팀 기대득점 λ로부터 마진 분포를 계산. 저득점 매치업일수록 1점차 비율↑.
const HOME_RUN_BONUS = 0.15        // 홈 어드밴티지(기대득점 가산)
function clampLambda(x: number) { return Math.max(2.5, Math.min(7.5, x)) }

function poissonPmf(lambda: number, maxK = 22): number[] {
  const arr = new Array(maxK + 1)
  let p = Math.exp(-lambda)
  arr[0] = p
  for (let k = 1; k <= maxK; k++) { p = (p * lambda) / k; arr[k] = p }
  return arr
}

// 동점(무) 제외 조건부 1점차 확률 (승1패 무는 적특이므로 decided 기준 정규화)
function skellamOneRun(lh: number, la: number): number {
  const H = poissonPmf(lh), A = poissonPmf(la)
  let w2 = 0, one = 0, l2 = 0
  for (let h = 0; h < H.length; h++) {
    for (let a = 0; a < A.length; a++) {
      const pr = H[h] * A[a]
      const d = h - a
      if (d >= 2) w2 += pr
      else if (d <= -2) l2 += pr
      else if (d === 0) { /* tie → 적특, 제외 */ }
      else one += pr
    }
  }
  const decided = w2 + one + l2
  return decided > 0 ? one / decided : 0.28
}

// 최근 FT 경기로 팀 평균 득점/실점(최근12) + 과거 1점차 성향(최근50)
async function teamRunRates(enName: string, league: string): Promise<{ scored: number; conceded: number; games: number; oneRunRate: number | null; oneRunRateRecent: number | null }> {
  const key = toSearchKey(enName)
  const { data } = await supabase
    .from('baseball_matches')
    .select('home_team, away_team, home_score, away_score, match_date')
    .eq('league', league).eq('status', 'FT')
    .or(`home_team.ilike.%${key}%,away_team.ilike.%${key}%`)
    .order('match_date', { ascending: false })
    .limit(50)
  let scored = 0, conceded = 0, nRecent = 0  // 득실: 최근 12경기
  let oneRun = 0, nAll = 0                    // 1점차 성향(장기): 최근 50경기
  let oneRunRecent = 0                        // 1점차 흐름(단기): 최근 12경기
  let i = 0
  for (const g of data || []) {
    const isHome = (g.home_team || '').toLowerCase().includes(key.toLowerCase())
    const hs = Number(g.home_score), as = Number(g.away_score)
    if (isNaN(hs) || isNaN(as)) { i++; continue }
    const close = Math.abs(hs - as) === 1
    if (i < 12) { scored += isHome ? hs : as; conceded += isHome ? as : hs; nRecent++; if (close) oneRunRecent++ }
    nAll++
    if (close) oneRun++
    i++
  }
  return {
    scored: nRecent ? scored / nRecent : 4.5,
    conceded: nRecent ? conceded / nRecent : 4.5,
    games: nRecent,
    oneRunRate: nAll >= 20 ? oneRun / nAll : null,
    oneRunRateRecent: nRecent >= 8 ? oneRunRecent / nRecent : null,
  }
}

// 정산 누적(baseball_toto_calibration)으로 1점차 자기보정 계수 — 예측 대비 실제. 데이터 부족시 미적용(1.0)
async function computeOneRunDrift(): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  try {
    const { data } = await supabase
      .from('baseball_toto_calibration')
      .select('league, decided, pred_one_avg, actual_one_rate')
      .order('year', { ascending: false }).order('round_number', { ascending: false })
      .limit(60)
    const agg: Record<string, { pred: number; act: number }> = {}
    for (const r of data || []) {
      const lg = r.league as string
      const d = Number(r.decided) || 0
      agg[lg] = agg[lg] || { pred: 0, act: 0 }
      agg[lg].pred += (Number(r.pred_one_avg) || 0) / 100 * d
      agg[lg].act += (Number(r.actual_one_rate) || 0) / 100 * d
    }
    for (const [lg, a] of Object.entries(agg)) {
      if (a.pred > 5) out[lg] = Math.max(0.8, Math.min(1.25, a.act / a.pred))
    }
  } catch {}
  return out
}

// ===== 팀명 매핑 (wisetoto 축약 → 풀네임/영문/리그) =====
type TeamInfo = { full: string; en: string; league: 'KBO' | 'MLB' | 'NPB' }

const TEAM_MAP: Record<string, TeamInfo> = {
  // ── KBO (10) ──
  'LG':   { full: 'LG 트윈스', en: 'LG Twins', league: 'KBO' },
  '삼성': { full: '삼성 라이온즈', en: 'Samsung Lions', league: 'KBO' },
  '롯데': { full: '롯데 자이언츠', en: 'Lotte Giants', league: 'KBO' },
  'NC':   { full: 'NC 다이노스', en: 'NC Dinos', league: 'KBO' },
  'KT':   { full: 'KT 위즈', en: 'KT Wiz', league: 'KBO' },
  'SSG':  { full: 'SSG 랜더스', en: 'SSG Landers', league: 'KBO' },
  '한화': { full: '한화 이글스', en: 'Hanwha Eagles', league: 'KBO' },
  '두산': { full: '두산 베어스', en: 'Doosan Bears', league: 'KBO' },
  '키움': { full: '키움 히어로즈', en: 'Kiwoom Heroes', league: 'KBO' },
  'KIA':  { full: 'KIA 타이거즈', en: 'KIA Tigers', league: 'KBO' },

  // ── MLB (30) — wisetoto 4글자 축약 (직접 확인분 + 표준 추정) ──
  '토론블루': { full: '토론토 블루제이스', en: 'Toronto Blue Jays', league: 'MLB' },
  '휴스애스': { full: '휴스턴 애스트로스', en: 'Houston Astros', league: 'MLB' },
  '탬파레이': { full: '탬파베이 레이스', en: 'Tampa Bay Rays', league: 'MLB' },
  '캔자로얄': { full: '캔자스시티 로열스', en: 'Kansas City Royals', league: 'MLB' },
  '피츠파이': { full: '피츠버그 파이리츠', en: 'Pittsburgh Pirates', league: 'MLB' },
  '시애매리': { full: '시애틀 매리너스', en: 'Seattle Mariners', league: 'MLB' },
  '마이말린': { full: '마이애미 말린스', en: 'Miami Marlins', league: 'MLB' },
  '텍사레인': { full: '텍사스 레인저스', en: 'Texas Rangers', league: 'MLB' },
  '미네트윈': { full: '미네소타 트윈스', en: 'Minnesota Twins', league: 'MLB' },
  'LA다저스': { full: 'LA 다저스', en: 'Los Angeles Dodgers', league: 'MLB' },
  '콜로로키': { full: '콜로라도 로키스', en: 'Colorado Rockies', league: 'MLB' },
  '보스레드': { full: '보스턴 레드삭스', en: 'Boston Red Sox', league: 'MLB' },
  'LA에인절': { full: 'LA 에인절스', en: 'Los Angeles Angels', league: 'MLB' },
  '볼티오리': { full: '볼티모어 오리올스', en: 'Baltimore Orioles', league: 'MLB' },
  '샌디파드': { full: '샌디에이고 파드리스', en: 'San Diego Padres', league: 'MLB' },
  '애틀브레': { full: '애틀랜타 브레이브스', en: 'Atlanta Braves', league: 'MLB' },
  '샌프자이': { full: '샌프란시스코 자이언츠', en: 'San Francisco Giants', league: 'MLB' },
  '애슬레틱': { full: '애슬레틱스', en: 'Athletics', league: 'MLB' },
  '뉴욕양키': { full: '뉴욕 양키스', en: 'New York Yankees', league: 'MLB' },
  '뉴욕메츠': { full: '뉴욕 메츠', en: 'New York Mets', league: 'MLB' },
  '필라필리': { full: '필라델피아 필리스', en: 'Philadelphia Phillies', league: 'MLB' },
  '워싱내셔': { full: '워싱턴 내셔널스', en: 'Washington Nationals', league: 'MLB' },
  '시카컵스': { full: '시카고 컵스', en: 'Chicago Cubs', league: 'MLB' },
  '시카화이': { full: '시카고 화이트삭스', en: 'Chicago White Sox', league: 'MLB' },
  '신시레즈': { full: '신시내티 레즈', en: 'Cincinnati Reds', league: 'MLB' },
  '밀워브루': { full: '밀워키 브루어스', en: 'Milwaukee Brewers', league: 'MLB' },
  '세인카디': { full: '세인트루이스 카디널스', en: 'St.Louis Cardinals', league: 'MLB' },
  '클리블가': { full: '클리블랜드 가디언스', en: 'Cleveland Guardians', league: 'MLB' },
  '클리가디': { full: '클리블랜드 가디언스', en: 'Cleveland Guardians', league: 'MLB' },
  '디트타이': { full: '디트로이트 타이거스', en: 'Detroit Tigers', league: 'MLB' },
  '애리다이': { full: '애리조나 다이아몬드백스', en: 'Arizona Diamondbacks', league: 'MLB' },
}

// baseball_matches 조회용 별칭 (영문 표기 변형 대응)
const EN_ALIASES: Record<string, string[]> = {
  'Athletics': ['Athletics', 'Oakland Athletics'],
  'Cleveland Guardians': ['Cleveland Guardians', 'Cleveland Indians'],
  'Los Angeles Dodgers': ['Los Angeles Dodgers', 'LA Dodgers'],
  'Los Angeles Angels': ['Los Angeles Angels', 'LA Angels', 'Los Angeles Angels of Anaheim'],
  'St.Louis Cardinals': ['St.Louis Cardinals', 'St. Louis Cardinals', 'Saint Louis Cardinals'],
}

function teamInfo(name: string): TeamInfo {
  return TEAM_MAP[name] || { full: name, en: name, league: 'Other' as any }
}

// =========================================================
// 파서: wisetoto toto_calc HTML (승/1/패)
// =========================================================
function parseWisetotoBaseball(html: string): any[] {
  const matches: any[] = []
  const matchBlocks = html.split(/<td[^>]*class="number"[^>]*>/i)

  for (let i = 1; i < matchBlocks.length; i++) {
    const block = matchBlocks[i]

    const numMatch = block.match(/^\s*(\d{1,2})\s*<\/td>/i)
    if (!numMatch) continue
    const matchNum = parseInt(numMatch[1])
    if (matchNum < 1 || matchNum > 14) continue

    const teamMatches = [...block.matchAll(/<td>([^<]+)<\/td>/gi)]
    const teams = teamMatches
      .map(m => m[1].trim())
      .filter(t => t.length >= 1 && !/\d{2}\.\d{2}/.test(t) && !/^\d+$/.test(t))

    if (teams.length < 2) continue
    const home = teams[0]
    const away = teams[1]

    // 투표: <div class="text">COUNT <br />(PCT%) </div>  (승 / 1 / 패)
    const voteMatches = [...block.matchAll(
      /<div\s+class="text">\s*([\d,]+)\s*<br\s*\/?>\s*\((\d+\.?\d*)%\)\s*<\/div>/gi
    )]

    let voteWin = 0, voteOne = 0, voteLose = 0
    let countWin = 0, countOne = 0, countLose = 0
    if (voteMatches.length >= 3) {
      countWin = parseInt(voteMatches[0][1].replace(/,/g, ''))
      voteWin = parseFloat(voteMatches[0][2])
      countOne = parseInt(voteMatches[1][1].replace(/,/g, ''))
      voteOne = parseFloat(voteMatches[1][2])
      countLose = parseInt(voteMatches[2][1].replace(/,/g, ''))
      voteLose = parseFloat(voteMatches[2][2])
    }

    const dateMatch = block.match(/(\d{2}\.\d{2})\s*\([가-힣]\)\s*(\d{2}:\d{2})/)
    const matchDate = dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : null

    const hi = teamInfo(home)
    const ai = teamInfo(away)
    const league = hi.league !== 'Other' ? hi.league : ai.league

    matches.push({
      match_number: matchNum,
      home_team: home,
      away_team: away,
      home_team_full: hi.full,
      away_team_full: ai.full,
      home_team_en: hi.en,
      away_team_en: ai.en,
      league,
      match_date: matchDate,
      vote_win: voteWin, vote_one: voteOne, vote_lose: voteLose,
      vote_count_win: countWin, vote_count_one: countOne, vote_count_lose: countLose,
      vote_total: countWin + countOne + countLose,
    })
  }
  return matches
}

// =========================================================
// 현재 발매중 회차 자동 감지 (bs/bs1)
// =========================================================
async function detectCurrentRound(): Promise<{ year: number; round: number }> {
  const currentYear = new Date().getFullYear()

  // 페이지 HTML에서 투표 총합 (미발매 회차는 0)
  const voteCount = (html: string) => {
    const vm = [...html.matchAll(/<div\s+class="text">\s*([\d,]+)\s*<br\s*\/?>/gi)]
    return vm.reduce((s, m) => s + parseInt(m[1].replace(/,/g, ''), 10), 0)
  }

  try {
    // 회차 미지정 → 와이즈토토가 "현재 발매중" 회차를 기본 선택해 반환
    const baseUrl = `${WISETOTO_CALC}?game_type=bs&game_category=bs1&game_year=${currentYear}`
    const res = await fetch(baseUrl, { headers: HEADERS, cache: 'no-store' })
    const html = await res.text()

    // (1) selected/활성 회차 우선 파싱
    let selected = 0
    const selPatterns = [
      /<option[^>]*\bselected\b[^>]*>\s*(\d+)\s*<\/option>/gi,
      /<li[^>]*class="[^"]*\b(?:on|active|selected|current)\b[^"]*"[^>]*>\s*(\d+)\s*<\/li>/gi,
      /<a[^>]*class="[^"]*\b(?:on|active|selected|current)\b[^"]*"[^>]*>\s*(\d+)\s*<\/a>/gi,
    ]
    for (const p of selPatterns) {
      for (const m of html.matchAll(p)) {
        const n = parseInt(m[1])
        if (n >= 1 && n <= 200) { selected = n; break }  // 연도(2026 등) 제외, 회차만
      }
      if (selected > 0) break
    }
    // 기본 페이지에 투표가 있으면 그게 곧 현재 발매 회차
    if (selected > 0 && voteCount(html) > 0) {
      return { year: currentYear, round: selected }
    }

    // (2) 드롭다운 전체 회차 수집
    const roundNumbers: number[] = []
    const selectMatch = html.match(/<select[^>]*round[^>]*>[\s\S]*?<\/select>/i)
    if (selectMatch) {
      for (const m of selectMatch[0].matchAll(/<option[^>]*>\s*(\d+)\s*<\/option>/gi)) {
        const n = parseInt(m[1]); if (n >= 1 && n <= 200) roundNumbers.push(n)
      }
    }
    if (roundNumbers.length === 0) {
      const text = html.replace(/<[^>]+>/g, '\n')
      const lines = text.split('\n').map(l => l.trim()).filter(l => /^\d{1,3}$/.test(l))
      roundNumbers.push(...lines.map(Number).filter(n => n >= 1 && n <= 200))
    }
    if (roundNumbers.length === 0) {
      return { year: currentYear, round: selected }  // 0일 수도
    }

    // (3) 최고 회차부터 "투표가 있는" 회차까지 내려가며 탐색
    //     → 36·37처럼 미발매(투표 0) 미래 회차를 건너뛰고 실제 발매중(35)을 찾음
    const maxRound = Math.max(...roundNumbers)
    for (let r = maxRound; r >= Math.max(1, maxRound - 8); r--) {
      try {
        const u = `${WISETOTO_CALC}?game_type=bs&game_category=bs1&game_year=${currentYear}&game_round=${r}`
        const cr = await fetch(u, { headers: HEADERS, cache: 'no-store' })
        const ch = await cr.text()
        if (voteCount(ch) > 0) return { year: currentYear, round: r }
      } catch {}
    }

    // 전부 투표 0 → selected 또는 최고 회차
    return { year: currentYear, round: selected > 0 ? selected : maxRound }
  } catch (e) {
    console.error('야구토토 회차 감지 실패:', e)
  }
  return { year: currentYear, round: 0 }
}

// 검색 키 (영문명 → 가장 특징적인 단어)
function toSearchKey(name: string): string {
  const stop = new Set(['New', 'Los', 'San', 'Saint', 'St.', 'St'])
  const words = name.replace(/\./g, '').split(/\s+/)
  const distinctive = words.filter(w => !stop.has(w))
  // 마지막 단어(닉네임)가 보통 가장 특징적: Astros, Dodgers, Twins...
  return distinctive[distinctive.length - 1] || words[0]
}

// "06.23 18:30" → ISO (KST)
function toISODate(dateStr: string | null, year: number): string | null {
  if (!dateStr) return null
  const m = dateStr.match(/(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})/)
  if (!m) return null
  return `${year}-${m[1]}-${m[2]}T${m[3]}:${m[4]}:00+09:00`
}

// =========================================================
// AI 예측 + 1점차 추정 + 등급
// =========================================================
async function enrichWithPredictions(matches: any[], year: number, origin: string) {
  const oneRunDrift = await computeOneRunDrift()  // 정산 자기보정 계수
  for (const m of matches) {
    let pHome = 0, pAway = 0           // 모델 승/패 확률 (0..1)
    let source: 'model' | 'vote' = 'vote'

    try {
      if (m.league === 'KBO' || m.league === 'MLB' || m.league === 'NPB') {
        const homeEn = m.home_team_en as string
        const awayEn = m.away_team_en as string
        const homeAliases = EN_ALIASES[homeEn] || [homeEn]
        const awayAliases = EN_ALIASES[awayEn] || [awayEn]
        const iso = toISODate(m.match_date, year)

        // baseball_matches 에서 해당 경기 조회 (리그 + 날짜창 ±2일 + 팀명)
        let q = supabase
          .from('baseball_matches')
          .select('id, api_match_id, home_team, away_team, match_date, home_team_logo, away_team_logo, home_pitcher_era, away_pitcher_era')
          .eq('league', m.league)
        if (iso) {
          const d = new Date(iso)
          const lo = new Date(d.getTime() - 2 * 864e5).toISOString()
          const hi = new Date(d.getTime() + 2 * 864e5).toISOString()
          q = q.gte('match_date', lo).lte('match_date', hi)
        }
        const homeKey = toSearchKey(homeEn)
        const awayKey = toSearchKey(awayEn)
        q = q.or(`home_team.ilike.%${homeKey}%,away_team.ilike.%${homeKey}%`).limit(20)
        const { data: rows } = await q

        // ⚾ 같은 매치업이 시리즈(3~4연전)로 여러 날 존재 → 토토 경기일과 가장 가까운 경기 선택
        let row: any = null
        let reversed = false
        if (rows?.length) {
          const target = iso ? new Date(iso).getTime() : 0
          const cands: { r: any; rev: boolean; dist: number }[] = []
          for (const r of rows) {
            const fwd = r.home_team?.toLowerCase().includes(homeKey.toLowerCase()) &&
                        r.away_team?.toLowerCase().includes(awayKey.toLowerCase())
            const rev = r.away_team?.toLowerCase().includes(homeKey.toLowerCase()) &&
                        r.home_team?.toLowerCase().includes(awayKey.toLowerCase())
            if (!fwd && !rev) continue
            const dist = (r.match_date && target) ? Math.abs(new Date(r.match_date).getTime() - target) : 0
            cands.push({ r, rev: !fwd && rev, dist })
          }
          cands.sort((a, b) => a.dist - b.dist)
          if (cands.length) { row = cands[0].r; reversed = cands[0].rev }
        }

        if (row) {
          // 팀 로고 (reversed면 토토 기준 홈/원정에 맞춰 스왑)
          m.home_logo = reversed ? row.away_team_logo : row.home_team_logo
          m.away_logo = reversed ? row.home_team_logo : row.away_team_logo

          // AI 예측 캐시는 baseball_odds_latest(api_match_id)에 저장됨
          let aiHome: number | null = null
          let aiAway: number | null = null
          try {
            const { data: odds } = await supabase
              .from('baseball_odds_latest')
              .select('ai_home_win_prob, ai_away_win_prob')
              .eq('api_match_id', row.api_match_id)
              .maybeSingle()
            if (odds) { aiHome = odds.ai_home_win_prob; aiAway = odds.ai_away_win_prob }
          } catch {}

          // 캐시된 예측이 없으면 predict API 호출 (계산 + odds 테이블 캐시)
          if (aiHome == null || aiAway == null) {
            try {
              const pr = await fetch(`${origin}/api/baseball/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  matchId: row.id,
                  homeTeam: row.home_team,
                  awayTeam: row.away_team,
                }),
                signal: AbortSignal.timeout(7000),
              })
              if (pr.ok) {
                const j = await pr.json()
                aiHome = j?.prediction?.homeWinProb
                aiAway = j?.prediction?.awayWinProb
              }
            } catch {}
          }

          if (aiHome != null && aiAway != null) {
            const t = aiHome + aiAway
            const ph = t > 0 ? aiHome / t : 0.5
            const pa = t > 0 ? aiAway / t : 0.5
            // reversed면 토토 기준 홈/원정 뒤집기
            pHome = reversed ? pa : ph
            pAway = reversed ? ph : pa
            source = 'model'
          }
        }

        // Skellam(포아송 마진)용 팀 기대득점 → 1점차 확률
        try {
          const [hr, ar] = await Promise.all([
            teamRunRates(homeEn, m.league),
            teamRunRates(awayEn, m.league),
          ])
          if (hr.games >= 5 && ar.games >= 5) {
            let lh = (hr.scored + ar.conceded) / 2 + HOME_RUN_BONUS
            let la = (ar.scored + hr.conceded) / 2
            // (1) 선발 투수 매치업: 좋은 투수 상대일수록 상대 득점 λ↓ (에이스전 → 저득점 → 1점차↑)
            const homeERA = reversed ? row?.away_pitcher_era : row?.home_pitcher_era
            const awayERA = reversed ? row?.home_pitcher_era : row?.away_pitcher_era
            if (homeERA != null && awayERA != null) {
              const f = (era: number) => Math.pow(Math.max(0.7, Math.min(1.4, era / 4.20)), 0.5)
              lh *= f(awayERA)  // 홈 득점 ← 원정 선발
              la *= f(homeERA)  // 원정 득점 ← 홈 선발
              m._pitcherAdj = true
            }
            let pOne = skellamOneRun(clampLambda(lh), clampLambda(la)) * (ONE_RUN_CAL[m.league] ?? ONE_RUN_CAL.Other)
            // (2) 팀별 1점차 성향: 장기(50경기) + 최근12 흐름 블렌딩 → 리그평균 대비 편차 절반 가산
            const teamRate = (t: { oneRunRate: number | null; oneRunRateRecent: number | null }) =>
              t.oneRunRate == null ? null
              : (t.oneRunRateRecent != null ? 0.7 * t.oneRunRate + 0.3 * t.oneRunRateRecent : t.oneRunRate)
            const hRate = teamRate(hr), aRate = teamRate(ar)
            if (hRate != null && aRate != null) {
              const pairRate = (hRate + aRate) / 2
              const lgBase = ONE_RUN_BASE[m.league] ?? ONE_RUN_BASE.Other
              pOne += (pairRate - lgBase) * 0.5
              m._teamTendency = Math.round(pairRate * 1000) / 10
            }
            // (3) 정산 자기보정: 누적 예측 대비 실제로 자동 스케일
            const dr = oneRunDrift[m.league]
            if (dr) { pOne *= dr; m._drift = Math.round(dr * 100) / 100 }
            m._skellamOne = Math.max(0.16, Math.min(0.42, pOne))
          }
        } catch {}
      }
    } catch (e) {
      console.warn(`예측 조회 실패 #${m.match_number}:`, e)
    }

    // 모델 실패 → 투표 기반 폴백 (승/패만 추출, 1은 따로 추정)
    if (source === 'vote') {
      const w = m.vote_win, l = m.vote_lose
      if (w + l > 0) { pHome = w / (w + l); pAway = l / (w + l) }
      else { pHome = 0.5; pAway = 0.5 }
    } else {
      // 모델 + 투표(시장신호) 블렌딩
      // 약한 야구 모델 단독이 대중과 정반대로 튀는 것 방지.
      // 배당은 predict가 이미 모델에 반영(60%)하므로, 그 위에 투표를 더 섞음.
      const w = m.vote_win, l = m.vote_lose
      if (w + l > 0) {
        const vHome = w / (w + l)
        const vAway = l / (w + l)
        const MODEL_W = 0.5  // 모델 가중 (나머지는 투표)
        let bh = MODEL_W * pHome + (1 - MODEL_W) * vHome
        let ba = MODEL_W * pAway + (1 - MODEL_W) * vAway
        const t = bh + ba
        pHome = bh / t
        pAway = ba / t
        source = 'blend' as any
      }
    }

    // ── 1점차(margin=1) 확률 ──
    let pOne: number
    if (typeof m._skellamOne === 'number') {
      // Skellam(포아송 마진) 기반 — 득점환경 반영
      pOne = Math.max(0.16, Math.min(0.42, m._skellamOne))
      m.one_method = 'skellam'
    } else {
      // 폴백: 리그 base율 × 접전도
      const base = ONE_RUN_BASE[m.league] ?? ONE_RUN_BASE.Other
      const evenness = 1 - Math.abs(pHome - pAway)
      pOne = Math.max(0.16, Math.min(0.40, base * (0.75 + 0.55 * evenness)))
      m.one_method = 'heuristic'
    }
    const remain = 1 - pOne
    let tw = remain * pHome
    let tl = remain * pAway
    let to = pOne
    const norm = tw + to + tl
    m.ts_win  = Math.round((tw / norm) * 1000) / 10
    m.ts_one  = Math.round((to / norm) * 1000) / 10
    m.ts_lose = Math.round((tl / norm) * 1000) / 10
    m.model_home_win = Math.round(pHome * 1000) / 10
    m.model_away_win = Math.round(pAway * 1000) / 10
    m.pred_source = source

    // ── 괴리율 (AI - 투표) ──
    m.divergence_win  = Math.round((m.ts_win  - m.vote_win)  * 10) / 10
    m.divergence_one  = Math.round((m.ts_one  - m.vote_one)  * 10) / 10
    m.divergence_lose = Math.round((m.ts_lose - m.vote_lose) * 10) / 10
    m.max_divergence = Math.round(Math.max(
      Math.abs(m.divergence_win), Math.abs(m.divergence_one), Math.abs(m.divergence_lose)
    ) * 10) / 10

    // ── 등급 (투표 분포 기반) ──
    const votes = [m.vote_win, m.vote_one, m.vote_lose].sort((a, b) => b - a)
    const gap = votes[0] - votes[1]
    if (votes[0] >= 70 || gap > 40) m.grade = 'PICK'
    else if (votes[0] >= 55 || gap > 20) m.grade = 'GOOD'
    else if (gap > 8) m.grade = 'FAIR'
    else m.grade = 'PASS'

    // ── 추천 (AI 확률 argmax) ──
    const probs = [
      { p: 'W', v: m.ts_win },
      { p: 'O', v: m.ts_one },
      { p: 'L', v: m.ts_lose },
    ].sort((a, b) => b.v - a.v)
    m.primary_pick = probs[0].p
    if (m.grade === 'FAIR' || m.grade === 'PASS') m.secondary_pick = probs[1].p

    // ── 분석 코멘트 ──
    const favTeam = m.ts_win >= m.ts_lose ? m.home_team_full : m.away_team_full
    if (m.grade === 'PICK') {
      m.analysis = `${favTeam} 우세 흐름. 고정 추천.`
    } else if (m.grade === 'GOOD') {
      m.analysis = `${favTeam} 소폭 우위. ${m.ts_one >= 30 ? '1점차 접전 변수 주의.' : '고정 가능.'}`
    } else if (m.ts_one >= 32) {
      m.analysis = `⚾ 양팀 전력 비슷 — 1점차 접전 가능성(${m.ts_one}%) 높음. 1 포함 더블 고려.`
    } else if (m.grade === 'PASS') {
      m.analysis = '승·1·패 엇비슷. 트리플 선택 권장.'
    } else {
      m.analysis = `괴리율 ${m.max_divergence}%. 더블 선택 고려.`
    }
  }
  return matches
}

// =========================================================
// DB 저장
// =========================================================
async function saveToDB(matches: any[], year: number, round: number) {
  const totalVotes = matches.reduce((s, m) => s + (m.vote_total || 0), 0)
  const { data: roundData, error: roundErr } = await supabase
    .from('baseball_toto_rounds')
    .upsert({
      year, round_number: round,
      total_matches: matches.length,
      total_votes: totalVotes,
      status: totalVotes > 0 ? 'upcoming' : 'scheduled',
      scraped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'year,round_number' })
    .select().single()

  if (roundErr) return { error: roundErr.message, roundId: null, saved: 0 }

  const roundId = roundData.id
  let saved = 0
  let firstError: string | null = null

  for (const m of matches) {
    const { error } = await supabase.from('baseball_toto_matches').upsert({
      round_id: roundId,
      match_number: m.match_number,
      home_team: m.home_team,
      away_team: m.away_team,
      home_team_full: m.home_team_full,
      away_team_full: m.away_team_full,
      home_team_en: m.home_team_en,
      away_team_en: m.away_team_en,
      league: m.league,
      match_date: toISODate(m.match_date, year),
      home_logo: m.home_logo || null,
      away_logo: m.away_logo || null,
      vote_win: m.vote_win, vote_one: m.vote_one, vote_lose: m.vote_lose,
      vote_count_win: m.vote_count_win || null,
      vote_count_one: m.vote_count_one || null,
      vote_count_lose: m.vote_count_lose || null,
      vote_total: m.vote_total || null,
      ts_win: m.ts_win, ts_one: m.ts_one, ts_lose: m.ts_lose,
      model_home_win: m.model_home_win, model_away_win: m.model_away_win,
      pred_source: m.pred_source,
      divergence_win: m.divergence_win, divergence_one: m.divergence_one, divergence_lose: m.divergence_lose,
      max_divergence: m.max_divergence,
      grade: m.grade,
      primary_pick: m.primary_pick,
      secondary_pick: m.secondary_pick || null,
      analysis: m.analysis,
      scraped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'round_id,match_number' })
    if (!error) saved++
    else if (!firstError) firstError = `#${m.match_number}: ${error.message} ${error.hint || ''}`
  }
  return { roundId, saved, error: firstError }
}

// =========================================================
// GET
// =========================================================
export async function GET(request: NextRequest) {
  const start = Date.now()
  const { searchParams, origin } = new URL(request.url)
  let year = parseInt(searchParams.get('year') || '0')
  let round = parseInt(searchParams.get('round') || '0')
  const diag = searchParams.get('diag') === 'true'
  const force = searchParams.get('force') === 'true'

  try {
    if (year === 0 || round === 0) {
      const d = await detectCurrentRound()
      if (year === 0) year = d.year
      if (round === 0) round = d.round
      if (round === 0) {
        return NextResponse.json({
          error: '현재 발매중인 야구토토 승1패 회차를 감지할 수 없습니다.',
          example: '/api/baseball-toto/scrape?year=2026&round=37',
        }, { status: 400 })
      }
    }

    // 캐시 (1시간)
    if (!force && !diag) {
      const { data: existing } = await supabase
        .from('baseball_toto_rounds')
        .select('id, scraped_at')
        .eq('year', year).eq('round_number', round).single()
      if (existing) {
        const age = Date.now() - new Date(existing.scraped_at).getTime()
        if (age < 60 * 60 * 1000) {
          const { data: cached } = await supabase
            .from('baseball_toto_matches').select('*')
            .eq('round_id', existing.id).order('match_number')
          return NextResponse.json({
            cached: true,
            round: { year, round_number: round, id: existing.id },
            matches: cached || [],
            cache_age_minutes: Math.round(age / 60000),
          })
        }
      }
    }

    // fetch (모바일 → PC 폴백)
    let html = ''
    let sourceUrl = `${WISETOTO_CALC}?game_type=bs&game_category=bs1&game_year=${year}&game_round=${round}`
    try {
      const res = await fetch(sourceUrl, { headers: HEADERS, cache: 'no-store' })
      html = await res.text()
    } catch {}
    if (!html || html.length < 1000) {
      sourceUrl = `${WISETOTO_CALC_PC}?game_type=bs&game_category=bs1&game_year=${year}&game_round=${round}`
      try {
        const res = await fetch(sourceUrl, {
          headers: { ...HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          cache: 'no-store',
        })
        html = await res.text()
      } catch {}
    }
    if (!html || html.length < 500) {
      return NextResponse.json({ error: 'wisetoto에서 HTML을 가져오지 못했습니다.' }, { status: 502 })
    }

    if (diag) {
      const testParse = parseWisetotoBaseball(html)
      return NextResponse.json({
        url: sourceUrl, html_length: html.length,
        parsed_count: testParse.length, parsed_matches: testParse,
      })
    }

    let matches = parseWisetotoBaseball(html)
    if (matches.length < 10) {
      return NextResponse.json({
        error: `파싱 실패 — ${matches.length}경기만 추출 (최소 10 필요)`,
        url: sourceUrl, partial_matches: matches,
        suggestion: '?diag=true 로 HTML 구조 확인',
      }, { status: 422 })
    }

    matches = await enrichWithPredictions(matches, year, origin)
    const { roundId, saved, error: dbErr } = await saveToDB(matches, year, round)

    return NextResponse.json({
      success: true, cached: false, source: 'wisetoto_bs1',
      round: { year, round_number: round, id: roundId },
      matches,
      stats: {
        total: matches.length, saved,
        pick_count: matches.filter(m => m.grade === 'PICK').length,
        good_count: matches.filter(m => m.grade === 'GOOD').length,
        model_count: matches.filter(m => m.pred_source === 'model' || m.pred_source === 'blend').length,
        vote_count: matches.filter(m => m.pred_source === 'vote').length,
        skellam_count: matches.filter(m => m.one_method === 'skellam').length,
      },
      duration_ms: Date.now() - start,
      ...(dbErr ? { db_error: dbErr } : {}),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message, duration_ms: Date.now() - start }, { status: 500 })
  }
}

// =========================================================
// POST (수동 입력 폴백)
// =========================================================
export async function POST(request: NextRequest) {
  const start = Date.now()
  const { origin } = new URL(request.url)
  try {
    const body = await request.json()
    const { year, round_number, matches: inputMatches, html } = body
    if (!year || !round_number) {
      return NextResponse.json({ error: 'year, round_number 필수' }, { status: 400 })
    }

    let matches: any[] = []
    if (inputMatches && Array.isArray(inputMatches) && inputMatches.length > 0) {
      matches = inputMatches.map((m: any, i: number) => {
        const home = m.home_team || m.home
        const away = m.away_team || m.away
        const hi = teamInfo(home), ai = teamInfo(away)
        return {
          match_number: m.match_number || m.num || i + 1,
          home_team: home, away_team: away,
          home_team_full: hi.full, away_team_full: ai.full,
          home_team_en: hi.en, away_team_en: ai.en,
          league: hi.league !== 'Other' ? hi.league : ai.league,
          match_date: m.match_date || null,
          vote_win: m.vote_win || m.win || 0,
          vote_one: m.vote_one || m.one || 0,
          vote_lose: m.vote_lose || m.lose || 0,
          vote_count_win: m.vote_count_win || null,
          vote_count_one: m.vote_count_one || null,
          vote_count_lose: m.vote_count_lose || null,
          vote_total: m.vote_total || null,
        }
      })
    } else if (html) {
      matches = parseWisetotoBaseball(html)
    }

    if (matches.length === 0) {
      return NextResponse.json({
        error: '매치 데이터 없음',
        usage: 'POST { year, round_number, matches: [{ num, home, away, win, one, lose }] }',
      }, { status: 400 })
    }

    matches = await enrichWithPredictions(matches, year, origin)
    const { roundId, saved, error: dbErr } = await saveToDB(matches, year, round_number)
    return NextResponse.json({
      success: true, round: { year, round_number, id: roundId },
      matches, saved, duration_ms: Date.now() - start,
      ...(dbErr ? { db_error: dbErr } : {}),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
