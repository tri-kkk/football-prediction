'use client'

import { useState, useEffect } from 'react'
import Script from 'next/script'

declare global {
  interface Window {
    SendPay: (form: HTMLFormElement) => void
    payResultSubmit: () => void
  }
}

export default function TestPaymentPage() {
  const [mid, setMid] = useState('')
  const [loading, setLoading] = useState(false)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [ediDate, setEdiDate] = useState('')
  const [hashString, setHashString] = useState('')
  const [ordNo, setOrdNo] = useState('')

  // 페이지 로드 시 서버에서 결제 파라미터 가져오기
  useEffect(() => {
    const initPayment = async () => {
      try {
        const res = await fetch('/api/payment/seedpay/init')
        const data = await res.json()
        if (data.success) {
          setMid(data.mid)
          setEdiDate(data.ediDate)
          setHashString(data.hashString)
          setOrdNo(data.ordNo)
        }
      } catch (err) {
        console.error('Init error:', err)
      }
    }
    initPayment()
  }, [])

  const handlePayment = () => {
    if (!sdkLoaded) {
      alert('결제 SDK 로딩 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }
    setLoading(true)

    const form = document.forms.namedItem('payInit') as HTMLFormElement
    if (form) {
      try {
        window.SendPay(form)
      } catch (err) {
        console.error('SendPay error:', err)
        setLoading(false)
        alert('결제창 호출 실패')
      }
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f0f0f',
      color: '#fff',
      padding: '40px 20px',
      fontFamily: 'sans-serif'
    }}>
      {/* SeedPay SDK */}
      <Script
        src="https://pay.seedpayments.co.kr/js/pgAsistant.js"
        onLoad={() => {
          console.log('✅ SeedPay SDK loaded')
          setSdkLoaded(true)
        }}
        onError={() => console.error('❌ SeedPay SDK load failed')}
      />

      {/* pay_result_submit / pay_result_close 콜백 */}
      <Script id="seedpay-callbacks" strategy="beforeInteractive">
        {`
          function pay_result_submit() {
            payResultSubmit();
          }
          function pay_result_close() {
            alert('결제를 취소하였습니다.');
            window.location.reload();
          }
        `}
      </Script>

      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>
          🧪 SeedPay 결제 테스트
        </h1>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '30px' }}>
          개발 환경 (devpay.seedpayments.co.kr)
        </p>

        {/* 상태 표시 */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: sdkLoaded ? '#1a3a1a' : '#3a2a1a',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          SDK: {sdkLoaded ? '✅ 로드 완료' : '⏳ 로딩 중...'}
          {' | '}MID: {mid || '로딩 중...'}
          {' | '}주문번호: {ordNo || '생성 중...'}
        </div>

        {/* 결제 폼 */}
        <form name="payInit" method="post" action="">
          {/* 필수 Hidden 필드 */}
          <input type="hidden" name="mid" value={mid} />
          <input type="hidden" name="ediDate" value={ediDate} />
          <input type="hidden" name="hashString" value={hashString} />
          <input type="hidden" name="returnUrl" value={
            typeof window !== 'undefined'
              ? `${window.location.origin}/api/payment/seedpay/callback`
              : '/api/payment/seedpay/callback'
          } />
          <input type="hidden" name="mbsReserved" value="test_payment" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 결제수단 */}
            <div>
              <label style={labelStyle}>결제수단</label>
              <select name="method" style={inputStyle} defaultValue="CARD">
                <option value="ALL">모두</option>
                <option value="CARD">신용카드</option>
                <option value="BANK">계좌이체</option>
                <option value="VACNT">가상계좌</option>
              </select>
            </div>

            {/* 상품명 */}
            <div>
              <label style={labelStyle}>상품명</label>
              <input type="text" name="goodsNm" defaultValue="TrendSoccer 테스트 결제" style={inputStyle} />
            </div>

            {/* 주문번호 */}
            <div>
              <label style={labelStyle}>주문번호</label>
              <input type="text" name="ordNo" value={ordNo} readOnly style={{ ...inputStyle, color: '#888' }} />
            </div>

            {/* 결제금액 */}
            <div>
              <label style={labelStyle}>결제금액 (원)</label>
              <input type="text" name="goodsAmt" defaultValue="1004" style={inputStyle} />
            </div>

            {/* 구매자명 */}
            <div>
              <label style={labelStyle}>구매자명</label>
              <input type="text" name="ordNm" defaultValue="테스트" style={inputStyle} />
            </div>

            {/* 구매자 이메일 */}
            <div>
              <label style={labelStyle}>구매자 이메일</label>
              <input type="text" name="ordEmail" defaultValue="test@trendsoccer.com" style={inputStyle} />
            </div>
          </div>

          {/* Hidden 옵션 */}
          <input type="hidden" name="ordIp" value="" />
          <input type="hidden" name="ordTel" value="" />
          <input type="hidden" name="mbsUsrId" value="testUser001" />
        </form>

        {/* 결제 버튼 */}
        <button
          onClick={handlePayment}
          disabled={loading || !sdkLoaded || !mid}
          style={{
            width: '100%',
            padding: '16px',
            marginTop: '24px',
            backgroundColor: loading ? '#333' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '결제 진행 중...' : '💳 테스트 결제하기'}
        </button>

        {/* 결과 표시 */}
        {result && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            fontSize: '13px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            <h3 style={{ marginBottom: '8px' }}>결제 결과:</h3>
            {JSON.stringify(result, null, 2)}
          </div>
        )}

        {/* 디버깅 정보 */}
        <div style={{
          marginTop: '30px',
          padding: '16px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#666'
        }}>
          <p>📌 개발 환경 테스트용 페이지</p>
          <p>📌 실제 결제는 발생하지 않습니다 (개발 서버)</p>
          <p>📌 테스트 카드: SeedPay에서 제공한 테스트 카드 사용</p>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  color: '#aaa',
  marginBottom: '4px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  boxSizing: 'border-box',
}