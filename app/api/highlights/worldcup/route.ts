// 🔥 월드컵 하이라이트 — ScoreBat v3 피드에서 FIFA World Cup만 필터링
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SCOREBAT_TOKEN =
  process.env.SCOREBAT_API_TOKEN ||
  'MjU4NjkzXzE3NjQ3MzQ4MTRfN2FhODNjNmIxM2MxZDhiOWU3MDYzZTI3MzdjZThlZDJlZDEwYmNhMw=='

// 월드컵 대회명 매칭 (본선/예선 모두)
const WC_RE = /world cup|fifa|월드컵|w\.?\s?cup/i

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const debug = searchParams.get('debug') === '1'
  const limit = parseInt(searchParams.get('limit') || '12', 10)

  try {
    const res = await fetch(`https://www.scorebat.com/video-api/v3/feed/?token=${SCOREBAT_TOKEN}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 900 }, // 15분 캐시
    })
    if (!res.ok) throw new Error(`ScoreBat ${res.status}`)

    const data = await res.json()
    const all: any[] = data?.response || []

    if (debug) {
      const competitions = Array.from(new Set(all.map((x) => x?.competition).filter(Boolean)))
      return NextResponse.json({ success: true, total: all.length, competitions })
    }

    const highlights = all
      .filter((x) => WC_RE.test(x?.competition || ''))
      .slice(0, limit)
      .map((x) => ({
        title: x?.title || '',
        competition: x?.competition || 'FIFA World Cup',
        thumbnail: x?.thumbnail || '',
        matchviewUrl: x?.matchviewUrl || x?.url || '',
        date: x?.date || '',
        embed: x?.videos?.[0]?.embed || null,
      }))

    return NextResponse.json({ success: true, highlights, total: highlights.length })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: String(error?.message || error), highlights: [], total: 0 },
      { status: 200 },
    )
  }
}
