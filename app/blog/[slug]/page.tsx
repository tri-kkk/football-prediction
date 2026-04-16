// app/blog/[slug]/page.tsx
// SSR 서버 컴포넌트 - SEO 최적화 (generateMetadata + JSON-LD)

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import BlogPostClient from './BlogPostClient'

// Supabase 서버사이드 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 카테고리 한글/영문 매핑
const CATEGORY_NAMES: Record<string, { ko: string; en: string }> = {
  preview: { ko: '프리뷰', en: 'Match Preview' },
  analysis: { ko: '분석', en: 'Analysis' },
  weekly: { ko: '주간 리뷰', en: 'Weekly Review' },
  guide: { ko: '가이드', en: 'Guide' },
  stats: { ko: '통계', en: 'Statistics' },
}

// 포스트 데이터 가져오기 (캐시 활용)
async function getPost(slug: string) {
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (error || !post) return null
  return post
}

// ============================================
// generateMetadata - 글마다 고유한 SEO 메타태그
// ============================================
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    return {
      title: '포스트를 찾을 수 없습니다 - TrendSoccer',
      description: '요청하신 블로그 글을 찾을 수 없습니다.',
    }
  }

  const titleKr = post.title_kr || post.title
  const titleEn = post.title || post.title_kr
  const description = post.excerpt || titleKr
  const descriptionEn = post.excerpt_en || post.excerpt || titleEn
  const categoryName = CATEGORY_NAMES[post.category]?.ko || post.category
  const canonicalUrl = `https://www.trendsoccer.com/blog/${slug}`

  // OG 이미지: 커버 이미지가 있으면 사용, 없으면 동적 생성
  const ogImage = post.cover_image
    || `https://www.trendsoccer.com/api/blog/og-image?title=${encodeURIComponent(titleKr)}&category=${post.category}`

  return {
    title: `${titleKr} - TrendSoccer ${categoryName}`,
    description: description.slice(0, 160),
    keywords: [
      ...(post.tags || []),
      '축구 분석', 'Football Analysis', 'TrendSoccer',
      categoryName,
    ].join(', '),
    authors: [{ name: post.author || 'TrendSoccer' }],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'article',
      title: titleKr,
      description: description.slice(0, 200),
      url: canonicalUrl,
      siteName: 'TrendSoccer',
      locale: 'ko_KR',
      alternateLocale: 'en_US',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: titleKr,
        },
      ],
      publishedTime: post.published_at,
      modifiedTime: post.updated_at || post.published_at,
      authors: [post.author || 'TrendSoccer'],
      section: categoryName,
      tags: post.tags || [],
    },
    twitter: {
      card: 'summary_large_image',
      title: titleKr,
      description: description.slice(0, 200),
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large' as const,
      'max-video-preview': -1,
    },
    other: {
      // 영문 메타 (hreflang 대체)
      'og:title:en': titleEn,
      'og:description:en': descriptionEn.slice(0, 200),
    },
  }
}

// ============================================
// 페이지 서버 컴포넌트
// ============================================
export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    notFound()
  }

  // JSON-LD 구조화 데이터 (BlogPosting)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title_kr || post.title,
    alternativeHeadline: post.title || post.title_kr,
    description: post.excerpt || '',
    image: post.cover_image || 'https://www.trendsoccer.com/og-image.png',
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: {
      '@type': 'Person',
      name: post.author || 'TrendSoccer',
      url: 'https://www.trendsoccer.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'TrendSoccer',
      url: 'https://www.trendsoccer.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.trendsoccer.com/icons/icon-192x192.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.trendsoccer.com/blog/${slug}`,
    },
    url: `https://www.trendsoccer.com/blog/${slug}`,
    keywords: (post.tags || []).join(', '),
    articleSection: CATEGORY_NAMES[post.category]?.en || post.category,
    inLanguage: ['ko', 'en'],
    isAccessibleForFree: true,
    // BreadcrumbList
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
        {
          '@type': 'ListItem',
          position: 3,
          name: post.title_kr || post.title,
          item: `https://www.trendsoccer.com/blog/${slug}`,
        },
      ],
    },
  }

  return (
    <>
      {/* JSON-LD 구조화 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 클라이언트 컴포넌트에 서버에서 가져온 데이터 전달 */}
      <BlogPostClient initialPost={post} />
    </>
  )
}
