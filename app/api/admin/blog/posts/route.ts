import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 전체 포스트 목록 (관리자용 - 비공개 포함)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, slug, title_kr, category, published, published_at, views, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    console.error('Admin posts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 새 포스트 생성
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('blog_posts')
      .insert([{
        slug: body.slug,
        title: body.title || body.title_kr,
        title_kr: body.title_kr,
        excerpt: body.excerpt,
        content: body.content,
        cover_image: body.cover_image,
        category: body.category,
        tags: body.tags || [],
        published: body.published || false,
        published_at: body.published ? new Date().toISOString() : null
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
