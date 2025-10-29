'use client'

import { useState, useEffect } from 'react'

interface Match {
  id: number
  league: string
  leagueLogo?: string
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  homeCrest: string
  awayCrest: string
  homeScore: number | null
  awayScore: number | null
  status: string
}

// 팀 이름 한글 번역
const translateTeamName = (teamName: string): string => {
  const teamTranslations: { [key: string]: string } = {
    'Manchester United FC': '맨체스터 유나이티드',
    'Manchester City FC': '맨체스터 시티',
    'Liverpool FC': '리버풀',
    'Chelsea FC': '첼시',
    'Arsenal FC': '아스날',
    'Tottenham Hotspur FC': '토트넘',
    'FC Barcelona': '바르셀로나',
    'Real Madrid CF': '레알 마드리드',
    'Atlético de Madrid': '아틀레티코 마드리드',
    'FC Bayern München': '바이에른 뮌헨',
    'Borussia Dortmund': '도르트문트',
    'Juventus FC': '유벤투스',
    'Inter Milan': '인테르',
    'AC Milan': '밀란',
    'Paris Saint-Germain FC': '파리 생제르맹',
  }
  
  return teamTranslations[teamName] || teamName
}

// 리그 이름 한글 번역
const translateLeagueName = (leagueName: string): string => {
  const leagueTranslations: { [key: string]: string } = {
    'Premier League': '프리미어리그',
    'Primera Division': '라리가',
    'Serie A': '세리에 A',
    'Bundesliga': '분데스리가',
    'Ligue 1': '리그 1',
    'UEFA Champions League': '챔피언스리그',
    'Championship': '챔피언십',
    '2. Bundesliga': '분데스2',
    'Serie B': '세리에 B',
    'Eredivisie': '에레디비시',
    'Primeira Liga': '프리메이라리가',
    'Scottish Premiership': '스코틀랜드 프리미어십',
  }
  
  return leagueTranslations[leagueName] || leagueName
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'results'>('scheduled')
  const [selectedLeague, setSelectedLeague] = useState<string>('all')
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [analysis, setAnalysis] = useState<string>('')
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [h2h, setH2H] = useState<string>('')
  const [loadingH2H, setLoadingH2H] = useState(false)
  const [showH2HModal, setShowH2HModal] = useState(false)

  // 다크모드 토글
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // 경기 데이터 로드
  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/matches?type=${activeTab}`)
        const data = await response.json()
        setMatches(data)
      } catch (error) {
        console.error('경기 로드 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [activeTab])

  // AI 분석 핸들러
  const handleAnalysis = async (match: Match) => {
    setSelectedMatch(match)
    setShowAnalysisModal(true)
    setLoadingAnalysis(true)
    setAnalysis('')

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match })
      })
      
      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.analysis) {
        setAnalysis(data.analysis)
      } else {
        throw new Error('분석 데이터가 없습니다')
      }
    } catch (error) {
      console.error('분석 오류:', error)
      setAnalysis(`분석을 불러오는데 실패했습니다.\n\n오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setLoadingAnalysis(false)
    }
  }

  // H2H 분석 핸들러
  const handleH2H = async (match: Match) => {
    setSelectedMatch(match)
    setShowH2HModal(true)
    setLoadingH2H(true)
    setH2H('')

    try {
      const response = await fetch('/api/h2h', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match })
      })
      
      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.h2h) {
        setH2H(data.h2h)
      } else {
        throw new Error('H2H 데이터가 없습니다')
      }
    } catch (error) {
      console.error('H2H 오류:', error)
      setH2H(`상대전적을 불러오는데 실패했습니다.\n\n오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setLoadingH2H(false)
    }
  }

  // 리그별 활성 클래스 반환
  const getLeagueActiveClass = (leagueName: string): string => {
    const classes: { [key: string]: string } = {
      'Premier League': 'bg-purple-600 text-white shadow-lg',
      'Primera Division': 'bg-orange-600 text-white shadow-lg',
      'Serie A': 'bg-blue-700 text-white shadow-lg',
      'Bundesliga': 'bg-red-600 text-white shadow-lg',
      'Ligue 1': 'bg-blue-500 text-white shadow-lg',
      'UEFA Champions League': 'bg-indigo-700 text-white shadow-lg',
      'Championship': 'bg-purple-500 text-white shadow-lg',
      '2. Bundesliga': 'bg-red-500 text-white shadow-lg',
      'Serie B': 'bg-blue-600 text-white shadow-lg',
      'Eredivisie': 'bg-orange-500 text-white shadow-lg',
    }
    return classes[leagueName] || 'bg-slate-600 text-white shadow-lg'
  }

  return (
    <div className={darkMode ? 'bg-gray-900' : 'bg-white'}>
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* 헤더 */}
          <div className="mb-8 flex items-center justify-between">
            <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              ⚽ 축구 경기 예측
            </h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
            >
              {darkMode ? '🌙' : '☀️'}
            </button>
          </div>

          {/* 승률 배너 - 스크롤 (예정 경기만) */}
          {activeTab === 'scheduled' && matches.length > 0 && (
            <div className="mb-6 overflow-hidden rounded-xl shadow-lg">
              <div className={`${darkMode ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-2 border-slate-700' : 'bg-gradient-to-r from-blue-50 via-white to-blue-50 border-2 border-blue-200'} py-5`}>
                <div className="flex gap-4 animate-scroll">
                  {matches.slice(0, 10).concat(matches.slice(0, 10)).map((match, index) => {
                    const originalIndex = index % matches.length
                    const originalMatch = matches[originalIndex]
                    
                    // 랜덤 승률 생성
                    const homeWin = Math.floor(Math.random() * 30 + 35)
                    const draw = Math.floor(Math.random() * 15 + 20)
                    const awayWin = 100 - homeWin - draw
                    
                    return (
                      <div
                        key={`banner-${match.id}-${index}`}
                        className={`flex items-center gap-4 px-5 py-3 rounded-xl border-2 whitespace-nowrap flex-shrink-0 transition-all cursor-pointer transform hover:scale-105 hover:shadow-xl ${
                          darkMode
                            ? 'bg-slate-800 border-slate-600 hover:bg-slate-700 hover:border-blue-500'
                            : 'bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400'
                        }`}
                        onClick={() => handleAnalysis(originalMatch)}
                      >
                        {/* 홈팀 */}
                        <div className="flex items-center gap-2">
                          <img 
                            src={match.homeCrest} 
                            alt="" 
                            className="w-6 h-6 object-contain"
                          />
                          <span className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {translateTeamName(match.homeTeam).substring(0, 8)}
                          </span>
                        </div>
                        
                        <span className={`text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>VS</span>
                        
                        {/* 원정팀 */}
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {translateTeamName(match.awayTeam).substring(0, 8)}
                          </span>
                          <img 
                            src={match.awayCrest} 
                            alt="" 
                            className="w-6 h-6 object-contain"
                          />
                        </div>
                        
                        {/* 승률 - 더 크고 눈에 띄게 */}
                        <div className="flex gap-3 ml-3 pl-3 border-l-2 border-gray-300 dark:border-slate-600">
                          <div className="text-center">
                            <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>홈</div>
                            <div className={`text-lg font-extrabold ${homeWin > 50 ? 'text-emerald-500' : 'text-blue-500'}`}>
                              {homeWin}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>무</div>
                            <div className={`text-lg font-extrabold ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                              {draw}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>원정</div>
                            <div className={`text-lg font-extrabold ${awayWin > 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {awayWin}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 리그 필터 */}
          <div className={`mb-6 overflow-x-auto ${darkMode ? 'bg-slate-900' : 'bg-gray-100'} rounded-xl`}>
            <div className="flex items-center gap-2 py-3 px-2 min-w-max">
              <button
                onClick={() => setSelectedLeague('all')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  selectedLeague === 'all'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : darkMode
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-slate-600 hover:bg-gray-200'
                }`}
              >
                🌍 전체
              </button>

              {Array.from(new Set(matches.map(m => m.league))).map(league => {
                const leagueLogo = matches.find(m => m.league === league)?.leagueLogo
                
                return (
                  <button
                    key={league}
                    onClick={() => setSelectedLeague(league)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                      selectedLeague === league
                        ? getLeagueActiveClass(league)
                        : darkMode
                          ? 'text-slate-300 hover:bg-slate-800'
                          : 'text-slate-600 hover:bg-gray-200'
                    }`}
                  >
                    {leagueLogo ? (
                      <img 
                        src={leagueLogo} 
                        alt={league}
                        className="w-5 h-5 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className="text-lg">⚽</span>
                    )}
                    <span>{translateLeagueName(league)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 탭 버튼 */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex-1 py-4 px-6 rounded-2xl font-bold text-lg transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-blue-600 text-white shadow-xl'
                  : darkMode
                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📅 예정
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`flex-1 py-4 px-6 rounded-2xl font-bold text-lg transition-all ${
                activeTab === 'results'
                  ? 'bg-blue-600 text-white shadow-xl'
                  : darkMode
                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🏆 결과
            </button>
          </div>

          {/* 경기 목록 */}
          <div>
            {loading ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">⚽</div>
                <p className={`text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  로딩 중...
                </p>
              </div>
            ) : (
              <>
                {selectedLeague !== 'all' && (
                  <div className={`text-center py-4 ${darkMode ? 'text-slate-400' : 'text-gray-700'}`}>
                    <p className="text-sm font-medium">
                      {translateLeagueName(selectedLeague)} 경기: {matches.filter(m => m.league === selectedLeague).length}개
                    </p>
                  </div>
                )}
                
                {matches.filter(match => selectedLeague === 'all' || match.league === selectedLeague).length === 0 ? (
                  <div className={`text-center py-20 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    <p className="text-xl font-medium">
                      {translateLeagueName(selectedLeague)}의 경기가 없습니다
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {matches
                      .filter(match => selectedLeague === 'all' || match.league === selectedLeague)
                      .map((match, index) => (
                        <div
                          key={match.id}
                          className={`rounded-2xl p-6 border-2 transition-all duration-300 hover:shadow-2xl hover:scale-105 animate-fade-in ${
                            darkMode
                              ? 'bg-slate-800 border-slate-700 hover:border-blue-500'
                              : 'bg-white border-gray-200 hover:border-blue-400'
                          }`}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          {/* 리그 & 날짜 */}
                          <div className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                            <div className="font-bold text-blue-500">
                              {translateLeagueName(match.league)}
                            </div>
                            <div>{match.date} {match.time}</div>
                          </div>

                          {/* 경기 정보 */}
                          <div className="flex items-center justify-between">
                            {/* 홈 팀 */}
                            <div className="flex-1 text-center">
                              <div className={`text-xs mb-2 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                                홈
                              </div>
                              <img
                                src={match.homeCrest}
                                alt={match.homeTeam}
                                className="w-16 h-16 mx-auto mb-2 object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text y="40" font-size="40">⚽</text></svg>'
                                }}
                              />
                              <div className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {translateTeamName(match.homeTeam)}
                              </div>
                            </div>

                            {/* VS 또는 스코어 */}
                            <div className="flex-1 text-center px-4">
                              {match.status === 'FINISHED' && match.homeScore !== null ? (
                                <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {match.homeScore} - {match.awayScore}
                                </div>
                              ) : (
                                <div className={`text-2xl font-bold ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                  VS
                                </div>
                              )}
                            </div>

                            {/* 원정 팀 */}
                            <div className="flex-1 text-center">
                              <div className={`text-xs mb-2 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                                원정
                              </div>
                              <img
                                src={match.awayCrest}
                                alt={match.awayTeam}
                                className="w-16 h-16 mx-auto mb-2 object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text y="40" font-size="40">⚽</text></svg>'
                                }}
                              />
                              <div className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {translateTeamName(match.awayTeam)}
                              </div>
                            </div>
                          </div>

                          {/* AI 분석 & H2H 버튼 (예정 경기만) */}
                          {activeTab === 'scheduled' && (
                            <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-slate-700">
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() => handleAnalysis(match)}
                                  className={`py-3 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 hover:shadow-lg active:scale-95 ${
                                    darkMode
                                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white'
                                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white'
                                  }`}
                                >
                                  <span className="animate-pulse-slow">🤖</span>
                                  <span>AI 분석</span>
                                </button>
                                <button
                                  onClick={() => handleH2H(match)}
                                  className={`py-3 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 hover:shadow-lg active:scale-95 ${
                                    darkMode
                                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white'
                                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white'
                                  }`}
                                >
                                  <span>📊</span>
                                  <span>H2H</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI 분석 모달 */}
      {showAnalysisModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowAnalysisModal(false)}
        >
          <div
            className={`rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl ${
              darkMode ? 'bg-slate-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                🤖 AI 경기 분석
              </h2>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className={`text-3xl transition-transform hover:scale-110 ${
                  darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                ×
              </button>
            </div>

            {selectedMatch && (
              <div className={`mb-4 pb-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="text-center">
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {translateTeamName(selectedMatch.homeTeam)}
                  </span>
                  <span className={`mx-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>vs</span>
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {translateTeamName(selectedMatch.awayTeam)}
                  </span>
                </div>
              </div>
            )}

            {loadingAnalysis ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin text-5xl mb-4">🤖</div>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>AI가 경기를 분석 중입니다...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analysis.split('##').filter(section => section.trim()).map((section, index) => {
                  const lines = section.trim().split('\n')
                  const title = lines[0].replace(/^#+\s*/, '').trim()
                  const content = lines.slice(1).join('\n').trim()
                  
                  const icons = ['📊', '⚽', '🎯', '📈', '💡', '🏆']
                  const icon = icons[index] || '📋'
                  
                  const isPrediction = title.includes('예상 승률') || title.includes('승부 예측')
                  
                  return (
                    <div
                      key={index}
                      className={`p-5 rounded-xl border transition-all ${
                        darkMode 
                          ? 'bg-slate-700 border-slate-600 hover:border-slate-500' 
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{icon}</span>
                        <h3 className={`text-lg font-bold ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {title}
                        </h3>
                      </div>
                      <div className={`leading-relaxed ${
                        darkMode ? 'text-slate-300' : 'text-gray-700'
                      } ${isPrediction ? 'space-y-2' : ''}`}>
                        {isPrediction ? (
                          content.split('\n').map((line, i) => {
                            if (line.includes('%')) {
                              const [label, percent] = line.split(':')
                              const value = parseInt(percent?.replace(/\D/g, '') || '0')
                              return (
                                <div key={i} className={`flex items-center justify-between py-3 px-4 rounded-lg ${
                                  darkMode ? 'bg-slate-600' : 'bg-white border border-gray-200'
                                }`}>
                                  <span className={`font-medium ${
                                    darkMode ? 'text-slate-200' : 'text-gray-700'
                                  }`}>
                                    {label?.trim()}
                                  </span>
                                  <span className={`text-xl font-bold ${
                                    value >= 50 ? 'text-emerald-400' : value >= 30 ? 'text-blue-400' : 'text-slate-400'
                                  }`}>
                                    {percent?.trim()}
                                  </span>
                                </div>
                              )
                            }
                            return <p key={i} className="whitespace-pre-wrap">{line}</p>
                          })
                        ) : (
                          <p className="whitespace-pre-wrap">{content}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* H2H 모달 */}
      {showH2HModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowH2HModal(false)}
        >
          <div
            className={`rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl ${
              darkMode ? 'bg-slate-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📊 상대 전적 (H2H)
              </h2>
              <button
                onClick={() => setShowH2HModal(false)}
                className={`text-3xl transition-transform hover:scale-110 ${
                  darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                ×
              </button>
            </div>

            {selectedMatch && (
              <div className={`mb-4 pb-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="text-center">
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {translateTeamName(selectedMatch.homeTeam)}
                  </span>
                  <span className={`mx-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>vs</span>
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {translateTeamName(selectedMatch.awayTeam)}
                  </span>
                </div>
              </div>
            )}

            {loadingH2H ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin text-5xl mb-4">📊</div>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>전적을 분석 중입니다...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {h2h.split('##').filter(section => section.trim()).map((section, index) => {
                  const lines = section.trim().split('\n')
                  const title = lines[0].replace(/^#+\s*/, '').trim()
                  const content = lines.slice(1).join('\n').trim()
                  
                  const icons = ['🔄', '🏠', '✈️', '⚽', '📈', '🎯']
                  const icon = icons[index] || '📋'
                  
                  return (
                    <div
                      key={index}
                      className={`p-5 rounded-xl border transition-all ${
                        darkMode 
                          ? 'bg-slate-700 border-slate-600 hover:border-slate-500' 
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{icon}</span>
                        <h3 className={`text-lg font-bold ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {title}
                        </h3>
                      </div>
                      <div className={`whitespace-pre-wrap leading-relaxed ${
                        darkMode ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        {content}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* H2H 모달 */}
      {showH2HModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowH2HModal(false)}
        >
          <div
            className={`rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl ${
              darkMode ? 'bg-slate-800' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📊 상대 전적 (H2H)
              </h2>
              <button
                onClick={() => setShowH2HModal(false)}
                className={`text-3xl transition-transform hover:scale-110 ${
                  darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                ×
              </button>
            </div>

            {selectedMatch && (
              <div className={`mb-4 pb-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="text-center">
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {translateTeamName(selectedMatch.homeTeam)}
                  </span>
                  <span className={`mx-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>vs</span>
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {translateTeamName(selectedMatch.awayTeam)}
                  </span>
                </div>
              </div>
            )}

            {loadingH2H ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin text-5xl mb-4">📊</div>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>전적을 분석 중입니다...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {h2h.split('##').filter(section => section.trim()).map((section, index) => {
                  const lines = section.trim().split('\n')
                  const title = lines[0].replace(/^#+\s*/, '').trim()
                  const content = lines.slice(1).join('\n').trim()
                  
                  const icons = ['🔄', '🏠', '✈️', '⚽', '📈', '🎯']
                  const icon = icons[index] || '📋'
                  
                  return (
                    <div
                      key={index}
                      className={`p-5 rounded-xl border transition-all ${
                        darkMode 
                          ? 'bg-slate-700 border-slate-600 hover:border-slate-500' 
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{icon}</span>
                        <h3 className={`text-lg font-bold ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {title}
                        </h3>
                      </div>
                      <div className={`whitespace-pre-wrap leading-relaxed ${
                        darkMode ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        {content}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll {
          animation: scroll 60s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }

        /* 스크롤바 스타일링 */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #1e293b;
        }

        ::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  )
}
