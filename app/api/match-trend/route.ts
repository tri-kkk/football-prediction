// 트렌드 차트용 데이터
export const dynamic = 'force-dynamic'

interface TrendPoint {
  created_at: string
  home_probability: number
  draw_probability: number
  away_probability: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('matchId')
    
    if (!matchId) {
      console.error('❌ matchId 누락')
      return Response.json({ 
        success: false,
        error: 'matchId required' 
      }, { status: 400 })
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase 환경변수 누락')
      return Response.json({ 
        success: false,
        error: 'Database not configured' 
      }, { status: 500 })
    }
    
    // 24시간 전 시간 계산
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    console.log('📊 Fetching trend data:', {
      matchId,
      from: twentyFourHoursAgo,
      to: new Date().toISOString()
    })
    
    // Supabase REST API 호출
    const apiUrl = `${supabaseUrl}/rest/v1/match_odds_history?` +
      `match_id=eq.${matchId}&` +
      `created_at=gte.${twentyFourHoursAgo}&` +
      `select=created_at,home_probability,draw_probability,away_probability&` +
      `order=created_at.asc`
    
    const response = await fetch(apiUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 300 } // 5분 캐싱
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Supabase error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      
      // 빈 데이터 반환 (에러 대신)
      return Response.json({
        success: true,
        data: [],
        count: 0,
        message: 'No trend data available yet'
      })
    }
    
    const data: TrendPoint[] = await response.json()
    
    console.log('✅ Trend data fetched:', {
      dataPoints: data.length,
      firstPoint: data[0]?.created_at,
      lastPoint: data[data.length - 1]?.created_at,
      matchId
    })
    
    // 데이터가 없는 경우
    if (!data || data.length === 0) {
      console.log('⚠️ Empty data for match:', matchId)
      return Response.json({
        success: true,
        data: [],
        count: 0,
        message: 'Data collection in progress'
      })
    }
    
    // lightweight-charts 포맷으로 변환
    const formatted = data.map(point => ({
      timestamp: point.created_at,
      homeWinProbability: Number(point.home_probability),
      drawProbability: Number(point.draw_probability),
      awayWinProbability: Number(point.away_probability)
    }))
    
    return Response.json({
      success: true,
      data: formatted,
      count: formatted.length,
      source: 'database',
      period: '24h'
    })
    
  } catch (error) {
    console.error('❌ Trend API Error:', error)
    return Response.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trend data'
      }, 
      { status: 500 }
    )
  }
}