import { NextRequest, NextResponse } from 'next/server'

// API 설정
const NEWS_API_TOKEN = process.env.NEWS_API_TOKEN || 'Fh23c0qhklAz5xdPY35QlRJ41SaJEBDywe6uWfH7'
const NEWS_API_BASE = 'https://api.thenewsapi.com/v1/news/all'

// 뉴스 카테고리 설정
const NEWS_CATEGORIES = {
  // 영어 뉴스 카테고리
  en: [
    { 
      id: 'premier-league',
      name: 'Premier League',
      nameKo: '프리미어리그',
      nameEn: 'Premier League',
      search: 'Premier League',
      logo: 'https://media.api-sports.io/football/leagues/39.png',
    },
    { 
      id: 'champions-league',
      name: 'Champions League',
      nameKo: '챔피언스리그',
      nameEn: 'Champions League',
      search: 'Champions League UEFA',
      logo: 'https://media.api-sports.io/football/leagues/2.png',
    },
    { 
      id: 'la-liga',
      name: 'La Liga',
      nameKo: '라리가',
      nameEn: 'La Liga',
      search: 'La Liga Barcelona Real Madrid',
      logo: 'https://media.api-sports.io/football/leagues/140.png',
    },
    { 
      id: 'bundesliga',
      name: 'Bundesliga',
      nameKo: '분데스리가',
      nameEn: 'Bundesliga',
      search: 'Bundesliga Bayern',
      logo: 'https://media.api-sports.io/football/leagues/78.png',
    },
    { 
      id: 'serie-a',
      name: 'Serie A',
      nameKo: '세리에A',
      nameEn: 'Serie A',
      search: 'Serie A Inter Milan Juventus',
      logo: 'https://media.api-sports.io/football/leagues/135.png',
    },
  ],
  // 한국어 뉴스 카테고리
  ko: [
    { 
      id: 'korean-football',
      name: 'Korean Football',
      nameKo: '국내 축구',
      nameEn: 'K-League',
      search: 'K리그',
      logo: 'https://media.api-sports.io/football/leagues/292.png',
    },
    { 
      id: 'premier-league-ko',
      name: 'Premier League',
      nameKo: '프리미어리그',
      nameEn: 'Premier League',
      search: '프리미어리그',
      logo: 'https://media.api-sports.io/football/leagues/39.png',
    },
    { 
      id: 'laliga-ko',
      name: 'La Liga',
      nameKo: '라리가',
      nameEn: 'La Liga',
      search: '라리가',
      logo: 'https://media.api-sports.io/football/leagues/140.png',
    },
    { 
      id: 'champions-league-ko',
      name: 'Champions League',
      nameKo: '챔피언스리그',
      nameEn: 'Champions League',
      search: '챔피언스리그',
      logo: 'https://media.api-sports.io/football/leagues/2.png',
    },
  ]
}

// 필터링할 키워드 (토토, 베팅 관련) - 제목에서만 체크
const BLOCKED_KEYWORDS = [
  '승무패', '적중결과', '스포츠토토', '프로토', '배당률'
]

// 기사 필터링 함수 - 제목만 체크
function filterArticles(articles: ProcessedArticle[]): ProcessedArticle[] {
  return articles.filter(article => {
    const title = article.title
    return !BLOCKED_KEYWORDS.some(keyword => title.includes(keyword))
  })
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

// TheNewsAPI에서 뉴스 가져오기
async function fetchNews(
  search: string, 
  language: 'en' | 'ko' = 'en',
  limit: number = 6
): Promise<ProcessedArticle[]> {
  try {
    const params = new URLSearchParams({
      api_token: NEWS_API_TOKEN,
      categories: 'sports',
      search: search,
      language: language,
      limit: limit.toString(),
      sort: 'published_at',
      sort_order: 'desc'  // 최신순 (내림차순)
    })
    
    const url = `${NEWS_API_BASE}?${params.toString()}`
    
    const response = await fetch(url, { 
      next: { revalidate: 1800 } // 30분 캐시
    })
    
    if (!response.ok) {
      console.error(`NewsAPI Error: ${response.status}`)
      return []
    }
    
    const data = await response.json()
    
    if (!data.data || !Array.isArray(data.data)) {
      return []
    }
    
    // 최신순 정렬 보장
    const articles = data.data.map((article: any) => ({
      id: article.uuid || `news-${Date.now()}-${Math.random()}`,
      title: article.title || '',
      description: article.description || article.snippet || '',
      imageUrl: article.image_url || '',
      url: article.url || '',
      source: extractSource(article.source || article.url || ''),
      publishedAt: article.published_at || new Date().toISOString(),
    }))
    
    // 한번 더 최신순 정렬
    return articles.sort((a: ProcessedArticle, b: ProcessedArticle) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  } catch (error) {
    console.error('Error fetching news:', error)
    return []
  }
}

// 소스 이름 추출
function extractSource(source: string): string {
  try {
    if (source.includes('.')) {
      return source
        .replace('www.', '')
        .replace('.com', '')
        .replace('.co.kr', '')
        .replace('.net', '')
        .replace('sports.', '')
    }
    return source
  } catch {
    return source
  }
}

// 중복 제거
function deduplicateArticles(
  articles: ProcessedArticle[], 
  usedIds: Set<string>, 
  usedTitles: Set<string>,
  maxCount: number
): ProcessedArticle[] {
  const result: ProcessedArticle[] = []
  
  for (const article of articles) {
    if (result.length >= maxCount) break
    if (usedIds.has(article.id)) continue
    
    const normalizedTitle = article.title.toLowerCase().substring(0, 40)
    if (usedTitles.has(normalizedTitle)) continue
    
    usedIds.add(article.id)
    usedTitles.add(normalizedTitle)
    result.push(article)
  }
  
  return result
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') as 'en' | 'ko' | null
    const uiLang = searchParams.get('ui') as 'en' | 'ko' || 'ko'
    
    // 🔹 사이드바용: 단순 기사 목록
    if (lang) {
      const search = lang === 'ko' ? '축구 프리미어리그 K리그' : 'football Premier League'
      const articles = await fetchNews(search, lang, 10)
      
      // 이미지 있는 기사 우선
      const sorted = [
        ...articles.filter(a => a.imageUrl),
        ...articles.filter(a => !a.imageUrl)
      ].slice(0, 6)
      
      return NextResponse.json({
        success: true,
        articles: sorted,
        lang,
        updatedAt: new Date().toISOString(),
      })
    }
    
    // 🔹 뉴스 페이지용: UI 언어에 맞는 카테고리만 반환
    const usedIds = new Set<string>()
    const usedTitles = new Set<string>()
    const results = []
    
    // UI 언어에 맞는 카테고리만 선택
    const categoriesToFetch = uiLang === 'ko' ? NEWS_CATEGORIES.ko : NEWS_CATEGORIES.en
    const fetchLang = uiLang // 뉴스 언어도 UI 언어와 동일
    
    for (const category of categoriesToFetch) {
      const articles = await fetchNews(category.search, fetchLang, 10)
      
      // 토토/베팅 관련 기사 필터링
      const filteredArticles = filterArticles(articles)
      
      const unique = deduplicateArticles(filteredArticles, usedIds, usedTitles, 6)
      
      if (unique.length > 0) {
        const hasImages = unique.some(a => a.imageUrl)
        
        results.push({
          id: category.id,
          name: category.name,
          nameKo: category.nameKo,
          nameEn: category.nameEn,
          displayName: uiLang === 'ko' ? category.nameKo : category.nameEn,
          logo: category.logo,
          hasImage: hasImages,
          articles: unique,
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      categories: results,
      uiLang,
      totalArticles: results.reduce((sum, cat) => sum + cat.articles.length, 0),
      updatedAt: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('News API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch news', categories: [], articles: [] },
      { status: 500 }
    )
  }
}
