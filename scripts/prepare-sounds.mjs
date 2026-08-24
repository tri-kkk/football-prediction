#!/usr/bin/env node
// scripts/prepare-sounds.mjs
//
// public/sounds/ 의 배경음을 같은 크기로 맞춘다.
//
// 왜 필요한가:
//   음원마다 녹음 레벨이 제각각이라 포맷을 바꿔가며 올리면
//   영상마다 소리 크기가 들쭉날쭉해진다.
//
//   더 중요한 건 유튜브 기준이다. 유튜브는 대략 -14 LUFS 로 맞추는데,
//   **큰 건 줄여도 작은 건 키우지 않는다.** 작게 만든 영상은 그냥 작게 나간다.
//   피드에서 앞뒤 영상보다 소리가 작으면 그대로 넘어간다.
//
// ⚠ 곡 전체가 아니라 **앞부분만** 잰다.
//   영상은 20초 안팎이라 곡의 앞머리만 재생된다.
//   많은 곡이 앞머리를 평균보다 조용하게 시작하는데(Standoff 는 3.3dB),
//   곡 전체 평균으로 맞추면 정작 쓰이는 구간은 목표보다 그만큼 작아진다.
//   실제로 재생되는 구간을 기준으로 맞춰야 화면에서 -14 가 나온다.
//
// 사용법:
//   node scripts/prepare-sounds.mjs --dry     # 현재 크기만 측정
//   node scripts/prepare-sounds.mjs           # 실제 변환
//
// 원본은 프로젝트 루트의 sounds-original/ 로 옮겨 보관한다. 되돌릴 수 있다.

import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

// ffmpeg 은 PATH 에 없다. 배경 영상 처리(prepare-bg.mjs)와 같이
// npm 패키지 ffmpeg-static 이 들고 있는 바이너리를 쓴다.
// 혹시 패키지가 없으면 PATH 의 ffmpeg 으로 넘어간다.
let FFMPEG = 'ffmpeg'
try {
  const mod = await import('ffmpeg-static')
  if (mod?.default) FFMPEG = mod.default
} catch {
  /* PATH 의 ffmpeg 을 그대로 시도한다 */
}

const execFileAsync = promisify(execFile)
const run = (args, opts) => execFileAsync(FFMPEG, args, opts)
const ROOT = process.cwd()
const DIR = path.join(ROOT, 'public', 'sounds')
// 백업은 public/ **밖에** 둔다.
// public/ 안에 두면 Remotion 이 원본까지 정적 에셋으로 번들해서
// 번들 용량과 시간이 그냥 두 배가 된다.
const BACKUP = path.join(ROOT, 'sounds-original')

const DRY = process.argv.includes('--dry')

// 유튜브가 맞추는 값. 여기에 붙여두면 업로드 후 재조정이 거의 없다.
// TP(트루 피크) -1.5dB 는 mp3 인코딩 과정에서 생기는 오버슈트를 흡수하는 여유다.
const TARGET_I = -14
const TARGET_TP = -1.5
const TARGET_LRA = 11

// 측정할 구간 (초). 가장 긴 포맷(주말 TOP5)이 25초 안팎이라 넉넉히 잡았다.
const ANALYZE_SECONDS = 25

async function measure(file) {
  // loudnorm 을 분석 모드로 한 번 돌려 현재 값을 얻는다
  try {
    const { stderr } = await run([
      '-hide_banner', '-nostats',
      // 실제로 영상에 들어가는 앞부분만 잰다
      '-t', String(ANALYZE_SECONDS),
      '-i', file,
      '-af', `loudnorm=I=${TARGET_I}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:print_format=json`,
      '-f', 'null', '-',
    ], { maxBuffer: 10 * 1024 * 1024 })
    const m = stderr.match(/\{[\s\S]*\}/)
    return m ? JSON.parse(m[0]) : null
  } catch {
    return null
  }
}

async function main() {
  try {
    await run(['-version'])
  } catch {
    console.error('✖ ffmpeg 을 실행할 수 없습니다.')
    console.error('  ffmpeg-static 이 설치돼 있어야 합니다:  npm i ffmpeg-static')
    process.exit(1)
  }

  let files
  try {
    files = (await fs.readdir(DIR)).filter((f) => f.toLowerCase().endsWith('.mp3'))
  } catch {
    console.error(`✖ ${DIR} 를 찾을 수 없습니다. 프로젝트 루트에서 실행하세요.`)
    process.exit(1)
  }

  if (!files.length) {
    console.log('처리할 mp3 가 없습니다')
    return
  }

  console.log(`\n대상 ${files.length}개 · 목표 ${TARGET_I} LUFS · 앞 ${ANALYZE_SECONDS}초 기준\n`)

  const results = []
  for (const f of files) {
    const src = path.join(DIR, f)
    process.stdout.write(`  측정 ${f} ... `)
    const info = await measure(src)
    if (!info) {
      console.log('실패')
      continue
    }
    const now = Number(info.input_i)
    const diff = TARGET_I - now
    console.log(`${now.toFixed(1)} LUFS  (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}dB 필요)`)
    results.push({ f, src, info, now, diff })
  }

  if (DRY) {
    console.log('\n--dry — 실제 변환은 하지 않았습니다.')
    const worst = results.filter((r) => Math.abs(r.diff) > 3)
    if (worst.length) {
      console.log(`\n${worst.length}개가 목표에서 3dB 이상 벗어나 있습니다. 변환을 권합니다.`)
    } else {
      console.log('\n전부 목표에 가깝습니다. 변환 안 하셔도 됩니다.')
    }
    return
  }

  await fs.mkdir(BACKUP, { recursive: true })

  let done = 0
  for (const { f, src, info } of results) {
    const tmp = path.join(DIR, `.tmp-${f}`)
    process.stdout.write(`  변환 ${f} ... `)

    try {
      // 2패스 loudnorm — 1패스에서 잰 값을 넣어야 정확하게 맞는다
      await run([
        '-hide_banner', '-loglevel', 'error', '-y',
        '-i', src,
        '-af',
        `loudnorm=I=${TARGET_I}:TP=${TARGET_TP}:LRA=${TARGET_LRA}` +
          `:measured_I=${info.input_i}:measured_TP=${info.input_tp}` +
          `:measured_LRA=${info.input_lra}:measured_thresh=${info.input_thresh}` +
          `:offset=${info.target_offset}:linear=true`,
        '-ar', '48000', '-b:a', '192k',
        tmp,
      ], { maxBuffer: 10 * 1024 * 1024 })

      // 원본을 백업으로 옮기고 변환본을 제자리에 놓는다
      await fs.rename(src, path.join(BACKUP, f))
      await fs.rename(tmp, src)
      console.log('완료')
      done++
    } catch (e) {
      console.log(`실패 (${e.message.split('\n')[0]})`)
      await fs.rm(tmp, { force: true })
    }
  }

  console.log(`\n${done}개 변환 완료`)
  console.log(`원본 보관: sounds-original/`)
  console.log('\n되돌리려면 sounds-original/ 안의 파일을 public/sounds/ 로 다시 옮기면 됩니다.')
}

main().catch((e) => {
  console.error('\n실패:', e.message)
  process.exit(1)
})
