// app/api/auth/check-terms/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: '이메일이 필요합니다.' },
        { status: 400 }
      )
    }


    // DB에서 terms_agreed 상태 확인
    const { data, error } = await supabase
      .from('users')
      .select('terms_agreed')
      .eq('email', email.toLowerCase())
      .single()

    if (error) {
      console.error('❌ User not found:', error)
      return NextResponse.json(
        { termsAgreed: false },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { termsAgreed: data?.terms_agreed || false },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Check terms error:', error)
    return NextResponse.json(
      { termsAgreed: false },
      { status: 200 }
    )
  }
}
