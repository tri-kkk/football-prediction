import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// GET: 구독 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'active' | 'cancelled' | 'expired' | null
    const plan = searchParams.get('plan') // 'monthly' | 'yearly' | null
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 구독 + 회원 정보 조인
    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        users:user_id (
          email,
          name
        )
      `, { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (plan && plan !== 'all') {
      query = query.eq('plan', plan)
    }

    const { data: rawSubscriptions, error, count } = await query

    if (error) throw error

    // 회원 정보 플래튼
    const subscriptions = (rawSubscriptions || []).map((sub: any) => ({
      ...sub,
      user_email: sub.users?.email,
      user_name: sub.users?.name,
      users: undefined, // 중첩 객체 제거
    }))

    return NextResponse.json({
      subscriptions,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Subscriptions GET error:', error)
    return NextResponse.json(
      { error: error.message || '구독 목록 조회 실패' },
      { status: 500 }
    )
  }
}

// POST: 새 구독 생성 (관리자 수동 추가)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, plan, price, expires_at, payment_id } = body

    if (!user_id || !plan) {
      return NextResponse.json(
        { error: '필수 항목이 누락되었습니다 (user_id, plan)' },
        { status: 400 }
      )
    }

    // 기존 활성 구독 확인
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single()

    if (existingSub) {
      return NextResponse.json(
        { error: '이미 활성 구독이 있습니다' },
        { status: 400 }
      )
    }

    // 만료일 계산
    const now = new Date()
    const defaultExpires = new Date(now)
    if (plan === 'yearly') {
      defaultExpires.setFullYear(defaultExpires.getFullYear() + 1)
    } else {
      defaultExpires.setMonth(defaultExpires.getMonth() + 1)
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id,
        plan,
        status: 'active',
        price: price || (plan === 'yearly' ? 79000 : 9900),
        started_at: now.toISOString(),
        expires_at: expires_at || defaultExpires.toISOString(),
        payment_id: payment_id || null,
      })
      .select()
      .single()

    if (error) throw error

    // 사용자 등급 업데이트
    await supabase
      .from('users')
      .update({ tier: 'premium', updated_at: now.toISOString() })
      .eq('id', user_id)

    return NextResponse.json({ subscription, success: true })
  } catch (error: any) {
    console.error('Subscriptions POST error:', error)
    return NextResponse.json(
      { error: error.message || '구독 생성 실패' },
      { status: 500 }
    )
  }
}

// PUT: 구독 상태 변경 (취소 등)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, expires_at } = body

    if (!id) {
      return NextResponse.json(
        { error: '구독 ID가 필요합니다' },
        { status: 400 }
      )
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (status) updateData.status = status
    if (expires_at) updateData.expires_at = expires_at

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .select('*, users:user_id(id)')
      .single()

    if (error) throw error

    // 취소된 경우 사용자 등급도 변경
    if (status === 'cancelled' || status === 'expired') {
      await supabase
        .from('users')
        .update({ tier: 'free', updated_at: new Date().toISOString() })
        .eq('id', subscription.user_id)
    }

    return NextResponse.json({ subscription, success: true })
  } catch (error: any) {
    console.error('Subscriptions PUT error:', error)
    return NextResponse.json(
      { error: error.message || '구독 상태 변경 실패' },
      { status: 500 }
    )
  }
}

// DELETE: 구독 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '구독 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // 구독 정보 먼저 조회
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('user_id, status')
      .eq('id', id)
      .single()

    // 구독 삭제
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id)

    if (error) throw error

    // 활성 구독이었다면 사용자 등급 변경
    if (subscription?.status === 'active') {
      await supabase
        .from('users')
        .update({ tier: 'free', updated_at: new Date().toISOString() })
        .eq('id', subscription.user_id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Subscriptions DELETE error:', error)
    return NextResponse.json(
      { error: error.message || '구독 삭제 실패' },
      { status: 500 }
    )
  }
}