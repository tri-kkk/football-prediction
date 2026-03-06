'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  matchType: string
  handicapValue?: number | null
  totalValue?: number | null
  homeOdds: number | null
  drawOdds: number | null
  awayOdds: number | null
  resultCode: string | null
  round?: string
}

interface ProtoData {
  [round: string]: ProtoMatch[]
}

interface Selection {
  matchSeq: number
  homeTeam: string
  awayTeam: string
  matchType: string
  prediction: 'home' | 'draw' | 'away' | 'over' | 'under' | 'odd' | 'even'
  odds: number
  handicapValue?: number | null
  totalValue?: number | null
}

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

interface SlipStats {
  totalSlips: number
  pending: number
  won: number
  lost: number
  totalInvested: number
  totalReturn: number
  hitRate: number
  totalDeleted?: number  // 삭제된 내역 수
  lastUpdated?: string   // 마지막 업데이트 시간
}

// 스포츠 필터 (컴포넌트 외부)
const SPORT_FILTERS_CONFIG = [
  { key: 'ALL', label: '전체', icon: '🏆', leagues: null as string[] | null },
  { key: 'SOCCER', label: '축구', icon: '⚽', leagues: ['UCL', 'UEL', 'EPL', 'PL', 'U23아컵', '에레디비', 'EFL챔', 'EFL', '라리가', '분데스리', '세리에', '리그', '프리그', 'A리그', 'J1백년', 'J2J3백년', 'J백년', '이탈FA컵', '스페FA컵', '스페FA', '독일FA컵', '잉글FA컵', '프랑FA컵', '네덜FA컵', 'ACLE', 'ACL2'] },
  { key: 'BASKETBALL', label: '농구', icon: '🏀', leagues: ['KBL', 'WKBL', 'NBA', 'EASL', '남농'] },
  { key: 'VOLLEYBALL', label: '배구', icon: '🏐', leagues: ['KOVO'] },
  { key: 'BASEBALL', label: '야구', icon: '⚾', leagues: ['WBC', 'KBO', 'MLB', 'NPB', 'CPBL', 'KBO', '한국시리즈', '올스타'] },
]

// 유형 필터 (컴포넌트 외부)
const TYPE_FILTERS_CONFIG = [
  { key: 'ALL', short: 'ALL' },
  { key: '승패', short: '1X2' },
  { key: '핸디캡', short: 'H' },
  { key: '언더오버', short: 'U/O' },
  { key: '홀짝', short: 'O/E' },
  { key: '승5패', short: '5P' },
]

export default function ProtoPage() {
  const { data: session, status } = useSession()
  const [matches, setMatches] = useState<ProtoMatch[]>([])
  const [selections, setSelections] = useState<Selection[]>([])
  const [savedSlips, setSavedSlips] = useState<SavedSlip[]>([])
  const [availableRounds, setAvailableRounds] = useState<string[]>([])
  const [currentRound, setCurrentRound] = useState('')
  const [sportFilter, setSportFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [showSlipPanel, setShowSlipPanel] = useState(false)
  const [activeTab, setActiveTab] = useState<'calculator' | 'history' | 'stats'>('calculator')
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')
  
  // 필터 상태
  const [dateFilter, setDateFilter] = useState<string>('ALL')
  const [leagueFilter, setLeagueFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  
  // 스크롤 refs
  const dateRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const matchRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const mainContentRef = useRef<HTMLDivElement>(null)
  const hasScrolledRef = useRef(false)
  
  const userTier = (session?.user as any)?.tier || 'free'
  const isLoggedIn = status === 'authenticated'
  const isLoading_auth = status === 'loading'
  
  const LIMITS = {
    free: { slipsPerRound: 5, historyDays: 7 },
    premium: { slipsPerRound: Infinity, historyDays: Infinity }
  }

  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [betAmount, setBetAmount] = useState<number>(10000)
  const [slipStats, setSlipStats] = useState<SlipStats | null>(null)
  
  // ✅ 페이지네이션 상태
  const [historyPage, setHistoryPage] = useState(1)
  const [expandedSlips, setExpandedSlips] = useState<Set<string>>(new Set())
  const HISTORY_PAGE_SIZE = 10

  // KST 기준 현재 시간
  const getKSTNow = useCallback(() => {
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
    return new Date(utcTime + kstOffset)
  }, [])

  // 경기 시간을 KST 타임스탬프로 변환
  const getMatchTimeKST = useCallback((match: ProtoMatch) => {
    try {
      if (match.koreanDate && match.koreanTime) {
        const dateMatch = match.koreanDate.match(/(\d+)\/(\d+)/)
        const timeMatch = match.koreanTime.match(/(\d+):(\d+)/)
        
        if (dateMatch && timeMatch) {
          const month = parseInt(dateMatch[1])
          const day = parseInt(dateMatch[2])
          const hour = parseInt(timeMatch[1])
          const minute = parseInt(timeMatch[2])
          const currentYear = new Date().getFullYear()
          const kstDate = new Date(currentYear, month - 1, day, hour, minute, 0)
          return kstDate.getTime()
        }
      }
      return new Date(match.gameDate).getTime()
    } catch {
      return Infinity
    }
  }, [])

  // 가장 빠른 미래 경기 찾기
  const findNextMatch = useCallback(() => {
    if (matches.length === 0) return null
    
    const kstNow = getKSTNow().getTime()
    
    const upcomingMatches = matches.filter(match => {
      const matchTime = getMatchTimeKST(match)
      return matchTime > kstNow
    }).sort((a, b) => {
      return getMatchTimeKST(a) - getMatchTimeKST(b)
    })

    return upcomingMatches.length > 0 ? upcomingMatches[0] : null
  }, [matches, getKSTNow, getMatchTimeKST])

  // 다음 경기로 스크롤
  const scrollToNextMatch = useCallback(() => {
    const nextMatch = findNextMatch()
    
    if (nextMatch) {
      // 필터 패널 닫기
      setShowFilters(false)
      
      setTimeout(() => {
        const element = matchRefs.current[nextMatch.matchSeq] || dateRefs.current[nextMatch.koreanDate]
        if (element) {
          const headerHeight = 200 // 메인헤더(48px) + 프로토헤더(~117px)
          const elementPosition = element.getBoundingClientRect().top + window.scrollY
          const offsetPosition = elementPosition - headerHeight - 10
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          })
        }
      }, 200)
    }
  }, [findNextMatch])
  
  const changeTab = (tab: 'calculator' | 'history' | 'stats') => {
    setActiveTab(tab)
    setHistoryPage(1) // ✅ 탭 전환 시 페이지 초기화
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  const changeSportFilter = (filter: string) => {
    setSportFilter(filter)
    setLeagueFilter('ALL')
  }
  
  const changeTypeFilter = (filter: string) => {
    setTypeFilter(filter)
  }
  
  const changeDateFilter = (date: string) => {
    setDateFilter(date)
    // 날짜 선택 시 필터 패널 닫기 (겹침 방지)
    setShowFilters(false)
    
    if (date !== 'ALL' && dateRefs.current[date]) {
      // 패널이 닫힌 후 스크롤 (DOM 업데이트 대기)
      setTimeout(() => {
        const element = dateRefs.current[date]
        if (element) {
          const headerHeight = 200 // 메인헤더(48px) + 프로토헤더(~117px)
          const elementPosition = element.getBoundingClientRect().top + window.scrollY
          const offsetPosition = elementPosition - headerHeight
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          })
        }
      }, 200)
    }
  }

  // ✅ 통계 조회 (DB에서)
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/proto/stats')
      const json = await res.json()
      if (json.success && json.data) {
        setSlipStats(json.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchSlips = async () => {
    try {
      const res = await fetch('/api/proto/slips')
      const json = await res.json()
      if (json.success) {
        setSavedSlips(json.data)
        // ✅ 통계는 별도로 조회
        await fetchStats()
      }
    } catch (error) {
      console.error('Failed to fetch slips:', error)
    }
  }

  const fetchMatches = async (round?: string) => {
    try {
      const url = round 
        ? `/api/proto/matches?round=${round}`
        : '/api/proto/matches'
      const res = await fetch(url)
      const json = await res.json()
      
      if (json.success) {
        if (round && Array.isArray(json.data)) {
          setMatches(json.data)
        }
        
        const rounds = (json.rounds || json.data?.rounds || [])
          .sort((a: string, b: string) => parseInt(b) - parseInt(a))
        if (rounds.length > 0) {
          setAvailableRounds(rounds)
          if (!currentRound) {
            // API에서 진행중인 회차를 알려줌
            const active = json.activeRound
            if (active && rounds.includes(active)) {
              setCurrentRound(active)
            } else {
              setCurrentRound(rounds[0])
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error)
    }
  }

  useEffect(() => {
    fetchSlips()
    fetchMatches()
  }, [])

  useEffect(() => {
    if (currentRound) {
      fetchMatches(currentRound)
      setSelections([])
      hasScrolledRef.current = false
    }
  }, [currentRound])

  useEffect(() => {
    if (matches.length > 0 && !hasScrolledRef.current && activeTab === 'calculator') {
      hasScrolledRef.current = true
      setTimeout(() => {
        scrollToNextMatch()
      }, 300)
    }
  }, [matches, activeTab, scrollToNextMatch])

  // 사용 가능한 날짜 목록
  const availableDates = useMemo(() => {
    const dates = [...new Set(matches.map(m => m.koreanDate))]
    return dates.sort((a, b) => {
      const getDateNum = (d: string) => {
        const match = d.match(/(\d+)\/(\d+)/)
        if (match) {
          return parseInt(match[1]) * 100 + parseInt(match[2])
        }
        return 0
      }
      return getDateNum(a) - getDateNum(b)
    })
  }, [matches])

  // 사용 가능한 리그 목록
  const availableLeagues = useMemo(() => {
    let filteredByType = matches
    if (sportFilter !== 'ALL') {
      const filter = SPORT_FILTERS_CONFIG.find(f => f.key === sportFilter)
      if (filter?.leagues) {
        filteredByType = matches.filter(m => 
          filter.leagues?.some(l => m.leagueName.includes(l))
        )
      }
    }
    const leagues = [...new Set(filteredByType.map(m => m.leagueName))]
    return leagues.sort()
  }, [matches, sportFilter])

  const getMatchKey = (homeTeam: string, awayTeam: string) => {
    return `${homeTeam.toLowerCase()}-${awayTeam.toLowerCase()}`
  }

  const isMatchAlreadySelected = (match: ProtoMatch) => {
    const matchKey = getMatchKey(match.homeTeam, match.awayTeam)
    return selections.some(s => {
      const selKey = getMatchKey(s.homeTeam, s.awayTeam)
      return selKey === matchKey && s.matchSeq !== match.matchSeq
    })
  }

  const toggleSelection = (
    match: ProtoMatch, 
    prediction: 'home' | 'draw' | 'away' | 'over' | 'under' | 'odd' | 'even'
  ) => {
    if (isMatchAlreadySelected(match)) {
      alert('같은 경기에서는 하나의 유형만 선택할 수 있습니다.')
      return
    }

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

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1)

  const saveSlip = async () => {
    if (selections.length === 0) return
    
    if (userTier === 'free') {
      const roundSlips = savedSlips.filter(s => s.round === currentRound)
      if (roundSlips.length >= LIMITS.free.slipsPerRound) {
        setLimitMessage(`이번 회차 저장 한도(${LIMITS.free.slipsPerRound}개)를 초과했습니다.\n프리미엄으로 업그레이드하면 무제한 저장!`)
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
        fetchSlips()
      }
    } catch (error) {
      console.error('Failed to save slip:', error)
      alert('저장 실패')
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ 내역만 삭제 (통계 유지)
  const deleteSlip = async (id: string) => {
    if (!confirm('이 조합을 삭제하시겠습니까?\n※ 통계는 유지됩니다.')) return
    
    try {
      const res = await fetch(`/api/proto/slips?id=${id}`, {
        method: 'DELETE'
      })
      
      const json = await res.json()
      if (json.success) {
        setSavedSlips(prev => prev.filter(s => s.id !== id))
        // ✅ 통계는 그대로 유지됨 (DB 트리거가 자동 처리)
      }
    } catch (error) {
      console.error('Failed to delete slip:', error)
    }
  }

  // ✅ 내역만 전체 삭제 (통계 유지)
  const deleteAllSlips = async () => {
    if (!confirm('모든 내역을 삭제하시겠습니까?\n※ 통계는 유지됩니다.')) return
    
    setIsLoading(true)
    try {
      const res = await fetch('/api/proto/slips?all=true', {
        method: 'DELETE'
      })
      
      const json = await res.json()
      if (json.success) {
        setSavedSlips([])
        // ✅ 통계는 그대로 유지됨 (DB 트리거가 자동 처리)
      }
    } catch (error) {
      console.error('Failed to delete all slips:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ 통계 포함 전체 초기화
  const resetAllData = async () => {
    if (!confirm('⚠️ 내역과 통계를 모두 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return
    
    setIsLoading(true)
    try {
      const res = await fetch('/api/proto/stats', {
        method: 'DELETE'
      })
      
      const json = await res.json()
      if (json.success) {
        setSavedSlips([])
        setSlipStats(null)
        alert('모든 데이터가 초기화되었습니다')
      }
    } catch (error) {
      console.error('Failed to reset all data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ 접기/펼치기 토글
  const toggleSlipExpand = (id: string) => {
    setExpandedSlips(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 필터링
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      if (sportFilter !== 'ALL') {
        const filter = SPORT_FILTERS_CONFIG.find(f => f.key === sportFilter)
        if (filter?.leagues && !filter.leagues.some(l => match.leagueName.includes(l))) {
          return false
        }
      }
      if (typeFilter !== 'ALL') {
        if (typeFilter === '언더오버') {
          if (match.matchType !== '언더오버') return false
        } else if (typeFilter === '홀짝') {
          if (match.matchType !== '홀짝' && match.matchType !== 'SUM') return false
        } else if (match.matchType !== typeFilter) {
          return false
        }
      }
      if (dateFilter !== 'ALL' && match.koreanDate !== dateFilter) {
        return false
      }
      if (leagueFilter !== 'ALL' && match.leagueName !== leagueFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const homeTeam = match.homeTeam.toLowerCase()
        const awayTeam = match.awayTeam.toLowerCase()
        if (!homeTeam.includes(query) && !awayTeam.includes(query)) {
          return false
        }
      }
      return true
    })
  }, [matches, sportFilter, typeFilter, dateFilter, leagueFilter, searchQuery])

  // 날짜별 그룹화
  const groupedMatches = useMemo(() => {
    return filteredMatches.reduce((acc, match) => {
      const date = match.koreanDate
      if (!acc[date]) acc[date] = []
      acc[date].push(match)
      return acc
    }, {} as Record<string, ProtoMatch[]>)
  }, [filteredMatches])

  // ✅ 페이지네이션된 내역
  const filteredHistory = useMemo(() => {
    let filtered = savedSlips
    if (historyFilter !== 'all') {
      filtered = filtered.filter(s => s.status === historyFilter)
    }
    return filtered
  }, [savedSlips, historyFilter])

  const paginatedHistory = useMemo(() => {
    const startIndex = (historyPage - 1) * HISTORY_PAGE_SIZE
    const endIndex = startIndex + HISTORY_PAGE_SIZE
    return filteredHistory.slice(startIndex, endIndex)
  }, [filteredHistory, historyPage])

  const totalHistoryPages = Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE)
  const hasMoreHistory = historyPage < totalHistoryPages

  // ✅ 필터별 카운트
  const historyCounts = useMemo(() => {
    return {
      all: savedSlips.length,
      pending: savedSlips.filter(s => s.status === 'pending').length,
      won: savedSlips.filter(s => s.status === 'won').length,
      lost: savedSlips.filter(s => s.status === 'lost').length
    }
  }, [savedSlips])

  const clearAllFilters = () => {
    setDateFilter('ALL')
    setLeagueFilter('ALL')
    setSearchQuery('')
    setSportFilter('ALL')
    setTypeFilter('ALL')
    setShowFilters(false)  // 패널 닫기
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (dateFilter !== 'ALL') count++
    if (leagueFilter !== 'ALL') count++
    if (searchQuery.trim()) count++
    return count
  }, [dateFilter, leagueFilter, searchQuery])

  const getLeagueIcon = (league: string) => {
    if (['UCL', 'UEL', 'EPL', 'PL', '라리가', '분데스리', '세리에', '리그', '프리그', 'EFL', 'U23아컵', 'A리그', 'J1백년', 'J2J3백년', 'J백년', '에레디비', '이탈FA컵', '스페FA컵', '스페FA', '독일FA컵', '잉글FA컵', '프랑FA컵', '네덜FA컵', 'ACLE', 'ACL2'].some(l => league.includes(l))) return '⚽'
    if (['KBL', 'WKBL', 'NBA', 'EASL', '남농'].some(l => league.includes(l))) return '🏀'
    if (league.includes('KOVO')) return '🏐'
    if (['WBC', 'KBO', 'MLB', 'NPB', 'CPBL'].some(l => league.includes(l))) return '⚾'
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
          <h1 className="text-xl font-bold text-white mb-2">로그인이 필요합니다</h1>
          <p className="text-sm text-gray-400 mb-6">
            프로토 계산기를 사용하려면 로그인해 주세요.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* 제한 모달 */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full border border-gray-700">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">저장 한도 초과</h3>
              <p className="text-sm text-gray-400 whitespace-pre-line mb-6">{limitMessage}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm transition-colors"
                >
                  닫기
                </button>
                <Link
                  href="/pricing"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors text-center"
                >
                  프리미엄 보기
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 - 완전 고정, 불투명 배경 */}
      <header className="fixed top-[70px] md:top-[73px] left-0 right-0 z-50 bg-gray-950 shadow-lg shadow-black/50">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-1.5 md:py-2 space-y-1.5 md:space-y-2">
          {/* 상단: 타이틀 + 탭 */}
          <div className="flex items-center justify-between">
            {/* 타이틀 */}
            <div className="flex items-center gap-2">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                프로토 계산기
              </h1>
            </div>

            {/* 탭 버튼 */}
            <div className="flex gap-1">
              <button
                onClick={() => changeTab('calculator')}
                className={`py-1 px-2.5 md:py-1.5 md:px-4 rounded-lg text-[11px] md:text-sm font-medium transition-all ${
                  activeTab === 'calculator'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                🧮 계산기
              </button>
              <button
                onClick={() => changeTab('history')}
                className={`py-1 px-2.5 md:py-1.5 md:px-4 rounded-lg text-[11px] md:text-sm font-medium transition-all relative ${
                  activeTab === 'history'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                📜 기록
                {(() => {
                  const pendingCount = savedSlips.filter(s => s.status === 'pending').length
                  return pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 rounded-full text-[9px] md:text-[10px] flex items-center justify-center">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )
                })()}
              </button>
              <button
                onClick={() => changeTab('stats')}
                className={`py-1 px-2.5 md:py-1.5 md:px-4 rounded-lg text-[11px] md:text-sm font-medium transition-all ${
                  activeTab === 'stats'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                📊 통계
              </button>
            </div>
          </div>

          {/* 계산기 탭 필터 */}
          {activeTab === 'calculator' && (
            <>
              {/* 필터 바 */}
              <div className="flex items-center gap-1.5 md:gap-2">
                {/* 회차 */}
                <select
                  value={currentRound}
                  onChange={(e) => setCurrentRound(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 md:px-3 md:py-1.5 text-[11px] md:text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {availableRounds.map((round) => (
                    <option key={round} value={round}>
                      {round === '0' ? '미분류' : `${round}회`}
                    </option>
                  ))}
                </select>

                {/* 검색창 */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="팀명 검색"
                    className="w-full bg-gray-800 border border-gray-700 rounded pl-7 pr-7 py-1 md:pl-9 md:pr-8 md:py-1.5 text-[11px] md:text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                  <svg className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-[10px] md:text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* 필터 토글 */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center justify-center w-7 h-7 md:w-9 md:h-9 rounded transition-all ${
                    showFilters || activeFilterCount > 0
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-800 border border-gray-700 text-gray-400'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>

                {/* 다음 경기 버튼 */}
                <button
                  onClick={scrollToNextMatch}
                  className="flex items-center justify-center w-7 h-7 md:w-9 md:h-9 bg-blue-600 hover:bg-blue-500 rounded text-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 경기 수 */}
                <span className="text-[11px] md:text-sm text-gray-400 whitespace-nowrap">
                  <span className="text-emerald-400 font-bold">{filteredMatches.length}</span>경기
                </span>
              </div>

              {/* 확장 필터 패널 */}
              {showFilters && (
                <div className="p-3 bg-gray-800/80 rounded-lg border border-gray-700/50 space-y-3">
                  {/* 날짜 필터 */}
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1.5 block">날짜</label>
                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                      <button
                        onClick={() => setDateFilter('ALL')}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-all ${
                          dateFilter === 'ALL'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        전체
                      </button>
                      {availableDates.map(date => {
                        const count = matches.filter(m => m.koreanDate === date).length
                        return (
                          <button
                            key={date}
                            onClick={() => changeDateFilter(date)}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-all ${
                              dateFilter === date
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                            }`}
                          >
                            {date} ({count})
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 리그 필터 - SELECT 방식 */}
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1.5 block">리그</label>
                    <select
                      value={leagueFilter}
                      onChange={(e) => {
                        setLeagueFilter(e.target.value)
                        setShowFilters(false)  // 선택 후 패널 닫기
                      }}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">전체 리그</option>
                      {availableLeagues.map(league => {
                        const count = matches.filter(m => m.leagueName === league).length
                        return (
                          <option key={league} value={league}>
                            {getLeagueIcon(league)} {league} ({count})
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {/* 필터 초기화 */}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="w-full py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      필터 초기화 ({activeFilterCount})
                    </button>
                  )}
                </div>
              )}

              {/* 스포츠 + 유형 필터 */}
              <div className="flex items-center gap-0.5 md:gap-1 overflow-x-auto scrollbar-hide">
                {/* 스포츠 필터 */}
                {SPORT_FILTERS_CONFIG.map(filter => {
                  const count = filter.key === 'ALL' 
                    ? matches.length 
                    : matches.filter(m => filter.leagues?.some(l => m.leagueName.includes(l))).length
                  return (
                    <button
                      key={filter.key}
                      onClick={() => changeSportFilter(filter.key)}
                      className={`flex items-center gap-0.5 md:gap-1 px-1.5 py-0.5 md:px-2.5 md:py-1 rounded text-[10px] md:text-xs font-medium whitespace-nowrap transition-all ${
                        sportFilter === filter.key
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      <span>{filter.icon}</span>
                      <span>{count}</span>
                    </button>
                  )
                })}
                
                <div className="w-px h-3.5 md:h-5 bg-gray-700 mx-0.5 md:mx-1" />
                
                {/* 유형 필터 */}
                {TYPE_FILTERS_CONFIG.map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => changeTypeFilter(filter.key)}
                    className={`px-1.5 py-0.5 md:px-2.5 md:py-1 rounded text-[10px] md:text-xs font-medium whitespace-nowrap transition-all ${
                      typeFilter === filter.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {filter.short}
                    {filter.key !== 'ALL' && (
                      <span className="ml-0.5 md:ml-1 opacity-60">
                        {filter.key === '홀짝' 
                          ? matches.filter(m => m.matchType === '홀짝' || m.matchType === 'SUM').length
                          : matches.filter(m => m.matchType === filter.key).length}
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
      <main ref={mainContentRef} className={`max-w-4xl mx-auto px-3 pb-24 ${activeTab === 'calculator' ? 'pt-[146px] md:pt-[155px]' : 'pt-[146px] md:pt-[155px]'}`}>
        {/* 계산기 탭 */}
        {activeTab === 'calculator' && (
        <>
        {filteredMatches.length === 0 ? (
          <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-8 text-center">
            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">{searchQuery ? '🔍' : '🎫'}</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {searchQuery ? '검색 결과가 없습니다' : '경기 데이터가 없습니다'}
            </h3>
            <p className="text-xs text-gray-500">
              {searchQuery 
                ? `"${searchQuery}" 검색 결과가 없습니다`
                : '관리자가 경기 데이터를 업로드하면 표시됩니다'
              }
            </p>
            {(searchQuery || activeFilterCount > 0) && (
              <button
                onClick={clearAllFilters}
                className="mt-3 px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-white transition-colors"
              >
                필터 초기화
              </button>
            )}
          </div>
        ) : (
          Object.entries(groupedMatches).map(([date, dateMatches]) => (
            <div 
              key={date} 
              ref={(el) => { dateRefs.current[date] = el }}
              className="mb-3 scroll-mt-[200px]"
            >
              {/* 날짜 헤더 */}
              <div className="flex items-center gap-2 mb-3 sticky top-[176px] md:top-[195px] z-20 bg-gray-950 py-2 md:py-2.5 -mx-3 px-3 md:-mx-4 md:px-4 border-b border-gray-800/30">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full" />
                <h2 className="text-xs md:text-sm font-bold text-white">{date}</h2>
                <span className="text-[10px] md:text-xs text-gray-500">{dateMatches.length}경기</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>

              {/* 경기 카드들 */}
              <div className="space-y-1.5">
                {dateMatches.map((match) => {
                  const selection = selections.find(s => s.matchSeq === match.matchSeq)
                  const isSelected = !!selection
                  const isFinished = match.resultCode !== null
                  const isLocked = isMatchAlreadySelected(match)
                  
                  const isStarted = (() => {
                    const matchTime = getMatchTimeKST(match)
                    const kstNow = getKSTNow().getTime()
                    return kstNow >= matchTime
                  })()
                  
                  const isDisabled = isFinished || isStarted || isLocked
                  
                  const getResultText = (code: string | null, type: string) => {
                    if (!code) return null
                    if (type === '언더오버') {
                      return code === 'over' ? '오버' : code === 'under' ? '언더' : null
                    }
                    if (type === '홀짝' || type === 'SUM') {
                      return code === 'odd' ? '홀' : code === 'even' ? '짝' : null
                    }
                    if (type === '핸디캡') {
                      return code === 'home' ? '핸디승' : code === 'draw' ? '핸디무' : code === 'away' ? '핸디패' : null
                    }
                    if (code === 'home') return '홈승'
                    if (code === 'draw') return '무'
                    if (code === 'away') return '홈패'
                    return null
                  }
                  
                  const soccerLeagues = ['UCL', 'UEL', 'EPL', 'EFL', '세리에', '라리가', '분데스리', '리그1', '프리그1', 'U23아컵', '에레디비', 'PL', 'A리그', 'J1백년', 'J2J3백년', 'J백년', '이탈FA컵', '스페FA컵', '스페FA', '독일FA컵', '잉글FA컵', '프랑FA컵', '네덜FA컵', 'ACLE', 'ACL2']
                  const isSoccerLeague = soccerLeagues.some(l => match.leagueName.includes(l))
                  
                  const getButtonLabels = (type: string) => {
                    switch (type) {
                      case '핸디캡':
                        if (isSoccerLeague) {
                          return { 
                            home: `H${match.handicapValue && match.handicapValue > 0 ? '+' : ''}${match.handicapValue || ''}`, 
                            draw: '핸디무', 
                            away: '핸디패' 
                          }
                        } else {
                          return { 
                            home: `H${match.handicapValue && match.handicapValue > 0 ? '+' : ''}${match.handicapValue || ''}`, 
                            draw: null, 
                            away: '핸디패' 
                          }
                        }
               
                        case '언더오버':
                        return { home: `U ${match.totalValue || ''}`, draw: null, away: `O ${match.totalValue || ''}` }
                      case '홀짝':
                      case 'SUM':
                        return { home: '홀', draw: null, away: '짝' }
                      case '승5패':
                        return { home: '승', draw: '무5', away: '패' }
                      default:
                        return { home: '승', draw: '무', away: '패' }
                    }
                  }
                  
                  const labels = getButtonLabels(match.matchType)
                  
                  const is2Way = (type: string) => {
                    if (type === '언더오버' || type === 'SUM' || type === '홀짝') return true
                    if (type === '핸디캡' && !isSoccerLeague) return true
                    return false
                  }
                  
                  const getPrediction = (type: string, btn: 'home' | 'draw' | 'away') => {
                    if (type === '언더오버') {
  return btn === 'home' ? 'under' : 'over'
}
                    if (type === '홀짝' || type === 'SUM') {
                      return btn === 'home' ? 'odd' : 'even'
                    }
                    return btn
                  }
                  
                  const getTypeBadgeColor = (type: string) => {
                    switch (type) {
                      case '핸디캡': return 'bg-purple-500/20 text-purple-400'
                      case '언더오버': return 'bg-orange-500/20 text-orange-400'
                      case 'SUM': return 'bg-pink-500/20 text-pink-400'
                      case '홀짝': return 'bg-pink-500/20 text-pink-400'
                      case '승5패': return 'bg-cyan-500/20 text-cyan-400'
                      default: return 'bg-gray-500/20 text-gray-400'
                    }
                  }

                  return (
                    <div
                      key={match.matchSeq}
                      ref={(el) => { matchRefs.current[match.matchSeq] = el }}
                      className={`bg-gray-800/50 rounded-lg border transition-all ${
                        isFinished
                          ? 'border-gray-600/30 opacity-60'
                          : isStarted
                            ? 'border-orange-500/30 opacity-50'
                            : isLocked
                              ? 'border-yellow-500/30 opacity-50'
                              : isSelected 
                                ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
                                : 'border-gray-700/50'
                      }`}
                    >
                      {/* 경기 정보 헤더 */}
                      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-700/30">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-gray-500">
                            #{String(match.matchSeq).padStart(3, '0')}
                          </span>
                          <span className="px-1.5 py-0.5 bg-gray-700/50 rounded text-[10px] text-gray-300">
                            {getLeagueIcon(match.leagueName)} {match.leagueName}
                          </span>
                          {match.matchType !== '승패' && (
                            <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${getTypeBadgeColor(match.matchType)}`}>
                              {match.matchType === '핸디캡' ? `H${match.handicapValue}` :
                               match.matchType === '언더오버' ? `U/O ${match.totalValue || ''}` :
                               match.matchType === 'SUM' ? 'SUM' :
                               match.matchType === '홀짝' ? 'O/E' :
                               match.matchType}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isStarted && !isFinished && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/20 text-orange-400">
                              진행중
                            </span>
                          )}
                          {isLocked && !isStarted && !isFinished && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/20 text-yellow-400">
                              🔒
                            </span>
                          )}
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

                      {/* 팀 & 배당률 */}
                      <div className="p-2.5">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          {(() => {
                            // 팀명 색상도 matchType에 따라 결과 매핑
                            const leftResults = match.matchType === '언더오버' ? ['under'] :
                                                match.matchType === 'SUM' || match.matchType === '홀짝' ? ['odd'] :
                                                ['home']
                            const rightResults = match.matchType === '언더오버' ? ['over'] :
                                                 match.matchType === 'SUM' || match.matchType === '홀짝' ? ['even'] :
                                                 ['away']
                            const leftPredictions = match.matchType === '언더오버' ? ['under'] :
                                                   match.matchType === 'SUM' || match.matchType === '홀짝' ? ['odd'] :
                                                   ['home']
                            const rightPredictions = match.matchType === '언더오버' ? ['over'] :
                                                    match.matchType === 'SUM' || match.matchType === '홀짝' ? ['even'] :
                                                    ['away']
                            return (
                              <>
                                <span className={`text-sm font-medium truncate max-w-[38%] ${
                                  isFinished && leftResults.includes(match.resultCode || '') ? 'text-blue-400' :
                                  leftPredictions.includes(selection?.prediction || '') ? 'text-emerald-400' : 
                                  isDisabled ? 'text-gray-500' : 'text-white'
                                }`}>
                                  {match.homeTeam}
                                </span>
                                <span className="text-gray-600 text-xs">vs</span>
                                <span className={`text-sm font-medium truncate max-w-[38%] ${
                                  isFinished && rightResults.includes(match.resultCode || '') ? 'text-red-400' :
                                  rightPredictions.includes(selection?.prediction || '') ? 'text-emerald-400' : 
                                  isDisabled ? 'text-gray-500' : 'text-white'
                                }`}>
                                  {match.awayTeam}
                                </span>
                              </>
                            )
                          })()}
                        </div>

                        {is2Way(match.matchType) ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            {/* 왼쪽 버튼: 승/언더/홀 */}
                            {(() => {
                              // 🔥 U/O: 왼쪽=언더(under), 오른쪽=오버(over)
                              // SUM/홀짝: 왼쪽=홀(odd), 오른쪽=짝(even)
                              // 핸디캡: 왼쪽=홈(home), 오른쪽=원정(away)
                              const leftResults = match.matchType === '언더오버' ? ['under'] :
                                                  match.matchType === 'SUM' || match.matchType === '홀짝' ? ['odd'] :
                                                  ['home']
                              const rightResults = match.matchType === '언더오버' ? ['over'] :
                                                   match.matchType === 'SUM' || match.matchType === '홀짝' ? ['even'] :
                                                   ['away']
                              const leftPredictions = match.matchType === '언더오버' ? ['under'] :
                                                     match.matchType === 'SUM' || match.matchType === '홀짝' ? ['odd'] :
                                                     ['home']
                              const rightPredictions = match.matchType === '언더오버' ? ['over'] :
                                                      match.matchType === 'SUM' || match.matchType === '홀짝' ? ['even'] :
                                                      ['away']
                              
                              return (
                                <>
                                  <button
                                    onClick={() => !isDisabled && match.homeOdds && toggleSelection(match, getPrediction(match.matchType, 'home') as any)}
                                    disabled={!match.homeOdds || isDisabled}
                                    className={`py-2 rounded-lg text-center transition-all ${
                                      isFinished && leftResults.includes(match.resultCode || '')
                                        ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                                        : isDisabled
                                          ? 'bg-gray-800/30 text-gray-500 cursor-not-allowed'
                                          : leftPredictions.includes(selection?.prediction || '')
                                            ? 'bg-emerald-600 text-white'
                                            : match.homeOdds
                                              ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                                              : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                                    }`}
                                  >
                                    <p className="text-[10px] text-gray-400">{labels.home}</p>
                                    <p className="font-bold text-base">
                                      {match.homeOdds?.toFixed(2) || '-'}
                                      {isFinished && leftResults.includes(match.resultCode || '') && ' ✓'}
                                    </p>
                                  </button>

                                  <button
                                    onClick={() => !isDisabled && match.awayOdds && toggleSelection(match, getPrediction(match.matchType, 'away') as any)}
                                    disabled={!match.awayOdds || isDisabled}
                                    className={`py-2 rounded-lg text-center transition-all ${
                                      isFinished && rightResults.includes(match.resultCode || '')
                                        ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                                        : isDisabled
                                          ? 'bg-gray-800/30 text-gray-500 cursor-not-allowed'
                                          : rightPredictions.includes(selection?.prediction || '')
                                            ? 'bg-emerald-600 text-white'
                                            : match.awayOdds
                                              ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                                              : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                                    }`}
                                  >
                                    <p className="text-[10px] text-gray-400">{labels.away}</p>
                                    <p className="font-bold text-base">
                                      {match.awayOdds?.toFixed(2) || '-'}
                                      {isFinished && rightResults.includes(match.resultCode || '') && ' ✓'}
                                    </p>
                                  </button>
                                </>
                              )
                            })()}
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5">
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

        {/* 기록 탭 */}
        {activeTab === 'history' && (
          <div className="mt-0">
            {/* ✅ 요약 카드 - 컴팩트 한 줄 */}
            {savedSlips.length > 0 && (
              <div className="mb-2 grid grid-cols-4 gap-1">
                <div className="bg-gray-800/60 rounded-lg py-1.5 px-1 text-center">
                  <p className="text-base font-bold text-white leading-tight">{historyCounts.all}</p>
                  <p className="text-[9px] text-gray-500">전체</p>
                </div>
                <div className="bg-gray-800/60 rounded-lg py-1.5 px-1 text-center">
                  <p className="text-base font-bold text-blue-400 leading-tight">{historyCounts.pending}</p>
                  <p className="text-[9px] text-gray-500">대기</p>
                </div>
                <div className="bg-gray-800/60 rounded-lg py-1.5 px-1 text-center">
                  <p className="text-base font-bold text-green-400 leading-tight">{historyCounts.won}</p>
                  <p className="text-[9px] text-gray-500">적중</p>
                </div>
                <div className="bg-gray-800/60 rounded-lg py-1.5 px-1 text-center">
                  <p className="text-base font-bold text-red-400 leading-tight">{historyCounts.lost}</p>
                  <p className="text-[9px] text-gray-500">미적중</p>
                </div>
              </div>
            )}

            {/* ✅ 필터 + 전체정리 */}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex gap-1.5 overflow-x-auto">
                {[
                  { key: 'all' as const, label: '전체', color: 'emerald' },
                  { key: 'pending' as const, label: '대기', color: 'blue' },
                  { key: 'won' as const, label: '적중', color: 'green' },
                  { key: 'lost' as const, label: '미적중', color: 'red' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => {
                      setHistoryFilter(f.key)
                      setHistoryPage(1)
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                      historyFilter === f.key
                        ? f.color === 'emerald' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : f.color === 'blue' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : f.color === 'green' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                        : 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {savedSlips.length > 0 && (
                <button
                  onClick={deleteAllSlips}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-red-600/30 border border-gray-700 hover:border-red-500/50 rounded-lg text-[11px] text-gray-400 hover:text-red-400 whitespace-nowrap transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? '삭제 중...' : '전체 정리'}
                </button>
              )}
            </div>

            {/* ✅ 내역 리스트 */}
            {paginatedHistory.length > 0 ? (
              <div className="space-y-1.5">
                {paginatedHistory.map(slip => {
                  const isExpanded = expandedSlips.has(slip.id)
                  const expectedReturn = slip.amount * slip.totalOdds
                  const profit = slip.status === 'won' ? expectedReturn - slip.amount : slip.status === 'lost' ? -slip.amount : 0

                  return (
                    <div
                      key={slip.id}
                      className="rounded-lg overflow-hidden bg-gray-800/40"
                    >
                      {/* 상태 인디케이터 바 */}
                      <div className={`h-[2px] ${
                        slip.status === 'won' ? 'bg-green-500' :
                        slip.status === 'lost' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`} />

                      {/* 헤더 */}
                      <div
                        onClick={() => toggleSlipExpand(slip.id)}
                        className="px-3 py-2.5 cursor-pointer hover:bg-gray-700/20 transition-colors"
                      >
                        {/* 1행: 회차, 상태, 날짜 */}
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono px-1.5 py-0.5 bg-gray-700/80 rounded text-gray-300">
                              {slip.round}회
                            </span>
                            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                              slip.status === 'won'
                                ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                                : slip.status === 'lost'
                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            }`}>
                              {slip.status === 'won' ? '✅ 적중' : slip.status === 'lost' ? '❌ 미적중' : '⏳ 대기'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500">
                              {new Date(slip.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </span>
                            <svg className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* 2행: 핵심 수치 - 가로 배열 */}
                        <div className="flex items-center gap-2 text-[12px]">
                          <span className="text-white font-semibold">{slip.selections.length}폴더</span>
                          <span className="text-gray-700">·</span>
                          <span className="text-emerald-400 font-bold">{slip.totalOdds.toFixed(2)}배</span>
                          <span className="text-gray-700">·</span>
                          <span className="text-gray-400">{slip.amount.toLocaleString()}원</span>
                          <span className="text-gray-600">→</span>
                          <span className={`font-bold ${
                            slip.status === 'won' ? 'text-green-400' :
                            slip.status === 'lost' ? 'text-red-400/50 line-through' :
                            'text-yellow-400'
                          }`}>
                            {expectedReturn.toLocaleString()}원
                          </span>
                          {slip.status === 'won' && (
                            <span className="text-[10px] text-green-500 font-bold">+{(expectedReturn - slip.amount).toLocaleString()}</span>
                          )}
                        </div>
                      </div>

                      {/* ✅ 상세 내역 (펼쳤을 때만) */}
                      {isExpanded && (
                        <div className="border-t border-gray-700/30 px-3 py-2 space-y-1 bg-gray-900/40">
                          {slip.selections.map((sel, idx) => (
                            <div key={idx} className="flex items-center justify-between py-1 px-2 bg-gray-800/40 rounded text-[11px]">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="text-[9px] text-gray-600 shrink-0">#{idx + 1}</span>
                                <span className="text-gray-300 truncate">{sel.homeTeam} vs {sel.awayTeam}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  sel.matchType === '승패' ? 'bg-emerald-500/15 text-emerald-400' :
                                  sel.matchType === '핸디캡' ? 'bg-purple-500/15 text-purple-400' :
                                  sel.matchType === '언더오버' ? 'bg-orange-500/15 text-orange-400' :
                                  'bg-pink-500/15 text-pink-400'
                                }`}>
                                  {sel.matchType === '승패' && (
                                    sel.prediction === 'home' ? '홈승' : 
                                    sel.prediction === 'draw' ? '무' : '원정승'
                                  )}
                                  {sel.matchType === '핸디캡' && (
                                    `${sel.prediction === 'home' ? '홈' : '원정'}(${sel.handicapValue})`
                                  )}
                                  {(sel.matchType === '홀짝' || sel.matchType === 'SUM') && (
                                    sel.prediction === 'odd' ? '홀' : '짝'
                                  )}
                                  {sel.matchType === '언더오버' && (
                                    `${sel.prediction === 'under' ? 'U' : 'O'} ${sel.totalValue}`
                                  )}
                                </span>
                                <span className="text-emerald-400 font-mono font-semibold text-[11px]">{sel.odds.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteSlip(slip.id)
                            }}
                            className="w-full mt-0.5 py-1.5 bg-gray-800/50 hover:bg-red-600/20 rounded text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* ✅ 페이지네이션 */}
                {totalHistoryPages > 1 && (
                  <div className="mt-3 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                      disabled={historyPage === 1}
                      className="px-3 py-1.5 bg-gray-800 rounded-lg text-xs text-white disabled:opacity-30 hover:bg-gray-700 transition-colors"
                    >
                      ← 이전
                    </button>
                    <span className="text-xs text-gray-400 font-mono">
                      {historyPage} / {totalHistoryPages}
                    </span>
                    <button
                      onClick={() => setHistoryPage(prev => Math.min(totalHistoryPages, prev + 1))}
                      disabled={!hasMoreHistory}
                      className="px-3 py-1.5 bg-gray-800 rounded-lg text-xs text-white disabled:opacity-30 hover:bg-gray-700 transition-colors"
                    >
                      다음 →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-3xl mb-2">📜</p>
                <p className="text-sm text-gray-400">저장된 내역이 없습니다</p>
                <p className="text-[11px] mt-1 text-gray-600">계산기에서 조합을 저장해보세요</p>
              </div>
            )}
          </div>
        )}

        {/* 통계 탭 */}
        {activeTab === 'stats' && (
          <div className="mt-0">
            {slipStats && (slipStats.totalSlips > 0 || (slipStats.totalDeleted ?? 0) > 0) ? (
              <>
                {/* ✅ 수익률 히어로 + 지표 통합 카드 */}
                <div className="bg-gray-800/40 rounded-xl p-3 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-gray-400">누적 통계</h3>
                    {slipStats.lastUpdated && (
                      <span className="text-[10px] text-gray-600">
                        {new Date(slipStats.lastUpdated).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 기준
                      </span>
                    )}
                  </div>

                  {/* 수익률 */}
                  <div className="text-center mb-3">
                    <p className={`text-3xl font-bold tracking-tight leading-none ${
                      slipStats.totalReturn >= slipStats.totalInvested ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {slipStats.totalInvested > 0 
                        ? `${((slipStats.totalReturn - slipStats.totalInvested) / slipStats.totalInvested * 100) >= 0 ? '+' : ''}${((slipStats.totalReturn - slipStats.totalInvested) / slipStats.totalInvested * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">수익률</p>
                  </div>

                  {/* 수익률 바 */}
                  <div className="mb-3">
                    <div className="h-2 bg-gray-700/80 rounded-full overflow-hidden relative">
                      <div className="absolute left-1/2 top-0 w-px h-full bg-gray-500/50 z-10" />
                      {slipStats.totalReturn >= slipStats.totalInvested ? (
                        <div 
                          className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all"
                          style={{ 
                            marginLeft: '50%',
                            width: `${Math.min(50, Math.abs((slipStats.totalReturn - slipStats.totalInvested) / Math.max(1, slipStats.totalInvested)) * 50)}%` 
                          }}
                        />
                      ) : (
                        <div 
                          className="h-full bg-gradient-to-l from-red-600 to-red-400 rounded-full transition-all"
                          style={{ 
                            marginLeft: `${50 - Math.min(50, Math.abs((slipStats.totalReturn - slipStats.totalInvested) / Math.max(1, slipStats.totalInvested)) * 50)}%`,
                            width: `${Math.min(50, Math.abs((slipStats.totalReturn - slipStats.totalInvested) / Math.max(1, slipStats.totalInvested)) * 50)}%` 
                          }}
                        />
                      )}
                    </div>
                    <div className="flex justify-between mt-0.5 text-[9px] text-gray-600">
                      <span>-100%</span>
                      <span>0%</span>
                      <span>+100%</span>
                    </div>
                  </div>

                  {/* 4개 지표 그리드 - 컴팩트 */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-gray-900/50 rounded-lg py-2 px-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] text-gray-500">총 조합</span>
                        <span className="text-base font-bold text-white leading-none">{slipStats.totalSlips}</span>
                      </div>
                      {(slipStats.totalDeleted ?? 0) > 0 && (
                        <p className="text-[9px] text-gray-600 text-right mt-0.5">삭제 {slipStats.totalDeleted}건 포함</p>
                      )}
                    </div>
                    <div className="bg-gray-900/50 rounded-lg py-2 px-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] text-gray-500">적중률</span>
                        <span className="text-base font-bold text-emerald-400 leading-none">{slipStats.hitRate.toFixed(1)}%</span>
                      </div>
                      <p className="text-[9px] text-gray-600 text-right mt-0.5">{slipStats.won}승 {slipStats.lost}패</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg py-2 px-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] text-gray-500">총 투자</span>
                        <span className="text-sm font-bold text-blue-400 leading-none">{slipStats.totalInvested.toLocaleString()}<span className="text-[9px] text-gray-600 font-normal">원</span></span>
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg py-2 px-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] text-gray-500">총 수익</span>
                        <span className={`text-sm font-bold leading-none ${slipStats.totalReturn >= slipStats.totalInvested ? 'text-green-400' : 'text-red-400'}`}>
                          {slipStats.totalReturn.toLocaleString()}<span className="text-[9px] text-gray-600 font-normal">원</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ 승패 분포 - 컴팩트 */}
                <div className="bg-gray-800/40 rounded-xl p-3 mb-2">
                  <h3 className="text-xs font-bold text-gray-400 mb-2">승패 분포</h3>
                  
                  <div className="flex items-center gap-0.5 mb-1.5">
                    {slipStats.won > 0 && (
                      <div 
                        className="h-8 bg-gradient-to-r from-green-600 to-green-500 rounded-l-lg flex items-center justify-center text-xs font-bold text-white transition-all"
                        style={{ width: `${slipStats.won / Math.max(1, slipStats.won + slipStats.lost) * 100}%`, minWidth: '36px' }}
                      >
                        {slipStats.won}
                      </div>
                    )}
                    {slipStats.lost > 0 && (
                      <div 
                        className="h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-r-lg flex items-center justify-center text-xs font-bold text-white transition-all"
                        style={{ width: `${slipStats.lost / Math.max(1, slipStats.won + slipStats.lost) * 100}%`, minWidth: '36px' }}
                      >
                        {slipStats.lost}
                      </div>
                    )}
                    {slipStats.won === 0 && slipStats.lost === 0 && (
                      <div className="h-8 bg-gray-700 rounded-lg w-full flex items-center justify-center text-[11px] text-gray-500">
                        결과 대기 중
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between text-[11px]">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-green-500" />
                      <span className="text-gray-400">적중 {slipStats.won}건</span>
                      <span className="text-green-400 font-semibold">
                        ({(slipStats.won + slipStats.lost > 0 ? (slipStats.won / (slipStats.won + slipStats.lost) * 100) : 0).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-red-500" />
                      <span className="text-gray-400">실패 {slipStats.lost}건</span>
                      <span className="text-red-400 font-semibold">
                        ({(slipStats.won + slipStats.lost > 0 ? (slipStats.lost / (slipStats.won + slipStats.lost) * 100) : 0).toFixed(0)}%)
                      </span>
                    </div>
                  </div>

                  {slipStats.pending > 0 && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px]">
                      <span className="w-2 h-2 rounded-sm bg-blue-500" />
                      <span className="text-gray-400">대기 {slipStats.pending}건</span>
                    </div>
                  )}
                </div>

                {/* ✅ 전체 초기화 */}
                <div className="mt-3">
                  <button
                    onClick={resetAllData}
                    className="w-full py-2.5 bg-red-600/10 hover:bg-red-600/25 border border-red-500/30 hover:border-red-500/50 rounded-xl text-xs text-red-400/80 hover:text-red-400 transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? '초기화 중...' : '⚠️ 내역 + 통계 전체 초기화'}
                  </button>
                  <p className="text-[9px] text-gray-600 text-center mt-1.5">
                    ※ 내역만 정리하려면 &quot;기록&quot; 탭에서 &quot;전체 정리&quot; 사용
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-3xl mb-2">📊</p>
                <p className="text-sm text-gray-400">아직 통계 데이터가 없습니다</p>
                <p className="text-[11px] mt-1 text-gray-600">조합을 저장하면 통계가 표시됩니다</p>
              </div>
            )}
          </div>
        )}

        {/* 면책 문구 */}
        <footer className="mt-4 mb-4">
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-3 space-y-2">
            <div className="flex items-start gap-1.5">
              <span className="text-yellow-500 text-[10px] mt-0.5">※</span>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                본 서비스는 배당률 계산을 위한 참고용 도구입니다. 
                실제 배당률 및 결과는 
                <span className="text-emerald-400 font-medium"> 스포츠토토</span>에서 확인하세요.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
              <span className="text-gray-500">유형:</span>
              <span className="text-purple-400">H</span><span className="text-gray-600">핸디</span>
              <span className="text-orange-400">U/O</span><span className="text-gray-600">언오버</span>
              <span className="text-pink-400">O/E</span><span className="text-gray-600">홀짝</span>
              <span className="text-cyan-400">5P</span><span className="text-gray-600">승5패</span>
            </div>
          </div>
        </footer>
      </main>

      {/* 하단 고정 패널 */}
      {activeTab === 'calculator' && selections.length > 0 && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-[#09090b]">
          <div className="border-t-2 border-emerald-500/50 shadow-[0_-8px_30px_rgba(0,0,0,0.9)]">
            <div className="max-w-4xl mx-auto px-3 py-2 bg-[#09090b]">
            <div 
              onClick={() => setShowSlipPanel(!showSlipPanel)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">{selections.length}</span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">선택</p>
                  <p className="text-sm font-bold text-white">{totalOdds.toFixed(2)}배</p>
                </div>
              </div>

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
                  <p className="text-[10px] text-gray-500">예상 수익</p>
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
                  초기화
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); saveSlip() }}
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? '저장중...' : '저장'}
                </button>
              </div>
            </div>

            {showSlipPanel && (
              <div className="mt-2 pt-2 border-t border-gray-800 bg-[#09090b]">
                <div className="space-y-1 max-h-36 overflow-y-auto">
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
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}