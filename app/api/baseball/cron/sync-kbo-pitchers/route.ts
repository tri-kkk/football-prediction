// app/api/baseball/cron/sync-kbo-pitchers/route.ts
// KBO 선발투수 자동 수집 & baseball_matches 업데이트 + 투수 스탯 수집
//
// GET /api/baseball/cron/sync-kbo-pitchers              → 오늘 경기
// GET /api/baseball/cron/sync-kbo-pitchers?date=2026-04-07  → 특정 날짜
// GET /api/baseball/cron/sync-kbo-pitchers?dry=true     → 테스트 (DB 업데이트 안 함)
//
// 데이터 소스:
//   - 선발투수: koreabaseball.com/Schedule/GameCenter/Main.aspx
//   - 투수 기록: koreabaseball.com/Record/Player/PitcherBasic/Basic1.aspx
//
// Supabase Cron 추천 스케줄: 매일 15:00 KST (06:00 UTC)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ===================================================================
// 1. KBO 팀명 매핑
// ===================================================================
// DB에는 풀네임 (예: '한화 이글스')과 약어 ('한화') 모두 가능
// koreabaseball.com GameCenter에서는 약어 사용 (예: '한화', 'KT')

const KBO_TEAM_ALIASES: Record<string, string[]> = {
  '한화': ['한화', '한화 이글스', 'Hanwha Eagles'],
  'KT':   ['KT', 'KT 위즈', 'KT Wiz'],
  'LG':   ['LG', 'LG 트윈스', 'LG Twins'],
  'SSG':  ['SSG', 'SSG 랜더스', 'SSG Landers'],
  '키움': ['키움', '키움 히어로즈', 'Kiwoom Heroes'],
  '롯데': ['롯데', '롯데 자이언츠', 'Lotte Giants'],
  '삼성': ['삼성', '삼성 라이온즈', 'Samsung Lions'],
  '두산': ['두산', '두산 베어스', 'Doosan Bears'],
  'KIA':  ['KIA', 'KIA 타이거즈', 'KIA Tigers'],
  'NC':   ['NC', 'NC 다이노스', 'NC Dinos'],
}

// 역매핑: 다양한 팀명 → 약어
const TEAM_TO_SHORT: Record<string, string> = {}
for (const [short, aliases] of Object.entries(KBO_TEAM_ALIASES)) {
  for (const alias of aliases) {
    TEAM_TO_SHORT[alias.toLowerCase()] = short
  }
  TEAM_TO_SHORT[short.toLowerCase()] = short
}

function normalizeTeamName(name: string): string {
  const lower = name.trim().toLowerCase()
  if (TEAM_TO_SHORT[lower]) return TEAM_TO_SHORT[lower]
  for (const [key, short] of Object.entries(TEAM_TO_SHORT)) {
    if (lower.includes(key) || key.includes(lower)) return short
  }
  return name.trim()
}

function getKSTDateString(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().split('T')[0]
}

// ===================================================================
// 2. KBO 공식 API — 선발투수 추출
// ===================================================================
// koreabaseball.com/ws/Main.asmx/GetKboGameList (POST, form-urlencoded)
// 파라미터: date=YYYYMMDD, leId=1, srId=0,1,3,4,5,7
//
// 응답 필드:
//   AWAY_NM / HOME_NM — 팀명 (키움, 두산 등)
//   T_PIT_P_NM — 원정(탑) 선발투수
//   B_PIT_P_NM — 홈(바텀) 선발투수
//   G_DT — 경기일 (YYYYMMDD)
//   G_ID — 경기 ID

interface KboGameInfo {
  awayTeam: string
  homeTeam: string
  awayPitcher: string | null
  homePitcher: string | null
  gameDate: string // YYYYMMDD
  gameId: string
  stadium: string
}

async function fetchKboGameList(date: string): Promise<{ games: KboGameInfo[] }> {
  const dateCompact = date.replace(/-/g, '')

  const res = await fetch('https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx',
    },
    body: `date=${dateCompact}&leId=1&srId=0%2C1%2C3%2C4%2C5%2C7`,
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) throw new Error(`KBO API failed: ${res.status}`)
  const data = await res.json()

  const gameList = data.game || data.gameList || []
  console.log(`⚾ KBO API: ${gameList.length} games for ${dateCompact}`)

  const games: KboGameInfo[] = gameList.map((g: any) => ({
    awayTeam: (g.AWAY_NM || '').trim(),
    homeTeam: (g.HOME_NM || '').trim(),
    awayPitcher: (g.T_PIT_P_NM || '').trim() || null,  // T = Top = Away
    homePitcher: (g.B_PIT_P_NM || '').trim() || null,  // B = Bottom = Home
    gameDate: g.G_DT || dateCompact,
    gameId: g.G_ID || '',
    stadium: g.S_NM || '',
  }))

  return { games }
}

// ===================================================================
// 3. 투수 기록 스크래핑 (koreabaseball.com/Record)
// ===================================================================

interface KboPitcherRecord {
  name: string
  team: string
  era: number | null
  games: number | null
  wins: number | null
  losses: number | null
  saves: number | null
  holds: number | null
  wpct: number | null
  innings_pitched: string | null
  hits: number | null
  home_runs: number | null
  walks: number | null
  hit_by_pitch: number | null
  strikeouts: number | null
  runs: number | null
  earned_runs: number | null
  whip: number | null
}

// Basic1.aspx 한 페이지의 <tbody> 행을 파싱
function parseRecordRows(html: string): KboPitcherRecord[] {
  const records: KboPitcherRecord[] = []

  const tbodyStart = html.indexOf('<tbody>')
  if (tbodyStart < 0) return records
  const tbodyEnd = html.indexOf('</tbody>', tbodyStart)
  const tbody = html.substring(tbodyStart, tbodyEnd > 0 ? tbodyEnd : tbodyStart + 50000)

  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let trMatch: RegExpExecArray | null

  while ((trMatch = trRegex.exec(tbody)) !== null) {
    const rowHtml = trMatch[1]
    const cells = extractCells(rowHtml)

    // 19개 열: 순위, 선수명, 팀명, ERA, G, W, L, SV, HLD, WPCT, IP, H, HR, BB, HBP, SO, R, ER, WHIP
    if (cells.length < 19) continue

    const [
      _rank, name, team, era, g, w, l, sv, hld, wpct,
      ip, h, hr, bb, hbp, so, r, er, whip
    ] = cells

    if (!name.trim()) continue

    records.push({
      name: name.trim(),
      team: team.trim(),
      era: safeParseFloat(era),
      games: safeParseInt(g),
      wins: safeParseInt(w),
      losses: safeParseInt(l),
      saves: safeParseInt(sv),
      holds: safeParseInt(hld),
      wpct: safeParseFloat(wpct),
      innings_pitched: ip.trim() || null,
      hits: safeParseInt(h),
      home_runs: safeParseInt(hr),
      walks: safeParseInt(bb),
      hit_by_pitch: safeParseInt(hbp),
      strikeouts: safeParseInt(so),
      runs: safeParseInt(r),
      earned_runs: safeParseInt(er),
      whip: safeParseFloat(whip),
    })
  }

  return records
}

// HTML에서 <input name="..." value="..."> 추출 (ASP.NET hidden 필드용)
function extractHiddenInput(html: string, name: string): string {
  // name="X" value="Y" 또는 value="Y" name="X" 모두 매칭
  const re1 = new RegExp(`<input[^>]*name="${name}"[^>]*value="([^"]*)"`, 'i')
  const re2 = new RegExp(`<input[^>]*value="([^"]*)"[^>]*name="${name}"`, 'i')
  const m1 = html.match(re1)
  if (m1) return m1[1]
  const m2 = html.match(re2)
  if (m2) return m2[1]
  return ''
}

// HTML에서 ddlTeam 류 dropdown 컨트롤의 정확한 name 속성 추출
function findDdlTeamControlName(html: string): string | null {
  // <select name="ctl00$...$ddlTeam_ID" id="...">
  const m = html.match(/<select[^>]*name="([^"]*ddlTeam[^"]*)"/i)
  return m ? m[1] : null
}

// HTML에서 ddlSeries 류 dropdown 컨트롤의 정확한 name 속성 추출
function findDdlControlName(html: string, keyword: string): string | null {
  const re = new RegExp(`<select[^>]*name="([^"]*${keyword}[^"]*)"`, 'i')
  const m = html.match(re)
  return m ? m[1] : null
}

const KBO_TEAM_CODES = ['HH', 'KT', 'LG', 'SK', 'WO', 'LT', 'SS', 'OB', 'HT', 'NC']

async function scrapeKboPitcherRecords(season?: string): Promise<KboPitcherRecord[]> {
  const url = 'https://www.koreabaseball.com/Record/Player/PitcherBasic/Basic1.aspx'

  const initRes = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!initRes.ok) throw new Error(`Records fetch failed: ${initRes.status}`)
  const initHtml = await initRes.text()
  // ASP.NET 세션 쿠키 추출 — 팀 postback에 동봉해야 EventValidation 통과
  const setCookieHeaders: string[] = (initRes.headers as any).getSetCookie?.() ?? []
  const sessionCookie = setCookieHeaders
    .map((c: string) => c.split(';')[0])
    .filter(Boolean)
    .join('; ')

  console.log(`📊 Records page initial HTML length: ${initHtml.length}, cookies=${sessionCookie ? 'OK' : 'NONE'}`)

  // 1단계: 디폴트(상위 24명, 규정이닝 기준) 파싱
  const allByKey = new Map<string, KboPitcherRecord>()
  const defaultRecords = parseRecordRows(initHtml)
  for (const r of defaultRecords) {
    allByKey.set(`${r.name}|${r.team}`, r)
  }
  console.log(`📊 Default page parsed: ${defaultRecords.length} records`)

  // 2단계: 팀별로 ASP.NET 포스트백 시도하여 전체 투수 수집
  const viewState = extractHiddenInput(initHtml, '__VIEWSTATE')
  const teamCtrl = findDdlTeamControlName(initHtml)
  const seasonCtrl = findDdlControlName(initHtml, 'ddlSeason')
  const seriesCtrl = findDdlControlName(initHtml, 'ddlSeries')
  const sortCtrl = findDdlControlName(initHtml, 'ddlSort')

  console.log(`📊 Form fields: viewState=${viewState ? 'OK' : 'MISSING'}, teamCtrl=${teamCtrl}, seasonCtrl=${seasonCtrl}, seriesCtrl=${seriesCtrl}`)

  // 모든 hidden 필드를 한 번에 추출 (개별 필드 누락 방지)
  const baseFormData = new URLSearchParams()
  const hiddenRegex = /<input[^>]*type="hidden"[^>]*>/gi
  let hm: RegExpExecArray | null
  while ((hm = hiddenRegex.exec(initHtml)) !== null) {
    const tag = hm[0]
    const nameMatch = tag.match(/name="([^"]+)"/)
    const valueMatch = tag.match(/value="([^"]*)"/)
    if (nameMatch) baseFormData.set(nameMatch[1], valueMatch ? valueMatch[1] : '')
  }
  // 드롭다운 디폴트 selected option 값을 추출
  const setSelectDefault = (ctrl: string | null) => {
    if (!ctrl) return
    const re = new RegExp(`<select[^>]*name="${ctrl.replace(/\$/g, '\\$')}"[\\s\\S]*?</select>`, 'i')
    const sm = initHtml.match(re)
    if (!sm) return
    const selectedMatch = sm[0].match(/<option[^>]*selected[^>]*value="([^"]*)"/i) || sm[0].match(/<option[^>]*value="([^"]*)"[^>]*selected/i)
    if (selectedMatch) baseFormData.set(ctrl, selectedMatch[1])
  }
  setSelectDefault(seasonCtrl)
  setSelectDefault(seriesCtrl)
  setSelectDefault(sortCtrl)

  if (viewState && teamCtrl) {
    for (const teamCode of KBO_TEAM_CODES) {
      try {
        // baseFormData 복사 후 팀별 override
        const formData = new URLSearchParams(baseFormData.toString())
        formData.set('__EVENTTARGET', teamCtrl)
        formData.set('__EVENTARGUMENT', '')
        formData.set(teamCtrl, teamCode)

        const teamRes = await fetch(url, {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'ko-KR,ko;q=0.9',
            'Referer': url,
            ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
          },
          body: formData.toString(),
          signal: AbortSignal.timeout(15000),
        })

        if (!teamRes.ok) {
          console.warn(`⚠️ Team ${teamCode}: HTTP ${teamRes.status}`)
          continue
        }

        const teamHtml = await teamRes.text()
        const teamRecords = parseRecordRows(teamHtml)

        let added = 0
        for (const r of teamRecords) {
          const key = `${r.name}|${r.team}`
          if (!allByKey.has(key)) {
            allByKey.set(key, r)
            added++
          }
        }
        console.log(`📊 Team ${teamCode}: ${teamRecords.length} parsed (+${added} new)`)
      } catch (e: any) {
        console.warn(`⚠️ Team ${teamCode} fetch error: ${e.message}`)
      }
    }
  } else {
    console.warn(`⚠️ Cannot do team postback (missing viewState or teamCtrl) — only top-24 records collected`)
  }

  const records = Array.from(allByKey.values())
  console.log(`📊 Total parsed ${records.length} pitcher records (across all teams)`)
  return records
}

function safeParseFloat(val: string): number | null {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function safeParseInt(val: string): number | null {
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

function extractCells(rowHtml: string): string[] {
  const cells: string[] = []
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
  let m: RegExpExecArray | null
  while ((m = cellRegex.exec(rowHtml)) !== null) {
    // HTML 태그 제거하고 텍스트만
    cells.push(m[1].replace(/<[^>]+>/g, '').trim())
  }
  return cells
}

// ===================================================================
// 4. DB 매칭 & 업데이트
// ===================================================================

function teamMatchesDb(kboTeam: string, dbTeam: string): boolean {
  const kboShort = normalizeTeamName(kboTeam)
  const dbShort = normalizeTeamName(dbTeam)
  return kboShort === dbShort
}

// ===================================================================
// 5. GET 핸들러
// ===================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')
  const isDry = searchParams.get('dry') === 'true'
  const statsOnly = searchParams.get('statsOnly') === 'true'

  const date = dateParam || getKSTDateString()
  const season = date.substring(0, 4)
  const debug = searchParams.get('debug') === 'true'
  const debugTeam = searchParams.get('debugTeam')  // 단일 팀 코드 dump

  // ─────────────────────────────────────────
  // DEBUG: 특정 팀 페이지 raw 파싱 결과 dump
  // ─────────────────────────────────────────
  if (searchParams.get('debugTeamOptions') === 'true') {
    try {
      const url = 'https://www.koreabaseball.com/Record/Player/PitcherBasic/Basic1.aspx'
      const initRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      })
      const html = await initRes.text()
      const teamCtrl = findDdlTeamControlName(html)
      // ddlTeam <select> 안의 옵션 추출
      let optionsHtml = ''
      if (teamCtrl) {
        const reSelect = new RegExp(`<select[^>]*name="${teamCtrl.replace(/\$/g, '\\$')}"[\\s\\S]*?<\\/select>`, 'i')
        const m = html.match(reSelect)
        if (m) optionsHtml = m[0]
      }
      const optionPattern = /<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi
      const options: Array<{ value: string; label: string }> = []
      let om
      while ((om = optionPattern.exec(optionsHtml)) !== null) {
        options.push({ value: om[1], label: om[2] })
      }
      // 다른 dropdown들도 함께
      const seasonCtrl = findDdlControlName(html, 'ddlSeason')
      const seriesCtrl = findDdlControlName(html, 'ddlSeries')
      const sortCtrl = findDdlControlName(html, 'ddlSort')
      return NextResponse.json({
        success: true,
        teamCtrl,
        seasonCtrl,
        seriesCtrl,
        sortCtrl,
        teamOptions: options,
        htmlLen: html.length,
      })
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
  }

  if (debugTeam) {
    try {
      const url = 'https://www.koreabaseball.com/Record/Player/PitcherBasic/Basic1.aspx'
      const initRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      })
      const initHtml = await initRes.text()
      const setCookieHeaders: string[] = (initRes.headers as any).getSetCookie?.() ?? []
      const sessionCookie = setCookieHeaders
        .map((c: string) => c.split(';')[0])
        .filter(Boolean)
        .join('; ')
      const viewState = extractHiddenInput(initHtml, '__VIEWSTATE')
      const viewStateGen = extractHiddenInput(initHtml, '__VIEWSTATEGENERATOR')
      const eventValidation = extractHiddenInput(initHtml, '__EVENTVALIDATION')
      const teamCtrl = findDdlTeamControlName(initHtml)
      const seasonCtrl = findDdlControlName(initHtml, 'ddlSeason')
      const seriesCtrl = findDdlControlName(initHtml, 'ddlSeries')
      const sortCtrl = findDdlControlName(initHtml, 'ddlSort')

      // 초기 페이지의 모든 hidden + dropdown 값을 그대로 동봉 (생략 시 EventValidation 실패)
      const formData = new URLSearchParams()
      // hidden 필드 자동 추출 (모든 hidden input)
      const hiddenRegex = /<input[^>]*type="hidden"[^>]*>/gi
      let hm: RegExpExecArray | null
      while ((hm = hiddenRegex.exec(initHtml)) !== null) {
        const tag = hm[0]
        const nameMatch = tag.match(/name="([^"]+)"/)
        const valueMatch = tag.match(/value="([^"]*)"/)
        if (nameMatch) formData.set(nameMatch[1], valueMatch ? valueMatch[1] : '')
      }
      // 드롭다운 디폴트 값을 추출해서 동봉
      const setSelectDefault = (ctrl: string | null) => {
        if (!ctrl) return
        const re = new RegExp(`<select[^>]*name="${ctrl.replace(/\$/g, '\\$')}"[\\s\\S]*?</select>`, 'i')
        const sm = initHtml.match(re)
        if (!sm) return
        // selected option 또는 첫 번째 옵션
        const selectedMatch = sm[0].match(/<option[^>]*selected[^>]*value="([^"]*)"/i) || sm[0].match(/<option[^>]*value="([^"]*)"[^>]*selected/i)
        if (selectedMatch) {
          formData.set(ctrl, selectedMatch[1])
        }
      }
      setSelectDefault(seasonCtrl)
      setSelectDefault(seriesCtrl)
      setSelectDefault(sortCtrl)
      // 팀 변경 → __EVENTTARGET 으로 명시 + 팀 코드
      formData.set('__EVENTTARGET', teamCtrl || '')
      formData.set('__EVENTARGUMENT', '')
      if (teamCtrl) formData.set(teamCtrl, debugTeam)

      const teamRes = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ko-KR,ko;q=0.9',
          'Referer': url,
          ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
        },
        body: formData.toString(),
        signal: AbortSignal.timeout(15000),
      })
      const teamHtml = await teamRes.text()
      const records = parseRecordRows(teamHtml)

      // tbody 안의 모든 tr cells 덤프 (행 수가 안 맞는 케이스 확인)
      const tbodyStart = teamHtml.indexOf('<tbody>')
      const tbodyEnd = teamHtml.indexOf('</tbody>', tbodyStart)
      const tbody = tbodyStart > -1 ? teamHtml.substring(tbodyStart, tbodyEnd > 0 ? tbodyEnd : tbodyStart + 80000) : ''
      const allRows: Array<{ cellCount: number; cells: string[] }> = []
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
      let trMatch
      while ((trMatch = trRegex.exec(tbody)) !== null) {
        const cells = extractCells(trMatch[1])
        if (cells.length > 0) allRows.push({ cellCount: cells.length, cells })
      }

      // 진단: 쿠키 추출 결과
      const allHeaders: Record<string, string> = {}
      initRes.headers.forEach((v, k) => { allHeaders[k] = v })
      const setCookieRaw = initRes.headers.get('set-cookie')
      return NextResponse.json({
        success: true,
        debugTeam,
        season,
        htmlLen: teamHtml.length,
        teamCtrl,
        cookieExtracted: sessionCookie || '(empty)',
        cookieMethodAvailable: typeof (initRes.headers as any).getSetCookie === 'function',
        setCookieGet: setCookieRaw,
        initHeaders: allHeaders,
        parsedCount: records.length,
        parsedRecords: records,
        rawRowCount: allRows.length,
        rawRows: allRows,
        startsWith: teamHtml.slice(0, 50).replace(/[^\x20-\x7e]/g, '?'),
        hasDoctype: teamHtml.includes('<!DOCTYPE'),
        hasHtml: teamHtml.includes('<html'),
        hasTbody: teamHtml.includes('<tbody'),
        hasTable: teamHtml.includes('<table'),
        hasErrorPage: teamHtml.includes('서버') || teamHtml.includes('error') || teamHtml.includes('Error'),
        firstTagPositions: {
          html: teamHtml.indexOf('<html'),
          body: teamHtml.indexOf('<body'),
          table: teamHtml.indexOf('<table'),
          tbody: teamHtml.indexOf('<tbody'),
          치리노스: teamHtml.indexOf('치리노스'),
          웰스: teamHtml.indexOf('웰스'),
        },
        contentType: teamRes.headers.get('content-type'),
        statusCode: teamRes.status,
      })
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
  }

  console.log(`\n🏟️ ===== KBO Pitcher Sync: ${date} (dry=${isDry}) =====`)

  try {
    const pitcherResults: any[] = []
    const statsResults: any[] = []
    let updatedPitchers = 0
    let updatedStats = 0
    let debugInfo: any = null

    // ─────────────────────────────────────────
    // Step 1: 선발투수 동기화 (GameCenter → baseball_matches)
    // ─────────────────────────────────────────
    if (!statsOnly) {
      const { games } = await fetchKboGameList(date)
      if (debug) {
        debugInfo = { gamesFound: games.length, games }
      }
      const effectiveDate = date

      console.log(`📋 KBO API: ${games.length} games found (date: ${effectiveDate})`)

      if (games.length > 0) {
        // DB에서 해당 날짜 KBO 경기 조회
        const { data: dbMatches, error: dbError } = await supabase
          .from('baseball_matches')
          .select('id, home_team, away_team, match_date, home_pitcher_ko, away_pitcher_ko')
          .eq('league', 'KBO')
          .eq('match_date', effectiveDate)

        if (dbError) throw dbError

        console.log(`📋 DB: ${dbMatches?.length || 0} KBO matches for ${effectiveDate}`)

        if (dbMatches && dbMatches.length > 0) {
          for (const game of games) {
            // DB 매치 찾기 (팀명 매칭)
            const dbMatch = dbMatches.find(
              (m) =>
                (teamMatchesDb(game.homeTeam, m.home_team) &&
                  teamMatchesDb(game.awayTeam, m.away_team)) ||
                (teamMatchesDb(game.homeTeam, m.away_team) &&
                  teamMatchesDb(game.awayTeam, m.home_team))
            )

            if (!dbMatch) {
              pitcherResults.push({
                game: `${game.awayTeam} @ ${game.homeTeam}`,
                status: 'NO_DB_MATCH',
                awayPitcher: game.awayPitcher,
                homePitcher: game.homePitcher,
              })
              continue
            }

            // 홈/어웨이 방향 확인
            const isReversed = teamMatchesDb(game.homeTeam, dbMatch.away_team)
            const updateData: Record<string, any> = {}

            if (!isReversed) {
              if (game.homePitcher) updateData.home_pitcher_ko = game.homePitcher
              if (game.awayPitcher) updateData.away_pitcher_ko = game.awayPitcher
            } else {
              if (game.homePitcher) updateData.away_pitcher_ko = game.homePitcher
              if (game.awayPitcher) updateData.home_pitcher_ko = game.awayPitcher
            }

            if (Object.keys(updateData).length === 0) {
              pitcherResults.push({
                game: `${game.awayTeam} @ ${game.homeTeam}`,
                dbMatch: `${dbMatch.away_team} @ ${dbMatch.home_team}`,
                status: 'NO_PITCHER_DATA',
              })
              continue
            }

            if (isDry) {
              pitcherResults.push({
                game: `${game.awayTeam} @ ${game.homeTeam}`,
                dbMatch: `${dbMatch.away_team} @ ${dbMatch.home_team}`,
                status: 'DRY_WOULD_UPDATE',
                updateData,
              })
              updatedPitchers++
            } else {
              const { data: updated, error: updateError } = await supabase
                .from('baseball_matches')
                .update(updateData)
                .eq('id', dbMatch.id)
                .select('id, home_team, away_team')

              if (updateError) {
                pitcherResults.push({
                  game: `${game.awayTeam} @ ${game.homeTeam}`,
                  status: 'UPDATE_ERROR',
                  error: updateError.message,
                })
              } else {
                updatedPitchers++
                pitcherResults.push({
                  game: `${game.awayTeam} @ ${game.homeTeam}`,
                  dbMatch: `${dbMatch.away_team} @ ${dbMatch.home_team}`,
                  status: 'UPDATED',
                  updateData,
                })
              }
            }
          }
        }
      }
    }

    // ─────────────────────────────────────────
    // Step 2: 투수 기록 동기화 (Records → kbo_pitcher_stats)
    // ─────────────────────────────────────────
    const records = await scrapeKboPitcherRecords(season)

    if (records.length > 0) {
      for (const record of records) {
        const upsertData = {
          name: record.name,
          team: record.team,
          season,
          era: record.era,
          games: record.games,
          wins: record.wins,
          losses: record.losses,
          saves: record.saves,
          holds: record.holds,
          wpct: record.wpct,
          hits: record.hits,
          home_runs: record.home_runs,
          walks: record.walks,
          hit_by_pitch: record.hit_by_pitch,
          strikeouts: record.strikeouts,
          runs: record.runs,
          earned_runs: record.earned_runs,
          whip: record.whip,
        }

        if (isDry) {
          statsResults.push({
            name: record.name,
            team: record.team,
            status: 'DRY_WOULD_UPSERT',
            era: record.era,
            whip: record.whip,
          })
          updatedStats++
        } else {
          const { error: upsertError } = await supabase
            .from('kbo_pitcher_stats')
            .upsert(upsertData, {
              onConflict: 'name,team,season',
            })

          if (upsertError) {
            statsResults.push({
              name: record.name,
              team: record.team,
              status: 'UPSERT_ERROR',
              error: upsertError.message,
            })
          } else {
            updatedStats++
            statsResults.push({
              name: record.name,
              team: record.team,
              status: 'UPSERTED',
              era: record.era,
              whip: record.whip,
            })
          }
        }
      }
    }

    // ─────────────────────────────────────────
    // Step 3: baseball_matches.{home,away}_pitcher_{era,whip,k} 갱신
    // 프론트는 이 컬럼을 직접 읽으므로, records를 매치별로 매핑해서 써넣어야 한다
    // ─────────────────────────────────────────
    let updatedMatchStats = 0
    if (!isDry && records.length > 0) {
      const { data: kboMatches } = await supabase
        .from('baseball_matches')
        .select('id, home_team, away_team, home_pitcher_ko, away_pitcher_ko')
        .eq('league', 'KBO')
        .eq('match_date', date)

      if (kboMatches && kboMatches.length > 0) {
        const findRecord = (name: string | null, team: string | null) => {
          if (!name) return null
          // 1차: 이름+팀
          let r = records.find((x) => x.name === name && (!team || teamMatchesDb(x.team, team) || teamMatchesDb(team, x.team)))
          // 2차: 이름만
          if (!r) r = records.find((x) => x.name === name)
          return r || null
        }
        for (const m of kboMatches) {
          const upd: Record<string, any> = {}
          const hr = findRecord(m.home_pitcher_ko, m.home_team)
          const ar = findRecord(m.away_pitcher_ko, m.away_team)
          if (hr) {
            upd.home_pitcher_era = typeof hr.era === 'number' ? hr.era : (parseFloat(hr.era as any) || null)
            upd.home_pitcher_whip = typeof hr.whip === 'number' ? hr.whip : (parseFloat(hr.whip as any) || null)
            upd.home_pitcher_k = hr.strikeouts ?? null
          }
          if (ar) {
            upd.away_pitcher_era = typeof ar.era === 'number' ? ar.era : (parseFloat(ar.era as any) || null)
            upd.away_pitcher_whip = typeof ar.whip === 'number' ? ar.whip : (parseFloat(ar.whip as any) || null)
            upd.away_pitcher_k = ar.strikeouts ?? null
          }
          if (Object.keys(upd).length > 0) {
            const { error: mErr } = await supabase
              .from('baseball_matches')
              .update(upd)
              .eq('id', m.id)
            if (!mErr) updatedMatchStats++
          }
        }
      }
    }

    console.log(`✅ KBO Sync Done — Pitchers: ${updatedPitchers}, Stats: ${updatedStats}, MatchStats: ${updatedMatchStats}`)

    return NextResponse.json({
      success: true,
      date,
      season,
      isDry,
      ...(debugInfo ? { debug: debugInfo } : {}),
      pitchers: {
        updated: updatedPitchers,
        results: pitcherResults,
      },
      stats: {
        scraped: records.length,
        updated: updatedStats,
        results: statsResults,
      },
      matchStatsUpdated: updatedMatchStats,
    })
  } catch (error: any) {
    console.error('❌ KBO sync error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
