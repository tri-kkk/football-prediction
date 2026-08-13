import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// 헤드라인 영→한 번역 (Gemini). 실패 시 원문 유지.
async function translateTitlesToKo(titles: string[]): Promise<string[]> {
  try {
    if (!process.env.GEMINI_API_KEY) return titles
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    const prompt = `다음 축구 뉴스 헤드라인들을 자연스러운 한국어로 번역해줘. 팀·선수 이름은 한국에서 통용되는 표기로. 입력과 같은 길이의 JSON 문자열 배열로만 출력(설명·코드블록 없이):\n${JSON.stringify(titles)}`
    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const arr = JSON.parse(text)
    return Array.isArray(arr) && arr.length === titles.length ? arr.map((s: any) => String(s)) : titles
  } catch (e) {
    console.error('title translate error:', e)
    return titles
  }
}

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

    // 🔹 TrendCoach 전용: 축구 빅리그 소식만 (야구·K리그 제외, 플랫 목록)
    if (searchParams.get('scope') === 'bigleague') {
      const BIG = [
        { tag: 'EPL', search: '프리미어리그 | 손흥민' },
        { tag: '라리가', search: '라리가 | 레알 마드리드 | 바르셀로나' },
        { tag: '분데스', search: '분데스리가 | 바이에른' },
        { tag: '세리에A', search: '세리에A | 유벤투스 | 인터밀란' },
        { tag: '챔스', search: '챔피언스리그' },
      ]
      const usedIds = new Set<string>()
      const usedTitles = new Set<string>()
      const perLeague = await Promise.all(
        BIG.map(async (b) => {
          const arts = filterArticles(await fetchNews(b.search, 'ko', 6))
          return deduplicateArticles(arts, usedIds, usedTitles, 3).map((a) => ({ ...a, league: b.tag }))
        })
      )
      const flat: (ProcessedArticle & { league: string })[] = []
      // 리그별 라운드로빈으로 다양성 확보 후, 최신순 정렬
      for (let i = 0; i < 3; i++) for (const arr of perLeague) if (arr[i]) flat.push(arr[i])

      // ko 결과가 적으면 영어 빅리그로 보충
      if (flat.length < 4) {
        const enArts = filterArticles(
          await fetchNews('Premier League | La Liga | Bundesliga | Serie A | Champions League', 'en', 12)
        )
        const more = deduplicateArticles(enArts, usedIds, usedTitles, 12 - flat.length).map((a) => ({ ...a, league: '해외축구' }))
        flat.push(...more)
      }

      flat.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

      return NextResponse.json({
        success: true,
        articles: flat.slice(0, 10),
        scope: 'bigleague',
        updatedAt: new Date().toISOString(),
      })
    }

    // 🔹 TrendCoach 경기 상세: 두 팀 관련 뉴스 (헤드라인)
    const matchQ = searchParams.get('match') // "HomeTeam|AwayTeam" (영문 팀명 권장)
    if (matchQ) {
      const search = matchQ.split('|').map((t) => t.trim()).filter(Boolean).join(' | ')
      // 영어로 검색해 커버리지 확보
      const arts = filterArticles(await fetchNews(search, 'en', 10))
      const usedIds = new Set<string>()
      const usedTitles = new Set<string>()
      let unique = deduplicateArticles(arts, usedIds, usedTitles, 6)
      // 헤드라인만 한글 번역(translate=ko)
      if (searchParams.get('translate') === 'ko' && unique.length) {
        const ko = await translateTitlesToKo(unique.map((a) => a.title))
        unique = unique.map((a, i) => ({ ...a, title: ko[i] || a.title }))
      }
      return NextResponse.json({
        success: true,
        articles: unique,
        updatedAt: new Date().toISOString(),
      })
    }

    // 🔹 사이드바용: 단순 기사 목록
    if (lang) {
      // 축구 + 야구 뉴스를 함께 가져와 섞음 (히어로/그리드 종목 확장)
      const fbSearch = lang === 'ko' ? '축구 | 손흥민 | 프리미어리그 | K리그 | 챔피언스리그' : 'football | soccer | Premier League | Champions League'
      const bbSearch = lang === 'ko' ? '야구 | KBO | 메이저리그 | 류현진 | 김하성 | 이정후' : 'baseball | MLB | KBO'
      const enFb = 'football | soccer | Premier League | Champions League'
      const enBb = 'baseball | MLB | KBO'
      const withImage = (arr: ProcessedArticle[]) => arr.filter((a) => a.imageUrl)
      const dkey = (a: ProcessedArticle) => a.title.toLowerCase().slice(0, 40)

      let [fb, bb] = await Promise.all([
        fetchNews(fbSearch, lang, 10).then(filterArticles),
        fetchNews(bbSearch, lang, 8).then(filterArticles),
      ])

      if (lang === 'ko' && withImage(fb).length < 4) {
        const more = filterArticles(await fetchNews(enFb, 'en', 10))
        const seen = new Set(fb.map(dkey))
        fb = [...fb, ...more.filter((a) => !seen.has(dkey(a)))]
      }
      if (lang === 'ko' && withImage(bb).length < 3) {
        const more = filterArticles(await fetchNews(enBb, 'en', 8))
        const seen = new Set(bb.map(dkey))
        bb = [...bb, ...more.filter((a) => !seen.has(dkey(a)))]
      }

      const fbImg = withImage(fb)
      const bbImg = withImage(bb)
      const startBb =
        bbImg.length > 0 &&
        (fbImg.length === 0 ||
          new Date(bbImg[0].publishedAt).getTime() > new Date(fbImg[0].publishedAt).getTime())
      const firstArr = startBb ? bbImg : fbImg
      const secondArr = startBb ? fbImg : bbImg
      const interleaved: ProcessedArticle[] = []
      const seenKey = new Set<string>()
      for (let i = 0; i < Math.max(firstArr.length, secondArr.length); i++) {
        for (const a of [firstArr[i], secondArr[i]]) {
          if (a && !seenKey.has(dkey(a))) {
            seenKey.add(dkey(a))
            interleaved.push(a)
          }
        }
      }
      const noImg = [...fb, ...bb].filter((a) => !a.imageUrl && !seenKey.has(dkey(a)))
      const sorted = [...interleaved, ...noImg].slice(0, 14)

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
