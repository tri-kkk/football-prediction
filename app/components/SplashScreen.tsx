'use client';
// app/components/SplashScreen.tsx — TrendSoccer 초기 로딩 스플래시.
// 로고에서 분석 네트워크가 동심원 파동으로 퍼지는 Canvas 연출 (그린 팔레트).
// 세션 내 1회만 노출, 최소 노출 후 fade out. (coach SplashScreen 대응 버전)
import { useEffect, useRef, useState } from 'react';

const MARK_PATH = 'M32.5274 108L32 41.0191L88.4726 8L89 74.9809L32.5274 108ZM34.3606 104.723L33.8679 42.132L86.6394 11.2768L87.1321 73.868L34.3606 104.723ZM35.0985 84.7994L38.5048 78.7108L54.117 88.0129L50.7108 94.1015L85.6068 73.6979C80.2603 70.5123 74.8808 67.325 69.5492 64.1483C65.8129 70.2668 58.9216 72.805 53.8928 69.8088C48.8641 66.8126 47.5489 59.3848 50.8154 52.9863C45.4832 49.8093 40.1187 46.5951 34.7727 43.4099L35.0985 84.7994ZM49.1673 95.0037L52.7383 88.6207L38.6841 80.2469L35.1131 86.6299L35.2433 103.145L49.1673 95.0037ZM35.3927 42.3018C40.7381 45.4867 46.1259 48.6745 51.4527 51.8484C55.1894 45.7328 62.0795 43.1956 67.1066 46.1909C72.1338 49.1862 73.4501 56.6119 70.1859 63.01C75.5123 66.1836 80.8818 69.4052 86.2273 72.5901L85.9015 31.2006L82.4952 37.2892L66.883 27.9871L70.2892 21.8985L35.3927 42.3018ZM85.8864 29.3697L82.3154 35.7527L68.2612 27.379L71.8322 20.996L85.7567 12.8547L85.8864 29.3697ZM52.2148 52.3024C55.6544 46.7165 61.963 44.4056 66.5698 47.1504C71.1766 49.8953 72.3917 56.6889 69.4239 62.556L62.0022 58.134C62.155 57.4265 61.932 56.7271 61.3921 56.4054C60.8522 56.0837 60.1537 56.2341 59.6364 56.7244L52.2148 52.3024ZM68.7875 63.6935C65.3483 69.2825 59.0375 71.5947 54.4302 68.8495C49.8229 66.1044 48.6073 59.3079 51.5783 53.44L58.9989 57.8613C58.8445 58.5705 59.0669 59.2723 59.6079 59.5946C60.1489 59.9169 60.849 59.7648 61.3669 59.2722L68.7875 63.6935Z';

export default function SplashScreen({ minMs = 3600 }: { minMs?: number }) {
  const [gone, setGone] = useState(false);
  const [fade, setFade] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    try { if (sessionStorage.getItem('ts_splash_seen') === '1') { setGone(true); return; } } catch {}
    const timer = setTimeout(() => {
      setFade(true);
      setTimeout(() => { setGone(true); try { sessionStorage.setItem('ts_splash_seen', '1'); } catch {} }, 420);
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

    let seed = 501; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const N = 68; const nodes: any[] = [];
    for (let i = 0; i < N; i++) nodes.push({ a: rnd() * 6.2832, rad: 44 + rnd() * 260, ph: rnd() * 6.28, dr: 0.5 + rnd() * 0.7, br: rnd(), x: 0, y: 0 });
    const D = 55; const dust: any[] = [];
    for (let i = 0; i < D; i++) dust.push({ x: rnd(), y: rnd(), r: rnd() * 1.2, ph: rnd() * 6.28 });
    const CUBE = new Path2D(MARK_PATH);

    const t0 = Date.now();
    const frame = () => {
      const T = ((Date.now() - t0) / 1000) * 2.2;
      const g = ctx.createRadialGradient(CX, CY, 30, CX, CY, H * 0.75);
      g.addColorStop(0, '#0e2418'); g.addColorStop(0.55, '#0a140e'); g.addColorStop(1, '#08080a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (const d of dust) { const tw = 0.3 + 0.5 * Math.sin(T + d.ph); ctx.fillStyle = `rgba(150,225,170,${(0.12 * tw).toFixed(3)})`; ctx.beginPath(); ctx.arc(d.x * W, d.y * H, d.r, 0, 6.28); ctx.fill(); }
      for (const n of nodes) { const rr = n.rad + Math.sin(T * n.dr + n.ph) * 6; n.x = CX + Math.cos(n.a) * rr; n.y = CY + Math.sin(n.a) * rr * 0.82; }
      ctx.lineWidth = 0.7;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dd = Math.hypot(dx, dy);
        if (dd < 66) {
          const mx = (nodes[i].x + nodes[j].x) / 2 - CX, my = (nodes[i].y + nodes[j].y) / 2 - CY, dc = Math.hypot(mx, my);
          const wave = 0.5 + 0.5 * Math.sin(dc * 0.035 - T * 2.2); const a = (1 - dd / 66) * 0.55 * wave;
          if (a > 0.02) { ctx.strokeStyle = `rgba(105,240,135,${a.toFixed(3)})`; ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke(); }
        }
      }
      for (const n of nodes) {
        const dc = Math.hypot(n.x - CX, n.y - CY); const wave = 0.5 + 0.5 * Math.sin(dc * 0.035 - T * 2.2); const R = (0.9 + 1.4 * n.br) * (0.7 + 0.7 * wave);
        ctx.fillStyle = `rgba(165,255,150,${(0.35 + 0.55 * wave).toFixed(3)})`; ctx.beginPath(); ctx.arc(n.x, n.y, R, 0, 6.28); ctx.fill();
        if (n.br > 0.8) { ctx.fillStyle = `rgba(120,240,140,${(0.1 * wave).toFixed(3)})`; ctx.beginPath(); ctx.arc(n.x, n.y, R * 5, 0, 6.28); ctx.fill(); }
      }
      const lp = 0.5 + 0.5 * Math.sin(T);
      const lg = ctx.createLinearGradient(32, 8, 89, 108); lg.addColorStop(0, '#A3FF4C'); lg.addColorStop(0.5, '#8FFF7A'); lg.addColorStop(1, '#62F4FF');
      // 은은한 후광 (뒤) — 살짝만
      ctx.save(); ctx.translate(CX - 66, CY - 120); ctx.scale(1.3, 1.3);
      ctx.shadowColor = `rgba(120,240,150,${(0.26 + 0.16 * lp).toFixed(3)})`; ctx.shadowBlur = 11 + 4 * lp;
      ctx.globalAlpha = 0.45; ctx.fillStyle = lg; ctx.fill(CUBE, 'evenodd');
      ctx.restore();
      // 선명한 심볼 (앞) — 글로우에 묻히지 않게 BI 또렷하게
      ctx.save(); ctx.translate(CX - 66, CY - 120); ctx.scale(1.3, 1.3);
      ctx.fillStyle = lg; ctx.fill(CUBE, 'evenodd');
      ctx.restore();
      ctx.shadowBlur = 0; ctx.textAlign = 'center';
      ctx.fillStyle = '#fff'; ctx.font = '800 26px system-ui, "Malgun Gothic", sans-serif'; ctx.fillText('TrendSoccer', CX, CY + 72);
      ctx.fillStyle = '#7f9a86'; ctx.font = '800 11px system-ui'; ctx.fillText('A I   S P O R T S   A N A L Y S I S', CX, CY + 94);
      const bw = 150, bx = CX - bw / 2, by = CY + 122; ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(bx, by, bw, 3);
      const sw = 46, phase = ((Date.now() - t0) / 1400) % 1.3 - 0.15, sx = bx + phase * bw;
      const sg = ctx.createLinearGradient(sx, 0, sx + sw, 0); sg.addColorStop(0, 'rgba(105,240,135,0)'); sg.addColorStop(0.5, 'rgba(165,255,150,.95)'); sg.addColorStop(1, 'rgba(105,240,135,0)');
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
