import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// 플랜별 설정
const PLAN_CONFIG: Record<number, { plan: string; months: number }> = {
  4900: { plan: 'monthly', months: 1 },
  9900: { plan: 'quarterly', months: 3 },
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const data: Record<string, string> = {}
    formData.forEach((value, key) => {
      data[key] = value as string
    })
    console.log('📋 SeedPay 결과:', data)

    // 📊 hashString 검증
    console.log('📊 hashString 검증 시작')
    console.log('받은 hashString:', data.hashString)
    
    const merchantKey = process.env.SEEDPAY_MERCHANT_KEY!
    const recalculated = crypto
      .createHash('sha256')
      .update(data.mid + data.ediDate + data.goodsAmt + merchantKey)
      .digest('hex')
    
    console.log('재계산 hashString:', recalculated)
    console.log('hashString 일치 여부:', data.hashString === recalculated)
    
    if (data.hashString !== recalculated) {
      console.error('⚠️ hashString 불일치! 위변조 의심')
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin

    // 1. 결제 실패
    if (data.resultCd !== '0000') {
      await supabase.from('payments').upsert({
        order_id: data.ordNo,
        status: 'failed',
        result_code: data.resultCd,
        result_message: data.resultMsg,
        mid: data.mid,
        tid: data.tid,
        amount: parseInt(data.goodsAmt) || 0,
        payment_method: data.method,
        raw_response: data,
      }, { onConflict: 'order_id' })

      return NextResponse.redirect(
        `${baseUrl}/premium/pricing/result?status=failed&message=${encodeURIComponent(data.resultMsg || '결제실패')}`,
        { status: 303 }
      )
    }

    // 2. 결제 성공 - payments 저장
    const amount = parseInt(data.goodsAmt) || 0
    const planInfo = PLAN_CONFIG[amount]

    // mbsReserved에서 유저 이메일 추출
    let userEmail = ''
    try {
      const reserved = JSON.parse(data.mbsReserved || '{}')
      userEmail = reserved.email || ''
    } catch {
      userEmail = data.mbsReserved || ''
    }

    const { error: payError } = await supabase.from('payments').upsert({
      order_id: data.ordNo,
      status: 'success',
      payment_method: data.method,
      amount,
      tid: data.tid,
      mid: data.mid,
      card_code: data.appCardCd,
      card_name: data.fnNm,
      card_number: data.cardNo,
      approval_number: data.appNo,
      result_code: data.resultCd,
      result_message: data.resultMsg,
      goods_name: data.goodsNm,
      buyer_name: data.ordNm,
      raw_response: data,
    }, { onConflict: 'order_id' })

    if (payError) console.error('❌ payments 저장 실패:', payError)
    else console.log('✅ payments 저장 완료:', data.ordNo)

    // 3. 유저 조회
    if (userEmail) {
      const { data: user } = await supabase
        .from('users')
        .select('id, tier, premium_expires_at')
        .eq('email', userEmail)
        .single()

      if (user && planInfo) {
        // 4. 이용권 만료일 계산 (기존 프리미엄이면 연장)
        const now = new Date()
        let startDate = now
        
        if (user.tier === 'premium' && user.premium_expires_at) {
          const currentExpiry = new Date(user.premium_expires_at)
          if (currentExpiry > now) {
            startDate = currentExpiry // 기존 만료일부터 연장
          }
        }
        
        const expiresAt = new Date(startDate)
        expiresAt.setMonth(expiresAt.getMonth() + planInfo.months)

        // 5. subscriptions 생성
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

        // 6. users.tier 업데이트
        const { error: userError } = await supabase
          .from('users')
          .update({
            tier: 'premium',
            premium_expires_at: expiresAt.toISOString(),
          })
          .eq('id', user.id)

        if (userError) console.error('❌ users 업데이트 실패:', userError)
        else console.log('✅ users tier=premium 업데이트 완료, 만료:', expiresAt.toISOString())

        // 7. payments에 user_id 연결
        await supabase.from('payments')
          .update({ user_id: user.id })
          .eq('order_id', data.ordNo)
      }
    }

    console.log('✅ 결제 완료!', {
      tid: data.tid,
      ordNo: data.ordNo,
      amount: data.goodsAmt,
      appNo: data.appNo,
      email: userEmail,
    })

    return NextResponse.redirect(
      `${baseUrl}/premium/pricing/result?status=success&amount=${data.goodsAmt || ''}`,
      { status: 303 }
    )

  } catch (error) {
    console.error('SeedPay callback error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
    return NextResponse.redirect(
      `${baseUrl}/premium/pricing/result?status=error&message=${encodeURIComponent('서버 오류')}`,
      { status: 303 }
    )
  }
}