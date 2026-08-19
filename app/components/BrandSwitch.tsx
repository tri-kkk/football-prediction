'use client';
// app/components/BrandSwitch.tsx
// 브랜드/서비스 전환 — 브랜드명 옆 ▾ 트리거 → 바텀시트(모바일). TrendSoccer(분석) ↔ TrendCoach(베팅 관리).
// BI: 두 브랜드는 같은 심볼, 색만 다름(소커=라임·시안 / 코치=블루) = 브랜드 패밀리.
// 세션은 .trendsoccer.com 공유라 전환해도 로그인 유지. www ↔ coach 서브도메인.
import { useState } from 'react';
import { createPortal } from 'react-dom';

type Brand = 'soccer' | 'coach';

function urls() {
  const ext = typeof window !== 'undefined' && window.location.hostname.endsWith('trendsoccer.com');
  return {
    soccer: ext ? 'https://www.trendsoccer.com' : '/',
    coach: ext ? 'https://coach.trendsoccer.com' : '/coach',
  };
}

// 공용 로고 심볼(패스 동일, 그라데이션만 브랜드별)
const MARK_PATH = 'M32.5274 108L32 41.0191L88.4726 8L89 74.9809L32.5274 108ZM34.3606 104.723L33.8679 42.132L86.6394 11.2768L87.1321 73.868L34.3606 104.723ZM35.0985 84.7994L38.5048 78.7108L54.117 88.0129L50.7108 94.1015L85.6068 73.6979C80.2603 70.5123 74.8808 67.325 69.5492 64.1483C65.8129 70.2668 58.9216 72.805 53.8928 69.8088C48.8641 66.8126 47.5489 59.3848 50.8154 52.9863C45.4832 49.8093 40.1187 46.5951 34.7727 43.4099L35.0985 84.7994ZM49.1673 95.0037L52.7383 88.6207L38.6841 80.2469L35.1131 86.6299L35.2433 103.145L49.1673 95.0037ZM35.3927 42.3018C40.7381 45.4867 46.1259 48.6745 51.4527 51.8484C55.1894 45.7328 62.0795 43.1956 67.1066 46.1909C72.1338 49.1862 73.4501 56.6119 70.1859 63.01C75.5123 66.1836 80.8818 69.4052 86.2273 72.5901L85.9015 31.2006L82.4952 37.2892L66.883 27.9871L70.2892 21.8985L35.3927 42.3018ZM85.8864 29.3697L82.3154 35.7527L68.2612 27.379L71.8322 20.996L85.7567 12.8547L85.8864 29.3697ZM52.2148 52.3024C55.6544 46.7165 61.963 44.4056 66.5698 47.1504C71.1766 49.8953 72.3917 56.6889 69.4239 62.556L62.0022 58.134C62.155 57.4265 61.932 56.7271 61.3921 56.4054C60.8522 56.0837 60.1537 56.2341 59.6364 56.7244L52.2148 52.3024ZM68.7875 63.6935C65.3483 69.2825 59.0375 71.5947 54.4302 68.8495C49.8229 66.1044 48.6073 59.3079 51.5783 53.44L58.9989 57.8613C58.8445 58.5705 59.0669 59.2723 59.6079 59.5946C60.1489 59.9169 60.849 59.7648 61.3669 59.2722L68.7875 63.6935Z';

function Mark({ variant, size = 22 }: { variant: Brand; size?: number }) {
  const id = variant === 'soccer' ? 'bswMarkS' : 'bswMarkC';
  return (
    <svg height={size} viewBox="30 6 62 104" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ display: 'block' }}>
      <path fillRule="evenodd" clipRule="evenodd" d={MARK_PATH} fill={`url(#${id})`} />
      <defs>
        {variant === 'soccer' ? (
          <linearGradient id={id} x1="32" y1="8" x2="89" y2="108" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A3FF4C" /><stop offset="0.5" stopColor="#8FFF7A" /><stop offset="1" stopColor="#62F4FF" />
          </linearGradient>
        ) : (
          <linearGradient id={id} x1="32" y1="8" x2="89" y2="108" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5aa0f0" /><stop offset="1" stopColor="#1c5cab" />
          </linearGradient>
        )}
      </defs>
    </svg>
  );
}

function Wordmark({ variant }: { variant: Brand }) {
  const grad = variant === 'soccer'
    ? 'linear-gradient(100deg,#8FFF7A,#3ABFF0)'
    : 'linear-gradient(100deg,#5aa0f0,#3987e5)';
  const second = variant === 'soccer' ? 'Soccer' : 'Coach';
  return (
    <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: -.4, color: '#fff' }}>
      Trend<span style={{ background: grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{second}</span>
    </span>
  );
}

export default function BrandSwitch({ current, caretColor = '#8b8a84' }: { current: Brand; caretColor?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="서비스 전환"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 0, background: 'transparent', padding: '2px 3px', cursor: 'pointer', color: caretColor, flex: '0 0 auto' }}
      >
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && <BrandSheet current={current} onClose={() => setOpen(false)} />}
    </>
  );
}

function BrandSheet({ current, onClose }: { current: Brand; onClose: () => void }) {
  if (typeof document === 'undefined') return null;
  const u = urls();

  const row = (kind: Brand, desc: string) => {
    const isCur = kind === current;
    const href = kind === 'soccer' ? u.soccer : u.coach;
    const soc = kind === 'soccer';
    const accent = soc ? '120,230,140' : '57,135,229';       // rgb
    const jump = soc ? '#8fe6a8' : '#7fb4f5';
    const inner = (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 13, padding: '13px 12px', borderRadius: 14, marginBottom: 9,
        border: `1px solid ${isCur ? `rgba(${accent},.34)` : 'rgba(255,255,255,.08)'}`,
        background: isCur
          ? `linear-gradient(100deg, rgba(${accent},.12), rgba(${accent},.03))`
          : 'rgba(255,255,255,.02)',
      }}>
        <span style={{ width: 42, height: 42, flex: '0 0 auto', borderRadius: 11, display: 'grid', placeItems: 'center', background: `rgba(${accent},.12)`, border: `1px solid rgba(${accent},.28)` }}>
          <Mark variant={kind} size={22} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Wordmark variant={kind} />
          <div style={{ fontSize: 11.5, color: '#8f8e87', marginTop: 2 }}>{desc}</div>
        </div>
        {isCur
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, color: '#4bd14b', background: 'rgba(75,209,75,.13)', border: '1px solid rgba(75,209,75,.3)', padding: '3px 8px', borderRadius: 999, flex: '0 0 auto' }}>현재</span>
          : <span style={{ color: jump, fontSize: 16, flex: '0 0 auto' }}>↗</span>}
      </div>
    );
    return isCur ? inner : <a href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</a>;
  };

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'bswFade .2s ease' }}>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes bswFade{from{opacity:0}to{opacity:1}}@keyframes bswUp{from{transform:translateY(100%)}to{transform:none}}' }} />
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: '100%', margin: '0 auto', background: 'radial-gradient(120% 80% at 50% 0%, #171922 0%, #121620 55%, #0e1017 100%)', borderTopLeftRadius: 20, borderTopRightRadius: 20, border: '1px solid rgba(255,255,255,.1)', borderBottom: 0, padding: '9px 14px calc(env(safe-area-inset-bottom) + 18px)', animation: 'bswUp .28s cubic-bezier(.22,1,.36,1)' }}>
        <div style={{ width: 34, height: 4, borderRadius: 3, background: 'rgba(255,255,255,.22)', margin: '0 auto 14px' }} />
        <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 3, color: '#e9e8e2' }}>서비스 전환</div>
        <div style={{ fontSize: 11, color: '#77766f', marginBottom: 13 }}>하나의 계정으로 두 서비스를 오갈 수 있어요</div>
        {row('soccer', '경기 예측 · 심층 분석')}
        {row('coach', '베팅 기록 · CLV 관리')}
      </div>
    </div>,
    document.body
  );
}
