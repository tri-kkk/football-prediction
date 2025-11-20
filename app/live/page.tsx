'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import LineupWidget from '../components/LineupWidget'  // 🆕 라인업 위젯 import

interface MatchEvent {
  time: number
  type: 'goal' | 'card' | 'subst'
  team: 'home' | 'away'
  player: string
  detail?: string
}

interface MatchStats {
  shotsOnGoal: { home: number; away: number }
  shotsOffGoal: { home: number; away: number }
  possession: { home: number; away: number }
  corners: { home: number; away: number }
  offsides: { home: number; away: number }
  fouls: { home: number; away: number }
  yellowCards: { home: number; away: number }
  redCards: { home: number; away: number }
}

interface LiveMatch {
  id: number
  fixtureId?: number  // 🆕 API-Football fixture ID
  leagueCode: string
  league: string
  leagueLogo: string
  country: string
  date: string
  timestamp: number
  status: string
  statusLong: string
  elapsed: number
  homeTeam: string
  awayTeam: string
  homeTeamKR: string
  awayTeamKR: string
  homeCrest: string
  awayCrest: string
  homeScore: number
  awayScore: number
  halftimeHomeScore: number
  halftimeAwayScore: number
  events?: MatchEvent[]
  stats?: MatchStats
}

export default function LivePage() {
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL')
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'lineup'>('overview')  // 🆕 탭 상태

  const leagues = [
    { code: 'ALL', nameKo: '전체', nameEn: 'All' },
    { code: 'PL', nameKo: 'EPL', nameEn: 'EPL' },
    { code: 'PD', nameKo: '라리가', nameEn: 'La Liga' },
    { code: 'BL1', nameKo: '분데스', nameEn: 'Bundesliga' },
    { code: 'SA', nameKo: '세리에', nameEn: 'Serie A' },
    { code: 'FL1', nameKo: '리그1', nameEn: 'Ligue 1' },
    { code: 'CL', nameKo: '챔스', nameEn: 'UCL' },
  ]

  const fetchLiveMatches = async () => {
    try {
      const response = await fetch('/api/live-matches')
      const data = await response.json()

      if (data.success) {
        setMatches(data.matches)
        setLastUpdate(new Date().toLocaleTimeString('ko-KR'))
        setError(null)
      } else {
        throw new Error(data.error || '데이터를 불러올 수 없습니다.')
      }
    } catch (err: any) {
      console.error('라이브 경기 조회 실패:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLiveMatches()
  }, [])

  useEffect(() => {
    const interval = setInterval(fetchLiveMatches, 15000)
    return () => clearInterval(interval)
  }, [])

  const filteredMatches = selectedLeague === 'ALL' 
    ? matches 
    : matches.filter(match => match.leagueCode === selectedLeague)

  const getStatusColor = (status: string) => {
    switch (status) {
      case '1H':
      case '2H':
        return 'bg-green-500'
      case 'HT':
        return 'bg-yellow-500'
      case 'ET':
      case 'P':
        return 'bg-orange-500'
      case 'FT':
        return 'bg-gray-500'
      default:
        return 'bg-red-500'
    }
  }

  const getStatusKR = (status: string) => {
    const statusMap: Record<string, string> = {
      '1H': '전반전',
      '2H': '후반전',
      'HT': '하프타임',
      'ET': '연장전',
      'P': '승부차기',
      'FT': '종료',
      'LIVE': '진행중'
    }
    return language === 'ko' ? statusMap[status] || status : status
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'goal':
        return '⚽'
      case 'card':
        return '🟨'
      case 'subst':
        return '🔄'
      default:
        return '•'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">
            {language === 'ko' ? '라이브 경기 로딩 중...' : 'Loading live matches...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      {/* 헤더 */}
      <div className="bg-[#1a1a1a] border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <h1 className="text-lg font-semibold text-white">
                  {language === 'ko' ? '실시간 경기' : 'Live Matches'}
                </h1>
                <span className="text-sm text-gray-400 font-medium">
                  ({filteredMatches.length})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
                className="px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded text-xs font-medium transition-colors"
              >
                {language === 'ko' ? 'KO' : 'EN'}
              </button>
              
              <button
                onClick={fetchLiveMatches}
                className="px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded text-xs transition-colors"
              >
                🔄
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {leagues.map(league => (
              <button
                key={league.code}
                onClick={() => setSelectedLeague(league.code)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedLeague === league.code
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'
                }`}
              >
                {language === 'ko' ? league.nameKo : league.nameEn}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <div className="w-1 h-1 bg-green-500 rounded-full"></div>
              15초 자동 업데이트
            </span>
            <span className="ml-auto font-mono">{lastUpdate}</span>
          </div>
        </div>
      </div>

      {/* 경기 목록 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400">❌ {error}</p>
          </div>
        )}

        {filteredMatches.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⚽</div>
            <p className="text-gray-400">
              {language === 'ko' 
                ? '현재 진행 중인 경기가 없습니다' 
                : 'No live matches at the moment'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="bg-[#1a1a1a] border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors"
              >
                {/* 경기 메인 카드 */}
                <div className="p-5">
                  {/* 리그 & 상태 헤더 - 개선된 디자인 */}
                  <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center p-1.5 shadow-sm">
                        <Image
                          src={match.leagueLogo}
                          alt={match.league}
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-white">{match.league}</span>
                        <div className="text-xs text-gray-500 mt-0.5">{match.country}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {match.elapsed && (
                        <div className="text-right">
                          <span className="text-2xl font-bold text-white tabular-nums">{match.elapsed}'</span>
                          <div className="text-xs text-gray-500 mt-0.5">경과</div>
                        </div>
                      )}
                      <span className={`px-3 py-1.5 ${getStatusColor(match.status)} text-white text-xs font-bold rounded-lg shadow-lg`}>
                        {getStatusKR(match.status)}
                      </span>
                    </div>
                  </div>

                  {/* 경기 스코어 - 대형 디스플레이 */}
                  <div className="mb-5">
                    {/* 홈팀 */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#2a2a2a]">
                          <Image
                            src={match.homeCrest}
                            alt={match.homeTeam}
                            width={32}
                            height={32}
                            className="object-contain"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="text-lg font-bold text-white">
                            {language === 'ko' ? match.homeTeamKR : match.homeTeam}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">HOME</div>
                        </div>
                      </div>
                      <div className="text-4xl font-bold text-white tabular-nums ml-4">
                        {match.homeScore}
                      </div>
                    </div>

                    {/* 원정팀 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#2a2a2a]">
                          <Image
                            src={match.awayCrest}
                            alt={match.awayTeam}
                            width={32}
                            height={32}
                            className="object-contain"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="text-lg font-bold text-white">
                            {language === 'ko' ? match.awayTeamKR : match.awayTeam}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">AWAY</div>
                        </div>
                      </div>
                      <div className="text-4xl font-bold text-white tabular-nums ml-4">
                        {match.awayScore}
                      </div>
                    </div>
                  </div>

                  {/* 하프타임 스코어 */}
                  {match.halftimeHomeScore !== null && (
                    <div className="bg-[#0a0a0a] rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">
                          {language === 'ko' ? '전반 종료' : 'Half Time'}
                        </span>
                        <span className="text-sm text-gray-300 font-bold tabular-nums">
                          {match.halftimeHomeScore} - {match.halftimeAwayScore}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 상세 정보 토글 버튼 */}
                  <button
                    onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                    className="w-full mt-4 py-2 bg-[#2a2a2a] hover:bg-[#333] rounded-lg text-sm text-gray-300 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {expandedMatch === match.id ? '접기' : '상세 정보'}
                    <span className="text-xs">{expandedMatch === match.id ? '▲' : '▼'}</span>
                  </button>
                </div>

                {/* 확장된 상세 정보 */}
                {expandedMatch === match.id && (
                  <div className="border-t border-gray-800 bg-[#0f0f0f]">
                    {/* 🆕 탭 네비게이션 */}
                    <div className="px-5 pt-5 pb-3 border-b border-gray-800">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveTab('overview')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'overview'
                              ? 'bg-green-600 text-white'
                              : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'
                          }`}
                        >
                          📋 개요
                        </button>
                        <button
                          onClick={() => setActiveTab('stats')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'stats'
                              ? 'bg-green-600 text-white'
                              : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'
                          }`}
                        >
                          📊 통계
                        </button>
                        <button
                          onClick={() => setActiveTab('lineup')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'lineup'
                              ? 'bg-green-600 text-white'
                              : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'
                          }`}
                        >
                          👥 라인업
                        </button>
                      </div>
                    </div>

                    {/* 탭 컨텐츠 */}
                    {activeTab === 'overview' && (
                      <div>
                        {/* 경기 이벤트 타임라인 */}
                        {match.events && match.events.length > 0 && (
                      <div className="p-5 border-b border-gray-800">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                          <span className="text-green-500">📋</span>
                          {language === 'ko' ? '경기 이벤트' : 'Match Events'}
                        </h3>
                        <div className="space-y-2">
                          {match.events.map((event, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-3 p-2 rounded ${
                                event.team === 'home' ? 'bg-blue-500/10' : 'bg-red-500/10'
                              }`}
                            >
                              <span className="text-xs font-bold text-gray-400 w-8 tabular-nums">
                                {event.time}'
                              </span>
                              <span className="text-lg">{getEventIcon(event.type)}</span>
                              <div className="flex-1">
                                <div className="text-sm text-white font-medium">{event.player}</div>
                                {event.detail && (
                                  <div className="text-xs text-gray-500">{event.detail}</div>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                event.team === 'home' 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-red-500 text-white'
                              }`}>
                                {event.team === 'home' ? 'HOME' : 'AWAY'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                      </div>
                    )}

                    {/* 🆕 통계 탭 */}
                    {activeTab === 'stats' && (
                      <div>
                        {match.stats ? (
                          <div className="p-5">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                              <span className="text-green-500">📊</span>
                              {language === 'ko' ? '경기 통계' : 'Match Stats'}
                            </h3>
                            <div className="space-y-4">
                              {/* 점유율 */}
                              <div>
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                  <span>{match.stats.possession.home}%</span>
                                  <span className="font-medium text-white">점유율</span>
                                  <span>{match.stats.possession.away}%</span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                                  <div 
                                    className="bg-blue-500"
                                    style={{ width: `${match.stats.possession.home}%` }}
                                  ></div>
                                  <div 
                                    className="bg-red-500"
                                    style={{ width: `${match.stats.possession.away}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* 기타 통계 */}
                              {Object.entries({
                                '슈팅(유효)': match.stats.shotsOnGoal,
                                '슈팅(무효)': match.stats.shotsOffGoal,
                                '코너킥': match.stats.corners,
                                '오프사이드': match.stats.offsides,
                                '파울': match.stats.fouls,
                                '경고': match.stats.yellowCards,
                                '퇴장': match.stats.redCards,
                              }).map(([label, stat]) => (
                                <div key={label} className="flex items-center justify-between text-sm">
                                  <span className="text-blue-400 font-bold w-12 text-center">
                                    {stat.home}
                                  </span>
                                  <span className="text-gray-400 font-medium">{label}</span>
                                  <span className="text-red-400 font-bold w-12 text-center">
                                    {stat.away}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <div className="text-4xl mb-3">📊</div>
                            <p className="text-gray-400">통계 데이터가 아직 없습니다</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 🆕 라인업 탭 */}
                    {activeTab === 'lineup' && (
                      <div className="p-5">
                        <LineupWidget
                          fixtureId={match.fixtureId || match.id}
                          homeTeam={match.homeTeam}
                          awayTeam={match.awayTeam}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 실시간 스코어 티커 - 고정 */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-gray-700 py-3 z-20">
        <div className="overflow-hidden">
          <div className="flex animate-scroll gap-8">
            {[...filteredMatches, ...filteredMatches].map((match, idx) => (
              <div key={`${match.id}-${idx}`} className="flex items-center gap-3 whitespace-nowrap">
                <span className={`px-2 py-0.5 ${getStatusColor(match.status)} text-white text-xs font-bold rounded`}>
                  {match.elapsed ? `${match.elapsed}'` : getStatusKR(match.status)}
                </span>
                <span className="text-sm text-gray-300">
                  {language === 'ko' ? match.homeTeamKR : match.homeTeam}
                </span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {match.homeScore} - {match.awayScore}
                </span>
                <span className="text-sm text-gray-300">
                  {language === 'ko' ? match.awayTeamKR : match.awayTeam}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
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