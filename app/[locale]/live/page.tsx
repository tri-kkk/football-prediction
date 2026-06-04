'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import LineupWidget from '../../components/LineupWidget'
import LiveMatchCard from '../../components/live/LiveMatchCard'
import { useLanguage } from '../../contexts/LanguageContext'

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
  fixtureId?: number
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

interface League {
  code: string
  nameKo: string
  nameEn: string
}

interface LeagueCategory {
  id: string
  nameKo: string
  nameEn: string
  icon: string
  flagCode?: string  // ISO 국가 코드 for flagcdn
  leagues: League[]
}

export default function LivePage() {
  const { language } = useLanguage()
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL')
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'lineup'>('overview')
  
  // 🆕 모달 상태
  const [showLeagueModal, setShowLeagueModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // ============================================================
  // 🔥 인기 리그 (상단에 항상 표시)
  // ============================================================
  const popularLeagues: League[] = [
    { code: 'ALL', nameKo: '전체', nameEn: 'All' },
    { code: 'PL', nameKo: 'EPL', nameEn: 'EPL' },
    { code: 'PD', nameKo: '라리가', nameEn: 'Liga' },
    { code: 'BL1', nameKo: '분데스', nameEn: 'Bund' },
    { code: 'SA', nameKo: '세리에', nameEn: 'SerieA' },
    { code: 'FL1', nameKo: '리그1', nameEn: 'L1' },
    { code: 'CL', nameKo: '챔스', nameEn: 'UCL' },
  ]

  // ============================================================
  // 📂 카테고리별 리그 그룹화
  // ============================================================
  const leagueCategories: LeagueCategory[] = [
    {
      id: 'international',
      nameKo: '국제 대회',
      nameEn: 'International',
      icon: '🏆',
      leagues: [
        { code: 'CL', nameKo: '챔피언스리그', nameEn: 'Champions League' },
        { code: 'EL', nameKo: '유로파리그', nameEn: 'Europa League' },
        { code: 'UECL', nameKo: '컨퍼런스리그', nameEn: 'Conference League' },
        { code: 'UNL', nameKo: '네이션스리그', nameEn: 'Nations League' },
        { code: 'AFCON', nameKo: '아프리카 네이션스컵', nameEn: 'AFCON' },
      ]
    },
    {
      id: 'europe-top',
      nameKo: '유럽 주요 리그',
      nameEn: 'Top European Leagues',
      icon: '⚽',
      leagues: [
        { code: 'PL', nameKo: '프리미어리그', nameEn: 'Premier League' },
        { code: 'PD', nameKo: '라리가', nameEn: 'La Liga' },
        { code: 'BL1', nameKo: '분데스리가', nameEn: 'Bundesliga' },
        { code: 'SA', nameKo: '세리에A', nameEn: 'Serie A' },
        { code: 'FL1', nameKo: '리그1', nameEn: 'Ligue 1' },
      ]
    },
    {
      id: 'england',
      nameKo: '잉글랜드',
      nameEn: 'England',
      icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      flagCode: 'gb-eng',
      leagues: [
        { code: 'PL', nameKo: '프리미어리그', nameEn: 'Premier League' },
        { code: 'ELC', nameKo: '챔피언십', nameEn: 'Championship' },
        { code: 'FAC', nameKo: 'FA컵', nameEn: 'FA Cup' },
        { code: 'EFL', nameKo: 'EFL컵', nameEn: 'EFL Cup' },
      ]
    },
    {
      id: 'spain',
      nameKo: '스페인',
      nameEn: 'Spain',
      icon: '🇪🇸',
      flagCode: 'es',
      leagues: [
        { code: 'PD', nameKo: '라리가', nameEn: 'La Liga' },
        { code: 'SD', nameKo: '라리가2', nameEn: 'La Liga 2' },
        { code: 'CDR', nameKo: '코파델레이', nameEn: 'Copa del Rey' },
      ]
    },
    {
      id: 'germany',
      nameKo: '독일',
      nameEn: 'Germany',
      icon: '🇩🇪',
      flagCode: 'de',
      leagues: [
        { code: 'BL1', nameKo: '분데스리가', nameEn: 'Bundesliga' },
        { code: 'BL2', nameKo: '분데스리가2', nameEn: 'Bundesliga 2' },
        { code: 'DFB', nameKo: 'DFB포칼', nameEn: 'DFB Pokal' },
      ]
    },
    {
      id: 'italy',
      nameKo: '이탈리아',
      nameEn: 'Italy',
      icon: '🇮🇹',
      flagCode: 'it',
      leagues: [
        { code: 'SA', nameKo: '세리에A', nameEn: 'Serie A' },
        { code: 'SB', nameKo: '세리에B', nameEn: 'Serie B' },
        { code: 'CIT', nameKo: '코파이탈리아', nameEn: 'Coppa Italia' },
      ]
    },
    {
      id: 'france',
      nameKo: '프랑스',
      nameEn: 'France',
      icon: '🇫🇷',
      flagCode: 'fr',
      leagues: [
        { code: 'FL1', nameKo: '리그1', nameEn: 'Ligue 1' },
        { code: 'FL2', nameKo: '리그2', nameEn: 'Ligue 2' },
        { code: 'CDF', nameKo: '쿠프드프랑스', nameEn: 'Coupe de France' },
      ]
    },
    {
      id: 'europe-other',
      nameKo: '유럽 기타',
      nameEn: 'Other European',
      icon: '🇪🇺',
      flagCode: 'eu',
      leagues: [
        { code: 'PPL', nameKo: '프리메이라리가', nameEn: 'Primeira Liga' },
        { code: 'TDP', nameKo: '타사포르투갈', nameEn: 'Taça de Portugal' },
        { code: 'DED', nameKo: '에레디비시', nameEn: 'Eredivisie' },
        { code: 'KNV', nameKo: 'KNVB컵', nameEn: 'KNVB Cup' },
        { code: 'JPL', nameKo: '벨기에리그', nameEn: 'Belgian Pro League' },
        { code: 'SPL', nameKo: '스코틀랜드리그', nameEn: 'Scottish Premiership' },
        { code: 'SSL', nameKo: '스위스리그', nameEn: 'Swiss Super League' },
        { code: 'ABL', nameKo: '오스트리아리그', nameEn: 'Austrian Bundesliga' },
        { code: 'GSL', nameKo: '그리스리그', nameEn: 'Greek Super League' },
        { code: 'DSL', nameKo: '덴마크리그', nameEn: 'Danish Superliga' },
        { code: 'TSL', nameKo: '터키리그', nameEn: 'Turkish Süper Lig' },
      ]
    },
    {
      id: 'africa',
      nameKo: '아프리카',
      nameEn: 'Africa',
      icon: '🌍',
      leagues: [
        { code: 'EGY', nameKo: '이집트리그', nameEn: 'Egyptian League' },
        { code: 'RSA', nameKo: '남아공리그', nameEn: 'South African League' },
        { code: 'MAR', nameKo: '모로코리그', nameEn: 'Moroccan League' },
        { code: 'DZA', nameKo: '알제리리그', nameEn: 'Algerian League' },
        { code: 'TUN', nameKo: '튀니지리그', nameEn: 'Tunisian League' },
      ]
    },
    {
      id: 'asia',
      nameKo: '아시아',
      nameEn: 'Asia',
      icon: '🌏',
      leagues: [
        { code: 'KL1', nameKo: 'K리그1', nameEn: 'K League 1' },
        { code: 'KL2', nameKo: 'K리그2', nameEn: 'K League 2' },
        { code: 'J1', nameKo: 'J리그', nameEn: 'J1 League' },
        { code: 'J2', nameKo: 'J2리그', nameEn: 'J2 League' },
        { code: 'SAL', nameKo: '사우디리그', nameEn: 'Saudi Pro League' },
        { code: 'CSL', nameKo: '중국슈퍼리그', nameEn: 'Chinese Super League' },
        { code: 'ALG', nameKo: 'A리그', nameEn: 'A-League' },
      ]
    },
    {
      id: 'americas',
      nameKo: '아메리카',
      nameEn: 'Americas',
      icon: '🌎',
      leagues: [
        { code: 'MLS', nameKo: 'MLS', nameEn: 'MLS' },
        { code: 'LMX', nameKo: '리가MX', nameEn: 'Liga MX' },
        { code: 'BSA', nameKo: '브라질리그', nameEn: 'Brasileirão' },
        { code: 'ARG', nameKo: '아르헨티나리그', nameEn: 'Liga Argentina' },
        { code: 'COP', nameKo: '코파리베르타도레스', nameEn: 'Copa Libertadores' },
        { code: 'COS', nameKo: '코파수다메리카나', nameEn: 'Copa Sudamericana' },
      ]
    },
  ]

  // 전체 리그 목록 (검색용)
  const allLeagues = leagueCategories.flatMap(cat => cat.leagues)

  // 검색 필터링
  const filteredCategories = leagueCategories.map(category => ({
    ...category,
    leagues: category.leagues.filter(league => 
      league.nameKo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      league.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      league.code.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.leagues.length > 0)

  // ✅ 통계 라벨 다국어 지원
  const statsLabels = {
    possession: { ko: '점유율', en: 'Possession' },
    shotsOnGoal: { ko: '슈팅(유효)', en: 'Shots (on)' },
    shotsOffGoal: { ko: '슈팅(무효)', en: 'Shots (off)' },
    corners: { ko: '코너킥', en: 'Corners' },
    offsides: { ko: '오프사이드', en: 'Offsides' },
    fouls: { ko: '파울', en: 'Fouls' },
    yellowCards: { ko: '경고', en: 'Yellow Cards' },
    redCards: { ko: '퇴장', en: 'Red Cards' },
  }

  const fetchLiveMatches = async () => {
    try {
      const response = await fetch('/api/live-matches')
      const data = await response.json()

      if (data.success) {
        setMatches(data.matches)
        setLastUpdate(new Date().toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US'))
        setError(null)
      } else {
        throw new Error(data.error || (language === 'ko' ? '데이터를 불러올 수 없습니다.' : 'Failed to load data.'))
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

  // 모달 열릴 때 스크롤 방지
  useEffect(() => {
    if (showLeagueModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showLeagueModal])

  const filteredMatches = selectedLeague === 'ALL' 
    ? matches 
    : matches.filter(match => match.leagueCode === selectedLeague)

  // 선택된 리그 이름 가져오기
  const getSelectedLeagueName = () => {
    if (selectedLeague === 'ALL') return language === 'ko' ? '전체' : 'All'
    const league = allLeagues.find(l => l.code === selectedLeague)
    return league ? (language === 'ko' ? league.nameKo : league.nameEn) : selectedLeague
  }

  // 리그 선택 핸들러
  const handleLeagueSelect = (code: string) => {
    setSelectedLeague(code)
    setShowLeagueModal(false)
    setSearchQuery('')
  }

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
    const statusMapKo: Record<string, string> = {
      '1H': '전반전',
      '2H': '후반전',
      'HT': '하프타임',
      'ET': '연장전',
      'P': '승부차기',
      'FT': '종료',
      'LIVE': '진행중'
    }
    const statusMapEn: Record<string, string> = {
      '1H': '1st Half',
      '2H': '2nd Half',
      'HT': 'Half Time',
      'ET': 'Extra Time',
      'P': 'Penalties',
      'FT': 'Full Time',
      'LIVE': 'Live'
    }
    return language === 'ko' ? (statusMapKo[status] || status) : (statusMapEn[status] || status)
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

  const shouldShowHalftimeScore = (match: LiveMatch) => {
    if (match.halftimeHomeScore === null) return false
    return ['HT', '2H', 'ET', 'P', 'FT'].includes(match.status)
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
      <div className="bg-[#111] border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <h1 className="text-lg font-semibold text-white">{language === 'ko' ? '실시간 경기' : 'Live'}</h1>
              <span className="px-1.5 py-0.5 rounded-md bg-gray-800 text-gray-300 text-xs font-medium tabular-nums">{filteredMatches.length}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="hidden sm:flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{language === 'ko' ? '15초 자동 갱신' : 'Auto 15s'}</span>
              {lastUpdate && <span className="font-mono text-gray-600 tabular-nums">{lastUpdate}</span>}
              <button onClick={fetchLiveMatches} aria-label={language === 'ko' ? '새로고침' : 'Refresh'} className="w-7 h-7 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] text-gray-400 hover:text-gray-200 flex items-center justify-center transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"></path><polyline points="21 3 21 9 15 9"></polyline></svg>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            {popularLeagues.map((league) => (
              <button key={league.code} onClick={() => setSelectedLeague(league.code)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${selectedLeague === league.code ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-[#1c1c1c] text-gray-400 hover:text-gray-200 hover:bg-[#262626]'}`}>
                {language === 'ko' ? league.nameKo : league.nameEn}
              </button>
            ))}
            <button onClick={() => setShowLeagueModal(true)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${!popularLeagues.find((l) => l.code === selectedLeague) ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-[#1c1c1c] text-gray-400 hover:text-gray-200 hover:bg-[#262626]'}`}>
              {!popularLeagues.find((l) => l.code === selectedLeague) && <span>{getSelectedLeagueName()}</span>}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle></svg>
              <span className="text-xs opacity-80">{language === 'ko' ? '더보기' : 'More'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🆕 리그 선택 모달 */}
      {showLeagueModal && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center"
          onClick={() => {
            setShowLeagueModal(false)
            setSearchQuery('')
          }}
        >
          <div 
            className="bg-[#1a1a1a] w-full sm:w-[480px] h-[95vh] sm:h-auto sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* 드래그 핸들 (모바일) */}
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
            </div>
            
            {/* 모달 헤더 - 컴팩트 */}
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-gray-700 px-4 py-3 z-10">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-white">
                  {language === 'ko' ? '리그 선택' : 'Select League'}
                </h2>
                <button
                  onClick={() => {
                    setShowLeagueModal(false)
                    setSearchQuery('')
                  }}
                  className="w-7 h-7 rounded-full bg-[#2a2a2a] hover:bg-[#333] flex items-center justify-center text-gray-400 text-sm"
                >
                  ✕
                </button>
              </div>
              
              {/* 검색 입력 - 컴팩트 */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'ko' ? '리그 검색...' : 'Search leagues...'}
                  className="w-full px-3 py-2 pl-9 bg-[#2a2a2a] border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  🔍
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 모달 컨텐츠 - flex-1로 나머지 공간 모두 사용 */}
            <div className="flex-1 overflow-y-auto p-3 pb-6">
              {/* 전체 버튼 */}
              {!searchQuery && (
                <button
                  onClick={() => handleLeagueSelect('ALL')}
                  className={`w-full mb-3 px-3 py-2.5 rounded-lg text-left font-medium transition-all text-sm ${
                    selectedLeague === 'ALL'
                      ? 'bg-green-600 text-white'
                      : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'
                  }`}
                >
                  🌐 {language === 'ko' ? '전체 리그' : 'All Leagues'}
                </button>
              )}

              {/* 카테고리별 리그 */}
              {filteredCategories.map(category => (
                <div key={category.id} className="mb-3">
                  <h3 className="text-xs font-semibold text-gray-400 mb-1.5 px-1 flex items-center gap-1.5">
                    {category.flagCode ? (
                      <img 
                        src={`https://flagcdn.com/16x12/${category.flagCode}.png`}
                        alt=""
                        className="w-4 h-3 object-cover rounded-sm"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className="text-sm">{category.icon}</span>
                    )}
                    <span>{language === 'ko' ? category.nameKo : category.nameEn}</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {category.leagues.map(league => (
                      <button
                        key={`${category.id}-${league.code}`}
                        onClick={() => handleLeagueSelect(league.code)}
                        className={`px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                          selectedLeague === league.code
                            ? 'bg-green-600 text-white'
                            : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333] active:bg-[#444]'
                        }`}
                      >
                        {language === 'ko' ? league.nameKo : league.nameEn}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* 검색 결과 없음 */}
              {searchQuery && filteredCategories.length === 0 && (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">🔍</div>
                  <p className="text-gray-400 text-sm">
                    {language === 'ko' 
                      ? `"${searchQuery}" 검색 결과 없음`
                      : `No results for "${searchQuery}"`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
              <LiveMatchCard key={match.id} match={match} language={language} />
            ))}
          </div>
        )}
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
