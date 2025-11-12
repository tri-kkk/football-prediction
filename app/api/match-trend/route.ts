// 트렌드 차트용 데이터 (슈퍼 디버깅 버전)
export const dynamic = 'force-dynamic'

interface TrendPoint {
  created_at: string
  home_probability: number
  draw_probability: number
  away_probability: number
}

export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('matchId')
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚀 match-trend API 호출 시작')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    if (!matchId) {
      console.error('❌ matchId 누락')
      return Response.json({ 
        success: false,
        error: 'matchId required' 
      }, { status: 400 })
    }
    
    console.log('📝 요청 정보:', {
      matchId,
      matchIdType: typeof matchId,
      matchIdLength: matchId.length
    })
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase 환경변수 누락')
      return Response.json({ 
        success: false,
        error: 'Database not configured' 
      }, { status: 500 })
    }
    
    // 24시간 전
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    console.log('⏰ 시간 범위:', {
      from: twentyFourHoursAgo,
      to: new Date().toISOString()
    })
    
    // 🔍 Step 1: 오늘 수집된 모든 match_id 확인
    console.log('\n🔍 Step 1: 오늘 수집된 경기 확인')
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const allMatchesUrl = `${supabaseUrl}/rest/v1/match_odds_history?` +
      `created_at=gte.${todayStart.toISOString()}&` +
      `select=match_id&` +
      `limit=1000`
    
    try {
      const allResponse = await fetch(allMatchesUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })
      
      if (allResponse.ok) {
        const allData = await allResponse.json()
        const uniqueIds = [...new Set(allData.map((d: any) => d.match_id))]
        console.log('📊 오늘 수집된 unique match_id:', uniqueIds.length, '개')
        console.log('📋 샘플 match_id:', uniqueIds.slice(0, 10))
        console.log('🎯 요청된 matchId:', matchId)
        console.log('✓ 존재 여부:', uniqueIds.includes(matchId))
        
        if (!uniqueIds.includes(matchId)) {
          // 유사한 ID 찾기
          const similar = uniqueIds.filter(id => 
            id.toString().includes(matchId) || matchId.includes(id.toString())
          )
          console.log('🔍 유사한 ID:', similar)
        }
      }
    } catch (err) {
      console.warn('⚠️ Step 1 실패:', err)
    }
    
    // 🔍 Step 2: 여러 방식으로 조회 시도
    console.log('\n🔍 Step 2: 데이터 조회 시도')
    
    const queries = [
      { name: '정확한 일치', filter: `match_id=eq.${matchId}` },
      { name: '따옴표 포함', filter: `match_id=eq."${matchId}"` },
      { name: 'LIKE 검색', filter: `match_id=like.*${matchId}*` },
    ]
    
    let data: TrendPoint[] = []
    let successMethod = ''
    
    for (const query of queries) {
      console.log(`\n🔗 시도: ${query.name}`)
      
      const apiUrl = `${supabaseUrl}/rest/v1/match_odds_history?` +
        `${query.filter}&` +
        `created_at=gte.${twentyFourHoursAgo}&` +
        `select=created_at,home_probability,draw_probability,away_probability&` +
        `order=created_at.asc`
      
      console.log('   URL:', apiUrl.substring(0, 150) + '...')
      
      try {
        const response = await fetch(apiUrl, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        })
        
        console.log('   응답:', response.status, response.statusText)
        
        if (response.ok) {
          const result = await response.json()
          console.log('   데이터:', result.length, '개')
          
          if (result && result.length > 0) {
            data = result
            successMethod = query.name
            console.log('   ✅ 성공!')
            break
          } else {
            console.log('   ⚠️ 빈 결과')
          }
        } else {
          const errorText = await response.text()
          console.log('   ❌ 에러:', errorText)
        }
      } catch (err) {
        console.log('   ❌ 예외:', err)
      }
    }
    
    // 결과 처리
    const duration = Date.now() - startTime
    
    if (!data || data.length === 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('⚠️ 데이터 없음')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('소요 시간:', duration, 'ms')
      
      return Response.json({
        success: true,
        data: [],
        count: 0,
        message: 'Data collection in progress',
        debug: {
          matchId,
          matchIdType: typeof matchId,
          queriesAttempted: queries.length,
          duration: `${duration}ms`
        }
      })
    }
    
    // 데이터 변환
    const formatted = data.map(point => ({
      timestamp: point.created_at,
      homeWinProbability: Number(point.home_probability),
      drawProbability: Number(point.draw_probability),
      awayWinProbability: Number(point.away_probability)
    }))
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ 성공!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('방법:', successMethod)
    console.log('데이터:', formatted.length, '개')
    console.log('첫 포인트:', formatted[0]?.timestamp)
    console.log('마지막:', formatted[formatted.length - 1]?.timestamp)
    console.log('소요 시간:', duration, 'ms')
    
    return Response.json({
      success: true,
      data: formatted,
      count: formatted.length,
      source: 'database',
      period: '24h',
      debug: {
        method: successMethod,
        duration: `${duration}ms`
      }
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ 치명적 에러')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('에러:', error)
    console.error('소요 시간:', duration, 'ms')
    
    return Response.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trend data'
      }, 
      { status: 500 }
    )
  }
}