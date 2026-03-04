import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// 플랜별 설정
const PLAN_CONFIG: Record<string, { plan: string; months: number }> = {
  4900: { plan: 'monthly', months: 1 },
  9900: { plan: 'quarterly', months: 3 },
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 [Approval] 승인 요청 받음')

    // 1. 유저 인증 확인
    const session = await getServerSession()
    if (!session?.user?.email) {
      console.error('❌ 로그인 필요')
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 2. SeedPay 응답 데이터 파싱
    const body = await request.json()
    const data = body as Record<string, string>

    console.log('📦 [Approval] 수신 데이터:', {
      resultCd: data.resultCd,
      tid: data.tid ? '있음' : '없음',
      ordNo: data.ordNo,
      goodsAmt: data.goodsAmt,
    })

    // 3. 인증 결과 확인
    if (data.resultCd !== '0000') {
      console.error('❌ 결제 인증 실패:', data.resultMsg)
      return NextResponse.json({ 
        success: false, 
        error: data.resultMsg || '결제 인증 실패',
        code: data.resultCd
      }, { status: 400 })
    }

    // 4. SeedPay 환경변수 검증
    const merchantKey = process.env.SEEDPAY_MERCHANT_KEY
    const mid = process.env.SEEDPAY_MID

    if (!merchantKey || !mid) {
      console.error('❌ SeedPay 환경변수 누락')
      return NextResponse.json({ 
        success: false,
        error: '서버 설정 오류'
      }, { status: 500 })
    }

    console.log('✅ [Approval] 인증 성공, 이제 승인 요청...')

    // 5. 승인 요청
    const approvalHash = crypto
      .createHash('sha256')
      .update(mid + data.ediDate + data.goodsAmt + merchantKey)
      .digest('hex')

    const approvalParams = new URLSearchParams({
      nonce: data.nonce,
      tid: data.tid,
      mid: mid,
      goodsAmt: data.goodsAmt,
      ediDate: data.ediDate,
      mbsReserved: data.mbsReserved || '',
      hashString: approvalHash,
      payData: data.payData || '',
    })

    const approvalResponse = await fetch(
      'https://pay.seedpayments.co.kr/payment/v1/approval',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: approvalParams.toString(),
      }
    )

    const approvalData = await approvalResponse.json()

    console.log('📋 [Approval] SeedPay 응답:', {
      resultCd: approvalData.resultCd,
      tid: approvalData.tid ? '있음' : '없음',
    })

    // 6. 승인 실패 처리
    if (approvalData.resultCd !== '0000') {
      console.error('❌ 결제 승인 실패:', approvalData.resultMsg)
      
      await supabase.from('payments').upsert({
        order_id: data.ordNo,
        status: 'failed',
        result_code: approvalData.resultCd,
        result_message: approvalData.resultMsg,
        mid: mid,
        tid: data.tid,
        amount: parseInt(data.goodsAmt) || 0,
        payment_method: data.method,
        raw_response: JSON.stringify(approvalData),
      }, { onConflict: 'order_id' })

      return NextResponse.json({ 
        success: false,
        error: approvalData.resultMsg || '승인 실패'
      }, { status: 400 })
    }

    console.log('✅ [Approval] 승인 완료!')

    // 7. 결제 성공 처리
    const amount = parseInt(data.goodsAmt) || 0
    const planInfo = PLAN_CONFIG[amount]

    if (!planInfo) {
      console.error('❌ 잘못된 금액:', amount)
      return NextResponse.json({ 
        success: false,
        error: '잘못된 결제 금액'
      }, { status: 400 })
    }

    // 8. DB 저장 - Payments
    const { error: payError } = await supabase.from('payments').upsert({
      order_id: data.ordNo,
      status: 'success',
      payment_method: data.method,
      amount,
      tid: data.tid,
      mid: mid,
      approval_number: approvalData.appNo,
      result_code: approvalData.resultCd,
      result_message: approvalData.resultMsg,
      goods_name: data.goodsNm,
      buyer_name: data.ordNm,
      user_email: session.user.email,
      raw_response: JSON.stringify(approvalData),
    }, { onConflict: 'order_id' })

    if (payError) {
      console.error('❌ payments 저장 실패:', payError)
      return NextResponse.json({
        success: false,
        error: 'DB 저장 실패'
      }, { status: 500 })
    }

    console.log('✅ [Approval] payments 저장 완료')

    // 9. 유저 구독 처리
    const { data: user } = await supabase
      .from('users')
      .select('id, tier, premium_expires_at')
      .eq('email', session.user.email)
      .single()

    if (!user) {
      console.error('❌ 사용자를 찾을 수 없음:', session.user.email)
      return NextResponse.json({
        success: false,
        error: '사용자 정보 오류'
      }, { status: 404 })
    }

    const now = new Date()
    let startDate = now
    
    if (user.tier === 'premium' && user.premium_expires_at) {
      const currentExpiry = new Date(user.premium_expires_at)
      if (currentExpiry > now) {
        startDate = currentExpiry
      }
    }
    
    const expiresAt = new Date(startDate)
    expiresAt.setMonth(expiresAt.getMonth() + planInfo.months)

    // 10. Subscriptions 추가
    const { error: subError } = await supabase.from('subscriptions').insert({
      user_id: user.id,
      plan: planInfo.plan,
      status: 'active',
      price: amount,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      payment_id: data.ordNo,
      currency: 'KRW',
    })

    if (subError) {
      console.error('❌ subscriptions 저장 실패:', subError)
      return NextResponse.json({
        success: false,
        error: '구독 등록 실패'
      }, { status: 500 })
    }

    console.log('✅ [Approval] subscriptions 저장 완료')

    // 11. Users 업데이트
    const { error: userError } = await supabase
      .from('users')
      .update({
        tier: 'premium',
        premium_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id)

    if (userError) {
      console.error('❌ users 업데이트 실패:', userError)
      return NextResponse.json({
        success: false,
        error: '사용자 업데이트 실패'
      }, { status: 500 })
    }

    console.log('✅ [Approval] users 업데이트 완료')

    // 12. 성공 응답
    return NextResponse.json({
      success: true,
      message: '구독이 활성화되었습니다.',
      tier: 'premium',
      expiresAt: expiresAt.toISOString(),
      plan: planInfo.plan,
    })

  } catch (error) {
    console.error('❌ [Approval] 오류:', error)
    return NextResponse.json({ 
      success: false,
      error: '서버 오류 발생'
    }, { status: 500 })
  }
}
