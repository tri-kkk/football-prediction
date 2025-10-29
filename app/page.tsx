'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { savePrediction } from '../lib/predictions'

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


interface NewsItem {
  title: string
  url: string
  source: string
  img?: string
  time?: string
}

// 팀 이름 번역 (한/영)
const getTeamName = (teamName: string, lang: 'ko' | 'en'): string => {
  if (lang === 'en') return teamName
  
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
    'SSC Napoli': '나폴리',
    'US Lecce': '레체',
    'Atalanta BC': '아탈란타',
    'Como 1907': '코모',
    'Hellas Verona': '베로나',
    'AS Roma': '로마',
    'Parma Calcio 1913': '파르마',
  }
  
  return teamTranslations[teamName] || teamName
}

// 팀 이름 한글 번역 (하위 호환)
const translateTeamName = (teamName: string): string => {
  return getTeamName(teamName, 'ko')
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

// 국기 이미지 URL 매핑 (flagcdn.com 무료 서비스)
const countryFlags: { [key: string]: string } = {
  'England': 'https://flagcdn.com/w40/gb-eng.png',
  '잉글랜드': 'https://flagcdn.com/w40/gb-eng.png',
  'Spain': 'https://flagcdn.com/w40/es.png',
  '스페인': 'https://flagcdn.com/w40/es.png',
  'Italy': 'https://flagcdn.com/w40/it.png',
  '이탈리아': 'https://flagcdn.com/w40/it.png',
  'Germany': 'https://flagcdn.com/w40/de.png',
  '독일': 'https://flagcdn.com/w40/de.png',
  'France': 'https://flagcdn.com/w40/fr.png',
  '프랑스': 'https://flagcdn.com/w40/fr.png',
  'Netherlands': 'https://flagcdn.com/w40/nl.png',
  '네덜란드': 'https://flagcdn.com/w40/nl.png',
  'Portugal': 'https://flagcdn.com/w40/pt.png',
  '포르투갈': 'https://flagcdn.com/w40/pt.png',
  'Europe': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Flag_of_Europe.svg/40px-Flag_of_Europe.svg.png',
  '유럽': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Flag_of_Europe.svg/40px-Flag_of_Europe.svg.png',
}

// 리그 정보 (엠블럼, 국가 포함)
const leagueInfo: { [key: string]: { ko: string; en: string; logo: string; country: string; countryKo: string } } = {
  'Premier League': { 
    ko: '프리미어리그', 
    en: 'Premier League',
    logo: 'https://crests.football-data.org/PL.png',
    country: 'England',
    countryKo: '잉글랜드'
  },
  'Championship': { 
    ko: '챔피언십', 
    en: 'Championship',
    logo: 'https://crests.football-data.org/ELC.png',
    country: 'England',
    countryKo: '잉글랜드'
  },
  'Primera Division': { 
    ko: '라리가', 
    en: 'La Liga',
    logo: 'https://crests.football-data.org/PD.png',
    country: 'Spain',
    countryKo: '스페인'
  },
  'Serie A': { 
    ko: '세리에 A', 
    en: 'Serie A',
    logo: 'https://crests.football-data.org/SA.png',
    country: 'Italy',
    countryKo: '이탈리아'
  },
  'Serie B': { 
    ko: '세리에 B', 
    en: 'Serie B',
    logo: 'https://crests.football-data.org/SA.png',
    country: 'Italy',
    countryKo: '이탈리아'
  },
  'Bundesliga': { 
    ko: '분데스리가', 
    en: 'Bundesliga',
    logo: 'https://crests.football-data.org/BL1.png',
    country: 'Germany',
    countryKo: '독일'
  },
  '2. Bundesliga': { 
    ko: '분데스리가2', 
    en: '2. Bundesliga',
    logo: 'https://crests.football-data.org/BL1.png',
    country: 'Germany',
    countryKo: '독일'
  },
  'Ligue 1': { 
    ko: '리그 1', 
    en: 'Ligue 1',
    logo: 'https://crests.football-data.org/FL1.png',
    country: 'France',
    countryKo: '프랑스'
  },
  'Eredivisie': { 
    ko: '에레디비시', 
    en: 'Eredivisie',
    logo: 'https://crests.football-data.org/DED.png',
    country: 'Netherlands',
    countryKo: '네덜란드'
  },
  'Primeira Liga': { 
    ko: '프리메이라리가', 
    en: 'Primeira Liga',
    logo: 'https://crests.football-data.org/PPL.png',
    country: 'Portugal',
    countryKo: '포르투갈'
  },
  'UEFA Champions League': { 
    ko: '챔피언스리그', 
    en: 'Champions League',
    logo: 'https://crests.football-data.org/CL.png',
    country: 'Europe',
    countryKo: '유럽'
  },
}


// 간단한 API 캐시 (메모리)
const apiCache: { [key: string]: { data: any; timestamp: number } } = {}
const CACHE_DURATION = 5 * 60 * 1000 // 5분

const fetchWithCache = async (url: string, cacheKey: string) => {
  // 캐시 확인
  const cached = apiCache[cacheKey]
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('✅ 캐시 사용:', cacheKey)
    return cached.data
  }
  
  // 새로 fetch
  console.log('🔄 API 호출:', cacheKey)
  const response = await fetch(url)
  const data = await response.json()
  
  // 캐시 저장
  apiCache[cacheKey] = { data, timestamp: Date.now() }
  
  return data
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'results'>('scheduled')
  const [selectedLeague, setSelectedLeague] = useState<string>('all')
  const [matches, setMatches] = useState<Match[]>([])
  
  // 필터링된 경기 목록 - useMemo로 최적화
  const filteredMatches = useMemo(() => {
    return matches.filter(match => selectedLeague === 'all' || match.league === selectedLeague)
  }, [matches, selectedLeague])
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [analysis, setAnalysis] = useState<string>('')
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [h2h, setH2H] = useState<string>('')
  const [loadingH2H, setLoadingH2H] = useState(false)
  const [showH2HModal, setShowH2HModal] = useState(false)
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')
  const [selectedCountry, setSelectedCountry] = useState<string>(language === 'ko' ? '잉글랜드' : 'England') // 드롭다운 선택 국가
  const [news, setNews] = useState<NewsItem[]>([])
  const [loadingNews, setLoadingNews] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date()) // 마지막 업데이트 시간
  const [autoRefresh, setAutoRefresh] = useState(true) // 자동 새로고침 on/off
  const [mounted, setMounted] = useState(false) // 클라이언트 마운트 여부

  // 경기 ID 기반 고정 확률 생성 함수 (컴포넌트 레벨)
  const generateFixedProbability = useCallback((matchId: number) => {
    // 경기 ID를 시드로 사용하여 일관된 확률 생성
    const seed = matchId * 9301 + 49297
    const random = (seed % 233280) / 233280.0
    
    const homeWin = Math.floor(random * 30 + 35)
    const draw = Math.floor(((seed * 7) % 100) / 100 * 15 + 20)
    const awayWin = 100 - homeWin - draw
    
    return { homeWin, draw, awayWin }
  }, [])

  // 클라이언트 마운트 확인 및 타이틀 설정
  useEffect(() => {
    setMounted(true)
    document.title = 'Tri-Ki | Football Match Predictions'
  }, [])

  // 언어 변경 시 선택된 국가도 업데이트
  useEffect(() => {
    const countryMap: { [key: string]: string } = {
      '잉글랜드': 'England', 'England': '잉글랜드',
      '스페인': 'Spain', 'Spain': '스페인',
      '이탈리아': 'Italy', 'Italy': '이탈리아',
      '독일': 'Germany', 'Germany': '독일',
      '프랑스': 'France', 'France': '프랑스',
      '네덜란드': 'Netherlands', 'Netherlands': '네덜란드',
      '포르투갈': 'Portugal', 'Portugal': '포르투갈',
      '유럽': 'Europe', 'Europe': '유럽',
    }
    setSelectedCountry(countryMap[selectedCountry] || (language === 'ko' ? '잉글랜드' : 'England'))
  }, [language])

  // 다크모드 토글
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // 경기 데이터 로드 (자동 새로고침 포함)
  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true)
      try {
        const data = await fetchWithCache(
          `/api/matches?type=${activeTab}`,
          `matches-${activeTab}`
        )
        setMatches(data)
        setLastUpdate(new Date()) // 업데이트 시간 기록
      } catch (error) {
        console.error('경기 로드 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    // 최초 로드
    fetchMatches()

    // 자동 새로고침 설정 (60초마다) - autoRefresh가 true일 때만
    if (autoRefresh) {
      const intervalId = setInterval(() => {
        fetchMatches()
      }, 60000) // 60초 = 60,000ms

      // 클린업: 컴포넌트 언마운트 시 interval 정리
      return () => clearInterval(intervalId)
    }
  }, [activeTab, autoRefresh])

    // 자동 새로고침 설정 (5분마다)
    const intervalId = setInterval(() => {
      fetchStandings()
    }, 300000) // 5분 = 300,000ms

    // 클린업
    return () => clearInterval(intervalId)
  }, [selectedStandingsLeague])


  // AI 분석 핸들러 - useCallback으로 최적화
  const handleAnalysis = useCallback(async (match: Match) => {
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
      setAnalysis(`## ⚠️ 분석을 불러올 수 없습니다\n\n죄송합니다. 현재 AI 분석 서비스에 일시적인 문제가 발생했습니다.\n\n**가능한 원인:**\n- API 호출 제한 도달\n- 네트워크 연결 문제\n- 서버 일시적 오류\n\n**해결 방법:**\n- 잠시 후 다시 시도해주세요\n- 페이지를 새로고침 해보세요\n- 문제가 계속되면 관리자에게 문의해주세요\n\n오류 상세: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setLoadingAnalysis(false)
    }
  }, [])

  // H2H 분석 핸들러 - useCallback으로 최적화
  const handleH2H = useCallback(async (match: Match) => {
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
      setH2H(`## ⚠️ 상대전적을 불러올 수 없습니다\n\n죄송합니다. 현재 H2H 분석 서비스에 일시적인 문제가 발생했습니다.\n\n**가능한 원인:**\n- API 호출 제한 도달\n- 네트워크 연결 문제\n- 서버 일시적 오류\n\n**해결 방법:**\n- 잠시 후 다시 시도해주세요\n- 페이지를 새로고침 해보세요\n- AI 분석을 먼저 시도해보세요\n\n오류 상세: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setLoadingH2H(false)
    }
  }, [])

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
        {/* 최상단 GNB 헤더 - 블랙 계열 */}
        <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* 좌측: 로고 */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2 text-white font-bold text-xl cursor-pointer hover:text-blue-400 transition-colors">
                  <span className="text-2xl">⚽</span>
                  <span>FOOTBALL PREDICT</span>
                </div>

                {/* 메뉴 */}
                <nav className="hidden md:flex items-center gap-1">
                  {/* 리그 정보 드롭다운 */}
                  <div className="relative group">
                    <button className="px-4 py-2 text-white hover:bg-gray-800 rounded-lg transition-colors font-medium flex items-center gap-1">
                      <span>{language === 'ko' ? '리그 정보' : 'League Info'}</span>
                      <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">
                        {Object.keys(leagueInfo).length}
                      </span>
                      <span className="text-xs">▼</span>
                    </button>
                    
                    {/* 드롭다운 메뉴 - 2열 가로 레이아웃 */}
                    <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-[500px] z-50">
                      {(() => {
                        // 국가별로 리그 그룹화
                        const groupedLeagues: { [country: string]: Array<[string, typeof leagueInfo[string]]> } = {}
                        
                        Object.entries(leagueInfo).forEach(([key, info]) => {
                          const country = language === 'ko' ? info.countryKo : info.country
                          if (!groupedLeagues[country]) {
                            groupedLeagues[country] = []
                          }
                          groupedLeagues[country].push([key, info])
                        })
                        
                        // 국가 순서 정의
                        const countryOrder = language === 'ko' 
                          ? ['잉글랜드', '스페인', '이탈리아', '독일', '프랑스', '네덜란드', '포르투갈', '유럽']
                          : ['England', 'Spain', 'Italy', 'Germany', 'France', 'Netherlands', 'Portugal', 'Europe']
                        
                        // 현재 선택된 국가의 리그 목록
                        const currentLeagues = groupedLeagues[selectedCountry] || []
                        
                        return (
                          <div className="flex">
                            {/* 좌측: 국가 탭 */}
                            <div className="w-40 border-r border-gray-700 py-2">
                              {countryOrder.map(country => {
                                const leagues = groupedLeagues[country]
                                if (!leagues) return null
                                
                                // 해당 국가의 총 경기 수 계산
                                const totalCount = leagues.reduce((sum, [key]) => {
                                  return sum + matches.filter(m => m.league.includes(key.split(' ')[0])).length
                                }, 0)
                                
                                return (
                                  <button
                                    key={country}
                                    onMouseEnter={() => setSelectedCountry(country)}
                                    className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                                      selectedCountry === country
                                        ? 'bg-gray-700 text-white border-l-4 border-blue-500'
                                        : 'text-gray-300 hover:bg-gray-750 hover:text-white'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <img 
                                          src={countryFlags[country]} 
                                          alt={country}
                                          loading="lazy" className="w-5 h-4 object-cover rounded-sm"
                                          onError={(e) => {
                                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="16"><text y="12" font-size="12">🌍</text></svg>'
                                          }}
                                        />
                                        <span>{country}</span>
                                      </div>
                                      <span className="text-xs text-gray-400">({totalCount})</span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                            
                            {/* 우측: 리그 목록 */}
                            <div className="flex-1 py-2 max-h-[400px] overflow-y-auto">
                              {currentLeagues.length > 0 ? (
                                currentLeagues.map(([key, info]) => {
                                  const count = matches.filter(m => m.league.includes(key.split(' ')[0])).length
                                  
                                  return (
                                    <button 
                                      key={key}
                                      onClick={() => {
                                        setSelectedLeague(key)
                                        // 드롭다운 닫기 (포커스 이동)
                                        document.activeElement?.blur()
                                      }}
                                      className={`w-full block px-4 py-2.5 text-left text-white hover:bg-gray-700 transition-colors ${
                                        count === 0 ? 'opacity-50' : ''
                                      } ${selectedLeague === key ? 'bg-blue-600' : ''}`}
                                    >
                                      <span className="flex items-center gap-3">
                                        <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center p-1 border border-gray-600">
                                          <img 
                                            src={info.logo} 
                                            alt={info[language]}
                                            loading="lazy" className="w-full h-full object-contain"
                                            onError={(e) => {
                                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text y="20" font-size="20">⚽</text></svg>'
                                            }}
                                          />
                                        </div>
                                        <span className="flex-1">{info[language]}</span>
                                        <span className="text-xs text-gray-400">({count})</span>
                                      </span>
                                    </button>
                                  )
                                })
                              ) : (
                                <div className="px-4 py-8 text-center text-gray-400 text-sm">
                                  {language === 'ko' ? '리그가 없습니다' : 'No leagues'}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('scheduled')}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      activeTab === 'scheduled'
                        ? 'text-white bg-blue-600'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {language === 'ko' ? '예정 경기' : 'Scheduled'}
                  </button>
                  <button 
                    onClick={() => setActiveTab('results')}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      activeTab === 'results'
                        ? 'text-white bg-blue-600'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {language === 'ko' ? '경기 결과' : 'Results'}
                  </button>
                </nav>
              </div>

              {/* 우측: 언어 선택 + 다크모드 + 자동 새로고침 */}
              <div className="flex items-center gap-3">
                {/* 자동 새로고침 토글 + 업데이트 시간 */}
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                      autoRefresh 
                        ? 'text-green-400 hover:text-green-300' 
                        : 'text-gray-500 hover:text-gray-400'
                    }`}
                    title={autoRefresh ? '자동 새로고침 켜짐' : '자동 새로고침 꺼짐'}
                  >
                    <span className={`${autoRefresh ? 'animate-spin' : ''}`}>🔄</span>
                    <span>{autoRefresh ? (language === 'ko' ? 'ON' : 'ON') : (language === 'ko' ? 'OFF' : 'OFF')}</span>
                  </button>
                  <span className="text-gray-500 text-xs">|</span>
                  <span className="text-gray-400 text-xs" title="마지막 업데이트">
                    {mounted ? lastUpdate.toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    }) : '--:--:--'}
                  </span>
                </div>

                {/* 언어 선택 */}
                <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                  <button 
                    onClick={() => setLanguage('ko')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                      language === 'ko' 
                        ? 'text-white bg-blue-600' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <img 
                      src="https://flagcdn.com/w40/kr.png"
                      alt="한국"
                      loading="lazy" className="w-5 h-4 object-cover rounded-sm"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30"><text y="20" font-size="20">🇰🇷</text></svg>'
                      }}
                    />
                    <span>KR</span>
                  </button>
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                      language === 'en' 
                        ? 'text-white bg-blue-600' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <img 
                      src="https://flagcdn.com/w40/us.png"
                      alt="USA"
                      loading="lazy" className="w-5 h-4 object-cover rounded-sm"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30"><text y="20" font-size="20">🇺🇸</text></svg>'
                      }}
                    />
                    <span>EN</span>
                  </button>
                </div>

                {/* 다크모드 토글 */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                >
                  {darkMode ? '🌙' : '☀️'}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 승률 배너 - 풀사이즈 스크롤 (모든 탭) */}
        {matches.length > 0 && (
          <div className="w-full overflow-hidden shadow-lg mb-6">
            <div className={`${darkMode ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-y-2 border-slate-700' : 'bg-gradient-to-r from-blue-50 via-white to-blue-50 border-y-2 border-blue-200'} py-5`}>
              <div className="flex gap-4 animate-scroll-fast">
                  {matches.slice(0, 10).concat(matches.slice(0, 10)).map((match, index) => {
                    const originalIndex = index % matches.length
                    const originalMatch = matches[originalIndex]
                    
                    // 결과 탭인지 확인
                    const isResult = activeTab === 'results' && match.homeScore !== null
                    
                    // 경기 ID 기반 고정 확률 사용
                    const { homeWin, draw, awayWin } = generateFixedProbability(match.id)
                    
                    // 🔥 Supabase에 예측 저장 (예정 경기만, 중복 방지)
                    if (activeTab === 'scheduled' && index < 10) {
                      savePrediction(match, { homeWin, draw, awayWin }).catch(err => {
                        console.error('저장 실패:', err)
                      })
                    }

                    return (
                      <div
                        key={`banner-${match.id}-${index}`}
                        className={`flex items-center gap-4 px-5 py-3 rounded-xl border-2 whitespace-nowrap flex-shrink-0 transition-all cursor-pointer transform hover:scale-105 hover:shadow-xl ${
                          darkMode
                            ? 'bg-slate-800 border-slate-600 hover:bg-slate-700 hover:border-blue-500'
                            : 'bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400'
                        }`}
                        onClick={() => activeTab === 'scheduled' && handleAnalysis(originalMatch)}
                      >
                        {/* 홈팀 */}
                        <div className="flex items-center gap-2">
                          <img 
                            src={match.homeCrest} 
                            alt="" 
                            loading="lazy" className="w-6 h-6 object-contain"
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
                            loading="lazy" className="w-6 h-6 object-contain"
                          />
                        </div>
                        
                        {/* 결과 또는 승률 표시 */}
                        {isResult ? (
                          // 경기 결과 표시
                          <div className="flex items-center gap-2 ml-3 pl-3 border-l-2 border-gray-300 dark:border-slate-600">
                            <div className="text-center">
                              <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {language === 'ko' ? '최종' : 'Final'}
                              </div>
                              <div className={`text-lg font-extrabold ${
                                match.homeScore! > match.awayScore! ? 'text-emerald-500' : 
                                match.homeScore! < match.awayScore! ? 'text-red-500' : 
                                'text-slate-400'
                              }`}>
                                {match.homeScore} - {match.awayScore}
                              </div>
                            </div>
                          </div>
                        ) : (
                          // 승률 표시
                          <div className="flex gap-3 ml-3 pl-3 border-l-2 border-gray-300 dark:border-slate-600">
                            <div className="text-center">
                              <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {language === 'ko' ? '홈' : 'Home'}
                              </div>
                              <div className={`text-lg font-extrabold ${homeWin > 50 ? 'text-emerald-500' : 'text-blue-500'}`}>
                                {homeWin}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {language === 'ko' ? '무' : 'Draw'}
                              </div>
                              <div className={`text-lg font-extrabold ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                                {draw}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                {language === 'ko' ? '원정' : 'Away'}
                              </div>
                              <div className={`text-lg font-extrabold ${awayWin > 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {awayWin}%
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

        {/* 메인 컨텐츠 영역 */}
        <div className="container mx-auto px-4 py-8">
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
                🌍 {language === 'ko' ? '전체' : 'All'}
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
                        loading="lazy" className="w-5 h-5 object-contain"
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

          {/* 메인 컨텐츠: 좌측 경기 목록 + 우측 순위표 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 좌측: 경기 목록 (75%) */}
            <div className="lg:col-span-9">
              {loading ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">⚽</div>
                  <p className={`text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {language === 'ko' ? '로딩 중...' : 'Loading...'}
                  </p>
                </div>
              ) : (
                <>
                  {selectedLeague !== 'all' && (
                    <div className={`text-center py-4 ${darkMode ? 'text-slate-400' : 'text-gray-700'}`}>
                      <p className="text-sm font-medium">
                        {translateLeagueName(selectedLeague)} {language === 'ko' ? '경기' : 'Matches'}: {matches.filter(m => m.league === selectedLeague).length}{language === 'ko' ? '개' : ''}
                      </p>
                    </div>
                  )}
                  
                  {matches.filter(match => selectedLeague === 'all' || match.league === selectedLeague).length === 0 ? (
                    <div className={`text-center py-20 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                      <p className="text-xl font-medium">
                        {language === 'ko' 
                          ? `${translateLeagueName(selectedLeague)}의 경기가 없습니다` 
                          : `No matches in ${selectedLeague}`}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
                      {filteredMatches.map((match, index) => (
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
                          <div className={`mb-4 pb-3 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {match.leagueLogo && (
                                  <img 
                                    src={match.leagueLogo} 
                                    alt={match.league}
                                    loading="lazy" className="w-5 h-5 object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                )}
                                <span className={`text-sm font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                  {translateLeagueName(match.league)}
                                </span>
                              </div>
                              <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                                {match.date} • {match.time}
                              </span>
                            </div>
                          </div>

                          {/* 경기 정보 */}
                          <div className="flex items-center justify-between">
                            {/* 홈 팀 */}
                            <div className="flex-1 text-center">
                              <div className="mb-3 flex justify-center">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black shadow-lg ${
                                  darkMode 
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-2 border-blue-400' 
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-2 border-blue-300'
                                }`}>
                                  {language === 'ko' ? '홈' : 'HOME'}
                                </span>
                              </div>
                              <img
                                src={match.homeCrest}
                                alt={match.homeTeam}
                                loading="lazy" className="w-20 h-20 mx-auto mb-3 object-contain drop-shadow-lg"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text y="40" font-size="40">⚽</text></svg>'
                                }}
                              />
                              <div className={`font-bold text-base leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {getTeamName(match.homeTeam, language)}
                              </div>
                            </div>

                            {/* VS 또는 스코어 */}
                            <div className="flex-1 text-center px-4">
                              {match.status === 'FINISHED' && match.homeScore !== null ? (
                                <div className={`text-4xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {match.homeScore} - {match.awayScore}
                                </div>
                              ) : (
                                <div className={`text-3xl font-black ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                  VS
                                </div>
                              )}
                            </div>

                            {/* 원정 팀 */}
                            <div className="flex-1 text-center">
                              <div className="mb-3 flex justify-center">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black shadow-lg ${
                                  darkMode 
                                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border-2 border-red-400' 
                                    : 'bg-gradient-to-r from-red-500 to-red-600 text-white border-2 border-red-300'
                                }`}>
                                  {language === 'ko' ? '원정' : 'AWAY'}
                                </span>
                              </div>
                              <img
                                src={match.awayCrest}
                                alt={match.awayTeam}
                                loading="lazy" className="w-20 h-20 mx-auto mb-3 object-contain drop-shadow-lg"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text y="40" font-size="40">⚽</text></svg>'
                                }}
                              />
                              <div className={`font-bold text-base leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {getTeamName(match.awayTeam, language)}
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
                                  <span>{language === 'ko' ? 'AI 분석' : 'AI Analysis'}</span>
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
                                  <span>{language === 'ko' ? 'H2H 전적' : 'H2H Stats'}</span>
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

            {/* 우측: 뉴스 섹션 (상단) + 순위표 (하단) */}
            <div className="lg:col-span-3">
              {/* 매치 프리뷰 섹션 - 상단 */}
              <div className={`sticky top-20 rounded-2xl p-4 border-2 mb-6 ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700' 
                  : 'bg-white border-gray-200'
              }`}>
                {/* 프리뷰 헤더 */}
                <div className={`mb-4 pb-3 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    🎯 {language === 'ko' ? '경기 프리뷰' : 'Match Preview'}
                  </h3>
                </div>

                {/* 프리뷰 카드들 */}
                <div className="space-y-4">
                  {matches
                    .filter(match => match.status === 'SCHEDULED' || match.status === 'TIMED')
                    .slice(0, 3)
                    .map((match, index) => {
                      return (
                        <div 
                          key={match.id}
                          className="cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl group"
                          onClick={() => {
                            handleAnalysis(match)
                          }}
                        >
                          {/* 프리뷰 카드 */}
                          <div 
                            className="relative w-full rounded-2xl overflow-hidden shadow-xl border-2 border-white/10"
                            style={{
                              aspectRatio: '16/9',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            }}
                          >
                            {/* 애니메이션 배경 */}
                            <div className="absolute inset-0 opacity-20">
                              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                              <div className="absolute inset-0" style={{
                                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                                backgroundSize: '200% 200%'
                              }}></div>
                            </div>

                            {/* 팀 정보 - 중앙 */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="flex items-center justify-between w-full px-8">
                                {/* 홈 팀 */}
                                <div className="flex flex-col items-center space-y-3 group-hover:scale-110 transition-transform duration-300">
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-white/30 rounded-full blur-md"></div>
                                    <div className="relative w-24 h-24 bg-white rounded-full p-3 shadow-2xl ring-4 ring-white/30 group-hover:ring-white/50 transition-all">
                                      <img 
                                        src={match.homeCrest} 
                                        alt={match.homeTeam}
                                        loading="lazy" className="w-full h-full object-contain"
                                        onError={(e) => {
                                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Ctext x="50%25" y="50%25" font-size="40" text-anchor="middle" dy=".3em"%3E⚽%3C/text%3E%3C/svg%3E'
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-white font-bold text-base text-center max-w-[100px] leading-tight drop-shadow-2xl line-clamp-2">
                                    {match.homeTeam}
                                  </span>
                                </div>

                                {/* VS */}
                                <div className="flex flex-col items-center">
                                  <div className="text-white font-black text-4xl drop-shadow-2xl mb-2">VS</div>
                                  <div className="w-16 h-1 bg-white/60 rounded-full"></div>
                                </div>

                                {/* 원정 팀 */}
                                <div className="flex flex-col items-center space-y-3 group-hover:scale-110 transition-transform duration-300">
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-white/30 rounded-full blur-md"></div>
                                    <div className="relative w-24 h-24 bg-white rounded-full p-3 shadow-2xl ring-4 ring-white/30 group-hover:ring-white/50 transition-all">
                                      <img 
                                        src={match.awayCrest} 
                                        alt={match.awayTeam}
                                        loading="lazy" className="w-full h-full object-contain"
                                        onError={(e) => {
                                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Ctext x="50%25" y="50%25" font-size="40" text-anchor="middle" dy=".3em"%3E⚽%3C/text%3E%3C/svg%3E'
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-white font-bold text-base text-center max-w-[100px] leading-tight drop-shadow-2xl line-clamp-2">
                                    {match.awayTeam}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 클릭 유도 아이콘 */}
                            <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* 경기 시간 - 강화된 디자인 */}
                          <div className="mt-3 flex justify-center">
                            <div className={`relative flex items-center gap-3 px-5 py-3 rounded-2xl font-bold shadow-2xl ${
                              darkMode 
                                ? 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-2 border-slate-600' 
                                : 'bg-gradient-to-br from-white via-gray-50 to-white border-2 border-blue-200'
                            }`}>
                              {/* 아이콘 */}
                              <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-xl ${
                                darkMode 
                                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/50' 
                                  : 'bg-gradient-to-br from-blue-400 to-blue-500 shadow-blue-400/50'
                              } shadow-lg`}>
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                              </div>
                              
                              {/* 텍스트 */}
                              <div className="relative z-10 flex flex-col">
                                <span className={`text-xs font-semibold uppercase tracking-wider ${
                                  darkMode ? 'text-blue-400' : 'text-blue-600'
                                }`}>
                                  {language === 'ko' ? '킥오프 시간' : 'Kickoff'}
                                </span>
                                <span className={`text-xl font-black tracking-tight ${
                                  darkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {match.time}
                                </span>
                              </div>
                              
                              {/* 우측 장식 */}
                              <div className="relative z-10 flex items-center">
                                <div className={`w-2 h-2 rounded-full animate-pulse ${
                                  darkMode ? 'bg-green-400' : 'bg-green-500'
                                }`}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>

                {matches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED').length === 0 && (
                  <div className={`text-center py-10 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    <p className="text-sm">
                      {language === 'ko' ? '예정된 경기가 없습니다' : 'No upcoming matches'}
                    </p>
                  </div>
                )}
              </div>

          

        {/* 푸터 - 심플 카피라이트만 */}
        <footer className={`mt-12 border-t ${
          darkMode 
            ? 'bg-slate-900 border-slate-800' 
            : 'bg-gray-900 border-gray-800'
        }`}>
          <div className="container mx-auto px-4 py-6">
            <div className="flex justify-center items-center">
              {/* 카피라이트 */}
              <p className={`text-sm ${
                darkMode ? 'text-slate-400' : 'text-gray-400'
              }`}>
                © Tri-Ki. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
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
                🤖 {language === 'ko' ? 'AI 경기 분석' : 'AI Match Analysis'}
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
            ) : analysis.includes('불러올 수 없습니다') ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">⚠️</div>
                <div className={`whitespace-pre-wrap leading-relaxed mb-6 ${
                  darkMode ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  {analysis}
                </div>
                <button
                  onClick={() => selectedMatch && handleAnalysis(selectedMatch)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all transform hover:scale-105"
                >
                  🔄 다시 시도
                </button>
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
                📊 {language === 'ko' ? '상대 전적 (H2H)' : 'Head-to-Head (H2H)'}
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
                📊 {language === 'ko' ? '상대 전적 (H2H)' : 'Head-to-Head (H2H)'}
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

        .animate-scroll-fast {
          animation: scroll 54s linear infinite;
        }

        .animate-scroll:hover,
        .animate-scroll-fast:hover {
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
