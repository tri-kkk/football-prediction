import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/blog/posts?lang=en
 *
 * 응답 가공:
 *  - lang=en: title은 영문 컬럼 그대로, excerpt/content는 영문 있으면 영문, 없으면 한글 fallback
 *  - lang=ko (기본): title_kr 우선, excerpt/content는 한글
 *  - 응답에 'language' 필드 추가 → 'en' (영문 본문) | 'ko' (한글 fallback or 한글 요청)
 */

// 한글 fallback 처리 — 영문 요청 시 영문 컬럼 우선, 없으면 한글로 fallback
function localizePost(row: any, lang: 'ko' | 'en'): any {
  if (lang === 'en') {
    const hasEnContent = !!row.content_en
    return {
      ...row,
      title: row.title || row.title_kr,             // title은 보통 영문
      excerpt: row.excerpt_en || row.excerpt || '',
      content: row.content_en || row.content || '',
      language: hasEnContent ? 'en' : 'ko',         // 본문이 어느 언어인지
      // 참고용 한글 원본도 유지 (필요 시 사용)
      title_kr: row.title_kr,
    }
  }
  // ko
  return {
    ...row,
    title: row.title_kr || row.title,
    excerpt: row.excerpt || '',
    content: row.content || '',
    language: 'ko',
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const published = searchParams.get('published')
    const category = searchParams.get('category')
    const limit = searchParams.get('limit') || '20'
    const offset = searchParams.get('offset') || '0'
    const lang: 'ko' | 'en' = searchParams.get('lang') === 'en' ? 'en' : 'ko'

    let query = supabase
      .from('blog_posts')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    // 공개된 포스트만 조회 (한글 발행 기준 — 영문 없어도 한글로 fallback 노출)
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

    const localized = (data || []).map((row) => localizePost(row, lang))

    return NextResponse.json({
      success: true,
      data: localized,
      count: count || 0,
      language: lang,
    })
  } catch (error) {
    console.error('Blog API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
