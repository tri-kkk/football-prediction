import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// API-Football 설정
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!
const API_FOOTBALL_HOST = 'v3.football.api-sports.io'

// 리그 매핑
const LEAGUES = [
  { code: 'PL', apiId: 39, name: 'Premier League' },
  { code: 'PD', apiId: 140, name: 'La Liga' },
  { code: 'BL1', apiId: 78, name: 'Bundesliga' },
  { code: 'SA', apiId: 135, name: 'Serie A' },
  { code: 'FL1', apiId: 61, name: 'Ligue 1' },
  { code: 'PPL', apiId: 94, name: 'Primeira Liga' },
  { code: 'DED', apiId: 88, name: 'Eredivisie' },
  { code: 'CL', apiId: 2, name: 'Champions League' },
  { code: 'EL', apiId: 3, name: 'Europa League' },
  { code: 'ELC', apiId: 40, name: 'Championship' }
]

// 팀 이름 한글 매핑 (간단 버전)
const TEAM_KR_MAP: { [key: string]: string } = {
  'Manchester City': '맨체스터 시티',
  'Liverpool': '리버풀',
  'Arsenal': '아스날',
  'Chelsea': '첼시',
  'Manchester United': '맨체스터 유나이티드',
  'Tottenham': '토트넘',
  'Barcelona': '바르셀로나',
  'Real Madrid': '레알 마드리드',
  'Atletico Madrid': '아틀레티코 마드리드',
  'Bayern Munich': '바이에른 뮌헨',
  'Borussia Dortmund': '도르트문트',
  // ... 더 추가 가능
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting match results collection...')

    // 1. 어제와 오늘 종료된 경기 수집
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    let allFinishedMatches: any[] = []

    // 각 리그별로 종료된 경기 가져오기
    for (const league of LEAGUES) {
      console.log(`📊 Fetching finished matches for ${league.name}...`)
      
      // 어제 경기
      const yesterdayMatches = await fetchFinishedMatches(league.apiId, yesterdayStr)
      // 오늘 경기
      const todayMatches = await fetchFinishedMatches(league.apiId, todayStr)
      
      allFinishedMatches = [
        ...allFinishedMatches,
        ...yesterdayMatches.map((m: any) => ({ ...m, league: league.code })),
        ...todayMatches.map((m: any) => ({ ...m, league: league.code }))
      ]
      
      // API Rate Limit 방지
      await sleep(1000)
    }

    console.log(`✅ Found ${allFinishedMatches.length} finished matches`)

    // 2. 우리가 예측했던 경기 찾기
    const { data: predictions, error: predError } = await supabase
      .from('match_odds_latest')
      .select('*')
      .in('match_id', allFinishedMatches.map(m => m.fixture.id))

    if (predError) {
      console.error('❌ Error fetching predictions:', predError)
      return NextResponse.json({ error: predError.message }, { status: 500 })
    }

    console.log(`📈 Found ${predictions?.length || 0} matches with predictions`)

    // 3. 각 경기별로 적중 여부 계산 및 저장
    let savedCount = 0
    let skippedCount = 0

    for (const match of allFinishedMatches) {
      const matchId = match.fixture.id
      const prediction = predictions?.find(p => p.match_id === matchId)

      if (!prediction) {
        skippedCount++
        continue // 예측 없는 경기는 스킵
      }

      // 실제 스코어
      const finalScoreHome = match.goals.home
      const finalScoreAway = match.goals.away

      // 예측 스코어 (오즈 기반 계산)
      const { predictedWinner, predictedScoreHome, predictedScoreAway, probabilities } = 
        calculatePrediction(prediction)

      // 적중 여부 계산
      const { isCorrect, predictionType } = checkPrediction(
        { home: finalScoreHome, away: finalScoreAway },
        { home: predictedScoreHome, away: predictedScoreAway, winner: predictedWinner }
      )

      // match_results에 저장
      const resultData = {
        match_id: matchId,
        league: match.league,
        
        // 팀 정보
        home_team: match.teams.home.name,
        away_team: match.teams.away.name,
        home_team_kr: TEAM_KR_MAP[match.teams.home.name] || match.teams.home.name,
        away_team_kr: TEAM_KR_MAP[match.teams.away.name] || match.teams.away.name,
        home_team_id: match.teams.home.id,
        away_team_id: match.teams.away.id,
        home_crest: match.teams.home.logo,
        away_crest: match.teams.away.logo,
        
        // 실제 결과
        final_score_home: finalScoreHome,
        final_score_away: finalScoreAway,
        match_status: match.fixture.status.short,
        
        // 예측
        predicted_winner: predictedWinner,
        predicted_score_home: predictedScoreHome,
        predicted_score_away: predictedScoreAway,
        predicted_home_probability: probabilities.home,
        predicted_draw_probability: probabilities.draw,
        predicted_away_probability: probabilities.away,
        
        // 적중 여부
        is_correct: isCorrect,
        prediction_type: predictionType,
        
        // 날짜
        match_date: new Date(match.fixture.date),
        updated_at: new Date()
      }

      // Upsert (있으면 업데이트, 없으면 생성)
      const { error: saveError } = await supabase
        .from('match_results')
        .upsert(resultData, { onConflict: 'match_id' })

      if (saveError) {
        console.error(`❌ Error saving match ${matchId}:`, saveError)
      } else {
        savedCount++
        console.log(`✅ Saved: ${match.teams.home.name} ${finalScoreHome}-${finalScoreAway} ${match.teams.away.name} | Prediction: ${predictedScoreHome}-${predictedScoreAway} | ${isCorrect ? '✅ Correct' : '❌ Wrong'}`)
      }
    }

    return NextResponse.json({
      success: true,
      finishedMatches: allFinishedMatches.length,
      withPredictions: predictions?.length || 0,
      saved: savedCount,
      skipped: skippedCount,
      message: `Collected ${savedCount} match results`
    })

  } catch (error) {
    console.error('❌ Error in collect-match-results:', error)
    return NextResponse.json(
      { error: 'Failed to collect match results' },
      { status: 500 }
    )
  }
}

// ========================================
// 헬퍼 함수들
// ========================================

// API-Football에서 종료된 경기 가져오기
async function fetchFinishedMatches(leagueId: number, date: string) {
  const url = `https://${API_FOOTBALL_HOST}/fixtures?league=${leagueId}&date=${date}&status=FT`
  
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': API_FOOTBALL_KEY,
      'x-rapidapi-host': API_FOOTBALL_HOST
    }
  })

  if (!response.ok) {
    console.error(`❌ API-Football error: ${response.status}`)
    return []
  }

  const data = await response.json()
  return data.response || []
}

// 오즈 기반 예측 계산
function calculatePrediction(prediction: any) {
  const homeOdds = prediction.home_odds || 2.0
  const drawOdds = prediction.draw_odds || 3.5
  const awayOdds = prediction.away_odds || 3.0

  // 확률 계산 (오즈 역수)
  const homeProb = 1 / homeOdds
  const drawProb = 1 / drawOdds
  const awayProb = 1 / awayOdds
  const total = homeProb + drawProb + awayProb

  // 정규화
  const probabilities = {
    home: Number(((homeProb / total) * 100).toFixed(2)),
    draw: Number(((drawProb / total) * 100).toFixed(2)),
    away: Number(((awayProb / total) * 100).toFixed(2))
  }

  // 승자 예측
  let predictedWinner: 'home' | 'away' | 'draw' = 'home'
  if (probabilities.away > probabilities.home && probabilities.away > probabilities.draw) {
    predictedWinner = 'away'
  } else if (probabilities.draw > probabilities.home && probabilities.draw > probabilities.away) {
    predictedWinner = 'draw'
  }

  // 스코어 예측 (간단한 알고리즘)
  let predictedScoreHome = 1
  let predictedScoreAway = 1

  if (predictedWinner === 'home') {
    predictedScoreHome = probabilities.home > 60 ? 2 : 1
    predictedScoreAway = probabilities.home > 60 ? 0 : 1
  } else if (predictedWinner === 'away') {
    predictedScoreHome = probabilities.away > 60 ? 0 : 1
    predictedScoreAway = probabilities.away > 60 ? 2 : 1
  } else {
    predictedScoreHome = 1
    predictedScoreAway = 1
  }

  return {
    predictedWinner,
    predictedScoreHome,
    predictedScoreAway,
    probabilities
  }
}

// 적중 여부 체크
function checkPrediction(
  actual: { home: number; away: number },
  predicted: { home: number; away: number; winner: 'home' | 'away' | 'draw' }
) {
  // 완벽 적중
  if (actual.home === predicted.home && actual.away === predicted.away) {
    return { isCorrect: true, predictionType: 'exact' as const }
  }

  // 승부만 적중
  const actualWinner = 
    actual.home > actual.away ? 'home' :
    actual.away > actual.home ? 'away' : 'draw'

  if (actualWinner === predicted.winner) {
    return { isCorrect: true, predictionType: 'winner_only' as const }
  }

  // 틀림
  return { isCorrect: false, predictionType: 'wrong' as const }
}

// Sleep 함수
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
