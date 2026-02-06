'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ================================
// 타입 정의
// ================================

interface TeamSecretStats {
  teamId: number
  teamName: string
  teamNameKo: string | null
  leagueCode: string | null
  season: string
  
  seasonStats: {
    played: number
    wins: number
    draws: number
    losses: number
    winRate: number
    goalsFor: number
    goalsAgainst: number
  } | null
  
  homeStats: {
    played: number
    wins: number
    draws: number
    losses: number
    winRate: number
    goalsFor: number
    goalsAgainst: number
  } | null
  
  awayStats: {
    played: number
    wins: number
    draws: number
    losses: number
    winRate: number
    goalsFor: number
    goalsAgainst: number
  } | null
  
  recentForm: {
    last5: { wins: number, draws: number, losses: number, results: string[] }
    last10: { wins: number, draws: number, losses: number, goalsFor: number, goalsAgainst: number }
    currentStreak: { type: 'W' | 'D' | 'L' | 'none', count: number }
  }
  
  // 🔥 강화된 베팅 마켓 데이터
  markets: {
    over25Rate: number
    over15Rate: number
    over35Rate: number
    bttsRate: number
    bttsYesRate: number
    bttsNoRate: number
    cleanSheetRate: number
    failToScoreRate: number
    winToNilRate: number
    // 추가 지표
    avgGoalsFor: number
    avgGoalsAgainst: number
    avgTotalGoals: number
  }
  
  weaknesses: string[]
  strengths: string[]
  
  recentMatches: {
    date: string
    opponent: string
    opponentKo: string | null
    isHome: boolean
    goalsFor: number
    goalsAgainst: number
    result: 'W' | 'D' | 'L'
  }[]
}

interface H2HAnalysis {
  overall: {
    totalMatches: number
    homeWins: number
    draws: number
    awayWins: number
    homeWinRate: number
    drawRate: number
    awayWinRate: number
  }
  recent5: {
    trendDescription: string
  }
  // 🔥 H2H 베팅 지표
  bettingStats: {
    over25Rate: number
    over15Rate: number
    bttsRate: number
    avgTotalGoals: number
  }
  scorePatterns: {
    mostCommon: { score: string, count: number }[]
    over25Rate: number
    bttsRate: number
  }
  recentMatches: {
    homeScore: number
    awayScore: number
    homeTeam: string
  }[]
  insights: string[]
}

interface Props {
  homeTeam: string
  awayTeam: string
  leagueCode: string
  isPremiumUser: boolean
  language: 'ko' | 'en'
  getTeamName: (name: string) => string
}

// ================================
// 다국어
// ================================

const texts = {
  ko: {
    title: '프리미엄 분석',
    loading: '로딩 중...',
    noData: '데이터 없음',
    currentStreak: '현재 폼',
    last5: '최근 5경기',
    last10: '최근 10경기',
    seasonRecord: '시즌 성적',
    home: '홈',
    away: '원정',
    wins: '승',
    draws: '무',
    losses: '패',
    unlockPremium: '프리미엄 분석 보기',
    secretData: '시크릿 팀 데이터',
    secretDesc: '상대전적, 베팅 지표, 약점 분석',
    h2h: '상대전적',
    overall: '역대 전적',
    insights: '인사이트',
    mostCommonScore: '최다 스코어',
    winStreak: '연승',
    loseStreak: '연패',
    drawStreak: '연속 무승부',
    none: '-',
    close: '닫기',
    bettingGuide: '베팅 가이드',
    goalMarkets: '골 마켓',
    bttsMarkets: 'BTTS',
    cleanSheet: '클린시트',
    avgGoals: '평균 득점',
    totalGoals: '평균 총 골',
    recommended: '추천',
    notRecommended: '비추천',
    neutral: '중립',
  },
  en: {
    title: 'Premium Analysis',
    loading: 'Loading...',
    noData: 'No data',
    currentStreak: 'Current',
    last5: 'Last 5',
    last10: 'Last 10',
    seasonRecord: 'Season',
    home: 'Home',
    away: 'Away',
    wins: 'W',
    draws: 'D',
    losses: 'L',
    unlockPremium: 'Unlock Premium',
    secretData: 'Secret Team Data',
    secretDesc: 'H2H, Betting Stats, Weakness Analysis',
    h2h: 'H2H',
    overall: 'All Time',
    insights: 'Insights',
    mostCommonScore: 'Common Score',
    winStreak: ' Wins',
    loseStreak: ' Losses',
    drawStreak: ' Draws',
    none: '-',
    close: 'Close',
    bettingGuide: 'Betting Guide',
    goalMarkets: 'Goals',
    bttsMarkets: 'BTTS',
    cleanSheet: 'Clean Sheet',
    avgGoals: 'Avg Goals',
    totalGoals: 'Avg Total',
    recommended: 'REC',
    notRecommended: 'AVOID',
    neutral: 'NEUTRAL',
  }
}

// ================================
// 유틸리티 함수
// ================================

function calculateCurrentStreak(recentMatches: { result: 'W' | 'D' | 'L' }[]): { type: 'W' | 'D' | 'L' | 'none', count: number } {
  if (!recentMatches || recentMatches.length === 0) {
    return { type: 'none', count: 0 }
  }
  
  const firstResult = recentMatches[0].result
  let count = 1
  
  for (let i = 1; i < recentMatches.length; i++) {
    if (recentMatches[i].result === firstResult) {
      count++
    } else {
      break
    }
  }
  
  return { type: firstResult, count }
}

function extractLast5Results(recentMatches: { result: 'W' | 'D' | 'L' }[]): string[] {
  if (!recentMatches) return []
  return recentMatches.slice(0, 5).map(m => m.result)
}

// 베팅 추천 판정
function getBettingRecommendation(rate: number, type: 'over' | 'under' | 'btts_yes' | 'btts_no' | 'cs'): 'good' | 'bad' | 'neutral' {
  switch (type) {
    case 'over':
      if (rate >= 70) return 'good'
      if (rate <= 30) return 'bad'
      return 'neutral'
    case 'under':
      if (rate <= 30) return 'good'  // Over가 30% 이하면 Under 추천
      if (rate >= 70) return 'bad'
      return 'neutral'
    case 'btts_yes':
      if (rate >= 65) return 'good'
      if (rate <= 35) return 'bad'
      return 'neutral'
    case 'btts_no':
      if (rate <= 35) return 'good'  // BTTS Yes가 35% 이하면 No 추천
      if (rate >= 65) return 'bad'
      return 'neutral'
    case 'cs':
      if (rate >= 40) return 'good'
      if (rate <= 15) return 'bad'
      return 'neutral'
    default:
      return 'neutral'
  }
}

// ================================
// 메인 컴포넌트
// ================================

export default function PremiumTeamAnalysis({
  homeTeam, awayTeam, leagueCode, isPremiumUser, language, getTeamName
}: Props) {
  const t = texts[language]
  
  const [tab, setTab] = useState<'h2h' | 'home' | 'away'>('h2h')
  const [h2h, setH2h] = useState<H2HAnalysis | null>(null)
  const [homeStats, setHomeStats] = useState<TeamSecretStats | null>(null)
  const [awayStats, setAwayStats] = useState<TeamSecretStats | null>(null)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (!isPremiumUser) return
    
    const fetchData = async () => {
      setLoading(true)
      try {
        const [h2hRes, homeRes, awayRes] = await Promise.all([
          fetch(`/api/h2h-analysis?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}`),
          fetch(`/api/team-stats?team=${encodeURIComponent(homeTeam)}&league=${leagueCode}`),
          fetch(`/api/team-stats?team=${encodeURIComponent(awayTeam)}&league=${leagueCode}`),
        ])
        
        const [h2hData, homeData, awayData] = await Promise.all([
          h2hRes.json(),
          homeRes.json(),
          awayRes.json(),
        ])
        
        if (h2hData.success && h2hData.data) setH2h(h2hData.data)
        if (homeData.success) setHomeStats(homeData.data)
        if (awayData.success) setAwayStats(awayData.data)
        
      } catch (error) {
        console.error('Failed to fetch premium data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [isPremiumUser, homeTeam, awayTeam, leagueCode])
  
  // 비프리미엄 - 블러
  if (!isPremiumUser) {
    return (
      <div className="bg-[#12121a] rounded-lg p-3 border border-gray-700 relative overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-sm bg-black/40 z-10" />
        <div className="opacity-30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-yellow-400">🔐</span>
            <span className="text-sm font-bold text-yellow-400">{t.title}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[1,2,3].map(i => <div key={i} className="bg-gray-800 rounded h-12" />)}
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <div className="text-3xl mb-2">🔒</div>
          <div className="text-white font-bold mb-1">{t.secretData}</div>
          <div className="text-xs text-gray-400 mb-3 text-center px-4">{t.secretDesc}</div>
          <Link 
            href="/premium"
            className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-lg text-sm"
          >
            {t.unlockPremium}
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-gradient-to-b from-[#1a1a2e] to-[#12121a] rounded-lg p-3 border border-yellow-500/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-yellow-400">🔐</span>
        <span className="text-sm font-bold text-yellow-400">{t.title}</span>
        {loading && <span className="text-xs text-gray-500 animate-pulse">{t.loading}</span>}
      </div>
      
      {/* 탭 */}
      <div className="flex mb-3 bg-gray-800/50 rounded-lg p-1">
        {[
          { key: 'h2h', label: t.h2h },
          { key: 'home', label: getTeamName(homeTeam).slice(0,6) },
          { key: 'away', label: getTeamName(awayTeam).slice(0,6) },
        ].map(({ key, label }) => (
          <button 
            key={key}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
              tab === key 
                ? key === 'h2h' ? 'bg-purple-600 text-white' 
                  : key === 'home' ? 'bg-blue-600 text-white' 
                  : 'bg-red-600 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setTab(key as any)}
          >
            {label}
          </button>
        ))}
      </div>
      
      {tab === 'h2h' && <H2HSection h2h={h2h} homeTeam={homeTeam} awayTeam={awayTeam} t={t} getTeamName={getTeamName} language={language} />}
      {tab === 'home' && <TeamSection stats={homeStats} isHome={true} t={t} language={language} />}
      {tab === 'away' && <TeamSection stats={awayStats} isHome={false} t={t} language={language} />}
    </div>
  )
}

// ================================
// H2H 섹션 (베팅 지표 강화)
// ================================

function H2HSection({ h2h, homeTeam, awayTeam, t, getTeamName, language }: { 
  h2h: H2HAnalysis | null
  homeTeam: string
  awayTeam: string
  t: any
  getTeamName: (n: string) => string
  language: 'ko' | 'en'
}) {
  if (!h2h) return <div className="text-center py-6 text-gray-500 text-sm">{t.noData}</div>
  
  const { overall, recentMatches, insights, scorePatterns } = h2h
  
  // H2H에서 베팅 지표 계산
  const matches = recentMatches || []
  const totalGoals = matches.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0)
  const avgTotalGoals = matches.length > 0 ? (totalGoals / matches.length).toFixed(1) : '0.0'
  const over25Count = matches.filter(m => m.homeScore + m.awayScore > 2.5).length
  const over15Count = matches.filter(m => m.homeScore + m.awayScore > 1.5).length
  const bttsCount = matches.filter(m => m.homeScore > 0 && m.awayScore > 0).length
  
  const over25Rate = matches.length > 0 ? Math.round((over25Count / matches.length) * 100) : 0
  const over15Rate = matches.length > 0 ? Math.round((over15Count / matches.length) * 100) : 0
  const bttsRate = matches.length > 0 ? Math.round((bttsCount / matches.length) * 100) : 0
  
  return (
    <div className="space-y-4">
      {/* 역대 전적 */}
      <div>
        <div className="text-xs text-gray-500 mb-2">{t.overall} ({overall.totalMatches}{language === 'ko' ? '경기' : ' games'})</div>
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-bold text-sm w-8">{overall.homeWins}</span>
          <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden flex">
            <div className="bg-blue-500 h-full" style={{ width: `${overall.homeWinRate}%` }} />
            <div className="bg-gray-500 h-full" style={{ width: `${overall.drawRate}%` }} />
            <div className="bg-red-500 h-full" style={{ width: `${overall.awayWinRate}%` }} />
          </div>
          <span className="text-red-400 font-bold text-sm w-8 text-right">{overall.awayWins}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{getTeamName(homeTeam)}</span>
          <span>{overall.draws} {t.draws}</span>
          <span>{getTeamName(awayTeam)}</span>
        </div>
      </div>
      
      {/* 최근 맞대결 */}
      {matches.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-2">{language === 'ko' ? '최근 맞대결' : 'Recent H2H'}</div>
          <div className="flex gap-1 justify-center">
            {matches.slice(0, 5).map((m, i) => {
              const homeWon = m.homeScore > m.awayScore
              const draw = m.homeScore === m.awayScore
              const isHomeTeamHome = m.homeTeam.toLowerCase().includes(homeTeam.toLowerCase().split(' ')[0])
              const homeTeamWon = isHomeTeamHome ? homeWon : (!homeWon && !draw)
              
              return (
                <div key={i} className={`w-10 h-10 rounded flex items-center justify-center text-xs font-bold ${
                  draw ? 'bg-gray-600' : homeTeamWon ? 'bg-blue-600' : 'bg-red-600'
                }`}>
                  {m.homeScore}-{m.awayScore}
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* 🔥 H2H 베팅 가이드 */}
      <div className="bg-gray-800/60 rounded-lg p-3">
        <div className="text-xs text-yellow-400 font-medium mb-3">🎯 {t.bettingGuide}</div>
        
        {/* 골 마켓 */}
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 mb-2">{t.goalMarkets}</div>
          <div className="grid grid-cols-3 gap-2">
            <BettingIndicator 
              label="O1.5" 
              rate={over15Rate} 
              type="over"
              language={language}
            />
            <BettingIndicator 
              label="O2.5" 
              rate={over25Rate} 
              type="over"
              language={language}
            />
            <BettingIndicator 
              label={language === 'ko' ? '평균' : 'AVG'} 
              value={avgTotalGoals}
              isAvg={true}
              language={language}
            />
          </div>
        </div>
        
        {/* BTTS */}
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 mb-2">{t.bttsMarkets}</div>
          <div className="grid grid-cols-2 gap-2">
            <BettingIndicator 
              label="BTTS Yes" 
              rate={bttsRate} 
              type="btts_yes"
              language={language}
            />
            <BettingIndicator 
              label="BTTS No" 
              rate={100 - bttsRate} 
              type="btts_no"
              inverted={true}
              language={language}
            />
          </div>
        </div>
        
        {/* 최다 스코어 */}
        {scorePatterns?.mostCommon && scorePatterns.mostCommon.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 mb-2">{t.mostCommonScore}</div>
            <div className="flex gap-2 flex-wrap">
              {scorePatterns.mostCommon.slice(0, 3).map((item, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-700 rounded text-xs text-white">
                  {item.score} <span className="text-gray-400">({item.count})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* 인사이트 */}
      {insights?.length > 0 && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded p-2">
          <div className="text-xs text-purple-400 mb-1">{t.insights}</div>
          <ul className="text-xs text-gray-300 space-y-1">
            {insights.slice(0, 4).map((ins, i) => <li key={i}>• {ins}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

// ================================
// 팀 통계 섹션 (베팅 지표 강화)
// ================================

function TeamSection({ stats, isHome, t, language }: { 
  stats: TeamSecretStats | null
  isHome: boolean
  t: any
  language: 'ko' | 'en' 
}) {
  if (!stats) return <div className="text-center py-6 text-gray-500 text-sm">{t.noData}</div>
  
  const { recentForm, homeStats, awayStats, markets, weaknesses, strengths, recentMatches } = stats
  const relevantStats = isHome ? homeStats : awayStats
  
  // recentMatches에서 직접 계산
  const calculatedStreak = recentMatches && recentMatches.length > 0 
    ? calculateCurrentStreak(recentMatches)
    : recentForm?.currentStreak || { type: 'none' as const, count: 0 }
  
  const last5Results = recentMatches && recentMatches.length > 0
    ? extractLast5Results(recentMatches)
    : recentForm?.last5?.results || []
  
  // 최근 10경기에서 베팅 지표 재계산
  const last10 = recentMatches?.slice(0, 10) || []
  const over25Rate = last10.length > 0 ? Math.round((last10.filter(m => m.goalsFor + m.goalsAgainst > 2.5).length / last10.length) * 100) : 0
  const over15Rate = last10.length > 0 ? Math.round((last10.filter(m => m.goalsFor + m.goalsAgainst > 1.5).length / last10.length) * 100) : 0
  const over35Rate = last10.length > 0 ? Math.round((last10.filter(m => m.goalsFor + m.goalsAgainst > 3.5).length / last10.length) * 100) : 0
  const bttsRate = last10.length > 0 ? Math.round((last10.filter(m => m.goalsFor > 0 && m.goalsAgainst > 0).length / last10.length) * 100) : 0
  const cleanSheetRate = last10.length > 0 ? Math.round((last10.filter(m => m.goalsAgainst === 0).length / last10.length) * 100) : 0
  const failToScoreRate = last10.length > 0 ? Math.round((last10.filter(m => m.goalsFor === 0).length / last10.length) * 100) : 0
  
  const avgGoalsFor = last10.length > 0 ? (last10.reduce((sum, m) => sum + m.goalsFor, 0) / last10.length).toFixed(1) : '0.0'
  const avgGoalsAgainst = last10.length > 0 ? (last10.reduce((sum, m) => sum + m.goalsAgainst, 0) / last10.length).toFixed(1) : '0.0'
  const avgTotalGoals = last10.length > 0 ? (last10.reduce((sum, m) => sum + m.goalsFor + m.goalsAgainst, 0) / last10.length).toFixed(1) : '0.0'
  
  const getStreakText = () => {
    const { type, count } = calculatedStreak
    if (type === 'none' || count === 0) return t.none
    if (type === 'W') return `${count}${t.winStreak}`
    if (type === 'L') return `${count}${t.loseStreak}`
    return `${count}${t.drawStreak}`
  }
  
  return (
    <div className="space-y-4">
      {/* 현재 폼 */}
      <div className="bg-gradient-to-r from-gray-800/80 to-gray-800/40 rounded-lg p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">{t.currentStreak}</span>
          <span className={`text-sm font-bold ${
            calculatedStreak.type === 'W' ? 'text-green-400' :
            calculatedStreak.type === 'L' ? 'text-red-400' : 'text-gray-400'
          }`}>
            {getStreakText()}
          </span>
        </div>
        
        {/* 최근 5경기 */}
        <div className="flex justify-center gap-1 mb-2">
          {last5Results.map((r, i) => (
            <span key={i} className={`w-8 h-8 rounded text-xs font-bold flex items-center justify-center ${
              r === 'W' ? 'bg-green-600' : r === 'D' ? 'bg-gray-500' : 'bg-red-600'
            } text-white`}>
              {language === 'ko' ? (r === 'W' ? '승' : r === 'D' ? '무' : '패') : r}
            </span>
          ))}
        </div>
        
        {/* 최근 10경기 */}
        {recentForm?.last10 && (
          <div className="text-center text-sm">
            <span className="text-gray-400">{t.last10}: </span>
            <span className="text-white font-medium">
              {recentForm.last10.wins}{t.wins} {recentForm.last10.draws}{t.draws} {recentForm.last10.losses}{t.losses}
            </span>
            <span className="text-gray-500 ml-1">
              ({recentForm.last10.goalsFor}:{recentForm.last10.goalsAgainst})
            </span>
          </div>
        )}
      </div>
      
      {/* 시즌 성적 */}
      {relevantStats && (
        <div>
          <div className="text-xs text-gray-500 mb-2">
            {stats.season} {isHome ? `🏠 ${t.home}` : `🚌 ${t.away}`}
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-green-900/30 rounded p-2">
              <div className="text-lg font-bold text-green-400">{relevantStats.wins}</div>
              <div className="text-xs text-gray-500">{t.wins}</div>
            </div>
            <div className="bg-gray-700/30 rounded p-2">
              <div className="text-lg font-bold text-gray-300">{relevantStats.draws}</div>
              <div className="text-xs text-gray-500">{t.draws}</div>
            </div>
            <div className="bg-red-900/30 rounded p-2">
              <div className="text-lg font-bold text-red-400">{relevantStats.losses}</div>
              <div className="text-xs text-gray-500">{t.losses}</div>
            </div>
            <div className="bg-blue-900/30 rounded p-2">
              <div className="text-lg font-bold text-blue-400">{relevantStats.winRate}%</div>
              <div className="text-xs text-gray-500">{language === 'ko' ? '승률' : 'Win%'}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* 🔥 베팅 가이드 (강화됨) */}
      <div className="bg-gray-800/60 rounded-lg p-3">
        <div className="text-xs text-yellow-400 font-medium mb-3">🎯 {t.bettingGuide} ({t.last10})</div>
        
        {/* 득점 평균 */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gray-700/50 rounded p-2 text-center">
            <div className="text-lg font-bold text-blue-400">{avgGoalsFor}</div>
            <div className="text-[10px] text-gray-500">{language === 'ko' ? '득점' : 'GF'}</div>
          </div>
          <div className="bg-gray-700/50 rounded p-2 text-center">
            <div className="text-lg font-bold text-red-400">{avgGoalsAgainst}</div>
            <div className="text-[10px] text-gray-500">{language === 'ko' ? '실점' : 'GA'}</div>
          </div>
          <div className="bg-gray-700/50 rounded p-2 text-center">
            <div className="text-lg font-bold text-yellow-400">{avgTotalGoals}</div>
            <div className="text-[10px] text-gray-500">{language === 'ko' ? '총골' : 'Total'}</div>
          </div>
        </div>
        
        {/* 골 마켓 */}
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 mb-2">{t.goalMarkets}</div>
          <div className="grid grid-cols-3 gap-2">
            <BettingIndicator label="O1.5" rate={over15Rate} type="over" language={language} />
            <BettingIndicator label="O2.5" rate={over25Rate} type="over" language={language} />
            <BettingIndicator label="O3.5" rate={over35Rate} type="over" language={language} />
          </div>
        </div>
        
        {/* BTTS & 클린시트 */}
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 mb-2">{t.bttsMarkets} & {t.cleanSheet}</div>
          <div className="grid grid-cols-3 gap-2">
            <BettingIndicator label="BTTS" rate={bttsRate} type="btts_yes" language={language} />
            <BettingIndicator label="CS" rate={cleanSheetRate} type="cs" language={language} />
            <BettingIndicator 
              label={language === 'ko' ? '무득점' : 'FTS'} 
              rate={failToScoreRate} 
              type="over" 
              inverted={true}
              language={language} 
            />
          </div>
        </div>
      </div>
      
      {/* 최근 경기 */}
      {recentMatches?.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-2">{language === 'ko' ? '최근 경기' : 'Recent'}</div>
          <div className="space-y-1">
            {recentMatches.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-gray-800/30 rounded px-2 py-1">
                <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                  m.result === 'W' ? 'bg-green-600' : m.result === 'D' ? 'bg-gray-500' : 'bg-red-600'
                } text-white`}>
                  {language === 'ko' ? (m.result === 'W' ? '승' : m.result === 'D' ? '무' : '패') : m.result}
                </span>
                <span className="text-gray-500 w-4">{m.isHome ? 'H' : 'A'}</span>
                <span className="flex-1 text-gray-300 truncate">{m.opponentKo || m.opponent}</span>
                <span className="font-medium text-white">{m.goalsFor}-{m.goalsAgainst}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 약점 */}
      {weaknesses?.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded p-2">
          <div className="text-xs text-red-400 mb-1">{language === 'ko' ? '약점' : 'Weaknesses'}</div>
          <ul className="text-xs text-gray-400 space-y-1">
            {weaknesses.map((w, i) => <li key={i}>• {w}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

// ================================
// 베팅 인디케이터 컴포넌트
// ================================

function BettingIndicator({ 
  label, 
  rate, 
  value,
  type, 
  inverted = false,
  isAvg = false,
  language 
}: { 
  label: string
  rate?: number
  value?: string
  type?: 'over' | 'under' | 'btts_yes' | 'btts_no' | 'cs'
  inverted?: boolean
  isAvg?: boolean
  language: 'ko' | 'en'
}) {
  if (isAvg && value) {
    const numValue = parseFloat(value)
    return (
      <div className="bg-gray-700/50 rounded p-2 text-center">
        <div className={`text-sm font-bold ${numValue >= 2.5 ? 'text-green-400' : numValue >= 1.5 ? 'text-yellow-400' : 'text-gray-400'}`}>
          {value}
        </div>
        <div className="text-[10px] text-gray-500">{label}</div>
      </div>
    )
  }
  
  const displayRate = rate ?? 0
  const recommendation = type ? getBettingRecommendation(inverted ? 100 - displayRate : displayRate, type) : 'neutral'
  
  const bgColor = recommendation === 'good' ? 'bg-green-900/40 border-green-500/30' 
    : recommendation === 'bad' ? 'bg-red-900/40 border-red-500/30' 
    : 'bg-gray-700/50 border-gray-600/30'
  
  const textColor = recommendation === 'good' ? 'text-green-400' 
    : recommendation === 'bad' ? 'text-red-400' 
    : 'text-gray-300'
  
  const badge = recommendation === 'good' ? '✓' : recommendation === 'bad' ? '✗' : ''
  
  return (
    <div className={`${bgColor} border rounded p-2 text-center relative`}>
      {badge && (
        <span className={`absolute -top-1 -right-1 text-[10px] ${recommendation === 'good' ? 'text-green-400' : 'text-red-400'}`}>
          {badge}
        </span>
      )}
      <div className={`text-sm font-bold ${textColor}`}>
        {displayRate}%
      </div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  )
}