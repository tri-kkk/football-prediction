import { NextRequest, NextResponse } from 'next/server'

// API 설정
const NEWS_API_TOKEN = process.env.NEWS_API_TOKEN || 'Fh23c0qhklAz5xdPY35QlRJ41SaJEBDywe6uWfH7'
const NEWS_API_BASE = 'https://api.thenewsapi.com/v1/news/all'

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || '4vRIttCnY29H4SdYztZU'
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || 'MaqnBYPgKh'
const NAVER_API_BASE = 'https://openapi.naver.com/v1/search/news.json'

interface ProcessedArticle {
  id: string
  title: string
  description: string
  imageUrl: string
  url: string
  source: string
  publishedAt: string
}

// TheNewsAPI에서 뉴스 가져오기 (영어)
async function fetchInternationalNews(limit: number = 10): Promise<ProcessedArticle[]> {
  try {
    const url = `${NEWS_API_BASE}?api_token=${NEWS_API_TOKEN}&categories=sports&search=football+soccer&language=en&limit=${limit}&sort=published_at`
    
    const response = await fetch(url, { next: { revalidate: 1800 } })
    if (!response.ok) return []
    
    const data = await response.json()
    
    return data.data
      .filter((article: any) => article.image_url)
      .map((article: any) => ({
        id: article.uuid,
        title: article.title,
        description: article.description || article.snippet,
        imageUrl: article.image_url,
        url: article.url,
        source: article.source,
        publishedAt: article.published_at,
      }))
  } catch (error) {
    console.error('Error fetching international news:', error)
    return []
  }
}

// 네이버 API에서 뉴스 가져오기 (한국어)
async function fetchNaverNews(display: number = 10): Promise<ProcessedArticle[]> {
  try {
    const url = `${NAVER_API_BASE}?query=${encodeURIComponent('축구')}&display=${display}&sort=date`
    
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
      next: { revalidate: 1800 }
    })
    
    if (!response.ok) return []
    
    const data = await response.json()
    
    return data.items.map((item: any, index: number) => {
      const cleanTitle = item.title
        .replace(/<[^>]*>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
      
      const cleanDesc = item.description
        .replace(/<[^>]*>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
      
      let source = '뉴스'
      try {
        const urlObj = new URL(item.originallink)
        source = urlObj.hostname
          .replace('www.', '')
          .replace('.co.kr', '')
          .replace('.com', '')
          .replace('sports.', '')
          .replace('news.', '')
      } catch {}
      
      return {
        id: `naver-${index}-${Date.now()}`,
        title: cleanTitle,
        description: cleanDesc,
        imageUrl: '',
        url: item.link,
        source: source,
        publishedAt: item.pubDate,
      }
    })
  } catch (error) {
    console.error('Error fetching Naver news:', error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') || 'ko'
    
    let articles: ProcessedArticle[] = []
    
    if (lang === 'ko') {
      // 한국어: 네이버 뉴스
      articles = await fetchNaverNews(10)
    } else {
      // 영어: TheNewsAPI
      articles = await fetchInternationalNews(10)
    }
    
    // 중복 제거
    const seenTitles = new Set<string>()
    const uniqueArticles = articles.filter(article => {
      const normalizedTitle = article.title.substring(0, 30).toLowerCase()
      if (seenTitles.has(normalizedTitle)) return false
      seenTitles.add(normalizedTitle)
      return true
    }).slice(0, 6)
    
    return NextResponse.json({
      success: true,
      articles: uniqueArticles,
      lang: lang,
      updatedAt: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('News API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch news', articles: [] },
      { status: 500 }
    )
  }
}