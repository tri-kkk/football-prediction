// app/api/baseball/ai-comment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { match, language } = await request.json()

    if (!match || match.homeScore === null || match.awayScore === null) {
      return NextResponse.json({ success: false, error: '경기 데이터 없음' }, { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const commentCol = language === 'ko' ? 'ai_comment' : 'ai_comment_en'

    // ✅ DB에 저장된 코멘트 먼저 확인
    const { data: existing } = await supabase
      .from('baseball_matches')
      .select('ai_comment, ai_comment_en')
      .eq('api_match_id', match.id)
      .single()

    if (existing?.[commentCol]) {
      return NextResponse.json({ success: true, comment: existing[commentCol], cached: true })
    }

    const homeTeam = language === 'ko' ? (match.homeTeamKo || match.homeTeam) : match.homeTeam
    const awayTeam = language === 'ko' ? (match.awayTeamKo || match.awayTeam) : match.awayTeam
    const winner = match.homeScore > match.awayScore ? homeTeam : awayTeam
    const loser = match.homeScore > match.awayScore ? awayTeam : homeTeam
    const winScore = Math.max(match.homeScore, match.awayScore)
    const loseScore = Math.min(match.homeScore, match.awayScore)
    const scoreDiff = winScore - loseScore

    const isKo = language === 'ko'

    // 이닝 데이터 분석
    const innings = match.innings
    let inningAnalysis = ''
    if (innings?.home && innings?.away) {
      const homeInnings = innings.home
      const awayInnings = innings.away
      const events: string[] = []

      // 선취점 분석
      let firstScoreInning = ''
      let firstScoreTeam = ''
      for (let i = 1; i <= 9; i++) {
        const h = homeInnings[i] ?? null
        const a = awayInnings[i] ?? null
        if ((h !== null && h > 0) || (a !== null && a > 0)) {
          if (a > 0 && h === 0) { firstScoreTeam = awayTeam; firstScoreInning = `${i}회` }
          else if (h > 0 && a === 0) { firstScoreTeam = homeTeam; firstScoreInning = `${i}회` }
          else if (h > 0 && a > 0) { firstScoreTeam = '동시'; firstScoreInning = `${i}회` }
          break
        }
      }
      if (firstScoreTeam && firstScoreTeam !== '동시') events.push(`${firstScoreInning} ${firstScoreTeam} 선취점`)

      // 빅이닝 (3점 이상)
      for (let i = 1; i <= 9; i++) {
        const h = homeInnings[i] ?? 0
        const a = awayInnings[i] ?? 0
        if (h >= 3) events.push(`${i}회 ${homeTeam} ${h}점 빅이닝`)
        if (a >= 3) events.push(`${i}회 ${awayTeam} ${a}점 빅이닝`)
      }

      // 역전 감지
      let homeTotal = 0, awayTotal = 0
      let reversed = false
      let reverseInning = ''
      for (let i = 1; i <= 9; i++) {
        const prevHome = homeTotal, prevAway = awayTotal
        homeTotal += homeInnings[i] ?? 0
        awayTotal += awayInnings[i] ?? 0
        if (!reversed && prevHome > prevAway && homeTotal < awayTotal) {
          reversed = true; reverseInning = `${i}회`
        } else if (!reversed && prevAway > prevHome && awayTotal < homeTotal) {
          reversed = true; reverseInning = `${i}회`
        }
      }
      if (reversed) events.push(`${reverseInning} 역전`)

      // 후반 집중 득점 (7회 이후)
      const lateHome = [7,8,9].reduce((s, i) => s + (homeInnings[i] ?? 0), 0)
      const lateAway = [7,8,9].reduce((s, i) => s + (awayInnings[i] ?? 0), 0)
      if (lateHome >= 3) events.push(`후반 ${homeTeam} ${lateHome}점 집중`)
      if (lateAway >= 3) events.push(`후반 ${awayTeam} ${lateAway}점 집중`)

      if (events.length > 0) inningAnalysis = events.slice(0, 3).join(', ')
    }

    const prompt = isKo
      ? `야구 경기 결과를 경기 흐름을 반영해서 스포츠 뉴스 캐스터 톤으로 한 문장으로 써줘.

경기 정보:
- 리그: ${match.league}
- 원정팀: ${awayTeam} ${match.awayScore}점
- 홈팀: ${homeTeam} ${match.homeScore}점
- 승리팀: ${winner} (${winScore}-${loseScore})
- 점수 차: ${scoreDiff}점
${match.homePitcherKo || match.homePitcher ? `- 홈 선발: ${match.homePitcherKo || match.homePitcher}` : ''}
${match.awayPitcherKo || match.awayPitcher ? `- 원정 선발: ${match.awayPitcherKo || match.awayPitcher}` : ''}
${inningAnalysis ? `- 경기 흐름: ${inningAnalysis}` : ''}

스타일 가이드:
- 경기 흐름 데이터(빅이닝, 역전, 선취점 등)를 자연스럽게 녹여서
- 야구 용어만 사용 (선취점, 득점, 홈런 등 / 절대 "선제골" 같은 축구 용어 사용 금지)
- 매번 다른 표현 사용 (승리했습니다 말고 다양하게)
- 살짝 힘 빠진 캐스터 톤, 과하지 않게
- 이모지 없이 텍스트만
- 한 문장 (45자 이내)
- 코멘트만 출력`
      : `Write a one-sentence game recap like a slightly tired sports broadcaster, using the inning flow data.

Game info:
- League: ${match.league}
- Away: ${awayTeam} ${match.awayScore}
- Home: ${homeTeam} ${match.homeScore}
- Winner: ${winner} (${winScore}-${loseScore})
- Run diff: ${scoreDiff}
${match.homePitcher ? `- Home starter: ${match.homePitcher}` : ''}
${match.awayPitcher ? `- Away starter: ${match.awayPitcher}` : ''}
${inningAnalysis ? `- Game flow: ${inningAnalysis}` : ''}

Style:
- Weave the game flow naturally (big inning, comeback, late surge etc.)
- Vary sentence structure each time, avoid repeating "defeated"
- Flat broadcaster tone, not too hyped
- No emojis, plain text
- Under 20 words
- Output only the comment`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API 오류: ${response.status}`)
    }

    const data = await response.json()
    const comment = data.content?.[0]?.text?.trim() || ''

    // ✅ DB에 저장
    if (comment) {
      await supabase
        .from('baseball_matches')
        .update({ [commentCol]: comment })
        .eq('api_match_id', match.id)
    }

    return NextResponse.json({ success: true, comment, cached: false })

  } catch (error: any) {
    console.error('❌ AI 코멘트 오류:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}