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

  // 0) 대상 users 행 확정.
  //    🆕 B36: 신규 가입 세션의 JWT sub 는 pending_users.id 라 users.id 로 못 찾을 수 있다.
  //    id 로 먼저 찾고, 없으면 JWT 의 email 로 폴백해 실제 users 행을 잡는다.
  let targetId: string | null = null
  {
    const byId = await supabase.from('users').select('id').eq('id', session.userId).maybeSingle()
    if (byId.data) targetId = byId.data.id
    else if (session.email) {
      const byEmail = await supabase
        .from('users')
        .select('id')
        .eq('email', session.email.toLowerCase())
        .maybeSingle()
      if (byEmail.data) targetId = byEmail.data.id
    }
  }
  if (!targetId) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  // 1) 확정 컬럼 갱신 (marketing_agreed / marketing_agreed_at)
  //    동의 시 agreed_at=now, 철회 시 agreed_at 은 마지막 동의 시각을 이력으로 보존
  const baseUpdate: Record<string, any> = { marketing_agreed: marketing }
  if (marketing) baseUpdate.marketing_agreed_at = now

  const { error: updErr } = await supabase.from('users').update(baseUpdate).eq('id', targetId)
  if (updErr) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: updErr.message } },
      { status: 500 },
    )
  }

  // 2) 철회 시각 기록 (marketing_revoked_at) — 컬럼이 있을 때만 성공. 없으면 무시(best-effort).
  await supabase
    .from('users')
    .update({ marketing_revoked_at: marketing ? null : now })
    .eq('id', targetId)
    .then(() => {}, () => {})

  // 3) 갱신된 consents 재조회 (/me 의 consents 와 동일 형태)
  const { data: u } = await supabase
    .from('users')
    .select('terms_agreed_at, privacy_agreed_at, marketing_agreed, marketing_agreed_at')
    .eq('id', targetId)
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
