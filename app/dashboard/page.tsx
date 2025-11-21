'use client'

import React, { useState, useEffect } from 'react'
import { getTeamLogo, TEAM_NAME_KR } from '../teamLogos'
import { smartFilters, useSmartFilters, getMatchBadges, getFilterMatchCounts, type Match } from '../utils/smartFilters'
import { useLanguage } from '../contexts/LanguageContext'

// 리그 정보 (메인 페이지와 동일)
const LEAGUES = [
  { 
    code: 'ALL', 
    name: '전체',
    nameEn: 'All Leagues',
    flag: '🌍',
    logo: '🌍',
    isEmoji: true
  },
  { 
    code: 'CL', 
    name: '챔피언스리그',
    nameEn: 'Champions League',
    flag: '🌍',
    logo: 'https://media.api-sports.io/football/leagues/2.png',
    isEmoji: false
  },
  { 
    code: 'EL', 
    name: '유로파리그',
    nameEn: 'Europa League',
    flag: '🌍',
    logo: 'https://media.api-sports.io/football/leagues/3.png',
    isEmoji: false
  },
  { 
    code: 'UECL', 
    name: 'UEFA 컨퍼런스리그',
    nameEn: 'UEFA Conference League',
    flag: '🌍',
    logo: 'https://media.api-sports.io/football/leagues/848.png',
    isEmoji: false
  },
  { 
    code: 'UNL', 
    name: 'UEFA 네이션스리그',
    nameEn: 'UEFA Nations League',
    logo: 'https://media.api-sports.io/football/leagues/5.png', 
    flag: '🌍',
    isEmoji: false
  },
  { 
    code: 'PL', 
    name: '프리미어리그',
    nameEn: 'Premier League',
    flag: 'https://flagcdn.com/w40/gb-eng.png',
    logo: 'https://media.api-sports.io/football/leagues/39.png',
    isEmoji: false
  },
  { 
    code: 'ELC', 
    name: '챔피언십',
    nameEn: 'Championship',
    flag: 'https://flagcdn.com/w40/gb-eng.png',
    logo: 'https://media.api-sports.io/football/leagues/40.png',
    isEmoji: false
  },
  { 
    code: 'PD', 
    name: '라리가',
    nameEn: 'La Liga',
    flag: 'https://flagcdn.com/w40/es.png',
    logo: 'https://media.api-sports.io/football/leagues/140.png',
    isEmoji: false
  },
  { 
    code: 'BL1', 
    name: '분데스리가',
    nameEn: 'Bundesliga',
    flag: 'https://flagcdn.com/w40/de.png',
    logo: 'https://media.api-sports.io/football/leagues/78.png',
    isEmoji: false
  },
  { 
    code: 'SA', 
    name: '세리에A',
    nameEn: 'Serie A',
    flag: 'https://flagcdn.com/w40/it.png',
    logo: 'https://media.api-sports.io/football/leagues/135.png',
    isEmoji: false
  },
  { 
    code: 'FL1', 
    name: '리그1',
    nameEn: 'Ligue 1',
    flag: 'https://flagcdn.com/w40/fr.png',
    logo: 'https://media.api-sports.io/football/leagues/61.png',
    isEmoji: false
  },
  { 
    code: 'PPL', 
    name: '프리메이라리가',
    nameEn: 'Primeira Liga',
    flag: 'https://flagcdn.com/w40/pt.png',
    logo: 'https://media.api-sports.io/football/leagues/94.png',
    isEmoji: false
  },
  { 
    code: 'DED', 
    name: '에레디비시',
    nameEn: 'Eredivisie',
    flag: 'https://flagcdn.com/w40/nl.png',
    logo: 'https://media.api-sports.io/football/leagues/88.png',
    isEmoji: false
  },
]

// 경기 상태 확인 함수
function getMatchStatus(match: Match): 'SCHEDULED' | 'LIVE' | 'FINISHED' {
  try {
    const matchTime = new Date(match.utcDate).getTime()
    const now = Date.now()
    const hoursSinceStart = (now - matchTime) / (1000 * 60 * 60)
    
    if (hoursSinceStart > 2) return 'FINISHED'
    if (hoursSinceStart > 0) return 'LIVE'
    return 'SCHEDULED'
  } catch (error) {
    return 'SCHEDULED'
  }
}

// 리그명 가져오기 함수
function getLeagueName(leagueCode: string): string {
  const league = LEAGUES.find(l => l.code === leagueCode)
  return league ? league.name : leagueCode
}

// 리그 국기 가져오기
function getLeagueFlag(leagueCode: string): { url: string; isEmoji: boolean } {
  const league = LEAGUES.find(l => l.code === leagueCode)
  if (league) {
    return { url: league.flag, isEmoji: league.isEmoji }
  }
  return { url: '🌍', isEmoji: true }
}

// 리그 로고 가져오기 (엠블럼용)
function getLeagueLogo(leagueCode: string): { url: string; isEmoji: boolean } {
  const league = LEAGUES.find(l => l.code === leagueCode)
  if (league) {
    return { url: league.logo, isEmoji: league.isEmoji }
  }
  return { url: '🌍', isEmoji: true }
}

// 영문 팀명 → 한글 팀명 변환 함수
function translateTeamName(englishName: string): string {
  const koreanName = TEAM_NAME_KR[englishName]
  return koreanName || englishName
}

// 날짜 포맷팅
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000))
  const kstNow = new Date(Date.now() + (9 * 60 * 60 * 1000))
  
  const todayKST = new Date(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate())
  const tomorrowKST = new Date(todayKST)
  tomorrowKST.setDate(tomorrowKST.getDate() + 1)
  
  const matchDateKST = new Date(kstDate.getUTCFullYear(), kstDate.getUTCMonth(), kstDate.getUTCDate())
  
  if (matchDateKST.getTime() === todayKST.getTime()) {
    return '오늘'
  } else if (matchDateKST.getTime() === tomorrowKST.getTime()) {
    return '내일'
  } else {
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(kstDate.getUTCDate()).padStart(2, '0')
    return `${month}/${day}`
  }
}

// 시간 포맷팅
function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000))
  const hours = String(kstDate.getUTCHours()).padStart(2, '0')
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export default function DashboardPage() {
  const { t, language: currentLanguage } = useLanguage()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true)
  
  const filteredMatches = useSmartFilters(matches, activeFilters)
  const filterCounts = getFilterMatchCounts(matches) // ✅ 추가: 각 필터별 경기 수

  // 데이터 로드
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true)
        setError(null)
        
        let allMatches = []
        
        if (selectedLeague === 'ALL') {
          const leagues = ['CL', 'EL', 'UECL', 'UNL', 'PL', 'ELC', 'PD', 'BL1', 'SA', 'FL1', 'PPL', 'DED']
          const promises = leagues.map(league => 
            fetch(`/api/odds-from-db?league=${league}`, {
              headers: {
                'Cache-Control': 'public, max-age=300'
              }
            })
              .then(r => r.json())
              .then(result => ({
                league,
                data: result.success ? result.data : []
              }))
          )
          
          const results = await Promise.all(promises)
          allMatches = results.flatMap(r => r.data)
        } else {
          const res = await fetch(`/api/odds-from-db?league=${selectedLeague}`, {
            headers: {
              'Cache-Control': 'public, max-age=300'
            }
          })
          const result = await res.json()
          allMatches = result.success ? result.data : []
        }
        
        // 팀명 번역 + 엠블럼 추가 + 데이터 검증
        const translatedMatches = allMatches
          .filter((match: any) => {
            // 필수 데이터 체크 (스네이크 케이스 필드명)
            const homeProb = match.home_probability || match.homeWinProbability || 0
            const drawProb = match.draw_probability || match.drawProbability || 0
            const awayProb = match.away_probability || match.awayWinProbability || 0
            
            return match && 
                   (match.home_team || match.homeTeam) && 
                   (match.away_team || match.awayTeam) &&
                   (homeProb > 0 || drawProb > 0 || awayProb > 0)
          })
          .map((match: any) => {
            // 확률 데이터 추출 (두 가지 필드명 모두 지원)
            const homeProb = match.home_probability || match.homeWinProbability || 0
            const drawProb = match.draw_probability || match.drawProbability || 0
            const awayProb = match.away_probability || match.awayWinProbability || 0
            
            const homeTeam = match.home_team || match.homeTeam
            const awayTeam = match.away_team || match.awayTeam
            
            return {
              ...match,
              homeTeam: homeTeam,
              awayTeam: awayTeam,
              homeTeamKR: translateTeamName(homeTeam),
              awayTeamKR: translateTeamName(awayTeam),
              homeCrest: match.home_team_logo || getTeamLogo(homeTeam),
              awayCrest: match.away_team_logo || getTeamLogo(awayTeam),
              // 확률 데이터 정규화
              homeWinRate: homeProb,
              drawRate: drawProb,
              awayWinRate: awayProb,
              // 날짜 정규화
              utcDate: match.commence_time || match.match_date || match.utcDate || new Date().toISOString(),
              // 리그 코드 정규화
              leagueCode: match.league_code || match.leagueCode || match.league || 'Unknown'
            }
          })
        
        console.log('📊 Loaded matches:', translatedMatches.length)
        if (translatedMatches.length > 0) {
          console.log('📝 Sample match:', translatedMatches[0])
        }
        
        setMatches(translatedMatches)
      } catch (error) {
        console.error('Error fetching matches:', error)
        setError('경기 데이터를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchMatches()
  }, [selectedLeague])

  // 필터 토글
  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev => 
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">{currentLanguage === 'ko' ? '경기 데이터 로딩 중...' : 'Loading matches...'}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            🎯 {currentLanguage === 'ko' ? '스마트 필터 대시보드' : 'Smart Filter Dashboard'}
          </h1>
          <p className="text-gray-400">
            {currentLanguage === 'ko' ? 'AI 기반 필터로 최적의 경기를 찾아보세요' : 'Find the best matches with AI-powered filters'}
          </p>
        </div>

        {/* 리그 선택 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-gray-400">{currentLanguage === 'ko' ? '🏆 리그 선택' : '🏆 Select League'}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {LEAGUES.map((league) => {
              const isActive = selectedLeague === league.code
              return (
                <button
                  key={league.code}
                  onClick={() => setSelectedLeague(league.code)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
                  }`}
                >
                  {league.isEmoji ? (
                    <span className="mr-2">{league.logo}</span>
                  ) : (
                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center p-0.5 inline-flex mr-2">
                      <img 
                        src={league.logo} 
                        alt={league.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  {currentLanguage === 'ko' ? league.name : league.nameEn}
                </button>
              )
            })}
          </div>
        </div>

        {/* 스마트 필터 섹션 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black">{currentLanguage === 'ko' ? '🔍 스마트 필터' : '🔍 Smart Filters'}</h2>
              {activeFilters.length > 0 && (
                <span className="text-sm text-blue-400 font-bold">
                  {activeFilters.length}개 활성화
                </span>
              )}
            </div>
            <button
              onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
              className="lg:hidden px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-gray-400 text-xs font-bold hover:bg-[#2a2a2a] transition-all"
            >
              {isFilterCollapsed 
                ? `${currentLanguage === 'ko' ? '펼치기' : 'Expand'} ▼`
                : `${currentLanguage === 'ko' ? '접기' : 'Collapse'} ▲`
              }
            </button>
          </div>

          {/* 필터 그리드 */}
          <div className={`bg-[#111111] rounded-2xl border border-gray-800 transition-all ${
            isFilterCollapsed ? 'hidden lg:block' : 'block'
          } p-4 lg:p-6`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {smartFilters.map((filter) => {
                const isActive = activeFilters.includes(filter.id)
                const matchCount = filterCounts[filter.id] || 0 // ✅ 수정: 필터별 경기 수
                
                return (
                  <button
                    key={filter.id}
                    onClick={() => toggleFilter(filter.id)}
                    disabled={matchCount === 0 && !isActive}
                    className={`relative p-3 lg:p-4 rounded-xl transition-all text-left ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                        : matchCount > 0
                          ? 'bg-gradient-to-br from-[#2a2a2a] to-[#1f1f1f] text-gray-200 hover:from-[#353535] hover:to-[#2a2a2a] hover:scale-102 border border-gray-700/50'
                          : 'bg-[#1a1a1a] text-gray-600 cursor-not-allowed opacity-40 border border-gray-800'
                    }`}
                  >
                    {/* 배지 카운트 */}
                    {matchCount > 0 && (
                      <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-black ${
                        isActive
                          ? 'bg-white text-blue-600'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {matchCount}
                      </div>
                    )}
                    
                    {/* 상단: 아이콘 */}
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xl lg:text-2xl">{filter.icon}</span>
                    </div>
                    
                    {/* 중단: 필터명 */}
                    <div className={`text-xs lg:text-sm font-bold text-left mb-1 ${
                      isActive 
                        ? 'text-white' 
                        : matchCount > 0 
                          ? 'text-white' 
                          : 'text-gray-600'
                    }`}>
                      {currentLanguage === 'ko' ? filter.labelKo : filter.labelEn}
                    </div>
                    
                    {/* 하단: 설명 */}
                    <div className={`hidden lg:block text-xs text-left line-clamp-2 ${
                      isActive 
                        ? 'text-blue-100' 
                        : matchCount > 0 
                          ? 'text-gray-400' 
                          : 'text-gray-700'
                    }`}>
                      {currentLanguage === 'ko' ? filter.descriptionKo : filter.descriptionEn}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 경기 목록 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">
            📊 {currentLanguage === 'ko' ? '필터링된 경기' : 'Filtered Matches'} 
            <span className="ml-2 text-blue-400">({filteredMatches.length})</span>
          </h2>
          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-lg bg-[#1a1a1a] border border-gray-800 hover:border-gray-700"
            >
              {currentLanguage === 'ko' ? '필터 초기화 ✕' : 'Clear Filters ✕'}
            </button>
          )}
        </div>

        {/* 경기 목록 */}
        {filteredMatches.length === 0 ? (
          <div className="text-center py-16 bg-[#1a1a1a] rounded-2xl border border-gray-800">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-400 text-lg">
              {activeFilters.length > 0 
                ? (currentLanguage === 'ko' ? '선택한 필터에 맞는 경기가 없습니다' : 'No matches found for selected filters')
                : (currentLanguage === 'ko' ? '예정된 경기가 없습니다' : 'No upcoming matches')
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMatches.map((match) => {
              const badges = getMatchBadges(match)
              const leagueLogo = getLeagueLogo(match.leagueCode)
              
              return (
                <div
                  key={match.id}
                  className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-all"
                >
                  {/* 상단: 리그 & 날짜 */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-800">
                    {leagueLogo.isEmoji ? (
                      <span className="text-xl flex-shrink-0">{leagueLogo.url}</span>
                    ) : (
                      <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center p-0.5 flex-shrink-0">
                        <img 
                          src={leagueLogo.url} 
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <span className="text-sm font-bold text-white truncate">
                      {getLeagueName(match.leagueCode)}
                    </span>
                    <span className="text-gray-600 hidden sm:inline">|</span>
                    <span className="text-sm font-bold text-gray-300 hidden sm:inline">
                      {formatDate(match.utcDate)}
                    </span>
                    <span className="text-gray-600 hidden sm:inline">|</span>
                    <span className="text-lg font-black text-white ml-auto">
                      {formatTime(match.utcDate)}
                    </span>
                  </div>

                  <div className="p-4">
                    {/* 팀 대결 */}
                    <div className="flex flex-col items-center gap-3 mb-6">
                      {/* 엠블럼과 VS */}
                      <div className="flex items-center justify-center gap-4">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#2a2a2a]">
                          <img 
                            src={match.homeCrest} 
                            alt={match.homeTeamKR}
                            className="w-10 h-10 object-contain"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><text y="36" font-size="36">⚽</text></svg>'
                            }}
                          />
                        </div>
                        
                        <div className="px-3 py-1 rounded-lg text-xs font-black bg-gray-800 text-gray-400">
                          VS
                        </div>
                        
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#2a2a2a]">
                          <img 
                            src={match.awayCrest} 
                            alt={match.awayTeamKR}
                            className="w-10 h-10 object-contain"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><text y="36" font-size="36">⚽</text></svg>'
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* 팀 이름 */}
                      <div className="w-full flex items-center justify-center gap-4 px-4">
                        <span className="font-bold text-sm text-right flex-1 text-white truncate">
                          {match.homeTeamKR}
                        </span>
                        <div className="w-12 flex-shrink-0"></div>
                        <span className="font-bold text-sm text-left flex-1 text-white truncate">
                          {match.awayTeamKR}
                        </span>
                      </div>
                    </div>

                    {/* 승률 표시 */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {/* 홈팀 승률 */}
                      <div className="relative overflow-hidden rounded-xl py-2 px-3 bg-[#0f0f0f]">
                        <div 
                          className="absolute bottom-0 left-0 h-1 bg-blue-500"
                          style={{ width: `${Math.min(100, Math.max(0, match.homeWinRate || 0))}%` }}
                        ></div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="text-xs font-medium mb-1 text-gray-500">
                            홈
                          </div>
                          <div className="text-2xl md:text-4xl font-black text-white">
                            {Math.round(match.homeWinRate || 0)}%
                          </div>
                        </div>
                      </div>

                      {/* 무승부 */}
                      <div className="relative overflow-hidden rounded-xl py-2 px-3 bg-[#0f0f0f]">
                        <div 
                          className="absolute bottom-0 left-0 h-1 bg-gray-600"
                          style={{ width: `${Math.min(100, Math.max(0, match.drawRate || 0))}%` }}
                        ></div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="text-xs font-medium mb-1 text-gray-500">
                            무승부
                          </div>
                          <div className="text-2xl md:text-4xl font-black text-gray-400">
                            {Math.round(match.drawRate || 0)}%
                          </div>
                        </div>
                      </div>

                      {/* 원정팀 승률 */}
                      <div className="relative overflow-hidden rounded-xl py-2 px-3 bg-[#0f0f0f]">
                        <div 
                          className="absolute bottom-0 left-0 h-1 bg-red-500"
                          style={{ width: `${Math.min(100, Math.max(0, match.awayWinRate || 0))}%` }}
                        ></div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="text-xs font-medium mb-1 text-gray-500">
                            원정
                          </div>
                          <div className="text-2xl md:text-4xl font-black text-white">
                            {Math.round(match.awayWinRate || 0)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 배지 */}
                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {badges.map((badge) => (
                          <span
                            key={badge.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ 
                              backgroundColor: `${badge.color}20`,
                              color: badge.color,
                              borderWidth: '1px',
                              borderColor: `${badge.color}30`
                            }}
                          >
                            <span>{badge.icon}</span>
                            <span>{currentLanguage === 'ko' ? badge.labelKo : badge.labelEn}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}