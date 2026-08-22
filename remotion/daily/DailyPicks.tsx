// remotion/daily/DailyPicks.tsx
// 포맷 A — 데일리 픽 리포트

import React from 'react'
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import { ensureFont, FONT_STACK } from '../font'
import { XFADE } from '../theme'
import { sceneFade } from '../anim'
import { Bgm } from '../components/Bgm'
import { Background } from '../components/Background'
import { Chrome } from '../components/Chrome'
import { INTRO_FRAMES, SceneIntro } from '../components/Intro'
import { SceneDailyCTA, SceneOpener, ScenePick, SceneSummary } from './scenes'
import type { DailyProps } from './types'

ensureFont()

export const DAILY_FRAMES = {
  intro: INTRO_FRAMES, // 1.2s 브랜드 스팅
  opener: 150,   // 2.5s
  pick: 300,     // 5.0s (픽 1개당) — 순위·폼·3way 를 넣으면서 4.0s 에서 늘림
  summary: 180,  // 3.0s
  cta: 150,      // 2.5s
}

/** 픽 개수에 따라 전체 길이가 달라진다 */
export const dailyDuration = (pickCount: number) =>
  DAILY_FRAMES.intro +
  DAILY_FRAMES.opener +
  DAILY_FRAMES.pick * Math.max(1, pickCount) +
  DAILY_FRAMES.summary +
  DAILY_FRAMES.cta

const SceneBox: React.FC<{
  frames: number
  video?: string | null
  children: React.ReactNode
}> = ({ frames, video, children }) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, frames, XFADE) }}>
      <Background c1="#2563eb" c2="#7c3aed" video={video} durationInFrames={frames} scrim={0.66} />
      {children}
    </AbsoluteFill>
  )
}

export const DailyPicks: React.FC<DailyProps> = (props) => {
  const { picks, bgm, backgrounds } = props
  const total = dailyDuration(picks.length)

  let cursor = DAILY_FRAMES.intro + DAILY_FRAMES.opener

  return (
    <AbsoluteFill style={{ fontFamily: FONT_STACK, backgroundColor: '#080c12' }}>
      <Bgm file={bgm} total={total} />

      {/* 브랜드 스팅 — Chrome(상단 워드마크)과 겹치지 않도록 이 구간엔 Chrome 을 띄우지 않는다 */}
      <Sequence from={0} durationInFrames={DAILY_FRAMES.intro}>
        <SceneIntro />
      </Sequence>

      <Sequence from={DAILY_FRAMES.intro} durationInFrames={DAILY_FRAMES.opener}>
        <SceneBox frames={DAILY_FRAMES.opener} video={backgrounds.opener}>
          <SceneOpener data={props} />
        </SceneBox>
      </Sequence>

      {picks.map((pick, i) => {
        const from = cursor
        cursor += DAILY_FRAMES.pick
        return (
          <Sequence key={i} from={from} durationInFrames={DAILY_FRAMES.pick}>
            <SceneBox frames={DAILY_FRAMES.pick} video={backgrounds.pick}>
              <ScenePick pick={pick} index={i} previous={picks.slice(0, i)} todayDate={props.date} />
            </SceneBox>
          </Sequence>
        )
      })}

      <Sequence from={cursor} durationInFrames={DAILY_FRAMES.summary}>
        <SceneBox frames={DAILY_FRAMES.summary} video={backgrounds.summary}>
          <SceneSummary data={props} />
        </SceneBox>
      </Sequence>

      <Sequence from={cursor + DAILY_FRAMES.summary} durationInFrames={DAILY_FRAMES.cta}>
        <SceneBox frames={DAILY_FRAMES.cta} video={backgrounds.cta}>
          <SceneDailyCTA data={props} />
        </SceneBox>
      </Sequence>

      {/* 인트로가 끝난 뒤부터 상·하단 고정 요소를 올린다 */}
      <Sequence from={DAILY_FRAMES.intro} durationInFrames={total - DAILY_FRAMES.intro}>
        <Chrome league={props.groupLabel} total={total - DAILY_FRAMES.intro} />
      </Sequence>
    </AbsoluteFill>
  )
}
