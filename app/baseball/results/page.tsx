'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../contexts/LanguageContext'

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
  innings?: {
    home: Record<string, number | null>
    away: Record<string, number | null>
  } | null
  odds?: {
    homeWinProb: number
    awayWinProb: number
  } | null
}

// =====================================================
// 상수
// =====================================================
const LEAGUES = [
  { id: 'ALL', name: '전체', nameEn: 'All' },
  { id: 'KBO', name: 'KBO', nameEn: 'KBO' },
  { id: 'MLB', name: 'MLB', nameEn: 'MLB' },
  { id: 'NPB', name: 'NPB', nameEn: 'NPB' },
  { id: 'CPBL', name: 'CPBL', nameEn: 'CPBL' },
]

const LEAGUE_COLORS: Record<string, string> = {
  KBO: 'bg-red-500',
  NPB: 'bg-orange-500',
  MLB: 'bg-blue-600',
  CPBL: 'bg-purple-500',
}

// =====================================================
// 샘플 데이터
// =====================================================

// 예정 경기
const SAMPLE_SCHEDULED: Match[] = [
  {
    id: 8001,
    league: 'KBO',
    leagueName: 'KBO League',
    date: '2025-03-22',
    time: '14:00',
    timestamp: '2025-03-22T05:00:00Z',
    homeTeam: 'LG Twins',
    homeTeamKo: 'LG 트윈스',
    homeLogo: 'https://media.api-sports.io/baseball/teams/3916.png',
    homeScore: null,
    awayTeam: 'Samsung Lions',
    awayTeamKo: '삼성 라이온즈',
    awayLogo: 'https://media.api-sports.io/baseball/teams/3920.png',
    awayScore: null,
    status: 'scheduled',
    odds: { homeWinProb: 62, awayWinProb: 38 }
  },
  {
    id: 8002,
    league: 'KBO',
    leagueName: 'KBO League',
    date: '2025-03-22',
    time: '14:00',
    timestamp: '2025-03-22T05:00:00Z',
    homeTeam: 'Doosan Bears',
    homeTeamKo: '두산 베어스',
    homeLogo: 'https://media.api-sports.io/baseball/teams/3912.png',
    homeScore: null,
    awayTeam: 'KIA Tigers',
    awayTeamKo: 'KIA 타이거즈',
    awayLogo: 'https://media.api-sports.io/baseball/teams/3915.png',
    awayScore: null,
    status: 'scheduled',
    odds: { homeWinProb: 55, awayWinProb: 45 }
  },
  {
    id: 8003,
    league: 'KBO',
    leagueName: 'KBO League',
    date: '2025-03-23',
    time: '17:00',
    timestamp: '2025-03-23T08:00:00Z',
    homeTeam: 'SSG Landers',
    homeTeamKo: 'SSG 랜더스',
    homeLogo: 'https://media.api-sports.io/baseball/teams/3921.png',
    homeScore: null,
    awayTeam: 'NC Dinos',
    awayTeamKo: 'NC 다이노스',
    awayLogo: 'https://media.api-sports.io/baseball/teams/3919.png',
    awayScore: null,
    status: 'scheduled',
    odds: { homeWinProb: 68, awayWinProb: 32 }
  },
  {
    id: 8004,
    league: 'MLB',
    leagueName: 'MLB',
    date: '2025-03-23',
    time: '19:10',
    timestamp: '2025-03-23T23:10:00Z',
    homeTeam: 'LA Dodgers',
    homeTeamKo: 'LA 다저스',
    homeLogo: 'https://media.api-sports.io/baseball/teams/20.png',
    homeScore: null,
    awayTeam: 'NY Yankees',
    awayTeamKo: 'NY 양키스',
    awayLogo: 'https://media.api-sports.io/baseball/teams/1.png',
    awayScore: null,
    status: 'scheduled',
    odds: { homeWinProb: 52, awayWinProb: 48 }
  },
]

// 종료 경기
const SAMPLE_FINISHED: Match[] = [
  {
    id: 9001,
    league: 'KBO',
    leagueName: 'KBO League',
    date: '2025-01-11',
    time: '14:00',
    timestamp: '2025-01-11T05:00:00Z',
    homeTeam: 'LG Twins',
    homeTeamKo: 'LG 트윈스',
    homeLogo: 'https://media.api-sports.io/baseball/teams/3916.png',
    homeScore: 7,
    awayTeam: 'Samsung Lions',
    awayTeamKo: '삼성 라이온즈',
    awayLogo: 'https://media.api-sports.io/baseball/teams/3920.png',
    awayScore: 3,
    status: 'finished',
    innings: {
      home: { '1': 2, '2': 0, '3': 1, '4': 0, '5': 2, '6': 0, '7': 1, '8': 1, '9': 0 },
      away: { '1': 0, '2': 1, '3': 0, '4': 0, '5': 1, '6': 0, '7': 0, '8': 1, '9': 0 }
    },
    odds: { homeWinProb: 62, awayWinProb: 38 }
  },
  {
    id: 9002,
    league: 'KBO',
    leagueName: 'KBO League',
    date: '2025-01-11',
    time: '14:00',
    timestamp: '2025-01-11T05:00:00Z',
    homeTeam: 'Doosan Bears',
    homeTeamKo: '두산 베어스',
    homeLogo: 'https://media.api-sports.io/baseball/teams/3912.png',
    homeScore: 4,
    awayTeam: 'KIA Tigers',
    awayTeamKo: 'KIA 타이거즈',
    awayLogo: 'https://media.api-sports.io/baseball/teams/3915.png',
    awayScore: 5,
    status: 'finished',
    innings: {
      home: { '1': 1, '2': 0, '3': 2, '4': 0, '5': 0, '6': 1, '7': 0, '8': 0, '9': 0 },
      away: { '1': 0, '2': 2, '3': 0, '4': 1, '5': 0, '6': 0, '7': 1, '8': 0, '9': 1 }
    },
    odds: { homeWinProb: 55, awayWinProb: 45 }
  },
  {
    id: 9003,
    league: 'MLB',
    leagueName: 'MLB',
    date: '2025-01-10',
    time: '19:10',
    timestamp: '2025-01-10T23:10:00Z',
    homeTeam: 'New York Yankees',
    homeTeamKo: '뉴욕 양키스',
    homeLogo: 'https://media.api-sports.io/baseball/teams/1.png',
    homeScore: 5,
    awayTeam: 'Boston Red Sox',
    awayTeamKo: '보스턴 레드삭스',
    awayLogo: 'https://media.api-sports.io/baseball/teams/2.png',
    awayScore: 2,
    status: 'finished',
    innings: {
      home: { '1': 0, '2': 2, '3': 0, '4': 1, '5': 0, '6': 0, '7': 2, '8': 0, '9': 0 },
      away: { '1': 1, '2': 0, '3': 0, '4': 0, '5': 0, '6': 1, '7': 0, '8': 0, '9': 0 }
    },
    odds: { homeWinProb: 58, awayWinProb: 42 }
  },
  {
    id: 9004,
    league: 'NPB',
    leagueName: 'NPB',
    date: '2025-01-10',
    time: '18:00',
    timestamp: '2025-01-10T09:00:00Z',
    homeTeam: 'Yomiuri Giants',
    homeTeamKo: '요미우리 자이언츠',
    homeLogo: 'https://media.api-sports.io/baseball/teams/287.png',
    homeScore: 3,
    awayTeam: 'Hanshin Tigers',
    awayTeamKo: '한신 타이거스',
    awayLogo: 'https://media.api-sports.io/baseball/teams/282.png',
    awayScore: 4,
    status: 'finished',
    odds: { homeWinProb: 52, awayWinProb: 48 }
  },
]

// =====================================================
// 유틸리티 함수
// =====================================================
// 사용자 브라우저 시간대로 날짜 자동 변환
function formatDate(timestamp: string, lang: 'ko' | 'en'): string {
  const date = new Date(timestamp)
  if (lang === 'ko') {
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
}

// 사용자 브라우저 시간대로 시간 자동 변환
function formatMatchTime(timestamp: string): string {
  if (!timestamp) return 'TBD'
  
  const date = new Date(timestamp)
  
  // 유효한 날짜인지 확인
  if (isNaN(date.getTime())) return 'TBD'
  
  // 사용자의 로컬 시간대로 자동 변환
  const time = date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  
  // 00:00이면 TBD
  return time === '00:00' ? 'TBD' : time
}

function getMatchResult(match: Match): 'HOME' | 'AWAY' | 'DRAW' | null {
  if (match.homeScore === null || match.awayScore === null) return null
  if (match.homeScore > match.awayScore) return 'HOME'
  if (match.homeScore < match.awayScore) return 'AWAY'
  return 'DRAW'
}

function getPrediction(match: Match): 'HOME' | 'AWAY' | 'NONE' {
  if (!match.odds) return 'NONE'
  const diff = Math.abs(match.odds.homeWinProb - match.odds.awayWinProb)
  if (diff < 10) return 'NONE'
  return match.odds.homeWinProb > match.odds.awayWinProb ? 'HOME' : 'AWAY'
}

function isPredictionCorrect(match: Match): boolean | null {
  const result = getMatchResult(match)
  const prediction = getPrediction(match)
  if (result === null || prediction === 'NONE' || result === 'DRAW') return null
  return result === prediction
}

function getGrade(match: Match): { grade: string; color: string; bgColor: string } {
  if (!match.odds) return { grade: 'PASS', color: 'text-gray-400', bgColor: 'bg-gray-800' }
  const diff = Math.abs(match.odds.homeWinProb - match.odds.awayWinProb)
  if (diff >= 20) return { grade: 'PICK', color: 'text-blue-400', bgColor: 'bg-blue-900/20' }
  if (diff >= 10) return { grade: 'GOOD', color: 'text-blue-600', bgColor: 'bg-blue-100' }
  return { grade: 'PASS', color: 'text-gray-400', bgColor: 'bg-gray-800' }
}

// =====================================================
// 컴포넌트
// =====================================================
function TeamLogo({ src, team, size = 'md' }: { src?: string; team: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
  }
  
  if (src) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-white flex items-center justify-center p-1`}>
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
    <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-400`}>
      {team.substring(0, 2)}
    </div>
  )
}

// 이닝 스코어 테이블
function InningsTable({ match, language }: { match: Match; language: 'ko' | 'en' }) {
  if (!match.innings) return null
  
  const innings = Object.keys(match.innings.home).sort((a, b) => parseInt(a) - parseInt(b))
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-800">
            <th className="px-2 py-1 text-left font-medium text-gray-400 w-20">
              {language === 'ko' ? '팀' : 'Team'}
            </th>
            {innings.map(inning => (
              <th key={inning} className="px-1.5 py-1 text-center font-medium text-gray-400 w-6">
                {inning}
              </th>
            ))}
            <th className="px-2 py-1 text-center font-bold text-gray-200 w-8">R</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-800">
            <td className="px-2 py-1.5 font-medium text-gray-200 truncate max-w-[80px]">
              {language === 'ko' ? match.awayTeamKo?.split(' ')[0] || match.awayTeam.split(' ')[0] : match.awayTeam.split(' ')[0]}
            </td>
            {innings.map(inning => (
              <td key={inning} className="px-1.5 py-1.5 text-center text-gray-300">
                {match.innings?.away[inning] ?? '-'}
              </td>
            ))}
            <td className="px-2 py-1.5 text-center font-bold text-white">{match.awayScore}</td>
          </tr>
          <tr>
            <td className="px-2 py-1.5 font-medium text-gray-200 truncate max-w-[80px]">
              {language === 'ko' ? match.homeTeamKo?.split(' ')[0] || match.homeTeam.split(' ')[0] : match.homeTeam.split(' ')[0]}
            </td>
            {innings.map(inning => (
              <td key={inning} className="px-1.5 py-1.5 text-center text-gray-300">
                {match.innings?.home[inning] ?? '-'}
              </td>
            ))}
            <td className="px-2 py-1.5 text-center font-bold text-white">{match.homeScore}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// 경기 카드 (예정/종료 공통)
function MatchCard({ match, language, isScheduled, isSample = false }: { 
  match: Match; 
  language: 'ko' | 'en'; 
  isScheduled: boolean;
  isSample?: boolean 
}) {
  const homeTeamName = language === 'ko' ? match.homeTeamKo || match.homeTeam : match.homeTeam
  const awayTeamName = language === 'ko' ? match.awayTeamKo || match.awayTeam : match.awayTeam
  const result = getMatchResult(match)
  const [aiComment, setAiComment] = useState<string | null>(null)
  const [commentLoading, setCommentLoading] = useState(false)

  useEffect(() => {
    if (isScheduled || match.homeScore === null || match.awayScore === null) return

    let cancelled = false
    setCommentLoading(true)

    fetch('/api/baseball/ai-comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match, language }),
    })
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.success) setAiComment(data.comment)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCommentLoading(false) })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id, language, isScheduled])
  const prediction = getPrediction(match)
  const isCorrect = isPredictionCorrect(match)
  const { grade, color, bgColor } = getGrade(match)
  const isHomeWin = match.odds && match.odds.homeWinProb > match.odds.awayWinProb
  const winProb = match.odds ? Math.max(match.odds.homeWinProb, match.odds.awayWinProb) : 50
  
  return (
    <Link 
      href={`/baseball/${match.id}`}
      className={`block bg-gray-900 rounded-2xl shadow-lg overflow-hidden border border-gray-800 hover:shadow-xl transition-all ${isSample ? 'opacity-90' : ''}`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${LEAGUE_COLORS[match.league] || 'bg-gray-500'}`}>
            {match.league}
          </span>
          <span className="text-xs text-gray-400">
            {formatDate(match.timestamp, language)} {formatMatchTime(match.timestamp)}
          </span>
          {isSample && (
            <span className="px-1.5 py-0.5 bg-blue-900/30 text-blue-400 text-[10px] rounded font-medium">
              SAMPLE
            </span>
          )}
        </div>
        {!isScheduled && (
          <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs font-medium">
            {language === 'ko' ? '종료' : 'Final'}
          </span>
        )}
      </div>
      
      {/* 매치업 + 스코어/VS */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          {/* 원정팀 */}
          <div className="flex items-center gap-3 flex-1">
            <TeamLogo src={match.awayLogo} team={match.awayTeam} size="lg" />
            <div>
              <p className={`font-bold text-sm ${
                isScheduled 
                  ? (!isHomeWin ? 'text-white' : 'text-gray-400')
                  : (result === 'AWAY' ? 'text-white' : 'text-gray-400')
              }`}>
                {awayTeamName}
              </p>
              <p className="text-xs text-gray-400">{language === 'ko' ? '원정' : 'Away'}</p>
            </div>
          </div>
          
          {/* 스코어 or VS */}
          <div className="flex items-center gap-3 px-4">
            {isScheduled ? (
              <span className="text-xl font-bold text-gray-300">VS</span>
            ) : (
              <>
                <span className={`text-3xl font-bold ${result === 'AWAY' ? 'text-white' : 'text-gray-400'}`}>
                  {match.awayScore}
                </span>
                <span className="text-gray-300 text-xl">-</span>
                <span className={`text-3xl font-bold ${result === 'HOME' ? 'text-white' : 'text-gray-400'}`}>
                  {match.homeScore}
                </span>
              </>
            )}
          </div>
          
          {/* 홈팀 */}
          <div className="flex items-center gap-3 flex-1 justify-end text-right">
            <div>
              <p className={`font-bold text-sm ${
                isScheduled 
                  ? (isHomeWin ? 'text-white' : 'text-gray-400')
                  : (result === 'HOME' ? 'text-white' : 'text-gray-400')
              }`}>
                {homeTeamName}
              </p>
              <p className="text-xs text-gray-400">{language === 'ko' ? '홈' : 'Home'}</p>
            </div>
            <TeamLogo src={match.homeLogo} team={match.homeTeam} size="lg" />
          </div>
        </div>
        

        
        {/* 종료 경기: 이닝 스코어 + 적중 결과 */}
        {!isScheduled && (
          <>
            {match.innings && (
              <div className="mb-3 bg-gray-800 rounded-xl p-2">
                <InningsTable match={match} language={language} />
              </div>
            )}
            
            {/* 코멘트 */}
            <div className="mt-3 px-3 py-2.5 bg-gray-700/40 rounded-xl">
              {commentLoading ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                </div>
              ) : aiComment ? (
                <p className="text-sm text-gray-200 leading-relaxed">{aiComment}</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </Link>
  )
}

// =====================================================
// 메인 페이지 컴포넌트
// =====================================================
export default function BaseballMatchesPage() {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState<'scheduled' | 'finished'>('scheduled') // 탭 추가
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  
  // 초기 날짜를 오늘로 설정
  const getInitialDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }
  
  const [selectedDate, setSelectedDate] = useState<string>(getInitialDate())
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [usingSampleData, setUsingSampleData] = useState(false)
  
  // 날짜 생성 (예정: 앞으로 7일 / 종료: 오늘 포함 과거 7일) — 메모이제이션
  const dates = useMemo(() => {
    const result = []
    const dayNames = language === 'ko'
      ? ['일', '월', '화', '수', '목', '금', '토']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      if (activeTab === 'scheduled') {
        date.setDate(date.getDate() + i)
      } else {
        date.setDate(date.getDate() - i)
      }
      const dateStr = date.toISOString().split('T')[0]
      result.push({
        value: dateStr,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        day: dayNames[date.getDay()],
      })
    }
    return result
  }, [activeTab, language])
  
  // 경기 데이터 로드
  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true)
      
      try {
        const params = new URLSearchParams()
        if (selectedLeague !== 'ALL') {
          params.append('league', selectedLeague)
        }
        const currentStatus = activeTab === 'scheduled' ? 'scheduled' : 'finished'
        params.append('status', currentStatus)
        params.append('limit', '30')
        // 종료된 경기는 ML 예측 불필요 → skipML로 빠르게
        if (currentStatus === 'finished') {
          params.append('skipML', 'true')
        }
        
        const response = await fetch(`/api/baseball/matches?${params}`)
        const data = await response.json()
        
        if (data.success && data.matches && data.matches.length > 0) {
          const sorted = data.matches.sort((a: Match, b: Match) => {
            if (activeTab === 'scheduled') {
              return new Date(a.date).getTime() - new Date(b.date).getTime()
            }
            return new Date(b.date).getTime() - new Date(a.date).getTime()
          })
          setMatches(sorted)
          setUsingSampleData(false)
          
          // 실제 경기가 있는 날짜로 selectedDate 설정
          if (sorted.length > 0) {
            if (activeTab === 'scheduled') {
              // 오늘 날짜 (UTC 기준)
              const today = new Date().toISOString().split('T')[0]
              
              // 오늘 이후 경기 찾기 (과거 경기 제외)
              const futureMatch = sorted.find(m => m.date >= today)
              
              if (futureMatch) {
                setSelectedDate(futureMatch.date)  // 오늘 이후 첫 경기
              } else {
                setSelectedDate(sorted[0].date)  // 없으면 가장 빠른 경기
              }
            } else {
              // 경기 결과: 가장 최근 종료 경기 날짜
              setSelectedDate(sorted[0].date)
            }
          }
        } else {
          const samples = activeTab === 'scheduled' ? SAMPLE_SCHEDULED : SAMPLE_FINISHED
          const filteredSamples = selectedLeague === 'ALL' 
            ? samples 
            : samples.filter(m => m.league === selectedLeague)
          setMatches(filteredSamples)
          setUsingSampleData(true)
        }
      } catch (error) {
        console.error('Failed to fetch matches:', error)
        const samples = activeTab === 'scheduled' ? SAMPLE_SCHEDULED : SAMPLE_FINISHED
        const filteredSamples = selectedLeague === 'ALL' 
          ? samples 
          : samples.filter(m => m.league === selectedLeague)
        setMatches(filteredSamples)
        setUsingSampleData(true)
      } finally {
        setLoading(false)
      }
    }
    
    fetchMatches()
  }, [selectedLeague, activeTab])
  
  // 날짜 필터링 (로컬 시간대 기준) — 메모이제이션
  const filteredMatches = useMemo(() => {
    if (selectedDate === 'ALL') return matches
    return matches.filter(m => {
      const localDate = m.date || (m.timestamp ? new Date(new Date(m.timestamp).getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0] : null)
      if (!localDate) return false
      return localDate === selectedDate
    })
  }, [matches, selectedDate])
  
  // 통계 계산
  const stats = activeTab === 'scheduled' 
    ? {
        total: filteredMatches.length,
        pick: filteredMatches.filter(m => {
          if (!m.odds) return false
          return Math.abs(m.odds.homeWinProb - m.odds.awayWinProb) >= 20
        }).length,
        good: filteredMatches.filter(m => {
          if (!m.odds) return false
          const diff = Math.abs(m.odds.homeWinProb - m.odds.awayWinProb)
          return diff >= 10 && diff < 20
        }).length,
      }
    : {
        total: filteredMatches.length,
        correct: filteredMatches.filter(m => isPredictionCorrect(m) === true).length,
        wrong: filteredMatches.filter(m => isPredictionCorrect(m) === false).length,
      }
  
  const accuracyRate = (stats as any).correct + (stats as any).wrong > 0 
    ? Math.round(((stats as any).correct / ((stats as any).correct + (stats as any).wrong)) * 100) 
    : 0

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* 필터 헤더 */}
      <div className="sticky top-0 z-40 bg-[#1a1f2e] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="py-3">
            {/* 예정/결과 탭 */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'scheduled'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {language === 'ko' ? '예정 경기' : 'Scheduled'}
              </button>
              <button
                onClick={() => setActiveTab('finished')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'finished'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {language === 'ko' ? '경기 결과' : 'Results'}
              </button>
            </div>
            
            {/* 날짜 슬라이더 */}
            <div className="flex items-center justify-center gap-1.5 mb-3">
              {/* 이전 버튼 */}
              <button
                onClick={() => {
                  const currentIndex = dates.findIndex(d => d.value === selectedDate)
                  if (currentIndex > 0) {
                    setSelectedDate(dates[currentIndex - 1].value)
                  } else if (currentIndex === -1 && dates.length > 0) {
                    // selectedDate가 dates 범위 밖일 때 → 가장 가까운 날짜로 이동
                    setSelectedDate(dates[0].value)
                  } else if (selectedDate === 'ALL' && dates.length > 0) {
                    setSelectedDate(dates[dates.length - 1].value)
                  }
                }}
                className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              {/* 현재 날짜 표시 */}
              <button
                onClick={() => setSelectedDate('ALL')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all min-w-[140px] ${
                  selectedDate === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                }`}
              >
                {selectedDate === 'ALL' ? (
                  language === 'ko' ? '전체' : 'All'
                ) : (
                  (() => {
                    const selectedDateObj = dates.find(d => d.value === selectedDate)
                    if (!selectedDateObj) return language === 'ko' ? '전체' : 'All'
                    
                    // 오늘, 어제, 내일 날짜 (YYYY-MM-DD 형식)
                    const today = new Date()
                    const todayStr = today.toISOString().split('T')[0]
                    
                    const yesterday = new Date(today)
                    yesterday.setDate(yesterday.getDate() - 1)
                    const yesterdayStr = yesterday.toISOString().split('T')[0]
                    
                    const tomorrow = new Date(today)
                    tomorrow.setDate(tomorrow.getDate() + 1)
                    const tomorrowStr = tomorrow.toISOString().split('T')[0]
                    
                    // selectedDate와 직접 비교
                    if (selectedDate === todayStr) {
                      return language === 'ko' ? '오늘' : 'Today'
                    } else if (selectedDate === yesterdayStr) {
                      return language === 'ko' ? '어제' : 'Yesterday'
                    } else if (selectedDate === tomorrowStr) {
                      return language === 'ko' ? '내일' : 'Tomorrow'
                    } else {
                      return `${selectedDateObj.label} (${selectedDateObj.day})`
                    }
                  })()
                )}
              </button>
              
              {/* 다음 버튼 */}
              <button
                onClick={() => {
                  if (selectedDate === 'ALL' && dates.length > 0) {
                    setSelectedDate(dates[0].value)
                  } else {
                    const currentIndex = dates.findIndex(d => d.value === selectedDate)
                    if (currentIndex === -1 && dates.length > 0) {
                      // 범위 밖이면 첫 번째 날짜로
                      setSelectedDate(dates[0].value)
                    } else if (currentIndex >= 0 && currentIndex < dates.length - 1) {
                      setSelectedDate(dates[currentIndex + 1].value)
                    }
                  }
                }}
                className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            {/* 리그 필터 */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide">
              {LEAGUES.map(league => (
                <button
                  key={league.id}
                  onClick={() => setSelectedLeague(league.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    selectedLeague === league.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {language === 'ko' ? league.name : league.nameEn}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* 경기 카드 목록 */}
      <div className="max-w-7xl mx-auto px-4 pb-24 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mb-4 ${activeTab === 'scheduled' ? 'border-blue-500' : 'border-blue-500'}`}></div>
            <p className="text-gray-400">
              {language === 'ko' ? '불러오는 중...' : 'Loading...'}
            </p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl mb-4 block">⚾</span>
            <p className="text-gray-400">
              {activeTab === 'scheduled'
                ? (language === 'ko' ? '예정된 경기가 없습니다' : 'No scheduled matches')
                : (language === 'ko' ? '종료된 경기가 없습니다' : 'No finished matches')
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 날짜별 그룹핑 */}
            {Object.entries(
              filteredMatches.reduce((groups: Record<string, Match[]>, match) => {
                const date = match.date
                if (!groups[date]) groups[date] = []
                groups[date].push(match)
                return groups
              }, {})
            )
            .sort(([a], [b]) => {
              if (activeTab === 'scheduled') {
                return new Date(a).getTime() - new Date(b).getTime()
              }
              return new Date(b).getTime() - new Date(a).getTime()
            })
            .map(([date, dateMatches]) => (
              <div key={date}>
                {/* 날짜 헤더 */}
                {selectedDate === 'ALL' && (
                  <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                    <span className={`text-xs font-bold text-white px-2 py-1 rounded ${activeTab === 'scheduled' ? 'bg-blue-600' : 'bg-blue-600'}`}>
                      {formatDate(date, language)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {dateMatches.length}{language === 'ko' ? '경기' : ' games'}
                    </span>
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                  {dateMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      language={language}
                      isScheduled={activeTab === 'scheduled'}
                      isSample={usingSampleData}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}