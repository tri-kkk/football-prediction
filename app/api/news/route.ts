import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

interface NewsArticle {
  id: string
  title: string
  summary: string
  content: string
  imageUrl: string
  category: string
  league: string
  author: string
  publishedAt: string
  tags: string[]
  views: number
  likes: number
}

const defaultImages = [
  // 축구공
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=800&h=800&fit=crop',
  // 경기장
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&h=800&fit=crop',
  // 골대
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=800&fit=crop',
  // 선수들
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&h=800&fit=crop',
  // 트로피
  'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1565699894576-e90d70e2e8ab?w=800&h=800&fit=crop',
  // 팬들
  'https://images.unsplash.com/photo-1577223625816-7546f14d3957?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1574068468668-a05a11f871da?w=800&h=800&fit=crop',
  // 경기 중
  'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&h=800&fit=crop',
  // 축구화
  'https://images.unsplash.com/photo-1511886929837-354d827aae26?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1552667466-07770ae110d0?w=800&h=800&fit=crop',
  // 훈련
  'https://images.unsplash.com/photo-1592656094267-764a45160876?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&h=800&fit=crop',
  // 코너킥
  'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800&h=800&fit=crop',
  'https://images.unsplash.com/photo-1526259704358-7ac29e5d6a3a?w=800&h=800&fit=crop',
]

async function fetchRSSFeed(url: string, source: string): Promise<NewsArticle[]> {
  try {
    console.log(`📰 Fetching ${source}...`)
    
    const response = await fetch(url, {
      next: { revalidate: 300 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      console.log(`⚠️ ${source} failed:`, response.status)
      return []
    }
    
    const xmlText = await response.text()
    const $ = cheerio.load(xmlText, { xmlMode: true })
    
    const articles: NewsArticle[] = []
    
    $('item').each((index, element) => {
      if (index >= 20) return false // 최대 20개
      
      const title = $(element).find('title').text()
      const link = $(element).find('link').text()
      const description = $(element).find('description').text()
      const pubDate = $(element).find('pubDate').text()
      
      // 이미지 추출 (여러 방법 시도)
      let imageUrl = ''
      
      // 1. media:content 태그
      const mediaContent = $(element).find('media\\:content, content')
      if (mediaContent.length) {
        imageUrl = mediaContent.attr('url') || mediaContent.attr('src') || ''
      }
      
      // 2. media:thumbnail 태그
      if (!imageUrl) {
        const mediaThumbnail = $(element).find('media\\:thumbnail, thumbnail')
        if (mediaThumbnail.length) {
          imageUrl = mediaThumbnail.attr('url') || mediaThumbnail.attr('src') || ''
        }
      }
      
      // 3. enclosure 태그
      if (!imageUrl) {
        const enclosure = $(element).find('enclosure')
        if (enclosure.length && enclosure.attr('type')?.includes('image')) {
          imageUrl = enclosure.attr('url') || ''
        }
      }
      
      // 4. description 내부 img 태그 찾기
      if (!imageUrl && description) {
        const imgMatch = description.match(/<img[^>]+src="([^">]+)"/i)
        if (imgMatch && imgMatch[1]) {
          imageUrl = imgMatch[1]
        }
      }
      
      // 5. content:encoded에서 이미지 추출
      if (!imageUrl) {
        const contentEncoded = $(element).find('content\\:encoded, encoded').text()
        if (contentEncoded) {
          const imgMatch = contentEncoded.match(/<img[^>]+src="([^">]+)"/i)
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1]
          }
        }
      }
      
      // 6. 그래도 없으면 다양한 기본 이미지 사용
      if (!imageUrl) {
        // 기사마다 다른 이미지 (title 기반)
        const titleHash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        imageUrl = defaultImages[titleHash % defaultImages.length]
      }
      
      const titleLower = title.toLowerCase()
      
      // 리그 감지
      let league = '해외축구'
      let tags: string[] = []
      
      if (titleLower.includes('premier league') || titleLower.includes('epl') ||
          titleLower.includes('manchester') || titleLower.includes('liverpool') ||
          titleLower.includes('chelsea') || titleLower.includes('arsenal') ||
          titleLower.includes('tottenham')) {
        league = '프리미어리그'
        tags.push('프리미어리그')
      } else if (titleLower.includes('la liga') || titleLower.includes('barcelona') ||
                 titleLower.includes('real madrid')) {
        league = '라리가'
        tags.push('라리가')
      } else if (titleLower.includes('bundesliga') || titleLower.includes('bayern')) {
        league = '분데스리가'
        tags.push('분데스리가')
      } else if (titleLower.includes('serie a') || titleLower.includes('juventus')) {
        league = '세리에A'
        tags.push('세리에A')
      } else if (titleLower.includes('champions league') || titleLower.includes('ucl')) {
        league = '챔피언스리그'
        tags.push('챔피언스리그')
      }
      
      // 한국 선수
      if (titleLower.includes('son') || titleLower.includes('heung-min')) {
        tags.push('손흥민')
        if (league === '해외축구') league = '프리미어리그'
      } else if (titleLower.includes('lee kang') || titleLower.includes('kang-in')) {
        tags.push('이강인')
        if (league === '해외축구') league = '리그1'
      } else if (titleLower.includes('kim min') || titleLower.includes('min-jae')) {
        tags.push('김민재')
        if (league === '해외축구') league = '분데스리가'
      }
      
      let category = '뉴스'
      if (titleLower.includes('transfer') || titleLower.includes('sign')) {
        category = '이적'
      } else if (titleLower.includes('goal') || titleLower.includes('win') ||
                 titleLower.includes('lose') || titleLower.includes('draw')) {
        category = '경기'
      } else if (titleLower.includes('interview')) {
        category = '인터뷰'
      } else if (titleLower.includes('analysis') || titleLower.includes('tactical')) {
        category = '분석'
      }
      
      articles.push({
        id: `${source}-${index}-${Date.now()}`,
        title: title,
        summary: description.replace(/<[^>]*>/g, '').substring(0, 200),
        content: description.replace(/<[^>]*>/g, ''),
        imageUrl,
        category,
        league,
        author: source,
        publishedAt: new Date(pubDate || Date.now()).toISOString(),
        tags: tags.length > 0 ? tags : ['축구'],
        views: Math.floor(Math.random() * 15000) + 5000,
        likes: Math.floor(Math.random() * 1500) + 500,
      })
    })
    
    console.log(`✅ ${source}: ${articles.length} articles`)
    return articles
  } catch (error) {
    console.error(`❌ ${source} error:`, error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚽ Fetching RSS Feeds...')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // 신뢰할 수 있는 RSS 피드 소스
    const [goalArticles, bbcArticles, skySportsArticles, espnArticles] = await Promise.all([
      fetchRSSFeed('https://www.goal.com/feeds/news?fmt=rss&amp;ICID=HP', 'Goal.com'),
      fetchRSSFeed('https://feeds.bbci.co.uk/sport/football/rss.xml', 'BBC Sport'),
      fetchRSSFeed('https://www.skysports.com/rss/12040', 'Sky Sports'),
      fetchRSSFeed('https://www.espn.com/espn/rss/soccer/news', 'ESPN')
    ])
    
    console.log('\n📊 Summary:')
    console.log(`✅ Goal.com: ${goalArticles.length}`)
    console.log(`✅ BBC Sport: ${bbcArticles.length}`)
    console.log(`✅ Sky Sports: ${skySportsArticles.length}`)
    console.log(`✅ ESPN: ${espnArticles.length}`)
    
    let allArticles = [...goalArticles, ...bbcArticles, ...skySportsArticles, ...espnArticles]
    
    console.log(`\n📦 Total: ${allArticles.length} articles`)
    
    if (allArticles.length === 0) {
      return NextResponse.json({
        articles: [],
        hasMore: false,
        total: 0,
        page,
        limit,
        sources: {
          goal: 0,
          bbc: 0,
          sky: 0,
          espn: 0
        }
      })
    }
    
    // 중복 제거
    const seenTitles = new Set<string>()
    allArticles = allArticles.filter(article => {
      const titleKey = article.title.toLowerCase().substring(0, 50)
      if (seenTitles.has(titleKey)) return false
      seenTitles.add(titleKey)
      return true
    })
    
    console.log(`🔍 After dedup: ${allArticles.length} unique`)
    
    // 날짜순 정렬
    allArticles.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedNews = allArticles.slice(startIndex, endIndex)
    const hasMore = endIndex < allArticles.length
    
    console.log(`📄 Page ${page}: ${paginatedNews.length} articles`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    return NextResponse.json({
      articles: paginatedNews,
      hasMore,
      total: allArticles.length,
      page,
      limit,
      sources: {
        goal: goalArticles.length,
        bbc: bbcArticles.length,
        sky: skySportsArticles.length,
        espn: espnArticles.length
      }
    })
  } catch (error) {
    console.error('❌ API Error:', error)
    
    return NextResponse.json({
      articles: [],
      hasMore: false,
      total: 0,
      page: 1,
      limit: 10,
      error: 'Failed to fetch',
      sources: {
        goal: 0,
        bbc: 0,
        sky: 0,
        espn: 0
      }
    })
  }
}