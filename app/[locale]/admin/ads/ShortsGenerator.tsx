'use client'

// app/[locale]/admin/ads/ShortsGenerator.tsx

// 야구 쇼츠 생성기 (9:16) — 연출 풀 이식

// 5장면: 훅 → 매치업 → 투수 분석 → 승률 도넛 → CTA

// 각 장면은 staggered fadeUp/pop/slide 키프레임으로 등장

// 막대는 0% → 실제값으로 채움 애니메이트, 도넛은 stroke-dasharray 애니메이트

import { useEffect, useMemo, useRef, useState } from 'react'

interface TeamMeta {

  ko: string; en: string

  ab: string; c1: string; c2: string

  logo: string

}

interface Pitcher {

  name: string

  era: number | null

  whip: number | null

  k: number | null

}

interface Game {

  id: number

  dbId?: number

  league: string

  home: TeamMeta

  away: TeamMeta

  winRate: { home: number; away: number }

  pick: {

    team: string

    side: 'home' | 'away'

    stars: number

    confidence: number | null

    grade: string | null

  }

  pitchers: { home: Pitcher; away: Pitcher } | null

  aiAnalysis: string | null

  matchTime: string

  matchDate: string

  status: string

}

const SCENES = [

  { key: 'hook',     ms: 3800 },

  { key: 'matchup',  ms: 4800 },

  { key: 'pitcher',  ms: 7000 },

  { key: 'winrate',  ms: 6500 },

  { key: 'cta',      ms: 4500 },

] as const

type SceneKey = typeof SCENES[number]['key']

const TOTAL_MS = SCENES.reduce((s, x) => s + x.ms, 0)

const LEAGUE_BADGE: Record<string, { bg: string; fg: string }> = {

  KBO: { bg: '#D5001C', fg: '#FFFFFF' },

  NPB: { bg: '#0B2D5E', fg: '#FFFFFF' },

  MLB: { bg: '#002D72', fg: '#FFFFFF' },

}

const BRAND_C1 = '#A3FF4C'

const BRAND_C2 = '#62F4FF'

// BGM 선택지 (public/sounds/{file}.mp3, crop API의 BGM_WHITELIST와 동기화)

const BGM_OPTIONS = [
  { key: 'sport-energetic',  label: '⚡ Sport Energetic',  file: '/sounds/sport-energetic.mp3' },
  { key: 'sports-rock',      label: '🎸 Sports Rock',      file: '/sounds/sports-rock.mp3' },
  { key: 'delo-energetic',   label: '🚀 Energetic Sports', file: '/sounds/delo-energetic.mp3' },
  { key: 'kontraa-uk-drill', label: 'Kontraa · UK Drill',  file: '/sounds/kontraa-uk-drill.mp3' },
  { key: 'leberch-hiphop',   label: 'Leberch · Hip-Hop',   file: '/sounds/leberch-hiphop.mp3' },
  { key: 'bombin-chill',     label: 'Bombin · Chill HH',   file: '/sounds/bombin-chill.mp3' },
  { key: 'rockot-cinematic', label: 'Rockot · Cinematic',  file: '/sounds/rockot-cinematic.mp3' },
  { key: '',                 label: '🔇 무음 (BGM 없음)',  file: '' },
] as const

// =====================================================

// 키프레임 — 한 번만 inject

// =====================================================

const KEYFRAMES_CSS = `

@keyframes ts-pop {

  from { transform: scale(0.3); opacity: 0; }

  to   { transform: scale(1);   opacity: 1; }

}

@keyframes ts-fadeUp {

  from { transform: translateY(18px); opacity: 0; }

  to   { transform: translateY(0);     opacity: 1; }

}

@keyframes ts-slideR {

  from { transform: translateX(-40px); opacity: 0; }

  to   { transform: translateX(0);      opacity: 1; }

}

@keyframes ts-slideL {

  from { transform: translateX(40px); opacity: 0; }

  to   { transform: translateX(0);     opacity: 1; }

}

@keyframes ts-glow {

  0%,100% { text-shadow: 0 0 24px rgba(163,255,76,0.45), 0 0 8px rgba(98,244,255,0.3); }

  50%     { text-shadow: 0 0 40px rgba(163,255,76,0.7),  0 0 16px rgba(98,244,255,0.5); }

}

@keyframes ts-donut {

  from { stroke-dashoffset: var(--ts-circ); }

  to   { stroke-dashoffset: var(--ts-target); }

}

`

export default function ShortsGenerator() {

  const [league, setLeague] = useState<'KBO' | 'NPB' | 'MLB'>('KBO')

  const [games, setGames] = useState<Game[]>([])

  const [loading, setLoading] = useState(false)

  const [err, setErr] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<number | null>(null)

  const [showLogos, setShowLogos] = useState(false)

  const [scene, setScene] = useState<SceneKey>('hook')

  const [playing, setPlaying] = useState(false)

  const [progress, setProgress] = useState(0)

  // 장면이 바뀔 때마다 +1 → 자식 컴포넌트 remount로 애니메이션 재실행

  const [mountKey, setMountKey] = useState(0)

  const [recording, setRecording] = useState(false)

  const [recStatus, setRecStatus] = useState<string>('')

  const [bgm, setBgm] = useState<string>('sport-energetic')
  const [descTone, setDescTone] = useState<'A' | 'B' | 'C'>('A')
  const [copyStatus, setCopyStatus] = useState<string>('')

  const previewRef = useRef<HTMLAudioElement | null>(null)

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const rafRef = useRef<number | null>(null)

  const startedAtRef = useRef<number>(0)

  const stageRef = useRef<HTMLDivElement | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)

  const recStreamRef = useRef<MediaStream | null>(null)

  // 장면 변경 → mountKey 증가

  useEffect(() => { setMountKey((k) => k + 1) }, [scene])

  useEffect(() => {

    let aborted = false

    async function load() {

      setLoading(true); setErr(null)

      try {

        const r = await fetch(`/api/admin/shorts-data?league=${league}`, { cache: 'no-store' })

        const j = await r.json()

        if (aborted) return

        if (!j.success) { setErr(j.error || 'failed'); setGames([]) }

        else {

          setGames(j.games || [])

          if (j.games?.length > 0) setSelectedId(j.games[0].id)

          else setSelectedId(null)

        }

      } catch (e: any) {

        if (!aborted) setErr(e?.message || 'fetch error')

      } finally {

        if (!aborted) setLoading(false)

      }

    }

    load()

    return () => { aborted = true }

  }, [league])

  const game = useMemo(

    () => games.find((g) => g.id === selectedId) || null,

    [games, selectedId]

  )

  const stopAll = () => {

    timersRef.current.forEach(clearTimeout)

    timersRef.current = []

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    rafRef.current = null

    setPlaying(false)

  }

  useEffect(() => () => {

    stopAll()

    if (previewRef.current) { previewRef.current.pause(); previewRef.current = null }

  }, [])

  const play = () => {

    if (!game) return

    stopAll()

    setPlaying(true); setProgress(0)

    setScene('hook')

    setMountKey((k) => k + 1) // hook 재시작 보장

    startedAtRef.current = performance.now()

    let acc = 0

    for (let i = 0; i < SCENES.length; i++) {

      acc += SCENES[i].ms

      if (i < SCENES.length - 1) {

        const nextKey = SCENES[i + 1].key

        timersRef.current.push(setTimeout(() => setScene(nextKey), acc))

      } else {

        timersRef.current.push(setTimeout(() => { setPlaying(false); setProgress(1) }, acc))

      }

    }

    const tick = () => {

      const p = Math.min((performance.now() - startedAtRef.current) / TOTAL_MS, 1)

      setProgress(p)

      if (p < 1) rafRef.current = requestAnimationFrame(tick)

    }

    rafRef.current = requestAnimationFrame(tick)

  }

  const jumpTo = (key: SceneKey) => {

    stopAll(); setScene(key)

    setMountKey((k) => k + 1)

    let acc = 0

    for (const s of SCENES) { if (s.key === key) break; acc += s.ms }

    setProgress(acc / TOTAL_MS)

  }

  // ===========================================

  // 자동 녹화 다운로드 (getDisplayMedia + MediaRecorder)

  // ===========================================

  const stopRecordingStream = () => {

    try {

      recStreamRef.current?.getTracks().forEach((t) => t.stop())

    } catch {}

    recStreamRef.current = null

    recorderRef.current = null

  }

  const downloadVideo = async () => {

    if (!game || recording) return

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {

      alert('이 브라우저는 자동 녹화를 지원하지 않습니다. (Chrome/Edge 최신 사용)')

      return

    }

    const ok = window.confirm(

      '쇼츠 영상을 자동 녹화합니다.\n\n' +

      '🎯 고화질 팁: F12 → 모바일 에뮬레이션(Ctrl+Shift+M)으로\n' +

      '   Custom 1080 x 1920 설정 시 풀 해상도 1080p 캡처됩니다\n\n' +

      '1) 화면이 9:16 영역만 남도록 자동으로 가운데 정렬됩니다\n' +

      '2) 다음 다이얼로그에서 "Chrome 탭" 또는 "이 탭"을 선택하세요\n' +

      `3) 약 ${Math.round(TOTAL_MS / 1000)}초 후 자동으로 .webm 파일이 다운로드됩니다\n` +

      '4) 녹화 중에는 이 탭을 떠나거나 클릭하지 마세요\n\n' +

      '계속하시겠습니까?'

    )

    if (!ok) return

    try {

      setRecStatus('권한 요청 중…')

      // stage를 화면 가운데 9:16으로 띄움 (모달 오버레이)

      // recording state가 true가 되면 아래 stage style이 fixed/center로 전환됨

      await new Promise((r) => setTimeout(r, 50))

      // 화면 공유 권한 요청

      const stream = await navigator.mediaDevices.getDisplayMedia({

        // @ts-expect-error - chrome preferCurrentTab (실험적)

        preferCurrentTab: true,

        video: { width: { ideal: 1920 }, height: { ideal: 1920 }, frameRate: { ideal: 60 }, },

        audio: false,

      })

      recStreamRef.current = stream

      // 3) MediaRecorder

      const mime = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')

        ? 'video/webm; codecs=vp9'

        : MediaRecorder.isTypeSupported('video/webm; codecs=vp8')

        ? 'video/webm; codecs=vp8'

        : 'video/webm'

      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 })

      recorderRef.current = recorder

      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {

        if (e.data && e.data.size > 0) chunks.push(e.data)

      }

      recorder.onstop = async () => {

        const rawBlob = new Blob(chunks, { type: 'video/webm' })

        const safe = (s: string) => s.replace(/[^\w가-힣]/g, '')

        const baseName = `trendsoccer_${game.league}_${safe(game.home.ko)}_vs_${safe(game.away.ko)}_${game.matchDate || 'na'}`

        // 9:16 자동 crop 서버 호출

        let finalBlob: Blob = rawBlob

        let cropOk = false

        let cropErrorMsg = ''

        try {

          setRecStatus('9:16으로 자동 변환 중… (10-30초 소요)')

          const buf = await rawBlob.arrayBuffer()

          const bgmQuery = bgm ? `?bgm=${encodeURIComponent(bgm)}` : ''

          const cropRes = await fetch('/api/admin/shorts-crop' + bgmQuery, {

            method: 'POST',

            headers: { 'Content-Type': 'video/webm' },

            body: buf,

          })

          if (cropRes.ok) {

            finalBlob = await cropRes.blob()

            cropOk = true

            setRecStatus('변환 완료. 다운로드 중…')

          } else {

            const errJson = await cropRes.json().catch(() => ({ error: 'unknown' }))

            cropErrorMsg = errJson?.error || `HTTP ${cropRes.status}`

            console.warn('[shorts-crop] 실패:', errJson)

          }

        } catch (cropErr: any) {

          cropErrorMsg = cropErr?.message || 'fetch error'

          console.warn('[shorts-crop] 예외:', cropErr)

        }

        // 다운로드 트리거 (파일명에 변환 여부 명시)

        const url = URL.createObjectURL(finalBlob)

        const fname = cropOk

          ? `${baseName}_9x16.webm`

          : `${baseName}_RAW_${1080}x${512}.webm`

        const a = document.createElement('a')

        a.href = url

        a.download = fname

        document.body.appendChild(a)

        a.click()

        a.remove()

        URL.revokeObjectURL(url)

        // 영상 다운 후 설명도 자동 클립보드 복사
        try {
          const desc = buildDescription(game, descTone)
          await navigator.clipboard.writeText(desc)
          setRecStatus('✓ 영상 다운 + 설명이 클립보드에 복사됨 (유튜브에 붙여넣기)')
          setTimeout(() => setRecStatus(''), 5000)
        } catch {
          setRecStatus('✓ 영상 다운 완료 (설명 복사 실패 — 컨트롤바의 복사 버튼 사용)')
          setTimeout(() => setRecStatus(''), 4000)
        }

        stopRecordingStream()

        setRecording(false)

        // crop 실패 시 사용자에게 명확히 알림

        if (!cropOk) {

          alert(

            '⚠ 9:16 자동 변환 실패 — 원본 가로형 webm으로 다운로드됨\n\n' +

            '서버 에러:\n' + (cropErrorMsg || 'unknown') + '\n\n' +

            '점검 사항:\n' +

            '1) dev 서버 콘솔의 [shorts-crop] 로그 확인\n' +

            '2) http://localhost:3000/api/admin/shorts-crop 브라우저에서 열어보기\n' +

            '   → ffmpegPath 값이 표시되면 패키지 로드는 OK\n' +

            '3) ffmpeg-static 설치 확인: package.json에 항목 있어야 함'

          )

        }

      }

      // 사용자가 공유 중지 버튼 누르면 자동 종료

      const videoTrack = stream.getVideoTracks()[0]

      if (videoTrack) {

        videoTrack.onended = () => {

          if (recorder.state === 'recording') recorder.stop()

        }

      }

      setRecording(true)

      setRecStatus('녹화 시작…')

      recorder.start(200) // 200ms마다 chunk

      // 4) 짧은 안정화 딜레이 후 자동 재생

      await new Promise((r) => setTimeout(r, 400))

      play()

      // 5) TOTAL_MS + 0.7s 후 자동 정지

      setTimeout(() => {

        try {

          if (recorder.state === 'recording') recorder.stop()

        } catch {}

      }, TOTAL_MS + 700)

      setRecStatus(`● 녹화 중 — 약 ${Math.round(TOTAL_MS / 1000)}초`)

    } catch (e: any) {

      console.error('[shorts-record]', e)

      setRecording(false)

      setRecStatus('')

      stopRecordingStream()

      if (e?.name === 'NotAllowedError') {

        alert('녹화 권한이 거부되었습니다.')

      } else {

        alert('녹화 실패: ' + (e?.message || e))

      }

    }

  }

  return (

    <div className="text-white">

      {/* 전역 키프레임 */}

      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES_CSS }} />

      {/* ===== 컨트롤 바 ===== */}

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">

        <div className="flex flex-wrap items-center gap-3">

          <label className="text-sm text-gray-400">리그</label>

          <select

            value={league}

            onChange={(e) => setLeague(e.target.value as any)}

            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"

          >

            <option value="KBO">KBO</option>

            <option value="NPB">NPB</option>

            <option value="MLB">MLB</option>

          </select>

          <label className="text-sm text-gray-400 ml-2">경기</label>

          <select

            value={selectedId ?? ''}

            onChange={(e) => setSelectedId(Number(e.target.value))}

            disabled={loading || games.length === 0}

            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm min-w-[300px]"

          >

            {loading && <option>불러오는 중…</option>}

            {!loading && games.length === 0 && <option>예정 경기 없음</option>}

            {games.map((g) => (

              <option key={g.id} value={g.id}>

                [{g.matchDate}] {g.home.ko} vs {g.away.ko} ({g.winRate.home}% / {g.winRate.away}%)

              </option>

            ))}

          </select>

          <label className="flex items-center gap-1.5 text-sm text-gray-400 ml-2">

            <input type="checkbox" checked={showLogos} onChange={(e) => setShowLogos(e.target.checked)} />

            팀 로고 표시 (상표권 주의)

          </label>

          <div className="flex-1" />

          <button onClick={play} disabled={!game}

            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-1.5 rounded text-sm font-semibold">

            {playing ? '■ 정지 후 재생' : '▶ 재생'}

          </button>

          <button onClick={stopAll}

            className="bg-gray-700 hover:bg-gray-600 px-4 py-1.5 rounded text-sm">■ 정지</button>

          <button onClick={downloadVideo} disabled={!game || recording}

            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5">

            {recording ? (

              <>

                <span style={{

                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',

                  background: '#ef4444', animation: 'ts-pop 1s ease-in-out infinite alternate',

                }} />

                녹화 중…

              </>

            ) : (

              <>📥 영상 다운로드</>

            )}

          </button>

        </div>

        <div className="flex gap-2 mt-3">

          {SCENES.map((s) => (

            <button key={s.key} onClick={() => jumpTo(s.key)}

              className={`px-3 py-1 text-xs rounded ${

                scene === s.key ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'

              }`}>

              {sceneLabel(s.key)}

            </button>

          ))}

        </div>

        <div className="mt-3 h-1.5 bg-gray-800 rounded overflow-hidden">

          <div className="h-full bg-red-600 transition-[width] duration-100"

            style={{ width: `${(progress * 100).toFixed(2)}%` }} />

        </div>

        {/* BGM 선택 */}

        <div className="mt-3 flex flex-wrap items-center gap-2">

          <label className="text-sm text-gray-400">🎵 BGM</label>

          <select

            value={bgm}

            onChange={(e) => {

              setBgm(e.target.value)

              if (previewRef.current) { previewRef.current.pause(); previewRef.current.currentTime = 0 }

            }}

            disabled={recording}

            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"

          >

            {BGM_OPTIONS.map((b) => (

              <option key={b.key} value={b.key}>{b.label}</option>

            ))}

          </select>

          <button

            onClick={() => {

              const opt = BGM_OPTIONS.find((b) => b.key === bgm)

              if (!opt || !opt.file) return

              if (!previewRef.current) {

                previewRef.current = new Audio()

                previewRef.current.volume = 0.5

              }

              const audio = previewRef.current

              if (!audio.paused && audio.src.endsWith(opt.file)) {

                audio.pause()

              } else {

                audio.src = opt.file

                audio.currentTime = 0

                audio.play().catch(() => {})

              }

            }}

            disabled={recording || !bgm}

            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-3 py-1.5 rounded text-xs"

          >

            ▶ 미리듣기

          </button>

          <button

            onClick={() => { if (previewRef.current) { previewRef.current.pause(); previewRef.current.currentTime = 0 } }}

            className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-xs"

          >

            ■

          </button>

          <span className="text-xs text-gray-500 ml-1">(서버 ffmpeg가 영상에 자동 mix)</span>

        </div>

        {/* 📋 설명란 자동 생성 */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-400">📋 설명 톤</label>
          <select
            value={descTone}
            onChange={(e) => setDescTone(e.target.value as 'A' | 'B' | 'C')}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
          >
            <option value="A">A · 자신감/단언 (바이럴↑)</option>
            <option value="B">B · 질문/도발 (참여↑)</option>
            <option value="C">C · 전문가/분석 (신뢰↑)</option>
          </select>
          <button
            onClick={async () => {
              if (!game) return
              const desc = buildDescription(game, descTone)
              try {
                await navigator.clipboard.writeText(desc)
                setCopyStatus('✓ 설명이 클립보드에 복사되었습니다 — 유튜브 업로드 화면에 붙여넣기')
                setTimeout(() => setCopyStatus(''), 4000)
              } catch (e) {
                setCopyStatus('❌ 복사 실패: ' + ((e as any)?.message || e))
                setTimeout(() => setCopyStatus(''), 4000)
              }
            }}
            disabled={!game}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-1.5 rounded text-sm font-semibold"
          >
            📋 설명 복사
          </button>
          <button
            onClick={() => {
              if (!game) return
              const desc = buildDescription(game, descTone)
              const blob = new Blob([desc], { type: 'text/plain;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const safe = (s: string) => s.replace(/[^\w가-힣]/g, '')
              const fname = `trendsoccer_${game.league}_${safe(game.home.ko)}_vs_${safe(game.away.ko)}_${game.matchDate || 'na'}_설명.txt`
              const a = document.createElement('a')
              a.href = url; a.download = fname
              document.body.appendChild(a); a.click(); a.remove()
              URL.revokeObjectURL(url)
            }}
            disabled={!game}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-3 py-1.5 rounded text-sm"
          >
            💾 .txt 저장
          </button>
        </div>
        {copyStatus && <div className="mt-2 text-emerald-400 text-sm font-semibold">{copyStatus}</div>}

        {err && <div className="mt-2 text-red-400 text-sm">에러: {err}</div>}

        {recStatus && <div className="mt-2 text-emerald-400 text-sm font-semibold">{recStatus}</div>}

        {game && !game.pitchers && (

          <div className="mt-2 text-amber-400 text-xs">

            ⚠ 이 경기는 투수 스탯(ERA/WHIP/K)이 아직 수집되지 않았습니다. 투수 장면은 이름만 표시됩니다.

          </div>

        )}

      </div>

      {/* 녹화 중 검정 오버레이 (페이지 다른 요소 가림) */}

      {recording && (

        <div style={{

          position: 'fixed', inset: 0,

          background: '#000',

          zIndex: 99998,

        }} />

      )}

      {/* ===== 9:16 스테이지 ===== */}

      <div className="flex flex-col items-center">

        {!recording && (

          <div className="text-xs text-gray-500 mb-2">

            ↓ 미리보기 · ▶ 재생으로 확인 · 📥 다운로드 클릭 시 자동 녹화

          </div>

        )}

        <div

          id="shorts-stage"

          ref={stageRef}

          style={recording ? {

            // 녹화 중: 화면 가운데에 9:16 fixed

            position: 'fixed',

            top: '50%', left: '50%',

            transform: 'translate(-50%, -50%)',

            height: '100vh',

            width: 'calc(100vh * 9 / 16)',

            maxWidth: '100vw',

            maxHeight: 'calc(100vw * 16 / 9)',

            background: '#070a10',

            borderRadius: 0,

            overflow: 'hidden',

            zIndex: 99999,

            boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset',

            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Pretendard, sans-serif',

          } : {

            // 일반: 미리보기 360×640

            width: 360, height: 640,

            background: '#070a10',

            borderRadius: 20,

            overflow: 'hidden',

            position: 'relative',

            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset',

            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Pretendard, sans-serif',

          }}

        >

          {/* Safe zone 가이드 (미리보기 전용 — 녹화 시 hide) */}

          {game && !recording && (

            <>

              <div style={{

                position: 'absolute', top: 0, left: 0, right: 0, height: 73,

                background: 'repeating-linear-gradient(45deg, rgba(239,68,68,0.15), rgba(239,68,68,0.15) 6px, transparent 6px, transparent 12px)',

                pointerEvents: 'none', zIndex: 100,

              }} />

              <div style={{

                position: 'absolute', top: 60, left: 4, fontSize: 9, color: '#fca5a5', fontWeight: 700, zIndex: 100,

                background: 'rgba(0,0,0,0.5)', padding: '2px 5px', borderRadius: 3,

              }}>↑ 쇼츠 UI에 가려짐</div>

              <div style={{

                position: 'absolute', bottom: 0, left: 0, right: 0, height: 153,

                background: 'repeating-linear-gradient(45deg, rgba(239,68,68,0.15), rgba(239,68,68,0.15) 6px, transparent 6px, transparent 12px)',

                pointerEvents: 'none', zIndex: 100,

              }} />

              <div style={{

                position: 'absolute', bottom: 138, left: 4, fontSize: 9, color: '#fca5a5', fontWeight: 700, zIndex: 100,

                background: 'rgba(0,0,0,0.5)', padding: '2px 5px', borderRadius: 3,

              }}>↓ 쇼츠 UI에 가려짐</div>

            </>

          )}

          {game ? (

            <Stage scene={scene} mountKey={mountKey} game={game} showLogos={showLogos} progress={progress} recording={recording} />

          ) : (

            <div style={emptyStyle}>

              {loading ? '데이터 로드 중…' : '왼쪽에서 경기를 선택하세요'}

            </div>

          )}

        </div>

      </div>

    </div>

  )

}

// =====================================================

// 스테이지

// =====================================================

function Stage({

  scene, mountKey, game, showLogos, progress, recording,

}: { scene: SceneKey; mountKey: number; game: Game; showLogos: boolean; progress: number; recording: boolean }) {

  return (

    <>

      {/* 배경: 팀컬러 그라데이션 + 그리드 */}

      <div style={{

        position: 'absolute', inset: 0,

        background: `radial-gradient(110% 70% at 0% 0%, ${game.home.c1}55 0%, transparent 55%),

                     radial-gradient(110% 70% at 100% 100%, ${game.away.c1}55 0%, transparent 55%),

                     radial-gradient(120% 80% at 50% -10%, #1e2d4a 0%, transparent 55%),

                     linear-gradient(180deg, #0d131c 0%, #0a0e14 100%)`,

      }} />

      <div style={{

        position: 'absolute', inset: 0,

        backgroundImage:

          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',

        backgroundSize: '36px 36px',

        pointerEvents: 'none',

      }} />

      {/* 상단 헤더 — TrendSoccer 로고 + AI PICK 뱃지 */}

      <div style={{

        position: 'absolute', top: 28, left: 0, right: 0,

        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,

        zIndex: 30,

      }}>

        <TrendSoccerWordmark height={22} opacity={1} />

        <div style={{

          padding: '4px 10px',

          background: `linear-gradient(135deg, ${BRAND_C1}33 0%, ${BRAND_C2}22 100%)`,

          border: `1px solid ${BRAND_C1}aa`,

          borderRadius: 7,

          fontSize: 11,

          fontWeight: 900,

          letterSpacing: 2.5,

          color: BRAND_C1,

          textShadow: `0 0 8px ${BRAND_C1}66`,

          boxShadow: `0 2px 8px ${BRAND_C1}33`,

        }}>

          AI PICK

        </div>

      </div>

      {/* 리그 뱃지 (좌상) */}

      <div style={{ position: 'absolute', top: 64, left: 16, zIndex: 5 }}>

        <LeagueBadge name={game.league} />

      </div>

      <div style={{

        position: 'absolute', top: 68, right: 16, zIndex: 5,

        fontSize: 11, color: '#888', letterSpacing: 1, fontWeight: 600,

      }}>

        {formatMatchTime(game.matchTime)}

      </div>

      {/* 장면 (key={mountKey}로 remount 강제) */}

      {scene === 'hook'    && <SceneHook    key={mountKey} game={game} />}

      {scene === 'matchup' && <SceneMatchup key={mountKey} game={game} showLogos={showLogos} />}

      {scene === 'pitcher' && <ScenePitcher key={mountKey} game={game} />}

      {scene === 'winrate' && <SceneWinRate key={mountKey} game={game} />}

      {scene === 'cta'     && <SceneCTA     key={mountKey} game={game} />}

      {/* 진행바 — 미리보기 전용 (녹화 시 hide) */}

      {!recording && (

        <div style={{

          position: 'absolute', bottom: 170, left: 0,

          height: 3, width: `${(progress * 100).toFixed(2)}%`,

          background: `linear-gradient(90deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)`,

          zIndex: 40,

          transition: 'width 100ms linear',

        }} />

      )}

    </>

  )

}

function LeagueBadge({ name }: { name: string }) {

  const lb = LEAGUE_BADGE[name] || { bg: '#444', fg: '#fff' }

  return (

    <div style={{

      display: 'inline-flex', alignItems: 'center', gap: 6,

      padding: '5px 10px',

      borderRadius: 8,

      background: lb.bg, color: lb.fg,

      fontSize: 10, fontWeight: 900, letterSpacing: 2,

      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',

      animation: 'ts-fadeUp 0.5s 0.15s both',

    }}>

      <span style={{ width: 5, height: 5, borderRadius: '50%', background: lb.fg, opacity: 0.9 }} />

      {name}

    </div>

  )

}

// =====================================================

// 장면 1: 훅 — 거대한 % 숫자 + pop + 글로우

// =====================================================

function SceneHook({ game }: { game: Game }) {

  const big = Math.max(game.winRate.home, game.winRate.away)

  return (

    <div style={sceneCenter}>

      <div style={{

        fontSize: 13, color: '#aaa', fontWeight: 700, letterSpacing: 3,

        marginBottom: 12,

        animation: 'ts-fadeUp 0.5s 0.2s both',

      }}>

        AI가 오늘 이 경기를

      </div>

      <div style={{

        fontWeight: 900,

        fontSize: 130, lineHeight: 0.9,

        background: `linear-gradient(135deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)`,

        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',

        backgroundClip: 'text', color: 'transparent',

        animation: 'ts-pop 0.6s 0.35s cubic-bezier(.2,1.4,.4,1) both',

        filter: `drop-shadow(0 0 28px ${BRAND_C1}77)`,

      }}>

        {big}<span style={{ fontSize: 55 }}>%</span>

      </div>

      <div style={{

        fontSize: 19, fontWeight: 800, textAlign: 'center', marginTop: 18,

        animation: 'ts-fadeUp 0.5s 1.0s both',

      }}>

        로 봤습니다.{' '}

        <span style={{ color: BRAND_C1 }}>{game.pick.team} 승</span>

      </div>

      {/* 별점 */}

      <div style={{

        marginTop: 22, animation: 'ts-fadeUp 0.5s 1.4s both',

        display: 'flex', justifyContent: 'center',

      }}>

        <Stars n={game.pick.stars} size={24} />

      </div>

    </div>

  )

}

// =====================================================

// 장면 2: 매치업 — 슬라이드 인 + VS 팝

// =====================================================

function SceneMatchup({ game, showLogos }: { game: Game; showLogos: boolean }) {

  return (

    <div style={{ ...sceneCenter, padding: '130px 24px 175px' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' }}>

        {/* HOME — 왼쪽에서 등장 */}

        <div style={{ flex: 1, animation: 'ts-slideR 0.55s 0.35s both' }}>

          <TeamBlock t={game.home} side="HOME" showLogo={showLogos} />

        </div>

        {/* VS — 팝 */}

        <div style={{

          fontSize: 32, fontWeight: 900,

          color: '#64748b',

          background: `linear-gradient(135deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)`,

          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',

          backgroundClip: 'text',

          letterSpacing: 2,

          animation: 'ts-pop 0.5s 0.7s cubic-bezier(.2,1.4,.4,1) both',

        }}>VS</div>

        {/* AWAY — 오른쪽에서 등장 */}

        <div style={{ flex: 1, animation: 'ts-slideL 0.55s 0.35s both' }}>

          <TeamBlock t={game.away} side="AWAY" showLogo={showLogos} />

        </div>

      </div>

      {/* 경기시각 */}

      <div style={{

        marginTop: 36, fontSize: 12, color: '#888', letterSpacing: 1,

        animation: 'ts-fadeUp 0.5s 1.0s both',

      }}>

        ⚾ {formatMatchTime(game.matchTime)}

      </div>

    </div>

  )

}

function TeamBlock({ t, side, showLogo }: { t: TeamMeta; side: string; showLogo: boolean }) {

  return (

    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>

      <Crest t={t} showLogo={showLogo} size={80} />

      <div style={{ fontSize: 15, fontWeight: 900, textAlign: 'center', color: '#fff', lineHeight: 1.15 }}>

        {t.ko}

      </div>

      <div style={{ fontSize: 11, color: '#888', letterSpacing: 2 }}>{side}</div>

    </div>

  )

}

function Crest({ t, showLogo, size = 80 }: { t: TeamMeta; showLogo: boolean; size?: number }) {

  const [broken, setBroken] = useState(false)

  const useLogo = showLogo && t.logo && !broken

  return (

    <div style={{

      width: size, height: size, borderRadius: '50%',

      background: useLogo ? '#fff' : `linear-gradient(135deg, ${t.c1} 0%, ${t.c2 || t.c1} 100%)`,

      display: 'flex', alignItems: 'center', justifyContent: 'center',

      fontWeight: 900, fontSize: size * 0.32, color: '#fff',

      overflow: 'hidden', flexShrink: 0,

      boxShadow: `0 8px 20px ${t.c1}55, inset 0 -4px 12px rgba(0,0,0,0.2)`,

      border: `2px solid ${t.c1}aa`,

    }}>

      {useLogo ? (

        // eslint-disable-next-line @next/next/no-img-element

        <img src={t.logo} alt={t.ko} width={size} height={size}

          onError={() => setBroken(true)}

          style={{ objectFit: 'contain', width: '85%', height: '85%' }} />

      ) : (

        t.ab

      )}

    </div>

  )

}

// =====================================================

// 장면 3: 투수 분석 — 순차 등장 + 막대 채움

// =====================================================

function ScenePitcher({ game }: { game: Game }) {

  const p = game.pitchers

  const insights = buildPitcherInsights(game)

  return (

    <div style={{ ...sceneCol, padding: '130px 18px 175px', justifyContent: 'space-evenly' }}>

      <div style={{

        alignSelf: 'center', fontSize: 17, color: '#e2e8f0', fontWeight: 800,

        marginBottom: 4, animation: 'ts-fadeUp 0.5s 0.1s both',

        letterSpacing: 1,

      }}>

        선발 투수 <span style={{ color: BRAND_C1 }}>맞대결</span>

      </div>

      {/* 투수 이름 카드 */}

      <div style={{ display: 'flex', gap: 14, width: '100%', marginBottom: 4,

                    animation: 'ts-fadeUp 0.5s 0.3s both' }}>

        <PitcherNameCard team={game.home} name={p?.home.name ?? '미정'} side="HOME" />

        <PitcherNameCard team={game.away} name={p?.away.name ?? '미정'} side="AWAY" />

      </div>

      {/* ERA / WHIP / K — staggered 등장 + 막대 채움

          - 행마다 home/away 둘 다 null이면 해당 행 숨김

          - 전체가 null이면 안내 메시지로 대체 (MLB 같은 케이스) */}

      {(() => {

        if (!p) {

          return (

            <div style={{

              padding: '24px 18px', borderRadius: 13,

              background: 'rgba(255,255,255,0.05)',

              border: '1.5px dashed rgba(255,255,255,0.15)',

              fontSize: 14, color: '#94a3b8', textAlign: 'center', width: '100%',

              fontWeight: 600, lineHeight: 1.5,

              animation: 'ts-fadeUp 0.5s 0.4s both',

            }}>

              이 경기의 투수 정보가<br/>아직 발표되지 않았습니다

            </div>

          )

        }

        const hasEra  = p.home.era  != null || p.away.era  != null

        const hasWhip = p.home.whip != null || p.away.whip != null

        const hasK    = p.home.k    != null || p.away.k    != null

        const hasAny  = hasEra || hasWhip || hasK

        if (!hasAny) {

          return (

            <div style={{

              padding: '22px 16px', borderRadius: 13,

              background: `linear-gradient(135deg, ${BRAND_C1}26 0%, ${BRAND_C2}14 100%)`,

              border: `1.5px solid ${BRAND_C1}77`,

              boxShadow: `0 6px 22px ${BRAND_C1}22`,

              fontSize: 16, color: '#cbd5e1', textAlign: 'center', width: '100%',

              lineHeight: 1.6,

              animation: 'ts-fadeUp 0.5s 0.5s both',

            }}>

              <div style={{ color: BRAND_C1, fontWeight: 900, fontSize: 15, marginBottom: 7, letterSpacing: 0.5 }}>선발 발표 완료 ✓</div>

              <div style={{ fontSize: 12, color: '#cbd5e1' }}>

                상세 스탯(ERA/WHIP/K)은<br/>경기 임박 시점에 자동 수집됩니다

              </div>

            </div>

          )

        }

        return (

          <>

            {hasEra && (

              <CompareRow label="ERA"

                home={p.home.era} away={p.away.era}

                hColor={game.home.c1} aColor={game.away.c1}

                lowerBetter

                fmt={(v) => v == null ? '-' : v.toFixed(2)}

                delay={0.5} />

            )}

            {hasWhip && (

              <CompareRow label="WHIP"

                home={p.home.whip} away={p.away.whip}

                hColor={game.home.c1} aColor={game.away.c1}

                lowerBetter

                fmt={(v) => v == null ? '-' : v.toFixed(2)}

                delay={0.85} />

            )}

            {hasK && (

              <CompareRow label="K (탈삼진)"

                home={p.home.k} away={p.away.k}

                hColor={game.home.c1} aColor={game.away.c1}

                fmt={(v) => v == null ? '-' : String(Math.round(v))}

                delay={1.2} />

            )}

          </>

        )

      })()}

      {/* AI 코멘트 카드 — 디테일 페이지의 Claude 분석 사용, 없으면 폴백 */}

      <div style={{

        marginTop: 6,

        padding: '18px 18px',

        width: '100%',

        borderRadius: 14,

        background: `linear-gradient(135deg, ${BRAND_C1}33 0%, ${BRAND_C2}1a 100%)`,

        border: `1.5px solid ${BRAND_C1}88`,

        boxShadow: `0 6px 20px ${BRAND_C1}33`,

        animation: 'ts-fadeUp 0.5s 1.55s both',

      }}>

        <div style={{

          fontSize: 12, color: BRAND_C1, fontWeight: 900, letterSpacing: 2,

          marginBottom: 12, textShadow: `0 0 8px ${BRAND_C1}88`,

        }}>

          ⚡ AI 매치업 분석

        </div>

        {insights.length > 0 ? (

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

            {insights.map((ins, i) => (

              <div key={i} style={{

                display: 'flex', alignItems: 'center', gap: 10,

                fontSize: 13, color: '#f1f5f9', lineHeight: 1.45, fontWeight: 600,

              }}>

                <span style={{

                  fontSize: 15, color: ins.color, flexShrink: 0,

                  textShadow: `0 0 8px ${ins.color}aa`,

                }}>{ins.icon}</span>

                <span dangerouslySetInnerHTML={{ __html: ins.html }} />

              </div>

            ))}

          </div>

        ) : (

          <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: '4px 0' }}>

            데이터 부족 — 시즌 진행 시 분석 강화

          </div>

        )}

      </div>

      <div style={{

        paddingTop: 4,

        fontSize: 10, color: '#94a3b8', letterSpacing: 1.5, textAlign: 'center',

        animation: 'ts-fadeUp 0.5s 1.8s both',

        opacity: 0.85,

      }}>

        시즌 누적 · LOWER ERA/WHIP IS BETTER

      </div>

    </div>

  )

}

// Claude 분석 텍스트를 쇼츠 카드에 맞게 축약 — 첫 2문장 정도, 마크다운 굵게 처리

function shortenAnalysis(text: string): string {

  // 마크다운/HTML 정리

  let s = text.replace(/[#*_`]/g, '').replace(/\n+/g, ' ').trim()

  // 첫 2문장 추출

  const sentences = s.split(/(?<=[.。!?])\s+/).filter(Boolean)

  let out = sentences.slice(0, 2).join(' ')

  if (out.length > 140) out = out.slice(0, 137) + '...'

  return out

}

// 유튜브 쇼츠 설명란 자동 생성 — 톤 3종
function buildDescription(game: Game, tone: 'A' | 'B' | 'C' = 'A'): string {
  let dateStr = game.matchDate
  try {
    const d = new Date(game.matchTime)
    if (!isNaN(d.getTime())) {
      dateStr = d.toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Seoul',
      })
    }
  } catch {}

  const pickPct = game.pick.side === 'home' ? game.winRate.home : game.winRate.away
  const losePct = 100 - pickPct
  const stars = '★'.repeat(game.pick.stars) + '☆'.repeat(5 - game.pick.stars)
  const pickTeam = game.pick.team
  const otherTeam = game.pick.side === 'home' ? game.away.ko : game.home.ko
  const safeTag = (s: string) => s.replace(/\s+/g, '').replace(/[^\w가-힣]/g, '')
  const tagPick = safeTag(pickTeam)
  const tagOther = safeTag(otherTeam)

  // 핵심 인사이트 1줄 추출
  const insights = buildPitcherInsights(game)
  const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '')
  const insightLine = insights.length > 0 ? stripHtml(insights[0].html) : ''

  // 투수 정보 (있을 때만)
  let pitcherLine = ''
  if (game.pitchers) {
    const hP = game.pitchers.home, aP = game.pitchers.away
    if (hP.era != null && aP.era != null) {
      pitcherLine = `📊 선발 ERA: ${game.home.ko} ${hP.era.toFixed(2)} / ${game.away.ko} ${aP.era.toFixed(2)}`
    } else if (hP.name && aP.name) {
      pitcherLine = `⚾ 선발: ${game.home.ko} ${hP.name} vs ${game.away.ko} ${aP.name}`
    }
  }

  const tags = `#Shorts #${game.league} #${tagPick} #${tagOther} #야구 #프로야구분석 #스포츠AI`

  if (tone === 'A') {
    // 자신감/단언형 (가장 바이럴)
    return [
      `⚡ AI가 ${pickPct}%로 단언한 오늘 경기`,
      '',
      `🏆 ${game.league} | ${game.home.ko} vs ${game.away.ko}`,
      `📍 ${dateStr}`,
      '',
      `⭐ AI 추천: ${pickTeam} 승 (${stars})`,
      insightLine ? `🎯 핵심: ${insightLine}` : '',
      pitcherLine,
      '',
      '📌 결과는 고정 댓글에서!',
      '🔔 매일 AI 픽 → 채널 구독',
      '🌐 trendsoccer.com',
      '',
      tags,
      '',
      '※ 본 콘텐츠는 AI 데이터 분석이며 베팅 권유가 아닙니다',
    ].filter(Boolean).join('\n')
  }

  if (tone === 'B') {
    // 질문/도발형 (참여 유도)
    return [
      `🤔 ${pickPct}% 확률, 이거 진짜 맞을까?`,
      '',
      '✋ 댓글로 본인 픽 남겨주세요',
      `🏆 ${game.league} ${game.home.ko} vs ${game.away.ko}`,
      `📍 ${dateStr}`,
      '',
      `🔥 AI 분석: ${pickTeam} 승 예상 (${stars})`,
      insightLine ? `📊 ${insightLine}` : '',
      '',
      '✅ 적중하면 🔥, 빗나가면 😂',
      '📌 내일 고정 댓글에서 결과 공개',
      '🔔 매일 AI 픽 → 채널 구독',
      '🌐 trendsoccer.com',
      '',
      tags,
      '',
      '※ 본 콘텐츠는 AI 데이터 분석이며 베팅 권유가 아닙니다',
    ].filter(Boolean).join('\n')
  }

  // 톤 C — 전문가/분석형
  return [
    `📊 ${game.league} 빅데이터 분석 — ${game.home.ko} vs ${game.away.ko}`,
    `📍 ${dateStr}`,
    '',
    `✅ AI 승률: ${pickTeam} ${pickPct}% / ${otherTeam} ${losePct}%`,
    insightLine ? `✅ 핵심: ${insightLine}` : '',
    pitcherLine ? `✅ ${pitcherLine.replace(/^📊\s*|^⚾\s*/, '')}` : '',
    '',
    `⭐ AI 픽: ${pickTeam} (${stars})`,
    '🎯 데이터 분석 콘텐츠 · 베팅 권유 X',
    '',
    '📌 결과 추적: 고정 댓글',
    '🌐 매일 무료 픽: trendsoccer.com',
    '',
    tags,
  ].filter(Boolean).join('\n')
}


// 어두운 팀 컬러를 텍스트용으로 lighten (배경 위에서 가독성 확보)

function lightenForText(hex: string): string {

  if (!hex || !hex.startsWith('#')) return '#e2e8f0'

  // 검정/매우 어두운 컬러는 fallback

  const r = parseInt(hex.slice(1,3), 16)

  const g = parseInt(hex.slice(3,5), 16)

  const b = parseInt(hex.slice(5,7), 16)

  const lum = 0.299*r + 0.587*g + 0.114*b

  if (lum < 80) return '#e2e8f0'  // 너무 어두우면 라이트 그레이

  if (lum < 140) {

    // 약간 어두우면 50% 화이트 혼합

    return '#' + [r,g,b].map(c => Math.min(255, Math.round(c + (255-c)*0.5)).toString(16).padStart(2,'0')).join('')

  }

  return hex

}

// 투수 스탯 기반 자동 인사이트 생성

function buildPitcherInsights(game: Game): Array<{ icon: string; html: string; color: string }> {

  const p = game.pitchers

  if (!p) return []

  const homeName = game.home.ko

  const awayName = game.away.ko

  const hC = game.home.c1

  const aC = game.away.c1

  const out: Array<{ icon: string; html: string; color: string }> = []

  // ERA

  if (p.home.era != null && p.away.era != null) {

    const diff = Math.abs(p.home.era - p.away.era)

    if (diff >= 0.3) {

      const isHomeBetter = p.home.era < p.away.era

      const better = isHomeBetter ? homeName : awayName

      const color = lightenForText(isHomeBetter ? hC : aC)

      out.push({

        icon: '🎯',

        color,

        html: `선발 ERA <b style="color:${color}">${diff.toFixed(2)} 차이</b> — <b style="color:${color}">${better}</b> 우위`,

      })

    } else {

      out.push({ icon: '⚖️', color: '#facc15', html: `선발 ERA 박빙 (차 ${diff.toFixed(2)})` })

    }

  }

  // K 차이

  if (p.home.k != null && p.away.k != null) {

    const diff = Math.abs(p.home.k - p.away.k)

    if (diff >= 10) {

      const isHomeBetter = p.home.k > p.away.k

      const better = isHomeBetter ? homeName : awayName

      const color = lightenForText(isHomeBetter ? hC : aC)

      out.push({

        icon: '🔥',

        color,

        html: `탈삼진 <b style="color:${color}">${Math.round(diff)}개</b> 차 — <b style="color:${color}">${better}</b> 강세`,

      })

    }

  }

  // 종합

  if (out.length === 0 && (p.home.whip != null && p.away.whip != null)) {

    const isHomeBetter = p.home.whip < p.away.whip

    const better = isHomeBetter ? homeName : awayName

    const color = lightenForText(isHomeBetter ? hC : aC)

    out.push({

      icon: '📊',

      color,

      html: `WHIP에서 <b style="color:${color}">${better}</b> 안정적`,

    })

  }

  return out.slice(0, 2) // 최대 2개

}

function PitcherNameCard({ team, name, side }: { team: TeamMeta; name: string; side: string }) {

  return (

    <div style={{

      flex: 1,

      padding: '16px 18px',

      borderRadius: 14,

      background: `linear-gradient(160deg, ${team.c1}66 0%, ${team.c1}1f 100%)`,

      border: `1.5px solid ${team.c1}aa`,

      boxShadow: `0 6px 18px ${team.c1}44`,

    }}>

      <div style={{ fontSize: 10, color: '#e2e8f0', letterSpacing: 2.5, fontWeight: 800, opacity: 0.9 }}>{side}</div>

      <div style={{ fontSize: 11, color: '#f1f5f9', marginTop: 3, fontWeight: 700 }}>{team.ab}</div>

      <div style={{

        fontSize: 17, fontWeight: 900, color: '#fff', marginTop: 6,

        lineHeight: 1.2,

        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',

        textShadow: `0 1px 3px rgba(0,0,0,0.4)`,

      }}>

        {name}

      </div>

    </div>

  )

}

function CompareRow({
  label, home, away, hColor, aColor, lowerBetter = false, fmt, delay,
}: {
  label: string
  home: number | null
  away: number | null
  hColor: string
  aColor: string
  lowerBetter?: boolean
  fmt: (v: number | null) => string
  delay: number
}) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), (delay + 0.45) * 1000)
    return () => clearTimeout(t)
  }, [delay])

  // 의미 컬러 — 승=그린, 패=레드 (대조 강화)
  const WIN_COLOR = '#22e36b'   // 라임 그린 (승)
  const LOSE_COLOR = '#ef4444'  // 레드 (패)
  const DRAW_COLOR = '#facc15'  // 골드 (박빙)

  const hVal = home ?? 0
  const aVal = away ?? 0
  const total = hVal + aVal
  let hRatio = total > 0 ? hVal / total : 0.5
  let aRatio = total > 0 ? aVal / total : 0.5
  if (lowerBetter && total > 0) {
    hRatio = aVal / total
    aRatio = hVal / total
  }
  const noData = home == null && away == null
  const homeWins = lowerBetter ? (home != null && away != null && home < away)
                                : (home != null && away != null && home > away)
  const awayWins = lowerBetter ? (home != null && away != null && away < home)
                                : (home != null && away != null && away > home)
  const draw    = (!homeWins && !awayWins && home != null && away != null)

  const homeTextColor = draw ? DRAW_COLOR : (homeWins ? WIN_COLOR : LOSE_COLOR)
  const awayTextColor = draw ? DRAW_COLOR : (awayWins ? WIN_COLOR : LOSE_COLOR)
  // 막대 그라데이션 색 (값이 큰 쪽이 그린 의미는 아니고 비교용)
  const homeBarFrom = homeWins ? WIN_COLOR : LOSE_COLOR
  const awayBarFrom = awayWins ? WIN_COLOR : LOSE_COLOR

  return (
    <div style={{ width: '100%', marginBottom: 6, animation: `ts-fadeUp 0.5s ${delay}s both` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
        <span style={{
          fontSize: 16, fontWeight: 900,
          color: noData ? '#94a3b8' : homeTextColor,
          textShadow: noData ? 'none' : `0 0 10px ${homeTextColor}aa`,
        }}>{fmt(home)}</span>
        <span style={{ fontSize: 11, color: '#cbd5e1', letterSpacing: 2, fontWeight: 700 }}>{label}</span>
        <span style={{
          fontSize: 16, fontWeight: 900,
          color: noData ? '#94a3b8' : awayTextColor,
          textShadow: noData ? 'none' : `0 0 10px ${awayTextColor}aa`,
        }}>{fmt(away)}</span>
      </div>
      {noData ? (
        <div style={{ height: 9, borderRadius: 5, background: 'rgba(255,255,255,0.05)' }} />
      ) : (
        <div style={{
          display: 'flex', height: 11, borderRadius: 6, overflow: 'hidden',
          background: 'rgba(51,65,85,0.8)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        }}>
          <div style={{
            width: animated ? `${hRatio * 100}%` : '0%',
            background: `linear-gradient(90deg, ${homeBarFrom}cc 0%, ${homeBarFrom} 100%)`,
            transition: 'width 0.9s cubic-bezier(.3,1,.4,1)',
            boxShadow: `inset 0 0 8px ${homeBarFrom}66`,
          }} />
          <div style={{
            width: animated ? `${aRatio * 100}%` : '0%',
            background: `linear-gradient(90deg, ${awayBarFrom} 0%, ${awayBarFrom}cc 100%)`,
            transition: 'width 0.9s cubic-bezier(.3,1,.4,1)',
            boxShadow: `inset 0 0 8px ${awayBarFrom}66`,
            marginLeft: 'auto',
          }} />
        </div>
      )}
    </div>
  )
}

// =====================================================

// 장면 4: 승률 도넛 — stroke 채움 + pick-box pop

// =====================================================

function SceneWinRate({ game }: { game: Game }) {

  const big = game.pick.side === 'home' ? game.winRate.home : game.winRate.away

  const small = game.pick.side === 'home' ? game.winRate.away : game.winRate.home

  const bigTeam = game.pick.side === 'home' ? game.home : game.away

  const smallTeam = game.pick.side === 'home' ? game.away : game.home

  const bigC = lightenForText(bigTeam.c1)

  return (

    <div style={{ ...sceneCenter, padding: '130px 20px 175px' }}>

      {/* 픽팀 컬러 그라데이션 오버레이 — 색감 강화 */}

      <div style={{

        position: 'absolute', inset: 0,

        background: `radial-gradient(80% 60% at 50% 40%, ${bigTeam.c1}22 0%, transparent 70%)`,

        pointerEvents: 'none',

      }} />

      <div style={{

        fontSize: 13, color: '#e2e8f0', fontWeight: 700, letterSpacing: 2,

        marginBottom: 16, position: 'relative',

        animation: 'ts-fadeUp 0.5s 0.1s both',

      }}>

        그래서 <span style={{ color: BRAND_C1 }}>AI 픽</span>은

      </div>

      <div style={{ animation: 'ts-fadeUp 0.5s 0.3s both', position: 'relative' }}>

        <Donut

          size={210}

          thickness={26}

          primary={big}

          secondary={small}

          primaryColor={lightenForText(bigTeam.c1)}

          secondaryColor={smallTeam.c1 + 'cc'}

          centerLabel={`${big}%`}

          centerSub={bigTeam.ko}

        />

      </div>

      {/* 좌우 팀 카드 (색감 풀) */}

      <div style={{

        display: 'flex', gap: 10, width: 280, marginTop: 16,

        animation: 'ts-fadeUp 0.5s 0.6s both',

        position: 'relative',

      }}>

        <TeamPctCard team={bigTeam} pct={big} highlight />

        <TeamPctCard team={smallTeam} pct={small} />

      </div>

      {/* 픽 박스 — pop! */}

      <div style={{

        marginTop: 18,

        padding: '14px 20px',

        borderRadius: 14,

        background: `linear-gradient(135deg, ${bigTeam.c1}44 0%, ${bigTeam.c1}11 100%)`,

        border: `1.5px solid ${bigC}`,

        textAlign: 'center',

        width: 280,

        boxShadow: `0 10px 28px ${bigTeam.c1}55, inset 0 0 24px ${bigTeam.c1}22`,

        animation: 'ts-pop 0.55s 1.4s cubic-bezier(.2,1.4,.4,1) both',

        position: 'relative',

      }}>

        <div style={{

          fontSize: 10, color: BRAND_C1, fontWeight: 800, letterSpacing: 3,

          textShadow: `0 0 8px ${BRAND_C1}66`,

        }}>

          ★ AI 추천 ★

        </div>

        <div style={{

          fontSize: 22, fontWeight: 900, marginTop: 4, marginBottom: 6,

          color: '#fff',

          textShadow: `0 2px 8px ${bigTeam.c1}aa`,

        }}>

          {bigTeam.ko} <span style={{ color: bigC }}>승</span>

        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>

          <Stars n={game.pick.stars} size={18} />

        </div>

      </div>

    </div>

  )

}

// 승률 섹션 좌우 팀 카드 (색감 풀)

function Donut({

  size, thickness, primary, secondary, primaryColor, secondaryColor,

  centerLabel, centerSub,

}: {

  size: number; thickness: number

  primary: number; secondary: number

  primaryColor: string; secondaryColor: string

  centerLabel: string; centerSub: string

}) {

  const r = (size - thickness) / 2

  const cx = size / 2, cy = size / 2

  const circ = 2 * Math.PI * r

  const total = primary + secondary || 100

  const pPrim = primary / total

  const targetOffset = circ - (circ * pPrim)

  return (

    <svg width={size} height={size}>

      <defs>

        <linearGradient id="donutBrand" x1="0%" y1="0%" x2="100%" y2="100%">

          <stop offset="0%" stopColor={primaryColor} />

          <stop offset="100%" stopColor={primaryColor + 'aa'} />

        </linearGradient>

        <filter id="donutGlow">

          <feGaussianBlur stdDeviation="2.5" result="blur" />

          <feMerge>

            <feMergeNode in="blur" />

            <feMergeNode in="SourceGraphic" />

          </feMerge>

        </filter>

      </defs>

      <circle cx={cx} cy={cy} r={r}

        fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={thickness} />

      <circle cx={cx} cy={cy} r={r}

        fill="none" stroke={secondaryColor} strokeWidth={thickness}

        strokeDasharray={`${circ * (1 - pPrim)} ${circ}`}

        strokeDashoffset={-circ * pPrim}

        transform={`rotate(-90 ${cx} ${cy})`} />

      <circle cx={cx} cy={cy} r={r}

        fill="none" stroke="url(#donutBrand)" strokeWidth={thickness}

        strokeDasharray={circ}

        strokeLinecap="round"

        transform={`rotate(-90 ${cx} ${cy})`}

        filter="url(#donutGlow)"

        style={{

          ['--ts-circ' as any]: `${circ}`,

          ['--ts-target' as any]: `${targetOffset}`,

          animation: 'ts-donut 1.2s 0.35s cubic-bezier(.3,1,.4,1) both',

        } as React.CSSProperties} />

      <text x={cx} y={cy + 8} textAnchor="middle"

        fontSize={size * 0.26} fontWeight={900} fill="#fff">{centerLabel}</text>

      <text x={cx} y={cy + 32} textAnchor="middle"

        fontSize={13} fontWeight={800} fill="#ffffff" letterSpacing="2" opacity="0.95">{centerSub}</text>

    </svg>

  )

}

function TeamPctCard({ team, pct, highlight = false }: { team: TeamMeta; pct: number; highlight?: boolean }) {

  const tC = lightenForText(team.c1)

  return (

    <div style={{

      flex: 1,

      padding: '10px 12px',

      borderRadius: 12,

      background: highlight

        ? `linear-gradient(135deg, ${team.c1}77 0%, ${team.c1}22 100%)`

        : `linear-gradient(135deg, ${team.c1}44 0%, ${team.c1}11 100%)`,

      border: `1px solid ${highlight ? tC : team.c1 + 'aa'}`,

      boxShadow: highlight ? `0 8px 22px ${team.c1}66` : `0 3px 10px ${team.c1}22`,

      textAlign: 'center',

    }}>

      <div style={{

        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,

        marginBottom: 4,

      }}>

        <span style={{

          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',

          background: tC,

          boxShadow: highlight ? `0 0 8px ${tC}` : 'none',

        }} />

        <span style={{

          fontSize: 12, fontWeight: 800,

          color: highlight ? tC : '#f1f5f9',

        }}>{team.ko}</span>

      </div>

      <div style={{

        fontSize: 22, fontWeight: 900,

        color: '#ffffff',

        textShadow: highlight ? `0 2px 10px ${team.c1}aa` : '0 1px 3px rgba(0,0,0,0.4)',

        lineHeight: 1,

      }}>

        {pct}<span style={{ fontSize: 13, opacity: 0.7 }}>%</span>

      </div>

    </div>

  )

}

// =====================================================

// 장면 5: CTA — staggered fadeUp

// =====================================================

function SceneCTA({ game }: { game: Game }) {
  return (
    <div style={sceneCenter}>
      <div style={{
        fontSize: 32, fontWeight: 900, textAlign: 'center', lineHeight: 1.25,
        animation: 'ts-fadeUp 0.6s 0.2s both',
      }}>
        맞았을까요?<br/>
        <span style={{ color: BRAND_C1 }}>결과는 내일</span>
      </div>

      <div style={{
        marginTop: 22, fontSize: 15, fontWeight: 700, textAlign: 'center',
        color: '#cbd5e1',
        animation: 'ts-fadeUp 0.5s 0.8s both',
      }}>
        📌 <span style={{ color: '#facc15' }}>고정 댓글</span>에서 확인
      </div>

      <div style={{ marginTop: 36, animation: 'ts-fadeUp 0.5s 1.2s both' }}>
        <TrendSoccerWordmark height={28} />
      </div>

      <div style={{
        marginTop: 10, fontSize: 13, color: '#64748b', fontWeight: 600,
        animation: 'ts-fadeUp 0.5s 1.4s both',
      }}>
        매일 AI 픽 · trendsoccer.com
      </div>

      <div style={{
        position: 'absolute', bottom: 26, left: 0, right: 0,
        fontSize: 10, color: '#475569', textAlign: 'center', lineHeight: 1.6,
        animation: 'ts-fadeUp 0.5s 1.8s both',
      }}>
        본 콘텐츠는 AI 데이터 분석이며 베팅 권유가 아닙니다
      </div>
    </div>
  )
}

function TrendSoccerWordmark({ height = 20, opacity = 1 }: { height?: number; opacity?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.svg" alt="TrendSoccer"
      style={{ height, width: 'auto', opacity, display: 'block' }} />
  )
}

function Stars({ n, size = 22 }: { n: number; size?: number }) {
  return (
    <div style={{ display: 'inline-flex', gap: 4, justifyContent: 'center' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{
          fontSize: size,
          color: i < n ? '#facc15' : 'rgba(255,255,255,0.15)',
          textShadow: i < n ? '0 0 10px rgba(250,204,21,0.6)' : 'none',
          lineHeight: 1,
        }}>★</span>
      ))}
    </div>
  )
}

function sceneLabel(k: SceneKey): string {
  switch (k) {
    case 'hook':    return '훅'
    case 'matchup': return '매치업'
    case 'pitcher': return '투수 분석'
    case 'winrate': return '승률'
    case 'cta':     return 'CTA'
  }
}

function formatMatchTime(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Seoul',
    })
  } catch {
    return iso
  }
}

const sceneCenter: React.CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  color: '#fff',
  zIndex: 2,
  padding: '130px 20px 175px',
}

const sceneCol: React.CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center',
  color: '#fff',
  zIndex: 2,
  paddingTop: 130,
  paddingBottom: 175,
}

const emptyStyle: React.CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#666', fontSize: 13,
}
