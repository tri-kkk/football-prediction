// remotion/components/Bgm.tsx
// 배경음 — 모든 포맷이 공유한다.
//
// 음원은 2분이 넘는데 영상은 20초 안팎이다.
// <Audio> 를 그냥 쓰면 20초 지점에서 음악이 뚝 끊긴다.
// 그래서 시작에 짧은 페이드인, 끝에 충분한 페이드아웃을 건다.

import React from 'react'
import { Audio, interpolate, staticFile } from 'remotion'

export const Bgm: React.FC<{
  /** public/sounds/ 기준 파일명. 빈 문자열이면 아무것도 렌더하지 않는다. */
  file: string
  /** 영상 전체 길이 (프레임) */
  total: number
  /** 기본 볼륨. 나레이션이 없으므로 조금 크게 잡아도 된다. */
  volume?: number
  /** 음원의 어느 지점부터 재생할지 (프레임). 인트로가 밋밋한 곡은 뒤에서 시작한다. */
  startFrom?: number
}> = ({ file, total, volume = 0.42, startFrom = 0 }) => {
  if (!file) return null

  const FADE_IN = 24   // 0.4s
  const FADE_OUT = 54  // 0.9s — 끊기는 느낌이 안 나려면 이 정도는 필요하다

  return (
    <Audio
      src={staticFile(`sounds/${file}`)}
      startFrom={startFrom}
      volume={(f) => {
        const inGain = interpolate(f, [0, FADE_IN], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
        const outGain = interpolate(f, [total - FADE_OUT, total], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
        return volume * Math.min(inGain, outGain)
      }}
    />
  )
}
