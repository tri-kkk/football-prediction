// app/api/baseball/predict/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Python API URL
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const { matchId, homeTeam, awayTeam, season } = await request.json()
    
    console.log('🎯 예측 요청:', { matchId, homeTeam, awayTeam, season })
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // 팀명 정규화
    const normalizeTeamName = (team: string) => {
      const mapping: Record<string, string> = {
        'Oakland Athletics': 'Athletics',
        'Cleveland Indians': 'Cleveland Guardians'
      }
      return mapping[team] || team
    }
    
    const homeTeamNormalized = normalizeTeamName(homeTeam)
    const awayTeamNormalized = normalizeTeamName(awayTeam)
    
    // 1. 홈팀 통계 가져오기
    const { data: homeStats, error: homeError } = await supabase
      .from('baseball_team_season_stats')
      .select('*')
      .eq('team_name', homeTeamNormalized)
      .eq('season', season)
      .single()
    
    if (homeError || !homeStats) {
      console.error('홈팀 통계 오류:', homeError)
      return NextResponse.json({
        error: `홈팀 통계를 찾을 수 없습니다: ${homeTeamNormalized}`
      }, { status: 404 })
    }
    
    // 2. 원정팀 통계 가져오기
    const { data: awayStats, error: awayError } = await supabase
      .from('baseball_team_season_stats')
      .select('*')
      .eq('team_name', awayTeamNormalized)
      .eq('season', season)
      .single()
    
    if (awayError || !awayStats) {
      console.error('원정팀 통계 오류:', awayError)
      return NextResponse.json({
        error: `원정팀 통계를 찾을 수 없습니다: ${awayTeamNormalized}`
      }, { status: 404 })
    }
    
    console.log('✅ 팀 통계 로드 성공')
    
    // 3. Features 계산
    const parseLastTen = (record: string) => {
      try {
        if (!record) return 0.5
        const [wins, losses] = record.split('-').map(Number)
        return wins / (wins + losses)
      } catch {
        return 0.5
      }
    }
    
    const features = {
      win_pct_home: homeStats.win_pct || 0.5,
      win_pct_away: awayStats.win_pct || 0.5,
      win_pct_diff: (homeStats.win_pct || 0.5) - (awayStats.win_pct || 0.5),
      
      team_era_home: homeStats.team_era || 4.5,
      team_era_away: awayStats.team_era || 4.5,
      era_diff: (awayStats.team_era || 4.5) - (homeStats.team_era || 4.5),
      
      team_runs_per_game_home: homeStats.team_runs_per_game || 4.5,
      team_runs_per_game_away: awayStats.team_runs_per_game || 4.5,
      rpg_diff: (homeStats.team_runs_per_game || 4.5) - (awayStats.team_runs_per_game || 4.5),
      
      home_home_win_pct: homeStats.home_wins / (homeStats.home_wins + homeStats.home_losses) || 0.5,
      away_away_win_pct: awayStats.away_wins / (awayStats.away_wins + awayStats.away_losses) || 0.5,
      
      home_recent_form: parseLastTen(homeStats.last_10_record || '5-5'),
      away_recent_form: parseLastTen(awayStats.last_10_record || '5-5'),
    }
    
    console.log('✅ Features 계산 완료')
    
    // 4. Python 모델 API 호출
    console.log('🤖 Python API 호출:', PYTHON_API_URL)
    
    const pythonResponse = await fetch(`${PYTHON_API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features })
    })
    
    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text()
      console.error('Python API 오류:', errorText)
      throw new Error(`Python API 오류: ${pythonResponse.status}`)
    }
    
    const prediction = await pythonResponse.json()
    
    console.log('✅ 예측 완료:', prediction)
    
    // 5. AI 인사이트 생성
    const insights = {
      // 주요 영향 요소 (Feature Importance 기반)
      keyFactors: [
        {
          name: '승률 차이',
          value: features.win_pct_diff,
          impact: Math.abs(features.win_pct_diff) * 100,
          description: features.win_pct_diff > 0 
            ? `${homeTeam}이(가) ${Math.abs(features.win_pct_diff * 100).toFixed(1)}% 더 높은 승률`
            : `${awayTeam}이(가) ${Math.abs(features.win_pct_diff * 100).toFixed(1)}% 더 높은 승률`
        },
        {
          name: '평균 득점 차이',
          value: features.rpg_diff,
          impact: Math.abs(features.rpg_diff) * 15,
          description: features.rpg_diff > 0
            ? `${homeTeam}이(가) 경기당 ${Math.abs(features.rpg_diff).toFixed(1)}점 더 많이 득점`
            : `${awayTeam}이(가) 경기당 ${Math.abs(features.rpg_diff).toFixed(1)}점 더 많이 득점`
        },
        {
          name: '방어율 차이',
          value: features.era_diff,
          impact: Math.abs(features.era_diff) * 10,
          description: features.era_diff > 0
            ? `${homeTeam}의 방어율이 ${Math.abs(features.era_diff).toFixed(2)} 더 우수`
            : `${awayTeam}의 방어율이 ${Math.abs(features.era_diff).toFixed(2)} 더 우수`
        }
      ].sort((a, b) => b.impact - a.impact),
      
      // 홈/원정 어드밴티지
      homeAdvantage: {
        homeRecord: `${(features.home_home_win_pct * 100).toFixed(1)}%`,
        awayRecord: `${(features.away_away_win_pct * 100).toFixed(1)}%`,
        advantage: features.home_home_win_pct - features.away_away_win_pct
      },
      
      // 최근 폼
      recentForm: {
        home: `${(features.home_recent_form * 100).toFixed(0)}%`,
        away: `${(features.away_recent_form * 100).toFixed(0)}%`
      },
      
      // 예측 요약
      summary: prediction.grade === 'PICK' 
        ? `높은 신뢰도로 ${prediction.home_win_prob > 0.5 ? homeTeam : awayTeam} 승리 예측`
        : prediction.grade === 'GOOD'
        ? `${prediction.home_win_prob > 0.5 ? homeTeam : awayTeam} 우세 예상`
        : '접전 예상, 신중한 접근 필요'
    }
    
    // 6. 결과 반환
    return NextResponse.json({
      success: true,
      matchId,
      homeTeam,
      awayTeam,
      season,
      prediction: {
        homeWinProb: prediction.home_win_prob,
        awayWinProb: prediction.away_win_prob,
        overProb: prediction.over_prob,
        underProb: prediction.under_prob,
        confidence: prediction.confidence,
        grade: prediction.grade
      },
      insights,
      features,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ 예측 오류:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 })
  }
}