// app/api/team-news/route.ts
// 축구 팀 뉴스 — TheNewsAPI 검색 → 팀 언급 기사 필터 → 헤드라인 한글 번역 → 1시간 메모리 캐시
// GET ?team=Arsenal
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const NEWS_API_TOKEN = process.env.NEWS_API_TOKEN || 'Fh23c0qhklAz5xdPY35QlRJ41SaJEBDywe6uWfH7'
const NEWS_API_BASE = 'https://api.thenewsapi.com/v1/news/all'
const TTL = 60 * 60 * 1000 // 1h

type Article = { title: string; titleKo?: string; url: string; source: string; imageUrl: string; publishedAt: string }
const cache = new Map<string, { t: number; data: Article[] }>()

function extractSource(s: string) {
  try { return new URL(s).hostname.replace(/^www\./, '') } catch { return s || '' }
}

async function translate(titles: string[]): Promise<string[]> {
  try {
    if (!process.env.ANTHROPIC_API_KEY || titles.length === 0) return titles
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const prompt = `Translate each football news headline to natural Korean. Use commonly-used Korean spellings for team and player names. Return ONLY a JSON array of strings, same length and order.\n\nINPUT:\n${JSON.stringify(titles)}`
    const res = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest', max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = res.content.map((c: any) => (c.type === 'text' ? c.text : '')).join('')
    const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1))
    return Array.isArray(arr) && arr.length === titles.length ? arr.map(String) : titles
  } catch { return titles }
}

export async function GET(req: NextRequest) {
  const team = (new URL(req.url).searchParams.get('team') || '').trim()
  if (!team) return NextResponse.json({ error: 'team required' }, { status: 400 })

  const key = team.toLowerCase()
  const hit = cache.get(key)
  if (hit && Date.now() - hit.t < TTL)
    return NextResponse.json({ team, articles: hit.data, cached: true })

  try {
    const params = new URLSearchParams({
      api_token: NEWS_API_TOKEN, categories: 'sports', search: team,
      language: 'en', limit: '10', sort: 'published_at', sort_order: 'desc',
    })
    const r = await fetch(`${NEWS_API_BASE}?${params}`, { next: { revalidate: 1800 } })
    const d = r.ok ? await r.json() : { data: [] }
    const tl = team.toLowerCase()
    let arts: Article[] = (d.data || [])
      .map((a: any) => ({
        title: a.title || '', url: a.url || '',
        source: extractSource(a.source || a.url || ''),
        imageUrl: a.image_url || '', publishedAt: a.published_at || '',
        description: a.description || a.snippet || '',
      }))
      .filter((a: any) => `${a.title} ${a.description}`.toLowerCase().includes(tl))
      .slice(0, 5)

    const ko = await translate(arts.map((a) => a.title))
    arts = arts.map((a, i) => ({ ...a, titleKo: ko[i] || a.title }))
    cache.set(key, { t: Date.now(), data: arts })
    return NextResponse.json({ team, articles: arts })
  } catch (e: any) {
    return NextResponse.json({ team, articles: [], error: e.message })
  }
}
