// 관리자 페이지(브라우저)에서 ADMIN_PUSH_SECRET 안 보이게 서버 사이드 프록시
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const secret = process.env.ADMIN_PUSH_SECRET
    const baseUrl = new URL(request.url).origin
    const res = await fetch(`${baseUrl}/api/admin/users/delete-permanent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret
          ? { Authorization: `Bearer ${secret}` }
          : { 'x-internal-call': '1' }),
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
