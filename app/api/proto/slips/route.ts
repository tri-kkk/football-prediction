import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - 모든 조합 가져오기
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('proto_slips')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // 프론트엔드 형식으로 변환
    const slips = data.map(row => ({
      id: row.id,
      round: row.round,
      selections: row.selections,
      totalOdds: parseFloat(row.total_odds),
      createdAt: row.created_at,
      status: row.status,
      amount: row.amount || 0,
      actualReturn: row.actual_return || 0
    }))

    // 통계 계산
    const stats = {
      totalSlips: slips.length,
      pending: slips.filter(s => s.status === 'pending').length,
      won: slips.filter(s => s.status === 'won').length,
      lost: slips.filter(s => s.status === 'lost').length,
      totalInvested: slips.reduce((sum, s) => sum + s.amount, 0),
      totalReturn: slips.reduce((sum, s) => sum + s.actualReturn, 0),
      hitRate: 0
    }
    
    const finished = stats.won + stats.lost
    if (finished > 0) {
      stats.hitRate = Math.round((stats.won / finished) * 100 * 10) / 10
    }

    return NextResponse.json({ success: true, data: slips, stats })
  } catch (error) {
    console.error('Proto slips GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch slips' },
      { status: 500 }
    )
  }
}

// POST - 새 조합 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { round, selections, totalOdds, amount } = body

    if (!round || !selections || !totalOdds) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('proto_slips')
      .insert({
        round,
        selections,
        total_odds: totalOdds,
        amount: amount || 0,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    const slip = {
      id: data.id,
      round: data.round,
      selections: data.selections,
      totalOdds: parseFloat(data.total_odds),
      createdAt: data.created_at,
      status: data.status,
      amount: data.amount || 0,
      actualReturn: data.actual_return || 0
    }

    return NextResponse.json({ success: true, data: slip })
  } catch (error) {
    console.error('Proto slips POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save slip' },
      { status: 500 }
    )
  }
}

// PUT - 조합 상태 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing id or status' },
        { status: 400 }
      )
    }

    if (!['pending', 'won', 'lost'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('proto_slips')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Proto slips PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update slip' },
      { status: 500 }
    )
  }
}

// DELETE - 조합 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const deleteAll = searchParams.get('all')

    if (deleteAll === 'true') {
      // 전체 삭제
      const { error } = await supabase
        .from('proto_slips')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // 모두 삭제

      if (error) throw error
      return NextResponse.json({ success: true, message: 'All slips deleted' })
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing id' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('proto_slips')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Slip deleted' })
  } catch (error) {
    console.error('Proto slips DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete slip' },
      { status: 500 }
    )
  }
}