// remotion/weekend/WeekendTop5.tsx
// 포맷 E — 주말 TOP 5
//
// props 는 포맷 A(DailyProps)와 동일하다. picks 를 승률 순으로 정렬해
// 5위부터 1위까지 역순으로 공개한다.

import React from 'react'
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion'
import { ensureFont, FONT_STACK } from '../font'
import { XFADE } from '../theme'
import { sceneFade } from '../anim'
import { Background } from '../components/Background'
import { Chrome } from '../components/Chrome'
import { INTRO_FRAMES, SceneIntro } from '../components/Intro'
import { SceneRank, SceneWeekendCTA, SceneWeekendOpener } from './scenes'
import type { DailyProps } from '../daily/types'

ensureFont()

export const TOP5_FRAMES = {
  intro: INTRO_FRAMES, // 1.2s
  opener: 150,         // 2.5s
  rank: 180,           // 3.0s — 2~5위
  top: 270,            // 4.5s — 1위는 길게
  cta: 180,            // 3.0s
}

export const top5Duration = (n: number) => {
  const count = Math.max(1, n)
  return (
    TOP5_FRAMES.intro +
    TOP5_FRAMES.opener +
    TOP5_FRAMES.rank * Math.max(0, count - 1) +
    TOP5_FRAMES.top +
    TOP5_FRAMES.cta
  )
}

const SceneBox: React.FC<{ frames: number; video?: string | null; children: React.ReactNode }> = ({
  frames,
  video,
  children,
}) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, frames, XFADE) }}>
      <Background c1="#2563eb" c2="#7c3aed" video={video} durationInFrames={frames} scrim={0.68} />
      {children}
    </AbsoluteFill>
  )
}

export const WeekendTop5: React.FC<DailyProps> = (props) => {
  const { bgm, backgrounds } = props

  // 승률 높은 순 → 1위가 앞. 화면에는 낮은 순위부터 보여주므로 뒤집어 순회한다.
  const ranked = [...props.picks].sort((a, b) => b.probability - a.probability)
  const total = top5Duration(ranked.length)

  let cursor = TOP5_FRAMES.intro + TOP5_FRAMES.opener

  return (
    <AbsoluteFill style={{ fontFamily: FONT_STACK, backgroundColor: '#080c12' }}>
      {bgm ? <Audio src={staticFile(`sounds/${bgm}`)} volume={0.35} /> : null}

      <Sequence from={0} durationInFrames={TOP5_FRAMES.intro}>
        <SceneIntro tagline="주말 AI 예측 · TOP 5" />
      </Sequence>

      <Sequence from={TOP5_FRAMES.intro} durationInFrames={TOP5_FRAMES.opener}>
        <SceneBox frames={TOP5_FRAMES.opener} video={backgrounds.opener}>
          <SceneWeekendOpener data={{ ...props, picks: ranked }} />
        </SceneBox>
      </Sequence>

      {/* 낮은 순위부터 */}
      {ranked
        .map((pick, i) => ({ pick, rank: i + 1 }))
        .reverse()
        .map(({ pick, rank }) => {
          const isTop = rank === 1
          const frames = isTop ? TOP5_FRAMES.top : TOP5_FRAMES.rank
          const from = cursor
          cursor += frames
          return (
            <Sequence key={rank} from={from} durationInFrames={frames}>
              <SceneBox frames={frames} video={isTop ? backgrounds.summary : backgrounds.pick}>
                <SceneRank pick={pick} rank={rank} isTop={isTop} />
              </SceneBox>
            </Sequence>
          )
        })}

      <Sequence from={cursor} durationInFrames={TOP5_FRAMES.cta}>
        <SceneBox frames={TOP5_FRAMES.cta} video={backgrounds.cta}>
          <SceneWeekendCTA data={{ ...props, picks: ranked }} />
        </SceneBox>
      </Sequence>

      <Sequence from={TOP5_FRAMES.intro} durationInFrames={total - TOP5_FRAMES.intro}>
        <Chrome league={props.groupLabel} total={total - TOP5_FRAMES.intro} />
      </Sequence>
    </AbsoluteFill>
  )
}
