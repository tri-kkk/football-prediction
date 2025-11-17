'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { getTeamLogo, TEAM_NAME_KR } from '../teamLogos'

// 경기 상태
type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED'

// 경기 인터페이스 (예정 + 결과 통합)
interface Match {
  id: number | string
  league: string
  homeTeam: string
  awayTeam: string
  homeTeamKR?: string
  awayTeamKR?: string
  homeCrest: string
  awayCrest: string
  
  // 날짜/시간
  matchDate: string
  time: string
  
  // 예측 정보 (항상 있음)
  predictedWinner: 'home' | 'away' | 'draw'
  predictedScoreHome: number
  predictedScoreAway: number
  predictedHomeProbability: number
  predictedDrawProbability: number
  predictedAwayProbability: number
  
  // 실제 결과 (FINISHED 경기만)
  finalScoreHome?: number
  finalScoreAway?: number
  matchStatus: MatchStatus
  
  // 적중 여부 (FINISHED 경기만)
  isCorrect?: boolean
  predictionType?: 'exact' | 'winner_only' | 'wrong'
}

// 통계
interface Stats {
  total: number
  scheduled: number
  live: number
  finished: number
  correct: number
  accuracy: number
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
  const { language } = useLanguage()
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | MatchStatus>('ALL')
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week')
  const [matches, setMatches] = useState<Match[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    scheduled: 0,
    live: 0,
    finished: 0,
    correct: 0,
    accuracy: 0
  })
  const [loading, setLoading] = useState(true)

  // 데이터 로드
  useEffect(() => {
    fetchMatches()
    
    // 30초마다 자동 새로고침 (LIVE 경기 업데이트)
    const interval = setInterval(fetchMatches, 30000)
    return () => clearInterval(interval)
  }, [selectedLeague, selectedPeriod])

  const fetchMatches = async () => {
    setLoading(true)
    try {
      console.log('🔄 경기 데이터 로드 시작...')
      console.log('선택된 리그:', selectedLeague)
      console.log('선택된 기간:', selectedPeriod)
      
      // 1. 예정 경기 가져오기 (메인 페이지 API 사용)
      const scheduledResponse = await fetch(`/api/odds-from-db?league=${selectedLeague}`)
      const scheduledData = await scheduledResponse.json()
      console.log('📅 예정 경기 응답:', scheduledData)
      console.log('📅 예정 경기 수:', scheduledData.data?.length || 0)
      
      // 2. 완료된 경기 가져오기 (기간 필터 적용)
      const finishedResponse = await fetch(`/api/match-results?league=${selectedLeague}&period=${selectedPeriod}`)
      const finishedData = await finishedResponse.json()
      console.log('✅ 완료 경기 응답:', finishedData)
      console.log('✅ 완료 경기 수:', finishedData.results?.length || 0)
      
      // 3. 두 데이터 합치기 (키 수정: matches → data)
      const scheduledMatches: Match[] = (scheduledData.data || []).map((m: any) => {
        console.log('📊 예정 경기 매핑:', m.homeTeam, 'vs', m.awayTeam)
        
        // 팀 이름 (영문 원본)
        const homeTeamEng = m.homeTeam || m.home_team || 'Unknown'
        const awayTeamEng = m.awayTeam || m.away_team || 'Unknown'
        
        // 확률
        const homeProb = m.homeWinProbability || m.home_probability || 0
        const drawProb = m.drawProbability || m.draw_probability || 0
        const awayProb = m.awayWinProbability || m.away_probability || 0
        
        // 예측 스코어 계산 (메인 페이지와 동일)
        const predictedScore = calculatePredictedScore(homeProb, drawProb, awayProb)
        
        return {
          id: m.id || m.match_id,
          league: m.league,
          homeTeam: homeTeamEng,
          awayTeam: awayTeamEng,
          homeTeamKR: m.homeTeamKR || TEAM_NAME_KR[homeTeamEng] || homeTeamEng,
          awayTeamKR: m.awayTeamKR || TEAM_NAME_KR[awayTeamEng] || awayTeamEng,
          // ✅ 메인 페이지 방식: 영문 팀명 직접 사용
          homeCrest: getTeamLogo(homeTeamEng),
          awayCrest: getTeamLogo(awayTeamEng),
          matchDate: m.utcDate || m.matchDate,
          time: m.time,
          predictedWinner: getPredictedWinner(homeProb, drawProb, awayProb),
          // ✅ 정교한 스코어 예측 사용
          predictedScoreHome: predictedScore.home,
          predictedScoreAway: predictedScore.away,
          predictedHomeProbability: homeProb,
          predictedDrawProbability: drawProb,
          predictedAwayProbability: awayProb,
          matchStatus: getMatchStatus(m.utcDate || m.matchDate)
        }
      })
      
      const finishedMatches: Match[] = (finishedData.results || []).map((m: any) => {
        console.log('✅ 완료 경기 매핑:', m.homeTeam, 'vs', m.awayTeam)
        return {
          ...m,
          matchStatus: 'FINISHED' as MatchStatus
        }
      })
      
      console.log('📊 예정 경기 최종:', scheduledMatches.length, '개')
      console.log('✅ 완료 경기 최종:', finishedMatches.length, '개')
      
      console.log('📊 예정 경기 최종:', scheduledMatches.length, '개')
      console.log('✅ 완료 경기 최종:', finishedMatches.length, '개')
      
      // 4. 합치기 및 정렬 (오래된 경기가 위로)
      const allMatches = [...scheduledMatches, ...finishedMatches]
        .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())
      
      console.log('🎯 전체 경기:', allMatches.length, '개')
      console.log('경기 목록:', allMatches.map(m => `${m.homeTeam} vs ${m.awayTeam} (${m.matchStatus})`))
      
      setMatches(allMatches)
      
      // 5. 통계 계산
      const totalMatches = allMatches.length
      const scheduled = allMatches.filter(m => m.matchStatus === 'SCHEDULED').length
      const live = allMatches.filter(m => m.matchStatus === 'LIVE').length
      const finished = allMatches.filter(m => m.matchStatus === 'FINISHED').length
      const correct = allMatches.filter(m => m.isCorrect === true).length
      const accuracy = finished > 0 ? (correct / finished) * 100 : 0
      
      setStats({
        total: totalMatches,
        scheduled,
        live,
        finished,
        correct,
        accuracy: Number(accuracy.toFixed(1))
      })
      
    } catch (error) {
      console.error('경기 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 경기 상태 판별
  const getMatchStatus = (dateString: string): MatchStatus => {
    const matchTime = new Date(dateString).getTime()
    const now = Date.now()
    const hoursSinceStart = (now - matchTime) / (1000 * 60 * 60)
    
    if (hoursSinceStart > 2) return 'FINISHED'
    if (hoursSinceStart > 0) return 'LIVE'
    return 'SCHEDULED'
  }

  // 예측 승자 계산
  const getPredictedWinner = (home: number, draw: number, away: number): 'home' | 'away' | 'draw' => {
    if (home > draw && home > away) return 'home'
    if (away > home && away > draw) return 'away'
    return 'draw'
  }

  // 정교한 스코어 예측 (메인 페이지와 동일)
  const calculatePredictedScore = (
    homeWinPercent: number,
    drawPercent: number, 
    awayWinPercent: number,
    avgHome: number = 1.5,
    avgAway: number = 1.5
  ): { home: number; away: number } => {
    // avgHome, avgAway가 없으면 승률 기반으로만 예측
    if (!avgHome || !avgAway || avgHome === 0 || avgAway === 0) {
      const maxPercent = Math.max(homeWinPercent, drawPercent, awayWinPercent)
      
      if (maxPercent === homeWinPercent) {
        if (homeWinPercent > 50) return { home: 2, away: 0 }
        if (homeWinPercent > 40) return { home: 2, away: 1 }
        return { home: 1, away: 0 }
      } else if (maxPercent === awayWinPercent) {
        if (awayWinPercent > 50) return { home: 0, away: 2 }
        if (awayWinPercent > 40) return { home: 1, away: 2 }
        return { home: 0, away: 1 }
      } else {
        return { home: 1, away: 1 }
      }
    }
    
    // 1. 평균 득점 기반 기본 스코어
    let homeGoals = Math.floor(avgHome)
    let awayGoals = Math.floor(avgAway)
    
    // 2. 소수점을 확률로 변환
    const homeDecimal = avgHome - homeGoals
    const awayDecimal = avgAway - awayGoals
    
    // 3. 승률 기반 조정
    const maxPercent = Math.max(homeWinPercent, drawPercent, awayWinPercent)
    
    if (maxPercent === homeWinPercent) {
      if (homeDecimal > 0.6) homeGoals += 1
      if (homeWinPercent > 60 && homeGoals <= awayGoals) {
        homeGoals = awayGoals + 1
      }
    } else if (maxPercent === awayWinPercent) {
      if (awayDecimal > 0.6) awayGoals += 1
      if (awayWinPercent > 60 && awayGoals <= homeGoals) {
        awayGoals = homeGoals + 1
      }
    } else {
      if (drawPercent > 35) {
        const avg = (homeGoals + awayGoals) / 2
        homeGoals = Math.round(avg)
        awayGoals = Math.round(avg)
      }
    }
    
    // 4. 현실성 체크
    const totalGoals = homeGoals + awayGoals
    if (totalGoals > 5) {
      const scale = 4 / totalGoals
      homeGoals = Math.round(homeGoals * scale)
      awayGoals = Math.round(awayGoals * scale)
    }
    
    // 5. 최소값 보장
    if (totalGoals === 0) {
      if (homeWinPercent > awayWinPercent) {
        homeGoals = 1
      } else if (awayWinPercent > homeWinPercent) {
        awayGoals = 1
      } else {
        homeGoals = 1
        awayGoals = 1
      }
    }
    
    // 6. 최종 일관성 체크
    if (homeWinPercent > awayWinPercent + 15 && homeGoals <= awayGoals) {
      return { home: awayGoals + 1, away: awayGoals }
    }
    if (awayWinPercent > homeWinPercent + 15 && awayGoals <= homeGoals) {
      return { home: homeGoals, away: homeGoals + 1 }
    }
    
    return { home: homeGoals, away: awayGoals }
  }

  // 필터링된 경기 목록
  const filteredMatches = matches.filter(match => {
    if (selectedStatus !== 'ALL' && match.matchStatus !== selectedStatus) {
      return false
    }
    return true
  })

  // 적중 배지
  const getPredictionBadge = (match: Match) => {
    if (match.matchStatus !== 'FINISHED') {
      return null
    }
    
    if (match.predictionType === 'exact') {
      return {
        text: language === 'ko' ? '완벽' : 'Exact',
        icon: '🎯',
        color: 'bg-green-500'
      }
    } else if (match.predictionType === 'winner_only') {
      return {
        text: language === 'ko' ? '승부' : 'Winner',
        icon: '✅',
        color: 'bg-yellow-500'
      }
    } else {
      return {
        text: language === 'ko' ? '실패' : 'Wrong',
        icon: '❌',
        color: 'bg-red-500'
      }
    }
  }

  // 상태 배지
  const getStatusBadge = (status: MatchStatus) => {
    switch (status) {
      case 'LIVE':
        return {
          text: language === 'ko' ? '진행 중' : 'LIVE',
          color: 'bg-red-500 animate-pulse',
          icon: '🔴'
        }
      case 'SCHEDULED':
        return {
          text: language === 'ko' ? '예정' : 'Scheduled',
          color: 'bg-blue-500',
          icon: '📅'
        }
      case 'FINISHED':
        return {
          text: language === 'ko' ? '종료' : 'Finished',
          color: 'bg-gray-600',
          icon: '✅'
        }
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20 md:pb-0">
      {/* 헤더 */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            📋 {language === 'ko' ? '경기 일정 & 결과' : 'Match Schedule & Results'}
          </h1>
        </div>

        {/* 통계 요약 */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 py-4">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4 text-center">
              <div>
                <div className="text-xl md:text-2xl font-black">{stats.total}</div>
                <div className="text-xs opacity-75">{language === 'ko' ? '전체' : 'Total'}</div>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-black">{stats.scheduled}</div>
                <div className="text-xs opacity-75">{language === 'ko' ? '예정' : 'Scheduled'}</div>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-black">{stats.live}</div>
                <div className="text-xs opacity-75">{language === 'ko' ? '진행중' : 'Live'}</div>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-black">{stats.finished}</div>
                <div className="text-xs opacity-75">{language === 'ko' ? '종료' : 'Finished'}</div>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-black">{stats.correct}</div>
                <div className="text-xs opacity-75">{language === 'ko' ? '적중' : 'Correct'}</div>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-black">{stats.accuracy}%</div>
                <div className="text-xs opacity-75">{language === 'ko' ? '적중률' : 'Accuracy'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 */}
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
          {/* 리그 필터 */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {LEAGUES.map(league => (
              <button
                key={league.code}
                onClick={() => setSelectedLeague(league.code)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedLeague === league.code
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {language === 'ko' ? league.name : league.nameEn}
              </button>
            ))}
          </div>

          {/* 기간 필터 */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {[
              { value: 'today' as const, labelKo: '오늘', labelEn: 'Today', icon: '📅' },
              { value: 'week' as const, labelKo: '이번주', labelEn: 'This Week', icon: '📆' },
              { value: 'month' as const, labelKo: '이번달', labelEn: 'This Month', icon: '📊' },
              { value: 'all' as const, labelKo: '전체', labelEn: 'All Time', icon: '🗓️' }
            ].map(period => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  selectedPeriod === period.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span>{period.icon}</span>
                <span>{language === 'ko' ? period.labelKo : period.labelEn}</span>
              </button>
            ))}
          </div>

          {/* 상태 필터 */}
          <div className="flex gap-2">
            {(['ALL', 'SCHEDULED', 'LIVE', 'FINISHED'] as const).map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedStatus === status
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {status === 'ALL' && (language === 'ko' ? '전체' : 'All')}
                {status === 'SCHEDULED' && (language === 'ko' ? '📅 예정' : '📅 Scheduled')}
                {status === 'LIVE' && (language === 'ko' ? '🔴 LIVE' : '🔴 LIVE')}
                {status === 'FINISHED' && (language === 'ko' ? '✅ 종료' : '✅ Finished')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 경기 목록 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-400">{language === 'ko' ? '로딩 중...' : 'Loading...'}</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-xl text-gray-400">
              {language === 'ko' ? '경기가 없습니다' : 'No matches found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMatches.map(match => {
              const statusBadge = getStatusBadge(match.matchStatus)
              const predictionBadge = getPredictionBadge(match)
              
              return (
                <div
                  key={match.id}
                  className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-all"
                >
                  {/* 상단: 리그 + 날짜 + 상태 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-gray-400">{match.league}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{match.time}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusBadge.color} text-white font-bold`}>
                        {statusBadge.icon} {statusBadge.text}
                      </span>
                      {predictionBadge && (
                        <span className={`text-xs px-2 py-1 rounded-full ${predictionBadge.color} text-white font-bold`}>
                          {predictionBadge.icon} {predictionBadge.text}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 팀 정보 */}
                  <div className="space-y-3">
                    {/* 홈팀 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <img 
                          src={match.homeCrest} 
                          alt={match.homeTeam} 
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                        <span className="font-medium">
                          {language === 'ko' && match.homeTeamKR ? match.homeTeamKR : match.homeTeam}
                        </span>
                      </div>
                      <div className="text-2xl font-black">
                        {match.matchStatus === 'FINISHED' ? match.finalScoreHome : match.predictedScoreHome}
                      </div>
                    </div>

                    {/* 원정팀 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <img 
                          src={match.awayCrest} 
                          alt={match.awayTeam} 
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                        <span className="font-medium">
                          {language === 'ko' && match.awayTeamKR ? match.awayTeamKR : match.awayTeam}
                        </span>
                      </div>
                      <div className="text-2xl font-black">
                        {match.matchStatus === 'FINISHED' ? match.finalScoreAway : match.predictedScoreAway}
                      </div>
                    </div>
                  </div>

                  {/* AI 예측 */}
                  {match.matchStatus === 'SCHEDULED' && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <div className="text-xs text-gray-500 mb-1">AI {language === 'ko' ? '예측' : 'Prediction'}</div>
                      <div className="flex gap-2 text-xs">
                        <div className="flex-1 text-center">
                          <div className="text-blue-400 font-bold">{match.predictedHomeProbability.toFixed(0)}%</div>
                          <div className="text-gray-500">{language === 'ko' ? '홈' : 'Home'}</div>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="text-gray-400 font-bold">{match.predictedDrawProbability.toFixed(0)}%</div>
                          <div className="text-gray-500">{language === 'ko' ? '무' : 'Draw'}</div>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="text-red-400 font-bold">{match.predictedAwayProbability.toFixed(0)}%</div>
                          <div className="text-gray-500">{language === 'ko' ? '원정' : 'Away'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 예측 vs 실제 (종료 경기만) */}
                  {match.matchStatus === 'FINISHED' && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <div className="text-xs text-gray-500 mb-1">AI {language === 'ko' ? '예측' : 'Prediction'}: {match.predictedScoreHome}-{match.predictedScoreAway}</div>
                      <div className="text-xs text-gray-400">
                        {language === 'ko' ? '예측 확률' : 'Predicted'}: {match.predictedWinner === 'home' ? match.predictedHomeProbability.toFixed(0) : match.predictedWinner === 'away' ? match.predictedAwayProbability.toFixed(0) : match.predictedDrawProbability.toFixed(0)}%
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}