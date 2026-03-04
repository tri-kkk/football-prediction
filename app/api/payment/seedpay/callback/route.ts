/**
 * 파일: app/api/payment/seedpay/callback/route.ts
 * 목적: SeedPay 결제 인증 후 콜백 처리
 * 
 * 중요한 수정 사항:
 * 1. Hash 계산 방식 수정
 *    Before: SHA256(mid + ediDate + goodsAmt + key)
 *    After:  SHA256(tid + mId + ediDate + amount + orderId + key)
 * 
 * 2. Approval Request 필드명 수정
 *    "mid" → "mId" (대문자 M)
 *    "goodsAmt" → "amount"
 * 
 * 날짜: 2026-03-04
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

/**
 * ✅ 수정된 Hash 계산 함수
 * 공식: SHA256(tid + mId + ediDate + amount + orderId + 가맹점KEY)
 * 
 * SeedPay가 이 Hash 값으로 검증함!
 */
function calculateHash(
  tid: string,
  mId: string,
  ediDate: string,
  amount: string,
  orderId: string,
  merchantKey: string
): string {
  // ✅ 공식 순서대로 연결
  const data = tid + mId + ediDate + amount + orderId + merchantKey
  console.log('🔐 [Hash] 입력 데이터:', {
    tid,
    mId,
    ediDate,
    amount,
    orderId,
    merchantKey: '***' // 보안상 숨김
  })
  
  const hash = crypto.createHash('sha256').update(data).digest('hex')
  console.log('🔐 [Hash] 계산 완료:', hash)
  return hash
}

/**
 * nonce 생성 함수 (30byte)
 */
function generateNonce(): string {
  return crypto.randomBytes(15).toString('hex')
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 [Callback] POST 요청 받음')

    // 1. Form Data 수신
    const formData = await request.formData()
    
    const resultCd = formData.get('resultCd') as string
    const resultMsg = formData.get('resultMsg') as string
    const ordNo = formData.get('ordNo') as string    // orderId와 동일
    const tid = formData.get('tid') as string
    let ediDate = formData.get('ediDate') as string | null
    const goodsAmt = formData.get('goodsAmt') as string  // amount
    let nonce = formData.get('nonce') as string | null
    const mbsReserved = formData.get('mbsReserved') as string
    
    console.log('📋 [Callback] 받은 데이터:', {
      resultCd,
      resultMsg,
      ordNo: '첫글자...' + ordNo?.slice(-4),
      tid: '첫글자...' + tid?.slice(-4),
      ediDate: ediDate ? '있음' : '없음',
      goodsAmt,
      nonce: nonce ? '있음' : '없음',
      mbsReserved: mbsReserved ? '있음' : '없음',
    })

    // 2. 인증 성공 확인
    if (resultCd !== '0000') {
      console.log('❌ [Callback] 인증 실패:', resultMsg)
      return NextResponse.redirect(
        new URL(
          `/premium/pricing/result?status=failed&message=${encodeURIComponent(resultMsg)}`,
          request.url
        )
      )
    }

    console.log('✅ [Callback] 인증 성공 (resultCd=0000)')

    // 3. ediDate 없으면 새로 생성
    if (!ediDate) {
      const now = new Date()
      ediDate = now.toISOString()
        .replace(/[-T:.Z]/g, '')
        .slice(0, 14)
      console.log('🔄 [Callback] ediDate 새로 생성:', ediDate)
    }

    // 4. nonce 없으면 새로 생성
    if (!nonce) {
      nonce = `temp_${tid}_${generateNonce()}`
      console.log('🔄 [Callback] nonce 새로 생성:', nonce)
    }

    // 5. ✅ 수정된 Hash 계산
    // 공식: SHA256(tid + mId + ediDate + amount + orderId + key)
    const mId = process.env.SEEDPAY_MID || 'OGytrik01m'
    const merchantKey = process.env.SEEDPAY_MERCHANT_KEY || ''
    const amount = goodsAmt  // "goodsAmt" → "amount"
    const orderId = ordNo    // "ordNo" → "orderId"
    
    const hashString = calculateHash(
      tid,        // ✅ 필수 (우리는 포함 안 했음!)
      mId,        // ✅ 대문자 M
      ediDate,    // ✅ 있음
      amount,     // ✅ "goodsAmt"가 아니라 "amount"
      orderId,    // ✅ 필수 (우리는 포함 안 했음!)
      merchantKey // ✅ 있음
    )
    
    console.log('🔐 [Callback] Hash 재계산 완료')

    // 6. ✅ 정확한 Approval Request (필드명 + Hash 모두 수정)
    console.log('📤 [Approval] 승인 요청 전송...')
    
    // ✅ 공식 문서 포맷 정확히 따름
    const approvalPayload = {
      nonce,
      tid,
      ediDate,
      mId,                    // ✅ 대문자 M (필수)
      amount,                 // ✅ "amount" (필수)
      mbsReserved,
      hashString,             // ✅ 정확히 계산된 Hash
      payData: ""             // ✅ 공란
    }
    
    console.log('📋 [Approval] 요청 본문 (필드명 + Hash 정확):', {
      nonce: nonce ? '있음' : '없음',
      tid: tid ? '있음' : '없음',
      ediDate,
      mId,
      amount,
      mbsReserved: '있음',
      hashString: hashString?.substring(0, 16) + '...',
      payData: '공란'
    })

    const approvalResponse = await fetch(
      'https://pay.seedpayments.co.kr/payment/v1/approval',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalPayload),
      }
    )

    const approval = await approvalResponse.json()
    console.log('📋 [Approval] SeedPay 응답:', {
      resultCd: approval.resultCd,
      resultMsg: approval.resultMsg,
      appNo: approval.appNo ? '있음' : '없음'
    })

    // 7. 승인 결과 처리
    if (approval.resultCd !== '0000') {
      console.log('❌ [Approval] 승인 실패:', approval.resultMsg)
      
      // DB에 실패 기록
      try {
        await supabase.from('payments').insert({
          order_no: ordNo,
          tid,
          amount: parseInt(goodsAmt),
          status: 'failed',
          payment_method: 'CARD',
          approval_number: null,
          error_message: approval.resultMsg,
        })
      } catch (dbError) {
        console.error('⚠️ [DB] 실패 기록 저장 실패:', dbError)
      }
      
      return NextResponse.redirect(
        new URL(
          `/premium/pricing/result?status=failed&message=${encodeURIComponent(approval.resultMsg)}`,
          request.url
        )
      )
    }

    console.log('✅ [Approval] 승인 완료! (resultCd=0000)')

    // 8. DB에 결제 정보 저장
    try {
      // mbsReserved 파싱 (JSON 형식)
      const reserved = mbsReserved ? JSON.parse(mbsReserved) : {}
      const userId = reserved.userId
      const plan = reserved.plan
      const email = reserved.email
      const name = reserved.name
      
      console.log('📦 [DB] 저장 준비:', {
        userId: userId ? '있음' : '없음',
        plan,
        email: email ? '있음' : '없음'
      })

      // 8.1 payments 테이블에 저장
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          order_no: ordNo,
          tid,
          amount: parseInt(goodsAmt),
          status: 'completed',
          payment_method: 'CARD',
          approval_number: approval.appNo?.toString() || 'N/A',
          buyer_email: email,
          buyer_name: name,
        })

      if (paymentError) {
        throw new Error(`payments 저장 실패: ${paymentError.message}`)
      }
      console.log('✅ [DB] payments 저장 완료')

      // 8.2 subscriptions 테이블에 저장
      const startedAt = new Date()
      const expiresAt = new Date()
      
      if (plan === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      } else if (plan === 'quarterly') {
        expiresAt.setMonth(expiresAt.getMonth() + 3)
      }

      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan,
          status: 'active',
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_id: ordNo,
        })

      if (subscriptionError) {
        throw new Error(`subscriptions 저장 실패: ${subscriptionError.message}`)
      }
      console.log('✅ [DB] subscriptions 저장 완료')

      // 8.3 users 테이블 업데이트
      const { error: userError } = await supabase
        .from('users')
        .update({
          tier: 'premium',
          premium_expires_at: expiresAt.toISOString(),
        })
        .eq('id', userId)

      if (userError) {
        throw new Error(`users 업데이트 실패: ${userError.message}`)
      }
      console.log('✅ [DB] users 업데이트 완료')

      // 9. 성공 리다이렉트
      console.log('🎉 [Callback] 전체 결제 프로세스 완료!')
      return NextResponse.redirect(
        new URL('/premium/pricing/result?status=success', request.url)
      )

    } catch (dbError) {
      console.error('❌ [DB] 데이터베이스 저장 실패:', dbError)
      return NextResponse.redirect(
        new URL(
          '/premium/pricing/result?status=failed&message=Database+error',
          request.url
        )
      )
    }

  } catch (error) {
    console.error('❌ [Callback] 처리 중 오류 발생:', error)
    return NextResponse.redirect(
      new URL(
        '/premium/pricing/result?status=failed&message=Processing+error',
        request.url
      )
    )
  }
}

/**
 * 변경사항 로그:
 * 
 * 📅 2026-03-04 - 중대 버그 수정
 * 
 * 🔴 문제 1: Hash 계산 방식 완전히 틀림
 * Before (❌ 버그):
 * SHA256(mid + ediDate + goodsAmt + merchantKey)
 * 문제: tid, orderId 누락, 필드순서 틀림
 * 
 * After (✅ 수정):
 * SHA256(tid + mId + ediDate + amount + orderId + merchantKey)
 * - tid 추가 (필수)
 * - orderId 추가 (필수)
 * - 필드 순서 정확히 변경
 * - SeedPay가 이 Hash로 검증함!
 * 
 * 🔴 문제 2: Approval Request 필드명 틀림
 * Before (❌ 버그):
 * { mid: "...", goodsAmt: "..." }
 * 
 * After (✅ 수정):
 * { mId: "...", amount: "..." }
 * 
 * 효과:
 * - Hash 검증 성공
 * - SeedPay가 필드를 정확히 인식
 * - 결제 승인 성공
 * - resultCd: 0000 기대
 * 
 * 핵심 발견:
 * SeedPay가 Hash 값으로 검증하므로,
 * Hash가 틀리면 무조건 실패한다!
 * 
 * 이것이 9999 에러의 진짜 원인!
 */