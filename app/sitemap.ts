import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { routing } from '@/i18n/routing'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const BASE_URL = 'https://www.trendsoccer.com'

/**
 * locale별로 URL을 만든다.
 * - ko (defaultLocale, localePrefix='as-needed') → prefix 없음
 * - en → /en prefix
 */
function localizedUrl(locale: string, path: string): string {
  // path는 항상 '/'로 시작 (예: '/blog', '/blog/foo')
  if (locale === routing.defaultLocale) {
    return `${BASE_URL}${path === '/' ? '' : path}`
  }
  return `${BASE_URL}/${locale}${path === '/' ? '' : path}`
}

/**
 * 한 path에 대해 ko / en 모두 sitemap entry로 생성 + 각 entry에 hreflang alternates 첨부
 *
 * SEO 베스트프랙티스 (Google 권장):
 *   각 언어별 URL을 별도 entry로 등록 + alternates.languages 로 상호 참조 +
 *   x-default 지정으로 미매칭 사용자용 fallback URL 명시.
 */
function entriesForPath(
  path: string,
  opts: {
    changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
    priority: number
    lastModified?: Date
  }
): MetadataRoute.Sitemap {
  const lastModified = opts.lastModified ?? new Date()

  const alternates = {
    languages: {
      'ko-KR': localizedUrl('ko', path),
      'en-US': localizedUrl('en', path),
      'x-default': localizedUrl('ko', path),
    },
  }

  return routing.locales.map((locale) => ({
    url: localizedUrl(locale, path),
    lastModified,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates,
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. 정적 페이지들 (ko + en 양쪽 출력)
  const staticPaths: Array<{
    path: string
    changeFrequency: 'daily' | 'monthly' | 'yearly' | 'hourly' | 'weekly'
    priority: number
  }> = [
    { path: '/', changeFrequency: 'daily', priority: 1.0 },
    { path: '/premium', changeFrequency: 'daily', priority: 0.9 },
    { path: '/results', changeFrequency: 'daily', priority: 0.9 },
    { path: '/blog', changeFrequency: 'daily', priority: 0.9 },
    { path: '/news', changeFrequency: 'hourly', priority: 0.9 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/baseball', changeFrequency: 'daily', priority: 0.9 },
    { path: '/baseball/results', changeFrequency: 'daily', priority: 0.8 },
    { path: '/baseball/analysis', changeFrequency: 'daily', priority: 0.8 },
    { path: '/baseball/standings', changeFrequency: 'daily', priority: 0.7 },
  ]

  const staticPages: MetadataRoute.Sitemap = staticPaths.flatMap((p) =>
    entriesForPath(p.path, {
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })
  )

  // 2. 블로그 글 동적으로 가져오기
  let blogPages: MetadataRoute.Sitemap = []

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at, published, published_en')
      .eq('published', true)
      .order('published_at', { ascending: false })

    if (!error && posts) {
      blogPages = posts.flatMap((post) => {
        const path = `/blog/${post.slug}`
        const lastModified = new Date(post.updated_at || post.published_at)

        // 한국어는 항상, 영어는 published_en=true인 경우에만 포함
        const koEntry: MetadataRoute.Sitemap[number] = {
          url: localizedUrl('ko', path),
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: {
            languages: {
              'ko-KR': localizedUrl('ko', path),
              ...(post.published_en
                ? { 'en-US': localizedUrl('en', path) }
                : {}),
              'x-default': localizedUrl('ko', path),
            },
          },
        }

        if (!post.published_en) return [koEntry]

        const enEntry: MetadataRoute.Sitemap[number] = {
          url: localizedUrl('en', path),
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: {
            languages: {
              'ko-KR': localizedUrl('ko', path),
              'en-US': localizedUrl('en', path),
              'x-default': localizedUrl('ko', path),
            },
          },
        }

        return [koEntry, enEntry]
      })
    }
  } catch (error) {
    console.error('Sitemap: 블로그 글 가져오기 실패:', error)
  }

  return [...staticPages, ...blogPages]
}
