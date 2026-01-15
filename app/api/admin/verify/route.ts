// app/api/admin/verify/route.ts
// 관리자 토큰 검증 API

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

// 비밀번호 해시 (로그인 API와 동일)
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function GET(request: NextRequest) {
  try {
    // 1. 쿠키에서 토큰 가져오기
    const token = request.cookies.get('admin_token')?.value
    const tokenHash = request.cookies.get('admin_token_hash')?.value

    // 2. 토큰 존재 확인
    if (!token || !tokenHash) {
      return NextResponse.json(
        { 
          valid: false, 
          error: '인증이 필요합니다' 
        },
        { status: 401 }
      )
    }

    // 3. 토큰 해시 검증
    const calculatedHash = hashPassword(token)
    
    if (calculatedHash !== tokenHash) {
      // 토큰이 변조됨
      const response = NextResponse.json(
        { 
          valid: false, 
          error: '유효하지 않은 토큰입니다' 
        },
        { status: 401 }
      )
      
      // 변조된 토큰 삭제
      response.cookies.delete('admin_token')
      response.cookies.delete('admin_token_hash')
      
      return response
    }

    // 4. 검증 성공
    return NextResponse.json({
      valid: true,
      message: '인증 완료'
    })

  } catch (error) {
    console.error('[Admin Verify] Error:', error)
    return NextResponse.json(
      { 
        valid: false, 
        error: '서버 오류' 
      },
      { status: 500 }
    )
  }
}
