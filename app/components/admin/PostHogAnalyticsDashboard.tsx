'use client'

/**
 * PostHog 분석 대시보드 (재사용 컴포넌트)
 *
 * - 어드민 standalone 페이지 + /admin/ads 탭 양쪽에서 사용
 * - 자체 인증 없음 (외부에서 보호)
 */

import { useEffect, useMemo, useState } from 'react'

type Range = '24h' | '7d' | '30d'

interface AnalyticsData {
  range: Range
  summary: {
    users?: number
    visitors?: number
    pageviews?: number
    signups?: number
    subs?: number
    revenue?: number
  }
  daily: Array<{
    date: string
    pageviews: number
    visitors: number
    signups: number
    subs: number
  }>
  topPages: Array<{ path: string; views: number }>
  topEvents: Array<{ event: string; c: number }>
  funnel: {
    signup_started?: number
    signup_completed?: number
    login_completed?: number
    pick_gated?: number
    premium_cta_clicked?: number
    checkout_started?: number
    subscription_completed?: number
  }
  generatedAt: string
}

const CLARITY_URL = 'https://clarity.microsoft.com/projects/view/wnpdd4qrn3/dashboard'
const POSTHOG_URL = 'https://us.posthog.com/project/414922'

const fmt = (n: number | undefined) =>
  n == null ? '-' : new Intl.NumberFormat('ko-KR').format(Math.round(n))
const fmtKRW = (n: number | undefined) =>
  n == null ? '-' : '₩' + new Intl.NumberFormat('ko-KR').format(Math.round(n))

export default function PostHogAnalyticsDashboard() {
  const [range, setRange] = useState<Range>('7d')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/admin/analytics/posthog?range=${range}`)
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'API 오류')
        return j as AnalyticsData
      })
      .then((j) => {
        if (cancelled) return
        setData(j)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range])

  const maxDaily = useMemo(() => {
    if (!data?.daily?.length) return 1
    return Math.max(...data.daily.map((d) => d.pageviews || 0), 1)
  }, [data])

  return (
    <div className="space-y-6">
      {/* 상단 컨트롤 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">🎯 행동 / 퍼널 분석</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            PostHog 기반 — 가입, PICK 클릭, 구독 전환을 단계별로 추적
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['24h', '7d', '30d'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                range === r
                  ? 'bg-emerald-500 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {r === '24h' ? '24시간' : r === '7d' ? '7일' : '30일'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="text-red-400 font-medium text-sm">데이터 로딩 실패</div>
          <div className="text-gray-400 text-xs mt-1">{error}</div>
          <div className="text-gray-500 text-[11px] mt-2">
            .env / Vercel 환경변수에 POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID 가 설정됐는지 확인하세요.
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-900/50 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* 1. 요약 카드 */}
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat label="순방문자" value={fmt(data.summary.visitors)} />
            <Stat label="페이지뷰" value={fmt(data.summary.pageviews)} />
            <Stat label="식별 가입자" value={fmt(data.summary.users)} />
            <Stat label="신규 가입" value={fmt(data.summary.signups)} accent="emerald" />
            <Stat label="구독 결제" value={fmt(data.summary.subs)} accent="yellow" />
            <Stat label="매출 추정" value={fmtKRW(data.summary.revenue)} accent="yellow" />
          </section>

          {/* 2. 일자별 차트 */}
          <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-200">일자별 트래픽</h3>
              <span className="text-[11px] text-gray-500">
                업데이트: {new Date(data.generatedAt).toLocaleString('ko-KR')}
              </span>
            </div>
            {data.daily.length === 0 ? (
              <div className="text-gray-500 text-sm py-8 text-center">
                아직 데이터가 없습니다 (배포 후 사용자 발생 대기)
              </div>
            ) : (
              <div className="space-y-1.5">
                {data.daily.map((d) => (
                  <div key={d.date} className="flex items-center gap-3 text-xs">
                    <div className="w-20 text-gray-500 shrink-0">{d.date}</div>
                    <div className="flex-1 relative h-6 bg-gray-800/50 rounded overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded"
                        style={{ width: `${(d.pageviews / maxDaily) * 100}%` }}
                      />
                      <div className="relative px-2 leading-6 text-white font-medium">
                        PV {fmt(d.pageviews)} · UV {fmt(d.visitors)}
                        {d.signups > 0 && (
                          <span className="ml-2 text-emerald-300">+가입 {d.signups}</span>
                        )}
                        {d.subs > 0 && (
                          <span className="ml-2 text-yellow-300">+결제 {d.subs}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. 퍼널 */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Funnel
              title="회원가입 퍼널"
              steps={[
                { label: '가입 시도', value: data.funnel.signup_started || 0 },
                { label: '가입 완료', value: data.funnel.signup_completed || 0 },
              ]}
            />
            <Funnel
              title="프리미엄 전환 퍼널"
              steps={[
                { label: 'PICK 잠금 노출', value: data.funnel.pick_gated || 0 },
                { label: '프리미엄 CTA 클릭', value: data.funnel.premium_cta_clicked || 0 },
                { label: '결제 시작', value: data.funnel.checkout_started || 0 },
                { label: '구독 완료', value: data.funnel.subscription_completed || 0 },
              ]}
            />
          </section>

          {/* 4. TOP 페이지 + TOP 이벤트 */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RankList
              title="TOP 페이지"
              rows={data.topPages.map((p) => ({ key: p.path || '/', value: p.views }))}
              valueLabel="조회"
            />
            <RankList
              title="커스텀 이벤트 랭킹"
              rows={data.topEvents.map((e) => ({ key: e.event, value: e.c }))}
              valueLabel="발생"
            />
          </section>

          {/* 5. 외부 도구 빠른 링크 */}
          <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-200 mb-3">디테일 분석 도구 바로가기</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ExternalLink
                href={CLARITY_URL}
                emoji="🎬"
                title="Microsoft Clarity"
                desc="세션 녹화 · 히트맵 · Rage Click"
              />
              <ExternalLink
                href={POSTHOG_URL}
                emoji="📈"
                title="PostHog"
                desc="퍼널 빌더 · 코호트 · 리텐션"
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}

// ─────────────── 서브 컴포넌트 ───────────────

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'emerald' | 'yellow'
}) {
  const accentColor =
    accent === 'emerald'
      ? 'text-emerald-400'
      : accent === 'yellow'
        ? 'text-yellow-400'
        : 'text-white'
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
      <div className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${accentColor}`}>{value}</div>
    </div>
  )
}

function Funnel({
  title,
  steps,
}: {
  title: string
  steps: { label: string; value: number }[]
}) {
  const top = steps[0]?.value || 0
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-bold text-gray-200 mb-3">{title}</h3>
      {top === 0 ? (
        <div className="text-gray-500 text-sm py-4 text-center">아직 데이터 없음</div>
      ) : (
        <div className="space-y-2">
          {steps.map((s, idx) => {
            const ratio = top ? s.value / top : 0
            const drop = idx > 0 ? steps[idx - 1].value - s.value : 0
            const dropRate =
              idx > 0 && steps[idx - 1].value
                ? (drop / steps[idx - 1].value) * 100
                : 0
            return (
              <div key={s.label}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-gray-300">
                    {idx + 1}. {s.label}
                  </span>
                  <span className="font-mono text-gray-400">
                    {fmt(s.value)}{' '}
                    <span className="text-gray-600">
                      ({(ratio * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="relative h-5 bg-gray-800/50 rounded overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
                {idx > 0 && drop > 0 && (
                  <div className="text-[10px] text-red-400 mt-0.5">
                    이탈 -{fmt(drop)} ({dropRate.toFixed(1)}%)
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RankList({
  title,
  rows,
  valueLabel,
}: {
  title: string
  rows: { key: string; value: number }[]
  valueLabel: string
}) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-bold text-gray-200 mb-3">{title}</h3>
      {rows.length === 0 ? (
        <div className="text-gray-500 text-sm py-4 text-center">데이터 없음</div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={r.key + i} className="flex items-center gap-2 text-xs">
              <div className="w-5 text-gray-500 shrink-0 text-right">{i + 1}</div>
              <div className="flex-1 relative h-5 bg-gray-800/50 rounded overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600/60 to-blue-400/40 rounded"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
                <div className="relative px-2 leading-5 text-white truncate">
                  <span className="font-mono">{r.key}</span>
                </div>
              </div>
              <div className="w-20 text-right text-gray-300 font-mono shrink-0">
                {fmt(r.value)} {valueLabel}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExternalLink({
  href,
  emoji,
  title,
  desc,
}: {
  href: string
  emoji: string
  title: string
  desc: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-gray-800/40 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg p-4 transition"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1">
          <div className="font-bold text-white">{title}</div>
          <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
        </div>
        <span className="text-gray-500 text-sm">↗</span>
      </div>
    </a>
  )
}
