import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ADMIN_SECRET = process.env.PROTO_ADMIN_SECRET || 'trendsoccer-proto-2026'

// 알려진 리그 (긴 것부터 매칭)
const KNOWN_LEAGUES = [
  'U23아컵', '남농EASL', 'KOVO남', 'KOVO여', '에레디비', 'EFL챔',
  '세리에A', '라리가', '분데스', '리그1',
  'UCL', 'UEL', 'EPL', 'PL',
  'WKBL', 'KBL', 'NBA',
]

// 승/패만 있는 리그
const NO_DRAW_LEAGUES = ['WKBL', 'KBL', 'NBA', 'KOVO남', 'KOVO여', '남농EASL']

/**
 * 한 줄 형식 파싱 (메인)
 * 00101.21(수) 19:00KBLKT소닉붐 47:65 안양정관1.80-1.684쿼터
 */
function parseOneLineFormat(text: string, round: string) {
  const lines = text.split('\n')
  const matches: any[] = []
  const seenMatches = new Set<string>()
  const currentYear = new Date().getFullYear()
  
  // 스킵할 베팅 타입
  const skipTypes = ['승⑤패', '승③패', '승④패', 'H ', 'U ', 'SUM', 'hH', 'hU', 'h ']
  const resultTexts = ['홈승', '홈패', '무승부', '경기전', '오버', '언더', '핸디승', '핸디패', '홀', '짝', '1쿼터', '2쿼터', '3쿼터', '4쿼터', '하프타임', '1세트', '2세트', '3세트', '4세트', '5세트', '전반', '후반', '연장']

  for (const line of lines) {
    const trimmed = line.trim()
    
    // 3자리숫자 + 날짜로 시작하는지 확인
    if (!/^\d{3}\d{2}\.\d{2}/.test(trimmed)) continue
    
    // 스킵할 타입 체크
    if (skipTypes.some(type => trimmed.includes(type))) continue

    // 기본 패턴: 번호 + 날짜 + 시간
    const baseMatch = trimmed.match(/^(\d{3})(\d{2}\.\d{2})\(([월화수목금토일])\)\s*(\d{2}:\d{2})(.+)/)
    if (!baseMatch) continue

    const [, seq, date, dayOfWeek, time, rest] = baseMatch
    
    // 리그 찾기
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
    
    // 결과/상태 텍스트 제거
    let cleanedStr = afterLeague
    for (const result of resultTexts) {
      cleanedStr = cleanedStr.replace(new RegExp(result + '$'), '')
    }
    
    // 화살표 제거
    cleanedStr = cleanedStr.replace(/[↑↓]/g, '')
    
    // 스코어 제거 (47:65 형태)
    cleanedStr = cleanedStr.replace(/\s+\d+:\d+\s+/g, ' ')
    
    // 배당률 추출 (X.XX 형태)
    const oddsRegex = /(\d{1,2}\.\d{2})/g
    const oddsMatches = cleanedStr.match(oddsRegex) || []
    
    // 배당률과 - 기호 제거
    cleanedStr = cleanedStr.replace(oddsRegex, ' ')
    cleanedStr = cleanedStr.replace(/-/g, ' ')
    cleanedStr = cleanedStr.replace(/\s+/g, ' ').trim()
    
    // 팀 분리
    let homeTeam = ''
    let awayTeam = ''
    
    // 공백으로 분리된 단어들
    const words = cleanedStr.split(' ').filter(w => w && !/^\d+$/.test(w))
    
    if (words.length >= 2) {
      // 단어가 2개 이상이면 절반씩 나누기
      if (words.length === 2) {
        homeTeam = words[0]
        awayTeam = words[1]
      } else {
        // 중간 지점 찾기
        const mid = Math.ceil(words.length / 2)
        homeTeam = words.slice(0, mid).join(' ')
        awayTeam = words.slice(mid).join(' ')
      }
    } else if (words.length === 1) {
      // 한 단어면 한글 기준으로 분리 시도
      const word = words[0]
      // 숫자 제거하고 팀명만
      const teamPart = word.replace(/\d+/g, '')
      const halfLen = Math.ceil(teamPart.length / 2)
      homeTeam = teamPart.slice(0, halfLen)
      awayTeam = teamPart.slice(halfLen)
    }
    
    homeTeam = homeTeam.trim()
    awayTeam = awayTeam.trim()
    
    if (!homeTeam || !awayTeam) continue
    
    // 중복 체크
    const matchKey = `${homeTeam}-${awayTeam}`
    if (seenMatches.has(matchKey)) continue
    seenMatches.add(matchKey)
    
    // 배당률 할당
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
  
  // 3자리 숫자 + 날짜로 시작하는 줄이 있으면 한줄 형식
  const hasOneLineFormat = lines.some(l => /^\d{3}\d{2}\.\d{2}/.test(l))
  
  if (hasOneLineFormat) {
    console.log('📋 Detected: One-line format')
    return parseOneLineFormat(text, round)
  }
  
  console.log('📋 No valid format detected')
  return []
}

// POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rawText, round, secret } = body

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

    const matches = parseWisetotoText(rawText, round)
    
    if (matches.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No matches found in text' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // 기존 회차 삭제
    await supabase.from('proto_matches').delete().eq('round', round)

    // 새 데이터 입력
    const { error } = await supabase.from('proto_matches').insert(matches)

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to upload matches' },
        { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // 통계
    const soccerLeagues = ['UCL', 'UEL', 'EPL', 'EFL챔', '세리에A', '라리가', '분데스', '리그1', 'U23아컵', '에레디비']
    const basketLeagues = ['KBL', 'WKBL', 'NBA', 'EASL', '남농']
    
    const stats = {
      total: matches.length,
      bySport: {
        soccer: matches.filter(m => soccerLeagues.some(l => m.league_name.includes(l))).length,
        basket: matches.filter(m => basketLeagues.some(l => m.league_name.includes(l))).length,
        volley: matches.filter(m => m.league_name.includes('KOVO')).length,
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${round}회차 ${matches.length}경기 업로드 완료`,
      data: stats
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  }
}

// GET
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const round = searchParams.get('round')
  
  if (round) {
    const { data } = await supabase
      .from('proto_matches')
      .select('*')
      .eq('round', round)
      .order('match_seq')
    
    return NextResponse.json({ success: true, matches: data })
  }
  
  return NextResponse.json({ 
    success: true, 
    message: 'Proto auto-upload API v2.0',
    supportedBetTypes: ['승무패']
  })
}

// OPTIONS
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