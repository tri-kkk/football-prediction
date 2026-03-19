import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PROMO_END_DATE = new Date('2026-03-01T00:00:00+09:00')

export async function POST(request: NextRequest) {
  let body: any = {}
  
  try {
    console.log('🔍 약관 동의 API 시작')

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
      return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 })
    }

    if (!termsAgreed || !privacyAgreed) {
      return NextResponse.json({ error: '필수 약관에 동의해주세요.' }, { status: 400 })
    }

    const emailLower = email.toLowerCase()

    // ✅ users 테이블 확인
    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id, terms_agreed_at')
      .eq('email', emailLower)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('❌ users 조회 실패:', existingError)
      return NextResponse.json({ error: 'DB 조회 오류' }, { status: 500 })
    }

    if (existingUser) {
      console.log('✅ 기존 users 찾음')
      
      if (existingUser.terms_agreed_at) {
        console.log('✅ 이미 약관 동의함')
        return NextResponse.json({ success: true, alreadyAgreed: true })
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
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: '약관 동의가 완료되었습니다.' })
    }

    // ✅ pending_users 확인
    const { data: pendingUser, error: pendingError } = await supabase
      .from('pending_users')
      .select('*')
      .eq('email', emailLower)
      .single()

    if (pendingError && pendingError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'DB 조회 오류' }, { status: 500 })
    }

    if (!pendingUser) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    console.log('✅ pending_users 찾음')

    // ✅ 프로모션 처리
    const now = new Date()
    const isPromoPeriod = now < PROMO_END_DATE
    const promoCode = pendingUser.pending_promo && isPromoPeriod ? pendingUser.pending_promo : null

    // ✅ 탈퇴 이력 확인 (재가입 시 체험판 중복 방지)
    const emailHash = crypto.createHash('sha256').update(emailLower).digest('hex')
    const { data: deletedUser } = await supabase
      .from('deleted_users')
      .select('trial_used, had_trial, promo_code')  // ✅ had_trial 추가
      .eq('email_hash', emailHash)
      .limit(1)
      .maybeSingle()

    const hasDeleteHistory = deletedUser !== null
    // ✅ trial_used OR had_trial 둘 중 하나라도 true면 체험판 받은 것으로 처리
    const hadTrial = deletedUser?.trial_used === true || deletedUser?.had_trial === true
    console.log('🔍 탈퇴 이력:', { hasDeleteHistory, hadTrial, deletedUser })

    let tier = 'premium'
    let premiumExpiresAt: string
    let promoAppliedAt = null
    let trialStartedAt: string | null = now.toISOString()
    let trialUsed = true

    if (promoCode === 'LAUNCH_2026') {
      // 프로모션 코드 있으면 프로모션 기간 우선 적용
      premiumExpiresAt = PROMO_END_DATE.toISOString()
      promoAppliedAt = now.toISOString()
      trialStartedAt = null
      trialUsed = false // 프로모 유저는 trial 소진 안 함
      console.log('🎉 프로모션 적용')
    } else if (hasDeleteHistory && hadTrial) {
      // ✅ 재가입 + 체험판 받은 적 있으면 → free로 시작
      tier = 'free'
      premiumExpiresAt = null as any
      trialStartedAt = null
      trialUsed = false
      console.log('🚫 탈퇴 이력 + trial 사용됨 → free 시작')
    } else {
      // ✅ 일반 신규 가입 OR 탈퇴 이력 있지만 trial 미사용 → 48시간 체험판
      const trialEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000)
      premiumExpiresAt = trialEnd.toISOString()
      console.log('🎁 48시간 체험판 적용, 만료:', trialEnd.toISOString())
    }

    // ✅ users 테이블에 INSERT
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

        // ✅ 체험판
        trial_used: trialUsed,
        trial_started_at: trialStartedAt,
        
        // 기타
        created_at: pendingUser.created_at || now.toISOString(),
        last_login_at: now.toISOString(),
      })
      .select('id, tier, promo_code')
      .single()

    if (insertError) {
      console.error('❌ users 삽입 실패:', insertError)
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    console.log('✅ users 삽입 완료:', newUser.id)

    // ✅ pending_users 삭제
    const { error: deleteError } = await supabase
      .from('pending_users')
      .delete()
      .eq('email', emailLower)

    if (deleteError) {
      console.warn('⚠️ pending_users 삭제 실패 (무시)')
    }

    return NextResponse.json({
      success: true,
      isTrial: trialUsed,
      message: promoCode
        ? '🎉 프로모션이 적용되었습니다.'
        : trialUsed
          ? '🎁 48시간 프리미엄 체험이 시작되었습니다!'
          : '✅ 회원가입이 완료되었습니다.',
    })

  } catch (error) {
    console.error('❌ API 에러:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// ✅ GET: 약관 동의 상태 확인
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 })
    }

    const emailLower = email.toLowerCase()

    const { data: userData } = await supabase
      .from('users')
      .select('id, terms_agreed_at')
      .eq('email', emailLower)
      .single()

    if (userData && userData.terms_agreed_at) {
      return NextResponse.json({ termsAgreed: true, agreed: true })
    }

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
    return NextResponse.json({ termsAgreed: false }, { status: 200 })
  }
}