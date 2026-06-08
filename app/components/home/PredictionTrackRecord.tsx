'use client'

// AI 야구 예측 성적표 — 리그 탭(전체/MLB/KBO/NPB)별 적중/실패 + 적중률(CTA).
// 데이터: /api/baseball/prediction-results (baseball_matches FT + baseball_odds_latest AI 예측 조인, CPBL 제외)
// 데이터 없으면 섹션 자체를 숨김. 비회원 전환(무료 가입) 목적.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface Game {
  league: string
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  pickedTeam: string
  confidence: number
  grade: string | null
  correct: boolean
}

interface LeagueStat {
  league: string
  total: number
  correct: number
  accuracy: number | null
}

interface Data {
  league: string
  total: number
  correct: number
  accuracy: number | null
  byLeague: LeagueStat[]
  recent: Game[]
}

// 모바일용 약칭.
// 한국어: 앞 토큰(연고지/브랜드)으로 — 한국식 호칭. 예) "샌프란시스코 자이언츠"→"샌프란시스코", "한화 이글스"→"한화"
// 단, 같은 연고지를 공유하는 팀은 앞 토큰이 겹치므로 닉네임으로 예외 처리.
// 영어: 닉네임(마지막 토큰).
const SHORT_OVERRIDE_KO: Record<string, string> = {
  // MLB — 같은 연고지 공유 팀
  'LA 에인절스': '에인절스',
  '뉴욕 양키스': '양키스',
  '뉴욕 메츠': '메츠',
  '시카고 컵스': '컵스',
  '시카고 화이트삭스': '화이트삭스',
  // NPB — 한국식 호칭(연고지 접두어 제거, 브랜드명)
  '도쿄 야쿠르트 스왈로즈': '야쿠르트',
  '닛폰햄 파이터스': '닛폰햄',
  '주니치 드래곤즈': '주니치',
  '사이타마 세이부 라이온즈': '세이부',
  '히로시마 도요 카프': '히로시마',
  '오릭스 버팔로즈': '오릭스',
  '요코하마 DeNA 베이스타즈': '요코하마',
  '후쿠오카 소프트뱅크 호크스': '소프트뱅크',
  '한신 타이거스': '한신',
  '라쿠텐 골든이글스': '라쿠텐',
  '요미우리 자이언츠': '요미우리',
  '지바 롯데 마린즈': '롯데',
}
const shortName = (name: string, isKo: boolean) => {
  if (!name) return name
  if (isKo && SHORT_OVERRIDE_KO[name]) return SHORT_OVERRIDE_KO[name]
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return isKo ? parts[0] : parts[parts.length - 1]
}

const LEAGUE_LABEL: Record<string, { ko: string; en: string }> = {
  ALL: { ko: '전체', en: 'All' },
  MLB: { ko: 'MLB', en: 'MLB' },
  KBO: { ko: 'KBO', en: 'KBO' },
  NPB: { ko: 'NPB', en: 'NPB' },
}

export default function PredictionTrackRecord({ locale = 'ko' }: { locale?: string }) {
  const isKo = locale !== 'en'
  const { data: session, status } = useSession()
  const isLoggedIn = status === 'authenticated'
  const isPremium = (session?.user as any)?.tier === 'premium'
  const [league, setLeague] = useState('ALL')
  const [data, setData] = useState<Data | null>(null)
  const [tabs, setTabs] = useState<LeagueStat[]>([])
  const [loading, setLoading] = useState(true)
  const [firstLoaded, setFirstLoaded] = useState(false)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    fetch(`/api/baseball/prediction-results?days=7&limit=6&league=${league}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancel || !j?.success) return
        setData(j)
        if (Array.isArray(j.byLeague) && j.byLeague.length) setTabs(j.byLeague) // 항상 전체 리그 집계 → 탭 안정
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) {
          setLoading(false)
          setFirstLoaded(true)
        }
      })
    return () => {
      cancel = true
    }
  }, [league])

  // 첫 로드 전 또는 데이터 없음 → 숨김
  if (!firstLoaded) return null
  if (!tabs.length) return null

  const acc = data?.accuracy ?? 0
  const lbl = (lg: string) => (isKo ? LEAGUE_LABEL[lg]?.ko : LEAGUE_LABEL[lg]?.en) || lg

  // 탭: 전체 + 리그별 (경기 있는 것만)
  const tabList = [{ league: 'ALL' } as any, ...tabs]

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/40">
      {/* 헤더 + 적중률 */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-800 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#A3FF4C]" />
            <h3 className="text-sm font-bold text-white">
              {isKo ? 'AI 야구 예측 성적' : 'AI Baseball Track Record'}
            </h3>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            {isKo ? '최근 일주일 · 매일 갱신' : 'Last 7 days · updated daily'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-3xl font-black leading-none text-emerald-400">
            {acc}
            <span className="text-lg">%</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            {isKo ? `${data?.correct ?? 0}적중 / ${data?.total ?? 0}경기` : `${data?.correct ?? 0} hits / ${data?.total ?? 0}`}
          </div>
        </div>
      </div>

      {/* 리그 탭 */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-gray-800 px-3 py-2.5">
        {tabList.map((t) => {
          const active = league === t.league
          return (
            <button
              key={t.league}
              onClick={() => setLeague(t.league)}
              className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                active
                  ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {lbl(t.league)}
              {t.league !== 'ALL' && typeof t.accuracy === 'number' && (
                <span className={`ml-1 ${active ? 'text-emerald-300/80' : 'text-gray-600'}`}>{t.accuracy}%</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 경기별 적중/실패 */}
      <div className={`divide-y divide-gray-800/60 ${loading ? 'opacity-50' : ''}`}>
        {(data?.recent ?? []).map((g, i) => (
          <div key={i} className="flex items-center gap-2.5 px-4 py-2.5">
            <span className="w-9 shrink-0 text-[10px] font-medium text-gray-500">{g.league}</span>
            <span className="flex-1 truncate text-[13px] text-gray-200">
              {/* 모바일: 약칭 / 데스크톱: 풀네임 */}
              <span className="sm:hidden">{shortName(g.homeTeam, isKo)}</span>
              <span className="hidden sm:inline">{g.homeTeam}</span>{' '}
              <b className="font-semibold text-white">{g.homeScore}</b>
              <span className="mx-1 text-gray-500">:</span>
              <b className="font-semibold text-white">{g.awayScore}</b>{' '}
              <span className="sm:hidden">{shortName(g.awayTeam, isKo)}</span>
              <span className="hidden sm:inline">{g.awayTeam}</span>
            </span>
            <span className="hidden shrink-0 text-[11px] text-gray-500 sm:inline">
              {isKo ? '예측 ' : 'Pick '}
              <b className="font-medium text-gray-300">{g.pickedTeam}</b>
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                g.correct ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
              }`}
            >
              {g.correct ? (isKo ? '적중' : 'Hit') : isKo ? '실패' : 'Miss'}
            </span>
          </div>
        ))}
      </div>

      {/* CTA — 로그인/등급별 분기. 프리미엄은 숨김 */}
      {!isPremium && (
        <a
          href={`/${locale}/${isLoggedIn ? 'premium/pricing' : 'signup'}`}
          className="flex items-center justify-between gap-3 border-t border-gray-800 bg-gray-900/60 p-3.5 transition-colors hover:bg-gray-900"
        >
          <span className="text-[12px] text-gray-300">
            {isLoggedIn
              ? isKo
                ? '프리미엄으로 전 경기 AI 예측을 확인하세요'
                : 'Unlock AI picks for every match with Premium'
              : isKo
              ? '내일 경기 AI 예측, 지금 무료로 받아보세요'
              : 'Get tomorrow’s AI picks — free'}
          </span>
          <span className="shrink-0 rounded-full bg-[#A3FF4C] px-3.5 py-1.5 text-[12px] font-bold text-black">
            {isLoggedIn ? (isKo ? '구독하기 →' : 'Subscribe →') : isKo ? '무료 가입 →' : 'Sign up free →'}
          </span>
        </a>
      )}
    </section>
  )
}
