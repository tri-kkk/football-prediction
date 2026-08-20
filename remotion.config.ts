import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setJpegQuality(95)

// 화질 핵심 설정 —
//  crf 18 : 시각적 무손실에 가까움 (구버전은 22)
//  preset slow : 같은 비트레이트에서 화질이 가장 높음 (구버전은 veryfast)
//  yuv420p : 유튜브/인스타 호환
Config.setCodec('h264')
Config.setCrf(18)
Config.setX264Preset('slow')
Config.setPixelFormat('yuv420p')

Config.setChromiumOpenGlRenderer('angle')
Config.setEntryPoint('./remotion/index.ts')
Config.setPublicDir('./public')

Config.setDelayRenderTimeoutInMilliseconds(120000)

// woff2 를 data URI 로 인라인 — 렌더 중 네트워크 의존 제거 (font.ts 주석 참고)
Config.overrideWebpackConfig((current) => ({
  ...current,
  module: {
    ...current.module,
    rules: [
      ...(current.module?.rules ?? []),
      { test: /\.woff2$/, type: 'asset/inline' },
    ],
  },
}))
