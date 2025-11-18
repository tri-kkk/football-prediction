'use client'

import React, { useState, useEffect } from 'react'
import { getTeamLogo, TEAM_NAME_KR } from '../teamLogos'
import { smartFilters, useSmartFilters, getMatchBadges, type Match } from '../utils/smartFilters'

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
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  
  const filteredMatches = useSmartFilters(matches, activeFilters)

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
          
          allMatches = results.flatMap(result => 
            result.data.map((match: any) => ({
              id: match.match_id || match.id,
              homeTeam: match.home_team || match.homeTeam,
              awayTeam: match.away_team || match.awayTeam,
              home_team_id: match.home_team_id,
              away_team_id: match.away_team_id,
              league: match.league || getLeagueName(match.league_code) || result.league,
              leagueCode: match.league_code || match.leagueCode || result.league,
              utcDate: match.commence_time || match.utcDate,
              homeCrest: match.home_team_logo || getTeamLogo(match.home_team || match.homeTeam),
              awayCrest: match.away_team_logo || getTeamLogo(match.away_team || match.awayTeam),
              homeWinRate: match.home_probability || match.homeWinRate || 33,
              drawRate: match.draw_probability || match.drawRate || 34,
              awayWinRate: match.away_probability || match.awayWinRate || 33,
              homeWinOdds: match.home_odds || match.homeWinOdds,
              drawOdds: match.draw_odds || match.drawOdds,
              awayWinOdds: match.away_odds || match.awayWinOdds,
              oddsSource: match.odds_source || match.oddsSource || 'db',
              trendData: []
            }))
          )
        } else {
          const response = await fetch(
            `/api/odds-from-db?league=${selectedLeague}`,
            {
              headers: {
                'Cache-Control': 'public, max-age=300'
              }
            }
          )
          
          if (!response.ok) {
            throw new Error('경기 데이터를 불러올 수 없습니다')
          }
          
          const result = await response.json()
          
          if (!result.success) {
            throw new Error(result.error || '데이터 로드 실패')
          }
          
          allMatches = (result.data || []).map((match: any) => ({
            id: match.match_id || match.id,
            homeTeam: match.home_team || match.homeTeam,
            awayTeam: match.away_team || match.awayTeam,
            home_team_id: match.home_team_id,
            away_team_id: match.away_team_id,
            league: match.league || getLeagueName(match.league_code) || selectedLeague,
            leagueCode: match.league_code || match.leagueCode,
            utcDate: match.commence_time || match.utcDate,
            homeCrest: match.home_team_logo || getTeamLogo(match.home_team || match.homeTeam),
            awayCrest: match.away_team_logo || getTeamLogo(match.away_team || match.awayTeam),
            homeWinRate: match.home_probability || match.homeWinRate || 33,
            drawRate: match.draw_probability || match.drawRate || 34,
            awayWinRate: match.away_probability || match.awayWinRate || 33,
            homeWinOdds: match.home_odds || match.homeWinOdds,
            drawOdds: match.draw_odds || match.drawOdds,
            awayWinOdds: match.away_odds || match.awayWinOdds,
            oddsSource: match.odds_source || match.oddsSource || 'db',
            trendData: []
          }))
        }
        
        console.log('🏈 DB에서 가져온 경기:', allMatches.length)
        
        // 중복 제거
        const seenIds = new Set()
        const seenMatches = new Set()
        const uniqueMatches = allMatches.filter((match: any) => {
          const matchId = match.id || match.match_id
          
          if (matchId && seenIds.has(matchId)) {
            return false
          }
          
          const homeTeam = (match.homeTeam || '').toLowerCase().replace(/\s+/g, '')
          const awayTeam = (match.awayTeam || '').toLowerCase().replace(/\s+/g, '')
          const matchKey = `${homeTeam}-vs-${awayTeam}`
          
          if (seenMatches.has(matchKey)) {
            return false
          }
          
          if (matchId) seenIds.add(matchId)
          seenMatches.add(matchKey)
          return true
        })
        
        // 한글 팀명 변환
        const translatedMatches = uniqueMatches.map((match: any) => ({
          ...match,
          homeTeamKR: translateTeamName(match.homeTeam),
          awayTeamKR: translateTeamName(match.awayTeam)
        }))
        
        // 예정된 경기만 필터링
        const scheduledMatches = translatedMatches.filter((match: any) => {
          const status = getMatchStatus(match)
          return status === 'SCHEDULED'
        })
        
        // 날짜순 정렬
        scheduledMatches.sort((a: any, b: any) => {
          return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
        })
        
        setMatches(scheduledMatches)
        setLoading(false)
      } catch (err) {
        console.error('데이터 로드 실패:', err)
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
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

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">경기 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 에러 발생
  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* 리그 필터 - 왼쪽 정렬 */}
      <div className="bg-[#0f0f0f] border-b border-gray-900 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 max-w-7xl">
          {/* 모바일: 가로 스크롤 + snap */}
          <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2 pb-2" style={{ scrollSnapType: 'x mandatory' }}>
              {LEAGUES.map((league) => (
                <button
                  key={league.code}
                  onClick={() => setSelectedLeague(league.code)}
                  style={{ scrollSnapAlign: 'start' }}
                  className={`
                    flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-bold text-xs
                    ${selectedLeague === league.code 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-[#1a1a1a] text-gray-400 border border-gray-800'
                    }
                  `}
                >
                  {league.isEmoji ? (
                    <span className="text-base">{league.flag}</span>
                  ) : (
                    <img 
                      src={league.logo || league.flag} 
                      alt={league.name}
                      className="w-4 h-4 object-contain flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  <span className="whitespace-nowrap">{league.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 데스크톱: 왼쪽 정렬 + wrap */}
          <div className="hidden md:flex md:flex-wrap gap-2">
            {LEAGUES.map((league) => (
              <button
                key={league.code}
                onClick={() => setSelectedLeague(league.code)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold text-sm
                  ${selectedLeague === league.code 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-[#1a1a1a] text-gray-300 hover:bg-gray-800 border border-gray-800'
                  }
                `}
              >
                {league.isEmoji ? (
                  <span className="text-lg">{league.flag}</span>
                ) : (
                  <img 
                    src={league.logo || league.flag} 
                    alt={league.name}
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
                <span>{league.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* 스마트 필터 - 한 줄 + 설명 유지 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔍</span>
            <h2 className="text-lg font-black">스마트 필터</h2>
          </div>
          
          {/* 가로 스크롤 */}
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-3 pb-2">
              {smartFilters.map((filter) => {
                const isActive = activeFilters.includes(filter.id)
                const matchCount = matches.filter(match => {
                  const badges = getMatchBadges(match)
                  return badges.some(badge => badge.id === filter.id)
                }).length

                return (
                  <button
                    key={filter.id}
                    onClick={() => toggleFilter(filter.id)}
                    disabled={matchCount === 0}
                    className={`
                      flex-shrink-0 flex flex-col gap-1 px-4 py-3 rounded-xl transition-all border min-w-[140px]
                      ${isActive 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30' 
                        : matchCount > 0
                          ? 'bg-[#2a2a2a] border-gray-600 text-gray-200 hover:bg-[#333333] hover:border-gray-500'
                          : 'bg-[#1a1a1a] border-gray-800 text-gray-600 opacity-40 cursor-not-allowed'
                      }
                    `}
                  >
                    {/* 상단: 아이콘 + 카운트 */}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{filter.icon}</span>
                      <span className={`
                        text-xs px-2 py-0.5 rounded-full font-bold
                        ${isActive 
                          ? 'bg-white/20 text-white' 
                          : matchCount > 0 
                            ? 'bg-gray-700 text-gray-300' 
                            : 'bg-gray-800 text-gray-700'
                        }
                      `}>
                        {matchCount}
                      </span>
                    </div>
                    
                    {/* 중단: 필터명 */}
                    <div className={`text-sm font-bold text-left ${
                      isActive 
                        ? 'text-white' 
                        : matchCount > 0 
                          ? 'text-gray-200' 
                          : 'text-gray-600'
                    }`}>
                      {filter.label}
                    </div>
                    
                    {/* 하단: 설명 */}
                    <div className={`text-xs text-left line-clamp-2 ${
                      isActive 
                        ? 'text-blue-100' 
                        : matchCount > 0 
                          ? 'text-gray-400' 
                          : 'text-gray-700'
                    }`}>
                      {filter.description}
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
            📊 필터링된 경기 
            <span className="ml-2 text-blue-400">({filteredMatches.length})</span>
          </h2>
          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-lg bg-[#1a1a1a] border border-gray-800 hover:border-gray-700"
            >
              필터 초기화 ✕
            </button>
          )}
        </div>

        {/* 경기 목록 */}
        {filteredMatches.length === 0 ? (
          <div className="text-center py-16 bg-[#1a1a1a] rounded-2xl border border-gray-800">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-400 text-lg">
              {activeFilters.length > 0 
                ? '선택한 필터에 맞는 경기가 없습니다' 
                : '예정된 경기가 없습니다'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMatches.map((match) => {
              const badges = getMatchBadges(match)
              const leagueFlag = getLeagueFlag(match.leagueCode)
              
              return (
                <div
                  key={match.id}
                  className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-all"
                >
                  {/* 상단: 리그 & 날짜 */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-800">
                    {leagueFlag.isEmoji ? (
                      <span className="text-xl flex-shrink-0">{leagueFlag.url}</span>
                    ) : (
                      <img 
                        src={leagueFlag.url} 
                        alt=""
                        className="w-6 h-6 object-contain flex-shrink-0"
                      />
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
                        <img 
                          src={match.homeCrest} 
                          alt={match.homeTeamKR}
                          className="w-12 h-12 object-contain"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><text y="36" font-size="36">⚽</text></svg>'
                          }}
                        />
                        
                        <div className="px-3 py-1 rounded-lg text-xs font-black bg-gray-800 text-gray-400">
                          VS
                        </div>
                        
                        <img 
                          src={match.awayCrest} 
                          alt={match.awayTeamKR}
                          className="w-12 h-12 object-contain"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><text y="36" font-size="36">⚽</text></svg>'
                          }}
                        />
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
                          style={{ width: `${match.homeWinRate}%` }}
                        ></div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="text-xs font-medium mb-1 text-gray-500">
                            홈
                          </div>
                          <div className="text-2xl md:text-4xl font-black text-white">
                            {Math.round(match.homeWinRate)}%
                          </div>
                        </div>
                      </div>

                      {/* 무승부 */}
                      <div className="relative overflow-hidden rounded-xl py-2 px-3 bg-[#0f0f0f]">
                        <div 
                          className="absolute bottom-0 left-0 h-1 bg-gray-600"
                          style={{ width: `${match.drawRate}%` }}
                        ></div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="text-xs font-medium mb-1 text-gray-500">
                            무승부
                          </div>
                          <div className="text-2xl md:text-4xl font-black text-gray-400">
                            {Math.round(match.drawRate)}%
                          </div>
                        </div>
                      </div>

                      {/* 원정팀 승률 */}
                      <div className="relative overflow-hidden rounded-xl py-2 px-3 bg-[#0f0f0f]">
                        <div 
                          className="absolute bottom-0 left-0 h-1 bg-red-500"
                          style={{ width: `${match.awayWinRate}%` }}
                        ></div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="text-xs font-medium mb-1 text-gray-500">
                            원정
                          </div>
                          <div className="text-2xl md:text-4xl font-black text-white">
                            {Math.round(match.awayWinRate)}%
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-600/30"
                          >
                            <span>{badge.icon}</span>
                            <span>{badge.name}</span>
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