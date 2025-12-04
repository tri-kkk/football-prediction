// app/api/predictions/batch/route.ts
// 여러 경기의 예측 데이터를 한 번에 조회 - 기존 테이블 구조

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const matchIdsParam = searchParams.get('matchIds')

    if (!matchIdsParam) {
      return NextResponse.json(
        { error: 'matchIds parameter is required' },
        { status: 400 }
      )
    }

    // match_id가 integer이므로 숫자로 변환
    const matchIds = matchIdsParam
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id))

    if (matchIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // 최대 100개로 제한
    const limitedIds = matchIds.slice(0, 100)

    const { data, error } = await supabase
      .from('match_predictions')
      .select('*')
      .in('match_id', limitedIds)

    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
