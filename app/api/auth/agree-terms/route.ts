import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PROMO_END_DATE = new Date('2026-03-01T00:00:00+09:00')

export async function POST(request: NextRequest) {
  let body: any = {}
  
  try {
    console.log('🔍 약관 동의 API 시작')

    // ✅ 요청 본문을 한 번만 읽기
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('❌ JSON 파싱 실패:', parseError)
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { email, termsAgreed, privacyAgreed, marketingAgreed } = body

    console.log('📥 요청 데이터:', { email, termsAgreed, privacyAgreed, marketingAgreed })

    if (!email) {
      console.error('❌ 이메일 없음')
      return NextResponse.json(
        { error: '이메일이 필요합니다.' },
        { status: 400 }
      )
    }

    if (!termsAgreed || !privacyAgreed) {
      console.error('❌ 필수 약관 미동의')
      return NextResponse.json(
        { error: '필수 약관에 동의해주세요.' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase()

    // ✅ users 테이블 확인
    console.log('🔍 users 테이블 확인:', emailLower)
    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id, terms_agreed_at')
      .eq('email', emailLower)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('❌ users 조회 실패:', existingError)
      return NextResponse.json(
        { error: 'DB 조회 오류' },
        { status: 500 }
      )
    }

    if (existingUser) {
      console.log('✅ 기존 users 찾음')
      
      if (existingUser.terms_agreed_at) {
        console.log('✅ 이미 약관 동의함')
        return NextResponse.json({
          success: true,
          alreadyAgreed: true
        })
      }
      
      // 약관 미동의 상태 → 업데이트
      const now = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('users')
        .update({
          terms_agreed_at: now,
          privacy_agreed_at: now,
          marketing_agreed: marketingAgreed || false,
          marketing_agreed_at: marketingAgreed ? now : null,
        })
        .eq('email', emailLower)

      if (updateError) {
        console.error('❌ users 업데이트 실패:', updateError)
        return NextResponse.json(
          { error: 'Update failed' },
          { status: 500 }
        )
      }

      console.log('✅ users 약관 동의 업데이트 완료')
      return NextResponse.json({
        success: true,
        message: '약관 동의가 완료되었습니다.'
      })
    }

    // ✅ pending_users 확인
    console.log('🔍 pending_users 확인:', emailLower)
    const { data: pendingUser, error: pendingError } = await supabase
      .from('pending_users')
      .select('*')
      .eq('email', emailLower)
      .single()

    if (pendingError && pendingError.code !== 'PGRST116') {
      console.error('❌ pending_users 조회 실패:', pendingError)
      return NextResponse.json(
        { error: 'DB 조회 오류' },
        { status: 500 }
      )
    }

    if (!pendingUser) {
      console.error('❌ pending_users에서 찾을 수 없음')
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    console.log('✅ pending_users 찾음')

    // ✅ 프로모션 처리
    const now = new Date()
    const isPromoPeriod = now < PROMO_END_DATE
    const promoCode = pendingUser.pending_promo && isPromoPeriod ? pendingUser.pending_promo : null
    
    let tier = 'free'
    let premiumExpiresAt = null
    let promoAppliedAt = null

    if (promoCode === 'LAUNCH_2026') {
      tier = 'premium'
      premiumExpiresAt = PROMO_END_DATE.toISOString()
      promoAppliedAt = now.toISOString()
      console.log('🎉 프로모션 적용')
    }

    // ✅ users 테이블에 INSERT
    console.log('📝 users 테이블에 데이터 삽입')
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: emailLower,
        name: pendingUser.name,
        avatar_url: pendingUser.avatar_url,
        provider: pendingUser.provider,
        provider_id: pendingUser.provider_id,
        signup_ip: pendingUser.signup_ip,
        signup_country: pendingUser.signup_country,
        signup_country_code: pendingUser.signup_country_code,
        
        // 약관 동의
        terms_agreed_at: now.toISOString(),
        privacy_agreed_at: now.toISOString(),
        marketing_agreed: marketingAgreed || false,
        marketing_agreed_at: marketingAgreed ? now.toISOString() : null,
        
        // 티어 & 프로모션
        tier: tier,
        promo_code: promoCode,
        promo_applied_at: promoAppliedAt,
        premium_expires_at: premiumExpiresAt,
        
        // 기타
        created_at: pendingUser.created_at || now.toISOString(),
        last_login_at: now.toISOString(),
      })
      .select('id, tier, promo_code')
      .single()

    if (insertError) {
      console.error('❌ users 삽입 실패:', insertError)
      return NextResponse.json(
        { error: 'Insert failed' },
        { status: 500 }
      )
    }

    console.log('✅ users 삽입 완료:', newUser.id)

    // ✅ pending_users 삭제
    console.log('🗑️ pending_users 삭제')
    const { error: deleteError } = await supabase
      .from('pending_users')
      .delete()
      .eq('email', emailLower)

    if (deleteError) {
      console.warn('⚠️ pending_users 삭제 실패 (무시)')
    }

    console.log(`✅ 약관 동의 완료`)

    return NextResponse.json({
      success: true,
      message: promoCode 
        ? '🎉 프로모션이 적용되었습니다.'
        : '회원가입이 완료되었습니다.',
    })

  } catch (error) {
    console.error('❌ API 에러:', error)
    
    if (error instanceof Error) {
      console.error('에러:', error.message)
    }

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// ✅ GET: 약관 동의 상태 확인
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: '이메일이 필요합니다.' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase()

    // 1️⃣ users 테이블 확인
    const { data: userData } = await supabase
      .from('users')
      .select('id, terms_agreed_at')
      .eq('email', emailLower)
      .single()

    if (userData && userData.terms_agreed_at) {
      return NextResponse.json({ termsAgreed: true, agreed: true })
    }

    // 2️⃣ pending_users 확인
    const { data: pendingData } = await supabase
      .from('pending_users')
      .select('id')
      .eq('email', emailLower)
      .single()

    if (pendingData) {
      return NextResponse.json({ termsAgreed: false, pending: true })
    }

    return NextResponse.json({ termsAgreed: false, pending: false })

  } catch (error) {
    console.error('❌ GET 에러:', error)
    return NextResponse.json(
      { termsAgreed: false },
      { status: 200 }
    )
  }
}