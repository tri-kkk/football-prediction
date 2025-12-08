import { useEffect, useState, useRef } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import MatchTrendChart from './MatchTrendChart'
import { getTeamLogo, TEAM_NAME_KR } from '../teamLogos'

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

// 🆕 H2H 데이터 구조
interface H2HMatch {
  date: string
  league: string
  homeTeam: string
  awayTeam: string
  homeTeamId: number      // ✅ 추가!
  awayTeamId: number      // ✅ 추가!
  homeScore: number
  awayScore: number
  winner: 'home' | 'away' | 'draw'
  isHomeTeamHome: boolean
}

interface FormMatch {
  date: string
  opponent: string
  score: string
  result: 'W' | 'D' | 'L'
  isHome: boolean
}

interface Statistics {
  totalMatches: number
  homeWins: number
  draws: number
  awayWins: number
  homeWinPercentage: number
  drawPercentage: number
  awayWinPercentage: number
  avgGoalsHome: string
  avgGoalsAway: string
}

interface H2HData {
  h2hMatches: H2HMatch[]
  homeForm: FormMatch[]
  awayForm: FormMatch[]
  statistics: Statistics
}

interface H2HDataOld {
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

interface TrendData {
  timestamp: string
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
}

interface MatchPredictionProps {
  fixtureId: number | string
  homeTeam: string
  awayTeam: string
  homeTeamKR?: string
  awayTeamKR?: string
  homeTeamId?: number
  awayTeamId?: number
  league?: string // 🆕 리그 정보
  trendData?: TrendData[]
  darkMode: boolean
}

// ✅ 한글 팀명 변환 함수
const getKoreanTeamName = (teamName: string): string => {
  return TEAM_NAME_KR[teamName] || teamName
}

// 🆕 개선된 현실적인 스코어 계산 함수 (v3)
// 문제점: 1-1 예측이 너무 많음 (90%+)
// 해결: 승률 기반 로직 강화, 무승부 조건 엄격화

// 🆕 승률로 결과 결정 (핵심 로직)
function determineResult(
  homeWinPercent: number, 
  drawPercent: number, 
  awayWinPercent: number
): 'home' | 'draw' | 'away' {
  
  // 1. 무승부가 확실히 가장 높을 때만 무승부 예측
  // (무승부가 홈과 원정 둘 다보다 높아야 함)
  if (drawPercent > homeWinPercent && drawPercent > awayWinPercent && drawPercent >= 33) {
    return 'draw'
  }
  
  // 2. 홈 vs 원정 비교
  if (homeWinPercent > awayWinPercent) {
    return 'home'
  } else if (awayWinPercent > homeWinPercent) {
    return 'away'
  }
  
  // 3. 완전히 같으면 홈 어드밴티지
  return 'home'
}

// 🆕 승률만으로 스코어 예측 (기대골 없을 때)
function calculateFromWinPercent(
  homeWinPercent: number, 
  drawPercent: number, 
  awayWinPercent: number
): { home: number; away: number } {
  
  const result = determineResult(homeWinPercent, drawPercent, awayWinPercent)
  
  if (result === 'home') {
    if (homeWinPercent > 65) return { home: 3, away: 0 }
    if (homeWinPercent > 55) return { home: 2, away: 0 }
    if (homeWinPercent > 45) return { home: 2, away: 1 }
    return { home: 1, away: 0 }
  } else if (result === 'away') {
    if (awayWinPercent > 65) return { home: 0, away: 3 }
    if (awayWinPercent > 55) return { home: 0, away: 2 }
    if (awayWinPercent > 45) return { home: 1, away: 2 }
    return { home: 0, away: 1 }
  } else {
    // 무승부
    if (drawPercent > 35) return { home: 1, away: 1 }
    return { home: 2, away: 2 }
  }
}

function calculateRealisticScore(
  avgHome: number, 
  avgAway: number, 
  homeWinPercent: number, 
  drawPercent: number, 
  awayWinPercent: number
): { home: number; away: number } {
  
  // 🔥 음수 또는 유효하지 않은 데이터 처리
  if (avgHome < 0 || avgAway < 0 || isNaN(avgHome) || isNaN(avgAway)) {
    console.warn('⚠️ Invalid goal data, using win percentages only:', { avgHome, avgAway })
    return calculateFromWinPercent(homeWinPercent, drawPercent, awayWinPercent)
  }
  
  // 🆕 핵심 로직: 승률 기반으로 결과 결정
  const result = determineResult(homeWinPercent, drawPercent, awayWinPercent)
  
  // 기대골 기반 스코어 계산
  let homeGoals: number
  let awayGoals: number
  
  // 리그 평균 반영 (너무 낮은 기대골 보정)
  const adjustedHome = Math.max(avgHome, 0.8)
  const adjustedAway = Math.max(avgAway, 0.7)
  
  if (result === 'home') {
    // 홈 승리 예측
    const dominance = homeWinPercent - awayWinPercent
    
    if (dominance > 40) {
      // 압도적 우세 (예: 75-15-10) → 3-0, 3-1, 4-0
      homeGoals = Math.max(3, Math.round(adjustedHome * 1.3))
      awayGoals = dominance > 50 ? 0 : Math.min(1, Math.round(adjustedAway * 0.5))
    } else if (dominance > 25) {
      // 확실한 우세 (예: 58-22-21) → 2-0, 2-1, 3-1
      homeGoals = Math.max(2, Math.round(adjustedHome))
      awayGoals = Math.round(adjustedAway * 0.6)
    } else if (dominance > 10) {
      // 약간 우세 (예: 47-28-25) → 2-1, 1-0
      homeGoals = Math.max(1, Math.round(adjustedHome * 0.9))
      awayGoals = Math.max(0, Math.round(adjustedAway * 0.7))
      // 홈이 우세하면 최소 1골 차 보장
      if (homeGoals <= awayGoals) {
        homeGoals = awayGoals + 1
      }
    } else {
      // 미세 우세 (예: 40-30-30) → 1-0, 2-1
      homeGoals = Math.max(1, Math.round(adjustedHome * 0.8))
      awayGoals = Math.round(adjustedAway * 0.6)
      if (homeGoals <= awayGoals) {
        homeGoals = awayGoals + 1
      }
    }
  } else if (result === 'away') {
    // 원정 승리 예측
    const dominance = awayWinPercent - homeWinPercent
    
    if (dominance > 40) {
      // 압도적 우세 → 0-3, 1-3, 0-4
      awayGoals = Math.max(3, Math.round(adjustedAway * 1.3))
      homeGoals = dominance > 50 ? 0 : Math.min(1, Math.round(adjustedHome * 0.5))
    } else if (dominance > 25) {
      // 확실한 우세 → 0-2, 1-2, 1-3
      awayGoals = Math.max(2, Math.round(adjustedAway))
      homeGoals = Math.round(adjustedHome * 0.6)
    } else if (dominance > 10) {
      // 약간 우세 → 1-2, 0-1
      awayGoals = Math.max(1, Math.round(adjustedAway * 0.9))
      homeGoals = Math.max(0, Math.round(adjustedHome * 0.7))
      if (awayGoals <= homeGoals) {
        awayGoals = homeGoals + 1
      }
    } else {
      // 미세 우세 → 0-1, 1-2
      awayGoals = Math.max(1, Math.round(adjustedAway * 0.8))
      homeGoals = Math.round(adjustedHome * 0.6)
      if (awayGoals <= homeGoals) {
        awayGoals = homeGoals + 1
      }
    }
  } else {
    // 무승부 예측 (drawPercent가 가장 높을 때만)
    const avgGoals = (adjustedHome + adjustedAway) / 2
    
    if (avgGoals >= 2.5) {
      // 다득점 예상 → 2-2
      homeGoals = 2
      awayGoals = 2
    } else if (avgGoals >= 1.5) {
      // 중간 → 1-1
      homeGoals = 1
      awayGoals = 1
    } else {
      // 저득점 예상 → 0-0 또는 1-1
      homeGoals = 1
      awayGoals = 1
    }
  }
  
  // 최대 골 제한 (현실성)
  homeGoals = Math.min(homeGoals, 5)
  awayGoals = Math.min(awayGoals, 5)
  
  console.log(`📊 Score prediction:`)
  console.log(`  - Win%: ${homeWinPercent}% / ${drawPercent}% / ${awayWinPercent}%`)
  console.log(`  - Expected goals: ${avgHome.toFixed(2)} - ${avgAway.toFixed(2)}`)
  console.log(`  - Result: ${result} → ${homeGoals}-${awayGoals}`)
  
  return { home: homeGoals, away: awayGoals }
}

export default function MatchPrediction({ 
  fixtureId, 
  homeTeam, 
  awayTeam,
  homeTeamKR,
  awayTeamKR,
  homeTeamId,
  awayTeamId,
  league,
  trendData: propsTrendData = [],
  darkMode 
}: MatchPredictionProps) {
  const { language } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [prediction, setPrediction] = useState<PredictionData | null>(null)
  const [h2hOld, setH2hOld] = useState<H2HDataOld | null>(null)
  const [h2h, setH2h] = useState<H2HData | null>(null) // 🆕 새로운 H2H 데이터
  const [trendData, setTrendData] = useState<TrendData[]>(propsTrendData)
  const [loading, setLoading] = useState(true)
  const [h2hLoading, setH2hLoading] = useState(false) // 🆕 H2H 로딩 상태
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'h2h' | 'form' | 'trend'>('overview')
  
  // 🆕 팀 로고
  const homeTeamLogo = getTeamLogo(homeTeam)
  const awayTeamLogo = getTeamLogo(awayTeam)
  
  const [debugInfo, setDebugInfo] = useState({
    predictionStatus: 'pending' as 'pending' | 'success' | 'failed',
    h2hStatus: 'pending' as 'pending' | 'success' | 'failed' | 'skipped',
  })

  useEffect(() => {
    if (propsTrendData && propsTrendData.length > 0) {
      console.log('📊 Trend data from props:', propsTrendData.length)
      setTrendData(propsTrendData)
    }
  }, [propsTrendData])

  // 🆕 H2H 데이터 로딩 함수
  const loadH2HData = async () => {
    if (h2h || h2hLoading) return
    
    try {
      setH2hLoading(true)
      console.log(`🔍 Fetching H2H data: ${homeTeam} vs ${awayTeam}`)
      
      const response = await fetch(
        `/api/h2h?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}&league=${league}`
      )
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ H2H data loaded:', data)
        setH2h(data)
        setDebugInfo(prev => ({ ...prev, h2hStatus: 'success' }))
      } else {
        console.warn('⚠️ H2H API failed')
        setDebugInfo(prev => ({ ...prev, h2hStatus: 'failed' }))
      }
    } catch (err) {
      console.error('❌ H2H fetch error:', err)
      setDebugInfo(prev => ({ ...prev, h2hStatus: 'failed' }))
    } finally {
      setH2hLoading(false)
    }
  }

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 🔥 0. DB에서 스코어 먼저 조회
        console.log(`🔍 Fetching score from DB for match: ${fixtureId}`)
        let dbScore: { home: number; away: number } | null = null
        let dbProbabilities: { home: number; draw: number; away: number } | null = null

        try {
          const dbResponse = await fetch(`/api/match-score?match_id=${fixtureId}`)
          if (dbResponse.ok) {
            const dbData = await dbResponse.json()
            if (dbData.success && dbData.data) {
              dbScore = {
                home: dbData.data.predictedScoreHome,
                away: dbData.data.predictedScoreAway
              }
              dbProbabilities = {
                home: dbData.data.homeProbability,
                draw: dbData.data.drawProbability,
                away: dbData.data.awayProbability
              }
              console.log('✅ DB score found:', dbScore)
              console.log('✅ DB probabilities:', dbProbabilities)
            }
          }
        } catch (dbError) {
          console.warn('⚠️ DB score fetch failed, will use prediction API:', dbError)
        }

        // 1. Prediction 데이터 (필수)
        console.log(`🔍 Fetching prediction for fixture: ${fixtureId}`)
        const predResponse = await fetch(`/api/predictions?fixture=${fixtureId}`)
        
        if (predResponse.ok) {
          const predData = await predResponse.json()
          console.log('✅ Prediction data:', predData)
          
          // 🔥 DB 스코어가 있으면 덮어쓰기
          if (dbScore) {
            predData.predictions.goals = {
              home: dbScore.home.toString(),
              away: dbScore.away.toString()
            }
            console.log('🔄 Overriding API goals with DB score:', dbScore)
          }
          
          // 🔥 DB 확률이 있으면 덮어쓰기
          if (dbProbabilities) {
            predData.predictions.percent = {
              home: `${dbProbabilities.home.toFixed(1)}%`,
              draw: `${dbProbabilities.draw.toFixed(1)}%`,
              away: `${dbProbabilities.away.toFixed(1)}%`
            }
            console.log('🔄 Overriding API probabilities with DB:', dbProbabilities)
          }
          
          setPrediction(predData)
          setDebugInfo(prev => ({ ...prev, predictionStatus: 'success' }))
        } else {
          console.warn(`⚠️ Prediction API failed: ${predResponse.status}`)
          
          // 🔥 DB 스코어가 있으면 그걸로 fallback
          const fallbackPrediction: PredictionData = {
            predictions: {
              winner: { id: 0, name: 'Unknown', comment: '' },
              win_or_draw: false,
              under_over: null,
              goals: dbScore 
                ? { home: dbScore.home.toString(), away: dbScore.away.toString() }
                : { home: '1.5', away: '1.5' },
              advice: dbScore 
                ? 'DB에 저장된 예측 스코어를 사용합니다'
                : '이 경기의 예측 데이터는 현재 제공되지 않습니다',
              percent: dbProbabilities
                ? {
                    home: `${dbProbabilities.home.toFixed(1)}%`,
                    draw: `${dbProbabilities.draw.toFixed(1)}%`,
                    away: `${dbProbabilities.away.toFixed(1)}%`
                  }
                : { home: '33%', draw: '34%', away: '33%' }
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
          
          console.log('ℹ️ Using fallback prediction data' + (dbScore ? ' (with DB score)' : ''))
          setPrediction(fallbackPrediction)
          setDebugInfo(prev => ({ ...prev, predictionStatus: 'fallback' as any }))
        }

        // 2. 기존 H2H 데이터 (선택, 팀 ID 필요) - overview 탭용
        if (homeTeamId && awayTeamId) {
          console.log(`🔍 Fetching H2H for teams: ${homeTeamId} vs ${awayTeamId}`)
          
          fetch(`/api/h2h-enhanced?team1=${homeTeamId}&team2=${awayTeamId}&last=5`)
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json()
                console.log('✅ H2H data:', data)
                setH2hOld(data)
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

  // 🆕 H2H/Form 탭 클릭 시 데이터 로드
  useEffect(() => {
    if ((activeTab === 'h2h' || activeTab === 'form') && !h2h && !h2hLoading) {
      loadH2HData()
    }
  }, [activeTab])

  // 레이더 차트 그리기 (stats 탭에서만)
  useEffect(() => {
    if (activeTab !== 'stats') {
      return
    }
    
    console.log('🎨 Radar chart effect triggered')
    
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

    const { comparison } = prediction
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 40

    const categories = [
      { label: language === 'ko' ? '최근폼' : 'Form', home: parseFloat(comparison.form.home.replace('%', '')), away: parseFloat(comparison.form.away.replace('%', '')), angle: 0 },
      { label: language === 'ko' ? '공격력' : 'Attack', home: parseFloat(comparison.att.home.replace('%', '')), away: parseFloat(comparison.att.away.replace('%', '')), angle: Math.PI / 3 },
      { label: language === 'ko' ? '수비력' : 'Defense', home: parseFloat(comparison.def.home.replace('%', '')), away: parseFloat(comparison.def.away.replace('%', '')), angle: 2 * Math.PI / 3 },
      { label: language === 'ko' ? '득점력' : 'Goals', home: parseFloat(comparison.goals.home.replace('%', '')), away: parseFloat(comparison.goals.away.replace('%', '')), angle: Math.PI },
      { label: language === 'ko' ? '상대전적' : 'H2H', home: parseFloat(comparison.h2h.home.replace('%', '')), away: parseFloat(comparison.h2h.away.replace('%', '')), angle: 4 * Math.PI / 3 },
      { label: language === 'ko' ? '포아송' : 'Poisson', home: parseFloat(comparison.poisson_distribution.home.replace('%', '')), away: parseFloat(comparison.poisson_distribution.away.replace('%', '')), angle: 5 * Math.PI / 3 },
    ]

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
            트렌드 분석 중...
          </span>
        </div>
      </div>
    )
  }

  if (error || !prediction) {
    return null
  }

  const { predictions: pred, comparison } = prediction

  const homePercent = parseFloat(pred.percent.home.replace('%', ''))
  const drawPercent = parseFloat(pred.percent.draw.replace('%', ''))
  const awayPercent = parseFloat(pred.percent.away.replace('%', ''))
  const maxPercent = Math.max(homePercent, drawPercent, awayPercent)

  const homeTeamDisplay = language === 'ko' ? (homeTeamKR || homeTeam) : homeTeam
  const awayTeamDisplay = language === 'ko' ? (awayTeamKR || awayTeam) : awayTeam

  // 🆕 현실적인 스코어 계산
  const avgHomeGoals = Math.abs(parseFloat(pred.goals.home))  // 🔥 절댓값 처리
  const avgAwayGoals = Math.abs(parseFloat(pred.goals.away))  // 🔥 절댓값 처리
  
  console.log(`📊 Score calculation input:`)
  console.log(`  - Raw API goals: ${pred.goals.home} - ${pred.goals.away}`)
  console.log(`  - Abs goals: ${avgHomeGoals} - ${avgAwayGoals}`)
  console.log(`  - Win%: ${homePercent}% / ${drawPercent}% / ${awayPercent}%`)
  
  const { home: homeGoals, away: awayGoals } = calculateRealisticScore(
    avgHomeGoals,
    avgAwayGoals,
    homePercent,
    drawPercent,
    awayPercent
  )
  
  console.log(`  - Final score: ${homeGoals} - ${awayGoals}`)
  
  const winnerInfo = homeGoals > awayGoals
    ? { team: homeTeamDisplay, percent: homePercent, color: 'blue' as const, result: '승리' }
    : homeGoals < awayGoals
    ? { team: awayTeamDisplay, percent: awayPercent, color: 'red' as const, result: '승리' }
    : { team: language === 'ko' ? '무승부' : 'Draw', percent: drawPercent, color: 'gray' as const, result: language === 'ko' ? '예상' : 'Expected' }

  // 인사이트 생성
  const insights: Array<{ text: string; type: 'positive' | 'neutral' | 'negative' }> = []

  const homeFormValue = parseFloat(comparison.form.home)
  const awayFormValue = parseFloat(comparison.form.away)
  
  if (homeFormValue > 70) {
    insights.push({ 
      text: language === 'ko' 
        ? `${homeTeamDisplay}의 최근 폼이 매우 좋습니다 (${comparison.form.home})` 
        : `${homeTeamDisplay} in excellent form (${comparison.form.home})`, 
      type: 'positive' 
    })
  }
  if (awayFormValue > 70) {
    insights.push({ 
      text: language === 'ko' 
        ? `${awayTeamDisplay}의 최근 폼이 매우 좋습니다 (${comparison.form.away})` 
        : `${awayTeamDisplay} in excellent form (${comparison.form.away})`, 
      type: 'positive' 
    })
  }

  // H2H 인사이트 (기존 API 데이터 사용)
  if (h2hOld?.h2h) {
    const { summary } = h2hOld.h2h
    if (summary.total >= 3) {
      const team1WinRate = parseFloat(summary.team1WinRate)
      const team2WinRate = parseFloat(summary.team2WinRate)
      
      if (team1WinRate >= 60) {
        insights.push({ 
          text: language === 'ko'
            ? `최근 ${summary.total}경기에서 ${homeTeamDisplay}이 ${summary.team1Wins}승으로 우세합니다`
            : `${homeTeamDisplay} dominant with ${summary.team1Wins} wins in last ${summary.total} matches`, 
          type: 'positive' 
        })
      } else if (team2WinRate >= 60) {
        insights.push({ 
          text: language === 'ko'
            ? `최근 ${summary.total}경기에서 ${awayTeamDisplay}이 ${summary.team2Wins}승으로 우세합니다`
            : `${awayTeamDisplay} dominant with ${summary.team2Wins} wins in last ${summary.total} matches`, 
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
      text: language === 'ko'
        ? `${awayTeamDisplay}의 강력한 공격 vs ${homeTeamDisplay}의 약한 수비 - 다득점 가능성`
        : `${awayTeamDisplay}'s strong attack vs ${homeTeamDisplay}'s weak defense - High scoring likely`, 
      type: 'positive' 
    })
  }

  // 예상 득점 분석
  const totalGoals = homeGoals + awayGoals
  if (totalGoals >= 4) {
    insights.push({ 
      text: language === 'ko'
        ? `예상 총 득점 ${totalGoals}골 - 박진감 넘치는 경기 예상`
        : `Expected ${totalGoals} total goals - Exciting match ahead`, 
      type: 'neutral' 
    })
  } else if (totalGoals <= 2) {
    insights.push({ 
      text: language === 'ko'
        ? `예상 총 득점 ${totalGoals}골 - 수비적인 경기 예상`
        : `Expected ${totalGoals} total goals - Defensive match likely`, 
      type: 'neutral' 
    })
  }

  // 비교 통계
  const comparisonStats = [
    { 
      label: language === 'ko' ? '최근폼' : 'Form',
      icon: '◈', 
      home: comparison.form.home, 
      away: comparison.form.away 
    },
    { 
      label: language === 'ko' ? '공격력' : 'Attack',
      icon: '▲', 
      home: comparison.att.home, 
      away: comparison.att.away 
    },
    { 
      label: language === 'ko' ? '수비력' : 'Defense',
      icon: '■', 
      home: comparison.def.home, 
      away: comparison.def.away 
    },
    { 
      label: language === 'ko' ? '득점력' : 'Goals',
      icon: '●', 
      home: comparison.goals.home, 
      away: comparison.goals.away 
    },
    { 
      label: language === 'ko' ? '상대전적' : 'H2H',
      icon: '⚡', 
      home: comparison.h2h.home, 
      away: comparison.h2h.away 
    },
    { 
      label: language === 'ko' ? '포아송' : 'Poisson',
      icon: '⌇', 
      home: comparison.poisson_distribution.home, 
      away: comparison.poisson_distribution.away 
    },
  ]

  return (
    <div className={`mt-4 rounded-xl overflow-hidden ${
      darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-gray-50 border border-gray-200'
    }`}>
      {/* 탭 헤더 */}
      <div className={`flex border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        {(['overview', 'stats', 'h2h', 'form', 'trend'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? darkMode
                  ? 'bg-[#1a1a1a] text-blue-400 border-b-2 border-blue-400'
                  : 'bg-white text-blue-600 border-b-2 border-blue-600'
                : darkMode
                ? 'text-gray-400 hover:text-gray-300 hover:bg-[#1a1a1a]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab === 'overview' && (
              <>
                <span className="md:hidden text-base">▣</span>
                <span className="hidden md:inline">{language === 'ko' ? '▣ 개요' : '▣ Overview'}</span>
              </>
            )}
            {tab === 'stats' && (
              <>
                <span className="md:hidden text-base">⊞</span>
                <span className="hidden md:inline">{language === 'ko' ? '⊞ 통계' : '⊞ Stats'}</span>
              </>
            )}
            {tab === 'h2h' && (
              <>
                <span className="md:hidden text-base">⚡</span>
                <span className="hidden md:inline">{language === 'ko' ? '⚡ 상대전적' : '⚡ H2H'}</span>
              </>
            )}
            {tab === 'form' && (
              <>
                <span className="md:hidden text-base">◈</span>
                <span className="hidden md:inline">{language === 'ko' ? '◈ 최근폼' : '◈ Form'}</span>
              </>
            )}
            {tab === 'trend' && (
              <>
                <span className="md:hidden text-base">⌇</span>
                <span className="hidden md:inline">{language === 'ko' ? '⌇ 트렌드' : '⌇ Trend'}</span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div className="p-4">
        {/* 개요 탭 - 원본 디자인 유지 */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* 🔥 예상 결과 & 스코어 - 통합 컴팩트 버전 */}
            <div className={`rounded-xl overflow-hidden ${
              darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'
            }`}>
              <div className="p-4">
                {/* 모바일/데스크탑 모두 가로 배치 */}
                <div className="grid grid-cols-2 gap-3 md:gap-6">
                  {/* 예상 결과 */}
                  <div className={`text-center p-4 rounded-lg ${
                    darkMode ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  }`}>
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
                        {language === 'ko' ? '예상 결과' : 'Prediction'}
                      </span>
                    </div>
                    <div className={`text-lg font-bold mb-1 ${
                      darkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      {winnerInfo.team}
                    </div>
                    <div className={`text-4xl md:text-5xl font-black ${
                      winnerInfo.color === 'blue' ? (darkMode ? 'text-blue-400' : 'text-blue-600')
                      : winnerInfo.color === 'gray' ? (darkMode ? 'text-gray-400' : 'text-gray-600')
                      : (darkMode ? 'text-red-400' : 'text-red-600')
                    }`}>
                      {winnerInfo.percent.toFixed(0)}%
                    </div>
                  </div>

                  {/* 예상 스코어 */}
                  <div className={`text-center p-4 rounded-lg ${
                    darkMode ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  }`}>
                    <div className={`inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-lg ${
                      darkMode ? 'bg-[#2a2a2a] border border-gray-700' : 'bg-white border border-gray-200'
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {language === 'ko' ? '예상 스코어' : 'Score'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-center gap-3 md:gap-4 mt-2">
                      <div className={`text-4xl md:text-5xl font-black ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {homeGoals}
                      </div>
                      <div className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-gray-700' : 'text-gray-300'}`}>
                        :
                      </div>
                      <div className={`text-4xl md:text-5xl font-black ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        {awayGoals}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI 인사이트 - 심플한 디자인 */}
            {insights.length > 0 ? (
              <div className="space-y-3">
                {/* 헤더 */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-[#1a1a1a] border border-gray-700' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">●</span>
                    <h4 className={`text-sm font-bold ${
                      darkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      {language === 'ko' ? '매치 프리뷰' : 'Insights'}
                    </h4>
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded ${
                    darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {insights.length}{language === 'ko' ? '개' : ''}
                  </div>
                </div>

                {/* 인사이트 리스트 */}
                <div className="space-y-2">
                  {insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg flex items-start gap-3 ${
                        darkMode 
                          ? 'bg-[#1a1a1a] border border-gray-800' 
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      {/* 번호 */}
                      <div className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                        darkMode 
                          ? 'bg-[#2a2a2a] text-gray-400' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {idx + 1}
                      </div>

                      {/* 텍스트 */}
                      <p className={`text-sm leading-relaxed flex-1 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {insight.text}
                      </p>

                      {/* 타입 표시 */}
                      <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                        insight.type === 'positive' ? 'bg-green-500' :
                        insight.type === 'negative' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}></div>
                    </div>
                  ))}
                </div>

                {/* 안내 메시지 */}
                <div className={`text-center py-2 text-xs ${
                  darkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  {language === 'ko' 
                    ? '더 자세한 통계는 상세통계 탭에서 확인하세요' 
                    : 'Check Stats tab for detailed analysis'}
                </div>
              </div>
            ) : (
              /* 인사이트 없을 때 */
              <div className={`p-6 rounded-lg text-center ${
                darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-gray-50 border border-gray-200'
              }`}>
                <span className="text-3xl mb-2 block">◉</span>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {language === 'ko' 
                    ? '경기 인사이트를 분석 중입니다...' 
                    : 'Analyzing match insights...'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 상세통계 탭 - 원본 디자인 유지 */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            {/* 레이더 차트 */}
            <div className={`p-4 rounded-xl ${
              darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
            }`}>
              <h3 className={`text-sm font-bold mb-4 uppercase tracking-wider ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {language === 'ko' ? '▣ 종합 비교' : '▣ Overall Comparison'}
              </h3>
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={300}
                  className="max-w-full"
                />
              </div>
            </div>

            {/* 상세 비교 */}
            <div className="space-y-2">
              {comparisonStats.map((stat, idx) => {
                const homeValue = parseFloat(stat.home)
                const awayValue = parseFloat(stat.away)

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{stat.icon}</span>
                        <span className={`text-sm font-bold ${
                          darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {stat.label}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm font-bold">
                        <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>
                          {stat.home}
                        </span>
                        <span className={darkMode ? 'text-red-400' : 'text-red-600'}>
                          {stat.away}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-full bg-blue-500 transition-all"
                        style={{ width: `${homeValue}%` }}
                      />
                      <div 
                        className="absolute right-0 top-0 h-full bg-red-500 transition-all"
                        style={{ width: `${awayValue}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 🆕 상대전적 탭 */}
        {activeTab === 'h2h' && (
          <div className="space-y-4">
            {h2hLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {language === 'ko' ? '상대전적 데이터 로딩 중...' : 'Loading H2H data...'}
                </p>
              </div>
            ) : h2h?.h2hMatches ? (
              <>
                {/* 통계 카드 - 애널리틱스 스타일 */}
                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
                }`}>
                  <div className={`flex items-center gap-2 mb-4 px-3 py-1.5 rounded-lg ${
                    darkMode ? 'bg-[#2a2a2a] border border-gray-700' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {language === 'ko' 
                        ? `최근 ${h2h.statistics.totalMatches}경기 전적`
                        : `Last ${h2h.statistics.totalMatches} Matches`}
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <div className={`text-3xl font-black mb-1 ${
                        darkMode ? 'text-blue-400' : 'text-blue-600'
                      }`}>
                        {h2h.statistics.homeWins}
                      </div>
                      <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {language === 'ko' ? '승' : 'W'}
                      </div>
                      <div className={`text-sm font-bold ${
                        darkMode ? 'text-blue-400/70' : 'text-blue-600/70'
                      }`}>
                        {h2h.statistics.homeWinPercentage.toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-black mb-1 ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {h2h.statistics.draws}
                      </div>
                      <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {language === 'ko' ? '무' : 'D'}
                      </div>
                      <div className={`text-sm font-bold ${
                        darkMode ? 'text-gray-400/70' : 'text-gray-600/70'
                      }`}>
                        {h2h.statistics.drawPercentage.toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-black mb-1 ${
                        darkMode ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {h2h.statistics.awayWins}
                      </div>
                      <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {language === 'ko' ? '승' : 'W'}
                      </div>
                      <div className={`text-sm font-bold ${
                        darkMode ? 'text-red-400/70' : 'text-red-600/70'
                      }`}>
                        {h2h.statistics.awayWinPercentage.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* 평균 득점 */}
                  <div className={`grid grid-cols-2 gap-3 p-3 rounded-lg ${
                    darkMode ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  }`}>
                    <div className="text-center">
                      <p className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {language === 'ko' ? '평균 득점 (홈)' : 'Avg Goals (Home)'}
                      </p>
                      <p className={`text-lg font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {h2h.statistics.avgGoalsHome}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {language === 'ko' ? '평균 득점 (원정)' : 'Avg Goals (Away)'}
                      </p>
                      <p className={`text-lg font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        {h2h.statistics.avgGoalsAway}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 최근 경기 목록 - FotMob 스타일 */}
                <div className="space-y-2">
                  <h4 className={`text-xs font-bold mb-3 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {language === 'ko' 
                      ? `최근 ${h2h.h2hMatches.length}경기`
                      : `Last ${h2h.h2hMatches.length} Matches`}
                  </h4>
                  
                  {h2h.h2hMatches.slice(0, 10).map((match, idx) => {
                    // 승자 판단
                    const homeWon = match.winner === 'home'
                    const awayWon = match.winner === 'away'
                    const isDraw = match.winner === 'draw'
                    
                    return (
                      <div 
                        key={idx}
                        className={`rounded-lg p-3 border ${
                          darkMode 
                            ? 'bg-[#1a1a1a] border-gray-800/50 hover:bg-[#1a1a1a] hover:border-gray-700' 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        } transition-all`}
                      >
                        {/* 날짜 + 리그 */}
                        <div className={`flex items-center justify-between mb-2 text-xs ${
                          darkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          <span>
                            {new Date(match.date).toLocaleDateString('ko-KR', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            }).replace(/\. /g, '.').replace(/\.$/,'')}
                          </span>
                          <span>{match.league}</span>
                        </div>

                        {/* 팀 + 스코어 */}
                        <div className="flex items-center justify-between gap-3">
                          {/* 홈팀 */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <img 
                              src={getTeamLogo(match.homeTeamId, getKoreanTeamName(match.homeTeam))}
                              alt={match.homeTeam}
                              className="w-5 h-5 object-contain flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/20x20.png?text=?'
                              }}
                            />
                            <span className={`text-sm truncate ${
                              homeWon
                                ? 'font-black ' + (darkMode ? 'text-white' : 'text-gray-900')
                                : 'font-medium ' + (darkMode ? 'text-gray-400' : 'text-gray-600')
                            }`}>
                              {getKoreanTeamName(match.homeTeam)}
                            </span>
                            {match.isHomeTeamHome && (
                              <span className={`text-xs px-1 py-0.5 rounded font-bold flex-shrink-0 ${
                                darkMode ? 'bg-[#2a2a2a] text-gray-400' : 'bg-gray-200 text-gray-600'
                              }`}>
                                {language === 'ko' ? '홈' : 'H'}
                              </span>
                            )}
                          </div>

                          {/* 스코어 */}
                          <div className={`px-3 py-1 rounded font-black text-base flex-shrink-0 ${
                            darkMode ? 'bg-[#2a2a2a]' : 'bg-white'
                          }`}>
                            <span className={homeWon 
                              ? darkMode ? 'text-white' : 'text-gray-900'
                              : darkMode ? 'text-gray-400' : 'text-gray-500'
                            }>
                              {match.homeScore}
                            </span>
                            <span className={darkMode ? 'text-gray-600 mx-1.5' : 'text-gray-400 mx-1.5'}>
                              -
                            </span>
                            <span className={awayWon 
                              ? darkMode ? 'text-white' : 'text-gray-900'
                              : darkMode ? 'text-gray-400' : 'text-gray-500'
                            }>
                              {match.awayScore}
                            </span>
                          </div>

                          {/* 원정팀 */}
                          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                            {!match.isHomeTeamHome && (
                              <span className={`text-xs px-1 py-0.5 rounded font-bold flex-shrink-0 ${
                                darkMode ? 'bg-[#2a2a2a] text-gray-400' : 'bg-gray-200 text-gray-600'
                              }`}>
                                {language === 'ko' ? '홈' : 'H'}
                              </span>
                            )}
                            <span className={`text-sm truncate ${
                              awayWon
                                ? 'font-black ' + (darkMode ? 'text-white' : 'text-gray-900')
                                : 'font-medium ' + (darkMode ? 'text-gray-400' : 'text-gray-600')
                            }`}>
                              {getKoreanTeamName(match.awayTeam)}
                            </span>
                            <img 
                              src={getTeamLogo(match.awayTeamId, getKoreanTeamName(match.awayTeam))}
                              alt={match.awayTeam}
                              className="w-5 h-5 object-contain flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/20x20.png?text=?'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className={`p-8 rounded-xl text-center ${
                darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
              }`}>
                <span className="text-4xl mb-3 block">⚡</span>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  상대전적 데이터가 없습니다
                </p>
              </div>
            )}
          </div>
        )}

        {/* 🆕 최근 폼 탭 - FotMob 스타일 */}
        {activeTab === 'form' && (
          <div className="space-y-4">
            {h2hLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {language === 'ko' ? '최근 폼 데이터 로딩 중...' : 'Loading recent form data...'}
                </p>
              </div>
            ) : h2h?.homeForm && h2h?.awayForm ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 홈팀 폼 - FotMob 스타일 */}
                <div>
                  <div className={`mb-3 px-3 py-2 rounded-lg ${
                    darkMode ? 'bg-[#1a1a1a]/50 border border-gray-800' : 'bg-white border border-gray-200'
                  }`}>
                    <h3 className={`text-xs font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {homeTeam}
                    </h3>
                  </div>
                  
                  <div className="space-y-1.5">
                    {h2h.homeForm.map((match, index) => (
                      <div 
                        key={index}
                        className={`rounded-lg px-3 py-2 ${
                          darkMode
                            ? 'bg-[#1a1a1a]/30 hover:bg-[#1a1a1a]/60'
                            : 'bg-gray-50 hover:bg-gray-100'
                        } transition-colors`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          {/* 홈/원정 아이콘 */}
                          <div className={`text-[10px] font-bold w-4 text-center flex-shrink-0 ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            {match.isHome ? 'H' : 'A'}
                          </div>
                          
                          {/* 상대팀 */}
                          <div className={`flex-1 text-xs font-medium truncate ${
                            darkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {getKoreanTeamName(match.opponent)}
                          </div>
                          
                          {/* 스코어 */}
                          <div className={`text-xs font-bold flex-shrink-0 px-2 py-0.5 rounded ${
                            match.result === 'W'
                              ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                              : match.result === 'D'
                                ? darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
                                : darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                          }`}>
                            {match.score}
                          </div>
                          
                          {/* 결과 */}
                          <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                            match.result === 'W'
                              ? 'bg-green-500 text-white'
                              : match.result === 'D'
                                ? 'bg-gray-500 text-white'
                                : 'bg-red-500 text-white'
                          }`}>
                            {match.result}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 원정팀 폼 - FotMob 스타일 */}
                <div>
                  <div className={`mb-3 px-3 py-2 rounded-lg ${
                    darkMode ? 'bg-[#1a1a1a]/50 border border-gray-800' : 'bg-white border border-gray-200'
                  }`}>
                    <h3 className={`text-xs font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {awayTeam}
                    </h3>
                  </div>
                  
                  <div className="space-y-1.5">
                    {h2h.awayForm.map((match, index) => (
                      <div 
                        key={index}
                        className={`rounded-lg px-3 py-2 ${
                          darkMode
                            ? 'bg-[#1a1a1a]/30 hover:bg-[#1a1a1a]/60'
                            : 'bg-gray-50 hover:bg-gray-100'
                        } transition-colors`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          {/* 홈/원정 아이콘 */}
                          <div className={`text-[10px] font-bold w-4 text-center flex-shrink-0 ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            {match.isHome ? 'H' : 'A'}
                          </div>
                          
                          {/* 상대팀 */}
                          <div className={`flex-1 text-xs font-medium truncate ${
                            darkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {getKoreanTeamName(match.opponent)}
                          </div>
                          
                          {/* 스코어 */}
                          <div className={`text-xs font-bold flex-shrink-0 px-2 py-0.5 rounded ${
                            match.result === 'W'
                              ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                              : match.result === 'D'
                                ? darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
                                : darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                          }`}>
                            {match.score}
                          </div>
                          
                          {/* 결과 */}
                          <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                            match.result === 'W'
                              ? 'bg-green-500 text-white'
                              : match.result === 'D'
                                ? 'bg-gray-500 text-white'
                                : 'bg-red-500 text-white'
                          }`}>
                            {match.result}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`p-8 rounded-xl text-center ${
                darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
              }`}>
                <span className="text-4xl mb-3 block">◈</span>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {language === 'ko' ? '최근 폼 데이터가 없습니다' : 'No recent form data available'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 트렌드 탭 - 원본 유지 */}
        {activeTab === 'trend' && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {language === 'ko' ? '📊 매치 트렌드' : '📊 Trend (Cumulative)'}
              </h3>
              
              {/* 트렌드 차트는 항상 표시 */}
              <div>
                <MatchTrendChart data={trendData} darkMode={darkMode} />
                
                {trendData.length > 0 && (
                  <>
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className={`text-center p-2 rounded-lg ${
                        darkMode ? 'bg-blue-900/20' : 'bg-blue-50'
                      }`}>
                        <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {language === 'ko' ? '홈 최고' : 'Home Peak'}
                        </p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                          {Math.max(...trendData.map(d => d.homeWinProbability)).toFixed(0)}%
                        </p>
                      </div>
                      <div className={`text-center p-2 rounded-lg ${
                        darkMode ? 'bg-[#2a2a2a]' : 'bg-gray-100'
                      }`}>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {language === 'ko' ? '무승부 평균' : 'Draw Avg'}
                        </p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {(trendData.reduce((sum, d) => sum + d.drawProbability, 0) / trendData.length).toFixed(0)}%
                        </p>
                      </div>
                      <div className={`text-center p-2 rounded-lg ${
                        darkMode ? 'bg-red-900/20' : 'bg-red-50'
                      }`}>
                        <p className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                          {language === 'ko' ? '원정 최고' : 'Away Peak'}
                        </p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                          {Math.max(...trendData.map(d => d.awayWinProbability)).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    
                    <p className={`text-xs text-center mt-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {language === 'ko' 
                        ? `${trendData.length}개 데이터 포인트 • 누적 히스토리`
                        : `${trendData.length} data points • Cumulative history`}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}