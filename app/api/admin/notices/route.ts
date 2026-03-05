import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// GET: 공지 목록 (admin=true면 전체, 없으면 현재 활성+기간 유효한 것만)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const isAdmin = searchParams.get('admin') === 'true'

  let query = supabase
    .from('notices')
    .select('*')
    .order('display_order', { ascending: true })

  if (!isAdmin) {
    const now = new Date().toISOString()
    query = query
      .eq('is_active', true)
      .or(`start_at.is.null,start_at.lte.${now}`)
      .or(`end_at.is.null,end_at.gte.${now}`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST: 공지 추가
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { message, message_en, is_active, display_order, start_at, end_at } = body

  const { data, error } = await supabase
    .from('notices')
    .insert({
      message,
      message_en: message_en || null,
      is_active: is_active ?? true,
      display_order: display_order ?? 0,
      start_at: start_at || null,
      end_at: end_at || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PUT: 공지 수정
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, message, message_en, is_active, display_order, start_at, end_at } = body

  const { data, error } = await supabase
    .from('notices')
    .update({
      message,
      message_en: message_en || null,
      is_active,
      display_order,
      start_at: start_at || null,
      end_at: end_at || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE: 공지 삭제
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('notices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}