'use client'

import { useState } from 'react'

type Topic = 'app_general' | 'match_events' | 'marketing'

interface Result {
  locale: 'ko' | 'en'
  topic: string
  ok: boolean
  messageId?: string
  error?: { code: string; message: string }
}

const TOPIC_OPTIONS: { value: Topic; label: string; desc: string }[] = [
  { value: 'app_general', label: '📢 app_general', desc: '전체 일반 공지' },
  { value: 'match_events', label: '⚽ match_events', desc: '경기 일반 이벤트' },
  { value: 'marketing', label: '🎁 marketing', desc: '마케팅 · 프로모션 (별도 동의자만)' },
]

export default function PushSendPanel() {
  const [topic, setTopic] = useState<Topic>('app_general')
  const [titleKo, setTitleKo] = useState('')
  const [bodyKo, setBodyKo] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [bodyEn, setBodyEn] = useState('')
  const [includeEn, setIncludeEn] = useState(false)
  const [deeplinkPath, setDeeplinkPath] = useState('')   // 옵션 — data.deeplink
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canSend =
    !!topic && !!titleKo.trim() && !!bodyKo.trim() &&
    (!includeEn || (!!titleEn.trim() && !!bodyEn.trim()))

  async function handleSend() {
    if (!canSend || loading) return
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const body: any = {
        topic,
        ko: { title: titleKo.trim(), body: bodyKo.trim() },
      }
      if (includeEn) {
        body.en = { title: titleEn.trim(), body: bodyEn.trim() }
      }
      if (deeplinkPath.trim()) {
        body.data = { deeplink: deeplinkPath.trim() }
      }

      const res = await fetch('/api/admin/push/send-topic-internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error?.message ?? `HTTP ${res.status}`)
      } else {
        setResults(data.results ?? [])
      }
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-1">🔔 토픽 푸시 발송</h2>
        <p className="text-sm text-gray-400 mb-6">
          선택한 토픽을 구독한 모든 디바이스에 푸시 발송. 영문 입력 시 ko/en 토픽 둘 다 발송.
        </p>

        {/* 토픽 선택 */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-300 mb-2">토픽</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {TOPIC_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTopic(opt.value)}
                className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                  topic === opt.value
                    ? 'bg-emerald-600/20 border-emerald-500 text-white'
                    : 'bg-gray-900/40 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 한글 */}
        <div className="mb-5 space-y-3 p-4 rounded-lg bg-gray-900/40 border border-gray-700/50">
          <div className="text-sm font-semibold text-gray-300">🇰🇷 한국어 (필수)</div>
          <input
            type="text"
            value={titleKo}
            onChange={(e) => setTitleKo(e.target.value)}
            placeholder="제목"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            maxLength={60}
          />
          <textarea
            value={bodyKo}
            onChange={(e) => setBodyKo(e.target.value)}
            placeholder="본문"
            rows={3}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            maxLength={200}
          />
          <div className="text-[10px] text-gray-500 text-right">
            {titleKo.length}/60 · {bodyKo.length}/200
          </div>
        </div>

        {/* 영문 */}
        <div className="mb-5 space-y-3 p-4 rounded-lg bg-gray-900/40 border border-gray-700/50">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeEn}
              onChange={(e) => setIncludeEn(e.target.checked)}
              className="rounded accent-emerald-500"
            />
            🇺🇸 English (옵션)
          </label>
          {includeEn && (
            <>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="Title"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                maxLength={60}
              />
              <textarea
                value={bodyEn}
                onChange={(e) => setBodyEn(e.target.value)}
                placeholder="Body"
                rows={3}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                maxLength={200}
              />
              <div className="text-[10px] text-gray-500 text-right">
                {titleEn.length}/60 · {bodyEn.length}/200
              </div>
            </>
          )}
        </div>

        {/* 딥링크 (옵션) */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            딥링크 경로 (옵션)
          </label>
          <input
            type="text"
            value={deeplinkPath}
            onChange={(e) => setDeeplinkPath(e.target.value)}
            placeholder="/premium 또는 https://..."
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
          <p className="text-[10px] text-gray-500 mt-1">
            data.deeplink로 전달. 앱에서 알림 탭 시 해당 경로로 이동.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend || loading}
          className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${
            !canSend || loading
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
          }`}
        >
          {loading ? '발송 중...' : '🚀 푸시 발송'}
        </button>

        {/* 결과 */}
        {error && (
          <div className="mt-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            ❌ {error}
          </div>
        )}
        {results && (
          <div className="mt-5 space-y-2">
            {results.map((r) => (
              <div
                key={r.topic}
                className={`p-3 rounded-lg border text-sm ${
                  r.ok
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {r.ok ? '✅' : '❌'} {r.topic}
                  </span>
                  <span className="text-xs opacity-70">{r.locale}</span>
                </div>
                {r.messageId && (
                  <div className="text-[10px] text-gray-400 mt-1 font-mono break-all">
                    {r.messageId}
                  </div>
                )}
                {r.error && (
                  <div className="text-xs mt-1">
                    {r.error.code}: {r.error.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
