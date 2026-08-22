// remotion/weekend/scenes.tsx
// 포맷 E — 주말 TOP 5 (금요일 업로드)
//
// 카운트다운은 끝까지 보게 만드는 검증된 구조다.
// 5위부터 열고 1위를 마지막에 공개한다.

import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { BRAND_C1, BRAND_C2, SAFE } from '../theme'
import { fadeUp, glow, pop } from '../anim'
import { PickCard } from '../components/PickCard'
import { Stars } from '../components/Bits'
import type { DailyPick, DailyProps } from '../daily/types'

const center: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
}

const gradText = (fs: number): React.CSSProperties => ({
  fontSize: fs,
  fontWeight: 900,
  lineHeight: 0.95,
  background: `linear-gradient(135deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
})

const weekendLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const sat = new Date(Date.UTC(y, m - 1, d))
  const sun = new Date(Date.UTC(y, m - 1, d + 1))
  return `${sat.getUTCMonth() + 1}/${sat.getUTCDate()} 토 – ${sun.getUTCMonth() + 1}/${sun.getUTCDate()} 일`
}

// ── OPENER ──────────────────────────────────────────────
export const SceneWeekendOpener: React.FC<{ data: DailyProps }> = ({ data }) => {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill style={{ ...center, gap: 30 }}>
      <div style={{ ...fadeUp(frame, 0), fontSize: 36, color: '#94a3b8', fontWeight: 700, letterSpacing: 7 }}>
        {weekendLabel(data.date)} · {data.groupLabel}
      </div>

      <div style={{ ...fadeUp(frame, 10), fontSize: 54, fontWeight: 900, textAlign: 'center', lineHeight: 1.35 }}>
        이번 주말
        <br />
        AI가 가장 확신한
      </div>

      <div
        style={{
          ...pop(frame, 24),
          ...gradText(276),
          filter: `drop-shadow(0 0 84px ${BRAND_C1}55)`,
          letterSpacing: -4,
        }}
      >
        TOP {data.picks.length}
      </div>

      <div
        style={{
          ...fadeUp(frame, 62),
          marginTop: 12,
          fontSize: 36,
          color: '#64748b',
          fontWeight: 800,
          letterSpacing: 4,
        }}
      >
        {data.totalMatches}경기 중 선별
      </div>
    </AbsoluteFill>
  )
}

// ── RANK ────────────────────────────────────────────────
export const SceneRank: React.FC<{
  pick: DailyPick
  rank: number
  isTop: boolean
  todayDate?: string
}> = ({ pick, rank, isTop, todayDate }) => {
  const frame = useCurrentFrame()

  // 배경 워터마크 순위 숫자
  const wmOpacity = interpolate(frame, [0, 14], [0, isTop ? 0.22 : 0.13], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const wmScale = interpolate(frame, [0, 30], [1.25, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  })

  return (
    <AbsoluteFill>
      {/* 화면을 채우는 순위 숫자 */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          opacity: wmOpacity,
          transform: `scale(${wmScale})`,
        }}
      >
        <div
          style={{
            fontSize: 1100,
            fontWeight: 900,
            lineHeight: 0.8,
            color: isTop ? BRAND_C1 : '#ffffff',
            letterSpacing: -40,
          }}
        >
          {rank}
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ ...center, gap: 24 }}>
        {/* 순위 배지 */}
        <div
          style={{
            ...pop(frame, 2),
            display: 'flex',
            alignItems: 'center',
            gap: 15,
            padding: isTop ? '18px 48px' : '12px 36px',
            borderRadius: 24,
            background: isTop
              ? `linear-gradient(135deg, ${BRAND_C1}33 0%, ${BRAND_C2}22 100%)`
              : 'rgba(255,255,255,0.06)',
            border: isTop ? `3px solid ${BRAND_C1}aa` : '3px solid rgba(255,255,255,0.1)',
            ...(isTop ? glow(frame, BRAND_C1, BRAND_C2) : {}),
          }}
        >
          <span
            style={{
              fontSize: isTop ? 60 : 42,
              fontWeight: 900,
              color: isTop ? BRAND_C1 : '#cbd5e1',
            }}
          >
            {rank}위
          </span>
          {isTop ? (
            <span style={{ fontSize: 33, fontWeight: 800, color: '#e2e8f0', letterSpacing: 4 }}>
              최고 확신
            </span>
          ) : null}
        </div>

        {/* 카드 — 1위는 살짝 크게.
            배경 순위 숫자가 카드를 통과해 글씨를 방해하지 않도록
            카드 뒤에 어두운 판을 한 겹 깐다. */}
        <div
          style={{
            width: '100%',
            transform: `scale(${isTop ? 1 : 0.94})`,
            filter: isTop ? `drop-shadow(0 0 60px ${BRAND_C1}33)` : undefined,
            borderRadius: 42,
            background: 'rgba(8,12,18,0.93)',
          }}
        >
          <PickCard pick={pick} index={rank - 1} barDelay={24} todayDate={todayDate} />
        </div>

        {isTop ? (
          <div style={{ ...fadeUp(frame, 90), marginTop: 6 }}>
            <Stars n={pick.stars} size={54} delay={92} />
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

// ── CTA ─────────────────────────────────────────────────
export const SceneWeekendCTA: React.FC<{ data: DailyProps }> = ({ data }) => {
  const frame = useCurrentFrame()
  const rest = data.totalMatches - data.picks.length

  return (
    <AbsoluteFill style={{ ...center, gap: 36 }}>
      <div style={{ ...fadeUp(frame, 0), fontSize: 39, color: '#94a3b8', fontWeight: 700, letterSpacing: 6 }}>
        주말 전 경기 분석
      </div>

      {rest > 0 ? (
        <div style={{ ...pop(frame, 12), ...gradText(150), filter: `drop-shadow(0 0 60px ${BRAND_C1}44)` }}>
          {rest}
          <span style={{ fontSize: 66 }}>경기 더</span>
        </div>
      ) : null}

      <div
        style={{
          ...pop(frame, 34),
          padding: '27px 60px',
          borderRadius: 30,
          border: `4px solid ${BRAND_C1}aa`,
          background: `${BRAND_C1}14`,
          fontSize: 51,
          fontWeight: 900,
          color: '#fff',
        }}
      >
        trendsoccer.com
      </div>
    </AbsoluteFill>
  )
}
