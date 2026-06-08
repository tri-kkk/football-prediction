/**
 * POST /api/admin/push/send-topic-internal
 *
 * 관리자 페이지(/admin/ads)의 푸시 발송 폼에서 호출하는 내부 프록시.
 * 클라이언트(브라우저)는 ADMIN_PUSH_SECRET을 모르므로, 같은 서버 내부에서
 * 'x-internal-call: 1' 헤더로 send-topic 라우트를 호출.
 *
 * Body는 send-topic과 동일:
 *   { topic, ko: {title, body}, en?: {title, body}, data? }
 *
 * 인증: 별도 인증 없음 — admin 페이지 접근 가능한 사람만 호출 가능하다는 가정.
 *      더 엄격한 보안 필요하면 NextAuth 세션 owner 체크 추가.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const baseUrl = new URL(request.url).origin

    const secret = process.env.ADMIN_PUSH_SECRET
    if (!secret) {
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'ADMIN_PUSH_SECRET not configured on server' } },
        { status: 500 }
      )
    }

    const res = await fetch(`${baseUrl}/api/admin/push/send-topic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
}
