import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { match } = await request.json()

    // 경기 데이터 준비
    const homeWin = parseFloat(match.homeWinRate)
    const draw = parseFloat(match.drawRate)
    const awayWin = parseFloat(match.awayWinRate)
    
    // Claude에게 전달할 프롬프트
    const prompt = `당신은 축구 경기 분석 전문가입니다. 다음 경기 데이터를 바탕으로 간결하고 통찰력 있는 한 줄 논평을 작성해주세요.

경기 정보:
- 홈팀: ${match.homeTeam}
- 원정팀: ${match.awayTeam}
- 리그: ${match.competition || '알 수 없음'}
- 경기 시간: ${match.utcDate || '알 수 없음'}

승률 데이터:
- 홈 승: ${Math.round(homeWin)}%
- 무승부: ${Math.round(draw)}%
- 원정 승: ${Math.round(awayWin)}%

요구사항:
1. 50자 이내의 간결한 한 줄로 작성
2. 승률 데이터를 기반으로 분석
3. 자연스럽고 흥미로운 표현 사용
4. 팀 이름을 포함해서 작성
5. 확률 수치를 직접 언급하지 말고 "우세", "박빙", "접전" 등의 표현 사용

논평:`

    // Claude API 호출
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // 응답 추출
    const commentary = message.content[0].type === 'text' 
      ? message.content[0].text.trim()
      : '경기 분석 중입니다.'

    return NextResponse.json({
      success: true,
      commentary,
      metadata: {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        probabilities: {
          home: Math.round(homeWin),
          draw: Math.round(draw),
          away: Math.round(awayWin)
        }
      }
    })

  } catch (error) {
    console.error('Claude AI 논평 생성 오류:', error)
    
    // 폴백: 기본 논평 제공
    // match는 이미 try 블록에서 선언되었으므로 재사용할 수 없음
    // 기본 논평만 반환
    return NextResponse.json({
      success: true,
      commentary: '경기 분석을 준비 중입니다.',
      fallback: true
    })
  }
}