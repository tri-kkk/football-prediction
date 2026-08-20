// remotion/anim.ts
// 기존 CSS 키프레임(ts-pop / ts-fadeUp / ts-slideR / ts-slideL / ts-glow)을
// 프레임 기반 함수로 재작성. CSS animation 은 화면녹화 타이밍에 의존해 프레임이
// 튀지만, 아래 함수들은 프레임 번호만 보고 값을 내므로 렌더가 결정론적이다.

import { interpolate, spring, type SpringConfig } from 'remotion'
import { FPS } from './theme'

const POP_SPRING: Partial<SpringConfig> = { damping: 12, stiffness: 180, mass: 0.7 }

/** ts-pop — scale 0.3 → 1, opacity 0 → 1 (오버슈트 있음) */
export const pop = (frame: number, delay = 0) => {
  const s = spring({ frame: frame - delay, fps: FPS, config: POP_SPRING })
  return {
    opacity: interpolate(frame - delay, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    transform: `scale(${interpolate(s, [0, 1], [0.3, 1])})`,
  }
}

/** ts-fadeUp — translateY 54px → 0, opacity 0 → 1 */
export const fadeUp = (frame: number, delay = 0, dist = 54) => {
  const p = interpolate(frame - delay, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const eased = 1 - Math.pow(1 - p, 3)
  return {
    opacity: eased,
    transform: `translateY(${(1 - eased) * dist}px)`,
  }
}

/** ts-slideR / ts-slideL — 좌·우에서 진입 */
export const slideIn = (frame: number, delay = 0, from: 'left' | 'right' = 'left', dist = 120) => {
  const s = spring({ frame: frame - delay, fps: FPS, config: { damping: 16, stiffness: 140, mass: 0.8 } })
  const sign = from === 'left' ? -1 : 1
  return {
    opacity: interpolate(frame - delay, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    transform: `translateX(${interpolate(s, [0, 1], [sign * dist, 0])}px)`,
  }
}

/** ts-glow — 텍스트 글로우 펄스 */
export const glow = (frame: number, c1: string, c2: string) => {
  const t = (Math.sin((frame / FPS) * Math.PI) + 1) / 2 // 0→1→0, 2초 주기
  const a = interpolate(t, [0, 1], [0.45, 0.7])
  const b = interpolate(t, [0, 1], [0.3, 0.5])
  const r1 = interpolate(t, [0, 1], [24, 40])
  const r2 = interpolate(t, [0, 1], [8, 16])
  return { textShadow: `0 0 ${r1 * 3}px ${c1}${alpha(a)}, 0 0 ${r2 * 3}px ${c2}${alpha(b)}` }
}

/** 0~1 알파를 2자리 hex 로 */
export const alpha = (v: number) =>
  Math.round(Math.max(0, Math.min(1, v)) * 255)
    .toString(16)
    .padStart(2, '0')

/** 0 → target 까지 채워지는 값 (막대/도넛 애니메이트용) */
export const fill = (frame: number, delay: number, target: number, dur = 45) => {
  const p = interpolate(frame - delay, [0, dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return target * (1 - Math.pow(1 - p, 3))
}

/** 씬 인/아웃 크로스페이드 */
export const sceneFade = (frame: number, total: number, xfade: number) =>
  interpolate(frame, [0, xfade, total - xfade, total], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

/** 배경에 아주 느린 줌을 걸어 정지 화면 느낌을 없앤다 (Ken Burns) */
export const kenBurns = (frame: number, total: number, amount = 0.06) =>
  `scale(${1 + (frame / total) * amount})`
