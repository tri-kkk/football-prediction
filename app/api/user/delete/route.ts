// app/api/user/delete/route.ts
// 회원 탈퇴 API - Foreign Key 제약조건 처리

import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // ✅ 요청 본문에서 이메일 받기
    const body = await request.json()
    const { email } = body

    console.log('🔍 탈퇴 요청:', email)

    // 1️⃣ 이메일 검증
    if (!email || typeof email !== 'string') {
      console.error('❌ 이메일 없음')
      return NextResponse.json(
        { error: '이메일이 필요합니다.' },
        { status: 400 }
      )
    }

    // 2️⃣ 유저 존재 확인
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (fetchError || !userData) {
      console.error('❌ 유저 조회 실패:', fetchError?.message)
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const userId = userData.id
    console.log('✅ 유저 찾음:', userId)

    // 3️⃣ 관련 테이블의 데이터 먼저 삭제 (Foreign Key 제약조건 때문에)
    
    // proto_slips 삭제 (가장 중요)
    const { error: protoSlipsError } = await supabase
      .from('proto_slips')
      .delete()
      .eq('user_id', userId)

    if (protoSlipsError) {
      console.warn('⚠️ proto_slips 삭제 시 경고:', protoSlipsError.message)
      // 계속 진행 (치명적이지 않음)
    } else {
      console.log('✅ proto_slips 삭제 완료')
    }

    // subscriptions 삭제 (있으면)
    const { error: subscriptionsError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId)

    if (subscriptionsError) {
      console.warn('⚠️ subscriptions 삭제 시 경고:', subscriptionsError.message)
    } else {
      console.log('✅ subscriptions 삭제 완료')
    }

    // 다른 관련 테이블들도 삭제 (있으면)
    const relatedTables = [
      'referral_history',
      'referral_codes',
      'user_settings',
      'user_preferences',
    ]

    for (const table of relatedTables) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', userId)

        if (!error) {
          console.log(`✅ ${table} 삭제 완료`)
        }
      } catch (err) {
        console.warn(`⚠️ ${table} 삭제 시 경고:`, err)
      }
    }

    // 4️⃣ 마지막으로 users 테이블에서 삭제
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('❌ 유저 삭제 실패:', deleteError.message)
      return NextResponse.json(
        { error: '회원 탈퇴 처리 중 오류가 발생했습니다: ' + deleteError.message },
        { status: 500 }
      )
    }

    console.log('✅ 유저 완전히 삭제됨:', userId)

    return NextResponse.json(
      { 
        success: true,
        message: '회원 탈퇴가 완료되었습니다.'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ API 에러:', error)
    
    if (error instanceof Error) {
      console.error('에러 메시지:', error.message)
    }

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}