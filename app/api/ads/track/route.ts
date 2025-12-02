import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// POST: 클릭/노출 추적
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') // 'click' or 'impression'

    if (!id || !type) {
      return NextResponse.json(
        { error: '필수 파라미터 누락' },
        { status: 400 }
      )
    }

    if (type !== 'click' && type !== 'impression') {
      return NextResponse.json(
        { error: '유효하지 않은 추적 타입' },
        { status: 400 }
      )
    }

    // 카운트 증가
    const column = type === 'click' ? 'click_count' : 'impression_count'
    
    // RPC 함수가 없으면 직접 업데이트
    const { data: currentAd, error: fetchError } = await supabase
      .from('advertisements')
      .select(column)
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('광고 조회 에러:', fetchError)
      throw fetchError
    }

    const currentCount = (currentAd as any)[column] || 0

    const { error: updateError } = await supabase
      .from('advertisements')
      .update({ [column]: currentCount + 1 })
      .eq('id', id)

    if (updateError) {
      console.error('카운트 업데이트 에러:', updateError)
      throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('POST /api/ads/track 에러:', error)
    return NextResponse.json(
      { error: error.message || '추적 실패' },
      { status: 500 }
    )
  }
}
