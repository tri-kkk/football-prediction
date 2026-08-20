// remotion/ShortsVideo.tsx
import React from 'react'
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import { ensureFont, FONT_STACK } from './font'
import { XFADE } from './theme'
import { buildTimeline } from './timeline'
import { sceneFade } from './anim'
import { Bgm } from './components/Bgm'
import { Background } from './components/Background'
import { Chrome } from './components/Chrome'
import { INTRO_FRAMES, SceneIntro } from './components/Intro'
import {
  SceneAnalysis,
  SceneCTA,
  SceneHook,
  SceneMatchup,
  ScenePitcher,
  SceneReveal,
} from './scenes/Scenes'
import type { Game, ShortsProps } from './types'

const fontFamily = FONT_STACK

ensureFont()

/** 씬 컨테이너 — 배경 + 내용 + 인/아웃 페이드를 한 덩어리로 묶는다 */
const SceneBox: React.FC<{
  frames: number
  c1: string
  c2: string
  video?: string | null
  children: React.ReactNode
}> = ({ frames, c1, c2, video, children }) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, frames, XFADE) }}>
      <Background c1={c1} c2={c2} video={video} durationInFrames={frames} />
      {children}
    </AbsoluteFill>
  )
}

const renderScene = (key: string, game: Game, showLogos: boolean) => {
  switch (key) {
    case 'hook':
      return <SceneHook game={game} />
    case 'matchup':
      return <SceneMatchup game={game} showLogos={showLogos} />
    case 'pitcher':
      return <ScenePitcher game={game} />
    case 'analysis':
      return <SceneAnalysis game={game} />
    case 'reveal':
      return <SceneReveal game={game} />
    case 'cta':
      return <SceneCTA game={game} />
    default:
      return null
  }
}

export const ShortsVideo: React.FC<ShortsProps> = ({ game, showLogos, bgm, backgrounds }) => {
  const hc = game.home.c1
  const ac = game.away.c1
  const timeline = buildTimeline(game)
  const total = INTRO_FRAMES + timeline.total

  return (
    <AbsoluteFill style={{ fontFamily, backgroundColor: '#080c12' }}>
      <Bgm file={bgm} total={total} />

      <Sequence from={0} durationInFrames={INTRO_FRAMES}>
        <SceneIntro />
      </Sequence>

      {timeline.entries.map((s) => (
        <Sequence key={s.key} from={INTRO_FRAMES + s.from} durationInFrames={s.frames}>
          <SceneBox frames={s.frames} c1={hc} c2={ac} video={backgrounds[s.key as keyof typeof backgrounds]}>
            {renderScene(s.key, game, showLogos)}
          </SceneBox>
        </Sequence>
      ))}

      {/* 전 씬 공통 상·하단 요소 — 인트로 구간은 제외 */}
      <Sequence from={INTRO_FRAMES} durationInFrames={timeline.total}>
        <Chrome league={game.league} total={timeline.total} />
      </Sequence>
    </AbsoluteFill>
  )
}
