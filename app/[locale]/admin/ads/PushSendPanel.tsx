'use client'

import { useState, useEffect, useCallback } from 'react'
import { PUSH_TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/pushTemplates'

type Topic = 'app_general' | 'match_events' | 'marketing'
type Mode = 'now' | 'once' | 'daily' | 'weekly'

interface Result {
  locale: 'ko' | 'en'
  topic: string
  ok: boolean
  messageId?: string
  error?: { code: string; message: string }
}

interface Scheduled {
  id: number
  topic: string
  ko_title: string
  ko_body: string
  deeplink: string | null
  schedule_type: 'once' | 'daily' | 'weekly'
  scheduled_at: string | null
  run_hour: number | null
  run_minute: number | null
  weekday: number | null
  status: string
  last_run_at: string | null
  created_at: string
}

const TOPIC_OPTIONS: { value: Topic; label: string; desc: string }[] = [
  { value: 'app_general', label: '📢 app_general', desc: '전체 일반 공지' },
  { value: 'match_events', label: '⚽ match_events', desc: '경기 일반 이벤트' },
  { value: 'marketing', label: '🎁 marketing', desc: '마케팅 · 프로모션 (별도 동의자만)' },
]
const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'now', label: '즉시 발송' },
  { value: 'once', label: '예약 (일회성)' },
  { value: 'daily', label: '반복 (매일)' },
  { value: 'weekly', label: '반복 (매주)' },
]
const DOW = ['일', '월', '화', '수', '목', '금', '토']
const inputCls =
  'w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500'

export default function PushSendPanel() {
  const [topic, setTopic] = useState<Topic>('app_general')
  const [titleKo, setTitleKo] = useState('')
  const [bodyKo, setBodyKo] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [bodyEn, setBodyEn] = useState('')
  const [includeEn, setIncludeEn] = useState(false)
  const [deeplinkPath, setDeeplinkPath] = useState('')

  const [mode, setMode] = useState<Mode>('now')
  const [onceAt, setOnceAt] = useState('')       // datetime-local (KST 브라우저 기준)
  const [runTime, setRunTime] = useState('09:00') // HH:MM (KST)
  const [weekday, setWeekday] = useState(1)        // 0=일 .. 6=토

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null)

  const [list, setList] = useState<Scheduled[]>([])

  const applyTemplate = (id: string) => {
    const t = PUSH_TEMPLATES.find((x) => x.id === id)
    if (!t) return
    setTopic(t.topic)
    setTitleKo(t.ko.title); setBodyKo(t.ko.body)
    if (t.en) { setIncludeEn(true); setTitleEn(t.en.title); setBodyEn(t.en.body) }
    setDeeplinkPath(t.deeplink || '')
    setResults(null); setError(null); setScheduleMsg(null)
  }

  const loadList = useCallback(() => {
    fetch('/api/admin/push/schedule')
      .then((r) => r.json())
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])
  useEffect(() => { loadList() }, [loadList])

  const baseValid =
    !!topic && !!titleKo.trim() && !!bodyKo.trim() &&
    (!includeEn || (!!titleEn.trim() && !!bodyEn.trim()))
  const timingValid =
    mode === 'now' ? true :
    mode === 'once' ? !!onceAt :
    /^\d{2}:\d{2}$/.test(runTime)
  const canSubmit = baseValid && timingValid && !loading

  function buildContent() {
    const b: any = { topic, ko: { title: titleKo.trim(), body: bodyKo.trim() } }
    if (includeEn) b.en = { title: titleEn.trim(), body: bodyEn.trim() }
    if (deeplinkPath.trim()) b.deeplink = deeplinkPath.trim()
    return b
  }

  async function handleSendNow() {
    setLoading(true); setError(null); setResults(null); setScheduleMsg(null)
    try {
      const c = buildContent()
      const body: any = { topic: c.topic, ko: c.ko }
      if (c.en) body.en = c.en
      if (c.deeplink) body.data = { deeplink: c.deeplink }
      const res = await fetch('/api/admin/push/send-topic-internal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) setError(data?.error?.message ?? `HTTP ${res.status}`)
      else setResults(data.results ?? [])
    } catch (e: any) { setError(e?.message ?? String(e)) }
    finally { setLoading(false) }
  }

  async function handleSchedule() {
    setLoading(true); setError(null); setResults(null); setScheduleMsg(null)
    try {
      const payload: any = { ...buildContent(), scheduleType: mode }
      if (mode === 'once') payload.scheduledAt = new Date(onceAt).toISOString()
      else {
        const [h, m] = runTime.split(':').map(Number)
        payload.runHour = h; payload.runMinute = m
        if (mode === 'weekly') payload.weekday = weekday
      }
      const res = await fetch('/api/admin/push/schedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) setError(data?.error ?? `HTTP ${res.status}`)
      else { setScheduleMsg('✅ 예약이 등록되었습니다.'); loadList() }
    } catch (e: any) { setError(e?.message ?? String(e)) }
    finally { setLoading(false) }
  }

  async function cancelSchedule(id: number) {
    await fetch(`/api/admin/push/schedule?id=${id}`, { method: 'DELETE' }).catch(() => {})
    loadList()
  }

  const submit = () => (mode === 'now' ? handleSendNow() : handleSchedule())

  const scheduleLabel = (s: Scheduled) => {
    if (s.schedule_type === 'once')
      return s.scheduled_at ? new Date(s.scheduled_at).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }) : '-'
    const t = `${String(s.run_hour ?? 0).padStart(2, '0')}:${String(s.run_minute ?? 0).padStart(2, '0')}`
    return s.schedule_type === 'daily' ? `매일 ${t}` : `매주 ${DOW[s.weekday ?? 0]} ${t}`
  }
  const statusChip = (st: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      sent: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      failed: 'bg-red-500/15 text-red-300 border-red-500/30',
      canceled: 'bg-gray-600/20 text-gray-400 border-gray-600/40',
    }
    const kr: Record<string, string> = { pending: '대기', active: '반복중', sent: '발송됨', failed: '실패', canceled: '취소' }
    return <span className={`px-2 py-0.5 rounded-full text-[10px] border ${map[st] || map.canceled}`}>{kr[st] || st}</span>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-1">🔔 토픽 푸시 발송</h2>
        <p className="text-sm text-gray-400 mb-5">
          선택한 토픽을 구독한 모든 디바이스에 푸시 발송. 영문 입력 시 ko/en 토픽 둘 다 발송.
        </p>

        {/* 템플릿 프리셋 (카테고리별) */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-300 mb-2">템플릿 <span className="text-gray-500 font-normal">· 클릭 시 자동 입력 · 마우스오버 시 추천 타이밍</span></label>
          <div className="space-y-3">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <div key={cat}>
                <div className="text-[11px] font-semibold text-gray-500 mb-1.5">{cat}</div>
                <div className="flex flex-wrap gap-2">
                  {PUSH_TEMPLATES.filter((t) => t.category === cat).map((t) => (
                    <button key={t.id} type="button" onClick={() => applyTemplate(t.id)}
                      title={t.timing || ''}
                      className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900/40 text-gray-300 text-xs hover:border-emerald-500 hover:text-white transition-colors">
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 토픽 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-300 mb-2">토픽</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {TOPIC_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => setTopic(opt.value)}
                className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                  topic === opt.value ? 'bg-emerald-600/20 border-emerald-500 text-white' : 'bg-gray-900/40 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}>
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 한글 */}
        <div className="mb-5 space-y-3 p-4 rounded-lg bg-gray-900/40 border border-gray-700/50">
          <div className="text-sm font-semibold text-gray-300">🇰🇷 한국어 (필수)</div>
          <input type="text" value={titleKo} onChange={(e) => setTitleKo(e.target.value)} placeholder="제목" className={inputCls} maxLength={60} />
          <textarea value={bodyKo} onChange={(e) => setBodyKo(e.target.value)} placeholder="본문" rows={3} className={inputCls} maxLength={200} />
          <div className="text-[10px] text-gray-500 text-right">{titleKo.length}/60 · {bodyKo.length}/200</div>
        </div>

        {/* 영문 */}
        <div className="mb-5 space-y-3 p-4 rounded-lg bg-gray-900/40 border border-gray-700/50">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 cursor-pointer">
            <input type="checkbox" checked={includeEn} onChange={(e) => setIncludeEn(e.target.checked)} className="rounded accent-emerald-500" />
            🇺🇸 English (옵션)
          </label>
          {includeEn && (
            <>
              <input type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Title" className={inputCls} maxLength={60} />
              <textarea value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} placeholder="Body" rows={3} className={inputCls} maxLength={200} />
              <div className="text-[10px] text-gray-500 text-right">{titleEn.length}/60 · {bodyEn.length}/200</div>
            </>
          )}
        </div>

        {/* 딥링크 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-300 mb-1">딥링크 경로 (옵션)</label>
          <input type="text" value={deeplinkPath} onChange={(e) => setDeeplinkPath(e.target.value)} placeholder="/premium 또는 https://..." className={inputCls} />
          <p className="text-[10px] text-gray-500 mt-1">data.deeplink로 전달. 앱에서 알림 탭 시 해당 경로로 이동.</p>
        </div>

        {/* 발송 방식 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-300 mb-2">발송 방식</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {MODE_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => setMode(opt.value)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  mode === opt.value ? 'bg-emerald-600/20 border-emerald-500 text-white' : 'bg-gray-900/40 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          {mode === 'once' && (
            <input type="datetime-local" value={onceAt} onChange={(e) => setOnceAt(e.target.value)} className={inputCls} />
          )}
          {(mode === 'daily' || mode === 'weekly') && (
            <div className="flex flex-wrap items-center gap-2">
              {mode === 'weekly' && (
                <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}
                  className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:border-emerald-500">
                  {DOW.map((d, i) => <option key={i} value={i}>{d}요일</option>)}
                </select>
              )}
              <input type="time" value={runTime} onChange={(e) => setRunTime(e.target.value)}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:border-emerald-500" />
              <span className="text-xs text-gray-500">KST 기준 · 매{mode === 'weekly' ? `주 ${DOW[weekday]}요일` : '일'} 발송</span>
            </div>
          )}
        </div>

        <button type="button" onClick={submit} disabled={!canSubmit}
          className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${
            !canSubmit ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-500'
          }`}>
          {loading ? '처리 중...' : mode === 'now' ? '🚀 즉시 발송' : '📅 예약 등록'}
        </button>

        {error && <div className="mt-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">❌ {error}</div>}
        {scheduleMsg && <div className="mt-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">{scheduleMsg}</div>}
        {results && (
          <div className="mt-5 space-y-2">
            {results.map((r) => (
              <div key={r.topic} className={`p-3 rounded-lg border text-sm ${r.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.ok ? '✅' : '❌'} {r.topic}</span>
                  <span className="text-xs opacity-70">{r.locale}</span>
                </div>
                {r.error && <div className="text-xs mt-1">{r.error.code}: {r.error.message}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 예약 목록 */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">📅 예약 목록</h2>
          <button onClick={loadList} className="text-xs text-gray-400 hover:text-white">새로고침</button>
        </div>
        {list.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-6">예약된 푸시가 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {list.map((s) => (
              <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/40 border border-gray-700/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusChip(s.status)}
                    <span className="text-xs text-gray-400">{s.topic}</span>
                    <span className="text-xs text-emerald-400 font-medium">{scheduleLabel(s)}</span>
                  </div>
                  <div className="text-sm text-white font-medium mt-1 truncate">{s.ko_title}</div>
                  <div className="text-xs text-gray-500 truncate">{s.ko_body}</div>
                </div>
                {(s.status === 'pending' || s.status === 'active') && (
                  <button onClick={() => cancelSchedule(s.id)}
                    className="flex-shrink-0 px-2.5 py-1 rounded-md border border-red-500/40 text-red-400 text-xs hover:bg-red-500/10">
                    취소
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
