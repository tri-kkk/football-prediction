import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 세션에서 user_id 가져오기
async function getUserId(): Promise<string | null> {
  const session = await getServerSession()
  if (!session?.user?.email) return null
  
  // users 테이블에서 id 조회
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()
  
  return data?.id || null
}

// GET - 내 조합만 가져오기
export async function GET() {
  try {
    const userId = await getUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('proto_slips')
      .select('*')
      .eq('user_id', userId)  // 🔒 내 슬립만!
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Proto slips fetch error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // 프론트엔드 형식으로 변환
    const slips = (data || []).map(row => ({
      id: row.id,
      round: row.round,
      selections: row.selections,
      totalOdds: parseFloat(row.total_odds),
      createdAt: row.created_at,
      status: row.status,
      amount: row.amount || 0,
      actualReturn: row.actual_return || 0
    }))

    // ✅ 통계는 제거 (별도 API로 분리)
    // 클라이언트에서 /api/proto/stats 호출하여 조회
    return NextResponse.json({ success: true, data: slips })
  } catch (error) {
    console.error('Proto slips GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch slips' },
      { status: 500 }
    )
  }
}

// POST - 새 조합 저장 (user_id 포함)
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
        user_id: userId,  // 🔒 user_id 저장!
        round,
        selections,
        total_odds: totalOdds,
        amount: amount || 0,
        status: 'pending',
        actual_return: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Proto slips insert error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

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

    // ✅ DB 트리거가 자동으로 proto_stats 업데이트
    return NextResponse.json({ success: true, data: slip })
  } catch (error) {
    console.error('Proto slips POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save slip' },
      { status: 500 }
    )
  }
}

// PUT - 조합 상태 업데이트 (본인 것만)
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, status, actualReturn } = body

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

    // 업데이트할 데이터 준비
    const updateData: any = { status }
    
    // 적중 시 실제 수익 업데이트
    if (status === 'won' && actualReturn !== undefined) {
      updateData.actual_return = actualReturn
    } else if (status === 'lost') {
      updateData.actual_return = 0
    }

    const { data, error } = await supabase
      .from('proto_slips')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)  // 🔒 본인 것만!
      .select()
      .single()

    if (error) {
      console.error('Proto slips update error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // ✅ DB 트리거가 자동으로 proto_stats 업데이트
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Proto slips PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update slip' },
      { status: 500 }
    )
  }
}

// DELETE - 조합 삭제 (본인 것만)
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const deleteAll = searchParams.get('all')

    if (deleteAll === 'true') {
      // ✅ 내 전체 내역 삭제 (통계는 유지됨)
      const { error } = await supabase
        .from('proto_slips')
        .delete()
        .eq('user_id', userId)  // 🔒 내 것만!

      if (error) {
        console.error('Proto slips delete all error:', error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }

      // ✅ DB 트리거가 자동으로:
      // - total_deleted 증가
      // - 남은 슬립으로 통계 재계산
      return NextResponse.json({ success: true, message: 'All slips deleted' })
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing id' },
        { status: 400 }
      )
    }

    // ✅ 단일 슬립 삭제 (통계는 유지됨)
    const { error } = await supabase
      .from('proto_slips')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)  // 🔒 본인 것만!

    if (error) {
      console.error('Proto slips delete error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // ✅ DB 트리거가 자동으로:
    // - total_deleted 증가
    // - 남은 슬립으로 통계 재계산
    return NextResponse.json({ success: true, message: 'Slip deleted' })
  } catch (error) {
    console.error('Proto slips DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete slip' },
      { status: 500 }
    )
  }
}