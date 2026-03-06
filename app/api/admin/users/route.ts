import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: 회원 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tier = searchParams.get('tier') // 'free' | 'premium' | null
    const country = searchParams.get('country') // 국가 코드 필터
    const stats = searchParams.get('stats') // 'country' - 국가별 통계
    // ✅ 수정: 기본 limit을 1000으로 변경 (기존 100 → 1000)
    const limit = parseInt(searchParams.get('limit') || '1000')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 📊 국가별 통계 요청
    if (stats === 'country') {
      const { data, error } = await supabase
        .from('users')
        .select('signup_country, signup_country_code')
      
      if (error) throw error
      
      // 국가별 집계
      const countryStats: Record<string, { country: string; code: string; count: number }> = {}
      
      data?.forEach(user => {
        const code = user.signup_country_code || 'XX'
        const name = user.signup_country || 'Unknown'
        
        if (!countryStats[code]) {
          countryStats[code] = { country: name, code, count: 0 }
        }
        countryStats[code].count++
      })
      
      // 정렬 (많은 순)
      const sorted = Object.values(countryStats).sort((a, b) => b.count - a.count)
      
      return NextResponse.json({
        stats: sorted,
        total: data?.length || 0
      })
    }

    // 📋 회원 목록 조회
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (tier && tier !== 'all') {
      query = query.eq('tier', tier)
    }

    if (country && country !== 'all') {
      query = query.eq('signup_country_code', country)
    }

    const { data: users, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      users: users || [],
      total: count || 0,  // ✅ Supabase의 정확한 count 값 반환
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
    const { id, tier, name, premium_expires_at } = body

    if (!id) {
      return NextResponse.json(
        { error: '회원 ID가 필요합니다' },
        { status: 400 }
      )
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (tier) updateData.tier = tier
    if (name !== undefined) updateData.name = name
    if (premium_expires_at !== undefined) updateData.premium_expires_at = premium_expires_at

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // 등급이 변경된 경우 구독 상태도 업데이트
    if (tier === 'free') {
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', id)
        .eq('status', 'active')
    } else if (tier === 'premium' && premium_expires_at) {
      // 기존 active 구독 확인
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', id)
        .eq('status', 'active')
        .single()

      if (existing) {
        await supabase
          .from('subscriptions')
          .update({ expires_at: premium_expires_at, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            user_id: id,
            plan: 'monthly',
            status: 'active',
            started_at: new Date().toISOString(),
            expires_at: premium_expires_at,
            price: 0,
          })
      }
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

// DELETE: 회원 삭제
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

    // 관련 구독도 함께 삭제
    await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', id)

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: '회원이 삭제되었습니다' })
  } catch (error: any) {
    console.error('Users DELETE error:', error)
    return NextResponse.json(
      { error: error.message || '회원 삭제 실패' },
      { status: 500 }
    )
  }
}