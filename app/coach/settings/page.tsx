'use client';
// app/coach/settings/page.tsx — 설정: 멤버쉽 상태 · 뱅크롤 · 계정(NextAuth 세션 기반).
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { coachApi, MembershipError, mainLoginUrl } from '@/lib/coachApi';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [member, setMember] = useState<boolean | null>(null);
  const [bankroll, setBankroll] = useState('500000');
  const [unit, setUnit] = useState('15000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBankroll(localStorage.getItem('coach_bankroll') || '500000');
      setUnit(localStorage.getItem('coach_unit') || '15000');
    }
  }, []);
  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') { setMember(false); return; }
    coachApi.dashboard().then(() => setMember(true)).catch((e) => setMember(e instanceof MembershipError ? false : null));
  }, [status]);

  const saveBankroll = (b: string, u: string) => {
    setBankroll(b); setUnit(u);
    localStorage.setItem('coach_bankroll', b); localStorage.setItem('coach_unit', u);
  };

  const authed = status === 'authenticated';
  const row = (l: string, r: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a19', border: '1px solid rgba(255,255,255,.1)', borderRadius: 13, padding: 14, marginBottom: 9 }}>
      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{l}</span><span style={{ fontSize: 12, color: '#898781', fontWeight: 600 }}>{r}</span>
    </div>
  );
  const sect = (t: string) => <div style={{ fontSize: 12, fontWeight: 700, color: '#898781', margin: '18px 2px 10px', letterSpacing: .6 }}>{t}</div>;

  return (
    <>
      {sect('멤버쉽')}
      {authed && member === true ? (
        row('상태', '멤버쉽 이용 중 ✓')
      ) : (
        <div style={{ background: 'linear-gradient(135deg,#1c2a40,#171d28)', border: '1px solid rgba(57,135,229,.35)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>TrendCoach 멤버쉽</div>
          <p style={{ fontSize: 12, color: '#c3c2b7', lineHeight: 1.6, margin: '0 0 12px' }}>CLV 자동 채점 · 코치 리포트 · 무제한 기록 · 광고 제거</p>
          <a href="/coach/pricing" style={{ display: 'block', textAlign: 'center', background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 13.5, padding: 12, borderRadius: 11, textDecoration: 'none' }}>멤버쉽 시작하기</a>
        </div>
      )}

      {sect('뱅크롤')}
      <div style={{ background: '#1a1a19', border: '1px solid rgba(255,255,255,.1)', borderRadius: 13, padding: 14, marginBottom: 9 }}>
        <div style={{ fontSize: 12, color: '#898781', marginBottom: 8 }}>총 뱅크롤 (원)</div>
        <input value={Number(bankroll.replace(/[^0-9]/g, '') || 0).toLocaleString()} onChange={(e) => saveBankroll(e.target.value.replace(/[^0-9]/g, ''), unit)} inputMode="numeric" style={{ width: '100%', background: '#232320', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '11px 12px', color: '#fff', fontSize: 15, fontWeight: 700 }} />
        <div style={{ fontSize: 12, color: '#898781', margin: '12px 0 8px' }}>단위 베팅 (원)</div>
        <input value={Number(unit.replace(/[^0-9]/g, '') || 0).toLocaleString()} onChange={(e) => saveBankroll(bankroll, e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" style={{ width: '100%', background: '#232320', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '11px 12px', color: '#fff', fontSize: 15, fontWeight: 700 }} />
      </div>

      {sect('계정')}
      {authed ? (
        <>
          {row('로그인', session?.user?.email || 'TrendSoccer 계정')}
          <button onClick={() => signOut({ callbackUrl: '/coach' })} style={{ width: '100%', border: '1px solid rgba(255,255,255,.1)', background: '#1a1a19', color: '#e66767', fontWeight: 700, fontSize: 13, padding: 13, borderRadius: 13, cursor: 'pointer' }}>로그아웃</button>
        </>
      ) : (
        <a href={mainLoginUrl()} style={{ display: 'block', textAlign: 'center', background: '#3987e5', color: '#fff', fontWeight: 800, fontSize: 13.5, padding: 13, borderRadius: 13, textDecoration: 'none' }}>TrendSoccer 계정으로 로그인</a>
      )}
      <p style={{ fontSize: 11, color: '#6b6a64', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>계정은 TrendSoccer와 공유돼요(.trendsoccer.com).</p>
    </>
  );
}
