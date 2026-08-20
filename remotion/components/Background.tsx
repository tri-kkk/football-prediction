// remotion/components/Background.tsx
// 3중 레이어: (1) Dreamina 배경 영상  (2) 팀컬러 그라디언트  (3) 그리드/비네트
// 배경 영상이 지정되지 않으면 (1)을 건너뛰고 기존 그라디언트 룩으로 폴백한다.

import React from 'react'
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion'
import { kenBurns } from '../anim'

export const Background: React.FC<{
  c1: string
  c2: string
  video?: string | null
  /** 영상 위에 덮는 어둠 정도. 텍스트 가독성 확보용 */
  scrim?: number
  durationInFrames: number
}> = ({ c1, c2, video, scrim = 0.62, durationInFrames }) => {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0e14' }}>
      {/* (1) Dreamina 배경 영상 — 9:16 루프 소재 */}
      {video ? (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <OffthreadVideo
            src={staticFile(`videos/${video}`)}
            muted
            loop
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: kenBurns(frame, durationInFrames, 0.08),
            }}
          />
          {/* 스크림 — 영상이 밝아도 흰 글씨가 읽히도록.
              텍스트는 화면 중앙 40~75% 구간에 몰려 있으므로 그 대역을 가장 어둡게 잡는다.
              (스타디움 조명처럼 밝은 소재가 중앙에 오면 글씨가 묻힌다) */}
          <AbsoluteFill
            style={{
              background: `linear-gradient(180deg,
                rgba(8,12,18,${scrim + 0.06}) 0%,
                rgba(8,12,18,${scrim + 0.14}) 38%,
                rgba(8,12,18,${scrim + 0.14}) 74%,
                rgba(8,12,18,${scrim + 0.22}) 100%)`,
            }}
          />
        </AbsoluteFill>
      ) : null}

      {/* (2) 팀컬러 그라디언트 — 영상이 있으면 blend 로 은은하게만 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(110% 70% at 0% 0%, ${c1}55 0%, transparent 55%),
                       radial-gradient(110% 70% at 100% 100%, ${c2}55 0%, transparent 55%),
                       radial-gradient(120% 80% at 50% -10%, #1e2d4a 0%, transparent 55%)
                       ${video ? '' : ', linear-gradient(180deg, #0d131c 0%, #0a0e14 100%)'}`,
          mixBlendMode: video ? 'screen' : 'normal',
          opacity: video ? 0.55 : 1,
        }}
      />

      {/* (3) 그리드 — 1080 기준으로 108px 격자 (구버전 36px × 3) */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 3px, transparent 3px), linear-gradient(90deg, rgba(255,255,255,0.025) 3px, transparent 3px)',
          backgroundSize: '108px 108px',
        }}
      />

      {/* 비네트 */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(120% 80% at 50% 45%, transparent 40%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </AbsoluteFill>
  )
}
