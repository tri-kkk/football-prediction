import { useEffect, useState } from 'react'

interface PredictionData {
  predictions: {
    winner: {
      id: number
      name: string
      comment: string
    }
    win_or_draw: boolean
    under_over: string | null
    goals: {
      home: string
      away: string
    }
    advice: string
    percent: {
      home: string
      draw: string
      away: string
    }
  }
  comparison: {
    form: {
      home: string
      away: string
    }
    att: {
      home: string
      away: string
    }
    def: {
      home: string
      away: string
    }
    poisson_distribution: {
      home: string
      away: string
    }
    h2h: {
      home: string
      away: string
    }
    goals: {
      home: string
      away: string
    }
    total: {
      home: string
      away: string
    }
  }
}

interface MatchPredictionProps {
  fixtureId: number | string
  homeTeam: string
  awayTeam: string
  darkMode: boolean
}

export default function MatchPrediction({ 
  fixtureId, 
  homeTeam, 
  awayTeam, 
  darkMode 
}: MatchPredictionProps) {
  const [prediction, setPrediction] = useState<PredictionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/predictions?fixture=${fixtureId}`)
        
        if (!response.ok) {
          throw new Error('No prediction data available')
        }

        const data = await response.json()
        setPrediction(data)
      } catch (err: any) {
        console.log(`No prediction for fixture ${fixtureId}:`, err.message)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPrediction()
  }, [fixtureId])

  // 로딩 중
  if (loading) {
    return (
      <div className={`mt-4 p-4 rounded-xl ${
        darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-center justify-center gap-3 py-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            AI 분석 중...
          </span>
        </div>
      </div>
    )
  }

  // 에러 또는 데이터 없음 - 아무것도 렌더링하지 않음
  if (error || !prediction) {
    return null
  }

  const { predictions: pred, comparison } = prediction

  // 퍼센트를 숫자로 변환
  const homePercent = parseFloat(pred.percent.home.replace('%', ''))
  const drawPercent = parseFloat(pred.percent.draw.replace('%', ''))
  const awayPercent = parseFloat(pred.percent.away.replace('%', ''))

  // 최고 승률 찾기
  const maxPercent = Math.max(homePercent, drawPercent, awayPercent)

  return (
    <div className={`mt-4 rounded-xl overflow-hidden ${
      darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
    }`}>
      {/* 헤더 */}
      <div className={`px-4 py-3 border-b ${
        darkMode ? 'bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-gray-800' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          {/* 파비콘 이미지 사용 */}
          <img 
            src="/favicon.ico" 
            alt="AI" 
            className="w-5 h-5"
            onError={(e) => {
              // 이미지 로드 실패시 이모지로 폴백
              e.currentTarget.style.display = 'none'
              const emoji = document.createElement('span')
              emoji.textContent = '🤖'
              emoji.className = 'text-xl'
              e.currentTarget.parentNode?.insertBefore(emoji, e.currentTarget)
            }}
          />
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            경기 예측 분석
          </h3>
          <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
            darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
          }`}>
            6가지 알고리즘
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 승부 예측 - 다이나믹한 바 차트 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🎯</span>
            <h4 className={`text-xs font-bold uppercase tracking-wider ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              승부 예측
            </h4>
          </div>
          
          {/* 수평 바 차트 */}
          <div className="space-y-3 mb-4">
            {/* 홈 승률 바 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-medium truncate max-w-[120px] ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {homeTeam}
                </span>
                <span className={`text-sm font-black ${
                  homePercent === maxPercent 
                    ? (darkMode ? 'text-blue-400' : 'text-blue-600')
                    : (darkMode ? 'text-gray-500' : 'text-gray-500')
                }`}>
                  {pred.percent.home}
                </span>
              </div>
              <div className="relative h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    homePercent === maxPercent
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/50'
                      : 'bg-gradient-to-r from-blue-400 to-blue-500'
                  }`}
                  style={{ 
                    width: `${homePercent}%`,
                    animation: 'expandBar 1s ease-out'
                  }}
                >
                  {homePercent === maxPercent && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                  )}
                </div>
              </div>
            </div>

            {/* 무승부 바 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  무승부
                </span>
                <span className={`text-sm font-black ${
                  drawPercent === maxPercent 
                    ? (darkMode ? 'text-gray-300' : 'text-gray-700')
                    : (darkMode ? 'text-gray-500' : 'text-gray-500')
                }`}>
                  {pred.percent.draw}
                </span>
              </div>
              <div className="relative h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    drawPercent === maxPercent
                      ? 'bg-gradient-to-r from-gray-500 to-gray-600 shadow-lg shadow-gray-500/50'
                      : 'bg-gradient-to-r from-gray-400 to-gray-500'
                  }`}
                  style={{ 
                    width: `${drawPercent}%`,
                    animation: 'expandBar 1s ease-out 0.1s backwards'
                  }}
                >
                  {drawPercent === maxPercent && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                  )}
                </div>
              </div>
            </div>

            {/* 원정 승률 바 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-medium truncate max-w-[120px] ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {awayTeam}
                </span>
                <span className={`text-sm font-black ${
                  awayPercent === maxPercent 
                    ? (darkMode ? 'text-red-400' : 'text-red-600')
                    : (darkMode ? 'text-gray-500' : 'text-gray-500')
                }`}>
                  {pred.percent.away}
                </span>
              </div>
              <div className="relative h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    awayPercent === maxPercent
                      ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/50'
                      : 'bg-gradient-to-r from-red-400 to-red-500'
                  }`}
                  style={{ 
                    width: `${awayPercent}%`,
                    animation: 'expandBar 1s ease-out 0.2s backwards'
                  }}
                >
                  {awayPercent === maxPercent && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 승자 하이라이트 카드 */}
          <div className={`p-3 rounded-lg text-center ${
            homePercent === maxPercent
              ? (darkMode ? 'bg-blue-900/30 border-2 border-blue-600' : 'bg-blue-50 border-2 border-blue-300')
              : drawPercent === maxPercent
              ? (darkMode ? 'bg-gray-800 border-2 border-gray-600' : 'bg-gray-100 border-2 border-gray-300')
              : (darkMode ? 'bg-red-900/30 border-2 border-red-600' : 'bg-red-50 border-2 border-red-300')
          }`}>
            <div className={`text-xs font-bold mb-1 ${
              homePercent === maxPercent
                ? (darkMode ? 'text-blue-400' : 'text-blue-600')
                : drawPercent === maxPercent
                ? (darkMode ? 'text-gray-300' : 'text-gray-700')
                : (darkMode ? 'text-red-400' : 'text-red-600')
            }`}>
              예상 결과
            </div>
            <div className={`text-lg font-black ${
              homePercent === maxPercent
                ? (darkMode ? 'text-blue-400' : 'text-blue-600')
                : drawPercent === maxPercent
                ? (darkMode ? 'text-gray-300' : 'text-gray-700')
                : (darkMode ? 'text-red-400' : 'text-red-600')
            }`}>
              {homePercent === maxPercent
                ? `${homeTeam} 승리`
                : drawPercent === maxPercent
                ? '무승부'
                : `${awayTeam} 승리`
              } ({maxPercent.toFixed(0)}%)
            </div>
          </div>
        </div>

        {/* 팀 비교 분석 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">📊</span>
            <h4 className={`text-xs font-bold uppercase tracking-wider ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              팀 비교 분석
            </h4>
          </div>

          <div className="space-y-2">
            {/* 최근 폼 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                  최근 폼
                </span>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>
                    {comparison.form.home}
                  </span>
                  <span className={darkMode ? 'text-gray-600' : 'text-gray-400'}>vs</span>
                  <span className={darkMode ? 'text-red-400' : 'text-red-600'}>
                    {comparison.form.away}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700"
                  style={{ width: comparison.form.home }}
                ></div>
                <div 
                  className="bg-gradient-to-r from-red-500 to-red-600 transition-all duration-700"
                  style={{ width: comparison.form.away }}
                ></div>
              </div>
            </div>

            {/* 공격력 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                  공격력
                </span>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>
                    {comparison.att.home}
                  </span>
                  <span className={darkMode ? 'text-gray-600' : 'text-gray-400'}>vs</span>
                  <span className={darkMode ? 'text-red-400' : 'text-red-600'}>
                    {comparison.att.away}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700"
                  style={{ width: comparison.att.home }}
                ></div>
                <div 
                  className="bg-gradient-to-r from-red-500 to-red-600 transition-all duration-700"
                  style={{ width: comparison.att.away }}
                ></div>
              </div>
            </div>

            {/* 수비력 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                  수비력
                </span>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>
                    {comparison.def.home}
                  </span>
                  <span className={darkMode ? 'text-gray-600' : 'text-gray-400'}>vs</span>
                  <span className={darkMode ? 'text-red-400' : 'text-red-600'}>
                    {comparison.def.away}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700"
                  style={{ width: comparison.def.home }}
                ></div>
                <div 
                  className="bg-gradient-to-r from-red-500 to-red-600 transition-all duration-700"
                  style={{ width: comparison.def.away }}
                ></div>
              </div>
            </div>

            {/* 포아송 분포 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                  Poisson distribution
                </span>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>
                    {comparison.poisson_distribution.home}
                  </span>
                  <span className={darkMode ? 'text-gray-600' : 'text-gray-400'}>vs</span>
                  <span className={darkMode ? 'text-red-400' : 'text-red-600'}>
                    {comparison.poisson_distribution.away}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700"
                  style={{ width: comparison.poisson_distribution.home }}
                ></div>
                <div 
                  className="bg-gradient-to-r from-red-500 to-red-600 transition-all duration-700"
                  style={{ width: comparison.poisson_distribution.away }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* AI 추천 */}
        <div className={`p-3 rounded-lg ${
          darkMode ? 'bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-800/30' : 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200'
        }`}>
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">💡</span>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-bold mb-1 ${
                darkMode ? 'text-purple-400' : 'text-purple-600'
              }`}>
                Trend Soccer 추천
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {pred.advice}
              </p>
            </div>
          </div>
        </div>

        {/* 면책 조항 */}
        <div className={`text-xs text-center pt-2 border-t ${
          darkMode ? 'text-gray-600 border-gray-800' : 'text-gray-400 border-gray-200'
        }`}>
          ⚠️ 이 분석은 통계적 참고 자료이며, 베팅을 권유하지 않습니다
        </div>
      </div>

      {/* 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes expandBar {
          from {
            width: 0%;
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}