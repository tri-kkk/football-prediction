import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/blog/post/{slug}?lang=en
 *
 * lang=en이면 영문 우선, 없으면 한글 fallback.
 * 응답에 'language' 필드로 본문이 어느 언어인지 명시.
 */

function localizePost(row: any, lang: 'ko' | 'en'): any {
  if (lang === 'en') {
    const hasEnContent = !!row.content_en
    return {
      ...row,
      title: row.title || row.title_kr,
      excerpt: row.excerpt_en || row.excerpt || '',
      content: row.content_en || row.content || '',
      language: hasEnContent ? 'en' : 'ko',
      title_kr: row.title_kr,
    }
  }
  return {
    ...row,
    title: row.title_kr || row.title,
    excerpt: row.excerpt || '',
    content: row.content || '',
    language: 'ko',
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const lang: 'ko' | 'en' = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'ko'

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
      data: localizePost(post, lang),
      language: lang,
    })
  } catch (error) {
    console.error('Blog post API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
