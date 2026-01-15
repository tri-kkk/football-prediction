// app/api/user/delete/route.ts
// 회원 탈퇴 API

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 이메일 해시 생성 (복호화 불가)
function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex')
}

export async function POST(request: Request) {
  try {
    // 세션 확인
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const email = session.user.email
    const emailHash = hashEmail(email)

    // 1. 현재 유저 정보 조회
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('tier, promo_code')
      .eq('email', email)
      .single()

    if (fetchError || !userData) {
      return NextResponse.json(
        { error: '유저 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 2. deleted_users에 기록 (프로모션 악용 방지)
    const { error: insertError } = await supabase
      .from('deleted_users')
      .insert({
        email_hash: emailHash,
        promo_code: userData.promo_code,
        original_tier: userData.tier,
      })

    if (insertError) {
      console.error('Failed to record deletion:', insertError)
      // 기록 실패해도 탈퇴는 진행
    }

    // 3. users 테이블에서 삭제
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('email', email)

    if (deleteError) {
      console.error('Failed to delete user:', deleteError)
      return NextResponse.json(
        { error: '회원 탈퇴 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    console.log(`✅ User deleted: ${emailHash.substring(0, 8)}...`)

    return NextResponse.json({
      success: true,
      message: '회원 탈퇴가 완료되었습니다.',
    })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
