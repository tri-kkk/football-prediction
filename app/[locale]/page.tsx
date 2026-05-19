// 🔥 통합 홈 — 종목 탭 + 리그 칩 + 날짜 탭 (BC.game 패턴, 차콜 톤)
'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import UnifiedFeed from '../components/home/UnifiedFeed'
import { readSportCookie } from '../components/home/SportTabs'
import {
  normalizeFootballMatch,
  normalizeBaseballMatch,
} from '../components/home/normalizers'
import type { SportFilter, UnifiedMatch } from '../components/home/types'
import type { DateFilter } from '../components/home/DateTabs'

function HomeInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const isPremium = (session?.user as any)?.tier === 'premium'

  const urlSport = searchParams?.get('sport') as SportFilter | null
  const urlLeague = searchParams?.get('league')
  const urlDate = searchParams?.get('date') as DateFilter | null

  // 종목: URL → 쿠키 → 'all'
  const [sportFilter, setSportFilter] = useState<SportFilter>(
    urlSport === 'football' || urlSport === 'baseball' || urlSport === 'all'
      ? urlSport
      : 'all',
  )
  // 날짜: URL → 'today' (default)
  const [dateFilter, setDateFilter] = useState<DateFilter>(
    urlDate === 'yesterday' || urlDate === 'tomorrow' || urlDate === 'all'
      ? urlDate
      : 'today',
  )

  const [matches, setMatches] = useState<UnifiedMatch[]>([])
  const [loading, setLoading] = useState(true)

  // 마운트 시 쿠키 동기화 (URL sport 파라미터가 없을 때만)
  useEffect(() => {
    if (!urlSport) {
      const cookieSport = readSportCookie()
      if (cookieSport !== sportFilter) setSportFilter(cookieSport)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 데이터 페치 — 축구 + 야구 병렬
  useEffect(() => {
    let cancel = false
    const load = async () => {
      setLoading(true)
      try {
        const [fbRes, bbRes] = await Promise.allSettled([
          fetch('/api/odds-from-db?league=ALL').then((r) => r.json()),
          fetch('/api/baseball/matches?skipML=true').then((r) => r.json()),
        ])

        const next: UnifiedMatch[] = []

        if (fbRes.status === 'fulfilled') {
          const list =
            (fbRes.value?.matches as any[]) ||
            (fbRes.value?.data as any[]) ||
            (Array.isArray(fbRes.value) ? (fbRes.value as any[]) : [])
          list.forEach((m) => {
            try {
              next.push(normalizeFootballMatch(m))
            } catch {}
          })
        }

        if (bbRes.status === 'fulfilled') {
          const list =
            (bbRes.value?.matches as any[]) ||
            (bbRes.value?.data as any[]) ||
            (Array.isArray(bbRes.value) ? (bbRes.value as any[]) : [])
          list.forEach((m) => {
            try {
              next.push(normalizeBaseballMatch(m))
            } catch {}
          })
        }

        // 중복 제거 (ID + 팀 조합 이중 체크)
        const seenIds = new Set<string>()
        const seenKeys = new Set<string>()
        const unique = next.filter((m) => {
          const id = String(m.id)
          if (id && seenIds.has(id)) return false
          const key = `${m.sport}-${(m.homeTeam || '').toLowerCase().replace(/\s+/g, '')}-vs-${(m.awayTeam || '').toLowerCase().replace(/\s+/g, '')}-${(m.timestamp || '').slice(0, 10)}`
          if (seenKeys.has(key)) return false
          seenIds.add(id)
          seenKeys.add(key)
          return true
        })

        if (!cancel) setMatches(unique)
      } catch (e) {
        console.error('match fetch error', e)
        if (!cancel) setMatches([])
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => {
      cancel = true
    }
  }, [])

  // URL 동기화 helper
  const updateUrl = (next: { sport?: SportFilter; league?: string | null; date?: DateFilter }) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    const sport = next.sport ?? sportFilter
    const league = next.league !== undefined ? next.league : urlLeague
    const date = next.date ?? dateFilter

    if (sport && sport !== 'all') params.set('sport', sport)
    else params.delete('sport')
    if (league) params.set('league', league)
    else params.delete('league')
    if (date && date !== 'today') params.set('date', date)
    else params.delete('date')

    const qs = params.toString()
    router.replace(qs ? `/?${qs}` : '/', { scroll: false })
  }

  return (
    <main className="home-container mx-auto px-3 sm:px-5 pt-3 pb-24 sm:pb-8 space-y-4">
      {/* 최상단 배너 (모바일 + 데스크탑) */}
      {!isPremium && (
        <a href="/premium/pricing" className="block -mx-3 sm:mx-0 mb-2 rounded-xl overflow-hidden" aria-label="프리미엄 구독">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/1200x200.png" alt="프리미엄 구독" className="w-full h-auto" loading="eager" />
        </a>
      )}

      <UnifiedFeed
        matches={matches}
        filter={sportFilter}
        onFilterChange={(s) => {
          setSportFilter(s)
          updateUrl({ sport: s })
        }}
        loading={loading}
        leagueFilter={urlLeague}
        onClearLeagueFilter={() => updateUrl({ league: null })}
        dateFilter={dateFilter}
        onDateFilterChange={(d) => {
          setDateFilter(d)
          updateUrl({ date: d })
        }}
      />
    </main>
  )
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-500 text-sm">불러오는 중…</div>
        </div>
      }
    >
      <HomeInner />
    </Suspense>
  )
}
