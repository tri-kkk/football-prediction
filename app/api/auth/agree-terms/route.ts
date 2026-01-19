import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 🎉 프로모션 기간 설정
const PROMO_END_DATE = new Date('2026-02-01T00:00:00+09:00')

export async function POST(request: NextRequest) {
  try {
    // ✅ 1. 세션 확인
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const email = session.user.email

    // ✅ 2. 요청 body 파싱
    const body = await request.json()
    const { termsAgreed, privacyAgreed, marketingAgreed } = body

    // ✅ 3. 필수 약관 동의 확인
    if (!termsAgreed || !privacyAgreed) {
      return NextResponse.json(
        { error: '필수 약관에 동의해주세요.' },
        { status: 400 }
      )
    }

    // ✅ 4. 이미 users에 있는지 확인 (중복 방지)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, terms_agreed_at')
      .eq('email', email)
      .single()

    if (existingUser) {
      // 이미 가입 완료된 회원
      if (existingUser.terms_agreed_at) {
        return NextResponse.json({
          success: true,
          message: '이미 약관에 동의하셨습니다.',
          alreadyAgreed: true
        })
      }
      
      // users에는 있지만 약관 미동의 (예전 데이터)
      const now = new Date().toISOString()
      await supabase
        .from('users')
        .update({
          terms_agreed_at: now,
          privacy_agreed_at: now,
          marketing_agreed: marketingAgreed || false,
          marketing_agreed_at: marketingAgreed ? now : null,
        })
        .eq('email', email)

      return NextResponse.json({
        success: true,
        message: '약관 동의가 완료되었습니다.'
      })
    }

    // ✅ 5. pending_users에서 데이터 가져오기
    const { data: pendingUser, error: pendingError } = await supabase
      .from('pending_users')
      .select('*')
      .eq('email', email)
      .single()

    if (pendingError || !pendingUser) {
      console.error('Pending user not found:', email)
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.' },
        { status: 404 }
      )
    }

    // ✅ 6. 프로모션 처리
    const now = new Date()
    const isPromoPeriod = now < PROMO_END_DATE
    const promoCode = pendingUser.pending_promo && isPromoPeriod ? pendingUser.pending_promo : null
    
    // 프리미엄 만료일 계산 (프로모션 적용 시 2026년 1월 31일까지)
    let tier = 'free'
    let premiumExpiresAt = null
    let promoAppliedAt = null

    if (promoCode === 'LAUNCH_2026') {
      tier = 'premium'
      premiumExpiresAt = PROMO_END_DATE.toISOString()
      promoAppliedAt = now.toISOString()
    }

    // ✅ 7. users 테이블에 INSERT
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: pendingUser.email,
        name: pendingUser.name,
        avatar_url: pendingUser.avatar_url,
        provider: pendingUser.provider,
        provider_id: pendingUser.provider_id,
        signup_ip: pendingUser.signup_ip,
        signup_country: pendingUser.signup_country,
        signup_country_code: pendingUser.signup_country_code,
        
        // ✅ 약관 동의 정보
        terms_agreed_at: now.toISOString(),
        privacy_agreed_at: now.toISOString(),
        marketing_agreed: marketingAgreed || false,
        marketing_agreed_at: marketingAgreed ? now.toISOString() : null,
        
        // ✅ 티어 & 프로모션
        tier: tier,
        promo_code: promoCode,
        promo_applied_at: promoAppliedAt,
        premium_expires_at: premiumExpiresAt,
        
        // ✅ 기타
        created_at: pendingUser.created_at,  // 최초 가입 시도 시간 유지
        last_login_at: now.toISOString(),
      })
      .select('id, tier, promo_code')
      .single()

    if (insertError) {
      console.error('User insert error:', insertError)
      return NextResponse.json(
        { error: '회원 가입 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // ✅ 8. pending_users에서 삭제
    await supabase
      .from('pending_users')
      .delete()
      .eq('email', email)

    console.log(`✅ User registered: ${email}, tier: ${tier}, promo: ${promoCode}`)

    // ✅ 9. 성공 응답
    return NextResponse.json({
      success: true,
      message: promoCode 
        ? '🎉 회원가입 완료! 프로모션이 적용되었습니다.'
        : '회원가입이 완료되었습니다.',
      user: {
        id: newUser.id,
        tier: newUser.tier,
        promo_code: newUser.promo_code,
        premium_expires_at: premiumExpiresAt
      }
    })

  } catch (error) {
    console.error('Agree terms error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// GET: 현재 약관 동의 상태 확인
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const email = session.user.email

    // users 테이블 확인
    const { data: userData } = await supabase
      .from('users')
      .select('terms_agreed_at, privacy_agreed_at, marketing_agreed')
      .eq('email', email)
      .single()

    if (userData && userData.terms_agreed_at) {
      return NextResponse.json({
        agreed: true,
        terms_agreed_at: userData.terms_agreed_at,
        privacy_agreed_at: userData.privacy_agreed_at,
        marketing_agreed: userData.marketing_agreed
      })
    }

    // pending_users 확인
    const { data: pendingData } = await supabase
      .from('pending_users')
      .select('pending_promo, expires_at')
      .eq('email', email)
      .single()

    if (pendingData) {
      return NextResponse.json({
        agreed: false,
        pending: true,
        pending_promo: pendingData.pending_promo,
        expires_at: pendingData.expires_at
      })
    }

    return NextResponse.json({
      agreed: false,
      pending: false
    })

  } catch (error) {
    console.error('Get terms status error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}