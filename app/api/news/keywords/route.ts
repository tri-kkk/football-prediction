// app/api/news/keywords/route.ts
import { NextRequest, NextResponse } from 'next/server'

// 팀명 정규화
function normalizeTeamName(teamName: string): string {
  return teamName
    .replace(/FC|CF|AFC|United|City/gi, '')
    .trim()
}

// 날짜가 최근 7일 이내인지 확인
function isRecentArticle(dateString: string): boolean {
  if (!dateString) return true
  
  try {
    const articleDate = new Date(dateString)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    return articleDate >= weekAgo
  } catch {
    return true
  }
}

// 한국어 포함 여부 확인
function hasKorean(text: string): boolean {
  return /[가-힣]/.test(text)
}

// 여러 검색 쿼리 생성
function generateSearchQueries(homeTeam: string, awayTeam: string) {
  const home = normalizeTeamName(homeTeam)
  const away = normalizeTeamName(awayTeam)
  
  return [
    `${home} ${away}`,
    `${home} vs ${away}`,
    home,
    away
  ]
}

// HTML 엔티티 디코딩
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

// Google News RSS 검색
async function fetchGoogleNews(homeTeam: string, awayTeam: string) {
  const queries = generateSearchQueries(homeTeam, awayTeam)
  
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const dateFilter = weekAgo.toISOString().split('T')[0]
  
  for (const query of queries) {
    try {
      console.log(`  🔍 Google: "${query}"`)
      
      const encodedQuery = encodeURIComponent(query)
      const url = `https://news.google.com/rss/search?q=${encodedQuery}+after:${dateFilter}&hl=en&gl=US&ceid=US:en`
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      if (!response.ok) continue
      
      const xml = await response.text()
      const items = xml.match(/<item>(.*?)<\/item>/gs) || []
      
      if (items.length === 0) {
        console.log(`  ❌ 0건`)
        continue
      }
      
      const articles = items.slice(0, 10).map(item => {
        let title = ''
        
        const cdataMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s)
        if (cdataMatch) {
          title = cdataMatch[1]
        }
        
        if (!title) {
          const titleMatch = item.match(/<title>(.*?)<\/title>/s)
          if (titleMatch) {
            title = titleMatch[1]
          }
        }
        
        title = decodeHTMLEntities(title)
        title = title.replace(/ - [^-]+$/, '').trim()
        
        const linkMatch = item.match(/<link>(.*?)<\/link>/)
        const link = linkMatch ? linkMatch[1].trim() : ''
        
        const sourceMatch = item.match(/<source.*?>(.*?)<\/source>/)
        const source = sourceMatch ? sourceMatch[1].trim() : 'Google News'
        
        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/)
        const pubDate = dateMatch ? dateMatch[1] : ''
        
        return {
          title,
          url: link,
          source,
          date: pubDate,
          dateObj: pubDate ? new Date(pubDate) : null,
          isKorean: hasKorean(title)  // 한국어 여부 추가
        }
      })
      .filter(article => {
        if (!article.title || article.title.length < 10) {
          return false
        }
        
        if (article.dateObj) {
          return isRecentArticle(article.dateObj.toISOString())
        }
        return true
      })
      .map(article => ({
        title: article.title,
        url: article.url,
        source: article.source,
        date: article.dateObj ? article.dateObj.toLocaleDateString('en-US') : '',
        isKorean: article.isKorean
      }))
      
      if (articles.length > 0) {
        console.log(`  ✅ ${articles.length}건 (한국어: ${articles.filter(a => a.isKorean).length}건)`)
        return articles
      }
      
    } catch (error) {
      console.error(`  ❌ 오류:`, error)
      continue
    }
  }
  
  return []
}

// Naver 검색 API
async function fetchNaverNews(homeTeam: string, awayTeam: string) {
  try {
    const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
    const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET
    
    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      console.log('  ⚠️ Naver API 키 없음')
      return []
    }
    
    const queries = generateSearchQueries(homeTeam, awayTeam)
    
    for (const query of queries) {
      try {
        console.log(`  🔍 Naver: "${query}"`)
        
        const encodedQuery = encodeURIComponent(query)
        const url = `https://openapi.naver.com/v1/search/news.json?query=${encodedQuery}&display=10&sort=date`
        
        const response = await fetch(url, {
          headers: {
            'X-Naver-Client-Id': NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
          }
        })
        
        if (!response.ok) continue
        
        const data = await response.json()
        
        if (!data.items || data.items.length === 0) {
          console.log(`  ❌ 0건`)
          continue
        }
        
        const articles = data.items
          .map((item: any) => ({
            title: decodeHTMLEntities(item.title.replace(/<\/?b>/g, '')),
            url: item.originallink || item.link,
            source: 'Naver News',
            date: item.pubDate,
            dateObj: new Date(item.pubDate),
            isKorean: true  // Naver는 항상 한국어
          }))
          .filter(article => {
            if (!article.title || article.title.length < 10) return false
            return isRecentArticle(article.dateObj.toISOString())
          })
          .map(article => ({
            title: article.title,
            url: article.url,
            source: article.source,
            date: article.dateObj.toLocaleDateString('ko-KR'),
            isKorean: article.isKorean
          }))
        
        if (articles.length > 0) {
          console.log(`  ✅ ${articles.length}건 (모두 한국어)`)
          return articles
        }
        
      } catch (error) {
        console.error(`  ❌ 오류:`, error)
        continue
      }
    }
    
  } catch (error) {
    console.error('Naver News error:', error)
  }
  
  return []
}

// ESPN RSS
async function fetchESPNNews(homeTeam: string, awayTeam: string) {
  try {
    const home = normalizeTeamName(homeTeam)
    const away = normalizeTeamName(awayTeam)
    
    console.log(`  🔍 ESPN: "${home}"`)
    
    const url = 'https://www.espn.com/espn/rss/soccer/news'
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      console.log('  ❌ 접근 불가')
      return []
    }
    
    const xml = await response.text()
    const items = xml.match(/<item>(.*?)<\/item>/gs) || []
    
    const articles = items
      .map(item => {
        const titleMatch = item.match(/<title>(.*?)<\/title>/)
        let title = titleMatch ? titleMatch[1] : ''
        
        title = title.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1')
        title = decodeHTMLEntities(title)
        
        const linkMatch = item.match(/<link>(.*?)<\/link>/)
        const link = linkMatch ? linkMatch[1] : ''
        
        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/)
        const date = dateMatch ? dateMatch[1] : ''
        
        return { 
          title, 
          url: link, 
          source: 'ESPN', 
          date, 
          dateObj: date ? new Date(date) : null,
          isKorean: hasKorean(title)
        }
      })
      .filter(article => {
        if (!article.title || article.title.length < 10) return false
        
        const titleLower = article.title.toLowerCase()
        const hasTeam = titleLower.includes(home.toLowerCase()) || titleLower.includes(away.toLowerCase())
        const isRecent = article.dateObj ? isRecentArticle(article.dateObj.toISOString()) : true
        return hasTeam && isRecent
      })
      .slice(0, 5)
      .map(article => ({
        title: article.title,
        url: article.url,
        source: article.source,
        date: article.dateObj ? article.dateObj.toLocaleDateString('en-US') : '',
        isKorean: article.isKorean
      }))
    
    if (articles.length > 0) {
      console.log(`  ✅ ${articles.length}건`)
    } else {
      console.log(`  ❌ 0건`)
    }
    
    return articles
    
  } catch (error) {
    console.error('ESPN error:', error)
    return []
  }
}

// BBC Sport RSS
async function fetchBBCNews(homeTeam: string, awayTeam: string) {
  try {
    const home = normalizeTeamName(homeTeam)
    
    console.log(`  🔍 BBC: "${home}"`)
    
    const url = 'https://feeds.bbci.co.uk/sport/football/rss.xml'
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      console.log('  ❌ 접근 불가')
      return []
    }
    
    const xml = await response.text()
    const items = xml.match(/<item>(.*?)<\/item>/gs) || []
    
    const articles = items
      .map(item => {
        const titleMatch = item.match(/<title>(.*?)<\/title>/)
        const title = titleMatch ? decodeHTMLEntities(titleMatch[1]) : ''
        
        const linkMatch = item.match(/<link>(.*?)<\/link>/)
        const link = linkMatch ? linkMatch[1] : ''
        
        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/)
        const date = dateMatch ? dateMatch[1] : ''
        
        return { 
          title, 
          url: link, 
          source: 'BBC Sport', 
          date, 
          dateObj: date ? new Date(date) : null,
          isKorean: hasKorean(title)
        }
      })
      .filter(article => {
        if (!article.title || article.title.length < 10) return false
        
        const titleLower = article.title.toLowerCase()
        const hasTeam = titleLower.includes(home.toLowerCase())
        const isRecent = article.dateObj ? isRecentArticle(article.dateObj.toISOString()) : true
        return hasTeam && isRecent
      })
      .slice(0, 5)
      .map(article => ({
        title: article.title,
        url: article.url,
        source: article.source,
        date: article.dateObj ? article.dateObj.toLocaleDateString('en-US') : '',
        isKorean: article.isKorean
      }))
    
    if (articles.length > 0) {
      console.log(`  ✅ ${articles.length}건`)
    } else {
      console.log(`  ❌ 0건`)
    }
    
    return articles
    
  } catch (error) {
    console.error('BBC error:', error)
    return []
  }
}

// 키워드 추출
function extractKeywords(headlines: any[]) {
  const keywords: { [key: string]: number } = {}
  
  const relevantWords = [
    'injury', 'injured', 'return', 'comeback', 'lineup', 'squad',
    'win', 'loss', 'draw', 'victory', 'defeat',
    'preview', 'prediction', 'analysis', 'vs', 'against',
    'goal', 'score', 'assist', 'shot',
    'manager', 'coach', 'tactics', 'formation',
    '부상', '복귀', '출전', '결장',
    '승리', '패배', '무승부',
    '전술', '감독', '라인업'
  ]
  
  headlines.forEach(headline => {
    const title = headline.title.toLowerCase()
    
    relevantWords.forEach(word => {
      if (title.includes(word.toLowerCase())) {
        keywords[word] = (keywords[word] || 0) + 1
      }
    })
  })
  
  return Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([keyword, count]) => ({
      keyword,
      count,
      relevance: count / headlines.length
    }))
}

// 메인 API 핸들러
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const homeTeam = searchParams.get('homeTeam')
  const awayTeam = searchParams.get('awayTeam')
  
  if (!homeTeam || !awayTeam) {
    return NextResponse.json(
      { error: 'homeTeam and awayTeam are required' },
      { status: 400 }
    )
  }
  
  try {
    const startTime = Date.now()
    console.log(`🔍 ${homeTeam} vs ${awayTeam}`)
    
    // 모든 소스에서 병렬 검색
    const [googleNews, naverNews, espnNews, bbcNews] = await Promise.all([
      fetchGoogleNews(homeTeam, awayTeam),
      fetchNaverNews(homeTeam, awayTeam),
      fetchESPNNews(homeTeam, awayTeam),
      fetchBBCNews(homeTeam, awayTeam)
    ])
    
    const allHeadlines = [...googleNews, ...naverNews, ...espnNews, ...bbcNews]
    
    // 중복 제거
    const uniqueHeadlines = allHeadlines.filter((article, index, self) =>
      index === self.findIndex(a => a.url === article.url)
    )
    
    // 정렬: 1. 한국어 우선, 2. 날짜 최신순
    const sortedHeadlines = uniqueHeadlines.sort((a, b) => {
      // 한국어 우선 정렬
      if (a.isKorean && !b.isKorean) return -1
      if (!a.isKorean && b.isKorean) return 1
      
      // 같은 언어끼리는 날짜순
      if (!a.date || !b.date) return 0
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    
    const keywords = extractKeywords(sortedHeadlines)
    
    const elapsed = Date.now() - startTime
    const koreanCount = sortedHeadlines.filter(h => h.isKorean).length
    
    console.log(`⏱️ ${elapsed}ms`)
    console.log(`📰 총 ${sortedHeadlines.length}개 기사 (한국어: ${koreanCount}개, 영어: ${sortedHeadlines.length - koreanCount}개)`)
    
    // isKorean 필드 제거 (프론트엔드에 전달할 필요 없음)
    const cleanedHeadlines = sortedHeadlines.map(({ isKorean, ...rest }) => rest)
    
    return NextResponse.json({
      keywords,
      headlines: cleanedHeadlines.slice(0, 15),
      totalArticles: sortedHeadlines.length,
      sources: {
        google: googleNews.length,
        naver: naverNews.length,
        espn: espnNews.length,
        bbc: bbcNews.length
      }
    })
    
  } catch (error) {
    console.error('뉴스 수집 오류:', error)
    
    return NextResponse.json({
      keywords: [],
      headlines: [],
      totalArticles: 0,
      sources: {
        google: 0,
        naver: 0,
        espn: 0,
        bbc: 0
      }
    })
  }
}
