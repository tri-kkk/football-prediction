// remotion/result/DailyResults.tsx
// 포맷 B — 어제 성적표

import React from 'react'
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion'
import { ensureFont, FONT_STACK } from '../font'
import { XFADE } from '../theme'
import { sceneFade } from '../anim'
import { Background } from '../components/Background'
import { Chrome } from '../components/Chrome'
import { INTRO_FRAMES, SceneIntro } from '../components/Intro'
import { SceneResultCTA, SceneResultHook, SceneResults, SceneScore } from './scenes'
import type { ResultProps } from './types'

ensureFont()

export const RESULT_FRAMES = {
  intro: INTRO_FRAMES, // 1.2s
  hook: 150,           // 2.5s
  perCard: 84,         // 1.4s — 카드 1장당
  cardTail: 60,        // 마지막 카드가 열린 뒤 여운
  score: 240,          // 4.0s
  cta: 168,            // 2.8s
}

export const resultsSceneFrames = (n: number) =>
  RESULT_FRAMES.perCard * Math.max(1, n) + RESULT_FRAMES.cardTail

export const resultDuration = (n: number) =>
  RESULT_FRAMES.intro + RESULT_FRAMES.hook + resultsSceneFrames(n) + RESULT_FRAMES.score + RESULT_FRAMES.cta

const SceneBox: React.FC<{ frames: number; video?: string | null; children: React.ReactNode }> = ({
  frames,
  video,
  children,
}) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, frames, XFADE) }}>
      <Background c1="#2563eb" c2="#7c3aed" video={video} durationInFrames={frames} scrim={0.66} />
      {children}
    </AbsoluteFill>
  )
}

export const DailyResults: React.FC<ResultProps> = (props) => {
  const { results, bgm, backgrounds } = props
  const n = results.length
  const resFrames = resultsSceneFrames(n)
  const total = resultDuration(n)

  const hookAt = RESULT_FRAMES.intro
  const resAt = hookAt + RESULT_FRAMES.hook
  const scoreAt = resAt + resFrames
  const ctaAt = scoreAt + RESULT_FRAMES.score

  return (
    <AbsoluteFill style={{ fontFamily: FONT_STACK, backgroundColor: '#080c12' }}>
      {bgm ? <Audio src={staticFile(`sounds/${bgm}`)} volume={0.35} /> : null}

      <Sequence from={0} durationInFrames={RESULT_FRAMES.intro}>
        <SceneIntro />
      </Sequence>

      <Sequence from={hookAt} durationInFrames={RESULT_FRAMES.hook}>
        <SceneBox frames={RESULT_FRAMES.hook} video={backgrounds.hook}>
          <SceneResultHook data={props} />
        </SceneBox>
      </Sequence>

      <Sequence from={resAt} durationInFrames={resFrames}>
        <SceneBox frames={resFrames} video={backgrounds.results}>
          <SceneResults data={props} perCard={RESULT_FRAMES.perCard} />
        </SceneBox>
      </Sequence>

      <Sequence from={scoreAt} durationInFrames={RESULT_FRAMES.score}>
        <SceneBox frames={RESULT_FRAMES.score} video={backgrounds.score}>
          <SceneScore data={props} />
        </SceneBox>
      </Sequence>

      <Sequence from={ctaAt} durationInFrames={RESULT_FRAMES.cta}>
        <SceneBox frames={RESULT_FRAMES.cta} video={backgrounds.cta}>
          <SceneResultCTA data={props} />
        </SceneBox>
      </Sequence>

      <Sequence from={RESULT_FRAMES.intro} durationInFrames={total - RESULT_FRAMES.intro}>
        <Chrome league={props.groupLabel} total={total - RESULT_FRAMES.intro} />
      </Sequence>
    </AbsoluteFill>
  )
}
