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
    
    // 한글 팀명 + "경기" 또는 "대결" 키워드 추가 (더 관련성 높은 최신 기사)
    const query = `${teamA_KR} ${teamB_KR} 경기`
    const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=20&sort=date`
    
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
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    
    data.items?.forEach((item: any) => {
      // 날짜 필터링: 3일 이내 기사만
      try {
        const articleDate = new Date(item.pubDate)
        
        if (articleDate >= threeDaysAgo && articles.length < 10) {
          articles.push({
            title: item.title.replace(/<[^>]*>/g, ''),  // HTML 태그 제거
            content: item.description.replace(/<[^>]*>/g, ''),
            url: item.link,
            publishedAt: item.pubDate
          })
        }
      } catch (error) {
        // 날짜 파싱 실패 시에도 포함
        if (articles.length < 10) {
          articles.push({
            title: item.title.replace(/<[^>]*>/g, ''),
            content: item.description.replace(/<[^>]*>/g, ''),
            url: item.link,
            publishedAt: item.pubDate
          })
        }
      }
    })
    
    console.log(`📰 네이버 뉴스: ${articles.length}개 수집 (3일 이내)`)
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
    
    // 한글 팀명 + "프리뷰" 또는 "분석" 키워드
    const query = `${teamA_KR} ${teamB_KR} 프리뷰`
    const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=20&sort=date`
    
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
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    
    data.items?.forEach((item: any) => {
      // 날짜 필터링: 3일 이내만
      try {
        // 네이버 블로그 날짜 형식: YYYYMMDD
        const dateStr = item.postdate
        const year = parseInt(dateStr.substring(0, 4))
        const month = parseInt(dateStr.substring(4, 6)) - 1
        const day = parseInt(dateStr.substring(6, 8))
        const articleDate = new Date(year, month, day)
        
        if (articleDate >= threeDaysAgo && articles.length < 10) {
          articles.push({
            title: item.title.replace(/<[^>]*>/g, ''),
            content: item.description.replace(/<[^>]*>/g, ''),
            url: item.link,
            publishedAt: articleDate.toISOString()
          })
        }
      } catch (error) {
        // 날짜 파싱 실패 시에도 포함
        if (articles.length < 10) {
          articles.push({
            title: item.title.replace(/<[^>]*>/g, ''),
            content: item.description.replace(/<[^>]*>/g, ''),
            url: item.link,
            publishedAt: item.postdate
          })
        }
      }
    })
    
    console.log(`📝 네이버 블로그: ${articles.length}개 수집 (3일 이내)`)
    return articles
  } catch (error) {
    console.error('Naver Blog fetch error:', error)
    return []
  }
}

// Native fetch를 사용한 Google News 수집
async function fetchGoogleNews(teamA: string, teamB: string): Promise<NewsSource[]> {
  try {
    // when:7d를 쿼리에 직접 포함 (최근 7일 이내)
    const query = `${teamA} vs ${teamB} football when:7d`
    const encodedQuery = encodeURIComponent(query)
    const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en&gl=US&ceid=US:en`
    
    console.log(`🔍 Google News 검색: ${query}`)
    
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
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    
    $('item').each((_, element) => {
      const title = $(element).find('title').text()
      const description = $(element).find('description').text()
      const link = $(element).find('link').text()
      const pubDate = $(element).find('pubDate').text()
      
      // 날짜 필터링: 3일 이내의 기사만
      try {
        const articleDate = new Date(pubDate)
        
        if (articleDate >= threeDaysAgo && articles.length < 15) {
          articles.push({
            title,
            content: description || title,
            url: link,
            publishedAt: pubDate
          })
        }
      } catch (error) {
        // 날짜 파싱 실패 시에도 포함 (최신 기사일 가능성)
        if (articles.length < 15) {
          articles.push({
            title,
            content: description || title,
            url: link,
            publishedAt: pubDate || new Date().toISOString()
          })
        }
      }
    })
    
    // 최신순으로 정렬
    articles.sort((a, b) => {
      try {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      } catch {
        return 0
      }
    })
    
    console.log(`📰 Google News: ${articles.length}개 수집 (3일 이내)`)
    
    return articles.slice(0, 10)
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
function generateHeadlines(articles: NewsSource[], keywords: KeywordCount[]): NewsSource[] {
  const headlines: NewsSource[] = []
  const topKeywords = keywords.slice(0, 3).map(k => k.keyword)
  
  // 키워드가 포함된 중요 뉴스 찾기
  articles.forEach(article => {
    const title = article.title.toLowerCase()
    const matchedKeywords = topKeywords.filter(kw => title.includes(kw.toLowerCase()))
    
    if (matchedKeywords.length > 0 && headlines.length < 5) {
      headlines.push(article)
    }
  })
  
  // 키워드 매칭이 5개 미만이면 최신 기사로 채우기
  if (headlines.length < 5) {
    articles.forEach(article => {
      if (headlines.length < 5 && !headlines.includes(article)) {
        headlines.push(article)
      }
    })
  }
  
  // 최대 5개의 헤드라인 반환
  return headlines.slice(0, 5)
}

// URL에서 출처 추출
function determineSource(url: string): string {
  if (url.includes('news.google.com')) return 'Google News'
  if (url.includes('naver.com')) return 'Naver'
  if (url.includes('espn.com')) return 'ESPN'
  if (url.includes('bbc.co.uk') || url.includes('bbc.com')) return 'BBC Sport'
  
  // 도메인 추출
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)
  } catch {
    return 'Unknown'
  }
}

// 날짜 포맷팅
function formatPublishDate(dateString: string): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 60) {
      return `${diffMins}분 전`
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`
    } else if (diffDays < 7) {
      return `${diffDays}일 전`
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    }
  } catch {
    return dateString
  }
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
    
    // 🔥 날짜 필터링: 최근 14일 이내 기사만 (오래된 기사 제외)
    const now = new Date()
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    
    const recentArticles = allArticles.filter(article => {
      try {
        const articleDate = new Date(article.publishedAt)
        return articleDate >= fourteenDaysAgo && articleDate <= now
      } catch {
        // 날짜 파싱 실패 시 포함 (최신 기사일 가능성)
        return true
      }
    })
    
    console.log(`📅 최근 기사 필터링: ${allArticles.length}개 → ${recentArticles.length}개`)
    
    // 🔥 최신순 정렬
    recentArticles.sort((a, b) => {
      try {
        const dateA = new Date(a.publishedAt).getTime()
        const dateB = new Date(b.publishedAt).getTime()
        return dateB - dateA  // 최신순 (내림차순)
      } catch {
        return 0
      }
    })
    
    // 키워드 추출 (최신 기사 기준)
    const keywords = extractKeywords(recentArticles, homeTeam, awayTeam)
    
    // 주요 헤드라인 생성 (최신 기사 기준)
    const headlinesRaw = generateHeadlines(recentArticles, keywords)
    
    // NewsKeywords 컴포넌트가 기대하는 형식으로 변환
    const headlines = headlinesRaw.map(article => ({
      title: article.title,
      url: article.url,
      source: determineSource(article.url), // URL에서 출처 추출
      date: formatPublishDate(article.publishedAt)
    }))
    
    return NextResponse.json({
      keywords: keywords.slice(0, 8), // 상위 8개 키워드
      headlines: headlines,
      totalArticles: recentArticles.length,  // 최신 기사 개수
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