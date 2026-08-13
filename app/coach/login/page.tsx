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
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#898781', fontSize: 13 }}>
      로그인 페이지로 이동 중…
    </div>
  );
}
