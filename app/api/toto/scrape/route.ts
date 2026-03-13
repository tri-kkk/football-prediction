// app/api/toto/scrape/route.ts
// v5 — wisetoto toto_calc 기반 스크래퍼 (실제 HTML 구조 확인 후 재작성)
//
// 실제 HTML 구조 (mw.wisetoto.com/gameinfo/toto_calc.htm):
// | 1 | 제노아 | 피사SC | 2,300,690 | 1,533,180 | 564,728 |  |  |  |
// | 01.03(토) 23:00 | |
// | 2 | 사수올로 | 파르마 | 2,380,189  (54.1%) | 1,293,973  (29.4%) | 724,436  (16.5%) |  |  |  |
//
// GET  /api/toto/scrape                    → 최신 회차 자동 스크래핑
// GET  /api/toto/scrape?year=2026&round=10 → 특정 회차
// GET  /api/toto/scrape?diag=true          → 진단 모드
// POST /api/toto/scrape                    → 수동 입력 (폴백)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// ===== 모바일 와이즈토토 (깔끔한 SSR HTML) =====
const WISETOTO_CALC = 'https://mw.wisetoto.com/gameinfo/toto_calc.htm'
const WISETOTO_MAIN = 'https://mw.wisetoto.com/index.htm'
// PC 버전 폴백
const WISETOTO_CALC_PC = 'https://www.wisetoto.com/gameinfo/toto_calc.htm'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Referer': 'https://mw.wisetoto.com/',
}


// ===== 팀명 매핑 =====
const TEAM_MAP: Record<string, { full: string; en: string }> = {
  // EPL
  '첼시': { full: '첼시 FC', en: 'Chelsea' },
  '에버턴': { full: '에버턴 FC', en: 'Everton' },
  '토트넘': { full: '토트넘 홋스퍼', en: 'Tottenham' },
  '웨스트햄': { full: '웨스트햄 유나이티드', en: 'West Ham' },
  '맨체스U': { full: '맨체스터 유나이티드', en: 'Manchester United' },
  '맨체스C': { full: '맨체스터 시티', en: 'Manchester City' },
  'A빌라': { full: '아스톤 빌라', en: 'Aston Villa' },
  '브라이턴': { full: '브라이턴', en: 'Brighton' },
  '크리스털': { full: '크리스탈 팰리스', en: 'Crystal Palace' },
  '번리': { full: '번리 FC', en: 'Burnley' },
  '풀럼': { full: '풀럼 FC', en: 'Fulham' },
  '노팅엄포': { full: '노팅엄 포레스트', en: 'Nottingham Forest' },
  '울버햄프': { full: '울버햄프턴', en: 'Wolverhampton' },
  '선덜랜드': { full: '선덜랜드 AFC', en: 'Sunderland' },
  '리버풀': { full: '리버풀 FC', en: 'Liverpool' },
  '리즈U': { full: '리즈 유나이티드', en: 'Leeds United' },
  '뉴캐슬U': { full: '뉴캐슬 유나이티드', en: 'Newcastle' },
  '아스널': { full: '아스널 FC', en: 'Arsenal' },
  '본머스': { full: 'AFC 본머스', en: 'Bournemouth' },
  '브렌트포': { full: '브렌트포드', en: 'Brentford' },
  '브렌트퍼': { full: '브렌트포드', en: 'Brentford' },
  '이프스위': { full: '입스위치 타운', en: 'Ipswich Town' },
  '레스터': { full: '레스터 시티', en: 'Leicester City' },
  '사우스햄': { full: '사우샘프턴', en: 'Southampton' },
  // La Liga
  '바르셀로': { full: 'FC 바르셀로나', en: 'Barcelona' },
  '레알마드': { full: '레알 마드리드', en: 'Real Madrid' },
  '아틀마드': { full: '아틀레티코 마드리드', en: 'Atletico Madrid' },
  '레알소시': { full: '레알 소시에다드', en: 'Real Sociedad' },
  '비야레알': { full: '비야레알 CF', en: 'Villarreal' },
  '세비야': { full: '세비야 FC', en: 'Sevilla' },
  '베티스': { full: '레알 베티스', en: 'Real Betis' },
  '헤타페': { full: '헤타페 CF', en: 'Getafe' },
  '발렌시아': { full: '발렌시아 CF', en: 'Valencia' },
  '셀타비고': { full: '셀타 비고', en: 'Celta Vigo' },
  '오사수나': { full: 'CA 오사수나', en: 'Osasuna' },
  '마요르카': { full: 'RCD 마요르카', en: 'Mallorca' },
  '에스파뇰': { full: 'RCD 에스파뇰', en: 'Espanyol' },
  '지로나': { full: '지로나 FC', en: 'Girona' },
  '레가네스': { full: 'CD 레가네스', en: 'Leganes' },
  '알라베스': { full: '데포르티보 알라베스', en: 'Alaves' },
  // Bundesliga
  '바이에른': { full: '바이에른 뮌헨', en: 'Bayern Munich' },
  '도르트문': { full: '보루시아 도르트문트', en: 'Borussia Dortmund' },
  'RB라이프': { full: 'RB 라이프치히', en: 'RB Leipzig' },
  '레버쿠젠': { full: '바이어 레버쿠젠', en: 'Bayer Leverkusen' },
  '프랑크푸': { full: '아인트라흐트 프랑크푸르트', en: 'Eintracht Frankfurt' },
  '슈투트가': { full: 'VfB 슈투트가르트', en: 'Stuttgart' },
  // Serie A
  '인터밀란': { full: '인테르 밀란', en: 'Inter Milan' },
  '인테르': { full: '인테르 밀란', en: 'Inter Milan' },
  'AC밀란': { full: 'AC 밀란', en: 'AC Milan' },
  '유벤투스': { full: '유벤투스 FC', en: 'Juventus' },
  '나폴리': { full: 'SSC 나폴리', en: 'Napoli' },
  '로마': { full: 'AS 로마', en: 'Roma' },
  'AS로마': { full: 'AS 로마', en: 'Roma' },
  '라치오': { full: 'SS 라치오', en: 'Lazio' },
  '아탈란타': { full: '아탈란타 BC', en: 'Atalanta' },
  '피오렌티': { full: 'ACF 피오렌티나', en: 'Fiorentina' },
  '토리노': { full: '토리노 FC', en: 'Torino' },
  '볼로냐': { full: '볼로냐 FC', en: 'Bologna' },
  '제노아': { full: '제노아 CFC', en: 'Genoa' },
  '사수올로': { full: '사수올로', en: 'Sassuolo' },
  '파르마': { full: '파르마 칼초', en: 'Parma' },
  '코모': { full: '코모 1907', en: 'Como' },
  '코모1907': { full: '코모 1907', en: 'Como' },  // wisetoto 표기
  '베로나': { full: '헬라스 베로나', en: 'Verona' },
  '엘라스': { full: '헬라스 베로나', en: 'Verona' },
  '레체': { full: 'US 레체', en: 'Lecce' },
  '엠폴리': { full: '엠폴리 FC', en: 'Empoli' },
  '우디네세': { full: '우디네세', en: 'Udinese' },
  '베네치아': { full: '베네치아 FC', en: 'Venezia' },
  '카글리아리': { full: '카글리아리', en: 'Cagliari' },
  '칼리아리': { full: '칼리아리', en: 'Cagliari' },  // wisetoto 표기
  '피사SC': { full: '피사 SC', en: 'Pisa' },
  '크레모네': { full: '크레모네세', en: 'Cremonese' },
  // Ligue 1
  'PSG': { full: '파리 생제르맹', en: 'Paris Saint-Germain' },
  '마르세유': { full: '올림피크 마르세유', en: 'Marseille' },
  '모나코': { full: 'AS 모나코', en: 'Monaco' },
  '릴': { full: '릴 OSC', en: 'Lille' },
  '리옹': { full: '올림피크 리옹', en: 'Lyon' },
  // ACL / 아시아
  '산프히로': { full: '산프레체 히로시마', en: 'Sanfrecce Hiroshima' },
  '조호르다': { full: '조호르 다룰 타짐', en: 'Johor Darul Tazim' },
  '비셀고베': { full: '비셀 고베', en: 'Vissel Kobe' },
  'FC서울': { full: 'FC서울', en: 'FC Seoul' },
  '상하선화': { full: '상하이 선화', en: 'Shanghai Shenhua' },
  '마치다': { full: 'FC 마치다 젤비아', en: 'FC Machida Zelvia' },
  '강원FC': { full: '강원FC', en: 'Gangwon FC' },
  '상하하이': { full: '상하이 하이강', en: 'Shanghai Haigang' },
  '울산HDFC': { full: '울산 HD FC', en: 'Ulsan HD FC' },
  '멜버시티': { full: '멜버른 시티', en: 'Melbourne City' },
  '광저우FC': { full: '광저우 FC', en: 'Guangzhou FC' },
  '가와사키': { full: '가와사키 프론탈레', en: 'Kawasaki Frontale' },
  '요코하마': { full: '요코하마 F 마리노스', en: 'Yokohama F. Marinos' },
  '부리람': { full: '부리람 유나이티드', en: 'Buriram United' },
  '전북현대': { full: '전북 현대 모터스', en: 'Jeonbuk Hyundai' },
}

function detectLeague(home: string, away: string): string {
  const EPL = ['첼시','에버턴','토트넘','웨스트햄','맨체스U','맨체스C','A빌라','브라이턴','크리스털','번리','풀럼','노팅엄포','울버햄프','선덜랜드','리버풀','리즈U','뉴캐슬U','아스널','본머스','브렌트포','브렌트퍼','이프스위','레스터','사우스햄']
  const LALIGA = ['바르셀로','레알마드','아틀마드','레알소시','비야레알','세비야','베티스','헤타페','발렌시아','셀타비고','오사수나','마요르카','에스파뇰','지로나','레가네스','알라베스']
  const BL = ['바이에른','도르트문','RB라이프','레버쿠젠','프랑크푸','슈투트가']
  const SA = ['인터밀란','인테르','AC밀란','유벤투스','나폴리','로마','AS로마','라치오','아탈란타','피오렌티','토리노','볼로냐','제노아','사수올로','파르마','코모','코모1907','베로나','엘라스','레체','엠폴리','우디네세','베네치아','카글리아리','칼리아리','피사SC','크레모네']
  const L1 = ['PSG','마르세유','모나코','릴','리옹']
  
  if (EPL.includes(home) || EPL.includes(away)) return 'EPL'
  if (LALIGA.includes(home) || LALIGA.includes(away)) return 'La Liga'
  if (BL.includes(home) || BL.includes(away)) return 'Bundesliga'
  if (SA.includes(home) || SA.includes(away)) return 'Serie A'
  if (L1.includes(home) || L1.includes(away)) return 'Ligue 1'
  return 'Other'
}


// =========================================================
// 핵심 파서: wisetoto toto_calc HTML (v2)
// =========================================================
// 실제 HTML 구조 (2026년 확인):
//   <td rowspan="2" class="number">1</td>
//   <td>홈팀</td>
//   <td>원정팀</td>
//   <td rowspan="2"><div class="text">580,740 <br />(80.7%) </div>...</td>  ← 승
//   <td rowspan="2"><div class="text">96,334 <br />(13.4%) </div>...</td>   ← 무
//   <td rowspan="2"><div class="text">42,836 <br />(6.0%) </div>...</td>    ← 패
//   ...
//   <td colspan="2" class="date">02.10(월) 19:00</td>
//
function parseWisetotoCalc(html: string): any[] {
  const matches: any[] = []

  // class="number" 셀 기준으로 각 경기 블록 분할
  const matchBlocks = html.split(/<td[^>]*class="number"[^>]*>/i)

  for (let i = 1; i < matchBlocks.length; i++) {
    const block = matchBlocks[i]

    // 1) 경기번호
    const numMatch = block.match(/^\s*(\d{1,2})\s*<\/td>/i)
    if (!numMatch) continue
    const matchNum = parseInt(numMatch[1])
    if (matchNum < 1 || matchNum > 14) continue

    // 2) 팀명: <td>팀명</td> (number 뒤에 연속 2개)
    const teamMatches = [...block.matchAll(/<td>([^<]+)<\/td>/gi)]
    const teams = teamMatches
      .map(m => m[1].trim())
      .filter(t =>
        t.length >= 2 &&
        !/\d{2}\.\d{2}/.test(t) &&   // 날짜 아닌 것
        !/^\d+$/.test(t)              // 순수 숫자 아닌 것
      )

    if (teams.length < 2) continue
    const home = teams[0]
    const away = teams[1]

    // 3) 투표 데이터: <div class="text">COUNT <br />(PCT%) </div>
    const voteMatches = [...block.matchAll(
      /<div\s+class="text">\s*([\d,]+)\s*<br\s*\/?>\s*\((\d+\.?\d*)%\)\s*<\/div>/gi
    )]

    let voteWin = 0, voteDraw = 0, voteLose = 0
    let countWin = 0, countDraw = 0, countLose = 0

    if (voteMatches.length >= 3) {
      countWin = parseInt(voteMatches[0][1].replace(/,/g, ''))
      voteWin = parseFloat(voteMatches[0][2])
      countDraw = parseInt(voteMatches[1][1].replace(/,/g, ''))
      voteDraw = parseFloat(voteMatches[1][2])
      countLose = parseInt(voteMatches[2][1].replace(/,/g, ''))
      voteLose = parseFloat(voteMatches[2][2])
    }

    // 4) 날짜: "02.15(토) 20:30"
    const dateMatch = block.match(/(\d{2}\.\d{2})\s*\([가-힣]\)\s*(\d{2}:\d{2})/)
    const matchDate = dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : null

    matches.push({
      match_number: matchNum,
      home_team: home,
      away_team: away,
      home_team_full: TEAM_MAP[home]?.full || home,
      away_team_full: TEAM_MAP[away]?.full || away,
      home_team_en: TEAM_MAP[home]?.en || home,
      away_team_en: TEAM_MAP[away]?.en || away,
      league: detectLeague(home, away),
      match_date: matchDate,
      vote_win: voteWin,
      vote_draw: voteDraw,
      vote_lose: voteLose,
      vote_count_win: countWin,
      vote_count_draw: countDraw,
      vote_count_lose: countLose,
      vote_total: countWin + countDraw + countLose,
    })
  }

  return matches
}


// =========================================================
// 현재 발매중인 회차 자동 감지
// =========================================================
// 전략: toto_calc 페이지의 회차 드롭다운에서 최고 회차 번호를 가져옴
// 드롭다운 HTML: <option>11</option><option>10</option>...
// → 첫 번째(가장 높은) 번호 = 최신 회차
async function detectCurrentRound(): Promise<{ year: number; round: number }> {
  const currentYear = new Date().getFullYear()

  // 전략 1: toto_calc 페이지 드롭다운에서 감지 (가장 안정적)
  try {
    const url = `${WISETOTO_CALC}?game_type=sc&game_category=sc1&game_year=${currentYear}&game_round=1`
    console.log('🔍 회차 감지:', url)
    const res = await fetch(url, { headers: HEADERS, cache: 'no-store' })
    const html = await res.text()

    // 회차 드롭다운 옵션에서 모든 숫자 추출
    // 패턴: <option>11</option><option>10</option>...
    // 또는 <option value="11">11회차</option> 등
    const roundNumbers: number[] = []
    
    // 방법 A: select 영역 내 option 값들
    const selectMatch = html.match(/<select[^>]*id[^>]*round[^>]*>[\s\S]*?<\/select>/i)
      || html.match(/<select[^>]*name[^>]*round[^>]*>[\s\S]*?<\/select>/i)
    if (selectMatch) {
      const optionMatches = selectMatch[0].matchAll(/<option[^>]*>\s*(\d+)\s*<\/option>/gi)
      for (const m of optionMatches) roundNumbers.push(parseInt(m[1]))
    }

    // 방법 B: game_round= 파라미터에서 최대값 추출
    if (roundNumbers.length === 0) {
      const roundParams = html.matchAll(/game_round[=:](\d+)/g)
      for (const m of roundParams) roundNumbers.push(parseInt(m[1]))
    }

    // 방법 C: 연속된 숫자 리스트 패턴 (드롭다운 텍스트)
    // "11\n10\n9\n8\n7\n..." 패턴
    if (roundNumbers.length === 0) {
      const text = html.replace(/<[^>]+>/g, '\n')
      const lines = text.split('\n').map(l => l.trim()).filter(l => /^\d{1,3}$/.test(l))
      const nums = lines.map(Number).filter(n => n >= 1 && n <= 200)
      roundNumbers.push(...nums)
    }

    if (roundNumbers.length > 0) {
      const maxRound = Math.max(...roundNumbers)
      console.log(`✅ 감지된 최신 회차: ${currentYear}년 ${maxRound}회차 (총 ${roundNumbers.length}개 회차 발견)`)
      
      // 최고 회차의 투표 확인 — 0이면 아직 미발매, 이전 회차 사용
      try {
        const checkUrl = `${WISETOTO_CALC}?game_type=sc&game_category=sc1&game_year=${currentYear}&game_round=${maxRound}`
        const checkRes = await fetch(checkUrl, { headers: HEADERS, cache: 'no-store' })
        const checkHtml = await checkRes.text()
        
        // 투표수 합산 확인
        const voteMatches = [...checkHtml.matchAll(/<div\s+class="text">\s*([\d,]+)\s*<br\s*\/?>/gi)]
        const totalVotes = voteMatches.reduce((sum, m) => sum + parseInt(m[1].replace(/,/g, ''), 10), 0)
        
        if (totalVotes === 0 && maxRound > 1) {
          console.log(`⚠️ ${maxRound}회차 투표 0 → ${maxRound - 1}회차로 변경`)
          return { year: currentYear, round: maxRound - 1 }
        }
      } catch (e) {
        console.error('투표 확인 실패, 최고 회차 그대로 사용:', e)
      }
      
      return { year: currentYear, round: maxRound }
    }
  } catch (e) {
    console.error('toto_calc 감지 실패:', e)
  }

  // 전략 2: PC 메인 페이지에서 "N회차 발매중" 감지
  try {
    const res = await fetch('https://www.wisetoto.com/index.htm?tab_type=toto&game_type=sc&game_category=sc1', {
      headers: { ...HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      cache: 'no-store',
    })
    const html = await res.text()

    // "승무패" 근처에서 "N회차" + "발매중" (사이에 어떤 문자든 허용)
    const match = html.match(/승무패[\s\S]{0,200}?(\d+)회차[\s\S]{0,50}?발매중/)
    if (match) {
      console.log(`✅ PC 메인에서 감지: ${currentYear}년 ${match[1]}회차`)
      return { year: currentYear, round: parseInt(match[1]) }
    }

    // game_category=sc1 링크에서 round 추출
    const linkMatch = html.match(/game_category=sc1[^"']*game_round=(\d+)/)
    if (linkMatch) {
      return { year: currentYear, round: parseInt(linkMatch[1]) }
    }
  } catch (e) {
    console.error('PC 메인 감지 실패:', e)
  }

  // 전략 3: 모바일 메인 페이지
  try {
    const res = await fetch(`${WISETOTO_MAIN}?tab_type=toto`, {
      headers: HEADERS, cache: 'no-store',
    })
    const html = await res.text()

    const match = html.match(/승무패[\s\S]{0,200}?(\d+)회차[\s\S]{0,50}?발매중/)
    if (match) {
      return { year: currentYear, round: parseInt(match[1]) }
    }
  } catch {}

  console.error('❌ 모든 회차 감지 방법 실패')
  return { year: currentYear, round: 0 }
}


// =========================================================
// 팀명 키워드 추출 (짧은 이름으로 ilike 검색용)
// "Manchester United" → "Manchester", "AC Milan" → "Milan" 등
// =========================================================
function toSearchKey(name: string): string {
  // 접두어 제거 후 첫 번째 의미있는 단어 반환
  const cleaned = name
    .replace(/^(FC|AC|AS|RC|RCD|VfB|RB|AFC|SSC|SS|CA|CD|UD|SD|SC)\s+/i, '')
    .trim()
  return cleaned.split(/\s+/)[0] // 첫 단어만
}

// =========================================================
// AI 예측 + 등급 계산
// =========================================================
async function enrichWithPredictions(matches: any[]) {
  for (const m of matches) {
    const homeEN = TEAM_MAP[m.home_team]?.en || m.home_team
    const awayEN = TEAM_MAP[m.away_team]?.en || m.away_team
    let found = false

    // TrendSoccer DB에서 오즈 조회 (홈/원정 양방향 검색)
    try {
      const homeKey = toSearchKey(homeEN)
      const awayKey = toSearchKey(awayEN)

      // 1차: 홈팀 기준 검색
      const { data: homeData } = await supabase
        .from('match_odds_latest')
        .select('home_win_odds, draw_odds, away_win_odds, home_team, away_team')
        .ilike('home_team', `%${homeKey}%`)
        .gte('updated_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order('updated_at', { ascending: false })
        .limit(10)

      if (homeData?.length) {
        // 원정팀도 매칭되는 행 우선
        const exact = homeData.find(o =>
          o.away_team?.toLowerCase().includes(awayKey.toLowerCase())
        )
        const row = exact || homeData[0]
        if (row.home_win_odds > 0 && row.draw_odds > 0 && row.away_win_odds > 0) {
          const hp = 1 / row.home_win_odds
          const dp = 1 / row.draw_odds
          const ap = 1 / row.away_win_odds
          const t = hp + dp + ap
          m.ts_win  = Math.round((hp / t) * 1000) / 10
          m.ts_draw = Math.round((dp / t) * 1000) / 10
          m.ts_lose = Math.round((ap / t) * 1000) / 10
          found = true
        }
      }

      // 2차: 원정 경기로 저장된 경우 (홈/원정 반전)
      if (!found) {
        const { data: awayData } = await supabase
          .from('match_odds_latest')
          .select('home_win_odds, draw_odds, away_win_odds, home_team, away_team')
          .ilike('away_team', `%${homeKey}%`)
          .gte('updated_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .order('updated_at', { ascending: false })
          .limit(10)

        if (awayData?.length) {
          const exact = awayData.find(o =>
            o.home_team?.toLowerCase().includes(awayKey.toLowerCase())
          )
          const row = exact || awayData[0]
          if (row.home_win_odds > 0 && row.draw_odds > 0 && row.away_win_odds > 0) {
            // 홈/원정 반전해서 적용
            const hp = 1 / row.away_win_odds  // 원래 원정 = 토토 홈
            const dp = 1 / row.draw_odds
            const ap = 1 / row.home_win_odds  // 원래 홈 = 토토 원정
            const t = hp + dp + ap
            m.ts_win  = Math.round((hp / t) * 1000) / 10
            m.ts_draw = Math.round((dp / t) * 1000) / 10
            m.ts_lose = Math.round((ap / t) * 1000) / 10
            found = true
          }
        }
      }
    } catch {}

    // 오즈 없으면 투표율 기반 보정
    if (!found) {
      if (m.vote_win > 0) {
        const rw = m.vote_win + 3, rd = m.vote_draw - 1, rl = m.vote_lose - 2
        const t = rw + rd + rl
        m.ts_win = Math.round((rw / t) * 1000) / 10
        m.ts_draw = Math.round((rd / t) * 1000) / 10
        m.ts_lose = Math.round((rl / t) * 1000) / 10
      } else {
        m.ts_win = 33.3; m.ts_draw = 33.3; m.ts_lose = 33.3
      }
    }

    // 괴리율
    m.divergence_win = Math.round((m.ts_win - m.vote_win) * 10) / 10
    m.divergence_draw = Math.round((m.ts_draw - m.vote_draw) * 10) / 10
    m.divergence_lose = Math.round((m.ts_lose - m.vote_lose) * 10) / 10
    m.max_divergence = Math.round(
      Math.max(
        Math.abs(m.divergence_win),
        Math.abs(m.divergence_draw),
        Math.abs(m.divergence_lose)
      ) * 10
    ) / 10

    // 등급
    const votes = [m.vote_win, m.vote_draw, m.vote_lose].sort((a, b) => b - a)
    const gap = votes[0] - votes[1]
    if (votes[0] >= 80 || gap > 40) m.grade = 'PICK'
    else if (votes[0] >= 60 || gap > 20) m.grade = 'GOOD'
    else if (gap > 8) m.grade = 'FAIR'
    else m.grade = 'PASS'

    // 추천 선택
    const probs = [
      { p: 'W', v: m.ts_win },
      { p: 'D', v: m.ts_draw },
      { p: 'L', v: m.ts_lose },
    ].sort((a, b) => b.v - a.v)
    m.primary_pick = probs[0].p
    if (m.grade === 'FAIR' || m.grade === 'PASS') m.secondary_pick = probs[1].p

    // 분석 코멘트
    if (m.grade === 'PICK') {
      const fav = m.vote_win > m.vote_lose ? m.home_team : m.away_team
      m.analysis = `${fav}의 압도적 우세. 고정 추천.`
    } else if (m.grade === 'GOOD') {
      const fav = m.vote_win > m.vote_lose ? m.home_team : m.away_team
      m.analysis = `${fav} 우세. ${m.max_divergence > 5 ? '괴리 주의.' : '고정 가능.'}`
    } else if (m.max_divergence > 10) {
      const dir = Math.abs(m.divergence_win) === m.max_divergence ? '홈승'
        : Math.abs(m.divergence_draw) === m.max_divergence ? '무승부' : '원정승'
      m.analysis = `⚠️ 괴리율 ${m.max_divergence}% — AI는 ${dir} 가능성 높게 분석.`
    } else if (m.grade === 'PASS') {
      m.analysis = '세 결과 엇비슷. 트리플 선택 권장.'
    } else {
      m.analysis = `괴리율 ${m.max_divergence}%. 더블 선택 고려.`
    }
  }
  return matches
}


// =========================================================
// DB 저장
// =========================================================
// "02.14 23:00" → "2026-02-14T23:00:00+09:00" (KST)
function toISODate(dateStr: string | null, year: number): string | null {
  if (!dateStr) return null
  const m = dateStr.match(/(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})/)
  if (!m) return null
  return `${year}-${m[1]}-${m[2]}T${m[3]}:${m[4]}:00+09:00`
}


async function saveToDB(matches: any[], year: number, round: number) {
  const totalVotes = matches.reduce((s: number, m: any) => s + (m.vote_total || 0), 0)
  const { data: roundData, error: roundErr } = await supabase
    .from('toto_rounds')
    .upsert({
      year,
      round_number: round,
      total_matches: matches.length,
      total_votes: totalVotes,
      status: 'upcoming',
      scraped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'year,round_number' })
    .select()
    .single()

  if (roundErr) return { error: roundErr.message, roundId: null, saved: 0 }

  const roundId = roundData.id
  let saved = 0
  let firstError: string | null = null

  for (const m of matches) {
    const { error } = await supabase.from('toto_matches').upsert({
      round_id: roundId,
      match_number: m.match_number,
      home_team: m.home_team,
      away_team: m.away_team,
      home_team_full: m.home_team_full,
      away_team_full: m.away_team_full,
      home_team_en: m.home_team_en || TEAM_MAP[m.home_team]?.en || m.home_team,
      away_team_en: m.away_team_en || TEAM_MAP[m.away_team]?.en || m.away_team,
      league: m.league,
      match_date: toISODate(m.match_date, year),
      vote_win: m.vote_win,
      vote_draw: m.vote_draw,
      vote_lose: m.vote_lose,
      vote_count_win: m.vote_count_win || null,
      vote_count_draw: m.vote_count_draw || null,
      vote_count_lose: m.vote_count_lose || null,
      vote_total: m.vote_total || null,
      ts_win: m.ts_win,
      ts_draw: m.ts_draw,
      ts_lose: m.ts_lose,
      divergence_win: m.divergence_win,
      divergence_draw: m.divergence_draw,
      divergence_lose: m.divergence_lose,
      max_divergence: m.max_divergence,
      grade: m.grade,
      primary_pick: m.primary_pick,
      secondary_pick: m.secondary_pick || null,
      analysis: m.analysis,
      scraped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'round_id,match_number' })
    if (!error) {
      saved++
    } else {
      console.error(`❌ Match #${m.match_number} 저장 실패:`, error.message, error.details, error.hint)
      if (!firstError) firstError = `#${m.match_number}: ${error.message} ${error.hint || ''}`
    }
  }

  return { roundId, saved, error: firstError || null }
}


// =========================================================
// GET: 자동 스크래핑
// =========================================================
export async function GET(request: NextRequest) {
  const start = Date.now()
  const { searchParams } = new URL(request.url)
  let year = parseInt(searchParams.get('year') || '0')
  let round = parseInt(searchParams.get('round') || '0')
  const diag = searchParams.get('diag') === 'true'
  const force = searchParams.get('force') === 'true'

  try {
    // 회차 자동 감지
    if (year === 0 || round === 0) {
      const detected = await detectCurrentRound()
      if (year === 0) year = detected.year
      if (round === 0) round = detected.round
      if (round === 0) {
        return NextResponse.json({
          error: '현재 발매중인 회차를 감지할 수 없습니다. year, round 파라미터를 직접 지정하세요.',
          example: '/api/toto/scrape?year=2026&round=10',
        }, { status: 400 })
      }
    }

    // 캐시 확인 (1시간 이내 스크래핑 건너뛰기)
    if (!force && !diag) {
      const { data: existing } = await supabase
        .from('toto_rounds')
        .select('id, scraped_at')
        .eq('year', year)
        .eq('round_number', round)
        .single()

      if (existing) {
        const age = Date.now() - new Date(existing.scraped_at).getTime()
        if (age < 60 * 60 * 1000) {  // 1시간
          const { data: cached } = await supabase
            .from('toto_matches')
            .select('*')
            .eq('round_id', existing.id)
            .order('match_number')
          return NextResponse.json({
            cached: true,
            round: { year, round_number: round, id: existing.id },
            matches: cached || [],
            cache_age_minutes: Math.round(age / 60000),
          })
        }
      }
    }

    // === wisetoto toto_calc 페이지 fetch (모바일 우선) ===
    let html = ''
    let sourceUrl = ''
    
    // 1차: 모바일 버전 (더 깔끔한 HTML)
    try {
      sourceUrl = `${WISETOTO_CALC}?game_type=sc&game_category=sc1&game_year=${year}&game_round=${round}`
      console.log(`🔍 [1] 모바일 fetch: ${sourceUrl}`)
      const res = await fetch(sourceUrl, { headers: HEADERS, cache: 'no-store' })
      html = await res.text()
    } catch (e) {
      console.error('모바일 fetch 실패:', e)
    }

    // 2차: PC 버전 폴백
    if (!html || html.length < 1000) {
      try {
        sourceUrl = `${WISETOTO_CALC_PC}?game_type=sc&game_category=sc1&game_year=${year}&game_round=${round}`
        console.log(`🔍 [2] PC fetch: ${sourceUrl}`)
        const res = await fetch(sourceUrl, {
          headers: { ...HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          cache: 'no-store',
        })
        html = await res.text()
      } catch (e) {
        console.error('PC fetch도 실패:', e)
      }
    }

    if (!html || html.length < 500) {
      return NextResponse.json({ error: 'wisetoto에서 HTML을 가져오지 못했습니다.' }, { status: 502 })
    }

    // 진단 모드
    if (diag) {
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
      const testParse = parseWisetotoCalc(html)
      return NextResponse.json({
        url: sourceUrl,
        html_length: html.length,
        markers: {
          'vs_count': (text.match(/\bvs\b/gi) || []).length,
          'percentage_count': (html.match(/\d+\.\d+%/g) || []).length,
          'big_numbers': (html.match(/[\d,]{7,}/g) || []).slice(0, 10),
          'korean_teams_found': Object.keys(TEAM_MAP).filter(t => text.includes(t)),
          'td_count': (html.match(/<td/gi) || []).length,
          'tr_count': (html.match(/<tr/gi) || []).length,
          'table_count': (html.match(/<table/gi) || []).length,
        },
        parsed_count: testParse.length,
        parsed_matches: testParse,
        html_sample_start: html.substring(0, 3000),
        html_sample_table: (() => {
          const tableStart = html.indexOf('<table')
          return tableStart >= 0 ? html.substring(tableStart, tableStart + 3000) : 'no <table> found'
        })(),
      })
    }

    // 파싱
    let matches = parseWisetotoCalc(html)
    console.log(`📊 파싱 결과: ${matches.length}경기`)

    if (matches.length < 10) {
      return NextResponse.json({
        error: `파싱 실패 — ${matches.length}경기만 추출됨 (최소 10경기 필요)`,
        url: sourceUrl,
        html_length: html.length,
        partial_matches: matches,
        suggestion: '?diag=true 로 HTML 구조를 확인하세요.',
        duration_ms: Date.now() - start,
      }, { status: 422 })
    }

    // AI 예측 추가
    matches = await enrichWithPredictions(matches)

    // DB 저장
    const { roundId, saved, error: dbErr } = await saveToDB(matches, year, round)

    return NextResponse.json({
      success: true,
      cached: false,
      source: 'wisetoto_calc',
      round: { year, round_number: round, id: roundId },
      matches,
      stats: {
        total: matches.length,
        saved,
        pick_count: matches.filter((m: any) => m.grade === 'PICK').length,
        good_count: matches.filter((m: any) => m.grade === 'GOOD').length,
        fair_count: matches.filter((m: any) => m.grade === 'FAIR').length,
        pass_count: matches.filter((m: any) => m.grade === 'PASS').length,
        total_votes: matches.reduce((s: number, m: any) => s + (m.vote_total || 0), 0),
      },
      duration_ms: Date.now() - start,
      ...(dbErr ? { db_error: dbErr } : {}),
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      duration_ms: Date.now() - start,
    }, { status: 500 })
  }
}


// =========================================================
// POST: 수동 데이터 입력 (폴백)
// =========================================================
export async function POST(request: NextRequest) {
  const start = Date.now()

  try {
    const body = await request.json()
    const { year, round_number, matches: inputMatches, html } = body

    if (!year || !round_number) {
      return NextResponse.json({ error: 'year, round_number 필수' }, { status: 400 })
    }

    let matches: any[] = []

    if (inputMatches && Array.isArray(inputMatches) && inputMatches.length > 0) {
      matches = inputMatches.map((m: any, i: number) => ({
        match_number: m.match_number || m.num || i + 1,
        home_team: m.home_team || m.home,
        away_team: m.away_team || m.away,
        home_team_full: TEAM_MAP[m.home_team || m.home]?.full || m.home_team || m.home,
        away_team_full: TEAM_MAP[m.away_team || m.away]?.full || m.away_team || m.away,
        league: m.league || detectLeague(m.home_team || m.home, m.away_team || m.away),
        match_date: toISODate(m.match_date, year) || m.match_date || null,
        vote_win: m.vote_win || m.win || 0,
        vote_draw: m.vote_draw || m.draw || 0,
        vote_lose: m.vote_lose || m.lose || 0,
        vote_count_win: m.vote_count_win || null,
        vote_count_draw: m.vote_count_draw || null,
        vote_count_lose: m.vote_count_lose || null,
        vote_total: m.vote_total || null,
      }))
    } else if (html) {
      matches = parseWisetotoCalc(html)
    }

    if (matches.length === 0) {
      return NextResponse.json({
        error: '매치 데이터 없음',
        usage: 'POST { year, round_number, matches: [{ num, home, away, win, draw, lose }] }',
      }, { status: 400 })
    }

    matches = await enrichWithPredictions(matches)
    const { roundId, saved, error: dbErr } = await saveToDB(matches, year, round_number)

    return NextResponse.json({
      success: true,
      round: { year, round_number, id: roundId },
      matches,
      saved,
      duration_ms: Date.now() - start,
      ...(dbErr ? { db_error: dbErr } : {}),
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}