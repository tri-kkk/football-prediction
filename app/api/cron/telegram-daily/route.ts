// app/api/cron/telegram-daily/route.ts
// 프리미엄 텔레그램 데일리 리포트 발송 (종목별)
//
// 스케줄 (Supabase Cron):
//   야구: 매일 KST 12:10  →  GET /api/cron/telegram-daily?sport=baseball&secret=<CRON_SECRET>
//   축구: 매일 KST 18:10  →  GET /api/cron/telegram-daily?sport=football&secret=<CRON_SECRET>
//
// 대상: 연동(active)된 프리미엄 유저 전원 (종목 선택 없음). 발송 시점 tier 재확인.
// 중복방지: last_football_on / last_baseball_on (오늘 이미 보냈으면 skip)
// 픽 없는 날: 발송 안 함 (빈 알림 방지)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '../../../lib/telegram'
import { TEAM_NAME_KR } from '../../../teamLogos'

// 축구 영문 팀명 → 한글 (매핑 없으면 원문 유지)
const teamKo = (n?: string) => (n && TEAM_NAME_KR[n]) || n || ''

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
const SITE = 'trendsoccer.com'

// ── 유틸 ───────────────────────────────────────────────────
function authed(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // 미설정 시 허용 (기존 크론 관행) — 설정 권장
  const url = new URL(request.url)
  return (
    url.searchParams.get('secret') === secret ||
    request.headers.get('x-internal-secret') === secret ||
    request.headers.get('authorization') === `Bearer ${secret}`
  )
}

const esc = (s: any) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function kstTodayStr(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
}
function kstDateLabel(): string {
  // 예: "8/16(토)"
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
    .format(new Date())
    .replace(/\.\s?/g, '/')
    .replace(/\/\(/, '(')
    .replace(/\/$/, '')
}

// ── 축구 리포트 ────────────────────────────────────────────
async function buildFootball(): Promise<string | null> {
  const [picksRes, accRes] = await Promise.all([
    fetch(`${BASE}/api/premium-picks`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    fetch(`${BASE}/api/pick-accuracy`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
  ])

  const seenF = new Set<string>()
  const picks = ((picksRes?.picks as any[]) || [])
    .filter((p) => p?.prediction?.recommendation?.grade === 'PICK')
    .filter((p) => {
      const k = String(p.match_id ?? `${p.home_team}|${p.away_team}`)
      if (seenF.has(k)) return false
      seenF.add(k)
      return true
    })
    .sort((a, b) => (b?.prediction?.confidence || 0) - (a?.prediction?.confidence || 0))
    .slice(0, 3)

  if (picks.length === 0) return null

  const acc = accRes?.summary?.accuracy
  const lines: string[] = []
  lines.push(`⚽ <b>TrendSoccer 축구</b> · ${kstDateLabel()}`)
  if (typeof acc === 'number') lines.push(`최근 PICK 적중률 ${acc}%`)
  lines.push('')
  lines.push('🔥 <b>오늘 밤 강추 PICK</b>')
  for (const p of picks) {
    const side = p?.prediction?.recommendation?.pick
    const homeKo = teamKo(p.home_team)
    const awayKo = teamKo(p.away_team)
    const pickName = side === 'HOME' ? homeKo : side === 'AWAY' ? awayKo : '무승부'
    const conf = p?.prediction?.confidence
    const confStr = typeof conf === 'number' ? ` (${Math.round(conf)}%)` : ''
    const lg = p.league_code ? `[${esc(p.league_code)}] ` : ''
    lines.push(`· ${lg}${esc(homeKo)} vs ${esc(awayKo)} → <b>${esc(pickName)}</b>${confStr}`)
  }
  lines.push('')
  lines.push(`👉 전체 픽  ${SITE}/premium`)
  lines.push('<i>/stop 수신거부</i>')
  return lines.join('\n')
}

// ── 야구 리포트 ────────────────────────────────────────────
async function buildBaseball(): Promise<string | null> {
  const [matchRes, accRes] = await Promise.all([
    fetch(`${BASE}/api/baseball/matches?status=scheduled&skipML=true&limit=100`, { cache: 'no-store' })
      .then((r) => r.json())
      .catch(() => null),
    fetch(`${BASE}/api/baseball/prediction-results?days=10&league=ALL`, { cache: 'no-store' })
      .then((r) => r.json())
      .catch(() => null),
  ])

  const all: any[] = matchRes?.matches || matchRes?.data || []
  const nowMs = Date.now()
  const today = kstTodayStr()
  // 분석 페이지와 동일 규칙: timestamp → KST 날짜
  const kstDate = (m: any) => {
    const t = m?.timestamp || m?.date
    const d = new Date(new Date(t).getTime() + 9 * 3600 * 1000)
    return Number.isNaN(d.getTime()) ? m?.date : d.toISOString().split('T')[0]
  }
  const seen = new Set<string>()
  const picks = all
    .filter((m) => m?.aiPrediction != null && m?.aiPrediction?.grade === 'PICK')
    .filter((m) => ['NS', 'SCHEDULED', 'TBD'].includes(String(m?.status))) // 미시작
    .filter((m) => {
      const t = Date.parse(m?.timestamp || m?.date)
      return Number.isNaN(t) || t > nowMs // 아직 안 열림
    })
    .filter((m) => kstDate(m) === today) // 오늘(KST)만 — 시리즈 다음날 제외
    // KBO/NPB는 선발 확정(hasPitcherData)된 경기만 (분석중 뻥튀기 제외)
    .filter((m) => m.league === 'MLB' || m.league === 'CPBL' || m.hasPitcherData !== false)
    .filter((m) => {
      // 같은 경기 중복 제거
      const key = `${m.league}|${m.homeTeam}|${m.awayTeam}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((m) => {
      const hp = m.aiPrediction.homeWinProb ?? 0
      const ap = m.aiPrediction.awayWinProb ?? 0
      const homeSide = hp >= ap
      return {
        league: m.league,
        home: m.homeTeamKo || m.homeTeam,
        away: m.awayTeamKo || m.awayTeam,
        pick: homeSide ? m.homeTeamKo || m.homeTeam : m.awayTeamKo || m.awayTeam,
        conf: Math.round(Math.max(hp, ap)),
        homePitcher: m.homePitcherKo || m.homePitcher || null,
        awayPitcher: m.awayPitcherKo || m.awayPitcher || null,
      }
    })
    .sort((a, b) => b.conf - a.conf)
    .slice(0, 3)

  if (picks.length === 0) return null

  const acc = accRes?.accuracy
  const lines: string[] = []
  lines.push(`⚾ <b>TrendSoccer 야구</b> · ${kstDateLabel()}`)
  if (typeof acc === 'number') lines.push(`최근 적중률 ${acc}%`)
  lines.push('')
  lines.push('🔥 <b>오늘 강추 PICK</b>')
  for (const p of picks) {
    lines.push(`· [${esc(p.league)}] ${esc(p.home)} vs ${esc(p.away)} → <b>${esc(p.pick)}</b> (${p.conf}%)`)
    if (p.homePitcher && p.awayPitcher) {
      lines.push(`   └ 선발 ${esc(p.homePitcher)} vs ${esc(p.awayPitcher)}`)
    }
  }
  lines.push('')
  lines.push(`👉 전체 픽  ${SITE}/baseball/analysis`)
  lines.push('<i>/stop 수신거부</i>')
  return lines.join('\n')
}

// ── 발송 ───────────────────────────────────────────────────
async function runSport(sport: 'football' | 'baseball') {
  const today = kstTodayStr()
  const col = sport === 'baseball' ? 'last_baseball_on' : 'last_football_on'

  // 1) 리포트 조립 (모든 유저 공통) — 픽 없으면 발송 안 함
  const text = sport === 'baseball' ? await buildBaseball() : await buildFootball()
  if (!text) return { sport, sent: 0, skipped: 0, reason: 'no_picks' }

  // 2) 대상: active 연동 + 오늘 미발송
  const { data: links } = await supabase
    .from('telegram_links')
    .select(`user_id, chat_id, ${col}`)
    .eq('active', true)

  const pending = (links || []).filter((l: any) => l[col] !== today)
  if (pending.length === 0) return { sport, sent: 0, skipped: 0, reason: 'none_pending' }

  // 3) 프리미엄 재확인 (만료자 자동 제외)
  const ids = pending.map((l: any) => l.user_id)
  const { data: users } = await supabase
    .from('users')
    .select('id, tier, premium_expires_at')
    .in('id', ids)
    .eq('tier', 'premium')

  const nowMs = Date.now()
  const premiumIds = new Set(
    (users || [])
      .filter((u: any) => !u.premium_expires_at || Date.parse(u.premium_expires_at) > nowMs)
      .map((u: any) => u.id),
  )
  const targets = pending.filter((l: any) => premiumIds.has(l.user_id))

  // 4) 발송
  let sent = 0
  let failed = 0
  for (const l of targets as any[]) {
    const res = await sendTelegram(l.chat_id, text)
    if (res.ok) {
      sent += 1
      await supabase.from('telegram_links').update({ [col]: today }).eq('user_id', l.user_id)
    } else if (res.errorCode === 403 || res.errorCode === 400) {
      // 봇 차단/잘못된 chat → 비활성화
      failed += 1
      await supabase
        .from('telegram_links')
        .update({ active: false, unsubscribed_at: new Date().toISOString() })
        .eq('user_id', l.user_id)
    } else {
      failed += 1
    }
    await new Promise((r) => setTimeout(r, 50)) // 레이트리밋 여유
  }

  return { sport, sent, failed, targets: targets.length }
}

export async function GET(request: Request) {
  if (!authed(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const sportParam = (url.searchParams.get('sport') || 'football').toLowerCase()
  const sports: ('football' | 'baseball')[] =
    sportParam === 'both'
      ? ['football', 'baseball']
      : sportParam === 'baseball'
      ? ['baseball']
      : ['football']

  try {
    const results = []
    for (const s of sports) results.push(await runSport(s))
    return NextResponse.json({ success: true, results })
  } catch (e) {
    console.error('[telegram-daily] error', e)
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

// 수동 실행용
export async function POST(request: Request) {
  return GET(request)
}
