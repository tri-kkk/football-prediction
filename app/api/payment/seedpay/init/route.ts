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
    
    const planConfig: Record<string, { amount: number; name: string; nameEn: string; months: number }> = {
      monthly: { amount: 4900, name: 'TrendSoccer 프리미엄 1개월 구독', nameEn: 'TrendSoccer Premium Monthly', months: 1 },
      quarterly: { amount: 9900, name: 'TrendSoccer 프리미엄 3개월 구독', nameEn: 'TrendSoccer Premium Quarterly', months: 3 },
    }

    const selected = planConfig[plan]
    if (!selected) {
      return NextResponse.json({ error: '잘못된 플랜입니다.' }, { status: 400 })
    }

    // 3. SeedPay 파라미터 생성
    const mid = process.env.SEEDPAY_MID!
    const merchantKey = process.env.SEEDPAY_MERCHANT_KEY!

    const now = new Date()
    const ediDate = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0')

    const ordNo = `TS${Date.now()}`
    const goodsAmt = selected.amount.toString()

    const hashString = crypto
      .createHash('sha256')
      .update(mid + ediDate + goodsAmt + merchantKey)
      .digest('hex')

    return NextResponse.json({
      success: true,
      mid,
      ediDate,
      hashString,
      ordNo,
      goodsAmt,
      goodsNm: selected.name,
      plan,
      months: selected.months,
      userEmail: session.user.email,
      userName: session.user.name || '구매자',
    })

  } catch (error) {
    console.error('SeedPay init error:', error)
    return NextResponse.json({ error: '결제 초기화 실패' }, { status: 500 })
  }
}