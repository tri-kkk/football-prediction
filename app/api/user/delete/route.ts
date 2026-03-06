// app/api/user/delete/route.ts
// 회원 탈퇴 API - Foreign Key 제약조건 처리

import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    console.log('🔍 탈퇴 요청:', email)

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 })
    }

    // 2️⃣ 유저 존재 확인 + trial_used, promo_code 함께 조회
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('id, promo_code, trial_used')
      .eq('email', email.toLowerCase())
      .single()

    if (fetchError || !userData) {
      console.error('❌ 유저 조회 실패:', fetchError?.message)
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    const userId = userData.id
    console.log('✅ 유저 찾음:', userId)

    // 3️⃣ deleted_users에 기록 (재가입 시 프로모/체험판 중복 방지)
    const emailHash = hashEmail(email)
    const { error: deletedInsertError } = await supabase
      .from('deleted_users')
      .upsert({
        email_hash: emailHash,
        promo_code: userData.promo_code || null,
        trial_used: userData.trial_used || false,  // ✅ 체험판 사용 여부 저장
        deleted_at: new Date().toISOString(),
      }, { onConflict: 'email_hash' })

    if (deletedInsertError) {
      console.warn('⚠️ deleted_users 저장 실패 (계속 진행):', deletedInsertError.message)
    } else {
      console.log('✅ deleted_users 저장 완료 (trial_used:', userData.trial_used, ')')
    }

    // 4️⃣ 관련 테이블 삭제 (Foreign Key 순서)
    const { error: protoSlipsError } = await supabase
      .from('proto_slips')
      .delete()
      .eq('user_id', userId)

    if (protoSlipsError) {
      console.warn('⚠️ proto_slips 삭제 경고:', protoSlipsError.message)
    } else {
      console.log('✅ proto_slips 삭제 완료')
    }

    const { error: subscriptionsError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId)

    if (subscriptionsError) {
      console.warn('⚠️ subscriptions 삭제 경고:', subscriptionsError.message)
    } else {
      console.log('✅ subscriptions 삭제 완료')
    }

    const relatedTables = [
      'referral_history',
      'referral_codes',
      'user_settings',
      'user_preferences',
    ]

    for (const table of relatedTables) {
      try {
        const { error } = await supabase.from(table).delete().eq('user_id', userId)
        if (!error) console.log(`✅ ${table} 삭제 완료`)
      } catch (err) {
        console.warn(`⚠️ ${table} 삭제 경고:`, err)
      }
    }

    // 5️⃣ users 테이블에서 삭제
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

    return NextResponse.json({
      success: true,
      message: '회원 탈퇴가 완료되었습니다.'
    }, { status: 200 })

  } catch (error) {
    console.error('❌ API 에러:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}