'use client'
import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

// 타입 정의
interface InsightMatch {
  match_id: string
  home_team: string
  away_team: string
  home_team_logo: string
  away_team_logo: string
  league_code: string
  league_name: string
  commence_time: string
  home_probability: number
  draw_probability: number
  away_probability: number
  home_odds: number
  draw_odds: number
  away_odds: number
  recommendation: 'HOME' | 'DRAW' | 'AWAY'
  confidence: number
  trend_direction: 'UP' | 'DOWN' | 'STABLE'
  trend_change: number
}

interface InsightCombo {
  id: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  type: 'SAFE' | 'BALANCED' | 'HIGH_RETURN' | 'TRENDING'
  matches: InsightMatch[]
  totalOdds: number
  expectedReturn: number
  confidence: number
  icon: string
}

// 리그 로고 매핑 (20개 - 12개 리그 + 8개 컵대회)
const LEAGUE_LOGOS: { [key: string]: string } = {
  // 유럽 대항전
  'CL': 'https://media.api-sports.io/football/leagues/2.png',
  'EL': 'https://media.api-sports.io/football/leagues/3.png',
  'UECL': 'https://media.api-sports.io/football/leagues/848.png',
  'UNL': 'https://media.api-sports.io/football/leagues/5.png',
  // 잉글랜드
  'PL': 'https://media.api-sports.io/football/leagues/39.png',
  'ELC': 'https://media.api-sports.io/football/leagues/40.png',
  'FAC': 'https://media.api-sports.io/football/leagues/45.png',   // 🆕 FA Cup
  'EFL': 'https://media.api-sports.io/football/leagues/46.png',   // 🆕 EFL Cup
  // 스페인
  'PD': 'https://media.api-sports.io/football/leagues/140.png',
  'CDR': 'https://media.api-sports.io/football/leagues/143.png',  // 🆕 Copa del Rey
  // 독일
  'BL1': 'https://media.api-sports.io/football/leagues/78.png',
  'DFB': 'https://media.api-sports.io/football/leagues/81.png',   // 🆕 DFB Pokal
  // 이탈리아
  'SA': 'https://media.api-sports.io/football/leagues/135.png',
  'CIT': 'https://media.api-sports.io/football/leagues/137.png',  // 🆕 Coppa Italia
  // 프랑스
  'FL1': 'https://media.api-sports.io/football/leagues/61.png',
  'CDF': 'https://media.api-sports.io/football/leagues/66.png',   // 🆕 Coupe de France
  // 포르투갈
  'PPL': 'https://media.api-sports.io/football/leagues/94.png',
  'TDP': 'https://media.api-sports.io/football/leagues/96.png',   // 🆕 Taca de Portugal
  // 네덜란드
  'DED': 'https://media.api-sports.io/football/leagues/88.png',
  'KNV': 'https://media.api-sports.io/football/leagues/90.png',   // 🆕 KNVB Beker
}

// 조합 타입별 색상
const COMBO_COLORS: { [key: string]: { bg: string, border: string, badge: string } } = {
  'SAFE': { bg: 'bg-green-500/10', border: 'border-green-500/30', badge: 'bg-green-500' },
  'TRENDING': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', badge: 'bg-blue-500' },
  'BALANCED': { bg: 'bg-purple-500/10', border: 'border-purple-500/30', badge: 'bg-purple-500' },
  'HIGH_RETURN': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', badge: 'bg-orange-500' },
}

export default function InsightsPage() {
  const [combos, setCombos] = useState<InsightCombo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCombo, setSelectedCombo] = useState<string | null>(null)
  const [matchCount, setMatchCount] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const { t, language } = useLanguage()
  const currentLanguage = language || 'ko'  // 기본값 한글
  
  // 디버깅용
  useEffect(() => {
    console.log('🌐 현재 언어:', currentLanguage, '(원본:', language, ')')
  }, [currentLanguage, language])
  
  const darkMode = true // 다크모드 고정

  // 데이터 로드
  useEffect(() => {
    async function fetchInsights() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch('/api/insights')
        const result = await response.json()
        
        if (result.success) {
          setCombos(result.data.combos || [])
          setMatchCount(result.data.matchCount || 0)
          setLastUpdated(result.data.lastUpdated || '')
          
          // 첫 번째 조합 자동 선택
          if (result.data.combos?.length > 0) {
            setSelectedCombo(result.data.combos[0].id)
          }
        } else {
          setError(result.error || '데이터를 불러올 수 없습니다')
        }
      } catch (err) {
        console.error('인사이트 로드 실패:', err)
        setError('서버 연결에 실패했습니다')
      } finally {
        setLoading(false)
      }
    }
    
    fetchInsights()
  }, [])

  // 시간 포맷
  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Seoul'
    })
  }

  // 날짜 포맷
  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Seoul'
    })
  }

  // 추천 텍스트
  const getRecommendationText = (rec: 'HOME' | 'DRAW' | 'AWAY', homeTeam: string, awayTeam: string) => {
    if (rec === 'HOME') return currentLanguage === 'ko' ? `${homeTeam} 승` : `${homeTeam} Win`
    if (rec === 'DRAW') return currentLanguage === 'ko' ? '무승부' : 'Draw'
    return currentLanguage === 'ko' ? `${awayTeam} 승` : `${awayTeam} Win`
  }

  // 트렌드 아이콘
  const getTrendIcon = (direction: 'UP' | 'DOWN' | 'STABLE') => {
    if (direction === 'UP') return '📈'
    if (direction === 'DOWN') return '📉'
    return '➡️'
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#0a0a0a] text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* 로딩 상태 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-5xl mb-4 animate-bounce">📊</div>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {currentLanguage === 'ko' ? '인사이트 분석 중...' : 'Analyzing insights...'}
            </p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className={`rounded-xl p-6 text-center ${darkMode ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
            <div className="text-4xl mb-3">⚠️</div>
            <p className={darkMode ? 'text-red-400' : 'text-red-600'}>{error}</p>
          </div>
        )}

        {/* 경기 없음 */}
        {!loading && !error && combos.length === 0 && (
          <div className={`rounded-xl p-8 text-center ${darkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
            <div className="text-5xl mb-4">🌙</div>
            <h2 className="text-xl font-bold mb-2">
              {currentLanguage === 'ko' ? '오늘 예정된 경기가 없습니다' : 'No matches scheduled today'}
            </h2>
            <p className={darkMode ? 'text-gray-500' : 'text-gray-500'}>
              {currentLanguage === 'ko' ? '내일 경기를 확인해주세요' : 'Please check tomorrow\'s matches'}
            </p>
          </div>
        )}

        {/* 조합 카드들 */}
        {!loading && !error && combos.length > 0 && (
          <div className="space-y-4">
            {/* 통합 헤더: 타이틀 + 정보 + 탭 */}
            <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'}`}>
              {/* 상단: 타이틀 + LIVE 뱃지 */}
              <div className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    <div>
                      <h1 className="text-xl font-bold">
                        {currentLanguage === 'ko' ? '인사이트' : 'Insights'}
                      </h1>
                      <p className={`text-sm flex items-center gap-1.5 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        <span>{matchCount}{currentLanguage === 'ko' ? '경기 분석' : ' matches'}</span>
                        <span className={darkMode ? 'text-gray-700' : 'text-gray-300'}>·</span>
                        <span>{combos.length}{currentLanguage === 'ko' ? '개 조합' : ' combos'}</span>
                        <span className={darkMode ? 'text-gray-700' : 'text-gray-300'}>·</span>
                        <span>{lastUpdated ? formatTime(lastUpdated) : '--:--'}</span>
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${darkMode ? 'bg-[#A3FF4C]/20 text-[#A3FF4C]' : 'bg-green-100 text-green-700'}`}>
                    LIVE
                  </div>
                </div>
              </div>

              {/* 조합 탭 */}
              <div className="px-4 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
                {combos.map((combo) => {
                  const colors = COMBO_COLORS[combo.type]
                  const isSelected = selectedCombo === combo.id
                  
                  return (
                    <button
                      key={combo.id}
                      onClick={() => setSelectedCombo(combo.id)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-all text-sm ${
                        isSelected
                          ? `${colors.badge} text-white`
                          : `${darkMode ? 'bg-[#252525] text-gray-300 hover:bg-[#303030]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                      }`}
                    >
                      <span className="mr-1.5">{combo.icon}</span>
                      {currentLanguage === 'ko' ? combo.name.replace(combo.icon, '').trim() : combo.nameEn.replace(combo.icon, '').trim()}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 선택된 조합 상세 */}
            {combos.map((combo) => {
              if (selectedCombo !== combo.id) return null
              const colors = COMBO_COLORS[combo.type]
              
              return (
                <div key={combo.id} className="space-y-4">
                  {/* 조합 헤더 */}
                  <div className={`rounded-xl p-5 ${colors.bg} ${colors.border} border`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                          {currentLanguage === 'ko' ? combo.name : combo.nameEn}
                        </h2>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {currentLanguage === 'ko' ? combo.description : combo.descriptionEn}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-sm font-bold ${colors.badge} text-white`}>
                        {combo.matches.length}{currentLanguage === 'ko' ? '폴드' : '-Fold'}
                      </div>
                    </div>
                    
                    {/* 배당 정보 */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className={`rounded-lg p-3 ${darkMode ? 'bg-black/30' : 'bg-white/50'}`}>
                        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {currentLanguage === 'ko' ? '조합 배당' : 'Total Odds'}
                        </div>
                        <div className="text-2xl font-black text-[#A3FF4C]">
                          x{combo.totalOdds.toFixed(2)}
                        </div>
                      </div>
                      <div className={`rounded-lg p-3 ${darkMode ? 'bg-black/30' : 'bg-white/50'}`}>
                        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {currentLanguage === 'ko' ? '예상 리턴' : 'Expected Return'}
                        </div>
                        <div className="text-2xl font-black">
                          {combo.expectedReturn.toLocaleString()}P
                        </div>
                      </div>
                      <div className={`rounded-lg p-3 ${darkMode ? 'bg-black/30' : 'bg-white/50'}`}>
                        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {currentLanguage === 'ko' ? '평균 신뢰도' : 'Avg Confidence'}
                        </div>
                        <div className="text-2xl font-black">
                          {combo.confidence}%
                        </div>
                      </div>
                    </div>
                    
                    {/* 10,000P 기준 안내 */}
                    <div className={`mt-3 text-xs text-center ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      💡 {currentLanguage === 'ko' ? '10,000P 기준 예상 리턴' : 'Based on 10,000P'}
                    </div>
                  </div>

                  {/* 경기 리스트 */}
                  <div className="space-y-3">
                    {combo.matches.map((match, index) => {
                      const odds = match.recommendation === 'HOME' ? match.home_odds 
                                 : match.recommendation === 'DRAW' ? match.draw_odds 
                                 : match.away_odds
                      
                      return (
                        <div
                          key={match.match_id}
                          className={`rounded-xl p-4 ${darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'}`}
                        >
                          {/* 상단: 리그 + 시간 */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <img 
                                src={LEAGUE_LOGOS[match.league_code] || ''} 
                                alt={match.league_name}
                                className="w-5 h-5 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                              <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                {match.league_name}
                              </span>
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              {formatDate(match.commence_time)} {formatTime(match.commence_time)}
                            </div>
                          </div>

                          {/* 중앙: 팀 정보 */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              <img 
                                src={match.home_team_logo} 
                                alt={match.home_team}
                                className="w-8 h-8 object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">⚽</text></svg>'
                                }}
                              />
                              <span className="font-medium truncate">{match.home_team}</span>
                            </div>
                            <div className={`px-3 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>vs</div>
                            <div className="flex items-center gap-3 flex-1 justify-end">
                              <span className="font-medium truncate text-right">{match.away_team}</span>
                              <img 
                                src={match.away_team_logo} 
                                alt={match.away_team}
                                className="w-8 h-8 object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">⚽</text></svg>'
                                }}
                              />
                            </div>
                          </div>

                          {/* 하단: 추천 + 배당 + 트렌드 */}
                          <div className="flex items-center justify-between">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.bg} ${colors.border} border`}>
                              <span className="text-sm font-bold">
                                {getRecommendationText(match.recommendation, match.home_team, match.away_team)}
                              </span>
                              <span className={`text-sm font-bold ${colors.badge.replace('bg-', 'text-')}`}>
                                @{odds.toFixed(2)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {/* 트렌드 */}
                              <div className="flex items-center gap-1">
                                <span>{getTrendIcon(match.trend_direction)}</span>
                                {match.trend_change !== 0 && (
                                  <span className={`text-xs ${
                                    match.trend_direction === 'UP' ? 'text-green-400' : 
                                    match.trend_direction === 'DOWN' ? 'text-red-400' : 'text-gray-400'
                                  }`}>
                                    {match.trend_change > 0 ? '+' : ''}{match.trend_change.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                              
                              {/* 신뢰도 */}
                              <div className={`px-2 py-1 rounded text-xs font-bold ${
                                match.confidence >= 60 ? 'bg-green-500/20 text-green-400' :
                                match.confidence >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {match.confidence}%
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 면책 조항 */}
                  <div className={`rounded-xl p-4 text-center text-xs ${darkMode ? 'bg-[#1a1a1a] text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
                    ⚠️ {currentLanguage === 'ko' 
                      ? '본 정보는 통계 분석 기반 참고용이며, 예측 결과에 대한 책임은 사용자에게 있습니다.' 
                      : 'This information is for reference only based on statistical analysis.'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* 하단 여백 (네비게이션용) */}
      <div className="h-20 lg:hidden" />
      
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}