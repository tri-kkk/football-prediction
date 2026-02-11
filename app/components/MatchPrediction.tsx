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
  homeTeamId: number
  awayTeamId: number
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
  league?: string
  trendData?: TrendData[]
  darkMode: boolean
}

// ✅ 한글 팀명 변환 함수
const getKoreanTeamName = (teamName: string): string => {
  return TEAM_NAME_KR[teamName] || teamName
}

// ━━━ Score Calculation Logic (UNCHANGED) ━━━

function determineResult(
  homeWinPercent: number, 
  drawPercent: number, 
  awayWinPercent: number
): 'home' | 'draw' | 'away' {
  if (drawPercent > homeWinPercent && drawPercent > awayWinPercent && drawPercent >= 33) {
    return 'draw'
  }
  if (homeWinPercent > awayWinPercent) {
    return 'home'
  } else if (awayWinPercent > homeWinPercent) {
    return 'away'
  }
  return 'home'
}

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
  if (avgHome < 0 || avgAway < 0 || isNaN(avgHome) || isNaN(avgAway)) {
    console.warn('⚠️ Invalid goal data, using win percentages only:', { avgHome, avgAway })
    return calculateFromWinPercent(homeWinPercent, drawPercent, awayWinPercent)
  }
  
  const result = determineResult(homeWinPercent, drawPercent, awayWinPercent)
  
  let homeGoals: number
  let awayGoals: number
  
  const adjustedHome = Math.max(avgHome, 0.8)
  const adjustedAway = Math.max(avgAway, 0.7)
  
  if (result === 'home') {
    const dominance = homeWinPercent - awayWinPercent
    
    if (dominance > 40) {
      homeGoals = Math.max(3, Math.round(adjustedHome * 1.3))
      awayGoals = dominance > 50 ? 0 : Math.min(1, Math.round(adjustedAway * 0.5))
    } else if (dominance > 25) {
      homeGoals = Math.max(2, Math.round(adjustedHome))
      awayGoals = Math.round(adjustedAway * 0.6)
    } else if (dominance > 10) {
      homeGoals = Math.max(1, Math.round(adjustedHome * 0.9))
      awayGoals = Math.max(0, Math.round(adjustedAway * 0.7))
      if (homeGoals <= awayGoals) {
        homeGoals = awayGoals + 1
      }
    } else {
      homeGoals = Math.max(1, Math.round(adjustedHome * 0.8))
      awayGoals = Math.round(adjustedAway * 0.6)
      if (homeGoals <= awayGoals) {
        homeGoals = awayGoals + 1
      }
    }
  } else if (result === 'away') {
    const dominance = awayWinPercent - homeWinPercent
    
    if (dominance > 40) {
      awayGoals = Math.max(3, Math.round(adjustedAway * 1.3))
      homeGoals = dominance > 50 ? 0 : Math.min(1, Math.round(adjustedHome * 0.5))
    } else if (dominance > 25) {
      awayGoals = Math.max(2, Math.round(adjustedAway))
      homeGoals = Math.round(adjustedHome * 0.6)
    } else if (dominance > 10) {
      awayGoals = Math.max(1, Math.round(adjustedAway * 0.9))
      homeGoals = Math.max(0, Math.round(adjustedHome * 0.7))
      if (awayGoals <= homeGoals) {
        awayGoals = homeGoals + 1
      }
    } else {
      awayGoals = Math.max(1, Math.round(adjustedAway * 0.8))
      homeGoals = Math.round(adjustedHome * 0.6)
      if (awayGoals <= homeGoals) {
        awayGoals = homeGoals + 1
      }
    }
  } else {
    const avgGoals = (adjustedHome + adjustedAway) / 2
    if (avgGoals >= 2.5) {
      homeGoals = 2
      awayGoals = 2
    } else if (avgGoals >= 1.5) {
      homeGoals = 1
      awayGoals = 1
    } else {
      homeGoals = 1
      awayGoals = 1
    }
  }
  
  homeGoals = Math.min(homeGoals, 5)
  awayGoals = Math.min(awayGoals, 5)
  
  console.log(`📊 Score prediction:`)
  console.log(`  - Win%: ${homeWinPercent}% / ${drawPercent}% / ${awayWinPercent}%`)
  console.log(`  - Expected goals: ${avgHome.toFixed(2)} - ${avgAway.toFixed(2)}`)
  console.log(`  - Result: ${result} → ${homeGoals}-${awayGoals}`)
  
  return { home: homeGoals, away: awayGoals }
}

// ━━━ Redesigned Stat Bar Component ━━━

function StatBar({ label, homeVal, awayVal, darkMode }: { 
  label: string; homeVal: number; awayVal: number; darkMode: boolean 
}) {
  const total = homeVal + awayVal
  const homeW = total > 0 ? (homeVal / total) * 100 : 50
  const homeLead = homeVal > awayVal
  const awayLead = awayVal > homeVal

  return (
    <div className="grid grid-cols-[40px_1fr_64px_1fr_40px] items-center gap-1.5 py-2">
      <span className={`text-right text-xs font-mono tabular-nums ${
        homeLead 
          ? (darkMode ? 'text-cyan-400 font-bold' : 'text-cyan-600 font-bold') 
          : (darkMode ? 'text-gray-600' : 'text-gray-400')
      }`}>
        {homeVal}%
      </span>
      <div className={`h-1.5 rounded-full overflow-hidden flex justify-end ${
        darkMode ? 'bg-gray-800' : 'bg-gray-200'
      }`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            homeLead 
              ? (darkMode ? 'bg-cyan-500' : 'bg-cyan-500') 
              : (darkMode ? 'bg-gray-700' : 'bg-gray-300')
          }`}
          style={{ width: `${homeW}%` }}
        />
      </div>
      <span className={`text-center text-[11px] font-medium ${
        darkMode ? 'text-gray-500' : 'text-gray-500'
      }`}>{label}</span>
      <div className={`h-1.5 rounded-full overflow-hidden ${
        darkMode ? 'bg-gray-800' : 'bg-gray-200'
      }`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            awayLead 
              ? (darkMode ? 'bg-amber-500' : 'bg-amber-500') 
              : (darkMode ? 'bg-gray-700' : 'bg-gray-300')
          }`}
          style={{ width: `${100 - homeW}%` }}
        />
      </div>
      <span className={`text-left text-xs font-mono tabular-nums ${
        awayLead 
          ? (darkMode ? 'text-amber-400 font-bold' : 'text-amber-600 font-bold') 
          : (darkMode ? 'text-gray-600' : 'text-gray-400')
      }`}>
        {awayVal}%
      </span>
    </div>
  )
}

// ━━━ Form Badge Component ━━━

function FormBadge({ result, darkMode }: { result: string; darkMode: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white ${
      result === 'W' ? 'bg-emerald-500'
      : result === 'D' ? 'bg-gray-500'
      : 'bg-red-500'
    }`}>
      {result}
    </span>
  )
}


// ━━━ Main Component ━━━

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
  const [h2h, setH2h] = useState<H2HData | null>(null)
  const [trendData, setTrendData] = useState<TrendData[]>(propsTrendData)
  const [loading, setLoading] = useState(true)
  const [h2hLoading, setH2hLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'h2h' | 'form' | 'trend'>('overview')
  
  const homeTeamLogo = getTeamLogo(homeTeam)
  const awayTeamLogo = getTeamLogo(awayTeam)
  
  const [debugInfo, setDebugInfo] = useState({
    predictionStatus: 'pending' as 'pending' | 'success' | 'failed',
    h2hStatus: 'pending' as 'pending' | 'success' | 'failed' | 'skipped',
  })

  // ━━━ ALL DATA FETCHING LOGIC (UNCHANGED) ━━━

  useEffect(() => {
    if (propsTrendData && propsTrendData.length > 0) {
      console.log('📊 Trend data from props:', propsTrendData.length)
      setTrendData(propsTrendData)
    }
  }, [propsTrendData])

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

        // DB에서 스코어 먼저 조회
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

        // Prediction 데이터 (필수)
        console.log(`🔍 Fetching prediction for fixture: ${fixtureId}`)
        const predResponse = await fetch(`/api/predictions?fixture=${fixtureId}`)
        
        if (predResponse.ok) {
          const predData = await predResponse.json()
          console.log('✅ Prediction data:', predData)
          
          // DB 스코어가 있으면 덮어쓰기
          if (dbScore) {
            predData.predictions.goals = {
              home: String(dbScore.home),
              away: String(dbScore.away)
            }
          }
          
          // DB 확률이 있으면 덮어쓰기
          if (dbProbabilities) {
            predData.predictions.percent = {
              home: `${dbProbabilities.home}%`,
              draw: `${dbProbabilities.draw}%`,
              away: `${dbProbabilities.away}%`
            }
          }
          
          setPrediction(predData)
          setDebugInfo(prev => ({ ...prev, predictionStatus: 'success' }))
        } else {
          console.warn('⚠️ Prediction API failed, using fallback')
          
          // 폴백 데이터
          const fallbackPercent = dbProbabilities || { home: 33, draw: 34, away: 33 }
          const fallbackGoals = dbScore || { home: 1, away: 1 }
          
          const fallbackPrediction: PredictionData = {
            predictions: {
              winner: { id: 0, name: 'Unknown', comment: '' },
              win_or_draw: true,
              under_over: null,
              goals: { home: String(fallbackGoals.home), away: String(fallbackGoals.away) },
              advice: '',
              percent: {
                home: `${fallbackPercent.home}%`,
                draw: `${fallbackPercent.draw}%`,
                away: `${fallbackPercent.away}%`
              }
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
        }
      } catch (err) {
        console.error('❌ Error fetching data:', err)
        setError('데이터를 불러오는데 실패했습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [fixtureId, homeTeamId, awayTeamId])

  // H2H/Form 탭 클릭 시 데이터 로드
  useEffect(() => {
    if ((activeTab === 'h2h' || activeTab === 'form') && !h2h && !h2hLoading) {
      loadH2HData()
    }
  }, [activeTab])

  // ━━━ LOADING & ERROR STATES ━━━

  if (loading) {
    return (
      <div className={`mt-0 p-4 ${
        darkMode ? 'bg-[#111]' : 'bg-gray-50'
      }`}>
        <div className="flex items-center justify-center gap-3 py-3">
          <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span className={`text-xs tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            {language === 'ko' ? '분석 데이터 로딩 중...' : 'Loading analysis...'}
          </span>
        </div>
      </div>
    )
  }

  if (error || !prediction) {
    return null
  }

  // ━━━ DATA PROCESSING (UNCHANGED) ━━━

  const { predictions: pred, comparison } = prediction

  const homePercent = parseFloat(pred.percent.home.replace('%', ''))
  const drawPercent = parseFloat(pred.percent.draw.replace('%', ''))
  const awayPercent = parseFloat(pred.percent.away.replace('%', ''))
  const maxPercent = Math.max(homePercent, drawPercent, awayPercent)

  const homeTeamDisplay = language === 'ko' ? (homeTeamKR || homeTeam) : homeTeam
  const awayTeamDisplay = language === 'ko' ? (awayTeamKR || awayTeam) : awayTeam

  const avgHomeGoals = Math.abs(parseFloat(pred.goals.home))
  const avgAwayGoals = Math.abs(parseFloat(pred.goals.away))
  
  const { home: homeGoals, away: awayGoals } = calculateRealisticScore(
    avgHomeGoals,
    avgAwayGoals,
    homePercent,
    drawPercent,
    awayPercent
  )
  
  const winnerInfo = homeGoals > awayGoals
    ? { team: homeTeamDisplay, percent: homePercent, side: 'home' as const }
    : homeGoals < awayGoals
    ? { team: awayTeamDisplay, percent: awayPercent, side: 'away' as const }
    : { team: language === 'ko' ? '무승부' : 'Draw', percent: drawPercent, side: 'draw' as const }

  // Insights
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

  // H2H insights
  if (h2hOld?.h2h?.summary) {
    const summary = h2hOld.h2h.summary
    if (summary.team1Wins > summary.team2Wins * 2) {
      insights.push({ 
        text: language === 'ko'
          ? `${homeTeamDisplay}가 상대전적에서 ${summary.team1Wins}승으로 압도`
          : `${homeTeamDisplay} dominant with ${summary.team1Wins} wins in last ${summary.total} matches`, 
        type: 'positive' 
      })
    } else if (summary.team2Wins > summary.team1Wins * 2) {
      insights.push({ 
        text: language === 'ko'
          ? `${awayTeamDisplay}가 상대전적에서 ${summary.team2Wins}승으로 압도`
          : `${awayTeamDisplay} dominant with ${summary.team2Wins} wins in last ${summary.total} matches`, 
        type: 'positive' 
      })
    }
  }

  const homeAttValue = parseFloat(comparison.att.home)
  const awayDefValue = parseFloat(comparison.def.away)
  
  if (homeAttValue > 70 && awayDefValue < 40) {
    insights.push({ 
      text: language === 'ko'
        ? `${homeTeamDisplay}의 강력한 공격 vs ${awayTeamDisplay}의 약한 수비 - 다득점 가능성`
        : `${homeTeamDisplay}'s strong attack vs ${awayTeamDisplay}'s weak defense - High scoring likely`, 
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

  // Comparison stats for the stats tab
  const comparisonStats = [
    { label: language === 'ko' ? '최근폼' : 'Form', home: comparison.form.home, away: comparison.form.away },
    { label: language === 'ko' ? '공격력' : 'Attack', home: comparison.att.home, away: comparison.att.away },
    { label: language === 'ko' ? '수비력' : 'Defense', home: comparison.def.home, away: comparison.def.away },
    { label: language === 'ko' ? '득점력' : 'Goals', home: comparison.goals.home, away: comparison.goals.away },
    { label: language === 'ko' ? '상대전적' : 'H2H', home: comparison.h2h.home, away: comparison.h2h.away },
    { label: language === 'ko' ? '포아송' : 'Poisson', home: comparison.poisson_distribution.home, away: comparison.poisson_distribution.away },
  ]

  // Tab definitions
  const tabs = [
    { id: 'overview' as const, label: language === 'ko' ? '개요' : 'Overview' },
    { id: 'stats' as const, label: language === 'ko' ? '통계' : 'Stats' },
    { id: 'h2h' as const, label: language === 'ko' ? '상대전적' : 'H2H' },
    { id: 'form' as const, label: language === 'ko' ? '최근폼' : 'Form' },
    { id: 'trend' as const, label: language === 'ko' ? '트렌드' : 'Trend' },
  ]

  // ━━━ REDESIGNED RENDER ━━━

  return (
    <div className={`mt-0 overflow-hidden ${
      darkMode ? 'bg-[#111]' : 'bg-gray-50'
    }`}>

      {/* ━━━ TAB NAVIGATION ━━━ */}
      <div className={`flex ${darkMode ? 'border-b border-gray-800' : 'border-b border-gray-200'}`}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 text-[11px] font-medium transition-all duration-200 relative ${
              activeTab === t.id
                ? darkMode ? 'text-white' : 'text-gray-900'
                : darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
            {activeTab === t.id && (
              <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full ${
                darkMode ? 'bg-amber-500' : 'bg-cyan-500'
              }`} />
            )}
          </button>
        ))}
      </div>

      {/* ━━━ TAB CONTENT ━━━ */}
      <div className="p-3">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-3">

            {/* Prediction + Score Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Predicted Winner */}
              <div className={`rounded-xl p-3 border ${
                darkMode 
                  ? 'bg-[#0a0a0a] border-gray-800' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className={`text-[10px] uppercase tracking-widest mb-1 text-center ${
                  darkMode ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {language === 'ko' ? '예상 결과' : 'Prediction'}
                </div>
                <div className={`text-sm font-bold mb-0.5 text-center ${
                  winnerInfo.side === 'home' 
                    ? (darkMode ? 'text-cyan-400' : 'text-cyan-600')
                    : winnerInfo.side === 'away'
                    ? (darkMode ? 'text-amber-400' : 'text-amber-600')
                    : (darkMode ? 'text-gray-400' : 'text-gray-600')
                }`}>
                  {winnerInfo.team}
                </div>
                <div className={`text-3xl font-mono font-black tracking-tight text-center ${
                  winnerInfo.side === 'home' 
                    ? (darkMode ? 'text-cyan-400' : 'text-cyan-600')
                    : winnerInfo.side === 'away'
                    ? (darkMode ? 'text-amber-400' : 'text-amber-600')
                    : (darkMode ? 'text-gray-400' : 'text-gray-600')
                }`}>
                  {winnerInfo.percent.toFixed(0)}
                  <span className="text-lg opacity-60">%</span>
                </div>
              </div>

              {/* Predicted Score */}
              <div className={`rounded-xl p-3 border ${
                darkMode 
                  ? 'bg-[#0a0a0a] border-gray-800' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className={`text-[10px] uppercase tracking-widest mb-1 ${
                  darkMode ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {language === 'ko' ? '예상 스코어' : 'Score'}
                </div>
                <div className="flex items-center justify-center gap-3 mt-1">
                  <span className={`text-3xl font-mono font-black ${
                    darkMode ? 'text-cyan-400' : 'text-cyan-600'
                  }`}>{homeGoals}</span>
                  <span className={`text-xl font-light ${
                    darkMode ? 'text-gray-700' : 'text-gray-300'
                  }`}>:</span>
                  <span className={`text-3xl font-mono font-black ${
                    darkMode ? 'text-amber-400' : 'text-amber-600'
                  }`}>{awayGoals}</span>
                </div>
                <div className="flex justify-center gap-6 mt-1">
                  <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    {homeTeamDisplay.length > 8 ? homeTeamDisplay.substring(0, 8) + '..' : homeTeamDisplay}
                  </span>
                  <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    {awayTeamDisplay.length > 8 ? awayTeamDisplay.substring(0, 8) + '..' : awayTeamDisplay}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Preview */}
            <div className={`rounded-xl border px-3 py-1 ${
              darkMode 
                ? 'bg-[#0a0a0a] border-gray-800' 
                : 'bg-white border-gray-200'
            }`}>
              <div className={`text-[10px] uppercase tracking-widest pt-2 pb-1 ${
                darkMode ? 'text-gray-600' : 'text-gray-400'
              }`}>
                {language === 'ko' ? '핵심 비교' : 'Key Stats'}
              </div>
              <StatBar label={language === 'ko' ? '최근폼' : 'Form'} homeVal={parseFloat(comparison.form.home)} awayVal={parseFloat(comparison.form.away)} darkMode={darkMode} />
              <StatBar label={language === 'ko' ? '공격력' : 'Attack'} homeVal={parseFloat(comparison.att.home)} awayVal={parseFloat(comparison.att.away)} darkMode={darkMode} />
              <StatBar label={language === 'ko' ? '수비력' : 'Defense'} homeVal={parseFloat(comparison.def.home)} awayVal={parseFloat(comparison.def.away)} darkMode={darkMode} />
            </div>

            {/* Match Insights */}
            {insights.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] uppercase tracking-widest ${
                    darkMode ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {language === 'ko' ? '매치 프리뷰' : 'Insights'}
                  </span>
                  <span className={`text-[10px] ${darkMode ? 'text-gray-700' : 'text-gray-400'}`}>
                    {insights.length}{language === 'ko' ? '개' : ''}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {insights.map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 border ${
                        darkMode 
                          ? 'bg-[#0a0a0a] border-gray-800/50' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <span className={`mt-0.5 text-xs flex-shrink-0 ${
                        item.type === 'positive' ? 'text-emerald-500' : 'text-gray-500'
                      }`}>
                        {item.type === 'positive' ? '▲' : '●'}
                      </span>
                      <span className={`text-[12px] leading-relaxed ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STATS TAB ── */}
        {activeTab === 'stats' && (
          <div className="space-y-3">
            {/* Team headers */}
            <div className="grid grid-cols-[40px_1fr_64px_1fr_40px] items-center gap-1.5 px-0">
              <span className={`text-right text-[10px] font-bold truncate ${
                darkMode ? 'text-cyan-500' : 'text-cyan-600'
              }`}>
                {homeTeamDisplay.length > 5 ? homeTeamDisplay.substring(0, 5) : homeTeamDisplay}
              </span>
              <div />
              <div />
              <div />
              <span className={`text-left text-[10px] font-bold truncate ${
                darkMode ? 'text-amber-500' : 'text-amber-600'
              }`}>
                {awayTeamDisplay.length > 5 ? awayTeamDisplay.substring(0, 5) : awayTeamDisplay}
              </span>
            </div>

            <div className={`rounded-xl border px-3 py-1 divide-y ${
              darkMode 
                ? 'bg-[#0a0a0a] border-gray-800 divide-gray-800/30' 
                : 'bg-white border-gray-200 divide-gray-100'
            }`}>
              {comparisonStats.map((stat, idx) => (
                <StatBar 
                  key={idx} 
                  label={stat.label} 
                  homeVal={parseFloat(stat.home)} 
                  awayVal={parseFloat(stat.away)} 
                  darkMode={darkMode} 
                />
              ))}
            </div>

            {/* Total comparison */}
            <div className={`rounded-xl border p-3 ${
              darkMode 
                ? 'bg-[#0a0a0a] border-gray-800' 
                : 'bg-white border-gray-200'
            }`}>
              <div className={`text-[10px] uppercase tracking-widest text-center mb-2 ${
                darkMode ? 'text-gray-600' : 'text-gray-400'
              }`}>
                {language === 'ko' ? '종합 평가' : 'Overall'}
              </div>
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className={`text-2xl font-mono font-bold ${
                    darkMode ? 'text-cyan-400' : 'text-cyan-600'
                  }`}>{comparison.total?.home || '50%'}</div>
                  <div className={`text-[10px] mt-0.5 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    {homeTeamDisplay.length > 6 ? homeTeamDisplay.substring(0, 6) + '..' : homeTeamDisplay}
                  </div>
                </div>
                <div className={`w-px h-8 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
                <div className="text-center">
                  <div className={`text-2xl font-mono font-bold ${
                    darkMode ? 'text-amber-400' : 'text-amber-600'
                  }`}>{comparison.total?.away || '50%'}</div>
                  <div className={`text-[10px] mt-0.5 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    {awayTeamDisplay.length > 6 ? awayTeamDisplay.substring(0, 6) + '..' : awayTeamDisplay}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── H2H TAB ── */}
        {activeTab === 'h2h' && (
          <div className="space-y-3">
            {h2hLoading ? (
              <div className="p-8 text-center">
                <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {language === 'ko' ? '상대전적 로딩 중...' : 'Loading H2H...'}
                </p>
              </div>
            ) : h2h?.h2hMatches ? (
              <>
                {/* H2H Summary */}
                <div className={`rounded-xl border p-3 ${
                  darkMode ? 'bg-[#0a0a0a] border-gray-800' : 'bg-white border-gray-200'
                }`}>
                  <div className={`text-[10px] uppercase tracking-widest text-center mb-3 ${
                    darkMode ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {language === 'ko' 
                      ? `최근 ${h2h.statistics.totalMatches}경기 전적`
                      : `Last ${h2h.statistics.totalMatches} Matches`}
                  </div>
                  <div className="grid grid-cols-3 text-center mb-3">
                    <div>
                      <div className={`text-2xl font-mono font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                        {h2h.statistics.homeWins}
                      </div>
                      <div className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        {language === 'ko' ? '승' : 'W'}
                      </div>
                    </div>
                    <div>
                      <div className={`text-2xl font-mono font-bold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {h2h.statistics.draws}
                      </div>
                      <div className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        {language === 'ko' ? '무' : 'D'}
                      </div>
                    </div>
                    <div>
                      <div className={`text-2xl font-mono font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        {h2h.statistics.awayWins}
                      </div>
                      <div className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        {language === 'ko' ? '승' : 'W'}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between px-4">
                    <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{homeTeamDisplay}</span>
                    <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{awayTeamDisplay}</span>
                  </div>
                  
                  {/* Average goals */}
                  <div className={`grid grid-cols-2 gap-2 mt-3 p-2 rounded-lg ${
                    darkMode ? 'bg-[#111]' : 'bg-gray-50'
                  }`}>
                    <div className="text-center">
                      <div className={`text-[10px] mb-0.5 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        {language === 'ko' ? '평균 득점' : 'Avg Goals'}
                      </div>
                      <div className={`text-sm font-mono font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                        {h2h.statistics.avgGoalsHome}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-[10px] mb-0.5 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        {language === 'ko' ? '평균 득점' : 'Avg Goals'}
                      </div>
                      <div className={`text-sm font-mono font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        {h2h.statistics.avgGoalsAway}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Match list */}
                <div className={`text-[10px] uppercase tracking-widest mb-1 ${
                  darkMode ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {language === 'ko' ? '최근 맞대결' : 'Recent Matches'}
                </div>
                <div className="space-y-1.5">
                  {h2h.h2hMatches.slice(0, 10).map((match, idx) => {
                    const homeWon = match.winner === 'home'
                    const awayWon = match.winner === 'away'
                    
                    return (
                      <div key={idx} className={`rounded-lg px-3 py-2.5 border ${
                        darkMode 
                          ? 'bg-[#0a0a0a] border-gray-800/50' 
                          : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={`text-[10px] font-mono w-16 flex-shrink-0 ${
                              darkMode ? 'text-gray-700' : 'text-gray-400'
                            }`}>
                              {new Date(match.date).toLocaleDateString('ko-KR', { 
                                year: '2-digit', month: '2-digit', day: '2-digit' 
                              }).replace(/\. /g, '.').replace(/\.$/,'')}
                            </span>
                            <img 
                              src={getTeamLogo(match.homeTeamId, getKoreanTeamName(match.homeTeam))}
                              alt={match.homeTeam}
                              className="w-4 h-4 object-contain flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="6" fill="%23333"/></svg>'
                              }}
                            />
                            <span className={`text-xs truncate ${
                              homeWon 
                                ? (darkMode ? 'text-white font-bold' : 'text-gray-900 font-bold')
                                : (darkMode ? 'text-gray-500' : 'text-gray-400')
                            }`}>
                              {getKoreanTeamName(match.homeTeam)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mx-2 flex-shrink-0">
                            <span className={`text-sm font-mono font-bold ${
                              homeWon ? (darkMode ? 'text-cyan-400' : 'text-cyan-600') : (darkMode ? 'text-gray-500' : 'text-gray-400')
                            }`}>{match.homeScore}</span>
                            <span className={`text-xs ${darkMode ? 'text-gray-700' : 'text-gray-300'}`}>-</span>
                            <span className={`text-sm font-mono font-bold ${
                              awayWon ? (darkMode ? 'text-amber-400' : 'text-amber-600') : (darkMode ? 'text-gray-500' : 'text-gray-400')
                            }`}>{match.awayScore}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                            <span className={`text-xs truncate ${
                              awayWon 
                                ? (darkMode ? 'text-white font-bold' : 'text-gray-900 font-bold')
                                : (darkMode ? 'text-gray-500' : 'text-gray-400')
                            }`}>
                              {getKoreanTeamName(match.awayTeam)}
                            </span>
                            <img 
                              src={getTeamLogo(match.awayTeamId, getKoreanTeamName(match.awayTeam))}
                              alt={match.awayTeam}
                              className="w-4 h-4 object-contain flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="6" fill="%23333"/></svg>'
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
              <div className={`p-8 rounded-xl text-center border ${
                darkMode ? 'bg-[#0a0a0a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <span className={`text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  {language === 'ko' ? '상대전적 데이터가 없습니다' : 'No H2H data available'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── FORM TAB ── */}
        {activeTab === 'form' && (
          <div className="space-y-4">
            {h2hLoading ? (
              <div className="p-8 text-center">
                <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {language === 'ko' ? '최근 폼 로딩 중...' : 'Loading form data...'}
                </p>
              </div>
            ) : h2h?.homeForm && h2h?.awayForm ? (
              <div className="space-y-4">
                {/* Home Form */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-1 h-3.5 rounded-full ${darkMode ? 'bg-cyan-500' : 'bg-cyan-500'}`} />
                    <span className={`text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {homeTeamDisplay}
                    </span>
                    <span className={`text-[10px] ${darkMode ? 'text-gray-700' : 'text-gray-400'}`}>
                      {language === 'ko' ? '최근 5경기' : 'Last 5'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {h2h.homeForm.map((match, index) => (
                      <div key={index} className={`grid grid-cols-[20px_1fr_48px_20px] items-center gap-2 rounded-lg px-2.5 py-2 border ${
                        darkMode 
                          ? 'bg-[#0a0a0a] border-gray-800/30' 
                          : 'bg-white border-gray-200'
                      }`}>
                        <span className={`text-[10px] font-medium text-center ${
                          darkMode ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {match.isHome ? 'H' : 'A'}
                        </span>
                        <span className={`text-xs truncate ${
                          darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {getKoreanTeamName(match.opponent)}
                        </span>
                        <span className={`text-xs font-mono text-center font-bold rounded px-1.5 py-0.5 ${
                          match.result === 'W' 
                            ? (darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                          : match.result === 'D' 
                            ? (darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500')
                          : (darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600')
                        }`}>
                          {match.score}
                        </span>
                        <FormBadge result={match.result} darkMode={darkMode} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Away Form */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-1 h-3.5 rounded-full ${darkMode ? 'bg-amber-500' : 'bg-amber-500'}`} />
                    <span className={`text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {awayTeamDisplay}
                    </span>
                    <span className={`text-[10px] ${darkMode ? 'text-gray-700' : 'text-gray-400'}`}>
                      {language === 'ko' ? '최근 5경기' : 'Last 5'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {h2h.awayForm.map((match, index) => (
                      <div key={index} className={`grid grid-cols-[20px_1fr_48px_20px] items-center gap-2 rounded-lg px-2.5 py-2 border ${
                        darkMode 
                          ? 'bg-[#0a0a0a] border-gray-800/30' 
                          : 'bg-white border-gray-200'
                      }`}>
                        <span className={`text-[10px] font-medium text-center ${
                          darkMode ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {match.isHome ? 'H' : 'A'}
                        </span>
                        <span className={`text-xs truncate ${
                          darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {getKoreanTeamName(match.opponent)}
                        </span>
                        <span className={`text-xs font-mono text-center font-bold rounded px-1.5 py-0.5 ${
                          match.result === 'W' 
                            ? (darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                          : match.result === 'D' 
                            ? (darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500')
                          : (darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600')
                        }`}>
                          {match.score}
                        </span>
                        <FormBadge result={match.result} darkMode={darkMode} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`p-8 rounded-xl text-center border ${
                darkMode ? 'bg-[#0a0a0a] border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <span className={`text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  {language === 'ko' ? '최근 폼 데이터가 없습니다' : 'No form data available'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── TREND TAB ── */}
        {activeTab === 'trend' && (
          <div className="space-y-3">
            <div className={`rounded-xl p-3 border ${
              darkMode ? 'bg-[#0a0a0a] border-gray-800' : 'bg-white border-gray-200'
            }`}>
              <div className={`text-[10px] uppercase tracking-widest mb-3 ${
                darkMode ? 'text-gray-600' : 'text-gray-400'
              }`}>
                {language === 'ko' ? '확률 추이 (누적)' : 'Probability Trend'}
              </div>
              
              <MatchTrendChart data={trendData} darkMode={darkMode} />
              
              {trendData.length > 0 && (
                <>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className={`text-center p-2 rounded-lg ${
                      darkMode ? 'bg-[#111]' : 'bg-gray-50'
                    }`}>
                      <div className={`text-[10px] mb-0.5 ${darkMode ? 'text-cyan-500/70' : 'text-cyan-600'}`}>
                        {language === 'ko' ? '홈 최고' : 'Home Peak'}
                      </div>
                      <div className={`text-lg font-mono font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                        {Math.max(...trendData.map(d => d.homeWinProbability)).toFixed(0)}%
                      </div>
                    </div>
                    <div className={`text-center p-2 rounded-lg ${
                      darkMode ? 'bg-[#111]' : 'bg-gray-50'
                    }`}>
                      <div className={`text-[10px] mb-0.5 ${darkMode ? 'text-gray-600' : 'text-gray-500'}`}>
                        {language === 'ko' ? '무승부 평균' : 'Draw Avg'}
                      </div>
                      <div className={`text-lg font-mono font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {(trendData.reduce((sum, d) => sum + d.drawProbability, 0) / trendData.length).toFixed(0)}%
                      </div>
                    </div>
                    <div className={`text-center p-2 rounded-lg ${
                      darkMode ? 'bg-[#111]' : 'bg-gray-50'
                    }`}>
                      <div className={`text-[10px] mb-0.5 ${darkMode ? 'text-amber-500/70' : 'text-amber-600'}`}>
                        {language === 'ko' ? '원정 최고' : 'Away Peak'}
                      </div>
                      <div className={`text-lg font-mono font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        {Math.max(...trendData.map(d => d.awayWinProbability)).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  
                  <p className={`text-[10px] text-center mt-2 ${darkMode ? 'text-gray-700' : 'text-gray-400'}`}>
                    {language === 'ko' 
                      ? `${trendData.length}개 데이터 포인트`
                      : `${trendData.length} data points`}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}