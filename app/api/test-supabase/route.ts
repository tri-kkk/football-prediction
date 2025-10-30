// app/api/test-supabase/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // 테스트 데이터 조회
    const { data, error } = await supabase
      .from('match_trends')
      .select('*')
      .eq('match_id', 'test-match-001')
      .order('timestamp', { ascending: true })
    
    if (error) {
      console.error('Supabase 오류:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supabase 연결 성공!',
      rowCount: data.length,
      data: data
    })
    
  } catch (error: any) {
    console.error('API 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
