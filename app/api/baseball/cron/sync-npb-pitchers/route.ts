// app/api/baseball/cron/sync-npb-pitchers/route.ts
// NPB 예고선발(予告先発) 자동 수집 & baseball_matches 업데이트
//
// GET /api/baseball/cron/sync-npb-pitchers              → 오늘 경기
// GET /api/baseball/cron/sync-npb-pitchers?date=2026-04-07  → 특정 날짜
// GET /api/baseball/cron/sync-npb-pitchers?dry=true     → 테스트 (DB 업데이트 안 함)
//
// 데이터 소스: NPB 공식 사이트 (npb.jp/announcement/starter/)
// 경기 4시간 전(보통 14:00 KST)에 예고선발이 공시됨
//
// Supabase Cron 추천 스케줄: 매일 14:00 KST (05:00 UTC)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scrapeYahooNpbStarters } from './yahoo-scraper'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ===================================================================
// 1. 일본어 팀명 → DB 팀 이름 매핑 (api-sports.io 기준 영문명)
// ===================================================================
// api-sports.io에서 NPB 팀을 저장할 때 사용하는 이름 기준
// baseball_matches.home_team / away_team 에 저장된 이름과 일치해야 함

const JP_TEAM_TO_DB: Record<string, string[]> = {
  // 세리그 (Central League)
  '巨人':     ['Yomiuri Giants', 'Yomiuri', 'Yomiuri G.', '読売ジャイアンツ', '요미우리'],
  'ヤクルト': ['Tokyo Yakult Swallows', 'Yakult Swallows', 'Yakult', 'ヤクルトスワローズ', '야쿠르트'],
  'DeNA':     ['Yokohama DeNA BayStars', 'Yokohama BayStars', 'Yokohama', 'DeNAベイスターズ', '요코하마'],
  '中日':     ['Chunichi Dragons', 'Chunichi', '中日ドラゴンズ', '주니치'],
  '阪神':     ['Hanshin Tigers', 'Hanshin', '阪神タイガース', '한신'],
  '広島':     ['Hiroshima Toyo Carp', 'Hiroshima Carp', 'Hiroshima', '広島東洋カープ', '히로시마'],
  // 파리그 (Pacific League)
  'オリックス': ['Orix Buffaloes', 'Orix', 'オリックスバファローズ', '오릭스'],
  'ロッテ':     ['Chiba Lotte Marines', 'Chiba Lotte', 'Lotte', '千葉ロッテマリーンズ', '지바롯데'],
  'ソフトバンク': ['Fukuoka SoftBank Hawks', 'Fukuoka S. Hawks', 'SoftBank', 'ソフトバンクホークス', '소프트뱅크'],
  '楽天':       ['Tohoku Rakuten Golden Eagles', 'Rakuten Gold. Eagles', 'Rakuten Eagles', 'Rakuten', '楽天イーグルス', '라쿠텐'],
  '西武':       ['Saitama Seibu Lions', 'Seibu Lions', 'Seibu', '西武ライオンズ', '세이부'],
  '日本ハム':   ['Hokkaido Nippon-Ham Fighters', 'Nippon Ham Fighters', 'Nippon-Ham', '日本ハムファイターズ', '니혼햄'],
}

// 역매핑: DB팀명 → 일본어 약어 (매칭용)
const DB_TO_JP: Record<string, string> = {}
for (const [jpShort, aliases] of Object.entries(JP_TEAM_TO_DB)) {
  for (const alias of aliases) {
    DB_TO_JP[alias.toLowerCase()] = jpShort
  }
  DB_TO_JP[jpShort.toLowerCase()] = jpShort
}

// DB 팀명으로 일본어 약어 찾기
function findJpTeamKey(dbTeamName: string): string | null {
  const lower = dbTeamName.toLowerCase()
  // 정확 매칭
  if (DB_TO_JP[lower]) return DB_TO_JP[lower]
  // 부분 매칭
  for (const [key, jpShort] of Object.entries(DB_TO_JP)) {
    if (lower.includes(key) || key.includes(lower)) return jpShort
  }
  return null
}

// 일본어 팀명에서 DB 팀명 후보 찾기
function findDbTeamNames(jpTeam: string): string[] {
  const cleaned = jpTeam.trim()
  // 직접 매칭
  if (JP_TEAM_TO_DB[cleaned]) return JP_TEAM_TO_DB[cleaned]
  // 부분 매칭
  for (const [key, aliases] of Object.entries(JP_TEAM_TO_DB)) {
    if (cleaned.includes(key) || key.includes(cleaned)) return aliases
  }
  return []
}

// ===================================================================
// 2. 일본어 투수명 → 한글 이름 매핑 (npb_pitcher_stats 테이블 활용)
// ===================================================================

// DB 팀명 정규화 (api-sports 영문 → npb_pitcher_stats의 한글 약어)
const NPB_TEAM_NORMALIZE: Record<string, string> = {
  'Yomiuri Giants': '요미우리',
  'Tokyo Yakult Swallows': '야쿠르트',
  'Yakult Swallows': '야쿠르트',
  'Yokohama DeNA BayStars': '요코하마',
  'Yokohama BayStars': '요코하마',
  'Chunichi Dragons': '주니치',
  'Hanshin Tigers': '한신',
  'Hiroshima Toyo Carp': '히로시마',
  'Hiroshima Carp': '히로시마',
  'Orix Buffaloes': '오릭스',
  'Chiba Lotte Marines': '지바롯데',
  'Fukuoka SoftBank Hawks': '소프트뱅크',
  'Fukuoka S. Hawks': '소프트뱅크',
  'Tohoku Rakuten Golden Eagles': '라쿠텐',
  'Rakuten Gold. Eagles': '라쿠텐',
  'Saitama Seibu Lions': '세이부',
  'Seibu Lions': '세이부',
  'Hokkaido Nippon-Ham Fighters': '니혼햄',
  'Nippon Ham Fighters': '니혼햄',
}

/**
 * 일본어 투수명 → 한글 이름 매칭 (npb_pitcher_stats.name_jp 활용)
 *
 * 매칭 순서:
 * 1. name_jp 컬럼에서 정확 매칭
 * 2. name_jp 컬럼에서 공백 제거 후 매칭 (半角/全角 스페이스 차이 대응)
 * 3. 매칭 실패 시 null → 일본어 이름 그대로 저장 + name_jp 자동 등록
 */
async function findKoreanPitcherName(
  jpPitcherName: string,
  dbTeamName: string,
  season: string
): Promise<string | null> {
  if (!jpPitcherName) return null

  const normalizedTeam = NPB_TEAM_NORMALIZE[dbTeamName] ?? dbTeamName
  const jpNameNoSpace = jpPitcherName.replace(/[\s　]+/g, '')

  // 1. name_jp 정확 매칭 (같은 팀)
  const { data: exactMatch } = await supabase
    .from('npb_pitcher_stats')
    .select('name, name_jp')
    .eq('season', season)
    .ilike('team', normalizedTeam)
    .eq('name_jp', jpPitcherName)
    .maybeSingle()

  if (exactMatch?.name) {
    console.log(`✅ name_jp 정확 매칭: ${jpPitcherName} → ${exactMatch.name}`)
    return exactMatch.name
  }

  // 2. 같은 팀 투수 중에서 name_jp 공백 제거 후 비교
  const { data: teamPitchers } = await supabase
    .from('npb_pitcher_stats')
    .select('name, name_jp')
    .eq('season', season)
    .ilike('team', normalizedTeam)
    .not('name_jp', 'is', null)

  if (teamPitchers && teamPitchers.length > 0) {
    const fuzzyMatch = teamPitchers.find(p =>
      p.name_jp && p.name_jp.replace(/[\s　]+/g, '') === jpNameNoSpace
    )
    if (fuzzyMatch?.name) {
      console.log(`✅ name_jp 퍼지 매칭: ${jpPitcherName} → ${fuzzyMatch.name}`)
      return fuzzyMatch.name
    }
  }

  // 3. 팀 무관하게 전체에서 name_jp 매칭 (이적 등 대응)
  const { data: globalMatch } = await supabase
    .from('npb_pitcher_stats')
    .select('name, name_jp, team')
    .eq('season', season)
    .eq('name_jp', jpPitcherName)
    .maybeSingle()

  if (globalMatch?.name) {
    console.log(`✅ name_jp 전체 매칭: ${jpPitcherName} → ${globalMatch.name} (${globalMatch.team})`)
    return globalMatch.name
  }

  // 4. 매칭 실패 → name_jp가 없는 같은 팀 투수에 자동 등록 시도는 안 함
  //    (동명이인 문제 때문에 수동 등록이 안전)
  console.log(`⚠️ name_jp 매칭 실패: ${jpPitcherName} (${normalizedTeam}) — 일본어 이름으로 저장`)
  return null
}

/**
 * DB에 없는 새 투수 자동 등록 + name_jp 매핑
 *
 * 1. name_jp가 이미 등록된 투수 → 스킵
 * 2. DB에 아예 없는 새 투수 → 자동 INSERT (일본어 이름으로 name + name_jp 동시 등록)
 * 3. name_jp가 NULL인 기존 투수 → name_jp 업데이트 시도
 */
async function autoRegisterNameJp(
  jpPitcherName: string,
  dbTeamName: string,
  season: string
): Promise<void> {
  if (!jpPitcherName) return

  const normalizedTeam = NPB_TEAM_NORMALIZE[dbTeamName] ?? dbTeamName

  // 이미 name_jp가 등록된 투수가 있으면 스킵
  const { data: existing } = await supabase
    .from('npb_pitcher_stats')
    .select('id, name_jp')
    .eq('season', season)
    .ilike('team', normalizedTeam)
    .eq('name_jp', jpPitcherName)
    .maybeSingle()

  if (existing) return // 이미 등록됨

  // 같은 팀에서 name_jp가 NULL인 투수 확인
  const { data: unmatched } = await supabase
    .from('npb_pitcher_stats')
    .select('id, name')
    .eq('season', season)
    .ilike('team', normalizedTeam)
    .is('name_jp', null)

  // name_jp 미등록 투수가 1명이면 자동 매핑 (안전)
  if (unmatched && unmatched.length === 1) {
    const { error } = await supabase
      .from('npb_pitcher_stats')
      .update({ name_jp: jpPitcherName })
      .eq('id', unmatched[0].id)

    if (!error) {
      console.log(`✅ name_jp 자동 매핑: ${jpPitcherName} → ${unmatched[0].name} (id=${unmatched[0].id})`)
    }
    return
  }

  // DB에 이 팀의 투수가 하나도 없거나, 미등록 투수가 여러 명이면
  // → 새 투수로 자동 INSERT (일본어 이름으로 저장, 한글 이름은 나중에 수동 업데이트)
  // 같은 팀에 같은 name_jp로 중복 INSERT 방지는 위에서 이미 체크함
  const { data: anyTeamPitcher } = await supabase
    .from('npb_pitcher_stats')
    .select('id')
    .eq('season', season)
    .ilike('team', normalizedTeam)
    .eq('name', jpPitcherName)
    .maybeSingle()

  if (anyTeamPitcher) return // 이미 일본어 이름으로 등록됨

  const { error: insertError } = await supabase
    .from('npb_pitcher_stats')
    .insert({
      name: jpPitcherName,        // 한글 이름이 없으니 일본어로 임시 저장
      name_jp: jpPitcherName,     // 일본어 이름
      team: normalizedTeam,
      season,
    })

  if (!insertError) {
    console.log(`🆕 새 투수 자동 등록: ${jpPitcherName} (${normalizedTeam}, ${season})`)
    console.log(`   → 한글 이름 수동 업데이트: UPDATE npb_pitcher_stats SET name = '한글이름' WHERE name_jp = '${jpPitcherName}' AND team = '${normalizedTeam}' AND season = '${season}';`)
  } else {
    console.error(`❌ 투수 등록 실패: ${jpPitcherName} (${normalizedTeam})`, insertError.message)
  }
}

// ===================================================================
// 2-B. NPB 선수 상세 페이지에서 투수 성적 스크래핑
// ===================================================================

interface NpbPitcherStats {
  games: number        // 登板 (등판)
  wins: number         // 勝利 (승)
  losses: number       // 敗北 (패)
  saves: number        // セーブ
  holds: number        // H (홀드)
  completeGames: number // 完投
  shutouts: number     // 完封勝
  winPct: string       // 勝率
  battersFaced: number // 打者
  inningsPitched: string // 投球回 (예: "6", "6.1", "125.2")
  hits: number         // 安打 (피안타)
  homeRuns: number     // 本塁打 (피홈런)
  walks: number        // 四球 (사구)
  hitByPitch: number   // 死球
  strikeouts: number   // 三振 (탈삼진)
  wildPitches: number  // 暴投
  runs: number         // 失点
  earnedRuns: number   // 自責点
  era: string          // 防御率 (ERA)
  // 계산 스탯
  whip?: string        // (안타+사구) / 이닝
  kPer9?: string       // 삼진 * 9 / 이닝
  bbPer9?: string      // 사구 * 9 / 이닝
}

/**
 * NPB 선수 상세 페이지에서 투수 시즌 성적 스크래핑
 * URL: https://npb.jp/bis/players/{npbPlayerId}.html
 *
 * HTML 구조:
 * <table id="tablefix_p">
 *   <thead> 년도 | 소속 | 등판 | 승 | 패 | ... | ERA </thead>
 *   <tbody>
 *     <tr class="registerStats"> 2026 | 소프트뱅크 | ... </tr>
 *     <tr class="registerStats total"> 통산 | ... </tr>
 *   </tbody>
 * </table>
 */
async function scrapeNpbPlayerStats(
  npbPlayerId: string,
  targetSeason?: string
): Promise<{ stats: NpbPitcherStats | null; error?: string }> {
  const url = `https://npb.jp/bis/players/${npbPlayerId}.html`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en;q=0.5',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return { stats: null, error: `HTTP ${res.status}` }

    const html = await res.text()
    const season = targetSeason || String(new Date().getFullYear())

    // 디버그: tablefix_p 존재 여부 확인
    const hasTable = html.includes('tablefix_p')
    const hasRegisterStats = html.includes('registerStats')
    const hasSeason = html.includes(season)
    const htmlLen = html.length

    const result = parseNpbPlayerStatsHtml(html, season)

    if (!result) {
      // 추가 디버그: tbody 찾기
      const tbStart = html.indexOf('id="tablefix_p"')
      const tbodyIdx = html.indexOf('<tbody>', tbStart > -1 ? tbStart : 0)
      const tbodyEndIdx = html.indexOf('</tbody>', tbodyIdx > -1 ? tbodyIdx : 0)
      return {
        stats: null,
        error: `파싱실패v2 (len=${htmlLen}, tblIdx=${tbStart}, tbodyIdx=${tbodyIdx}, tbodyEndIdx=${tbodyEndIdx}, table=${hasTable}, reg=${hasRegisterStats}, yr=${hasSeason})`,
      }
    }

    return { stats: result }
  } catch (e: any) {
    return { stats: null, error: e.message }
  }
}

/**
 * 선수 상세 페이지 HTML에서 투수 성적 파싱
 *
 * ★ 주의: 投球回 컬럼에 중첩 <table>이 있어서 <tr> 경계를 정규식으로 잡을 수 없음
 *   <td><table><tbody><tr><th>6</th><td></td></tr></tbody></table></td>
 *
 * 해결 전략: <tr class="registerStats">부터 다음 <tr (또는 </tbody>)까지의
 * 전체 블록에서 최상위 <td>만 추출 (중첩 테이블 안의 td/th는 제외)
 *
 * 최종 컬럼 순서 (투球回의 중첩 테이블은 1셀로 합쳐짐):
 * 0:年度 1:球団 2:登板 3:勝 4:敗 5:S 6:H 7:HP 8:完投 9:完封 10:無四球
 * 11:勝率 12:打者 13:投球回(이닝) 14:安打 15:本塁打 16:四球 17:死球
 * 18:三振 19:暴投 20:ボーク 21:失点 22:自責点 23:防御率
 */
function parseNpbPlayerStatsHtml(html: string, season: string): NpbPitcherStats | null {
  // <table id="tablefix_p"> 내용 추출
  const tableStart = html.indexOf('id="tablefix_p"')
  if (tableStart === -1) return null

  // 외부 tbody의 시작~끝 찾기 (중첩 테이블의 </tbody>를 건너뛰어야 함)
  const tbodyStart = html.indexOf('<tbody>', tableStart)
  if (tbodyStart === -1) return null

  // 중첩 <table> 깊이를 추적해서 올바른 </tbody> 찾기
  let tbodyEnd = -1
  let depth = 0
  let searchIdx = tbodyStart + 7 // '<tbody>' 이후부터
  while (searchIdx < html.length) {
    const nextTable = html.indexOf('<table', searchIdx)
    const nextCloseTable = html.indexOf('</table>', searchIdx)
    const nextCloseTbody = html.indexOf('</tbody>', searchIdx)

    // 가장 먼저 나오는 태그 결정
    const candidates = [
      { type: 'open', idx: nextTable },
      { type: 'closeTable', idx: nextCloseTable },
      { type: 'closeTbody', idx: nextCloseTbody },
    ].filter(c => c.idx !== -1).sort((a, b) => a.idx - b.idx)

    if (candidates.length === 0) break

    const first = candidates[0]
    if (first.type === 'open') {
      depth++
      searchIdx = first.idx + 6
    } else if (first.type === 'closeTable') {
      depth = Math.max(0, depth - 1)
      searchIdx = first.idx + 8
    } else if (first.type === 'closeTbody') {
      if (depth === 0) {
        tbodyEnd = first.idx
        break
      }
      searchIdx = first.idx + 8
    }
  }

  if (tbodyEnd === -1) return null

  const tbodyHtml = html.substring(tbodyStart, tbodyEnd)

  // registerStats 행 블록 추출
  // <tr class="registerStats">부터 다음 최상위 <tr 또는 </tbody>까지
  const rowStarts: number[] = []
  const regPattern = /<tr\s+class="registerStats[^"]*"[^>]*>/gi
  let regMatch
  while ((regMatch = regPattern.exec(tbodyHtml)) !== null) {
    rowStarts.push(regMatch.index + regMatch[0].length)
  }

  if (rowStarts.length === 0) return null

  // 각 행의 끝: 다음 행 시작 또는 tbody 끝
  for (let i = 0; i < rowStarts.length; i++) {
    const start = rowStarts[i]
    const end = i + 1 < rowStarts.length
      ? tbodyHtml.lastIndexOf('<tr', rowStarts[i + 1])
      : tbodyHtml.length

    const rowBlock = tbodyHtml.substring(start, end)

    // 통산(通算) 행 스킵
    if (rowBlock.includes('通') && rowBlock.includes('算')) continue

    // 시즌 매칭
    if (!rowBlock.includes(season)) continue

    // 최상위 <td> 값 추출 (중첩 테이블 안의 td/th는 무시)
    const cells = extractTopLevelCells(rowBlock)

    if (cells.length < 23) continue // 최소 컬럼

    return buildPitcherStats(cells)
  }

  return null
}

/**
 * HTML 블록에서 최상위 <td> 값만 추출
 * 중첩 <table> 안의 <td>/<th>는 무시하고, 중첩 테이블 전체를 텍스트로 합침
 */
function extractTopLevelCells(html: string): string[] {
  const cells: string[] = []
  let depth = 0  // 중첩 table 깊이
  let i = 0

  while (i < html.length) {
    // 중첩 table 감지
    if (html.substring(i, i + 6).toLowerCase() === '<table') {
      depth++
      const closeIdx = html.indexOf('</table>', i)
      if (closeIdx === -1) break
      i = closeIdx + 8
      depth--
      continue
    }

    // 최상위 레벨의 <td> 찾기
    if (depth === 0 && html.substring(i, i + 3).toLowerCase() === '<td') {
      // <td ...> 태그 끝 찾기
      const tagEnd = html.indexOf('>', i)
      if (tagEnd === -1) break

      // 이 td의 닫는 </td> 찾기 (중첩 table 고려)
      let tdContent = ''
      let j = tagEnd + 1
      let innerDepth = 0

      while (j < html.length) {
        if (html.substring(j, j + 6).toLowerCase() === '<table') {
          innerDepth++
          // 중첩 테이블 안의 텍스트도 포함 (투구이닝 값)
          const innerClose = html.indexOf('</table>', j)
          if (innerClose === -1) break
          // 중첩 테이블 안의 텍스트 추출
          const innerHtml = html.substring(j, innerClose + 8)
          tdContent += innerHtml
          j = innerClose + 8
          innerDepth--
          continue
        }

        if (innerDepth === 0 && html.substring(j, j + 5).toLowerCase() === '</td>') {
          // td 종료
          break
        }

        tdContent += html[j]
        j++
      }

      // 모든 HTML 태그 제거하고 텍스트만 추출
      const text = tdContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      cells.push(text)
      i = j + 5 // </td> 이후
      continue
    }

    i++
  }

  return cells
}

/**
 * 추출된 셀 배열 → NpbPitcherStats 변환
 * 투球回 중첩 테이블이 한 셀로 합쳐지므로 인덱스가 깔끔함
 * 例: "6" (정수 이닝) 또는 "125 2" (125와 2/3이닝 → 소수부를 숫자로 파싱)
 */
function buildPitcherStats(cells: string[]): NpbPitcherStats {
  const toNum = (s: string) => {
    const n = parseFloat(s)
    return isNaN(n) ? 0 : n
  }

  // 투구이닝: 중첩 테이블에서 "6" 또는 "125 2" 형태로 추출됨
  const ipRaw = cells[13] || '0'
  const ipParts = ipRaw.split(/\s+/).filter(Boolean)
  let inningsPitched = ipParts[0] || '0'
  if (ipParts.length > 1 && ipParts[1]) {
    // "2" → 2/3이닝 = ".2", "1" → 1/3이닝 = ".1"
    const frac = ipParts[1]
    if (frac === '1' || frac === '1/3') inningsPitched += '.1'
    else if (frac === '2' || frac === '2/3') inningsPitched += '.2'
  }

  const hits = toNum(cells[14])
  const walks = toNum(cells[16])
  const strikeouts = toNum(cells[18])

  const ipNum = parseInnings(inningsPitched)

  const whip = ipNum > 0 ? ((hits + walks) / ipNum).toFixed(2) : '-'
  const kPer9 = ipNum > 0 ? ((strikeouts * 9) / ipNum).toFixed(2) : '-'
  const bbPer9 = ipNum > 0 ? ((walks * 9) / ipNum).toFixed(2) : '-'

  return {
    games: toNum(cells[2]),
    wins: toNum(cells[3]),
    losses: toNum(cells[4]),
    saves: toNum(cells[5]),
    holds: toNum(cells[6]),
    completeGames: toNum(cells[8]),
    shutouts: toNum(cells[9]),
    winPct: cells[11] || '0',
    battersFaced: toNum(cells[12]),
    inningsPitched,
    hits,
    homeRuns: toNum(cells[15]),
    walks,
    hitByPitch: toNum(cells[17]),
    strikeouts,
    wildPitches: toNum(cells[19]),
    runs: toNum(cells[21]),
    earnedRuns: toNum(cells[22]),
    era: cells[23] || '0',
    whip,
    kPer9,
    bbPer9,
  }
}

/**
 * 이닝 문자열 → 소수 변환
 * "6" → 6.0, "125.1" → 125.333, "125.2" → 125.667
 * NPB는 1/3이닝을 .1, 2/3이닝을 .2로 표기
 */
function parseInnings(ip: string): number {
  if (!ip || ip === '-') return 0
  const parts = ip.split('.')
  const full = parseInt(parts[0]) || 0
  const fraction = parts[1] ? parseInt(parts[1]) / 3 : 0
  return full + fraction
}

// ===================================================================
// 3. NPB 공식 사이트 스크래핑
// ===================================================================

interface ScrapedGame {
  homeTeamJp: string        // 일본어 홈팀명
  awayTeamJp: string        // 일본어 원정팀명
  homePitcherJp: string     // 일본어 홈 선발투수명
  awayPitcherJp: string     // 일본어 원정 선발투수명
  homePitcherNpbId?: string // NPB 선수 ID (예: "23525152")
  awayPitcherNpbId?: string // NPB 선수 ID
  venue?: string            // 구장
}

async function scrapeNpbStarters(): Promise<{
  games: ScrapedGame[]
  scrapedDate?: string  // 페이지에 표시된 날짜 (YYYY-MM-DD)
  rawHtml?: string
  error?: string
}> {
  const url = 'https://npb.jp/announcement/starter/'

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en;q=0.5',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return { games: [], error: `HTTP ${res.status}` }
    }

    const html = await res.text()
    const games = parseNpbStarterHtml(html)
    const scrapedDate = extractDateFromHtml(html)

    return { games, scrapedDate, rawHtml: html.substring(0, 8000) }

  } catch (e: any) {
    return { games: [], error: e.message }
  }
}

/**
 * HTML에서 예고선발 날짜 추출
 * "4月8日の予告先発投手" → "2026-04-08"
 * "12月31日の予告先発投手" → "2026-12-31"
 */
function extractDateFromHtml(html: string): string | undefined {
  // 패턴: "X月Y日の予告先発"
  const dateMatch = html.match(/(\d{1,2})月(\d{1,2})日の予告先発/)
  if (!dateMatch) return undefined

  const month = parseInt(dateMatch[1])
  const day = parseInt(dateMatch[2])

  // 현재 연도 기준 (KST)
  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  let year = kstNow.getFullYear()

  // 12월에 1월 경기가 보일 수 있으니 연도 보정
  const currentMonth = kstNow.getMonth() + 1
  if (currentMonth === 12 && month === 1) year += 1
  if (currentMonth === 1 && month === 12) year -= 1

  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')

  return `${year}-${mm}-${dd}`
}

/**
 * NPB 공식 예고선발 페이지 HTML 파싱
 *
 * npb.jp/announcement/starter/ 실제 구조 (2026 확인):
 *
 * <div class="unit pl_3">                          ← 경기 1건
 *   <div class="team_left">                        ← 왼쪽 팀 (홈)
 *     <img alt="福岡ソフトバンクホークス">            ← 팀 풀네임 (alt)
 *     <a href="/bis/players/...">
 *       <span>徐 若熙</span>                        ← 투수명
 *     </a>
 *   </div>
 *   <div class="team_right">                       ← 오른쪽 팀 (원정)
 *     <img alt="埼玉西武ライオンズ">                  ← 팀 풀네임 (alt)
 *     <a href="/bis/players/...">...</a>            ← 투수명
 *   </div>
 *   <div class="info"> (みずほPayPay) 18:00 </div> ← 구장 + 시간
 * </div>
 *
 * team_left = 홈팀 (구장 소유팀), team_right = 원정팀
 */
function parseNpbStarterHtml(html: string): ScrapedGame[] {
  // ===== 핵심 전략: <div class="unit ..."> 블록 파싱 =====
  const unitGames = parseUnitBlocks(html)
  if (unitGames.length > 0) return unitGames

  // ===== 폴백: 범용 텍스트 기반 파싱 =====
  return parseFallbackText(html)
}

// ---- 핵심: <div class="unit ..."> 블록 파싱 ----
function parseUnitBlocks(html: string): ScrapedGame[] {
  const games: ScrapedGame[] = []

  // <div class="unit pl_3"> ... </div> 블록 추출
  // unit 뒤에 pl_1 ~ pl_6, 또는 다른 클래스가 붙을 수 있음
  // 블록 경계: 다음 "unit" div 시작 또는 섹션 종료
  // 더 넓은 패턴으로 매칭 (unit만 포함되면 OK)
  const unitPattern = /<div\s[^>]*class="unit[^"]*"[^>]*>([\s\S]*?)(?=<div\s[^>]*class="unit[^"]*"|<\/section|<\/article|<footer|$)/gi
  let unitMatch

  console.log(`🔍 HTML 길이: ${html.length}, "unit" 포함 횟수: ${(html.match(/class="unit/g) || []).length}`)

  while ((unitMatch = unitPattern.exec(html)) !== null) {
    const block = unitMatch[1]

    // team_left (홈팀): <div class="team_left"> 내부
    const leftTeam = extractTeamFromBlock(block, 'team_left')
    // team_right (원정팀): <div class="team_right"> 내부
    const rightTeam = extractTeamFromBlock(block, 'team_right')

    console.log(`📦 unit 블록: left=${leftTeam.teamName}(${leftTeam.pitcherName}), right=${rightTeam.teamName}(${rightTeam.pitcherName})`)

    if (!leftTeam.teamName && !rightTeam.teamName) continue

    // info 블록에서 구장 + 시간 추출
    const infoMatch = block.match(/<div\s+class="info"[^>]*>([\s\S]*?)<\/div>/i)
    const info = infoMatch ? infoMatch[1].replace(/<[^>]+>/g, '').trim() : ''
    const venueMatch = info.match(/\(([^)]+)\)/)
    const venue = venueMatch ? venueMatch[1] : ''

    games.push({
      homeTeamJp: leftTeam.teamName,      // team_left = 홈
      awayTeamJp: rightTeam.teamName,     // team_right = 원정
      homePitcherJp: leftTeam.pitcherName,
      awayPitcherJp: rightTeam.pitcherName,
      homePitcherNpbId: leftTeam.npbPlayerId,
      awayPitcherNpbId: rightTeam.npbPlayerId,
      venue,
    })
  }

  return games
}

// team_left 또는 team_right div에서 팀명, 투수명, NPB 선수ID 추출
function extractTeamFromBlock(
  blockHtml: string,
  className: 'team_left' | 'team_right'
): { teamName: string; pitcherName: string; npbPlayerId?: string } {
  // <div class="team_left"> ... </div> 내부 추출
  // 중첩 div 때문에 </div>가 여러 개 있을 수 있으므로 img + a 태그만 파싱
  const divPattern = new RegExp(
    `<div\\s+class="${className}"[^>]*>([\\s\\S]*?)(?=<div\\s+class="(?:team_|info)|$)`,
    'i'
  )
  const divMatch = blockHtml.match(divPattern)
  if (!divMatch) return { teamName: '', pitcherName: '' }

  const content = divMatch[1]

  // 팀명: <img alt="福岡ソフトバンクホークス" ...> 의 alt 속성
  const imgAltMatch = content.match(/<img[^>]*\balt="([^"]+)"[^>]*>/i)
  const teamFullName = imgAltMatch ? imgAltMatch[1].trim() : ''

  // NPB 선수 ID: <a href="/bis/players/23525152.html"> 에서 추출
  let npbPlayerId: string | undefined
  const playerIdMatch = content.match(/\/bis\/players\/(\d+)\.html/i)
  if (playerIdMatch) {
    npbPlayerId = playerIdMatch[1]
  }

  // 투수명: <a href="/bis/players/..."><span>徐 若熙</span></a>
  // 또는 <a> 안에 직접 텍스트
  let pitcherName = ''

  // 방법 1: <span> 안의 텍스트 (가장 정확)
  const spanMatch = content.match(/<a[^>]*href="\/bis\/players\/[^"]*"[^>]*>[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<\/a>/i)
  if (spanMatch) {
    pitcherName = spanMatch[1].trim()
  } else {
    // 방법 2: <a href="/bis/players/...">텍스트</a>
    const aMatch = content.match(/<a[^>]*href="\/bis\/players\/[^"]*"[^>]*>([^<]+)<\/a>/i)
    if (aMatch) {
      pitcherName = aMatch[1].trim()
    } else {
      // 방법 3: 모든 <a> 태그에서 /bis/players/ 링크가 있는 것의 텍스트
      const allAPattern = /<a[^>]*href="\/bis\/players\/[^"]*"[^>]*>([\s\S]*?)<\/a>/gi
      let aM
      while ((aM = allAPattern.exec(content)) !== null) {
        const text = aM[1].replace(/<[^>]+>/g, '').trim()
        // 이미지가 아닌 텍스트가 있는 경우만
        if (text && !text.match(/^\s*$/)) {
          pitcherName = text
          break
        }
      }
    }
  }

  // 팀 풀네임 → 약어로 변환 (DB 매칭에 풀네임도 사용하므로 풀네임 유지)
  // 약어 추출은 JP_TEAM_TO_DB 매핑에서 처리
  // 여기서는 풀네임에서 약어도 같이 추출
  const teamShort = fullNameToShort(teamFullName)

  return {
    teamName: teamShort || teamFullName,
    pitcherName: pitcherName.replace(/\s+/g, ' ').trim(),
    npbPlayerId,
  }
}

// 일본어 풀네임 → 약어 변환
// 예: "福岡ソフトバンクホークス" → "ソフトバンク"
//     "埼玉西武ライオンズ" → "西武"
const FULLNAME_TO_SHORT: Record<string, string> = {
  '読売ジャイアンツ': '巨人',
  '東京ヤクルトスワローズ': 'ヤクルト',
  '横浜DeNAベイスターズ': 'DeNA',
  '中日ドラゴンズ': '中日',
  '阪神タイガース': '阪神',
  '広島東洋カープ': '広島',
  'オリックス・バファローズ': 'オリックス',
  'オリックスバファローズ': 'オリックス',
  '千葉ロッテマリーンズ': 'ロッテ',
  '福岡ソフトバンクホークス': 'ソフトバンク',
  '東北楽天ゴールデンイーグルス': '楽天',
  '埼玉西武ライオンズ': '西武',
  '北海道日本ハムファイターズ': '日本ハム',
}

function fullNameToShort(fullName: string): string {
  if (FULLNAME_TO_SHORT[fullName]) return FULLNAME_TO_SHORT[fullName]
  // 부분 매칭
  for (const [full, short] of Object.entries(FULLNAME_TO_SHORT)) {
    if (fullName.includes(short) || full.includes(fullName)) return short
  }
  return ''
}

// ---- 폴백: 텍스트 기반 범용 파싱 ----
function parseFallbackText(html: string): ScrapedGame[] {
  const games: ScrapedGame[] = []

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\n{2,}/g, '\n')

  const teamPattern = '巨人|ヤクルト|DeNA|中日|阪神|広島|オリックス|ロッテ|ソフトバンク|楽天|西武|日本ハム'

  const linePattern = new RegExp(
    `(${teamPattern})\\s*[：:]?\\s*([^\\n\\s]{2,10})\\s*[-ー×vs]+\\s*([^\\n\\s]{2,10})\\s*[：:]?\\s*(${teamPattern})`,
    'g'
  )

  let lineMatch
  while ((lineMatch = linePattern.exec(text)) !== null) {
    games.push({
      homeTeamJp: lineMatch[1],
      homePitcherJp: lineMatch[2],
      awayPitcherJp: lineMatch[3],
      awayTeamJp: lineMatch[4],
    })
  }

  return games
}

// ===================================================================
// 4. DB 매칭 & 업데이트 로직
// ===================================================================

interface MatchResult {
  matchId: number
  homeTeam: string
  awayTeam: string
  homeTeamJp: string
  awayTeamJp: string
  homePitcherJp: string
  awayPitcherJp: string
  homePitcherKo: string | null
  awayPitcherKo: string | null
  status: 'UPDATED' | 'ALREADY_SET' | 'NOT_MATCHED' | 'NO_PITCHER' | 'ERROR'
  error?: string
}

// DB 팀명과 일본어 팀명 매칭
function matchTeam(dbTeamName: string, jpTeam: string): boolean {
  const dbAliases = findDbTeamNames(jpTeam)
  if (dbAliases.length === 0) return false

  const dbLower = dbTeamName.toLowerCase()
  return dbAliases.some(alias => {
    const aliasLower = alias.toLowerCase()
    return dbLower === aliasLower ||
           dbLower.includes(aliasLower) ||
           aliasLower.includes(dbLower)
  })
}

// ===================================================================
// 5. API Route Handler
// ===================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')  // 수동 지정 날짜 (있으면 이걸 우선 사용)
  const dryRun = searchParams.get('dry') === 'true'
  const force = searchParams.get('force') === 'true' // 이미 설정된 투수도 덮어쓰기
  const season = searchParams.get('season') || String(new Date().getFullYear())

  console.log(`🏟️ NPB 선발투수 동기화 시작 (dry=${dryRun}, force=${force})`)

  try {
    // Step 1: NPB 공식 사이트에서 예고선발 스크래핑
    let { games: scrapedGames, scrapedDate, rawHtml, error: scrapeError } = await scrapeNpbStarters()

    // NPB 공식 사이트 실패 시 Yahoo Japan 백업 소스 시도
    if (scrapeError || scrapedGames.length === 0) {
      console.log(`⚠️ NPB 공식 사이트 실패(${scrapeError || '0 games'}), Yahoo Japan 백업 시도...`)

      // Yahoo 백업은 날짜 지정 가능 — dateParam 또는 오늘 날짜 사용
      const yahooDate = dateParam || getKSTDateString()
      const yahooResult = await scrapeYahooNpbStarters(yahooDate)
      if (yahooResult.games.length > 0) {
        scrapedGames.push(...yahooResult.games.map(g => ({
          homeTeamJp: g.homeTeamJp,
          awayTeamJp: g.awayTeamJp,
          homePitcherJp: g.homePitcherJp,
          awayPitcherJp: g.awayPitcherJp,
        })))
        // Yahoo는 날짜를 직접 지정하므로 scrapedDate가 없으면 yahooDate 사용
        if (!scrapedDate) scrapedDate = yahooDate
        console.log(`✅ Yahoo Japan에서 ${yahooResult.games.length}경기 백업 데이터 확보`)
      } else if (scrapeError) {
        return NextResponse.json({
          success: false,
          error: `스크래핑 실패: npb.jp(${scrapeError}), yahoo(${yahooResult.error || 'no games'})`,
          hint: '두 소스 모두 접근 불가. 서버 IP 또는 페이지 구조 변경 확인 필요.',
        }, { status: 502 })
      }
    }

    if (scrapedGames.length === 0) {
      return NextResponse.json({
        success: true,
        message: '오늘 예고선발 정보가 없습니다 (휴일 또는 아직 미공시)',
        scrapedGames: [],
        rawHtmlPreview: rawHtml?.substring(0, 500),
        updated: 0,
      })
    }

    // ★ 핵심: DB 조회 날짜 결정
    // 1순위: ?date= 파라미터 (수동 지정)
    // 2순위: scrapedDate (HTML에서 추출한 "4月8日" 등)
    // 3순위: 오늘 날짜 (KST)
    const date = dateParam || scrapedDate || getKSTDateString()

    console.log(`📅 스크래핑 날짜: ${scrapedDate || '(추출 실패)'} → DB 조회 날짜: ${date}`)
    console.log(`📋 스크래핑 결과: ${scrapedGames.length}경기`)
    scrapedGames.forEach((g, i) => {
      console.log(`  ${i + 1}. ${g.awayTeamJp}(${g.awayPitcherJp}) vs ${g.homeTeamJp}(${g.homePitcherJp})`)
    })

    // Step 2: DB에서 해당 날짜 NPB 경기 조회
    const { data: dbMatches, error: dbError } = await supabase
      .from('baseball_matches')
      .select('id, home_team, away_team, home_team_ko, away_team_ko, home_pitcher_ko, away_pitcher_ko, match_date, match_time')
      .eq('league', 'NPB')
      .eq('match_date', date)
      .order('match_time', { ascending: true })

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 })
    }

    if (!dbMatches || dbMatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: `DB에 ${date} NPB 경기가 없습니다.`,
        scrapedGames,
        updated: 0,
      })
    }

    console.log(`📋 DB NPB 경기: ${dbMatches.length}건`)

    // Step 3: 매칭 & 업데이트
    const results: MatchResult[] = []
    let updatedCount = 0
    const usedScrapedIdx = new Set<number>()

    for (const dbMatch of dbMatches) {
      // 스크래핑 결과에서 매칭되는 경기 찾기
      let matchedGame: ScrapedGame | null = null
      let matchedIdx = -1

      for (let i = 0; i < scrapedGames.length; i++) {
        if (usedScrapedIdx.has(i)) continue

        const sg = scrapedGames[i]
        const homeMatch = matchTeam(dbMatch.home_team, sg.homeTeamJp) ||
                          matchTeam(dbMatch.home_team_ko || '', sg.homeTeamJp)
        const awayMatch = matchTeam(dbMatch.away_team, sg.awayTeamJp) ||
                          matchTeam(dbMatch.away_team_ko || '', sg.awayTeamJp)

        if (homeMatch && awayMatch) {
          matchedGame = sg
          matchedIdx = i
          break
        }

        // 홈/어웨이가 뒤집힌 경우도 체크
        const homeMatchReverse = matchTeam(dbMatch.home_team, sg.awayTeamJp) ||
                                  matchTeam(dbMatch.home_team_ko || '', sg.awayTeamJp)
        const awayMatchReverse = matchTeam(dbMatch.away_team, sg.homeTeamJp) ||
                                  matchTeam(dbMatch.away_team_ko || '', sg.homeTeamJp)

        if (homeMatchReverse && awayMatchReverse) {
          // 스크래핑 데이터의 홈/어웨이가 뒤집혀 있음
          matchedGame = {
            homeTeamJp: sg.awayTeamJp,
            awayTeamJp: sg.homeTeamJp,
            homePitcherJp: sg.awayPitcherJp,
            awayPitcherJp: sg.homePitcherJp,
          }
          matchedIdx = i
          break
        }
      }

      if (!matchedGame || matchedIdx === -1) {
        results.push({
          matchId: dbMatch.id,
          homeTeam: dbMatch.home_team,
          awayTeam: dbMatch.away_team,
          homeTeamJp: '',
          awayTeamJp: '',
          homePitcherJp: '',
          awayPitcherJp: '',
          homePitcherKo: null,
          awayPitcherKo: null,
          status: 'NOT_MATCHED',
        })
        continue
      }

      usedScrapedIdx.add(matchedIdx)

      // 이미 투수가 설정되어 있고 force가 아니면 스킵
      if (!force && dbMatch.home_pitcher_ko && dbMatch.away_pitcher_ko) {
        results.push({
          matchId: dbMatch.id,
          homeTeam: dbMatch.home_team,
          awayTeam: dbMatch.away_team,
          homeTeamJp: matchedGame.homeTeamJp,
          awayTeamJp: matchedGame.awayTeamJp,
          homePitcherJp: matchedGame.homePitcherJp,
          awayPitcherJp: matchedGame.awayPitcherJp,
          homePitcherKo: dbMatch.home_pitcher_ko,
          awayPitcherKo: dbMatch.away_pitcher_ko,
          status: 'ALREADY_SET',
        })
        continue
      }

      if (!matchedGame.homePitcherJp && !matchedGame.awayPitcherJp) {
        results.push({
          matchId: dbMatch.id,
          homeTeam: dbMatch.home_team,
          awayTeam: dbMatch.away_team,
          homeTeamJp: matchedGame.homeTeamJp,
          awayTeamJp: matchedGame.awayTeamJp,
          homePitcherJp: '',
          awayPitcherJp: '',
          homePitcherKo: null,
          awayPitcherKo: null,
          status: 'NO_PITCHER',
        })
        continue
      }

      // 한글 이름 매칭 시도 (npb_pitcher_stats 테이블)
      const [homePitcherKo, awayPitcherKo] = await Promise.all([
        matchedGame.homePitcherJp
          ? findKoreanPitcherName(matchedGame.homePitcherJp, dbMatch.home_team, season)
          : Promise.resolve(null),
        matchedGame.awayPitcherJp
          ? findKoreanPitcherName(matchedGame.awayPitcherJp, dbMatch.away_team, season)
          : Promise.resolve(null),
      ])

      // 한글 이름이 없으면 일본어 이름 그대로 저장
      const finalHomePitcher = homePitcherKo || matchedGame.homePitcherJp || null
      const finalAwayPitcher = awayPitcherKo || matchedGame.awayPitcherJp || null

      // 매칭 안 된 투수는 name_jp 수동 등록 가이드 로그 출력
      if (!dryRun) {
        if (!homePitcherKo && matchedGame.homePitcherJp) {
          await autoRegisterNameJp(matchedGame.homePitcherJp, dbMatch.home_team, season)
        }
        if (!awayPitcherKo && matchedGame.awayPitcherJp) {
          await autoRegisterNameJp(matchedGame.awayPitcherJp, dbMatch.away_team, season)
        }
      }

      if (!dryRun) {
        const updateData: Record<string, any> = {}
        if (finalHomePitcher && (force || !dbMatch.home_pitcher_ko)) {
          updateData.home_pitcher_ko = finalHomePitcher
        }
        if (finalAwayPitcher && (force || !dbMatch.away_pitcher_ko)) {
          updateData.away_pitcher_ko = finalAwayPitcher
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('baseball_matches')
            .update(updateData)
            .eq('id', dbMatch.id)

          if (updateError) {
            results.push({
              matchId: dbMatch.id,
              homeTeam: dbMatch.home_team,
              awayTeam: dbMatch.away_team,
              homeTeamJp: matchedGame.homeTeamJp,
              awayTeamJp: matchedGame.awayTeamJp,
              homePitcherJp: matchedGame.homePitcherJp,
              awayPitcherJp: matchedGame.awayPitcherJp,
              homePitcherKo: finalHomePitcher,
              awayPitcherKo: finalAwayPitcher,
              status: 'ERROR',
              error: updateError.message,
            })
            continue
          }
        }
      }

      updatedCount++
      results.push({
        matchId: dbMatch.id,
        homeTeam: dbMatch.home_team,
        awayTeam: dbMatch.away_team,
        homeTeamJp: matchedGame.homeTeamJp,
        awayTeamJp: matchedGame.awayTeamJp,
        homePitcherJp: matchedGame.homePitcherJp,
        awayPitcherJp: matchedGame.awayPitcherJp,
        homePitcherKo: finalHomePitcher,
        awayPitcherKo: finalAwayPitcher,
        status: 'UPDATED',
      })
    }

    console.log(`✅ NPB 선발투수 동기화 완료: ${updatedCount}/${dbMatches.length} 업데이트${dryRun ? ' (DRY RUN)' : ''}`)

    // Step 4: NPB 선수 상세 페이지에서 투수 성적 스크래핑 & DB 업데이트
    const statsResults: Array<{ pitcher: string; npbId: string; stats: NpbPitcherStats | null; updated: boolean; error?: string }> = []

    // NPB ID가 있는 투수들의 스탯 가져오기
    const pitchersToScrape: Array<{ jpName: string; npbId: string; dbTeam: string }> = []
    for (const sg of scrapedGames) {
      if (sg.homePitcherNpbId && sg.homePitcherJp) {
        const dbTeam = results.find(r => r.homePitcherJp === sg.homePitcherJp)?.homeTeam
        if (dbTeam) pitchersToScrape.push({ jpName: sg.homePitcherJp, npbId: sg.homePitcherNpbId, dbTeam })
      }
      if (sg.awayPitcherNpbId && sg.awayPitcherJp) {
        const dbTeam = results.find(r => r.awayPitcherJp === sg.awayPitcherJp)?.awayTeam
        if (dbTeam) pitchersToScrape.push({ jpName: sg.awayPitcherJp, npbId: sg.awayPitcherNpbId, dbTeam })
      }
    }

    // 중복 제거 (같은 NPB ID)
    const uniquePitchers = pitchersToScrape.filter(
      (p, i, arr) => arr.findIndex(x => x.npbId === p.npbId) === i
    )

    if (uniquePitchers.length > 0) {
      console.log(`📊 투수 성적 스크래핑 시작: ${uniquePitchers.length}명`)

      for (const pitcher of uniquePitchers) {
        const { stats, error: statsError } = await scrapeNpbPlayerStats(pitcher.npbId, season)

        if (stats && !dryRun) {
          // npb_pitcher_stats 테이블 업데이트
          const normalizedTeam = NPB_TEAM_NORMALIZE[pitcher.dbTeam] ?? pitcher.dbTeam
          const updatePayload: Record<string, any> = {
            era: parseFloat(stats.era) || 0,
            whip: stats.whip && stats.whip !== '-' ? parseFloat(stats.whip) : null,
            innings_pitched: stats.inningsPitched,
            wins: stats.wins,
            losses: stats.losses,
            saves: stats.saves,
            holds: stats.holds,
            games: stats.games,
            strikeouts: stats.strikeouts,
            walks: stats.walks,
            hits_allowed: stats.hits,
            home_runs_allowed: stats.homeRuns,
            earned_runs: stats.earnedRuns,
            k_per_9: stats.kPer9 && stats.kPer9 !== '-' ? parseFloat(stats.kPer9) : null,
            bb_per_9: stats.bbPer9 && stats.bbPer9 !== '-' ? parseFloat(stats.bbPer9) : null,
            npb_player_id: pitcher.npbId,
          }

          // name_jp로 매칭해서 업데이트 (select로 업데이트 결과 확인)
          const { data: updateData, error: updateErr } = await supabase
            .from('npb_pitcher_stats')
            .update(updatePayload)
            .eq('season', season)
            .ilike('team', normalizedTeam)
            .eq('name_jp', pitcher.jpName)
            .select('id, name')

          const didUpdate = !updateErr && updateData && updateData.length > 0

          statsResults.push({
            pitcher: pitcher.jpName,
            npbId: pitcher.npbId,
            stats,
            updated: didUpdate,
            matchedRow: updateData?.[0] || null,
            error: updateErr?.message,
          })

          if (didUpdate) {
            console.log(`📊 ${pitcher.jpName}: ERA ${stats.era}, ${stats.inningsPitched}IP, ${stats.strikeouts}K, WHIP ${stats.whip} → ${updateData[0].name}`)
          } else {
            console.log(`⚠️ 스탯 업데이트 매칭 실패: ${pitcher.jpName} (team=${normalizedTeam}, season=${season})${updateErr ? ' err=' + updateErr.message : ''}`)
          }
        } else {
          statsResults.push({
            pitcher: pitcher.jpName,
            npbId: pitcher.npbId,
            stats,
            updated: false,
            error: statsError,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      date,
      scrapedDate: scrapedDate || null,
      dryRun,
      scrapedGames: scrapedGames.length,
      dbMatches: dbMatches.length,
      updated: updatedCount,
      results,
      statsResults: statsResults.length > 0 ? statsResults : undefined,
      rawHtmlPreview: dryRun ? rawHtml?.substring(0, 1000) : undefined,
    })

  } catch (error: any) {
    console.error('❌ NPB 선발투수 동기화 오류:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}

// ===================================================================
// Utility
// ===================================================================

function getKSTDateString(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().split('T')[0]
}
