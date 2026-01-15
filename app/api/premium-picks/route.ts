import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    // 오늘 날짜 (KST 기준)
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000
    const kstNow = new Date(now.getTime() + kstOffset)
    const today = kstNow.toISOString().split('T')[0]
    
    // 오늘의 프리미엄 픽 조회
    const { data: picks, error } = await supabase
      .from('premium_picks')
      .select('*')
      .eq('valid_date', today)
      .order('commence_time', { ascending: true })
    
    if (error) {
      console.error('Error fetching premium picks:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      validDate: today,
      picks: picks || [],
      count: picks?.length || 0,
    })
    
  } catch (error) {
    console.error('Premium picks API error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
