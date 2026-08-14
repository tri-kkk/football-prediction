'use client';
// app/coach/useDragToClose.ts — 바텀시트 아래로 드래그해서 닫기.
import { useRef, useState } from 'react';

export function useDragToClose(onClose: () => void) {
  const [dy, setDy] = useState(0);
  const start = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => { start.current = e.touches[0].clientY; };
  const onTouchMove = (e: React.TouchEvent) => {
    if (start.current == null) return;
    const d = e.touches[0].clientY - start.current;
    if (d > 0) setDy(d);
  };
  const onTouchEnd = () => {
    if (dy > 90) onClose();
    setDy(0);
    start.current = null;
  };

  return {
    dragHandlers: { onTouchStart, onTouchMove, onTouchEnd },
    // dy가 있을 때만 inline transform → 등장 애니메이션(tc-sheet)과 충돌 방지
    sheetStyle: (dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : { transition: 'transform .25s ease' }) as React.CSSProperties,
  };
}
