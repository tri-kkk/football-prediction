import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!
const API_FOOTBALL_HOST = 'v3.football.api-sports.io'

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
  'FSV Mainz 05': '마인츠',
  '1899 Hoffenheim': '호펜하임',
  'Nice': '니스',
  'Marseille': '마르세유',
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting match results collection...')

    // 🔥 수정: 지난 3일 범위로 한번에 조회
    const today = new Date()
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(today.getDate() - 3)

    const fromDate = threeDaysAgo.toISOString().split('T')[0]
    const toDate = today.toISOString().split('T')[0]

    console.log(`📅 Date range: ${fromDate} to ${toDate}`)

    let allFinishedMatches: any[] = []

    for (const league of LEAGUES) {
      console.log(`\n📊 Fetching ${league.name}...`)
      
      // 🔥 수정: from/to 범위로 한번에 조회
      const matches = await fetchFinishedMatches(league.apiId, fromDate, toDate)
      console.log(`  → Found ${matches.length} FT matches`)
      
      allFinishedMatches = [
        ...allFinishedMatches,
        ...matches.map((m: any) => ({ ...m, league: league.code }))
      ]
      
      await sleep(1000)
    }

    console.log(`\n✅ Total finished matches: ${allFinishedMatches.length}`)

    const uniqueMatches = Array.from(
      new Map(allFinishedMatches.map(m => [m.fixture.id, m])).values()
    )
    
    console.log(`🔍 After deduplication: ${uniqueMatches.length} unique matches`)

    const { data: predictions, error: predError } = await supabase
      .from('match_odds_latest')
      .select('*')
      .in('match_id', uniqueMatches.map(m => m.fixture.id))

    if (predError) {
      console.error('❌ Error fetching predictions:', predError)
      return NextResponse.json({ error: predError.message }, { status: 500 })
    }

    console.log(`📈 Found ${predictions?.length || 0} matches with predictions`)

    let savedCount = 0
    let skippedCount = 0

    for (const match of uniqueMatches) {
      const matchId = match.fixture.id
      const prediction = predictions?.find(p => p.match_id === matchId)

      if (!prediction) {
        console.log(`⏭️  Skip: ${match.teams.home.name} vs ${match.teams.away.name}`)
        skippedCount++
        continue
      }

      const finalScoreHome = match.goals.home
      const finalScoreAway = match.goals.away

      const { predictedWinner, predictedScoreHome, predictedScoreAway, probabilities} = 
        calculatePrediction(prediction)

      const { isCorrect, predictionType } = checkPrediction(
        { home: finalScoreHome, away: finalScoreAway },
        { home: predictedScoreHome, away: predictedScoreAway, winner: predictedWinner }
      )

      const resultData = {
        match_id: matchId,
        league: match.league,
        
        home_team: match.teams.home.name,
        away_team: match.teams.away.name,
        home_team_kr: TEAM_KR_MAP[match.teams.home.name] || match.teams.home.name,
        away_team_kr: TEAM_KR_MAP[match.teams.away.name] || match.teams.away.name,
        home_team_id: match.teams.home.id,
        away_team_id: match.teams.away.id,
        home_crest: match.teams.home.logo,
        away_crest: match.teams.away.logo,
        
        final_score_home: finalScoreHome,
        final_score_away: finalScoreAway,
        match_status: match.fixture.status.short,
        
        predicted_winner: predictedWinner,
        predicted_score_home: predictedScoreHome,
        predicted_score_away: predictedScoreAway,
        predicted_home_probability: probabilities.home,
        predicted_draw_probability: probabilities.draw,
        predicted_away_probability: probabilities.away,
        
        is_correct: isCorrect,
        prediction_type: predictionType,
        
        match_date: new Date(match.fixture.date),
        updated_at: new Date()
      }

      const { error: saveError } = await supabase
        .from('match_results')
        .upsert(resultData, { onConflict: 'match_id' })

      if (saveError) {
        console.error(`❌ Error saving match ${matchId}:`, saveError)
      } else {
        savedCount++
        console.log(`✅ ${match.teams.home.name} ${finalScoreHome}-${finalScoreAway} ${match.teams.away.name} | ${isCorrect ? '✅' : '❌'}`)
      }
    }

    return NextResponse.json({
      success: true,
      dateRange: `${fromDate} to ${toDate}`,
      finishedMatches: allFinishedMatches.length,
      uniqueMatches: uniqueMatches.length,
      withPredictions: predictions?.length || 0,
      saved: savedCount,
      skipped: skippedCount,
      message: `Collected ${savedCount} match results from last 3 days`
    })

  } catch (error) {
    console.error('❌ Error in collect-match-results:', error)
    return NextResponse.json(
      { error: 'Failed to collect match results' },
      { status: 500 }
    )
  }
}

// 🔥 수정: from/to 범위 사용
async function fetchFinishedMatches(leagueId: number, fromDate: string, toDate: string) {
  const url = `https://${API_FOOTBALL_HOST}/fixtures?league=${leagueId}&from=${fromDate}&to=${toDate}&status=FT`
  
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

function calculatePrediction(prediction: any) {
  const homeOdds = prediction.home_odds || 2.0
  const drawOdds = prediction.draw_odds || 3.5
  const awayOdds = prediction.away_odds || 3.0

  const homeProb = 1 / homeOdds
  const drawProb = 1 / drawOdds
  const awayProb = 1 / awayOdds
  const total = homeProb + drawProb + awayProb

  const probabilities = {
    home: Number(((homeProb / total) * 100).toFixed(2)),
    draw: Number(((drawProb / total) * 100).toFixed(2)),
    away: Number(((awayProb / total) * 100).toFixed(2))
  }

  let predictedWinner: 'home' | 'away' | 'draw' = 'home'
  if (probabilities.away > probabilities.home && probabilities.away > probabilities.draw) {
    predictedWinner = 'away'
  } else if (probabilities.draw > probabilities.home && probabilities.draw > probabilities.away) {
    predictedWinner = 'draw'
  }

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

function checkPrediction(
  actual: { home: number; away: number },
  predicted: { home: number; away: number; winner: 'home' | 'away' | 'draw' }
) {
  if (actual.home === predicted.home && actual.away === predicted.away) {
    return { isCorrect: true, predictionType: 'exact' as const }
  }

  const actualWinner = 
    actual.home > actual.away ? 'home' :
    actual.away > actual.home ? 'away' : 'draw'

  if (actualWinner === predicted.winner) {
    return { isCorrect: true, predictionType: 'winner_only' as const }
  }

  return { isCorrect: false, predictionType: 'wrong' as const }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}