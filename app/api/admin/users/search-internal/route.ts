// 관리자 페이지(브라우저)에서 ADMIN_PUSH_SECRET 안 보이게 서버 사이드 프록시
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''
    const secret = process.env.ADMIN_PUSH_SECRET
    const baseUrl = new URL(request.url).origin
    const res = await fetch(`${baseUrl}/api/admin/users/search?q=${encodeURIComponent(q)}`, {
      headers: secret
        ? { Authorization: `Bearer ${secret}` }
        : { 'x-internal-call': '1' },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
