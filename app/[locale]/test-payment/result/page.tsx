'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ResultContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const message = searchParams.get('message')
  const tid = searchParams.get('tid')
  const ordNo = searchParams.get('ordNo')
  const amount = searchParams.get('amount')
  const method = searchParams.get('method')

  const isSuccess = status === 'success'

  const methodMap: Record<string, string> = {
    '01': '신용카드',
    '02': '계좌이체',
    '03': '가상계좌',
    'CARD': '신용카드',
    'BANK': '계좌이체',
    'VACNT': '가상계좌',
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f0f0f',
      color: '#fff',
      padding: '40px 20px',
      fontFamily: 'sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: '450px',
        width: '100%',
        textAlign: 'center',
      }}>
        {/* 아이콘 */}
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>
          {isSuccess ? '✅' : '❌'}
        </div>

        {/* 제목 */}
        <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>
          {isSuccess ? '결제 성공!' : '결제 실패'}
        </h1>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '30px' }}>
          {message || (isSuccess ? '결제가 정상적으로 처리되었습니다.' : '결제 처리 중 문제가 발생했습니다.')}
        </p>

        {/* 결제 정보 */}
        {isSuccess && (
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'left',
            marginBottom: '24px',
          }}>
            <InfoRow label="거래 ID" value={tid} />
            <InfoRow label="주문번호" value={ordNo} />
            <InfoRow label="결제금액" value={amount ? `${Number(amount).toLocaleString()}원` : '-'} />
            <InfoRow label="결제수단" value={method ? (methodMap[method] || method) : '-'} />
            <InfoRow label="상태" value={status || '-'} isLast />
          </div>
        )}

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <a
            href="/test-payment"
            style={{
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            {isSuccess ? '다시 테스트' : '다시 시도'}
          </a>
          <a
            href="/"
            style={{
              padding: '12px 24px',
              backgroundColor: '#333',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            홈으로
          </a>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, isLast }: { label: string; value: string | null; isLast?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: isLast ? 'none' : '1px solid #2a2a2a',
      fontSize: '14px',
    }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ color: '#fff', fontWeight: 500 }}>{value || '-'}</span>
    </div>
  )
}

export default function TestPaymentResultPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f' }} />}>
      <ResultContent />
    </Suspense>
  )
}
