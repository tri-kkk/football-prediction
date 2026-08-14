'use client';
// app/coach/ExitGate.tsx — 홈에서 물리 뒤로가기 시 종료 확인 팝업 (TWA/Android).
// History API guard: 홈 진입 시 더미 state를 쌓고, popstate(뒤로가기)를 가로채 다이얼로그 노출.
import { useEffect, useRef, useState } from 'react';

export function ExitGate() {
  const [open, setOpen] = useState(false);
  const armed = useRef(true);

  useEffect(() => {
    try { window.history.pushState(null, '', window.location.href); } catch {}
    const onPop = () => {
      if (!armed.current) return;
      setOpen(true);
      try { window.history.pushState(null, '', window.location.href); } catch {} // 재무장 → 화면 유지
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const cancel = () => setOpen(false);
  const exit = () => {
    armed.current = false;
    setOpen(false);
    try { window.close(); } catch {}
    // TWA 루트에서 guard+home 제거 → 앱 종료
    setTimeout(() => { try { window.history.go(-2); } catch {} }, 10);
  };

  if (!open) return null;
  return (
    <div onClick={cancel} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(6,9,14,.62)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', animation: 'tcExitFade .18s ease' }}>
      <style>{`@keyframes tcExitFade{from{opacity:0}to{opacity:1}}@keyframes tcExitPop{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:none}}@keyframes tcExitGlow{0%,100%{opacity:.45}50%{opacity:.85}}`}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', overflow: 'hidden', width: '100%', maxWidth: 320, borderRadius: 22, padding: '26px 22px 20px', background: 'radial-gradient(120% 90% at 78% 8%, #16273f 0%, #0e1626 46%, #0b1119 100%)', border: '1px solid rgba(57,135,229,.32)', boxShadow: '0 24px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.05)', animation: 'tcExitPop .26s cubic-bezier(.2,.8,.2,1)' }}>
        {/* 배경 글로우 */}
        <div aria-hidden style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(57,135,229,.35), transparent 68%)', filter: 'blur(6px)', animation: 'tcExitGlow 3.4s ease-in-out infinite' }} />
        {/* 배경 네트워크 라인 (장식) */}
        <svg aria-hidden viewBox="0 0 200 140" style={{ position: 'absolute', top: 0, right: 0, width: 190, height: 130, opacity: .5 }}>
          <g stroke="rgba(90,160,240,.5)" strokeWidth="0.8" fill="none">
            <path d="M150 18 L182 34 L168 66 L134 54 Z" />
            <path d="M168 66 L196 82 M134 54 L120 92 M150 18 L120 28 M182 34 L196 12" />
          </g>
          <g fill="#7fb8ff">
            <circle cx="150" cy="18" r="2.2" /><circle cx="182" cy="34" r="1.8" /><circle cx="168" cy="66" r="2.4" />
            <circle cx="134" cy="54" r="1.8" /><circle cx="196" cy="82" r="1.6" /><circle cx="120" cy="92" r="2" /><circle cx="120" cy="28" r="1.6" />
          </g>
        </svg>

        <div style={{ position: 'relative' }}>
          {/* 로고 */}
          <div style={{ width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'linear-gradient(150deg,rgba(57,135,229,.22),rgba(57,135,229,.04))', border: '1px solid rgba(57,135,229,.4)', marginBottom: 15 }}>
            <svg width="26" height="26" viewBox="30 6 62 104" xmlns="http://www.w3.org/2000/svg">
              <defs><linearGradient id="egc" x1="32" y1="8" x2="89" y2="108" gradientUnits="userSpaceOnUse"><stop stopColor="#7fb8ff" /><stop offset="1" stopColor="#1c5cab" /></linearGradient></defs>
              <path fillRule="evenodd" clipRule="evenodd" fill="url(#egc)" d="M32.5274 108L32 41.0191L88.4726 8L89 74.9809L32.5274 108ZM35.0985 84.7994L38.5048 78.7108L54.117 88.0129L50.7108 94.1015L85.6068 73.6979C80.2603 70.5123 74.8808 67.325 69.5492 64.1483C65.8129 70.2668 58.9216 72.805 53.8928 69.8088C48.8641 66.8126 47.5489 59.3848 50.8154 52.9863C45.4832 49.8093 40.1187 46.5951 34.7727 43.4099L35.0985 84.7994ZM35.3927 42.3018C40.7381 45.4867 46.1259 48.6745 51.4527 51.8484C55.1894 45.7328 62.0795 43.1956 67.1066 46.1909C72.1338 49.1862 73.4501 56.6119 70.1859 63.01C75.5123 66.1836 80.8818 69.4052 86.2273 72.5901L85.9015 31.2006L82.4952 37.2892L66.883 27.9871L70.2892 21.8985L35.3927 42.3018Z" />
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -.4, color: '#fff' }}>앱을 종료할까요?</div>
          <div style={{ fontSize: 12.5, color: '#9fb0c4', marginTop: 6, lineHeight: 1.5 }}>TrendCoach를 종료합니다. 다시 열면 이어서 볼 수 있어요.</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={cancel} className="tc-press" style={{ WebkitAppearance: 'none', appearance: 'none', WebkitTapHighlightColor: 'transparent', flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.06)', color: '#dbe4ef', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
            <button onClick={exit} className="tc-press" style={{ WebkitAppearance: 'none', appearance: 'none', WebkitTapHighlightColor: 'transparent', flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(57,135,229,.9)', background: 'linear-gradient(180deg,#3e90ee,#2f74d0)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 16px rgba(57,135,229,.35)' }}>종료</button>
          </div>
        </div>
      </div>
    </div>
  );
}
