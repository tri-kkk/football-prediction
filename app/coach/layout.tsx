'use client';
// app/coach/layout.tsx — 코치 앱 공통 셸(헤더 + 하단 탭). 네이티브 앱 느낌(스티키 헤더·아이콘 탭·세이프에어리어·터치 피드백).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { SlipCartProvider } from './slipCart';

const TABS = [
  { href: '/coach', label: '홈', id: 'home' },
  { href: '/coach/matches', label: '경기', id: 'matches' },
  { href: '/coach/bets', label: '기록', id: 'bets' },
  { href: '/coach/report', label: '리포트', id: 'report' },
  { href: '/coach/settings', label: '설정', id: 'set' },
];
const ICON: Record<string, React.ReactNode> = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  matches: <><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /></>,
  bets: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h6" /></>,
  report: <path d="M4 20V10M10 20V4M16 20v-7M20 20H2" />,
  set: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><path d="M1 14h6M9 8h6M17 16h6" /></>,
};

const GLOBAL_CSS = `
* { -webkit-tap-highlight-color: transparent; }
html, body { margin:0; overscroll-behavior-y: none; background:#0d0d0d; }
body { -webkit-overflow-scrolling: touch; }
.tc-tab { transition: transform .1s ease, color .12s; }
.tc-tab:active { transform: scale(.9); }
.tc-noselect { -webkit-user-select:none; user-select:none; -webkit-touch-callout:none; }
button, a, [role=button] { touch-action: manipulation; }
`;

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => (href === '/coach' ? path === '/coach' : path.startsWith(href));
  return (
    <SessionProvider>
    <SlipCartProvider>
    <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#fff', fontFamily: 'system-ui, "Malgun Gothic", sans-serif', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <header className="tc-noselect" style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 11, padding: 'calc(env(safe-area-inset-top) + 15px) 16px 12px', background: 'rgba(13,13,13,.72)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <svg height={32} viewBox="30 6 62 104" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flex: '0 0 auto' }} aria-hidden>
          <path fillRule="evenodd" clipRule="evenodd" d="M32.5274 108L32 41.0191L88.4726 8L89 74.9809L32.5274 108ZM34.3606 104.723L33.8679 42.132L86.6394 11.2768L87.1321 73.868L34.3606 104.723ZM35.0985 84.7994L38.5048 78.7108L54.117 88.0129L50.7108 94.1015L85.6068 73.6979C80.2603 70.5123 74.8808 67.325 69.5492 64.1483C65.8129 70.2668 58.9216 72.805 53.8928 69.8088C48.8641 66.8126 47.5489 59.3848 50.8154 52.9863C45.4832 49.8093 40.1187 46.5951 34.7727 43.4099L35.0985 84.7994ZM49.1673 95.0037L52.7383 88.6207L38.6841 80.2469L35.1131 86.6299L35.2433 103.145L49.1673 95.0037ZM35.3927 42.3018C40.7381 45.4867 46.1259 48.6745 51.4527 51.8484C55.1894 45.7328 62.0795 43.1956 67.1066 46.1909C72.1338 49.1862 73.4501 56.6119 70.1859 63.01C75.5123 66.1836 80.8818 69.4052 86.2273 72.5901L85.9015 31.2006L82.4952 37.2892L66.883 27.9871L70.2892 21.8985L35.3927 42.3018ZM85.8864 29.3697L82.3154 35.7527L68.2612 27.379L71.8322 20.996L85.7567 12.8547L85.8864 29.3697ZM52.2148 52.3024C55.6544 46.7165 61.963 44.4056 66.5698 47.1504C71.1766 49.8953 72.3917 56.6889 69.4239 62.556L62.0022 58.134C62.155 57.4265 61.932 56.7271 61.3921 56.4054C60.8522 56.0837 60.1537 56.2341 59.6364 56.7244L52.2148 52.3024ZM68.7875 63.6935C65.3483 69.2825 59.0375 71.5947 54.4302 68.8495C49.8229 66.1044 48.6073 59.3079 51.5783 53.44L58.9989 57.8613C58.8445 58.5705 59.0669 59.2723 59.6079 59.5946C60.1489 59.9169 60.849 59.7648 61.3669 59.2722L68.7875 63.6935Z" fill="url(#tcSym)" />
          <defs><linearGradient id="tcSym" x1="32" y1="8" x2="89" y2="108" gradientUnits="userSpaceOnUse"><stop stopColor="#5aa0f0" /><stop offset="1" stopColor="#1c5cab" /></linearGradient></defs>
        </svg>
        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,.13)', flex: '0 0 auto', margin: '0 3px' }} />
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -.4 }}>Trend<span style={{ background: 'linear-gradient(100deg,#5aa0f0,#3987e5)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Coach</span></div>
          <div style={{ fontSize: 9.5, color: '#8b8a84', fontWeight: 700, marginTop: 6, letterSpacing: 2.4 }}>KSM SIGNAL COACH</div>
        </div>
      </header>

      <main style={{ flex: 1, padding: '0 16px calc(env(safe-area-inset-bottom) + 92px)' }}>{children}</main>

      <nav className="tc-noselect" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', display: 'flex', background: 'rgba(13,13,13,.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,.08)', padding: '9px 6px calc(env(safe-area-inset-bottom) + 10px)', zIndex: 30 }}>
        {TABS.map((t) => {
          const on = isActive(t.href);
          return (
            <Link key={t.href} href={t.href} className="tc-tab" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', color: on ? '#3987e5' : '#8b8a84' }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={on ? 2.2 : 1.9} strokeLinecap="round" strokeLinejoin="round">{ICON[t.id]}</svg>
              <span style={{ fontSize: 10, fontWeight: 700 }}>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
    </SlipCartProvider>
    </SessionProvider>
  );
}
