import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// =====================================================
// GET: 투표 현황 조회
// /api/poll?matchId=1234567
// /api/poll?matchId=1234567&voterId=xxx (내 투표 확인)
// =====================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('matchId')
    const voterId = searchParams.get('voterId')

    if (!matchId) {
      return NextResponse.json(
        { error: 'matchId is required' },
        { status: 400 }
      )
    }

    // 1. 투표 집계 조회
    const { data: pollData, error: pollError } = await supabase
      .from('match_polls')
      .select('*')
      .eq('match_id', matchId)
      .single()

    // 2. 내 투표 확인 (voterId가 있는 경우)
    let myVote = null
    if (voterId) {
      const { data: voteData } = await supabase
        .from('match_poll_votes')
        .select('vote')
        .eq('match_id', matchId)
        .eq('voter_id', voterId)
        .single()
      
      myVote = voteData?.vote || null
    }

    // 투표 데이터가 없으면 기본값 반환
    if (pollError || !pollData) {
      return NextResponse.json({
        matchId,
        homeVotes: 0,
        drawVotes: 0,
        awayVotes: 0,
        totalVotes: 0,
        homePercent: 0,
        drawPercent: 0,
        awayPercent: 0,
        myVote
      })
    }

    // 퍼센트 계산
    const total = pollData.home_votes + pollData.draw_votes + pollData.away_votes
    const homePercent = total > 0 ? Math.round((pollData.home_votes / total) * 100) : 0
    const drawPercent = total > 0 ? Math.round((pollData.draw_votes / total) * 100) : 0
    const awayPercent = total > 0 ? Math.round((pollData.away_votes / total) * 100) : 0

    return NextResponse.json({
      matchId: pollData.match_id,
      homeTeam: pollData.home_team,
      awayTeam: pollData.away_team,
      homeVotes: pollData.home_votes,
      drawVotes: pollData.draw_votes,
      awayVotes: pollData.away_votes,
      totalVotes: total,
      homePercent,
      drawPercent,
      awayPercent,
      actualResult: pollData.actual_result,
      myVote
    })
  } catch (error) {
    console.error('Poll GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch poll data' },
      { status: 500 }
    )
  }
}

// =====================================================
// POST: 투표하기
// Body: { matchId, voterId, vote, homeTeam, awayTeam, leagueCode, matchDate }
// =====================================================
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { matchId, voterId, vote, homeTeam, awayTeam, leagueCode, matchDate } = body

    // 유효성 검사
    if (!matchId || !voterId || !vote) {
      return NextResponse.json(
        { error: 'matchId, voterId, vote are required' },
        { status: 400 }
      )
    }

    if (!['home', 'draw', 'away'].includes(vote)) {
      return NextResponse.json(
        { error: 'vote must be home, draw, or away' },
        { status: 400 }
      )
    }

    // 1. 기존 투표 확인
    const { data: existingVote } = await supabase
      .from('match_poll_votes')
      .select('vote')
      .eq('match_id', matchId)
      .eq('voter_id', voterId)
      .single()

    const previousVote = existingVote?.vote || null

    // 2. 투표 기록 저장/업데이트
    const { error: voteError } = await supabase
      .from('match_poll_votes')
      .upsert({
        match_id: matchId,
        voter_id: voterId,
        vote: vote
      }, {
        onConflict: 'match_id,voter_id'
      })

    if (voteError) {
      console.error('Vote insert error:', voteError)
      return NextResponse.json(
        { error: 'Failed to save vote' },
        { status: 500 }
      )
    }

    // 3. 투표 집계 테이블 확인/생성
    const { data: pollData } = await supabase
      .from('match_polls')
      .select('*')
      .eq('match_id', matchId)
      .single()

    if (!pollData) {
      // 새 경기 - 집계 테이블 생성
      await supabase
        .from('match_polls')
        .insert({
          match_id: matchId,
          home_team: homeTeam || 'Unknown',
          away_team: awayTeam || 'Unknown',
          league_code: leagueCode,
          match_date: matchDate,
          home_votes: vote === 'home' ? 1 : 0,
          draw_votes: vote === 'draw' ? 1 : 0,
          away_votes: vote === 'away' ? 1 : 0
        })
    } else {
      // 기존 경기 - 집계 업데이트
      let updateData: Record<string, number> = {}

      // 이전 투표가 있으면 감소
      if (previousVote && previousVote !== vote) {
        if (previousVote === 'home') updateData.home_votes = pollData.home_votes - 1
        if (previousVote === 'draw') updateData.draw_votes = pollData.draw_votes - 1
        if (previousVote === 'away') updateData.away_votes = pollData.away_votes - 1
      }

      // 새 투표 증가 (이전과 다른 경우에만)
      if (previousVote !== vote) {
        if (vote === 'home') updateData.home_votes = (updateData.home_votes ?? pollData.home_votes) + 1
        if (vote === 'draw') updateData.draw_votes = (updateData.draw_votes ?? pollData.draw_votes) + 1
        if (vote === 'away') updateData.away_votes = (updateData.away_votes ?? pollData.away_votes) + 1
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('match_polls')
          .update(updateData)
          .eq('match_id', matchId)
      }
    }

    // 4. 업데이트된 집계 반환
    const { data: updatedPoll } = await supabase
      .from('match_polls')
      .select('*')
      .eq('match_id', matchId)
      .single()

    if (updatedPoll) {
      const total = updatedPoll.home_votes + updatedPoll.draw_votes + updatedPoll.away_votes
      
      return NextResponse.json({
        success: true,
        matchId,
        vote,
        previousVote,
        homeVotes: updatedPoll.home_votes,
        drawVotes: updatedPoll.draw_votes,
        awayVotes: updatedPoll.away_votes,
        totalVotes: total,
        homePercent: total > 0 ? Math.round((updatedPoll.home_votes / total) * 100) : 0,
        drawPercent: total > 0 ? Math.round((updatedPoll.draw_votes / total) * 100) : 0,
        awayPercent: total > 0 ? Math.round((updatedPoll.away_votes / total) * 100) : 0
      })
    }

    return NextResponse.json({ success: true, vote })
  } catch (error) {
    console.error('Poll POST error:', error)
    return NextResponse.json(
      { error: 'Failed to submit vote' },
      { status: 500 }
    )
  }
}