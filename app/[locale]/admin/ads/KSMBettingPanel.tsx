'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

interface Bet {
  id?: number
  bet_pick?: string | null
  stake?: number | null
  bet_odds?: number | null
  status?: string | null
  actual_result?: string | null
}
interface Match {
  match_id: number
  date: string
  status: string
  finished: boolean
  round: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  pattern: string | null
  pred: { home: number; draw: number; away: number } | null
  confidence: string | null
  recommendation: string | null
  home_odds: number | null
  draw_odds: number | null
  away_odds: number | null
  bet: Bet | null
}
type EditRow = { pick: string; stake: string; odds: string }

const PICK_LABEL: Record<string, string> = { home: '홈승', draw: '무', away: '원정승' }
const roundNum = (r: string) => parseInt(r.match(/\d+/)?.[0] || '0', 10)
const LEAGUES = [
  { code: 'PL', name: '프리미어리그' },
  { code: 'BL1', name: '분데스리가' },
  { code: 'PD', name: '라리가' },
  { code: 'FL1', name: '리그1' },
]

export default function KSMBettingPanel() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [edit, setEdit] = useState<Record<number, EditRow>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [round, setRound] = useState<string>('')
  const [league, setLeague] = useState('PL')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/admin/ksm?type=matches&league=${league}`, { cache: 'no-store' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || '불러오기 실패')
      const ms: Match[] = data.matches
      setMatches(ms)
      const e: Record<number, EditRow> = {}
      for (const m of ms) e[m.match_id] = {
        pick: m.bet?.bet_pick || '',
        stake: m.bet?.stake != null ? String(m.bet.stake) : '',
        odds: m.bet?.bet_odds != null ? String(m.bet.bet_odds) : '',
      }
      setEdit(e)
      // 기본 라운드 = 아직 안 끝난 첫 경기의 라운드 (없으면 마지막 라운드)
      const byDate = [...ms].sort((a, b) => a.date.localeCompare(b.date))
      const next = byDate.find((m) => !m.finished)
      const rounds = Array.from(new Set(ms.map((m) => m.round))).sort((a, b) => roundNum(a) - roundNum(b))
      setRound((r) => r || next?.round || rounds[rounds.length - 1] || '')
    } catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }, [league])
  useEffect(() => { load() }, [load])

  const rounds = useMemo(
    () => Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => roundNum(a) - roundNum(b)),
    [matches]
  )
  const rows = useMemo(
    () => matches.filter((m) => m.round === round).sort((a, b) => a.date.localeCompare(b.date)),
    [matches, round]
  )

  async function save(m: Match) {
    const e = edit[m.match_id]
    if (!e?.pick) { alert('베팅(홈/무/원정)을 선택하세요'); return }
    setSavingId(m.match_id)
    try {
      const res = await fetch('/api/admin/ksm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: m.match_id, league, match_date: m.date, home_team: m.home_team, away_team: m.away_team,
          pattern: m.pattern, home_prob: m.pred?.home, draw_prob: m.pred?.draw, away_prob: m.pred?.away,
          recommendation: m.recommendation, bet_pick: e.pick,
          stake: e.stake ? Number(e.stake) : null, bet_odds: e.odds ? Number(e.odds) : null,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setMatches((prev) => prev.map((x) => (x.match_id === m.match_id ? { ...x, bet: data.bet } : x)))
    } catch (err: any) { alert('저장 실패: ' + err.message) } finally { setSavingId(null) }
  }

  // 베팅 선택 시 해당 배당 자동 채움
  function pickChange(m: Match, pick: string) {
    setEdit((p) => {
      const cur = p[m.match_id] || { pick: '', stake: '', odds: '' }
      const auto = pick === 'home' ? m.home_odds : pick === 'draw' ? m.draw_odds : pick === 'away' ? m.away_odds : null
      return { ...p, [m.match_id]: { ...cur, pick, odds: cur.odds || (auto != null ? String(auto) : '') } }
    })
  }

  const pct = (v: number | null | undefined) => (v == null ? '-' : `${(v * 100).toFixed(0)}%`)
  const od = (v: number | null | undefined) => (v == null ? '-' : v.toFixed(2))
  const maxKey = (m: Match) => {
    if (!m.pred) return ''
    const { home, draw, away } = m.pred
    const mx = Math.max(home, draw, away)
    return mx === home ? 'home' : mx === away ? 'away' : 'draw'
  }
  const fmtDate = (d: string) => new Date(d).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' })
  const profit = (b?: Bet | null) => {
    if (!b || !b.stake) return null
    if (b.status === 'win') return b.bet_odds ? b.stake * (b.bet_odds - 1) : 0
    if (b.status === 'lose') return -b.stake
    return null
  }

  // 요약 (전체 기준)
  const allBets = matches.filter((m) => m.bet)
  const settled = allBets.filter((m) => m.bet?.status === 'win' || m.bet?.status === 'lose')
  const wins = settled.filter((m) => m.bet?.status === 'win').length
  const pendingCnt = allBets.filter((m) => m.bet?.status === 'pending').length
  const hitRate = settled.length ? Math.round((wins / settled.length) * 100) : null
  const totalPL = allBets.reduce((s, m) => s + (profit(m.bet) || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white text-lg font-bold">🎯 KSM 베팅 관리</h2>
          <p className="text-gray-400 text-xs mt-1">라운드별 예측(3방법+패턴) · 배당 · 베팅 기록 · 결과/손익 자동 판정</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-3 text-xs items-center">
            <span className="text-gray-400">베팅 <b className="text-white">{allBets.length}</b></span>
            <span className="text-emerald-400">당첨 <b>{wins}</b></span>
            <span className="text-red-400">낙첨 <b>{settled.length - wins}</b></span>
            <span className="text-yellow-400">대기 <b>{pendingCnt}</b></span>
            <span className="text-gray-300">적중률 <b>{hitRate == null ? '-' : hitRate + '%'}</b></span>
            <span className={totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}>손익 <b>{totalPL >= 0 ? '+' : ''}{totalPL.toFixed(1)}</b></span>
          </div>
          <button onClick={load} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded-lg">🔄 새로고침</button>
        </div>
      </div>

      {/* 리그 > 라운드 선택 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">리그</span>
        <select value={league} onChange={(e) => { setLeague(e.target.value); setRound('') }}
          className="bg-gray-800 text-white px-3 py-1.5 rounded-lg border border-gray-700 font-semibold">
          {LEAGUES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        <span className="text-gray-500">›</span>
        <select value={round} onChange={(e) => setRound(e.target.value)}
          className="bg-gray-800 text-white px-3 py-1.5 rounded-lg border border-gray-700">
          {rounds.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-500/10 text-red-400 text-sm px-4 py-2 rounded-lg">{error}</div>}
      {loading && <div className="text-gray-400 text-sm py-6 text-center">불러오는 중…</div>}

      {!loading && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm text-gray-200 whitespace-nowrap">
            <thead>
              <tr className="bg-gray-800 text-gray-400 text-xs">
                <th className="px-3 py-2 text-left">경기</th>
                <th className="px-2 py-2">패턴</th>
                <th className="px-2 py-2">예상(홈/무/원정)</th>
                <th className="px-2 py-2">시장배당</th>
                <th className="px-2 py-2">추천</th>
                <th className="px-2 py-2">베팅</th>
                <th className="px-2 py-2">스테이크</th>
                <th className="px-2 py-2">배당</th>
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2">결과</th>
                <th className="px-2 py-2">당첨</th>
                <th className="px-2 py-2">손익</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const mk = maxKey(m)
                const e = edit[m.match_id] || { pick: '', stake: '', odds: '' }
                const st = m.bet?.status
                const pl = profit(m.bet)
                return (
                  <tr key={m.match_id} className="border-t border-gray-800 hover:bg-gray-800/40">
                    <td className="px-3 py-2">
                      <div className="font-medium">{m.home_team} <span className="text-gray-500">vs</span> {m.away_team}</div>
                      <div className="text-gray-500 text-xs">
                        {fmtDate(m.date)}
                        {m.finished && m.home_score != null && <span className="ml-2 text-gray-300">({m.home_score}-{m.away_score})</span>}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      {m.pattern ? <span className="bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded font-bold">{m.pattern}</span> : <span className="text-gray-600">-</span>}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-xs">
                      {m.pred ? (
                        <span>
                          <b className={mk === 'home' ? 'text-emerald-400' : 'text-gray-300'}>{pct(m.pred.home)}</b>
                          <span className="text-gray-600"> / </span>
                          <b className={mk === 'draw' ? 'text-yellow-400' : 'text-gray-300'}>{pct(m.pred.draw)}</b>
                          <span className="text-gray-600"> / </span>
                          <b className={mk === 'away' ? 'text-red-400' : 'text-gray-300'}>{pct(m.pred.away)}</b>
                        </span>
                      ) : <span className="text-gray-600">-</span>}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-xs text-gray-300">
                      {m.home_odds != null ? `${od(m.home_odds)}/${od(m.draw_odds)}/${od(m.away_odds)}` : <span className="text-gray-600">미제공</span>}
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-gray-300 max-w-[130px] truncate">{m.recommendation || '-'}</td>
                    <td className="px-2 py-2 text-center">
                      <select value={e.pick} onChange={(ev) => pickChange(m, ev.target.value)}
                        className="bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600">
                        <option value="">-</option>
                        <option value="home">홈승</option>
                        <option value="draw">무</option>
                        <option value="away">원정승</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input type="number" value={e.stake} placeholder="0"
                        onChange={(ev) => setEdit((p) => ({ ...p, [m.match_id]: { ...e, stake: ev.target.value } }))}
                        className="bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 w-16 text-right" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input type="number" step="0.01" value={e.odds} placeholder="1.00"
                        onChange={(ev) => setEdit((p) => ({ ...p, [m.match_id]: { ...e, odds: ev.target.value } }))}
                        className="bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 w-16 text-right" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => save(m)} disabled={savingId === m.match_id}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-3 py-1 rounded">
                        {savingId === m.match_id ? '…' : '저장'}</button>
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
                    <td className="px-2 py-2 text-center text-xs font-mono">
                      {pl == null ? <span className="text-gray-600">-</span> :
                        <b className={pl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{pl >= 0 ? '+' : ''}{pl.toFixed(1)}</b>}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={12} className="text-center text-gray-500 py-8">해당 라운드 경기가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-gray-500 text-xs">
        · 예상 확률: KSM 3방법 재보정(다시즌+절대실력, 승격팀 환산) · 시장배당: 수집된 평균 배당 자동 표시(베팅 선택 시 배당칸 자동 채움, 수정 가능) · 결과·손익은 경기 종료 후 자동 판정
      </p>
    </div>
  )
}
