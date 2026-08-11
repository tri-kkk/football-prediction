'use client'

import { useState, useEffect, useCallback } from 'react'

interface Bet {
  id?: number
  bet_pick?: string | null
  stake?: number | null
  status?: string | null
  actual_result?: string | null
  memo?: string | null
}
interface Match {
  match_id: number
  date: string
  status: string
  round: string
  home_team: string
  away_team: string
  home_logo?: string
  away_logo?: string
  pattern: string | null
  pred: { home: number; draw: number; away: number } | null
  confidence: string | null
  pat_home_rate: number | null
  pat_draw_rate: number | null
  pat_away_rate: number | null
  recommendation: string | null
  bet: Bet | null
}

const PICK_LABEL: Record<string, string> = { home: '홈승', draw: '무', away: '원정승' }

export default function KSMBettingPanel() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [edit, setEdit] = useState<Record<number, { pick: string; stake: string }>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/ksm?type=matches', { cache: 'no-store' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || '불러오기 실패')
      setMatches(data.matches)
      const e: Record<number, { pick: string; stake: string }> = {}
      for (const m of data.matches) {
        e[m.match_id] = { pick: m.bet?.bet_pick || '', stake: m.bet?.stake != null ? String(m.bet.stake) : '' }
      }
      setEdit(e)
    } catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function save(m: Match) {
    const e = edit[m.match_id]
    if (!e?.pick) { alert('베팅(홈/무/원정)을 선택하세요'); return }
    setSavingId(m.match_id)
    try {
      const res = await fetch('/api/admin/ksm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: m.match_id, match_date: m.date, home_team: m.home_team, away_team: m.away_team,
          pattern: m.pattern, home_prob: m.pred?.home, draw_prob: m.pred?.draw, away_prob: m.pred?.away,
          recommendation: m.recommendation, bet_pick: e.pick, stake: e.stake ? Number(e.stake) : null,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setMatches((prev) => prev.map((x) => (x.match_id === m.match_id ? { ...x, bet: data.bet } : x)))
    } catch (err: any) { alert('저장 실패: ' + err.message) } finally { setSavingId(null) }
  }

  const pct = (v: number | null | undefined) => (v == null ? '-' : `${(v * 100).toFixed(0)}%`)
  const maxKey = (m: Match) => {
    if (!m.pred) return ''
    const { home, draw, away } = m.pred
    const mx = Math.max(home, draw, away)
    return mx === home ? 'home' : mx === away ? 'away' : 'draw'
  }
  const fmtDate = (d: string) => new Date(d).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' })

  // 요약
  const settled = matches.filter((m) => m.bet?.status === 'win' || m.bet?.status === 'lose')
  const wins = settled.filter((m) => m.bet?.status === 'win').length
  const pending = matches.filter((m) => m.bet && m.bet.status === 'pending').length
  const hitRate = settled.length ? Math.round((wins / settled.length) * 100) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white text-lg font-bold">🎯 KSM 베팅 관리</h2>
          <p className="text-gray-400 text-xs mt-1">다가오는 PL 경기 예측(3방법+패턴) · 베팅 기록 · 결과 자동 판정</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-xs">
            <span className="text-gray-400">베팅 <b className="text-white">{matches.filter(m=>m.bet).length}</b></span>
            <span className="text-emerald-400">당첨 <b>{wins}</b></span>
            <span className="text-red-400">낙첨 <b>{settled.length - wins}</b></span>
            <span className="text-yellow-400">대기 <b>{pending}</b></span>
            <span className="text-gray-300">적중률 <b>{hitRate == null ? '-' : hitRate + '%'}</b></span>
          </div>
          <button onClick={load} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded-lg">🔄 새로고침</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 text-red-400 text-sm px-4 py-2 rounded-lg">{error}</div>}
      {loading && <div className="text-gray-400 text-sm py-6 text-center">불러오는 중…</div>}

      {!loading && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm text-gray-200">
            <thead>
              <tr className="bg-gray-800 text-gray-400 text-xs">
                <th className="px-3 py-2 text-left">경기</th>
                <th className="px-2 py-2">패턴</th>
                <th className="px-2 py-2">예상 확률 (홈/무/원정)</th>
                <th className="px-2 py-2">추천</th>
                <th className="px-2 py-2">베팅</th>
                <th className="px-2 py-2">스테이크</th>
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2">결과</th>
                <th className="px-2 py-2">당첨</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => {
                const mk = maxKey(m)
                const e = edit[m.match_id] || { pick: '', stake: '' }
                const st = m.bet?.status
                return (
                  <tr key={m.match_id} className="border-t border-gray-800 hover:bg-gray-800/40">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="font-medium">{m.home_team} <span className="text-gray-500">vs</span> {m.away_team}</div>
                      <div className="text-gray-500 text-xs">{fmtDate(m.date)} · {m.round}</div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      {m.pattern ? <span className="bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded font-bold">{m.pattern}</span> : <span className="text-gray-600">-</span>}
                    </td>
                    <td className="px-2 py-2 text-center whitespace-nowrap">
                      {m.pred ? (
                        <span className="font-mono">
                          <b className={mk === 'home' ? 'text-emerald-400' : 'text-gray-300'}>{pct(m.pred.home)}</b>
                          <span className="text-gray-600"> / </span>
                          <b className={mk === 'draw' ? 'text-yellow-400' : 'text-gray-300'}>{pct(m.pred.draw)}</b>
                          <span className="text-gray-600"> / </span>
                          <b className={mk === 'away' ? 'text-red-400' : 'text-gray-300'}>{pct(m.pred.away)}</b>
                        </span>
                      ) : <span className="text-gray-600 text-xs">데이터 없음</span>}
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-gray-300 max-w-[140px] truncate">{m.recommendation || '-'}</td>
                    <td className="px-2 py-2 text-center">
                      <select
                        value={e.pick}
                        onChange={(ev) => setEdit((p) => ({ ...p, [m.match_id]: { ...e, pick: ev.target.value } }))}
                        className="bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600"
                      >
                        <option value="">-</option>
                        <option value="home">홈승</option>
                        <option value="draw">무</option>
                        <option value="away">원정승</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="number" value={e.stake} placeholder="0"
                        onChange={(ev) => setEdit((p) => ({ ...p, [m.match_id]: { ...e, stake: ev.target.value } }))}
                        className="bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 w-20 text-right"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => save(m)} disabled={savingId === m.match_id}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-3 py-1 rounded"
                      >{savingId === m.match_id ? '…' : '저장'}</button>
                    </td>
                    <td className="px-2 py-2 text-center text-xs">
                      {m.bet?.actual_result ? <span className="text-gray-300">{PICK_LABEL[m.bet.actual_result]}</span> : <span className="text-gray-600">-</span>}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {st === 'win' && <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold">당첨</span>}
                      {st === 'lose' && <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold">낙첨</span>}
                      {st === 'pending' && <span className="bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded text-xs">대기</span>}
                      {!st && <span className="text-gray-600 text-xs">-</span>}
                    </td>
                  </tr>
                )
              })}
              {matches.length === 0 && (
                <tr><td colSpan={9} className="text-center text-gray-500 py-8">다가오는 경기가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-gray-500 text-xs">
        · 예상 확률: KSM 3방법 재보정 모델(다시즌+절대실력 반영, 승격팀 2부→1부 환산) · 결과는 경기 종료 후 자동 판정(대기→당첨/낙첨)
      </p>
    </div>
  )
}
