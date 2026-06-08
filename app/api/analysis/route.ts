import { NextRequest, NextResponse } from 'next/server'

// Claude AI 매치 분석 (마크다운 응답).
// body.language === 'en' 이면 영문 prompt + 영문 응답. 기본은 'ko'.

function buildPrompt(match: any, lang: 'ko' | 'en'): string {
  if (lang === 'en') {
    return `Provide a professional analysis of the following football match:

Match info:
- League: ${match.league}
- Home team: ${match.homeTeam}
- Away team: ${match.awayTeam}
- Date: ${match.date}
- Time: ${match.time}

Use the following format (start each section with a ## heading) and respond in English:

## 1. Squad Strength Comparison
Compare current strength of home and away sides.

## 2. Recent Form
Analyse last 5 matches and recent performance.

## 3. Key Player Status
Condition and injury status of important players.

## 4. Tactical Matchup
Tactical styles of both teams and how they match up.

## 5. Predicted Outcome
- Home win: XX%
- Draw: XX%
- Away win: XX%

## 6. Key Betting Points
Important factors to consider when betting.

Keep each section concise (2-3 sentences). Stay professional and objective.`
  }

  return `다음 축구 경기에 대한 전문적인 분석을 제공해주세요:

경기 정보:
- 리그: ${match.league}
- 홈팀: ${match.homeTeam}
- 원정팀: ${match.awayTeam}
- 날짜: ${match.date}
- 시간: ${match.time}

다음 형식으로 작성해주세요 (각 섹션을 ## 제목으로 시작):

## 1. 팀 전력 비교
홈팀과 원정팀의 현재 전력을 비교 분석

## 2. 최근 폼 분석
최근 5경기 성적 및 경기력 분석

## 3. 핵심 선수 상태
주요 선수들의 컨디션 및 부상 여부

## 4. 전술적 맞대결
양 팀의 전술 스타일과 맞대결 양상

## 5. 예상 승부 결과
- 홈 승: XX%
- 무승부: XX%
- 원정 승: XX%

## 6. 주요 베팅 포인트
베팅 시 고려할 핵심 요소들

각 섹션은 2-3문장으로 간결하게 작성하고, 전문적이고 객관적인 분석을 제공해주세요.`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { match, language } = body || {}
    const lang: 'ko' | 'en' = language === 'en' ? 'en' : 'ko'

    if (!match) {
      return NextResponse.json(
        { error: lang === 'en' ? 'Match info is required' : '경기 정보가 필요합니다' },
        { status: 400 }
      )
    }

    // API 키 확인
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY가 설정되지 않았습니다')
      return NextResponse.json(
        { error: lang === 'en'
          ? 'API key not configured. Check .env.local'
          : 'API 키가 설정되지 않았습니다. .env.local 파일을 확인해주세요.' },
        { status: 500 }
      )
    }

    const prompt = buildPrompt(match, lang)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Claude API 오류 응답:', errorText)

      if (response.status === 401) {
        return NextResponse.json(
          { error: lang === 'en'
            ? 'Invalid API key. Issue a new one from Anthropic console.'
            : 'API 키가 유효하지 않습니다. Anthropic 콘솔에서 새 키를 발급받아주세요.' },
          { status: 401 }
        )
      }

      throw new Error(`Claude API 오류: ${response.status}`)
    }

    const data = await response.json()
    const analysis = data.content[0].text

    return NextResponse.json({ analysis, language: lang })

  } catch (error: any) {
    console.error('분석 API 오류:', error)
    return NextResponse.json(
      {
        error: '분석을 생성하는데 실패했습니다',
        details: error.message
      },
      { status: 500 }
    )
  }
}
