// app/api/baseball/cron/collect-news/route.ts
// Supabase cron으로 12시간마다 호출 → TheNewsAPI에서 뉴스 수집 → DB 저장
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const NEWS_API_TOKEN = process.env.NEWS_API_TOKEN || 'Fh23c0qhklAz5xdPY35QlRJ41SaJEBDywe6uWfH7'
const NEWS_API_BASE = 'https://api.thenewsapi.com/v1/news/all'

const BLOCKED_KEYWORDS = [
  'betting', 'bet', 'odds', 'wager', 'gambling', 'sportsbook', 'parlay',
  'prop bet', 'spread', 'moneyline', 'underdog', 'picks', 'casino',
  '배팅', '도박', '토토', '스포츠북', '배당', '픽스터',
]

interface NewsArticle {
  uuid: string
  title: string
  description: string
  snippet: string
  image_url: string
  url: string
  source: string
  published_at: string
}

// 리그별 검색 설정
const LEAGUE_SEARCHES = [
  { league: 'MLB', searches: { en: 'MLB baseball', ko: 'MLB 메이저리그' } },
  { league: 'KBO', searches: { en: 'KBO Korean baseball', ko: 'KBO 프로야구' } },
  { league: 'NPB', searches: { en: 'NPB Japan baseball', ko: '일본 프로야구 NPB' } },
  { league: 'CPBL', searches: { en: 'CPBL Taiwan baseball', ko: 'CPBL 대만야구' } },
]

async function fetchNewsFromAPI(search: string, language: 'en' | 'ko', limit: number = 8): Promise<NewsArticle[]> {
  try {
    const params = new URLSearchParams({
      api_token: NEWS_API_TOKEN,
      categories: 'sports',
      search,
      language,
      limit: limit.toString(),
      sort: 'published_at',
      sort_order: 'desc',
    })

    const response = await fetch(`${NEWS_API_BASE}?${params}`, {
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.data || []
  } catch (e) {
    console.error(`[collect-news] fetch error for "${search}":`, e)
    return []
  }
}

function isBlocked(title: string): boolean {
  const lower = title.toLowerCase()
  return BLOCKED_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()))
}

function extractSource(source: string): string {
  try {
    return source
      .replace('www.', '')
      .replace('.com', '')
      .replace('.co.kr', '')
      .replace('.net', '')
      .replace('sports.', '')
  } catch {
    return source
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  let totalInserted = 0
  let totalSkipped = 0
  const errors: string[] = []

  try {
    for (const { league, searches } of LEAGUE_SEARCHES) {
      // 한국어 + 영어 둘 다 수집
      for (const [lang, search] of Object.entries(searches) as ['en' | 'ko', string][]) {
        const articles = await fetchNewsFromAPI(search, lang, 8)

        const rows = articles
          .filter(a => !isBlocked(a.title))
          .map(a => ({
            article_id: a.uuid,
            league,
            language: lang,
            title: a.title || '',
            description: a.description || a.snippet || '',
            image_url: a.image_url || '',
            url: a.url || '',
            source: extractSource(a.source || a.url || ''),
            published_at: a.published_at || new Date().toISOString(),
          }))

        if (rows.length === 0) continue

        // upsert (article_id 기준 중복 무시)
        const { data, error } = await supabase
          .from('baseball_news')
          .upsert(rows, { onConflict: 'article_id', ignoreDuplicates: true })

        if (error) {
          errors.push(`${league}/${lang}: ${error.message}`)
        } else {
          totalInserted += rows.length
        }
      }
    }

    // 7일 이상 된 뉴스 삭제
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { error: deleteError } = await supabase
      .from('baseball_news')
      .delete()
      .lt('published_at', cutoff)

    if (deleteError) {
      errors.push(`cleanup: ${deleteError.message}`)
    }

    return NextResponse.json({
      success: true,
      inserted: totalInserted,
      skipped: totalSkipped,
      errors: errors.length > 0 ? errors : undefined,
      duration: `${Date.now() - startTime}ms`,
    })
  } catch (err: any) {
    console.error('[collect-news] fatal error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
