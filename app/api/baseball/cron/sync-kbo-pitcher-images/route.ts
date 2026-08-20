// app/api/baseball/cron/sync-kbo-pitcher-images/route.ts
// KBO 선발 투수 초상 이미지 수집 (네이버 스포츠 API)
//  · 일정 API → 그 날짜 KBO 경기 gameId
//  · 프리뷰 API(/schedule/games/{id}/preview) → 홈/원정 선발 pCode + 팀코드
//  · 이미지 URL = sports-phinf.pstatic.net/player/kbo/default/{pCode}.png → 우리 스토리지 저장
//  · baseball_matches.home_pitcher_image / away_pitcher_image 갱신
//
// 사용:
//   GET ?dryRun=1          → 저장 안 하고 추출 결과만 (검증용)
//   GET ?date=YYYY-MM-DD   → 특정 날짘(KST)
//   GET ?days=3            → 오늘부터 3일치 (선발 발표된 다가오는 경기 미리 채움)
//   GET                    → 오늘(KST) KBO 예정 경기

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

const NAVER_HEADERS = {
  'User-Agent': UA,
  Referer: 'https://m.sports.naver.com/',
  Accept: 'application/json, text/plain, */*',
}

// 네이버 KBO 팀코드 → 우리 영문 팀명에 들어있는 키워드
const NAVER_CODE_KEYWORDS: Record<string, string[]> = {
  HH: ['Hanwha'],
  HT: ['KIA', 'Kia'],
  LG: ['LG'],
  KT: ['KT'],
  OB: ['Doosan'],
  NC: ['NC'],
  SS: ['Samsung'],
  SK: ['SSG'],
  LT: ['Lotte'],
  WO: ['Kiwoom'],
}

// 우리 영문 팀명 → 네이버 코드
function englishToNaverCode(name?: string | null): string | null {
  if (!name) return null
  for (const [code, kws] of Object.entries(NAVER_CODE_KEYWORDS)) {
    if (kws.some((k) => name.includes(k))) return code
  }
  return null
}

const BUCKET = 'pitcher-images'
async function ensureBucket() {
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})
}

// 네이버 초상 → 우리 스토리지 공개 URL (실패 시 원본 URL)
async function storeImage(pCode: string): Promise<string | null> {
  const naverUrl = `https://sports-phinf.pstatic.net/player/kbo/default/${pCode}.png?type=w150`
  try {
    const res = await fetch(naverUrl, { headers: NAVER_HEADERS, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.byteLength < 500) return null // 빈/플레이스홀더 방지
    const path = `kbo/${pCode}.png`
    const up = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: 'image/png',
      upsert: true,
    })
    if (up.error) return naverUrl
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data?.publicUrl || naverUrl
  } catch {
    return null
  }
}

async function naverJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: NAVER_HEADERS, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const validCode = (v: any): string | null => {
  const s = String(v ?? '').trim()
  return /^\d+$/.test(s) && s !== '0' ? s : null
}

async function processDate(targetDate: string, dryRun: boolean) {
  // 1) 우리 DB의 KBO 예정 경기
  const { data: games, error } = await supabase
    .from('baseball_matches')
    .select('api_match_id, home_team, away_team, home_team_ko, away_team_ko, match_date, status')
    .eq('league', 'KBO')
    .in('status', ['NS', 'SCHEDULED', 'TBD'])
    .eq('match_date', targetDate)
  if (error) return { date: targetDate, error: error.message }
  if (!games || games.length === 0) return { date: targetDate, count: 0, updated: 0, results: [] }

  // 2) 네이버 일정 → gameId + 팀코드
  const sched = await naverJson(
    `https://api-gw.sports.naver.com/schedule/games?fields=basic&upperCategoryId=kbaseball&categoryId=kbo&fromDate=${targetDate}&toDate=${targetDate}`,
  )
  const naverGames: any[] = sched?.result?.games || []

  const results: any[] = []
  let updated = 0

  for (const g of games) {
    const ourHome = englishToNaverCode(g.home_team) || englishToNaverCode(g.home_team_ko)
    const ourAway = englishToNaverCode(g.away_team) || englishToNaverCode(g.away_team_ko)
    // 팀 조합(방향 무관)으로 네이버 경기 매칭
    const ng = naverGames.find((n) => {
      const set = new Set([n.homeTeamCode, n.awayTeamCode])
      return ourHome && ourAway && set.has(ourHome) && set.has(ourAway)
    })
    if (!ng) {
      results.push({ game: `${g.away_team} @ ${g.home_team}`, ourHome, ourAway, matched: false })
      continue
    }

    const pv = await naverJson(`https://api-gw.sports.naver.com/schedule/games/${ng.gameId}/preview`)
    const gi = pv?.result?.previewData?.gameInfo
    if (!gi) {
      results.push({ game: `${g.away_team} @ ${g.home_team}`, gameId: ng.gameId, matched: true, preview: false })
      continue
    }

    // 네이버 홈/원정 선발 코드 (gameInfo 우선, starter/lineup 폴백)
    const naverHomeCode = gi.hCode
    const hP =
      validCode(gi.hPCode) ||
      validCode(pv?.result?.previewData?.homeStarter?.playerInfo?.pCode) ||
      validCode(pv?.result?.previewData?.homeTeamLineUp?.fullLineUp?.[0]?.playerCode)
    const aP =
      validCode(gi.aPCode) ||
      validCode(pv?.result?.previewData?.awayStarter?.playerInfo?.pCode) ||
      validCode(pv?.result?.previewData?.awayTeamLineUp?.fullLineUp?.[0]?.playerCode)

    // 네이버 홈이 우리 홈과 같으면 그대로, 아니면 스왑
    const sameOrientation = naverHomeCode === ourHome
    const ourHomePCode = sameOrientation ? hP : aP
    const ourAwayPCode = sameOrientation ? aP : hP

    let homeStored: string | null = null
    let awayStored: string | null = null
    if (!dryRun) {
      if (ourHomePCode) homeStored = await storeImage(ourHomePCode)
      if (ourAwayPCode) awayStored = await storeImage(ourAwayPCode)
      if (homeStored || awayStored) {
        const patch: Record<string, string> = {}
        if (homeStored) patch.home_pitcher_image = homeStored
        if (awayStored) patch.away_pitcher_image = awayStored
        await supabase.from('baseball_matches').update(patch).eq('api_match_id', g.api_match_id)
        updated += 1
      }
    }

    results.push({
      game: `${g.away_team} @ ${g.home_team}`,
      gameId: ng.gameId,
      ourHomePCode,
      ourAwayPCode,
      homeImg: dryRun
        ? ourHomePCode
          ? `https://sports-phinf.pstatic.net/player/kbo/default/${ourHomePCode}.png?type=w150`
          : null
        : homeStored,
      awayImg: dryRun
        ? ourAwayPCode
          ? `https://sports-phinf.pstatic.net/player/kbo/default/${ourAwayPCode}.png?type=w150`
          : null
        : awayStored,
    })
  }

  return { date: targetDate, count: games.length, updated, results }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dryRun') === '1'
  const days = Math.max(1, Math.min(7, parseInt(url.searchParams.get('days') || '1', 10) || 1))
  const kstToday = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
  const startDate = url.searchParams.get('date') || kstToday

  if (!dryRun) await ensureBucket()

  const days2 = url.searchParams.get('date') ? 1 : days // 특정 date 지정 시 그 하루만
  const dates: string[] = []
  for (let i = 0; i < days2; i++) {
    const d = new Date(startDate + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }

  const perDate = []
  let totalUpdated = 0
  for (const d of dates) {
    const r = await processDate(d, dryRun)
    if ((r as any).updated) totalUpdated += (r as any).updated
    perDate.push(r)
  }

  return NextResponse.json({ success: true, dryRun, totalUpdated, dates, perDate })
}
