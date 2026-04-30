// 🔥 통합 매치 카드 — BC.game 컬러 톤 (단순화: 예측 영역 제거)
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { UnifiedMatch } from './types'
import { isFinishedStatus, isLiveStatus } from './normalizers'
import FootballMatchModal from './FootballMatchModal'

interface Props {
  match: UnifiedMatch
}

function formatDate(timestamp: string | null, date: string): string {
  const src = timestamp || date
  if (!src) return ''
  try {
    const d = new Date(src)
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 86400000)
    const ymd = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
    if (ymd(d) === ymd(today)) return '오늘'
    if (ymd(d) === ymd(tomorrow)) return '내일'
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return src.slice(5, 10)
  }
}

function formatTime(timestamp: string | null, time: string | null): string {
  if (timestamp) {
    try {
      const d = new Date(timestamp)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    } catch {}
  }
  if (time) return time.slice(0, 5)
  return ''
}

const SPORT_ICON: Record<UnifiedMatch['sport'], string> = { football: '⚽', baseball: '⚾' }

export default function UnifiedMatchCard({ match }: Props) {
  const home = match.homeTeamKo || match.homeTeam
  const away = match.awayTeamKo || match.awayTeam
  const live = isLiveStatus(match.status)
  const finished = isFinishedStatus(match.status)
  const showScore = live || finished
  const time = formatTime(match.timestamp, match.time)
  const isBaseball = match.sport === 'baseball'
  const [modalOpen, setModalOpen] = useState(false)

  const cardClass = 'group h-full flex flex-col overflow-hidden rounded-xl border border-transparent transition-all hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer'
  const cardStyle = { backgroundColor: '#252829' }

  const content = (
    <>
      {/* 상단 — 리그 + 날짜·시간 */}
      <div className="px-3 pt-3 pb-1.5">
        <div className="flex items-center justify-between gap-2 text-[12px]">
          <span className="flex items-center gap-1.5 font-bold text-gray-200 min-w-0">
            {match.leagueLogo ? (
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 p-0.5">
                <img src={match.leagueLogo} alt="" className="max-w-full max-h-full object-contain" loading="lazy" />
              </span>
            ) : (
              <span className="text-base leading-none">{SPORT_ICON[match.sport]}</span>
            )}
            <span className="truncate">{match.leagueName || match.league}</span>
          </span>
          <span className="text-gray-400 tabular-nums shrink-0">
            {formatDate(match.timestamp, match.date)}
            {!finished && time && (<><span className="text-gray-600 mx-1">·</span>{time}</>)}
          </span>
        </div>
        {(live || finished) && (
          <div className="mt-1.5 flex justify-center">
            {live && <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold animate-pulse">● LIVE {match.status}</span>}
            {finished && <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 text-[10px] font-bold">종료</span>}
          </div>
        )}
      </div>

      {/* 팀 영역 */}
      <div className="px-3 pt-2 pb-4 flex-1 flex items-center justify-between gap-2 min-h-[88px]">
        <div className="flex-1 flex flex-col items-center text-center min-w-0">
          {match.homeLogo && (
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white flex items-center justify-center p-1 mb-1.5">
              <img src={match.homeLogo} alt={home} className="max-w-full max-h-full object-contain" loading="lazy" />
            </div>
          )}
          <span className="text-[12px] font-bold text-white truncate w-full" style={{ wordBreak: 'keep-all' }} title={home}>{home}</span>
        </div>
        <div className="shrink-0 px-1">
          {showScore && match.homeScore != null && match.awayScore != null ? (
            <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
              {match.homeScore}<span className="text-gray-500 mx-1.5 text-base">:</span>{match.awayScore}
            </div>
          ) : (<span className="text-base font-bold text-gray-500">VS</span>)}
        </div>
        <div className="flex-1 flex flex-col items-center text-center min-w-0">
          {match.awayLogo && (
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white flex items-center justify-center p-1 mb-1.5">
              <img src={match.awayLogo} alt={away} className="max-w-full max-h-full object-contain" loading="lazy" />
            </div>
          )}
          <span className="text-[12px] font-bold text-white truncate w-full" style={{ wordBreak: 'keep-all' }} title={away}>{away}</span>
        </div>
      </div>
    </>
  )

  if (isBaseball) {
    return <Link href={`/baseball/${match.id}`} className={cardClass} style={cardStyle}>{content}</Link>
  }
  return (
    <>
      <button type="button" onClick={() => setModalOpen(true)} className={`${cardClass} text-left w-full`} style={cardStyle}>{content}</button>
      {modalOpen && <FootballMatchModal match={match} onClose={() => setModalOpen(false)} />}
    </>
  )
}
