'use client';
// app/coach/layout.tsx — 코치 앱 공통 셸(헤더 + 하단 탭). 네이티브 앱 느낌(스티키 헤더·아이콘 탭·세이프에어리어·터치 피드백).
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { SlipCartProvider } from './slipCart';
import { Toaster } from './toast';
import { registerSW } from './pushClient';
import { SplashScreen } from './SplashScreen';

const TABS = [
  { href: '/coach', label: '홈', id: 'home' },
  { href: '/coach/matches', label: '경기', id: 'matches' },
  { href: '/coach/bets', label: '기록', id: 'bets' },
  { href: '/coach/report', label: '리포트', id: 'report' },
  { href: '/coach/settings', label: '설정', id: 'set' },
];
const ICON: Record<string, React.ReactNode> = {
  home: <><path d="m3 9.2 9-6.8 9 6.8V20a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 20z" /><path d="M9.2 21.4V13h5.6v8.4" /></>,
  matches: <><circle cx="12" cy="12" r="9" /><path d="M12 8.2l2.7 1.95-1.03 3.2h-3.34L9.3 10.15z" /><path d="M12 3.3V8.2M14.7 10.15l3.3-1.05M13.67 13.35l1.95 3.2M10.33 13.35l-1.95 3.2M9.3 10.15 6 9.1" /></>,
  bets: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9.5h5M8 13.5h3.4" /><path d="m14.4 14.1 1.15 1.15 2.25-2.4" /></>,
  report: <><path d="M4 4v16h16" /><rect x="7" y="12" width="2.6" height="5.4" rx=".7" /><rect x="12" y="8.5" width="2.6" height="8.9" rx=".7" /><rect x="17" y="14.4" width="2.6" height="3" rx=".7" /></>,
  set: <><line x1="21" x2="14" y1="6.5" y2="6.5" /><line x1="10" x2="3" y1="6.5" y2="6.5" /><circle cx="12" cy="6.5" r="2.1" /><line x1="21" x2="16" y1="12" y2="12" /><line x1="12" x2="3" y1="12" y2="12" /><circle cx="14" cy="12" r="2.1" /><line x1="21" x2="10" y1="17.5" y2="17.5" /><line x1="6" x2="3" y1="17.5" y2="17.5" /><circle cx="8" cy="17.5" r="2.1" /></>,
};

const GLOBAL_CSS = `
* { -webkit-tap-highlight-color: transparent; }
html, body { margin:0; overscroll-behavior-y: none; background:#0d0d0d; }
body { -webkit-overflow-scrolling: touch; }
.tc-tab { transition: transform .1s ease, color .12s; }
.tc-tab:active { transform: scale(.9); }
.tc-noselect { -webkit-user-select:none; user-select:none; -webkit-touch-callout:none; }
button, a, [role=button] { touch-action: manipulation; }
.tc-press { transition: transform .09s ease, opacity .09s ease; }
.tc-press:active { transform: scale(.985); opacity:.92; }
@keyframes tcfade { from { opacity:0; transform: translateY(7px) } to { opacity:1; transform:none } }
.tc-fade { animation: tcfade .24s ease both; }
.tc-snap { scroll-snap-type: x proximity; }
.tc-snap > * { scroll-snap-align: start; }
.tc-hidebar::-webkit-scrollbar { display:none; }
.tc-hidebar { -ms-overflow-style:none; scrollbar-width:none; }
@keyframes tcshimmer { 0%{background-position:-220px 0} 100%{background-position:220px 0} }
.tc-skel { background:#161615; background-image:linear-gradient(90deg,#161615,#22221f,#161615); background-size:220px 100%; background-repeat:no-repeat; animation:tcshimmer 1.15s infinite linear; }
@keyframes tcslideup { from { transform: translateY(100%) } to { transform: translateY(0) } }
@keyframes tcscrim { from { opacity:0 } to { opacity:1 } }
.tc-sheet { animation: tcslideup .28s cubic-bezier(.22,1,.36,1); }
.tc-scrim { animation: tcscrim .22s ease; }
@keyframes tcspin { to { transform: rotate(360deg) } }
.tc-spin { animation: tcspin .7s linear infinite; }
@keyframes tctoast { from { opacity:0; transform: translateY(-14px) } to { opacity:1; transform:none } }
.tc-toast { animation: tctoast .22s ease; }
@keyframes tcslidein { from { transform: translateX(26px); opacity:0 } to { transform:none; opacity:1 } }
.tc-slidein { animation: tcslidein .26s cubic-bezier(.22,1,.36,1); }
/* 카드 stagger 등장 — 인라인 animation-delay로 순차 */
@keyframes tccardin { from { opacity:0; transform: translateY(10px) } to { opacity:1; transform:none } }
.tc-card-in { animation: tccardin .4s cubic-bezier(.2,.8,.2,1) both; }
/* 시그널 상위등급(S·A) 글로우 펄스 */
@keyframes tcgradeglow { 0%,100% { filter: drop-shadow(0 0 2px currentColor); opacity:.92 } 50% { filter: drop-shadow(0 0 8px currentColor); opacity:1 } }
.tc-grade-hot { animation: tcgradeglow 2.4s ease-in-out infinite; }
@keyframes tcgradepop { 0% { transform: scale(.6); opacity:0 } 60% { transform: scale(1.12) } 100% { transform: scale(1); opacity:1 } }
.tc-grade-pop { animation: tcgradepop .5s cubic-bezier(.2,.9,.3,1.4) both; }
@media (prefers-reduced-motion: reduce) { .tc-card-in,.tc-grade-hot,.tc-grade-pop { animation: none !important; } }
`;

function haptic() { try { (navigator as any).vibrate?.(6); } catch {} }

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => (href === '/coach' ? path === '/coach' : path.startsWith(href));
  useEffect(() => {
    registerSW();
    // coach 서브도메인은 i18n 미적용 → Chrome이 언어를 오탐(독일어)해 번역 팝업이 뜸. 한국어 고정.
    try { document.documentElement.lang = 'ko'; } catch {}
  }, []);
  return (
    <SessionProvider>
    <SlipCartProvider>
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#0d0d0d" />
    <meta name="google" content="notranslate" />
    <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
    <SplashScreen />
    <Toaster />
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

      <main style={{ flex: 1, padding: '0 16px calc(env(safe-area-inset-bottom) + 92px)' }}>
        <div key={path} className="tc-fade">{children}</div>
      </main>

      <nav className="tc-noselect" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', display: 'flex', background: 'rgba(13,13,13,.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,.08)', padding: '9px 6px calc(env(safe-area-inset-bottom) + 10px)', zIndex: 30 }}>
        {TABS.map((t) => {
          const on = isActive(t.href);
          return (
            <Link key={t.href} href={t.href} onClick={() => { haptic(); if (on) window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="tc-tab" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', color: on ? '#3987e5' : '#8b8a84' }}>
              <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 46, height: 28 }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: 15, background: 'rgba(57,135,229,.16)', opacity: on ? 1 : 0, transform: on ? 'scale(1)' : 'scale(.8)', transition: 'opacity .18s ease, transform .18s ease' }} />
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative' }}>{ICON[t.id]}</svg>
              </span>
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
