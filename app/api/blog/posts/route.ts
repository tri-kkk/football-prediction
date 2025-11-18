import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const published = searchParams.get('published')
    const category = searchParams.get('category')
    const limit = searchParams.get('limit') || '20'
    const offset = searchParams.get('offset') || '0'

    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('published_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    // 공개된 포스트만 조회
    if (published === 'true') {
      query = query.eq('published', true)
    }

    // 카테고리 필터
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Blog posts fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: count || 0
    })
  } catch (error) {
    console.error('Blog API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
