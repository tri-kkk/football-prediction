// 🔥 통합 홈 — 종합 스포츠 포털형 (히어로 + PICK + 통합 피드 + 종합 뉴스 + 하이라이트 + 매거진)
'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLocale } from 'next-intl'
import UnifiedFeed from '../components/home/UnifiedFeed'
import { readSportCookie } from '../components/home/SportTabs'
import {
  normalizeFootballMatch,
  normalizeBaseballMatch,
  isLiveStatus,
} from '../components/home/normalizers'
import type { SportFilter, UnifiedMatch } from '../components/home/types'
import type { DateFilter } from '../components/home/DateTabs'
import HeroBanner from '../components/home/HeroBanner'
import TodayPickCard from '../components/home/TodayPickCard'
import NewsGrid from '../components/home/NewsGrid'
import TopHighlights from '../components/TopHighlights'
import MagazineRow from '../components/home/MagazineRow'

const LIVE_REFRESH_MS = 20000 // 라이브 스코어 자동 갱신 주기

// 팀명 정규화 키 (대소문자/공백/특수문자 제거)
const teamKey = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// /api/live-matches 응답 → 진행 중(축구) 경기를 팀명 키 맵으로
function buildLiveMap(liveValue: any): Map<string, any> {
  const map = new Map<string, any>()
  const ll = (liveValue?.matches as any[]) || []
  ll.forEach((lm) => {
    if (isLiveStatus(lm?.status)) map.set(`${teamKey(lm.homeTeam)}|${teamKey(lm.awayTeam)}`, lm)
  })
  return map
}

// 기본(일정) 매치에 라이브 상태·스코어를 병합
function applyLiveMerge(base: UnifiedMatch[], liveMap: Map<string, any>): UnifiedMatch[] {
  if (liveMap.size === 0) return base
  return base.map((m) => {
    if (m.sport !== 'football') return m
    const lm = liveMap.get(`${teamKey(m.homeTeam)}|${teamKey(m.awayTeam)}`)
    if (!lm) return m
    return {
      ...m,
      status: lm.status, // 1H/2H/HT/LIVE → isLiveStatus 통과
      homeScore: typeof lm.homeScore === 'number' ? lm.homeScore : m.homeScore,
      awayScore: typeof lm.awayScore === 'number' ? lm.awayScore : m.awayScore,
    }
  })
}

function HomeInner() {
  const locale = useLocale()
  const isEn = locale === 'en'
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
  // 라이브 병합 전 기본(일정) 매치 — 주기 갱신 시 재병합 기준
  const baseRef = useRef<UnifiedMatch[]>([])

  // 마운트 시 쿠키 동기화 (URL sport 파라미터가 없을 때만)
  useEffect(() => {
    if (!urlSport) {
      const cookieSport = readSportCookie()
      if (cookieSport !== sportFilter) setSportFilter(cookieSport)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 데이터 페치 — 축구 + 야구 + 라이브(축구) 병렬, 이후 라이브만 주기 갱신
  useEffect(() => {
    let cancel = false

    const load = async () => {
      setLoading(true)
      try {
        const [fbRes, bbRes, liveRes] = await Promise.allSettled([
          fetch('/api/odds-from-db?league=ALL').then((r) => r.json()),
          fetch('/api/baseball/matches?skipML=true').then((r) => r.json()),
          fetch('/api/live-matches').then((r) => r.json()),
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

        baseRef.current = unique
        const liveMap = liveRes.status === 'fulfilled' ? buildLiveMap(liveRes.value) : new Map()
        if (!cancel) setMatches(applyLiveMerge(unique, liveMap))
      } catch (e) {
        console.error('match fetch error', e)
        if (!cancel) setMatches([])
      } finally {
        if (!cancel) setLoading(false)
      }
    }

    // 라이브만 가볍게 재페치 → 기본 매치에 재병합
    const refreshLive = async () => {
      if (baseRef.current.length === 0) return
      try {
        const live = await fetch('/api/live-matches').then((r) => r.json())
        if (!cancel) setMatches(applyLiveMerge(baseRef.current, buildLiveMap(live)))
      } catch {
        /* noop */
      }
    }

    load()
    const iv = setInterval(refreshLive, LIVE_REFRESH_MS)
    return () => {
      cancel = true
      clearInterval(iv)
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
      {/* 최상단 프리미엄 배너 */}
      {!isPremium && (
        <a
          href="/premium/pricing"
          className="block -mx-3 sm:mx-0 rounded-xl overflow-hidden"
          aria-label={isEn ? 'Premium subscription' : '프리미엄 구독'}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/1200x200.png"
            alt={isEn ? 'Premium subscription' : '프리미엄 구독'}
            className="w-full h-auto"
            loading="eager"
          />
        </a>
      )}

      {/* ①②  히어로 + 오늘의 PICK */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.85fr_1fr]">
        <HeroBanner locale={locale} />
        <TodayPickCard locale={locale} isPremium={isPremium} />
      </div>

      {/* ③  통합 경기 피드 (홈은 3줄로 축소, 라이브 경기는 상단 정렬) */}
      <UnifiedFeed
        initialLimit={9}
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

      {/* ④  종합 뉴스 (전체 폭) */}
      <NewsGrid locale={locale} />

      {/* ⑤  영상 하이라이트 */}
      <TopHighlights darkMode />

      {/* ⑥  매거진 / 매치 리포트 (컴팩트 카드) */}
      <MagazineRow locale={locale} />
    </main>
  )
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-500 text-sm">Loading…</div>
        </div>
      }
    >
      <HomeInner />
    </Suspense>
  )
}
