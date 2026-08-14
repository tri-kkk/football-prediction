'use client';
// app/coach/SplashScreen.tsx — 앱 초기 로딩 스플래시 ('시그널 발산' Canvas 애니메이션).
// 로고에서 연결망이 동심원 파동으로 퍼져나가는 연출. 최소 노출 후 fade out.
import { useEffect, useRef, useState } from 'react';

export function SplashScreen({ minMs = 3600 }: { minMs?: number }) {
  const [gone, setGone] = useState(false);
  const [fade, setFade] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // 세션 내 1회만
    try { if (sessionStorage.getItem('tc_splash_seen') === '1') { setGone(true); return; } } catch {}
    const start = Date.now();
    const timer = setTimeout(() => {
      setFade(true);
      setTimeout(() => { setGone(true); try { sessionStorage.setItem('tc_splash_seen', '1'); } catch {} }, 420);
    }, minMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (gone) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, CX = 0, CY = 0, raf = 0;
    const resize = () => {
      W = window.innerWidth; H = window.innerHeight; CX = W / 2; CY = H * 0.42;
      canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener('resize', resize);

    let seed = 777; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const N = 68; const nodes: any[] = [];
    for (let i = 0; i < N; i++) nodes.push({ a: rnd() * 6.2832, rad: 44 + rnd() * 260, ph: rnd() * 6.28, dr: 0.5 + rnd() * 0.7, br: rnd(), x: 0, y: 0 });
    const D = 55; const dust: any[] = [];
    for (let i = 0; i < D; i++) dust.push({ x: rnd(), y: rnd(), r: rnd() * 1.2, ph: rnd() * 6.28 });
    const CUBE = new Path2D('M32.5274 108L32 41.0191L88.4726 8L89 74.9809L32.5274 108ZM35.0985 84.7994L38.5048 78.7108L54.117 88.0129L50.7108 94.1015L85.6068 73.6979C80.2603 70.5123 74.8808 67.325 69.5492 64.1483C65.8129 70.2668 58.9216 72.805 53.8928 69.8088C48.8641 66.8126 47.5489 59.3848 50.8154 52.9863C45.4832 49.8093 40.1187 46.5951 34.7727 43.4099L35.0985 84.7994ZM35.3927 42.3018C40.7381 45.4867 46.1259 48.6745 51.4527 51.8484C55.1894 45.7328 62.0795 43.1956 67.1066 46.1909C72.1338 49.1862 73.4501 56.6119 70.1859 63.01C75.5123 66.1836 80.8818 69.4052 86.2273 72.5901L85.9015 31.2006L82.4952 37.2892L66.883 27.9871L70.2892 21.8985L35.3927 42.3018Z');

    const t0 = Date.now();
    const frame = () => {
      const T = ((Date.now() - t0) / 1000) * 2.2;
      const g = ctx.createRadialGradient(CX, CY, 30, CX, CY, H * 0.75);
      g.addColorStop(0, '#101e33'); g.addColorStop(0.55, '#0a1018'); g.addColorStop(1, '#08080a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (const d of dust) { const tw = 0.3 + 0.5 * Math.sin(T + d.ph); ctx.fillStyle = `rgba(120,160,210,${(0.12 * tw).toFixed(3)})`; ctx.beginPath(); ctx.arc(d.x * W, d.y * H, d.r, 0, 6.28); ctx.fill(); }
      for (const n of nodes) { const rr = n.rad + Math.sin(T * n.dr + n.ph) * 6; n.x = CX + Math.cos(n.a) * rr; n.y = CY + Math.sin(n.a) * rr * 0.82; }
      ctx.lineWidth = 0.7;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dd = Math.hypot(dx, dy);
        if (dd < 66) {
          const mx = (nodes[i].x + nodes[j].x) / 2 - CX, my = (nodes[i].y + nodes[j].y) / 2 - CY, dc = Math.hypot(mx, my);
          const wave = 0.5 + 0.5 * Math.sin(dc * 0.035 - T * 2.2); const a = (1 - dd / 66) * 0.55 * wave;
          if (a > 0.02) { ctx.strokeStyle = `rgba(70,155,245,${a.toFixed(3)})`; ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke(); }
        }
      }
      for (const n of nodes) {
        const dc = Math.hypot(n.x - CX, n.y - CY); const wave = 0.5 + 0.5 * Math.sin(dc * 0.035 - T * 2.2); const R = (0.9 + 1.4 * n.br) * (0.7 + 0.7 * wave);
        ctx.fillStyle = `rgba(130,195,255,${(0.35 + 0.55 * wave).toFixed(3)})`; ctx.beginPath(); ctx.arc(n.x, n.y, R, 0, 6.28); ctx.fill();
        if (n.br > 0.8) { ctx.fillStyle = `rgba(90,160,240,${(0.1 * wave).toFixed(3)})`; ctx.beginPath(); ctx.arc(n.x, n.y, R * 5, 0, 6.28); ctx.fill(); }
      }
      const lp = 0.5 + 0.5 * Math.sin(T);
      ctx.save(); ctx.translate(CX - 58, CY - 70); ctx.scale(1.15, 1.15);
      ctx.shadowColor = `rgba(74,160,240,${0.55 + 0.4 * lp})`; ctx.shadowBlur = 26 + 12 * lp;
      const lg = ctx.createLinearGradient(32, 8, 89, 108); lg.addColorStop(0, '#7fb8ff'); lg.addColorStop(1, '#1c5cab');
      ctx.fillStyle = lg; ctx.fill(CUBE); ctx.restore();
      ctx.shadowBlur = 0; ctx.textAlign = 'center';
      ctx.fillStyle = '#fff'; ctx.font = '800 26px system-ui, "Malgun Gothic", sans-serif'; ctx.fillText('TrendCoach', CX, CY + 72);
      ctx.fillStyle = '#8b8a84'; ctx.font = '800 11px system-ui'; ctx.fillText('K S M   S I G N A L   C O A C H', CX, CY + 94);
      const bw = 150, bx = CX - bw / 2, by = CY + 122; ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(bx, by, bw, 3);
      const sw = 46, phase = ((Date.now() - t0) / 1400) % 1.3 - 0.15, sx = bx + phase * bw;
      const sg = ctx.createLinearGradient(sx, 0, sx + sw, 0); sg.addColorStop(0, 'rgba(74,160,240,0)'); sg.addColorStop(0.5, 'rgba(130,195,255,.95)'); sg.addColorStop(1, 'rgba(74,160,240,0)');
      ctx.fillStyle = sg; const clx = Math.max(bx, sx); ctx.fillRect(clx, by, Math.min(sw, bx + bw - clx), 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [gone]);

  if (gone) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#08080a', opacity: fade ? 0 : 1, transition: 'opacity .42s ease', pointerEvents: fade ? 'none' : 'auto' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
