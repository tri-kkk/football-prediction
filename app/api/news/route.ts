import { NextRequest, NextResponse } from 'next/server'

const NEWS_API_TOKEN = process.env.NEWS_API_TOKEN || 'Fh23c0qhklAz5xdPY35QlRJ41SaJEBDywe6uWfH7'
const NEWS_API_BASE = 'https://api.thenewsapi.com/v1/news/all'

// 뉴스 카테고리 설정
const NEWS_CATEGORIES = [
  { 
    id: 'premier-league',
    name: 'Premier League',
    nameKo: '프리미어리그',
    search: 'Premier League',
    logo: 'https://crests.football-data.org/PL.png',
    limit: 8  // 중복 제거 후에도 5개 유지되도록 여유있게
  },
  { 
    id: 'champions-league',
    name: 'Champions League',
    nameKo: '챔피언스리그',
    search: 'Champions League UEFA',
    logo: 'https://crests.football-data.org/CL.png',
    limit: 8
  },
  { 
    id: 'la-liga',
    name: 'La Liga',
    nameKo: '라리가',
    search: 'La Liga Spain Barcelona Real Madrid',
    logo: 'https://crests.football-data.org/PD.png',
    limit: 8
  },
  { 
    id: 'bundesliga',
    name: 'Bundesliga',
    nameKo: '분데스리가',
    search: 'Bundesliga Bayern Munich Dortmund',
    logo: 'https://crests.football-data.org/BL1.png',
    limit: 8
  },
  { 
    id: 'serie-a',
    name: 'Serie A',
    nameKo: '세리에 A',
    search: 'Serie A Italy Inter Milan Juventus',
    logo: 'https://crests.football-data.org/SA.png',
    limit: 8
  },
  { 
    id: 'transfers',
    name: 'Transfers',
    nameKo: '이적 소식',
    search: 'football transfer rumor',
    logo: '',
    limit: 8
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

interface ProcessedArticle {
  id: string
  title: string
  description: string
  imageUrl: string
  url: string
  source: string
  publishedAt: string
}

async function fetchCategoryNews(search: string, limit: number): Promise<ProcessedArticle[]> {
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
    // 전역 중복 추적 Set
    const usedArticleIds = new Set<string>()
    const usedTitles = new Set<string>()
    
    const results = []
    
    // 순차적으로 처리하여 중복 제거
    for (const category of NEWS_CATEGORIES) {
      const articles = await fetchCategoryNews(category.search, category.limit)
      
      // 중복 제거된 기사만 필터링
      const uniqueArticles = articles.filter(article => {
        // ID 중복 체크
        if (usedArticleIds.has(article.id)) {
          return false
        }
        
        // 제목 유사도 체크 (같은 기사가 다른 ID로 올 수 있음)
        const normalizedTitle = article.title.toLowerCase().substring(0, 50)
        if (usedTitles.has(normalizedTitle)) {
          return false
        }
        
        // 사용된 것으로 표시
        usedArticleIds.add(article.id)
        usedTitles.add(normalizedTitle)
        
        return true
      }).slice(0, 5)  // 최대 5개만
      
      if (uniqueArticles.length > 0) {
        results.push({
          id: category.id,
          name: category.name,
          nameKo: category.nameKo,
          logo: category.logo,
          articles: uniqueArticles,
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      categories: results,
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