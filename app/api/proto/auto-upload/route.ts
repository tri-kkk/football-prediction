import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ADMIN_SECRET = process.env.PROTO_ADMIN_SECRET || 'trendsoccer-proto-2026'

const KNOWN_LEAGUES = [
  'U23아컵', '남농EASL', 'KOVO남', 'KOVO여', '에레디비', 'EFL챔',
  '세리에A', '라리가', '분데스', '리그1',
  'UCL', 'UEL', 'EPL', 'PL',
  'WKBL', 'KBL', 'NBA',
]

const NO_DRAW_LEAGUES = ['WKBL', 'KBL', 'NBA', 'KOVO남', 'KOVO여', '남농EASL']

/**
 * 줄바꿈 형식 파싱
 */
function parseNewlineFormat(text: string, round: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  const matches: any[] = []
  const seenMatches = new Set<string>()
  const currentYear = new Date().getFullYear()

  // 베팅 타입 매핑
  const betTypeMap: Record<string, string> = {
    '승⑤패': '승5패',
    '승③패': '승3패', 
    '승④패': '승4패',
    'H': '핸디캡',
    'U': '언오버',
    'SUM': '합계',
    'hH': '전반핸디',
    'hU': '전반언오버',
  }

  // 결과 코드 목록
  const resultCodes = [
    '홈승', '홈패', '무', '원정승', '원정패',
    '핸디승', '핸디패', '핸디무',
    '오버', '언더',
    '홀', '짝',
    '3세트', '4세트', '5세트',
    '적특', '적중특례', '발매취소'
  ]

  let i = 0
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
      i++
      continue
    }
    
    const [, month, day, dayOfWeek, hour, minute] = dateMatch
    
    // 리그 확인
    let league = ''
    for (const l of KNOWN_LEAGUES) {
      if (leagueLine === l) {
        league = l
        break
      }
    }
    if (!league) {
      i++
      continue
    }
    
    // 베팅 타입 확인 (3번 인덱스가 베팅타입인지 홈팀인지)
    let betType = '승무패'
    let teamStartIdx = i + 3
    let handicapValue: number | null = null
    let totalValue: number | null = null
    
    const possibleBetType = lines[i + 3]
    
    // 베팅 타입 감지
    for (const [key, value] of Object.entries(betTypeMap)) {
      if (possibleBetType.startsWith(key) || possibleBetType === key) {
        betType = value
        teamStartIdx = i + 4  // 베팅 타입이 있으면 팀 시작 인덱스 +1
        
        // 핸디캡/언오버 값 추출 (예: "H -3.5" → -3.5)
        const valueMatch = possibleBetType.match(/[-+]?\d+\.?\d*/)
        if (valueMatch) {
          if (betType.includes('핸디')) {
            handicapValue = parseFloat(valueMatch[0])
          } else if (betType.includes('언오버') || betType === '합계') {
            totalValue = parseFloat(valueMatch[0])
          }
        }
        break
      }
    }
    
    // 홈팀, 구분자, 원정팀
    const homeLine = lines[teamStartIdx]
    const separator = lines[teamStartIdx + 1]
    const awayLine = lines[teamStartIdx + 2]
    
    if (separator !== ':') {
      i++
      continue
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
    
    if (homeMatch) {
      homeTeam = homeMatch[1].trim()
      homeScore = parseInt(homeMatch[2])
    }
    if (awayMatch) {
      awayScore = parseInt(awayMatch[1])
      awayTeam = awayMatch[2].trim()
    }
    
    if (!homeTeam || !awayTeam) {
      i++
      continue
    }
    
    // 배당률
    const homeOddsStr = lines[teamStartIdx + 3]?.replace(/[↑↓\s]/g, '') || '-'
    const drawOddsStr = lines[teamStartIdx + 4]?.replace(/[↑↓\s]/g, '') || '-'
    const awayOddsStr = lines[teamStartIdx + 5]?.replace(/[↑↓\s]/g, '') || '-'
    
    const homeOdds = homeOddsStr !== '-' ? parseFloat(homeOddsStr) : null
    const drawOdds = drawOddsStr !== '-' ? parseFloat(drawOddsStr) : null
    const awayOdds = awayOddsStr !== '-' ? parseFloat(awayOddsStr) : null
    
    // 상태/결과 파싱
    const statusOrResult = lines[teamStartIdx + 6] || '경기전'
    
    // 결과인지 상태인지 판별
    let status = '경기전'
    let resultCode: string | null = null
    
    if (resultCodes.includes(statusOrResult)) {
      // 결과 코드면
      resultCode = statusOrResult
      status = '종료'
    } else {
      // 상태면 (경기전, 진행중, 하프타임 등)
      status = statusOrResult
    }
    
    // 중복 체크 (팀 + 베팅타입 조합)
    const matchKey = `${homeTeam}-${awayTeam}-${betType}`
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
  return parseNewlineFormat(text, round)
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

    const soccerLeagues = ['UCL', 'UEL', 'EPL', 'EFL챔', '세리에A', '라리가', '분데스', '리그1', 'U23아컵', '에레디비']
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