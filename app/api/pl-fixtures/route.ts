// app/api/pl-fixtures/route.ts
// 내부 분석 툴(KSM PL)용 프리미어리그 다가오는 경기 일정 프록시
// API-Football 키를 서버에 숨기고, 브라우저(HTML 툴)에서 CORS로 호출 가능하게 함
// GET /api/pl-fixtures?next=20  또는  ?days=14

import { NextRequest, NextResponse } from 'next/server'

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!
const API_FOOTBALL_HOST = 'v3.football.api-sports.io'
const PL_LEAGUE_ID = 39

// 1시간 캐시 (일정은 자주 안 바뀜, API 절약)
export const revalidate = 3600

// 유럽 크로스 시즌 자동 계산 (8월 이후면 당해 연도)
function currentSeason(): number {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  return m >= 8 ? y : y - 1
}

async function af(endpoint: string) {
  const res = await fetch(`https://${API_FOOTBALL_HOST}${endpoint}`, {
    headers: {
      'x-rapidapi-key': API_FOOTBALL_KEY,
      'x-rapidapi-host': API_FOOTBALL_HOST,
    },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`API-Football ${res.status}`)
  return res.json()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const next = searchParams.get('next')
    const days = searchParams.get('days')
    const season = currentSeason()

    let endpoint = `/fixtures?league=${PL_LEAGUE_ID}&season=${season}`
    if (days) {
      const from = new Date().toISOString().split('T')[0]
      const to = new Date(Date.now() + parseInt(days) * 864e5).toISOString().split('T')[0]
      endpoint += `&from=${from}&to=${to}&status=NS-TBD-1H-HT-2H-ET-P-LIVE`
    } else {
      endpoint += `&next=${next ? parseInt(next) : 20}`
    }

    const data = await af(endpoint)
    const fixtures = (data.response || []).map((f: any) => ({
      match_id: f.fixture.id,
      date: f.fixture.date,
      status: f.fixture.status?.short,
      round: f.league?.round,
      home_id: f.teams.home.id,
      home: f.teams.home.name,
      home_logo: f.teams.home.logo,
      away_id: f.teams.away.id,
      away: f.teams.away.name,
      away_logo: f.teams.away.logo,
      venue: f.fixture.venue?.name || null,
    }))

    return NextResponse.json({
      success: true,
      season,
      count: fixtures.length,
      fixtures,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
