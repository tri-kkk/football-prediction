import { supabase } from './supabase'

/**
 * 경기 예측 저장 (중복 방지 포함)
 */
export async function savePrediction(match: any, probability: any) {
  try {
    // 1️⃣ 이미 저장된 경기인지 확인
    const { data: existing } = await supabase
      .from('match_predictions')
      .select('id')
      .eq('match_id', match.id)
      .single()
    
    // 이미 저장되어 있으면 스킵
    if (existing) {
      console.log('⏭️  이미 저장된 경기:', match.homeTeam, 'vs', match.awayTeam)
      return true
    }
    
    // 2️⃣ 새로운 경기만 저장
    const { data, error } = await supabase
      .from('match_predictions')
      .insert({
        match_id: match.id,
        home_team: match.homeTeam,
        away_team: match.awayTeam,
        predicted_home_win: probability.homeWin,
        predicted_draw: probability.draw,
        predicted_away_win: probability.awayWin,
        match_date: new Date(match.date),
      })
      .select()
    
    if (error) {
      console.error('❌ 저장 실패:', error.message)
      return false
    }
    
    console.log('✅ 새 예측 저장:', match.homeTeam, 'vs', match.awayTeam)
    return true
    
  } catch (err) {
    console.error('❌ 예외 발생:', err)
    return false
  }
}

/**
 * 경기 결과 업데이트 (경기 종료 후)
 */
export async function updateMatchResult(
  matchId: number, 
  homeScore: number, 
  awayScore: number
) {
  try {
    const { error } = await supabase
      .from('match_predictions')
      .update({
        actual_home_score: homeScore,
        actual_away_score: awayScore,
      })
      .eq('match_id', matchId)
    
    if (error) {
      console.error('❌ 결과 업데이트 실패:', error)
      return false
    }
    
    console.log('✅ 경기 결과 업데이트 완료:', matchId)
    return true
    
  } catch (err) {
    console.error('❌ 예외 발생:', err)
    return false
  }
}

/**
 * 모든 예측 데이터 가져오기
 */
export async function getAllPredictions() {
  try {
    const { data, error } = await supabase
      .from('match_predictions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (error) {
      console.error('❌ 데이터 로드 실패:', error)
      return []
    }
    
    return data || []
    
  } catch (err) {
    console.error('❌ 예외 발생:', err)
    return []
  }
}

/**
 * 예측 정확도 계산
 */
export async function calculateAccuracy() {
  try {
    const { data, error } = await supabase
      .from('match_predictions')
      .select('*')
      .not('actual_home_score', 'is', null)
      .not('actual_away_score', 'is', null)
    
    if (error || !data || data.length === 0) {
      return {
        total: 0,
        correct: 0,
        accuracy: 0
      }
    }
    
    let correct = 0
    
    data.forEach(prediction => {
      const actualResult = 
        prediction.actual_home_score > prediction.actual_away_score ? 'home' :
        prediction.actual_home_score < prediction.actual_away_score ? 'away' : 'draw'
      
      const predictedResult = 
        prediction.predicted_home_win > Math.max(prediction.predicted_draw, prediction.predicted_away_win) ? 'home' :
        prediction.predicted_away_win > Math.max(prediction.predicted_draw, prediction.predicted_home_win) ? 'away' : 'draw'
      
      if (actualResult === predictedResult) {
        correct++
      }
    })
    
    return {
      total: data.length,
      correct,
      accuracy: Math.round((correct / data.length) * 100)
    }
    
  } catch (err) {
    console.error('❌ 정확도 계산 실패:', err)
    return {
      total: 0,
      correct: 0,
      accuracy: 0
    }
  }
}