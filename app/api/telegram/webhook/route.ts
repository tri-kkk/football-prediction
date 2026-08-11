// app/api/telegram/webhook/route.ts
// 텔레그램 봇 웹훅 — /start <token> 연동, /stop 수신거부
//
// 웹훅 등록(1회):
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
//        -d "url=https://www.trendsoccer.com/api/telegram/webhook" \
//        -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegram } from '../../../lib/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  // 1) 웹훅 시크릿 검증 (setWebhook 의 secret_token 을 텔레그램이 헤더로 되돌려줌)
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secret) {
    const got = request.headers.get('x-telegram-bot-api-secret-token')
    if (got !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }
  }

  let update: any
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const msg = update?.message || update?.edited_message
  const chatId = msg?.chat?.id
  const text: string = String(msg?.text || '').trim()
  if (!chatId || !text) return NextResponse.json({ ok: true })

  try {
    // ── /start <token> : 계정 연동 ──────────────────────────
    if (text.startsWith('/start')) {
      const token = text.split(/\s+/)[1]

      if (!token) {
        await sendTelegram(
          chatId,
          '안녕하세요! ⚽ <b>TrendSoccer 알림 봇</b>이에요.\nTrendSoccer 설정에서 <b>텔레그램 알림 받기</b>를 눌러 연동해 주세요.',
        )
        return NextResponse.json({ ok: true })
      }

      const { data: tok } = await supabase
        .from('telegram_link_tokens')
        .select('token, user_id, used, expires_at')
        .eq('token', token)
        .maybeSingle()

      if (!tok || tok.used || new Date(tok.expires_at).getTime() < Date.now()) {
        await sendTelegram(
          chatId,
          '⚠️ 연동 링크가 만료되었어요.\n설정에서 다시 <b>텔레그램 알림 받기</b>를 눌러주세요.',
        )
        return NextResponse.json({ ok: true })
      }

      // 매핑 저장 (유저당 1개)
      await supabase.from('telegram_links').upsert(
        {
          user_id: tok.user_id,
          chat_id: chatId,
          active: true,
          unsubscribed_at: null,
        },
        { onConflict: 'user_id' },
      )
      await supabase
        .from('telegram_link_tokens')
        .update({ used: true })
        .eq('token', token)

      await sendTelegram(
        chatId,
        '✅ <b>연동 완료!</b>\n경기 전 <b>데일리 AI 픽 리포트</b>가 도착해요 (축구·야구).\n\n수신을 멈추려면 <code>/stop</code> 을 보내주세요.',
      )
      return NextResponse.json({ ok: true })
    }

    // ── /stop : 수신 거부 ──────────────────────────────────
    if (text.startsWith('/stop')) {
      await supabase
        .from('telegram_links')
        .update({ active: false, unsubscribed_at: new Date().toISOString() })
        .eq('chat_id', chatId)
      await sendTelegram(
        chatId,
        '🔕 리포트 수신을 중단했어요.\n다시 받으려면 설정에서 재연동해 주세요.',
      )
      return NextResponse.json({ ok: true })
    }

    // ── 기타 ───────────────────────────────────────────────
    await sendTelegram(chatId, '명령어: <code>/stop</code> 수신거부')
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[telegram/webhook] error', e)
    // 텔레그램에는 항상 200 (재전송 폭주 방지)
    return NextResponse.json({ ok: true })
  }
}
