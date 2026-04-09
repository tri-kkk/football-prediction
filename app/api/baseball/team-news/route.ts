// app/api/baseball/team-news/route.ts
// 경기 상세 페이지 - 팀별 뉴스 요약 (TheNewsAPI + baseball_ai_cache TTL 캐시)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const NEWS_API_TOKEN = process.env.NEWS_API_TOKEN || ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const TEAM_NEWS_TTL_HOURS = 6

async function fetchTeamNews(teamName: string, language: 'en' | 'ko' | 'ja' = 'en'): Promise<{ title: string; description: string; publishedAt: string }[]> {
  if (!NEWS_API_TOKEN) return []
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const params = new URLSearchParams({
      api_token: NEWS_API_TOKEN,
      categories: 'sports',
      search: teamName,
      language,
      limit: '5',
      sort: 'published_at',
      sort_order: 'desc',
      published_after: sevenDaysAgo.toISOString().split('T')[0],
      published_before: tomorrow.toISOString().split('T')[0],
    })
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(`https://api.thenewsapi.com/v1/news/all?${params}`, {
      signal: controller.signal,
      cache: 'no-store', // ISR 캐시 완전 제거 - 항상 최신 데이터
    }).finally(() => clearTimeout(tid))
    if (!res.ok) return []
    const data = await res.json()
    if (!data.data || !Array.isArray(data.data)) return []

    // 2026년 기사만 필터링 (옛날 기사 방지)
    const currentYear = new Date().getFullYear()
    return data.data
      .filter((a: any) => {
        if (!a.title?.length) return false
        // published_at 날짜 확인 - 올해 기사만
        if (a.published_at) {
          const pubYear = new Date(a.published_at).getFullYear()
          if (pubYear < currentYear) return false
        }
        return true
      })
      .map((a: any) => ({
        title: a.title || '',
        description: a.description || a.snippet || '',
        publishedAt: a.published_at || '',
      }))
  } catch {
    return []
  }
}

async function summarizeNews(
  teamName: string,
  teamNameKo: string,
  articles: { title: string; description: string; publishedAt: string }[],
  league: string,
  uiLanguage: string = 'ko'
): Promise<string | null> {
  if (!ANTHROPIC_API_KEY || articles.length === 0) return null

  const articleText = articles
    .map((a, i) => `${i + 1}. [${a.publishedAt?.split('T')[0] || '날짜불명'}] ${a.title}${a.description ? '\n   ' + a.description : ''}`)
    .join('\n')

  const leagueLabel = league === 'KBO' ? 'KBO' : league === 'NPB' ? 'NPB' : league === 'CPBL' ? 'CPBL' : 'MLB'
  const today = new Date().toISOString().split('T')[0]

  const prompt = uiLanguage === 'en'
    ? `Today is ${today}. Below are recent news articles about ${leagueLabel} team "${teamName}".

${articleText}

Summarize the team's recent situation in English in 2-3 sentences.
- Focus on injuries, player news, team morale, recent performance
- IMPORTANT: Check each article's date. If articles are several days old, note that the situation may have changed since then.
- IMPORTANT: If a player has transferred to another team (e.g. moved to MLB), do NOT include their performance at the new team as this team's news. Only mention players currently on this team's roster.
- No markdown, no numbered lists, write in 100% English only
- Separate each sentence with a newline(\\n)
- If no relevant news about current roster players, write "No recent major news available."`
    : `오늘은 ${today}입니다. 아래는 ${leagueLabel} 팀 "${teamName}"(${teamNameKo}) 관련 최근 뉴스입니다.

${articleText}

이 뉴스들을 바탕으로 팀의 최근 상황을 한국어로 2~3문장으로 요약하세요.
- 부상, 선수 소식, 팀 분위기, 최근 성적 등 핵심만
- 중요: 각 기사의 날짜를 확인하세요. 며칠 전 기사라면 "기사 기준" 또는 "당시"라는 표현을 사용하세요.
- 중요: 이미 다른 팀(예: MLB)으로 이적한 선수의 소식은 이 팀 뉴스에 포함하지 마세요. 현재 이 팀 소속 선수 소식만 요약하세요.
- 마크다운 금지, 번호 매기기 금지
- 반드시 100% 한국어로만 작성하세요. 일본어, 영어 등 외국어가 섞이면 안 됩니다. 선수 이름도 한국어 표기로 작성하세요.
- 각 문장을 줄바꿈(\\n)으로 구분하세요.
- 현재 소속 선수 관련 뉴스가 없으면 "최근 주요 뉴스가 없습니다."라고만 작성`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    return data.content?.[0]?.text?.trim() ?? null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const homeTeam = searchParams.get('homeTeam') || ''
  const awayTeam = searchParams.get('awayTeam') || ''
  const homeTeamKo = searchParams.get('homeTeamKo') || homeTeam
  const awayTeamKo = searchParams.get('awayTeamKo') || awayTeam
  const league = searchParams.get('league') || 'MLB'
  const uiLanguage = searchParams.get('language') || 'ko'

  if (!homeTeam || !awayTeam) {
    return NextResponse.json({ success: false, error: 'homeTeam, awayTeam required' }, { status: 400 })
  }

  const nocache = searchParams.get('nocache') === 'true'
  const cacheKey = `${homeTeam}|${awayTeam}`

  // 0. 캐시 확인 (TTL 6h)
  if (!nocache) {
    try {
      const { data: cached } = await supabase
        .from('baseball_ai_cache')
        .select('payload, expires_at')
        .eq('kind', 'team_news')
        .eq('match_key', cacheKey)
        .eq('language', uiLanguage)
        .maybeSingle()
      if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
        return NextResponse.json({ ...cached.payload, cached: true })
      }
    } catch (e) {
      console.warn('[team-news] cache read failed:', e)
    }
  }

  // KBO → 한글 검색, NPB → 일본어 검색, 나머지 → 영어
  const isKBO = league === 'KBO'
  const isNPB = league === 'NPB'

  const NPB_TEAM_JA: Record<string, string> = {
    'Yomiuri Giants': '読売ジャイアンツ',
    'Hanshin Tigers': '阪神タイガース',
    'Hiroshima Carp': '広島東洋カープ',
    'Hiroshima Toyo Carp': '広島東洋カープ',
    'Yakult Swallows': '東京ヤクルトスワローズ',
    'Yokohama BayStars': '横浜DeNAベイスターズ',
    'Yokohama DeNA BayStars': '横浜DeNAベイスターズ',
    'Chunichi Dragons': '中日ドラゴンズ',
    'SoftBank Hawks': '福岡ソフトバンクホークス',
    'Fukuoka S. Hawks': '福岡ソフトバンクホークス',
    'Orix Buffaloes': 'オリックス・バファローズ',
    'Chiba Lotte Marines': '千葉ロッテマリーンズ',
    'Lotte Marines': '千葉ロッテマリーンズ',
    'Rakuten Eagles': '東北楽天ゴールデンイーグルス',
    'Rakuten Gold. Eagles': '東北楽天ゴールデンイーグルス',
    'Seibu Lions': '埼玉西武ライオンズ',
    'Nippon Ham Fighters': '北海道日本ハムファイターズ',
  }

  // 검색어 + 언어 결정
  const searchLang: 'en' | 'ko' | 'ja' = isKBO ? 'ko' : isNPB ? 'ja' : 'en'
  const homeSearchTerm = isKBO ? homeTeamKo : isNPB ? (NPB_TEAM_JA[homeTeam] || homeTeam) : homeTeam
  const awaySearchTerm = isKBO ? awayTeamKo : isNPB ? (NPB_TEAM_JA[awayTeam] || awayTeam) : awayTeam

  // 1차: 팀명으로 검색
  let [homeArticles, awayArticles] = await Promise.all([
    fetchTeamNews(homeSearchTerm, searchLang),
    fetchTeamNews(awaySearchTerm, searchLang),
  ])

  // 2차: 일본어로 안 잡히면 영어로 재시도 (NPB)
  if (isNPB) {
    if (homeArticles.length === 0) {
      homeArticles = await fetchTeamNews(homeTeam, 'en')
    }
    if (awayArticles.length === 0) {
      awayArticles = await fetchTeamNews(awayTeam, 'en')
    }
  }

  // 3차: 한글로 안 잡히면 영어로 재시도 (KBO)
  if (isKBO) {
    if (homeArticles.length === 0) {
      homeArticles = await fetchTeamNews(homeTeam, 'en')
    }
    if (awayArticles.length === 0) {
      awayArticles = await fetchTeamNews(awayTeam, 'en')
    }
  }

  const debug = searchParams.get('debug') === 'true'

  // Claude 요약 병렬
  const [homeSummary, awaySummary] = await Promise.all([
    summarizeNews(homeTeam, homeTeamKo, homeArticles, league, uiLanguage),
    summarizeNews(awayTeam, awayTeamKo, awayArticles, league, uiLanguage),
  ])

  const result: any = {
    success: true,
    home: homeSummary,
    away: awaySummary,
    homeArticleCount: homeArticles.length,
    awayArticleCount: awayArticles.length,
  }

  if (debug) {
    result.debugHomeArticles = homeArticles
    result.debugAwayArticles = awayArticles
  }

  // 캐시 저장 (요약이 하나라도 있을 때만)
  if (!nocache && (homeSummary || awaySummary)) {
    try {
      const expiresAt = new Date(Date.now() + TEAM_NEWS_TTL_HOURS * 60 * 60 * 1000).toISOString()
      await supabase.from('baseball_ai_cache').upsert({
        kind: 'team_news',
        match_key: cacheKey,
        language: uiLanguage,
        payload: result,
        expires_at: expiresAt,
      })
    } catch (e) {
      console.warn('[team-news] cache write failed:', e)
    }
  }

  return NextResponse.json(result)
}
