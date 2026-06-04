// 🔥 축구 경기 결과 모달 — 종료 경기 클릭 시 (예측 모달 대신)
// 최종 스코어 + AI 예측 적중 여부 + 경기 통계(점유율·슈팅·코너·카드)
'use client'

import { useEffect, useState } from 'react'
import type { UnifiedMatch } from './types'

interface Props {
  match: UnifiedMatch | null
  onClose: () => void
}

interface TeamStats {
  team: string
  logo: string
  stats: Record<string, any>
}

const STAT_ROWS: { key: string; label: string; bar?: boolean }[] = [
  { key: 'possession', label: '점유율', bar: true },
  { key: 'totalShots', label: '슈팅' },
  { key: 'shotsOnTarget', label: '유효 슈팅' },
  { key: 'cornerKicks', label: '코너킥' },
  { key: 'fouls', label: '파울' },
  { key: 'yellowCards', label: '경고' },
]

const numVal = (v: any): number | null => {
  if (v == null || v === '-') return null
  const n = parseInt(String(v).replace('%', ''), 10)
  return isNaN(n) ? null : n
}
const dispVal = (v: any): string => (v == null || v === '-' ? '-' : String(v))

export default function FootballResultModal({ match, onClose }: Props) {
  const [stats, setStats] = useState<{ home: TeamStats; away: TeamStats } | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!match) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [match, onClose])

  useEffect(() => {
    if (!match) return
    let cancel = false
    setLoadingStats(true)
    fetch(`/api/match-statistics?fixtureId=${match.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancel) setStats(j?.statistics || null)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setLoadingStats(false)
      })
    return () => {
      cancel = true
    }
  }, [match])

  if (!match) return null

  const home = match.homeTeamKo || match.homeTeam
  const away = match.awayTeamKo || match.awayTeam
  const fh = match.homeScore
  const fa = match.awayScore
  const actualWinner = fh != null && fa != null ? (fh > fa ? 'home' : fa > fh ? 'away' : 'draw') : null
  const predicted = match.predictedWinner
  const correct = predicted && actualWinner ? predicted === actualWinner : null
  const predLabel =
    predicted === 'home' ? home : predicted === 'away' ? away : predicted === 'draw' ? '무승부' : null

  const visibleRows = STAT_ROWS.filter((row) => {
    if (!stats) return false
    const h = stats.home?.stats?.[row.key]
    const a = stats.away?.stats?.[row.key]
    return !((h == null || h === '-') && (a == null || a === '-'))
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md sm:w-full z-[101] max-h-[88vh] overflow-y-auto rounded-2xl shadow-2xl border border-gray-800"
        style={{ backgroundColor: '#252829' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 sticky top-0 z-10" style={{ backgroundColor: '#252829' }}>
          <div className="flex items-center gap-2 text-sm min-w-0">
            {match.leagueLogo && (
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center p-0.5 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={match.leagueLogo} alt="" className="max-w-full max-h-full object-contain" />
              </span>
            )}
            <span className="font-bold text-gray-200 truncate">{match.leagueName || match.league}</span>
            <span className="text-gray-500 text-xs tabular-nums shrink-0">
              {match.timestamp
                ? new Date(match.timestamp).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit' })
                : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 스코어보드 */}
        <div className="px-4 py-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center gap-2 min-w-0">
              {match.homeLogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={match.homeLogo} alt={home} className="w-12 h-12 object-contain" />
              )}
              <span className="text-sm font-semibold text-white text-center truncate w-full">{home}</span>
            </div>
            <div className="text-center px-1">
              <span className="inline-block mb-1.5 px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 text-[10px] font-bold">종료</span>
              <div className="text-4xl font-black tabular-nums text-white leading-none">
                {fh ?? '-'}<span className="text-gray-600 mx-2">:</span>{fa ?? '-'}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 min-w-0">
              {match.awayLogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={match.awayLogo} alt={away} className="w-12 h-12 object-contain" />
              )}
              <span className="text-sm font-semibold text-white text-center truncate w-full">{away}</span>
            </div>
          </div>
        </div>

        {/* AI 예측 결과 */}
        {predLabel && (
          <div className="px-4 pb-4">
            <div className="rounded-xl border border-gray-800 bg-[#1c1f20] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">AI 예측 결과</span>
                {correct != null && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${correct ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {correct ? '적중' : '실패'}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-gray-300">
                  예측 승자 <b className="text-[#A3FF4C]">{predLabel}</b>
                </span>
                {match.predictedScoreHome != null && match.predictedScoreAway != null && (
                  <span className="text-gray-400 text-xs">
                    예측 스코어 {match.predictedScoreHome} : {match.predictedScoreAway}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 경기 통계 */}
        <div className="px-4 pb-5">
          <div className="text-xs text-gray-400 mb-2">경기 통계</div>
          {loadingStats ? (
            <div className="flex justify-center py-4">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-700 border-t-emerald-400" />
            </div>
          ) : visibleRows.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">통계 정보가 없습니다</p>
          ) : (
            <div className="space-y-2.5">
              {visibleRows.map((row) => {
                const h = stats!.home?.stats?.[row.key]
                const a = stats!.away?.stats?.[row.key]
                const hn = numVal(h)
                const an = numVal(a)
                const total = (hn ?? 0) + (an ?? 0) || 1
                const homePct = row.bar && hn != null ? hn : Math.round(((hn ?? 0) / total) * 100)
                return (
                  <div key={row.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white font-medium">{dispVal(h)}</span>
                      <span className="text-gray-400">{row.label}</span>
                      <span className="text-white font-medium">{dispVal(a)}</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800">
                      <div className="bg-blue-500" style={{ width: `${homePct}%` }} />
                      <div className="bg-red-500" style={{ width: `${100 - homePct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
