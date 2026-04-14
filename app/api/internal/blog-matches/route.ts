// GET /api/internal/blog-matches
// Step 1: 블로그용 경기 목록 조회 API
// sport_type + target_date 기반으로 DB에서 경기 리스트 반환

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BLOG_SECRET = process.env.BLOG_API_SECRET || process.env.CRON_SECRET

export async function GET(req: NextRequest) {
  // 인증
  const auth = req.headers.get('authorization')
  if (!auth || auth !== `Bearer ${BLOG_SECRET}`) {
    return NextResponse.json(
      { success: false, data: null, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(req.url)
  const sportType = searchParams.get('sport_type')
  const targetDate = searchParams.get('target_date')

  if (!sportType || !['soccer', 'baseball'].includes(sportType)) {
    return NextResponse.json(
      { success: false, data: null, error: 'sport_type is required: "soccer" or "baseball"' },
      { status: 400 }
    )
  }

  // target_date 미입력 시 내일 날짜
  const date = targetDate || getTomorrowKST()

  try {
    if (sportType === 'soccer') {
      return await getSoccerMatches(date)
    } else {
      return await getBaseballMatches(date)
    }
  } catch (err: any) {
    console.error('[blog-matches] Error:', err)
    return NextResponse.json(
      { success: false, data: null, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── 축구 경기 목록 ───
async function getSoccerMatches(date: string) {
  // match_odds_latest 테이블에서 해당 날짜의 예정 경기 조회
  // commence_time 기반으로 날짜 필터링
  const startOfDay = `${date}T00:00:00Z`
  const endOfDay = `${date}T23:59:59Z`

  const { data, error } = await supabase
    .from('match_odds_latest')
    .select('match_id, home_team, away_team, league_code, home_odds, draw_odds, away_odds, home_probability, draw_probability, away_probability, status, commence_time')
    .gte('commence_time', startOfDay)
    .lte('commence_time', endOfDay)
    .order('commence_time', { ascending: true })

  if (error) throw new Error(`Soccer query failed: ${error.message}`)

  const matches = (data || []).map(m => ({
    match_id: String(m.match_id),
    match_name: `${m.home_team} vs ${m.away_team}`,
    match_time: formatTimeKST(m.commence_time),
    league: m.league_code || '',
  }))

  return NextResponse.json({ success: true, data: matches, error: null })
}

// ─── 야구 경기 목록 ───
async function getBaseballMatches(date: string) {
  const { data, error } = await supabase
    .from('baseball_matches')
    .select('id, api_match_id, home_team, away_team, home_team_ko, away_team_ko, league, match_date, match_time, status')
    .eq('match_date', date)
    .not('status', 'in', '("POST","CANC","PST")')
    .order('match_time', { ascending: true })

  if (error) throw new Error(`Baseball query failed: ${error.message}`)

  const matches = (data || []).map(m => ({
    match_id: String(m.api_match_id || m.id),
    match_name: `${m.home_team_ko || m.home_team} vs ${m.away_team_ko || m.away_team}`,
    match_time: m.match_time || '',
    league: m.league || '',
  }))

  return NextResponse.json({ success: true, data: matches, error: null })
}

// ─── 유틸 ───
function getTomorrowKST(): string {
  const now = new Date()
  now.setHours(now.getHours() + 9) // UTC → KST
  now.setDate(now.getDate() + 1)
  return now.toISOString().split('T')[0]
}

function formatTimeKST(isoStr: string | null): string {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
    return `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`
  } catch {
    return ''
  }
}
