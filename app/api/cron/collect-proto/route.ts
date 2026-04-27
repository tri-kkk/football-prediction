// app/api/cron/collect-proto/route.ts
// Wisetoto 프로토 데이터 자동 수집 Cron API
// 
// 사용법:
// 1. Supabase Cron으로 자동 호출
// 2. 수동 호출: GET /api/cron/collect-proto?round=18&secret=...
//
// Wisetoto 내부 API를 직접 호출하여 HTML 파싱 → DB 저장

export const maxDuration = 300

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================
// 타입 정의
// ============================================================
interface ProtoMatch {
  round: string
  match_number: number
  date_time: string
  league: string
  game_type: string       // 승패, 핸디캡, 언더오버, 승5패, SUM
  handicap_value: string | null  // H -4.5, H +7.5, U 160.5 등
  home_team: string
  away_team: string
  odds_home: number | null
  odds_draw: number | null
  odds_away: number | null
  result_code: string | null  // 홈승, 홈패, 무, 오버, 언더 등
  home_score: number | null
  away_score: number | null
  status: string          // 경기전, 진행중, 종료, 적특 등
  sport_type: string      // bk(농구), vl(배구), sc(축구)
}

// ============================================================
// HTML 파싱 함수 (cheerio 없이 정규식으로 파싱)
// Vercel에서 cheerio 의존성 문제 방지
// ============================================================
function parseWisetotoHtml(html: string, round: string): ProtoMatch[] {
  const matches: ProtoMatch[] = []
  
  // 각 <ul> 블록 추출 (게임 행)
  const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/g
  let ulMatch
  
  while ((ulMatch = ulRegex.exec(html)) !== null) {
    const ulContent = ulMatch[1]
    
    // 게임 번호 확인 (li.a1에 001, 002, ... 또는 1600, 1601 등)
    // 🔥 2026-04 패치: 와이즈토토가 게임 번호를 3자리 → 4자리로 변경 (1000 단위 누적)
    const numberMatch = ulContent.match(/<li\s+class="a1"[^>]*>(\d{3,5})<\/li>/)
    if (!numberMatch) continue

    const matchNumber = parseInt(numberMatch[1])
    
    // 날짜/시간 (li.a2)
    const dateMatch = ulContent.match(/<li\s+class="a2"[^>]*>([\s\S]*?)<\/li>/)
    const dateTimeRaw = dateMatch ? dateMatch[1].replace(/<[^>]*>/g, '').trim() : ''
    
    // 리그 (li.a4)
    const leagueMatch = ulContent.match(/<li\s+class="a4"[^>]*>([\s\S]*?)<\/li>/)
    const league = leagueMatch ? leagueMatch[1].replace(/<[^>]*>/g, '').trim() : ''
    
    // 스포츠 타입 감지 (li.a3의 class)
    const sportMatch = ulContent.match(/<li\s+class="a3\s+(\w+)"/)
    const sportCode = sportMatch ? sportMatch[1] : 'sc' // bk, vl, sc
    
    // 게임 유형 감지
    let gameType = '승패'
    let handicapValue: string | null = null
    
    // 핸디캡 홈 마이너스: li.hm with content like "H -4.5"
    const hmMatch = ulContent.match(/<li\s+class="hm"[^>]*>([\s\S]*?)<\/li>/)
    if (hmMatch) {
      const hmContent = hmMatch[1].replace(/<[^>]*>/g, '').trim()
      if (hmContent.includes('H ')) {
        gameType = '핸디캡'
        handicapValue = hmContent // "H -4.5"
      }
      // 빈 li.hm = 승패 (기본값)
    }
    
    // 핸디캡 홈 플러스: li.hp with "H +7.5"
    const hpMatch = ulContent.match(/<li\s+class="hp"[^>]*>([\s\S]*?)<\/li>/)
    if (hpMatch) {
      const hpContent = hpMatch[1].replace(/<[^>]*>/g, '').trim()
      if (hpContent.includes('H ')) {
        gameType = '핸디캡'
        handicapValue = hpContent
      }
    }
    
    // 언더오버: li.un with "U 160.5"
    const unMatch = ulContent.match(/<li\s+class="un"[^>]*>([\s\S]*?)<\/li>/)
    if (unMatch) {
      gameType = '언더오버'
      handicapValue = unMatch[1].replace(/<[^>]*>/g, '').trim()
    }
    
    // 승5패, SUM: li.d5
    const d5Match = ulContent.match(/<li\s+class="d5"[^>]*>([\s\S]*?)<\/li>/)
    if (d5Match) {
      const d5Content = d5Match[1].replace(/<[^>]*>/g, '').trim()
      if (d5Content.includes('승') && d5Content.includes('패')) {
        gameType = '승5패'
      } else if (d5Content.includes('SUM')) {
        gameType = 'SUM'
      }
    }
    
    // 홈팀 (li.a6 또는 li.a6_un > span.tn 또는 span.tnb)
    // 승패: <li class="a6"><span class="tn">팀명</span></li>
    // 언더오버: <li class="a6_un"><span class="tn">팀명</span></li>
    const homeMatch = ulContent.match(/<li\s+class="a6(?:_un)?"[^>]*>[\s\S]*?<span\s+class="tn[b]?"[^>]*>([\s\S]*?)<\/span>/)
    const homeTeam = homeMatch ? homeMatch[1].replace(/<[^>]*>/g, '').trim() : ''
    
    // 원정팀 (li.a8 또는 li.a8_un > span.tn 또는 span.tnb)
    const awayMatch = ulContent.match(/<li\s+class="a8(?:_un)?"[^>]*>[\s\S]*?<span\s+class="tn[b]?"[^>]*>([\s\S]*?)<\/span>/)
    const awayTeam = awayMatch ? awayMatch[1].replace(/<[^>]*>/g, '').trim() : ''
    
    if (!homeTeam || !awayTeam) continue
    
    // 배당률 (3개의 li.a9)
    const oddsMatches: string[] = []
    const oddsRegex = /<li\s+class="a9"[^>]*>([\s\S]*?)<\/li>/g
    let oddsMatch
    while ((oddsMatch = oddsRegex.exec(ulContent)) !== null) {
      const oddsText = oddsMatch[1].replace(/<[^>]*>/g, '').replace(/[↑↓\s&nbsp;]/g, '').trim()
      oddsMatches.push(oddsText)
    }
    
    const oddsHome = oddsMatches[0] && oddsMatches[0] !== '-' ? parseFloat(oddsMatches[0]) : null
    const oddsDraw = oddsMatches[1] && oddsMatches[1] !== '-' ? parseFloat(oddsMatches[1]) : null
    const oddsAway = oddsMatches[2] && oddsMatches[2] !== '-' ? parseFloat(oddsMatches[2]) : null
    
    // 결과/상태 (span.tag)
    const statusMatch = ulContent.match(/<span\s+class="tag[^"]*"[^>]*>([\s\S]*?)<\/span>/)
    const statusText = statusMatch ? statusMatch[1].replace(/<[^>]*>/g, '').trim() : '경기전'
    
    // 상태 변환
    let status = '경기전'
    let resultCode: string | null = null
    
    if (statusText === '경기전') {
      status = '경기전'
    } else if (statusText === '경기중' || statusText === '진행중') {
      status = '진행중'
    } else {
      // 경기 결과: 홈승, 홈패, 무, 적특, 발매취소 등
      status = '종료'
      // 한글 결과 → 영어 코드 변환 (page.tsx 호환)
      const resultMap: Record<string, string> = {
        '홈승': 'home',
        '홈패': 'away',
        '무승부': 'draw',
        '무': 'draw',
        '핸디승': 'home',
        '핸디패': 'away',
        '핸디무': 'draw',
        '오버': 'over',
        '언더': 'under',
        '홀': 'odd',
        '짝': 'even',
        '⑤': 'draw',
        '적특': 'void',
        '발매취소': 'cancelled',
      }
      resultCode = resultMap[statusText] || statusText
    }
    
    // 스코어 파싱 (종료된 경기)
    // 핸디캡: win/lose 값이 핸디캡 적용된 조정 점수 (99.5 등) → 파싱 안 함
    // 승패/승5패: win/lose 값이 실제 점수 → 파싱
    let homeScore: number | null = null
    let awayScore: number | null = null
    
    const isRealScore = gameType === '승패' || gameType === '승5패'
    
    if (isRealScore && status === '종료') {
      // a6(홈)에서 점수 추출
      const a6Content = ulContent.match(/<li\s+class="a6"[^>]*>([\s\S]*?)<\/li>/)
      const a8Content = ulContent.match(/<li\s+class="a8"[^>]*>([\s\S]*?)<\/li>/)
      
      if (a6Content) {
        const a6Score = a6Content[1].match(/<span\s+class="(?:win|lose)"[^>]*>(\d+)<\/span>/)
        if (a6Score) homeScore = parseInt(a6Score[1])
      }
      if (a8Content) {
        const a8Score = a8Content[1].match(/<span\s+class="(?:win|lose)"[^>]*>(\d+)<\/span>/)
        if (a8Score) awayScore = parseInt(a8Score[1])
      }
    }
    
    // 날짜 파싱: "02.09(월) 19:00" → "2026-02-09T19:00:00"
    const dateTimeParsed = parseDateString(dateTimeRaw, round)
    
    matches.push({
      round,
      match_number: matchNumber,
      date_time: dateTimeParsed,
      league,
      game_type: gameType,
      handicap_value: handicapValue,
      home_team: homeTeam,
      away_team: awayTeam,
      odds_home: oddsHome,
      odds_draw: oddsDraw,
      odds_away: oddsAway,
      result_code: resultCode,
      home_score: homeScore,
      away_score: awayScore,
      status,
      sport_type: sportCode,
    })
  }
  
  return matches
}

// ============================================================
// 날짜 문자열 파싱
// "02.09(월) 19:00" → "2026-02-09T19:00:00+09:00"
// ============================================================
function parseDateString(dateStr: string, round: string): string {
  const year = new Date().getFullYear()
  const match = dateStr.match(/(\d{2})\.(\d{2})\([^)]*\)\s*(\d{2}):(\d{2})/)
  if (!match) return new Date().toISOString()
  
  const [, month, day, hour, minute] = match
  return `${year}-${month}-${day}T${hour}:${minute}:00+09:00`
}

// ============================================================
// 회차 → master_seq 계산
// 패턴: round 18 = seq 30391, round 19 = seq 30392
// 즉, seq = 30373 + round
// ============================================================
const SEQ_BASE = 30373  // master_seq = SEQ_BASE + round_number (fallback용)

function calculateMasterSeq(round: number): string {
  return String(SEQ_BASE + round)
}

function calculateMasterSeqNum(round: number): number {
  return SEQ_BASE + round
}

// 🔥 특정 회차의 seq를 Wisetoto 메인 페이지에서 찾기
async function findSeqForRound(targetRound: number): Promise<string | null> {
  try {
    const mainRes = await fetch('https://www.wisetoto.com/index.htm?tab_type=proto&game_type=pt&game_category=pt1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    })
    const mainHtml = await mainRes.text()
    
    // 모든 회차+seq 쌍 추출
    const allMatches = [...mainHtml.matchAll(/get_gameinfo_body\(\s*'proto'\s*,\s*'pt1'\s*,\s*\d{4}\s*,\s*'(\d+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'(\d+)'/g)]
    
    for (const m of allMatches) {
      if (parseInt(m[1]) === targetRound) {
        console.log(`📋 ${targetRound}회차 seq 발견: ${m[2]}`)
        return m[2]
      }
    }
    
    console.log(`⚠️ ${targetRound}회차 seq를 메인 페이지에서 찾지 못함, fallback 사용`)
    return null
  } catch {
    return null
  }
}

// DB에서 가장 최근 회차 조회하여 다음 회차 결정
// 🔥 수정: 회차 + master_seq를 동시에 반환
async function getActiveRound(): Promise<{ round: number; seq: string }> {
  try {
    // 1차: Wisetoto 메인 페이지에서 현재 활성 회차 + seq 가져오기
    const mainRes = await fetch('https://www.wisetoto.com/index.htm?tab_type=proto&game_type=pt&game_category=pt1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    })
    const mainHtml = await mainRes.text()
    
    // 🔥 핵심: 회차 + seq 동시 추출
    // 패턴: get_gameinfo_body('proto', 'pt1', 2026, '21', '', '', '30421', '', '')
    const jsMatch = mainHtml.match(/get_gameinfo_body\(\s*'proto'\s*,\s*'pt1'\s*,\s*\d{4}\s*,\s*'(\d+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'(\d+)'/)
    if (jsMatch) {
      const activeRound = parseInt(jsMatch[1])
      const activeSeq = jsMatch[2]
      console.log(`📋 메인 페이지에서 활성 회차 감지: ${activeRound}회차, seq: ${activeSeq}`)
      return { round: activeRound, seq: activeSeq }
    }
    
    // 2차: 모든 get_gameinfo_body 호출에서 회차+seq 쌍 추출
    const allMatches = [...mainHtml.matchAll(/get_gameinfo_body\(\s*'proto'\s*,\s*'pt1'\s*,\s*\d{4}\s*,\s*'(\d+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'(\d+)'/g)]
    if (allMatches.length > 0) {
      // 가장 높은 회차 선택
      const sorted = allMatches
        .map(m => ({ round: parseInt(m[1]), seq: m[2] }))
        .sort((a, b) => b.round - a.round)
      
      console.log(`📋 메인 페이지에서 ${allMatches.length}개 회차 발견, 최신: ${sorted[0].round}회차 (seq: ${sorted[0].seq})`)
      return sorted[0]
    }
    
    // 3차: 구형 패턴 시도
    const legacyMatch = mainHtml.match(/game_round[=:][\s'"]*(\d+)/)
    if (legacyMatch) {
      const activeRound = parseInt(legacyMatch[1])
      console.log(`📋 파라미터에서 활성 회차 감지: ${activeRound} (seq는 계산)`)
      return { round: activeRound, seq: calculateMasterSeq(activeRound) }
    }
    
    // 4차: 발매기간 날짜로 판단
    console.log('⚠️ 메인 페이지 파싱 실패, 발매기간 체크로 대체')
    const fallbackRound = await findActiveRoundByDate()
    return { round: fallbackRound, seq: calculateMasterSeq(fallbackRound) }
    
  } catch (err) {
    console.error('⚠️ 메인 페이지 접근 실패:', err)
    const fallbackRound = await findActiveRoundByDate()
    return { round: fallbackRound, seq: calculateMasterSeq(fallbackRound) }
  }
}

async function findActiveRoundByDate(): Promise<number> {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const estimatedMax = currentMonth * 5 + 10
  
  for (let r = estimatedMax; r >= Math.max(1, estimatedMax - 8); r--) {
    try {
      const seq = calculateMasterSeq(r)
      const html = await fetchWisetotoGameList(String(r), seq)
      
      if (!html.includes('<ul')) continue
      
      // "발매기간 : 2026-02-09 14:00 ~" 패턴에서 시작 날짜 추출
      const saleMatch = html.match(/발매기간\s*:\s*(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/)
      if (saleMatch) {
        const saleStart = new Date(
          parseInt(saleMatch[1]), parseInt(saleMatch[2]) - 1, parseInt(saleMatch[3]),
          parseInt(saleMatch[4]), parseInt(saleMatch[5])
        )
        
        // 발매 시작일이 아직 안 왔으면 → 미래 회차, 스킵
        if (saleStart > now) {
          console.log(`⏭️ ${r}회차: 발매 시작 ${saleMatch[0]} (미래 → 스킵)`)
          continue
        }
        
        console.log(`📋 ${r}회차: 발매 중 (시작: ${saleMatch[0]})`)
        return r
      }
      
      // 발매기간 텍스트 없지만 데이터 있으면 → 경기 날짜로 판단
      // 경기 날짜가 오늘 이후면 현재 또는 미래 회차
      const dateMatch = html.match(/(\d{2})\.(\d{2})\([^)]+\)\s+(\d{2}):(\d{2})/)
      if (dateMatch) {
        const gameMonth = parseInt(dateMatch[1])
        const gameDay = parseInt(dateMatch[2])
        const gameDate = new Date(now.getFullYear(), gameMonth - 1, gameDay)
        const daysUntilGame = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        
        // 경기가 7일 이내 미래면 현재 회차로 판단
        if (daysUntilGame >= -1 && daysUntilGame <= 7) {
          console.log(`📋 ${r}회차: 경기일 ${gameMonth}/${gameDay} (현재 회차로 판단)`)
          return r
        }
        
        if (daysUntilGame > 7) {
          console.log(`⏭️ ${r}회차: 경기일 ${gameMonth}/${gameDay} (너무 먼 미래 → 스킵)`)
          continue
        }
      }
    } catch {
      continue
    }
  }
  
  return 19
}

// ============================================================
// Wisetoto 내부 API에서 게임 목록 HTML 가져오기
// ============================================================
async function fetchWisetotoGameList(round: string, masterSeq: string): Promise<string> {
  const url = `https://www.wisetoto.com/util/gameinfo/get_proto_list.htm?game_category=pt1&game_year=${new Date().getFullYear()}&game_round=${round}&game_month=&game_day=&game_info_master_seq=${masterSeq}&sports=&sort=&tab_type=proto`
  
  console.log('📡 Fetching Wisetoto:', url)
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'Referer': 'https://www.wisetoto.com/index.htm?tab_type=proto',
    },
  })
  
  if (!res.ok) {
    throw new Error(`Wisetoto responded with ${res.status}`)
  }
  
  return await res.text()
}

// ============================================================
// DB 저장 (배치 upsert - 50건씩 묶어서 저장)
// ============================================================
async function saveMatchesToDB(matches: ProtoMatch[]) {
  const results = { inserted: 0, updated: 0, errors: 0 }
  
  // 매치 데이터를 DB 형식으로 변환
  const rows = matches.map(match => {
    let handicapNumeric: number | null = null
    let totalLine: number | null = null
    let handicapLine: string | null = null
    
    if (match.handicap_value) {
      if (match.game_type === '핸디캡') {
        handicapLine = match.handicap_value
        const numMatch = match.handicap_value.match(/[+-]?\d+\.?\d*/)
        if (numMatch) handicapNumeric = parseFloat(numMatch[0])
      } else if (match.game_type === '언더오버' || match.game_type === 'SUM') {
        const numMatch = match.handicap_value.match(/\d+\.?\d*/)
        if (numMatch && parseFloat(numMatch[0]) > 0) totalLine = parseFloat(numMatch[0])
      }
    }
    
    return {
      round: match.round,
      match_seq: match.match_number,
      game_date: match.date_time,
      league_name: match.league,
      match_type: match.game_type,
      handicap_line: handicapLine,
      handicap_value: handicapNumeric,
      total_line: totalLine,
      home_team: match.home_team,
      away_team: match.away_team,
      home_odds: match.odds_home,
      draw_odds: match.odds_draw,
      away_odds: match.odds_away,
      result_code: match.result_code,
      home_score: match.home_score,
      away_score: match.away_score,
      status: match.status,
      korean_time: match.date_time.includes('T') 
        ? match.date_time.split('T')[1]?.substring(0, 5) 
        : null,
      updated_at: new Date().toISOString(),
    }
  })
  
  // 🔥 50건씩 배치 upsert (500경기 → 10번 DB 호출)
  const BATCH_SIZE = 50
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    
    try {
      const { error } = await supabase
        .from('proto_matches')
        .upsert(batch, { onConflict: 'round,match_seq' })
      
      if (error) {
        console.error(`❌ 배치 upsert 실패 (${i}~${i + batch.length}):`, error.message)
        results.errors += batch.length
      } else {
        results.inserted += batch.length
      }
    } catch (err: any) {
      console.error(`❌ 배치 저장 오류 (${i}~${i + batch.length}):`, err.message)
      results.errors += batch.length
    }
  }
  
  return results
}

// ============================================================
// API 핸들러
// ============================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    // 인증 체크
    const cronSecret = process.env.PROTO_CRON_SECRET || process.env.CRON_SECRET || 'trendsoccer-proto-2026'
    if (secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // 회차 파라미터 (옵션)
    let round = searchParams.get('round')
    let masterSeq = searchParams.get('seq')
    
    // 회차 미지정시 → 메인 페이지에서 현재 회차+seq 감지 후 수집
    if (!round) {
      const active = await getActiveRound()
      // 이전 회차(결과 업데이트) + 현재 회차(배당률 수집)
      // 🔥 이전 회차의 seq도 메인 페이지에서 찾아야 하므로, 전체 회차 목록 활용
      const rounds = [
        { round: active.round - 1, seq: String(parseInt(active.seq) - (parseInt(active.seq) - calculateMasterSeqNum(active.round - 1))) },
        { round: active.round, seq: active.seq }
      ]
      
      let totalMatches = 0
      const allResults: any[] = []
      
      for (const r of rounds) {
        try {
          // 🔥 이전 회차는 메인 페이지에서 seq를 못 찾을 수 있으므로 fallback
          let seqToUse = r.seq
          
          // 이전 회차의 seq를 메인 페이지에서 찾아보기
          if (r.round !== active.round) {
            const prevSeq = await findSeqForRound(r.round)
            if (prevSeq) seqToUse = prevSeq
          }
          
          const html = await fetchWisetotoGameList(String(r.round), seqToUse)
          const matches = parseWisetotoHtml(html, String(r.round))
          
          if (matches.length > 0) {
            const dbResults = await saveMatchesToDB(matches)
            totalMatches += matches.length
            allResults.push({
              round: r.round,
              seq: seqToUse,
              matches: matches.length,
              dbResults,
            })
            console.log(`✅ ${r.round}회차 ${matches.length}경기 수집 (seq: ${seqToUse})`)
          } else {
            console.log(`⚠️ ${r.round}회차 수집 결과 없음 (seq: ${seqToUse})`)
          }
        } catch (err: any) {
          console.log(`⚠️ ${r.round}회차 수집 실패: ${err.message}`)
        }
      }
      
      return NextResponse.json({
        success: totalMatches > 0,
        message: `${totalMatches}경기 수집 완료`,
        data: { detectedActiveRound: active.round, detectedSeq: active.seq, collectRounds: rounds, results: allResults, totalMatches },
      })
    }
    
    // 특정 회차 지정시
    // 🔥 2026-04 패치: round만 받았을 때도 메인 페이지에서 정확한 seq 조회
    // (SEQ_BASE 폴백은 회차 간격이 일정하지 않아 부정확 → 옛 회차 데이터를 새 회차로 잘못 저장하는 버그 발생)
    let seqSource: 'param' | 'lookup' | 'fallback' = 'param'
    if (!masterSeq) {
      const lookupSeq = await findSeqForRound(parseInt(round))
      if (lookupSeq) {
        masterSeq = lookupSeq
        seqSource = 'lookup'
      } else {
        masterSeq = calculateMasterSeq(parseInt(round))
        seqSource = 'fallback'
        console.warn(`⚠️ ${round}회차 seq를 메인 페이지에서 못 찾아 폴백 사용 (${masterSeq}) — 데이터가 다른 회차일 수 있음`)
      }
    }
    console.log(`🔑 ${round}회차 seq=${masterSeq} (source: ${seqSource})`)

    // Wisetoto 내부 API 호출
    const html = await fetchWisetotoGameList(round, masterSeq)
    console.log(`📄 HTML 수신: ${html.length}자`)
    
    // HTML 파싱
    const matches = parseWisetotoHtml(html, round)
    console.log(`🎮 파싱된 경기: ${matches.length}개`)
    
    if (matches.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No matches found in HTML',
        htmlLength: html.length,
        htmlPreview: html.substring(0, 500),
      })
    }
    
    // DB 저장
    const dbResults = await saveMatchesToDB(matches)
    
    // 스포츠별 집계
    const sportCounts = matches.reduce((acc, m) => {
      const sport = m.sport_type === 'bk' ? 'basketball' : m.sport_type === 'vl' ? 'volleyball' : 'soccer'
      acc[sport] = (acc[sport] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // 게임 유형별 집계
    const typeCounts = matches.reduce((acc, m) => {
      acc[m.game_type] = (acc[m.game_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log(`✅ ${round}회차 ${matches.length}경기 수집 완료`)
    
    return NextResponse.json({
      success: true,
      message: `${round}회차 ${matches.length}경기 수집 완료`,
      data: {
        round,
        masterSeq,
        seqSource,
        total: matches.length,
        sports: sportCounts,
        gameTypes: typeCounts,
        dbResults,
        preview: matches.slice(0, 5).map(m => ({
          no: m.match_number,
          teams: `${m.home_team} vs ${m.away_team}`,
          type: m.game_type,
          odds: `${m.odds_home} / ${m.odds_draw ?? '-'} / ${m.odds_away}`,
          score: m.home_score !== null ? `${m.home_score}:${m.away_score}` : null,
          result: m.result_code,
          status: m.status,
        })),
      },
    })
    
  } catch (error: any) {
    console.error('❌ Proto collect error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}