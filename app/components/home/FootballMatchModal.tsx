// 🔥 축구 매치 콤팩트 분석 모달 — 클릭 시 핵심만 보여줌
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import type { UnifiedMatch } from './types'

interface Props {
  match: UnifiedMatch | null
  onClose: () => void
}

export default function FootballMatchModal({ match, onClose }: Props) {
  // ESC 키로 닫기
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

  if (!match) return null

  const home = match.homeTeamKo || match.homeTeam
  const away = match.awayTeamKo || match.awayTeam
  const homeProb = Math.round((match.odds?.homeWinProb ?? 0) * 100)
  const drawProb = Math.round((match.odds?.drawProb ?? 0) * 100)
  const awayProb = Math.round((match.odds?.awayWinProb ?? 0) * 100)
  const total = Math.max(homeProb + drawProb + awayProb, 1)

  // 픽 라벨
  const winner = match.predictedWinner
  const winnerLabel = winner === 'home' ? home : winner === 'away' ? away : winner === 'draw' ? '무승부' : null
  const winnerProb = winner === 'home' ? homeProb : winner === 'away' ? awayProb : winner === 'draw' ? drawProb : 0

  return (
    <>
      {/* 백드롭 */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* 모달 패널 — 가운데 정렬, 모바일에서는 풀스크린에 가까움 */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md sm:w-full z-[101] rounded-2xl shadow-2xl overflow-hidden border border-gray-800" style={{ backgroundColor: '#252829' }}>
        {/* 헤더 — 닫기 + 리그 + 시간 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2 text-sm">
            {match.leagueLogo && (
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center p-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={match.leagueLogo} alt="" className="max-w-full max-h-full object-contain" />
              </span>
            )}
            <span className="font-bold text-gray-200">{match.leagueName || match.league}</span>
            <span className="text-gray-500 text-xs tabular-nums">
              {match.timestamp
                ? new Date(match.timestamp).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 팀 + VS */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            {/* 홈 */}
            <div className="flex-1 flex flex-col items-center text-center">
              {match.homeLogo && (
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center p-1.5 shadow-md mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={match.homeLogo} alt={home} className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div className="text-sm font-bold text-white truncate w-full" title={home}>{home}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">홈</div>
            </div>
            <div className="text-lg font-bold text-gray-500 px-2">VS</div>
            {/* 원정 */}
            <div className="flex-1 flex flex-col items-center text-center">
              {match.awayLogo && (
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center p-1.5 shadow-md mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={match.awayLogo} alt={away} className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div className="text-sm font-bold text-white truncate w-full" title={away}>{away}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">원정</div>
            </div>
          </div>
        </div>

        {/* 승부 확률 바 */}
        {(homeProb || drawProb || awayProb) > 0 && (
          <div className="px-4 pb-4">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">승부 확률</div>
            <div className="h-2.5 rounded-full overflow-hidden flex bg-gray-800">
              <div className="bg-emerald-500" style={{ width: `${(homeProb / total) * 100}%` }} />
              <div className="bg-gray-600" style={{ width: `${(drawProb / total) * 100}%` }} />
              <div className="bg-amber-500" style={{ width: `${(awayProb / total) * 100}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <div className={winner === 'home' ? 'text-emerald-400 font-bold' : 'text-gray-400'}>
                <div className="text-[10px] text-gray-500">홈</div>
                <div className="tabular-nums">{homeProb}%</div>
              </div>
              <div className={winner === 'draw' ? 'text-gray-200 font-bold' : 'text-gray-400'}>
                <div className="text-[10px] text-gray-500">무</div>
                <div className="tabular-nums text-center">{drawProb}%</div>
              </div>
              <div className={winner === 'away' ? 'text-amber-400 font-bold' : 'text-gray-400'}>
                <div className="text-[10px] text-gray-500 text-right">원정</div>
                <div className="tabular-nums text-right">{awayProb}%</div>
              </div>
            </div>
          </div>
        )}

        {/* AI 픽 + 예상 스코어 */}
        {(winnerLabel || (match.predictedScoreHome != null && match.predictedScoreAway != null)) && (
          <div className="mx-4 mb-4 rounded-xl border border-emerald-500/20 p-3" style={{ backgroundColor: '#1a1c1d' }}>
            <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-2 font-bold">AI 예측</div>
            <div className="flex items-center justify-between gap-3">
              {winnerLabel && (
                <div>
                  <div className="text-[10px] text-gray-500">예상 결과</div>
                  <div className="text-sm font-bold text-white truncate" title={winnerLabel}>{winnerLabel}</div>
                  <div className="text-emerald-400 text-xs font-bold tabular-nums">{winnerProb}%</div>
                </div>
              )}
              {match.predictedScoreHome != null && match.predictedScoreAway != null && (
                <div className="text-right">
                  <div className="text-[10px] text-gray-500">예상 스코어</div>
                  <div className="text-2xl font-black text-white tabular-nums">
                    {match.predictedScoreHome}
                    <span className="text-gray-500 mx-1.5 text-base">:</span>
                    {match.predictedScoreAway}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 액션 — 프리미엄 분석으로 */}
        <div className="px-4 pb-4">
          <Link
            href="/premium"
            onClick={onClose}
            className="block w-full text-center font-bold text-sm py-3 rounded-xl transition-all"
            style={{
              background: 'linear-gradient(90deg, #6dff5c 0%, #36e07a 100%)',
              color: '#0a0a0a',
            }}
          >
            프리미엄 상세 분석 →
          </Link>
        </div>
      </div>
    </>
  )
}
