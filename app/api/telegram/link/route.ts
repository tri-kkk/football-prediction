// app/api/telegram/link/route.ts
// 텔레그램 연동 관리 (로그인 필요)
//   GET    : 현재 연동 상태 조회
//   POST   : 일회성 토큰 발급 + 딥링크 반환 (프리미엄 전용)
//   DELETE : 연동 해제

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// BotFather 봇 username (@ 없이). 예: TrendSoccerAlertBot
const BOT = process.env.TELEGRAM_BOT_USERNAME

async function currentUser() {
  const session: any = await getServerSession()
  const email = session?.user?.email
  if (!email) return null
  const { data } = await supabase
    .from('users')
    .select('id, tier, premium_expires_at')
    .ilike('email', email)
    .maybeSingle()
  return data ? { id: data.id, tier: data.tier as string } : null
}

// ── 연동 상태 ─────────────────────────────────────────────
export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: link } = await supabase
    .from('telegram_links')
    .select('active, linked_at')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    linked: !!link?.active,
    tier: user.tier,
  })
}

// ── 딥링크 발급 (프리미엄 전용) ────────────────────────────
export async function POST() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (user.tier !== 'premium') {
    return NextResponse.json({ error: 'premium_only' }, { status: 403 })
  }
  if (!BOT) {
    return NextResponse.json({ error: 'bot_not_configured' }, { status: 500 })
  }

  const token = (globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random()}`).replace(/-/g, '')
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { error } = await supabase.from('telegram_link_tokens').insert({
    token,
    user_id: user.id,
    expires_at: expiresAt,
  })
  if (error) {
    console.error('[telegram/link] token insert', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({
    deepLink: `https://t.me/${BOT}?start=${token}`,
    expiresAt,
  })
}

// ── 연동 해제 ─────────────────────────────────────────────
export async function DELETE() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  await supabase
    .from('telegram_links')
    .update({ active: false, unsubscribed_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
