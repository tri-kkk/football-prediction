import { NextRequest, NextResponse } from 'next/server'

// 뉴스 타입 정의
interface NewsArticle {
  id: string
  title: string
  summary: string
  content: string
  imageUrl: string
  category: string
  league: string
  author: string
  publishedAt: string
  tags: string[]
  views: number
  likes: number
}

// 다양한 축구 관련 이미지
const defaultImages = [
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=800&h=800&fit=crop',
]

// Reddit 포스트를 NewsArticle로 변환
function createArticleFromPost(post: any, source: string, index: number): NewsArticle {
  const title = post.title || ''
  const titleLower = title.toLowerCase()
  
  // 이미지 추출
  let imageUrl = ''
  
  if (post.preview?.images?.[0]) {
    imageUrl = post.preview.images[0].source.url.replace(/&amp;/g, '&')
  } else if (post.thumbnail && 
             post.thumbnail !== 'self' && 
             post.thumbnail !== 'default' &&
             post.thumbnail !== 'nsfw' &&
             post.thumbnail.startsWith('http')) {
    imageUrl = post.thumbnail
  } else if (post.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    imageUrl = post.url
  }
  
  if (!imageUrl) {
    imageUrl = defaultImages[index % defaultImages.length]
  }
  
  // 리그 감지
  let league = '해외축구'
  let tags: string[] = []
  let category = '뉴스'
  
  // 한국 선수
  if (titleLower.includes('son') || titleLower.includes('heung-min')) {
    league = '프리미어리그'
    tags.push('손흥민', '토트넘')
  } else if (titleLower.includes('lee kang') || titleLower.includes('kang-in')) {
    league = '리그1'
    tags.push('이강인', 'PSG')
  } else if (titleLower.includes('kim min') || titleLower.includes('min-jae')) {
    league = '분데스리가'
    tags.push('김민재', '바이에른')
  }
  
  // 리그 감지
  if (titleLower.includes('premier league') || titleLower.includes('epl')) {
    league = '프리미어리그'
    tags.push('프리미어리그')
  } else if (titleLower.includes('la liga')) {
    league = '라리가'
    tags.push('라리가')
  } else if (titleLower.includes('bundesliga')) {
    league = '분데스리가'
    tags.push('분데스리가')
  } else if (titleLower.includes('serie a')) {
    league = '세리에A'
    tags.push('세리에A')
  } else if (titleLower.includes('champions league') || titleLower.includes('ucl')) {
    league = '챔피언스리그'
    tags.push('챔피언스리그')
  } else if (titleLower.includes('ligue 1')) {
    league = '리그1'
    tags.push('리그1')
  }
  
  // 팀 감지
  const teams = [
    'Manchester United', 'Manchester City', 'Liverpool', 'Chelsea', 'Arsenal', 'Tottenham',
    'Real Madrid', 'Barcelona', 'Atletico Madrid',
    'Bayern Munich', 'Borussia Dortmund',
    'Juventus', 'Inter Milan', 'AC Milan',
    'PSG', 'Paris'
  ]
  teams.forEach(team => {
    if (titleLower.includes(team.toLowerCase())) {
      const shortName = team.split(' ')[0]
      if (!tags.includes(shortName)) {
        tags.push(shortName)
      }
    }
  })
  
  // 카테고리 감지
  if (titleLower.includes('goal') || titleLower.includes('score')) {
    category = '경기'
    tags.push('골')
  } else if (titleLower.includes('transfer') || titleLower.includes('sign')) {
    category = '이적'
    tags.push('이적')
  } else if (titleLower.includes('interview')) {
    category = '인터뷰'
  } else if (titleLower.includes('analysis') || titleLower.includes('tactical')) {
    category = '분석'
  }
  
  let summary = post.selftext || title
  if (summary.length > 200) {
    summary = summary.substring(0, 200) + '...'
  }
  
  const score = post.score || 0
  
  return {
    id: `reddit-${post.id}`,
    title,
    summary,
    content: post.selftext || summary,
    imageUrl,
    category,
    league,
    author: post.author ? `u/${post.author}` : source,
    publishedAt: new Date(post.created_utc * 1000).toISOString(),
    tags: tags.length > 0 ? tags : ['축구'],
    views: score * 10,
    likes: score,
  }
}

// 1. r/soccer
async function fetchRedditSoccer(): Promise<NewsArticle[]> {
  try {
    console.log('📰 Fetching r/soccer...')
    
    const response = await fetch(
      'https://www.reddit.com/r/soccer/hot.json?limit=50',
      { 
        next: { revalidate: 300 },
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    )
    
    console.log('r/soccer response status:', response.status)
    
    if (!response.ok) {
      console.error('❌ r/soccer error:', response.status, response.statusText)
      return []
    }
    
    const data = await response.json()
    console.log('r/soccer data received:', !!data.data?.children)
    
    if (!data.data?.children) {
      console.log('⚠️ r/soccer: No data.children')
      return []
    }
    
    const posts = data.data.children
      .map((child: any) => child.data)
      .filter((post: any) => !post.stickied && !post.is_self)
    
    console.log(`✅ r/soccer: ${posts.length} posts`)
    
    return posts.slice(0, 20).map((post: any, index: number) => 
      createArticleFromPost(post, 'r/soccer', index)
    )
  } catch (error) {
    console.error('❌ r/soccer fetch error:', error)
    return []
  }
}

// 2. r/PremierLeague
async function fetchRedditPremierLeague(): Promise<NewsArticle[]> {
  try {
    console.log('📰 Fetching r/PremierLeague...')
    
    const response = await fetch(
      'https://www.reddit.com/r/PremierLeague/hot.json?limit=30',
      { 
        next: { revalidate: 300 },
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    )
    
    console.log('r/PremierLeague response status:', response.status)
    
    if (!response.ok) {
      console.error('❌ r/PremierLeague error:', response.status)
      return []
    }
    
    const data = await response.json()
    if (!data.data?.children) return []
    
    const posts = data.data.children
      .map((child: any) => child.data)
      .filter((post: any) => !post.stickied && !post.is_self)
    
    console.log(`✅ r/PremierLeague: ${posts.length} posts`)
    
    return posts.slice(0, 15).map((post: any, index: number) => {
      const article = createArticleFromPost(post, 'r/PremierLeague', index)
      article.league = '프리미어리그'
      if (!article.tags.includes('프리미어리그')) {
        article.tags.push('프리미어리그')
      }
      return article
    })
  } catch (error) {
    console.error('❌ r/PremierLeague error:', error)
    return []
  }
}

// 3. r/LaLiga
async function fetchRedditLaLiga(): Promise<NewsArticle[]> {
  try {
    const response = await fetch(
      'https://www.reddit.com/r/LaLiga/hot.json?limit=20',
      { 
        next: { revalidate: 300 },
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }
    )
    
    if (!response.ok) return []
    const data = await response.json()
    if (!data.data?.children) return []
    
    const posts = data.data.children
      .map((child: any) => child.data)
      .filter((post: any) => !post.stickied && !post.is_self)
    
    console.log(`✅ r/LaLiga: ${posts.length} posts`)
    
    return posts.slice(0, 10).map((post: any, index: number) => {
      const article = createArticleFromPost(post, 'r/LaLiga', index)
      article.league = '라리가'
      if (!article.tags.includes('라리가')) {
        article.tags.push('라리가')
      }
      return article
    })
  } catch (error) {
    console.error('❌ r/LaLiga error:', error)
    return []
  }
}

// 4. r/Bundesliga
async function fetchRedditBundesliga(): Promise<NewsArticle[]> {
  try {
    const response = await fetch(
      'https://www.reddit.com/r/Bundesliga/hot.json?limit=20',
      { 
        next: { revalidate: 300 },
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }
    )
    
    if (!response.ok) return []
    const data = await response.json()
    if (!data.data?.children) return []
    
    const posts = data.data.children
      .map((child: any) => child.data)
      .filter((post: any) => !post.stickied && !post.is_self)
    
    console.log(`✅ r/Bundesliga: ${posts.length} posts`)
    
    return posts.slice(0, 10).map((post: any, index: number) => {
      const article = createArticleFromPost(post, 'r/Bundesliga', index)
      article.league = '분데스리가'
      if (!article.tags.includes('분데스리가')) {
        article.tags.push('분데스리가')
      }
      return article
    })
  } catch (error) {
    console.error('❌ r/Bundesliga error:', error)
    return []
  }
}

// 5. r/footballhighlights
async function fetchRedditHighlights(): Promise<NewsArticle[]> {
  try {
    const response = await fetch(
      'https://www.reddit.com/r/footballhighlights/hot.json?limit=20',
      { 
        next: { revalidate: 300 },
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }
    )
    
    if (!response.ok) return []
    const data = await response.json()
    if (!data.data?.children) return []
    
    const posts = data.data.children
      .map((child: any) => child.data)
      .filter((post: any) => !post.stickied)
    
    console.log(`✅ r/footballhighlights: ${posts.length} posts`)
    
    return posts.slice(0, 10).map((post: any, index: number) => {
      const article = createArticleFromPost(post, 'r/footballhighlights', index)
      article.category = '경기'
      if (!article.tags.includes('하이라이트')) {
        article.tags.push('하이라이트')
      }
      return article
    })
  } catch (error) {
    console.error('❌ r/footballhighlights error:', error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚽ Fetching from Reddit (5개 채널)...')
    console.log('Environment:', process.env.NODE_ENV)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const [
      soccerPosts,
      plPosts,
      laligaPosts,
      bundesligaPosts,
      highlightPosts
    ] = await Promise.all([
      fetchRedditSoccer(),
      fetchRedditPremierLeague(),
      fetchRedditLaLiga(),
      fetchRedditBundesliga(),
      fetchRedditHighlights()
    ])
    
    console.log('\n📊 Summary:')
    console.log(`✅ r/soccer: ${soccerPosts.length}`)
    console.log(`✅ r/PremierLeague: ${plPosts.length}`)
    console.log(`✅ r/LaLiga: ${laligaPosts.length}`)
    console.log(`✅ r/Bundesliga: ${bundesligaPosts.length}`)
    console.log(`✅ r/footballhighlights: ${highlightPosts.length}`)
    
    let allArticles = [
      ...soccerPosts,
      ...plPosts,
      ...laligaPosts,
      ...bundesligaPosts,
      ...highlightPosts
    ]
    
    console.log(`\n📦 Total fetched: ${allArticles.length} posts`)
    
    if (allArticles.length === 0) {
      console.log('⚠️ WARNING: No articles fetched from any source!')
      return NextResponse.json({
        articles: [],
        hasMore: false,
        total: 0,
        page,
        limit,
        sources: {
          soccer: soccerPosts.length,
          pl: plPosts.length,
          laliga: laligaPosts.length,
          bundesliga: bundesligaPosts.length,
          highlights: highlightPosts.length
        }
      })
    }
    
    // 날짜순 정렬
    allArticles.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    
    // 중복 제거
    const seenTitles = new Set<string>()
    allArticles = allArticles.filter(article => {
      const titleKey = article.title.toLowerCase().substring(0, 50)
      if (seenTitles.has(titleKey)) {
        return false
      }
      seenTitles.add(titleKey)
      return true
    })
    
    console.log(`🔍 After dedup: ${allArticles.length} unique posts`)
    
    // 페이지네이션
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedNews = allArticles.slice(startIndex, endIndex)
    const hasMore = endIndex < allArticles.length
    
    console.log(`\n📄 Page ${page}: ${paginatedNews.length} articles (${allArticles.length} total)`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    return NextResponse.json({
      articles: paginatedNews,
      hasMore,
      total: allArticles.length,
      page,
      limit,
      sources: {
        soccer: soccerPosts.length,
        pl: plPosts.length,
        laliga: laligaPosts.length,
        bundesliga: bundesligaPosts.length,
        highlights: highlightPosts.length
      }
    })
  } catch (error) {
    console.error('\n❌ API Error:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    
    return NextResponse.json({
      articles: [],
      hasMore: false,
      total: 0,
      page: 1,
      limit: 10,
      error: 'Failed to fetch from Reddit',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      sources: {
        soccer: 0,
        pl: 0,
        laliga: 0,
        bundesliga: 0,
        highlights: 0
      }
    })
  }
}