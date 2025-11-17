'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

// 결과 인터페이스
interface MatchResult {
  id: number
  league: string
  homeTeam: string
  awayTeam: string
  homeTeamKR?: string
  awayTeamKR?: string
  homeCrest: string
  awayCrest: string
  
  // 실제 결과
  finalScoreHome: number
  finalScoreAway: number
  matchStatus: 'FT' | 'AET' | 'PEN'
  
  // 트렌드 분석
  predictedWinner: 'home' | 'away' | 'draw'
  predictedScoreHome: number
  predictedScoreAway: number
  predictedHomeProbability: number
  predictedDrawProbability: number
  predictedAwayProbability: number
  
  // 적중 여부
  isCorrect: boolean
  predictionType: 'exact' | 'winner_only' | 'wrong'
  
  // 날짜
  matchDate: string
  time: string
}

// 통계 인터페이스
interface Stats {
  total: number
  correct: number
  accuracy: number
  byLeague?: {
    [key: string]: {
      total: number
      correct: number
      accuracy: number
    }
  }
}

// 리그 정보
const LEAGUES = [
  { code: 'ALL', name: '전체', nameEn: 'All' },
  { code: 'PL', name: '프리미어리그', nameEn: 'Premier League' },
  { code: 'PD', name: '라리가', nameEn: 'La Liga' },
  { code: 'BL1', name: '분데스리가', nameEn: 'Bundesliga' },
  { code: 'SA', name: '세리에A', nameEn: 'Serie A' },
  { code: 'FL1', name: '리그1', nameEn: 'Ligue 1' },
  { code: 'CL', name: '챔피언스리그', nameEn: 'Champions League' },
]

export default function ResultsPage() {
  const { t, language } = useLanguage()
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'correct' | 'wrong'>('all')
  const [results, setResults] = useState<MatchResult[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, correct: 0, accuracy: 0 })
  const [loading, setLoading] = useState(true)

  // 데이터 로드
  useEffect(() => {
    fetchResults()
  }, [selectedLeague, selectedPeriod, selectedFilter])

  const fetchResults = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        league: selectedLeague,
        period: selectedPeriod,
        filter: selectedFilter
      })
      
      const response = await fetch(`/api/match-results?${params}`)
      const data = await response.json()
      
      setResults(data.results || [])
      setStats(data.stats || { total: 0, correct: 0, accuracy: 0 })
    } catch (error) {
      console.error('결과 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 적중 배지
  const getPredictionBadge = (result: MatchResult) => {
    if (result.predictionType === 'exact') {
      return {
        text: language === 'ko' ? '완벽 적중' : 'Exact',
        icon: '🎯',
        color: 'bg-green-500',
        borderColor: 'border-green-500',
        textColor: 'text-green-400'
      }
    } else if (result.predictionType === 'winner_only') {
      return {
        text: language === 'ko' ? '승부 적중' : 'Winner',
        icon: '✅',
        color: 'bg-yellow-500',
        borderColor: 'border-yellow-500',
        textColor: 'text-yellow-400'
      }
    } else {
      return {
        text: language === 'ko' ? '예측 실패' : 'Wrong',
        icon: '❌',
        color: 'bg-red-500',
        borderColor: 'border-red-500',
        textColor: 'text-red-400'
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20 md:pb-0">
      {/* 헤더 */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-800">
        {/* 타이틀 */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            📋 {language === 'ko' ? '경기 결과' : 'Match Results'}
          </h1>
        </div>

        {/* 통계 요약 - 그라데이션 배경 */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 py-4">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl md:text-3xl font-black">{stats.total}</div>
              <div className="text-xs md:text-sm opacity-75">
                {language === 'ko' ? '총 경기' : 'Total'}
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black">{stats.correct}</div>
              <div className="text-xs md:text-sm opacity-75">
                {language === 'ko' ? '적중' : 'Correct'}
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black">{stats.accuracy.toFixed(1)}%</div>
              <div className="text-xs md:text-sm opacity-75">
                {language === 'ko' ? '적중률' : 'Accuracy'}
              </div>
            </div>
            {/* 데스크톱 추가 통계 */}
            <div className="hidden md:block">
              <div className="text-2xl md:text-3xl font-black">{stats.total - stats.correct}</div>
              <div className="text-xs md:text-sm opacity-75">
                {language === 'ko' ? '실패' : 'Wrong'}
              </div>
            </div>
            <div className="hidden md:block">
              <div className="text-2xl md:text-3xl font-black">
                {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}
              </div>
              <div className="text-xs md:text-sm opacity-75">
                {language === 'ko' ? '신뢰도' : 'Trust'}
              </div>
            </div>
            </div>
          </div>
          
          {/* 프로그레스 바 */}
          <div className="max-w-7xl mx-auto px-4">
            <div className="mt-3 bg-white/20 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-white h-full transition-all duration-500"
                style={{ width: `${stats.accuracy}%` }}
              />
            </div>
          </div>
        </div>

        {/* 리그 필터 */}
        <div className="max-w-7xl mx-auto">
          <div 
            className="overflow-x-auto scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
          <div className="flex gap-2 px-4 py-3 min-w-max">
            {LEAGUES.map((league) => (
              <button
                key={league.code}
                onClick={() => setSelectedLeague(league.code)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedLeague === league.code
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {language === 'ko' ? league.name : league.nameEn}
              </button>
            ))}
          </div>
        </div>
      </div>

        {/* 기간 & 필터 */}
        <div className="max-w-7xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {/* 기간 필터 */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1 min-w-max">
            {['today', 'week', 'month', 'all'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {period === 'today' && (language === 'ko' ? '오늘' : 'Today')}
                {period === 'week' && (language === 'ko' ? '이번 주' : 'Week')}
                {period === 'month' && (language === 'ko' ? '이번 달' : 'Month')}
                {period === 'all' && (language === 'ko' ? '전체' : 'All')}
              </button>
            ))}
          </div>

          {/* 적중 필터 */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1 min-w-max">
            {[
              { value: 'all', icon: '📊', label: language === 'ko' ? '전체' : 'All' },
              { value: 'correct', icon: '✅', label: language === 'ko' ? '적중' : 'Correct' },
              { value: 'wrong', icon: '❌', label: language === 'ko' ? '실패' : 'Wrong' }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedFilter(filter.value as any)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  selectedFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="mr-1">{filter.icon}</span>
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 결과 리스트 */}
      <div className="max-w-7xl mx-auto px-3 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {loading ? (
          // 로딩
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/3 mb-3" />
                <div className="h-20 bg-gray-700 rounded" />
              </div>
            ))}
          </>
        ) : results.length === 0 ? (
          // 결과 없음
          <div className="md:col-span-2 text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-400">
              {language === 'ko' ? '결과가 없습니다' : 'No results found'}
            </p>
          </div>
        ) : (
          // 결과 카드
          results.map((result) => {
            const badge = getPredictionBadge(result)
            const homeTeam = language === 'ko' ? (result.homeTeamKR || result.homeTeam) : result.homeTeam
            const awayTeam = language === 'ko' ? (result.awayTeamKR || result.awayTeam) : result.awayTeam
            
            // 승자에 따른 확률 표시
            let winnerProb = 0
            let winnerText = ''
            if (result.predictedWinner === 'home') {
              winnerProb = result.predictedHomeProbability
              winnerText = homeTeam
            } else if (result.predictedWinner === 'away') {
              winnerProb = result.predictedAwayProbability
              winnerText = awayTeam
            } else {
              winnerProb = result.predictedDrawProbability
              winnerText = language === 'ko' ? '무승부' : 'Draw'
            }

            return (
              <div
                key={result.id}
                className={`bg-[#1a1a1a] rounded-xl overflow-hidden border-l-4 ${badge.borderColor}`}
              >
                {/* 상단: 날짜 & 리그 */}
                <div className="px-4 py-2 bg-gray-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{result.time}</span>
                    <span>•</span>
                    <span>{language === 'ko' ? LEAGUES.find(l => l.code === result.league)?.name : LEAGUES.find(l => l.code === result.league)?.nameEn}</span>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold text-white ${badge.color}`}>
                    {badge.icon} {badge.text}
                  </div>
                </div>

                {/* 경기 정보 */}
                <div className="p-4">
                  {/* 팀 & 스코어 */}
                  <div className="space-y-3">
                    {/* 홈팀 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img 
                          src={result.homeCrest} 
                          alt={homeTeam}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">⚽</text></svg>'
                          }}
                        />
                        <span className="text-white font-medium truncate">{homeTeam}</span>
                      </div>
                      <div className="text-2xl font-black text-white ml-4">
                        {result.finalScoreHome}
                      </div>
                    </div>

                    {/* 원정팀 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img 
                          src={result.awayCrest} 
                          alt={awayTeam}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">⚽</text></svg>'
                          }}
                        />
                        <span className="text-white font-medium truncate">{awayTeam}</span>
                      </div>
                      <div className="text-2xl font-black text-white ml-4">
                        {result.finalScoreAway}
                      </div>
                    </div>
                  </div>

                  {/* 트렌드 분석 - 확률만 표시 */}
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-400">
                        {language === 'ko' ? '트렌드 분석' : 'Trend Analysis'}
                      </div>
                      <div className={`font-bold ${badge.textColor} flex items-center gap-2`}>
                        <span>
                          {result.predictedScoreHome}-{result.predictedScoreAway} ({winnerText})
                        </span>
                        <span className="text-gray-400 text-xs">
                          {winnerProb.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        </div>
      </div>

      {/* 하단 여백 */}
      <div className="h-20 md:h-0" />
    </div>
  )
}