// remotion/scenes/Scenes.tsx
// 6개 씬 — 전부 1080x1920 네이티브 크기, 프레임 기반 애니메이션
//
// v2 스토리라인: hook(가림) → matchup → pitcher → analysis → reveal(공개) → cta

import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { BRAND_C1, BRAND_C2, SAFE } from '../theme'
import { fadeUp, fill, glow, pop, slideIn } from '../anim'
import { Crest, Donut, Stars } from '../components/Bits'
import { pickAnalysisLines } from '../timeline'
import type { Game, TeamMeta } from '../types'

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
  lineHeight: 0.9,
  background: `linear-gradient(135deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
})

const label = (fs = 39): React.CSSProperties => ({
  fontSize: fs,
  color: '#94a3b8',
  fontWeight: 700,
  letterSpacing: 8,
  textAlign: 'center',
})

export const formatMatchTime = (iso: string): string => {
  try {
    const d = new Date(iso)
    const kst = new Date(d.getTime() + 9 * 3600 * 1000)
    const h = kst.getUTCHours()
    const m = kst.getUTCMinutes()
    const ampm = h < 12 ? '오전' : '오후'
    const hh = h % 12 === 0 ? 12 : h % 12
    return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${ampm} ${hh}:${String(m).padStart(2, '0')}`
  } catch {
    return iso
  }
}

/** Math.random 없이 프레임만으로 결정되는 의사난수 (렌더 재현성 유지) */
const scrambleDigit = (frame: number, slot: number) =>
  Math.abs(Math.floor((Math.sin((frame * 12.9898 + slot * 78.233) * 43758.5453) % 1) * 10)) % 10

// ── 1. HOOK — 답을 숨긴다 ────────────────────────────────
export const SceneHook: React.FC<{ game: Game }> = ({ game }) => {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill style={{ ...center, gap: 30 }}>
      <div style={{ ...fadeUp(frame, 0), ...label(42) }}>
        AI가 오늘 {game.league} 에서
        <br />
        <span style={{ color: '#e2e8f0', fontWeight: 900 }}>가장 확신한 경기</span>
      </div>

      {/* 확신도만 먼저 보여준다 — 승률은 아직 숨김 */}
      <div style={{ ...fadeUp(frame, 14), marginTop: 12 }}>
        <Stars n={game.pick.stars} size={96} delay={16} />
      </div>

      <div
        style={{
          ...fadeUp(frame, 40),
          fontSize: 60,
          fontWeight: 900,
          textAlign: 'center',
          lineHeight: 1.3,
          marginTop: 24,
        }}
      >
        {game.home.ko}
        <span style={{ color: '#475569', margin: '0 18px', fontSize: 45 }}>vs</span>
        {game.away.ko}
      </div>

      {/* 승률은 끝까지 가린다.
          뒤에서 숫자가 계속 돌아가되 블러로 읽히지 않게 하고, 위에 ?? 를 겹친다.
          그냥 숫자만 돌리면 시청자가 마지막에 잡힌 값을 실제 승률로 오해한다. */}
      <div style={{ ...fadeUp(frame, 62), marginTop: 42, textAlign: 'center' }}>
        <div style={{ ...label(33), marginBottom: 12 }}>AI 예측 승률</div>
        <div style={{ position: 'relative', height: 190, width: '100%' }}>
          <div
            style={{
              ...gradText(180),
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontVariantNumeric: 'tabular-nums',
              filter: 'blur(20px)',
              opacity: 0.5,
            }}
          >
            {scrambleDigit(frame, 0)}
            {scrambleDigit(frame, 1)}
            <span style={{ fontSize: 90 }}>%</span>
          </div>
          <div
            style={{
              ...gradText(180),
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: `drop-shadow(0 0 60px ${BRAND_C1}55)`,
            }}
          >
            ??
            <span style={{ fontSize: 90 }}>%</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ── 2. MATCHUP ──────────────────────────────────────────
const TeamBlock: React.FC<{ t: TeamMeta; side: string; showLogo: boolean }> = ({ t, side, showLogo }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
    <Crest t={t} showLogo={showLogo} size={300} />
    <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 6, color: '#64748b' }}>{side}</div>
    <div style={{ fontSize: 54, fontWeight: 900, textAlign: 'center', lineHeight: 1.15 }}>{t.ko}</div>
  </div>
)

export const SceneMatchup: React.FC<{ game: Game; showLogos: boolean }> = ({ game, showLogos }) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={center}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, width: '100%', justifyContent: 'center' }}>
        <div style={{ flex: 1, ...slideIn(frame, 6, 'left') }}>
          <TeamBlock t={game.home} side="HOME" showLogo={showLogos} />
        </div>
        <div style={{ ...pop(frame, 18), ...gradText(96), letterSpacing: 4, flexShrink: 0 }}>VS</div>
        <div style={{ flex: 1, ...slideIn(frame, 6, 'right') }}>
          <TeamBlock t={game.away} side="AWAY" showLogo={showLogos} />
        </div>
      </div>

      <div style={{ ...fadeUp(frame, 40), marginTop: 84, fontSize: 36, color: '#94a3b8', letterSpacing: 3 }}>
        ⚾ {formatMatchTime(game.matchTime)}
      </div>

      {game.pick.grade ? (
        <div
          style={{
            ...pop(frame, 58),
            marginTop: 30,
            padding: '15px 42px',
            borderRadius: 21,
            border: `3px solid ${BRAND_C1}88`,
            background: `${BRAND_C1}1a`,
            fontSize: 33,
            fontWeight: 900,
            letterSpacing: 6,
            color: BRAND_C1,
          }}
        >
          {game.pick.grade}
        </div>
      ) : null}
    </AbsoluteFill>
  )
}

// ── 3. PITCHER — 근거 1 ─────────────────────────────────
const StatRow: React.FC<{
  name: string
  home: number | null
  away: number | null
  /** 낮을수록 좋은 지표면 true */
  lowerBetter: boolean
  hc: string
  ac: string
  delay: number
}> = ({ name, home, away, lowerBetter, hc, ac, delay }) => {
  const frame = useCurrentFrame()
  const h = home ?? 0
  const a = away ?? 0

  // 막대 길이는 "값"이 아니라 "우수함"을 나타낸다.
  // ERA·WHIP 처럼 낮을수록 좋은 지표는 그대로 그리면 나쁜 쪽 막대가 더 길어져 반대로 읽힌다.
  const goodness = (v: number) => {
    if (!h || !a) return v ? 100 : 0
    return lowerBetter ? (Math.min(h, a) / v) * 100 : (v / Math.max(h, a)) * 100
  }
  const hw = fill(frame, delay + 8, home == null ? 0 : goodness(h), 36)
  const aw = fill(frame, delay + 14, away == null ? 0 : goodness(a), 36)
  const homeWins = home != null && away != null && (lowerBetter ? h < a : h > a)
  const awayWins = home != null && away != null && !homeWins

  const bar = (w: number, c: string, right: boolean, win: boolean) => (
    <div
      style={{
        flex: 1,
        height: 33,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 9,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: right ? 'flex-start' : 'flex-end',
      }}
    >
      <div
        style={{
          width: `${w}%`,
          height: '100%',
          background: win ? `linear-gradient(90deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)` : `${c}bb`,
          borderRadius: 9,
          boxShadow: win ? `0 0 24px ${BRAND_C1}66` : undefined,
        }}
      />
    </div>
  )

  return (
    <div style={{ ...fadeUp(frame, delay, 36), display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 42, fontWeight: 900, color: homeWins ? BRAND_C1 : '#e2e8f0', width: 210 }}>
          {home ?? '—'}
        </div>
        <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: 5, color: '#64748b' }}>{name}</div>
        <div style={{ fontSize: 42, fontWeight: 900, color: awayWins ? BRAND_C1 : '#e2e8f0', width: 210, textAlign: 'right' }}>
          {away ?? '—'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 18 }}>
        {bar(hw, hc, false, homeWins)}
        {bar(aw, ac, true, awayWins)}
      </div>
    </div>
  )
}

export const ScenePitcher: React.FC<{ game: Game }> = ({ game }) => {
  const frame = useCurrentFrame()
  const p = game.pitchers

  const rows = [
    { name: 'ERA', home: p?.home.era ?? null, away: p?.away.era ?? null, lowerBetter: true },
    { name: 'WHIP', home: p?.home.whip ?? null, away: p?.away.whip ?? null, lowerBetter: true },
    { name: 'K', home: p?.home.k ?? null, away: p?.away.k ?? null, lowerBetter: false },
  ]

  // 몇 개 지표에서 앞서는지 — 마지막에 한 줄 요약으로 보여준다
  const homeWinCount = rows.filter(
    (r) => r.home != null && r.away != null && (r.lowerBetter ? r.home < r.away : r.home > r.away)
  ).length
  const awayWinCount = rows.filter(
    (r) => r.home != null && r.away != null && (r.lowerBetter ? r.away < r.home : r.away > r.home)
  ).length
  const leader = homeWinCount > awayWinCount ? game.home : awayWinCount > homeWinCount ? game.away : null
  const leaderPitcher =
    leader === game.home ? p?.home.name : leader === game.away ? p?.away.name : null
  const leadCount = Math.max(homeWinCount, awayWinCount)

  return (
    <AbsoluteFill style={{ ...center, gap: 42 }}>
      <div style={{ ...fadeUp(frame, 0), ...label(45), fontWeight: 900 }}>선발 투수 맞대결</div>

      <div style={{ display: 'flex', width: '100%', gap: 24 }}>
        {[
          { t: game.home, name: p?.home.name, from: 'left' as const },
          { t: game.away, name: p?.away.name, from: 'right' as const },
        ].map((x, i) => (
          <div
            key={i}
            style={{
              ...slideIn(frame, 8 + i * 4, x.from, 90),
              flex: 1,
              padding: '30px 24px',
              borderRadius: 30,
              background: `linear-gradient(160deg, ${x.t.c1}66 0%, ${x.t.c1}1f 100%)`,
              border: `3px solid ${x.t.c1}66`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 27, fontWeight: 900, letterSpacing: 4, color: '#cbd5e1' }}>{x.t.ab}</div>
            <div style={{ fontSize: 45, fontWeight: 900, textAlign: 'center', lineHeight: 1.15 }}>
              {x.name || '미정'}
            </div>
          </div>
        ))}
      </div>

      {/* 지표를 하나씩 순차 공개 — 5초 내내 화면이 움직이게 간격을 넓혔다 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 42, width: '100%', marginTop: 12 }}>
        {rows.map((r, i) => (
          <StatRow key={r.name} {...r} hc={game.home.c1} ac={game.away.c1} delay={40 + i * 52} />
        ))}
      </div>

      {leader && leadCount >= 2 ? (
        <div
          style={{
            ...fadeUp(frame, 212, 36),
            marginTop: 18,
            padding: '21px 42px',
            borderRadius: 24,
            background: `${BRAND_C1}1a`,
            border: `3px solid ${BRAND_C1}66`,
            fontSize: 36,
            fontWeight: 800,
            color: '#e2e8f0',
            textAlign: 'center',
          }}
        >
          <span style={{ color: BRAND_C1, fontWeight: 900 }}>
            {leaderPitcher || leader.ko}
          </span>
          {' '}
          {leadCount === 3 ? '3개 지표 전부 우위' : '3개 중 2개 지표 우위'}
        </div>
      ) : null}
    </AbsoluteFill>
  )
}

// ── 4. ANALYSIS — 근거 2 ────────────────────────────────
const TypedLine: React.FC<{ text: string; delay: number; fontSize: number; color?: string }> = ({
  text,
  delay,
  fontSize,
  color = '#e2e8f0',
}) => {
  const frame = useCurrentFrame()
  const chars = Math.floor(
    interpolate(frame - delay, [0, Math.max(24, text.length * 1.1)], [0, text.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  )
  const shown = text.slice(0, chars)
  const caretOn = chars < text.length && Math.floor(frame / 12) % 2 === 0

  return (
    <div
      style={{
        ...fadeUp(frame, delay, 24),
        fontSize,
        fontWeight: 700,
        color,
        lineHeight: 1.55,
        textAlign: 'left',
        width: '100%',
      }}
    >
      {shown}
      {caretOn ? <span style={{ color: BRAND_C1 }}>▌</span> : null}
    </div>
  )
}

export const SceneAnalysis: React.FC<{ game: Game }> = ({ game }) => {
  const frame = useCurrentFrame()
  const lines = pickAnalysisLines(game.aiAnalysis, 2)

  return (
    <AbsoluteFill style={{ ...center, gap: 42, alignItems: 'stretch' }}>
      <div style={{ ...fadeUp(frame, 0), ...label(42), fontWeight: 900 }}>AI 분석</div>

      <div
        style={{
          ...pop(frame, 8),
          padding: '48px 42px',
          borderRadius: 33,
          background: 'rgba(255,255,255,0.045)',
          border: '3px solid rgba(255,255,255,0.1)',
          borderLeft: `12px solid ${BRAND_C1}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 36,
        }}
      >
        {lines.map((l, i) => (
          <TypedLine key={i} text={l} delay={24 + i * 78} fontSize={i === 0 ? 45 : 39} color={i === 0 ? '#f1f5f9' : '#cbd5e1'} />
        ))}
      </div>
    </AbsoluteFill>
  )
}

// ── 5. REVEAL — 답 공개 (클라이맥스) ─────────────────────
export const SceneReveal: React.FC<{ game: Game }> = ({ game }) => {
  const frame = useCurrentFrame()
  const pickSide = game.pick.side
  const pickTeam = pickSide === 'home' ? game.home : game.away
  const other = pickSide === 'home' ? game.away : game.home
  const pickPct = pickSide === 'home' ? game.winRate.home : game.winRate.away
  const otherPct = pickSide === 'home' ? game.winRate.away : game.winRate.home

  return (
    <AbsoluteFill style={{ ...center, gap: 36 }}>
      <div style={{ ...fadeUp(frame, 0), ...label(45), fontWeight: 900 }}>그래서 AI의 결론은</div>

      <div style={{ ...pop(frame, 12) }}>
        <Donut pct={pickPct} size={540} stroke={48} delay={20} label={pickTeam.ko} />
      </div>

      <div style={{ ...fadeUp(frame, 96), display: 'flex', gap: 24, width: '100%' }}>
        {[
          { t: pickTeam, pct: pickPct, hi: true },
          { t: other, pct: otherPct, hi: false },
        ].map((x, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: '27px 24px',
              borderRadius: 27,
              background: x.hi
                ? `linear-gradient(135deg, ${BRAND_C1}2e 0%, ${BRAND_C2}1a 100%)`
                : 'rgba(255,255,255,0.04)',
              border: x.hi ? `3px solid ${BRAND_C1}88` : '3px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 9,
            }}
          >
            <div style={{ fontSize: 33, fontWeight: 800, color: '#cbd5e1' }}>{x.t.ko}</div>
            <div style={{ fontSize: 66, fontWeight: 900, color: x.hi ? BRAND_C1 : '#e2e8f0' }}>
              {Math.round(fill(frame, 98, x.pct, 36))}%
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

// ── 6. CTA ──────────────────────────────────────────────
export const SceneCTA: React.FC<{ game: Game }> = ({ game }) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ ...center, gap: 36 }}>
      <div style={{ ...fadeUp(frame, 0), ...label(36) }}>오늘의 PICK</div>

      <div
        style={{
          ...pop(frame, 6),
          padding: '42px 66px',
          borderRadius: 36,
          background: `linear-gradient(135deg, ${BRAND_C1}2e 0%, ${BRAND_C2}1a 100%)`,
          border: `4px solid ${BRAND_C1}aa`,
          boxShadow: `0 0 96px ${BRAND_C1}33`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 15,
        }}
      >
        <div style={{ fontSize: 84, fontWeight: 900, color: BRAND_C1, ...glow(frame, BRAND_C1, BRAND_C2) }}>
          {game.pick.team}
        </div>
        <div style={{ fontSize: 42, fontWeight: 800, color: '#e2e8f0', letterSpacing: 4 }}>승리 예측</div>
      </div>

      <div
        style={{
          ...fadeUp(frame, 30),
          marginTop: 18,
          fontSize: 36,
          color: '#94a3b8',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        오늘 경기 전체 분석은
        <br />
        <span style={{ color: '#fff', fontWeight: 800 }}>trendsoccer.com</span>
      </div>
    </AbsoluteFill>
  )
}
