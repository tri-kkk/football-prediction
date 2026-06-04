'use client'

// 오늘의 PICK 카드 — 시즌 자동.
// 1순위: 축구 프리미엄 픽(/api/premium-picks). 없으면 → 야구 AI 픽(/api/baseball/matches mlPrediction) 대체.
// 비프리미엄은 블러 + 구독 CTA (종목 무관 동일). 이모지 미사용. 대만 CPBL 제외.
// 두 요청을 병렬로 시작해 첫 진입 지연 최소화.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getTeamLogo } from '../../teamLogos'
import { TEAM_NAME_KR } from '../../teamLogos'

interface PickView {
  sport: 'football' | 'baseball'
  homeTeam: string
  awayTeam: string
  homeLogo: string
  awayLogo: string
  pickedTeam: string
  oddsText: string | null
  grade?: string | null
  confidence?: number | null // 0~100
}

const gradeRank = (g?: string) => (g === 'PICK' ? 3 : g === 'GOOD' ? 2 : g ? 1 : 0)
const isFinished = (s?: string) => /^(ft|final|finished|end|aban|canc|post)/i.test(s || '')
// 제외할 리그 (대만 프로야구)
const isExcludedLeague = (m: any) => /cpbl/i.test(m?.league || m?.leagueName || m?.leagueCode || '')

export default function TodayPickCard({
  locale = 'ko',
  isPremium = false,
}: {
  locale?: string
  isPremium?: boolean
}) {
  const isKo = locale !== 'en'
  const { status } = useSession()
  const isLoggedIn = status === 'authenticated'
  const [view, setView] = useState<PickView | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const kr = (name: string) => (isKo ? TEAM_NAME_KR[name] || name : name)

  useEffect(() => {
    let cancel = false

    const buildFootball = (p: any): PickView | null => {
      if (!p) return null
      const side: string =
        (typeof p.pick_result === 'string' && p.pick_result) ||
        (typeof p.prediction === 'string' && p.prediction) ||
        'HOME'
      const pickedTeam =
        side === 'AWAY' ? kr(p.away_team) : side === 'DRAW' ? (isKo ? '무승부' : 'Draw') : kr(p.home_team)
      const odds = side === 'AWAY' ? p.away_odds : side === 'DRAW' ? p.draw_odds : p.home_odds
      return {
        sport: 'football',
        homeTeam: kr(p.home_team),
        awayTeam: kr(p.away_team),
        homeLogo: getTeamLogo(p.home_team_id || p.home_team, p.home_team),
        awayLogo: getTeamLogo(p.away_team_id || p.away_team, p.away_team),
        pickedTeam,
        oddsText: odds ? `@${odds}` : null,
        grade: p.grade,
        confidence: typeof p.confidence === 'number' ? Math.round(p.confidence) : null,
      }
    }

    const buildBaseball = (list: any[]): PickView | null => {
      const eligible = (list || [])
        .filter((m) => m?.mlPrediction && !isFinished(m.status) && !isExcludedLeague(m))
        .sort((a, b) => {
          const gr = gradeRank(b.mlPrediction.grade) - gradeRank(a.mlPrediction.grade)
          if (gr !== 0) return gr
          const cb = Math.max(b.mlPrediction.homeWinProb || 0, b.mlPrediction.awayWinProb || 0)
          const ca = Math.max(a.mlPrediction.homeWinProb || 0, a.mlPrediction.awayWinProb || 0)
          return cb - ca
        })
      const m = eligible[0]
      if (!m) return null
      const ml = m.mlPrediction
      const homeWin = (ml.homeWinProb || 0) >= (ml.awayWinProb || 0)
      const conf = Math.round(Math.max(ml.homeWinProb || 0, ml.awayWinProb || 0))
      return {
        sport: 'baseball',
        homeTeam: isKo ? m.homeTeamKo || m.homeTeam : m.homeTeam,
        awayTeam: isKo ? m.awayTeamKo || m.awayTeam : m.awayTeam,
        homeLogo: m.homeLogo,
        awayLogo: m.awayLogo,
        pickedTeam: isKo
          ? (homeWin ? m.homeTeamKo || m.homeTeam : m.awayTeamKo || m.awayTeam)
          : homeWin
          ? m.homeTeam
          : m.awayTeam,
        oddsText: null,
        grade: ml.grade,
        confidence: conf,
      }
    }

    ;(async () => {
      // 두 요청을 동시에 시작 (야구를 미리 받아두어 지연 최소화)
      const fbP = fetch('/api/premium-picks')
        .then((r) => r.json())
        .catch(() => null)
      const bbCtrl = new AbortController()
      const bbTimeout = setTimeout(() => bbCtrl.abort(), 10000)
      const bbP = fetch('/api/baseball/matches', { signal: bbCtrl.signal })
        .then((r) => r.json())
        .catch(() => null)

      try {
        // 1) 축구 프리미엄 픽이 있으면 즉시 표시 (야구 대기 안 함)
        const fb = await fbP
        const fv = buildFootball((fb?.picks || [])[0])
        if (fv) {
          bbCtrl.abort() // 야구 불필요 → 취소
          clearTimeout(bbTimeout)
          if (!cancel) {
            setView(fv)
            setLoading(false)
          }
          return
        }

        // 2) 축구 픽 없으면 (이미 진행 중인) 야구 결과 사용
        const bb = await bbP
        clearTimeout(bbTimeout)
        const list = bb?.matches || bb?.data || (Array.isArray(bb) ? bb : [])
        if (!cancel) {
          setView(buildBaseball(list))
          setLoading(false)
        }
      } catch {
        clearTimeout(bbTimeout)
        if (!cancel) setLoading(false)
      }
    })()

    // 적중률 — 비차단 + 5초 타임아웃
    ;(async () => {
      try {
        const c = new AbortController()
        const id = setTimeout(() => c.abort(), 5000)
        const res = await fetch('/api/accuracy-stats', { signal: c.signal }).then((r) => r.json())
        clearTimeout(id)
        const acc =
          res?.accuracy ?? res?.overall?.accuracy ?? res?.pickAccuracy ?? res?.stats?.accuracy ?? null
        if (!cancel && typeof acc === 'number') setAccuracy(Math.round(acc))
      } catch {
        /* noop */
      }
    })()

    return () => {
      cancel = true
    }
  }, [isKo])

  const sportLabel = view?.sport === 'baseball' ? (isKo ? '야구' : 'Baseball') : isKo ? '축구' : 'Football'

  const Header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[#A3FF4C]" />
        <span className="text-xs font-semibold tracking-wide text-gray-200">
          {isKo ? '오늘의 추천 경기' : 'Recommended match'}
        </span>
        {view && (
          <span className="rounded-md bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
            {sportLabel}
          </span>
        )}
      </div>
      {accuracy != null && (
        <span className="text-[10px] font-medium text-gray-400">
          {isKo ? '적중률' : 'Hit rate'} <span className="text-[#A3FF4C]">{accuracy}%</span>
        </span>
      )}
    </div>
  )

  // 로딩 중에도 카드 틀(헤더)을 바로 노출 — 빈 박스 대신
  if (loading) {
    return (
      <div className="flex h-full min-h-[230px] flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-4">
        {Header}
        <div className="flex flex-1 items-center justify-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-gray-700 border-t-[#A3FF4C]" />
        </div>
      </div>
    )
  }

  if (!view) {
    return (
      <div className="flex h-full min-h-[230px] flex-col gap-3 rounded-2xl border border-gray-800 bg-gray-900 p-4">
        {Header}
        <div className="flex flex-1 items-center justify-center text-center text-sm text-gray-500">
          {isKo ? '오늘 추천 경기 준비 중입니다' : 'No recommended match today'}
        </div>
      </div>
    )
  }

  const conf = typeof view.confidence === 'number' ? view.confidence : null

  return (
    <div className="relative flex h-full min-h-[230px] flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-4">
      {Header}

      <div className={`flex flex-1 flex-col gap-4 ${isPremium ? '' : 'pointer-events-none select-none blur-[7px]'}`}>
        {/* 매치업 */}
        <div className="flex items-center justify-around gap-2">
          <div className="flex flex-1 flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={view.homeLogo} alt={view.homeTeam} className="h-11 w-11 object-contain" />
            <span className="line-clamp-1 text-center text-xs text-gray-300">{view.homeTeam}</span>
          </div>
          <span className="text-[11px] font-medium text-gray-600">VS</span>
          <div className="flex flex-1 flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={view.awayLogo} alt={view.awayTeam} className="h-11 w-11 object-contain" />
            <span className="line-clamp-1 text-center text-xs text-gray-300">{view.awayTeam}</span>
          </div>
        </div>

        {/* 추천 */}
        <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">{isKo ? '추천' : 'Pick'}</span>
            {view.grade && (
              <span className="rounded-md bg-[#A3FF4C]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#A3FF4C]">
                {view.grade}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-[#A3FF4C]">{view.pickedTeam}</span>
            {view.oddsText && <span className="text-xs text-gray-400">{view.oddsText}</span>}
          </div>

          {conf != null && (
            <div className="mt-2.5">
              <div className="mb-1 flex items-center justify-between text-[10px] text-gray-500">
                <span>{isKo ? '신뢰도' : 'Confidence'}</span>
                <span className="font-medium text-gray-300">{conf}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                <div className="h-full rounded-full bg-[#A3FF4C]" style={{ width: `${conf}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 비프리미엄 CTA 오버레이 */}
      {!isPremium && (
        <a
          href={`/${locale}/${isLoggedIn ? 'premium/pricing' : 'signup'}`}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/60 text-center backdrop-blur-[1px]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-200" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="px-4 text-sm font-semibold text-white">
            {isLoggedIn ? (isKo ? '프리미엄으로 추천 경기 확인' : 'Unlock with Premium') : (isKo ? '회원가입하고 추천 경기 확인' : 'Sign up to see the PICK')}
          </span>
          <span className="rounded-full bg-[#A3FF4C] px-4 py-1.5 text-xs font-bold text-black">
            {isLoggedIn ? (isKo ? '구독하기' : 'Subscribe') : (isKo ? '무료 가입' : 'Sign up')}
          </span>
        </a>
      )}
    </div>
  )
}
