import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 🛡️ DB outage 시 cascade timeout 방지 (기본 300초 → 15초)
export const maxDuration = 15

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
// 🔒 리스트 응답에는 본문(content/content_en)을 절대 포함하지 않는다 (비회원 본문 누수 차단).
//    카드에 필요한 필드만 화이트리스트로 반환하고, 영문 본문 존재 여부만 플래그로 전달.
function localizePost(row: any, lang: 'ko' | 'en'): any {
  const hasEnContent = !!row.content_en
  return {
    id: row.id,
    slug: row.slug,
    title: lang === 'en' ? (row.title || row.title_kr) : (row.title_kr || row.title),
    title_kr: row.title_kr,
    excerpt: lang === 'en' ? (row.excerpt_en || row.excerpt || '') : (row.excerpt || ''),
    excerpt_en: row.excerpt_en ?? null,
    cover_image: row.cover_image,
    category: row.category,
    tags: row.tags,
    published: row.published,
    published_en: row.published_en,
    published_at: row.published_at,
    // 본문은 제외. 영문 본문 존재 여부만 플래그(null | '1')로 — 리스트 배지용.
    content_en: hasEnContent ? '1' : null,
    language: lang === 'en' ? (hasEnContent ? 'en' : 'ko') : 'ko',
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
