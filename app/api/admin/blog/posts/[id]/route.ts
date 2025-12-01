import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 개별 포스트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Get post error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 포스트 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        slug: body.slug,
        // 영문
        title: body.title || body.title_kr,
        content_en: body.content_en || null,
        excerpt_en: body.excerpt_en || null,
        // 한글
        title_kr: body.title_kr,
        excerpt: body.excerpt,
        content: body.content,
        // 공통
        cover_image: body.cover_image,
        category: body.category,
        tags: body.tags || [],
        // 발행 설정
        published: body.published,
        published_en: body.published_en || false,
        published_at: (body.published || body.published_en) ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
    console.error('Update post error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 포스트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Delete post error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 공개 상태 변경
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    // 한글 발행 상태
    if (body.published !== undefined) {
      updateData.published = body.published
    }
    
    // 영문 발행 상태
    if (body.published_en !== undefined) {
      updateData.published_en = body.published_en
    }

    // 발행 시간 업데이트
    if (body.published || body.published_en) {
      updateData.published_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
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
    console.error('Patch post error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}