/**
 * ✅ 수정된 구독 정보 조회 API
 * 파일 위치: app/api/subscription/route.ts
 * 
 * 기능:
 * - 쿼리 파라미터의 email로 구독 정보 조회 ✅
 * - 실제 DB 데이터 반환
 * - 남은 일수 계산
 * - 세션 인증 없이 동작 (클라이언트 요청 지원)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // ✅ 쿼리 파라미터에서 email 받기
    const email = request.nextUrl.searchParams.get('email')
    
    if (!email) {
      console.warn('⚠️ Email 파라미터 없음')
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400 }
      )
    }

    console.log('🔍 구독 정보 조회 시작:', email)

    // 1️⃣ users 테이블에서 사용자 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, tier, created_at')
      .eq('email', email)
      .maybeSingle()  // 없으면 null 반환 (에러 아님)

    if (userError) {
      console.error('❌ Users 테이블 조회 에러:', userError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    // 사용자가 없으면
    if (!userData) {
      console.log('⚠️ 사용자 없음:', email)
      return NextResponse.json(
        {
          plan: 'Free',
          status: 'inactive',
          startedAt: null,
          expiresAt: null,
          tier: 'free',
          daysRemaining: null
        },
        { status: 200 }
      )
    }

    // 무료 사용자면
    if (userData.tier !== 'premium') {
      console.log('ℹ️ 무료 사용자:', email)
      return NextResponse.json(
        {
          plan: 'Free',
          status: 'inactive',
          startedAt: userData.created_at,
          expiresAt: null,
          tier: 'free',
          daysRemaining: null
        },
        { status: 200 }
      )
    }

    // 2️⃣ 프리미엄 사용자 - 활성 구독 조회
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userData.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError) {
      console.error('❌ Subscriptions 테이블 조회 에러:', subError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    // 구독이 없으면 (비정상 상황)
    if (!subscription) {
      console.log('⚠️ 활성 구독 없음:', email)
      return NextResponse.json(
        {
          plan: 'Premium',
          status: 'expired',
          startedAt: null,
          expiresAt: null,
          tier: 'premium',
          daysRemaining: null
        },
        { status: 200 }
      )
    }

    // 3️⃣ 정상 - 활성 구독 정보 반환
    const daysRemaining = calculateDaysRemaining(subscription.expires_at)

    console.log('✅ 구독 정보 조회 성공:', {
      email,
      plan: subscription.plan,
      status: subscription.status,
      expiresAt: subscription.expires_at,
      daysRemaining
    })

    return NextResponse.json(
      {
        plan: subscription.plan === 'yearly' ? 'Yearly' : 'Monthly',
        status: subscription.status,
        startedAt: subscription.started_at,
        expiresAt: subscription.expires_at,
        tier: 'premium',
        daysRemaining: daysRemaining,
        // 추가 정보
        planDetail: subscription.plan,
        price: subscription.price,
        cancelledAt: subscription.cancelled_at || null
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ API 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 남은 일수 계산
 * @param expiresAt - ISO 형식의 만료 날짜
 * @returns 남은 일수 (0 이상) 또는 null
 */
function calculateDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null

  try {
    const expireDate = new Date(expiresAt)
    const today = new Date()

    // 한국 시간대로 설정 (시간 부분은 무시)
    today.setHours(0, 0, 0, 0)
    expireDate.setHours(0, 0, 0, 0)

    // 밀리초 단위 차이
    const diffTime = expireDate.getTime() - today.getTime()
    
    // 일 단위로 변환 (올림)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // 음수도 반환 (만료됨을 표시하기 위해)
    return diffDays
  } catch (error) {
    console.error('날짜 계산 에러:', error)
    return null
  }
}