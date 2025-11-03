// app/api/news/keywords/route.ts
import { NextRequest, NextResponse } from 'next/server'

// 날짜 필터 (최근 3일 이내만)
function isRecentArticle(dateString: string): boolean {
  if (!dateString) return false
  
  const articleDate = new Date(dateString)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  
  return articleDate >= threeDaysAgo
}

// 경기 관련성 체크
function isMatchRelated(title: string, homeTeam: string, awayTeam: string): boolean {
  const titleLower = title.toLowerCase()
  const homeLower = homeTeam.toLowerCase()
  const awayLower = awayTeam.toLowerCase()
  
  // 두 팀 모두 언급되거나, "vs" "대" 같은 경기 키워드 포함
  const hasBothTeams = titleLower.includes(homeLower) && titleLower.includes(awayLower)
  const hasMatchKeyword = titleLower.includes('vs') || 
                          titleLower.includes('대') || 
                          titleLower.includes('맞대결') ||
                          titleLower.includes('경기') ||
                          titleLower.includes('match') ||
                          titleLower.includes('preview')
  
  return hasBothTeams || (hasMatchKeyword && (titleLower.includes(homeLower) || titleLower.includes(awayLower)))
}

// 검색 쿼리 생성
function buildMatchQuery(homeTeam: string, awayTeam: string): string {
  const cleanTeam = (name: string) => {
    return name.replace(/FC|United|City|AFC|CF/gi, '').trim()
  }
  
  const home = cleanTeam(homeTeam)
  const away = cleanTeam(awayTeam)
  
  // "팀A vs 팀B" 형태로 정확한 검색
  return `"${home}" vs "${away}"`
}

// Google News (빠른 버전 - RSS만)
async function fetchGoogleNews(homeTeam: string, awayTeam: string) {
  try {
    const query = buildMatchQuery(homeTeam, awayTeam)
    const encodedQuery = encodeURIComponent(query)
    
    // 최근 3일 필터 추가
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    const dateFilter = threeDaysAgo.toISOString().split('T')[0]
    
    const url = `https://news.google.com/rss/search?q=${encodedQuery}+after:${dateFilter}&hl=ko&gl=KR&ceid=KR:ko`
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 } // 1시간 캐시
    })
    
    if (!response.ok) return []
    
    const xml = await response.text()
    const items = xml.match(/<item>(.*?)<\/item>/gs) || []
    
    const articles = items.slice(0, 5).map(item => {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
      const title = titleMatch ? titleMatch[1] : ''
      
      const linkMatch = item.match(/<link>(.*?)<\/link>/)
      const link = linkMatch ? linkMatch[1] : ''
      
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/)
      const pubDate = dateMatch ? dateMatch[1] : ''
      
      return {
        title: title.replace(/ - .*$/, '').trim(),
        url: link,
        source: 'Google News',
        date: pubDate
      }
    }).filter(article => {
      // 필터링: 제목 있고, URL 있고, 최근 3일, 경기 관련
      return article.title && 
             article.url && 
             isRecentArticle(article.date) &&
             isMatchRelated(article.title, homeTeam, awayTeam)
    })
    
    return articles
    
  } catch (error) {
    console.error('Google News error:', error)
    return []
  }
}

// Naver 검색 API (빠른 버전)
async function fetchNaverNews(homeTeam: string, awayTeam: string) {
  try {
    const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
    const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET
    
    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      return []
    }
    
    const query = buildMatchQuery(homeTeam, awayTeam)
    const encodedQuery = encodeURIComponent(query)
    
    // display=5로 줄여서 속도 향상
    const url = `https://openapi.naver.com/v1/search/news.json?query=${encodedQuery}&display=5&sort=date`
    
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
      },
      next: { revalidate: 3600 } // 1시간 캐시
    })
    
    if (!response.ok) return []
    
    const data = await response.json()
    
    if (!data.items) return []
    
    return data.items
      .map((item: any) => ({
        title: item.title
          .replace(/<\/?b>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&amp;/g, '&')
          .trim(),
        url: item.originallink || item.link,
        source: 'Naver News',
        date: item.pubDate
      }))
      .filter((article: any) => {
        // 필터링: 최근 3일, 경기 관련
        return isRecentArticle(article.date) &&
               isMatchRelated(article.title, homeTeam, awayTeam)
      })
    
  } catch (error) {
    console.error('Naver News error:', error)
    return []
  }
}

// 키워드 추출 (간소화)
function extractKeywords(headlines: any[]) {
  const keywords: { [key: string]: number } = {}
  
  const relevantWords = [
    '부상', '결장', '출전', '복귀',
    '연승', '연패', '승리', '패배',
    '감독', '전술', '라인업',
    '예상', '전망', '프리뷰'
  ]
  
  headlines.forEach(headline => {
    relevantWords.forEach(word => {
      if (headline.title.includes(word)) {
        keywords[word] = (keywords[word] || 0) + 1
      }
    })
  })
  
  return Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([keyword, count]) => ({ keyword, count }))
}

// 메인 API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const homeTeam = searchParams.get('homeTeam')
  const awayTeam = searchParams.get('awayTeam')
  
  if (!homeTeam || !awayTeam) {
    return NextResponse.json(
      { error: 'homeTeam and awayTeam required' },
      { status: 400 }
    )
  }
  
  try {
    console.log(`🔍 ${homeTeam} vs ${awayTeam}`)
    
    const startTime = Date.now()
    
    // 병렬 실행으로 속도 향상
    const [googleNews, naverNews] = await Promise.all([
      fetchGoogleNews(homeTeam, awayTeam),
      fetchNaverNews(homeTeam, awayTeam)
    ])
    
    const elapsed = Date.now() - startTime
    console.log(`⏱️ ${elapsed}ms`)
    console.log(`📰 Google: ${googleNews.length}, Naver: ${naverNews.length}`)
    
    const allHeadlines = [...googleNews, ...naverNews]
    
    // 중복 제거 (URL 기준)
    const uniqueHeadlines = allHeadlines.filter((article, index, self) =>
      index === self.findIndex(a => a.url === article.url)
    )
    
    // 최신순 정렬
    const sortedHeadlines = uniqueHeadlines.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    
    const keywords = extractKeywords(sortedHeadlines)
    
    console.log(`✅ ${sortedHeadlines.length}개 기사 (최근 3일)`)
    
    return NextResponse.json({
      keywords,
      headlines: sortedHeadlines.slice(0, 8), // 최대 8개
      totalArticles: sortedHeadlines.length,
      sources: {
        google: googleNews.length,
        naver: naverNews.length
      }
    })
    
  } catch (error) {
    console.error('Error:', error)
    
    return NextResponse.json({
      keywords: [],
      headlines: [],
      totalArticles: 0,
      sources: { google: 0, naver: 0 }
    })
  }
}
