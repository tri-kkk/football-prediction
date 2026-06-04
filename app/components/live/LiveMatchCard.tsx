'use client'

// 라이브 경기 카드 (리디자인)
// 스코어보드 + 진행 바 + 득점자 + 미니 스탯 + 이벤트 타임라인 + 골 플래시 + 알림 벨. 이모지 미사용.

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import LineupWidget from '../LineupWidget'

interface MatchEvent {
  time: number
  type: 'goal' | 'card' | 'subst'
  team: 'home' | 'away'
  player: string
  detail?: string
}

interface MatchStats {
  shotsOnGoal: { home: number; away: number }
  shotsOffGoal: { home: number; away: number }
  possession: { home: number; away: number }
  corners: { home: number; away: number }
  offsides: { home: number; away: number }
  fouls: { home: number; away: number }
  yellowCards: { home: number; away: number }
  redCards: { home: number; away: number }
}

interface LiveMatch {
  id: number
  fixtureId?: number
  leagueCode: string
  league: string
  leagueLogo: string
  country: string
  status: string
  elapsed: number
  homeTeam: string
  awayTeam: string
  homeTeamKR: string
  awayTeamKR: string
  homeCrest: string
  awayCrest: string
  homeScore: number
  awayScore: number
  halftimeHomeScore: number
  halftimeAwayScore: number
  events?: MatchEvent[]
  stats?: MatchStats
}

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE']

function statusLabel(status: string, isKo: boolean): string {
  const ko: Record<string, string> = { '1H': '전반', '2H': '후반', HT: '하프타임', ET: '연장', P: '승부차기', FT: '종료', LIVE: '진행중' }
  const en: Record<string, string> = { '1H': '1H', '2H': '2H', HT: 'HT', ET: 'ET', P: 'PEN', FT: 'FT', LIVE: 'Live' }
  return (isKo ? ko[status] : en[status]) || status
}

function progressPct(status: string, elapsed: number): number {
  if (status === 'HT') return 50
  if (status === 'FT' || status === 'ET' || status === 'P') return 100
  if (!elapsed) return 0
  return Math.min(100, Math.round((elapsed / 90) * 100))
}

const STATS_LABELS: { key: keyof MatchStats; ko: string; en: string }[] = [
  { key: 'possession', ko: '점유율', en: 'Possession' },
  { key: 'shotsOnGoal', ko: '유효 슈팅', en: 'Shots on' },
  { key: 'shotsOffGoal', ko: '슈팅(빗나감)', en: 'Shots off' },
  { key: 'corners', ko: '코너킥', en: 'Corners' },
  { key: 'offsides', ko: '오프사이드', en: 'Offsides' },
  { key: 'fouls', ko: '파울', en: 'Fouls' },
  { key: 'yellowCards', ko: '경고', en: 'Yellow' },
  { key: 'redCards', ko: '퇴장', en: 'Red' },
]

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export default function LiveMatchCard({ match, language }: { match: LiveMatch; language: 'ko' | 'en' }) {
  const isKo = language === 'ko'
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<'overview' | 'stats' | 'lineup'>('overview')
  const [flash, setFlash] = useState(false)
  const [alerted, setAlerted] = useState(false)
  const prevGoals = useRef<number>(match.homeScore + match.awayScore)

  // 골 플래시 — 합산 득점이 늘면 4초 강조
  useEffect(() => {
    const g = match.homeScore + match.awayScore
    if (g > prevGoals.current) {
      setFlash(true)
      prevGoals.current = g
      const t = setTimeout(() => setFlash(false), 4000)
      return () => clearTimeout(t)
    }
    prevGoals.current = g
  }, [match.homeScore, match.awayScore])

  // 알림 벨 — localStorage 저장 (실제 푸시는 FCM 연동 시 동작)
  const alertKey = `live_alert_${match.id}`
  useEffect(() => {
    try {
      setAlerted(localStorage.getItem(alertKey) === '1')
    } catch {}
  }, [alertKey])
  const toggleAlert = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setAlerted((v) => {
      const nv = !v
      try {
        localStorage.setItem(alertKey, nv ? '1' : '0')
      } catch {}
      return nv
    })
  }

  const live = LIVE_STATUSES.includes(match.status)
  const home = isKo ? match.homeTeamKR || match.homeTeam : match.homeTeam
  const away = isKo ? match.awayTeamKR || match.awayTeam : match.awayTeam
  const goals = (match.events || []).filter((e) => e.type === 'goal')
  const homeGoals = goals.filter((e) => e.team === 'home')
  const awayGoals = goals.filter((e) => e.team === 'away')
  const pct = progressPct(match.status, match.elapsed)
  const poss = match.stats?.possession
  const showHT = match.halftimeHomeScore !== null && ['HT', '2H', 'ET', 'P', 'FT'].includes(match.status)

  const totShots = (s?: MatchStats) =>
    s ? { home: (s.shotsOnGoal?.home || 0) + (s.shotsOffGoal?.home || 0), away: (s.shotsOnGoal?.away || 0) + (s.shotsOffGoal?.away || 0) } : null
  const shots = totShots(match.stats)

  return (
    <div className={`bg-[#1a1a1a] border rounded-xl overflow-hidden transition-colors ${flash ? 'border-green-500' : 'border-gray-700 hover:border-gray-600'}`}>
      {live && <div className={`h-1 ${flash ? 'bg-green-500' : 'bg-red-500'}`} />}

      <div className="p-4 sm:p-5">
        {/* 헤더 — 리그 / 상태 / 알림 */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center p-1 shrink-0">
              {match.leagueLogo && <Image src={match.leagueLogo} alt="" width={18} height={18} className="object-contain" />}
            </span>
            <span className="text-xs font-medium text-gray-300 truncate">{match.league}</span>
            <span className="text-[11px] text-gray-600 truncate hidden sm:inline">· {match.country}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${live ? 'bg-red-500/15 text-red-400' : 'bg-gray-700 text-gray-300'}`}>
              {live && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              {statusLabel(match.status, isKo)}
              {live && match.elapsed ? ` ${match.elapsed}'` : ''}
            </span>
            {live && (
              <button type="button" onClick={toggleAlert} aria-label={isKo ? '골 알림' : 'Goal alerts'} className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${alerted ? 'text-[#A3FF4C]' : 'text-gray-500 hover:text-gray-300'}`}>
                <BellIcon active={alerted} />
              </button>
            )}
          </div>
        </div>

        {/* 진행 바 */}
        {live && match.status !== 'HT' && (
          <div className="mb-4">
            <div className="relative h-1.5 bg-gray-800 rounded-full">
              <div className="absolute left-0 top-0 h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-[#1a1a1a]" style={{ left: `calc(${pct}% - 5px)` }} />
            </div>
            <div className="flex justify-between text-[9px] text-gray-600 mt-1">
              <span>0&apos;</span><span>HT</span><span>90&apos;</span>
            </div>
          </div>
        )}

        {/* 스코어보드 */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-1.5 min-w-0">
            {match.homeCrest && <Image src={match.homeCrest} alt={home} width={40} height={40} className="object-contain" />}
            <span className="text-[13px] font-semibold text-white text-center truncate w-full">{home}</span>
          </div>
          <div className="text-center px-1">
            <div className={`text-3xl font-black tabular-nums leading-none ${flash ? 'text-green-400' : 'text-white'}`}>
              {match.homeScore}<span className="text-gray-600 mx-1.5">:</span>{match.awayScore}
            </div>
            {showHT && <div className="text-[10px] text-gray-500 mt-1">{isKo ? '전반' : 'HT'} {match.halftimeHomeScore}:{match.halftimeAwayScore}</div>}
          </div>
          <div className="flex flex-col items-center gap-1.5 min-w-0">
            {match.awayCrest && <Image src={match.awayCrest} alt={away} width={40} height={40} className="object-contain" />}
            <span className="text-[13px] font-semibold text-white text-center truncate w-full">{away}</span>
          </div>
        </div>

        {/* 득점자 */}
        {goals.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-gray-400">
            <div className="space-y-0.5">
              {homeGoals.map((g, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">{g.player} {g.time}&apos;</span>
                </div>
              ))}
            </div>
            <div className="space-y-0.5 text-right">
              {awayGoals.map((g, i) => (
                <div key={i} className="flex items-center gap-1.5 justify-end">
                  <span className="truncate">{g.player} {g.time}&apos;</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 미니 스탯 — 점유율 + 슈팅/유효/코너 */}
        {match.stats && (
          <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
            {poss && (
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-white font-medium">{poss.home}%</span>
                  <span className="text-gray-500">{isKo ? '점유율' : 'Possession'}</span>
                  <span className="text-white font-medium">{poss.away}%</span>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800">
                  <div className="bg-blue-500" style={{ width: `${poss.home}%` }} />
                  <div className="bg-red-500" style={{ width: `${poss.away}%` }} />
                </div>
              </div>
            )}
            <div className="flex justify-between text-[11px] text-gray-500">
              {shots && (
                <span><b className="text-gray-200 font-medium">{shots.home}</b> {isKo ? '슈팅' : 'Shots'} <b className="text-gray-200 font-medium">{shots.away}</b></span>
              )}
              <span><b className="text-gray-200 font-medium">{match.stats.shotsOnGoal?.home ?? 0}</b> {isKo ? '유효' : 'On'} <b className="text-gray-200 font-medium">{match.stats.shotsOnGoal?.away ?? 0}</b></span>
              <span><b className="text-gray-200 font-medium">{match.stats.corners?.home ?? 0}</b> {isKo ? '코너' : 'Corners'} <b className="text-gray-200 font-medium">{match.stats.corners?.away ?? 0}</b></span>
            </div>
          </div>
        )}

        {/* 이벤트 타임라인 */}
        {live && match.events && match.events.length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] text-gray-600 mb-1.5">{isKo ? '이벤트 타임라인' : 'Timeline'}</div>
            <div className="relative h-3">
              <div className="absolute top-1.5 left-0 right-0 h-px bg-gray-800" />
              <div className="absolute top-1.5 left-0 h-px bg-gray-600" style={{ width: `${pct}%` }} />
              {match.events.map((e, i) => {
                const left = Math.min(100, Math.max(0, (e.time / 90) * 100))
                if (e.type === 'goal') {
                  return <span key={i} title={`${e.player} ${e.time}'`} className="absolute w-2 h-2 rounded-full bg-emerald-400" style={{ left: `calc(${left}% - 4px)`, top: '2px' }} />
                }
                if (e.type === 'card') {
                  const red = (e.detail || '').toLowerCase().includes('red')
                  return <span key={i} title={`${e.player} ${e.time}'`} className={`absolute w-1.5 h-2.5 rounded-[1px] ${red ? 'bg-red-500' : 'bg-yellow-400'}`} style={{ left: `calc(${left}% - 3px)`, top: '1px' }} />
                }
                return <span key={i} title={`${e.player} ${e.time}'`} className="absolute w-1.5 h-1.5 rounded-full bg-gray-500" style={{ left: `calc(${left}% - 3px)`, top: '3px' }} />
              })}
            </div>
          </div>
        )}
      </div>

      {/* 상세 토글 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full py-2.5 bg-[#222] hover:bg-[#2a2a2a] text-gray-400 text-xs font-medium transition-colors border-t border-gray-800"
      >
        {expanded ? (isKo ? '접기 ▲' : 'Collapse ▲') : (isKo ? '상세 정보 ▼' : 'Details ▼')}
      </button>

      {/* 상세 — 이벤트 / 통계 / 라인업 */}
      {expanded && (
        <div className="bg-[#151515] border-t border-gray-800">
          <div className="flex border-b border-gray-800">
            {(['overview', 'stats', 'lineup'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === t ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}>
                {t === 'overview' ? (isKo ? '이벤트' : 'Events') : t === 'stats' ? (isKo ? '통계' : 'Stats') : isKo ? '라인업' : 'Lineup'}
              </button>
            ))}
          </div>
          <div className="p-4">
            {tab === 'overview' && (
              <div className="space-y-2">
                {!match.events || match.events.length === 0 ? (
                  <p className="text-gray-500 text-center py-4 text-sm">{isKo ? '아직 이벤트가 없습니다' : 'No events yet'}</p>
                ) : (
                  match.events.map((e, i) => {
                    const red = e.type === 'card' && (e.detail || '').toLowerCase().includes('red')
                    return (
                      <div key={i} className={`flex items-center gap-3 p-2 rounded ${e.team === 'home' ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>
                        <span className="text-xs text-gray-400 w-8 tabular-nums">{e.time}&apos;</span>
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${e.type === 'goal' ? 'bg-emerald-400' : e.type === 'card' ? (red ? 'bg-red-500' : 'bg-yellow-400') : 'bg-gray-500'}`} />
                        <span className="text-sm text-white">{e.player}</span>
                        {e.detail && <span className="text-xs text-gray-500">({e.detail})</span>}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {tab === 'stats' && match.stats && (
              <div className="space-y-3">
                {STATS_LABELS.map(({ key, ko, en }) => {
                  const stat = match.stats?.[key]
                  if (!stat) return null
                  const total = stat.home + stat.away || 1
                  const homePercent = (stat.home / total) * 100
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-white font-medium">{stat.home}</span>
                        <span className="text-gray-400">{isKo ? ko : en}</span>
                        <span className="text-white font-medium">{stat.away}</span>
                      </div>
                      <div className="flex h-2 bg-gray-700 rounded overflow-hidden">
                        <div className="bg-blue-500" style={{ width: `${homePercent}%` }} />
                        <div className="bg-red-500" style={{ width: `${100 - homePercent}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'stats' && !match.stats && (
              <p className="text-gray-500 text-center py-4 text-sm">{isKo ? '통계가 없습니다' : 'No stats'}</p>
            )}

            {tab === 'lineup' && (match.fixtureId ? <LineupWidget fixtureId={match.fixtureId} /> : <p className="text-gray-500 text-center py-4 text-sm">{isKo ? '라인업 정보가 없습니다' : 'No lineup'}</p>)}
          </div>
        </div>
      )}
    </div>
  )
}
