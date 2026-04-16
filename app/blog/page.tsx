// app/blog/page.tsx
// SSR 서버 컴포넌트 - 블로그 목록 초기 데이터 프리페치

import { createClient } from '@supabase/supabase-js'
import BlogListClient from './BlogListClient'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 초기 포스트 12개를 서버에서 프리페치 (구글봇이 HTML에서 바로 볼 수 있게)
async function getInitialPosts() {
  try {
    const { data: posts, error, count } = await supabase
      .from('blog_posts')
      .select('id, slug, title, title_kr, excerpt, excerpt_en, content_en, cover_image, category, published_at, published, published_en, tags', { count: 'exact' })
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(12)

    if (error) {
      console.error('Blog list prefetch error:', error)
      return { posts: [], count: 0 }
    }

    return { posts: posts || [], count: count || 0 }
  } catch (e) {
    console.error('Blog list prefetch failed:', e)
    return { posts: [], count: 0 }
  }
}

// CollectionPage JSON-LD for blog list
function BlogListJsonLd(postCount: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'TrendSoccer Blog - Football Analysis & Match Previews',
    description: '축구 경기 분석, 프리뷰, 전술 인사이트. In-depth football analysis, match previews, and tactical insights.',
    url: 'https://www.trendsoccer.com/blog',
    mainEntity: {
      '@type': 'Blog',
      name: 'TrendSoccer Blog',
      description: 'Football match analysis and predictions',
      blogPost: [], // 개별 포스트는 상세 페이지에서 처리
    },
    numberOfItems: postCount,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://www.trendsoccer.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blog',
          item: 'https://www.trendsoccer.com/blog',
        },
      ],
    },
  }
}

export default async function BlogPage() {
  const { posts, count } = await getInitialPosts()

  const jsonLd = BlogListJsonLd(count)

  return (
    <>
      {/* JSON-LD 구조화 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 클라이언트 컴포넌트에 초기 데이터 전달 */}
      <BlogListClient initialPosts={posts} initialCount={count} />
    </>
  )
}
