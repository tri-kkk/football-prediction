import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const league = searchParams.get('league') || 'ALL'
    const period = searchParams.get('period') || 'week'
    
    console.log(`📊 Fetching match results: league=${league}, period=${period}`)
    
    // 기간별 날짜 계산
    const now = new Date()
    let startDate: Date
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // 최근 3개월
        break
    }
    
    let query = supabase
      .from('match_results')
      .select('*')
      .gte('match_date', startDate.toISOString())
      .order('match_date', { ascending: false })
    
    if (league !== 'ALL') {
      query = query.eq('league', league)
    }
    
    const { data, error } = await query.limit(100)
    
    if (error) {
      console.error('❌ Error fetching match results:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }
    
    console.log(`✅ Found ${data?.length || 0} match results`)
    
    return NextResponse.json({
      success: true,
      matches: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch match results' 
    }, { status: 500 })
  }
}