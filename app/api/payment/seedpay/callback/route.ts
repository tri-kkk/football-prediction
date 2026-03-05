import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('📨 [Callback] POST 요청 받음')

    // 1️⃣ Form Data 파싱
    const formData = await request.formData()
    
    const data: Record<string, any> = {}
    formData.forEach((value, key) => {
      data[key] = value
    })

    console.log('📋 [Callback] 받은 인증 결과:', {
      resultCd: data.resultCd,
      resultMsg: data.resultMsg,
      ordNo: data.ordNo,
      tid: data.tid,
    })

    // 2️⃣ 결제 결과 확인
    const resultCd = data.resultCd
    const resultMsg = data.resultMsg
    const ordNo = data.ordNo
    const tid = data.tid
    const goodsAmt = data.goodsAmt

    console.log('✅ [Callback] 결과:', { resultCd, resultMsg })

    if (resultCd !== '0000') {
      console.error('❌ [Callback] 결제 실패:', resultMsg)
      
      const { error: paymentError } = await supabase.from('payments').insert({
        order_id: ordNo,
        status: 'failed',
        tid,
        result_code: resultCd,
        result_message: resultMsg,
      })

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
      return NextResponse.redirect(
        new URL(`/premium/pricing/result?status=failed&message=${encodeURIComponent(resultMsg || '결제 실패')}`, baseUrl)
      )
    }

    console.log('✅ [Callback] 결제 성공 (resultCd: 0000)!')

    // 3️⃣ 주문 정보 조회
    console.log('💾 [Callback] payment_sessions 조회 중...')
    
    const { data: sessionData, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('order_id', ordNo)
      .single()

    if (sessionError || !sessionData) {
      console.error('❌ [DB] payment_sessions 조회 실패:', sessionError?.message)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
      return NextResponse.redirect(
        new URL(`/premium/pricing/result?status=failed&message=${encodeURIComponent('세션 데이터 없음')}`, baseUrl)
      )
    }

    console.log('✅ [DB] payment_sessions 조회 완료')

    // 4️⃣ 플랜 정보 파악
    const planAmount = parseInt(goodsAmt)
    let months = 1
    if (planAmount === 9900) months = 3
    else if (planAmount === 4900) months = 1

    console.log('💰 [Callback] 플랜 정보:', { 
      plan: months === 3 ? 'quarterly' : 'monthly', 
      months,
      amount: goodsAmt
    })

    // 5️⃣ 유저 ID 조회
    const userEmail = sessionData.user_email
    const { data: userData, error: userSelectError } = await supabase
      .from('users')
      .select('id')
      .ilike('email', userEmail)
      .single()

    if (userSelectError || !userData) {
      console.error('❌ [DB] 사용자 조회 실패:', userSelectError?.message)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
      return NextResponse.redirect(
        new URL(`/premium/pricing/result?status=failed&message=${encodeURIComponent('사용자 조회 실패')}`, baseUrl)
      )
    }

    console.log('✅ [DB] 사용자 정보 조회 완료:', userData.id)

    // 6️⃣ 결제 정보 저장
    console.log('💾 [DB] payments 테이블에 저장 시작')
    
    const goodsName = months === 3 
      ? 'TrendSoccer 프리미엄 3개월 구독' 
      : 'TrendSoccer 프리미엄 1개월 구독'

    const { error: paymentInsertError } = await supabase.from('payments').insert({
      user_id: userData.id,
      order_id: ordNo,
      status: 'success',  // ✅ 'completed' → 'success'로 변경
      tid,
      mid: data.mid,
      amount: planAmount,
      buyer_email: userEmail,
      buyer_name: data.ordNm,
      goods_name: goodsName,
      approval_number: data.appNo,
      payment_method: data.method === '01' ? 'CARD' : 'CARD',
      card_code: data.acqCardCd,
      card_name: data.fnNm,
      card_number: data.cardNo,
      nonce: data.nonce,
      order_date: new Date().toISOString(),
      result_code: resultCd,
      result_message: resultMsg,
      raw_response: data,
    })

    if (paymentInsertError) {
      console.error('❌ [DB] 결제 정보 저장 실패:', paymentInsertError.message)
    } else {
      console.log('✅ [DB] 결제 정보 저장 완료')
    }

    // 7️⃣ 구독 정보 저장
    const startDate = new Date()
    const expiresAt = new Date(startDate)
    expiresAt.setMonth(expiresAt.getMonth() + months)

    console.log('📅 [DB] 구독 유효기간 설정:', {
      startDate: startDate.toISOString(),
      expiresAt: expiresAt.toISOString(),
      months,
    })

    const { error: subError } = await supabase.from('subscriptions').insert({
      user_id: userData.id,
      plan: months === 3 ? 'quarterly' : 'monthly',
      status: 'active',
      started_at: startDate,
      expires_at: expiresAt,
      payment_id: ordNo,
      price: planAmount,
    })

    if (subError) {
      console.error('❌ [DB] 구독 정보 저장 실패:', subError.message)
    } else {
      console.log('✅ [DB] 구독 정보 저장 완료')
    }

    // 8️⃣ 사용자 정보 업데이트 (프리미엄)
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        tier: 'premium',
        premium_expires_at: expiresAt,
      })
      .eq('id', userData.id)

    if (userUpdateError) {
      console.error('❌ [DB] 사용자 정보 업데이트 실패:', userUpdateError.message)
    } else {
      console.log('✅ [DB] 사용자 정보 업데이트 완료 (tier: premium, expires_at:', expiresAt.toISOString(), ')')
    }

    // 9️⃣ 성공 페이지로 리다이렉트
    console.log('✅ [Callback] 결제 완료, 성공 페이지로 이동')
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
    return NextResponse.redirect(
      new URL(`/premium/pricing/result?status=success&amount=${planAmount}`, baseUrl)
    )

  } catch (error) {
    console.error('❌ [Callback] 오류:', error)
    return NextResponse.json(
      { error: '결제 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}