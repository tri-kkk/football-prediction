import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// GET: 광고 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slotType = searchParams.get('slot')
    const activeOnly = searchParams.get('active') === 'true'
    const trackImpression = searchParams.get('track') === 'true'
    const adId = searchParams.get('id')

    let query = supabase
      .from('advertisements')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    // 슬롯 타입 필터
    if (slotType) {
      query = query.eq('slot_type', slotType)
    }

    // 활성 광고만
    if (activeOnly) {
      query = query.eq('is_active', true)
      
      // 기간 체크 (시작일/종료일)
      const now = new Date().toISOString()
      query = query
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('광고 조회 에러:', error)
      throw error
    }

    // 노출 추적
    if (trackImpression && adId) {
      await supabase.rpc('increment_impression', { ad_id: adId })
    }

    return NextResponse.json({ ads: data || [] })
  } catch (error: any) {
    console.error('GET /api/ads 에러:', error)
    return NextResponse.json(
      { error: error.message || '광고 조회 실패' },
      { status: 500 }
    )
  }
}

// POST: 새 광고 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { 
      name, 
      slot_type, 
      image_url, 
      link_url, 
      alt_text,
      width,
      height,
      priority,
      start_date,
      end_date 
    } = body

    // 필수 필드 검증
    if (!name || !slot_type || !image_url || !link_url) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('advertisements')
      .insert({
        name,
        slot_type,
        image_url,
        link_url,
        alt_text: alt_text || null,
        width: width || null,
        height: height || null,
        priority: priority || 0,
        start_date: start_date || null,
        end_date: end_date || null,
        is_active: true,
        click_count: 0,
        impression_count: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('광고 등록 에러:', error)
      throw error
    }

    return NextResponse.json({ success: true, ad: data })
  } catch (error: any) {
    console.error('POST /api/ads 에러:', error)
    return NextResponse.json(
      { error: error.message || '광고 등록 실패' },
      { status: 500 }
    )
  }
}

// PUT: 광고 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: '광고 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // 업데이트 가능한 필드만 추출
    const allowedFields = [
      'name', 'slot_type', 'image_url', 'link_url', 'alt_text',
      'width', 'height', 'priority', 'start_date', 'end_date', 'is_active'
    ]
    
    const filteredData: Record<string, any> = {}
    for (const field of allowedFields) {
      if (field in updateData) {
        filteredData[field] = updateData[field]
      }
    }

    const { data, error } = await supabase
      .from('advertisements')
      .update(filteredData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('광고 수정 에러:', error)
      throw error
    }

    return NextResponse.json({ success: true, ad: data })
  } catch (error: any) {
    console.error('PUT /api/ads 에러:', error)
    return NextResponse.json(
      { error: error.message || '광고 수정 실패' },
      { status: 500 }
    )
  }
}

// DELETE: 광고 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '광고 ID가 필요합니다' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('advertisements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('광고 삭제 에러:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/ads 에러:', error)
    return NextResponse.json(
      { error: error.message || '광고 삭제 실패' },
      { status: 500 }
    )
  }
}
