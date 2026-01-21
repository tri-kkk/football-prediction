'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

// 경기 타입
interface ProtoMatch {
  matchSeq: number
  gameDate: string
  koreanDate: string
  koreanTime: string
  homeTeam: string
  awayTeam: string
  leagueName: string
  matchType: string  // 승무패, 승5패, 핸디캡, 언더오버, 홀짝
  handicapValue?: number | null  // 핸디캡 값 (예: -1.5)
  totalValue?: number | null  // 언오버 기준점 (예: 2.5)
  homeOdds: number | null
  drawOdds: number | null
  awayOdds: number | null
  resultCode: string | null
  round?: string
}

// 회차별 저장 구조
interface ProtoData {
  [round: string]: ProtoMatch[]
}

// 선택한 경기
interface Selection {
  matchSeq: number
  homeTeam: string
  awayTeam: string
  matchType: string  // 유형 추가
  prediction: 'home' | 'draw' | 'away' | 'over' | 'under' | 'odd' | 'even'
  odds: number
  handicapValue?: number | null
  totalValue?: number | null
}

// 저장된 조합
interface SavedSlip {
  id: string
  round: string
  selections: Selection[]
  totalOdds: number
  createdAt: string
  status: 'pending' | 'won' | 'lost'
  amount: number
  actualReturn: number
}

// 통계 타입
interface SlipStats {
  totalSlips: number
  pending: number
  won: number
  lost: number
  totalInvested: number
  totalReturn: number
  hitRate: number
}

export default function ProtoPage() {
  const { data: session, status } = useSession()
  const [allProtoData, setAllProtoData] = useState<ProtoData>({})
  const [matches, setMatches] = useState<ProtoMatch[]>([])
  const [selections, setSelections] = useState<Selection[]>([])
  const [savedSlips, setSavedSlips] = useState<SavedSlip[]>([])
  const [availableRounds, setAvailableRounds] = useState<string[]>([])
  const [currentRound, setCurrentRound] = useState('')
  const [lang, setLang] = useState<'ko' | 'en'>('ko')
  const [sportFilter, setSportFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [showSlipPanel, setShowSlipPanel] = useState(false)
  const [activeTab, setActiveTab] = useState<'calculator' | 'history' | 'stats'>('calculator')
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')
  
  // 유저 티어 (기본값: free)
  const userTier = (session?.user as any)?.tier || 'free'
  const isLoggedIn = status === 'authenticated'
  const isLoading_auth = status === 'loading'
  
  // 티어별 제한
  const LIMITS = {
    free: { slipsPerRound: 5, historyDays: 7 },
    premium: { slipsPerRound: Infinity, historyDays: Infinity }
  }
  
  // 탭 변경 + 스크롤 최상단
  const changeTab = (tab: 'calculator' | 'history' | 'stats') => {
    setActiveTab(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  // 필터 변경 + 스크롤 최상단
  const changeSportFilter = (filter: string) => {
    setSportFilter(filter)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  const changeTypeFilter = (filter: string) => {
    setTypeFilter(filter)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [betAmount, setBetAmount] = useState<number>(10000)  // 투자금
  const [slipStats, setSlipStats] = useState<SlipStats | null>(null)  // 통계

  const t = {
    ko: {
      title: '프로토 계산기',
      round: '회차',
      selected: '선택',
      totalOdds: '총 배당률',
      reset: '초기화',
      save: '저장',
      savedSlips: '저장된 조합',
      noMatches: '경기 데이터가 없습니다',
      home: '승',
      draw: '무',
      away: '패',
      comingSoon: '관리자가 경기 데이터를 업로드하면 표시됩니다',
      all: '전체',
      soccer: '축구',
      basketball: '농구',
      volleyball: '배구',
      // 탭 & 기록
      tabCalculator: '계산기',
      tabHistory: '기록',
      tabStats: '통계',
      filterAll: '전체',
      filterPending: '대기중',
      filterWon: '적중',
      filterLost: '실패',
      noHistory: '저장된 기록이 없습니다',
      deleteAll: '전체 삭제',
      stats: '통계',
      totalSlips: '총 조합',
      hitRate: '적중률',
      detail: '상세',
      delete: '삭제',
      // 금액 & 통계
      betAmount: '투자금',
      expectedReturn: '예상 수익',
      totalInvested: '총 투자',
      totalReturn: '총 수익',
      profitRate: '수익률',
      won: '적중',
      lost: '실패',
      pending: '대기',
    },
    en: {
      title: 'Proto Calculator',
      round: 'Round',
      selected: 'Selected',
      totalOdds: 'Total Odds',
      reset: 'Reset',
      save: 'Save',
      savedSlips: 'Saved Picks',
      noMatches: 'No match data available',
      home: 'Home',
      draw: 'Draw',
      away: 'Away',
      comingSoon: 'Matches will appear when admin uploads data',
      all: 'All',
      soccer: 'Soccer',
      basketball: 'Basketball',
      volleyball: 'Volleyball',
      // Tabs & History
      tabCalculator: 'Calculator',
      tabHistory: 'History',
      tabStats: 'Stats',
      filterAll: 'All',
      filterPending: 'Pending',
      filterWon: 'Won',
      filterLost: 'Lost',
      noHistory: 'No saved records',
      deleteAll: 'Delete All',
      stats: 'Stats',
      totalSlips: 'Total',
      hitRate: 'Hit Rate',
      detail: 'Detail',
      delete: 'Delete',
      // Amount & Stats
      betAmount: 'Bet Amount',
      expectedReturn: 'Expected Return',
      totalInvested: 'Total Invested',
      totalReturn: 'Total Return',
      profitRate: 'Profit Rate',
      won: 'Won',
      lost: 'Lost',
      pending: 'Pending',
    },
  }

  const text = t[lang]

  // 🆕 DB에서 저장된 조합 로드
  const fetchSlips = async () => {
    try {
      const res = await fetch('/api/proto/slips')
      const json = await res.json()
      if (json.success) {
        setSavedSlips(json.data)
        if (json.stats) {
          setSlipStats(json.stats)
        }
      }
    } catch (error) {
      console.error('Failed to fetch slips:', error)
    }
  }

  // 🆕 DB에서 경기 데이터 로드
  const fetchMatches = async (round?: string) => {
    try {
      const url = round 
        ? `/api/proto/matches?round=${round}`
        : '/api/proto/matches'
      const res = await fetch(url)
      const json = await res.json()
      
      console.log('API 응답:', json)  // 디버깅용
      
      if (json.success) {
        if (round && Array.isArray(json.data)) {
          // 특정 회차 경기 로드
          setMatches(json.data)
        }
        
        // 회차 목록 업데이트 (숫자 내림차순 정렬)
        const rounds = (json.rounds || json.data?.rounds || [])
          .sort((a: string, b: string) => parseInt(b) - parseInt(a))
        if (rounds.length > 0) {
          setAvailableRounds(rounds)
          
          // 첫 로드시 최신 회차 선택
          if (!currentRound) {
            const latestRound = rounds[0]
            setCurrentRound(latestRound)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error)
    }
  }

  // 저장된 조합 & 경기 데이터 로드
  useEffect(() => {
    fetchSlips()
    fetchMatches()
  }, [])

  // 회차 변경 시 해당 경기 로드
  useEffect(() => {
    if (currentRound) {
      fetchMatches(currentRound)
      setSelections([])
    }
  }, [currentRound])

  // 같은 경기인지 판단 (팀명 조합)
  const getMatchKey = (homeTeam: string, awayTeam: string) => {
    return `${homeTeam.toLowerCase()}-${awayTeam.toLowerCase()}`
  }

  // 해당 경기가 이미 선택되었는지 (다른 유형으로)
  const isMatchAlreadySelected = (match: ProtoMatch) => {
    const matchKey = getMatchKey(match.homeTeam, match.awayTeam)
    return selections.some(s => {
      const selKey = getMatchKey(s.homeTeam, s.awayTeam)
      return selKey === matchKey && s.matchSeq !== match.matchSeq
    })
  }

  // 경기 선택/해제 (유형별 처리)
  const toggleSelection = (
    match: ProtoMatch, 
    prediction: 'home' | 'draw' | 'away' | 'over' | 'under' | 'odd' | 'even'
  ) => {
    // 🆕 같은 경기(팀 조합)가 다른 유형으로 이미 선택되어 있으면 차단
    if (isMatchAlreadySelected(match)) {
      alert('같은 경기에서는 하나의 유형만 선택할 수 있습니다.')
      return
    }

    // 유형별 배당률 매핑
    let odds: number | null = null
    if (prediction === 'home' || prediction === 'over' || prediction === 'odd') {
      odds = match.homeOdds
    } else if (prediction === 'draw') {
      odds = match.drawOdds
    } else {
      odds = match.awayOdds
    }

    if (!odds) return

    const existingIndex = selections.findIndex(s => s.matchSeq === match.matchSeq)
    
    if (existingIndex >= 0) {
      if (selections[existingIndex].prediction === prediction) {
        // 🆕 마지막 선택 제거시 패널 닫기
        if (selections.length === 1) {
          setShowSlipPanel(false)
        }
        setSelections(selections.filter((_, i) => i !== existingIndex))
      } else {
        const newSelections = [...selections]
        newSelections[existingIndex] = {
          matchSeq: match.matchSeq,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          matchType: match.matchType,
          prediction,
          odds,
          handicapValue: match.handicapValue,
          totalValue: match.totalValue,
        }
        setSelections(newSelections)
      }
    } else {
      // 🆕 첫 선택시 패널 자동 열기
      if (selections.length === 0) {
        setShowSlipPanel(true)
      }
      setSelections([...selections, {
        matchSeq: match.matchSeq,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        matchType: match.matchType,
        prediction,
        odds,
        handicapValue: match.handicapValue,
        totalValue: match.totalValue,
      }])
    }
  }

  // 총 배당률
  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1)

  // 🆕 조합 저장 (DB) - 티어별 제한 체크
  const saveSlip = async () => {
    if (selections.length === 0) return
    
    // 무료회원 저장 개수 제한 체크
    if (userTier === 'free') {
      const roundSlips = savedSlips.filter(s => s.round === currentRound)
      if (roundSlips.length >= LIMITS.free.slipsPerRound) {
        setLimitMessage(lang === 'ko' 
          ? `이번 회차 저장 한도(${LIMITS.free.slipsPerRound}개)를 초과했습니다.\n프리미엄으로 업그레이드하면 무제한 저장!`
          : `You've reached the limit (${LIMITS.free.slipsPerRound}) for this round.\nUpgrade to Premium for unlimited saves!`
        )
        setShowLimitModal(true)
        return
      }
    }
    
    setIsLoading(true)
    try {
      const res = await fetch('/api/proto/slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round: currentRound,
          selections: [...selections],
          totalOdds,
          amount: betAmount
        })
      })
      
      const json = await res.json()
      if (json.success) {
        setSavedSlips(prev => [json.data, ...prev])
        setSelections([])
        setShowSlipPanel(false)
        // 통계 새로고침
        fetchSlips()
      }
    } catch (error) {
      console.error('Failed to save slip:', error)
      alert('저장 실패')
    } finally {
      setIsLoading(false)
    }
  }

  // 🆕 조합 삭제 (DB)
  const deleteSlip = async (id: string) => {
    try {
      const res = await fetch(`/api/proto/slips?id=${id}`, {
        method: 'DELETE'
      })
      
      const json = await res.json()
      if (json.success) {
        setSavedSlips(prev => prev.filter(s => s.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete slip:', error)
    }
  }

  // 🆕 전체 삭제 (DB)
  const deleteAllSlips = async () => {
    if (!confirm('모든 기록을 삭제하시겠습니까?')) return
    
    setIsLoading(true)
    try {
      const res = await fetch('/api/proto/slips?all=true', {
        method: 'DELETE'
      })
      
      const json = await res.json()
      if (json.success) {
        setSavedSlips([])
      }
    } catch (error) {
      console.error('Failed to delete all slips:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 스포츠 필터
  const sportFilters = [
    { key: 'ALL', label: text.all, icon: '🏆', leagues: null },
    { key: 'SOCCER', label: text.soccer, icon: '⚽', leagues: ['UCL', 'UEL', 'EPL', 'PL', 'U23아컵', '에레디비', 'EFL챔', 'EFL', '라리가', '분데스리', '세리에', '리그', '프리그'] },
    { key: 'BASKETBALL', label: text.basketball, icon: '🏀', leagues: ['KBL', 'WKBL', 'NBA', 'EASL', '남농'] },
    { key: 'VOLLEYBALL', label: text.volleyball, icon: '🏐', leagues: ['KOVO'] },
  ]

  // 유형 필터
  const typeFilters = [
    { key: 'ALL', label: '전체', short: 'ALL' },
    { key: '승무패', label: '승무패', short: '1X2' },
    { key: '핸디캡', label: '핸디캡', short: 'H' },
    { key: '언더오버', label: '언오버', short: 'U/O' },
    { key: '홀짝', label: '홀짝', short: 'O/E' },
    { key: '승5패', label: '승5패', short: '5P' },
  ]

  // 필터링 (스포츠 + 유형)
  const filteredMatches = matches.filter(match => {
    // 스포츠 필터
    if (sportFilter !== 'ALL') {
      const filter = sportFilters.find(f => f.key === sportFilter)
      if (filter?.leagues && !filter.leagues.some(l => match.leagueName.includes(l))) {
        return false
      }
    }
    // 유형 필터
    if (typeFilter !== 'ALL' && match.matchType !== typeFilter) {
      return false
    }
    return true
  })

  // 날짜별 그룹화
  const groupedMatches = filteredMatches.reduce((acc, match) => {
    const date = match.koreanDate
    if (!acc[date]) acc[date] = []
    acc[date].push(match)
    return acc
  }, {} as Record<string, ProtoMatch[]>)

  // 리그 아이콘
  const getLeagueIcon = (league: string) => {
    if (['UCL', 'UEL', 'EPL', 'PL', '라리가', '분데스리', '세리에', '리그', '프리그', 'EFL', 'U23아컵'].some(l => league.includes(l))) return '⚽'
    if (['KBL', 'WKBL', 'NBA', 'EASL'].some(l => league.includes(l))) return '🏀'
    if (league.includes('KOVO')) return '🏐'
    return '🎯'
  }

  // 로딩 중
  if (isLoading_auth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-400 text-sm">로딩중...</p>
        </div>
      </div>
    )
  }

  // 비회원 차단
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎫</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            {lang === 'ko' ? '프로토 계산기' : 'Proto Calculator'}
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            {lang === 'ko' 
              ? '로그인 후 이용할 수 있습니다.\n무료 회원도 기본 기능을 사용할 수 있어요!'
              : 'Please login to continue.\nFree members can use basic features!'}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
          >
            <span>🔐</span>
            {lang === 'ko' ? '로그인하기' : 'Login'}
          </Link>
          <Link
            href="/"
            className="block mt-4 text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            ← {lang === 'ko' ? '홈으로 돌아가기' : 'Back to Home'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* 제한 모달 */}
      {showLimitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full border border-gray-700">
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👑</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {lang === 'ko' ? '프리미엄 기능' : 'Premium Feature'}
              </h3>
              <p className="text-sm text-gray-400 whitespace-pre-line mb-6">
                {limitMessage}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm transition-colors"
                >
                  {lang === 'ko' ? '닫기' : 'Close'}
                </button>
                <Link
                  href="/premium/pricing"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors text-center"
                >
                  {lang === 'ko' ? '프리미엄 보기' : 'View Premium'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-3 py-2">
          {/* 타이틀 + 탭 한 줄 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center">
                <span className="text-base">🎫</span>
              </div>
              <h1 className="text-sm font-bold text-white">{text.title}</h1>
            </div>
            
            {/* 탭 버튼 */}
            <div className="flex-1 flex gap-1.5">
              <button
                onClick={() => changeTab('calculator')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'calculator'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800/50 text-gray-400'
                }`}
              >
                🧮 {text.tabCalculator}
              </button>
              <button
                onClick={() => changeTab('history')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'history'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800/50 text-gray-400'
                }`}
              >
                📋 {text.tabHistory}
                {savedSlips.length > 0 && (
                  <span className={`ml-1 px-1 py-0.5 rounded-full text-[10px] ${
                    activeTab === 'history' ? 'bg-white/20' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {savedSlips.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => changeTab('stats')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'stats'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800/50 text-gray-400'
                }`}
              >
                📊 {text.tabStats}
              </button>
            </div>
          </div>

          {/* ==================== 계산기 탭에서만 필터 표시 ==================== */}
          {activeTab === 'calculator' && (
            <>
              {/* 회차 + 스포츠 필터 + 경기 수 */}
              <div className="mt-2 flex items-center gap-2">
                {/* 회차 드롭다운 */}
                <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg px-2 py-1.5">
                  <span className="text-[10px] text-gray-500">{text.round}</span>
                  {availableRounds.length > 0 ? (
                    <select
                      value={currentRound}
                      onChange={(e) => setCurrentRound(e.target.value)}
                      className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
                    >
                      {availableRounds.map((round) => (
                        <option key={round} value={round} className="bg-gray-800">
                          {round === '0' ? '미분류' : `${round}회차`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </div>

                {/* 스포츠 필터 - 아이콘만 */}
                <div className="flex gap-1">
                  {sportFilters.map(filter => {
                    const count = filter.key === 'ALL' 
                      ? matches.length 
                      : matches.filter(m => filter.leagues?.some(l => m.leagueName.includes(l))).length
                    return (
                      <button
                        key={filter.key}
                        onClick={() => changeSportFilter(filter.key)}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all ${
                          sportFilter === filter.key
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-800/50 text-gray-400'
                        }`}
                      >
                        <span>{filter.icon}</span>
                        <span className="text-[10px]">{count}</span>
                      </button>
                    )
                  })}
                </div>

                {/* 경기 수 */}
                <div className="ml-auto text-[10px] text-gray-500">
                  <span className="text-emerald-400 font-bold">{filteredMatches.length}</span>경기
                </div>
              </div>

              {/* 유형 필터 */}
              <div className="mt-1.5 flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                {typeFilters.map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => changeTypeFilter(filter.key)}
                    className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-all ${
                      typeFilter === filter.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800/50 text-gray-400'
                    }`}
                  >
                    {filter.short}
                    {filter.key !== 'ALL' && (
                      <span className="ml-0.5 opacity-70">
                        {matches.filter(m => m.matchType === filter.key).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-4 pb-20">
        {/* 계산기 탭 */}
        {activeTab === 'calculator' && (
        <>
        {/* 경기 없음 */}
        {filteredMatches.length === 0 ? (
          <div className="bg-gray-800/30 rounded-2xl border border-gray-700/50 p-12 text-center">
            <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🎫</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{text.noMatches}</h3>
            <p className="text-sm text-gray-500">{text.comingSoon}</p>
          </div>
        ) : (
          /* 날짜별 경기 목록 */
          Object.entries(groupedMatches).map(([date, dateMatches]) => (
            <div key={date} className="mb-4">
              {/* 날짜 헤더 */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <h2 className="text-xs font-bold text-white">{date}</h2>
                <span className="text-[10px] text-gray-500">{dateMatches.length}경기</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>

              {/* 경기 카드들 */}
              <div className="space-y-2">
                {dateMatches.map((match) => {
                  const selection = selections.find(s => s.matchSeq === match.matchSeq)
                  const isSelected = !!selection
                  const isFinished = match.resultCode !== null
                  const isLocked = isMatchAlreadySelected(match)  // 같은 경기 다른 유형 선택됨
                  
                  // 🆕 경기 시작 여부 체크 (현재 시간 >= 경기 시작 시간)
                  const isStarted = (() => {
                    try {
                      const matchTime = new Date(match.gameDate).getTime()
                      const now = Date.now()
                      return now >= matchTime
                    } catch {
                      return false
                    }
                  })()
                  
                  // 선택 불가 여부 (결과 있음 OR 경기 시작됨 OR 다른 유형 선택됨)
                  const isDisabled = isFinished || isStarted || isLocked
                  
                  // 결과 텍스트 변환 (유형별)
                  const getResultText = (code: string | null, type: string) => {
                    if (!code) return null
                    if (type === '언더오버') {
                      return code === 'over' ? '오버' : code === 'under' ? '언더' : null
                    }
                    if (type === '홀짝') {
                      return code === 'odd' ? '홀' : code === 'even' ? '짝' : null
                    }
                    if (type === '핸디캡') {
                      return code === 'home' ? '핸디승' : code === 'draw' ? '핸디무' : code === 'away' ? '핸디패' : null
                    }
                    // 승무패, 승5패
                    if (code === 'home') return '홈승'
                    if (code === 'draw') return '무'
                    if (code === 'away') return '홈패'
                    return null
                  }
                  
                  // 축구 리그 판단 (핸디캡이 3way인 리그)
                  const soccerLeagues = ['UCL', 'UEL', 'EPL', 'EFL', '세리에', '라리가', '분데스리', '리그1', '프리그1', 'U23아컵', '에레디비', 'PL']
                  const isSoccerLeague = soccerLeagues.some(l => match.leagueName.includes(l))
                  
                  // 유형별 버튼 레이블
                  const getButtonLabels = (type: string) => {
                    switch (type) {
                      case '핸디캡':
                        if (isSoccerLeague) {
                          // 축구 핸디캡 3way
                          return { 
                            home: `H${match.handicapValue && match.handicapValue > 0 ? '+' : ''}${match.handicapValue || ''}`, 
                            draw: '핸디무', 
                            away: '핸디패' 
                          }
                        } else {
                          // 농구/배구 핸디캡 2way
                          return { 
                            home: `H${match.handicapValue && match.handicapValue > 0 ? '+' : ''}${match.handicapValue || ''}`, 
                            draw: null, 
                            away: '핸디패' 
                          }
                        }
                      case '언더오버':
                        return { home: `O ${match.totalValue || ''}`, draw: null, away: `U ${match.totalValue || ''}` }
                      case '홀짝':
                        return { home: '홀', draw: null, away: '짝' }
                      case '승5패':
                        return { home: '승', draw: '무5', away: '패' }
                      default:
                        return { home: '승', draw: '무', away: '패' }
                    }
                  }
                  
                  const labels = getButtonLabels(match.matchType)
                  
                  // 2way인지 3way인지 판단
                  const is2Way = (type: string) => {
                    if (type === '언더오버' || type === '홀짝') return true
                    if (type === '핸디캡' && !isSoccerLeague) return true  // 농구/배구 핸디캡
                    return false
                  }
                  
                  // 유형별 prediction 매핑
                  const getPrediction = (type: string, btn: 'home' | 'draw' | 'away') => {
                    if (type === '언더오버') {
                      return btn === 'home' ? 'over' : 'under'
                    }
                    if (type === '홀짝') {
                      return btn === 'home' ? 'odd' : 'even'
                    }
                    return btn
                  }
                  
                  // 유형 뱃지 색상
                  const getTypeBadgeColor = (type: string) => {
                    switch (type) {
                      case '핸디캡': return 'bg-purple-500/20 text-purple-400'
                      case '언더오버': return 'bg-orange-500/20 text-orange-400'
                      case '홀짝': return 'bg-pink-500/20 text-pink-400'
                      case '승5패': return 'bg-cyan-500/20 text-cyan-400'
                      default: return 'bg-gray-500/20 text-gray-400'
                    }
                  }

                  return (
                    <div
                      key={match.matchSeq}
                      className={`bg-gray-800/50 rounded-lg border transition-all ${
                        isFinished
                          ? 'border-gray-600/30 opacity-70'
                          : isStarted
                            ? 'border-orange-500/30 opacity-60'
                            : isLocked
                              ? 'border-yellow-500/30 opacity-60'
                              : isSelected 
                                ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
                                : 'border-gray-700/50 hover:border-gray-600/50'
                      }`}
                    >
                      {/* 경기 정보 헤더 - 컴팩트 */}
                      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-700/30">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-gray-500">
                            #{String(match.matchSeq).padStart(3, '0')}
                          </span>
                          <span className="px-1.5 py-0.5 bg-gray-700/50 rounded text-[10px] text-gray-300">
                            {getLeagueIcon(match.leagueName)} {match.leagueName}
                          </span>
                          {/* 유형 뱃지 (승무패 제외) */}
                          {match.matchType !== '승무패' && (
                            <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${getTypeBadgeColor(match.matchType)}`}>
                              {match.matchType === '핸디캡' ? `H${match.handicapValue}` :
                               match.matchType === '언더오버' ? `U/O ${match.totalValue}` :
                               match.matchType === '홀짝' ? 'O/E' :
                               match.matchType}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* 🆕 경기 시작됨 뱃지 */}
                          {isStarted && !isFinished && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/20 text-orange-400">
                              ⏱️
                            </span>
                          )}
                          {/* 잠금 뱃지 */}
                          {isLocked && !isStarted && !isFinished && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/20 text-yellow-400">
                              🔒
                            </span>
                          )}
                          {/* 결과 뱃지 */}
                          {isFinished && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              ['home', 'over', 'odd'].includes(match.resultCode || '') ? 'bg-blue-500/20 text-blue-400' :
                              match.resultCode === 'draw' ? 'bg-gray-500/20 text-gray-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {getResultText(match.resultCode, match.matchType)}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500">{match.koreanTime}</span>
                        </div>
                      </div>

                      {/* 팀 & 배당률 - 컴팩트 */}
                      <div className="p-2.5">
                        {/* 팀명 - 한 줄 */}
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className={`text-sm font-medium truncate max-w-[35%] ${
                            isFinished && ['home', 'over', 'odd'].includes(match.resultCode || '') ? 'text-blue-400' :
                            ['home', 'over', 'odd'].includes(selection?.prediction || '') ? 'text-emerald-400' : 
                            isDisabled ? 'text-gray-500' : 'text-white'
                          }`}>
                            {match.homeTeam}
                          </span>
                          <span className="text-gray-600 text-xs">vs</span>
                          <span className={`text-sm font-medium truncate max-w-[35%] ${
                            isFinished && ['away', 'under', 'even'].includes(match.resultCode || '') ? 'text-red-400' :
                            ['away', 'under', 'even'].includes(selection?.prediction || '') ? 'text-emerald-400' : 
                            isDisabled ? 'text-gray-500' : 'text-white'
                          }`}>
                            {match.awayTeam}
                          </span>
                        </div>

                        {/* 배당률 버튼 - 유형별 다르게 표시 */}
                        {is2Way(match.matchType) ? (
                          // 2way 버튼 (언오버, 홀짝, 농구/배구 핸디캡)
                          <div className="grid grid-cols-2 gap-1.5">
                            {/* 왼쪽 버튼 */}
                            <button
                              onClick={() => !isDisabled && match.homeOdds && toggleSelection(match, getPrediction(match.matchType, 'home') as any)}
                              disabled={!match.homeOdds || isDisabled}
                              className={`py-2 rounded-lg text-center transition-all ${
                                isFinished && ['home', 'over', 'odd'].includes(match.resultCode || '')
                                  ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                                  : isDisabled
                                    ? 'bg-gray-800/30 text-gray-500 cursor-not-allowed'
                                    : ['home', 'over', 'odd'].includes(selection?.prediction || '')
                                      ? 'bg-emerald-600 text-white'
                                      : match.homeOdds
                                        ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                                        : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                              }`}
                            >
                              <p className="text-[10px] text-gray-400">{labels.home}</p>
                              <p className="font-bold text-base">
                                {match.homeOdds?.toFixed(2) || '-'}
                                {isFinished && ['home', 'over', 'odd'].includes(match.resultCode || '') && ' ✓'}
                              </p>
                            </button>

                            {/* 오른쪽 버튼 */}
                            <button
                              onClick={() => !isDisabled && match.awayOdds && toggleSelection(match, getPrediction(match.matchType, 'away') as any)}
                              disabled={!match.awayOdds || isDisabled}
                              className={`py-2 rounded-lg text-center transition-all ${
                                isFinished && ['away', 'under', 'even'].includes(match.resultCode || '')
                                  ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                                  : isDisabled
                                    ? 'bg-gray-800/30 text-gray-500 cursor-not-allowed'
                                    : ['away', 'under', 'even'].includes(selection?.prediction || '')
                                      ? 'bg-emerald-600 text-white'
                                      : match.awayOdds
                                        ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                                        : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                              }`}
                            >
                              <p className="text-[10px] text-gray-400">{labels.away}</p>
                              <p className="font-bold text-base">
                                {match.awayOdds?.toFixed(2) || '-'}
                                {isFinished && ['away', 'under', 'even'].includes(match.resultCode || '') && ' ✓'}
                              </p>
                            </button>
                          </div>
                        ) : (
                          // 3way 버튼 (승무패, 승5패)
                          <div className="grid grid-cols-3 gap-1.5">
                            {/* 홈승 */}
                            <button
                              onClick={() => !isDisabled && match.homeOdds && toggleSelection(match, 'home')}
                              disabled={!match.homeOdds || isDisabled}
                              className={`py-2 rounded-lg text-center transition-all ${
                                isFinished && match.resultCode === 'home'
                                  ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                                  : isDisabled
                                    ? 'bg-gray-800/30 text-gray-500 cursor-not-allowed'
                                    : selection?.prediction === 'home'
                                      ? 'bg-emerald-600 text-white'
                                      : match.homeOdds
                                        ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                                        : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                              }`}
                            >
                              <p className="text-[10px] text-gray-400">{labels.home}</p>
                              <p className="font-bold text-base">
                                {match.homeOdds?.toFixed(2) || '-'}
                                {isFinished && match.resultCode === 'home' && ' ✓'}
                              </p>
                            </button>

                            {/* 무승부 */}
                            <button
                              onClick={() => !isDisabled && match.drawOdds && toggleSelection(match, 'draw')}
                              disabled={!match.drawOdds || isDisabled}
                              className={`py-2 rounded-lg text-center transition-all ${
                                isFinished && match.resultCode === 'draw'
                                  ? 'bg-gray-500/30 text-gray-300 border border-gray-500/50'
                                  : isDisabled
                                    ? 'bg-gray-800/30 text-gray-500 cursor-not-allowed'
                                    : selection?.prediction === 'draw'
                                      ? 'bg-emerald-600 text-white'
                                      : match.drawOdds
                                        ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                                        : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                              }`}
                            >
                              <p className="text-[10px] text-gray-400">{labels.draw}</p>
                              <p className="font-bold text-base">
                                {match.drawOdds?.toFixed(2) || '-'}
                                {isFinished && match.resultCode === 'draw' && ' ✓'}
                              </p>
                            </button>

                            {/* 원정승 */}
                            <button
                              onClick={() => !isDisabled && match.awayOdds && toggleSelection(match, 'away')}
                              disabled={!match.awayOdds || isDisabled}
                              className={`py-2 rounded-lg text-center transition-all ${
                                isFinished && match.resultCode === 'away'
                                  ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                                  : isDisabled
                                    ? 'bg-gray-800/30 text-gray-500 cursor-not-allowed'
                                    : selection?.prediction === 'away'
                                      ? 'bg-emerald-600 text-white'
                                      : match.awayOdds
                                        ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                                        : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                              }`}
                            >
                              <p className="text-[10px] text-gray-400">{labels.away}</p>
                              <p className="font-bold text-base">
                                {match.awayOdds?.toFixed(2) || '-'}
                                {isFinished && match.resultCode === 'away' && ' ✓'}
                              </p>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
        </>
        )}

        {/* ==================== 기록 탭 ==================== */}
        {activeTab === 'history' && (
          <div className="mt-2">
            {/* 필터 버튼 - 컴팩트 */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { key: 'all', label: text.filterAll, icon: '📋' },
                { key: 'pending', label: text.filterPending, icon: '⏳' },
                { key: 'won', label: text.filterWon, icon: '✅' },
                { key: 'lost', label: text.filterLost, icon: '❌' },
              ].map((filter) => {
                const count = filter.key === 'all' 
                  ? savedSlips.length 
                  : savedSlips.filter(s => s.status === filter.key).length
                return (
                  <button
                    key={filter.key}
                    onClick={() => setHistoryFilter(filter.key as any)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      historyFilter === filter.key
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    <span>{filter.icon}</span>
                    <span>{filter.label}</span>
                    <span className={`${historyFilter === filter.key ? 'text-emerald-200' : 'text-gray-500'}`}>
                      ({count})
                    </span>
                  </button>
                )
              })}
            </div>

            {/* 통계 - 모바일 2x3, 데스크탑 1x6 */}
            {slipStats && savedSlips.length > 0 && (
              <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2">
                <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-gray-700/50">
                  <p className="text-lg font-bold text-white">{slipStats.totalSlips}</p>
                  <p className="text-[10px] text-gray-500">{text.totalSlips}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-gray-700/50">
                  <p className="text-lg font-bold text-yellow-400">{slipStats.pending}</p>
                  <p className="text-[10px] text-gray-500">{text.pending}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-gray-700/50">
                  <p className="text-lg font-bold text-green-400">{slipStats.won}</p>
                  <p className="text-[10px] text-gray-500">{text.won}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-gray-700/50">
                  <p className="text-lg font-bold text-red-400">{slipStats.lost}</p>
                  <p className="text-[10px] text-gray-500">{text.lost}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-gray-700/50">
                  <p className="text-lg font-bold text-blue-400">{slipStats.totalInvested.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500">{text.totalInvested}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 text-center border border-gray-700/50">
                  <p className={`text-lg font-bold ${slipStats.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {slipStats.totalReturn >= 0 ? '+' : ''}{slipStats.totalReturn.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500">{text.totalReturn}</p>
                </div>
              </div>
            )}

            {/* 적중률 + 수익률 - 컴팩트 */}
            {slipStats && (slipStats.won + slipStats.lost) > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 rounded-lg p-2 border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">{text.hitRate}</span>
                    <span className="text-lg font-bold text-emerald-400">{slipStats.hitRate}%</span>
                  </div>
                </div>
                <div className={`bg-gradient-to-r ${slipStats.totalReturn >= 0 ? 'from-blue-900/30 to-blue-800/20 border-blue-500/20' : 'from-red-900/30 to-red-800/20 border-red-500/20'} rounded-lg p-2 border`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">{text.profitRate}</span>
                    <span className={`text-lg font-bold ${slipStats.totalReturn >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {slipStats.totalInvested > 0 
                        ? `${slipStats.totalReturn >= 0 ? '+' : ''}${Math.round((slipStats.totalReturn / slipStats.totalInvested) * 100)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 조합 목록 */}
            <div className="mt-3 space-y-4">
              {(() => {
                const sevenDaysAgo = new Date()
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
                
                const filteredSlips = savedSlips
                  .filter(slip => historyFilter === 'all' || slip.status === historyFilter)
                  .filter(slip => {
                    // 프리미엄은 전체, 무료는 7일
                    if (userTier === 'premium') return true
                    return new Date(slip.createdAt) >= sevenDaysAgo
                  })
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                
                const hiddenCount = savedSlips.filter(slip => 
                  (historyFilter === 'all' || slip.status === historyFilter) &&
                  userTier === 'free' && 
                  new Date(slip.createdAt) < sevenDaysAgo
                ).length
                
                // 회차별 그룹핑
                const groupedByRound: { [round: string]: typeof filteredSlips } = {}
                filteredSlips.forEach(slip => {
                  const round = slip.round || '0'
                  if (!groupedByRound[round]) groupedByRound[round] = []
                  groupedByRound[round].push(slip)
                })
                
                // 회차 내림차순 정렬
                const sortedRounds = Object.keys(groupedByRound).sort((a, b) => parseInt(b) - parseInt(a))
                
                return (
                  <>
                    {sortedRounds.map((round) => {
                      const slips = groupedByRound[round]
                      const roundStats = {
                        total: slips.length,
                        won: slips.filter(s => s.status === 'won').length,
                        lost: slips.filter(s => s.status === 'lost').length,
                        pending: slips.filter(s => s.status === 'pending').length,
                      }
                      
                      return (
                        <div key={round} className="space-y-2">
                          {/* 회차 헤더 */}
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">
                                {round === '0' ? '미분류' : `${round}회차`}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {roundStats.total}개
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              {roundStats.won > 0 && (
                                <span className="text-green-400">✓{roundStats.won}</span>
                              )}
                              {roundStats.lost > 0 && (
                                <span className="text-red-400">✗{roundStats.lost}</span>
                              )}
                              {roundStats.pending > 0 && (
                                <span className="text-yellow-400">⏳{roundStats.pending}</span>
                              )}
                            </div>
                          </div>
                          
                          {/* 회차 내 슬립들 */}
                          <div className="space-y-2 pl-2 border-l-2 border-gray-700">
                            {slips.map((slip) => (
                              <div
                                key={slip.id}
                                className={`rounded-lg border p-3 transition-all ${
                                  slip.status === 'won' 
                                    ? 'bg-green-900/20 border-green-500/30' 
                                    : slip.status === 'lost'
                                      ? 'bg-red-900/20 border-red-500/30'
                                      : 'bg-gray-800/30 border-gray-700/50'
                                }`}
                              >
                                {/* 헤더 - 컴팩트 */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      slip.status === 'won' ? 'bg-green-500/20 text-green-400' :
                                      slip.status === 'lost' ? 'bg-red-500/20 text-red-400' :
                                      'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                      {slip.status === 'won' ? '✅ 적중' : slip.status === 'lost' ? '❌ 실패' : '⏳ 대기중'}
                                    </span>
                                    <span className="text-[10px] text-gray-500">{slip.selections.length}폴</span>
                                  </div>
                                  <button
                                    onClick={() => deleteSlip(slip.id)}
                                    className="text-gray-500 hover:text-red-400 text-xs transition-colors p-1"
                                  >
                                    🗑️
                                  </button>
                                </div>

                    {/* 선택 경기들 - 컴팩트 */}
                    <div className="space-y-1 mb-2">
                      {slip.selections.map((sel, i) => (
                        <div key={i} className="flex items-center justify-between py-1 px-1.5 bg-gray-800/50 rounded text-xs">
                          <span className="text-gray-400 truncate max-w-[60%]">
                            #{String(sel.matchSeq).padStart(3, '0')} {sel.homeTeam} vs {sel.awayTeam}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              sel.prediction === 'home' || sel.prediction === 'over' || sel.prediction === 'odd' 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : sel.prediction === 'draw' 
                                  ? 'bg-gray-500/20 text-gray-400' 
                                  : 'bg-red-500/20 text-red-400'
                            }`}>
                              {sel.prediction === 'home' ? '승' : 
                               sel.prediction === 'draw' ? '무' : 
                               sel.prediction === 'away' ? '패' :
                               sel.prediction === 'over' ? 'O' :
                               sel.prediction === 'under' ? 'U' :
                               sel.prediction === 'odd' ? '홀' : '짝'}
                            </span>
                            <span className="text-emerald-400 font-medium">{sel.odds.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 금액 & 배당 */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-gray-700/30">
                      <span className="text-[10px] text-gray-500">
                        {new Date(slip.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-2">
                        {slip.amount > 0 && (
                          <span className="text-[10px] text-gray-400">
                            {slip.amount.toLocaleString()} → {Math.round(slip.amount * slip.totalOdds).toLocaleString()}원
                          </span>
                        )}
                        <span className="text-sm font-bold text-emerald-400">{slip.totalOdds.toFixed(2)}배</span>
                        {slip.status !== 'pending' && slip.amount > 0 && (
                          <span className={`text-xs font-bold ${slip.status === 'won' ? 'text-green-400' : 'text-red-400'}`}>
                            {slip.status === 'won' 
                              ? `+${Math.round(slip.amount * slip.totalOdds - slip.amount).toLocaleString()}` 
                              : `-${slip.amount.toLocaleString()}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* 숨겨진 기록 알림 (무료회원) */}
                    {hiddenCount > 0 && (
                      <div 
                        onClick={() => {
                          setLimitMessage(lang === 'ko'
                            ? `최근 7일 기록만 열람 가능합니다.\n프리미엄은 전체 기록(${hiddenCount}개 더)을 확인할 수 있어요!`
                            : `Only last 7 days visible.\nUpgrade to Premium to see all ${hiddenCount} hidden records!`
                          )
                          setShowLimitModal(true)
                        }}
                        className="mt-2 p-3 bg-gray-800/50 border border-dashed border-gray-600 rounded-lg text-center cursor-pointer hover:border-emerald-500/50 transition-colors"
                      >
                        <p className="text-xs text-gray-400">
                          🔒 {lang === 'ko' ? `${hiddenCount}개의 이전 기록이 숨겨져 있습니다` : `${hiddenCount} older records hidden`}
                        </p>
                        <p className="text-[10px] text-emerald-400 mt-1">
                          {lang === 'ko' ? '프리미엄으로 전체 보기' : 'Upgrade to view all'}
                        </p>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* 빈 상태 */}
            {savedSlips.filter(slip => historyFilter === 'all' || slip.status === historyFilter).length === 0 && (
              <div className="mt-6 text-center py-8">
                <span className="text-3xl">📭</span>
                <p className="mt-2 text-sm text-gray-500">{text.noHistory}</p>
              </div>
            )}

            {/* 전체 삭제 버튼 */}
            {savedSlips.length > 0 && (
              <div className="mt-4 text-center">
                <button
                  onClick={deleteAllSlips}
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-xs transition-colors border border-red-500/30 disabled:opacity-50"
                >
                  {isLoading ? '삭제중...' : `🗑️ ${text.deleteAll}`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== 통계 탭 ==================== */}
        {activeTab === 'stats' && (
          <div className="mt-4 space-y-4">
            {slipStats ? (
              <>
                {/* 요약 카드 */}
                <div className="grid grid-cols-2 gap-3">
                  {/* 적중률 */}
                  <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/10 rounded-xl p-4 border border-emerald-500/20">
                    <p className="text-gray-400 text-xs mb-1">{text.hitRate}</p>
                    <p className="text-3xl font-bold text-emerald-400">{slipStats.hitRate}%</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {slipStats.won}승 / {slipStats.lost}패
                    </p>
                  </div>
                  
                  {/* 수익률 */}
                  <div className={`bg-gradient-to-br rounded-xl p-4 border ${
                    slipStats.totalReturn >= 0 
                      ? 'from-blue-900/30 to-blue-800/10 border-blue-500/20'
                      : 'from-red-900/30 to-red-800/10 border-red-500/20'
                  }`}>
                    <p className="text-gray-400 text-xs mb-1">{text.profitRate}</p>
                    <p className={`text-3xl font-bold ${slipStats.totalReturn >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {slipStats.totalInvested > 0 
                        ? `${slipStats.totalReturn >= 0 ? '+' : ''}${((slipStats.totalReturn / slipStats.totalInvested) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {slipStats.totalReturn >= 0 ? '+' : ''}{slipStats.totalReturn.toLocaleString()}원
                    </p>
                  </div>
                </div>

                {/* 상세 통계 */}
                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <h3 className="text-sm font-medium text-white mb-3">📊 {text.detail}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                      <span className="text-gray-400 text-xs">{text.totalSlips}</span>
                      <span className="text-white font-medium">{slipStats.totalSlips}개</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                      <span className="text-gray-400 text-xs">{text.totalInvested}</span>
                      <span className="text-white font-medium">{slipStats.totalInvested.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700/30">
                      <span className="text-gray-400 text-xs">{text.totalReturn}</span>
                      <span className={`font-medium ${slipStats.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {slipStats.totalReturn >= 0 ? '+' : ''}{slipStats.totalReturn.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-400 text-xs">{text.pending}</span>
                      <span className="text-yellow-400 font-medium">{slipStats.pending}개</span>
                    </div>
                  </div>
                </div>

                {/* 적중/실패 비율 바 */}
                {(slipStats.won + slipStats.lost) > 0 && (
                  <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                    <h3 className="text-sm font-medium text-white mb-3">🎯 적중 현황</h3>
                    <div className="relative h-6 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-full bg-emerald-500 flex items-center justify-center"
                        style={{ width: `${(slipStats.won / (slipStats.won + slipStats.lost)) * 100}%` }}
                      >
                        {slipStats.won > 0 && (
                          <span className="text-[10px] font-bold text-white">{slipStats.won}</span>
                        )}
                      </div>
                      <div 
                        className="absolute right-0 top-0 h-full bg-red-500 flex items-center justify-center"
                        style={{ width: `${(slipStats.lost / (slipStats.won + slipStats.lost)) * 100}%` }}
                      >
                        {slipStats.lost > 0 && (
                          <span className="text-[10px] font-bold text-white">{slipStats.lost}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-emerald-400">✓ {text.won} {slipStats.won}</span>
                      <span className="text-red-400">✗ {text.lost} {slipStats.lost}</span>
                    </div>
                  </div>
                )}

                {/* 타입별 적중률 */}
                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <h3 className="text-sm font-medium text-white mb-3">📋 타입별 적중률</h3>
                  {(slipStats.won + slipStats.lost) > 0 ? (
                    <div className="space-y-2">
                      {(() => {
                        // 타입별 통계 계산
                        const typeStats: { [key: string]: { won: number; lost: number } } = {}
                        savedSlips.filter(s => s.status !== 'pending').forEach(slip => {
                          slip.selections.forEach(sel => {
                            // 경기 타입 추출 (matchType이 없으면 prediction으로 추정)
                            let type = '승무패'
                            if (sel.prediction === 'over' || sel.prediction === 'under') type = '언더오버'
                            else if (sel.prediction === 'odd' || sel.prediction === 'even') type = '홀짝'
                            else if (sel.prediction === 'home' || sel.prediction === 'draw' || sel.prediction === 'away') type = '승무패'
                            
                            if (!typeStats[type]) typeStats[type] = { won: 0, lost: 0 }
                          })
                          // 슬립 단위로 승패 카운트
                          const mainType = slip.selections[0]?.prediction
                          let type = '승무패'
                          if (mainType === 'over' || mainType === 'under') type = '언더오버'
                          else if (mainType === 'odd' || mainType === 'even') type = '홀짝'
                          
                          if (!typeStats[type]) typeStats[type] = { won: 0, lost: 0 }
                          if (slip.status === 'won') typeStats[type].won++
                          else if (slip.status === 'lost') typeStats[type].lost++
                        })
                        
                        return Object.entries(typeStats).map(([type, stats]) => {
                          const total = stats.won + stats.lost
                          const rate = total > 0 ? Math.round((stats.won / total) * 100) : 0
                          return (
                            <div key={type} className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-16">{type}</span>
                              <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${rate >= 60 ? 'bg-emerald-500' : rate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold w-12 text-right ${rate >= 60 ? 'text-emerald-400' : rate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {rate}%
                              </span>
                              <span className="text-[10px] text-gray-500 w-12">
                                {stats.won}/{total}
                              </span>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-xs">
                      아직 결과가 나온 조합이 없습니다
                    </div>
                  )}
                </div>

                {/* 기간별 수익률 (최근 7일) */}
                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <h3 className="text-sm font-medium text-white mb-3">📈 최근 7일 수익률</h3>
                  {savedSlips.filter(s => s.status !== 'pending' && s.amount > 0).length > 0 ? (
                    <>
                      <div className="space-y-1">
                        {(() => {
                          // 최근 7일 데이터 계산
                          const days: { [key: string]: { invested: number; returned: number } } = {}
                          const today = new Date()
                          
                          // 7일간 날짜 초기화
                          for (let i = 6; i >= 0; i--) {
                            const d = new Date(today)
                            d.setDate(d.getDate() - i)
                            const key = d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
                            days[key] = { invested: 0, returned: 0 }
                          }
                          
                          // 슬립 데이터 집계
                          savedSlips.filter(s => s.status !== 'pending' && s.amount > 0).forEach(slip => {
                            const d = new Date(slip.createdAt)
                            const key = d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
                            if (days[key]) {
                              days[key].invested += slip.amount
                              if (slip.status === 'won') {
                                days[key].returned += Math.round(slip.amount * slip.totalOdds) - slip.amount
                              } else {
                                days[key].returned -= slip.amount
                              }
                            }
                          })
                          
                          const entries = Object.entries(days)
                          const maxReturn = Math.max(...entries.map(([, v]) => Math.abs(v.returned)), 1)
                          
                          return (
                            <div className="flex items-end justify-between gap-1 h-24">
                              {entries.map(([date, data]) => {
                                const height = data.invested > 0 ? Math.abs(data.returned) / maxReturn * 100 : 0
                                const isPositive = data.returned >= 0
                                return (
                                  <div key={date} className="flex-1 flex flex-col items-center">
                                    <div className="relative w-full h-16 flex items-end justify-center">
                                      {data.invested > 0 && (
                                        <div 
                                          className={`w-full max-w-[20px] rounded-t ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
                                          style={{ height: `${Math.max(height, 10)}%` }}
                                        />
                                      )}
                                    </div>
                                    <span className="text-[8px] text-gray-500 mt-1">{date.split('.')[1]}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </div>
                      <div className="flex justify-center gap-4 mt-2 text-[10px]">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded"></span>
                        <span className="text-gray-400">수익</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded"></span>
                        <span className="text-gray-400">손실</span>
                      </span>
                    </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-xs">
                      아직 결과가 나온 조합이 없습니다
                    </div>
                  )}
                </div>

                {/* 누적 ROI 추이 */}
                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <h3 className="text-sm font-medium text-white mb-3">💹 누적 ROI 추이</h3>
                  {savedSlips.filter(s => s.status !== 'pending' && s.amount > 0).length >= 3 ? (
                    <div className="h-20 relative">
                      {(() => {
                        // 시간순 정렬
                        const sorted = savedSlips
                          .filter(s => s.status !== 'pending' && s.amount > 0)
                          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                        
                        // 누적 계산
                        let totalInvested = 0
                        let totalReturn = 0
                        const points = sorted.map((slip, i) => {
                          totalInvested += slip.amount
                          if (slip.status === 'won') {
                            totalReturn += Math.round(slip.amount * slip.totalOdds) - slip.amount
                          } else {
                            totalReturn -= slip.amount
                          }
                          return {
                            index: i,
                            roi: totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0
                          }
                        })
                        
                        const maxRoi = Math.max(...points.map(p => Math.abs(p.roi)), 10)
                        const midY = 50 // 0% 라인
                        
                        // SVG 경로 생성
                        const pathPoints = points.map((p, i) => {
                          const x = (i / Math.max(points.length - 1, 1)) * 100
                          const y = midY - (p.roi / maxRoi) * 40
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                        }).join(' ')
                        
                        const lastRoi = points[points.length - 1]?.roi || 0
                        
                        return (
                          <>
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                              {/* 0% 기준선 */}
                              <line x1="0" y1="50" x2="100" y2="50" stroke="#374151" strokeWidth="0.5" strokeDasharray="2,2" />
                              {/* ROI 라인 */}
                              <path 
                                d={pathPoints} 
                                fill="none" 
                                stroke={lastRoi >= 0 ? '#10b981' : '#ef4444'} 
                                strokeWidth="2"
                                vectorEffect="non-scaling-stroke"
                              />
                            </svg>
                            <div className="absolute top-0 right-0 text-xs">
                              <span className={`font-bold ${lastRoi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {lastRoi >= 0 ? '+' : ''}{lastRoi.toFixed(1)}%
                              </span>
                            </div>
                            <div className="absolute bottom-0 left-0 text-[10px] text-gray-500">
                              {sorted.length}게임
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-xs">
                      {savedSlips.filter(s => s.status !== 'pending' && s.amount > 0).length > 0
                        ? '3개 이상의 결과가 필요합니다'
                        : '아직 결과가 나온 조합이 없습니다'
                      }
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-2">📊</p>
                <p className="text-sm">아직 통계 데이터가 없습니다</p>
                <p className="text-xs mt-1">조합을 저장하면 통계가 표시됩니다</p>
              </div>
            )}
          </div>
        )}

        {/* 면책 문구 & 유형 안내 - 컴팩트 */}
        <footer className="mt-4 mb-4 px-2">
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-3 space-y-2">
            <div className="flex items-start gap-1.5">
              <span className="text-yellow-500 text-[10px] mt-0.5">※</span>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                본 서비스는 배당률 계산을 위한 참고용 도구입니다. 
                실제 배당률 및 결과는 
                <span className="text-emerald-400 font-medium"> 스포츠토토</span>에서 확인하세요.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-gray-500">유형:</span>
              <span className="text-[10px] text-purple-400">H</span>
              <span className="text-[10px] text-gray-600">핸디</span>
              <span className="text-[10px] text-orange-400">U/O</span>
              <span className="text-[10px] text-gray-600">언오버</span>
              <span className="text-[10px] text-pink-400">O/E</span>
              <span className="text-[10px] text-gray-600">홀짝</span>
              <span className="text-[10px] text-cyan-400">5P</span>
              <span className="text-[10px] text-gray-600">승5패</span>
            </div>
          </div>
        </footer>
      </main>

      {/* 하단 고정 - 선택된 경기 패널 (계산기 탭 + 모바일 네비 위로) */}
      {activeTab === 'calculator' && selections.length > 0 && (
        <div className="fixed bottom-20 md:bottom-0 left-0 right-0 z-40" style={{ backgroundColor: '#09090b' }}>
          <div className="border-t-2 border-emerald-500/50 shadow-[0_-10px_40px_rgba(0,0,0,0.9)]">
            <div className="max-w-4xl mx-auto px-3 py-2" style={{ backgroundColor: '#09090b' }}>
            {/* 요약 바 - 컴팩트 */}
            <div 
              onClick={() => setShowSlipPanel(!showSlipPanel)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">{selections.length}</span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">{text.selected}</p>
                  <p className="text-sm font-bold text-white">{totalOdds.toFixed(2)}배</p>
                </div>
              </div>

              {/* 금액 입력 + 예상 수익 */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 bg-transparent text-white text-xs text-right focus:outline-none"
                    placeholder="10000"
                  />
                  <span className="text-[10px] text-gray-500">원</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500">{text.expectedReturn}</p>
                  <p className="text-xs font-bold text-emerald-400">
                    {Math.round(betAmount * totalOdds).toLocaleString()}원
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelections([]); setShowSlipPanel(false) }}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors"
                >
                  {text.reset}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); saveSlip() }}
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? '저장중...' : text.save}
                </button>
              </div>
            </div>

            {/* 확장 패널 */}
            {showSlipPanel && (
              <div className="mt-2 pt-2 border-t border-gray-800" style={{ backgroundColor: '#09090b' }}>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {selections.map((sel) => (
                    <div 
                      key={sel.matchSeq}
                      className="flex items-center justify-between py-1.5 px-2 bg-gray-800 rounded text-xs"
                    >
                      <span className="text-gray-400 truncate max-w-[55%]">
                        #{String(sel.matchSeq).padStart(3, '0')} {sel.homeTeam} vs {sel.awayTeam}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          sel.prediction === 'home' || sel.prediction === 'over' || sel.prediction === 'odd'
                            ? 'bg-blue-500/20 text-blue-400' :
                          sel.prediction === 'draw' ? 'bg-gray-500/20 text-gray-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {sel.prediction === 'home' ? '승' : 
                           sel.prediction === 'draw' ? '무' : 
                           sel.prediction === 'away' ? '패' :
                           sel.prediction === 'over' ? 'O' :
                           sel.prediction === 'under' ? 'U' :
                           sel.prediction === 'odd' ? '홀' : '짝'}
                        </span>
                        <span className="text-emerald-400 font-bold">{sel.odds.toFixed(2)}</span>
                        <button
                          onClick={() => setSelections(selections.filter(s => s.matchSeq !== sel.matchSeq))}
                          className="text-gray-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* 💰 금액 입력 & 예상 수익 */}
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 mb-1 block">{text.betAmount}</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={betAmount}
                          onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs text-right focus:outline-none focus:border-emerald-500"
                          min="0"
                          step="1000"
                        />
                        <span className="text-gray-400 text-xs">원</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 mb-1 block">{text.expectedReturn}</label>
                      <div className="bg-gray-800 rounded-lg px-2 py-1.5 text-right">
                        <span className="text-emerald-400 text-xs font-bold">
                          {Math.floor(betAmount * totalOdds).toLocaleString()}원
                        </span>
                        <span className="text-emerald-400/60 text-[10px] ml-1">
                          (+{Math.floor(betAmount * totalOdds - betAmount).toLocaleString()})
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* 빠른 금액 버튼 */}
                  <div className="flex gap-1 mt-2">
                    {[5000, 10000, 30000, 50000, 100000].map(amt => (
                      <button
                        key={amt}
                        onClick={(e) => { e.stopPropagation(); setBetAmount(amt) }}
                        className={`flex-1 py-1 rounded text-[10px] transition-colors ${
                          betAmount === amt 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {amt >= 10000 ? `${amt/10000}만` : `${amt/1000}천`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}