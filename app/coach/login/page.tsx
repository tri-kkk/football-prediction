'use client';
// app/coach/login/page.tsx — 코치 로그인(웹 NextAuth). 기존 Google/Naver 프로바이더 재사용.
// 로그인 성공 시 .trendsoccer.com 쿠키로 SSO → 코치 API가 세션 인식.
import { signIn } from 'next-auth/react';

export default function CoachLogin() {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, gap: 6 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#3987e5,#1c5cab)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 18, marginBottom: 8 }}>TC</div>
      <div style={{ fontSize: 19, fontWeight: 800 }}>TrendCoach 로그인</div>
      <p style={{ fontSize: 12.5, color: '#c3c2b7', margin: '0 0 22px', lineHeight: 1.6 }}>TrendSoccer 계정으로 로그인하면<br />바로 이용할 수 있어요.</p>
      <button onClick={() => signIn('google', { callbackUrl: '/coach' })} style={{ width: '100%', maxWidth: 300, border: 0, background: '#fff', color: '#1a1a19', fontWeight: 700, fontSize: 14, padding: 13, borderRadius: 12, cursor: 'pointer' }}>Google로 계속하기</button>
      <button onClick={() => signIn('naver', { callbackUrl: '/coach' })} style={{ width: '100%', maxWidth: 300, border: 0, background: '#03c75a', color: '#fff', fontWeight: 700, fontSize: 14, padding: 13, borderRadius: 12, cursor: 'pointer', marginTop: 10 }}>네이버로 계속하기</button>
    </div>
  );
}
