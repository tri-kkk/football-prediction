import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('match_id')

    if (!matchId) {
      return NextResponse.json(
        { success: false, error: 'match_id is required' },
        { status: 400 }
      )
    }

    // match_odds_latest에서 스코어 조회
    const { data, error } = await supabase
      .from('match_odds_latest')
      .select(`
        predicted_score_home,
        predicted_score_away,
        predicted_winner,
        home_probability,
        draw_probability,
        away_probability
      `)
      .eq('match_id', matchId.toString())
      .single()

    if (error) {
      console.error('❌ DB query error:', error)
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        predictedScoreHome: data.predicted_score_home,
        predictedScoreAway: data.predicted_score_away,
        predictedWinner: data.predicted_winner,
        homeProbability: data.home_probability,
        drawProbability: data.draw_probability,
        awayProbability: data.away_probability,
      }
    })

  } catch (error: any) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}