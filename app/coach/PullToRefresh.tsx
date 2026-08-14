'use client';
// app/coach/PullToRefresh.tsx — 목록 상단에서 당기면 새로고침.
import { useRef, useState } from 'react';

export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<any> | void; children: React.ReactNode }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const active = useRef(false);
  const TH = 34; // 감쇠 후 임계값

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0 && !refreshing) { startY.current = e.touches[0].clientY; active.current = false; }
    else startY.current = null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    const d = e.touches[0].clientY - startY.current;
    if (d > 0 && window.scrollY <= 0) { active.current = true; setPull(Math.min(d * 0.5, 88)); }
    else { setPull(0); }
  };
  const onTouchEnd = async () => {
    if (startY.current == null) return;
    const shouldRefresh = active.current && pull >= TH;
    startY.current = null; active.current = false;
    if (shouldRefresh) {
      setRefreshing(true); setPull(46);
      try { await onRefresh(); } finally { setRefreshing(false); setPull(0); }
    } else setPull(0);
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div style={{ height: pull, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', transition: startY.current == null ? 'height .22s ease' : 'none' }}>
        <div style={{ paddingBottom: 8, opacity: pull > 8 ? 1 : 0 }}>
          <span className={refreshing ? 'tc-spin' : ''} style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid rgba(255,255,255,.18)', borderTopColor: '#3987e5', borderRadius: '50%', transform: refreshing ? undefined : `rotate(${pull * 4}deg)` }} />
        </div>
      </div>
      {children}
    </div>
  );
}
