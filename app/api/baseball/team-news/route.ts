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

const TEAM_NEWS_TTL_HOURS = 1 // 6h → 1h (잘못된 요약이 오래 남지 않도록 단축)

// 일반 단어 닉네임 — 도시명/리그 키워드 없이는 다른 스포츠 기사로 오탐 위험
const AMBIGUOUS_NICKNAMES = new Set([
  // MLB
  'tigers','giants','rangers','dodgers','mariners','angels','rays','twins','braves',
  'guardians','athletics','royals','pirates','nationals','phillies','reds','mets',
  'yankees','orioles','astros','cardinals','cubs','brewers','marlins','rockies',
  'padres','diamondbacks','sox',
  // KBO
  'eagles','bears','wiz','twins','dinos','landers','lions','giants','tigers','heroes',
  // NPB
  'hawks','swallows','carp','baystars','dragons','buffaloes','marines','fighters','lions','tigers','giants',
])

/**
 * 기사가 해당 팀을 실제로 다루는지 검증.
 * 로직:
 *  1) 기사 본문에 팀 full name(공백 포함)이 등장하면 통과 (가장 강한 신호)
 *  2) 팀명이 단일 단어면 그것이 등장 + 리그 키워드 중 하나 함께 있으면 통과
 *  3) 팀명이 여러 토큰이면 (a) 도시 토큰 포함 (b) nickname 토큰 + 리그 키워드 둘 중 하나 충족 시 통과
 *  4) 한글/일본어 팀명은 full name 매칭만 허용
 */
function articleMentionsTeam(
  article: { title: string; description: string },
  teamName: string,
  extraKeywords: string[] = []
): boolean {
  const haystack = `${article.title} ${article.description}`.toLowerCase()
  const team = teamName.toLowerCase().trim()
  if (!team) return false

  // (1) full-name 직접 매칭 — 가장 강한 신호, 바로 통과
  if (haystack.includes(team)) return true

  // (2) 비ASCII (한글/일본어) — 전체 매칭만 인정
  // eslint-disable-next-line no-control-regex
  if (/[^\x00-\x7F]/.test(teamName)) return false

  const tokens = team.split(/\s+/).filter(t => t.length >= 3)
  if (tokens.length === 0) return false
  const nickname = tokens[tokens.length - 1]
  const cityTokens = tokens.slice(0, -1)

  const nicknameHit = haystack.includes(nickname)
  if (!nicknameHit) return false

  // (3) 도시 토큰이 있으면 함께 등장해야 함 (ex: "San Francisco" + "Giants")
  const cityHit = cityTokens.some(c => haystack.includes(c))
  if (cityTokens.length > 0 && cityHit) return true

  // (4) 도시 매칭 실패 → ambiguous nickname이면 리그 키워드 필수
  if (AMBIGUOUS_NICKNAMES.has(nickname)) {
    return extraKeywords.some(kw => haystack.includes(kw.toLowerCase()))
  }

  // (5) non-ambiguous 단일 단어 닉네임은 단독 매칭 허용
  return tokens.length === 1
}

interface FetchNewsResult {
  articles: { title: string; description: string; publishedAt: string }[]
  meta: {
    httpStatus: number | null
    apiErrorMessage?: string
    rawCount: number
    yearFilteredOut: number
    relevanceFilteredOut: number
    searchTerm: string
    language: string
  }
  rejectedSamples?: { title: string; reason: string }[]
}

async function fetchTeamNews(
  teamName: string,
  language: 'en' | 'ko' | 'ja' = 'en',
  extraKeywords: string[] = [],
  collectDebug = false
): Promise<FetchNewsResult> {
  const meta = {
    httpStatus: null as number | null,
    rawCount: 0,
    yearFilteredOut: 0,
    relevanceFilteredOut: 0,
    searchTerm: teamName,
    language,
  }
  const rejectedSamples: { title: string; reason: string }[] = []

  if (!NEWS_API_TOKEN) {
    return { articles: [], meta: { ...meta, apiErrorMessage: 'NEWS_API_TOKEN missing' }, rejectedSamples }
  }

  try {
    // "최근 팀 상황" 블럭 → 3일 윈도우가 적절 (7일은 오래된 사건 혼입됨)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // TheNewsAPI는 기본 AND 매칭 — 여러 단어 팀명이면 모두 포함된 기사만 반환됨
    // (phrase quote 는 공식 지원 안 됨, 따옴표 사용 시 0 결과 발생)
    const params = new URLSearchParams({
      api_token: NEWS_API_TOKEN,
      categories: 'sports',
      search: teamName,
      search_fields: 'title,description', // 메타/URL 매칭으로 인한 오탐 방지
      language,
      limit: '10',
      sort: 'published_at',
      sort_order: 'desc',
      published_after: threeDaysAgo.toISOString().split('T')[0],
      published_before: tomorrow.toISOString().split('T')[0],
    })
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(`https://api.thenewsapi.com/v1/news/all?${params}`, {
      signal: controller.signal,
      cache: 'no-store',
    }).finally(() => clearTimeout(tid))

    meta.httpStatus = res.status
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { articles: [], meta: { ...meta, apiErrorMessage: body.slice(0, 200) }, rejectedSamples }
    }
    const data = await res.json()
    if (!data.data || !Array.isArray(data.data)) {
      return { articles: [], meta, rejectedSamples }
    }

    meta.rawCount = data.data.length
    const currentYear = new Date().getFullYear()
    const articles: { title: string; description: string; publishedAt: string }[] = []

    for (const a of data.data) {
      if (!a.title?.length) continue
      if (a.published_at) {
        const pubYear = new Date(a.published_at).getFullYear()
        if (pubYear < currentYear) {
          meta.yearFilteredOut++
          if (collectDebug && rejectedSamples.length < 3) {
            rejectedSamples.push({ title: a.title, reason: `old article (${pubYear})` })
          }
          continue
        }
      }
      const article = { title: a.title || '', description: a.description || a.snippet || '' }
      if (!articleMentionsTeam(article, teamName, extraKeywords)) {
        meta.relevanceFilteredOut++
        if (collectDebug && rejectedSamples.length < 3) {
          rejectedSamples.push({ title: a.title, reason: 'team mismatch' })
        }
        continue
      }
      articles.push({
        title: article.title,
        description: article.description,
        publishedAt: a.published_at || '',
      })
      if (articles.length >= 5) break
    }

    return { articles, meta, rejectedSamples }
  } catch (e: any) {
    return { articles: [], meta: { ...meta, apiErrorMessage: e?.message || String(e) }, rejectedSamples }
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
    ? `Today is ${today}. Below are recent news articles possibly about ${leagueLabel} team "${teamName}".

${articleText}

Summarize this team's recent situation in English in 2-3 sentences.
- First, VERIFY each article actually concerns ${leagueLabel} team "${teamName}" and not another team with a similar name from a different league/sport. Discard any article that is not about this specific team.
- Focus on injuries, player news, team morale, recent performance
- IMPORTANT: Check each article's date. If articles are several days old, note that the situation may have changed since then.
- IMPORTANT: If a player has transferred to another team (e.g. moved to MLB), do NOT include their performance at the new team as this team's news. Only mention players currently on this team's roster.
- No markdown, no numbered lists, write in 100% English only
- Separate each sentence with a newline(\\n)
- If no article genuinely concerns this team, write "No recent major news available."`
    : `오늘은 ${today}입니다. 아래는 ${leagueLabel} 팀 "${teamName}"(${teamNameKo}) 관련일 수 있는 최근 뉴스입니다.

${articleText}

이 팀의 최근 상황을 한국어로 2~3문장으로 요약하세요.
- 먼저, 각 기사가 실제로 ${leagueLabel} 팀 "${teamName}"(${teamNameKo})에 관한 것인지 확인하세요. 다른 리그/스포츠의 동명 팀 기사(예: NFL Giants, NHL Rangers, Detroit Tigers 등)라면 반드시 제외하세요.
- 부상, 선수 소식, 팀 분위기, 최근 성적 등 핵심만
- 중요: 각 기사의 날짜를 확인하세요. 며칠 전 기사라면 "기사 기준" 또는 "당시"라는 표현을 사용하세요.
- 중요: 이미 다른 팀(예: MLB)으로 이적한 선수의 소식은 이 팀 뉴스에 포함하지 마세요. 현재 이 팀 소속 선수 소식만 요약하세요.
- 마크다운 금지, 번호 매기기 금지
- 반드시 100% 한국어로만 작성하세요. 일본어, 영어 등 외국어가 섞이면 안 됩니다. 선수 이름도 한국어 표기로 작성하세요.
- 각 문장을 줄바꿈(\\n)으로 구분하세요.
- 이 팀과 무관한 기사만 있다면 "최근 주요 뉴스가 없습니다."라고만 작성`

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

  // 리그별 disambiguation 키워드 (영어 fallback 시 다른 스포츠/리그 기사 필터링)
  const leagueKeywords: Record<string, string[]> = {
    KBO: ['kbo', 'korea', 'korean'],
    NPB: ['npb', 'nippon', 'japan', 'japanese'],
    CPBL: ['cpbl', 'taiwan', 'chinese professional'],
    MLB: ['mlb', 'major league', 'baseball'],
  }
  const disambig = leagueKeywords[league] || ['baseball']

  const debug = searchParams.get('debug') === 'true'

  // 팀명 변형: 중간 수식어 제거 ("Hiroshima Toyo Carp" → "Hiroshima Carp", "Rakuten Gold. Eagles" → "Rakuten Eagles")
  const TRIM_WORDS = new Set(['toyo', 'gold.', 'gold', 'goldeneagles', 'fc', 'inc', 'of'])
  const simplifyTeamName = (name: string): string => {
    const tokens = name.split(/\s+/).filter(t => t.length > 0 && !TRIM_WORDS.has(t.toLowerCase()))
    return tokens.join(' ')
  }
  const nicknameOf = (name: string): string | null => {
    const tokens = name.split(/\s+/).filter(t => t.length >= 3)
    return tokens.length > 0 ? tokens[tokens.length - 1] : null
  }

  // 다단계 검색: (1) 네이티브 → (2) 영어 full → (3) 영어 단순화 → (4) 영어 nickname + 리그키워드
  const homeAttempts: FetchNewsResult[] = []
  const awayAttempts: FetchNewsResult[] = []

  async function searchWithFallbacks(
    nativeTerm: string,
    engFull: string,
    attempts: FetchNewsResult[]
  ): Promise<FetchNewsResult> {
    // 1차: 네이티브 언어
    const nativeKeywords = isKBO || isNPB ? [] : disambig
    let r = await fetchTeamNews(nativeTerm, searchLang, nativeKeywords, debug)
    attempts.push(r)
    if (r.articles.length > 0) return r

    // 2차: 영어 full name (native 가 이미 en 이면 skip)
    if (searchLang !== 'en') {
      r = await fetchTeamNews(engFull, 'en', disambig, debug)
      attempts.push(r)
      if (r.articles.length > 0) return r
    }

    // 3차: 단순화된 full name
    const simplified = simplifyTeamName(engFull)
    if (simplified && simplified !== engFull) {
      r = await fetchTeamNews(simplified, 'en', disambig, debug)
      attempts.push(r)
      if (r.articles.length > 0) return r
    }

    // 4차: nickname-only + 리그 키워드 (filter 에서 disambig 강제)
    const nick = nicknameOf(simplified || engFull)
    if (nick) {
      // nickname 으로는 TheNewsAPI search 가 너무 많이 매칭되므로 "nickname + league-keyword" 로 AND 검색
      const searchWithLeague = `${nick} ${disambig[0]}`
      r = await fetchTeamNews(searchWithLeague, 'en', [nick, ...disambig], debug)
      // 필터에서는 실제 팀명 기준으로 관련성 검증
      const filtered: FetchNewsResult = {
        articles: r.articles.filter(a =>
          articleMentionsTeam({ title: a.title, description: a.description }, engFull, disambig)
        ),
        meta: { ...r.meta, searchTerm: `${searchWithLeague} (filtered by ${engFull})` },
        rejectedSamples: r.rejectedSamples,
      }
      attempts.push(filtered)
      return filtered
    }

    return r
  }

  const [homeResult, awayResult] = await Promise.all([
    searchWithFallbacks(homeSearchTerm, homeTeam, homeAttempts),
    searchWithFallbacks(awaySearchTerm, awayTeam, awayAttempts),
  ])

  const homeArticles = homeResult.articles
  const awayArticles = awayResult.articles

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
    result.debugHomeAttempts = homeAttempts.map(r => ({ meta: r.meta, rejectedSamples: r.rejectedSamples }))
    result.debugAwayAttempts = awayAttempts.map(r => ({ meta: r.meta, rejectedSamples: r.rejectedSamples }))
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
