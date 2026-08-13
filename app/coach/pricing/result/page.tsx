// app/coach/pricing/result/page.tsx
// 코치 결제 결과 페이지 (coach-callback 리다이렉트 대상).
export const dynamic = 'force-dynamic';

export default function CoachPaymentResult({
  searchParams,
}: {
  searchParams: { status?: string; amount?: string; message?: string };
}) {
  const ok = searchParams.status === 'success';
  const amount = searchParams.amount ? Number(searchParams.amount).toLocaleString() : null;
  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <div style={{ background: '#1a1a19', border: '1px solid rgba(255,255,255,.1)', borderRadius: 18, padding: 28, maxWidth: 340, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>{ok ? '🎉' : '⚠️'}</div>
        <h1 style={{ fontSize: 18, margin: '0 0 8px' }}>{ok ? 'TrendCoach 멤버쉽 시작!' : '결제에 실패했어요'}</h1>
        <p style={{ fontSize: 13, color: '#c3c2b7', lineHeight: 1.6, margin: '0 0 18px' }}>
          {ok
            ? `결제가 완료됐어요${amount ? ` (₩${amount})` : ''}. 이제 KSM 시그널·CLV·코치 리포트를 전부 이용할 수 있어요.`
            : searchParams.message || '잠시 후 다시 시도해 주세요.'}
        </p>
        <a href="/coach" style={{ display: 'block', background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 14, padding: 12, borderRadius: 11, textDecoration: 'none' }}>
          {ok ? '홈으로' : '다시 시도'}
        </a>
      </div>
    </div>
  );
}
