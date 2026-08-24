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
  /**
   * 기본 볼륨.
   *
   * 🔥 2026-08: 0.42 → 1.0 로 올림.
   *   0.42 로 렌더한 영상을 재보니 통합 라우드니스가 -22.7 LUFS 였다.
   *   유튜브는 -14 LUFS 근처로 맞추는데, **큰 소리만 줄이고 작은 소리는 키우지 않는다.**
   *   즉 그대로 두면 피드의 다른 숏폼보다 8~9dB 작게 재생된다.
   *   소리가 작은 영상은 넘겨지기 쉬우니 이건 그냥 손해다.
   *
   *   이 영상들은 나레이션이 없어서 음악이 볼륨을 다 써도 된다.
   *   음원 자체를 scripts/prepare-sounds.mjs 로 -14 LUFS 에 맞춰 두므로,
   *   여기서 다시 줄이면 그만큼 목표에서 멀어진다. 그래서 1.0 을 쓴다.
   *   (감쇠가 필요하면 음원 쪽 목표값을 낮추는 게 맞다 — 여긴 그대로 통과시킨다)
   */
  volume?: number
  /** 음원의 어느 지점부터 재생할지 (프레임). 인트로가 밋밋한 곡은 뒤에서 시작한다. */
  startFrom?: number
}> = ({ file, total, volume = 1.0, startFrom = 0 }) => {
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
