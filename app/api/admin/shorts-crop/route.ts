// app/api/admin/shorts-crop/route.ts
// 녹화된 webm을 9:16 + 배경음 합성으로 자동 처리

import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import ffmpegStatic from 'ffmpeg-static'

export const runtime = 'nodejs'
export const maxDuration = 60

function resolveFfmpeg(): string {
  const fromPkg = ffmpegStatic as unknown as string | null
  if (fromPkg && existsSync(fromPkg)) return fromPkg
  const exe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const cwdPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', exe)
  if (existsSync(cwdPath)) return cwdPath
  return 'ffmpeg'
}

const FFMPEG_PATH: string = resolveFfmpeg()

const BGM_WHITELIST: Record<string, string> = {
  'kontraa-uk-drill': 'kontraa-uk-drill.mp3',
  'leberch-hiphop': 'leberch-hiphop.mp3',
  'bombin-chill': 'bombin-chill.mp3',
  'rockot-cinematic': 'rockot-cinematic.mp3',
  'sports-rock': 'sports-rock.mp3',
  'sport-energetic': 'sport-energetic.mp3',
  'delo-energetic': 'delo-energetic.mp3',
}

function resolveBgmPath(key: string | null): string | null {
  if (!key) return null
  const file = BGM_WHITELIST[key]
  if (!file) return null
  const full = path.join(process.cwd(), 'public', 'sounds', file)
  return existsSync(full) ? full : null
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const bgmKey = searchParams.get('bgm') || ''
  const bgmPath = resolveBgmPath(bgmKey)

  console.log('[shorts-crop] start FFMPEG_PATH=', FFMPEG_PATH, 'BGM=', bgmKey)

  try {
    const buf = Buffer.from(await request.arrayBuffer())
    if (buf.length === 0) {
      return NextResponse.json({ error: 'empty input' }, { status: 400 })
    }
    console.log('[shorts-crop] input bytes =', buf.length)
    const startTime = Date.now()

    const args: string[] = [
      '-loglevel', 'warning',
      '-stats',
      '-i', 'pipe:0',
    ]
    if (bgmPath) {
      args.push('-i', bgmPath)
    }
    args.push('-vf', 'crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920:flags=lanczos')

    if (bgmPath) {
      args.push(
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-af', 'afade=in:st=0:d=0.5,afade=out:st=26:d=1.5,volume=0.8',
        '-c:a', 'libopus',
        '-b:a', '128k',
        '-shortest',
      )
    } else {
      args.push('-an')
    }

    args.push(
      '-c:v', 'libvpx-vp9',
      '-b:v', '8M',
      '-deadline', 'realtime',
      '-cpu-used', '8',
      '-row-mt', '1',
      '-tile-columns', '2',
      '-frame-parallel', '1',
      '-pix_fmt', 'yuv420p',
      '-f', 'webm',
      'pipe:1',
    )

    return await new Promise<NextResponse>((resolve) => {
      let ff: any
      try {
        ff = spawn(FFMPEG_PATH, args, { stdio: ['pipe', 'pipe', 'pipe'] })
      } catch (spawnErr: any) {
        console.error('[shorts-crop] spawn failed:', spawnErr)
        resolve(NextResponse.json(
          { error: 'ffmpeg spawn failed: ' + (spawnErr?.message || spawnErr), ffmpegPath: FFMPEG_PATH },
          { status: 500 }
        ))
        return
      }

      const outChunks: Buffer[] = []
      const errChunks: Buffer[] = []

      ff.stdout.on('data', (c: Buffer) => outChunks.push(c))
      ff.stderr.on('data', (c: Buffer) => {
        errChunks.push(c)
        // 진행 로그 dev 콘솔에도
        const s = c.toString().trim()
        if (s) console.log('[ffmpeg]', s.slice(0, 200))
      })

      ff.on('error', (err: any) => {
        console.error('[shorts-crop] ff error:', err)
        resolve(NextResponse.json(
          { error: 'ffmpeg process error: ' + (err?.message || err), ffmpegPath: FFMPEG_PATH },
          { status: 500 }
        ))
      })

      ff.on('close', (code: number | null) => {
        const stderr = Buffer.concat(errChunks).toString('utf-8')
        const elapsed = Date.now() - startTime
        console.log('[shorts-crop] exit code:', code, 'elapsed:', elapsed, 'ms')

        if (code !== 0) {
          resolve(NextResponse.json(
            {
              error: 'ffmpeg exit ' + code,
              stderr: stderr.slice(-1000),
              elapsed,
              ffmpegPath: FFMPEG_PATH,
              bgm: bgmKey,
            },
            { status: 500 }
          ))
          return
        }
        const out = Buffer.concat(outChunks)
        console.log('[shorts-crop] success bytes:', out.length, 'elapsed:', elapsed, 'ms')
        resolve(new NextResponse(out as any, {
          status: 200,
          headers: {
            'Content-Type': 'video/webm',
            'Content-Disposition': 'attachment; filename=shorts_9x16.webm',
            'Cache-Control': 'no-store',
          },
        }))
      })

      ff.stdin.on('error', (err: any) => {
        console.error('[shorts-crop] stdin error:', err?.message)
      })
      ff.stdin.end(buf)
    })
  } catch (e: any) {
    console.error('[shorts-crop] top exception:', e)
    return NextResponse.json(
      { error: e?.message || 'unknown', ffmpegPath: FFMPEG_PATH },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ffmpegPath: FFMPEG_PATH,
    exists: existsSync(FFMPEG_PATH),
    cwd: process.cwd(),
    bgmList: Object.keys(BGM_WHITELIST).map((k) => ({
      key: k,
      exists: existsSync(path.join(process.cwd(), 'public', 'sounds', BGM_WHITELIST[k])),
    })),
    hint: 'POST shorts-crop with webm body',
  })
}
