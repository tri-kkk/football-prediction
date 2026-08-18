'use client';
// app/coach/pricing/page.tsx — 코치 멤버쉽 결제(SeedPay). 웹 pricing 페이지의 SendPay 흐름을 미러.
// coach-init → SendPay(form) → 메시지 콜백 → coach-callback 폼 전송.
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { mainLoginUrl } from '@/lib/coachApi';

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
    if (status !== 'authenticated') { window.location.href = mainLoginUrl(); return; }
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

  const ic = {
    signal: <path d="M3 12h4l3-8 4 16 3-8h4" />,
    clv: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></>,
    report: <path d="M5 21V10M12 21V4M19 21v-7" />,
    record: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  };
  const feat = (icon: React.ReactNode, title: string, desc: string, last?: boolean) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,.06)' }}>
      <div style={{ width: 32, height: 32, flex: '0 0 auto', borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(57,135,229,.16)', border: '1px solid rgba(57,135,229,.32)', color: '#7fb4f5' }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#eef3f9' }}>{title}</div>
        <div style={{ fontSize: 11.5, color: '#9fb0c4', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '18px 4px 24px' }}>
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: '#7fb4f5', background: 'rgba(57,135,229,.14)', border: '1px solid rgba(57,135,229,.3)', padding: '3px 9px', borderRadius: 999 }}>PREMIUM</span>
      </div>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: -.4, marginBottom: 6 }}>TrendCoach <span style={{ color: '#5aa0f0' }}>멤버쉽</span></div>
      <p style={{ fontSize: 13, color: '#aebccd', lineHeight: 1.6, marginBottom: 18 }}>KSM 시그널·CLV 자동 채점·코치 리포트를 전부 이용하세요.</p>

      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, border: '1px solid rgba(57,135,229,.35)', background: 'radial-gradient(120% 80% at 82% 0%, #1b2c46 0%, #141d2b 55%, #10151d 100%)', padding: '22px 20px', marginBottom: 16, boxShadow: '0 18px 44px rgba(0,0,0,.42)' }}>
        <div aria-hidden style={{ position: 'absolute', top: -70, right: -50, width: 220, height: 220, background: 'radial-gradient(circle, rgba(57,135,229,.32), transparent 68%)', filter: 'blur(4px)' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/card-mesh.webp)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: .16 }} />
        <div style={{ position: 'relative' }}>
          {feat(ic.signal, 'KSM 시그널 · 승부 예측', '전 경기 등급·형세·추천 전체 공개')}
          {feat(ic.clv, 'CLV 자동 채점 · 국내 유일', '내 픽을 마감배당(시장) 대비 자동 채점')}
          {feat(ic.report, '코치 리포트 · 성과 진단', '리그·배당대·등급별 CLV 분해')}
          {feat(ic.record, '무제한 기록 · 전 리그', '전 경기 기록·보관 제한 없음', true)}

          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: -.5 }}>₩9,900</span>
              <span style={{ fontSize: 12.5, color: '#8f9dae' }}>/월</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11.5, fontWeight: 700, color: '#4bd14b', background: 'rgba(75,209,75,.12)', border: '1px solid rgba(75,209,75,.28)', padding: '5px 11px', borderRadius: 8 }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
              프리미엄 회원 번들가 <b style={{ color: '#7ee87e' }}>₩6,900</b> 자동 적용
            </div>
          </div>

          <button onClick={subscribe} disabled={loading} className="tc-press" style={{ width: '100%', marginTop: 16, border: 0, background: 'linear-gradient(180deg,#4491ea,#2f74d0)', color: '#fff', fontWeight: 800, fontSize: 14.5, padding: 14, borderRadius: 12, cursor: 'pointer', opacity: loading ? .6 : 1, boxShadow: '0 8px 20px rgba(41,120,220,.36)' }}>
            {loading ? '결제창 여는 중…' : status === 'authenticated' ? '멤버쉽 시작하기' : '로그인하고 시작하기'}
          </button>
        </div>
      </div>
      <p style={{ fontSize: 11, color: '#6b6a64', textAlign: 'center', lineHeight: 1.5 }}>실제 베팅이 아닌 분석·기록 도구입니다. 예측·CLV는 참고용이며 수익을 보장하지 않아요.</p>
    </div>
  );
}
