import { NextRequest, NextResponse } from 'next/server'

// =====================================================
// 임시 테스트용 route
// GET /api/baseball/test-live
// 브라우저에서 바로 확인 가능
// 확인 후 삭제하세요
// =====================================================

export async function GET(request: NextRequest) {
  const apiKey = process.env.API_FOOTBALL_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY 없음' }, { status: 500 })
  }

  try {
    // 오늘 경기 + 특정 게임 상세 테스트
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const today = kst.toISOString().split('T')[0]

    // 라이브 경기 중 하나 상세 조회 (180392 = Dodgers vs Reds)
    const res = await fetch(
      `https://v1.baseball.api-sports.io/games?id=180392`,
      { headers: { 'x-apisports-key': apiKey } }
    )

    const data = await res.json()

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      data,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}