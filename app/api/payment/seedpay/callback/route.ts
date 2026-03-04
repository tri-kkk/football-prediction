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
      tid: data.tid ? '있음' : '없음',
      goodsAmt: data.goodsAmt,
    })

    // 인증 실패 처리
    if (data.resultCd !== '0000') {
      console.error('❌ 결제 인증 실패:', data.resultMsg)
      return { error: data.resultMsg || '결제 실패', status: 400 }
    }

    console.log('✅ 인증 성공, 승인 요청 중...')

    // SeedPay 환경변수
    const merchantKey = process.env.SEEDPAY_MERCHANT_KEY
    const mid = process.env.SEEDPAY_MID

    if (!merchantKey || !mid) {
      console.error('❌ SeedPay 환경변수 누락')
      return { error: '설정 오류', status: 500 }
    }

    // ✅ 공식 문서 기준: hashString = SHA256(tid + mId + ediDate + amount + orderId + merchantKey)
    // 근데 orderId가 뭔가? ordNo인 것 같음
    const approvalHash = crypto
      .createHash('sha256')
      .update(data.tid + mid + data.ediDate + data.goodsAmt + data.ordNo + merchantKey)
      .digest('hex')

    console.log('🔐 [Approval] 해시 생성:', {
      hashInput: `${data.tid} + ${mid} + ${data.ediDate} + ${data.goodsAmt} + ${data.ordNo} + ***key***`,
      hashString: approvalHash.substring(0, 20) + '...',
    })

    // ✅ 공식 문서 기준으로 수정
    const approvalBody = {
      nonce: data.nonce,
      tid: data.tid,
      ediDate: data.ediDate,
      mId: mid,                // ← mid 아니라 mId!
      amount: data.goodsAmt,   // ← goodsAmt 아니라 amount!
      hashString: approvalHash,
      payData: data.payData || '',
      mbsReserved: data.mbsReserved || '',
    }

    console.log('📤 [Approval] 승인 요청 전송 (JSON):', {
      nonce: '있음',
      tid: '있음',
      mId: mid.substring(0, 5) + '***',
      amount: data.goodsAmt,
    })

    // ✅ Content-Type: application/json (공식 기준)
    const approvalResponse = await fetch(
      'https://pay.seedpayments.co.kr/payment/v1/approval',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalBody),
      }
    )

    const approvalData = await approvalResponse.json()

    console.log('📋 [Approval] SeedPay 응답:', {
      resultCd: approvalData.resultCd,
      resultMsg: approvalData.resultMsg,
      appNo: approvalData.appNo ? '있음' : '없음',
    })

    // 승인 실패 처리
    if (approvalData.resultCd !== '0000') {
      console.error('❌ 승인 실패:', approvalData.resultMsg)
      
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

      return { error: approvalData.resultMsg || '승인 실패', status: 400 }
    }

    console.log('✅ 승인 완료!')

    // 결제 성공 처리
    const amount = parseInt(data.goodsAmt) || 0
    const planInfo = PLAN_CONFIG[amount]

    if (!planInfo) {
      console.error('❌ 잘못된 금액:', amount)
      return { error: '잘못된 결제 금액', status: 400 }
    }

    // DB 저장 - Payments
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
      user_email: data.ordEmail,
      raw_response: JSON.stringify(approvalData),
    }, { onConflict: 'order_id' })

    if (payError) {
      console.error('❌ payments 저장 실패:', payError)
      return { error: 'DB 저장 실패', status: 500 }
    }

    console.log('✅ payments 저장 완료')

    // 유저 구독 처리
    const userEmail = data.ordEmail
    if (!userEmail) {
      console.error('❌ 사용자 이메일 없음')
      return { error: '사용자 정보 오류', status: 400 }
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, tier, premium_expires_at')
      .eq('email', userEmail)
      .single()

    if (!user) {
      console.error('❌ 사용자를 찾을 수 없음:', userEmail)
      return { error: '사용자 정보 오류', status: 404 }
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

    // Subscriptions 추가
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
      return { error: '구독 등록 실패', status: 500 }
    }

    console.log('✅ subscriptions 저장 완료')

    // Users 업데이트
    const { error: userError } = await supabase
      .from('users')
      .update({
        tier: 'premium',
        premium_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id)

    if (userError) {
      console.error('❌ users 업데이트 실패:', userError)
      return { error: '사용자 업데이트 실패', status: 500 }
    }

    console.log('✅ users 업데이트 완료, 만료:', expiresAt.toISOString())

    return { success: true, ordNo: data.ordNo }

  } catch (error) {
    console.error('❌ Callback 처리 중 오류:', error)
    return { error: '서버 오류', status: 500 }
  }
}

// ✅ GET 요청 처리
export async function GET(request: NextRequest) {
  try {
    console.log('📨 [Callback] GET 요청 받음')
    
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
    console.log('📨 [Callback] POST 요청 받음')
    
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

// ✅ OPTIONS 요청 처리 (CORS preflight)
export async function OPTIONS(request: NextRequest) {
  console.log('📨 [Callback] OPTIONS 요청 받음 (CORS preflight)')
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}