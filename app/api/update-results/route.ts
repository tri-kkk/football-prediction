import { NextResponse } from 'next/server'
import { updateMatchResult } from '@/lib/predictions'

/**
 * 경기 결과 업데이트 API
 * POST /api/update-results
 * 
 * Body:
 * {
 *   matchId: number,
 *   homeScore: number,
 *   awayScore: number
 * }
 */
export async function POST(request: Request) {
  try {
    // 요청 본문에서 데이터 파싱
    const { matchId, homeScore, awayScore } = await request.json()
    
    // 유효성 검사
    if (!matchId || homeScore === undefined || awayScore === undefined) {
      return NextResponse.json(
        { 
          success: false,
          message: '필수 데이터가 누락되었습니다 (matchId, homeScore, awayScore)'
        },
        { status: 400 }
      )
    }
    
    // 점수가 숫자인지 확인
    if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
      return NextResponse.json(
        { 
          success: false,
          message: '점수는 숫자여야 합니다'
        },
        { status: 400 }
      )
    }
    
    // 점수가 음수가 아닌지 확인
    if (homeScore < 0 || awayScore < 0) {
      return NextResponse.json(
        { 
          success: false,
          message: '점수는 0 이상이어야 합니다'
        },
        { status: 400 }
      )
    }
    
    console.log('🔄 경기 결과 업데이트 요청:', { matchId, homeScore, awayScore })
    
    // Supabase에 결과 업데이트
    const success = await updateMatchResult(matchId, homeScore, awayScore)
    
    if (success) {
      return NextResponse.json({ 
        success: true,
        message: '경기 결과 업데이트 완료',
        data: {
          matchId,
          homeScore,
          awayScore
        }
      })
    }
    
    return NextResponse.json(
      { 
        success: false,
        message: '데이터베이스 업데이트 실패'
      },
      { status: 500 }
    )
    
  } catch (error) {
    console.error('❌ 경기 결과 업데이트 에러:', error)
    
    return NextResponse.json(
      { 
        success: false,
        message: '서버 에러',
        error: error instanceof Error ? error.message : '알 수 없는 에러'
      },
      { status: 500 }
    )
  }
}

/**
 * 여러 경기 결과 한번에 업데이트
 * POST /api/update-results
 * 
 * Body:
 * {
 *   results: [
 *     { matchId: 1, homeScore: 2, awayScore: 1 },
 *     { matchId: 2, homeScore: 0, awayScore: 3 }
 *   ]
 * }
 */
export async function PUT(request: Request) {
  try {
    const { results } = await request.json()
    
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          message: 'results 배열이 필요합니다'
        },
        { status: 400 }
      )
    }
    
    console.log(`🔄 ${results.length}개 경기 결과 일괄 업데이트 시작`)
    
    const updatePromises = results.map(result => 
      updateMatchResult(result.matchId, result.homeScore, result.awayScore)
    )
    
    const updateResults = await Promise.all(updatePromises)
    const successCount = updateResults.filter(r => r).length
    
    console.log(`✅ ${successCount}/${results.length}개 업데이트 완료`)
    
    return NextResponse.json({
      success: true,
      message: `${successCount}/${results.length}개 경기 결과 업데이트 완료`,
      data: {
        total: results.length,
        success: successCount,
        failed: results.length - successCount
      }
    })
    
  } catch (error) {
    console.error('❌ 일괄 업데이트 에러:', error)
    
    return NextResponse.json(
      { 
        success: false,
        message: '서버 에러',
        error: error instanceof Error ? error.message : '알 수 없는 에러'
      },
      { status: 500 }
    )
  }
}

/**
 * GET 요청 - API 상태 확인
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Update Results API is running',
    endpoints: {
      POST: 'Update single match result',
      PUT: 'Update multiple match results'
    }
  })
}
