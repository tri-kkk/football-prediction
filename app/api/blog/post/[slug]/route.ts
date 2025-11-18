import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }  // Promise 타입 추가
) {
  try {
    const { slug } = await params  // await 추가!

    // 포스트 조회
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single()

    if (error || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // 조회수 증가
    const { error: viewError } = await supabase.rpc('increment_blog_view', {
      post_slug: slug
    })

    if (viewError) {
      console.error('View increment error:', viewError)
    }

    return NextResponse.json({
      success: true,
      data: post
    })
  } catch (error) {
    console.error('Blog post API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}