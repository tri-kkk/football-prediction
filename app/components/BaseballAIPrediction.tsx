// components/BaseballAIPrediction.tsx
'use client'

import { useState, useEffect } from 'react'

interface PredictionProps {
  matchId: number
  homeTeam: string
  awayTeam: string
  homeTeamKo?: string
  awayTeamKo?: string
  season: string
}

interface PredictionResult {
  homeWinProb: number
  awayWinProb: number
  overProb: number
  underProb: number
  confidence: string
  grade: string
}

interface AIInsights {
  keyFactors: Array<{
    name: string
    value: number
    impact: number
    description: string
  }>
  homeAdvantage: {
    homeRecord: string
    awayRecord: string
    advantage: number
  }
  recentForm: {
    home: string
    away: string
  }
  summary: string
}

export default function BaseballAIPrediction({ 
  matchId, 
  homeTeam, 
  awayTeam,
  homeTeamKo,
  awayTeamKo,
  season 
}: PredictionProps) {
  const homeTeamName = homeTeamKo || homeTeam
  const awayTeamName = awayTeamKo || awayTeam
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [insights, setInsights] = useState<AIInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 자동 로딩
  useEffect(() => {
    fetchPrediction()
  }, [matchId])
  
  const fetchPrediction = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/baseball/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, homeTeam, awayTeam, season })
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || '예측 실패')
      }
      
      setPrediction(data.prediction)
      setInsights(data.insights)
    } catch (err: any) {
      console.error('예측 오류:', err)
      setError(err.message || '예측 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  // 등급별 색상
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'PICK': return 'bg-red-900/30 text-red-400 border-red-500/50'
      case 'GOOD': return 'bg-blue-900/30 text-blue-400 border-blue-500/50'
      default: return 'bg-gray-900/30 text-gray-400 border-gray-500/50'
    }
  }
  
  // 신뢰도 색상
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH': return 'text-green-400'
      case 'MEDIUM': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }
  
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-bold text-white">
          AI 예측 분석
        </h3>
        
        {prediction && (
          <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${getGradeColor(prediction.grade)}`}>
            {prediction.grade}
          </span>
        )}
      </div>
      
      <div className="p-6">
        {loading && !prediction && !error && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400 text-sm">경기 데이터 분석 중...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {prediction && (
          <div className="space-y-6">
            {/* 승부 예측 */}
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                승부 예측
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-gray-700 hover:border-red-500/50 transition-colors">
                  <div className="text-xs text-gray-400 mb-2 font-medium">{awayTeamName}</div>
                  <div className="text-4xl font-bold text-red-400 mb-1">
                    {prediction.awayWinProb}%
                  </div>
                  <div className="text-xs text-gray-500">원정팀</div>
                </div>
                
                <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-gray-700 hover:border-blue-500/50 transition-colors">
                  <div className="text-xs text-gray-400 mb-2 font-medium">{homeTeamName}</div>
                  <div className="text-4xl font-bold text-blue-400 mb-1">
                    {prediction.homeWinProb}%
                  </div>
                  <div className="text-xs text-gray-500">홈팀</div>
                </div>
              </div>
            </div>
            
            {/* 총점 예측 */}
            <div className="pt-6 border-t border-gray-700">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                총점 예측 (기준: 8.5)
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-gray-700">
                  <div className="text-xs text-gray-400 mb-2">오버</div>
                  <div className="text-2xl font-bold text-orange-400">
                    {prediction.overProb}%
                  </div>
                </div>
                
                <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-gray-700">
                  <div className="text-xs text-gray-400 mb-2">언더</div>
                  <div className="text-2xl font-bold text-purple-400">
                    {prediction.underProb}%
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI 인사이트 */}
            {insights && (
              <>
                {/* 예측 요약 */}
                <div className="pt-6 border-t border-gray-700">
                  <div className="bg-blue-900/10 border-l-4 border-blue-500 rounded-r-lg p-4">
                    <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                      분석 요약
                    </div>
                    <div className="text-sm text-gray-300 leading-relaxed">
                      {insights.summary
                        .replace(homeTeam, homeTeamName)
                        .replace(awayTeam, awayTeamName)}
                    </div>
                  </div>
                </div>
                
                {/* 주요 영향 요소 */}
                <div className="pt-6 border-t border-gray-700">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    주요 영향 요소
                  </div>
                  <div className="space-y-4">
                    {(() => {
                      const maxImpact = Math.max(...insights.keyFactors.slice(0, 3).map(f => f.impact), 1)
                      return insights.keyFactors.slice(0, 3).map((factor, idx) => {
                        const normalizedPct = Math.min((factor.impact / maxImpact) * 100, 100)
                        return (
                          <div key={idx} className="group">
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className="text-gray-300 font-medium">{factor.name}</span>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                                style={{ width: `${normalizedPct}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-1.5">{factor.description}</div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
                
                {/* 홈/원정 분석 */}
                <div className="pt-6 border-t border-gray-700">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    홈 VS 원정 전적
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-gray-700">
                      <div className="text-xs text-gray-400 mb-2">홈 승률</div>
                      <div className="text-3xl font-bold text-blue-400">{insights.homeAdvantage.homeRecord}</div>
                      <div className="text-xs text-gray-500 mt-1">{homeTeamName}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-gray-700">
                      <div className="text-xs text-gray-400 mb-2">원정 승률</div>
                      <div className="text-3xl font-bold text-red-400">{insights.homeAdvantage.awayRecord}</div>
                      <div className="text-xs text-gray-500 mt-1">{awayTeamName}</div>
                    </div>
                  </div>
                  {insights.homeAdvantage.advantage > 0.1 && (
                    <div className="mt-3 text-center">
                      <span className="inline-block bg-blue-900/30 text-blue-400 text-xs px-3 py-1 rounded-full border border-blue-500/30">
                        홈 어드밴티지 +{(insights.homeAdvantage.advantage * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                
                {/* 최근 폼 */}
                <div className="pt-6 border-t border-gray-700">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    최근 10경기 승률
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-2">{homeTeamName}</div>
                      <div className="text-3xl font-bold text-green-400">{insights.recentForm.home}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-2">{awayTeamName}</div>
                      <div className="text-3xl font-bold text-orange-400">{insights.recentForm.away}</div>
                    </div>
                  </div>
                </div>
                
                {/* 신뢰도 */}
                <div className="pt-6 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">신뢰도</span>
                    <span className={`text-sm font-bold ${getConfidenceColor(prediction.confidence)}`}>
                      {prediction.confidence}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}