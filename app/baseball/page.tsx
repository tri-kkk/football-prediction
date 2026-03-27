'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useLanguage } from '../contexts/LanguageContext'
import AdBanner from '../components/AdBanner'

// =====================================================
// 타입 정의
// =====================================================
interface Match {
  id: number
  league: string
  leagueName: string
  date: string
  time: string
  timestamp: string
  homeTeam: string
  homeTeamKo: string
  homeLogo: string
  homeScore: number | null
  awayTeam: string
  awayTeamKo: string
  awayLogo: string
  awayScore: number | null
  status: string
  innings: {
    home: Record<string, number | null>
    away: Record<string, number | null>
  } | null
  odds: {
    homeWinProb: number
    awayWinProb: number
    homeWinOdds: number
    awayWinOdds: number
    overUnderLine: number
    overOdds: number
    underOdds: number
  } | null
  mlPrediction: {
    homeWinProb: number
    awayWinProb: number
  } | null
}

interface NewsArticle {
  id: string
  title: string
  description: string
  imageUrl: string
  url: string
  source: string
  publishedAt: string
}

interface NewsCategory {
  id: string
  name: string
  nameKo: string
  nameEn: string
  displayName: string
  logo: string
  hasImage: boolean
  articles: NewsArticle[]
}

// =====================================================
// 상수
// =====================================================
const LEAGUE_COLORS: Record<string, string> = {
  WBC: 'bg-gradient-to-r from-purple-600 to-indigo-600',
  KBO: 'bg-red-500',
  NPB: 'bg-orange-500', 
  MLB: 'bg-blue-600',
  CPBL: 'bg-purple-500',
}

// 팀 로고 컴포넌트
function TeamLogo({ 
  src, 
  team, 
  size = 'md',
  className = ''
}: { 
  src?: string
  team: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
    xl: 'w-20 h-20 text-base',
  }
  
  if (src) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-white flex items-center justify-center flex-shrink-0 p-0.5 ${className}`}>
        <img 
          src={src} 
          alt={team} 
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      </div>
    )
  }
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-400 flex-shrink-0 border-2 border-gray-800 ${className}`}>
      {team.slice(0, 2)}
    </div>
  )
}

// 시간 포맷 함수
function formatTimeAgo(dateString: string, lang: 'ko' | 'en'): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffHours < 1) {
    return lang === 'ko' ? '방금 전' : 'Just now'
  } else if (diffHours < 24) {
    return lang === 'ko' ? `${diffHours}시간 전` : `${diffHours}h ago`
  } else if (diffDays < 7) {
    return lang === 'ko' ? `${diffDays}일 전` : `${diffDays}d ago`
  } else {
    return date.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })
  }
}

// 사용자 브라우저 시간대로 날짜 자동 변환
function formatMatchDate(timestamp: string): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return ''
  
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const dow = days[date.getDay()]
  return `${month}-${day} (${dow})`
}

// 사용자 브라우저 시간대로 시간 자동 변환
function formatMatchTime(timestamp: string): string {
  if (!timestamp) return 'TBD'
  
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return 'TBD'
  
  const time = date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  
  return time === '00:00' ? 'TBD' : time.slice(0, 5)
}

// =====================================================
// 순위 타입
// =====================================================
// =====================================================
// 메인 컴포넌트
// =====================================================
export default function BaseballMainPage() {
  const { language } = useLanguage()
  const { data: session } = useSession()
  const isPremium = (session?.user as any)?.tier === 'premium'
  const isLoggedIn = !!session?.user
  const [newsLeague, setNewsLeague] = useState('ALL')
  const [scheduleLeague, setScheduleLeague] = useState('ALL')
  const [pickTab, setPickTab] = useState<'ALL' | 'MLB' | 'KBO' | 'NPB'>('ALL')
  const [matches, setMatches] = useState<Match[]>([])
  const [scheduledMatches, setScheduledMatches] = useState<Match[]>([]) // 비라이브 (목록 렌더용)
  const [liveMatches, setLiveMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [newsCategories, setNewsCategories] = useState<NewsCategory[]>([])
  const [newsLoading, setNewsLoading] = useState(true)
  const tickerRef = useRef<HTMLDivElement>(null)

  // 오늘 경기 전체 (FT + IN + NS 모두) 한 번 가져오기
  useEffect(() => {
    async function fetchLive() {
      try {
        const response = await fetch('/api/baseball/live')
        const data = await response.json()
        if (data.success) {
          const live: Match[] = data.matches.map((m: any) => ({
            id: m.id,
            league: m.league,
            leagueName: m.leagueName,
            date: m.date,
            time: null,
            timestamp: String(m.timestamp),
            homeTeam: m.homeTeam,
            homeTeamKo: m.homeTeamKo || m.homeTeam,
            homeLogo: m.homeLogo,
            homeScore: m.homeScore,
            awayTeam: m.awayTeam,
            awayTeamKo: m.awayTeamKo || m.awayTeam,
            awayLogo: m.awayLogo,
            awayScore: m.awayScore,
            status: m.status,
            innings: m.innings,
            odds: null,
          }))
          setLiveMatches(live)
        }
      } catch (err) {
        console.error('Failed to fetch live matches:', err)
      }
    }

    async function fetchMatches() {
      setLoading(true)
      try {
        const response = await fetch('/api/baseball/matches?status=today&limit=50')
        const data = await response.json()
        if (data.success) {
          const live = data.matches.filter((m: Match) => m.status?.startsWith('IN'))
          const rest = data.matches.filter((m: Match) => !m.status?.startsWith('IN'))
          setLiveMatches(live)
          setScheduledMatches(rest)

          const hasPickable = data.matches.some((m: Match) => m.status === 'NS' && (m.odds || m.mlPrediction))
          if (hasPickable) {
            setMatches(data.matches)
          } else {
            const nextRes = await fetch('/api/baseball/matches?status=scheduled&limit=20')
            const nextData = await nextRes.json()
            if (nextData.success && nextData.matches.length > 0) {
              setMatches(nextData.matches)
            } else {
              setMatches(data.matches)
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch matches:', err)
      } finally {
        setLoading(false)
      }
      // DB 로드 직후 바로 live 상태 동기화
      await fetchLive()
    }

    fetchMatches()
    // 이후 30초마다 live 갱신
    const interval = setInterval(fetchLive, 30000)
    return () => clearInterval(interval)
  }, [])

  // API에서 뉴스 데이터 가져오기
  useEffect(() => {
    async function fetchNews() {
      setNewsLoading(true)
      try {
        const url = `/api/baseball/news?ui=${language}`
        const response = await fetch(url)
        const data = await response.json()
        
        if (data.success && data.categories) {
          setNewsCategories(data.categories)
        }
      } catch (err) {
        console.error('Failed to fetch news:', err)
      } finally {
        setNewsLoading(false)
      }
    }
    
    fetchNews()
  }, [language])

  // 필터링된 뉴스 기사들
  const filteredNewsArticles = newsLeague === 'ALL'
    ? newsCategories.flatMap(cat => cat.articles).slice(0, 6)
    : newsCategories
        .filter(cat => cat.name.toUpperCase().includes(newsLeague))
        .flatMap(cat => cat.articles)
        .slice(0, 6)

  // 피처드 뉴스 (이미지 있는 것 우선)
  const featuredNews = filteredNewsArticles.filter(a => a.imageUrl).slice(0, 2)
  const listNews = filteredNewsArticles.filter(a => !featuredNews.includes(a)).slice(0, 4)

  // TOP PICKS 선정 (확률 차이 큰 상위 5개 경기)
  // TOP PICKS - 확률 차이 큰 상위 경기들
  const sortByDateThenProb = (a: any, b: any) => {
    const dateA = new Date(a.timestamp || a.date || '').getTime()
    const dateB = new Date(b.timestamp || b.date || '').getTime()
    if (dateA !== dateB) return dateA - dateB
    const probA = a.mlPrediction || a.odds
    const probB = b.mlPrediction || b.odds
    const diffA = Math.abs((probA?.homeWinProb || 50) - (probA?.awayWinProb || 50))
    const diffB = Math.abs((probB?.homeWinProb || 50) - (probB?.awayWinProb || 50))
    return diffB - diffA
  }

  const topPicks = matches.length > 0 
    ? [...matches]
        .filter(m => m.status === 'NS' && (m.odds || m.mlPrediction))
        .sort(sortByDateThenProb)
        .slice(0, 5)
    : []

  const upcomingPicks = matches
    .filter(m => m.status === 'NS' && (m.odds || m.mlPrediction))
    .sort(sortByDateThenProb)
    .slice(0, 5)

  // 종료된 경기 (결과용) - scheduledMatches(오늘 경기 전체)에서 FT만
  const finishedPicks = scheduledMatches
    .filter(m => m.odds && m.status === 'FT')
    .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())
    .slice(0, 5)

  // 적중률 계산 - 오늘 날짜 종료 경기 전체 기준
  const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0] // KST 오늘
  const todayMonth = todayStr.slice(5, 7)
  const todayDay = todayStr.slice(8, 10)
  const todayFinished = scheduledMatches.filter(m => m.odds && m.status === 'FT')
  const predictionResults = todayFinished.map(match => {
    const predictedHome = (match.odds?.homeWinProb || 0) > (match.odds?.awayWinProb || 0)
    const actualHome = (match.homeScore ?? 0) > (match.awayScore ?? 0)
    const isDraw = (match.homeScore ?? 0) === (match.awayScore ?? 0)
    return {
      match,
      correct: !isDraw && predictedHome === actualHome,
      isDraw,
    }
  })

  const correctCount = predictionResults.filter(r => r.correct).length
  const totalCount = predictionResults.filter(r => !r.isDraw).length
  const accuracyRate = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

  return (
    <div className={`min-h-screen bg-[#0f0f0f]${isPremium ? ' premium-no-ads' : ''}`}>
      {/* 프리미엄 자동광고 숨김 */}
      {isPremium && (
        <style>{`
          .premium-no-ads ins.adsbygoogle,
          .premium-no-ads [id^="google_ads"],
          .premium-no-ads iframe[id^="aswift"] {
            display: none !important;
            height: 0 !important;
          }
        `}</style>
      )}
      
      {/* ===== 라이브 스코어 (진행중 경기가 있을 때만 표시) ===== */}
      {liveMatches.some(m => m.status?.startsWith('IN')) && (
      <div className="bg-gray-900 border-b border-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center">
          {/* LIVE SCORE 라벨 */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-r border-gray-800 bg-gray-800">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-xs font-bold text-white whitespace-nowrap">LIVE SCORE</span>
          </div>
          
          {/* 왼쪽 화살표 */}
          <button
            onClick={() => {
              if (tickerRef.current) {
                tickerRef.current.scrollBy({ left: -220, behavior: 'smooth' })
              }
            }}
            className="flex-shrink-0 p-2 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div 
            ref={tickerRef}
            className="flex-1 flex overflow-x-auto scrollbar-hide"
          >
            {loading ? (
              <div className="flex items-center justify-center w-full py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
              </div>
            ) : liveMatches.length === 0 && scheduledMatches.length === 0 ? (
              <div className="flex items-center justify-center w-full py-4 text-gray-400 text-sm">
                {language === 'ko' ? '오늘 예정된 경기가 없습니다' : 'No games scheduled today'}
              </div>
            ) : (
              // 라이브 경기 먼저, 그다음 예정 경기
              (() => {
                const liveIds = new Set(liveMatches.map(m => m.id))
                const deduped = [...liveMatches, ...scheduledMatches.filter(m => !liveIds.has(m.id))].slice(0, 10)
                return deduped
              })().map((match) => {
                const isLive = match.status?.startsWith('IN')
                // 이닝 번호 추출 (IN1 → 1회, IN3 → 3회)
                const inningNum = isLive ? match.status.replace('IN', '') : null
                return (
                  <Link
                    key={match.id}
                    href={`/baseball/${match.id}`}
                    className={`flex-shrink-0 flex items-center gap-3 px-5 py-3 border-r border-gray-800 hover:bg-gray-800 transition-colors min-w-[220px] ${isLive ? 'bg-gray-800/60' : ''}`}
                  >
                    {/* 리그 뱃지 */}
                    <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded shadow-sm ${LEAGUE_COLORS[match.league]}`}>
                      {match.league}
                    </span>
                    
                    {/* 팀 & 스코어 */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <TeamLogo src={match.awayLogo} team={match.awayTeamKo} size="sm" />
                          <span className={`text-sm truncate ${
                            match.status === 'FT' && (match.awayScore ?? 0) > (match.homeScore ?? 0)
                              ? 'font-bold text-white' : 'text-gray-200'
                          }`}>
                            {language === 'ko' ? (match.awayTeamKo || match.awayTeam) : match.awayTeam}
                          </span>
                        </div>
                        <span className={`font-mono font-bold text-base flex-shrink-0 ml-auto ${
                          isLive ? 'text-white' :
                          match.status === 'FT' && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? 'text-white' : 'text-gray-200'
                        }`}>
                          {match.awayScore ?? '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <TeamLogo src={match.homeLogo} team={match.homeTeamKo} size="sm" />
                          <span className={`text-sm truncate ${
                            match.status === 'FT' && (match.homeScore ?? 0) > (match.awayScore ?? 0)
                              ? 'font-bold text-white' : 'text-gray-200'
                          }`}>
                            {language === 'ko' ? (match.homeTeamKo || match.homeTeam) : match.homeTeam}
                          </span>
                        </div>
                        <span className={`font-mono font-bold text-base flex-shrink-0 ml-auto ${
                          isLive ? 'text-white' :
                          match.status === 'FT' && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? 'text-white' : 'text-gray-200'
                        }`}>
                          {match.homeScore ?? '-'}
                        </span>
                      </div>
                    </div>
                    
                    {/* 상태 */}
                    <div className="text-right w-14 flex-shrink-0">
                      {isLive ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="flex items-center gap-1">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                            </span>
                            <span className="text-[10px] font-black text-red-400">LIVE</span>
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {language === 'ko' ? `${inningNum}회` : `${inningNum}th`}
                          </span>
                        </div>
                      ) : match.status === 'FT' ? (
                        <span className="text-xs text-gray-400 font-medium">Final</span>
                      ) : (
                        <span className="text-xs text-gray-200 font-medium">{match.time?.slice(0, 5)}</span>
                      )}
                    </div>
                  </Link>
                )
              })
            )}
          </div>
          
          {/* 오른쪽 화살표 */}
          <button
            onClick={() => {
              if (tickerRef.current) {
                tickerRef.current.scrollBy({ left: 220, behavior: 'smooth' })
              }
            }}
            className="flex-shrink-0 p-2 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      )}

      {/* ===== 메인 컨텐츠 ===== */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 사이드 배너 + 본문 레이아웃 */}
        <div className="flex gap-0 relative">
          {/* 사이드 직광고 배너 (xl 이상, 좌측 외부 배치) */}
          <aside className="hidden xl:block" style={{ position: 'absolute', left: '-320px', width: '300px', minHeight: '600px' }}>
            <div className="sticky top-20">
              <AdBanner slot="sidebar" />
            </div>
          </aside>

          {/* 본문 */}
          <div className="flex-1 min-w-0 space-y-8">
        {/* ===== 적중률 히어로 배너 ===== */}
        {totalCount > 0 && (
          <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #0c1929 0%, #162544 50%, #0f1d35 100%)' }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(16,185,129,0.2) 0%, transparent 50%)' }} />
            <div className="relative px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                  <span className="text-2xl">⚾</span>
                </div>
                <div>
                  <p className="text-xs text-blue-400 font-semibold tracking-wide mb-0.5">
                    {language === 'ko' ? `${todayMonth}/${todayDay} AI 분석 정확도` : `${todayMonth}/${todayDay} AI Analysis Accuracy`}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white tabular-nums">{accuracyRate}%</span>
                    <span className="text-sm text-gray-400 font-medium">({correctCount}/{totalCount})</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[11px] text-gray-500 mb-1">{language === 'ko' ? '일치' : 'Match'}</p>
                  <p className="text-lg font-bold text-blue-400 tabular-nums">{correctCount}</p>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div className="text-right">
                  <p className="text-[11px] text-gray-500 mb-1">{language === 'ko' ? '미일치' : 'Missed'}</p>
                  <p className="text-lg font-bold text-red-400 tabular-nums">{totalCount - correctCount}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== AI 추천 경기 ===== */}
        <section>
          {/* 섹션 헤더 + 탭 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full bg-blue-500" />
              <h2 className="text-lg font-bold text-white">
                {language === 'ko' ? 'AI 추천 경기' : 'AI Picks'}
              </h2>
            </div>
            <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
              {(['ALL', 'MLB', 'KBO', 'NPB'] as const).map(tab => {
                const count = tab === 'ALL' ? topPicks.length : topPicks.filter(m => m.league === tab).length
                if (tab !== 'ALL' && count === 0) return null
                return (
                  <button
                    key={tab}
                    onClick={() => setPickTab(tab)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      pickTab === tab
                        ? 'bg-gray-900 text-white shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 추천 경기 카드 */}
          {(() => {
            const filtered = pickTab === 'ALL' ? topPicks : topPicks.filter(m => m.league === pickTab)
            return filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              {filtered.slice(0, 3).map((match, index) => {
                const homeProb = match.mlPrediction?.homeWinProb ?? match.odds?.homeWinProb ?? 50
                const awayProb = match.mlPrediction?.awayWinProb ?? match.odds?.awayWinProb ?? 50
                const homeWins = homeProb >= awayProb
                const winnerIsHome = (match.homeScore ?? 0) > (match.awayScore ?? 0)
                const isBest = index === 0
                const isLocked = isBest && !isPremium

                return (
                  <div key={match.id} className="relative">
                    <Link
                      href={isLocked
                        ? (isLoggedIn ? '/premium/pricing' : '/login')
                        : `/baseball/${match.id}`}
                      className="block relative overflow-hidden rounded-xl transition-all group border hover:border-blue-500/40"
                      style={{
                        background: 'linear-gradient(160deg, #161d30 0%, #0f1520 100%)',
                        borderColor: isBest ? 'rgba(251,191,36,0.25)' : 'rgba(55,65,81,0.4)'
                      }}
                    >
                      {/* 상단 컬러 바 */}
                      <div className={`h-[3px] ${LEAGUE_COLORS[match.league]}`} />

                      <div className={`px-5 pt-4 pb-5 ${isLocked ? 'select-none' : ''}`}>
                        {/* 뱃지 + 시간 */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-1.5">
                            {isBest && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 text-amber-900">
                                BEST
                              </span>
                            )}
                            <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded ${LEAGUE_COLORS[match.league]}`}>
                              {match.league}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 tabular-nums font-medium">
                            {formatMatchDate(match.timestamp)} {formatMatchTime(match.timestamp)}
                          </span>
                        </div>

                        {/* 팀 대결 */}
                        <div className={`flex items-center ${isLocked ? 'blur-[2px]' : ''}`}>
                          {/* 원정팀 */}
                          <div className="flex-1 flex flex-col items-center gap-2">
                            <TeamLogo src={match.awayLogo} team={match.awayTeamKo} size="lg" />
                            <span className="text-sm font-bold text-center leading-snug text-white">
                              {language === 'ko' ? (match.awayTeamKo || match.awayTeam) : match.awayTeam}
                            </span>
                            {match.status === 'FT' ? (
                              <span className={`text-2xl font-black tabular-nums ${!winnerIsHome ? 'text-white' : 'text-gray-600'}`}>
                                {match.awayScore}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500 font-medium">원정</span>
                            )}
                          </div>

                          {/* 가운데 */}
                          <div className="w-12 flex-shrink-0 flex items-center justify-center">
                            {match.status === 'FT' ? (
                              <span className="text-[10px] font-bold text-gray-600 tracking-widest">FINAL</span>
                            ) : (
                              <span className="text-base font-black text-gray-700">VS</span>
                            )}
                          </div>

                          {/* 홈팀 */}
                          <div className="flex-1 flex flex-col items-center gap-2">
                            <TeamLogo src={match.homeLogo} team={match.homeTeamKo} size="lg" />
                            <span className="text-sm font-bold text-center leading-snug text-white">
                              {language === 'ko' ? (match.homeTeamKo || match.homeTeam) : match.homeTeam}
                            </span>
                            {match.status === 'FT' ? (
                              <span className={`text-2xl font-black tabular-nums ${winnerIsHome ? 'text-white' : 'text-gray-600'}`}>
                                {match.homeScore}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500 font-medium">홈</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* 🔒 BEST 카드 잠금 오버레이 */}
                    {isLocked && (
                      <div
                        className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-2.5 pointer-events-none"
                        style={{ background: 'rgba(10,13,22,0.82)', backdropFilter: 'blur(3px)' }}
                      >
                        <div className="absolute inset-0 rounded-xl"
                          style={{ border: '1px solid rgba(251,191,36,0.3)', boxShadow: '0 0 20px rgba(251,191,36,0.06) inset' }} />
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">🔒</span>
                          <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>
                            {language === 'ko' ? 'BEST PICK 프리미엄 전용' : 'BEST PICK · Premium Only'}
                          </span>
                        </div>
                        <p className="text-[11px] text-center px-6" style={{ color: '#64748b' }}>
                          {isLoggedIn
                            ? (language === 'ko' ? '탭하여 구독 페이지로 이동' : 'Tap to upgrade')
                            : (language === 'ko' ? '탭하여 로그인' : 'Tap to sign in')}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            ) : (
              <div className="rounded-xl border border-gray-800/50 p-8 text-center text-gray-500 text-sm">
                {language === 'ko' ? '해당 리그 추천 경기가 없습니다' : 'No picks available'}
              </div>
            )
          })()}

          {/* 오늘의 AI 픽 리스트 */}
          {(() => {
            const filteredUpcoming = (pickTab === 'ALL' ? upcomingPicks : upcomingPicks.filter(m => m.league === pickTab))
            return filteredUpcoming.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.2)' }}>
              <div className="bg-gray-900 rounded-b-xl overflow-hidden">
                {filteredUpcoming.map((match, idx) => (
                  <Link
                    key={match.id}
                    href={`/baseball/${match.id}`}
                    className="flex items-center px-3 py-3 hover:bg-gray-800/60 transition-colors group gap-2"
                    style={{ borderTop: idx > 0 ? '1px solid #1f2937' : 'none' }}
                  >
                    {/* 리그+날짜+시간 2줄 */}
                    <div className="flex-shrink-0 flex flex-col gap-0.5 w-[60px]">
                      <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded self-start ${LEAGUE_COLORS[match.league]}`}>
                        {match.league}
                      </span>
                      <div className="flex flex-col leading-tight">
                        <span className="text-[10px] text-gray-400 tabular-nums">{formatMatchDate(match.timestamp)}</span>
                        <span className="text-[10px] text-blue-400 tabular-nums font-medium">{formatMatchTime(match.timestamp)}</span>
                      </div>
                    </div>

                    {/* 원정(위) + 홈(아래) 2줄 */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <TeamLogo src={match.awayLogo} team={match.awayTeamKo} size="sm" />
                        <span className="text-sm font-medium text-gray-300 truncate">
                          {language === 'ko' ? (match.awayTeamKo || match.awayTeam) : match.awayTeam}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TeamLogo src={match.homeLogo} team={match.homeTeamKo} size="sm" />
                        <span className="text-sm font-medium text-gray-400 truncate">
                          {language === 'ko' ? (match.homeTeamKo || match.homeTeam) : match.homeTeam}
                        </span>
                      </div>
                    </div>

                    {/* 화살표 */}
                    <span className="text-gray-600 group-hover:text-gray-300 transition-colors text-sm flex-shrink-0">›</span>
                  </Link>
                ))}
              </div>
            </div>
            )
          })()}

        </section>

        {/* ===== 직광고 배너 - AI 추천 카드 하단 ===== */}
        {/* 데스크톱 배너 (728x90) */}
        <div className="hidden lg:flex justify-center w-full">
          <AdBanner slot="desktop_banner" />
        </div>
        {/* 📱 모바일 인피드 배너 (320x50) */}
        <div className="block lg:hidden w-full flex justify-center">
          <AdBanner slot="mobile_bottom" />
        </div>

        {/* ===== 최근 결과 ===== */}
        {finishedPicks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full bg-emerald-500" />
                <h2 className="text-lg font-bold text-white">
                  {language === 'ko' ? '최근 결과' : 'Recent Results'}
                </h2>
              </div>
              <Link href="/baseball/results" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                {language === 'ko' ? '전체보기 →' : 'View All →'}
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {predictionResults.slice(0, 6).map(({ match, correct, isDraw }) => {
                const homeWin = (match.homeScore ?? 0) > (match.awayScore ?? 0)

                return (
                  <Link
                    key={match.id}
                    href={`/baseball/${match.id}`}
                    className="group block rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-200"
                    style={{
                      border: `1px solid ${isDraw ? 'rgba(107,114,128,0.25)' : correct ? 'rgba(59,130,246,0.25)' : 'rgba(239,68,68,0.25)'}`,
                      background: '#111827',
                    }}
                  >
                    <div className="p-4 pb-5">
                      {/* 상단: 리그 + 결과 뱃지 */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded ${LEAGUE_COLORS[match.league]}`}>
                          {match.league}
                        </span>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                          isDraw
                            ? 'bg-gray-800 text-gray-400'
                            : correct
                              ? 'bg-blue-950/80 text-blue-400'
                              : 'bg-red-950/60 text-red-400'
                        }`}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                            isDraw
                              ? 'bg-gray-600 text-gray-300'
                              : correct
                                ? 'bg-blue-500 text-white'
                                : 'bg-red-500 text-white'
                          }`}>
                            {isDraw ? '−' : correct ? '✓' : '✗'}
                          </span>
                          <span className="text-[11px] font-bold">
                            {isDraw
                              ? (language === 'ko' ? '무승부' : 'DRAW')
                              : correct
                                ? (language === 'ko' ? '일치' : 'MATCH')
                                : (language === 'ko' ? '미일치' : 'MISSED')
                            }
                          </span>
                        </div>
                      </div>

                      {/* 팀 대결 - 세로 레이아웃 */}
                      <div className="flex items-center">
                        {/* 원정팀 */}
                        <div className="flex-1 flex items-center gap-2.5 min-w-0">
                          <TeamLogo src={match.awayLogo} team={match.awayTeamKo} size="lg" />
                          <div className="min-w-0">
                            <span className={`text-[13px] font-bold block truncate ${!homeWin && !isDraw ? 'text-white' : 'text-gray-500'}`}>
                              {language === 'ko' ? (match.awayTeamKo || match.awayTeam) : match.awayTeam}
                            </span>
                          </div>
                        </div>

                        {/* 스코어 중앙 */}
                        <div className="flex-shrink-0 flex items-center gap-2 px-3">
                          <span className={`text-2xl font-black tabular-nums ${!homeWin && !isDraw ? 'text-white' : 'text-gray-600'}`}>
                            {match.awayScore}
                          </span>
                          <span className="text-gray-700 text-xs font-bold">:</span>
                          <span className={`text-2xl font-black tabular-nums ${homeWin ? 'text-white' : 'text-gray-600'}`}>
                            {match.homeScore}
                          </span>
                        </div>

                        {/* 홈팀 */}
                        <div className="flex-1 flex items-center gap-2.5 min-w-0 justify-end">
                          <div className="min-w-0 text-right">
                            <span className={`text-[13px] font-bold block truncate ${homeWin ? 'text-white' : 'text-gray-500'}`}>
                              {language === 'ko' ? (match.homeTeamKo || match.homeTeam) : match.homeTeam}
                            </span>
                          </div>
                          <TeamLogo src={match.homeLogo} team={match.homeTeamKo} size="lg" />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ===== 경기 스케줄 ===== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full bg-amber-500" />
              <h2 className="text-lg font-bold text-white">
                {language === 'ko' ? '경기 스케줄' : 'Game Schedule'}
              </h2>
            </div>
            <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
              {['ALL', 'KBO', 'NPB', 'MLB', 'CPBL'].map((league) => (
                <button
                  key={league}
                  onClick={() => setScheduleLeague(league)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    scheduleLeague === league
                      ? 'bg-gray-900 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {league === 'ALL' ? (language === 'ko' ? '전체' : 'All') : league}
                </button>
              ))}
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              {(() => {
                const liveIds = new Set(liveMatches.map(m => m.id))
                return [...liveMatches, ...scheduledMatches.filter(m => !liveIds.has(m.id))]
              })()
                .filter(m => scheduleLeague === 'ALL' || m.league === scheduleLeague)
                .slice(0, 10)
                .map((match, idx, arr) => {
                  const isLive = match.status?.startsWith('IN')
                  const inningNum = isLive ? match.status.replace('IN', '') : null
                  return (
                  <Link
                    key={match.id}
                    href={`/baseball/${match.id}`}
                    className="flex items-center px-3 py-3 hover:bg-gray-800/60 transition-colors group gap-2"
                    style={{ borderTop: idx > 0 ? '1px solid #1f2937' : 'none' }}
                  >
                    {/* 리그+날짜+시간 2줄 */}
                    <div className="flex-shrink-0 flex flex-col gap-0.5 w-[60px]">
                      <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded self-start ${LEAGUE_COLORS[match.league]}`}>
                        {match.league}
                      </span>
                      {isLive ? (
                        <div className="flex items-center gap-1">
                          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                          </span>
                          <span className="text-[10px] font-black text-red-400">
                            LIVE {inningNum}{language === 'ko' ? '회' : 'th'}
                          </span>
                        </div>
                      ) : match.status === 'FT' ? (
                        <span className="text-[10px] text-gray-500">Final</span>
                      ) : (
                        <div className="flex flex-col leading-tight">
                          <span className="text-[10px] text-gray-400 tabular-nums">{formatMatchDate(match.timestamp)}</span>
                          <span className="text-[10px] text-blue-400 tabular-nums font-medium">{formatMatchTime(match.timestamp)}</span>
                        </div>
                      )}
                    </div>

                    {/* 원정(위) + 홈(아래) 2줄 */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <TeamLogo src={match.awayLogo} team={match.awayTeamKo} size="sm" />
                        <span className={`text-sm font-medium truncate ${
                          (isLive || match.status === 'FT') && (match.awayScore ?? 0) > (match.homeScore ?? 0)
                            ? 'text-white font-bold' : 'text-gray-300'
                        }`}>
                          {language === 'ko' ? (match.awayTeamKo || match.awayTeam) : match.awayTeam}
                        </span>
                        {(isLive || match.status === 'FT') && (
                          <span className="ml-auto text-sm font-black tabular-nums text-white flex-shrink-0">{match.awayScore}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <TeamLogo src={match.homeLogo} team={match.homeTeamKo} size="sm" />
                        <span className={`text-sm font-medium truncate ${
                          (isLive || match.status === 'FT') && (match.homeScore ?? 0) > (match.awayScore ?? 0)
                            ? 'text-white font-bold' : 'text-gray-400'
                        }`}>
                          {language === 'ko' ? (match.homeTeamKo || match.homeTeam) : match.homeTeam}
                        </span>
                        {(isLive || match.status === 'FT') && (
                          <span className="ml-auto text-sm font-black tabular-nums text-white flex-shrink-0">{match.homeScore}</span>
                        )}
                      </div>
                    </div>

                    {/* 화살표 */}
                    <span className="text-gray-700 group-hover:text-gray-400 transition-colors text-sm flex-shrink-0">›</span>
                  </Link>
                )}
              )}
            </div>
          )}
          
          {/* 더보기 */}
          <div className="mt-4 text-center">
            <Link
              href="/baseball/results"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-800/80 hover:bg-gray-700 rounded-xl text-sm text-gray-400 hover:text-white font-medium transition-all border border-gray-700/50"
            >
              {language === 'ko' ? '전체 일정 보기' : 'View All Schedule'} →
            </Link>
          </div>
        </section>

        {/* ===== 뉴스 섹션 ===== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full bg-purple-500" />
              <h2 className="text-lg font-bold text-white">
                {language === 'ko' ? '야구 뉴스' : 'Baseball News'}
              </h2>
            </div>

            {/* 리그 필터 */}
            <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
              {['ALL', 'KBO', 'MLB', 'NPB'].map((league) => (
                <button
                  key={league}
                  onClick={() => setNewsLeague(league)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    newsLeague === league
                      ? 'bg-gray-900 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {league === 'ALL' ? (language === 'ko' ? '전체' : 'All') : league}
                </button>
              ))}
            </div>
          </div>
          
          {newsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
            </div>
          ) : filteredNewsArticles.length === 0 ? (
            <div className="bg-gray-900 rounded-xl shadow-xl shadow-blue-500/10 border border-gray-800 p-8 text-center">
              <p className="text-gray-500">
                {language === 'ko' ? '뉴스를 불러오는 중입니다...' : 'Loading news...'}
              </p>
            </div>
          ) : (
            <>
              {/* 피처드 뉴스 (이미지 있는 2개) */}
              {featuredNews.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {featuredNews.map((news) => (
                    <a
                      key={news.id}
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-xl bg-gray-900 shadow-xl shadow-blue-500/10 hover:shadow-2xl transition-all overflow-hidden border border-gray-800"
                    >
                      {/* 이미지 영역 */}
                      <div className="aspect-video bg-gray-800 relative overflow-hidden">
                        {news.imageUrl ? (
                          <img 
                            src={news.imageUrl} 
                            alt={news.title}
                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
                              <path strokeLinecap="round" strokeWidth="1.5" d="M5.5 12c1.5-2 3.5-3 6.5-3s5 1 6.5 3M5.5 12c1.5 2 3.5 3 6.5 3s5-1 6.5-3"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* 텍스트 */}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-400 font-medium">
                            {news.source}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(news.publishedAt, language)}
                          </span>
                        </div>
                        <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                          {news.title}
                        </h3>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {news.description}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
              
              {/* 일반 뉴스 리스트 */}
              {listNews.length > 0 && (
                <div className="rounded-xl bg-gray-900 shadow-xl shadow-blue-500/10 divide-y divide-gray-200 border border-gray-800">
                  {listNews.map((news) => (
                    <a
                      key={news.id}
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 hover:bg-gray-800 transition-colors group"
                    >
                      {/* 썸네일 */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        {news.imageUrl ? (
                          <img 
                            src={news.imageUrl} 
                            alt={news.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
                              <path strokeLinecap="round" strokeWidth="1.5" d="M5.5 12c1.5-2 3.5-3 6.5-3s5 1 6.5 3M5.5 12c1.5 2 3.5 3 6.5 3s5-1 6.5-3"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* 텍스트 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-400 font-medium">
                            {news.source}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(news.publishedAt, language)}
                          </span>
                        </div>
                        <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                          {news.title}
                        </h3>
                      </div>
                      
                      {/* 화살표 */}
                      <span className="text-gray-300 group-hover:text-emerald-500 transition-colors text-lg flex-shrink-0">→</span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

          </div> {/* 본문 flex-1 */}
        </div> {/* flex wrapper */}
      </main>
      
      {/* 하단 여백 (BottomNavigation 공간) */}
      <div className="h-20 md:h-0" />

    </div>
  )
}