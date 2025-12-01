import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: Request) {
  try {
    const { title, excerpt, content } = await request.json()

    if (!title && !excerpt && !content) {
      return NextResponse.json(
        { error: 'No content to translate' },
        { status: 400 }
      )
    }

    const prompt = `You are a professional football/soccer content translator. Translate the following Korean football analysis article to English.

IMPORTANT GUIDELINES:
1. Keep football terminology accurate:
   - 승리 = win, 무승부 = draw, 패배 = loss
   - 골 = goal, 어시스트 = assist
   - 점유율 = possession, 슈팅 = shots
   - 홈/원정 = home/away
   - 승점 = points
   - 순위 = standings/position
   
2. Translate team names to their official English names:
   - 맨체스터 시티 = Manchester City
   - 맨체스터 유나이티드 = Manchester United
   - 첼시 = Chelsea
   - 아스날/아스널 = Arsenal
   - 리버풀 = Liverpool
   - 토트넘 = Tottenham
   - 레알 마드리드 = Real Madrid
   - 바르셀로나 = Barcelona
   - 바이에른 뮌헨 = Bayern Munich
   - 파리 생제르맹 = Paris Saint-Germain (PSG)
   
3. Maintain the original markdown formatting (headers, lists, bold, etc.)

4. Keep the tone professional but engaging for football fans

5. DO NOT add any explanations - just provide the translation

---

KOREAN CONTENT TO TRANSLATE:

${title ? `TITLE: ${title}` : ''}
${excerpt ? `EXCERPT: ${excerpt}` : ''}
${content ? `CONTENT:\n${content}` : ''}

---

Respond ONLY with a valid JSON object (no markdown code blocks, no explanations):
{
  "title": "translated title here",
  "excerpt": "translated excerpt here", 
  "content": "translated content here"
}

Only include fields that were provided in the input.`

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const responseText = response.text()

    // Parse JSON response
    let translated
    try {
      // Clean up response if it has markdown code blocks
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      translated = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('Failed to parse translation response:', responseText)
      return NextResponse.json(
        { error: 'Failed to parse translation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: translated
    })

  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    )
  }
}