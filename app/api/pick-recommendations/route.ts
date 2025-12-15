// app/api/pick-recommendations/route.ts
// PICK 추천 경기 조회 및 결과 업데이트 API

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: PICK 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')  // YYYY-MM-DD
    const league = searchParams.get('league')
    const period = searchParams.get('period')  // 'today' | 'week' | 'month' | 'all'
    const status = searchParams.get('status')  // 'all' | 'correct' | 'incorrect' | 'pending'
    
    let query = supabase
      .from('pick_recommendations')
      .select('*')
      .order('commence_time', { ascending: false })
    
    // 날짜 필터
    if (date) {
      const startOfDay = `${date}T00:00:00.000Z`
      const endOfDay = `${date}T23:59:59.999Z`
      query = query
        .gte('commence_time', startOfDay)
        .lte('commence_time', endOfDay)
    }
    
    // 기간 필터
    if (period && !date) {
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
        default:
          startDate = new Date(0)
      }
      
      query = query.gte('commence_time', startDate.toISOString())
    }
    
    // 리그 필터
    if (league && league !== 'ALL') {
      query = query.eq('league_code', league)
    }
    
    // 상태 필터
    if (status) {
      switch (status) {
        case 'correct':
          query = query.eq('is_correct', true)
          break
        case 'incorrect':
          query = query.eq('is_correct', false)
          break
        case 'pending':
          query = query.is('is_correct', null)
          break
      }
    }
    
    // 최대 100개 제한
    query = query.limit(100)
    
    const { data: picks, error } = await query
    
    if (error) {
      console.error('Error fetching picks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // 통계 계산
    const total = picks?.length || 0
    const correct = picks?.filter(p => p.is_correct === true).length || 0
    const incorrect = picks?.filter(p => p.is_correct === false).length || 0
    const pending = picks?.filter(p => p.is_correct === null).length || 0
    const settled = total - pending
    const accuracy = settled > 0 ? Math.round((correct / settled) * 100) : 0
    
    return NextResponse.json({
      success: true,
      picks: picks || [],
      stats: {
        total,
        correct,
        incorrect,
        pending,
        accuracy
      }
    })
    
  } catch (error: any) {
    console.error('Pick recommendations API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

// POST: PICK 결과 업데이트 (경기 종료 후)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    
    // ✅ 단일 경기 결과 업데이트
    if (action === 'update_result') {
      const { match_id, final_score_home, final_score_away } = body
      
      if (!match_id) {
        return NextResponse.json({ error: 'match_id required' }, { status: 400 })
      }
      
      // 현재 PICK 데이터 조회
      const { data: pick, error: fetchError } = await supabase
        .from('pick_recommendations')
        .select('*')
        .eq('match_id', match_id)
        .single()
      
      if (fetchError || !pick) {
        return NextResponse.json({ error: 'Pick not found' }, { status: 404 })
      }
      
      // 실제 결과 계산
      let actualResult: 'HOME' | 'DRAW' | 'AWAY'
      if (final_score_home > final_score_away) {
        actualResult = 'HOME'
      } else if (final_score_home < final_score_away) {
        actualResult = 'AWAY'
      } else {
        actualResult = 'DRAW'
      }
      
      // 적중 여부
      const isCorrect = pick.pick_result === actualResult
      
      // 업데이트
      const { error: updateError } = await supabase
        .from('pick_recommendations')
        .update({
          actual_result: actualResult,
          final_score_home,
          final_score_away,
          is_correct: isCorrect,
          settled_at: new Date().toISOString()
        })
        .eq('match_id', match_id)
      
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        match_id,
        pick_result: pick.pick_result,
        actual_result: actualResult,
        is_correct: isCorrect
      })
    }
    
    // ✅ 일괄 결과 업데이트 (Cron Job용)
    if (action === 'bulk_update') {
      const { results } = body  // [{ match_id, final_score_home, final_score_away }]
      
      if (!results || !Array.isArray(results)) {
        return NextResponse.json({ error: 'results array required' }, { status: 400 })
      }
      
      let updated = 0
      let failed = 0
      
      for (const result of results) {
        try {
          // PICK 존재 확인
          const { data: pick } = await supabase
            .from('pick_recommendations')
            .select('pick_result')
            .eq('match_id', result.match_id)
            .single()
          
          if (!pick) continue
          
          // 실제 결과 계산
          let actualResult: 'HOME' | 'DRAW' | 'AWAY'
          if (result.final_score_home > result.final_score_away) {
            actualResult = 'HOME'
          } else if (result.final_score_home < result.final_score_away) {
            actualResult = 'AWAY'
          } else {
            actualResult = 'DRAW'
          }
          
          const isCorrect = pick.pick_result === actualResult
          
          // 업데이트
          const { error } = await supabase
            .from('pick_recommendations')
            .update({
              actual_result: actualResult,
              final_score_home: result.final_score_home,
              final_score_away: result.final_score_away,
              is_correct: isCorrect,
              settled_at: new Date().toISOString()
            })
            .eq('match_id', result.match_id)
          
          if (error) {
            failed++
          } else {
            updated++
          }
        } catch (e) {
          failed++
        }
      }
      
      return NextResponse.json({
        success: true,
        updated,
        failed,
        total: results.length
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error: any) {
    console.error('Pick update error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

// DELETE: PICK 삭제 (옵션)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const match_id = searchParams.get('match_id')
    
    if (!match_id) {
      return NextResponse.json({ error: 'match_id required' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('pick_recommendations')
      .delete()
      .eq('match_id', match_id)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, deleted: match_id })
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
