// remotion/components/Intro.tsx
// 브랜드 스팅 — 모든 포맷 맨 앞에 붙는 1.2초 인트로.
//
// 숏폼에서 첫 1초는 가장 비싼 자리다. 로고만 띄우면 그냥 넘어간다.
// 그래서 짧게 끊고(72프레임), 브랜드와 동시에 "오늘 새 내용이 있다"는
// 신호를 같이 준다. 2초를 넘기면 이탈이 눈에 띄게 늘어난다.

import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame } from 'remotion'
import { BRAND_C1, BRAND_C2, FPS } from '../theme'
import { glow } from '../anim'

export const INTRO_FRAMES = 72 // 1.2s

export const SceneIntro: React.FC<{ tagline?: string }> = ({
  tagline = 'AI 승부예측 · 매일 업데이트',
}) => {
  const frame = useCurrentFrame()

  // 워드마크 — 스프링으로 튀어나온다
  const s = spring({ frame, fps: FPS, config: { damping: 13, stiffness: 190, mass: 0.6 } })
  const scale = interpolate(s, [0, 1], [0.62, 1])
  const markOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' })

  // 아래 라인 — 좌우로 뻗는다
  const lineW = interpolate(frame, [10, 34], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  })

  const tagOpacity = interpolate(frame, [26, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // 라이트 스윕 — 화면을 한 번 훑고 지나간다
  const sweep = interpolate(frame, [6, 40], [-60, 160], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // 마지막 12프레임: 살짝 확대되며 빠져나간다 (다음 씬으로 밀어내는 느낌)
  const exit = interpolate(frame, [INTRO_FRAMES - 12, INTRO_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#05080d',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${1 + exit * 0.12})`,
        opacity: 1 - exit,
      }}
    >
      {/* 배경 글로우 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 40% at 50% 50%, ${BRAND_C1}1f 0%, transparent 70%)`,
          opacity: markOpacity,
        }}
      />

      {/* 라이트 스윕 */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(105deg, transparent ${sweep - 18}%, ${BRAND_C2}26 ${sweep}%, transparent ${sweep + 18}%)`,
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 30,
          transform: `scale(${scale})`,
          opacity: markOpacity,
        }}
      >
        <div
          style={{
            fontSize: 138,
            fontWeight: 900,
            letterSpacing: -3,
            lineHeight: 1,
            background: `linear-gradient(135deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            ...glow(frame, BRAND_C1, BRAND_C2),
          }}
        >
          TrendSoccer
        </div>

        <div
          style={{
            width: `${lineW}%`,
            maxWidth: 660,
            height: 6,
            borderRadius: 3,
            background: `linear-gradient(90deg, transparent 0%, ${BRAND_C1} 30%, ${BRAND_C2} 70%, transparent 100%)`,
            boxShadow: `0 0 30px ${BRAND_C1}88`,
          }}
        />

        <div
          style={{
            opacity: tagOpacity,
            fontSize: 39,
            fontWeight: 800,
            letterSpacing: 8,
            color: '#94a3b8',
          }}
        >
          {tagline}
        </div>
      </div>
    </AbsoluteFill>
  )
}
