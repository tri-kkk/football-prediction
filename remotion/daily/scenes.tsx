// remotion/daily/scenes.tsx
// 포맷 A — 데일리 픽 리포트의 씬들

import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { BRAND_C1, BRAND_C2, SAFE } from '../theme'
import { fadeUp, fill, glow, pop } from '../anim'
import { LeagueEmblem, PickCard, MiniPickCard } from '../components/PickCard'
import { displayTeam, fitFont } from '../components/teamName'
import type { DailyPick, DailyProps } from './types'

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
  return `${y}. ${String(m).padStart(2, '0')}. ${String(d).padStart(2, '0')} ${wd}요일`
}

// ── 1. OPENER — 필터링 서사 ──────────────────────────────
//
// "오늘의 픽 3개" 라고만 하면 광고로 읽힌다.
// "18경기를 걸러서 3개가 남았다" 는 서사를 앞에 두면
// 같은 정보가 선별의 결과물로 읽히고 픽 하나하나의 무게가 달라진다.
export const SceneOpener: React.FC<{ data: DailyProps }> = ({ data }) => {
  const frame = useCurrentFrame()
  const total = data.totalMatches
  const passed = data.picks.length

  const counted = Math.round(fill(frame, 14, total, 40))

  // 오늘 경기가 적어서 전체 = 통과 인 날은 "걸러냈다" 서사가 성립하지 않는다.
  // (목요일처럼 유럽 리그 경기가 거의 없는 날) 이럴 땐 필터 연출을 생략한다.
  const showFilter = total > passed

  // 점 그리드 — 통과하지 못한 경기는 아래로 떨어져 사라진다
  const dots = Array.from({ length: Math.min(total, 24) })
  const dropStart = 62

  return (
    <AbsoluteFill style={{ ...center, gap: 30 }}>
      <div style={{ ...fadeUp(frame, 0), fontSize: 36, color: '#94a3b8', fontWeight: 700, letterSpacing: 6 }}>
        {dateLabel(data.date)}
      </div>

      <div style={{ ...fadeUp(frame, 8), fontSize: 33, color: '#64748b', fontWeight: 800, letterSpacing: 5 }}>
        {data.groupLabel} · {data.windowLabel ?? '오늘'} {showFilter ? '분석' : '경기'}
      </div>

      <div style={{ ...pop(frame, 12), ...gradText(240), filter: `drop-shadow(0 0 60px ${BRAND_C1}55)` }}>
        {counted}
        <span style={{ fontSize: 96 }}>경기</span>
      </div>

      {/* 필터 통과 연출 */}
      <div
        style={{
          display: showFilter ? 'flex' : 'none',
          flexWrap: 'wrap',
          gap: 18,
          justifyContent: 'center',
          maxWidth: 780,
          height: 130,
          marginTop: 18,
        }}
      >
        {dots.map((_, i) => {
          const survives = i < passed
          const t = interpolate(frame - dropStart - i * 2, [0, 26], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          const appear = interpolate(frame - 46, [0, 14], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          return (
            <div
              key={i}
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: survives
                  ? `linear-gradient(135deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)`
                  : '#334155',
                boxShadow: survives && t > 0.5 ? `0 0 30px ${BRAND_C1}aa` : undefined,
                opacity: appear * (survives ? 1 : 1 - t),
                transform: `translateY(${survives ? 0 : t * 140}px) scale(${survives ? 1 + t * 0.25 : 1})`,
              }}
            />
          )
        })}
      </div>

      <div
        style={{
          ...pop(frame, 96),
          marginTop: 12,
          padding: '21px 54px',
          borderRadius: 27,
          background: `linear-gradient(135deg, ${BRAND_C1}2e 0%, ${BRAND_C2}1a 100%)`,
          border: `3px solid ${BRAND_C1}aa`,
          fontSize: 45,
          fontWeight: 900,
          color: BRAND_C1,
          ...glow(frame, BRAND_C1, BRAND_C2),
        }}
      >
        {showFilter ? `AI 통과 ${passed}경기` : `AI 픽 ${passed}경기`}
      </div>
    </AbsoluteFill>
  )
}

// ── 2~4. PICK ───────────────────────────────────────────
export const ScenePick: React.FC<{
  pick: DailyPick
  index: number
  previous: DailyPick[]
  todayDate?: string
}> = ({ pick, index, previous, todayDate }) => {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill style={{ ...center, justifyContent: 'center', gap: 24 }}>
      {/* 앞서 나온 픽들이 위에 축소되어 쌓인다 */}
      {previous.length > 0 ? (
        <div style={{ ...fadeUp(frame, 0, 20), display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
          {previous.map((p, i) => (
            <MiniPickCard key={i} pick={p} index={i} />
          ))}
        </div>
      ) : null}

      <PickCard pick={pick} index={index} todayDate={todayDate} />
    </AbsoluteFill>
  )
}

// ── 5. SUMMARY — 캡처 유도 ───────────────────────────────
export const SceneSummary: React.FC<{ data: DailyProps }> = ({ data }) => {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill style={{ ...center, gap: 30 }}>
      <div style={{ ...fadeUp(frame, 0), fontSize: 42, fontWeight: 900, letterSpacing: 7, color: '#94a3b8' }}>
        오늘의 AI 픽
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 21, width: '100%' }}>
        {data.picks.map((p, i) => (
          <div
            key={i}
            style={{
              ...fadeUp(frame, 10 + i * 12, 36),
              display: 'flex',
              alignItems: 'center',
              gap: 21,
              padding: '27px 30px',
              borderRadius: 27,
              background: 'rgba(255,255,255,0.05)',
              border: '3px solid rgba(255,255,255,0.09)',
            }}
          >
            <div
              style={{
                width: 51,
                height: 51,
                flexShrink: 0,
                borderRadius: 15,
                background: `linear-gradient(135deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 27,
                fontWeight: 900,
                color: '#0a0e14',
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <LeagueEmblem src={p.leagueLogo} size={27} />
                <div style={{ fontSize: 24, color: '#64748b', fontWeight: 800, letterSpacing: 2 }}>
                  {p.leagueLabel}
                </div>
              </div>
              <div
                style={{
                  fontSize: fitFont(displayTeam(p.pickTeam), 36, 27, 7),
                  fontWeight: 900,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {displayTeam(p.pickTeam)}
              </div>
            </div>
            <div style={{ fontSize: 51, fontWeight: 900, color: BRAND_C1, flexShrink: 0 }}>
              {p.probability}%
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

// ── 6. CTA ──────────────────────────────────────────────
export const SceneDailyCTA: React.FC<{ data: DailyProps }> = ({ data }) => {
  const frame = useCurrentFrame()
  const rest = data.totalMatches - data.picks.length

  return (
    <AbsoluteFill style={{ ...center, gap: 36 }}>
      {/* 남은 경기가 없는 날엔 "0경기"가 떠버리므로 문구 자체를 바꾼다 */}
      {rest > 0 ? (
        <>
          <div style={{ ...pop(frame, 0), ...gradText(150), filter: `drop-shadow(0 0 60px ${BRAND_C1}44)` }}>
            {rest}
            <span style={{ fontSize: 66 }}>경기</span>
          </div>
          <div
            style={{
              ...fadeUp(frame, 18),
              fontSize: 42,
              fontWeight: 800,
              color: '#e2e8f0',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            나머지 경기 분석과
            <br />
            실시간 시장 흐름은
          </div>
        </>
      ) : (
        <div
          style={{
            ...fadeUp(frame, 4),
            fontSize: 45,
            fontWeight: 800,
            color: '#e2e8f0',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          경기별 상세 분석과
          <br />
          실시간 배당 흐름은
        </div>
      )}

      <div
        style={{
          ...pop(frame, 40),
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
