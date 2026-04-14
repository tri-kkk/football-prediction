import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// 텔레그램 매출 알림
async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) return

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })
  } catch (e) {
    console.error('텔레그램 알림 실패:', e)
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1️⃣ Form Data 파싱
    const formData = await request.formData()
    
    const data: Record<string, any> = {}
    formData.forEach((value, key) => {
      data[key] = value
    })

    // 2️⃣ 결제 결과 확인
    const resultCd = data.resultCd
    const resultMsg = data.resultMsg
    const ordNo = data.ordNo
    const tid = data.tid
    const goodsAmt = data.goodsAmt

    if (resultCd !== '0000') {
      const { error: paymentError } = await supabase.from('payments').insert({
        order_id: ordNo,
        status: 'failed',
        tid,
        result_code: resultCd,
        result_message: resultMsg,
      })

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
      return new NextResponse(null, {
        status: 303,
        headers: {
          Location: `${baseUrl}/premium/pricing/result?status=failed&message=${encodeURIComponent(resultMsg || '결제 실패')}`
        }
      })
    }

    // 3️⃣ 주문 정보 조회
    const { data: sessionData, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('order_id', ordNo)
      .single()

    if (sessionError || !sessionData) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
      return new NextResponse(null, {
        status: 303,
        headers: {
          Location: `${baseUrl}/premium/pricing/result?status=failed&message=${encodeURIComponent('세션 데이터 없음')}`
        }
      })
    }

    // 4️⃣ 플랜 정보 파악
    const planAmount = parseInt(goodsAmt)
    let months = 1
    if (planAmount === 9900) months = 3
    else if (planAmount === 4900) months = 1

    // 5️⃣ 유저 ID 조회
    const userEmail = sessionData.user_email
    const { data: userData, error: userSelectError } = await supabase
      .from('users')
      .select('id, created_at')
      .ilike('email', userEmail)
      .single()

    if (userSelectError || !userData) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
      return new NextResponse(null, {
        status: 303,
        headers: {
          Location: `${baseUrl}/premium/pricing/result?status=failed&message=${encodeURIComponent('사용자 조회 실패')}`
        }
      })
    }

    // 5.5️⃣ 탈퇴 재가입 유저 결제 시 텔레그램 경고 알림
    const emailHash = crypto.createHash('sha256').update(userEmail.toLowerCase()).digest('hex')
    const { data: deletedRecord } = await supabase
      .from('deleted_users')
      .select('deleted_at, subscription_tier, total_payments')
      .eq('email_hash', emailHash)
      .maybeSingle()

    if (deletedRecord) {
      const alertMsg =
        `⚠️ <b>탈퇴 재가입 유저 결제!</b>\n\n` +
        `👤 이메일: ${userEmail}\n` +
        `📅 이전 탈퇴일: ${deletedRecord.deleted_at}\n` +
        `💎 이전 티어: ${deletedRecord.subscription_tier || 'unknown'}\n` +
        `💰 이전 결제 횟수: ${deletedRecord.total_payments || 0}회\n` +
        `🆔 주문번호: ${ordNo}`
      await sendTelegramNotification(alertMsg)
      console.log('⚠️ 탈퇴 재가입 유저 결제 감지:', userEmail)
    }

    // 6️⃣ 결제 정보 저장
    const goodsName = months === 3 
      ? 'TrendSoccer 프리미엄 3개월 구독' 
      : 'TrendSoccer 프리미엄 1개월 구독'

    const { error: paymentInsertError } = await supabase.from('payments').insert({
      user_id: userData.id,
      order_id: ordNo,
      status: 'success',
      tid,
      mid: data.mid,
      amount: planAmount,
      buyer_email: userEmail,
      buyer_name: data.ordNm,
      goods_name: goodsName,
      approval_number: data.appNo,
      payment_method: data.method === '01' ? 'CARD' : 'CARD',
      card_code: data.acqCardCd,
      card_name: data.fnNm,
      card_number: data.cardNo,
      nonce: data.nonce,
      order_date: new Date().toISOString(),
      result_code: resultCd,
      result_message: resultMsg,
      raw_response: data,
    })

    // 7️⃣ 구독 정보 저장
    const startDate = new Date()
    const expiresAt = new Date(startDate)
    expiresAt.setMonth(expiresAt.getMonth() + months)

    const { error: subError } = await supabase.from('subscriptions').insert({
      user_id: userData.id,
      plan: months === 3 ? 'quarterly' : 'monthly',
      status: 'active',
      started_at: startDate,
      expires_at: expiresAt,
      payment_id: ordNo,
      price: planAmount,
    })

    // 8️⃣ 사용자 정보 업데이트 (프리미엄)
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        tier: 'premium',
        premium_expires_at: expiresAt,
      })
      .eq('id', userData.id)

    // 9️⃣ 텔레그램 매출 알림
    const planLabel = months === 3 ? '3개월 (₩9,900)' : '1개월 (₩4,900)'
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    await sendTelegramNotification(
      `💰 <b>매출 발생!</b>\n\n` +
      `📋 상품: ${goodsName}\n` +
      `💳 금액: ₩${planAmount.toLocaleString()}\n` +
      `👤 이메일: ${userEmail}\n` +
      `🆔 주문번호: ${ordNo}\n` +
      `🕐 시간: ${now}`
    )

    // 🔟 성공 페이지로 리다이렉트
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.trendsoccer.com'
    return new NextResponse(null, {
      status: 303,
      headers: {
        Location: `${baseUrl}/premium/pricing/result?status=success&amount=${planAmount}`
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: '결제 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}