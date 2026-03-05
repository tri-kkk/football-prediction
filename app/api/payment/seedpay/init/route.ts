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

    // 4. 기본 파라미터 생성
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
      hashString,
    })

    // 5. Payment Session DB에 저장 (필요한 정보 미리 저장)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
    const returnUrl = `${baseUrl}/api/payment/seedpay/callback`

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

    // ✅ JSON만 반환 (HTML 아님!)
    // 클라이언트에서 SendPay()가 /payment/v1/view/request를 호출함
    console.log('📤 [Init] 클라이언트용 폼 데이터 반환')
    
    return NextResponse.json({
      success: true,
      
      // === 약관 데이터 (필요시) ===
      terms: [
        {
          termTitle: '전자금융거래 기본약관',
          termContents: '약관 내용 1'
        },
        {
          termTitle: '개인정보의 수집 및 이용안내',
          termContents: '약관 내용 2'
        },
        {
          termTitle: '개인정보제공 및 위탁동의',
          termContents: '약관 내용 3'
        }
      ],
      
      // === SeedPay Form에 필요한 파라미터 ===
      // 클라이언트에서 이 데이터로 form을 만들고
      // SendPay()로 /payment/v1/view/request 호출
      formData: {
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
        // 추가 옵션
        ordIp: '',
        ordTel: '',
        mbsUsrId: '',
        mbsReserved: '',
      },
    })

  } catch (error) {
    console.error('❌ SeedPay init error:', error)
    return NextResponse.json({ 
      error: '결제 초기화 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}