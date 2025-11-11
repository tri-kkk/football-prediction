'use client'

import React, { useState, useEffect } from 'react'
import { getTeamLogo } from '../teamLogos'
import { smartFilters, useSmartFilters, getMatchBadges, type Match } from '../utils/smartFilters'

// 리그 정보 (메인 페이지와 동일)
const LEAGUES = [
  { 
    code: 'ALL', 
    name: '전체', 
    flag: '🌍',
    isEmoji: true
  },
  { 
    code: 'PL', 
    name: '프리미어리그', 
    flag: 'https://flagcdn.com/w40/gb-eng.png',
    isEmoji: false
  },
  { 
    code: 'PD', 
    name: '라리가', 
    flag: 'https://flagcdn.com/w40/es.png',
    isEmoji: false
  },
  { 
    code: 'BL1', 
    name: '분데스리가', 
    flag: 'https://flagcdn.com/w40/de.png',
    isEmoji: false
  },
  { 
    code: 'SA', 
    name: '세리에A', 
    flag: 'https://flagcdn.com/w40/it.png',
    isEmoji: false
  },
  { 
    code: 'FL1', 
    name: '리그1', 
    flag: 'https://flagcdn.com/w40/fr.png',
    isEmoji: false
  },
  { 
    code: 'CL', 
    name: '챔피언스리그', 
    flag: '⭐',
    isEmoji: true
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

// 리그 국기 가져오기
function getLeagueFlag(leagueCode: string): { url: string; isEmoji: boolean } {
  const flagMap: Record<string, { url: string; isEmoji: boolean }> = {
    'PL': { url: 'https://flagcdn.com/w40/gb-eng.png', isEmoji: false },
    'PD': { url: 'https://flagcdn.com/w40/es.png', isEmoji: false },
    'BL1': { url: 'https://flagcdn.com/w40/de.png', isEmoji: false },
    'SA': { url: 'https://flagcdn.com/w40/it.png', isEmoji: false },
    'FL1': { url: 'https://flagcdn.com/w40/fr.png', isEmoji: false },
    'CL': { url: '⭐', isEmoji: true },
  }
  return flagMap[leagueCode] || { url: '🌍', isEmoji: true }
}

// 리그명 가져오기
function getLeagueName(leagueCode: string): string {
  const leagueNames: Record<string, string> = {
    'PL': '프리미어리그',
    'PD': '라리가',
    'BL1': '분데스리가',
    'SA': '세리에A',
    'FL1': '리그1',
    'CL': '챔피언스리그',
  }
  return leagueNames[leagueCode] || leagueCode
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
          // 모든 리그의 경기 가져오기
          const leagues = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'CL']
          const promises = leagues.map(league => 
            fetch(`/api/api-football?league=${league}&type=fixtures`)
              .then(r => r.json())
              .then(result => ({
                league,
                data: result.success ? result.data : []
              }))
          )
          const results = await Promise.all(promises)
          
          // 모든 결과 합치기
          allMatches = results.flatMap(result => 
            result.data.map((match: any) => ({
              ...match,
              league: match.league || result.league
            }))
          )
        } else {
          // 단일 리그 경기 가져오기
          const response = await fetch(`/api/api-football?league=${selectedLeague}&type=fixtures`)
          
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          
          const data = await response.json()
          
          if (data && data.success && Array.isArray(data.data)) {
            allMatches = data.data.map((match: any) => ({
              ...match,
              league: match.league || selectedLeague
            }))
          }
        }
        
        // 데이터 변환
        const convertedMatches = allMatches.map((item: any) => {
          // API-Football 응답 구조에 맞게 수정
          const homeTeamKR = item.homeTeamKR || item.home_team || item.homeTeam
          const awayTeamKR = item.awayTeamKR || item.away_team || item.awayTeam
          const homeTeamEN = item.homeTeam || item.home_team
          const awayTeamEN = item.awayTeam || item.away_team
          
          return {
            id: item.id,
            homeTeamKR: homeTeamKR,
            awayTeamKR: awayTeamKR,
            homeCrest: getTeamLogo(homeTeamEN || homeTeamKR),
            awayCrest: getTeamLogo(awayTeamEN || awayTeamKR),
            homeWinRate: item.homeWinRate || item.home_probability || 0,
            drawRate: item.drawRate || item.draw_probability || 0,
            awayWinRate: item.awayWinRate || item.away_probability || 0,
            utcDate: item.utcDate || item.commence_time || new Date().toISOString(),
            leagueCode: item.leagueCode || item.league_code || item.league || selectedLeague,
            trendData: []
          }
        })
        
        // 예정된 경기만 필터링
        const scheduledMatches = convertedMatches.filter((match: Match) => {
          return getMatchStatus(match) === 'SCHEDULED'
        })
        
        // 날짜순 정렬
        scheduledMatches.sort((a: Match, b: Match) => {
          return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
        })
        
        setMatches(scheduledMatches)
      } catch (err) {
        console.error('Error:', err)
        setError('데이터를 불러오는데 실패했습니다.')
        setMatches([])
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

  // 날짜 포맷팅
  const formatMatchDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}월 ${day}일`
  }

  // 시간 포맷팅
  const formatMatchTime = (dateString: string) => {
    const date = new Date(dateString)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="container mx-auto px-4 py-8">
        
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400">⚠️ {error}</p>
          </div>
        )}

        {/* 스마트 필터 섹션 */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">
            🎯 스마트 필터
          </h3>
          
          {/* 가로 스크롤 컨테이너 */}
          <div className="relative">
            {/* 스크롤 가능한 필터 리스트 */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent hover:scrollbar-thumb-gray-600 snap-x snap-mandatory">
              {smartFilters.map(filter => {
                const isActive = activeFilters.includes(filter.id)
                const matchCount = Array.isArray(matches) ? matches.filter(filter.filter).length : 0
                
                return (
                  <button
                    key={filter.id}
                    onClick={() => toggleFilter(filter.id)}
                    className={`
                      flex-shrink-0 w-[180px] p-4 rounded-xl transition-all duration-300 snap-start
                      ${isActive
                        ? 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-500/50'
                        : 'bg-[#1a1a1a] hover:bg-[#222] border border-gray-800'
                      }
                    `}
                  >
                    <div className="text-3xl mb-2">{filter.icon}</div>
                    <div className="font-semibold text-white mb-1 text-sm">{filter.label}</div>
                    <div className="text-xs text-gray-400 mb-2 line-clamp-2 h-8">{filter.description}</div>
                    <div className={`
                      inline-block px-3 py-1 rounded-full text-xs font-bold
                      ${isActive ? 'bg-white text-blue-600' : 'bg-gray-800 text-gray-400'}
                    `}>
                      {matchCount}개
                    </div>
                  </button>
                )
              })}
            </div>
            
            {/* 스크롤 힌트 (모바일) */}
            <div className="md:hidden mt-2 text-center">
              <span className="text-xs text-gray-500">← 좌우로 스크롤하세요 →</span>
            </div>
          </div>
        </div>


        {/* 리그 필터 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-200 px-4 md:px-0">
            🏆 리그 선택
          </h3>
          
          {/* 가로 스크롤 컨테이너 */}
          <div className="relative -mx-4 md:mx-0">
            <div className="flex gap-3 overflow-x-auto px-4 md:px-0 pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent hover:scrollbar-thumb-gray-600 snap-x snap-mandatory">
              {LEAGUES.map((league) => (
                <button
                  key={league.code}
                  onClick={() => setSelectedLeague(league.code)}
                  className={`
                    flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all snap-start
                    ${selectedLeague === league.code
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#222] border border-gray-800'
                    }
                  `}
                >
                  {league.isEmoji ? (
                    <span className="text-xl">{league.flag}</span>
                  ) : (
                    <img 
                      src={league.flag} 
                      alt={league.name}
                      className="w-6 h-5 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  <span className="whitespace-nowrap">{league.name}</span>
                </button>
              ))}
            </div>
            
            {/* 스크롤 힌트 (모바일) */}
            <div className="md:hidden mt-2 text-center">
              <span className="text-xs text-gray-500">← 좌우로 스크롤하세요 →</span>
            </div>
          </div>
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">전체 경기</div>
            <div className="text-2xl font-bold text-white">{matches.length}</div>
          </div>
          
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">필터 결과</div>
            <div className="text-2xl font-bold text-blue-400">{filteredMatches.length}</div>
          </div>
          
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">활성 필터</div>
            <div className="text-2xl font-bold text-purple-400">{activeFilters.length}</div>
          </div>
          
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">필터율</div>
            <div className="text-2xl font-bold text-green-400">
              {matches.length > 0 ? Math.round((filteredMatches.length / matches.length) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* 경기 목록 - 메인 페이지 스타일 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-400">로딩 중...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">😢</div>
            <p className="text-xl text-gray-400">
              {matches.length === 0 
                ? '예정된 경기가 없습니다'
                : '필터 조건에 맞는 경기가 없습니다'}
            </p>
            {activeFilters.length > 0 && (
              <button
                onClick={() => setActiveFilters([])}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-all"
              >
                필터 초기화
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredMatches.map((match, index) => {
              const badges = getMatchBadges(match)
              const flag = getLeagueFlag(match.leagueCode)
              const leagueName = getLeagueName(match.leagueCode)
              
              return (
                <React.Fragment key={match.id}>
                  <div
                    className="relative rounded-2xl transition-all duration-200 cursor-pointer group bg-[#1a1a1a] border border-gray-800 hover:border-blue-500 hover:shadow-xl hover:scale-[1.02]"
                  >
                  {/* 상단: 리그 정보 + 날짜/시간 */}
                  <div className="flex items-center justify-center gap-3 px-4 pt-4 pb-3 border-b border-gray-800">
                    {/* 리그 국기 */}
                    {flag.isEmoji ? (
                      <span className="text-xl">{flag.url}</span>
                    ) : (
                      <img 
                        src={flag.url} 
                        alt={leagueName}
                        className="w-6 h-6 object-contain"
                      />
                    )}
                    
                    {/* 리그명 */}
                    <span className="text-base font-bold text-white">
                      {leagueName}
                    </span>
                    
                    {/* 구분선 */}
                    <span className="text-base text-gray-600">|</span>
                    
                    {/* 날짜 */}
                    <span className="text-sm font-semibold text-gray-300">
                      {formatMatchDate(match.utcDate)}
                    </span>
                    
                    {/* 구분선 */}
                    <span className="text-base text-gray-600">|</span>
                    
                    {/* 시간 */}
                    <span className="text-lg font-bold text-white">
                      {formatMatchTime(match.utcDate)}
                    </span>
                  </div>

                  {/* 메인 콘텐츠 */}
                  <div className="p-4">
                    {/* 배지 */}
                    {badges.length > 0 && (
                      <div className="flex gap-2 mb-4 flex-wrap justify-center">
                        {badges.map(badge => (
                          <span
                            key={badge.id}
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: `${badge.color}20`,
                              color: badge.color,
                              border: `1px solid ${badge.color}40`
                            }}
                          >
                            {badge.icon} {badge.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 팀 대결 */}
                    <div className="flex items-center justify-center gap-3 mb-6">
                      {/* 홈팀 */}
                      <div className="flex items-center gap-2">
                        <img 
                          src={match.homeCrest} 
                          alt={match.homeTeamKR} 
                          className="w-12 h-12"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <span className="font-bold text-sm text-white">
                          {match.homeTeamKR}
                        </span>
                      </div>
                      
                      {/* VS */}
                      <div className="px-3 py-1 rounded-lg text-xs font-black bg-gray-800 text-gray-400">
                        VS
                      </div>
                      
                      {/* 원정팀 */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          {match.awayTeamKR}
                        </span>
                        <img 
                          src={match.awayCrest} 
                          alt={match.awayTeamKR} 
                          className="w-12 h-12"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    </div>

                    {/* 승률 - 프로그레스 바 포함 */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* 홈 승 */}
                      <div className="relative overflow-hidden rounded-xl py-2 px-3 bg-[#0f0f0f]">
                        <div 
                          className="absolute bottom-0 left-0 h-1 transition-all duration-500 bg-blue-500"
                          style={{ width: `${match.homeWinRate}%` }}
                        ></div>
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="text-xs font-medium mb-1 text-gray-500">홈</div>
                          <div className="text-4xl font-black text-white">
                            {Math.round(match.homeWinRate)}%
                          </div>
                          <div className="h-4 mt-1"></div>
                        </div>
                      </div>

                      {/* 무승부 */}
                      <div className="relative overflow-hidden rounded-xl py-2 px-3 bg-[#0f0f0f]">
                        <div 
                          className="absolute bottom-0 left-0 h-1 transition-all duration-500 bg-gray-600"
                          style={{ width: `${match.drawRate}%` }}
                        ></div>
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="text-xs font-medium mb-1 text-gray-500">무승부</div>
                          <div className="text-4xl font-black text-gray-400">
                            {Math.round(match.drawRate)}%
                          </div>
                          <div className="h-4 mt-1"></div>
                        </div>
                      </div>

                      {/* 원정 승 */}
                      <div className="relative overflow-hidden rounded-xl py-2 px-3 bg-[#0f0f0f]">
                        <div 
                          className="absolute bottom-0 left-0 h-1 transition-all duration-500 bg-red-500"
                          style={{ width: `${match.awayWinRate}%` }}
                        ></div>
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="text-xs font-medium mb-1 text-gray-500">원정</div>
                          <div className="text-4xl font-black text-white">
                            {Math.round(match.awayWinRate)}%
                          </div>
                          <div className="h-4 mt-1"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
              </React.Fragment>
              )
            })}
          </div>
        )}
      </div>

      {/* 커스텀 스타일 */}
      <style jsx global>{`
        /* 가로 스크롤 최적화 */
        .overflow-x-auto {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }

        /* 커스텀 스크롤바 (WebKit) */
        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }

        /* Firefox 스크롤바 */
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #374151 transparent;
        }

        /* 스냅 스크롤 부드럽게 */
        .snap-x {
          scroll-snap-type: x mandatory;
        }

        .snap-start {
          scroll-snap-align: start;
        }

        /* 모바일 터치 개선 */
        @media (max-width: 768px) {
          .overflow-x-auto {
            padding-left: 1rem;
            padding-right: 1rem;
            margin-left: -1rem;
            margin-right: -1rem;
          }

          /* 스크롤바 숨기기 (모바일) */
          .overflow-x-auto::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}