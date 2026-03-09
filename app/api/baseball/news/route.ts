import { NextRequest, NextResponse } from 'next/server'

// API 설정
const NEWS_API_TOKEN = process.env.NEWS_API_TOKEN || 'Fh23c0qhklAz5xdPY35QlRJ41SaJEBDywe6uWfH7'
const NEWS_API_BASE = 'https://api.thenewsapi.com/v1/news/all'

// ============================================
// 🏟️ 리그별 주요 구단 검색어
// ============================================

const TEAM_SEARCH_KEYWORDS = {
  WBC: {
    en: 'Korea Japan USA Dominican Republic Puerto Rico',
    ko: '대한민국 일본 미국 도미니카 푸에르토리코'
  },
  MLB: {
    en: 'Yankees Dodgers Red Sox Cubs Mets',
    ko: '양키스 다저스 레드삭스 컵스'
  },
  KBO: {
    en: 'Samsung Lions LG Twins Doosan Bears',
    ko: '삼성 LG 트윈스 두산 기아 SSG'
  },
  NPB: {
    en: 'Yomiuri Giants Hanshin Tigers SoftBank',
    ko: '요미우리 한신 소프트뱅크 오릭스'
  },
  CPBL: {
    en: 'Uni-Lions Brothers Guardians Monkeys',
    ko: '유니 라이온즈 브라더스 라쿠텐'
  }
}

// ============================================
// 📰 뉴스 카테고리 설정
// ============================================

const BASEBALL_NEWS_CATEGORIES = {
  en: [
    { 
      id: 'wbc',
      name: 'WBC',
      nameKo: 'WBC',
      nameEn: 'World Baseball Classic',
      search: 'World Baseball Classic',
      logo: 'https://media.api-sports.io/baseball/leagues/12.png',
    },
    { 
      id: 'mlb',
      name: 'MLB',
      nameKo: '메이저리그',
      nameEn: 'MLB',
      search: 'MLB baseball',
      logo: 'https://media.api-sports.io/baseball/leagues/1.png',
    },
    { 
      id: 'kbo-en',
      name: 'KBO',
      nameKo: '한국프로야구',
      nameEn: 'KBO League',
      search: 'KBO Korean baseball',
      logo: 'https://media.api-sports.io/baseball/leagues/5.png',
    },
    { 
      id: 'npb-en',
      name: 'NPB',
      nameKo: '일본프로야구',
      nameEn: 'NPB Japan',
      search: 'NPB Japan baseball',
      logo: 'https://media.api-sports.io/baseball/leagues/2.png',
    },
  ],
  ko: [
    { 
      id: 'wbc-ko',
      name: 'WBC',
      nameKo: 'WBC',
      nameEn: 'World Baseball Classic',
      search: 'WBC 야구',
      logo: 'https://media.api-sports.io/baseball/leagues/12.png',
    },
    { 
      id: 'kbo',
      name: 'KBO',
      nameKo: 'KBO 리그',
      nameEn: 'KBO League',
      search: 'KBO 프로야구',
      logo: 'https://media.api-sports.io/baseball/leagues/5.png',
    },
    { 
      id: 'mlb-ko',
      name: 'MLB',
      nameKo: '메이저리그',
      nameEn: 'MLB',
      search: 'MLB 메이저리그',
      logo: 'https://media.api-sports.io/baseball/leagues/1.png',
    },
    { 
      id: 'npb-ko',
      name: 'NPB',
      nameKo: '일본프로야구',
      nameEn: 'NPB Japan',
      search: '일본 프로야구',
      logo: 'https://media.api-sports.io/baseball/leagues/2.png',
    },
    { 
      id: 'korean-players',
      name: 'Korean Players',
      nameKo: '해외파 선수',
      nameEn: 'Korean Players Abroad',
      search: '메이저리그 한국인',
      logo: 'https://media.api-sports.io/baseball/leagues/1.png',
    },
  ]
}

const BLOCKED_KEYWORDS = [
  '승무패', '적중결과', '스포츠토토', '프로토', '배당률', '토토', '베팅',
  'betting', 'odds', 'sportsbook'
]

function filterArticles(articles: ProcessedArticle[]): ProcessedArticle[] {
  return articles.filter(article => {
    const title = article.title.toLowerCase()
    return !BLOCKED_KEYWORDS.some(keyword => title.includes(keyword.toLowerCase()))
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

// 🚀 타임아웃 추가된 fetch
async function fetchWithTimeout(url: string, timeout: number = 5000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      next: { revalidate: 1800 }
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

async function fetchNews(
  search: string, 
  language: 'en' | 'ko' = 'en',
  limit: number = 6,
  categoryId?: string
): Promise<ProcessedArticle[]> {
  try {
    const params = new URLSearchParams({
      api_token: NEWS_API_TOKEN,
      categories: 'sports',
      search: search,
      language: language,
      limit: limit.toString(),
      sort: 'published_at',
      sort_order: 'desc'
    })
    
    const url = `${NEWS_API_BASE}?${params.toString()}`
    
    // 🚀 5초 타임아웃
    const response = await fetchWithTimeout(url, 5000)
    
    if (!response.ok) {
      console.error(`[News] ${categoryId}: API ${response.status}`)
      return []
    }
    
    const data = await response.json()
    
    if (!data.data || !Array.isArray(data.data)) {
      return []
    }
    
    return data.data.map((article: any) => ({
      id: article.uuid || `news-${Date.now()}-${Math.random()}`,
      title: article.title || '',
      description: article.description || article.snippet || '',
      imageUrl: article.image_url || '',
      url: article.url || '',
      source: extractSource(article.source || article.url || ''),
      publishedAt: article.published_at || new Date().toISOString(),
    })).sort((a: ProcessedArticle, b: ProcessedArticle) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`[News] ${categoryId}: Timeout`)
    } else {
      console.error(`[News] ${categoryId}: Error`, error.message)
    }
    return []
  }
}

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
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') as 'en' | 'ko' | null
    const uiLang = (searchParams.get('ui') as 'en' | 'ko') || 'ko'
    const league = searchParams.get('league')
    const debug = searchParams.get('debug') === 'true'
    
    // 🔹 특정 리그 뉴스
    if (league && league !== 'ALL') {
      const leagueSearchMap: Record<string, { en: string; ko: string }> = {
        WBC: {
          en: 'World Baseball Classic',
          ko: 'WBC 야구'
        },
        KBO: { 
          en: 'KBO Korean baseball', 
          ko: 'KBO 프로야구' 
        },
        MLB: { 
          en: 'MLB baseball', 
          ko: 'MLB 메이저리그' 
        },
        NPB: { 
          en: 'NPB Japan baseball', 
          ko: '일본 프로야구' 
        },
        CPBL: { 
          en: 'CPBL Taiwan baseball', 
          ko: 'CPBL 대만야구' 
        },
      }
      
      const searchTerm = leagueSearchMap[league]?.[uiLang] || `${league} baseball`
      const articles = await fetchNews(searchTerm, uiLang, 10, league)
      const filtered = filterArticles(articles)
      
      const sorted = [
        ...filtered.filter(a => a.imageUrl),
        ...filtered.filter(a => !a.imageUrl)
      ].slice(0, 6)
      
      return NextResponse.json({
        success: true,
        league,
        articles: sorted,
        lang: uiLang,
        loadTime: Date.now() - startTime,
        updatedAt: new Date().toISOString(),
      })
    }
    
    // 🔹 사이드바용
    if (lang) {
      const search = lang === 'ko' ? '야구 프로야구 KBO MLB' : 'baseball MLB KBO'
      const articles = await fetchNews(search, lang, 10, 'sidebar')
      const filtered = filterArticles(articles)
      
      const sorted = [
        ...filtered.filter(a => a.imageUrl),
        ...filtered.filter(a => !a.imageUrl)
      ].slice(0, 6)
      
      return NextResponse.json({
        success: true,
        articles: sorted,
        lang,
        loadTime: Date.now() - startTime,
        updatedAt: new Date().toISOString(),
      })
    }
    
    // 🔹 뉴스 페이지용: 🚀 병렬 처리!
    const categoriesToFetch = uiLang === 'ko' 
      ? BASEBALL_NEWS_CATEGORIES.ko 
      : BASEBALL_NEWS_CATEGORIES.en
    
    // ⚡ 모든 카테고리 동시에 호출
    const fetchPromises = categoriesToFetch.map(category => 
      fetchNews(category.search, uiLang, 10, category.id)
        .then(articles => ({ category, articles }))
    )
    
    const fetchResults = await Promise.all(fetchPromises)
    
    // 결과 처리
    const usedIds = new Set<string>()
    const usedTitles = new Set<string>()
    const results = []
    const debugInfo: any[] = []
    
    for (const { category, articles } of fetchResults) {
      const filteredArticles = filterArticles(articles)
      const unique = deduplicateArticles(filteredArticles, usedIds, usedTitles, 6)
      
      if (debug) {
        debugInfo.push({
          id: category.id,
          search: category.search,
          rawCount: articles.length,
          uniqueCount: unique.length,
        })
      }
      
      results.push({
        id: category.id,
        name: category.name,
        nameKo: category.nameKo,
        nameEn: category.nameEn,
        displayName: uiLang === 'ko' ? category.nameKo : category.nameEn,
        logo: category.logo,
        hasImage: unique.some(a => a.imageUrl),
        articles: unique,
        noResults: unique.length === 0,
      })
    }
    
    const response: any = {
      success: true,
      categories: results,
      uiLang,
      totalArticles: results.reduce((sum, cat) => sum + cat.articles.length, 0),
      loadTime: Date.now() - startTime,  // 🚀 로딩 시간 표시
      updatedAt: new Date().toISOString(),
    }
    
    if (debug) {
      response.debug = debugInfo
    }
    
    console.log(`[Baseball News] Total load time: ${Date.now() - startTime}ms`)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('[Baseball News] API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch baseball news', 
        categories: [], 
        articles: [],
        loadTime: Date.now() - startTime 
      },
      { status: 500 }
    )
  }
}