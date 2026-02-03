'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import LineupWidget from '../../components/LineupWidget'
import { useLanguage } from '../../contexts/LanguageContext'

interface MatchEvent {
  time: number
  type: 'goal' | 'card' | 'subst' | 'var' | 'penalty'
  team: 'home' | 'away'
  player: string
  detail?: string
  assist?: string
}

interface MatchStats {
  shotsOnGoal: { home: number; away: number }
  shotsOffGoal: { home: number; away: number }
  totalShots: { home: number; away: number }
  possession: { home: number; away: number }
  corners: { home: number; away: number }
  offsides: { home: number; away: number }
  fouls: { home: number; away: number }
  yellowCards: { home: number; away: number }
  redCards: { home: number; away: number }
  saves: { home: number; away: number }
}

interface LiveMatch {
  id: number
  fixtureId?: number
  leagueCode: string
  league: string
  leagueLogo: string
  country: string
  date: string
  timestamp: number
  status: string
  statusLong: string
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
  homeFormation?: string
  awayFormation?: string
}

// ============================================================
// 📈 모멘텀 그래프 (FotMob 스타일 재디자인)
// ============================================================
const MomentumGraph = ({
  events = [],
  elapsed,
  status,
  homeTeam,
  awayTeam,
  language
}: {
  events?: MatchEvent[]
  elapsed: number
  status: string
  homeTeam: string
  awayTeam: string
  language: string
}) => {
  const maxTime = status === 'HT' ? 45 : 90
  const currentTime = status === 'HT' ? 45 : Math.min(elapsed || 0, maxTime)
  const isHalfTime = status === 'HT'
  const isSecondHalf = ['2H', 'FT'].includes(status) || elapsed > 45

  // 모멘텀 바 데이터 생성 (5분 단위)
  const momentumBars = useMemo(() => {
    const bars: { time: number; home: number; away: number }[] = []
    const sortedEvents = [...events].sort((a, b) => a.time - b.time)
    
    for (let t = 0; t < maxTime; t += 5) {
      let homeValue = 0
      let awayValue = 0
      
      // 해당 시간대 이벤트 체크
      const rangeEvents = sortedEvents.filter(e => e.time >= t && e.time < t + 5)
      
      for (const event of rangeEvents) {
        if (event.team === 'home') {
          if (event.type === 'goal') homeValue += 80
          else if (event.type === 'card' && event.detail === 'Yellow Card') homeValue -= 20
          else if (event.type === 'card' && event.detail === 'Red Card') homeValue -= 50
        } else {
          if (event.type === 'goal') awayValue += 80
          else if (event.type === 'card' && event.detail === 'Yellow Card') awayValue -= 20
          else if (event.type === 'card' && event.detail === 'Red Card') awayValue -= 50
        }
      }
      
      // 랜덤 요소 추가 (실제 경기 느낌)
      const seed = t * 7 + (events.length || 0) * 13
      const randomHome = Math.sin(seed) * 30 + Math.cos(seed * 0.5) * 20
      const randomAway = Math.cos(seed * 0.7) * 30 + Math.sin(seed * 0.3) * 20
      
      // 현재 시간 이후는 표시 안함
      const isActive = t < currentTime
      
      bars.push({
        time: t,
        home: isActive ? Math.max(0, Math.min(100, 30 + homeValue + randomHome)) : 0,
        away: isActive ? Math.max(0, Math.min(100, 30 + awayValue + randomAway)) : 0
      })
    }
    
    return bars
  }, [events, currentTime, maxTime])

  // 골 마커
  const goalMarkers = useMemo(() => {
    return events.filter(e => e.type === 'goal').map(e => ({
      ...e,
      position: (e.time / maxTime) * 100
    }))
  }, [events, maxTime])

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-4 lg:p-6">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        {language === 'ko' ? '경기 흐름' : 'Match Momentum'}
      </h3>
      
      {/* 팀 레전드 */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span className="text-xs text-gray-400">{homeTeam}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{awayTeam}</span>
          <div className="w-3 h-3 rounded-sm bg-amber-500" />
        </div>
      </div>

      {/* 그래프 영역 */}
      <div className="relative h-32 lg:h-40">
        {/* 중앙선 */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-700" />
        
        {/* 하프타임 구분선 */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600 opacity-50" />
        
        {/* 바 차트 */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-full flex justify-between gap-0.5">
            {momentumBars.map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-center h-full relative">
                {/* 홈팀 바 (위) */}
                <div className="flex-1 flex items-end justify-center pb-1">
                  <div 
                    className="w-full max-w-[8px] lg:max-w-[12px] bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm transition-all duration-300"
                    style={{ height: `${bar.home * 0.8}%` }}
                  />
                </div>
                {/* 어웨이팀 바 (아래) */}
                <div className="flex-1 flex items-start justify-center pt-1">
                  <div 
                    className="w-full max-w-[8px] lg:max-w-[12px] bg-gradient-to-b from-amber-500 to-amber-600 rounded-b-sm transition-all duration-300"
                    style={{ height: `${bar.away * 0.8}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 골 마커 */}
        {goalMarkers.map((goal, idx) => (
          <div
            key={idx}
            className="absolute z-10"
            style={{ 
              left: `${goal.position}%`,
              top: goal.team === 'home' ? '10%' : '80%',
              transform: 'translateX(-50%)'
            }}
          >
            <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg ${
              goal.team === 'home' 
                ? 'bg-blue-500 text-white' 
                : 'bg-amber-500 text-black'
            }`}>
              ⚽
            </div>
          </div>
        ))}

        {/* 현재 시간 마커 */}
        {currentTime > 0 && currentTime < maxTime && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-20"
            style={{ left: `${(currentTime / maxTime) * 100}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-emerald-400 rounded text-[10px] font-bold text-black">
              {currentTime}'
            </div>
          </div>
        )}
      </div>

      {/* 시간 라벨 */}
      <div className="flex justify-between mt-2 text-[10px] text-gray-500">
        <span>0'</span>
        <span>15'</span>
        <span>30'</span>
        <span className="font-medium text-gray-400">HT</span>
        <span>60'</span>
        <span>75'</span>
        <span>90'</span>
      </div>
    </div>
  )
}

// ============================================================
// 📊 주요 통계 카드
// ============================================================
const KeyStatsCard = ({
  stats,
  language
}: {
  stats?: MatchStats
  language: string
}) => {
  const statItems = [
    { key: 'possession', ko: '점유율', en: 'Possession', suffix: '%' },
    { key: 'totalShots', ko: '슈팅', en: 'Total Shots' },
    { key: 'shotsOnGoal', ko: '유효슈팅', en: 'Shots on Target' },
    { key: 'corners', ko: '코너킥', en: 'Corners' },
  ]

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-4 lg:p-6">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        {language === 'ko' ? '주요 통계' : 'Key Stats'}
      </h3>

      <div className="space-y-4">
        {statItems.map(item => {
          const data = stats?.[item.key as keyof MatchStats] as { home: number; away: number } | undefined
          const home = data?.home ?? 0
          const away = data?.away ?? 0
          const total = home + away || 1
          const homePercent = (home / total) * 100
          
          const displayHome = item.decimals ? home.toFixed(item.decimals) : home
          const displayAway = item.decimals ? away.toFixed(item.decimals) : away

          return (
            <div key={item.key}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-medium text-blue-400">
                  {displayHome}{item.suffix || ''}
                </span>
                <span className="text-xs text-gray-400">
                  {language === 'ko' ? item.ko : item.en}
                </span>
                <span className="text-sm font-medium text-amber-400">
                  {displayAway}{item.suffix || ''}
                </span>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
                  style={{ width: `${homePercent}%` }}
                />
                <div 
                  className="bg-gradient-to-l from-amber-600 to-amber-400 transition-all duration-500"
                  style={{ width: `${100 - homePercent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// 📝 이벤트 타임라인 (홈/원정 렌더링 수정)
// ============================================================
const EventsSection = ({ 
  events = [], 
  language 
}: { 
  events?: MatchEvent[]
  language: string 
}) => {
  if (!events || events.length === 0) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <span>⚡</span>
          {language === 'ko' ? '이벤트' : 'Events'}
        </h3>
        <p className="text-center text-gray-500 text-sm py-4">
          {language === 'ko' ? '아직 이벤트가 없습니다' : 'No events yet'}
        </p>
      </div>
    )
  }

  const sortedEvents = [...events].sort((a, b) => b.time - a.time)

  const getEventIcon = (type: string, detail?: string) => {
    if (type === 'goal') return '⚽'
    if (type === 'card') {
      if (detail?.includes('Red')) return '🟥'
      return '🟨'
    }
    if (type === 'subst') return '🔄'
    if (type === 'var') return '📺'
    return '•'
  }

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-4 lg:p-6">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <span>⚡</span>
        {language === 'ko' ? '이벤트' : 'Events'}
      </h3>

      <div className="space-y-3">
        {sortedEvents.map((event, idx) => (
          <div 
            key={idx}
            className={`flex items-center gap-3 ${
              // ⚠️ 수정: home과 away를 반대로 변경
              event.team === 'home' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* 이벤트 내용 */}
            <div className={`flex-1 flex items-center gap-2 ${
              // ⚠️ 수정: home과 away를 반대로 변경
              event.team === 'home' ? 'justify-start text-left' : 'justify-end text-right'
            }`}>
              <div>
                <p className="text-sm text-white font-medium">{event.player}</p>
                {event.detail && (
                  <p className="text-xs text-gray-500">{event.detail}</p>
                )}
              </div>
            </div>

            {/* 아이콘 */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
              event.team === 'home' ? 'bg-blue-500/20' : 'bg-amber-500/20'
            }`}>
              {getEventIcon(event.type, event.detail)}
            </div>

            {/* 시간 */}
            <div className={`w-12 flex items-center ${
              // ⚠️ 수정: home과 away를 반대로 변경
              event.team === 'home' ? 'justify-end' : 'justify-start'
            }`}>
              <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                event.team === 'home' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {event.time}'
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// 📊 전체 통계
// ============================================================
const FullStatsSection = ({ 
  stats, 
  language 
}: { 
  stats?: MatchStats
  language: string 
}) => {
  const statItems = [
    { key: 'possession', ko: '점유율', en: 'Possession', suffix: '%' },
    { key: 'totalShots', ko: '전체 슈팅', en: 'Total Shots' },
    { key: 'shotsOnGoal', ko: '유효 슈팅', en: 'Shots on Target' },
    { key: 'shotsOffGoal', ko: '유효 슈팅 외', en: 'Shots off Target' },
    { key: 'corners', ko: '코너킥', en: 'Corners' },
    { key: 'fouls', ko: '파울', en: 'Fouls' },
    { key: 'offsides', ko: '오프사이드', en: 'Offsides' },
    { key: 'yellowCards', ko: '옐로카드', en: 'Yellow Cards' },
    { key: 'redCards', ko: '레드카드', en: 'Red Cards' },
  ]

  if (!stats) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-6 text-center text-gray-500">
        {language === 'ko' ? '통계 데이터가 없습니다' : 'No stats available'}
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-4 lg:p-6">
      <div className="space-y-4">
        {statItems.map(item => {
          const data = stats[item.key as keyof MatchStats] as { home: number; away: number } | undefined
          const home = data?.home ?? 0
          const away = data?.away ?? 0
          const total = home + away || 1
          const homePercent = (home / total) * 100

          return (
            <div key={item.key}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-semibold text-blue-400 w-12 text-left">
                  {home}{item.suffix || ''}
                </span>
                <span className="text-xs text-gray-400 flex-1 text-center">
                  {language === 'ko' ? item.ko : item.en}
                </span>
                <span className="text-sm font-semibold text-amber-400 w-12 text-right">
                  {away}{item.suffix || ''}
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-800">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
                  style={{ width: `${homePercent}%` }}
                />
                <div 
                  className="bg-gradient-to-l from-amber-600 to-amber-400 transition-all duration-500"
                  style={{ width: `${100 - homePercent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// 👕 라인업
// ============================================================
const LineupSection = ({ 
  match, 
  language 
}: { 
  match: LiveMatch
  language: string 
}) => {
  return (
    <div className="bg-[#1a1a1a] rounded-xl overflow-hidden">
      {/* LineupWidget이 자체 헤더를 가지고 있으므로 별도 헤더 불필요 */}
      {match.fixtureId ? (
        <LineupWidget fixtureId={match.fixtureId} />
      ) : (
        <div className="p-8 text-center text-gray-500">
          {language === 'ko' ? '라인업 정보가 없습니다' : 'Lineup not available'}
        </div>
      )}
    </div>
  )
}

// ============================================================
// 🏠 메인 컴포넌트
// ============================================================
export default function LiveMatchPage() {
  const params = useParams()
  const matchId = params.matchId as string
  const { language } = useLanguage()
  
  const [match, setMatch] = useState<LiveMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'stats' | 'lineup'>('lineup')

  // 경기 데이터 로드
  const fetchMatch = async () => {
    try {
      const response = await fetch(`/api/live-matches/${matchId}`)
      const data = await response.json()
      
      if (data.success && data.match) {
        setMatch(data.match)
        setError(null)
      } else {
        // 전체 라이브 경기에서 찾기
        const allResponse = await fetch('/api/live-matches')
        const allData = await allResponse.json()
        
        if (allData.success) {
          const found = allData.matches.find((m: LiveMatch) => m.id.toString() === matchId)
          if (found) {
            setMatch(found)
            setError(null)
          } else {
            setError(language === 'ko' ? '경기를 찾을 수 없습니다' : 'Match not found')
          }
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatch()
  }, [matchId])

  // 15초마다 갱신
  useEffect(() => {
    const interval = setInterval(fetchMatch, 15000)
    return () => clearInterval(interval)
  }, [matchId])

  const isLive = match && ['1H', '2H', 'ET', 'P', 'LIVE'].includes(match.status)

  const getStatusInfo = () => {
    if (!match) return { text: '', color: 'bg-gray-500' }
    
    const map: Record<string, { ko: string; en: string; color: string }> = {
      '1H': { ko: '전반전', en: '1st Half', color: 'bg-red-500' },
      '2H': { ko: '후반전', en: '2nd Half', color: 'bg-red-500' },
      'HT': { ko: '하프타임', en: 'Half Time', color: 'bg-yellow-600' },
      'ET': { ko: '연장전', en: 'Extra Time', color: 'bg-orange-500' },
      'P': { ko: '승부차기', en: 'Penalties', color: 'bg-purple-500' },
      'FT': { ko: '경기종료', en: 'Full Time', color: 'bg-gray-600' },
      'NS': { ko: '경기 예정', en: 'Not Started', color: 'bg-blue-600' },
      'LIVE': { ko: '진행중', en: 'Live', color: 'bg-red-500' },
    }

    const info = map[match.status] || { ko: match.statusLong, en: match.statusLong, color: 'bg-gray-500' }
    return {
      text: language === 'ko' ? info.ko : info.en,
      color: info.color
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{language === 'ko' ? '경기 정보 로딩 중...' : 'Loading match...'}</p>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center text-white">
        <div className="text-4xl mb-4">😢</div>
        <p className="text-gray-400 mb-4">{error || (language === 'ko' ? '경기를 찾을 수 없습니다' : 'Match not found')}</p>
        <Link href="/" className="text-emerald-400 hover:underline">
          ← {language === 'ko' ? '메인으로' : 'Back to Home'}
        </Link>
      </div>
    )
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white pb-20">
      {/* 헤더 */}
      <div className="bg-[#141414] border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">{language === 'ko' ? '뒤로' : 'Back'}</span>
            </Link>

            <div className="flex items-center gap-2">
              {match.leagueLogo && (
                <Image src={match.leagueLogo} alt="" width={24} height={24} className="object-contain" />
              )}
              <span className="text-sm font-medium text-gray-300">{match.league}</span>
            </div>

            <button onClick={fetchMatch} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 콘텐츠 - PC에서 넓게 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 스코어보드 */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 lg:p-8 mb-6">
          {/* 상태 뱃지 */}
          <div className="flex justify-center mb-6">
            <div className={`flex items-center gap-2 px-5 py-2 rounded-full ${statusInfo.color}`}>
              {isLive && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative rounded-full h-2.5 w-2.5 bg-white" />
                </span>
              )}
              <span className="text-sm font-bold text-white">
                {statusInfo.text} {isLive && match.elapsed > 0 && `${match.elapsed}'`}
              </span>
            </div>
          </div>

          {/* 스코어 - PC에서 더 크게 */}
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {/* 홈팀 */}
            <div className="flex-1 flex flex-col items-center">
              <Image
                src={match.homeCrest}
                alt={match.homeTeam}
                width={80}
                height={80}
                className="object-contain mb-3 lg:w-24 lg:h-24"
              />
              <span className="text-base lg:text-lg font-semibold text-white text-center max-w-[140px] lg:max-w-[180px]">
                {language === 'ko' ? match.homeTeamKR : match.homeTeam}
              </span>
              <span className="text-xs text-gray-500 mt-1">HOME</span>
            </div>

            {/* 점수 */}
            <div className="px-8 lg:px-12">
              <div className="flex items-center gap-6">
                <span className="text-6xl lg:text-7xl font-black text-white tabular-nums">{match.homeScore}</span>
                <span className="text-3xl text-gray-600">-</span>
                <span className="text-6xl lg:text-7xl font-black text-white tabular-nums">{match.awayScore}</span>
              </div>
              {match.halftimeHomeScore !== null && ['HT', '2H', 'FT'].includes(match.status) && (
                <div className="text-center mt-3 text-sm text-gray-500">
                  HT: {match.halftimeHomeScore} - {match.halftimeAwayScore}
                </div>
              )}
            </div>

            {/* 어웨이팀 */}
            <div className="flex-1 flex flex-col items-center">
              <Image
                src={match.awayCrest}
                alt={match.awayTeam}
                width={80}
                height={80}
                className="object-contain mb-3 lg:w-24 lg:h-24"
              />
              <span className="text-base lg:text-lg font-semibold text-white text-center max-w-[140px] lg:max-w-[180px]">
                {language === 'ko' ? match.awayTeamKR : match.awayTeam}
              </span>
              <span className="text-xs text-gray-500 mt-1">AWAY</span>
            </div>
          </div>
        </div>

        {/* PC: 2컬럼 레이아웃 / 모바일: 1컬럼 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 모멘텀 그래프 */}
          <MomentumGraph
            events={match.events}
            elapsed={match.elapsed}
            status={match.status}
            homeTeam={language === 'ko' ? match.homeTeamKR : match.homeTeam}
            awayTeam={language === 'ko' ? match.awayTeamKR : match.awayTeam}
            language={language}
          />
          
          {/* 주요 통계 */}
          <KeyStatsCard stats={match.stats} language={language} />
        </div>

        {/* 이벤트 */}
        <div className="mb-6">
          <EventsSection events={match.events} language={language} />
        </div>

        {/* 탭 */}
        <div className="flex bg-[#1a1a1a] rounded-xl p-1 mb-6">
          {[
            { id: 'stats' as const, ko: '전체 통계', en: 'All Stats' },
            { id: 'lineup' as const, ko: '라인업', en: 'Lineup' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {language === 'ko' ? tab.ko : tab.en}
            </button>
          ))}
        </div>

        {/* 탭 내용 */}
        {activeTab === 'stats' && <FullStatsSection stats={match.stats} language={language} />}
        {activeTab === 'lineup' && <LineupSection match={match} language={language} />}
      </div>
    </div>
  )
}