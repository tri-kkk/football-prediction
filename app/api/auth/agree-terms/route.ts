import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 🎉 프로모션 기간 설정
const PROMO_END_DATE = new Date('2026-02-01T00:00:00+09:00')

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

    const { agreedTerms, agreedPrivacy, agreedMarketing } = await request.json()

    // 필수 약관 체크
    if (!agreedTerms || !agreedPrivacy) {
      return NextResponse.json(
        { error: '필수 약관에 동의해주세요.' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const email = session.user.email

    // 현재 사용자 정보 가져오기
    const { data: userData } = await supabase
      .from('users')
      .select('pending_promo, terms_agreed_at')
      .eq('email', email)
      .single()

    // 이미 동의한 경우
    if (userData?.terms_agreed_at) {
      return NextResponse.json(
        { message: '이미 약관에 동의하셨습니다.' },
        { status: 200 }
      )
    }

    // 프로모션 적용 여부 결정
    const isPromoPeriod = new Date() < PROMO_END_DATE
    const pendingPromo = userData?.pending_promo
    const applyPromo = pendingPromo && isPromoPeriod

    // 업데이트 데이터 구성
    const updateData: Record<string, unknown> = {
      terms_agreed_at: now,
      privacy_agreed_at: now,
      marketing_agreed: agreedMarketing || false,
      marketing_agreed_at: agreedMarketing ? now : null,
      pending_promo: null,  // 프로모션 대기 상태 해제
    }

    // 프로모션 적용
    if (applyPromo) {
      updateData.tier = 'premium'
      updateData.premium_expires_at = PROMO_END_DATE.toISOString()
      updateData.promo_code = pendingPromo
      console.log(`🎉 Promo applied for ${email}: ${pendingPromo}`)
    }

    // DB 업데이트
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('email', email)

    if (error) {
      console.error('Terms agreement update error:', error)
      return NextResponse.json(
        { error: '처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    console.log(`✅ Terms agreed: ${email}`)

    return NextResponse.json({
      success: true,
      message: '약관 동의가 완료되었습니다.',
      promoApplied: applyPromo,
    })

  } catch (error) {
    console.error('Terms agreement error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}