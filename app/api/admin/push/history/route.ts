// app/api/admin/push/history/route.ts
// 어드민 푸시 발송 내역 조회. push_send_history 테이블(즉시/예약 발송 시 기록)에서 최근분 반환.
// 인증: schedule 라우트와 동일하게 admin 페이지 접근자 전제(별도 토큰 없음).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200)

    const { data, error } = await supabase
      .from('push_send_history')
      .select('id, created_at, source, topic, ko_title, ko_body, en_title, en_body, deeplink, ok, results, scheduled_id')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      // 테이블이 아직 없으면 빈 배열로 응답(섹션이 깨지지 않도록) + 힌트
      console.warn('[push/history] query error:', error.message)
      return NextResponse.json({ ok: false, error: error.message, rows: [] }, { status: 200 })
    }
    return NextResponse.json({ ok: true, rows: data ?? [] }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e), rows: [] }, { status: 200 })
  }
}
