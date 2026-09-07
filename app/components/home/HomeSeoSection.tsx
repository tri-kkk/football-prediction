// 홈 하단 서버 렌더 섹션 (2026-09-07)
//
// 배경: 홈(app/[locale]/page.tsx)은 전체가 클라이언트 컴포넌트라 데이터가 useEffect 로만 채워진다.
// 자바스크립트를 거의 실행하지 않는 네이버 Yeti 크롤러는 홈 HTML 에서 본문 텍스트를 한 줄도 얻지 못했다.
// 이 섹션은 서버에서 실제 데이터를 렌더해 (a) 크롤러가 읽을 한국어 본문과
// (b) 블로그 상세 페이지로 가는 내부 링크를 HTML 에 남긴다. 사용자에게도 그대로 보이는 실제 콘텐츠다.

import { createClient } from '@supabase/supabase-js'

type Post = {
  slug: string
  title: string | null
  title_kr: string | null
  excerpt: string | null
  published_at: string | null
  category: string | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getLatestPosts(limit = 12): Promise<Post[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, title, title_kr, excerpt, published_at, category')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(limit)
    if (error || !data) return []
    return data as Post[]
  } catch {
    return []
  }
}

const fmtDate = (v: string | null) => {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default async function HomeSeoSection({ locale }: { locale: string }) {
  const isKo = locale !== 'en'
  const prefix = isKo ? '' : '/en'
  const posts = await getLatestPosts(12)

  const links = [
    { href: `${prefix}/football`, ko: '축구 분석', en: 'Football Analysis' },
    { href: `${prefix}/blog`, ko: '경기 분석 리포트', en: 'Match Reports' },
    { href: `${prefix}/results`, ko: '경기 결과·스코어', en: 'Results & Scores' },
    { href: `${prefix}/news`, ko: '축구 뉴스', en: 'Football News' },
    { href: `${prefix}/baseball`, ko: '야구 분석', en: 'Baseball Analysis' },
    { href: `${prefix}/baseball/standings`, ko: 'KBO 순위', en: 'KBO Standings' },
    { href: `${prefix}/highlights`, ko: '하이라이트 영상', en: 'Highlights' },
    { href: `${prefix}/premium`, ko: '프리미엄 리포트', en: 'Premium Reports' },
  ]

  return (
    <section className="mx-auto max-w-[1200px] px-3 pb-24 sm:px-5 sm:pb-10">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
        <h1 className="text-base font-bold text-white sm:text-lg">
          {isKo
            ? '축구·야구 경기 분석 - 프리미어리그부터 KBO까지 데이터로 읽는 트렌드사커'
            : 'Football & Baseball Match Analysis - Data-driven Insights from TrendSoccer'}
        </h1>

        <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-gray-400">
          {isKo ? (
            <>
              <p>
                트렌드사커는 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, 챔피언스리그 등 해외축구 주요 리그와
                KBO·MLB·NPB 프로야구 경기를 데이터로 분석하는 서비스입니다. 최근 폼, 상대 전적,
                홈·원정 성적, 배당 흐름을 모아 경기별 심층 프리뷰 리포트를 매일 발행합니다.
              </p>
              <p>
                오늘 열리는 경기 일정과 실시간 스코어는 상단 피드에서 확인할 수 있고, 경기별 상세 분석은
                아래 리포트에서 볼 수 있습니다. 모든 분석은 통계 데이터를 기반으로 한 정보 제공이며
                결과를 보장하지 않습니다.
              </p>
            </>
          ) : (
            <>
              <p>
                TrendSoccer analyses matches from the Premier League, La Liga, Bundesliga, Serie A, Ligue 1
                and the Champions League, along with KBO, MLB and NPB baseball. Each preview combines recent
                form, head-to-head records, home and away splits and odds movement.
              </p>
              <p>
                Live fixtures and scores sit in the feed above; detailed match reports are listed below.
                All analysis is statistical information and does not guarantee outcomes.
              </p>
            </>
          )}
        </div>

        {/* 주요 섹션 내부 링크 — 크롤러의 사이트 구조 파악용 */}
        <nav className="mt-4 flex flex-wrap gap-2" aria-label={isKo ? '주요 메뉴' : 'Main sections'}>
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full border border-white/10 px-3 py-1 text-[12px] text-gray-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
            >
              {isKo ? l.ko : l.en}
            </a>
          ))}
        </nav>

        {posts.length > 0 && (
          <>
            <h2 className="mt-6 text-sm font-bold text-white">
              {isKo ? '최신 경기 분석 리포트' : 'Latest Match Reports'}
            </h2>
            <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {posts.map((p) => {
                const t = isKo ? p.title_kr || p.title : p.title || p.title_kr
                if (!t) return null
                return (
                  <li key={p.slug} className="flex items-baseline justify-between gap-3">
                    <a
                      href={`${prefix}/blog/${p.slug}`}
                      className="truncate text-[13px] text-gray-300 hover:text-emerald-300"
                    >
                      {t}
                    </a>
                    <time
                      className="shrink-0 text-[11px] text-gray-600"
                      dateTime={p.published_at ?? undefined}
                    >
                      {fmtDate(p.published_at)}
                    </time>
                  </li>
                )
              })}
            </ul>
            <a
              href={`${prefix}/blog`}
              className="mt-4 inline-block text-[12px] text-emerald-400 hover:text-emerald-300"
            >
              {isKo ? '분석 리포트 전체 보기 ▸' : 'View all reports ▸'}
            </a>
          </>
        )}
      </div>
    </section>
  )
}
