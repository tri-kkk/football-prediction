'use client';
// app/coach/toast.tsx — 상단 플로팅 토스트. 어디서든 showToast('메시지') 호출.
import { useEffect, useState } from 'react';

type Toast = { id: number; msg: string; type: 'ok' | 'err' };
let listeners: ((t: Toast) => void)[] = [];
let idc = 1;

export function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
  const t = { id: idc++, msg, type };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const l = (t: Toast) => {
      setToasts((p) => [...p, t]);
      setTimeout(() => setToasts((p) => p.filter((x) => x.id !== t.id)), 2400);
    };
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);

  return (
    <div style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top) + 12px)', left: 0, right: 0, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
      {toasts.map((t) => (
        <div key={t.id} className="tc-toast" style={{ maxWidth: 440, margin: '0 14px', background: t.type === 'err' ? 'rgba(178,45,45,.96)' : 'rgba(26,26,25,.96)', border: `1px solid ${t.type === 'err' ? 'rgba(255,120,120,.4)' : 'rgba(57,135,229,.4)'}`, color: '#fff', fontSize: 13, fontWeight: 700, padding: '11px 16px', borderRadius: 12, boxShadow: '0 12px 34px rgba(0,0,0,.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: t.type === 'err' ? '#ffd3d3' : '#4bd14b', fontWeight: 800 }}>{t.type === 'err' ? '!' : '✓'}</span>{t.msg}
        </div>
      ))}
    </div>
  );
}
