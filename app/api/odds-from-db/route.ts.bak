// DB에서 저장된 오즈 읽기 (API 사용량 0!)
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const league = searchParams.get('league') || 'PL'
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Database not configured' }, { status: 500 })
    }
    
    // 최신 오즈 가져오기
    const response = await fetch(
      `${supabaseUrl}/rest/v1/match_odds_latest?league_code=eq.${league}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        next: { revalidate: 60 } // 1분 캐싱
      }
    )
    
    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return Response.json({
      success: true,
      data: data,
      source: 'database',
      count: data.length
    })
    
  } catch (error) {
    console.error('DB API Error:', error)
    return Response.json(
      { 
        success: false,
        error: 'Failed to fetch odds from database'
      }, 
      { status: 500 }
    )
  }
}