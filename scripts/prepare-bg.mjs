#!/usr/bin/env node
// scripts/prepare-bg.mjs
//
// Dreamina 에서 받은 배경 영상을 숏폼 규격으로 정리한다.
//
//   node scripts/prepare-bg.mjs <입력파일> <출력이름>
//
// 예:
//   node scripts/prepare-bg.mjs ~/Downloads/dreamina_stadium.mp4 bg-stadium
//   node scripts/prepare-bg.mjs .\\down\\data.mp4 bg-data --no-crop
//
// 하는 일:
//   1) 좌상단 AI 워터마크 제거 (가장자리를 잘라내고 다시 채움)
//   2) 1080x1920 으로 업스케일 (Dreamina 는 720x1280 로 나오는 경우가 많다)
//   3) 살짝 어둡게 + 채도 낮춤 (배경이 브랜드 컬러와 경쟁하지 않도록)
//   4) 오디오 제거
//   → public/videos/<출력이름>.mp4 로 저장

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegStatic from 'ffmpeg-static'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
const flags = args.filter((a) => a.startsWith('--'))
const positional = args.filter((a) => !a.startsWith('--'))

const [input, nameArg] = positional
if (!input) {
  console.error('사용법: node scripts/prepare-bg.mjs <입력파일> <출력이름>')
  console.error('예:    node scripts/prepare-bg.mjs ./down/stadium.mp4 bg-stadium')
  process.exit(1)
}

const name = (nameArg || path.basename(input, path.extname(input))).replace(/\.mp4$/i, '')
const outPath = path.join(ROOT, 'public', 'videos', `${name}.mp4`)

// 워터마크 제거용 크롭 비율.
// Dreamina 워터마크는 좌상단 모서리에 있다. 왼쪽 10% / 위 9% 를 잘라내면 사라진다.
// 워터마크가 없는 소재라면 --no-crop 으로 끌 수 있다.
const noCrop = flags.includes('--no-crop')
const crop = noCrop ? '' : 'crop=iw*0.90:ih*0.90:iw*0.10:ih*0.09,'

// 밝기·채도 보정 정도
const bright = flags.includes('--bright') ? '0' : '-0.05'
const sat = flags.includes('--bright') ? '1.0' : '0.80'

const vf = [
  crop,
  'scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos',
  'crop=1080:1920',
  `eq=brightness=${bright}:saturation=${sat}`,
  'unsharp=3:3:0.4',
].join(',').replace(/,,/g, ',')

fs.mkdirSync(path.dirname(outPath), { recursive: true })

console.log(`▶ 입력  ${input}`)
console.log(`▶ 출력  ${outPath}`)
console.log(`▶ 크롭  ${noCrop ? '없음' : '좌 10% · 상 9% (워터마크 제거)'}`)

const ff = spawn(
  ffmpegStatic,
  [
    '-v', 'error', '-stats',
    '-i', input,
    '-vf', vf,
    '-an',
    '-c:v', 'libx264',
    '-crf', '20',
    '-preset', 'slow',
    '-pix_fmt', 'yuv420p',
    outPath,
    '-y',
  ],
  { stdio: 'inherit' }
)

ff.on('close', (code) => {
  if (code !== 0) {
    console.error(`\n실패 (exit ${code})`)
    process.exit(code ?? 1)
  }
  const { size } = fs.statSync(outPath)
  console.log(`\n✓ 완료 — ${(size / 1024 / 1024).toFixed(1)} MB`)
  console.log('  워터마크가 남아 있으면 crop 비율을 키우세요 (스크립트 상단 crop 값)')
})
