'use client';
// app/coach/login/page.tsx — A안: 코치는 직접 OAuth 안 하고 메인(www) 로그인으로 보냄.
// 로그인하면 .trendsoccer.com 쿠키 공유 → coach 자동 인증.
import { useEffect } from 'react';
import { mainLoginUrl } from '@/lib/coachApi';

export default function CoachLogin() {
  useEffect(() => {
    window.location.href = mainLoginUrl();
  }, []);
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: '#8b8a84', fontSize: 13 }}>
      <style>{`@keyframes coachLoginSpin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ width: 30, height: 30, borderRadius: 9999, border: '2.5px solid rgba(255,255,255,.12)', borderTopColor: '#3987e5', animation: 'coachLoginSpin .7s linear infinite' }} />
      로그인 페이지로 이동 중…
    </div>
  );
}
