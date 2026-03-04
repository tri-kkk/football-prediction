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

async function handleCallback(data: Record<string, string>, request?: NextRequest) {
  try {
    console.log('📨 [Callback] POST 데이터 수신 완료')
    console.log('📋 [Callback] 받은 데이터:', {
      resultCd: data.resultCd,
      resultMsg: data.resultMsg,
      ordNo: data.ordNo,
      tid: data.tid || '없음',
      goodsAmt: data.goodsAmt,
      ediDate: data.ediDate || '없음',
      initEdiDate: data.initEdiDate || '없음',
      returnUrl: data.returnUrl || '없음',
      mbsReserved: data.mbsReserved ? data.mbsReserved.substring(0, 50) + '...' : '없음',
    })

    // 인증 실패 처리
    if (data.resultCd !== '0000') {
      console.error('❌ [Callback] 결제 인증 실패:', data.resultMsg)
      return { error: data.resultMsg || '결제 실패', status: 400 }
    }

    console.log('✅ [Callback] 인증 성공 (resultCd: 0000), 승인 요청 준비 중...')

    // ✅ mbsReserved에서 initEdiDate 추출
    let initEdiDateFromMbs = ''
    try {
      const reserved = JSON.parse(data.mbsReserved || '{}')
      initEdiDateFromMbs = reserved.initEdiDate || ''
      console.log('📦 [Callback] mbsReserved에서 initEdiDate 추출:', initEdiDateFromMbs)
    } catch (e) {
      console.log('⚠️ [Callback] mbsReserved 파싱 실패')
    }

    // ✅ ediDate 검증 (필수!)
    // 1. mbsReserved에서 받은 Init의 ediDate (우선)
    // 2. URL 파라미터의 initEdiDate
    // 3. Form data의 SeedPay ediDate
    let ediDate = initEdiDateFromMbs || data.initEdiDate || data.ediDate
    
    if (!ediDate) {
      console.error('❌ [Callback] ediDate 없음 - Hash 검증 불가')
      return { error: 'ediDate 누락', status: 400 }
    }
    
    console.log('✅ [Callback] ediDate 확인:', ediDate, '(source:', initEdiDateFromMbs ? 'mbsReserved' : data.initEdiDate ? 'URL' : 'SeedPay', ')')

    // SeedPay 환경변수
    const merchantKey = process.env.SEEDPAY_MERCHANT_KEY
    const mid = process.env.SEEDPAY_MID

    if (!merchantKey || !mid) {
      console.error('❌ SeedPay 환경변수 누락')
      return { error: '설정 오류', status: 500 }
    }

    // 🔍 Merchant Key 검증 로깅
    console.log('🔐 Merchant Key 검증:', {
      length: merchantKey.length,
      first20: merchantKey.substring(0, 20),
      last20: merchantKey.substring(merchantKey.length - 20),
      isBase64: /^[A-Za-z0-9+/=]+$/.test(merchantKey),
      has_equals: merchantKey.includes('='),
      has_plus: merchantKey.includes('+'),
      has_slash: merchantKey.includes('/'),
    })

    // ✅ payData 추출 (필수 필드!)
    // returnData에는 payData가 없으므로 subData에서 추출
    let payData = data.payData || ''
    
    if (!payData && data.subData) {
      try {
        const subData = typeof data.subData === 'string' 
          ? JSON.parse(data.subData) 
          : data.subData
        payData = subData.pgEncData || ''
        console.log('📦 [Approval] subData에서 payData 추출 완료')
      } catch (e) {
        console.error('❌ subData 파싱 실패:', e)
        payData = ''
      }
    }

    // ✅ SeedPay가 hashString을 보내지 않으면 직접 계산
    let approvalHash = data.hashString
    
    if (!approvalHash) {
      console.log('⚠️ [Approval] SeedPay가 hashString을 보내지 않음, 직접 계산')
      
      // 🔍 Hash 입력값 상세 로깅
      const hashInput = mid + ediDate + data.goodsAmt + merchantKey
      console.log('🔐 [Approval] Hash 입력값 상세:', {
        mid: `"${mid}"`,
        ediDate: `"${ediDate}"`,
        goodsAmt: `"${data.goodsAmt}"`,
        merchantKeyLength: merchantKey.length,
        merchantKeyFirst20: merchantKey.substring(0, 20),
        totalInputLength: hashInput.length,
        hashInputPreview: hashInput.substring(0, 50) + '...' + hashInput.substring(hashInput.length - 20),
      })
      
      approvalHash = crypto
        .createHash('sha256')
        .update(hashInput)
        .digest('hex')
      
      console.log('🔐 [Approval] 해시 생성:', {
        hashInput: `${mid} + ${ediDate} + ${data.goodsAmt} + ***merchantKey***`,
        hashString: approvalHash,
      })
    } else {
      console.log('🔐 [Approval] 해시 사용 (SeedPay에서 받음):', {
        hashString: approvalHash.substring(0, 20) + '...',
      })
    }

    console.log('📤 [Approval] 승인 요청 전송 (JSON):', {
      nonce: data.nonce ? '있음' : '없음',
      tid: '있음',
      mId: mid.substring(0, 5) + '***',
      amount: data.goodsAmt,
      orderId: data.ordNo,
      orderName: data.goodsNm ? data.goodsNm.substring(0, 10) + '...' : '없음',
      payData: payData ? '있음' : '없음',
    })

    // ✅ SeedPay 정확한 필드명
    const approvalBody = {
      nonce: data.nonce,
      tid: data.tid,
      ediDate: ediDate,
      mId: mid,
      amount: data.goodsAmt,
      orderId: data.ordNo,
      orderName: data.goodsNm,
      customerName: data.ordNm,
      hashString: approvalHash,
      payData: payData,
      mbsReserved: data.mbsReserved || '',
    }

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

    console.log('✅ [Callback] 승인 완료! (resultCd: 0000)')

    // 결제 성공 처리
    const amount = parseInt(data.goodsAmt) || 0
    console.log('💰 [Callback] 결제 금액:', amount)

    const planInfo = PLAN_CONFIG[amount]

    if (!planInfo) {
      console.error('❌ [Callback] 잘못된 금액:', amount)
      return { error: '잘못된 결제 금액', status: 400 }
    }

    console.log('✅ [Callback] 플랜 정보 확인:', planInfo)

    // DB 저장 - Payments
    console.log('💾 [DB] payments 테이블에 저장 시작:', {
      ordNo: data.ordNo,
      status: 'success',
      tid: data.tid,
      appNo: approvalData.appNo,
    })

    const { error: payError } = await supabase.from('payments').upsert({
      order_id: data.ordNo,
      status: 'success',
      payment_method: data.method,
      amount,
      tid: data.tid,
      mid: mid,
      approval_number: String(approvalData.appNo),  // ✅ 문자열로 명시 변환
      result_code: approvalData.resultCd,
      result_message: approvalData.resultMsg,
      goods_name: data.goodsNm,
      buyer_name: data.ordNm,
      buyer_email: data.ordEmail,  // ✅ user_email → buyer_email
      raw_response: JSON.stringify(approvalData),
    }, { onConflict: 'order_id' })

    if (payError) {
      console.error('❌ [DB] payments 저장 실패:', payError)
      return { error: 'DB 저장 실패', status: 500 }
    }

    console.log('✅ [DB] payments 저장 완료')

    // 유저 구독 처리
    const userEmail = data.ordEmail
    console.log('👤 [DB] 구매자 이메일:', userEmail)

    if (!userEmail) {
      console.error('❌ [DB] 사용자 이메일 없음')
      return { error: '사용자 정보 오류', status: 400 }
    }

    console.log('🔍 [DB] users 테이블에서 유저 검색:', userEmail)
    const { data: user } = await supabase
      .from('users')
      .select('id, tier, premium_expires_at')
      .eq('email', userEmail)
      .single()

    if (!user) {
      console.error('❌ [DB] 사용자를 찾을 수 없음:', userEmail)
      return { error: '사용자 정보 오류', status: 404 }
    }

    console.log('✅ [DB] 유저 정보 조회 완료:', {
      userId: user.id,
      tier: user.tier,
      premiumExpiresAt: user.premium_expires_at,
    })

    const now = new Date()
    let startDate = now
    
    if (user.tier === 'premium' && user.premium_expires_at) {
      const currentExpiry = new Date(user.premium_expires_at)
      if (currentExpiry > now) {
        startDate = currentExpiry
        console.log('ℹ️ [DB] 기존 구독 연장:', startDate)
      }
    }
    
    const expiresAt = new Date(startDate)
    expiresAt.setMonth(expiresAt.getMonth() + planInfo.months)

    console.log('📅 [DB] 구독 유효기간 설정:', {
      startDate: startDate.toISOString(),
      expiresAt: expiresAt.toISOString(),
      months: planInfo.months,
    })

    // Subscriptions 추가
    console.log('💾 [DB] subscriptions 테이블에 저장 시작')
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
      console.error('❌ [DB] subscriptions 저장 실패:', subError)
      return { error: '구독 등록 실패', status: 500 }
    }

    console.log('✅ [DB] subscriptions 저장 완료')

    // Users 업데이트
    console.log('💾 [DB] users 테이블 업데이트 시작:', {
      userId: user.id,
      newTier: 'premium',
      premiumExpiresAt: expiresAt.toISOString(),
    })

    const { error: userError } = await supabase
      .from('users')
      .update({
        tier: 'premium',
        premium_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id)

    if (userError) {
      console.error('❌ [DB] users 업데이트 실패:', userError)
      return { error: '사용자 업데이트 실패', status: 500 }
    }

    console.log('✅ [DB] users 업데이트 완료, 구독 만료:', expiresAt.toISOString())

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
    
    // 🔍 returnUrl과 쿼리 파라미터 로깅
    console.log('🔍 [Callback] 요청 URL:', request.nextUrl.toString())
    console.log('🔍 [Callback] 쿼리 파라미터:', {
      params: request.nextUrl.searchParams.toString(),
      initEdiDate: request.nextUrl.searchParams.get('initEdiDate'),
    })
    
    const formData = await request.formData()
    const data: Record<string, string> = {}
    
    formData.forEach((value, key) => {
      data[key] = value as string
    })
    
    // 🔍 Form data의 returnUrl 확인
    console.log('🔍 [Callback] Form returnUrl:', data.returnUrl)
    console.log('🔍 [Callback] Form mbsReserved:', data.mbsReserved ? data.mbsReserved.substring(0, 50) + '...' : '없음')
    
    // ✅ URL 파라미터에서 initEdiDate 받기
    const initEdiDate = request.nextUrl.searchParams.get('initEdiDate')
    if (initEdiDate) {
      data.initEdiDate = initEdiDate
      console.log('✅ [Callback] URL에서 initEdiDate 받음:', initEdiDate)
    } else {
      console.warn('⚠️ [Callback] URL에서 initEdiDate 없음')
    }

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