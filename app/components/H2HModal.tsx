import { useEffect, useState } from 'react'
import { getTeamLogo } from '../teamLogos'

interface H2HMatch {
  date: string
  league: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  winner: 'home' | 'away' | 'draw'
  isHomeTeamHome: boolean
}

interface FormMatch {
  date: string
  opponent: string
  score: string
  result: 'W' | 'D' | 'L'
  isHome: boolean
}

interface Statistics {
  totalMatches: number
  homeWins: number
  draws: number
  awayWins: number
  homeWinPercentage: number
  drawPercentage: number
  awayWinPercentage: number
  avgGoalsHome: string
  avgGoalsAway: string
}

interface H2HData {
  h2hMatches: H2HMatch[]
  homeForm: FormMatch[]
  awayForm: FormMatch[]
  statistics: Statistics
}

interface H2HModalProps {
  isOpen: boolean
  onClose: () => void
  homeTeam: string
  awayTeam: string
  league: string
  homeTeamLogo?: string  // 추가
  awayTeamLogo?: string  // 추가
}

type TabType = 'h2h' | 'form'

export default function H2HModal({
  isOpen,
  onClose,
  homeTeam,
  awayTeam,
  league,
  homeTeamLogo,
  awayTeamLogo
}: H2HModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<H2HData | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('h2h')

  // 팀 로고 - prop으로 받거나 getTeamLogo 폴백
  const finalHomeTeamLogo = homeTeamLogo || getTeamLogo(homeTeam)
  const finalAwayTeamLogo = awayTeamLogo || getTeamLogo(awayTeam)

  useEffect(() => {
    if (!isOpen) return

    const fetchH2HData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `/api/h2h?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}&league=${league}`
        )

        if (!response.ok) {
          throw new Error('H2H 데이터를 불러오는데 실패했습니다')
        }

        const result = await response.json()
        setData(result)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchH2HData()
  }, [isOpen, homeTeam, awayTeam, league])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-full max-w-lg sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 - Sofascore 스타일 그라데이션 */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 dark:from-blue-900 dark:via-blue-950 dark:to-purple-950 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
          {/* 배경 패턴 */}
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="20" cy="20" r="1" fill="white"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)"/>
            </svg>
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-all p-2 hover:bg-white/10 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 타이틀 */}
          <div className="relative text-center mb-4 sm:mb-6">
            <div className="inline-block bg-white/10 backdrop-blur-xl rounded-full px-4 py-1.5 sm:px-6 sm:py-2 border border-white/20">
              <span className="text-white text-xs sm:text-sm font-bold tracking-wide">HEAD TO HEAD</span>
            </div>
          </div>

          {/* 팀 정보 - Bet365 스타일 */}
          <div className="relative flex items-center justify-between gap-2 sm:gap-4 lg:gap-8 max-w-4xl mx-auto">
            {/* 홈팀 */}
            <div className="flex flex-col items-center gap-2 sm:gap-3 lg:gap-4 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white rounded-full p-2 sm:p-3 lg:p-4 shadow-2xl ring-2 sm:ring-4 ring-white/20">
                  <img 
                    src={finalHomeTeamLogo} 
                    alt={homeTeam}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><text y="50" font-size="40">⚽</text></svg>'
                    }}
                  />
                </div>
              </div>
              <div className="text-center w-full">
                <div className="text-white font-black text-sm sm:text-base lg:text-xl mb-1 truncate px-1">{homeTeam}</div>
                <div className="inline-block bg-white/10 backdrop-blur-md rounded-full px-2 sm:px-3 py-0.5 sm:py-1">
                  <span className="text-white/80 text-[10px] sm:text-xs font-medium">홈</span>
                </div>
              </div>
            </div>

            {/* VS - Flashscore 스타일 */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="bg-white/10 backdrop-blur-xl border-2 border-white/30 rounded-xl sm:rounded-2xl w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 flex items-center justify-center shadow-2xl">
                <span className="text-white font-black text-lg sm:text-xl lg:text-2xl tracking-tight">VS</span>
              </div>
            </div>

            {/* 원정팀 */}
            <div className="flex flex-col items-center gap-2 sm:gap-3 lg:gap-4 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white rounded-full p-2 sm:p-3 lg:p-4 shadow-2xl ring-2 sm:ring-4 ring-white/20">
                  <img 
                    src={finalAwayTeamLogo} 
                    alt={awayTeam}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><text y="50" font-size="40">⚽</text></svg>'
                    }}
                  />
                </div>
              </div>
              <div className="text-center w-full">
                <div className="text-white font-black text-sm sm:text-base lg:text-xl mb-1 truncate px-1">{awayTeam}</div>
                <div className="inline-block bg-white/10 backdrop-blur-md rounded-full px-2 sm:px-3 py-0.5 sm:py-1">
                  <span className="text-white/80 text-[10px] sm:text-xs font-medium">원정</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 메뉴 - Sofascore 스타일 */}
        <div className="bg-gray-50 dark:bg-[#0f0f0f] border-b-2 border-gray-200 dark:border-gray-900">
          <div className="flex max-w-md mx-auto">
            <button
              onClick={() => setActiveTab('h2h')}
              className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold transition-all relative ${
                activeTab === 'h2h'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="relative z-10">🏆 최근 맞대결</span>
              {activeTab === 'h2h' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('form')}
              className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold transition-all relative ${
                activeTab === 'form'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="relative z-10">📊 최근 폼</span>
              {activeTab === 'form' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-full"></div>
              )}
            </button>
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="overflow-y-auto max-h-[calc(90vh-300px)]">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">데이터를 불러오는 중...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 max-w-md">
                <div className="text-5xl mb-4">⚠️</div>
                <p className="text-red-600 dark:text-red-400 font-bold text-lg mb-2">데이터 로딩 실패</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* H2H 탭 */}
              {activeTab === 'h2h' && (
                <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
                  {/* 통계 카드 - Sofascore 스타일 */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-800">
                    <div className="text-center mb-4 sm:mb-6">
                      <h3 className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        최근 10경기 통계
                      </h3>
                    </div>

                    {/* 원형 통계 - Bet365 스타일 */}
                    <div className="flex justify-center items-center gap-2 sm:gap-3 lg:gap-4 mb-6 sm:mb-8">
                      {/* 홈 승 */}
                      <div className="flex flex-col items-center flex-1">
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mb-2 sm:mb-3">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="50%"
                              cy="50%"
                              r="42%"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              className="text-gray-200 dark:text-gray-800"
                            />
                            <circle
                              cx="50%"
                              cy="50%"
                              r="42%"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 42}`}
                              strokeDashoffset={`${2 * Math.PI * 42 * (1 - data.statistics.homeWins / data.statistics.totalMatches)}`}
                              className="text-blue-500 transition-all duration-1000"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl sm:text-2xl lg:text-3xl font-black text-blue-600 dark:text-blue-400">{data.statistics.homeWins}</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] sm:text-xs font-bold text-gray-900 dark:text-white mb-1 truncate max-w-[80px]">{homeTeam}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{data.statistics.homeWinPercentage}%</p>
                        </div>
                      </div>

                      {/* 무승부 */}
                      <div className="flex flex-col items-center flex-1">
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mb-2 sm:mb-3">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="50%"
                              cy="50%"
                              r="42%"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              className="text-gray-200 dark:text-gray-800"
                            />
                            <circle
                              cx="50%"
                              cy="50%"
                              r="42%"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 42}`}
                              strokeDashoffset={`${2 * Math.PI * 42 * (1 - data.statistics.draws / data.statistics.totalMatches)}`}
                              className="text-gray-400 transition-all duration-1000"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-600 dark:text-gray-400">{data.statistics.draws}</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] sm:text-xs font-bold text-gray-900 dark:text-white mb-1">무승부</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{data.statistics.drawPercentage}%</p>
                        </div>
                      </div>

                      {/* 원정 승 */}
                      <div className="flex flex-col items-center flex-1">
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mb-2 sm:mb-3">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="50%"
                              cy="50%"
                              r="42%"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              className="text-gray-200 dark:text-gray-800"
                            />
                            <circle
                              cx="50%"
                              cy="50%"
                              r="42%"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 42}`}
                              strokeDashoffset={`${2 * Math.PI * 42 * (1 - data.statistics.awayWins / data.statistics.totalMatches)}`}
                              className="text-red-500 transition-all duration-1000"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl sm:text-2xl lg:text-3xl font-black text-red-600 dark:text-red-400">{data.statistics.awayWins}</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] sm:text-xs font-bold text-gray-900 dark:text-white mb-1 truncate max-w-[80px]">{awayTeam}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{data.statistics.awayWinPercentage}%</p>
                        </div>
                      </div>
                    </div>

                    {/* 평균 골 비교 - Flashscore 스타일 바 차트 */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-3 sm:p-4 lg:p-5 border border-gray-200 dark:border-gray-800">
                      <h4 className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 sm:mb-4 text-center">
                        평균 득점
                      </h4>
                      <div className="space-y-4">
                        {/* 홈팀 */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{homeTeam}</span>
                            <span className="text-lg font-black text-blue-600 dark:text-blue-400">{data.statistics.avgGoalsHome}</span>
                          </div>
                          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min((parseFloat(data.statistics.avgGoalsHome) / 5) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* 원정팀 */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{awayTeam}</span>
                            <span className="text-lg font-black text-red-600 dark:text-red-400">{data.statistics.avgGoalsAway}</span>
                          </div>
                          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min((parseFloat(data.statistics.avgGoalsAway) / 5) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 경기 기록 리스트 */}
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 sm:mb-4 px-1">
                      경기 기록
                    </h3>
                    <div className="space-y-2">
                      {data.h2hMatches.map((match, index) => (
                        <div 
                          key={index}
                          className="bg-white dark:bg-[#1e1e1e] rounded-xl p-2 sm:p-3 lg:p-4 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-lg"
                        >
                          <div className="flex items-center justify-between gap-2 sm:gap-3 lg:gap-4">
                            {/* 날짜 & 리그 */}
                            <div className="flex-shrink-0 w-16 sm:w-20 lg:w-24">
                              <div className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-500">
                                {new Date(match.date).toLocaleDateString('ko-KR', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </div>
                              <div className="text-[9px] sm:text-xs text-gray-400 dark:text-gray-600 mt-0.5 truncate">
                                {match.league}
                              </div>
                            </div>

                            {/* 경기 정보 */}
                            <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-1 min-w-0">
                              {/* 홈팀 */}
                              <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end min-w-0">
                                <span className={`text-[10px] sm:text-xs lg:text-sm font-bold truncate ${
                                  match.isHomeTeamHome 
                                    ? 'text-gray-900 dark:text-white' 
                                    : 'text-gray-500 dark:text-gray-500'
                                }`}>
                                  {match.homeTeam}
                                </span>
                                <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-0.5 sm:p-1 flex-shrink-0">
                                  <img 
                                    src={getTeamLogo(match.homeTeam)} 
                                    alt={match.homeTeam}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                </div>
                              </div>

                              {/* 스코어 */}
                              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 rounded-lg px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 shadow-sm border border-gray-200 dark:border-gray-800 flex-shrink-0">
                                <span className="text-sm sm:text-lg lg:text-xl font-black text-gray-900 dark:text-white">
                                  {match.homeScore}
                                </span>
                                <span className="text-gray-400 dark:text-gray-600 mx-1 sm:mx-1.5 lg:mx-2 font-bold text-xs sm:text-sm">-</span>
                                <span className="text-sm sm:text-lg lg:text-xl font-black text-gray-900 dark:text-white">
                                  {match.awayScore}
                                </span>
                              </div>

                              {/* 원정팀 */}
                              <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-0.5 sm:p-1 flex-shrink-0">
                                  <img 
                                    src={getTeamLogo(match.awayTeam)} 
                                    alt={match.awayTeam}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                </div>
                                <span className={`text-[10px] sm:text-xs lg:text-sm font-bold truncate ${
                                  !match.isHomeTeamHome 
                                    ? 'text-gray-900 dark:text-white' 
                                    : 'text-gray-500 dark:text-gray-500'
                                }`}>
                                  {match.awayTeam}
                                </span>
                              </div>
                            </div>

                            {/* 결과 배지 */}
                            <div className="flex-shrink-0 w-8 sm:w-10 lg:w-12">
                              {match.winner !== 'draw' && (
                                <span className={`inline-flex items-center justify-center w-full px-2 py-1 rounded-full text-xs font-black ${
                                  (match.winner === 'home' && match.isHomeTeamHome) || 
                                  (match.winner === 'away' && !match.isHomeTeamHome)
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {((match.winner === 'home' && match.isHomeTeamHome) || 
                                    (match.winner === 'away' && !match.isHomeTeamHome)) ? '승' : '패'}
                                </span>
                              )}
                              {match.winner === 'draw' && (
                                <span className="inline-flex items-center justify-center w-full px-2 py-1 rounded-full text-xs font-black bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                                  무
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 최근 폼 탭 */}
              {activeTab === 'form' && (
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 홈팀 폼 */}
                    <div>
                      <div className="flex items-center gap-3 mb-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-950/20 rounded-xl border-l-4 border-blue-600">
                        <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-900 p-2 shadow-lg">
                          <img 
                            src={finalHomeTeamLogo} 
                            alt={homeTeam}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><text y="30" font-size="30">⚽</text></svg>'
                            }}
                          />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-gray-900 dark:text-white">{homeTeam}</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">최근 5경기</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {data.homeForm.map((match, index) => (
                          <div 
                            key={index}
                            className="bg-white dark:bg-[#1e1e1e] rounded-xl p-4 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                                    match.isHome 
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                  }`}>
                                    {match.isHome ? '🏠 홈' : '✈️ 원정'}
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                  vs {match.opponent}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                                  {match.score}
                                </div>
                              </div>
                              
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-base shadow-lg ${
                                match.result === 'W'
                                  ? 'bg-gradient-to-br from-green-400 to-green-600 text-white'
                                  : match.result === 'D'
                                    ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white'
                                    : 'bg-gradient-to-br from-red-400 to-red-600 text-white'
                              }`}>
                                {match.result}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 원정팀 폼 */}
                    <div>
                      <div className="flex items-center gap-3 mb-4 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-950/20 rounded-xl border-l-4 border-red-600">
                        <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-900 p-2 shadow-lg">
                          <img 
                            src={finalAwayTeamLogo} 
                            alt={awayTeam}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><text y="30" font-size="30">⚽</text></svg>'
                            }}
                          />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-gray-900 dark:text-white">{awayTeam}</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">최근 5경기</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {data.awayForm.map((match, index) => (
                          <div 
                            key={index}
                            className="bg-white dark:bg-[#1e1e1e] rounded-xl p-4 border border-gray-200 dark:border-gray-800 hover:border-red-300 dark:hover:border-red-700 transition-all"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                                    match.isHome 
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                  }`}>
                                    {match.isHome ? '🏠 홈' : '✈️ 원정'}
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                  vs {match.opponent}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                                  {match.score}
                                </div>
                              </div>
                              
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-base shadow-lg ${
                                match.result === 'W'
                                  ? 'bg-gradient-to-br from-green-400 to-green-600 text-white'
                                  : match.result === 'D'
                                    ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white'
                                    : 'bg-gradient-to-br from-red-400 to-red-600 text-white'
                              }`}>
                                {match.result}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}