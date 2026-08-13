'use client';
// app/coach/layout.tsx — 코치 앱 공통 셸(헤더 + 하단 탭 네비).
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/coach', label: '경기' },
  { href: '/coach/bets', label: '기록' },
  { href: '/coach/report', label: '리포트' },
  { href: '/coach/settings', label: '설정' },
];

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => (href === '/coach' ? path === '/coach' : path.startsWith(href));
  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#fff', fontFamily: 'system-ui, "Malgun Gothic", sans-serif', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '18px 16px 8px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#3987e5,#1c5cab)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14 }}>TC</div>
        <div><div style={{ fontSize: 16, fontWeight: 800 }}>TrendCoach</div><div style={{ fontSize: 10.5, color: '#898781', fontWeight: 600 }}>KSM 승부예측 코치</div></div>
      </header>
      <main style={{ flex: 1, padding: '0 16px 92px' }}>{children}</main>
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', display: 'flex', background: 'rgba(13,13,13,.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255,255,255,.1)', padding: '10px 6px 16px' }}>
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} style={{ flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: isActive(t.href) ? '#3987e5' : '#898781', textDecoration: 'none' }}>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
