'use client';
// app/coach/layout.tsx — 코치 앱 공통 셸(헤더 + 하단 탭 네비).
// SessionProvider로 감싸 useSession/signIn 이 코치 하위 페이지에서 동작하게 함.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';

const TABS = [
  { href: '/coach', label: '홈' },
  { href: '/coach/matches', label: '경기' },
  { href: '/coach/bets', label: '기록' },
  { href: '/coach/report', label: '리포트' },
  { href: '/coach/settings', label: '설정' },
];

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => (href === '/coach' ? path === '/coach' : path.startsWith(href));
  return (
    <SessionProvider>
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#fff', fontFamily: 'system-ui, "Malgun Gothic", sans-serif', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '20px 16px 12px', display: 'flex', alignItems: 'center', gap: 11, background: 'linear-gradient(180deg,#0f1620,transparent)' }}>
        <svg height={32} viewBox="30 6 62 104" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flex: '0 0 auto' }} aria-hidden>
          <path fillRule="evenodd" clipRule="evenodd" d="M32.5274 108L32 41.0191L88.4726 8L89 74.9809L32.5274 108ZM34.3606 104.723L33.8679 42.132L86.6394 11.2768L87.1321 73.868L34.3606 104.723ZM35.0985 84.7994L38.5048 78.7108L54.117 88.0129L50.7108 94.1015L85.6068 73.6979C80.2603 70.5123 74.8808 67.325 69.5492 64.1483C65.8129 70.2668 58.9216 72.805 53.8928 69.8088C48.8641 66.8126 47.5489 59.3848 50.8154 52.9863C45.4832 49.8093 40.1187 46.5951 34.7727 43.4099L35.0985 84.7994ZM49.1673 95.0037L52.7383 88.6207L38.6841 80.2469L35.1131 86.6299L35.2433 103.145L49.1673 95.0037ZM35.3927 42.3018C40.7381 45.4867 46.1259 48.6745 51.4527 51.8484C55.1894 45.7328 62.0795 43.1956 67.1066 46.1909C72.1338 49.1862 73.4501 56.6119 70.1859 63.01C75.5123 66.1836 80.8818 69.4052 86.2273 72.5901L85.9015 31.2006L82.4952 37.2892L66.883 27.9871L70.2892 21.8985L35.3927 42.3018ZM85.8864 29.3697L82.3154 35.7527L68.2612 27.379L71.8322 20.996L85.7567 12.8547L85.8864 29.3697ZM52.2148 52.3024C55.6544 46.7165 61.963 44.4056 66.5698 47.1504C71.1766 49.8953 72.3917 56.6889 69.4239 62.556L62.0022 58.134C62.155 57.4265 61.932 56.7271 61.3921 56.4054C60.8522 56.0837 60.1537 56.2341 59.6364 56.7244L52.2148 52.3024ZM68.7875 63.6935C65.3483 69.2825 59.0375 71.5947 54.4302 68.8495C49.8229 66.1044 48.6073 59.3079 51.5783 53.44L58.9989 57.8613C58.8445 58.5705 59.0669 59.2723 59.6079 59.5946C60.1489 59.9169 60.849 59.7648 61.3669 59.2722L68.7875 63.6935Z" fill="url(#tcSym)" />
          <defs><linearGradient id="tcSym" x1="32" y1="8" x2="89" y2="108" gradientUnits="userSpaceOnUse"><stop stopColor="#5aa0f0" /><stop offset="1" stopColor="#1c5cab" /></linearGradient></defs>
        </svg>
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -.5 }}>Trend<span style={{ background: 'linear-gradient(100deg,#5aa0f0,#3987e5)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Coach</span></div>
          <div style={{ fontSize: 10.5, color: '#898781', fontWeight: 600, marginTop: 4 }}>KSM 승부예측 코치</div>
        </div>
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
    </SessionProvider>
  );
}
