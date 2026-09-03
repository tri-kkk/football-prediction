'use client'

// =============================================================================
// MatchVerdict — 블로그 프리뷰 리포트 모듈 01 (버딕트 히어로) / 12 (최종 예측 카드)
// BLOG_REPORT_LAYOUT_SPEC_v1.md Phase 1
//
// blog_posts 테이블의 예측 컬럼만 사용하는 순수 표현 컴포넌트.
// 확률 3종이 모두 비어 있으면 아무것도 렌더하지 않는다 (기존 포스트 안전).
// =============================================================================

import React from 'react'

export interface MatchVerdictData {
  home_team?: string | null
  away_team?: string | null
  league_name?: string | null
  kickoff_at?: string | null
  home_prob?: number | null
  draw_prob?: number | null
  away_prob?: number | null
  pred_score?: string | null
  pick?: string | null
  pick_sub?: string | null
  confidence?: number | null
}

type Variant = 'hero' | 'summary'

interface Props {
  data: MatchVerdictData
  variant?: Variant
  lang?: 'ko' | 'en'
  /** summary 변형에서 근거 3줄 */
  reasons?: string[]
  className?: string
}

const TXT = {
  ko: {
    home: '홈 승',
    draw: '무승부',
    away: '원정 승',
    predScore: '예상 스코어',
    confidence: '우위',
    verdict: '최종 예측',
    prediction: 'TrendSoccer 예측',
    note: '모델 확률 · 시장 배당 기준 자동 산출',
    tbd: '미정',
  },
  en: {
    home: 'Home',
    draw: 'Draw',
    away: 'Away',
    predScore: 'Predicted score',
    confidence: 'Edge',
    verdict: 'Verdict',
    prediction: 'TrendSoccer Prediction',
    note: 'Derived from model probability and market odds',
    tbd: 'TBD',
  },
}

/** 세 확률을 합 100으로 정규화. 값이 없으면 null. */
function normalize(h?: number | null, d?: number | null, a?: number | null) {
  const hv = Number(h) || 0
  const dv = Number(d) || 0
  const av = Number(a) || 0
  const sum = hv + dv + av
  if (sum <= 0) return null

  const hp = Math.round((hv / sum) * 100)
  const dp = Math.round((dv / sum) * 100)
  const ap = 100 - hp - dp // 반올림 오차를 원정에 흡수시켜 항상 합 100
  return { hp, dp, ap: ap < 0 ? 0 : ap }
}

function formatKickoff(iso?: string | null, lang: 'ko' | 'en' = 'ko') {
  if (!iso) return null
  const date = new Date(iso)
  if (isNaN(date.getTime())) return null
  try {
    return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Seoul',
    }).format(date) + ' KST'
  } catch {
    return null
  }
}

/** 1X2 삼색 고정: 홈=에메랄드, 무=앰버, 원정=로즈. 페이지 어디서든 같은 색 = 같은 뜻. */
const BAR = {
  home: 'bg-emerald-500',
  draw: 'bg-amber-500',
  away: 'bg-rose-500',
}

function ProbBar({
  hp,
  dp,
  ap,
  t,
  compact = false,
}: {
  hp: number
  dp: number
  ap: number
  t: typeof TXT['ko']
  compact?: boolean
}) {
  const h = compact ? 'h-7' : 'h-9'
  const seg = (w: number, cls: string, label: string) => (
    <div
      className={`${cls} flex items-center justify-center transition-all`}
      style={{ width: `${w}%` }}
      title={`${label} ${w}%`}
    >
      {w >= 12 && (
        <span className="text-[11px] md:text-xs font-bold text-white tabular-nums drop-shadow-sm">
          {w}%
        </span>
      )}
    </div>
  )

  return (
    <div>
      <div className={`flex ${h} rounded-lg overflow-hidden bg-[#0f1623]`}>
        {seg(hp, BAR.home, t.home)}
        {seg(dp, BAR.draw, t.draw)}
        {seg(ap, BAR.away, t.away)}
      </div>
      <div className="flex justify-between mt-2 text-[10px] uppercase tracking-[0.14em] text-gray-500">
        <span>{t.home}</span>
        <span>{t.draw}</span>
        <span>{t.away}</span>
      </div>
    </div>
  )
}

export default function MatchVerdict({
  data,
  variant = 'hero',
  lang = 'ko',
  reasons,
  className = '',
}: Props) {
  const t = TXT[lang] || TXT.ko
  const probs = normalize(data?.home_prob, data?.draw_prob, data?.away_prob)

  // 예측 데이터가 없는 기존 포스트는 조용히 통과
  if (!probs) return null

  const { hp, dp, ap } = probs
  const kickoff = formatKickoff(data.kickoff_at, lang)
  const hasTeams = !!(data.home_team && data.away_team)

  // ---------------------------------------------------------------- summary
  if (variant === 'summary') {
    return (
      <section
        className={`mt-12 rounded-2xl border border-[#1e293b] bg-[#141824] p-5 md:p-6 ${className}`}
        aria-label={t.verdict}
      >
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
            {t.verdict}
          </span>
          {typeof data.confidence === 'number' && (
            <span className="text-[11px] text-gray-400 tabular-nums">
              {t.confidence} +{data.confidence}%p
            </span>
          )}
        </div>

        {data.pick && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              {data.pick}
            </span>
            {data.pick_sub && (
              <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 border border-[#1e293b]">
                {data.pick_sub}
              </span>
            )}
          </div>
        )}

        <ProbBar hp={hp} dp={dp} ap={ap} t={t} compact />

        {reasons && reasons.length > 0 && (
          <ul className="mt-5 pt-4 border-t border-[#1e293b] space-y-2">
            {reasons.map((r, i) => (
              <li key={i} className="flex gap-2.5 items-start text-sm text-gray-400">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-[11px] text-gray-600">{t.note}</p>
      </section>
    )
  }

  // ------------------------------------------------------------------- hero
  return (
    <section
      className={`rounded-2xl border border-[#1e293b] bg-gradient-to-b from-[#161b2b] to-[#121722] p-5 md:p-6 ${className}`}
      aria-label={t.prediction}
    >
      {/* 리그 · 킥오프 */}
      {(data.league_name || kickoff) && (
        <div className="flex items-baseline justify-between mb-4 text-[10px] uppercase tracking-[0.14em] text-gray-500">
          <span>{data.league_name || ''}</span>
          <span className="tabular-nums normal-case tracking-normal text-[11px]">
            {kickoff || ''}
          </span>
        </div>
      )}

      {/* 팀 · 예상 스코어 */}
      {hasTeams && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-4 mb-5">
          <div className="text-sm md:text-base font-bold text-white leading-snug">
            {data.home_team}
          </div>
          <div className="text-center px-1">
            <div className="text-2xl md:text-3xl font-black text-white tabular-nums tracking-tight">
              {data.pred_score || '–'}
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-gray-500">
              {t.predScore}
            </div>
          </div>
          <div className="text-sm md:text-base font-bold text-white leading-snug text-right">
            {data.away_team}
          </div>
        </div>
      )}

      {/* 확률 바 */}
      <ProbBar hp={hp} dp={dp} ap={ap} t={t} />

      {/* 픽 · 신뢰도 */}
      {(data.pick || typeof data.confidence === 'number') && (
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-[#1e293b]">
          {data.pick && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              PICK · {data.pick}
            </span>
          )}
          {data.pick_sub && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 border border-[#1e293b]">
              {data.pick_sub}
            </span>
          )}
          {typeof data.confidence === 'number' && (
            <span className="ml-auto text-[11px] text-gray-400 tabular-nums">
              {t.confidence} +{data.confidence}%p
            </span>
          )}
        </div>
      )}
    </section>
  )
}
