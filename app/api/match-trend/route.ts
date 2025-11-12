// 7일 트렌드 차트용 데이터 (API-Football 버전)
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
      return Response.json({ error: 'matchId required' }, { status: 400 })
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Database not configured' }, { status: 500 })
    }
    
    // 7일(168시간) 전 시간 계산
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    console.log('📊 Fetching trend data:', {
      matchId,
      from: sevenDaysAgo,
      to: new Date().toISOString()
    })
    
    // Supabase에서 7일치 히스토리 가져오기
    const response = await fetch(
      `${supabaseUrl}/rest/v1/match_odds_history?` +
      `match_id=eq.${matchId}&` +
      `created_at=gte.${sevenDaysAgo}&` +
      `select=created_at,home_probability,draw_probability,away_probability&` +
      `order=created_at.asc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        next: { revalidate: 300 } // 5분 캐싱
      }
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Supabase error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`Supabase error: ${response.status} ${response.statusText}`)
    }
    
    const data: TrendPoint[] = await response.json()
    
    console.log('✅ Trend data fetched:', {
      dataPoints: data.length,
      firstPoint: data[0]?.created_at,
      lastPoint: data[data.length - 1]?.created_at
    })
    
    // lightweight-charts 포맷으로 변환
    const formatted = data.map(point => ({
      timestamp: point.created_at,
      homeWinProbability: point.home_probability,
      drawProbability: point.draw_probability,
      awayWinProbability: point.away_probability
    }))
    
    return Response.json({
      success: true,
      data: formatted,
      count: formatted.length,
      source: 'database',
      query: {
        matchId,
        from: sevenDaysAgo,
        to: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Trend API Error:', error)
    return Response.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trend data',
        details: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    )
  }
}