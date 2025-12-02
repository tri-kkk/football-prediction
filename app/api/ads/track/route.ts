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

    // 1. 총계 업데이트 (advertisements 테이블)
    const column = type === 'click' ? 'click_count' : 'impression_count'
    
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
      console.error('총계 업데이트 에러:', updateError)
      throw updateError
    }

    // 2. 일별 통계 업데이트 (ad_daily_stats 테이블)
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    
    // 기존 레코드 확인
    const { data: existing } = await supabase
      .from('ad_daily_stats')
      .select('id, impressions, clicks')
      .eq('ad_id', id)
      .eq('date', today)
      .single()

    if (existing) {
      // 업데이트
      const updateField = type === 'impression' 
        ? { impressions: existing.impressions + 1 }
        : { clicks: existing.clicks + 1 }
      
      await supabase
        .from('ad_daily_stats')
        .update(updateField)
        .eq('id', existing.id)
    } else {
      // 새로 생성
      await supabase
        .from('ad_daily_stats')
        .insert({ 
          ad_id: id, 
          date: today, 
          impressions: type === 'impression' ? 1 : 0, 
          clicks: type === 'click' ? 1 : 0 
        })
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

// GET: 일별 통계 조회 (리포트용)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adId = searchParams.get('ad_id')
    const slotType = searchParams.get('slot')
    const startDate = searchParams.get('start') // YYYY-MM-DD
    const endDate = searchParams.get('end') // YYYY-MM-DD
    const days = parseInt(searchParams.get('days') || '30')

    // 기본 날짜 범위: 최근 N일
    const end = endDate || new Date().toISOString().split('T')[0]
    const start = startDate || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    let query = supabase
      .from('ad_daily_stats')
      .select(`
        *,
        advertisements (
          id,
          name,
          slot_type,
          image_url
        )
      `)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })

    // 특정 광고 필터
    if (adId) {
      query = query.eq('ad_id', adId)
    }

    const { data, error } = await query

    if (error) {
      console.error('통계 조회 에러:', error)
      throw error
    }

    // 슬롯 타입 필터 (join 후 필터링)
    let filteredData = data || []
    if (slotType) {
      filteredData = filteredData.filter((item: any) => 
        item.advertisements?.slot_type === slotType
      )
    }

    // 일별 요약
    const dailySummary: Record<string, { date: string; impressions: number; clicks: number }> = {}
    
    for (const item of filteredData) {
      const date = item.date
      if (!dailySummary[date]) {
        dailySummary[date] = { date, impressions: 0, clicks: 0 }
      }
      dailySummary[date].impressions += item.impressions || 0
      dailySummary[date].clicks += item.clicks || 0
    }

    const summary = Object.values(dailySummary).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return NextResponse.json({
      stats: filteredData,
      summary,
      period: { start, end }
    })

  } catch (error: any) {
    console.error('GET /api/ads/track 에러:', error)
    return NextResponse.json(
      { error: error.message || '통계 조회 실패' },
      { status: 500 }
    )
  }
}
