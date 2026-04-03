import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

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

// DB에서 뉴스를 가져오는 헬퍼
async function getNewsFromDB(language: string, league?: string, limit: number = 6): Promise<ProcessedArticle[] | null> {
  try {
    let query = supabase
      .from('baseball_news')
      .select('*')
      .eq('language', language)
      .order('published_at', { ascending: false })
      .limit(limit)

    if (league && league !== 'ALL') {
      query = query.eq('league', league)
    }

    const { data, error } = await query
    if (error || !data || data.length === 0) return null

    return data.map((row: any) => ({
      id: row.article_id,
      title: row.title,
      description: row.description,
      imageUrl: row.image_url || '',
      url: row.url,
      source: row.source,
      publishedAt: row.published_at,
    }))
  } catch {
    return null
  }
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
      // DB 우선
      const dbArticles = await getNewsFromDB(uiLang, league, 6)
      if (dbArticles && dbArticles.length > 0) {
        const sorted = [
          ...dbArticles.filter(a => a.imageUrl),
          ...dbArticles.filter(a => !a.imageUrl)
        ].slice(0, 6)
        return NextResponse.json({
          success: true,
          league,
          articles: sorted,
          lang: uiLang,
          source: 'db',
          loadTime: Date.now() - startTime,
          updatedAt: new Date().toISOString(),
        })
      }

      // DB에 없으면 기존 API fallback
      const leagueSearchMap: Record<string, { en: string; ko: string }> = {
        WBC: { en: 'World Baseball Classic', ko: 'WBC 야구' },
        KBO: { en: 'KBO Korean baseball', ko: 'KBO 프로야구' },
        MLB: { en: 'MLB baseball', ko: 'MLB 메이저리그' },
        NPB: { en: 'NPB Japan baseball', ko: '일본 프로야구' },
        CPBL: { en: 'CPBL Taiwan baseball', ko: 'CPBL 대만야구' },
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
        source: 'api',
        loadTime: Date.now() - startTime,
        updatedAt: new Date().toISOString(),
      })
    }

    // 🔹 사이드바용
    if (lang) {
      // DB 우선
      const dbArticles = await getNewsFromDB(lang, undefined, 6)
      if (dbArticles && dbArticles.length > 0) {
        const sorted = [
          ...dbArticles.filter(a => a.imageUrl),
          ...dbArticles.filter(a => !a.imageUrl)
        ].slice(0, 6)
        return NextResponse.json({
          success: true,
          articles: sorted,
          lang,
          source: 'db',
          loadTime: Date.now() - startTime,
          updatedAt: new Date().toISOString(),
        })
      }

      // fallback
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
        source: 'api',
        loadTime: Date.now() - startTime,
        updatedAt: new Date().toISOString(),
      })
    }

    // 🔹 뉴스 페이지용: DB 우선 → fallback
    const categoriesToFetch = uiLang === 'ko'
      ? BASEBALL_NEWS_CATEGORIES.ko
      : BASEBALL_NEWS_CATEGORIES.en

    const LEAGUE_LOGOS: Record<string, string> = {
      mlb: 'https://media.api-sports.io/baseball/leagues/1.png',
      kbo: 'https://media.api-sports.io/baseball/leagues/5.png',
      npb: 'https://media.api-sports.io/baseball/leagues/2.png',
      cpbl: 'https://media.api-sports.io/baseball/leagues/29.png',
      wbc: 'https://media.api-sports.io/baseball/leagues/12.png',
    }

    // DB에서 리그별 뉴스 조회 시도
    const dbLeagues = ['MLB', 'KBO', 'NPB', 'CPBL']
    const dbResults: any[] = []
    let dbHasData = false

    for (const lg of dbLeagues) {
      const dbArticles = await getNewsFromDB(uiLang, lg, 6)
      if (dbArticles && dbArticles.length > 0) {
        dbHasData = true
        const cat = categoriesToFetch.find(c => c.id === lg.toLowerCase())
        dbResults.push({
          id: lg.toLowerCase(),
          name: cat?.name || lg,
          nameKo: cat?.nameKo || lg,
          nameEn: cat?.nameEn || lg,
          displayName: cat ? (uiLang === 'ko' ? cat.nameKo : cat.nameEn) : lg,
          logo: LEAGUE_LOGOS[lg.toLowerCase()] || '',
          hasImage: dbArticles.some(a => a.imageUrl),
          articles: dbArticles,
          noResults: false,
        })
      }
    }

    if (dbHasData) {
      return NextResponse.json({
        success: true,
        categories: dbResults,
        uiLang,
        source: 'db',
        totalArticles: dbResults.reduce((sum: number, cat: any) => sum + cat.articles.length, 0),
        loadTime: Date.now() - startTime,
        updatedAt: new Date().toISOString(),
      })
    }

    // DB에 데이터 없으면 기존 API 직접 호출 fallback
    const fetchPromises = categoriesToFetch.map(category =>
      fetchNews(category.search, uiLang, 10, category.id)
        .then(articles => ({ category, articles }))
    )

    const fetchResults = await Promise.all(fetchPromises)

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
      source: 'api',
      totalArticles: results.reduce((sum, cat) => sum + cat.articles.length, 0),
      loadTime: Date.now() - startTime,
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