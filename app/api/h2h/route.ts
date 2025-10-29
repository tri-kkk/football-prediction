import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { match } = await request.json()

    if (!match) {
      return NextResponse.json(
        { error: '경기 정보가 필요합니다' },
        { status: 400 }
      )
    }

    // Claude API를 사용한 H2H 분석
    const prompt = `다음 축구 경기의 상대전적(Head-to-Head) 분석을 제공해주세요:

경기 정보:
- 리그: ${match.league}
- 홈팀: ${match.homeTeam}
- 원정팀: ${match.awayTeam}

다음 형식으로 작성해주세요 (각 섹션을 ## 제목으로 시작):

## 최근 5경기 상대전적
최근 5번의 맞대결 결과 요약

## 홈/원정 경기 비교
홈 경기와 원정 경기에서의 성적 차이

## 득점/실점 패턴
양 팀의 득실점 패턴 및 경향

## 역대 주요 경기
기억에 남는 주요 경기 하이라이트

## 통계적 우위 팀
데이터 기반 우세 팀 분석

## 이번 경기 예상
이번 경기에 대한 전망 및 주요 포인트

각 섹션은 2-3문장으로 간결하게 작성하고, 구체적인 데이터 중심의 분석을 제공해주세요.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
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
      console.error('Claude API 오류:', errorText)
      throw new Error(`Claude API 오류: ${response.status}`)
    }

    const data = await response.json()
    const h2h = data.content[0].text

    return NextResponse.json({ h2h })

  } catch (error: any) {
    console.error('H2H API 오류:', error)
    return NextResponse.json(
      { 
        error: 'H2H 분석을 생성하는데 실패했습니다',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
