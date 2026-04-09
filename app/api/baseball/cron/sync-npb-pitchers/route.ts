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

// ===================================================================
// 가타카나 → 한글 음역 (직역, 음차)
// ===================================================================
// 외국인 투수 이름은 보통 가타카나로 표기됨
// 매칭 실패 시 한국어 표기 규칙에 따라 직접 음역
//
// 예: ジャクソン → 잭슨, エスピノーザ → 에스피노자
//
// 한자(漢字)는 한국식 음독을 쓰지 않음(사용자 요구사항).
// 한자가 섞여 있으면 변환 안 하고 원본 그대로 반환.

const KATAKANA_TO_HANGUL_BASE: Record<string, string> = {
  // 청음
  'ア':'아','イ':'이','ウ':'우','エ':'에','オ':'오',
  'カ':'카','キ':'키','ク':'쿠','ケ':'케','コ':'코',
  'サ':'사','シ':'시','ス':'스','セ':'세','ソ':'소',
  'タ':'타','チ':'치','ツ':'쓰','テ':'테','ト':'토',
  'ナ':'나','ニ':'니','ヌ':'누','ネ':'네','ノ':'노',
  'ハ':'하','ヒ':'히','フ':'후','ヘ':'헤','ホ':'호',
  'マ':'마','ミ':'미','ム':'무','メ':'메','モ':'모',
  'ヤ':'야','ユ':'유','ヨ':'요',
  'ラ':'라','リ':'리','ル':'루','レ':'레','ロ':'로',
  'ワ':'와','ヰ':'이','ヱ':'에','ヲ':'오','ン':'ㄴ',
  // 탁음
  'ガ':'가','ギ':'기','グ':'구','ゲ':'게','ゴ':'고',
  'ザ':'자','ジ':'지','ズ':'즈','ゼ':'제','ゾ':'조',
  'ダ':'다','ヂ':'지','ヅ':'즈','デ':'데','ド':'도',
  'バ':'바','ビ':'비','ブ':'부','ベ':'베','ボ':'보',
  // 반탁음
  'パ':'파','ピ':'피','プ':'푸','ペ':'페','ポ':'포',
}

const KATAKANA_DIGRAPHS: Record<string, string> = {
  // 요음
  'キャ':'캬','キュ':'큐','キョ':'쿄',
  'ギャ':'갸','ギュ':'규','ギョ':'교',
  'シャ':'샤','シュ':'슈','ショ':'쇼','シェ':'셰',
  'ジャ':'자','ジュ':'주','ジョ':'조','ジェ':'제',
  'チャ':'차','チュ':'추','チョ':'초','チェ':'체',
  'ニャ':'냐','ニュ':'뉴','ニョ':'뇨',
  'ヒャ':'햐','ヒュ':'휴','ヒョ':'효',
  'ビャ':'뱌','ビュ':'뷰','ビョ':'뵤',
  'ピャ':'퍄','ピュ':'퓨','ピョ':'표',
  'ミャ':'먀','ミュ':'뮤','ミョ':'묘',
  'リャ':'랴','リュ':'류','リョ':'료',
  // 외래어 표기 추가 음
  'ファ':'파','フィ':'피','フェ':'페','フォ':'포','フュ':'퓨',
  'ヴァ':'바','ヴィ':'비','ヴ':'부','ヴェ':'베','ヴォ':'보',
  'ティ':'티','トゥ':'투','テュ':'튜',
  'ディ':'디','ドゥ':'두','デュ':'듀',
  'ウィ':'위','ウェ':'웨','ウォ':'워',
  'クァ':'콰','クィ':'퀴','クェ':'퀘','クォ':'쿼',
  'グァ':'과','グィ':'귀','グェ':'궤','グォ':'궈',
  'ツァ':'차','ツィ':'치','ツェ':'체','ツォ':'초',
}

// 한글 음절 분해/조합 (받침 부착용)
const HANGUL_BASE = 0xAC00
const HANGUL_END = 0xD7A3
function combineWithBatchim(syllable: string, batchim: number): string {
  if (!syllable) return syllable
  const code = syllable.charCodeAt(syllable.length - 1)
  if (code < HANGUL_BASE || code > HANGUL_END) return syllable
  const idx = code - HANGUL_BASE
  // 이미 받침이 있으면 추가 안 함
  if (idx % 28 !== 0) return syllable
  const newCode = code + batchim
  return syllable.slice(0, -1) + String.fromCharCode(newCode)
}

// 받침 인덱스: ㄱ=1, ㄴ=4, ㅁ=16, ㅂ=17, ㅅ=19, ㅇ=21, ㄹ=8
const BATCHIM_KIYEOK = 1
const BATCHIM_NIEUN = 4
const BATCHIM_RIEUL = 8
const BATCHIM_MIEUM = 16
const BATCHIM_BIEUP = 17
const BATCHIM_SIOT = 19

function transliterateKatakanaToKorean(input: string): string {
  if (!input) return input
  // 한자(CJK Unified Ideographs)가 포함되면 그대로 반환 (사용자 요구사항: 음독 금지)
  if (/[\u4E00-\u9FFF]/.test(input)) return input

  // 가타카나가 전혀 없으면 원본 반환
  if (!/[\u30A0-\u30FF]/.test(input)) return input

  const out: string[] = []
  const chars = Array.from(input)
  let i = 0

  while (i < chars.length) {
    const c = chars[i]
    const next = chars[i + 1] || ''

    // 비-가타카나 문자(라틴, 점, 공백 등)는 그대로 통과
    if (!/[\u30A0-\u30FF]/.test(c)) {
      out.push(c)
      i++
      continue
    }

    // 장음 ー: 직전 음절에 길이 표시 없음 (한국어는 보통 장음 표기 안 함) → skip
    if (c === 'ー') { i++; continue }

    // 촉음 ッ: 다음 자음을 받침으로 부착
    if (c === 'ッ') {
      const di = KATAKANA_DIGRAPHS[next + (chars[i + 2] || '')]
      const nextSound = di || KATAKANA_TO_HANGUL_BASE[next] || ''
      if (out.length > 0 && nextSound) {
        // 다음 음절의 초성에 따라 받침 결정
        const first = nextSound.charAt(0)
        let batchim = BATCHIM_KIYEOK
        if ('사시스세소자지즈제조차치추체초'.includes(first)) batchim = BATCHIM_SIOT
        else if ('파피푸페포바비부베보'.includes(first)) batchim = BATCHIM_BIEUP
        else if ('타티투테토다디두데도'.includes(first)) batchim = BATCHIM_SIOT
        else if ('카키쿠케코가기구게고'.includes(first)) batchim = BATCHIM_KIYEOK
        else batchim = BATCHIM_SIOT
        out[out.length - 1] = combineWithBatchim(out[out.length - 1], batchim)
      }
      i++
      continue
    }

    // 撥音 ン: 받침 ㄴ
    if (c === 'ン') {
      if (out.length > 0) {
        out[out.length - 1] = combineWithBatchim(out[out.length - 1], BATCHIM_NIEUN)
      } else {
        out.push('ㄴ')
      }
      i++
      continue
    }

    // 2글자 요음 시도
    const digraph = c + next
    if (KATAKANA_DIGRAPHS[digraph]) {
      out.push(KATAKANA_DIGRAPHS[digraph])
      i += 2
      continue
    }

    // 단일 가나
    const single = KATAKANA_TO_HANGUL_BASE[c]
    if (single) {
      out.push(single)
      i++
      continue
    }

    // 매핑 없음 → 원본 유지
    out.push(c)
    i++
  }

  return out.join('').trim()
}

/**
 * 일본어 투수명 → 한글 이름 매칭 (npb_pitcher_stats.name_jp 활용)
 *
 * 매칭 순서:
 * 1. name_jp 컬럼에서 정확 매칭
 * 2. name_jp 컬럼에서 공백 제거 후 매칭 (半角/全角 스페이스 차이 대응)
 * 3. 매칭 실패 시 null → 가타카나 음역으로 폴백
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
 * 매칭 안 된 새 투수에 대한 처리.
 *
 * ※ 이전에 있던 "name_jp NULL인 1명에 자동 매핑" 로직은 제거됨.
 *    동명이인 / 라인업 변경 / 같은 팀에 비어있는 슬롯 1개를 잘못 채워넣는
 *    실수가 누적되어 데이터를 오염시켰음.
 *
 * 이 함수는 더 이상 추정 매핑을 시도하지 않고, 단순히 디버그 로그만 남긴다.
 * 실제 등록은 후처리 단계(Step 4)에서 NPB 선수 상세 페이지의 후리가나를
 * 기반으로 처리한다.
 */
async function autoRegisterNameJp(
  jpPitcherName: string,
  dbTeamName: string,
  season: string
): Promise<void> {
  if (!jpPitcherName) return
  const normalizedTeam = NPB_TEAM_NORMALIZE[dbTeamName] ?? dbTeamName
  console.log(`ℹ️ 매칭 실패(추정 안 함): ${jpPitcherName} (${normalizedTeam}, ${season}) — 후리가나 단계에서 처리`)
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
/**
 * NPB 선수 페이지에서 한자 이름 + 후리가나(가타카나) 추출
 *
 * 일반적인 npb.jp 페이지 구조:
 *   <li id="pc_v1_nm"><h1>大津 亮介</h1></li>
 *   <li id="pc_v1_ruby">オオツ　リョウスケ</li>
 * 또는 table 형태:
 *   <td>登録名</td><td>大津 亮介</td>
 *   <td>フリガナ</td><td>オオツ　リョウスケ</td>
 *
 * 외국인 선수는 후리가나가 비어있고 한자 칸이 가타카나로 나옴 (예: A.ジャクソン).
 * 그 경우 furigana 자리에 kanji 그대로 반환.
 */
function parseNpbPlayerProfile(html: string): { kanji: string; furigana: string } {
  let kanji = ''
  let furigana = ''

  // 패턴 0 (실제 npb.jp/bis/players/{id}.html 구조):
  //   <li id="pc_v_name">奥川 恭伸 </li>
  //   <li id="pc_v_kana">おくがわ・やすのぶ</li>
  // 주의: 같은 id="pc_v_name"이 div와 li 양쪽에 쓰여있음 → <li ...> 매칭으로 한정
  const liNameMatch = html.match(/<li\s+id="pc_v_name"[^>]*>([\s\S]*?)<\/li>/i)
  if (liNameMatch) kanji = stripTags(liNameMatch[1])
  const liKanaMatch = html.match(/<li\s+id="pc_v_kana"[^>]*>([\s\S]*?)<\/li>/i)
  if (liKanaMatch) {
    // 히라가나, `・`(姓名 구분자) 포함 — 가타카나 변환 + `・` → 공백
    // 외국인 선수는 "ホセ ウレーニャ (JOSE URENA)" 형태 → 영문 괄호 제거
    let raw = stripTags(liKanaMatch[1])
    raw = raw.replace(/\s*[（(][^)）]*[)）]\s*/g, ' ').trim()
    raw = raw.replace(/[・·]/g, ' ')
    furigana = hiraganaToKatakana(raw).replace(/\s+/g, ' ').trim()
  }

  // 폴백: img title (외국인 선수 등에서 활용)
  if (!kanji) {
    const m = html.match(/<img[^>]+src="[^"]*players_photo[^"]*"[^>]+title="([^"]+)"/i)
    if (m) kanji = stripTags(m[1])
  }

  // 폴백: pc_v_name div 전체 (li 매칭이 실패한 경우)
  if (!kanji) {
    const m = html.match(/id="pc_v_name"[^>]*>[\s\S]*?<li\s+id="pc_v_name"[^>]*>([\s\S]*?)</i)
    if (m) kanji = stripTags(m[1])
  }

  // 폴백: meta og:title (예: "奥川 恭伸（東京ヤクルトスワローズ） | 個人年度別成績")
  if (!kanji) {
    const m = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
    if (m) {
      let raw = m[1].split(/\s*[|\-–]\s*/)[0].trim()
      // 「선수명（팀명）」 형식 → 괄호 앞만
      raw = raw.replace(/[（(].*?[)）]/g, '').trim()
      kanji = raw
    }
  }

  // 한자 칸에 팀명이 괄호로 붙어있으면 제거 (예: "奥川 恭伸（東京ヤクルトスワローズ）")
  if (kanji) {
    kanji = kanji.replace(/[（(][^)）]*[)）]/g, '').trim()
  }

  // 외국인 선수: 한자 칸이 가타카나/라틴인 경우 furigana 칸이 비어있으면 그대로 사용
  if (!furigana && kanji && /^[\u30A0-\u30FF\u3040-\u309F\sA-Za-z\.\uFF21-\uFF5A\uFF0E]+$/.test(kanji)) {
    furigana = hiraganaToKatakana(kanji)
  }

  return { kanji, furigana }
}

/**
 * 히라가나 → 가타카나 변환
 * U+3041..U+3096 (ぁ..ゖ) → U+30A1..U+30F6 (ァ..ヶ)
 */
function hiraganaToKatakana(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    if (code >= 0x3041 && code <= 0x3096) {
      out += String.fromCharCode(code + 0x60)
    } else {
      out += s[i]
    }
  }
  return out
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[\u3000\s]+/g, ' ')
    .trim()
}

async function scrapeNpbPlayerStats(
  npbPlayerId: string,
  targetSeason?: string
): Promise<{ stats: NpbPitcherStats | null; profile?: { kanji: string; furigana: string }; error?: string }> {
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

    // 한자 이름 + 후리가나 추출 (실패해도 stats 파싱은 계속)
    const profile = parseNpbPlayerProfile(html)

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
        profile,
        error: `파싱실패v2 (len=${htmlLen}, tblIdx=${tbStart}, tbodyIdx=${tbodyIdx}, tbodyEndIdx=${tbodyEndIdx}, table=${hasTable}, reg=${hasRegisterStats}, yr=${hasSeason}, kanji=${profile.kanji}, furi=${profile.furigana})`,
      }
    }

    return { stats: result, profile }
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
  const reset = searchParams.get('reset') === 'true'  // 시즌 데이터 초기화 후 재구축
  const season = searchParams.get('season') || String(new Date().getFullYear())
  const debugProfileId = searchParams.get('debugProfile')  // 단일 npbPlayerId의 raw HTML 일부 반환

  console.log(`🏟️ NPB 선발투수 동기화 시작 (dry=${dryRun}, force=${force}, reset=${reset})`)

  // ─────────────────────────────────────────
  // DEBUG: 특정 선수 프로필 페이지 raw HTML 일부 반환
  // 사용: ?debugProfile=31735151
  // ─────────────────────────────────────────
  if (debugProfileId) {
    try {
      const url = `https://npb.jp/bis/players/${debugProfileId}.html`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en;q=0.5',
        },
        signal: AbortSignal.timeout(10000),
      })
      const html = await res.text()
      const profile = parseNpbPlayerProfile(html)
      // 이름 / 후리가나 후보가 들어있을 만한 영역만 추려서 반환
      const headIdx = html.indexOf('<head')
      const headEnd = html.indexOf('</head>')
      const headSnippet = headIdx > -1 && headEnd > -1 ? html.slice(headIdx, headEnd + 7) : ''
      // 본문에서 한자/후리가나 후보 키워드가 처음 나오는 위치 주변을 잘라서 반환
      const bodyStart = html.indexOf('<body')
      const bodyHtml = bodyStart > -1 ? html.slice(bodyStart) : html
      const keywordHits: Record<string, string> = {}
      const KEYWORDS = ['pc_v_name', 'pc_v_team', 'pc_v_no', 'pc_v_furi', 'pc_v_kana', 'pc_v', 'players_photo']
      for (const kw of KEYWORDS) {
        const i = bodyHtml.indexOf(kw)
        if (i !== -1) {
          keywordHits[kw] = bodyHtml.slice(Math.max(0, i - 80), Math.min(bodyHtml.length, i + 800))
        }
      }
      return NextResponse.json({
        success: true,
        debugProfile: debugProfileId,
        url,
        htmlLen: html.length,
        parsed: profile,
        headSnippet: headSnippet.slice(0, 4000),
        keywordHits,
      })
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
  }

  // ─────────────────────────────────────────
  // RESET 모드: 시즌 데이터 정리
  // ─────────────────────────────────────────
  // - npb_pitcher_stats: 시즌 데이터 전부 삭제
  // - baseball_matches: NPB 시즌 경기의 home/away_pitcher_ko를 NULL로
  // 이후 sync 흐름이 후리가나 기반으로 다시 채움
  let resetReport: { stats: number; matches: number } | null = null
  if (reset) {
    if (dryRun) {
      const { count: statsCount } = await supabase
        .from('npb_pitcher_stats')
        .select('id', { count: 'exact', head: true })
        .eq('season', season)
      const { count: matchCount } = await supabase
        .from('baseball_matches')
        .select('id', { count: 'exact', head: true })
        .eq('league', 'NPB')
        .gte('match_date', `${season}-01-01`)
        .lte('match_date', `${season}-12-31`)
      resetReport = { stats: statsCount || 0, matches: matchCount || 0 }
      console.log(`🧹 RESET (dry): npb_pitcher_stats=${resetReport.stats}, baseball_matches=${resetReport.matches}`)
    } else {
      const { error: delStatsErr, count: delStats } = await supabase
        .from('npb_pitcher_stats')
        .delete({ count: 'exact' })
        .eq('season', season)
      const { error: clrMatchErr, count: clrMatch } = await supabase
        .from('baseball_matches')
        .update({ home_pitcher_ko: null, away_pitcher_ko: null }, { count: 'exact' })
        .eq('league', 'NPB')
        .gte('match_date', `${season}-01-01`)
        .lte('match_date', `${season}-12-31`)
      resetReport = { stats: delStats || 0, matches: clrMatch || 0 }
      console.log(`🧹 RESET 완료: npb_pitcher_stats deleted=${resetReport.stats}, baseball_matches cleared=${resetReport.matches}, errors=${delStatsErr?.message || ''} ${clrMatchErr?.message || ''}`)
    }
  }

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

      // 한글 이름이 없으면 가타카나 음역 폴백, 그것도 안 되면 일본어 원본
      const finalHomePitcher =
        homePitcherKo ||
        (matchedGame.homePitcherJp ? transliterateKatakanaToKorean(matchedGame.homePitcherJp) : null) ||
        matchedGame.homePitcherJp ||
        null
      const finalAwayPitcher =
        awayPitcherKo ||
        (matchedGame.awayPitcherJp ? transliterateKatakanaToKorean(matchedGame.awayPitcherJp) : null) ||
        matchedGame.awayPitcherJp ||
        null

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
    // matchSlots: 어떤 매치의 home/away 칸에 이 투수가 들어가는지 추적
    type PitcherSlot = { matchId: number; side: 'home' | 'away' }
    const pitchersToScrape: Array<{ jpName: string; npbId: string; dbTeam: string; slots: PitcherSlot[] }> = []
    for (const sg of scrapedGames) {
      if (sg.homePitcherNpbId && sg.homePitcherJp) {
        const matched = results.find(r => r.homePitcherJp === sg.homePitcherJp)
        const dbTeam = matched?.homeTeam
        if (dbTeam && matched) pitchersToScrape.push({
          jpName: sg.homePitcherJp,
          npbId: sg.homePitcherNpbId,
          dbTeam,
          slots: [{ matchId: matched.matchId, side: 'home' }],
        })
      }
      if (sg.awayPitcherNpbId && sg.awayPitcherJp) {
        const matched = results.find(r => r.awayPitcherJp === sg.awayPitcherJp)
        const dbTeam = matched?.awayTeam
        if (dbTeam && matched) pitchersToScrape.push({
          jpName: sg.awayPitcherJp,
          npbId: sg.awayPitcherNpbId,
          dbTeam,
          slots: [{ matchId: matched.matchId, side: 'away' }],
        })
      }
    }

    // 중복 제거 (같은 NPB ID) — slots는 합침
    const uniquePitchers: typeof pitchersToScrape = []
    for (const p of pitchersToScrape) {
      const exist = uniquePitchers.find(x => x.npbId === p.npbId)
      if (exist) {
        exist.slots.push(...p.slots)
      } else {
        uniquePitchers.push({ ...p, slots: [...p.slots] })
      }
    }

    if (uniquePitchers.length > 0) {
      console.log(`📊 투수 성적 스크래핑 시작: ${uniquePitchers.length}명`)

      for (const pitcher of uniquePitchers) {
        const { stats, profile, error: statsError } = await scrapeNpbPlayerStats(pitcher.npbId, season)

        // 후리가나 → 한글 음역 (가타카나 음역기 재사용)
        // profile.furigana가 가타카나라 그대로 통과, 외국인 선수면 가타카나 이름 그대로
        let derivedKoreanName: string | null = null
        let kanjiName: string | null = null
        if (profile) {
          kanjiName = profile.kanji || null
          if (profile.furigana) {
            const t = transliterateKatakanaToKorean(profile.furigana)
            // 변환 결과에 가타카나가 남아있으면 실패로 간주
            if (t && !/[\u30A0-\u30FF\u3040-\u309F]/.test(t)) {
              derivedKoreanName = t
            }
          }
        }

        const normalizedTeam = NPB_TEAM_NORMALIZE[pitcher.dbTeam] ?? pitcher.dbTeam

        if (!dryRun) {
          // npb_pitcher_stats UPSERT (npb_player_id 기준 — name_jp 의존 제거)
          // stats가 없어도 이름 정보는 저장해서 매칭 풀을 만든다
          const upsertPayload: Record<string, any> = {
            npb_player_id: pitcher.npbId,
            season,
            team: normalizedTeam,
          }
          if (derivedKoreanName) upsertPayload.name = derivedKoreanName
          if (kanjiName) upsertPayload.name_jp = kanjiName

          if (stats) {
            upsertPayload.era = parseFloat(stats.era) || 0
            upsertPayload.whip = stats.whip && stats.whip !== '-' ? parseFloat(stats.whip) : null
            upsertPayload.innings_pitched = stats.inningsPitched
            upsertPayload.wins = stats.wins
            upsertPayload.losses = stats.losses
            upsertPayload.saves = stats.saves
            upsertPayload.holds = stats.holds
            upsertPayload.games = stats.games
            upsertPayload.strikeouts = stats.strikeouts
            upsertPayload.walks = stats.walks
            upsertPayload.hits_allowed = stats.hits
            upsertPayload.home_runs_allowed = stats.homeRuns
            upsertPayload.earned_runs = stats.earnedRuns
            upsertPayload.k_per_9 = stats.kPer9 && stats.kPer9 !== '-' ? parseFloat(stats.kPer9) : null
            upsertPayload.bb_per_9 = stats.bbPer9 && stats.bbPer9 !== '-' ? parseFloat(stats.bbPer9) : null
          }

          // npb_pitcher_stats에 (npb_player_id, season) unique constraint가 없어서
          // upsert 대신 select-then-insert/update로 처리
          const { data: existingRows } = await supabase
            .from('npb_pitcher_stats')
            .select('id, name, name_jp')
            .eq('npb_player_id', pitcher.npbId)
            .eq('season', season)
            .limit(1)

          let upserted: Array<{ id: number; name: string | null; name_jp: string | null }> | null = null
          let upsertErr: { message: string } | null = null

          if (existingRows && existingRows.length > 0) {
            const existingId = existingRows[0].id
            const { data: updated, error: updErr } = await supabase
              .from('npb_pitcher_stats')
              .update(upsertPayload)
              .eq('id', existingId)
              .select('id, name, name_jp')
            upserted = updated as any
            upsertErr = updErr as any
          } else {
            const { data: inserted, error: insErr } = await supabase
              .from('npb_pitcher_stats')
              .insert(upsertPayload)
              .select('id, name, name_jp')
            upserted = inserted as any
            upsertErr = insErr as any
          }

          const didUpdate = !upsertErr && upserted && upserted.length > 0

          statsResults.push({
            pitcher: pitcher.jpName,
            npbId: pitcher.npbId,
            kanji: kanjiName,
            furigana: profile?.furigana || null,
            koreanName: derivedKoreanName,
            stats,
            updated: didUpdate,
            matchedRow: upserted?.[0] || null,
            error: upsertErr?.message,
          })

          if (didUpdate) {
            console.log(`📊 ${pitcher.jpName} → ${derivedKoreanName || upserted[0].name || '?'} (ERA ${stats?.era || 'n/a'}, ${stats?.inningsPitched || 'n/a'}IP)`)
          } else {
            console.log(`⚠️ 스탯 upsert 실패: ${pitcher.jpName} (npbId=${pitcher.npbId})${upsertErr ? ' err=' + upsertErr.message : ''}`)
          }

          // baseball_matches의 home/away_pitcher_ko를 한글 이름으로 갱신
          // 추적된 slots(matchId+side)로 직접 업데이트 → 이름 매칭 의존 제거
          if (derivedKoreanName) {
            for (const slot of pitcher.slots) {
              const updateField = slot.side === 'home'
                ? { home_pitcher_ko: derivedKoreanName }
                : { away_pitcher_ko: derivedKoreanName }
              await supabase
                .from('baseball_matches')
                .update(updateField)
                .eq('id', slot.matchId)
            }
          }
        } else {
          statsResults.push({
            pitcher: pitcher.jpName,
            npbId: pitcher.npbId,
            kanji: kanjiName,
            furigana: profile?.furigana || null,
            koreanName: derivedKoreanName,
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
      reset: resetReport,
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
