'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// =====================================================
// 타입 정의
// =====================================================
interface MatchDetail {
  id: number
  league: string
  leagueName: string
  season: string
  date: string
  time: string
  timestamp: string
  venue: string | null
  home: {
    id: number
    team: string
    teamKo: string
    logo: string
    score: number | null
  }
  away: {
    id: number
    team: string
    teamKo: string
    logo: string
    score: number | null
  }
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
    bookmaker: string
    updatedAt: string
  } | null
  oddsTrend: Array<{
    time: string
    homeProb: number
    awayProb: number
  }>
  relatedMatches: Array<{
    id: number
    homeTeam: string
    awayTeam: string
    homeLogo: string
    awayLogo: string
    date: string
    time: string
    homeScore: number | null
    awayScore: number | null
    status: string
  }>
}

// =====================================================
// 상수
// =====================================================
const LEAGUE_COLORS: Record<string, string> = {
  KBO: 'bg-red-500',
  NPB: 'bg-orange-500', 
  MLB: 'bg-blue-600',
  CPBL: 'bg-purple-500',
}

// =====================================================
// 팀 로고 컴포넌트
// =====================================================
function TeamLogo({ 
  src, 
  team, 
  size = 'md' 
}: { 
  src?: string
  team: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    '2xl': 'w-28 h-28',
  }
  
  if (src) {
    return (
      <img 
        src={src} 
        alt={team} 
        className={`${sizeClasses[size]} object-contain`}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm border border-gray-300`}>
      {team.slice(0, 2)}
    </div>
  )
}

// =====================================================
// 메인 컴포넌트
// =====================================================
export default function BaseballDetailPage() {
  const params = useParams()
  const matchId = params?.id as string
  
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 디버깅
  console.log('params:', params)
  console.log('matchId:', matchId)

  // 데이터 fetch
  useEffect(() => {
    async function fetchMatch() {
      if (!matchId) {
        console.log('No matchId, skipping fetch')
        return
      }
      
      setLoading(true)
      setError(null)
      
      try {
        const url = `/api/baseball/matches/${matchId}`
        console.log('Fetching:', url)
        
        const response = await fetch(url)
        const data = await response.json()
        
        console.log('Response:', data)
        
        if (data.success) {
          setMatch(data.match)
        } else {
          setError(data.error || '경기 정보를 불러오는데 실패했습니다.')
        }
      } catch (err: any) {
        console.error('Fetch error:', err)
        setError(err.message || '서버 연결에 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchMatch()
  }, [matchId])

  // 이닝 스코어 배열 생성
  const getInningsArray = () => {
    if (!match?.innings) return []
    
    const innings = []
    for (let i = 1; i <= 9; i++) {
      innings.push({
        inning: i,
        away: match.innings.away?.[i.toString()] ?? '-',
        home: match.innings.home?.[i.toString()] ?? '-',
      })
    }
    
    // 연장전 확인
    if (match.innings.away?.extra !== null || match.innings.home?.extra !== null) {
      innings.push({
        inning: 'EX',
        away: match.innings.away?.extra ?? '-',
        home: match.innings.home?.extra ?? '-',
      })
    }
    
    return innings
  }

  // 로딩
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading... (matchId: {matchId || 'none'})</p>
        </div>
      </div>
    )
  }

  // 에러
  if (error || !match) {
    return (
      <div className="min-h-screen bg-gray-200 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl p-8 text-center border-2 border-gray-300 max-w-md">
          <div className="text-6xl mb-4">⚾</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            {language === 'ko' ? '경기를 찾을 수 없습니다' : 'Match not found'}
          </h1>
          <p className="text-gray-500 mb-2">matchId: {matchId || 'none'}</p>
          <p className="text-red-500 mb-4">{error}</p>
          <Link 
            href="/baseball" 
            className="inline-block px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            {language === 'ko' ? '목록으로 돌아가기' : 'Back to list'}
          </Link>
        </div>
      </div>
    )
  }

  const innings = getInningsArray()

  return (
    <div className="min-h-screen bg-gray-200">
      {/* ===== 헤더 ===== */}
      <header className="bg-white shadow-lg border-b-2 border-gray-300">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/baseball" className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 text-xl">⚾</span>
                <span className="text-xl font-bold">
                  <span className="text-gray-800">BASEBALL</span>
                  <span className="text-emerald-500">TREND</span>
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-all border border-gray-300"
            >
              {language === 'ko' ? '🇰🇷 한국어' : '🇺🇸 English'}
            </button>
          </div>
        </div>
      </header>

      {/* ===== 메인 컨텐츠 ===== */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        
        {/* 매치업 헤더 */}
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-300 overflow-hidden mb-6">
          {/* 상단 바 */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded ${LEAGUE_COLORS[match.league]}`}>
                  {match.league}
                </span>
                <span className="text-sm">{match.date}</span>
              </div>
              <span className="text-sm font-medium">
                {match.status === 'FT' 
                  ? (language === 'ko' ? '경기 종료' : 'Final')
                  : match.time?.slice(0, 5)
                }
              </span>
            </div>
          </div>
          
          {/* 매치업 */}
          <div className="p-8">
            <div className="flex items-center justify-center gap-8 md:gap-16">
              {/* 원정팀 */}
              <div className="text-center">
                <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center mb-4 border-2 border-gray-300 shadow-lg mx-auto">
                  <TeamLogo src={match.away.logo} team={match.away.teamKo} size="2xl" />
                </div>
                <h2 className="font-bold text-xl text-gray-800 mb-1">
                  {language === 'ko' ? match.away.teamKo : match.away.team}
                </h2>
                <div className="text-sm text-gray-500 mb-2">
                  {language === 'ko' ? '원정' : 'Away'}
                </div>
                {match.status === 'FT' && (
                  <div className={`text-5xl font-bold ${
                    (match.away.score ?? 0) > (match.home.score ?? 0) 
                      ? 'text-emerald-600' 
                      : 'text-gray-400'
                  }`}>
                    {match.away.score}
                  </div>
                )}
              </div>
              
              {/* VS / 스코어 */}
              <div className="text-center">
                {match.status === 'FT' ? (
                  <>
                    <div className="text-4xl font-bold text-gray-300 mb-2">-</div>
                    <div className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
                      {language === 'ko' ? '경기 종료' : 'Final'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-bold text-gray-300 mb-2">VS</div>
                    <div className="text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full font-medium">
                      {match.time?.slice(0, 5)} KST
                    </div>
                  </>
                )}
              </div>
              
              {/* 홈팀 */}
              <div className="text-center">
                <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center mb-4 border-2 border-gray-300 shadow-lg mx-auto">
                  <TeamLogo src={match.home.logo} team={match.home.teamKo} size="2xl" />
                </div>
                <h2 className="font-bold text-xl text-gray-800 mb-1">
                  {language === 'ko' ? match.home.teamKo : match.home.team}
                </h2>
                <div className="text-sm text-gray-500 mb-2">
                  {language === 'ko' ? '홈' : 'Home'}
                </div>
                {match.status === 'FT' && (
                  <div className={`text-5xl font-bold ${
                    (match.home.score ?? 0) > (match.away.score ?? 0) 
                      ? 'text-emerald-600' 
                      : 'text-gray-400'
                  }`}>
                    {match.home.score}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 이닝 스코어 */}
        {match.status === 'FT' && innings.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl border-2 border-gray-300 overflow-hidden mb-6">
            <div className="bg-gray-800 px-6 py-3">
              <h3 className="text-white font-bold flex items-center gap-2">
                <span>📊</span>
                {language === 'ko' ? '이닝 스코어' : 'Inning Score'}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-600 border-r border-gray-200 w-32">
                      {language === 'ko' ? '팀' : 'Team'}
                    </th>
                    {innings.map((inn) => (
                      <th key={String(inn.inning)} className="px-3 py-3 text-center text-sm font-bold text-gray-600 border-r border-gray-200 w-12">
                        {inn.inning}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 bg-gray-200 w-16">
                      R
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* 원정팀 */}
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-800 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <TeamLogo src={match.away.logo} team={match.away.teamKo} size="sm" />
                        {language === 'ko' ? match.away.teamKo : match.away.team}
                      </div>
                    </td>
                    {innings.map((inn) => (
                      <td key={String(inn.inning)} className="px-3 py-3 text-center text-gray-700 border-r border-gray-200">
                        {inn.away}
                      </td>
                    ))}
                    <td className={`px-4 py-3 text-center font-bold text-lg bg-gray-100 ${
                      (match.away.score ?? 0) > (match.home.score ?? 0) ? 'text-emerald-600' : 'text-gray-800'
                    }`}>
                      {match.away.score}
                    </td>
                  </tr>
                  {/* 홈팀 */}
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-800 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <TeamLogo src={match.home.logo} team={match.home.teamKo} size="sm" />
                        {language === 'ko' ? match.home.teamKo : match.home.team}
                      </div>
                    </td>
                    {innings.map((inn) => (
                      <td key={String(inn.inning)} className="px-3 py-3 text-center text-gray-700 border-r border-gray-200">
                        {inn.home}
                      </td>
                    ))}
                    <td className={`px-4 py-3 text-center font-bold text-lg bg-gray-100 ${
                      (match.home.score ?? 0) > (match.away.score ?? 0) ? 'text-emerald-600' : 'text-gray-800'
                    }`}>
                      {match.home.score}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 승률 예측 */}
        {match.odds && (
          <div className="bg-white rounded-xl shadow-xl border-2 border-gray-300 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3">
              <h3 className="text-white font-bold flex items-center gap-2">
                <span>🎯</span>
                {language === 'ko' ? 'AI 승률 예측' : 'AI Win Probability'}
              </h3>
            </div>
            <div className="p-6">
              {/* 확률 바 */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo src={match.away.logo} team={match.away.teamKo} size="sm" />
                    <span className="font-bold text-gray-800">
                      {language === 'ko' ? match.away.teamKo : match.away.team}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">
                      {language === 'ko' ? match.home.teamKo : match.home.team}
                    </span>
                    <TeamLogo src={match.home.logo} team={match.home.teamKo} size="sm" />
                  </div>
                </div>
                <div className="h-8 rounded-full overflow-hidden bg-gray-200 flex shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-blue-400 to-blue-500 flex items-center justify-end pr-3 transition-all"
                    style={{ width: `${match.odds.awayWinProb}%` }}
                  >
                    <span className="text-white font-bold text-sm">{match.odds.awayWinProb}%</span>
                  </div>
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-start pl-3 transition-all"
                    style={{ width: `${match.odds.homeWinProb}%` }}
                  >
                    <span className="text-white font-bold text-sm">{match.odds.homeWinProb}%</span>
                  </div>
                </div>
              </div>
              
              {/* 배당률 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
                  <div className="text-sm text-blue-600 mb-1">
                    {language === 'ko' ? '원정 승리' : 'Away Win'}
                  </div>
                  <div className="text-2xl font-bold text-blue-700">
                    {match.odds.awayWinOdds}
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-200">
                  <div className="text-sm text-emerald-600 mb-1">
                    {language === 'ko' ? '홈 승리' : 'Home Win'}
                  </div>
                  <div className="text-2xl font-bold text-emerald-700">
                    {match.odds.homeWinOdds}
                  </div>
                </div>
              </div>
              
              {/* 오버언더 */}
              {match.odds.overUnderLine && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 mb-2 text-center">
                    {language === 'ko' ? '오버/언더' : 'Over/Under'} {match.odds.overUnderLine}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                      <div className="text-xs text-gray-500">Over</div>
                      <div className="text-lg font-bold text-gray-700">{match.odds.overOdds}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                      <div className="text-xs text-gray-500">Under</div>
                      <div className="text-lg font-bold text-gray-700">{match.odds.underOdds}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 관련 경기 */}
        {match.relatedMatches && match.relatedMatches.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl border-2 border-gray-300 overflow-hidden">
            <div className="bg-gray-800 px-6 py-3">
              <h3 className="text-white font-bold flex items-center gap-2">
                <span>📅</span>
                {language === 'ko' ? '관련 경기' : 'Related Matches'}
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {match.relatedMatches.map((related) => (
                <Link
                  key={related.id}
                  href={`/baseball/${related.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="text-sm text-gray-500 w-20">
                    {related.date?.slice(5)}
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <TeamLogo src={related.awayLogo} team={related.awayTeam} size="sm" />
                    <span className="text-sm font-medium text-gray-700">{related.awayTeam}</span>
                  </div>
                  <div className="text-center w-20">
                    {related.status === 'FT' ? (
                      <span className="font-bold text-gray-800">
                        {related.awayScore} - {related.homeScore}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {related.time?.slice(0, 5)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="text-sm font-medium text-gray-700">{related.homeTeam}</span>
                    <TeamLogo src={related.homeLogo} team={related.homeTeam} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ===== 푸터 ===== */}
      <footer className="bg-gray-800 text-gray-400 py-8 mt-12 border-t-2 border-gray-700">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-emerald-400 text-xl">⚾</span>
            <span className="text-lg font-bold">
              <span className="text-white">BASEBALL</span>
              <span className="text-emerald-400">TREND</span>
            </span>
          </div>
          <p className="text-sm">
            {language === 'ko' 
              ? '© 2025 BaseballTrend. 실시간 야구 승률 예측 서비스'
              : '© 2025 BaseballTrend. Real-time baseball win probability predictions'
            }
          </p>
        </div>
      </footer>
    </div>
  )
}