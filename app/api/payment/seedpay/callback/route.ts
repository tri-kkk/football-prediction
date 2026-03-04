/**
 * 파일: app/api/payment/seedpay/callback/route.ts
 * 목적: SeedPay 결제 인증 후 콜백 처리
 * 업데이트: 필드명 버그 수정 (mid → mId, goodsAmt → amount)
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
 * Hash 계산 함수
 * SHA256(mid + ediDate + goodsAmt + merchantKey)
 */
function calculateHash(
  mid: string,
  ediDate: string,
  goodsAmt: string,
  merchantKey: string
): string {
  const data = mid + ediDate + goodsAmt + merchantKey
  return crypto.createHash('sha256').update(data).digest('hex')
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
    const ordNo = formData.get('ordNo') as string
    const tid = formData.get('tid') as string
    let ediDate = formData.get('ediDate') as string | null
    const goodsAmt = formData.get('goodsAmt') as string
    let nonce = formData.get('nonce') as string | null
    const mbsReserved = formData.get('mbsReserved') as string
    
    console.log('📋 [Callback] 받은 데이터:', {
      resultCd,
      resultMsg,
      ordNo,
      tid,
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

    // 5. Hash 재계산
    const mid = process.env.SEEDPAY_MID || 'OGytrik01m'
    const merchantKey = process.env.SEEDPAY_MERCHANT_KEY || ''
    
    const hashString = calculateHash(mid, ediDate, goodsAmt, merchantKey)
    console.log('🔐 [Callback] Hash 계산 완료')

    // 6. ✅ 수정된 승인 요청 (필드명 정확)
    console.log('📤 [Approval] 승인 요청 전송...')
    
    // ✅ 공식 문서 포맷 정확히 따름
    const approvalPayload = {
      nonce,
      tid,
      ediDate,
      mId: mid,           // ✅ "mid"가 아니라 "mId" (대문자 M)
      amount: goodsAmt,   // ✅ "goodsAmt"가 아니라 "amount"
      mbsReserved,
      hashString,
      payData: ""         // ✅ 공란 (공식 문서 참조)
    }
    
    console.log('📋 [Approval] 요청 본문 (필드명 수정):', {
      nonce: nonce ? '있음' : '없음',
      tid: tid ? '있음' : '없음',
      ediDate,
      mId: mid,
      amount: goodsAmt,
      mbsReserved: '있음',
      hashString: '있음',
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
 * 2026-03-04 버그 수정:
 * 
 * Before (❌ 버그):
 * const approvalPayload = {
 *   mid,        // 필드명 틀림
 *   goodsAmt,   // 필드명 틀림
 * }
 * 
 * After (✅ 수정):
 * const approvalPayload = {
 *   mId: mid,          // 공식 문서: "mId" (대문자 M)
 *   amount: goodsAmt,  // 공식 문서: "amount"
 * }
 * 
 * 이유:
 * SeedPay 공식 API 문서에서 필드명이 명확히 지정됨:
 * {
 *   "nonce": "...",
 *   "tid": "...",
 *   "ediDate": "...",
 *   "mId": "...",       ← 대문자 M
 *   "amount": "...",    ← 이 필드명 사용
 *   "mbsReserved": "...",
 *   "hashString": "...",
 *   "payData": ""       ← 공란
 * }
 * 
 * 효과:
 * - SeedPay가 필드를 정확히 인식
 * - 9999 에러 해결 가능성 높음
 * - 결제 승인 성공 기대
 */