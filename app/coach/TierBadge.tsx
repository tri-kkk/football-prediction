'use client';
// app/coach/TierBadge.tsx — 헤더 등급 배지(분할) + 탭 시 이용권/구독 바텀시트.
//  메인 프리미엄=골드, 코치=블루 다이아. 둘 다 보유 시 분할 배지.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { coachApi, type MeRes } from '@/lib/coachApi';
import { haptic } from './haptic';

/** 메인 프리미엄 결제 URL — 코치 서브도메인이면 www로, 그 외엔 상대경로 */
function mainPremiumUrl(): string {
  if (typeof window === 'undefined') return '/premium/pricing';
  return window.location.hostname.endsWith('trendsoccer.com')
    ? 'https://www.trendsoccer.com/premium/pricing'
    : '/premium/pricing';
}
/** 트렌드사커 메인 홈 — 코치에서 메인으로 점프 */
function mainSiteUrl(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.hostname.endsWith('trendsoccer.com')
    ? 'https://www.trendsoccer.com'
    : '/';
}
/** 외부/교차 이동 표시 아이콘 (↗) */
function Jump() {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#9aa7b8" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M7 17 17 7M9 7h8v8" /></svg>;
}

const GOLD = '#ffd451', BLUE = '#7fb4f5';
function Diamond({ c, s = 9 }: { c: string; s?: number }) {
  return <span style={{ width: s, height: s, transform: 'rotate(45deg)', borderRadius: 2, background: c === GOLD ? 'linear-gradient(135deg,#ffe07a,#f5b70e)' : 'linear-gradient(135deg,#8fc0ff,#3d82e6)', flex: '0 0 auto' }} />;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

export function TierBadge() {
  const [me, setMe] = useState<MeRes | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { coachApi.me().then(setMe).catch(() => setMe(null)); }, []);

  // me 로딩 전엔 자리만 유지(레이아웃 점프 방지)
  if (!me) return <span style={{ marginLeft: 'auto', width: 62, height: 24 }} aria-hidden />;

  const tsA = me.ts.active, coA = me.coach.active;

  const pill = (bg: string, border: string, color: string, children: React.ReactNode) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 11, letterSpacing: .3, padding: '4px 11px', borderRadius: 999, background: bg, border: `1px solid ${border}`, color, whiteSpace: 'nowrap' }}>{children}</span>
  );

  let badge: React.ReactNode;
  if (tsA && coA) {
    // 분할 배지
    badge = (
      <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(255,255,255,.14)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, padding: '4px 9px', color: GOLD, background: 'rgba(245,197,24,.13)' }}><Diamond c={GOLD} s={7} />프리미엄</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, padding: '4px 9px', color: BLUE, background: 'rgba(57,135,229,.15)', borderLeft: '1px solid rgba(255,255,255,.14)' }}><Diamond c={BLUE} s={7} />코치</span>
      </span>
    );
  } else if (coA) {
    badge = pill('rgba(57,135,229,.15)', 'rgba(57,135,229,.4)', BLUE, <><Diamond c={BLUE} />코치</>);
  } else if (tsA) {
    badge = pill('rgba(245,197,24,.13)', 'rgba(245,197,24,.38)', GOLD, <><Diamond c={GOLD} />프리미엄</>);
  } else {
    badge = pill('rgba(255,255,255,.05)', 'rgba(255,255,255,.13)', '#a9a89f', <>무료</>);
  }

  return (
    <>
      <button onClick={() => { haptic(); setOpen(true); }} className="tc-press" aria-label="구독 등급" style={{ marginLeft: 'auto', border: 0, background: 'transparent', padding: 0, cursor: 'pointer', flex: '0 0 auto' }}>
        {badge}
      </button>
      {open && <PlanSheet me={me} onClose={() => setOpen(false)} />}
    </>
  );
}

function PlanSheet({ me, onClose }: { me: MeRes; onClose: () => void }) {
  const tsA = me.ts.active, coA = me.coach.active;
  const coDays = daysLeft(me.coach.expiresAt);
  const tsDays = daysLeft(me.ts.expiresAt);

  const activeChip = <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 7, color: '#4bd14b', background: 'rgba(75,209,75,.13)', border: '1px solid rgba(75,209,75,.3)', whiteSpace: 'nowrap' }}>이용중</span>;
  const ctaChip = (label: string) => <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 7, color: BLUE, background: 'rgba(57,135,229,.14)', border: '1px solid rgba(57,135,229,.32)', whiteSpace: 'nowrap' }}>{label}</span>;

  if (typeof document === 'undefined') return null;
  // 헤더의 backdrop-filter가 fixed의 컨테이닝 블록이 되므로 body로 포털 → 화면 중앙 모달.
  return createPortal(
    <div onClick={onClose} className="tc-scrim" style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>
      <div onClick={(e) => e.stopPropagation()} className="tc-fade" style={{ maxWidth: 400, width: '100%', maxHeight: '86vh', overflowY: 'auto', background: 'radial-gradient(120% 70% at 82% 0%, #1c2233 0%, #14161f 58%, #101013 100%)', borderRadius: 20, border: '1px solid rgba(255,255,255,.1)', padding: '18px 16px 16px', boxShadow: '0 24px 60px rgba(0,0,0,.55)' }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>내 구독</div>

        {/* 메인 프리미엄 (골드) — 보유 시 카드 탭으로 트렌드사커 메인 점프 */}
        {tsA ? (
          <a href={mainSiteUrl()} style={{ textDecoration: 'none', display: 'block' }}>
            <PlanCard tone="gold" title="트렌드사커 프리미엄" tag="메인" meta={`만료 ${fmtDate(me.ts.expiresAt)}${tsDays != null ? ` · ${tsDays}일 남음` : ''}`} right={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>{activeChip}<Jump /></span>} />
          </a>
        ) : (
          <a href={mainPremiumUrl()} style={{ textDecoration: 'none' }}>
            <PlanCard tone="off" toneDot="gold" title="트렌드사커 프리미엄" meta="메인 사이트 예측·분석 전체 · 광고 최소화" right={ctaChip('시작하기')} />
          </a>
        )}

        {/* 코치 플랜 (블루) */}
        {coA ? (
          <PlanCard tone="blue" title="코치 플랜" tag="코치" meta={`만료 ${fmtDate(me.coach.expiresAt)}${coDays != null ? ` · ${coDays}일 남음` : ''}`} right={activeChip} />
        ) : (
          <a href="/coach/pricing" style={{ textDecoration: 'none' }}>
            <PlanCard tone="off" toneDot="blue" title="코치 플랜" meta={me.bundleEligible ? 'KSM 시그널 · CLV 채점 · 코치 리포트 · 번들가 ₩6,900' : 'KSM 시그널 · CLV 채점 · 코치 리포트'} right={ctaChip('시작하기')} bundle={me.bundleEligible} />
          </a>
        )}

        <button onClick={onClose} className="tc-press" style={{ width: '100%', marginTop: 8, border: 0, background: 'rgba(255,255,255,.06)', color: '#c9c8bf', fontWeight: 800, fontSize: 13.5, padding: 13, borderRadius: 12, cursor: 'pointer' }}>닫기</button>
      </div>
    </div>,
    document.body
  );
}

function PlanCard({ tone, toneDot, title, tag, meta, right, bundle }: { tone: 'gold' | 'blue' | 'off'; toneDot?: 'gold' | 'blue'; title: string; tag?: string; meta: string; right: React.ReactNode; bundle?: boolean }) {
  const bg = tone === 'gold' ? 'rgba(245,197,24,.06)' : tone === 'blue' ? 'rgba(57,135,229,.07)' : 'rgba(255,255,255,.02)';
  const border = tone === 'gold' ? 'rgba(245,197,24,.22)' : tone === 'blue' ? 'rgba(57,135,229,.26)' : 'rgba(255,255,255,.13)';
  const dotColor = tone === 'off' ? (toneDot === 'gold' ? GOLD : BLUE) : (tone === 'gold' ? GOLD : BLUE);
  const icBg = tone === 'gold' ? 'rgba(245,197,24,.14)' : tone === 'blue' ? 'rgba(57,135,229,.16)' : 'rgba(255,255,255,.04)';
  const icBorder = tone === 'gold' ? 'rgba(245,197,24,.34)' : tone === 'blue' ? 'rgba(57,135,229,.36)' : 'rgba(255,255,255,.12)';
  const tagColor = tag === '메인' ? GOLD : BLUE;
  const tagBg = tag === '메인' ? 'rgba(245,197,24,.13)' : 'rgba(57,135,229,.15)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 12, marginBottom: 9, background: bg, border: `1px solid ${border}`, borderStyle: tone === 'off' ? 'dashed' : 'solid' }}>
      <span style={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: 11, display: 'grid', placeItems: 'center', background: icBg, border: `1px solid ${icBorder}` }}>
        <Diamond c={dotColor} s={14} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: tone === 'off' ? '#c3ccd8' : '#fff', display: 'flex', alignItems: 'center', gap: 7 }}>
          {title}
          {tag && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, color: tagColor, background: tagBg, border: `1px solid ${tagColor}44` }}>{tag}</span>}
        </div>
        <div style={{ fontSize: 11, color: '#9aa7b8', marginTop: 3, lineHeight: 1.4 }}>
          {bundle ? (<>KSM 시그널 · CLV 채점 · 코치 리포트 · <b style={{ color: '#7ee87e' }}>번들가 ₩6,900</b></>) : meta}
        </div>
      </div>
      {right}
    </div>
  );
}
