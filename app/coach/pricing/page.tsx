'use client';
// app/coach/pricing/page.tsx — 코치 멤버쉽 결제(SeedPay). 웹 pricing 페이지의 SendPay 흐름을 미러.
// coach-init → SendPay(form) → 메시지 콜백 → coach-callback 폼 전송.
import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';

declare global {
  interface Window { SendPay?: (form: HTMLFormElement, mode?: string) => void }
}

export default function CoachPricing() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);

  // SeedPay pgAsistant.js 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://pay.seedpayments.co.kr/js/pgAsistant.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // 결제창 → 부모창 메시지: 성공 시 coach-callback으로 폼 전송
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const pd = Array.isArray(event.data) ? event.data[1] : null;
      if (!pd || pd.resultCd === undefined) return;
      if (pd.resultCd === '0000') {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/api/payment/seedpay/coach-callback';
        form.style.display = 'none';
        Object.entries(pd).forEach(([k, v]) => {
          const i = document.createElement('input');
          i.type = 'hidden'; i.name = k; i.value = String(v); form.appendChild(i);
        });
        document.body.appendChild(form); form.submit();
      } else {
        window.location.href = `/coach/pricing/result?status=failed&message=${encodeURIComponent(pd.resultMsg || '결제 실패')}`;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const subscribe = async () => {
    if (status !== 'authenticated') { signIn('google', { callbackUrl: '/coach/pricing' }); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/payment/seedpay/coach-init', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '결제 초기화 실패');
      const form = document.createElement('form');
      form.name = 'payInit'; form.method = 'POST'; form.action = '';
      Object.entries(data.formData).forEach(([k, v]) => {
        const i = document.createElement('input');
        i.type = 'hidden'; i.name = k; i.value = String(v); form.appendChild(i);
      });
      document.body.appendChild(form);
      if (typeof window.SendPay === 'undefined') throw new Error('결제 모듈 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      window.SendPay(form);
    } catch (e: any) {
      alert(e.message || '결제 오류'); setLoading(false);
    }
  };

  const feat = (t: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, marginBottom: 11 }}>
      <span style={{ color: '#3ecb3e', fontWeight: 800 }}>✓</span>{t}
    </div>
  );

  return (
    <div style={{ padding: '20px 4px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -.4, marginBottom: 6 }}>TrendCoach 멤버쉽</div>
      <p style={{ fontSize: 13, color: '#c3c2b7', lineHeight: 1.6, marginBottom: 20 }}>KSM 시그널·CLV 자동 채점·코치 리포트를 전부 이용하세요.</p>

      <div style={{ background: 'linear-gradient(135deg,#1c2a40,#171d28)', border: '1px solid rgba(57,135,229,.35)', borderRadius: 18, padding: 20, marginBottom: 18 }}>
        {feat('KSM 시그널 · 승부 예측 (전체 경기)')}
        {feat('CLV 자동 채점 — 국내 유일')}
        {feat('코치 리포트 · 성과 진단')}
        {feat('무제한 기록 · 광고 제거')}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '18px 0 4px' }}>
          <span style={{ fontSize: 26, fontWeight: 800 }}>₩9,900</span>
          <span style={{ fontSize: 12, color: '#898781' }}>/월</span>
        </div>
        <div style={{ fontSize: 11.5, color: '#9cc4f4', marginBottom: 16 }}>TrendSoccer 프리미엄 회원이면 <b>번들 할인가 ₩6,900</b> 자동 적용</div>
        <button onClick={subscribe} disabled={loading} style={{ width: '100%', border: 0, background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 14.5, padding: 14, borderRadius: 12, cursor: 'pointer', opacity: loading ? .6 : 1 }}>
          {loading ? '결제창 여는 중…' : status === 'authenticated' ? '멤버쉽 시작하기' : '로그인하고 시작하기'}
        </button>
      </div>
      <p style={{ fontSize: 11, color: '#6b6a64', textAlign: 'center', lineHeight: 1.5 }}>실제 베팅이 아닌 분석·기록 도구입니다. 예측·CLV는 참고용이며 수익을 보장하지 않아요.</p>
    </div>
  );
}
