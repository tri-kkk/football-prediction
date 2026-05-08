import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ADMIN_SECRET = process.env.PROTO_ADMIN_SECRET || 'trendsoccer-proto-2026'

const KNOWN_LEAGUES = [
  'U23아컵', '남농EASL', 'KOVO남', 'KOVO여', '에레디비', 'EFL챔',
  '세리에A', '라리가', '분데스리', '리그1', '프리그1',
  'UCL', 'UEL', 'EPL', 'PL',
  'WKBL', 'KBL', 'NBA',
  'A리그', 'J1백년', 'J2J3백년', 'J백년',  // 🆕 일본 J리그 추가
  '이탈FA컵', '스페FA컵', '스페FA', '독일FA컵', '잉글FA컵', '프랑FA컵', '네덜FA컵',
]

const NO_DRAW_LEAGUES = ['WKBL', 'KBL', 'NBA', 'KOVO남', 'KOVO여', '남농EASL']

/**
 * 줄바꿈 형식 파싱
 */
function parseNewlineFormat(text: string, round: string) {
  // 헤더와 노이즈 제거
  const noisePatterns = ['번호', '일시', '리그', '유형', '홈팀', '원정팀', '배당률', '결과', '비고', '상세', '보기', '정렬', '※']
  
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l)
    .filter(l => !noisePatterns.some(p => l.includes(p)))  // 노이즈 제거
  
  const matches: any[] = []
  const seenMatches = new Set<string>()
  const currentYear = new Date().getFullYear()

  // 베팅 타입 매핑
  const betTypeMap: Record<string, string> = {
    '승⑤패': '승5패',
    '승③패': '승3패', 
    '승④패': '승4패',
    'H': '핸디캡',
    'U': '언더오버',
    'SUM': '홀짝',  // 🔧 합계 → 홀짝
    'hH': '전반핸디',
    'hU': '전반언더오버',
  }

  // 결과 코드 매핑 (한글 → 영문)
  const resultCodeMap: Record<string, string> = {
    '홈승': 'home',
    '홈패': 'away',
    '무': 'draw',
    '무승부': 'draw',
    '⑤': 'draw',      // 🆕 승5패 무승부
    '무5': 'draw',    // 🆕 승5패 무승부 (다른 표기)
    '5점무': 'draw',  // 🆕 승5패 무승부 (다른 표기)
    '원정승': 'away',
    '원정패': 'home',
    '핸디승': 'home',
    '핸디패': 'away',
    '핸디무': 'draw',
    '오버': 'over',
    '언더': 'under',
    '홀': 'odd',
    '짝': 'even',
    '3세트': '3set',
    '4세트': '4set',
    '5세트': '5set',
    '적특': 'void',
    '적중특례': 'void',
    '발매취소': 'cancelled'
  }

  // 결과 코드 목록
  const resultCodes = Object.keys(resultCodeMap)

  let i = 0
  let lastLeague = ''  // 🆕 마지막 성공 리그 기억
  console.log(`📋 파싱 시작: ${lines.length}줄 (노이즈 제거 후)`)
  
  while (i < lines.length) {
    const line = lines[i]
    
    // 3자리 숫자로 시작하는 경기번호 찾기
    if (!/^\d{3}$/.test(line)) {
      i++
      continue
    }
    
    // 최소 필요 줄 확인
    if (i + 9 >= lines.length) break
    
    const matchSeq = parseInt(line)
    const dateTimeLine = lines[i + 1]
    const leagueLine = lines[i + 2]
    
    // 날짜 파싱
    const dateMatch = dateTimeLine.match(/(\d{2})\.(\d{2})\(([월화수목금토일])\)\s*(\d{2}):(\d{2})/)
    if (!dateMatch) {
      console.log(`⚠️ 날짜 파싱 실패: ${matchSeq} - "${dateTimeLine}"`)
      i++
      continue
    }
    
    const [, month, day, dayOfWeek, hour, minute] = dateMatch
    
    // 리그 확인 - 부분 매칭으로 변경
    let league = ''
    let leagueFoundAtPos2 = false  // 리그가 정상 위치(i+2)에 있는지
    
    for (const l of KNOWN_LEAGUES) {
      if (leagueLine === l || leagueLine.includes(l) || l.includes(leagueLine)) {
        league = leagueLine
        lastLeague = league  // 🆕 성공 시 기억
        leagueFoundAtPos2 = true
        break
      }
    }
    
    // 🆕 리그 매칭 실패 시 - 이전 리그 사용
    if (!league && lastLeague) {
      league = lastLeague
      // 리그가 생략됨 → leagueLine은 실제로 베팅타입이나 팀명
    } else if (!league) {
      console.log(`⚠️ 리그 매칭 실패 (첫 경기): ${matchSeq} - "${leagueLine}"`)
      i++
      continue
    }
    
    // 베팅 타입 확인
    let betType = '승무패'
    let teamStartIdx = i + 3
    let handicapValue: number | null = null
    let totalValue: number | null = null
    
    // 🆕 리그가 생략된 경우 (leagueLine이 베팅타입일 수 있음)
    let possibleBetType = leagueFoundAtPos2 ? lines[i + 3] : leagueLine
    
    // 베팅 타입 감지
    for (const [key, value] of Object.entries(betTypeMap)) {
      if (possibleBetType.startsWith(key) || possibleBetType === key) {
        betType = value
        
        // 🆕 인덱스 조정
        if (leagueFoundAtPos2) {
          teamStartIdx = i + 4  // 정상: 리그(i+2) → 베팅타입(i+3) → 팀(i+4)
        } else {
          teamStartIdx = i + 3  // 생략: 베팅타입(i+2) → 팀(i+3)
        }
        
        // 핸디캡/언오버 값 추출 (예: "H -3.5" → -3.5, "H +7.5" → +7.5)
        const valueMatch = possibleBetType.match(/[-+]?\d+(?:\.\d+)?/)
        if (valueMatch) {
          if (betType.includes('핸디')) {
            handicapValue = parseFloat(valueMatch[0])
          } else if (betType.includes('언더오버') || betType === '합계') {
            totalValue = parseFloat(valueMatch[0])
          }
        }
        break
      }
    }
    
    // 🆕 베팅타입도 없고 리그도 생략된 경우 (팀명이 i+2에 있음)
    if (betType === '승무패' && !leagueFoundAtPos2) {
      teamStartIdx = i + 2  // 팀이 바로 시작
    }
    
    // 홈팀, 구분자, 원정팀 (스코어가 별도 줄일 수 있음)
    const homeLine = lines[teamStartIdx]
    let separatorIdx = teamStartIdx + 1
    let separator = lines[separatorIdx]
    let homeScoreLine: string | null = null
    let awayScoreLine: string | null = null
    let awayLineIdx: number
    let awayLine: string
    
    // 언더오버/홀짝은 ':' 구분자 없이 스코어가 바로 나옴
    // 예: '안양정관', '129', '고양소노'
    if ((betType === '언더오버' || betType === '홀짝' || betType === '전반언더오버') && /^\d+$/.test(separator)) {
      // 스코어가 구분자 역할 (합산 점수)
      homeScoreLine = separator
      awayLineIdx = separatorIdx + 1
      awayLine = lines[awayLineIdx]
    } else {
      // 기존 로직: ':' 구분자 사용
      
      // 홈 스코어가 별도 줄인 경우 (숫자만 있는 줄)
      if (/^\d+$/.test(separator)) {
        homeScoreLine = separator
        separatorIdx++
        separator = lines[separatorIdx]
      }
      
      if (separator !== ':') {
        i++
        continue
      }
      
      // 원정 스코어가 별도 줄인 경우
      awayLineIdx = separatorIdx + 1
      awayLine = lines[awayLineIdx]
      
      if (/^\d+$/.test(awayLine)) {
        awayScoreLine = awayLine
        awayLineIdx++
        awayLine = lines[awayLineIdx]
      }
    }
    
    // 팀명 및 스코어 추출
    // "KT소닉붐 62" → 팀: "KT소닉붐", 스코어: 62
    // "73 안양정관" → 스코어: 73, 팀: "안양정관"
    const homeMatch = homeLine.match(/^(.+?)\s+(\d+)$/)
    const awayMatch = awayLine.match(/^(\d+)\s+(.+)$/)
    
    let homeTeam = homeLine.replace(/\s+\d+(\.\d+)?$/, '').trim()
    let awayTeam = awayLine.replace(/^\d+(\.\d+)?\s+/, '').trim()
    let homeScore: number | null = null
    let awayScore: number | null = null
    
    // 스코어가 별도 줄인 경우
    if (homeScoreLine) {
      homeScore = parseInt(homeScoreLine)
    } else if (homeMatch) {
      homeTeam = homeMatch[1].trim()
      homeScore = parseInt(homeMatch[2])
    }
    
    if (awayScoreLine) {
      awayScore = parseInt(awayScoreLine)
    } else if (awayMatch) {
      awayScore = parseInt(awayMatch[1])
      awayTeam = awayMatch[2].trim()
    }
    
    if (!homeTeam || !awayTeam) {
      i++
      continue
    }
    
    // 배당률 (awayLineIdx 기준)
    const homeOddsStr = lines[awayLineIdx + 1]?.replace(/[↑↓\s]/g, '') || '-'
    const drawOddsStr = lines[awayLineIdx + 2]?.replace(/[↑↓\s]/g, '') || '-'
    const awayOddsStr = lines[awayLineIdx + 3]?.replace(/[↑↓\s]/g, '') || '-'
    
    const homeOdds = homeOddsStr !== '-' ? parseFloat(homeOddsStr) : null
    const drawOdds = drawOddsStr !== '-' ? parseFloat(drawOddsStr) : null
    const awayOdds = awayOddsStr !== '-' ? parseFloat(awayOddsStr) : null
    
    // 상태/결과 파싱
    const statusOrResult = lines[awayLineIdx + 4] || '경기전'
    
    // 결과인지 상태인지 판별
    let status = '경기전'
    let resultCode: string | null = null
    
    if (resultCodes.includes(statusOrResult)) {
      // 결과 코드면 → 영문으로 변환
      resultCode = resultCodeMap[statusOrResult] || null
      status = '종료'
    } else {
      // 상태면 (경기전, 진행중, 하프타임 등)
      status = statusOrResult
    }
    
    // 중복 체크 (팀 + 베팅타입 + 핸디캡/언오버 값 조합)
    const matchKey = `${homeTeam}-${awayTeam}-${betType}-${handicapValue ?? ''}-${totalValue ?? ''}`
    if (seenMatches.has(matchKey)) {
      i = i + 10
      continue
    }
    seenMatches.add(matchKey)
    
    matches.push({
      round,
      match_seq: matchSeq,
      game_date: `${currentYear}-${month}-${day}T${hour}:${minute}:00`,
      korean_date: `${month}.${day}(${dayOfWeek})`,
      korean_time: `${hour}:${minute}`,
      home_team: homeTeam,
      away_team: awayTeam,
      league_name: league,
      match_type: betType,
      home_odds: homeOdds,
      draw_odds: drawOdds,
      away_odds: awayOdds,
      handicap_value: handicapValue,
      total_value: totalValue,
      home_score: homeScore,
      away_score: awayScore,
      status: status,
      result_code: resultCode,
    })
    
    i = i + 10
  }
  
  return matches
}

function parseWisetotoText(text: string, round: string) {
  console.log('📋 Parsing with newline format')
  const matches = parseNewlineFormat(text, round)
  console.log(`✅ 파싱 완료: ${matches.length}경기`)
  return matches
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rawText, round, secret } = body

    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    if (!rawText || !round) {
      return NextResponse.json({ success: false, error: 'Missing rawText or round' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    const matches = parseWisetotoText(rawText, round)
    
    if (matches.length === 0) {
      return NextResponse.json({ success: false, error: 'No matches found in text' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    // 기존 결과 데이터 가져오기 (파싱 실패 시 보존용)
    const { data: existingMatches } = await supabase
      .from('proto_matches')
      .select('match_seq, result_code, home_score, away_score')
      .eq('round', round)
    
    // 기존 결과 매핑
    const existingResults = new Map()
    if (existingMatches) {
      existingMatches.forEach(m => {
        existingResults.set(m.match_seq, {
          result_code: m.result_code,
          home_score: m.home_score,
          away_score: m.away_score
        })
      })
    }
    
    // 새 파싱 결과 우선, 없으면 기존 결과 유지
    const matchesWithResults = matches.map(m => {
      const existing = existingResults.get(m.match_seq)
      // 새 파싱에서 결과가 있으면 사용, 없으면 기존 결과 유지
      if (!m.result_code && existing?.result_code) {
        return {
          ...m,
          result_code: existing.result_code,
          home_score: existing.home_score,
          away_score: existing.away_score
        }
      }
      return m
    })

    // 기존 데이터 삭제 후 새로 입력
    await supabase.from('proto_matches').delete().eq('round', round)
    const { error } = await supabase.from('proto_matches').insert(matchesWithResults)

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ success: false, error: 'Failed to upload matches' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    // 🆕 슬립 상태 자동 업데이트
    await updateSlipStatus(round, matchesWithResults)

    const soccerLeagues = [
      'UCL', 'UEL', 'EPL', 'PL', 'EFL챔',
      '세리에A', '라리가', '분데스리', '리그1', '프리그1',
      'U23아컵', '에레디비', 'A리그',
      'J1백년', 'J2J3백년', 'J백년',  // 🆕 일본 J리그
      '이탈FA컵', '스페FA컵', '스페FA', '독일FA컵', '잉글FA컵', '프랑FA컵', '네덜FA컵',
    ]
    const basketLeagues = ['KBL', 'WKBL', 'NBA', 'EASL', '남농']
    
    return NextResponse.json({ 
      success: true, 
      message: `${round}회차 ${matches.length}경기 업로드 완료`,
      data: {
        total: matches.length,
        bySport: {
          soccer: matches.filter(m => soccerLeagues.some(l => m.league_name.includes(l))).length,
          basket: matches.filter(m => basketLeagues.some(l => m.league_name.includes(l))).length,
          volley: matches.filter(m => m.league_name.includes('KOVO')).length,
        }
      }
    }, { headers: { 'Access-Control-Allow-Origin': '*' } })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const round = searchParams.get('round')
  
  if (round) {
    const { data } = await supabase.from('proto_matches').select('*').eq('round', round).order('match_seq')
    return NextResponse.json({ success: true, matches: data })
  }
  
  return NextResponse.json({ success: true, message: 'Proto API v2.1' })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// 🆕 슬립 상태 자동 업데이트 함수
async function updateSlipStatus(round: string, matches: any[]) {
  try {
    // 해당 회차의 pending 슬립 조회
    const { data: slips, error: fetchError } = await supabase
      .from('proto_slips')
      .select('*')
      .eq('round', round)
      .eq('status', 'pending')

    if (fetchError || !slips || slips.length === 0) {
      console.log('📋 업데이트할 슬립 없음')
      return
    }

    console.log(`📋 ${slips.length}개 슬립 상태 확인 중...`)

    for (const slip of slips) {
      let allFinished = true
      let allCorrect = true

      for (const sel of slip.selections) {
        // match_seq로 매칭
        const match = matches.find(m => m.match_seq === sel.matchSeq)
        
        if (!match || !match.result_code) {
          allFinished = false
          break
        }
        
        // 분석과 결과 비교
        if (match.result_code !== sel.prediction) {
          allCorrect = false
        }
      }

      if (allFinished) {
        const newStatus = allCorrect ? 'won' : 'lost'
        const actualReturn = allCorrect ? Math.floor(slip.amount * slip.total_odds) : 0
        
        await supabase
          .from('proto_slips')
          .update({ 
            status: newStatus,
            actual_return: actualReturn
          })
          .eq('id', slip.id)
        
        console.log(`✅ 슬립 ${slip.id} → ${newStatus}`)
      }
    }
  } catch (error) {
    console.error('슬립 상태 업데이트 에러:', error)
  }
}
