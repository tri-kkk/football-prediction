'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useLanguage } from '../../contexts/LanguageContext'

// 🏆 리그 정보
const LEAGUES = [
  { 
    code: 'ALL', 
    nameKo: '전체',
    nameEn: 'All Leagues',
    logo: '🌍',
    isEmoji: true 
  },
  { 
    code: 'CL', 
    nameKo: '챔스',
    nameEn: 'Champions League',
    logo: 'https://media.api-sports.io/football/leagues/2.png',
    isEmoji: false 
  },
  { 
    code: 'EL', 
    nameKo: '유로파',
    nameEn: 'Europa League',
    logo: 'https://media.api-sports.io/football/leagues/3.png',
    isEmoji: false 
  },
  { 
    code: 'UECL', 
    nameKo: '컨퍼런스',
    nameEn: 'UEFA Conference League',
    logo: 'https://media.api-sports.io/football/leagues/848.png',
    isEmoji: false 
  },
  { 
    code: 'UNL', 
    nameKo: '네이션스',
    nameEn: 'UEFA Nations League',
    logo: 'https://media.api-sports.io/football/leagues/5.png',
    isEmoji: false 
  },
  { 
    code: 'PL', 
    nameKo: 'EPL',
    nameEn: 'Premier League',
    logo: 'https://media.api-sports.io/football/leagues/39.png',
    isEmoji: false 
  },
  { 
    code: 'ELC', 
    nameKo: '챔피언십',
    nameEn: 'Championship',
    logo: 'https://media.api-sports.io/football/leagues/40.png',
    isEmoji: false 
  },
  { 
    code: 'PD', 
    nameKo: '라리가',
    nameEn: 'La Liga',
    logo: 'https://media.api-sports.io/football/leagues/140.png',
    isEmoji: false 
  },
  { 
    code: 'BL1', 
    nameKo: '분데스',
    nameEn: 'Bundesliga',
    logo: 'https://media.api-sports.io/football/leagues/78.png',
    isEmoji: false 
  },
  { 
    code: 'SA', 
    nameKo: '세리에',
    nameEn: 'Serie A',
    logo: 'https://media.api-sports.io/football/leagues/135.png',
    isEmoji: false 
  },
  { 
    code: 'FL1', 
    nameKo: '리그1',
    nameEn: 'Ligue 1',
    logo: 'https://media.api-sports.io/football/leagues/61.png',
    isEmoji: false 
  },
  { 
    code: 'PPL', 
    nameKo: '포르투갈',
    nameEn: 'Primeira Liga',
    logo: 'https://media.api-sports.io/football/leagues/94.png',
    isEmoji: false 
  },
  { 
    code: 'DED', 
    nameKo: '네덜란드',
    nameEn: 'Eredivisie',
    logo: 'https://media.api-sports.io/football/leagues/88.png',
    isEmoji: false 
  },
]

interface Match {
  match_id: string
  home_team: string
  away_team: string
  home_crest?: string
  away_crest?: string
  match_date: string
  league: string
  final_score_home: number
  final_score_away: number
  statistics?: {
    shots_on_goal_home?: number
    shots_on_goal_away?: number
    shots_total_home?: number
    shots_total_away?: number
    possession_home?: number
    possession_away?: number
    passes_home?: number
    passes_away?: number
    pass_accuracy_home?: number
    pass_accuracy_away?: number
    fouls_home?: number
    fouls_away?: number
    yellow_cards_home?: number
    yellow_cards_away?: number
    red_cards_home?: number
    red_cards_away?: number
    offsides_home?: number
    offsides_away?: number
    corners_home?: number
    corners_away?: number
  }
}

export default function MatchResultsPage() {
  const { t, language: currentLanguage } = useLanguage()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('week')
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)

  // 경기 데이터 로드
  useEffect(() => {
    loadMatches()
  }, [selectedLeague, selectedPeriod])

  const loadMatches = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/match-results?league=${selectedLeague}&period=${selectedPeriod}&stats=true`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch match results')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setMatches(data.matches || [])
        console.log(`✅ Loaded ${data.count} match results`)
      } else {
        console.error('❌ API returned error:', data.error)
        setMatches([])
      }
    } catch (error) {
      console.error('❌ Failed to load matches:', error)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }

  // 필터링된 경기 목록
  const filteredMatches = matches.filter(match => 
    selectedLeague === 'ALL' || match.league === selectedLeague
  )

  // 리그별 그룹화
  const groupedMatches = filteredMatches.reduce((acc, match) => {
    const leagueName = getLeagueName(match.league, currentLanguage)
    if (!acc[leagueName]) {
      acc[leagueName] = []
    }
    acc[leagueName].push(match)
    return acc
  }, {} as Record<string, Match[]>)

  function getLeagueName(code: string, lang: string): string {
    const league = LEAGUES.find(l => l.code === code)
    return league ? (lang === 'ko' ? league.nameKo : league.nameEn) : code
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}/${day}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-20 md:pb-0">
      {/* 중앙 컨테이너 */}
      <div className="max-w-7xl mx-auto flex">
        {/* 좌측 사이드바 (데스크탑만) */}
        <aside className="hidden md:block w-64 min-h-screen bg-[#1a1a1a] border-r border-gray-800 sticky top-0 overflow-y-auto">
          <div className="p-4">
            {/* 기간 필터 */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">
                {currentLanguage === 'ko' ? '기간' : 'Period'}
              </h3>
              <div className="space-y-1">
                {[
                  { value: 'today', labelKo: '오늘', labelEn: 'Today' },
                  { value: 'week', labelKo: '최근 7일', labelEn: 'Last 7 days' },
                  { value: 'month', labelKo: '최근 30일', labelEn: 'Last 30 days' },
                ].map(period => (
                  <button
                    key={period.value}
                    onClick={() => setSelectedPeriod(period.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedPeriod === period.value
                        ? 'bg-white text-black font-medium'
                        : 'text-gray-400 hover:bg-[#252525] hover:text-white'
                    }`}
                  >
                    {currentLanguage === 'ko' ? period.labelKo : period.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* 리그 필터 */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">
                {currentLanguage === 'ko' ? '리그' : 'Leagues'}
              </h3>
              <div className="space-y-1">
                {LEAGUES.map(league => (
                  <button
                    key={league.code}
                    onClick={() => setSelectedLeague(league.code)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedLeague === league.code
                        ? 'bg-white text-black font-medium'
                        : 'text-gray-400 hover:bg-[#252525] hover:text-white'
                    }`}
                  >
                    {league.isEmoji ? (
                      <span className="text-base">{league.logo}</span>
                    ) : (
                      <Image 
                        src={league.logo} 
                        alt={league.nameEn}
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                    )}
                    <span>{currentLanguage === 'ko' ? league.nameKo : league.nameEn}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* 메인 컨텐츠 */}
        <main className="flex-1 min-h-screen">
          {/* 헤더 (데스크탑) */}
          <div className="hidden md:block sticky top-0 bg-[#0f0f0f] z-50 border-b border-gray-800">
            <div className="px-6 py-4">
              <h1 className="text-xl font-bold">
                {currentLanguage === 'ko' ? '경기 결과' : 'Match Results'}
              </h1>
            </div>
          </div>

          {/* 헤더 (모바일만) */}
          <div className="md:hidden sticky top-0 bg-[#0f0f0f] z-50">
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-800">
              <h1 className="text-lg font-bold">
                {currentLanguage === 'ko' ? '경기 결과' : 'Match Results'}
              </h1>
              
              {/* 기간 필터 */}
              <div className="flex gap-1.5">
                {[
                  { value: 'today', labelKo: '오늘', labelEn: 'Today' },
                  { value: 'week', labelKo: '7일', labelEn: '7D' },
                  { value: 'month', labelKo: '30일', labelEn: '30D' },
                ].map(period => (
                  <button
                    key={period.value}
                    onClick={() => setSelectedPeriod(period.value)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      selectedPeriod === period.value
                        ? 'bg-white text-black'
                        : 'bg-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {currentLanguage === 'ko' ? period.labelKo : period.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* 리그 필터 - 가로 스크롤 (모바일) */}
            <div className="overflow-x-auto scrollbar-hide border-b border-gray-800">
              <div className="flex gap-2 px-4 py-3 min-w-max">
                {LEAGUES.map(league => (
                  <button
                    key={league.code}
                    onClick={() => setSelectedLeague(league.code)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                      selectedLeague === league.code
                        ? 'bg-white text-black'
                        : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'
                    }`}
                  >
                    {league.isEmoji ? (
                      <span className="text-sm">{league.logo}</span>
                    ) : (
                      <Image 
                        src={league.logo} 
                        alt={league.nameEn}
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                    )}
                    <span className="text-xs font-medium">
                      {currentLanguage === 'ko' ? league.nameKo : league.nameEn}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 경기 목록 */}
          <div className="px-4 py-4 space-y-4">
        {Object.entries(groupedMatches).map(([leagueName, leagueMatches]) => (
          <div key={leagueName}>
            {/* 리그 헤더 */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px bg-gray-800"></div>
              <h2 className="text-xs font-bold text-gray-400 uppercase px-2">
                {leagueName}
              </h2>
              <div className="flex-1 h-px bg-gray-800"></div>
            </div>

            {/* 경기 카드들 */}
            <div className="space-y-2">
              {leagueMatches.map(match => {
                const homeWin = match.final_score_home > match.final_score_away
                const awayWin = match.final_score_away > match.final_score_home
                const isExpanded = expandedMatch === match.match_id
                const hasStats = match.statistics && Object.keys(match.statistics).length > 0

                return (
                  <div
                    key={match.match_id}
                    className="bg-[#1a1a1a] rounded-lg overflow-hidden border border-gray-800/50"
                  >
                    {/* 경기 정보 */}
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedMatch(isExpanded ? null : match.match_id)}
                    >
                      {/* 날짜 */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500 font-medium">
                          {formatDate(match.match_date)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">FT</span>
                          {hasStats && (
                            <span className="text-[10px] text-gray-500">
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 홈팀 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1">
                          {match.home_crest ? (
                            <Image 
                              src={match.home_crest} 
                              alt={match.home_team}
                              width={28}
                              height={28}
                              className="w-7 h-7 object-contain"
                            />
                          ) : (
                            <div className="w-7 h-7 flex items-center justify-center">
                              ⚽
                            </div>
                          )}
                          <span className={`text-sm font-medium ${
                            homeWin ? 'text-white' : 'text-gray-400'
                          }`}>
                            {match.home_team}
                          </span>
                        </div>
                        <span className={`text-2xl font-black ${
                          homeWin ? 'text-white' : 'text-gray-500'
                        }`}>
                          {match.final_score_home}
                        </span>
                      </div>

                      {/* 원정팀 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {match.away_crest ? (
                            <Image 
                              src={match.away_crest} 
                              alt={match.away_team}
                              width={28}
                              height={28}
                              className="w-7 h-7 object-contain"
                            />
                          ) : (
                            <div className="w-7 h-7 flex items-center justify-center">
                              ⚽
                            </div>
                          )}
                          <span className={`text-sm font-medium ${
                            awayWin ? 'text-white' : 'text-gray-400'
                          }`}>
                            {match.away_team}
                          </span>
                        </div>
                        <span className={`text-2xl font-black ${
                          awayWin ? 'text-white' : 'text-gray-500'
                        }`}>
                          {match.final_score_away}
                        </span>
                      </div>
                    </div>

                    {/* 확장 영역 - 경기 통계 */}
                    {isExpanded && (
                      <div className="bg-[#151515] px-4 pb-4 border-t border-gray-800">
                        {hasStats ? (
                          <div className="py-3">
                            <h3 className="text-xs font-bold text-gray-400 mb-3">
                              {currentLanguage === 'ko' ? '경기 통계' : 'Match Stats'}
                            </h3>
                            
                            <div className="space-y-3">
                            {/* 점유율 */}
                            {match.statistics?.possession_home !== undefined && (
                              <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-white font-medium">
                                    {match.statistics.possession_home}%
                                  </span>
                                  <span className="text-gray-400">
                                    {currentLanguage === 'ko' ? '점유율' : 'Possession'}
                                  </span>
                                  <span className="text-white font-medium">
                                    {match.statistics.possession_away}%
                                  </span>
                                </div>
                                <div className="flex h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-blue-500"
                                    style={{ width: `${match.statistics.possession_home}%` }}
                                  />
                                  <div 
                                    className="bg-red-500"
                                    style={{ width: `${match.statistics.possession_away}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* 슈팅 */}
                            {match.statistics?.shots_total_home !== undefined && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-white font-medium">
                                  {match.statistics.shots_total_home}
                                </span>
                                <span className="text-gray-400">
                                  {currentLanguage === 'ko' ? '슈팅' : 'Shots'}
                                </span>
                                <span className="text-white font-medium">
                                  {match.statistics.shots_total_away}
                                </span>
                              </div>
                            )}

                            {/* 유효슈팅 */}
                            {match.statistics?.shots_on_goal_home !== undefined && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-white font-medium">
                                  {match.statistics.shots_on_goal_home}
                                </span>
                                <span className="text-gray-400">
                                  {currentLanguage === 'ko' ? '유효슈팅' : 'Shots on Target'}
                                </span>
                                <span className="text-white font-medium">
                                  {match.statistics.shots_on_goal_away}
                                </span>
                              </div>
                            )}

                            {/* 패스 정확도 */}
                            {match.statistics?.pass_accuracy_home !== undefined && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-white font-medium">
                                  {match.statistics.pass_accuracy_home}%
                                </span>
                                <span className="text-gray-400">
                                  {currentLanguage === 'ko' ? '패스 정확도' : 'Pass Accuracy'}
                                </span>
                                <span className="text-white font-medium">
                                  {match.statistics.pass_accuracy_away}%
                                </span>
                              </div>
                            )}

                            {/* 코너킥 */}
                            {match.statistics?.corners_home !== undefined && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-white font-medium">
                                  {match.statistics.corners_home}
                                </span>
                                <span className="text-gray-400">
                                  {currentLanguage === 'ko' ? '코너킥' : 'Corners'}
                                </span>
                                <span className="text-white font-medium">
                                  {match.statistics.corners_away}
                                </span>
                              </div>
                            )}

                            {/* 파울 */}
                            {match.statistics?.fouls_home !== undefined && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-white font-medium">
                                  {match.statistics.fouls_home}
                                </span>
                                <span className="text-gray-400">
                                  {currentLanguage === 'ko' ? '파울' : 'Fouls'}
                                </span>
                                <span className="text-white font-medium">
                                  {match.statistics.fouls_away}
                                </span>
                              </div>
                            )}

                            {/* 옐로카드 */}
                            {match.statistics?.yellow_cards_home !== undefined && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-yellow-400 font-medium">
                                  {match.statistics.yellow_cards_home}
                                </span>
                                <span className="text-gray-400">
                                  {currentLanguage === 'ko' ? '옐로카드' : 'Yellow Cards'}
                                </span>
                                <span className="text-yellow-400 font-medium">
                                  {match.statistics.yellow_cards_away}
                                </span>
                              </div>
                            )}

                            {/* 오프사이드 */}
                            {match.statistics?.offsides_home !== undefined && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-white font-medium">
                                  {match.statistics.offsides_home}
                                </span>
                                <span className="text-gray-400">
                                  {currentLanguage === 'ko' ? '오프사이드' : 'Offsides'}
                                </span>
                                <span className="text-white font-medium">
                                  {match.statistics.offsides_away}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        ) : (
                          <div className="py-8 text-center">
                            <div className="text-gray-500 text-xs">
                              {currentLanguage === 'ko' 
                                ? '경기 통계를 불러올 수 없습니다' 
                                : 'Statistics not available'}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* 경기 없음 */}
        {filteredMatches.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {currentLanguage === 'ko' 
              ? '표시할 경기 결과가 없습니다'
              : 'No match results available'
            }
          </div>
        )}
          </div>
        </main>
      </div>
    </div>
  )
}
