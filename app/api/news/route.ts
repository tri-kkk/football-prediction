import { NextRequest, NextResponse } from 'next/server'

// TheNewsAPI 설정
const NEWS_API_TOKEN = process.env.NEWS_API_TOKEN || 'Fh23c0qhklAz5xdPY35QlRJ41SaJEBDywe6uWfH7'
const NEWS_API_BASE = 'https://api.thenewsapi.com/v1/news/all'

// 뉴스 인터페이스
interface NewsArticle {
  uuid: string
  title: string
  description: string
  snippet: string
  url: string
  image_url: string
  language: string
  published_at: string
  source: string
  categories: string[]
  relevance_score: number
}

interface NewsResponse {
  meta: {
    found: number
    returned: number
    limit: number
    page: number
  }
  data: NewsArticle[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 25)
    
    // 단순 검색어 - soccer 사용 (football은 미식축구도 포함)
    const searchQuery = 'soccer'
    
    // API 호출 - 스포츠 카테고리 + soccer 검색
    const apiUrl = `${NEWS_API_BASE}?api_token=${NEWS_API_TOKEN}&categories=sports&search=${searchQuery}&language=en&limit=${limit}&sort=published_at`
    
    console.log('📰 Fetching news:', apiUrl.replace(NEWS_API_TOKEN, '***'))
    
    const response = await fetch(apiUrl, {
      next: { revalidate: 1800 } // 30분 캐시
    })
    
    if (!response.ok) {
      throw new Error(`News API error: ${response.status}`)
    }
    
    const data: NewsResponse = await response.json()
    
    console.log('📰 API returned:', data.meta.returned, 'articles')
    
    // 이미지 있는 기사만 필터링
    const articles = data.data
      .filter(article => article.image_url && article.image_url.length > 0)
      .map(article => ({
        id: article.uuid,
        title: article.title,
        description: article.description || article.snippet,
        imageUrl: article.image_url,
        url: article.url,
        source: article.source,
        publishedAt: article.published_at,
        categories: article.categories,
      }))
    
    return NextResponse.json({
      success: true,
      meta: {
        total: data.meta.found,
        returned: articles.length,
      },
      articles: articles,
    })
    
  } catch (error) {
    console.error('News API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch news',
        articles: []
      },
      { status: 500 }
    )
  }
}