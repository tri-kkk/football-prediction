// app/api/baseball/lineups/route.ts
// KBO/NPB/CPBL 선발 투수 조회 (API-Sports /games/lineups)
// 사용처: 야구 디테일 페이지 선발 투수 섹션

import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.API_FOOTBALL_KEY!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('gameId')

  if (!gameId) {
    return NextResponse.json({ success: false, error: 'gameId required' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://v1.baseball.api-sports.io/games/lineups?game=${gameId}`,
      {
        headers: {
          'x-apisports-key': API_KEY,
        },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 1800 }, // 30분 캐시
      }
    )

    if (!res.ok) {
      console.error(`[baseball/lineups] API error: ${res.status}`)
      return NextResponse.json({ success: false, error: `API error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const lineups = data.response // 배열: [{team: {...}, startXI: [{player: {pos, name}}]}]

    if (!lineups || lineups.length === 0) {
      return NextResponse.json({ success: true, homePitcher: null, awayPitcher: null })
    }

    // 각 팀의 선발 라인업에서 투수(pos === 'P' 또는 position 첫 번째) 추출
    // API-Sports baseball lineups: startXI[0] = 선발투수 (야구는 투수가 첫 번째)
    function extractStartingPitcher(lineup: any): string | null {
      if (!lineup?.startXI || lineup.startXI.length === 0) return null
      // pos가 'P'인 선수 찾기
      const pitcher = lineup.startXI.find((p: any) => p.player?.pos === 'P')
      if (pitcher) return pitcher.player?.name ?? null
      // 없으면 첫 번째 선수 (야구는 선발투수가 첫 번째)
      return lineup.startXI[0]?.player?.name ?? null
    }

    // home/away 구분
    // lineups[0]: 첫 번째 팀, lineups[1]: 두 번째 팀
    // team.id 기준으로 홈/원정 구분은 어려우므로 순서대로 사용
    // 일반적으로 [0]=away, [1]=home (API-Sports 관례)
    const awayPitcher = lineups[0] ? extractStartingPitcher(lineups[0]) : null
    const homePitcher = lineups[1] ? extractStartingPitcher(lineups[1]) : null

    return NextResponse.json({
      success: true,
      homePitcher,
      awayPitcher,
      raw: process.env.NODE_ENV === 'development' ? lineups : undefined,
    })
  } catch (err: any) {
    console.error('[baseball/lineups] error:', err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
