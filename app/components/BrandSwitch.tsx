'use client';
// app/components/BrandSwitch.tsx
// 브랜드/서비스 전환 — 브랜드명 옆 ▾ 트리거 → 바텀시트(모바일). TrendSoccer(분석) ↔ TrendCoach(베팅 관리).
// 세션은 .trendsoccer.com 공유라 전환해도 로그인 유지. 코치 앱·메인 모바일 헤더에서 공통 사용.
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

function Dia({ s = 15 }: { s?: number }) {
  return <span style={{ width: s, height: s, transform: 'rotate(45deg)', borderRadius: 3, background: 'linear-gradient(135deg,#8fc0ff,#3d82e6)', flex: '0 0 auto' }} />;
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

  const row = (kind: Brand, title: string, desc: string, icon: React.ReactNode) => {
    const isCur = kind === current;
    const href = kind === 'soccer' ? u.soccer : u.coach;
    const inner = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 11px', borderRadius: 12, marginBottom: 8, border: `1px solid ${isCur ? 'rgba(57,135,229,.28)' : 'rgba(255,255,255,.08)'}`, background: isCur ? 'rgba(57,135,229,.08)' : 'rgba(255,255,255,.02)' }}>
        <span style={{ width: 36, height: 36, flex: '0 0 auto', borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(57,135,229,.16)', border: '1px solid rgba(57,135,229,.3)', fontSize: 16 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>{title}</div>
          <div style={{ fontSize: 11, color: '#8f8e87', marginTop: 1 }}>{desc}</div>
        </div>
        {isCur
          ? <span style={{ color: '#4bd14b', fontWeight: 800, fontSize: 13, flex: '0 0 auto' }}>✓</span>
          : <span style={{ color: '#7fb4f5', fontSize: 15, flex: '0 0 auto' }}>↗</span>}
      </div>
    );
    return isCur ? inner : <a href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</a>;
  };

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'bswFade .2s ease' }}>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes bswFade{from{opacity:0}to{opacity:1}}@keyframes bswUp{from{transform:translateY(100%)}to{transform:none}}' }} />
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: '100%', margin: '0 auto', background: '#15151a', borderTopLeftRadius: 18, borderTopRightRadius: 18, border: '1px solid rgba(255,255,255,.1)', borderBottom: 0, padding: '8px 14px calc(env(safe-area-inset-bottom) + 18px)', animation: 'bswUp .26s cubic-bezier(.22,1,.36,1)' }}>
        <div style={{ width: 34, height: 4, borderRadius: 3, background: 'rgba(255,255,255,.22)', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 10, color: '#e9e8e2' }}>서비스 전환</div>
        {row('soccer', 'TrendSoccer', '예측 · 분석', '⚽')}
        {row('coach', 'TrendCoach', '베팅 기록 · CLV 관리', <Dia />)}
      </div>
    </div>,
    document.body
  );
}
