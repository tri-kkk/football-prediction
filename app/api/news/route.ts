import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

interface NewsSource {
  title: string
  content: string
  url: string
  publishedAt: string
}

interface KeywordCount {
  keyword: string
  count: number
  relevance: number
}

// 불용어 리스트 (한국어 + 영어)
const STOP_WORDS = new Set([
  '의', '가', '이', '은', '들', '는', '좀', '잘', '걍', '과', '도', '를', '으로', '자', '에', '와', '한', '하다',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as',
  '경기', '팀', '선수', '축구', 'football', 'match', 'game', 'soccer', 'vs', 'against'
])

// Native fetch를 사용한 Google News 수집
async function fetchGoogleNews(teamA: string, teamB: string): Promise<NewsSource[]> {
  try {
    const query = encodeURIComponent(`${teamA} vs ${teamB} football`)
    const url = `https://news.google.com/rss/search?q=${query}&hl=ko&gl=KR&ceid=KR:ko`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(5000) // 5초 타임아웃
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.text()
    const $ = cheerio.load(data, { xmlMode: true })
    const articles: NewsSource[] = []
    
    $('item').slice(0, 10).each((_, element) => {
      const title = $(element).find('title').text()
      const description = $(element).find('description').text()
      const link = $(element).find('link').text()
      const pubDate = $(element).find('pubDate').text()
      
      articles.push({
        title,
        content: description || title,
        url: link,
        publishedAt: pubDate
      })
    })
    
    return articles
  } catch (error) {
    console.error('Google News fetch error:', error)
    return []
  }
}

// ESPN RSS 피드 (fetch 사용)
async function fetchESPNNews(teamA: string, teamB: string): Promise<NewsSource[]> {
  try {
    const url = `https://www.espn.com/espn/rss/soccer/news`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.text()
    const $ = cheerio.load(data, { xmlMode: true })
    const articles: NewsSource[] = []
    
    $('item').slice(0, 10).each((_, element) => {
      const title = $(element).find('title').text()
      const description = $(element).find('description').text()
      const link = $(element).find('link').text()
      const pubDate = $(element).find('pubDate').text()
      
      // 팀명이 포함된 기사만 필터링
      if (title.toLowerCase().includes(teamA.toLowerCase()) || 
          title.toLowerCase().includes(teamB.toLowerCase())) {
        articles.push({
          title,
          content: description || title,
          url: link,
          publishedAt: pubDate
        })
      }
    })
    
    return articles
  } catch (error) {
    console.error('ESPN News fetch error:', error)
    return []
  }
}

// BBC Sport RSS (간단 버전)
async function fetchBBCNews(teamA: string, teamB: string): Promise<NewsSource[]> {
  try {
    const url = `http://feeds.bbci.co.uk/sport/football/rss.xml`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.text()
    const $ = cheerio.load(data, { xmlMode: true })
    const articles: NewsSource[] = []
    
    $('item').slice(0, 10).each((_, element) => {
      const title = $(element).find('title').text()
      const description = $(element).find('description').text()
      const link = $(element).find('link').text()
      const pubDate = $(element).find('pubDate').text()
      
      // 팀명이 포함된 기사만 필터링
      if (title.toLowerCase().includes(teamA.toLowerCase()) || 
          title.toLowerCase().includes(teamB.toLowerCase())) {
        articles.push({
          title,
          content: description || title,
          url: link,
          publishedAt: pubDate
        })
      }
    })
    
    return articles
  } catch (error) {
    console.error('BBC News fetch error:', error)
    return []
  }
}

// 텍스트에서 키워드 추출 (TF-IDF)
function extractKeywords(articles: NewsSource[], teamA: string, teamB: string): KeywordCount[] {
  const wordFrequency = new Map<string, number>()
  const documentFrequency = new Map<string, Set<number>>()
  
  // 팀명 변형 생성 (필터링용)
  const teamNames = new Set([
    teamA.toLowerCase(),
    teamB.toLowerCase(),
    ...teamA.toLowerCase().split(' '),
    ...teamB.toLowerCase().split(' ')
  ])
  
  // 각 문서에서 단어 추출
  articles.forEach((article, docIndex) => {
    const text = `${article.title} ${article.content}`.toLowerCase()
    
    // 한글, 영문 단어 추출
    const koreanWords = text.match(/[가-힣]+/g) || []
    const englishWords = text.match(/[a-z]+/g) || []
    const allWords = [...koreanWords, ...englishWords]
    
    const seenWords = new Set<string>()
    
    allWords.forEach(word => {
      // 필터링: 불용어, 팀명, 짧은 단어 제외
      if (word.length < 2 || 
          STOP_WORDS.has(word) || 
          teamNames.has(word)) {
        return
      }
      
      // 단어 빈도 카운트
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1)
      
      // 문서 빈도 카운트
      if (!seenWords.has(word)) {
        if (!documentFrequency.has(word)) {
          documentFrequency.set(word, new Set())
        }
        documentFrequency.get(word)!.add(docIndex)
        seenWords.add(word)
      }
    })
  })
  
  // TF-IDF 계산
  const totalDocs = articles.length
  const keywords: KeywordCount[] = []
  
  wordFrequency.forEach((tf, word) => {
    const df = documentFrequency.get(word)?.size || 0
    const idf = Math.log(totalDocs / (df + 1))
    const tfidf = tf * idf
    
    keywords.push({
      keyword: word,
      count: tf,
      relevance: tfidf
    })
  })
  
  // relevance 기준으로 정렬하고 상위 15개 반환
  return keywords
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 15)
}

// 주요 헤드라인 생성
function generateHeadlines(articles: NewsSource[], keywords: KeywordCount[]): string[] {
  const headlines: string[] = []
  const topKeywords = keywords.slice(0, 3).map(k => k.keyword)
  
  // 키워드가 포함된 중요 뉴스 찾기
  articles.forEach(article => {
    const title = article.title.toLowerCase()
    const matchedKeywords = topKeywords.filter(kw => title.includes(kw.toLowerCase()))
    
    if (matchedKeywords.length > 0) {
      headlines.push(article.title)
    }
  })
  
  // 최대 5개의 헤드라인 반환
  return headlines.slice(0, 5)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const homeTeam = searchParams.get('homeTeam')
    const awayTeam = searchParams.get('awayTeam')
    
    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: '팀 정보가 필요합니다' },
        { status: 400 }
      )
    }
    
    console.log(`🔍 뉴스 수집 시작: ${homeTeam} vs ${awayTeam}`)
    
    // 병렬로 여러 소스에서 뉴스 수집 (Promise.allSettled 사용)
    const results = await Promise.allSettled([
      fetchGoogleNews(homeTeam, awayTeam),
      fetchESPNNews(homeTeam, awayTeam),
      fetchBBCNews(homeTeam, awayTeam)
    ])
    
    // 성공한 결과만 수집
    const allArticles: NewsSource[] = []
    let googleCount = 0, espnCount = 0, bbcCount = 0
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value)
        if (index === 0) googleCount = result.value.length
        if (index === 1) espnCount = result.value.length
        if (index === 2) bbcCount = result.value.length
      }
    })
    
    if (allArticles.length === 0) {
      return NextResponse.json({
        keywords: [],
        headlines: [],
        message: '관련 뉴스를 찾을 수 없습니다',
        totalArticles: 0,
        sources: { google: 0, espn: 0, bbc: 0 }
      })
    }
    
    console.log(`📰 총 ${allArticles.length}개 기사 수집 완료`)
    
    // 키워드 추출
    const keywords = extractKeywords(allArticles, homeTeam, awayTeam)
    
    // 주요 헤드라인 생성
    const headlines = generateHeadlines(allArticles, keywords)
    
    return NextResponse.json({
      keywords: keywords.slice(0, 8), // 상위 8개 키워드
      headlines: headlines,
      totalArticles: allArticles.length,
      sources: {
        google: googleCount,
        espn: espnCount,
        bbc: bbcCount
      }
    })
    
  } catch (error) {
    console.error('뉴스 키워드 수집 에러:', error)
    return NextResponse.json(
      { 
        error: '뉴스 데이터를 가져오는데 실패했습니다',
        keywords: [],
        headlines: [],
        totalArticles: 0
      },
      { status: 500 }
    )
  }
}

// 캐싱을 위한 설정
export const revalidate = 3600 // 1시간마다 갱신
