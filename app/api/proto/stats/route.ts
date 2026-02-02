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
  
  // ✅ UUID를 그대로 반환 (proto_stats.user_id도 UUID 타입)
  return data?.id || null
}

// GET - 통계 조회
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ✅ UUID 타입으로 비교 (proto_stats.user_id = uuid)
    const { data, error } = await supabase
      .from('proto_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Stats fetch error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // 통계가 없으면 기본값 반환
    if (!data) {
      return NextResponse.json({
        success: true,
        data: {
          totalSlips: 0,
          pending: 0,
          won: 0,
          lost: 0,
          totalInvested: 0,
          totalReturn: 0,
          hitRate: 0,
          totalDeleted: 0,
          lastUpdated: new Date().toISOString()
        }
      })
    }

    // 프론트엔드 형식으로 변환
    return NextResponse.json({
      success: true,
      data: {
        totalSlips: data.total_slips || 0,
        pending: data.pending || 0,
        won: data.won || 0,
        lost: data.lost || 0,
        totalInvested: parseFloat(data.total_invested) || 0,
        totalReturn: parseFloat(data.total_return) || 0,
        hitRate: parseFloat(data.hit_rate) || 0,
        totalDeleted: data.total_deleted || 0,
        lastUpdated: data.updated_at
      }
    })
  } catch (error) {
    console.error('Stats GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - 통계 + 내역 전체 초기화
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 1. proto_slips 전체 삭제
    const { error: slipsError } = await supabase
      .from('proto_slips')
      .delete()
      .eq('user_id', userId)

    if (slipsError) {
      console.error('Slips delete error:', slipsError)
      return NextResponse.json(
        { success: false, error: slipsError.message },
        { status: 500 }
      )
    }

    // 2. proto_stats 삭제
    const { error: statsError } = await supabase
      .from('proto_stats')
      .delete()
      .eq('user_id', userId)

    if (statsError) {
      console.error('Stats delete error:', statsError)
      return NextResponse.json(
        { success: false, error: statsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'All data reset (slips + stats)' 
    })
  } catch (error) {
    console.error('Stats DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}