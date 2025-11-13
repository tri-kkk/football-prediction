import { useEffect, useState, useRef } from 'react'

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
    form: { home: string; away: string }
    att: { home: string; away: string }
    def: { home: string; away: string }
    poisson_distribution: { home: string; away: string }
    h2h: { home: string; away: string }
    goals: { home: string; away: string }
    total: { home: string; away: string }
  }
}

interface H2HData {
  h2h: {
    matches: Array<{
      date: string
      teams: {
        home: { name: string; winner: boolean }
        away: { name: string; winner: boolean }
      }
      goals: { home: number; away: number }
    }>
    summary: {
      total: number
      team1Wins: number
      team2Wins: number
      draws: number
      team1WinRate: string
      team2WinRate: string
    }
  }
}

interface MatchPredictionProps {
  fixtureId: number | string
  homeTeam: string
  awayTeam: string
  homeTeamKR?: string  // 한글 팀명 추가
  awayTeamKR?: string  // 한글 팀명 추가
  homeTeamId?: number
  awayTeamId?: number
  darkMode: boolean
}

export default function MatchPrediction({ 
  fixtureId, 
  homeTeam, 
  awayTeam,
  homeTeamKR,
  awayTeamKR,
  homeTeamId,
  awayTeamId,
  darkMode 
}: MatchPredictionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [prediction, setPrediction] = useState<PredictionData | null>(null)
  const [h2h, setH2h] = useState<H2HData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'h2h'>('overview')
  
  // 디버그 상태
  const [debugInfo, setDebugInfo] = useState({
    predictionStatus: 'pending' as 'pending' | 'success' | 'failed',
    h2hStatus: 'pending' as 'pending' | 'success' | 'failed' | 'skipped',
  })

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 1. Prediction 데이터 (필수)
        console.log(`🔍 Fetching prediction for fixture: ${fixtureId}`)
        const predResponse = await fetch(`/api/predictions?fixture=${fixtureId}`)
        
        if (predResponse.ok) {
          const predData = await predResponse.json()
          console.log('✅ Prediction data:', predData)
          setPrediction(predData)
          setDebugInfo(prev => ({ ...prev, predictionStatus: 'success' }))
        } else {
          console.warn(`⚠️ Prediction API failed: ${predResponse.status}`)
          
          // 기본 예측 데이터 사용 (에러 시)
          const fallbackPrediction: PredictionData = {
            predictions: {
              winner: { id: 0, name: 'Unknown', comment: '' },
              win_or_draw: false,
              under_over: null,
              goals: { home: '1.5', away: '1.5' },
              advice: '이 경기의 예측 데이터는 현재 제공되지 않습니다',
              percent: { home: '33%', draw: '34%', away: '33%' }
            },
            comparison: {
              form: { home: '50%', away: '50%' },
              att: { home: '50%', away: '50%' },
              def: { home: '50%', away: '50%' },
              poisson_distribution: { home: '50%', away: '50%' },
              h2h: { home: '50%', away: '50%' },
              goals: { home: '50%', away: '50%' },
              total: { home: '50%', away: '50%' }
            }
          }
          
          console.log('ℹ️ Using fallback prediction data')
          setPrediction(fallbackPrediction)
          setDebugInfo(prev => ({ ...prev, predictionStatus: 'fallback' as any }))
        }

        // 2. H2H 데이터 (선택, 팀 ID 필요)
        if (homeTeamId && awayTeamId) {
          console.log(`🔍 Fetching H2H for teams: ${homeTeamId} vs ${awayTeamId}`)
          
          fetch(`/api/h2h-enhanced?team1=${homeTeamId}&team2=${awayTeamId}&last=5`)
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json()
                console.log('✅ H2H data:', data)
                setH2h(data)
                setDebugInfo(prev => ({ ...prev, h2hStatus: 'success' }))
              } else {
                console.warn('⚠️ H2H API failed')
                setDebugInfo(prev => ({ ...prev, h2hStatus: 'failed' }))
              }
            })
            .catch(err => {
              console.error('❌ H2H fetch error:', err)
              setDebugInfo(prev => ({ ...prev, h2hStatus: 'failed' }))
            })
        } else {
          console.log('ℹ️ Skipping H2H (no team IDs)')
          setDebugInfo(prev => ({ ...prev, h2hStatus: 'skipped' }))
        }

      } catch (err) {
        console.error('❌ Fetch error:', err)
        
        // 에러 시 폴백 데이터
        const fallbackPrediction: PredictionData = {
          predictions: {
            winner: { id: 0, name: 'Unknown', comment: '' },
            win_or_draw: false,
            under_over: null,
            goals: { home: '1.5', away: '1.5' },
            advice: '경기 예측 데이터를 불러올 수 없습니다',
            percent: { home: '33%', draw: '34%', away: '33%' }
          },
          comparison: {
            form: { home: '50%', away: '50%' },
            att: { home: '50%', away: '50%' },
            def: { home: '50%', away: '50%' },
            poisson_distribution: { home: '50%', away: '50%' },
            h2h: { home: '50%', away: '50%' },
            goals: { home: '50%', away: '50%' },
            total: { home: '50%', away: '50%' }
          }
        }
        
        setPrediction(fallbackPrediction)
        setDebugInfo(prev => ({ ...prev, predictionStatus: 'error' as any }))
        setError('일부 예측 데이터를 사용할 수 없습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [fixtureId, homeTeamId, awayTeamId])

  // 레이더 차트 그리기
  useEffect(() => {
    console.log('🎨 Radar chart effect triggered')
    console.log('- prediction:', prediction ? 'exists' : 'null')
    console.log('- canvasRef.current:', canvasRef.current ? 'exists' : 'null')
    console.log('- activeTab:', activeTab)
    
    if (!prediction || !canvasRef.current) {
      console.log('⚠️ Radar chart: Missing requirements')
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.log('❌ Radar chart: No canvas context')
      return
    }

    console.log('✅ Drawing radar chart...')
    console.log('- comparison:', prediction.comparison)

    const { comparison } = prediction
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 40

    const categories = [
      { label: '최근폼', home: parseFloat(comparison.form.home.replace('%', '')), away: parseFloat(comparison.form.away.replace('%', '')), angle: 0 },
      { label: '공격력', home: parseFloat(comparison.att.home.replace('%', '')), away: parseFloat(comparison.att.away.replace('%', '')), angle: Math.PI / 3 },
      { label: '수비력', home: parseFloat(comparison.def.home.replace('%', '')), away: parseFloat(comparison.def.away.replace('%', '')), angle: 2 * Math.PI / 3 },
      { label: '득점력', home: parseFloat(comparison.goals.home.replace('%', '')), away: parseFloat(comparison.goals.away.replace('%', '')), angle: Math.PI },
      { label: '상대전적', home: parseFloat(comparison.h2h.home.replace('%', '')), away: parseFloat(comparison.h2h.away.replace('%', '')), angle: 4 * Math.PI / 3 },
      { label: '포아송', home: parseFloat(comparison.poisson_distribution.home.replace('%', '')), away: parseFloat(comparison.poisson_distribution.away.replace('%', '')), angle: 5 * Math.PI / 3 },
    ]

    console.log('- categories:', categories)

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 배경 그리드
    ctx.strokeStyle = darkMode ? '#374151' : '#e5e7eb'
    ctx.lineWidth = 1
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath()
      const r = (radius / 5) * i
      categories.forEach((cat, idx) => {
        const x = centerX + r * Math.cos(cat.angle - Math.PI / 2)
        const y = centerY + r * Math.sin(cat.angle - Math.PI / 2)
        if (idx === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()
      ctx.stroke()
    }

    // 축 선
    categories.forEach(cat => {
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      const x = centerX + radius * Math.cos(cat.angle - Math.PI / 2)
      const y = centerY + radius * Math.sin(cat.angle - Math.PI / 2)
      ctx.lineTo(x, y)
      ctx.stroke()
    })

    // 라벨
    ctx.fillStyle = darkMode ? '#9ca3af' : '#6b7280'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    categories.forEach(cat => {
      const labelRadius = radius + 20
      const x = centerX + labelRadius * Math.cos(cat.angle - Math.PI / 2)
      const y = centerY + labelRadius * Math.sin(cat.angle - Math.PI / 2)
      ctx.fillText(cat.label, x, y)
    })

    // Away 팀 (빨강)
    ctx.beginPath()
    categories.forEach((cat, idx) => {
      const r = (cat.away / 100) * radius
      const x = centerX + r * Math.cos(cat.angle - Math.PI / 2)
      const y = centerY + r * Math.sin(cat.angle - Math.PI / 2)
      if (idx === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'
    ctx.fill()
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 2
    ctx.stroke()

    // Home 팀 (파랑)
    ctx.beginPath()
    categories.forEach((cat, idx) => {
      const r = (cat.home / 100) * radius
      const x = centerX + r * Math.cos(cat.angle - Math.PI / 2)
      const y = centerY + r * Math.sin(cat.angle - Math.PI / 2)
      if (idx === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'
    ctx.fill()
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.stroke()

    console.log('✅ Radar chart drawn successfully')
  }, [prediction, darkMode, activeTab])

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

  // 에러 또는 데이터 없음
  if (error || !prediction) {
    return null
  }

  const { predictions: pred, comparison } = prediction

  const homePercent = parseFloat(pred.percent.home.replace('%', ''))
  const drawPercent = parseFloat(pred.percent.draw.replace('%', ''))
  const awayPercent = parseFloat(pred.percent.away.replace('%', ''))
  const maxPercent = Math.max(homePercent, drawPercent, awayPercent)

  // 한글 팀명 사용 (없으면 영문 팀명)
  const homeTeamDisplay = homeTeamKR || homeTeam
  const awayTeamDisplay = awayTeamKR || awayTeam

  // 예상 스코어 계산 - 더 현실적으로 조정 (평균 2.5골 기준)
  const rawHomeGoals = Math.abs(parseFloat(pred.goals.home))
  const rawAwayGoals = Math.abs(parseFloat(pred.goals.away))
  const totalRawGoals = rawHomeGoals + rawAwayGoals
  
  // 총 득점이 4골 이상이면 비율 조정
  let homeGoals, awayGoals
  if (totalRawGoals > 4) {
    // 비율 유지하면서 총합을 3-4골로 제한
    const scale = 3.5 / totalRawGoals
    homeGoals = Math.max(0, Math.round(rawHomeGoals * scale))
    awayGoals = Math.max(0, Math.round(rawAwayGoals * scale))
  } else {
    homeGoals = Math.round(rawHomeGoals)
    awayGoals = Math.round(rawAwayGoals)
  }
  
  const winnerInfo = homeGoals > awayGoals
    ? { team: homeTeamDisplay, percent: homePercent, color: 'blue' as const, result: '승리' }
    : homeGoals < awayGoals
    ? { team: awayTeamDisplay, percent: awayPercent, color: 'red' as const, result: '승리' }
    : { team: '무승부', percent: drawPercent, color: 'gray' as const, result: '예상' }

  // 인사이트 생성 (부상자 제외, 아이콘 제거)
  const insights: Array<{ text: string; type: 'positive' | 'neutral' | 'negative' }> = []

  const homeFormValue = parseFloat(comparison.form.home)
  const awayFormValue = parseFloat(comparison.form.away)
  
  if (homeFormValue > 70) {
    insights.push({ text: `${homeTeamDisplay}의 최근 폼이 매우 좋습니다 (${comparison.form.home})`, type: 'positive' })
  }
  if (awayFormValue > 70) {
    insights.push({ text: `${awayTeamDisplay}의 최근 폼이 매우 좋습니다 (${comparison.form.away})`, type: 'positive' })
  }

  // H2H 인사이트
  if (h2h?.h2h) {
    const { summary } = h2h.h2h
    if (summary.total >= 3) {
      const team1WinRate = parseFloat(summary.team1WinRate)
      const team2WinRate = parseFloat(summary.team2WinRate)
      
      if (team1WinRate >= 60) {
        insights.push({ 
          text: `최근 ${summary.total}경기에서 ${homeTeamDisplay}이 ${summary.team1Wins}승으로 우세합니다`, 
          type: 'positive' 
        })
      } else if (team2WinRate >= 60) {
        insights.push({ 
          text: `최근 ${summary.total}경기에서 ${awayTeamDisplay}이 ${summary.team2Wins}승으로 우세합니다`, 
          type: 'positive' 
        })
      }
    }
  }

  // 공격력/수비력 분석
  const homeAttValue = parseFloat(comparison.att.home)
  const awayDefValue = parseFloat(comparison.def.away)
  
  if (homeAttValue > 70 && awayDefValue < 40) {
    insights.push({ 
      text: `${homeTeamDisplay}의 강력한 공격 vs ${awayTeamDisplay}의 약한 수비 - 다득점 가능성`, 
      type: 'positive' 
    })
  }
  
  const awayAttValue = parseFloat(comparison.att.away)
  const homeDefValue = parseFloat(comparison.def.home)
  
  if (awayAttValue > 70 && homeDefValue < 40) {
    insights.push({ 
      text: `${awayTeamDisplay}의 강력한 공격 vs ${homeTeamDisplay}의 약한 수비 - 다득점 가능성`, 
      type: 'positive' 
    })
  }

  // 예상 득점 분석
  const totalGoals = homeGoals + awayGoals
  if (totalGoals >= 4) {
    insights.push({ text: `예상 총 득점 ${totalGoals}골 - 박진감 넘치는 경기 예상`, type: 'neutral' })
  } else if (totalGoals <= 2) {
    insights.push({ text: `예상 총 득점 ${totalGoals}골 - 수비적인 경기 예상`, type: 'neutral' })
  }

  // 비교 통계 (레이더 차트용)
  const comparisonStats = [
    { label: '최근폼', icon: '📈', home: comparison.form.home, away: comparison.form.away },
    { label: '공격력', icon: '⚔️', home: comparison.att.home, away: comparison.att.away },
    { label: '수비력', icon: '🛡️', home: comparison.def.home, away: comparison.def.away },
    { label: '득점력', icon: '⚽', home: comparison.goals.home, away: comparison.goals.away },
    { label: '상대전적', icon: '📊', home: comparison.h2h.home, away: comparison.h2h.away },
    { label: '포아송', icon: '📉', home: comparison.poisson_distribution.home, away: comparison.poisson_distribution.away },
  ]

  return (
    <div className={`mt-4 rounded-xl overflow-hidden ${
      darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-gray-50 border border-gray-200'
    }`}>
      {/* 탭 헤더 */}
      <div className={`flex border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        {(['overview', 'stats', 'h2h'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? darkMode
                  ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400'
                  : 'bg-white text-blue-600 border-b-2 border-blue-600'
                : darkMode
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-900/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab === 'overview' && '📊 개요'}
            {tab === 'stats' && '📈 상세통계'}
            {tab === 'h2h' && '🔄 상대전적'}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div className="p-4">
        {/* 개요 탭 */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* 예상 결과 & 스코어 통합 카드 - 매우 컴팩트 */}
            <div className={`rounded-xl overflow-hidden ${
              darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'
            }`}>
              <div className="p-4">
                {/* 예상 승자 */}
                <div className="text-center mb-3">
                  <div className={`inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-lg ${
                    winnerInfo.color === 'blue' ? (darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200')
                    : winnerInfo.color === 'gray' ? (darkMode ? 'bg-gray-500/10 border border-gray-500/20' : 'bg-gray-50 border border-gray-300')
                    : (darkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200')
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      winnerInfo.color === 'blue' ? 'bg-blue-500' :
                      winnerInfo.color === 'gray' ? 'bg-gray-500' :
                      'bg-red-500'
                    }`}></div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      winnerInfo.color === 'blue' ? (darkMode ? 'text-blue-400' : 'text-blue-600')
                      : winnerInfo.color === 'gray' ? (darkMode ? 'text-gray-400' : 'text-gray-600')
                      : (darkMode ? 'text-red-400' : 'text-red-600')
                    }`}>
                      예상 결과
                    </span>
                  </div>
                  <div className={`text-lg font-bold mb-1 ${
                    darkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    {winnerInfo.team}
                  </div>
                  <div className={`text-3xl font-black ${
                    winnerInfo.color === 'blue' ? (darkMode ? 'text-blue-400' : 'text-blue-600')
                    : winnerInfo.color === 'gray' ? (darkMode ? 'text-gray-400' : 'text-gray-600')
                    : (darkMode ? 'text-red-400' : 'text-red-600')
                  }`}>
                    {winnerInfo.percent.toFixed(0)}%
                  </div>
                </div>

                {/* 구분선 */}
                <div className={`h-px my-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>

                {/* 예상 스코어 - 중앙 정렬만 */}
                <div>
                  <div className="text-center mb-2">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${
                      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        예상 스코어
                      </span>
                    </div>
                  </div>
                  
                  {/* 스코어만 중앙에 크게 */}
                  <div className="flex items-center justify-center gap-4">
                    <div className={`text-4xl font-black ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {homeGoals}
                    </div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-gray-700' : 'text-gray-300'}`}>
                      :
                    </div>
                    <div className={`text-4xl font-black ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                      {awayGoals}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI 인사이트 */}
            {insights.length > 0 ? (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg ${
                  darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <h4 className={`text-sm font-bold uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Trend 인사이트
                  </h4>
                  <div className={`ml-auto text-xs font-medium ${
                    darkMode ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    {insights.length}개
                  </div>
                </div>
                <div className="space-y-2">
                  {insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg flex items-start gap-3 ${
                        darkMode 
                          ? 'bg-gray-900 border border-gray-800 hover:border-gray-700' 
                          : 'bg-white border border-gray-200 hover:border-gray-300'
                      } transition-colors`}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                        darkMode 
                          ? 'bg-gray-800 text-gray-400 border border-gray-700' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {idx + 1}
                      </div>
                      <p className={`text-sm flex-1 leading-relaxed ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {insight.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`p-6 rounded-lg text-center ${
                darkMode 
                  ? 'bg-gray-900 border border-gray-800' 
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-200'
                }`}>
                  <span className="text-xl">💡</span>
                </div>
                <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  기본 예측 분석을 제공합니다
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-500'}`}>
                  더 자세한 인사이트는 곧 추가될 예정입니다
                </p>
              </div>
            )}
          </div>
        )}

        {/* 상세통계 탭 */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <canvas ref={canvasRef} width={300} height={300} className="max-w-full" />
            </div>
            
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{homeTeamDisplay}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{awayTeamDisplay}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {comparisonStats.map((stat, idx) => {
                const homeVal = parseFloat(stat.home.replace('%', ''))
                const awayVal = parseFloat(stat.away.replace('%', ''))
                const isHomeLeading = homeVal > awayVal
                
                return (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-xs">{stat.icon}</span>
                      <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {stat.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-bold ${
                        isHomeLeading ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-gray-500' : 'text-gray-400')
                      }`}>
                        {stat.home}
                      </span>
                      <span className={`text-sm font-bold ${
                        !isHomeLeading ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-gray-500' : 'text-gray-400')
                      }`}>
                        {stat.away}
                      </span>
                    </div>
                    <div className="flex gap-1 h-1.5 rounded-full overflow-hidden">
                      <div className={`transition-all duration-700 ${
                        isHomeLeading ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-500'
                      }`} style={{ width: stat.home }}></div>
                      <div className={`transition-all duration-700 ${
                        !isHomeLeading ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gray-500'
                      }`} style={{ width: stat.away }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 상대전적 탭 */}
        {activeTab === 'h2h' && (
          <div className="space-y-4">
            {h2h?.h2h ? (
              <>
                {/* 요약 카드 */}
                <div className={`p-4 rounded-lg ${
                  darkMode ? 'bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-800/30' : 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">📊</span>
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      최근 {h2h.h2h.summary.total}경기 전적
                    </h4>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className={`text-2xl font-black mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {h2h.h2h.summary.team1Wins}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>승</div>
                      <div className={`text-xs font-medium ${darkMode ? 'text-blue-400/70' : 'text-blue-600/70'}`}>
                        {h2h.h2h.summary.team1WinRate}
                      </div>
                    </div>
                    <div>
                      <div className={`text-2xl font-black mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {h2h.h2h.summary.draws}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>무</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-black mb-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        {h2h.h2h.summary.team2Wins}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>승</div>
                      <div className={`text-xs font-medium ${darkMode ? 'text-red-400/70' : 'text-red-600/70'}`}>
                        {h2h.h2h.summary.team2WinRate}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 최근 경기 목록 */}
                <div className="space-y-2">
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    최근 경기
                  </h4>
                  {h2h.h2h.matches.slice(0, 5).map((match, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${
                      darkMode ? 'bg-gray-900/50 border border-gray-800' : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-left">
                          <span className={`text-sm ${
                            match.teams.home.winner ? 'font-bold' : ''
                          } ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {match.teams.home.name}
                          </span>
                        </div>
                        <div className="px-3">
                          <span className={`text-sm font-bold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {match.goals.home} - {match.goals.away}
                          </span>
                        </div>
                        <div className="flex-1 text-right">
                          <span className={`text-sm ${
                            match.teams.away.winner ? 'font-bold' : ''
                          } ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {match.teams.away.name}
                          </span>
                        </div>
                      </div>
                      <div className={`text-xs mt-1 text-center ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {new Date(match.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className={`p-6 rounded-lg text-center ${
                darkMode ? 'bg-gray-900/50 border border-gray-800' : 'bg-gray-50 border border-gray-200'
              }`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  ℹ️ 상대전적 데이터가 없습니다
                </p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  (팀 ID가 필요하거나 최근 맞대결 기록이 없습니다)
                </p>
              </div>
            )}
          </div>
        )}

        {/* 면책 조항 */}
        <div className={`text-xs text-center pt-4 mt-4 border-t ${
          darkMode ? 'text-gray-600 border-gray-800' : 'text-gray-400 border-gray-200'
        }`}>
          ⚠️ 이 분석은 통계적 참고 자료입니다.       </div>


      </div>

      {/* 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}