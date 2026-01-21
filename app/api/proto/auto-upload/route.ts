import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 관리자 시크릿 키
const ADMIN_SECRET = process.env.PROTO_ADMIN_SECRET || 'trendsoccer-proto-2026'

// 알려진 리그 (긴 것부터 매칭)
const KNOWN_LEAGUES = [
  'U23아컵', '남농EASL', 'KOVO남', 'KOVO여', '에레디비', 'EFL챔',
  '세리에A', '라리가', '분데스', '리그1',
  'UCL', 'UEL', 'EPL', 'PL',
  'WKBL', 'KBL', 'NBA',
]

// 승/패만 있는 리그 (무승부 없음)
const NO_DRAW_LEAGUES = ['WKBL', 'KBL', 'NBA', 'KOVO남', 'KOVO여', '남농EASL']

/**
 * 줄바꿈 형식 파싱 함수 (북마커용)
 * 모든 베팅 타입 지원: 승무패, 승⑤패, 핸디캡(H), 언더오버(U), 홀짝(SUM)
 */
function parseNewlineFormat(text: string, round: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  const matches: any[] = []
  const seenMatches = new Set<string>()
  const currentYear = new Date().getFullYear()

  // 경기번호(3자리 숫자)로 시작하는 인덱스 찾기
  const matchStartIndexes: number[] = []
  lines.forEach((line, idx) => {
    if (/^\d{3}$/.test(line)) {
      matchStartIndexes.push(idx)
    }
  })

  for (let i = 0; i < matchStartIndexes.length; i++) {
    const startIdx = matchStartIndexes[i]
    const endIdx = matchStartIndexes[i + 1] || lines.length
    const chunk = lines.slice(startIdx, endIdx)
    
    if (chunk.length < 8) continue

    try {
      const matchSeq = parseInt(chunk[0])
      
      // 날짜시간 파싱: 01.21(수) 19:00
      const dateMatch = chunk[1].match(/(\d{2})\.(\d{2})\(([월화수목금토일])\)\s*(\d{2}):(\d{2})/)
      if (!dateMatch) continue
      
      const [, month, day, dayOfWeek, hour, minute] = dateMatch
      const koreanDate = `${month}.${day}(${dayOfWeek})`
      const koreanTime = `${hour}:${minute}`
      const gameDate = `${currentYear}-${month}-${day}T${hour}:${minute}:00`
      
      // 리그 파싱
      const leagueLine = chunk[2]
      let league = ''
      for (const l of KNOWN_LEAGUES) {
        if (leagueLine === l || leagueLine.startsWith(l)) {
          league = l
          break
        }
      }
      if (!league) continue
      
      // 베팅 타입 확인
      let betType = '승무패'
      let handicapLine: string | null = null
      let totalLine: number | null = null
      let teamStartIdx = 3
      let hasColon = true  // 구분자 유무
      
      const possibleBetType = chunk[3]
      
      if (possibleBetType === '승⑤패') {
        betType = '승⑤패'
        teamStartIdx = 4
        hasColon = true
      } else if (possibleBetType.startsWith('H ')) {
        betType = '핸디캡'
        handicapLine = possibleBetType.replace('H ', '').trim()
        teamStartIdx = 4
        hasColon = true
      } else if (possibleBetType.startsWith('U ')) {
        betType = '언더오버'
        totalLine = parseFloat(possibleBetType.replace('U ', '').trim())
        teamStartIdx = 4
        hasColon = false  // 언더오버는 구분자 없음
      } else if (possibleBetType === 'SUM') {
        betType = '홀짝'
        teamStartIdx = 4
        hasColon = false  // 홀짝도 구분자 없음
      } else if (possibleBetType.startsWith('hH')) {
        betType = '전반핸디캡'
        handicapLine = possibleBetType.replace('hH', '').trim()
        teamStartIdx = 4
        hasColon = true
      } else if (possibleBetType.startsWith('hU')) {
        betType = '전반언오버'
        totalLine = parseFloat(possibleBetType.replace('hU', '').trim())
        teamStartIdx = 4
        hasColon = false
      } else if (possibleBetType.startsWith('h ')) {
        betType = '전반승무패'
        teamStartIdx = 4
        hasColon = true
      }
      
      let homeTeam = ''
      let awayTeam = ''
      let homeScore: number | null = null
      let awayScore: number | null = null
      let currentTotal: number | null = null
      let oddsStartIdx = 0
      
      if (hasColon) {
        // 구분자가 있는 형식: 홈팀 18 : 42 원정팀
        const homeLine = chunk[teamStartIdx] || ''
        const separator = chunk[teamStartIdx + 1] || ''
        const awayLine = chunk[teamStartIdx + 2] || ''
        
        if (separator !== ':') continue
        
        // 홈팀: "KT소닉붐 18" → team, score
        const homeMatch = homeLine.match(/^(.+?)\s+([\d.]+)$/)
        if (homeMatch) {
          homeTeam = homeMatch[1].trim()
          const scoreOrLine = parseFloat(homeMatch[2])
          if (betType === '승무패' || betType === '승⑤패' || betType === '전반승무패') {
            homeScore = Math.floor(scoreOrLine)
          }
        } else {
          homeTeam = homeLine.trim()
        }
        
        // 원정팀: "42 안양정관" → score, team
        const awayMatch = awayLine.match(/^([\d.]+)\s+(.+)$/)
        if (awayMatch) {
          const scoreOrLine = parseFloat(awayMatch[1])
          awayTeam = awayMatch[2].trim()
          if (betType === '승무패' || betType === '승⑤패' || betType === '전반승무패') {
            awayScore = Math.floor(scoreOrLine)
          }
        } else {
          awayTeam = awayLine.trim()
        }
        
        oddsStartIdx = teamStartIdx + 3
      } else {
        // 구분자가 없는 형식 (언더오버, 홀짝): 홈팀 \n 60 \n 원정팀
        const homeLine = chunk[teamStartIdx] || ''
        const totalOrScore = chunk[teamStartIdx + 1] || ''
        const awayLine = chunk[teamStartIdx + 2] || ''
        
        homeTeam = homeLine.trim()
        currentTotal = parseInt(totalOrScore) || null  // 현재 합계 점수
        awayTeam = awayLine.trim()
        
        oddsStartIdx = teamStartIdx + 3
      }
      
      if (!homeTeam || !awayTeam) continue
      
      // 배당률 추출
      let homeOddsStr = chunk[oddsStartIdx] || '-'
      let drawOddsStr = chunk[oddsStartIdx + 1] || '-'
      let awayOddsStr = chunk[oddsStartIdx + 2] || '-'
      
      // 화살표 제거
      homeOddsStr = homeOddsStr.replace(/[↑↓\s]/g, '')
      drawOddsStr = drawOddsStr.replace(/[↑↓\s]/g, '')
      awayOddsStr = awayOddsStr.replace(/[↑↓\s]/g, '')
      
      const homeOdds = homeOddsStr !== '-' ? parseFloat(homeOddsStr) : null
      const drawOdds = drawOddsStr !== '-' ? parseFloat(drawOddsStr) : null
      const awayOdds = awayOddsStr !== '-' ? parseFloat(awayOddsStr) : null
      
      // 상태 추출
      const statusIdx = oddsStartIdx + 3
      const status = chunk[statusIdx] || '경기전'
      
      // 중복 체크
      const matchKey = `${round}-${matchSeq}-${homeTeam}-${awayTeam}-${betType}`
      if (seenMatches.has(matchKey)) continue
      seenMatches.add(matchKey)
      
      matches.push({
        round,
        match_seq: matchSeq,
        game_date: gameDate,
        korean_date: koreanDate,
        korean_time: koreanTime,
        home_team: homeTeam,
        away_team: awayTeam,
        league_name: league,
        match_type: betType,
        handicap_line: handicapLine,
        total_line: totalLine,
        home_odds: homeOdds,
        draw_odds: drawOdds,
        away_odds: awayOdds,
        home_score: homeScore,
        away_score: awayScore,
        current_total: currentTotal,
        status: status,
        result_code: null,
      })
    } catch (e) {
      console.error(`Parsing error at index ${startIdx}:`, e)
      continue
    }
  }
  
  return matches
}

/**
 * 기존 한줄 형식 파싱 함수 (레거시 호환)
 */
function parseOneLineFormat(text: string, round: string) {
  const lines = text.split('\n')
  const matches: any[] = []
  const seenMatches = new Set<string>()
  const currentYear = new Date().getFullYear()
  
  const skipTypes = ['승⑤패', 'H ', 'U ', 'SUM', 'hH', 'hU', 'h ']
  const resultTexts = ['홈승', '홈패', '무승부', '경기전', '오버', '언더', '핸디승', '핸디패', '홀', '짝']

  for (const line of lines) {
    const trimmed = line.trim()
    if (!/^\d{3}/.test(trimmed)) continue
    if (skipTypes.some(type => trimmed.includes(type))) continue

    const baseMatch = trimmed.match(/^(\d{3})(\d{2}\.\d{2})\(([월화수목금토일])\)\s*(\d{2}:\d{2})(.+)/)
    if (!baseMatch) continue

    const [, seq, date, dayOfWeek, time, rest] = baseMatch
    
    let league = ''
    let afterLeague = rest
    for (const l of KNOWN_LEAGUES) {
      if (rest.startsWith(l)) {
        league = l
        afterLeague = rest.slice(l.length)
        break
      }
    }
    
    if (!league) continue
    
    let cleanedStr = afterLeague
    for (const result of resultTexts) {
      cleanedStr = cleanedStr.replace(result, '')
    }
    
    cleanedStr = cleanedStr.replace(/[↑↓]/g, '')
    cleanedStr = cleanedStr.replace(/\s+\d+[:]\d+\s+/g, ' ')
    
    const oddsRegex = /(\d{1,2}\.\d{2})/g
    const oddsMatches = cleanedStr.match(oddsRegex) || []
    
    cleanedStr = cleanedStr.replace(oddsRegex, '')
    cleanedStr = cleanedStr.replace(/-/g, '')
    cleanedStr = cleanedStr.trim()
    
    let homeTeam = ''
    let awayTeam = ''
    
    if (cleanedStr.includes(':')) {
      const parts = cleanedStr.split(':')
      homeTeam = parts[0].trim()
      awayTeam = parts[1]?.trim() || ''
    } else {
      const words = cleanedStr.trim().split(/\s+/).filter(w => w)
      if (words.length === 2) {
        homeTeam = words[0]
        awayTeam = words[1]
      } else if (words.length >= 2) {
        const mid = Math.floor(words.length / 2)
        homeTeam = words.slice(0, mid).join(' ')
        awayTeam = words.slice(mid).join(' ')
      }
    }
    
    homeTeam = homeTeam.trim()
    awayTeam = awayTeam.trim()
    
    if (!homeTeam || !awayTeam) continue
    
    const matchKey = `${homeTeam}-${awayTeam}`
    if (seenMatches.has(matchKey)) continue
    seenMatches.add(matchKey)
    
    let homeOdds: number | null = null
    let drawOdds: number | null = null
    let awayOdds: number | null = null
    
    const isNoDraw = NO_DRAW_LEAGUES.some(l => league.includes(l))
    
    if (isNoDraw) {
      if (oddsMatches.length >= 2) {
        homeOdds = parseFloat(oddsMatches[0])
        awayOdds = parseFloat(oddsMatches[1])
      } else if (oddsMatches.length === 1) {
        homeOdds = parseFloat(oddsMatches[0])
      }
    } else {
      if (oddsMatches.length >= 3) {
        homeOdds = parseFloat(oddsMatches[0])
        drawOdds = parseFloat(oddsMatches[1])
        awayOdds = parseFloat(oddsMatches[2])
      } else if (oddsMatches.length === 2) {
        homeOdds = parseFloat(oddsMatches[0])
        awayOdds = parseFloat(oddsMatches[1])
      }
    }

    matches.push({
      round,
      match_seq: parseInt(seq),
      game_date: `${currentYear}-${date.replace('.', '-')}T${time}:00`,
      korean_date: `${date}(${dayOfWeek})`,
      korean_time: time,
      home_team: homeTeam,
      away_team: awayTeam,
      league_name: league,
      match_type: '승무패',
      home_odds: homeOdds,
      draw_odds: drawOdds,
      away_odds: awayOdds,
      result_code: null,
    })
  }
  return matches
}

/**
 * 데이터 형식 자동 감지 및 파싱
 */
function parseWisetotoText(text: string, round: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  const firstLine = lines[0] || ''
  
  // 첫 번째 줄이 3자리 숫자만 있으면 줄바꿈 형식 (북마커)
  if (/^\d{3}$/.test(firstLine)) {
    console.log('📋 Detected: Newline format (bookmarklet)')
    return parseNewlineFormat(text, round)
  } 
  // 첫 번째 줄이 3자리 숫자로 시작하고 더 긴 문자열이면 한줄 형식 (레거시)
  else if (/^\d{3}/.test(firstLine)) {
    console.log('📋 Detected: One-line format (legacy)')
    return parseOneLineFormat(text, round)
  }
  // 첫줄이 "정렬" 같은 헤더일 수 있음 - 다음줄 확인
  else if (lines.length > 1 && /^\d{3}$/.test(lines[1])) {
    console.log('📋 Detected: Newline format with header')
    return parseNewlineFormat(text, round)
  }
  
  return []
}

// POST - WiseToto 텍스트 자동 업로드
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rawText, round, secret, betTypeFilter } = body

    // 인증 체크
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      )
    }

    if (!rawText || !round) {
      return NextResponse.json(
        { success: false, error: 'Missing rawText or round' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // 텍스트 파싱
    let matches = parseWisetotoText(rawText, round)
    
    // 베팅 타입 필터 (옵션): 'all', '승무패', '핸디캡', '언더오버', '홀짝' 등
    if (betTypeFilter && betTypeFilter !== 'all') {
      matches = matches.filter(m => m.match_type === betTypeFilter)
    }
    
    if (matches.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No matches found in text' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // 기존 해당 회차 데이터 삭제 후 새로 입력
    const { error: deleteError } = await supabase
      .from('proto_matches')
      .delete()
      .eq('round', round)

    if (deleteError) {
      console.error('Delete error:', deleteError)
    }

    // 새 데이터 입력
    const { data, error } = await supabase
      .from('proto_matches')
      .insert(matches)
      .select()

    if (error) {
      console.error('Insert error:', error)
      throw error
    }

    // 통계 계산
    const soccerLeagues = ['UCL', 'UEL', 'EPL', 'EFL챔', '세리에A', '라리가', '분데스', '리그1', 'U23아컵', '에레디비']
    const basketLeagues = ['KBL', 'WKBL', 'NBA', 'EASL', '남농']
    
    const stats = {
      total: matches.length,
      bySport: {
        soccer: matches.filter(m => soccerLeagues.some(l => m.league_name.includes(l))).length,
        basket: matches.filter(m => basketLeagues.some(l => m.league_name.includes(l))).length,
        volley: matches.filter(m => m.league_name.includes('KOVO')).length,
      },
      byBetType: matches.reduce((acc, m) => {
        acc[m.match_type] = (acc[m.match_type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byLeague: matches.reduce((acc, m) => {
        acc[m.league_name] = (acc[m.league_name] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    }

    return NextResponse.json({ 
      success: true, 
      message: `${round}회차 ${matches.length}건 업로드 완료`,
      data: {
        round,
        ...stats,
      }
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  } catch (error) {
    console.error('Proto auto-upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload matches' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  }
}

// GET - 상태 확인 및 회차 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const round = searchParams.get('round')
  
  // 회차 목록 조회
  if (action === 'rounds') {
    const { data, error } = await supabase
      .from('proto_matches')
      .select('round')
      .order('round', { ascending: false })
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message })
    }
    
    const uniqueRounds = [...new Set(data?.map(d => d.round) || [])]
    return NextResponse.json({ 
      success: true, 
      rounds: uniqueRounds,
      count: uniqueRounds.length
    })
  }
  
  // 특정 회차 조회
  if (round) {
    const { data, error } = await supabase
      .from('proto_matches')
      .select('*')
      .eq('round', round)
      .order('match_seq', { ascending: true })
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message })
    }
    
    return NextResponse.json({ 
      success: true, 
      round,
      count: data?.length || 0,
      matches: data 
    })
  }
  
  return NextResponse.json({ 
    success: true, 
    message: 'Proto auto-upload API v2.0',
    endpoints: {
      'POST /': '{ rawText, round, secret, betTypeFilter? }',
      'GET /?action=rounds': 'List all rounds',
      'GET /?round=XXX': 'Get matches for specific round'
    },
    supportedBetTypes: ['승무패', '승⑤패', '핸디캡', '언더오버', '홀짝', '전반핸디캡', '전반언오버', '전반승무패']
  })
}

// OPTIONS - CORS preflight
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