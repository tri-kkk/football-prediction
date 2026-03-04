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

async function handleCallback(data: Record<string, string>) {
  try {
    console.log('📨 [Callback] 결제 데이터 수신:', {
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
      return { error: '설정 오류', status: 500 }
    }

    const calculatedSignData = crypto
      .createHash('sha256')
      .update(data.tid + data.mid + data.ediDate + data.goodsAmt + data.ordNo + merchantKey)
      .digest('hex')

    if (data.signData !== calculatedSignData) {
      console.error('❌ signData 검증 실패')
      return { error: '결제 검증 실패', status: 400 }
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

      return { error: data.resultMsg || '결제실패', status: 400 }
    }

    console.log('✅ 결제 인증 완료, 이제 승인 요청...')

    // ✅ STEP 4-6: 결제 승인 요청
    // Hash: mid + ediDate + goodsAmt + merchantKey (공식 샘플 기준)
    const approvalHash = crypto
      .createHash('sha256')
      .update(mid + data.ediDate + data.goodsAmt + merchantKey)
      .digest('hex')

    console.log('🔐 [Approval] Hash 계산:', {
      mid,
      ediDate: data.ediDate,
      goodsAmt: data.goodsAmt,
      hashString: approvalHash,
    })

    // form-urlencoded로 전송 (공식 샘플과 동일)
    const approvalParams = new URLSearchParams({
      nonce: data.nonce,
      tid: data.tid,
      mid: mid,                         // ← mid (mId 아님!)
      goodsAmt: data.goodsAmt,          // ← goodsAmt (amount 아님!)
      ediDate: data.ediDate,
      mbsReserved: data.mbsReserved || '',
      hashString: approvalHash,
      payData: data.payData || '',
    })

    console.log('📤 [Approval] 승인 요청 전송:', {
      url: 'https://pay.seedpayments.co.kr/payment/v1/approval',
      contentType: 'application/x-www-form-urlencoded',
      params: approvalParams.toString().substring(0, 100) + '...',
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

    console.log('📋 [Approval] SeedPay 승인 결과:', {
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

      return { error: approvalData.resultMsg || '승인실패', status: 400 }
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

    return { success: true, ordNo: data.ordNo }

  } catch (error) {
    console.error('❌ Callback 처리 중 오류:', error)
    return { error: '서버 오류', status: 500 }
  }
}

// ✅ GET 요청 처리
export async function GET(request: NextRequest) {
  try {
    console.log('📨 [Callback] GET 요청 받음!')
    
    const searchParams = request.nextUrl.searchParams
    const data: Record<string, string> = {}
    
    searchParams.forEach((value, key) => {
      data[key] = value
    })

    const result = await handleCallback(data)

    if (result.success) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
      return NextResponse.redirect(
        `${baseUrl}/premium/pricing/result?status=success&amount=${data.goodsAmt || ''}`,
        { status: 303 }
      )
    } else {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
      return NextResponse.redirect(
        `${baseUrl}/premium/pricing/result?status=failed&message=${encodeURIComponent(result.error || '결제실패')}`,
        { status: 303 }
      )
    }
  } catch (error) {
    console.error('❌ GET Callback error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
    return NextResponse.redirect(
      `${baseUrl}/premium/pricing/result?status=error&message=${encodeURIComponent('서버 오류')}`,
      { status: 303 }
    )
  }
}

// ✅ POST 요청 처리
export async function POST(request: NextRequest) {
  try {
    console.log('📨 [Callback] POST 요청 받음!')
    
    const formData = await request.formData()
    const data: Record<string, string> = {}
    
    formData.forEach((value, key) => {
      data[key] = value as string
    })

    const result = await handleCallback(data)

    if (result.success) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
      return NextResponse.redirect(
        `${baseUrl}/premium/pricing/result?status=success&amount=${data.goodsAmt || ''}`,
        { status: 303 }
      )
    } else {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
      return NextResponse.redirect(
        `${baseUrl}/premium/pricing/result?status=failed&message=${encodeURIComponent(result.error || '결제실패')}`,
        { status: 303 }
      )
    }
  } catch (error) {
    console.error('❌ POST Callback error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
    return NextResponse.redirect(
      `${baseUrl}/premium/pricing/result?status=error&message=${encodeURIComponent('서버 오류')}`,
      { status: 303 }
    )
  }
}