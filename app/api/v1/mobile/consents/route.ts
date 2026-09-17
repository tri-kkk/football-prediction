// app/api/v1/mobile/consents/route.ts
// B28: 마케팅 수신 동의 변경 API (로그인 사용자)
//   PATCH { marketing: boolean }
//     · users.marketing_agreed 갱신
//     · 동의 → marketing_agreed_at = now, (있으면) marketing_revoked_at = null
//     · 철회 → (있으면) marketing_revoked_at = now, marketing_agreed_at 은 이력 보존
//   응답: { success, consents }
//   인증: 모바일 JWT (Bearer)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMobileSession } from '@/lib/mobile-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function PATCH(request: NextRequest) {
  const session = await getMobileSession(request)
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
      { status: 401 },
    )
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } },
      { status: 400 },
    )
  }

  if (typeof body?.marketing !== 'boolean') {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'marketing(boolean) is required' } },
      { status: 400 },
    )
  }

  const marketing: boolean = body.marketing
  const now = new Date().toISOString()

  // 1) 확정 컬럼 갱신 (marketing_agreed / marketing_agreed_at)
  //    동의 시 agreed_at=now, 철회 시 agreed_at 은 마지막 동의 시각을 이력으로 보존
  const baseUpdate: Record<string, any> = { marketing_agreed: marketing }
  if (marketing) baseUpdate.marketing_agreed_at = now

  const { error: updErr } = await supabase.from('users').update(baseUpdate).eq('id', session.userId)
  if (updErr) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: updErr.message } },
      { status: 500 },
    )
  }

  // 2) 철회 시각 기록 (marketing_revoked_at) — 컬럼이 있을 때만 성공. 없으면 무시(best-effort).
  //    마이그레이션: ALTER TABLE users ADD COLUMN marketing_revoked_at timestamptz;
  await supabase
    .from('users')
    .update({ marketing_revoked_at: marketing ? null : now })
    .eq('id', session.userId)
    // 컬럼 미존재 시 에러가 나도 동의 갱신 자체는 이미 완료됨 → 무시
    .then(() => {}, () => {})

  // 3) 갱신된 consents 재조회 (/me 의 consents 와 동일 형태)
  const { data: u } = await supabase
    .from('users')
    .select('terms_agreed_at, privacy_agreed_at, marketing_agreed, marketing_agreed_at')
    .eq('id', session.userId)
    .single()

  return NextResponse.json({
    success: true,
    consents: {
      terms: !!u?.terms_agreed_at,
      privacy: !!u?.privacy_agreed_at,
      marketing: !!u?.marketing_agreed,
      consentedAt: u?.terms_agreed_at ?? null,
      marketingAt: u?.marketing_agreed_at ?? null,
    },
  })
}
