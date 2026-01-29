import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - 경기 데이터 조회 (회차별)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const round = searchParams.get('round')

    // 회차 목록 항상 조회 (기본 1000개 제한 해제)
    const { data: roundData } = await supabase
      .from('proto_matches')
      .select('round')
      .limit(10000)
    
    // 숫자로 내림차순 정렬 (11 → 10 → 9)
    const rounds = [...new Set(roundData?.map(row => row.round) || [])]
      .sort((a, b) => parseInt(b) - parseInt(a))

    if (round) {
      // 특정 회차 조회
      const { data, error } = await supabase
        .from('proto_matches')
        .select('*')
        .eq('round', round)
        .order('match_seq', { ascending: true })

      if (error) throw error

      // 프론트엔드 형식으로 변환
      const matches = data.map(row => {
        // gameDate에서 koreanDate 추출 (예: "01.21(화)")
        let koreanDate = ''
        if (row.game_date) {
          const d = new Date(row.game_date)
          const days = ['일', '월', '화', '수', '목', '금', '토']
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          const dayName = days[d.getDay()]
          koreanDate = `${month}.${day}(${dayName})`
        }
        
        return {
          matchSeq: row.match_seq,
          gameDate: row.game_date,
          koreanDate,
          koreanTime: row.korean_time,
          homeTeam: row.home_team,
          awayTeam: row.away_team,
          leagueName: row.league_name,
          homeOdds: row.home_odds ? parseFloat(row.home_odds) : null,
          drawOdds: row.draw_odds ? parseFloat(row.draw_odds) : null,
          awayOdds: row.away_odds ? parseFloat(row.away_odds) : null,
          resultCode: row.result_code,
          matchType: row.match_type || '승무패',
          handicapValue: row.handicap_value ? parseFloat(row.handicap_value) : null,
          totalValue: row.total_value ? parseFloat(row.total_value) : null,
        }
      })

      return NextResponse.json({ success: true, data: matches, rounds })
    } else {
      // 회차 목록만 반환
      return NextResponse.json({ success: true, rounds })
    }
  } catch (error) {
    console.error('Proto matches GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch matches' },
      { status: 500 }
    )
  }
}

// POST - 경기 데이터 저장 (회차 단위)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { round, matches } = body

    if (!round || !matches || !Array.isArray(matches)) {
      return NextResponse.json(
        { success: false, error: 'Missing round or matches' },
        { status: 400 }
      )
    }

    // 기존 해당 회차 데이터 삭제
    await supabase
      .from('proto_matches')
      .delete()
      .eq('round', round)

    // 새 데이터 삽입
    const rows = matches.map(match => ({
      round,
      match_seq: match.matchSeq,
      game_date: match.gameDate,
      korean_time: match.koreanTime,
      home_team: match.homeTeam,
      away_team: match.awayTeam,
      league_name: match.leagueName,
      home_odds: match.homeOdds,
      draw_odds: match.drawOdds,
      away_odds: match.awayOdds,
      result_code: match.resultCode,
      match_type: match.matchType || '승무패',
      handicap_value: match.handicapValue,
      total_value: match.totalValue,
    }))

    const { error } = await supabase
      .from('proto_matches')
      .insert(rows)

    if (error) throw error

    // 🆕 해당 회차 슬립 상태 업데이트
    await updateSlipStatus(round, matches)

    return NextResponse.json({ 
      success: true, 
      message: `${round}회차 ${matches.length}개 경기 저장 완료` 
    })
  } catch (error) {
    console.error('Proto matches POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save matches' },
      { status: 500 }
    )
  }
}

// DELETE - 회차 데이터 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const round = searchParams.get('round')

    if (!round) {
      return NextResponse.json(
        { success: false, error: 'Missing round' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('proto_matches')
      .delete()
      .eq('round', round)

    if (error) throw error

    return NextResponse.json({ success: true, message: `${round}회차 삭제 완료` })
  } catch (error) {
    console.error('Proto matches DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete matches' },
      { status: 500 }
    )
  }
}

// 🆕 슬립 상태 자동 업데이트 함수
async function updateSlipStatus(round: string, matches: any[]) {
  try {
    // 해당 회차의 pending 슬립 조회
    const { data: slips, error: fetchError } = await supabase
      .from('proto_slips')
      .select('*')
      .eq('round', round)
      .eq('status', 'pending')

    if (fetchError || !slips || slips.length === 0) return

    for (const slip of slips) {
      let allFinished = true
      let allCorrect = true

      for (const sel of slip.selections) {
        const match = matches.find(m => m.matchSeq === sel.matchSeq)
        if (!match || match.resultCode === null) {
          allFinished = false
          break
        }
        if (match.resultCode !== sel.prediction) {
          allCorrect = false
        }
      }

      if (allFinished) {
        await supabase
          .from('proto_slips')
          .update({ status: allCorrect ? 'won' : 'lost' })
          .eq('id', slip.id)
      }
    }
  } catch (error) {
    console.error('Update slip status error:', error)
  }
}
