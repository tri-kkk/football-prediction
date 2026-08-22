// remotion/components/PickCard.tsx
// 포맷 A(데일리 픽)와 포맷 E(주말 TOP 5)가 공유하는 픽 카드.

import React, { useState } from 'react'
import { Img, useCurrentFrame } from 'remotion'
import { BRAND_C1, BRAND_C2 } from '../theme'
import { fadeUp, fill, pop, slideIn } from '../anim'
import { Stars } from './Bits'
import { NO_MID_BREAK, displayTeam, fitFont } from './teamName'
import type { DailyPick } from '../daily/types'

// 로드에 실패한 URL 을 모듈 레벨에 기억한다.
// Remotion 은 프레임마다 컴포넌트를 다시 마운트하므로, useState 만 쓰면
// 죽은 URL 을 1290번 다시 요청하게 되어 렌더가 10배 이상 느려진다.
const FAILED_LOGOS = new Set<string>()

/** 로고 URL 이 죽어 있어도 렌더가 실패하지 않게 팀명 이니셜로 폴백한다 */
export const SafeLogo: React.FC<{ src: string; name: string; size: number }> = ({ src, name, size }) => {
  const [failed, setFailed] = useState(!src || FAILED_LOGOS.has(src))

  if (failed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.24,
          background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
          border: '3px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.32,
          fontWeight: 900,
          color: '#cbd5e1',
        }}
      >
        {name.slice(0, 2)}
      </div>
    )
  }

  return (
    <Img
      src={src}
      onError={() => {
        FAILED_LOGOS.add(src)
        setFailed(true)
      }}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  )
}

/** 리그 엠블럼 — 실패하면 조용히 사라진다 (텍스트 라벨이 옆에 이미 있다) */
export const LeagueEmblem: React.FC<{ src?: string; size?: number }> = ({ src, size = 42 }) => {
  const [failed, setFailed] = useState(!src || FAILED_LOGOS.has(src as string))
  if (failed || !src) return null
  return (
    <Img
      src={src}
      onError={() => {
        FAILED_LOGOS.add(src)
        setFailed(true)
      }}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        // 리그 로고는 어두운 배경에서 잘 안 보이는 게 많다
        filter: 'brightness(1.35) drop-shadow(0 0 6px rgba(0,0,0,0.6))',
      }}
    />
  )
}

/** 최근 5경기 폼 — W 초록, D 회색, L 빨강 */
const FormRow: React.FC<{ form: string[]; size?: number }> = ({ form, size = 27 }) => {
  if (!form.length) return null
  const color: Record<string, string> = { W: BRAND_C1, D: '#64748b', L: '#ef4444' }
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {form.map((c, i) => (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size * 0.3,
            background: `${color[c] || '#334155'}${c === 'W' ? '' : 'cc'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.55,
            fontWeight: 900,
            color: c === 'W' ? '#0a0e14' : '#fff',
          }}
        >
          {c}
        </div>
      ))}
    </div>
  )
}

/**
 * 경기 시각. 오늘이 아니면 날짜를 같이 붙인다.
 *
 * 유럽 대항전은 현지 21:00 동시 킥오프라 한국시간으로 전부 오전 4시다.
 * 시각만 쓰면 카드 세 장에 "오전 4:00" 이 똑같이 찍혀 버그처럼 보인다.
 * "내일 오전 4:00" 처럼 날짜를 붙이면 오해가 없다.
 */
const timeLabel = (iso: string, todayDate?: string): string => {
  try {
    // 파싱 불가한 값이면 아무것도 그리지 않는다.
    // (예전에 "18:30" 같은 시각 문자열이 들어와 "NaN/NaN(undefined) 오후 NaN:NaN" 이 찍혔다)
    const base = new Date(iso)
    if (!iso || Number.isNaN(base.getTime())) return ''

    const kst = new Date(base.getTime() + 9 * 3600_000)
    const h = kst.getUTCHours()
    const m = kst.getUTCMinutes()
    const ampm = h < 12 ? '오전' : '오후'
    const hh = h % 12 === 0 ? 12 : h % 12
    const time = `${ampm} ${hh}:${String(m).padStart(2, '0')}`

    if (!todayDate) return time

    const matchDate = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`
    if (matchDate === todayDate) return time

    // 하루 차이면 "내일", 그 이상이면 요일
    const [ty, tm, td] = todayDate.split('-').map(Number)
    const diffDays = Math.round(
      (Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - Date.UTC(ty, tm - 1, td)) / 86400000
    )
    if (diffDays === 1) return `내일 ${time}`
    if (diffDays === -1) return `어제 ${time}`

    const wd = ['일', '월', '화', '수', '목', '금', '토'][kst.getUTCDay()]
    return `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}(${wd}) ${time}`
  } catch {
    return ''
  }
}

/** 화면 위쪽에 쌓이는 축소판 — 앞서 나온 픽을 계속 보여줘 누적감을 만든다 */
export const MiniPickCard: React.FC<{ pick: DailyPick; index: number }> = ({ pick, index }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      padding: '15px 30px',
      borderRadius: 21,
      background: 'rgba(255,255,255,0.05)',
      border: '2px solid rgba(255,255,255,0.08)',
      opacity: 0.72,
    }}
  >
    <span style={{ fontSize: 27, fontWeight: 900, color: '#94a3b8' }}>{'①②③④⑤'[index]}</span>
    <LeagueEmblem src={pick.leagueLogo} size={30} />
    <SafeLogo src={pick.home.logo} name={displayTeam(pick.home.name)} size={42} />
    <span style={{ fontSize: 24, color: '#64748b', fontWeight: 800 }}>vs</span>
    <SafeLogo src={pick.away.logo} name={displayTeam(pick.away.name)} size={42} />
    <span style={{ fontSize: 30, fontWeight: 900, color: BRAND_C1, marginLeft: 6 }}>
      {pick.probability}%
    </span>
  </div>
)

export const PickCard: React.FC<{
  pick: DailyPick
  index: number
  barDelay?: number
  /** 영상 기준일 (YYYY-MM-DD, KST). 경기 날짜가 다르면 "내일" 등을 붙인다. */
  todayDate?: string
}> = ({ pick, index, barDelay = 30, todayDate }) => {
  const frame = useCurrentFrame()
  const shownPct = fill(frame, barDelay, pick.probability, 42)

  const TeamCol: React.FC<{ t: typeof pick.home; from: 'left' | 'right'; isPick: boolean }> = ({
    t,
    from,
    isPick,
  }) => {
    // NPB·MLB 팀명은 한글로 옮기면 길어서 두 줄로 넘치고 어절 중간에서 끊긴다.
    // 축약형을 쓰고, 그래도 길면 글자 크기를 줄인다.
    const name = displayTeam(t.name)
    return (
    <div
      style={{
        ...slideIn(frame, 10, from, 70),
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
      }}
    >
      <SafeLogo src={t.logo} name={name} size={180} />
      <div
        style={{
          fontSize: fitFont(name, 42, 30, 6),
          fontWeight: 900,
          textAlign: 'center',
          lineHeight: 1.2,
          color: isPick ? BRAND_C1 : '#e2e8f0',
          ...NO_MID_BREAK,
        }}
      >
        {name}
      </div>

      {/* 순위 · 승점 — standings 조회 실패 시 줄 자체가 빠진다 */}
      {t.position != null ? (
        <div style={{ fontSize: 27, fontWeight: 800, color: '#94a3b8', letterSpacing: 1 }}>
          {t.position}위{t.points != null ? ` · ${t.points}점` : ''}
        </div>
      ) : null}

      <div style={{ ...fadeUp(frame, 26, 20) }}>
        <FormRow form={t.form} />
      </div>
    </div>
    )
  }

  return (
    <div
      style={{
        ...pop(frame, 0),
        width: '100%',
        padding: '48px 45px 54px',
        borderRadius: 42,
        background: 'linear-gradient(160deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.025) 100%)',
        border: '3px solid rgba(255,255,255,0.11)',
        boxShadow: '0 30px 90px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: 30,
      }}
    >
      {/* 번호 + 리그 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            ...pop(frame, 4),
            width: 60,
            height: 60,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 33,
            fontWeight: 900,
            color: '#0a0e14',
          }}
        >
          {index + 1}
        </div>
        <div style={{ ...pop(frame, 8), display: 'flex', alignItems: 'center', gap: 15 }}>
          <LeagueEmblem src={pick.leagueLogo} size={48} />
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 3, color: '#94a3b8' }}>
            {pick.leagueLabel}
          </div>
        </div>
      </div>

      {/* 팀 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
        <TeamCol t={pick.home} from="left" isPick={pick.pickSide === 'HOME'} />
        <div
          style={{
            ...pop(frame, 18),
            fontSize: 48,
            fontWeight: 900,
            color: '#475569',
            paddingTop: 75,
          }}
        >
          VS
        </div>
        <TeamCol t={pick.away} from="right" isPick={pick.pickSide === 'AWAY'} />
      </div>

      {/* 픽 + 승률 바 */}
      <div style={{ ...fadeUp(frame, barDelay - 8, 30), display: 'flex', flexDirection: 'column', gap: 15 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 18 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#94a3b8', minWidth: 0, ...NO_MID_BREAK }}>
            AI 픽 <span style={{ color: '#fff', fontWeight: 900 }}>{displayTeam(pick.pickTeam)}</span>
          </div>
          <div style={{ fontSize: 63, fontWeight: 900, color: BRAND_C1, flexShrink: 0 }}>
            {Math.round(shownPct)}%
          </div>
        </div>

        <div style={{ height: 33, borderRadius: 12, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${shownPct}%`,
              height: '100%',
              borderRadius: 9,
              background: `linear-gradient(90deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)`,
              boxShadow: `0 0 24px ${BRAND_C1}66`,
            }}
          />
        </div>

        {/* 승 / 무 / 패 3-way 분포 — 픽 확률 하나만 보여주면 근거가 없다 */}
        {pick.odds3 && pick.odds3.draw > 0 ? (
          <div style={{ ...fadeUp(frame, barDelay + 16, 20), display: 'flex', gap: 9, marginTop: 3 }}>
            {/* 라벨은 반드시 홈/원정 기준으로 쓴다.
                '승/무/패' 로 쓰면 원정팀을 픽했을 때 "패 62%" 에 하이라이트가 걸려
                "62% 확률로 진다" 로 읽힌다. */}
            {[
              { label: '홈', v: pick.odds3.home, on: pick.pickSide === 'HOME' },
              { label: '무', v: pick.odds3.draw, on: pick.pickSide === 'DRAW' },
              { label: '원정', v: pick.odds3.away, on: pick.pickSide === 'AWAY' },
            ].map((x, i) => (
              <div
                key={i}
                style={{
                  flex: Math.max(x.v, 12),
                  padding: '9px 0',
                  borderRadius: 12,
                  textAlign: 'center',
                  background: x.on ? `${BRAND_C1}2e` : 'rgba(255,255,255,0.05)',
                  border: x.on ? `2px solid ${BRAND_C1}88` : '2px solid rgba(255,255,255,0.07)',
                  fontSize: 27,
                  fontWeight: 800,
                  color: x.on ? BRAND_C1 : '#94a3b8',
                  whiteSpace: 'nowrap',
                }}
              >
                {x.label} {x.v}
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <Stars n={pick.stars} size={45} delay={barDelay + 24} />
          <div style={{ fontSize: 27, color: '#64748b', fontWeight: 700 }}>
            {timeLabel(pick.matchTime, todayDate)}
          </div>
        </div>
      </div>
    </div>
  )
}
