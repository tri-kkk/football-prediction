// app/api/baseball/cron/sync-npb-pitcher-images/route.ts
// NPB 선발 투수 초상 이미지 수집 (Yahoo Japan)
//  · 일정 페이지 → 각 경기 gameId + 양팀
//  · 경기 페이지(/npb/game/{id}/top) → 선발 초상 URL 2개 (풀 URL 저장, 샤드 추측 X)
//  · baseball_matches.home_pitcher_image / away_pitcher_image 갱신
//
// 사용:
//   GET ?dryRun=1        → 저장 안 하고 추출 결과만 (검증용)
//   GET ?date=YYYY-MM-DD → 특정 날짜(JST/KST 동일)
//   GET                  → 오늘(KST) NPB 예정 경기 저장

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Yahoo 일본어 팀명 → 우리 영문 팀명에 들어있는 키워드
const JP_TO_EN: Record<string, string> = {
  巨人: 'Giants', 読売: 'Giants',
  阪神: 'Tigers',
  ヤクルト: 'Swallows',
  DeNA: 'DeNA', 横浜: 'DeNA',
  中日: 'Dragons',
  広島: 'Carp', 広島東洋: 'Carp',
  オリックス: 'Buffaloes',
  ロッテ: 'Marines', 千葉ロッテ: 'Marines',
  ソフトバンク: 'Hawks', 福岡ソフトバンク: 'Hawks',
  楽天: 'Eagles', 東北楽天: 'Eagles',
  西武: 'Lions', 埼玉西武: 'Lions',
  日本ハム: 'Fighters', 北海道日本ハム: 'Fighters',
}
const EN_KEYS = ['Giants', 'Tigers', 'Swallows', 'DeNA', 'Dragons', 'Carp', 'Buffaloes', 'Marines', 'Hawks', 'Eagles', 'Lions', 'Fighters']

function keyFromEnglish(name?: string | null): string | null {
  if (!name) return null
  for (const k of EN_KEYS) if (name.includes(k)) return k
  return null
}
function jpKey(text: string): string | null {
  for (const k of Object.keys(JP_TO_EN).sort((a, b) => b.length - a.length)) {
    if (text.includes(k)) return JP_TO_EN[k]
  }
  return null
}

async function fetchYahoo(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'ja', Referer: 'https://baseball.yahoo.co.jp/npb/' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// 일정 페이지 → [{ gameId, teams:[EN,EN] }]
function parseSchedule(html: string): Array<{ gameId: string; teams: string[] }> {
  const out: Array<{ gameId: string; teams: string[] }> = []
  const seen = new Set<string>()
  const re = /\/npb\/game\/(\d+)\//g
  let m
  while ((m = re.exec(html)) !== null) {
    const gameId = m[1]
    if (seen.has(gameId)) continue
    seen.add(gameId)
    const around = html.slice(Math.max(0, m.index - 700), m.index + 700).replace(/<[^>]+>/g, ' ')
    const keys: string[] = []
    for (const k of Object.keys(JP_TO_EN).sort((a, b) => b.length - a.length)) {
      if (around.includes(k)) {
        const en = JP_TO_EN[k]
        if (!keys.includes(en)) keys.push(en)
      }
    }
    if (keys.length >= 2) out.push({ gameId, teams: keys.slice(0, 2) })
  }
  return out
}

// 경기 페이지 → [{ url, team(EN|null) }] (초상 주변에서 팀 감지)
function parsePortraits(html: string): Array<{ url: string; team: string | null }> {
  const re = /https:\/\/[^"'\s)]*storage-yahoo[^"'\s)]*\/portrait\/\d+\/\d+\.jpg/g
  const out: Array<{ url: string; team: string | null }> = []
  const seen = new Set<string>()
  let m
  while ((m = re.exec(html)) !== null) {
    const url = m[0]
    if (seen.has(url)) continue
    seen.add(url)
    const win = html.slice(Math.max(0, m.index - 900), m.index + 250).replace(/<[^>]+>/g, ' ')
    out.push({ url, team: jpKey(win) })
    if (out.length >= 6) break
  }
  return out
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dryRun') === '1'
  const kstToday = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
  const targetDate = url.searchParams.get('date') || kstToday

  // 1) 우리 DB의 NPB 예정 경기
  const { data: games, error } = await supabase
    .from('baseball_matches')
    .select('api_match_id, home_team, away_team, home_team_ko, away_team_ko, match_date, status')
    .eq('league', 'NPB')
    .in('status', ['NS', 'SCHEDULED', 'TBD'])
    .eq('match_date', targetDate)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  if (!games || games.length === 0) {
    return NextResponse.json({ success: true, date: targetDate, count: 0, message: 'no NPB games' })
  }

  // 2) Yahoo 일정 → gameId + 양팀
  const schedHtml = await fetchYahoo(`https://baseball.yahoo.co.jp/npb/schedule/?date=${targetDate}`)
  const sched = schedHtml ? parseSchedule(schedHtml) : []

  const results: any[] = []
  let updated = 0

  for (const g of games) {
    const homeKey = keyFromEnglish(g.home_team) || keyFromEnglish(g.home_team_ko)
    const awayKey = keyFromEnglish(g.away_team) || keyFromEnglish(g.away_team_ko)
    const yGame = sched.find((s) => homeKey && awayKey && s.teams.includes(homeKey) && s.teams.includes(awayKey))

    if (!yGame) {
      results.push({ game: `${g.away_team} @ ${g.home_team}`, homeKey, awayKey, matched: false })
      continue
    }

    const gameHtml = await fetchYahoo(`https://baseball.yahoo.co.jp/npb/game/${yGame.gameId}/top`)
    const portraits = gameHtml ? parsePortraits(gameHtml) : []

    // 팀 기반 배정 (초상 주변 팀 감지) → 실패 시 위치 폴백(away=0, home=1)
    let homeImg = portraits.find((p) => p.team === homeKey)?.url || null
    let awayImg = portraits.find((p) => p.team === awayKey)?.url || null
    let method = 'team'
    if (!homeImg || !awayImg) {
      const urls = portraits.map((p) => p.url)
      awayImg = awayImg || urls[0] || null
      homeImg = homeImg || urls.find((u) => u !== awayImg) || null
      method = 'positional'
    }

    if (!dryRun && homeImg && awayImg) {
      await supabase
        .from('baseball_matches')
        .update({ home_pitcher_image: homeImg, away_pitcher_image: awayImg })
        .eq('api_match_id', g.api_match_id)
      updated += 1
    }

    results.push({
      game: `${g.away_team} @ ${g.home_team}`,
      gameId: yGame.gameId,
      method,
      homeImg,
      awayImg,
      portraits: portraits.map((p) => ({ team: p.team, url: p.url })),
    })
  }

  return NextResponse.json({ success: true, date: targetDate, count: games.length, updated, dryRun, results })
}

export async function POST(request: NextRequest) {
  return GET(request)
}
