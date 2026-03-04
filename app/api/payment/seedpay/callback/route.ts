import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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
    console.log('📨 [Callback] POST 요청 받음!')
    console.log('📨 [Callback] URL:', request.url)
    console.log('📨 [Callback] Method:', request.method)
    
    const formData = await request.formData()

    const data: Record<string, string> = {}
    formData.forEach((value, key) => {
      data[key] = value as string
    })

    console.log('📨 [Callback] Form Data 수신 완료')
    console.log('📨 [Callback] Data:', {
      resultCd: data.resultCd,
      resultMsg: data.resultMsg,
      ordNo: data.ordNo,
      tid: data.tid,
      goodsAmt: data.goodsAmt,
      nonce: data.nonce ? '있음' : '없음',
      payData: data.payData ? '있음' : '없음',
      method: data.method,
      mid: data.mid,
    })

    console.log('📋 SeedPay 인증 결과:', {
      resultCd: data.resultCd,
      resultMsg: data.resultMsg,
      ordNo: data.ordNo,
      tid: data.tid,
      goodsAmt: data.goodsAmt,
    })

    // 🔒 1. signData 검증
    const merchantKey = process.env.SEEDPAY_MERCHANT_KEY
    const mid = process.env.SEEDPAY_MID
    
    if (!merchantKey || !mid) {
      console.error('❌ SeedPay 환경변수 누락')
      return NextResponse.json({ error: '설정 오류' }, { status: 500 })
    }

    const calculatedSignData = crypto
      .createHash('sha256')
      .update(data.tid + data.mid + data.ediDate + data.goodsAmt + data.ordNo + merchantKey)
      .digest('hex')

    if (data.signData !== calculatedSignData) {
      console.error('❌ signData 검증 실패')
      return NextResponse.json({ 
        error: '결제 검증 실패',
        code: 'SIGNATURE_MISMATCH'
      }, { status: 400 })
    }

    console.log('✅ signData 검증 완료')

    // 2. 인증 실패 처리
    if (data.resultCd !== '0000') {
      console.error('❌ 결제 인증 실패:', data.resultMsg)
      
      await supabase.from('payments').upsert({
        order_id: data.ordNo,
        status: 'failed',
        result_code: data.resultCd,
        result_message: data.resultMsg,
        mid: data.mid,
        tid: data.tid,
        amount: parseInt(data.goodsAmt) || 0,
        payment_method: data.method,
        raw_response: JSON.stringify(data),
      }, { onConflict: 'order_id' })

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
      return NextResponse.redirect(
        `${baseUrl}/premium/pricing/result?status=failed&message=${encodeURIComponent(data.resultMsg || '결제실패')}`,
        { status: 303 }
      )
    }

    console.log('✅ 결제 인증 완료, 이제 승인 요청...')

    // ✅ STEP 4-6: 결제 승인 요청
    // Hash: mid + ediDate + amount + merchantKey (공식 샘플 기준)
    const approvalHash = crypto
      .createHash('sha256')
      .update(mid + data.ediDate + data.goodsAmt + merchantKey)
      .digest('hex')

    const approvalResponse = await fetch(
      'https://pay.seedpayments.co.kr/payment/v1/approval',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nonce: data.nonce,
          tid: data.tid,
          ediDate: data.ediDate,
          mId: mid,
          amount: data.goodsAmt,
          hashString: approvalHash,
          payData: data.payData || '',
          mbsReserved: data.mbsReserved || '',
        }),
      }
    )

    const approvalData = await approvalResponse.json()

    console.log('📋 SeedPay 승인 결과:', {
      resultCd: approvalData.resultCd,
      resultMsg: approvalData.resultMsg,
      appNo: approvalData.appNo,
    })

    // 승인 실패 처리
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

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
      return NextResponse.redirect(
        `${baseUrl}/premium/pricing/result?status=failed&message=${encodeURIComponent(approvalData.resultMsg || '승인실패')}`,
        { status: 303 }
      )
    }

    console.log('✅ 결제 승인 완료!')

    // 3. 결제 성공 처리
    const amount = parseInt(data.goodsAmt) || 0
    const planInfo = PLAN_CONFIG[amount]

    let userEmail = ''
    try {
      const reserved = JSON.parse(data.mbsReserved || '{}')
      userEmail = reserved.email || ''
    } catch {
      userEmail = data.mbsReserved || ''
    }

    console.log('✅ 결제 성공:', {
      tid: data.tid,
      ordNo: data.ordNo,
      amount,
      plan: planInfo?.plan,
      email: userEmail,
    })

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
      raw_response: JSON.stringify(approvalData),
    }, { onConflict: 'order_id' })

    if (payError) console.error('❌ payments 저장 실패:', payError)
    else console.log('✅ payments 저장 완료')

    // 4. 유저 조회 및 구독 처리
    if (userEmail && planInfo) {
      const { data: user } = await supabase
        .from('users')
        .select('id, tier, premium_expires_at')
        .eq('email', userEmail)
        .single()

      if (user) {
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

        if (subError) console.error('❌ subscriptions 저장 실패:', subError)
        else console.log('✅ subscriptions 저장 완료')

        const { error: userError } = await supabase
          .from('users')
          .update({
            tier: 'premium',
            premium_expires_at: expiresAt.toISOString(),
          })
          .eq('id', user.id)

        if (userError) console.error('❌ users 업데이트 실패:', userError)
        else console.log('✅ users tier=premium 업데이트 완료, 만료:', expiresAt.toISOString())

        await supabase.from('payments')
          .update({ user_id: user.id })
          .eq('order_id', data.ordNo)
      }
    }

    // 5. 성공 페이지로 리다이렉트
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
    return NextResponse.redirect(
      `${baseUrl}/premium/pricing/result?status=success&amount=${data.goodsAmt || ''}`,
      { status: 303 }
    )

  } catch (error) {
    console.error('❌ SeedPay callback error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
    return NextResponse.redirect(
      `${baseUrl}/premium/pricing/result?status=error&message=${encodeURIComponent('서버 오류')}`,
      { status: 303 }
    )
  }
}