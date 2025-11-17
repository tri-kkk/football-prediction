'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { getTeamLogo, TEAM_NAME_KR } from '../teamLogos'

type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED'

interface Match {
  id: number | string
  league: string
  homeTeam: string
  awayTeam: string
  homeTeamKR?: string
  awayTeamKR?: string
  homeCrest: string
  awayCrest: string
  matchDate: string
  time: string
  predictedWinner: 'home' | 'away' | 'draw'
  predictedScoreHome: number
  predictedScoreAway: number
  predictedHomeProbability: number
  predictedDrawProbability: number
  predictedAwayProbability: number
  finalScoreHome?: number
  finalScoreAway?: number
  matchStatus: MatchStatus
  isCorrect?: boolean
  predictionType?: 'exact' | 'winner_only' | 'wrong'
}

interface Stats {
  total: number
  scheduled: number
  live: number
  finished: number
  correct: number
  accuracy: number
}

const LEAGUES = [
  { code: 'ALL', name: '전체', nameEn: 'All' },
  { code: 'PL', name: '프리미어리그', nameEn: 'Premier League' },
  { code: 'PD', name: '라리가', nameEn: 'La Liga' },
  { code: 'BL1', name: '분데스리가', nameEn: 'Bundesliga' },
  { code: 'SA', name: '세리에A', nameEn: 'Serie A' },
  { code: 'FL1', name: '리그1', nameEn: 'Ligue 1' },
  { code: 'CL', name: '챔피언스리그', nameEn: 'Champions League' },
]

// 🔥 메인 페이지와 동일한 스코어 계산 로직
function calculateRealisticScore(
  avgHome: number, 
  avgAway: number, 
  homeWinPercent: number, 
  drawPercent: number, 
  awayWinPercent: number
): { home: number; away: number } {
  
  if (avgHome < 0 || avgAway < 0 || isNaN(avgHome) || isNaN(avgAway)) {
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
  
  let homeGoals = Math.floor(avgHome)
  let awayGoals = Math.floor(avgAway)
  
  const homeDecimal = avgHome - homeGoals
  const awayDecimal = avgAway - awayGoals
  
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
  
  const totalGoals = homeGoals + awayGoals
  
  if (totalGoals > 5) {
    const scale = 4 / totalGoals
    homeGoals = Math.round(homeGoals * scale)
    awayGoals = Math.round(awayGoals * scale)
  }
  
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
  
  const finalHome = homeGoals
  const finalAway = awayGoals
  
  if (homeWinPercent > awayWinPercent + 15 && finalHome <= finalAway) {
    return { home: finalAway + 1, away: finalAway }
  }
  if (awayWinPercent > homeWinPercent + 15 && finalAway <= finalHome) {
    return { home: finalHome, away: finalHome + 1 }
  }
  
  return { home: finalHome, away: finalAway }
}

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

  useEffect(() => {
    fetchMatches()
    const interval = setInterval(fetchMatches, 30000)
    return () => clearInterval(interval)
  }, [selectedLeague, selectedPeriod])

  const fetchMatches = async () => {
    setLoading(true)
    try {
      let scheduledMatches: Match[] = []
      
      if (selectedLeague === 'ALL') {
        const leagueCodes = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'CL']
        const promises = leagueCodes.map(code => 
          fetch(`/api/odds-from-db?league=${code}`).then(r => r.json())
        )
        const results = await Promise.all(promises)
        
        results.forEach((data) => {
          if (data.success && data.data) {
            const matches = data.data.map((match: any) => parseMatch(match))
            scheduledMatches.push(...matches)
          }
        })
      } else {
        const response = await fetch(`/api/odds-from-db?league=${selectedLeague}`)
        const data = await response.json()
        
        if (data.success && data.data) {
          scheduledMatches = data.data.map((match: any) => parseMatch(match))
        }
      }

      const resultsResponse = await fetch(`/api/match-results?league=${selectedLeague}&period=${selectedPeriod}`)
      const resultsData = await resultsResponse.json()
      
      let finishedMatches: Match[] = []
      if (resultsData.success && resultsData.matches) {
        finishedMatches = resultsData.matches.map((match: any) => parseMatch(match, true))
      }

      // 🔥 수정 1: 최신 경기가 위로 (오름차순 정렬)
      const allMatches = [...scheduledMatches, ...finishedMatches].sort((a, b) => 
        new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
      )
      
      setMatches(allMatches)
      
      const total = allMatches.length
      const scheduled = scheduledMatches.length
      const live = 0
      const finished = finishedMatches.length
      const correct = finishedMatches.filter(m => m.isCorrect).length
      const accuracy = finished > 0 ? Math.round((correct / finished) * 100) : 0
      
      setStats({ total, scheduled, live, finished, correct, accuracy })
      
    } catch (error) {
      console.error('❌ 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const parseMatch = (match: any, isFinished: boolean = false): Match => {
    let matchDate = match.commence_time || match.match_date || match.matchDate || new Date().toISOString()
    
    if (typeof matchDate === 'string' && matchDate.includes(':00:00:00')) {
      matchDate = matchDate.replace(':00:00:00', ':00Z')
    }

    const homeProb = match.home_probability || match.homeWinProbability || 0
    const drawProb = match.draw_probability || match.drawProbability || 0
    const awayProb = match.away_probability || match.awayWinProbability || 0

    let predictedWinner: 'home' | 'away' | 'draw' = 'draw'
    const maxProb = Math.max(homeProb, drawProb, awayProb)
    if (maxProb === homeProb) predictedWinner = 'home'
    else if (maxProb === awayProb) predictedWinner = 'away'

    // 🔥 핵심 수정: DB에 저장된 predicted_score 우선 사용
    let predictedScoreHome: number
    let predictedScoreAway: number

    if (match.predicted_score_home !== null && match.predicted_score_home !== undefined &&
        match.predicted_score_away !== null && match.predicted_score_away !== undefined) {
      predictedScoreHome = match.predicted_score_home
      predictedScoreAway = match.predicted_score_away
    } else {
      const avgHomeGoals = homeProb > 50 ? 1.5 : homeProb > 40 ? 1.3 : 1.0
      const avgAwayGoals = awayProb > 50 ? 1.5 : awayProb > 40 ? 1.3 : 1.0
      
      const calculated = calculateRealisticScore(
        avgHomeGoals,
        avgAwayGoals,
        homeProb,
        drawProb,
        awayProb
      )
      predictedScoreHome = calculated.home
      predictedScoreAway = calculated.away
    }

    return {
      id: match.match_id || match.id || Math.random().toString(),
      league: match.league_code || match.league || 'Unknown',
      homeTeam: match.home_team || match.homeTeam || 'Home Team',
      awayTeam: match.away_team || match.awayTeam || 'Away Team',
      homeTeamKR: TEAM_NAME_KR[match.home_team || match.homeTeam] || undefined,
      awayTeamKR: TEAM_NAME_KR[match.away_team || match.awayTeam] || undefined,
      // 🔥 수정 2: DB 로고 우선 사용
      homeCrest: match.home_team_logo || getTeamLogo(match.home_team || match.homeTeam) || '/default-logo.png',
      awayCrest: match.away_team_logo || getTeamLogo(match.away_team || match.awayTeam) || '/default-logo.png',
      matchDate: matchDate,
      time: new Date(matchDate).toLocaleString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Seoul'
      }),
      predictedWinner,
      predictedScoreHome,
      predictedScoreAway,
      predictedHomeProbability: homeProb,
      predictedDrawProbability: drawProb,
      predictedAwayProbability: awayProb,
      finalScoreHome: isFinished ? (match.final_score_home || 0) : undefined,
      finalScoreAway: isFinished ? (match.final_score_away || 0) : undefined,
      matchStatus: isFinished ? 'FINISHED' : 'SCHEDULED',
      isCorrect: isFinished ? (match.is_correct || false) : undefined,
      predictionType: isFinished ? (match.prediction_type || 'wrong') : undefined
    }
  }

  const filteredMatches = matches.filter(match => {
    const leagueMatch = selectedLeague === 'ALL' || match.league === selectedLeague
    const statusMatch = selectedStatus === 'ALL' || match.matchStatus === selectedStatus
    return leagueMatch && statusMatch
  })

  const getPredictionBadge = (match: Match) => {
    if (match.matchStatus !== 'FINISHED') return null
    if (match.predictionType === 'exact') {
      return { text: language === 'ko' ? '완벽' : 'Exact', icon: '🎯', color: 'bg-green-500' }
    } else if (match.predictionType === 'winner_only') {
      return { text: language === 'ko' ? '승부' : 'Winner', icon: '✅', color: 'bg-yellow-500' }
    } else {
      return { text: language === 'ko' ? '실패' : 'Wrong', icon: '❌', color: 'bg-red-500' }
    }
  }

  const getStatusBadge = (status: MatchStatus) => {
    switch (status) {
      case 'LIVE':
        return { text: language === 'ko' ? '진행 중' : 'LIVE', color: 'bg-red-500 animate-pulse', icon: '🔴' }
      case 'SCHEDULED':
        return { text: language === 'ko' ? '예정' : 'Scheduled', color: 'bg-blue-500', icon: '📅' }
      case 'FINISHED':
        return { text: language === 'ko' ? '종료' : 'Finished', color: 'bg-gray-600', icon: '✅' }
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20 md:pb-0">
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            📋 {language === 'ko' ? '경기 일정 & 결과' : 'Match Schedule & Results'}
          </h1>
        </div>

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

        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
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

                  <div className="space-y-3">
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
                      <div className="flex items-center gap-2">
                        {match.matchStatus === 'FINISHED' && (
                          <div className="text-2xl font-black text-green-400">
                            {match.finalScoreHome}
                          </div>
                        )}
                        <div className={`text-xl font-bold ${
                          match.matchStatus === 'FINISHED' ? 'text-gray-500 line-through' : 'text-blue-400'
                        }`}>
                          {match.predictedScoreHome}
                        </div>
                      </div>
                    </div>

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
                      <div className="flex items-center gap-2">
                        {match.matchStatus === 'FINISHED' && (
                          <div className="text-2xl font-black text-green-400">
                            {match.finalScoreAway}
                          </div>
                        )}
                        <div className={`text-xl font-bold ${
                          match.matchStatus === 'FINISHED' ? 'text-gray-500 line-through' : 'text-red-400'
                        }`}>
                          {match.predictedScoreAway}
                        </div>
                      </div>
                    </div>
                  </div>

                  {match.matchStatus === 'SCHEDULED' && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <div className="text-xs text-gray-500 mb-1">승률 {language === 'ko' ? '예측' : 'Prediction'}</div>
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

                  {match.matchStatus === 'FINISHED' && (
                    <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{language === 'ko' ? '예측 스코어' : 'Predicted'}</span>
                        <span className="text-gray-400 font-mono">
                          {match.predictedScoreHome} - {match.predictedScoreAway}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{language === 'ko' ? '실제 스코어' : 'Actual'}</span>
                        <span className="text-green-400 font-mono font-bold">
                          {match.finalScoreHome} - {match.finalScoreAway}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{language === 'ko' ? '예측 확률' : 'Win Probability'}</span>
                        <span className="text-gray-400">
                          {match.predictedWinner === 'home' 
                            ? `${match.predictedHomeProbability.toFixed(0)}% (${language === 'ko' ? '홈승' : 'Home'})`
                            : match.predictedWinner === 'away' 
                            ? `${match.predictedAwayProbability.toFixed(0)}% (${language === 'ko' ? '원정승' : 'Away'})`
                            : `${match.predictedDrawProbability.toFixed(0)}% (${language === 'ko' ? '무승부' : 'Draw'})`
                          }
                        </span>
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