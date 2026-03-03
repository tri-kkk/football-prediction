import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import crypto from 'crypto'

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

    // 주문번호 생성
    const ordNo = `TS${Date.now()}${Math.floor(Math.random() * 1000)}`
    const goodsAmt = selected.amount.toString()

    // SHA-256 해시 (mid + ediDate + amount + key)
    const hashString = crypto
      .createHash('sha256')
      .update(mid + ediDate + goodsAmt + merchantKey)
      .digest('hex')

    // 5. 결과 콜백 URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const returnUrl = `${baseUrl}/api/payment/seedpay/callback`

    console.log('✅ SeedPay 파라미터 생성:', {
      mid: mid.substring(0, 5) + '***',
      ordNo,
      goodsAmt,
      ediDate,
      hashString: hashString.substring(0, 20) + '...',
    })

    // ✅ SeedPay 공식 가이드 기준으로 반환
    return NextResponse.json({
      success: true,
      
      // === SeedPay 필수 필드 ===
      method: 'CARD',
      mid,
      goodsNm: selected.name,
      ordNo,
      goodsAmt,
      ordNm: session.user.name || '구매자',
      ordTel: '0000000000',
      ordEmail: session.user.email,
      returnUrl,
      ediDate,
      hashString,
      
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