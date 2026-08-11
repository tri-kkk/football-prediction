// app/lib/telegram.ts
// 텔레그램 Bot API 발송 헬퍼 (웹훅 응답 + 데일리 크론 공용)

const BASE = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export interface SendResult {
  ok: boolean
  status: number
  /** 텔레그램 에러 코드 (403=차단, 400=잘못된 chat 등) */
  errorCode?: number
  data?: any
}

/**
 * 텔레그램 메시지 발송.
 * parse_mode 기본 HTML, 링크 미리보기 비활성화.
 */
export async function sendTelegram(
  chatId: number | string,
  text: string,
  extra?: Record<string, any>,
): Promise<SendResult> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('[telegram] TELEGRAM_BOT_TOKEN 미설정')
    return { ok: false, status: 0 }
  }
  try {
    const res = await fetch(`${BASE()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...extra,
      }),
    })
    const data = await res.json().catch(() => ({}))
    return {
      ok: res.ok && data?.ok !== false,
      status: res.status,
      errorCode: data?.error_code,
      data,
    }
  } catch (e) {
    console.error('[telegram] send error', e)
    return { ok: false, status: 0 }
  }
}
