import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // 최신 블로그 글 50개 가져오기
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('id, slug, title, title_kr, excerpt, cover_image, author, category, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('RSS fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    const siteUrl = 'https://trendsoccer.com'
    const now = new Date().toUTCString()

    // RSS 2.0 XML 생성
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>TrendSoccer - 축구 분석 리포트</title>
    <link>${siteUrl}</link>
    <description>AI 기반 축구 경기 분석 및 예측 리포트. 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1 등 주요 리그 경기 분석.</description>
    <language>ko</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${siteUrl}/feed" rel="self" type="application/rss+xml"/>
    <image>
      <url>${siteUrl}/og-image.png</url>
      <title>TrendSoccer</title>
      <link>${siteUrl}</link>
    </image>
    ${posts?.map(post => `
    <item>
      <title><![CDATA[${post.title_kr || post.title}]]></title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt || ''}]]></description>
      <category>${post.category || 'preview'}</category>
      <author>${post.author || 'TrendSoccer'}</author>
      <pubDate>${post.created_at ? new Date(post.created_at).toUTCString() : now}</pubDate>
      ${post.cover_image ? `<enclosure url="${post.cover_image}" type="image/jpeg"/>` : ''}
    </item>`).join('') || ''}
  </channel>
</rss>`

    return new NextResponse(rssXml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('RSS generation error:', error)
    return NextResponse.json({ error: 'RSS generation failed' }, { status: 500 })
  }
}
