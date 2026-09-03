'use client'

// =============================================================================
// MatchReportModules — 블로그 프리뷰 리포트 데이터 모듈 04~08
// BLOG_REPORT_LAYOUT_SPEC_v1 · Phase 2
//
//  04 폼 라인      FormLine
//  05 순위 발췌    StandingsExcerpt
//  06 스탯 대비    StatCompare
//  07 H2H 테이블   H2HTable
//  08 트렌드 칩    TrendChips
//
// 1X2 삼색 고정: 홈 emerald / 무 amber / 원정 rose — 페이지 어디서든 같은 뜻.
// =============================================================================

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'

export type Tier = 'guest' | 'free' | 'premium'

// ----------------------------------------------------------------- 공통 조각

function SectionHead({ label, title }: { label: string; title: string }) {
  return (
    <div className="mt-12 mb-5">
      <div className="flex items-center gap-3">
        <div className="w-[3px] h-5 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
        <h2 className="text-[21px] md:text-[23px] font-bold text-white tracking-tight leading-tight">
          {title}
        </h2>
        <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-gray-600">{label}</span>
      </div>
      <div className="mt-3 h-px bg-[#1e293b]" />
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#1e293b] bg-[#141824] p-4 md:p-5 ${className}`}>
      {children}
    </div>
  )
}

/** 티어에 못 미치면 블러 + 업그레이드 CTA. 모듈 단위 게이팅. */
export function TierGate({
  tier,
  need,
  lang,
  children,
}: {
  tier: Tier
  need: Tier
  lang: 'ko' | 'en'
  children: React.ReactNode
}) {
  const rank: Record<Tier, number> = { guest: 0, free: 1, premium: 2 }
  if (rank[tier] >= rank[need]) return <>{children}</>

  const toPremium = need === 'premium'
  return (
    <div className="relative">
      <div className="blur-[5px] opacity-25 pointer-events-none select-none max-h-[190px] overflow-hidden" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Link
          href={toPremium ? '/premium/pricing' : '/login'}
          className="px-5 py-2.5 rounded-xl text-xs font-bold no-underline bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition"
        >
          {lang === 'ko'
            ? toPremium ? '프리미엄 전용 · 잠금 해제' : '무료 가입하고 보기'
            : toPremium ? 'Premium only · Unlock' : 'Sign up free to view'}
        </Link>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ 04 · 폼

interface FormEntry {
  date: string | null
  opponent: string | null
  isHome: boolean
  goalsFor: number
  goalsAgainst: number
  result: 'W' | 'D' | 'L'
}

const RESULT_BG: Record<string, string> = {
  W: 'bg-emerald-500',
  D: 'bg-amber-500',
  L: 'bg-rose-500',
}

function FormRow({ name, entries, lang }: { name: string; entries: FormEntry[]; lang: 'ko' | 'en' }) {
  const gd = entries.reduce((acc, e) => acc + (e.goalsFor - e.goalsAgainst), 0)
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#1e293b] last:border-0">
      <span className="text-[13px] font-semibold text-white flex-1 min-w-0 truncate">{name}</span>
      <span className="flex gap-1">
        {entries.map((e, i) => (
          <span
            key={i}
            title={`${e.isHome ? (lang === 'ko' ? '홈' : 'H') : (lang === 'ko' ? '원정' : 'A')} vs ${e.opponent ?? '?'} ${e.goalsFor}-${e.goalsAgainst}`}
            className={`w-[21px] h-[21px] rounded-[3px] flex items-center justify-center text-[10.5px] font-bold text-white ${RESULT_BG[e.result]} ${e.isHome ? '' : 'opacity-40'}`}
          >
            {e.result}
          </span>
        ))}
      </span>
      <span className="w-[46px] text-right text-[11px] text-gray-400 tabular-nums">
        {gd > 0 ? `+${gd}` : gd}
      </span>
    </div>
  )
}

// ------------------------------------------------------------ 06 · 스탯 대비

interface StatBlock {
  played: number | null
  goalsForPerGame: number | null
  goalsAgainstPerGame: number | null
  winRate: number | null
  cleanSheetRate: number | null
  over25Rate: number | null
  bttsRate: number | null
}

function StatRow({
  label,
  left,
  right,
  suffix = '',
  max,
}: {
  label: string
  left: number | null
  right: number | null
  suffix?: string
  max: number
}) {
  if (left == null && right == null) return null
  const l = left ?? 0
  const r = right ?? 0
  const lw = Math.min(100, Math.round((l / max) * 100))
  const rw = Math.min(100, Math.round((r / max) * 100))

  return (
    <div className="grid grid-cols-[44px_1fr_auto_1fr_44px] gap-2 items-center py-1.5">
      <span className="text-[11.5px] text-white tabular-nums">{left != null ? `${left}${suffix}` : '–'}</span>
      <span className="h-1.5 rounded-sm bg-[#0f1623] overflow-hidden flex justify-end">
        <span className="h-full bg-emerald-500" style={{ width: `${lw}%` }} />
      </span>
      <span className="px-1 text-[9.5px] uppercase tracking-[0.06em] text-gray-500 whitespace-nowrap">{label}</span>
      <span className="h-1.5 rounded-sm bg-[#0f1623] overflow-hidden flex">
        <span className="h-full bg-rose-500" style={{ width: `${rw}%` }} />
      </span>
      <span className="text-right text-[11.5px] text-white tabular-nums">{right != null ? `${right}${suffix}` : '–'}</span>
    </div>
  )
}

// -------------------------------------------------------------------- 메인

interface Props {
  matchId: string
  tier: Tier
  lang: 'ko' | 'en'
}

export default function MatchReportModules({ matchId, tier, lang }: Props) {
  const [data, setData] = useState<any>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    if (!matchId || tier === 'guest') {
      setState('error')
      return
    }
    fetch(`/api/blog/match-report?matchId=${encodeURIComponent(matchId)}&lang=${lang}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        if (!alive) return
        if (j?.success) {
          setData(j.data)
          setState('ok')
        } else {
          setState('error')
        }
      })
      .catch(() => alive && setState('error'))
    return () => {
      alive = false
    }
  }, [matchId, tier, lang])

  // 데이터가 없으면 조용히 사라진다 — 본문은 그대로 읽힌다
  if (state !== 'ok' || !data) return null

  const ko = lang === 'ko'
  const homeName = data.match?.home?.name || ''
  const awayName = data.match?.away?.name || ''

  const formLimit = tier === 'premium' ? 6 : 5
  const h2hLimit = tier === 'premium' ? 99 : 5
  const trendFree = 3
  const statFree = 4

  const homeForm: FormEntry[] = (data.form?.home || []).slice(0, formLimit)
  const awayForm: FormEntry[] = (data.form?.away || []).slice(0, formLimit)
  const hs: StatBlock | null = data.stats?.home ?? null
  const as: StatBlock | null = data.stats?.away ?? null
  // 표본이 비대칭이면(시즌 경계 등) 스탯 대비를 아예 그리지 않는다 — 잘못된 비교가 무표시보다 나쁘다
  const statsComparable = data.stats?.comparable === true
  const h2hMatches = (data.h2h?.matches || []).slice(0, h2hLimit)
  const sum = data.h2h?.summary
  const allTrends = data.trends || []
  const st = data.standings

  const statRows = [
    { label: ko ? '경기당 득점' : 'Goals', l: hs?.goalsForPerGame ?? null, r: as?.goalsForPerGame ?? null, suffix: '', max: 3 },
    { label: ko ? '경기당 실점' : 'Conceded', l: hs?.goalsAgainstPerGame ?? null, r: as?.goalsAgainstPerGame ?? null, suffix: '', max: 3 },
    { label: ko ? '승률' : 'Win rate', l: hs?.winRate ?? null, r: as?.winRate ?? null, suffix: '%', max: 100 },
    { label: ko ? '클린시트' : 'Clean sheet', l: hs?.cleanSheetRate ?? null, r: as?.cleanSheetRate ?? null, suffix: '%', max: 100 },
    { label: ko ? '오버 2.5' : 'Over 2.5', l: hs?.over25Rate ?? null, r: as?.over25Rate ?? null, suffix: '%', max: 100 },
    { label: 'BTTS', l: hs?.bttsRate ?? null, r: as?.bttsRate ?? null, suffix: '%', max: 100 },
  ]
  const statVisible = tier === 'premium' ? statRows : statRows.slice(0, statFree)
  const statLocked = tier === 'premium' ? [] : statRows.slice(statFree)
  const trendVisible = tier === 'premium' ? allTrends : allTrends.slice(0, trendFree)
  const trendLocked = tier === 'premium' ? [] : allTrends.slice(trendFree)

  return (
    <div className="not-prose">
      {/* ------------------------------------------------------- 04 폼 라인 */}
      {(homeForm.length > 0 || awayForm.length > 0) && (
        <>
          <SectionHead label="Form" title={ko ? '최근 폼' : 'Recent Form'} />
          <Card>
            <div className="text-[10px] uppercase tracking-[0.14em] text-gray-600 mb-2">
              {ko ? '흐린 칸은 원정 경기' : 'Faded = away fixture'}
            </div>
            {homeForm.length > 0 && <FormRow name={homeName} entries={homeForm} lang={lang} />}
            {awayForm.length > 0 && <FormRow name={awayName} entries={awayForm} lang={lang} />}
          </Card>
        </>
      )}

      {/* --------------------------------------------------- 05 순위 발췌 */}
      {st?.rows?.length > 0 && (
        <>
          <SectionHead label="Table" title={ko ? '순위 발췌' : 'Standings'} />
          <Card className="overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[280px]">
              <tbody>
                {st.rows.map((r: any) => (
                  <tr key={r.position} className={r.isFocus ? 'bg-emerald-500/[0.08]' : ''}>
                    <td className="py-2 pl-1 pr-2 w-8 text-gray-500 tabular-nums">{r.position}</td>
                    <td className={`py-2 pr-2 ${r.isFocus ? 'font-bold text-white' : 'text-gray-300'}`}>{r.name}</td>
                    <td className="py-2 px-2 text-right text-gray-500 tabular-nums">{r.played}</td>
                    <td className="py-2 px-2 text-right text-gray-500 tabular-nums">
                      {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
                    </td>
                    <td className="py-2 pl-2 pr-1 text-right text-white font-semibold tabular-nums">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* --------------------------------------------------- 06 스탯 대비 */}
      {statsComparable && (hs || as) && (
        <>
          <SectionHead label="Stats" title={ko ? '스탯 대비' : 'Stat Comparison'} />
          <Card>
            <div className="flex justify-between mb-1 text-[11px] font-semibold">
              <span className="text-emerald-400 truncate max-w-[45%]">{homeName}</span>
              <span className="text-rose-400 truncate max-w-[45%] text-right">{awayName}</span>
            </div>
            <div className="flex justify-between mb-3 text-[10px] text-gray-600 tabular-nums">
              <span>{hs?.played ?? '–'}{ko ? '경기' : ' games'}</span>
              <span>{as?.played ?? '–'}{ko ? '경기' : ' games'}</span>
            </div>
            {statVisible.map((s) => (
              <StatRow key={s.label} label={s.label} left={s.l} right={s.r} suffix={s.suffix} max={s.max} />
            ))}
            {statLocked.length > 0 && (
              <TierGate tier={tier} need="premium" lang={lang}>
                {statLocked.map((s) => (
                  <StatRow key={s.label} label={s.label} left={s.l} right={s.r} suffix={s.suffix} max={s.max} />
                ))}
              </TierGate>
            )}
          </Card>
        </>
      )}

      {/* ------------------------------------------------------- 07 H2H */}
      {h2hMatches.length > 0 && (
        <>
          <SectionHead label="H2H" title={ko ? '상대 전적' : 'Head to Head'} />
          <Card className="overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[300px]">
              <tbody>
                {h2hMatches.map((m: any, i: number) => (
                  <tr key={i} className="border-b border-[#1e293b] last:border-0">
                    <td className="py-2 text-[10.5px] text-gray-500 whitespace-nowrap tabular-nums">
                      {m.date ? String(m.date).slice(0, 10).replace(/-/g, '.') : '–'}
                    </td>
                    <td className="py-2 px-2 text-gray-400 truncate max-w-[110px]">{m.homeName}</td>
                    <td className="py-2 text-center font-bold text-white tabular-nums whitespace-nowrap">
                      {m.homeGoals} – {m.awayGoals}
                    </td>
                    <td className="py-2 px-2 text-gray-400 truncate max-w-[110px] text-right">{m.awayName}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {sum?.total > 0 && (
              <>
                <div className="flex h-2 rounded-sm overflow-hidden mt-4">
                  <div className="bg-emerald-500" style={{ width: `${(sum.homeWins / sum.total) * 100}%` }} />
                  <div className="bg-amber-500" style={{ width: `${(sum.draws / sum.total) * 100}%` }} />
                  <div className="bg-rose-500" style={{ width: `${(sum.awayWins / sum.total) * 100}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-[10px] uppercase tracking-[0.12em] text-gray-500">
                  <span>{homeName} {sum.homeWins}{ko ? '승' : 'W'}</span>
                  <span>{sum.draws}{ko ? '무' : 'D'}</span>
                  <span>{awayName} {sum.awayWins}{ko ? '승' : 'W'}</span>
                </div>
              </>
            )}

            {tier !== 'premium' && (
              <p className="mt-3 pt-3 border-t border-[#1e293b] text-[11px] text-gray-600">
                {ko ? '프리미엄은 전체 맞대결 기록을 봅니다' : 'Premium shows the full H2H record'}
              </p>
            )}
          </Card>
        </>
      )}

      {/* --------------------------------------------------- 08 트렌드 칩 */}
      {allTrends.length > 0 && (
        <>
          <SectionHead label="Trends" title={ko ? '트렌드' : 'Trends'} />
          <div className="flex flex-wrap gap-2">
            {trendVisible.map((t: any, i: number) => (
              <div
                key={i}
                className={`rounded-lg border px-3 py-2 flex flex-col gap-0.5 ${
                  t.rate >= 90 || t.rate <= 10
                    ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
                    : 'border-[#1e293b] bg-[#141824]'
                }`}
              >
                <span className="text-[11.5px] text-gray-400 whitespace-nowrap">{t.label}</span>
                <span
                  className={`text-[12px] font-bold tabular-nums ${
                    t.rate >= 90 || t.rate <= 10 ? 'text-emerald-400' : 'text-white'
                  }`}
                >
                  {t.hit} / {t.of} · {t.rate}%
                </span>
              </div>
            ))}
          </div>
          {trendLocked.length > 0 && (
            <div className="mt-2">
              <TierGate tier={tier} need="premium" lang={lang}>
                <div className="flex flex-wrap gap-2">
                  {trendLocked.map((t: any, i: number) => (
                    <div key={i} className="rounded-lg border border-[#1e293b] bg-[#141824] px-3 py-2 flex flex-col gap-0.5">
                      <span className="text-[11.5px] text-gray-400 whitespace-nowrap">{t.label}</span>
                      <span className="text-[12px] font-bold tabular-nums text-white">
                        {t.hit} / {t.of} · {t.rate}%
                      </span>
                    </div>
                  ))}
                </div>
              </TierGate>
            </div>
          )}
        </>
      )}
    </div>
  )
}
