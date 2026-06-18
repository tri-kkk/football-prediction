'use client'

import { useState } from 'react'

interface UserRow {
  id: string
  email: string
  name: string | null
  tier?: string
  premium_expires_at?: string | null
  created_at?: string
  last_login_at?: string | null
  trial_used?: boolean
  promo_code?: string | null
}

interface PendingRow {
  id: string
  email: string
  name: string | null
  created_at?: string
  expires_at?: string
}

export default function UserDeletePanel() {
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [pending, setPending] = useState<PendingRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [removeDeletedHash, setRemoveDeletedHash] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function handleSearch() {
    if (q.trim().length < 2) {
      setSearchError('2자 이상 입력해주세요')
      return
    }
    setSearching(true)
    setSearchError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/admin/users/search-internal?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        setSearchError(data?.error ?? `HTTP ${res.status}`)
        setUsers([])
        setPending([])
      } else {
        setUsers(data.users ?? [])
        setPending(data.pending ?? [])
        setSelectedIds(new Set())
        setSelectedEmails(new Set())
      }
    } catch (e: any) {
      setSearchError(e?.message ?? String(e))
    } finally {
      setSearching(false)
    }
  }

  function toggleId(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }
  function toggleEmail(email: string) {
    const next = new Set(selectedEmails)
    if (next.has(email)) next.delete(email)
    else next.add(email)
    setSelectedEmails(next)
  }

  async function handleDelete() {
    const ids = Array.from(selectedIds)
    const emails = Array.from(selectedEmails)
    if (ids.length === 0 && emails.length === 0) {
      alert('삭제할 회원을 선택해주세요')
      return
    }
    const confirmMsg = `${ids.length}명의 회원${emails.length > 0 ? ` + ${emails.length}건 추가 이메일` : ''}을 완전 삭제합니다.\n\n` +
      `${removeDeletedHash ? '✅ deleted_users 해시 제거 (재가입 즉시 가능)' : '❌ deleted_users 유지 (재가입 차단 유지)'}\n\n진행할까요?`
    if (!confirm(confirmMsg)) return
    setDeleting(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/users/delete-permanent-internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: ids, emails, removeDeletedHash }),
      })
      const data = await res.json()
      setResult(data)
      if (data.success) {
        // 삭제된 행 화면에서 제거
        setUsers((prev) => prev.filter((u) => !ids.includes(u.id)))
        setSelectedIds(new Set())
        setSelectedEmails(new Set())
      }
    } catch (e: any) {
      setResult({ success: false, error: e?.message ?? String(e) })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-1">🗑️ 회원 완전 삭제 (테스트용)</h2>
        <p className="text-sm text-gray-400 mb-6">
          users 테이블 + FK 자식 테이블(payments/subscriptions/proto_slips/device_tokens/match_notifications/referral_history 등) 일괄 삭제. 옵션으로 deleted_users 해시까지 제거하면 재가입 즉시 가능.
        </p>

        {/* 검색 */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이메일 또는 이름으로 검색 (2자 이상)"
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || q.trim().length < 2}
            className={`px-5 py-2 rounded-md font-bold text-sm transition-colors ${
              searching || q.trim().length < 2
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {searching ? '검색 중...' : '🔍 검색'}
          </button>
        </div>

        {searchError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            ❌ {searchError}
          </div>
        )}

        {/* users 결과 */}
        {users.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-300">회원 ({users.length}건)</h3>
              <button
                type="button"
                onClick={() => {
                  if (selectedIds.size === users.length) setSelectedIds(new Set())
                  else setSelectedIds(new Set(users.map((u) => u.id)))
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                {selectedIds.size === users.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
            <div className="space-y-2">
              {users.map((u) => (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedIds.has(u.id)
                      ? 'bg-red-500/10 border-red-500/40'
                      : 'bg-gray-900/40 border-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(u.id)}
                    onChange={() => toggleId(u.id)}
                    className="rounded accent-red-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-white truncate">{u.email}</span>
                      {u.tier && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          u.tier === 'premium' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-600/30 text-gray-400'
                        }`}>{u.tier}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {u.name && <span className="mr-2">👤 {u.name}</span>}
                      {u.created_at && <span className="mr-2">가입 {u.created_at.slice(0, 10)}</span>}
                      {u.last_login_at && <span>최근 {u.last_login_at.slice(0, 10)}</span>}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-0.5 font-mono">{u.id}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* pending_users */}
        {pending.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              약관 미동의 사용자 ({pending.length}건) — 이메일로만 삭제
            </h3>
            <div className="space-y-2">
              {pending.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                    selectedEmails.has(p.email)
                      ? 'bg-red-500/10 border-red-500/40'
                      : 'bg-gray-900/40 border-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedEmails.has(p.email)}
                    onChange={() => toggleEmail(p.email)}
                    className="rounded accent-red-500"
                  />
                  <div className="flex-1 min-w-0 text-sm">
                    <span className="text-white font-bold">{p.email}</span>
                    {p.name && <span className="ml-2 text-gray-400">{p.name}</span>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {users.length === 0 && pending.length === 0 && !searching && q.length >= 2 && !searchError && (
          <p className="text-center text-sm text-gray-500 py-6">검색 결과 없음</p>
        )}

        {/* 옵션 + 삭제 버튼 */}
        {(selectedIds.size > 0 || selectedEmails.size > 0) && (
          <div className="mt-6 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={removeDeletedHash}
                onChange={(e) => setRemoveDeletedHash(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              ✅ deleted_users 해시 제거 (재가입 즉시 가능 — 테스트용 권장)
            </label>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${
                deleting
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-500'
              }`}
            >
              {deleting ? '삭제 중...' : `🗑️ 완전 삭제 (${selectedIds.size}명${selectedEmails.size > 0 ? ` + ${selectedEmails.size} 이메일` : ''})`}
            </button>
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div
            className={`mt-5 p-3 rounded-lg text-sm ${
              result.success
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            {result.success ? (
              <>
                <div className="font-bold mb-2">✅ 삭제 완료</div>
                {result.summary && (
                  <pre className="text-[11px] text-emerald-200/80 whitespace-pre-wrap font-mono">
                    {JSON.stringify(result.summary.deleted, null, 2)}
                  </pre>
                )}
              </>
            ) : (
              <>❌ {result.error ?? '실패'}</>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
