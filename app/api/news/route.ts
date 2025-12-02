import { NextRequest, NextResponse } from 'next/server'

const NEWS_API_TOKEN = process.env.NEWS_API_TOKEN || 'Fh23c0qhklAz5xdPY35QlRJ41SaJEBDywe6uWfH7'
const NEWS_API_BASE = 'https://api.thenewsapi.com/v1/news/all'

// 뉴스 카테고리 설정 - 실제 리그 엠블럼 URL 사용
const NEWS_CATEGORIES = [
  { 
    id: 'premier-league',
    name: 'Premier League',
    nameKo: '프리미어리그',
    search: 'Premier League',
    logo: 'https://crests.football-data.org/PL.png',
    limit: 5
  },
  { 
    id: 'champions-league',
    name: 'Champions League',
    nameKo: '챔피언스리그',
    search: 'Champions League UEFA',
    logo: 'https://crests.football-data.org/CL.png',
    limit: 5
  },
  { 
    id: 'la-liga',
    name: 'La Liga',
    nameKo: '라리가',
    search: 'La Liga Spain',
    logo: 'https://crests.football-data.org/PD.png',
    limit: 5
  },
  { 
    id: 'bundesliga',
    name: 'Bundesliga',
    nameKo: '분데스리가',
    search: 'Bundesliga Germany',
    logo: 'https://crests.football-data.org/BL1.png',
    limit: 5
  },
  { 
    id: 'serie-a',
    name: 'Serie A',
    nameKo: '세리에 A',
    search: 'Serie A Italy',
    logo: 'https://crests.football-data.org/SA.png',
    limit: 5
  },
  { 
    id: 'transfers',
    name: 'Transfers',
    nameKo: '이적 소식',
    search: 'soccer transfer',
    logo: '', // 이적은 로고 없이 아이콘 사용
    limit: 5
  },
]

interface NewsArticle {
  uuid: string
  title: string
  description: string
  snippet: string
  url: string
  image_url: string
  published_at: string
  source: string
}

interface NewsResponse {
  meta: { found: number; returned: number }
  data: NewsArticle[]
}

async function fetchCategoryNews(search: string, limit: number) {
  try {
    const url = `${NEWS_API_BASE}?api_token=${NEWS_API_TOKEN}&categories=sports&search=${encodeURIComponent(search)}&language=en&limit=${limit}&sort=published_at`
    
    const response = await fetch(url, {
      next: { revalidate: 1800 }
    })
    
    if (!response.ok) return []
    
    const data: NewsResponse = await response.json()
    
    return data.data
      .filter(article => article.image_url)
      .map(article => ({
        id: article.uuid,
        title: article.title,
        description: article.description || article.snippet,
        imageUrl: article.image_url,
        url: article.url,
        source: article.source,
        publishedAt: article.published_at,
      }))
  } catch (error) {
    console.error(`Error fetching ${search}:`, error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const results = await Promise.all(
      NEWS_CATEGORIES.map(async (category) => {
        const articles = await fetchCategoryNews(category.search, category.limit)
        return {
          id: category.id,
          name: category.name,
          nameKo: category.nameKo,
          logo: category.logo,
          articles: articles,
        }
      })
    )
    
    const categories = results.filter(cat => cat.articles.length > 0)
    
    return NextResponse.json({
      success: true,
      categories: categories,
      updatedAt: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('News API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch news', categories: [] },
      { status: 500 }
    )
  }
}