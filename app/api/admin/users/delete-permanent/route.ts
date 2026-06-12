// app/api/admin/users/delete-permanent/route.ts
//
// 회원 완전 삭제 (관리자 전용)
//   POST { userIds: string[], emails: string[], removeDeletedHash: boolean }
//   - userIds: 특정 user id로 삭제
//   - emails: 이메일로 deleted_users 해시까지 삭제 (재가입 즉시 가능)
//   - 두 가지 다 동시 처리 가능
//
// 처리 순서 (FK 제약 회피):
//   1) payments / subscriptions / proto_slips
//   2) referral_history (referrer_id, referee_id 양쪽)
//   3) device_tokens / match_notifications
//   4) pending_users
//   5) deleted_users (옵션)
//   6) users
//
// 인증: ADMIN_PUSH_SECRET

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex')
}

interface Body {
  userIds?: string[]
  emails?: string[]
  removeDeletedHash?: boolean   // true면 deleted_users 해시도 제거(완전 초기화)
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const userIds = (body.userIds ?? []).filter((s) => typeof s === 'string' && s.length > 0)
  const inputEmails = (body.emails ?? []).filter((s) => typeof s === 'string' && s.length > 0).map(e => e.toLowerCase())
  const removeDeletedHash = !!body.removeDeletedHash

  if (userIds.length === 0 && inputEmails.length === 0) {
    return NextResponse.json({ success: false, error: 'userIds 또는 emails 중 하나 필요' }, { status: 400 })
  }

  try {
    // 1) 입력된 userIds + emails로 실제 users 행 확보 (이메일 → user 매칭)
    let allUserIds = [...userIds]
    let allEmails: string[] = []

    if (userIds.length > 0) {
      const { data: foundByIds } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds)
      for (const u of foundByIds ?? []) {
        if (u.email) allEmails.push(u.email.toLowerCase())
      }
    }

    if (inputEmails.length > 0) {
      const { data: foundByEmails } = await supabase
        .from('users')
        .select('id, email')
        .in('email', inputEmails)
      for (const u of foundByEmails ?? []) {
        if (!allUserIds.includes(u.id)) allUserIds.push(u.id)
        if (u.email) allEmails.push(u.email.toLowerCase())
      }
    }

    // emails 중복 제거
    allEmails = Array.from(new Set([...allEmails, ...inputEmails]))

    const summary: Record<string, any> = {
      targetUserIds: allUserIds,
      targetEmails: allEmails,
      deleted: {},
    }

    // 2) FK 자식 테이블 정리 (table별 try/catch — 일부 누락 테이블도 안전)
    const tablesByUserId = [
      'payments',
      'subscriptions',
      'proto_slips',
      'device_tokens',
      'match_notifications',
      'user_settings',
      'user_preferences',
    ]

    if (allUserIds.length > 0) {
      for (const table of tablesByUserId) {
        try {
          const { error, count } = await supabase
            .from(table)
            .delete({ count: 'exact' })
            .in('user_id', allUserIds)
          if (!error) summary.deleted[table] = count ?? 0
          else summary.deleted[table] = `err: ${error.message}`
        } catch (e: any) {
          summary.deleted[table] = `err: ${e?.message ?? 'unknown'}`
        }
      }

      // referral_history 양쪽 관계
      try {
        const { count: rc1 } = await supabase
          .from('referral_history')
          .delete({ count: 'exact' })
          .in('referrer_id', allUserIds)
        const { count: rc2 } = await supabase
          .from('referral_history')
          .delete({ count: 'exact' })
          .in('referee_id', allUserIds)
        summary.deleted['referral_history'] = (rc1 ?? 0) + (rc2 ?? 0)
      } catch (e: any) {
        summary.deleted['referral_history'] = `err: ${e?.message}`
      }
    }

    // 3) pending_users (이메일 기준)
    if (allEmails.length > 0) {
      const { count } = await supabase
        .from('pending_users')
        .delete({ count: 'exact' })
        .in('email', allEmails)
      summary.deleted['pending_users'] = count ?? 0
    }

    // 4) deleted_users 해시 (옵션 — true면 재가입 즉시 가능하게)
    if (removeDeletedHash && allEmails.length > 0) {
      const hashes = allEmails.map((e) => hashEmail(e))
      const { count } = await supabase
        .from('deleted_users')
        .delete({ count: 'exact' })
        .in('email_hash', hashes)
      summary.deleted['deleted_users'] = count ?? 0
    }

    // 5) 마지막 users
    if (allUserIds.length > 0) {
      const { error, count } = await supabase
        .from('users')
        .delete({ count: 'exact' })
        .in('id', allUserIds)
      if (error) {
        return NextResponse.json(
          { success: false, error: `users 삭제 실패: ${error.message}`, summary },
          { status: 500 },
        )
      }
      summary.deleted['users'] = count ?? 0
    }

    return NextResponse.json({ success: true, summary })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
