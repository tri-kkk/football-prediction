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

    // 4. SeedPay 파라미터 생성
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

    // ✅ nonce 생성 (필수!)
    const nonce = `${mid}${ediDate}${Math.random().toString(36).substring(2, 15)}`

    // SHA-256 해시 (mid + ediDate + goodsAmt + key)
    const hashString = crypto
      .createHash('sha256')
      .update(mid + ediDate + goodsAmt + merchantKey)
      .digest('hex')

    console.log('🔐 Hash 계산:', {
      mid,
      ediDate,
      goodsAmt,
      merchantKeyLength: merchantKey?.length || 0,
      hashInput: mid + ediDate + goodsAmt + '***merchantKey***',
      hashString,
    })

    // 5. 결과 콜백 URL (✅ ediDate를 쿼리 파라미터에 포함!)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
    const returnUrl = `${baseUrl}/api/payment/seedpay/callback?initEdiDate=${ediDate}`

    console.log('✅ SeedPay 결제 요청 파라미터 생성:', {
      mid: mid.substring(0, 5) + '***',
      ordNo,
      goodsAmt,
      ediDate,
      hashString: hashString.substring(0, 20) + '...',
    })

    // ✅ Payment Session DB에 저장 (ediDate 유지)
    console.log('💾 [Init] Payment Session 저장 시작:', ordNo)
    const { error: sessionError } = await supabase.from('payment_sessions').insert({
      order_id: ordNo,
      init_edi_date: ediDate,
      mid,
      goods_amt: goodsAmt,
    })

    if (sessionError) {
      console.error('⚠️ [Init] Payment Session 저장 실패 (계속 진행):', sessionError.message)
      // 실패해도 계속 진행
    } else {
      console.log('✅ [Init] Payment Session 저장 완료')
    }

    // 약관 데이터 (SeedPay에서 null로 오던 약관 4번 추가)
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

    // ✅ SeedPay 표준 결제 가이드 기준으로 반환 (v0.9.0 구 필드명)
    return NextResponse.json({
      success: true,
      
      // === 약관 데이터 ===
      terms,
      
      // === SeedPay 필수 필드 (v0.9.0 구 필드명) ===
      method: 'CARD',                         // 결제 수단: CARD (필수)
      mid,                                    // 상점 아이디 (필수)
      goodsNm: selected.name,                 // 상품명 (필수)
      ordNo,                                  // 주문번호 (필수, Unique)
      goodsAmt,                               // 결제금액 (필수)
      ordNm: session.user.name || '구매자',   // 구매자명 (필수)
      
      // === 선택사항 ===
      ordTel: '0000000000',                   // 구매자 전화
      ordEmail: session.user.email,           // 구매자 이메일
      
      // === 보안 ===
      nonce,                                  // ✅ nonce 추가 (필수!)
      returnUrl,                              // Callback URL
      ediDate,                                // 타임스탐프
      hashString,                             // SHA-256 해시
      
      // === 내부 관리용 ===
      plan,
      months: selected.months,
      userEmail: session.user.email,
      userName: session.user.name || '구매자',
      mbsReserved: JSON.stringify({
        email: session.user.email,
        plan,
        timestamp: new Date().toISOString(),
      }),
    })

  } catch (error) {
    console.error('❌ SeedPay init error:', error)
    return NextResponse.json({ 
      error: '결제 초기화 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}