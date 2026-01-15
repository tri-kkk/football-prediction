// app/api/admin/login/route.ts
// 관리자 로그인 API - 서버사이드 비밀번호 검증 + 시도 제한

import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

// 메모리 기반 로그인 시도 추적 (서버 재시작 시 초기화)
// 프로덕션에서는 Redis나 DB 사용 권장
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

// 설정
const MAX_ATTEMPTS = 5          // 최대 시도 횟수
const LOCKOUT_DURATION = 5 * 60 * 1000  // 5분 잠금 (ms)
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24시간 (ms)

// 토큰 생성
function generateToken(): string {
  return randomBytes(32).toString('hex')
}

// 비밀번호 해시 (간단한 SHA-256)
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// IP 주소 가져오기
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0] || realIP || 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    const now = Date.now()

    // 1. 잠금 상태 확인
    const attempts = loginAttempts.get(clientIP)
    if (attempts && attempts.lockedUntil > now) {
      const remainingSeconds = Math.ceil((attempts.lockedUntil - now) / 1000)
      return NextResponse.json(
        { 
          error: '너무 많은 로그인 시도',
          message: `${remainingSeconds}초 후에 다시 시도해주세요`,
          locked: true,
          remainingSeconds 
        },
        { status: 429 }
      )
    }

    // 2. 요청 데이터 파싱
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { error: '비밀번호를 입력해주세요' },
        { status: 400 }
      )
    }

    // 3. 서버 측 비밀번호 검증
    // ⚠️ 환경변수: ADMIN_SECRET (NEXT_PUBLIC_ 아님!)
    const adminSecret = process.env.ADMIN_SECRET
    
    if (!adminSecret) {
      console.error('ADMIN_SECRET 환경변수가 설정되지 않았습니다')
      return NextResponse.json(
        { error: '서버 설정 오류' },
        { status: 500 }
      )
    }

    // 4. 비밀번호 비교
    const isValid = password === adminSecret

    if (!isValid) {
      // 실패 횟수 증가
      const currentAttempts = loginAttempts.get(clientIP) || { count: 0, lockedUntil: 0 }
      currentAttempts.count += 1

      // 5회 실패 시 5분 잠금
      if (currentAttempts.count >= MAX_ATTEMPTS) {
        currentAttempts.lockedUntil = now + LOCKOUT_DURATION
        loginAttempts.set(clientIP, currentAttempts)
        
        return NextResponse.json(
          { 
            error: '로그인 시도 횟수 초과',
            message: '5분 후에 다시 시도해주세요',
            locked: true,
            remainingSeconds: LOCKOUT_DURATION / 1000
          },
          { status: 429 }
        )
      }

      loginAttempts.set(clientIP, currentAttempts)

      return NextResponse.json(
        { 
          error: '비밀번호가 올바르지 않습니다',
          remainingAttempts: MAX_ATTEMPTS - currentAttempts.count
        },
        { status: 401 }
      )
    }

    // 5. 로그인 성공 - 토큰 발급
    const token = generateToken()
    const expiresAt = now + TOKEN_EXPIRY

    // 시도 횟수 초기화
    loginAttempts.delete(clientIP)

    // 응답 생성 (httpOnly 쿠키 설정)
    const response = NextResponse.json({
      success: true,
      message: '로그인 성공',
      expiresAt: new Date(expiresAt).toISOString()
    })

    // httpOnly 쿠키로 토큰 저장 (클라이언트에서 접근 불가)
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: TOKEN_EXPIRY / 1000, // 초 단위
      path: '/'
    })

    // 토큰 해시 저장 (검증용)
    response.cookies.set('admin_token_hash', hashPassword(token), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: TOKEN_EXPIRY / 1000,
      path: '/'
    })

    console.log(`[Admin Login] Success from IP: ${clientIP}`)

    return response

  } catch (error) {
    console.error('[Admin Login] Error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// 로그아웃 (토큰 삭제)
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: '로그아웃 완료'
  })

  // 쿠키 삭제
  response.cookies.delete('admin_token')
  response.cookies.delete('admin_token_hash')

  return response
}
