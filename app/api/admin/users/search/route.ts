// app/api/admin/users/search/route.ts
//
// 회원 검색 (관리자 전용)
//   GET ?q=keyword → users + pending_users 매칭
//   이메일/이름/네이버 ID 등 LIKE 검색
//
// 인증:
//   - ADMIN_PUSH_SECRET 헤더 또는 x-internal-call

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function authorize(request: NextRequest): boolean {
  const secret = process.env.ADMIN_PUSH_SECRET
  if (!secret) return request.headers.get('x-internal-call') === '1'
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  return auth.slice(7).trim() === secret
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 2) {
    return NextResponse.json({ success: false, error: 'q must be at least 2 chars' }, { status: 400 })
  }

  try {
    const pattern = `%${q}%`

    // users 검색
    const { data: users } = await supabase
      .from('users')
      .select('id, email, name, tier, premium_expires_at, created_at, last_login_at, trial_used, promo_code')
      .or(`email.ilike.${pattern},name.ilike.${pattern}`)
      .limit(50)

    // pending_users (약관 미동의 사용자)
    const { data: pending } = await supabase
      .from('pending_users')
      .select('id, email, name, created_at, expires_at')
      .or(`email.ilike.${pattern},name.ilike.${pattern}`)
      .limit(20)

    return NextResponse.json({
      success: true,
      users: users ?? [],
      pending: pending ?? [],
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
