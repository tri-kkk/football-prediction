'use client'

import { useState } from 'react'
import MatchTrendChart from './MatchTrendChart'

interface Match {
  id: number
  homeTeam: string
  awayTeam: string
  homeCrest: string
  awayCrest: string
  homeWinRate: number
  drawRate: number
  awayWinRate: number
  status: 'LIVE' | 'SCHEDULED' | 'FINISHED'
  score?: string
  time: string
  date: string
  league: string
  leagueLogo: string
  homeScore?: number
  awayScore?: number
}

interface TrendData {
  timestamp: string
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
}

interface MatchRowWithTrendProps {
  match: Match
  darkMode: boolean
  language: 'ko' | 'en'
}

// 더미 트렌드 데이터 생성 함수
const generateDummyTrendData = (match: Match): TrendData[] => {
  const data: TrendData[] = []
  const now = new Date()
  
  // 24시간 전부터 현재까지 1시간 간격
  for (let i = 24; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
    
    // 약간의 변동을 주면서 현재 승률에 수렴
    const variance = 5 - (24 - i) * 0.2 // 시간이 지날수록 변동 감소
    
    data.push({
      timestamp: timestamp.toISOString(),
      homeWinProbability: Math.max(0, Math.min(100, 
        match.homeWinRate + (Math.random() - 0.5) * variance
      )),
      drawProbability: Math.max(0, Math.min(100, 
        match.drawRate + (Math.random() - 0.5) * variance
      )),
      awayWinProbability: Math.max(0, Math.min(100, 
        match.awayWinRate + (Math.random() - 0.5) * variance
      )),
    })
  }
  
  return data
}

export default function MatchRowWithTrend({ match, darkMode, language }: MatchRowWithTrendProps) {
  const [showTrend, setShowTrend] = useState(false)
  const [trendData] = useState<TrendData[]>(() => generateDummyTrendData(match))

  // 승률에 따른 배경 그라데이션
  const getGradient = () => {
    const home = match.homeWinRate
    const draw = match.drawRate
    const away = match.awayWinRate
    
    return `linear-gradient(to right, 
      rgba(59, 130, 246, ${home / 150}) 0%, 
      rgba(148, 163, 184, ${draw / 150}) ${home}%, 
      rgba(239, 68, 68, ${away / 150}) 100%
    )`
  }

  // 트렌드 방향 아이콘
  const getTrendIcon = () => {
    if (trendData.length < 2) return '➡️'
    
    const latest = trendData[trendData.length - 1].homeWinProbability
    const previous = trendData[trendData.length - 5]?.homeWinProbability || latest
    
    if (latest > previous + 2) return '↗️'
    if (latest < previous - 2) return '↘️'
    return '➡️'
  }

  return (
    <div 
      className={`
        rounded-xl overflow-hidden transition-all duration-300
        ${darkMode ? 'bg-slate-800/50' : 'bg-white'}
        hover:scale-[1.01] cursor-pointer
        ${showTrend ? 'ring-2 ring-blue-500' : ''}
      `}
      onClick={() => setShowTrend(!showTrend)}
    >
      {/* 메인 경기 정보 - Forebet 스타일 가로 배치 */}
      <div className="grid grid-cols-12 gap-2 p-4 items-center">
        {/* 1. 리그 로고 */}
        <div className="col-span-1 flex justify-center">
          <img 
            src={match.leagueLogo} 
            alt={match.league}
            className="w-6 h-6 object-contain"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/24/64748b/ffffff?text=L'
            }}
          />
        </div>

        {/* 2. 시간 */}
        <div className="col-span-1 text-center">
          <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {match.time}
          </div>
        </div>

        {/* 3. 홈팀 */}
        <div className="col-span-2 flex items-center gap-2 justify-end">
          <span className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {match.homeTeam}
          </span>
          <img 
            src={match.homeCrest} 
            alt={match.homeTeam}
            className="w-6 h-6 object-contain"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/24/3b82f6/ffffff?text=H'
            }}
          />
        </div>

        {/* 4. 스코어 또는 vs */}
        <div className="col-span-1 flex justify-center">
          {match.status === 'FINISHED' || match.status === 'LIVE' ? (
            <div className="flex items-center gap-1">
              <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {match.homeScore}
              </span>
              <span className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
              <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {match.awayScore}
              </span>
            </div>
          ) : (
            <span className={`text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              vs
            </span>
          )}
        </div>

        {/* 5. 원정팀 */}
        <div className="col-span-2 flex items-center gap-2">
          <img 
            src={match.awayCrest} 
            alt={match.awayTeam}
            className="w-6 h-6 object-contain"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/24/ef4444/ffffff?text=A'
            }}
          />
          <span className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {match.awayTeam}
          </span>
        </div>

        {/* 6. AI 예측 (승률 바) */}
        <div className="col-span-3 flex items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {match.homeWinRate.toFixed(0)}%
              </span>
              <span className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {match.drawRate.toFixed(0)}%
              </span>
              <span className={`font-medium ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {match.awayWinRate.toFixed(0)}%
              </span>
            </div>
            <div 
              className="h-2 rounded-full overflow-hidden"
              style={{ background: getGradient() }}
            >
            </div>
          </div>
        </div>

        {/* 7. 트렌드 지표 */}
        <div className="col-span-2 flex items-center justify-center gap-2">
          <span className="text-xl">{getTrendIcon()}</span>
          <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {language === 'ko' ? '24H 트렌드' : '24H Trend'}
          </span>
        </div>
      </div>

      {/* 트렌드 차트 (토글) */}
      {showTrend && (
        <div className={`px-4 pb-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {language === 'ko' ? '📊 매치 모멘텀 (24시간)' : '📊 Match Momentum (24H)'}
              </h4>
              <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {language === 'ko' ? '시장 센티먼트' : 'Market Sentiment'}
              </span>
            </div>
            <MatchTrendChart data={trendData} darkMode={darkMode} />
          </div>
        </div>
      )}
    </div>
  )
}
