// 🔥 통합 피드
'use client'

import { useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import SportTabs from './SportTabs'
import UnifiedMatchCard from './UnifiedMatchCard'
import DateTabs, { getDateBucket, type DateFilter } from './DateTabs'
import LeagueChips from './LeagueChips'
import { isLiveStatus, isScheduledStatus } from './normalizers'
import type { SportFilter, UnifiedMatch } from './types'

interface Props {
  matches: UnifiedMatch[]
  filter: SportFilter
  onFilterChange: (next: SportFilter) => void
  loading?: boolean
  leagueFilter?: string | null
  onClearLeagueFilter?: () => void
  dateFilter?: DateFilter
  onDateFilterChange?: (next: DateFilter) => void
  insertAfter?: number
  insertSlot?: React.ReactNode
  initialLimit?: number
}

const DEFAULT_LIMIT = 15
const EXPANDED_LIMIT = 30

function isLive(m: UnifiedMatch): boolean { return isLiveStatus(m.status) }
function isUpcoming(m: UnifiedMatch): boolean {
  if (!isScheduledStatus(m.status)) return false
  if (!m.timestamp) return true
  return new Date(m.timestamp).getTime() > Date.now() - 30 * 60000
}

export default function UnifiedFeed({ matches, filter, onFilterChange, loading, leagueFilter, onClearLeagueFilter, dateFilter = 'all', onDateFilterChange, insertAfter, insertSlot, initialLimit }: Props) {
  const locale = useLocale()
  const isEn = locale === 'en'
  const [expanded, setExpanded] = useState(false)

  const counts = useMemo(() => {
    const c = { all: matches.length, football: 0, baseball: 0 }
    matches.forEach((m) => {
      if (m.sport === 'football') c.football++
      else if (m.sport === 'baseball') c.baseball++
    })
    return c
  }, [matches])

  const sportLeagueFiltered = useMemo(() => {
    let list = matches
    if (leagueFilter) list = list.filter((m) => m.league === leagueFilter)
    else if (filter !== 'all') list = list.filter((m) => m.sport === filter)
    const cutoff = Date.now() - 48 * 60 * 60 * 1000
    list = list.filter((m) => !m.timestamp || new Date(m.timestamp).getTime() > cutoff)
    return list
  }, [matches, filter, leagueFilter])

  const dateCounts = useMemo(() => {
    const c: Record<DateFilter, number> = { yesterday: 0, today: 0, tomorrow: 0, all: sportLeagueFiltered.length }
    sportLeagueFiltered.forEach((m) => {
      const b = getDateBucket(m.timestamp)
      if (b === 'yesterday') c.yesterday++
      else if (b === 'today') c.today++
      else if (b === 'tomorrow') c.tomorrow++
    })
    return c
  }, [sportLeagueFiltered])

  const filtered = useMemo(() => {
    if (dateFilter === 'all') return sportLeagueFiltered
    return sportLeagueFiltered.filter((m) => getDateBucket(m.timestamp) === dateFilter)
  }, [sportLeagueFiltered, dateFilter])

  const leagueInfo = useMemo(() => {
    if (!leagueFilter) return null
    const sample = matches.find((m) => m.league === leagueFilter)
    return { name: sample?.leagueName || leagueFilter, logo: sample?.leagueLogo }
  }, [matches, leagueFilter])

  const curated = useMemo(() => {
    const live = filtered.filter(isLive)
    const upcoming = filtered.filter((m) => !isLive(m) && isUpcoming(m))
    const rest = filtered.filter((m) => !isLive(m) && !isUpcoming(m))
    return { live, upcoming, rest }
  }, [filtered])

  const baseLimit = initialLimit ?? DEFAULT_LIMIT
  const limit = expanded ? Math.max(EXPANDED_LIMIT, baseLimit) : baseLimit
  const displayList = useMemo(() => [...curated.live, ...curated.upcoming, ...curated.rest].slice(0, limit), [curated, limit])
  const totalShowable = curated.live.length + curated.upcoming.length + curated.rest.length
  const hasMore = totalShowable > displayList.length

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="hidden sm:block">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
            <span>{isEn ? "Today's Matches" : '오늘의 경기'}</span>
            {leagueInfo && (
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-medium">
                {leagueInfo.logo && (
                  <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center p-0.5">
                    <img src={leagueInfo.logo} alt="" className="max-w-full max-h-full object-contain" />
                  </span>
                )}
                {leagueInfo.name}
                {onClearLeagueFilter && (<button type="button" onClick={onClearLeagueFilter} className="ml-1 text-emerald-300/80 hover:text-white text-base leading-none" aria-label={isEn ? 'Clear league filter' : '리그 필터 해제'}>×</button>)}
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {curated.live.length > 0 && (<span className="text-red-400 font-bold mr-2">🔴 LIVE {curated.live.length}{isEn ? ' matches' : '경기'}</span>)}
            <span>{isEn ? `${totalShowable} total · showing top ${displayList.length}` : `전체 ${totalShowable}경기 · 상위 ${displayList.length}개 표시`}</span>
          </p>
        </div>
        {leagueInfo && (
          <div className="sm:hidden w-full flex items-center justify-center">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-medium">
              {leagueInfo.logo && (<span className="w-4 h-4 rounded-full bg-white flex items-center justify-center p-0.5"><img src={leagueInfo.logo} alt="" className="max-w-full max-h-full object-contain" /></span>)}
              {leagueInfo.name}
              {onClearLeagueFilter && (<button type="button" onClick={onClearLeagueFilter} className="ml-1 text-emerald-300/80 hover:text-white text-base leading-none" aria-label={isEn ? 'Clear league filter' : '리그 필터 해제'}>×</button>)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <SportTabs value={filter} onChange={onFilterChange} counts={counts} />
          {onDateFilterChange && (<div className="w-full sm:w-auto flex justify-start sm:justify-center"><DateTabs value={dateFilter} onChange={onDateFilterChange} counts={dateCounts} /></div>)}
        </div>
      </header>

      <LeagueChips activeLeague={leagueFilter} matches={leagueFilter ? matches : filtered} />

      {loading && (<div className="text-center py-8 text-gray-500 text-sm">{isEn ? 'Loading matches…' : '경기 정보를 불러오는 중…'}</div>)}
      {!loading && displayList.length === 0 && (
        <div className="text-center py-10 rounded-xl bg-gray-900/40 border border-gray-800">
          <p className="text-gray-400 text-sm">{isEn ? 'No matches to display.' : '표시할 경기가 없습니다.'}</p>
          <p className="text-xs text-gray-600 mt-1">{isEn ? 'Try selecting a different sport tab.' : '다른 종목 탭을 선택해보세요.'}</p>
        </div>
      )}
      {!loading && displayList.length > 0 && (() => {
        const splitIdx = insertSlot && insertAfter && displayList.length > insertAfter ? insertAfter : displayList.length
        const head = displayList.slice(0, splitIdx)
        const tail = displayList.slice(splitIdx)
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {head.map((m) => <UnifiedMatchCard key={`${m.sport}-${m.id}`} match={m} />)}
            </div>
            {tail.length > 0 && insertSlot && (<div className="my-4">{insertSlot}</div>)}
            {tail.length > 0 && (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{tail.map((m) => <UnifiedMatchCard key={`${m.sport}-${m.id}`} match={m} />)}</div>)}
          </>
        )
      })()}
      {!loading && totalShowable > 0 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {hasMore && !expanded && (<button onClick={() => setExpanded(true)} className="px-4 py-2 rounded-lg bg-gray-900/60 hover:bg-gray-800 border border-gray-800 text-sm text-gray-300 hover:text-white transition-colors">{isEn ? `Show more (${totalShowable - displayList.length} more)` : `더보기 (${totalShowable - displayList.length}경기)`}</button>)}
        </div>
      )}
    </section>
  )
}
