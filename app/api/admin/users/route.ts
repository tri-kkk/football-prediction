import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// GET: 회원 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tier = searchParams.get('tier') // 'free' | 'premium' | null
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (tier && tier !== 'all') {
      query = query.eq('tier', tier)
    }

    const { data: users, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Users GET error:', error)
    return NextResponse.json(
      { error: error.message || '회원 목록 조회 실패' },
      { status: 500 }
    )
  }
}

// PUT: 회원 정보 수정 (등급 변경 등)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, tier, name } = body

    if (!id) {
      return NextResponse.json(
        { error: '회원 ID가 필요합니다' },
        { status: 400 }
      )
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (tier) updateData.tier = tier
    if (name !== undefined) updateData.name = name

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // 등급이 변경된 경우 구독 상태도 업데이트
    if (tier === 'free') {
      // 프리미엄에서 무료로 변경시 활성 구독 취소
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', id)
        .eq('status', 'active')
    }

    return NextResponse.json({ user: data, success: true })
  } catch (error: any) {
    console.error('Users PUT error:', error)
    return NextResponse.json(
      { error: error.message || '회원 정보 수정 실패' },
      { status: 500 }
    )
  }
}

// DELETE: 회원 삭제 (soft delete 권장)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '회원 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // Soft delete: is_deleted 플래그 설정
    const { error } = await supabase
      .from('users')
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Users DELETE error:', error)
    return NextResponse.json(
      { error: error.message || '회원 삭제 실패' },
      { status: 500 }
    )
  }
}