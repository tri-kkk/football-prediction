import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // 1. 유저 인증 확인
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 2. 플랜 확인
    const { plan } = await request.json()
    
    const planConfig: Record<string, { amount: number; name: string; months: number }> = {
      monthly: { amount: 4900, name: 'TrendSoccer 프리미엄 1개월 구독', months: 1 },
      quarterly: { amount: 9900, name: 'TrendSoccer 프리미엄 3개월 구독', months: 3 },
    }

    const selected = planConfig[plan]
    if (!selected) {
      return NextResponse.json({ error: '잘못된 플랜입니다.' }, { status: 400 })
    }

    // 3. SeedPay 환경변수 검증
    const mid = process.env.SEEDPAY_MID
    const merchantKey = process.env.SEEDPAY_MERCHANT_KEY

    if (!mid || !merchantKey) {
      console.error('❌ SeedPay 환경변수 누락')
      return NextResponse.json({ 
        error: 'SeedPay 설정 오류',
        code: 'CONFIG_ERROR'
      }, { status: 500 })
    }

    // 4. SeedPay /payment/v1/view/request 호출 파라미터 생성
    const now = new Date()
    const ediDate = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0')

    // 주문번호 생성 (Unique)
    const ordNo = `TS${Date.now()}${Math.floor(Math.random() * 1000)}`
    const goodsAmt = selected.amount.toString()

    // SHA-256 해시 (Init 해시: mid + ediDate + goodsAmt + key)
    const hashString = crypto
      .createHash('sha256')
      .update(mid + ediDate + goodsAmt + merchantKey)
      .digest('hex')

    console.log('🔐 [Init] Hash 계산:', {
      mid,
      ediDate,
      goodsAmt,
      merchantKeyLength: merchantKey?.length || 0,
      hashInput: mid + ediDate + goodsAmt + '***merchantKey***',
      hashString,
    })

    // 5. SeedPay /payment/v1/view/request 호출
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
    const returnUrl = `${baseUrl}/api/payment/seedpay/callback`

    const viewRequestBody = new URLSearchParams()
    viewRequestBody.append('method', 'CARD')
    viewRequestBody.append('mid', mid)
    viewRequestBody.append('goodsNm', selected.name)
    viewRequestBody.append('ordNo', ordNo)
    viewRequestBody.append('goodsAmt', goodsAmt)
    viewRequestBody.append('ordNm', session.user.name || '구매자')
    viewRequestBody.append('ordEmail', session.user.email)
    viewRequestBody.append('returnUrl', returnUrl)
    //viewRequestBody.append('ediDate', ediDate)
    //viewRequestBody.append('hashString', hashString)

    console.log('📤 [Init] /payment/v1/view/request 호출:', {
      mid,
      ordNo,
      goodsAmt,
      ediDate,
      returnUrl,
    })

    const viewRequestResponse = await fetch('https://pay.seedpayments.co.kr/payment/v1/view/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: viewRequestBody.toString(),
    })

    console.log('📋 [Init] /payment/v1/view/request 응답 상태:', viewRequestResponse.status)

    const contentType = viewRequestResponse.headers.get('content-type')
    console.log('📋 [Init] Response Content-Type:', contentType)

    // ✅ Body를 한 번만 읽기 (text로 먼저 읽음)
    const responseText = await viewRequestResponse.text()
    console.log('📋 [Init] 응답 내용 길이:', responseText.length)
    console.log('📋 [Init] 응답 첫 200자:', responseText.substring(0, 200))

    if (!viewRequestResponse.ok) {
      console.error('❌ [Init] /payment/v1/view/request 실패:', {
        status: viewRequestResponse.status,
        responsePreview: responseText.substring(0, 300),
      })
      return NextResponse.json({ 
        error: 'SeedPay 결제창 요청 실패',
        status: viewRequestResponse.status,
        details: responseText.substring(0, 200)
      }, { status: 500 })
    }

    // ✅ HTML 결제 페이지면 그대로 반환
    if (contentType?.includes('text/html')) {
      console.log('✅ [Init] HTML 결제 페이지 반환중...')
      
      // ✅ 상대 경로를 절대 경로로 변환 (Blob URL에서 작동하도록)
      let html = responseText
      
      // /로 시작하는 상대 경로를 SeedPay 절대 경로로 변환
      html = html.replace(/href="\/([^/])/g, 'href="https://pay.seedpayments.co.kr/$1')
      html = html.replace(/src="\/([^/])/g, 'src="https://pay.seedpayments.co.kr/$1')
      
      console.log('✅ [Init] 상대 경로를 절대 경로로 변환 완료')
      
      // ✅ Payment Session DB에 저장 (결제 페이지 표시 전)
      console.log('💾 [Init] Payment Session 저장 시작:', ordNo)
      const { error: sessionError } = await supabase.from('payment_sessions').insert({
        order_id: ordNo,
        init_edi_date: ediDate,
        mid,
        goods_amt: goodsAmt,
        user_email: session.user.email,
        user_name: session.user.name || '구매자',
      })

      if (sessionError) {
        console.error('⚠️ [Init] Payment Session 저장 실패:', sessionError.message)
      } else {
        console.log('✅ [Init] Payment Session 저장 완료')
      }
      
      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      })
    }

    // ✅ JSON parse 시도 (만약 JSON이 오는 경우)
    let viewRequestData
    try {
      viewRequestData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ [Init] JSON parse 실패:', {
        contentType,
        status: viewRequestResponse.status,
        responsePreview: responseText.substring(0, 300),
      })
      return NextResponse.json({ 
        error: 'SeedPay 응답 처리 실패',
        contentType,
        details: responseText.substring(0, 300)
      }, { status: 500 })
    }

    console.log('✅ [Init] /payment/v1/view/request 응답:', {
      nonce: viewRequestData.nonce ? '있음' : '없음',
      tid: viewRequestData.tid ? '있음' : '없음',
      payData: viewRequestData.payData ? '있음' : '없음',
      approvalUrl: viewRequestData.approvalUrl ? '있음' : '없음',
      signData: viewRequestData.signData ? '있음' : '없음',
    })

    // 6. Payment Session DB에 저장 (JSON 응답인 경우)
    console.log('💾 [Init] Payment Session 저장 시작:', ordNo)
    const { error: sessionError } = await supabase.from('payment_sessions').insert({
      order_id: ordNo,
      init_edi_date: ediDate,
      mid,
      goods_amt: goodsAmt,
      user_email: session.user.email,
      user_name: session.user.name || '구매자',
      nonce: viewRequestData.nonce,
      approval_url: viewRequestData.approvalUrl,
    })

    if (sessionError) {
      console.error('⚠️ [Init] Payment Session 저장 실패 (계속 진행):', sessionError.message)
    } else {
      console.log('✅ [Init] Payment Session 저장 완료')
    }

    // 약관 데이터
    const terms = [
      {
        termTitle: '전자금융거래 기본약관',
        termContents: '/html/term/term1.html'
      },
      {
        termTitle: '개인정보의 수집 및 이용안내',
        termContents: '/html/term/term2.html'
      },
      {
        termTitle: '개인정보제공 및 위탁동의',
        termContents: '/html/term/term3.html'
      },
      {
        termTitle: '에스크로 서비스 이용약관',
        termContents: '/html/term/term4.html'
      }
    ]

    // ✅ JSON 응답 (API 호출 결과)
    return NextResponse.json({
      success: true,
      
      // === 약관 데이터 ===
      terms,
      
      // === SeedPay /payment/v1/view/request 응답값 ===
      nonce: viewRequestData.nonce,
      tid: viewRequestData.tid,
      payData: viewRequestData.payData,
      approvalUrl: viewRequestData.approvalUrl,
      signData: viewRequestData.signData,
      
      // === 기본 파라미터 ===
      method: 'CARD',
      mid,
      goodsNm: selected.name,
      ordNo,
      goodsAmt,
      ordNm: session.user.name || '구매자',
      ordEmail: session.user.email,
      returnUrl,
      ediDate,
      hashString,
      
      // === 내부 관리용 ===
      plan,
      months: selected.months,
      userEmail: session.user.email,
      userName: session.user.name || '구매자',
    })

  } catch (error) {
    console.error('❌ SeedPay init error:', error)
    return NextResponse.json({ 
      error: '결제 초기화 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}