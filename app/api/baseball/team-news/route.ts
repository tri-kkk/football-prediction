// app/api/baseball/team-news/route.ts

import { NextRequest, NextResponse } from 'next/server'

const NEWS_API_TOKEN = process.env.NEWS_API_TOKEN || ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

async function fetchTeamNews(teamName: string): Promise<{ title: string; description: string }[]> {
  if (!NEWS_API_TOKEN) return []
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const params = new URLSearchParams({
      api_token: NEWS_API_TOKEN,
      categories: 'sports',
      search: teamName,
      language: 'en',
      limit: '5',
      sort: 'published_at',
      sort_order: 'desc',
      published_after: sevenDaysAgo.toISOString().split('T')[0],
      published_before: tomorrow.toISOString().split('T')[0],
    })
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`https://api.thenewsapi.com/v1/news/all?${params}`, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    }).finally(() => clearTimeout(tid))
    if (!res.ok) return []
    const data = await res.json()
    if (!data.data || !Array.isArray(data.data)) return []
    return data.data
      .filter((a: any) => a.title?.length > 0)
      .map((a: any) => ({ title: a.title || '', description: a.description || a.snippet || '' }))
  } catch {
    return []
  }
}

async function summarizeNews(
  teamName: string,
  teamNameKo: string,
  articles: { title: string; description: string }[]
): Promise<string | null> {
  if (!ANTHROPIC_API_KEY || articles.length === 0) return null

  const articleText = articles
    .map((a, i) => `${i + 1}. ${a.title}${a.description ? '\n   ' + a.description : ''}`)
    .join('\n')

  const prompt = `아래는 MLB 팀 "${teamName}"(${teamNameKo})의 최근 뉴스 기사 제목과 요약입니다.

${articleText}

이 뉴스들을 바탕으로 팀의 최근 상황을 한국어로 2~3문장으로 요약하세요.
- 부상, 선수 소식, 팀 분위기, 최근 성적 등 핵심만
- 마크다운 금지, 번호 매기기 금지
- 자연스러운 한국어로, 뉴스가 없거나 관련 없으면 "최근 주요 뉴스가 없습니다."라고만 작성`

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
        max_tokens: 200,
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

  if (!homeTeam || !awayTeam) {
    return NextResponse.json({ success: false, error: 'homeTeam, awayTeam required' }, { status: 400 })
  }

  // 뉴스 수집 병렬
  const [homeArticles, awayArticles] = await Promise.all([
    fetchTeamNews(homeTeam),
    fetchTeamNews(awayTeam),
  ])

  // Claude 요약 병렬
  const [homeSummary, awaySummary] = await Promise.all([
    summarizeNews(homeTeam, homeTeamKo, homeArticles),
    summarizeNews(awayTeam, awayTeamKo, awayArticles),
  ])

  return NextResponse.json({
    success: true,
    home: homeSummary,
    away: awaySummary,
  })
}