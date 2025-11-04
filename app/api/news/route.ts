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

// 팀명 한글 변환 함수 (TEAM_NAME_KR 사용)
function getKoreanTeamName(englishName: string): string {
  // TEAM_NAME_KR는 별도 파일에 있다고 가정
  // 실제 사용 시 import 필요: import { TEAM_NAME_KR } from '@/app/teamLogos'
  
  // 임시 주요 팀명 매핑
  const teamNameKR: Record<string, string> = {
    // 프리미어리그
    'Arsenal': '아스날',
    'Liverpool': '리버풀',
    'Manchester City': '맨체스터시티',
    'Manchester United': '맨체스터유나이티드',
    'Chelsea': '첼시',
    'Tottenham': '토트넘',
    'Newcastle': '뉴캐슬',
    'Brighton': '브라이튼',
    
    // 라리가
    'Barcelona': '바르셀로나',
    'Real Madrid': '레알마드리드',
    'Atletico Madrid': '아틀레티코마드리드',
    
    // 분데스리가
    'Bayern Munich': '바이에른뮌헨',
    'Borussia Dortmund': '도르트문트',
    
    // 세리에A
    'Juventus': '유벤투스',
    'Inter': '인터밀란',
    'AC Milan': '밀란',
    
    // 챔피언스리그 추가 팀들
    'Slavia Praha': '슬라비아프라하',
    'Slavia Prague': '슬라비아프라하',
  }
  
  return teamNameKR[englishName] || englishName
}

// 네이버 뉴스 검색 (한글 팀명 사용)
async function fetchNaverNews(teamA: string, teamB: string): Promise<NewsSource[]> {
  try {
    // 영문 팀명을 한글로 변환
    const teamA_KR = getKoreanTeamName(teamA)
    const teamB_KR = getKoreanTeamName(teamB)
    
    // 한글 팀명으로 검색 (더 정확한 한국 뉴스 검색)
    const query = `${teamA_KR} ${teamB_KR} 축구`
    const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=10&sort=date`
    
    console.log(`🔍 네이버 뉴스 검색: ${query}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
        'User-Agent': 'Mozilla/5.0'
      },
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    const articles: NewsSource[] = []
    
    data.items?.forEach((item: any) => {
      articles.push({
        title: item.title.replace(/<[^>]*>/g, ''),  // HTML 태그 제거
        content: item.description.replace(/<[^>]*>/g, ''),
        url: item.link,
        publishedAt: item.pubDate
      })
    })
    
    console.log(`📰 네이버 뉴스: ${articles.length}개 수집`)
    return articles
  } catch (error) {
    console.error('Naver News fetch error:', error)
    return []
  }
}

// 네이버 블로그 검색 (한글 팀명 사용)
async function fetchNaverBlog(teamA: string, teamB: string): Promise<NewsSource[]> {
  try {
    // 영문 팀명을 한글로 변환
    const teamA_KR = getKoreanTeamName(teamA)
    const teamB_KR = getKoreanTeamName(teamB)
    
    // 한글 팀명 + 경기/분석 키워드로 검색
    const query = `${teamA_KR} ${teamB_KR} 경기 분석`
    const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=10&sort=date`
    
    console.log(`🔍 네이버 블로그 검색: ${query}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
        'User-Agent': 'Mozilla/5.0'
      },
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    const articles: NewsSource[] = []
    
    data.items?.forEach((item: any) => {
      articles.push({
        title: item.title.replace(/<[^>]*>/g, ''),  // HTML 태그 제거
        content: item.description.replace(/<[^>]*>/g, ''),
        url: item.link,
        publishedAt: item.postdate
      })
    })
    
    console.log(`📝 네이버 블로그: ${articles.length}개 수집`)
    return articles
  } catch (error) {
    console.error('Naver Blog fetch error:', error)
    return []
  }
}

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
    
    // 병렬로 여러 소스에서 뉴스 수집 (네이버 우선 순위)
    const results = await Promise.allSettled([
      fetchNaverNews(homeTeam, awayTeam),     // 🥇 1순위: 네이버 뉴스
      fetchNaverBlog(homeTeam, awayTeam),     // 🥈 2순위: 네이버 블로그
      fetchGoogleNews(homeTeam, awayTeam),    // 3순위
      fetchESPNNews(homeTeam, awayTeam),      // 4순위
      fetchBBCNews(homeTeam, awayTeam)        // 5순위
    ])
    
    // 성공한 결과를 네이버 우선으로 수집
    const allArticles: NewsSource[] = []
    let naverNewsCount = 0, naverBlogCount = 0, googleCount = 0, espnCount = 0, bbcCount = 0
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        // 네이버 기사를 배열 앞쪽에 추가 (우선 노출)
        if (index === 0 || index === 1) {
          allArticles.unshift(...result.value)  // 앞쪽에 추가
        } else {
          allArticles.push(...result.value)      // 뒤쪽에 추가
        }
        
        if (index === 0) naverNewsCount = result.value.length
        if (index === 1) naverBlogCount = result.value.length
        if (index === 2) googleCount = result.value.length
        if (index === 3) espnCount = result.value.length
        if (index === 4) bbcCount = result.value.length
      }
    })
    
    if (allArticles.length === 0) {
      return NextResponse.json({
        keywords: [],
        headlines: [],
        message: '관련 뉴스를 찾을 수 없습니다',
        totalArticles: 0,
        sources: { naverNews: 0, naverBlog: 0, google: 0, espn: 0, bbc: 0 }
      })
    }
    
    console.log(`📰 총 ${allArticles.length}개 기사 수집 완료 (네이버 뉴스: ${naverNewsCount}, 네이버 블로그: ${naverBlogCount}, Google: ${googleCount}, ESPN: ${espnCount}, BBC: ${bbcCount})`)
    
    // 키워드 추출
    const keywords = extractKeywords(allArticles, homeTeam, awayTeam)
    
    // 주요 헤드라인 생성
    const headlines = generateHeadlines(allArticles, keywords)
    
    return NextResponse.json({
      keywords: keywords.slice(0, 8), // 상위 8개 키워드
      headlines: headlines,
      totalArticles: allArticles.length,
      sources: {
        naverNews: naverNewsCount,
        naverBlog: naverBlogCount,
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