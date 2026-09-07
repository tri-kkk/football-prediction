import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { routing } from '@/i18n/routing'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const BASE_URL = 'https://www.trendsoccer.com'

/**
 * ⚠️ 중요: 이 값이 없으면 sitemap.xml 이 빌드 시점에 한 번만 생성되어
 * 그 이후 발행된 블로그 글이 sitemap 에 영원히 반영되지 않는다.
 * (2026-07-31 빌드 이후 신규 글이 누락돼 있던 원인)
 * 1시간 단위 ISR 로 재생성한다.
 */
export const revalidate = 3600

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
    { path: '/football', changeFrequency: 'daily', priority: 0.9 },
    { path: '/highlights', changeFrequency: 'daily', priority: 0.7 },
    { path: '/magazine', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/advertise', changeFrequency: 'monthly', priority: 0.4 },
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

    // ⚠️ Supabase(PostgREST)는 한 번의 select 가 기본 1000행에서 잘린다.
    //    글이 1000개를 넘어간 뒤로는 오래된 글이 사이트맵에서 조용히 빠지므로
    //    range() 로 끝까지 페이지네이션해서 전부 가져온다.
    const PAGE = 1000
    const MAX_POSTS = 45000 // 사이트맵 1개 상한(50,000 URL)에 대한 안전 여유
    type PostRow = {
      slug: string
      updated_at: string | null
      published_at: string | null
      published: boolean | null
      published_en: boolean | null
    }
    const posts: PostRow[] = []
    let error: unknown = null

    for (let from = 0; from < MAX_POSTS; from += PAGE) {
      const { data, error: pageError } = await supabase
        .from('blog_posts')
        .select('slug, updated_at, published_at, published, published_en')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .range(from, from + PAGE - 1)

      if (pageError) {
        error = pageError
        break
      }
      if (!data || data.length === 0) break

      posts.push(...(data as PostRow[]))
      if (data.length < PAGE) break
    }

    if (!error && posts.length > 0) {
      blogPages = posts.flatMap((post) => {
        const path = `/blog/${post.slug}`
        // PostRow 필드가 모두 null 인 경우까지 방어 (타입상 Date 생성자에 null 불가)
        const lastModified = new Date(post.updated_at || post.published_at || Date.now())

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
