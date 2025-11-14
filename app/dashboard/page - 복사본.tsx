'use client'

import React, { useState, useEffect } from 'react'
import { getTeamLogo, TEAM_NAME_KR } from '../teamLogos'
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

// 영문 팀명 → 한글 팀명 변환 함수
function translateTeamName(englishName: string): string {
  // TEAM_NAME_KR 객체에서 찾기
  const koreanName = TEAM_NAME_KR[englishName]
  
  // 매칭되면 한글명 반환, 없으면 영문 그대로 반환
  return koreanName || englishName
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
            fetch(`/api/odds-from-db?league=${league}`).then(r => r.json())
          )
          const results = await Promise.all(promises)
          
          // 모든 결과 합치기
          allMatches = results.flatMap(result => 
            result.success ? result.data : []
          )
        } else {
          // 단일 리그 오즈 가져오기
          const response = await fetch(`/api/odds-from-db?league=${selectedLeague}`)
          
          if (!response.ok) {
            throw new Error('오즈 데이터를 불러올 수 없습니다')
          }
          
          const result = await response.json()
          
          if (!result.success) {
            throw new Error(result.error || '데이터 로드 실패')
          }
          
          allMatches = result.data || []
        }
        
        console.log('📋 DB에서 가져온 오즈:', allMatches.length)
        
        // DB 데이터를 Match 형식으로 변환 (메인 page.tsx와 동일한 구조)
        const convertedMatches = allMatches.map((match: any) => {
          const homeTeamEng = match.home_team || match.homeTeam || 'Unknown'
          const awayTeamEng = match.away_team || match.awayTeam || 'Unknown'
          
          // 영문 팀명 → 한글 팀명 변환
          const homeTeamKR = translateTeamName(homeTeamEng)
          const awayTeamKR = translateTeamName(awayTeamEng)
          
          return {
            // DB 필드명을 프론트엔드 형식으로 변환
            id: match.id || match.match_id,
            homeTeamKR: homeTeamKR,           // 한글 팀명
            awayTeamKR: awayTeamKR,           // 한글 팀명
            homeCrest: match.home_team_logo || getTeamLogo(homeTeamKR),  // DB 로고 우선, 없으면 매핑
            awayCrest: match.away_team_logo || getTeamLogo(awayTeamKR),  // DB 로고 우선, 없으면 매핑
            // 확률 필드 변환
            homeWinRate: match.home_probability || match.homeWinRate || 33,
            drawRate: match.draw_probability || match.drawRate || 34,
            awayWinRate: match.away_probability || match.awayWinRate || 33,
            // 오즈 필드
            homeWinOdds: match.home_odds || match.homeWinOdds,
            drawOdds: match.draw_odds || match.drawOdds,
            awayWinOdds: match.away_odds || match.awayWinOdds,
            // 기타 필드
            utcDate: match.commence_time || match.utcDate,
            leagueCode: match.league_code || match.leagueCode || selectedLeague,
            oddsSource: match.odds_source || match.oddsSource || 'db',
            trendData: []
          }
        })
        
        console.log('🔄 변환된 경기:', convertedMatches.length)
        if (convertedMatches.length > 0) {
          console.log('📋 첫 번째 경기 샘플:', {
            id: convertedMatches[0].id,
            homeTeamKR: convertedMatches[0].homeTeamKR,
            awayTeamKR: convertedMatches[0].awayTeamKR,
            homeWinRate: convertedMatches[0].homeWinRate,
            drawRate: convertedMatches[0].drawRate,
            awayWinRate: convertedMatches[0].awayWinRate
          })
        }
        
        // ✅ 중복 제거 (id + 팀 이름 조합 기준)
        const seenIds = new Set()
        const seenMatches = new Set()
        const uniqueMatches = convertedMatches.filter((match: Match) => {
          const matchId = match.id
          
          // ID로 중복 체크
          if (matchId && seenIds.has(matchId)) {
            console.log('🔍 ID 중복 발견:', matchId, match.homeTeamKR, 'vs', match.awayTeamKR)
            return false
          }
          
          // 팀 이름 조합으로 중복 체크 (대소문자 무시, 공백 제거)
          const homeTeam = (match.homeTeamKR || '').toLowerCase().replace(/\s+/g, '')
          const awayTeam = (match.awayTeamKR || '').toLowerCase().replace(/\s+/g, '')
          const matchKey = `${homeTeam}-vs-${awayTeam}`
          
          if (seenMatches.has(matchKey)) {
            console.log('🔍 팀 조합 중복 발견:', match.homeTeamKR, 'vs', match.awayTeamKR)
            return false
          }
          
          // 중복이 아니면 추가
          if (matchId) seenIds.add(matchId)
          seenMatches.add(matchKey)
          return true
        })
        
        console.log('📊 중복 제거 결과:', convertedMatches.length, '→', uniqueMatches.length)
        
        // 예정된 경기만 필터링
        const scheduledMatches = uniqueMatches.filter((match: Match) => {
          const status = getMatchStatus(match)
          const matchTime = new Date(match.utcDate).getTime()
          const now = Date.now()
          const hoursDiff = (now - matchTime) / (1000 * 60 * 60)
          
          console.log(`🏟️ ${match.homeTeamKR} vs ${match.awayTeamKR}:`, {
            matchDate: match.utcDate,
            hoursDiff: hoursDiff.toFixed(2) + 'h',
            status: status,
            isFiltered: status !== 'SCHEDULED'
          })
          
          return status === 'SCHEDULED'
        })
        
        console.log(`✅ 예정된 경기: ${scheduledMatches.length}개`)
        
        // 날짜순 정렬
        scheduledMatches.sort((a: Match, b: Match) => {
          return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
        })
        
        setMatches(scheduledMatches)
      } catch (err) {
        console.error('❌ 경기 데이터 로드 실패:', err)
        setError('경기 데이터를 불러오는데 실패했습니다')
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