import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 8자리 랜덤 코드 생성 (대문자 + 숫자)
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 헷갈리는 문자 제외 (0,O,1,I)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// GET: 내 레퍼럴 코드 조회 (없으면 생성)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId 필요' }, { status: 400 })
    }

    // 기존 코드 확인
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('referral_code')
      .eq('id', userId)
      .single()

    if (userError) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    // 이미 코드가 있으면 반환
    if (user.referral_code) {
      return NextResponse.json({ 
        code: user.referral_code,
        isNew: false 
      })
    }

    // 새 코드 생성 (중복 체크)
    let newCode = ''
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      newCode = generateCode()
      
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', newCode)
        .single()

      if (!existing) break
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json({ error: '코드 생성 실패, 다시 시도해주세요' }, { status: 500 })
    }

    // 코드 저장
    const { error: updateError } = await supabase
      .from('users')
      .update({ referral_code: newCode })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json({ error: '코드 저장 실패' }, { status: 500 })
    }

    return NextResponse.json({ 
      code: newCode,
      isNew: true 
    })

  } catch (error) {
    console.error('레퍼럴 코드 생성 에러:', error)
    return NextResponse.json({ error: '서버 에러' }, { status: 500 })
  }
}
