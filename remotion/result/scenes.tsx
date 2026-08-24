// remotion/result/scenes.tsx
// 포맷 B — 어제 성적표

import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { BRAND_C1, BRAND_C2, SAFE } from '../theme'
import { fadeUp, fill, glow, pop } from '../anim'
import { LeagueEmblem, SafeLogo } from '../components/PickCard'
import { NO_MID_BREAK, displayTeam, fitFont } from '../components/teamName'
import type { MatchResult, ResultProps } from './types'

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

const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const wd = days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${m}월 ${d}일 ${wd}요일`
}

// ── 1. HOOK — 뒤집힌 카드 ────────────────────────────────
export const SceneResultHook: React.FC<{ data: ResultProps }> = ({ data }) => {
  const frame = useCurrentFrame()
  const n = data.results.length

  return (
    <AbsoluteFill style={{ ...center, gap: 36 }}>
      <div style={{ ...fadeUp(frame, 0), fontSize: 39, color: '#94a3b8', fontWeight: 700, letterSpacing: 7 }}>
        {dateLabel(data.date)} · {data.groupLabel}
      </div>

      <div style={{ ...fadeUp(frame, 8), fontSize: 51, fontWeight: 900, textAlign: 'center', lineHeight: 1.35 }}>
        AI가 예측한
        <br />
        <span style={{ ...gradText(96) }}>{n}경기</span>
      </div>

      {/* 카드백 — 아직 뒤집히지 않은 상태 */}
      <div style={{ display: 'flex', gap: 21, marginTop: 18 }}>
        {data.results.map((_, i) => (
          <div
            key={i}
            style={{
              ...pop(frame, 22 + i * 5),
              width: 114,
              height: 156,
              borderRadius: 21,
              background: 'linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)',
              border: '3px solid rgba(255,255,255,0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 60,
              fontWeight: 900,
              color: '#475569',
            }}
          >
            ?
          </div>
        ))}
      </div>

      <div
        style={{
          ...fadeUp(frame, 60),
          marginTop: 18,
          fontSize: 54,
          fontWeight: 900,
          color: BRAND_C1,
          ...glow(frame, BRAND_C1, BRAND_C2),
        }}
      >
        결과는?
      </div>
    </AbsoluteFill>
  )
}

// ── 2. RESULTS — 순차 오픈 ───────────────────────────────

/**
 * 스코어 한쪽 팀 블록.
 *
 * 홈은 오른쪽 정렬(스코어 쪽으로 붙고), 원정은 왼쪽 정렬이다.
 * 양쪽이 flex:1 로 같은 너비를 가져가므로 한 팀 이름이 길어도
 * 반대편을 밀어내지 않는다.
 */
const TeamSide: React.FC<{ r: MatchResult; side: 'home' | 'away'; scale: number }> = ({
  r,
  side,
  scale,
}) => {
  const t = side === 'home' ? r.home : r.away
  const name = displayTeam(t.name)
  // 5자까지는 36px, 그 이상은 비례 축소 (최소 24px)
  const fs = fitFont(name, 36 * scale, 24 * scale, 5)
  const logo = <SafeLogo src={t.logo} name={name} size={45 * scale} />

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: side === 'home' ? 'flex-end' : 'flex-start',
        gap: 12 * scale,
      }}
    >
      {side === 'home' ? logo : null}
      <span
        style={{
          fontSize: fs,
          fontWeight: 800,
          color: '#e2e8f0',
          lineHeight: 1.15,
          textAlign: side === 'home' ? 'right' : 'left',
          ...NO_MID_BREAK,
        }}
      >
        {name}
      </span>
      {side === 'away' ? logo : null}
    </div>
  )
}

const ResultCard: React.FC<{ r: MatchResult; index: number; delay: number; compact?: boolean }> = ({
  r,
  index,
  delay,
  compact = false,
}) => {
  const frame = useCurrentFrame()
  const t = frame - delay

  // Y축 회전으로 뒤집힌다
  const flip = interpolate(t, [0, 18], [180, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (x) => 1 - Math.pow(1 - x, 3),
  })
  const revealed = t >= 9
  const stampScale = interpolate(t, [26, 34, 40], [0.4, 1.18, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const stampOpacity = interpolate(t, [26, 32], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // 맞았으면 초록 글로우, 틀렸으면 담담한 회색.
  // 조롱하는 톤이 되지 않게 흔들림이나 붉은 강조는 쓰지 않는다.
  const ok = r.isCorrect
  const accent = ok ? BRAND_C1 : r.isDraw ? '#64748b' : '#475569'
  const scale = compact ? 0.82 : 1

  return (
    <div
      style={{
        opacity: interpolate(t, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        transform: `perspective(1600px) rotateY(${flip}deg)`,
        transformStyle: 'preserve-3d',
        width: '100%',
        padding: `${36 * scale}px ${36 * scale}px`,
        borderRadius: 30,
        background: ok
          ? `linear-gradient(135deg, ${BRAND_C1}1f 0%, ${BRAND_C2}0f 100%)`
          : 'rgba(255,255,255,0.04)',
        border: `3px solid ${ok ? `${BRAND_C1}77` : 'rgba(255,255,255,0.08)'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 24 * scale,
        filter: revealed ? 'none' : 'brightness(0.4)',
      }}
    >
      {/* 리그 */}
      <div style={{ width: 57 * scale, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        <LeagueEmblem src={r.leagueLogo} size={51 * scale} />
      </div>

      {/* 경기
          한 줄에 [홈][스코어][원정] 을 그냥 늘어놓으면 NPB·MLB 처럼 팀명이 길 때
          어절 중간에서 잘린다("요미우리 자이 / 언츠").
          스코어를 가운데 고정 폭으로 두고 양옆을 같은 너비로 나눠 준 뒤,
          이름은 축약 + 길이에 따른 자동 축소로 처리한다. */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 * scale }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 * scale }}>
          <TeamSide r={r} side="home" scale={scale} />
          <span
            style={{
              fontSize: 45 * scale,
              fontWeight: 900,
              color: '#fff',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              padding: `0 ${6 * scale}px`,
            }}
          >
            {r.homeScore ?? '-'} : {r.awayScore ?? '-'}
          </span>
          <TeamSide r={r} side="away" scale={scale} />
        </div>
        <div style={{ fontSize: 28 * scale, color: '#94a3b8', fontWeight: 700, ...NO_MID_BREAK }}>
          AI 예측 <span style={{ color: accent, fontWeight: 900 }}>{displayTeam(r.pickTeam)} 승</span>
          <span style={{ color: '#475569' }}> · {r.probability}%</span>
        </div>
      </div>

      {/* 판정 도장 */}
      <div
        style={{
          flexShrink: 0,
          transform: `scale(${stampScale})`,
          opacity: stampOpacity,
          width: 84 * scale,
          height: 84 * scale,
          borderRadius: '50%',
          background: ok ? `${BRAND_C1}2e` : 'rgba(255,255,255,0.05)',
          border: `3px solid ${ok ? BRAND_C1 : 'rgba(255,255,255,0.12)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: (r.isDraw && !ok ? 33 : 45) * scale,
          fontWeight: 900,
          color: ok ? BRAND_C1 : '#64748b',
          boxShadow: ok ? `0 0 30px ${BRAND_C1}44` : undefined,
        }}
      >
        {/* 무승부는 모델이 애초에 예측하지 않는 결과다.
            ❌ 로 찍으면 "틀렸다" 로만 읽히므로 '무' 로 따로 표시한다. */}
        {ok ? '✓' : r.isDraw ? '무' : '✕'}
      </div>
    </div>
  )
}

export const SceneResults: React.FC<{ data: ResultProps; perCard: number }> = ({ data, perCard }) => {
  const frame = useCurrentFrame()
  const compact = data.results.length >= 6

  return (
    <AbsoluteFill style={{ ...center, gap: 18 }}>
      <div style={{ ...fadeUp(frame, 0), fontSize: 36, fontWeight: 900, letterSpacing: 7, color: '#94a3b8', marginBottom: 12 }}>
        {data.windowLabel ?? '어제'} 결과
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
        {data.results.map((r, i) => (
          <ResultCard key={i} r={r} index={i} delay={10 + i * perCard} compact={compact} />
        ))}
      </div>
    </AbsoluteFill>
  )
}

// ── 3. SCORE — 집계 ──────────────────────────────────────
export const SceneScore: React.FC<{ data: ResultProps }> = ({ data }) => {
  const frame = useCurrentFrame()
  const { total, correct, draws } = data.summary
  const shown = Math.round(fill(frame, 16, correct, 30))
  const pctShown = Math.round(fill(frame, 30, data.summary.accuracy, 42))

  return (
    <AbsoluteFill style={{ ...center, gap: 30 }}>
      <div style={{ ...fadeUp(frame, 0), fontSize: 39, color: '#94a3b8', fontWeight: 700, letterSpacing: 6 }}>
        {total}경기 중
      </div>

      <div style={{ ...pop(frame, 10), ...gradText(216), filter: `drop-shadow(0 0 72px ${BRAND_C1}55)` }}>
        {shown}
        <span style={{ fontSize: 90 }}>적중</span>
      </div>

      <div style={{ ...fadeUp(frame, 30), width: '100%', maxWidth: 780 }}>
        <div style={{ height: 30, borderRadius: 12, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${pctShown}%`,
              height: '100%',
              borderRadius: 12,
              background: `linear-gradient(90deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)`,
              boxShadow: `0 0 27px ${BRAND_C1}66`,
            }}
          />
        </div>
        <div style={{ textAlign: 'center', marginTop: 15, fontSize: 45, fontWeight: 900, color: BRAND_C1 }}>
          {pctShown}%
        </div>
      </div>

      {draws > 0 ? (
        <div style={{ ...fadeUp(frame, 52), fontSize: 27, color: '#64748b', fontWeight: 700 }}>
          ※ {draws}경기는 무승부 — AI는 무승부를 예측하지 않습니다
        </div>
      ) : null}

      {/* 누적 — 기준을 반드시 병기한다.
          숫자만 크게 띄우고 기준을 빼면 체리피킹이 된다. */}
      {data.cumulative && data.cumulative.decisive > 50 ? (
        <div
          style={{
            ...fadeUp(frame, 66),
            marginTop: 18,
            padding: '24px 42px',
            borderRadius: 27,
            background: 'rgba(255,255,255,0.05)',
            border: '3px solid rgba(255,255,255,0.09)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 9,
          }}
        >
          <div style={{ fontSize: 27, color: '#94a3b8', fontWeight: 800, letterSpacing: 3 }}>
            승패가 갈린 경기 기준 누적
          </div>
          <div style={{ fontSize: 72, fontWeight: 900, color: '#fff' }}>
            {data.cumulative.accuracy}<span style={{ fontSize: 42 }}>%</span>
          </div>
          <div style={{ fontSize: 24, color: '#64748b', fontWeight: 700 }}>
            {data.groupLabel} · {data.cumulative.decisive.toLocaleString()}경기
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  )
}

// ── 4. CTA ──────────────────────────────────────────────
export const SceneResultCTA: React.FC<{ data: ResultProps }> = ({ data }) => {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill style={{ ...center, gap: 36 }}>
      <div
        style={{
          ...fadeUp(frame, 0),
          fontSize: 48,
          fontWeight: 800,
          color: '#e2e8f0',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        오늘 예측도
        <br />
        이미 올라와 있습니다
      </div>

      <div
        style={{
          ...pop(frame, 22),
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
