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
          // 404나 다른 에러는 조용히 처리
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

  return (
    <div className={`mt-4 rounded-xl overflow-hidden ${
      darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
    }`}>
      {/* 헤더 */}
      <div className={`px-4 py-3 border-b ${
        darkMode ? 'bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-gray-800' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            AI 경기 예측 분석
          </h3>
          <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
            darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
          }`}>
            6가지 알고리즘
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 승부 예측 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🎯</span>
            <h4 className={`text-xs font-bold uppercase tracking-wider ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              승부 예측
            </h4>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {/* 홈 승률 */}
            <div className={`p-3 rounded-lg text-center ${
              darkMode ? 'bg-blue-900/20' : 'bg-blue-50'
            }`}>
              <div className={`text-xs mb-1 font-medium truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {homeTeam}
              </div>
              <div className={`text-2xl font-black ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {pred.percent.home}
              </div>
            </div>

            {/* 무승부 */}
            <div className={`p-3 rounded-lg text-center ${
              darkMode ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              <div className={`text-xs mb-1 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                무승부
              </div>
              <div className={`text-2xl font-black ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {pred.percent.draw}
              </div>
            </div>

            {/* 원정 승률 */}
            <div className={`p-3 rounded-lg text-center ${
              darkMode ? 'bg-red-900/20' : 'bg-red-50'
            }`}>
              <div className={`text-xs mb-1 font-medium truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {awayTeam}
              </div>
              <div className={`text-2xl font-black ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {pred.percent.away}
              </div>
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
              <div className="flex gap-1 h-2">
                <div 
                  className="bg-blue-500 rounded-l transition-all"
                  style={{ width: comparison.form.home }}
                ></div>
                <div 
                  className="bg-red-500 rounded-r transition-all"
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
              <div className="flex gap-1 h-2">
                <div 
                  className="bg-blue-500 rounded-l transition-all"
                  style={{ width: comparison.att.home }}
                ></div>
                <div 
                  className="bg-red-500 rounded-r transition-all"
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
              <div className="flex gap-1 h-2">
                <div 
                  className="bg-blue-500 rounded-l transition-all"
                  style={{ width: comparison.def.home }}
                ></div>
                <div 
                  className="bg-red-500 rounded-r transition-all"
                  style={{ width: comparison.def.away }}
                ></div>
              </div>
            </div>

            {/* 포아송 분포 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                  포아송 분포
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
              <div className="flex gap-1 h-2">
                <div 
                  className="bg-blue-500 rounded-l transition-all"
                  style={{ width: comparison.poisson_distribution.home }}
                ></div>
                <div 
                  className="bg-red-500 rounded-r transition-all"
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
                AI 추천
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
    </div>
  )
}