// app/api/predictions/save/route.ts
// 기존 match_predictions 테이블 구조에 맞춤

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      matchId,
      league,
      homeTeam,
      awayTeam,
      homeWinProbability,
      drawProbability,
      awayWinProbability,
      predictedHomeScore,
      predictedAwayScore,
      matchDate
    } = body

    // 필수 필드 검증
    if (!matchId || !homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: 'Missing required fields: matchId, homeTeam, awayTeam' },
        { status: 400 }
      )
    }

    // 예측 승자 결정
    const homeProb = parseFloat(homeWinProbability) || 33
    const drawProb = parseFloat(drawProbability) || 34
    const awayProb = parseFloat(awayWinProbability) || 33

    let predictedWinner = 'draw'
    if (homeProb > drawProb && homeProb > awayProb) {
      predictedWinner = 'home'
    } else if (awayProb > drawProb && awayProb > homeProb) {
      predictedWinner = 'away'
    }

    // Supabase UPSERT - 기존 테이블 구조에 맞춤
    const { data, error } = await supabase
      .from('match_predictions')
      .upsert({
        match_id: parseInt(matchId),  // integer 타입
        home_team: homeTeam,
        away_team: awayTeam,
        league: league || null,
        predicted_home_win: Math.round(homeProb),      // integer
        predicted_draw: Math.round(drawProb),          // integer
        predicted_away_win: Math.round(awayProb),      // integer
        predicted_home_score: parseInt(predictedHomeScore) || 1,  // 새로 추가된 컬럼
        predicted_away_score: parseInt(predictedAwayScore) || 1,  // 새로 추가된 컬럼
        predicted_winner: predictedWinner,                        // 새로 추가된 컬럼
        match_date: matchDate || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'match_id'
      })
      .select()

    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Prediction saved for match ${matchId}: ${homeTeam} vs ${awayTeam}`)
    
    return NextResponse.json({
      success: true,
      message: 'Prediction saved successfully',
      data: data?.[0] || null
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: 특정 경기의 저장된 예측 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('matchId')

    if (!matchId) {
      return NextResponse.json(
        { error: 'matchId is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('match_predictions')
      .select('*')
      .eq('match_id', parseInt(matchId))
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Supabase error:', error)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || null
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
