'use client'

// app/[locale]/admin/ads/DailyClipGenerator.tsx
// 데일리 분석 영상 — 오늘 KBO/NPB 주요 경기 5개 + 인트로/CTA
// 네이버 클립용 mp4(무음) 자동 다운로드까지

import { useEffect, useMemo, useRef, useState } from 'react'

interface TeamMeta {
  ko: string; en: string
  ab: string; c1: string; c2: string
  logo: string
}
interface Game {
  id: number
  league: string
  home: TeamMeta
  away: TeamMeta
  winRate: { home: number; away: number }
  pick: { team: string; side: 'home' | 'away'; stars: number; grade: string | null }
  matchTime: string
  matchDate: string
}

const BRAND_C1 = '#A3FF4C'
const BRAND_C2 = '#62F4FF'
const LEAGUE_BADGE: Record<string, { bg: string; fg: string }> = {
  KBO: { bg: '#D5001C', fg: '#FFFFFF' },
  NPB: { bg: '#0B2D5E', fg: '#FFFFFF' },
  MLB: { bg: '#002D72', fg: '#FFFFFF' },
}

// BGM 선택지 — ShortsGenerator와 동일 (crop API의 BGM_WHITELIST와 동기화)
const BGM_OPTIONS = [
  { key: 'sport-energetic',  label: 'Sport Energetic' },
  { key: 'sports-rock',      label: 'Sports Rock' },
  { key: 'delo-energetic',   label: 'Energetic Sports' },
  { key: 'kontraa-uk-drill', label: 'Kontraa · UK Drill' },
  { key: 'leberch-hiphop',   label: 'Leberch · Hip-Hop' },
  { key: 'bombin-chill',     label: 'Bombin · Chill HH' },
  { key: 'rockot-cinematic', label: 'Rockot · Cinematic' },
  { key: '',                 label: '무음' },
] as const

const KEYFRAMES = `
@keyframes dc-slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes dc-pop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes dc-fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes dc-zoomIn { 0% { transform: scale(0.3); opacity: 0; } 60% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes dc-glowPulse { 0%, 100% { filter: drop-shadow(0 0 16px ${BRAND_C1}aa) drop-shadow(0 0 32px ${BRAND_C2}66); } 50% { filter: drop-shadow(0 0 28px ${BRAND_C1}) drop-shadow(0 0 56px ${BRAND_C2}aa); } }
@keyframes dc-ballSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes dc-shine { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes dc-flashIn { 0% { opacity: 0; transform: scale(1.4); letter-spacing: 30px; } 60% { opacity: 1; letter-spacing: 8px; } 100% { opacity: 1; transform: scale(1); letter-spacing: 6px; } }
@keyframes dc-bgPan { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
@keyframes dc-stripeRise { from { transform: translateY(120%) skewY(-8deg); opacity: 0; } to { transform: translateY(0) skewY(-8deg); opacity: 0.85; } }
`

const OPENER_MS = 3500
const INTRO_MS = 2500
const MATCH_MS = 5500
const CTA_MS = 4000

export default function DailyClipGenerator() {
  const [leagues, setLeagues] = useState<('KBO' | 'NPB' | 'MLB')[]>(['KBO', 'NPB'])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [sceneIdx, setSceneIdx] = useState(-2) // -2 = opener(대문), -1 = intro(요약), 0~4 = match, 5 = cta
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [mountKey, setMountKey] = useState(0)
  const [recording, setRecording] = useState(false)
  const [recStatus, setRecStatus] = useState('')
  const [bgm, setBgm] = useState<string>('sport-energetic')
  const [metaCopied, setMetaCopied] = useState<'title' | 'desc' | 'both' | null>(null)

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const rafRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recStreamRef = useRef<MediaStream | null>(null)

  // 게임 fetch — 여러 리그를 합쳐서 별점 높은 순 상위 5
  useEffect(() => {
    let aborted = false
    async function load() {
      setLoading(true); setErr(null)
      try {
        const all: Game[] = []
        for (const lg of leagues) {
          const r = await fetch(`/api/admin/shorts-data?league=${lg}`, { cache: 'no-store' })
          const j = await r.json()
          if (j.success && Array.isArray(j.games)) {
            all.push(...j.games.map((g: any) => ({
              id: g.id, league: g.league,
              home: g.home, away: g.away,
              winRate: g.winRate, pick: g.pick,
              matchTime: g.matchTime, matchDate: g.matchDate,
            })))
          }
        }
        if (aborted) return
        // 오늘(한국 시간) 경기만 필터
        const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0]
        let filtered = all.filter(g => g.matchDate === today)
        // 오늘 경기가 5개 미만이면 내일까지 포함
        if (filtered.length < 5) {
          const tomorrow = new Date(Date.now() + 33 * 3600 * 1000).toISOString().split('T')[0]
          const tomorrowGames = all.filter(g => g.matchDate === tomorrow)
          filtered = [...filtered, ...tomorrowGames]
        }
        // 정렬: 가까운 시간 우선, 같으면 별점 높은 순
        filtered.sort((a, b) => a.matchTime.localeCompare(b.matchTime) || b.pick.stars - a.pick.stars)
        console.log('[daily-clip] today=', today, 'total fetched=', all.length, 'after filter=', filtered.length)
        setGames(filtered.slice(0, 5))
      } catch (e: any) {
        if (!aborted) setErr(e?.message || 'fetch error')
      } finally {
        if (!aborted) setLoading(false)
      }
    }
    load()
    return () => { aborted = true }
  }, [leagues.join(',')])

  const TOTAL_MS = useMemo(
    () => OPENER_MS + INTRO_MS + MATCH_MS * games.length + CTA_MS,
    [games.length]
  )

  // 네이버 클립 제목/설명 자동 생성 (games 바뀔 때마다 재계산)
  const naverMeta = useMemo(
    () => games.length > 0 ? buildNaverClipMeta(games) : { title: '', description: '' },
    [games]
  )

  const copyMeta = async (kind: 'title' | 'desc' | 'both') => {
    let text = ''
    if (kind === 'title') text = naverMeta.title
    else if (kind === 'desc') text = naverMeta.description
    else text = `[제목]\n${naverMeta.title}\n\n[설명]\n${naverMeta.description}`
    try {
      await navigator.clipboard.writeText(text)
      setMetaCopied(kind)
      setTimeout(() => setMetaCopied(null), 1500)
    } catch {
      alert('클립보드 복사 실패 — 텍스트를 직접 선택해주세요.')
    }
  }

  useEffect(() => { setMountKey(k => k + 1) }, [sceneIdx])

  const stopAll = () => {
    timersRef.current.forEach(clearTimeout); timersRef.current = []
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setPlaying(false)
  }
  useEffect(() => () => stopAll(), [])

  const play = () => {
    if (games.length === 0) return
    stopAll()
    setPlaying(true); setProgress(0); setSceneIdx(-2)
    setMountKey(k => k + 1)
    startedAtRef.current = performance.now()
    // -2(opener) → -1(intro) → 0~n-1(match) → n(cta)
    let acc = OPENER_MS
    timersRef.current.push(setTimeout(() => setSceneIdx(-1), acc))
    acc += INTRO_MS
    for (let i = 0; i < games.length; i++) {
      const idx = i
      timersRef.current.push(setTimeout(() => setSceneIdx(idx), acc))
      acc += MATCH_MS
    }
    timersRef.current.push(setTimeout(() => setSceneIdx(games.length), acc))
    timersRef.current.push(setTimeout(() => { setPlaying(false); setProgress(1) }, acc + CTA_MS))
    const tick = () => {
      const p = Math.min((performance.now() - startedAtRef.current) / TOTAL_MS, 1)
      setProgress(p)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const stopRecordingStream = () => {
    try { recStreamRef.current?.getTracks().forEach(t => t.stop()) } catch {}
    recStreamRef.current = null
    recorderRef.current = null
  }

  // 다운로드 (네이버 클립용 mp4 무음)
  const downloadClip = async () => {
    console.log('[daily-clip] download click — games:', games.length, 'recording:', recording, 'TOTAL_MS:', TOTAL_MS)
    if (recording) { alert('이미 녹화 중입니다.'); return }
    if (games.length === 0) {
      alert('표시할 경기가 없습니다.\n\n오늘 예정 경기가 없거나 데이터 로드 실패.\n리그 체크박스를 확인해주세요.')
      return
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert('이 브라우저는 자동 녹화를 지원하지 않습니다. (Chrome/Edge 최신 사용)'); return
    }
    if (!window.confirm('네이버 클립용 데일리 분석 영상을 녹화합니다.\n\n1) 다음 다이얼로그에서 "Chrome 탭" 또는 "이 탭"을 선택\n2) 약 ' + Math.round(TOTAL_MS / 1000) + '초 후 자동으로 mp4 다운로드\n3) 녹화 중 다른 탭으로 이동 금지\n\n계속하시겠습니까?')) {
      console.log('[daily-clip] user cancelled')
      return
    }

    try {
      console.log('[daily-clip] step 1: requesting permission')
      setRecStatus('권한 요청 중… (다이얼로그에서 탭 선택)')
      await new Promise(r => setTimeout(r, 50))
      const stream = await navigator.mediaDevices.getDisplayMedia({
        // @ts-expect-error - chrome preferCurrentTab
        preferCurrentTab: true,
        video: { width: { ideal: 1920 }, height: { ideal: 1920 }, frameRate: { ideal: 30 } },
        audio: false,
      })
      console.log('[daily-clip] step 2: stream acquired', stream.getVideoTracks().length, 'tracks')
      recStreamRef.current = stream

      const mime = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') ? 'video/webm; codecs=vp9' : 'video/webm'
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 })
      recorderRef.current = recorder
      const chunks: Blob[] = []
      recorder.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data) }

      recorder.onstop = async () => {
        const raw = new Blob(chunks, { type: 'video/webm' })
        setRecStatus('mp4(무음)으로 변환 중…')
        let finalBlob: Blob = raw
        let ok = false
        try {
          const buf = await raw.arrayBuffer()
          const qs = new URLSearchParams({ format: 'mp4' })
          if (bgm) qs.set('bgm', bgm)
          const res = await fetch('/api/admin/shorts-crop?' + qs.toString(), {
            method: 'POST', headers: { 'Content-Type': 'video/webm' }, body: buf,
          })
          if (res.ok) { finalBlob = await res.blob(); ok = true }
        } catch {}

        const url = URL.createObjectURL(finalBlob)
        const a = document.createElement('a')
        a.href = url
        const today = new Date().toISOString().split('T')[0]
        a.download = ok ? `trendsoccer_daily_${today}.mp4` : `trendsoccer_daily_${today}_RAW.webm`
        document.body.appendChild(a); a.click(); a.remove()
        URL.revokeObjectURL(url)

        stopRecordingStream(); setRecording(false)

        // 다운로드 성공 시 제목+설명 자동 클립보드 복사
        if (ok) {
          try {
            await navigator.clipboard.writeText(
              `[제목]\n${naverMeta.title}\n\n[설명]\n${naverMeta.description}`
            )
            setRecStatus('다운로드 완료 — 제목/설명 클립보드 복사됨')
          } catch {
            setRecStatus('다운로드 완료 (메타 복사 실패 — 아래 박스의 개별 복사 버튼 사용)')
          }
        } else {
          setRecStatus('변환 실패 — 원본 webm 다운')
        }
        setTimeout(() => setRecStatus(''), 6000)
      }

      const vt = stream.getVideoTracks()[0]
      if (vt) vt.onended = () => { if (recorder.state === 'recording') recorder.stop() }

      console.log('[daily-clip] step 3: starting recorder')
      setRecording(true)
      setRecStatus('녹화 중 — ' + Math.round(TOTAL_MS / 1000) + '초')
      recorder.start(200)
      await new Promise(r => setTimeout(r, 400))
      console.log('[daily-clip] step 4: playing')
      play()
      setTimeout(() => {
        console.log('[daily-clip] step 5: stopping recorder, state:', recorder.state)
        try { if (recorder.state === 'recording') recorder.stop() } catch (err) { console.error(err) }
      }, TOTAL_MS + 700)
    } catch (e: any) {
      console.error('[daily-clip] error:', e)
      setRecording(false); setRecStatus('')
      stopRecordingStream()
      if (e?.name === 'NotAllowedError') {
        alert('화면 공유 권한이 거부되었습니다.\n다이얼로그에서 "이 탭" 또는 "Chrome 탭"을 선택해주세요.')
      } else {
        alert('녹화 실패: ' + (e?.message || e) + '\n\nF12 콘솔에서 [daily-clip] 로그를 확인해주세요.')
      }
    }
  }

  const todayLabel = new Date().toLocaleDateString('ko-KR', {
    month: '2-digit', day: '2-digit', weekday: 'short', timeZone: 'Asia/Seoul',
  })

  return (
    <div className="text-white">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* 컨트롤 바 */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-400">데일리 분석 클립 — 오늘의 주요 5경기</label>
          <div className="flex items-center gap-2 ml-2">
            {(['KBO', 'NPB', 'MLB'] as const).map(lg => (
              <label key={lg} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={leagues.includes(lg)}
                  onChange={(e) => {
                    if (e.target.checked) setLeagues([...leagues, lg])
                    else setLeagues(leagues.filter(x => x !== lg))
                  }} />
                {lg}
              </label>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={play} disabled={games.length === 0 || playing}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-1.5 rounded text-sm font-semibold">
            재생
          </button>
          <button onClick={stopAll}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-1.5 rounded text-sm">정지</button>
          <select
            value={bgm}
            onChange={(e) => setBgm(e.target.value)}
            disabled={recording}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
            title="BGM (Pixabay License — 상업 사용 가능)">
            {BGM_OPTIONS.map(b => (
              <option key={b.key} value={b.key}>{b.label}</option>
            ))}
          </select>
          <button onClick={downloadClip} disabled={games.length === 0 || recording}
            className="bg-green-700 hover:bg-green-800 disabled:opacity-50 px-4 py-1.5 rounded text-sm font-semibold"
            title={games.length === 0 ? '경기 없음 — 리그 체크박스 확인' : recording ? '녹화 중' : '클릭 → 권한 후 자동 다운로드'}>
            네이버 클립 다운 (mp4)
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {loading ? '경기 불러오는 중…' : `${games.length}개 경기 로드 · 총 ${Math.round(TOTAL_MS / 1000)}초 영상`}
        </div>
        {err && <div className="mt-2 text-red-400 text-sm">에러: {err}</div>}
        {recStatus && <div className="mt-2 text-emerald-400 text-sm font-semibold">{recStatus}</div>}
        <div className="mt-3 h-1.5 bg-gray-800 rounded overflow-hidden">
          <div className="h-full bg-emerald-600 transition-[width] duration-100"
            style={{ width: `${(progress * 100).toFixed(2)}%` }} />
        </div>
      </div>

      {/* 네이버 클립 메타 정보 — 제목 24자 / 설명 200자 자동 생성 */}
      {games.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-300">네이버 클립 업로드용 메타</div>
            <button
              onClick={() => copyMeta('both')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                metaCopied === 'both' ? 'bg-emerald-700' : 'bg-blue-700 hover:bg-blue-600'
              }`}>
              {metaCopied === 'both' ? '복사됨' : '전체 복사'}
            </button>
          </div>

          {/* 제목 */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">제목</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${naverMeta.title.length > 24 ? 'text-red-400' : 'text-gray-500'}`}>
                  {naverMeta.title.length}/24
                </span>
                <button
                  onClick={() => copyMeta('title')}
                  className={`px-2 py-0.5 rounded text-xs ${
                    metaCopied === 'title' ? 'bg-emerald-700' : 'bg-gray-700 hover:bg-gray-600'
                  }`}>
                  {metaCopied === 'title' ? '복사됨' : '복사'}
                </button>
              </div>
            </div>
            <div className="bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white font-medium">
              {naverMeta.title || '—'}
            </div>
          </div>

          {/* 설명 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">설명 (최소 10자)</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${
                  naverMeta.description.length > 200 || naverMeta.description.length < 10
                    ? 'text-red-400' : 'text-gray-500'
                }`}>
                  {naverMeta.description.length}/200
                </span>
                <button
                  onClick={() => copyMeta('desc')}
                  className={`px-2 py-0.5 rounded text-xs ${
                    metaCopied === 'desc' ? 'bg-emerald-700' : 'bg-gray-700 hover:bg-gray-600'
                  }`}>
                  {metaCopied === 'desc' ? '복사됨' : '복사'}
                </button>
              </div>
            </div>
            <div className="bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 whitespace-pre-line leading-relaxed">
              {naverMeta.description || '—'}
            </div>
          </div>

          <div className="mt-2 text-[11px] text-gray-500">
            네이버 클립 정책: 해시태그(#)와 언더스코어(_) 외 특수문자/이모지는 태그로 인식 안 됨. 자동 생성문은 정책 준수 포맷.
          </div>
        </div>
      )}

      {/* 9:16 스테이지 */}
      {/* 녹화 중 검정 오버레이 — stage 외부에 배치해야 stage 콘텐츠를 안 가림 */}
      {recording && (
        <div style={{
          position: 'fixed', inset: 0,
          background: '#000',
          zIndex: 99998,
        }} />
      )}

      <div className="flex flex-col items-center">
        <div className="text-xs text-gray-500 mb-2">↓ 이 영역만 녹화 · 1080×1920</div>
        <div
          ref={stageRef}
          style={recording ? {
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            height: '100vh', width: 'calc(100vh * 9 / 16)',
            maxWidth: '100vw', maxHeight: 'calc(100vw * 16 / 9)',
            background: '#070a10', borderRadius: 0, overflow: 'hidden', zIndex: 99999,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Pretendard, sans-serif',
          } : {
            width: 360, height: 640,
            background: '#070a10', borderRadius: 20, overflow: 'hidden', position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Pretendard, sans-serif',
          }}
        >
          {games.length > 0 ? (
            <Stage key={mountKey} sceneIdx={sceneIdx} games={games} todayLabel={todayLabel} progress={progress} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              {loading ? '데이터 로드 중…' : '경기 없음'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// 스테이지
// ============================================
function Stage({ sceneIdx, games, todayLabel, progress }: {
  sceneIdx: number; games: Game[]; todayLabel: string; progress: number
}) {
  return (
    <>
      {/* 배경 그라데이션 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(120% 80% at 50% -10%, #16223a 0%, transparent 55%), linear-gradient(180deg, #0a0e14 0%, #070a10 100%)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '36px 36px', pointerEvents: 'none',
      }} />

      {/* 상단 워드마크 — OPENER 외 모든 씬에 노출 */}
      {sceneIdx !== -2 && (
        <div style={{
          position: 'absolute', top: 36, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 30,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="TrendSoccer" style={{ height: 36, display: 'block' }} />
          <div style={{
            padding: '6px 14px',
            background: `linear-gradient(135deg, ${BRAND_C1}44 0%, ${BRAND_C2}2a 100%)`,
            border: `2px solid ${BRAND_C1}cc`,
            borderRadius: 10, fontSize: 14, fontWeight: 900, letterSpacing: 3,
            color: BRAND_C1, textShadow: `0 0 10px ${BRAND_C1}aa`,
          }}>
            DAILY ANALYSIS
          </div>
        </div>
      )}

      {/* 장면 */}
      {sceneIdx === -2 && <SceneOpener todayLabel={todayLabel} count={games.length} />}
      {sceneIdx === -1 && <SceneIntro todayLabel={todayLabel} count={games.length} />}
      {sceneIdx >= 0 && sceneIdx < games.length && (
        <SceneMatch game={games[sceneIdx]} idx={sceneIdx + 1} total={games.length} />
      )}
      {sceneIdx === games.length && <SceneCTA games={games} todayLabel={todayLabel} />}
    </>
  )
}

// ============================================
// 오프닝 (대문) — 브랜드 풀스크린 인트로
// ============================================
function SceneOpener({ todayLabel, count }: { todayLabel: string; count: number }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', textAlign: 'center', zIndex: 5,
      overflow: 'hidden',
    }}>
      {/* 풀스크린 그라데이션 + 팬 애니메이션 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(135deg, #0a0e14 0%, #0d1830 25%, #14274a 50%, #0d1830 75%, #0a0e14 100%)`,
        backgroundSize: '300% 300%',
        animation: 'dc-bgPan 6s ease-in-out infinite alternate',
      }} />

      {/* 사선 컬러 스트라이프 */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%', right: '-10%',
        height: '40%', transform: 'skewY(-8deg)',
        background: `linear-gradient(90deg, ${BRAND_C1}22 0%, ${BRAND_C2}33 50%, ${BRAND_C1}22 100%)`,
        animation: 'dc-stripeRise 0.8s 0.1s cubic-bezier(.2,1.1,.4,1) both',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', left: '-10%', right: '-10%',
        height: '40%', transform: 'skewY(-8deg)',
        background: `linear-gradient(90deg, ${BRAND_C2}22 0%, ${BRAND_C1}33 50%, ${BRAND_C2}22 100%)`,
        animation: 'dc-stripeRise 0.8s 0.25s cubic-bezier(.2,1.1,.4,1) both',
      }} />

      {/* 그리드 텍스처 */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px', pointerEvents: 'none',
      }} />

      {/* 야구공 아이콘 (회전) */}
      <div style={{
        position: 'relative', zIndex: 3, marginBottom: 30,
        animation: 'dc-zoomIn 0.9s 0.2s cubic-bezier(.2,1.4,.4,1) both',
      }}>
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #f1f5f9 60%, #cbd5e1 100%)',
          boxShadow: `0 0 40px ${BRAND_C1}88, 0 0 80px ${BRAND_C2}55, inset 0 -8px 24px rgba(0,0,0,0.2)`,
          position: 'relative',
          animation: 'dc-ballSpin 8s linear infinite',
        }}>
          {/* 야구공 솔기 (좌) */}
          <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <path d="M 18 22 Q 35 50 18 78" stroke="#dc2626" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 82 22 Q 65 50 82 78" stroke="#dc2626" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* 봉제선 디테일 */}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={'l' + i}
                x1={16 + (i * 0.6)} y1={28 + i * 6}
                x2={22 + (i * 0.6)} y2={26 + i * 6}
                stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={'r' + i}
                x1={78 - (i * 0.6)} y1={28 + i * 6}
                x2={84 - (i * 0.6)} y2={26 + i * 6}
                stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
            ))}
          </svg>
        </div>
      </div>

      {/* TrendSoccer 로고 */}
      <div style={{
        position: 'relative', zIndex: 3, marginBottom: 22,
        animation: 'dc-zoomIn 0.7s 0.5s cubic-bezier(.2,1.4,.4,1) both, dc-glowPulse 2.4s 1.2s ease-in-out infinite',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="TrendSoccer" style={{ height: 56, display: 'block' }} />
      </div>

      {/* DAILY BASEBALL 빅타이포 */}
      <div style={{
        position: 'relative', zIndex: 3,
        fontSize: 42, fontWeight: 900, lineHeight: 1, marginBottom: 6,
        background: `linear-gradient(135deg, ${BRAND_C1} 0%, #ffffff 50%, ${BRAND_C2} 100%)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'dc-flashIn 0.9s 0.9s cubic-bezier(.2,1.1,.4,1) both',
      }}>
        DAILY BASEBALL
      </div>

      {/* ANALYSIS — 외곽선 박스 */}
      <div style={{
        position: 'relative', zIndex: 3,
        marginTop: 8, padding: '10px 26px',
        border: `2.5px solid ${BRAND_C1}`,
        borderRadius: 14,
        fontSize: 26, fontWeight: 900, letterSpacing: 14,
        color: '#fff',
        textShadow: `0 0 18px ${BRAND_C1}aa, 0 0 36px ${BRAND_C2}66`,
        boxShadow: `0 8px 30px ${BRAND_C1}55, inset 0 0 14px ${BRAND_C2}33`,
        background: `linear-gradient(135deg, ${BRAND_C1}1a 0%, ${BRAND_C2}11 100%)`,
        animation: 'dc-flashIn 0.9s 1.4s cubic-bezier(.2,1.1,.4,1) both',
      }}>
        ANALYSIS
      </div>

      {/* 하단 라벨 */}
      <div style={{
        position: 'relative', zIndex: 3, marginTop: 26,
        fontSize: 14, color: '#cbd5e1', letterSpacing: 4, fontWeight: 700,
        animation: 'dc-fadeIn 0.6s 2.0s both',
      }}>
        {todayLabel} · {count} GAMES
      </div>

      {/* 하단 powered by */}
      <div style={{
        position: 'absolute', bottom: 60, left: 0, right: 0,
        textAlign: 'center', zIndex: 3,
        fontSize: 11, color: '#64748b', letterSpacing: 3, fontWeight: 600,
        animation: 'dc-fadeIn 0.6s 2.3s both',
      }}>
        POWERED BY TRENDSOCCER AI
      </div>
    </div>
  )
}

// ============================================
// 인트로 (요약)
// ============================================
function SceneIntro({ todayLabel, count }: { todayLabel: string; count: number }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '130px 24px 175px', textAlign: 'center', zIndex: 2,
    }}>
      <div style={{
        fontSize: 13, color: '#94a3b8', letterSpacing: 5, marginBottom: 18,
        animation: 'dc-fadeIn 0.5s 0.1s both',
      }}>
        DAILY BASEBALL ANALYSIS
      </div>
      <div style={{
        fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 14,
        animation: 'dc-pop 0.6s 0.3s cubic-bezier(.2,1.4,.4,1) both',
      }}>
        {todayLabel}<br/>
        <span style={{ color: BRAND_C1 }}>오늘의 AI 분석 {count}경기</span>
      </div>

    </div>
  )
}

// ============================================
// 각 매치 장면
// ============================================
function SceneMatch({ game, idx, total }: { game: Game; idx: number; total: number }) {
  const lb = LEAGUE_BADGE[game.league] || { bg: '#444', fg: '#fff' }
  const pickPct = game.pick.side === 'home' ? game.winRate.home : game.winRate.away
  const pickTeam = game.pick.team
  const pickColor = game.pick.side === 'home' ? game.home.c1 : game.away.c1
  const pickColorSafe = lightenForText(pickColor)

  // 연출: % 카운트업 + 별점 순차 등장
  const animatedPct = useCountUp(pickPct, 1500, 800)
  const [shownStars, setShownStars] = useState(0)
  useEffect(() => {
    setShownStars(0)
    let count = 0
    const interval = setInterval(() => {
      count++
      setShownStars(count)
      if (count >= game.pick.stars) clearInterval(interval)
    }, 220)
    return () => clearInterval(interval)
  }, [game.pick.stars])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      padding: '130px 22px 175px',
      zIndex: 2,
    }}>
      {/* idx 표시 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
        animation: 'dc-slideUp 0.5s 0.1s both',
      }}>
        <span style={{
          padding: '4px 10px',
          background: lb.bg, color: lb.fg,
          borderRadius: 8, fontSize: 11, fontWeight: 900, letterSpacing: 2,
        }}>{game.league}</span>
        <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 700 }}>
          분석 {idx} / {total}
        </span>
      </div>

      {/* 매치업 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26,
        animation: 'dc-slideUp 0.5s 0.25s both',
      }}>
        <TeamCircle team={game.home} side="HOME" />
        <div style={{
          fontSize: 26, fontWeight: 900,
          background: `linear-gradient(135deg, ${BRAND_C1} 0%, ${BRAND_C2} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>VS</div>
        <TeamCircle team={game.away} side="AWAY" />
      </div>

      {/* 픽 박스 */}
      <div style={{
        padding: '18px 22px', borderRadius: 16,
        background: `linear-gradient(135deg, ${pickColorSafe}44 0%, ${pickColorSafe}11 100%)`,
        border: `2px solid ${pickColorSafe}`,
        boxShadow: `0 10px 28px ${pickColorSafe}55`,
        textAlign: 'center', width: 270,
        animation: 'dc-pop 0.55s 0.5s cubic-bezier(.2,1.4,.4,1) both',
      }}>
        <div style={{ fontSize: 11, color: BRAND_C1, fontWeight: 800, letterSpacing: 3, marginBottom: 6 }}>
          AI 분석
        </div>
        <div style={{
          fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 4,
          textShadow: `0 2px 8px ${pickColorSafe}77`,
        }}>
          {pickTeam}
        </div>
        {/* % 카운트업 + 흰색 + 글로우 (어두운 팀도 잘 보임) */}
        <div style={{
          fontSize: 38, fontWeight: 900, color: '#ffffff', lineHeight: 1, marginBottom: 4,
          textShadow: `0 0 16px ${pickColorSafe}, 0 0 28px ${pickColorSafe}cc, 0 2px 6px rgba(0,0,0,0.5)`,
        }}>
          {animatedPct}<span style={{ fontSize: 22, opacity: 0.85, marginLeft: 2 }}>%</span>
        </div>
        {/* 승률 진행바 — 채워지는 연출 */}
        <div style={{
          width: '90%', margin: '6px auto 10px',
          height: 6, borderRadius: 3,
          background: 'rgba(0,0,0,0.4)',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            width: `${animatedPct}%`, height: '100%',
            background: `linear-gradient(90deg, ${pickColorSafe} 0%, #ffffff 100%)`,
            boxShadow: `0 0 8px ${pickColorSafe}`,
            transition: 'width 80ms linear',
          }} />
        </div>
        {/* 별점 순차 등장 */}
        <div style={{ display: 'inline-flex', gap: 3, justifyContent: 'center' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{
              fontSize: 18,
              color: i < shownStars ? '#facc15' : 'rgba(255,255,255,0.18)',
              textShadow: i < shownStars ? '0 0 10px rgba(250,204,21,0.7)' : 'none',
              transform: i < shownStars ? 'scale(1)' : 'scale(0.85)',
              transition: 'all 0.18s cubic-bezier(.2,1.4,.4,1)',
              lineHeight: 1,
            }}>★</span>
          ))}
        </div>
      </div>

      {/* 경기시각 */}
      <div style={{
        marginTop: 18, fontSize: 13, color: '#94a3b8', fontWeight: 600,
        animation: 'dc-fadeIn 0.5s 0.9s both',
      }}>
        {formatTime(game.matchTime)}
      </div>
    </div>
  )
}

function TeamCircle({ team, side }: { team: TeamMeta; side: string }) {
  const [broken, setBroken] = useState(false)
  const ab = team?.ab || team?.ko?.slice(0, 2) || '?'
  const c1 = team?.c1 || '#475569'
  const useImg = !!(team?.logo && !broken)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 86, height: 86, borderRadius: '50%',
        background: useImg ? '#ffffff' : `linear-gradient(135deg, ${c1} 0%, ${c1}cc 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: 24, color: '#fff',
        boxShadow: `0 6px 22px ${c1}66`,
        border: `3px solid ${c1}`,
        overflow: 'hidden',
        textShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }}>
        {useImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logo}
            alt={team.ko || ab}
            onError={() => setBroken(true)}
            style={{ width: '82%', height: '82%', objectFit: 'contain' }}
          />
        ) : ab}
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', textAlign: 'center' }}>
        {team?.ko || team?.en || '미정'}
      </div>
      <div style={{ fontSize: 9, color: '#94a3b8', letterSpacing: 2, fontWeight: 700 }}>{side}</div>
    </div>
  )
}

// ============================================
// CTA
// ============================================
function SceneCTA({ games, todayLabel }: { games: Game[]; todayLabel: string }) {
  const avgStars = games.length > 0 ? (games.reduce((s, g) => s + g.pick.stars, 0) / games.length).toFixed(1) : '0'
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '130px 24px 175px', textAlign: 'center', zIndex: 2,
    }}>
      <div style={{
        fontSize: 14, color: '#94a3b8', letterSpacing: 5, marginBottom: 12,
        animation: 'dc-fadeIn 0.5s 0.1s both',
      }}>
        TODAY&apos;S ANALYSIS
      </div>
      <div style={{
        fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1.25, marginBottom: 22,
        animation: 'dc-slideUp 0.5s 0.3s both',
      }}>
        {todayLabel}<br/>
        <span style={{ color: BRAND_C1 }}>{games.length}경기 데이터 분석</span>
      </div>
      <div style={{
        padding: '12px 22px',
        background: `linear-gradient(135deg, ${BRAND_C1}22 0%, ${BRAND_C2}11 100%)`,
        border: `1.5px solid ${BRAND_C1}88`,
        borderRadius: 12, marginBottom: 24,
        animation: 'dc-slideUp 0.5s 0.6s both',
      }}>
        <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 700 }}>데이터 신뢰도</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: BRAND_C1, marginTop: 4 }}>★ {avgStars} / 5.0</div>
      </div>
      <div style={{ animation: 'dc-fadeIn 0.5s 1.0s both' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="TrendSoccer" style={{ height: 28, display: 'block' }} />
      </div>
      <div style={{
        marginTop: 10, fontSize: 13, color: '#64748b', fontWeight: 600,
        animation: 'dc-fadeIn 0.5s 1.2s both',
      }}>
        AI 분석 · trendsoccer.com
      </div>
    </div>
  )
}

// 어두운 팀 컬러를 텍스트용으로 lighten
function lightenForText(hex: string): string {
  if (!hex || !hex.startsWith('#')) return '#e2e8f0'
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  const lum = 0.299*r + 0.587*g + 0.114*b
  if (lum < 80) return '#e2e8f0'
  if (lum < 140) {
    return '#' + [r,g,b].map(c => Math.min(255, Math.round(c + (255-c)*0.5)).toString(16).padStart(2,'0')).join('')
  }
  return hex
}

// 카운트업 훅 — 0에서 target까지 ease-out으로 증가
function useCountUp(target: number, duration = 1400, delayMs = 0): number {
  const [val, setVal] = useState(0)
  useEffect(() => {
    setVal(0)
    let raf: number | null = null
    let start = 0
    const delayTimer = setTimeout(() => {
      start = performance.now()
      const tick = () => {
        const elapsed = performance.now() - start
        const p = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        setVal(Math.round(target * eased))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delayMs)
    return () => {
      clearTimeout(delayTimer)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [target, duration, delayMs])
  return val
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })
  } catch { return iso }
}

// 네이버 클립용 제목(24자) + 설명(200자, 최소 10자) 자동 생성
function buildNaverClipMeta(games: Game[]): { title: string; description: string } {
  const today = new Date(Date.now() + 9 * 3600 * 1000)
  const m = today.getUTCMonth() + 1
  const d = today.getUTCDate()
  const n = games.length

  const leaguesUsed = Array.from(new Set(games.map(g => g.league)))

  const titleCandidates = [
    `${m}/${d} ${leaguesUsed.join(' ')} AI 분석 ${n}경기`,
    `${m}/${d} 야구 AI 분석 ${n}경기`,
    `${m}/${d} 야구 분석 ${n}경기`,
    `${m}/${d} AI 분석 ${n}경기`,
  ]
  const title = (titleCandidates.find(t => t.length <= 24) || titleCandidates[titleCandidates.length - 1]).slice(0, 24)

  const head = `${m}/${d} 야구 데이터 분석`
  const lines = games.map((g, i) => {
    const pct = g.pick.side === 'home' ? g.winRate.home : g.winRate.away
    return `${i + 1}) ${g.pick.team} ${pct}%`
  })

  const tags: string[] = ['#야구']
  if (leaguesUsed.includes('KBO')) tags.push('#KBO', '#프로야구')
  if (leaguesUsed.includes('NPB')) tags.push('#NPB', '#일본프로야구')
  if (leaguesUsed.includes('MLB')) tags.push('#MLB', '#메이저리그')
  tags.push('#AI분석', '#야구분석', '#스포츠분석')
  const tagStr = tags.join(' ')

  let body = head
  for (const ln of lines) {
    const candidate = body + '\n' + ln
    if ((candidate + '\n' + tagStr).length > 200) break
    body = candidate
  }
  const description = (body + '\n' + tagStr).slice(0, 200)

  return { title, description }
}
