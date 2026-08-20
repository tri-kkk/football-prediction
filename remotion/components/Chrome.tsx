// remotion/components/Chrome.tsx
// 전 씬 공통 상·하단 고정 요소 (워드마크 + AI PICK 뱃지 + 진행바 + 하단 CTA 바)

import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { BRAND_C1, BRAND_C2, LEAGUE_BADGE } from '../theme'

export const Wordmark: React.FC<{ height?: number }> = ({ height = 66 }) => (
  <div
    style={{
      fontSize: height,
      fontWeight: 900,
      letterSpacing: -1,
      lineHeight: 1,
      background: `linear-gradient(135deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}
  >
    TrendSoccer
  </div>
)

export const LeagueBadge: React.FC<{ name: string }> = ({ name }) => {
  const c = LEAGUE_BADGE[name] ?? { bg: '#334155', fg: '#fff' }
  return (
    <div
      style={{
        padding: '9px 27px',
        background: c.bg,
        color: c.fg,
        borderRadius: 12,
        fontSize: 33,
        fontWeight: 900,
        letterSpacing: 4,
      }}
    >
      {name}
    </div>
  )
}

export const Chrome: React.FC<{ league: string; total: number }> = ({ league, total }) => {
  const frame = useCurrentFrame()
  const progress = interpolate(frame, [0, total], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* 상단 헤더 */}
      <div
        style={{
          position: 'absolute',
          top: 84,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 27,
        }}
      >
        <Wordmark height={60} />
        <div
          style={{
            padding: '12px 30px',
            background: `linear-gradient(135deg, ${BRAND_C1}33 0%, ${BRAND_C2}22 100%)`,
            border: `3px solid ${BRAND_C1}aa`,
            borderRadius: 21,
            fontSize: 33,
            fontWeight: 900,
            letterSpacing: 7,
            color: BRAND_C1,
            textShadow: `0 0 24px ${BRAND_C1}66`,
          }}
        >
          AI PICK
        </div>
        <LeagueBadge name={league} />
      </div>

      {/* 진행바 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 9, background: 'rgba(255,255,255,0.08)' }}>
        <div
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)`,
            boxShadow: `0 0 24px ${BRAND_C1}`,
          }}
        />
      </div>

      {/* 하단 바 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 420,
          background: 'linear-gradient(180deg, transparent 0%, rgba(8,12,18,0.9) 55%, #080c12 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          // 유튜브 쇼츠는 하단 약 240px 를 제목·채널명 UI 가 덮는다. 그 위로 올린다.
          paddingBottom: 250,
          gap: 12,
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 800, color: '#e2e8f0', letterSpacing: 1 }}>
          trendsoccer.com
        </div>
        <div style={{ fontSize: 24, color: '#64748b', letterSpacing: 2 }}>
          매일 갱신되는 AI 승부예측
        </div>
      </div>
    </AbsoluteFill>
  )
}
