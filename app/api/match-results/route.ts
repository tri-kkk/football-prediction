import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const league = searchParams.get('league') || 'ALL'
    const period = searchParams.get('period') || 'week'
    const filter = searchParams.get('filter') || 'all'

    // 날짜 범위 계산
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) // 1년
        break
    }

    // 쿼리 구성
    let query = supabase
      .from('match_results')
      .select('*')
      .gte('match_date', startDate.toISOString())
      .order('match_date', { ascending: false })
      .limit(50)

    // 리그 필터
    if (league !== 'ALL') {
      query = query.eq('league', league)
    }

    // 적중 필터
    if (filter === 'correct') {
      query = query.eq('is_correct', true)
    } else if (filter === 'wrong') {
      query = query.eq('is_correct', false)
    }

    const { data: results, error } = await query

    if (error) {
      console.error('DB 조회 실패:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 통계 계산
    const total = results?.length || 0
    const correct = results?.filter(r => r.is_correct).length || 0
    const accuracy = total > 0 ? (correct / total) * 100 : 0

    // 리그별 통계 (선택적)
    const byLeague: { [key: string]: { total: number; correct: number; accuracy: number } } = {}
    results?.forEach(r => {
      if (!byLeague[r.league]) {
        byLeague[r.league] = { total: 0, correct: 0, accuracy: 0 }
      }
      byLeague[r.league].total++
      if (r.is_correct) byLeague[r.league].correct++
    })

    Object.keys(byLeague).forEach(league => {
      const stats = byLeague[league]
      stats.accuracy = (stats.correct / stats.total) * 100
    })

    // 데이터 변환 (카멜케이스로)
    const formattedResults = results?.map(r => ({
      id: r.id,
      league: r.league,
      homeTeam: r.home_team,
      awayTeam: r.away_team,
      homeTeamKR: r.home_team_kr,
      awayTeamKR: r.away_team_kr,
      homeCrest: r.home_crest || `https://media.api-sports.io/football/teams/${r.home_team_id}.png`,
      awayCrest: r.away_crest || `https://media.api-sports.io/football/teams/${r.away_team_id}.png`,
      
      finalScoreHome: r.final_score_home,
      finalScoreAway: r.final_score_away,
      matchStatus: r.match_status,
      
      predictedWinner: r.predicted_winner,
      predictedScoreHome: r.predicted_score_home,
      predictedScoreAway: r.predicted_score_away,
      predictedHomeProbability: r.predicted_home_probability,
      predictedDrawProbability: r.predicted_draw_probability,
      predictedAwayProbability: r.predicted_away_probability,
      
      isCorrect: r.is_correct,
      predictionType: r.prediction_type,
      
      matchDate: r.match_date,
      time: formatTime(r.match_date)
    })) || []

    return NextResponse.json({
      results: formattedResults,
      stats: {
        total,
        correct,
        accuracy: parseFloat(accuracy.toFixed(1)),
        byLeague
      }
    })

  } catch (error: any) {
    console.error('API 에러:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// 시간 포맷 (UTC → KST)
function formatTime(utcDateString: string): string {
  const utcDate = new Date(utcDateString)
  const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000))
  
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kstDate.getUTCDate()).padStart(2, '0')
  const hours = String(kstDate.getUTCHours()).padStart(2, '0')
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0')
  
  return `${month}/${day} ${hours}:${minutes}`
}