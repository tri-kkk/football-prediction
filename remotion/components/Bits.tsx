// remotion/components/Bits.tsx
// Stars / Crest / Donut — 1080 네이티브 크기로 재작성

import React from 'react'
import { useCurrentFrame } from 'remotion'
import { BRAND_C1, BRAND_C2 } from '../theme'
import { fill, pop } from '../anim'
import type { TeamMeta } from '../types'

export const Stars: React.FC<{ n: number; size?: number; delay?: number }> = ({
  n,
  size = 72,
  delay = 0,
}) => {
  const frame = useCurrentFrame()
  return (
    <div style={{ display: 'flex', gap: size * 0.14 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const on = i < n
        const a = pop(frame, delay + i * 4)
        return (
          <span
            key={i}
            style={{
              ...a,
              display: 'inline-block',
              fontSize: size,
              lineHeight: 1,
              color: on ? BRAND_C1 : '#334155',
              filter: on ? `drop-shadow(0 0 ${size * 0.35}px ${BRAND_C1}88)` : undefined,
            }}
          >
            ★
          </span>
        )
      })}
    </div>
  )
}

export const Crest: React.FC<{ t: TeamMeta; showLogo: boolean; size?: number }> = ({
  t,
  showLogo,
  size = 240,
}) => {
  const useLogo = showLogo && !!t.logo
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: useLogo ? '#fff' : `linear-gradient(135deg, ${t.c1} 0%, ${t.c2 || t.c1} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 24px 72px ${t.c1}55, inset 0 3px 0 rgba(255,255,255,0.18)`,
        border: '3px solid rgba(255,255,255,0.12)',
        overflow: 'hidden',
      }}
    >
      {useLogo ? (
        <img src={t.logo} style={{ width: '78%', height: '78%', objectFit: 'contain' }} />
      ) : (
        <span
          style={{
            fontSize: size * 0.36,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: 1,
            textShadow: '0 3px 12px rgba(0,0,0,0.45)',
          }}
        >
          {t.ab}
        </span>
      )}
    </div>
  )
}

export const Donut: React.FC<{
  pct: number
  size?: number
  stroke?: number
  delay?: number
  label?: string
}> = ({ pct, size = 480, stroke = 42, delay = 0, label }) => {
  const frame = useCurrentFrame()
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const shown = fill(frame, delay, pct, 54)
  const offset = circ * (1 - shown / 100)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="ts-donut-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BRAND_C1} />
            <stop offset="100%" stopColor={BRAND_C2} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ts-donut-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 ${stroke * 0.7}px ${BRAND_C1}88)` }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: size * 0.28, fontWeight: 900, lineHeight: 1 }}>
          {Math.round(shown)}
          <span style={{ fontSize: size * 0.12 }}>%</span>
        </div>
        {label ? (
          <div style={{ fontSize: size * 0.075, color: '#94a3b8', marginTop: 12, letterSpacing: 3 }}>
            {label}
          </div>
        ) : null}
      </div>
    </div>
  )
}
