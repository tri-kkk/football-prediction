import { NextRequest, NextResponse } from 'next/server'

// TheNewsAPI 설정
const NEWS_API_TOKEN = process.env.NEWS_API_TOKEN || 'Fh23c0qhklAz5xdPY35QlRJ41SaJEBDywe6uWfH7'
const NEWS_API_BASE = 'https://api.thenewsapi.com/v1/news/all'

// 리그별 검색 키워드
const LEAGUE_KEYWORDS: Record<string, string> = {
  'ALL': 'Premier+League|La+Liga|Bundesliga|Serie+A|Champions+League',
  'PL': 'Premier+League',
  'PD': 'La+Liga+Spain',
  'BL1': 'Bundesliga+Germany',
  'SA': 'Serie+A+Italy',
  'FL1': 'Ligue+1+France',
  'CL': 'Champions+League+UEFA',
}

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
    const league = searchParams.get('league') || 'ALL'
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 25) // Basic 플랜 최대 25개
    const search = searchParams.get('search') || ''
    
    // 검색어 설정
    let searchQuery = LEAGUE_KEYWORDS[league] || LEAGUE_KEYWORDS['ALL']
    if (search) {
      searchQuery = search.replace(/\s+/g, '+')
    }
    
    // API 호출 - Basic 플랜: 25개까지 가능
    const apiUrl = `${NEWS_API_BASE}?api_token=${NEWS_API_TOKEN}&categories=sports&search=${searchQuery}&language=en&limit=${limit}&published_after=2024-01-01`
    
    console.log('📰 Fetching news:', apiUrl.replace(NEWS_API_TOKEN, '***'))
    
    const response = await fetch(apiUrl, {
      next: { revalidate: 1800 } // 30분 캐시
    })
    
    if (!response.ok) {
      throw new Error(`News API error: ${response.status}`)
    }
    
    const data: NewsResponse = await response.json()
    
    // 데이터 변환
    const articles = data.data.map(article => ({
      id: article.uuid,
      title: article.title,
      description: article.description || article.snippet,
      imageUrl: article.image_url || '/images/default-football.jpg',
      url: article.url,
      source: article.source,
      publishedAt: article.published_at,
      publishedAtKR: formatDateKR(article.published_at),
      categories: article.categories,
    }))
    
    return NextResponse.json({
      success: true,
      meta: {
        total: data.meta.found,
        returned: data.meta.returned,
        league: league,
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

// 한국 시간 포맷
function formatDateKR(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffHours < 1) {
    return '방금 전'
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`
  } else if (diffDays < 7) {
    return `${diffDays}일 전`
  } else {
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    })
  }
}