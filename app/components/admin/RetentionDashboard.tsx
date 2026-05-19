'use client'

import React, { useEffect, useMemo, useState } from 'react'

// ==================== 타입 정의 ====================
interface RetentionCards {
  total_users: number
  dau: number
  wau: number
  mau: number
  dormant_30d: number
  dormant_90d: number
  stickiness: number
  premium_total: number
  premium_active_30d: number
  premium_retention_30d: number
  free_total: number
  free_active_30d: number
  free_retention_30d: number
}

interface CohortRow {
  cohort: string
  total: number
  d1: number | null
  d7: number | null
  d14: number | null
  d30: number | null
  d60: number | null
  d90: number | null
}

interface DormantUser {
  id: string
  email: string
  name: string | null
  tier: string
  provider: string
  signup_country_code: string | null
  created_at: string
  last_login_at: string | null
}

interface RetentionData {
  cards: RetentionCards
  dauTrend: { date: string; dau: number }[]
  cohort: { type: 'week' | 'month'; rows: CohortRow[] }
  dormant: { users: DormantUser[]; total: number; page: number; size: number }
  generatedAt: string
}

// ==================== 헬퍼 ====================
const formatDate = (s: string) =>
  new Date(s).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

const formatDateTime = (s: string | null) => {
  if (!s) return '-'
  return new Date(s).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 잔존율 % → 배경색 (히트맵)
function pctToBg(p: number | null): string {
  if (p === null) return 'bg-gray-800/30 text-gray-600'
  if (p >= 60) return 'bg-emerald-600/80 text-white'
  if (p >= 40) return 'bg-emerald-500/60 text-white'
  if (p >= 25) return 'bg-yellow-500/50 text-white'
  if (p >= 10) return 'bg-orange-500/50 text-white'
  return 'bg-red-500/40 text-white'
}

// ==================== 메인 컴포넌트 ====================
export default function RetentionDashboard() {
  const [data, setData] = useState<RetentionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cohortType, setCohortType] = useState<'week' | 'month'>('week')
  const [trendDays, setTrendDays] = useState<7 | 14 | 30 | 60>(30)
  const [dormantPage, setDormantPage] = useState(0)

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        cohort: cohortType,
        cohorts: '12',
        trendDays: String(trendDays),
        dormantPage: String(dormantPage),
        dormantSize: '50',
      })
      const res = await fetch(`/api/admin/retention?${params.toString()}`)
      if (!res.ok) throw new Error('잔존율 데이터를 불러오지 못했습니다')
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message || '오류 발생')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortType, trendDays, dormantPage])

  // CSV 다운로드 (휴면 회원)
  const downloadDormantCSV = () => {
    if (!data) return
    const rows = [
      ['email', 'name', 'tier', 'provider', 'country', 'created_at', 'last_login_at'],
      ...data.dormant.users.map((u) => [
        u.email,
        u.name || '',
        u.tier,
        u.provider,
        u.signup_country_code || '',
        u.created_at,
        u.last_login_at || '',
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dormant_users_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // DAU 트렌드 max
  const trendMax = useMemo(() => {
    if (!data) return 1
    return Math.max(...data.dauTrend.map((d) => d.dau), 1)
  }, [data])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">잔존율 데이터를 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-400">
        ⚠️ {error}
        <button
          onClick={fetchData}
          className="ml-4 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-sm"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!data) return null

  const { cards, dauTrend, cohort, dormant } = data

  return (
    <div className="space-y-6">
      {/* ===== 요약 카드 ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card icon="🟢" label="DAU (오늘)" value={cards.dau} accent="emerald" sub={`${pct(cards.dau, cards.total_users)}% of total`} />
        <Card icon="🟡" label="WAU (7일)" value={cards.wau} accent="yellow" sub={`${pct(cards.wau, cards.total_users)}% of total`} />
        <Card icon="🔵" label="MAU (30일)" value={cards.mau} accent="blue" sub={`${pct(cards.mau, cards.total_users)}% of total`} />
        <Card icon="✨" label="Stickiness" value={`${cards.stickiness}%`} accent="purple" sub="DAU / MAU" />
        <Card icon="⚪" label="휴면 (30d+)" value={cards.dormant_30d} accent="gray" sub={`${pct(cards.dormant_30d, cards.total_users)}% of total`} />
        <Card icon="⚫" label="이탈 (90d+)" value={cards.dormant_90d} accent="red" sub={`${pct(cards.dormant_90d, cards.total_users)}% of total`} />
        <Card icon="💎" label="프리미엄 유지율" value={`${cards.premium_retention_30d}%`} accent="emerald" sub={`${cards.premium_active_30d} / ${cards.premium_total}`} />
        <Card icon="🆓" label="무료 유지율" value={`${cards.free_retention_30d}%`} accent="gray" sub={`${cards.free_active_30d} / ${cards.free_total}`} />
      </div>

      {/* ===== DAU 트렌드 차트 ===== */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-semibold text-white">📈 일별 활성 회원 (DAU)</h3>
          <div className="flex gap-1">
            {[7, 14, 30, 60].map((d) => (
              <button
                key={d}
                onClick={() => setTrendDays(d as any)}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  trendDays === d
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {d}일
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-1 h-32">
          {dauTrend.map((d, i) => (
            <div key={i} className="flex-1 h-full flex flex-col items-center justify-end group relative">
              <div
                className="w-full rounded-t bg-emerald-500 hover:bg-emerald-400 transition-all cursor-pointer"
                style={{
                  height: `${(d.dau / trendMax) * 100}%`,
                  minHeight: d.dau > 0 ? '4px' : '0',
                }}
              />
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-gray-700">
                {formatDate(d.date)}: <span className="text-emerald-400 font-bold">{d.dau}</span>명
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-500">
          <span>{dauTrend[0] ? formatDate(dauTrend[0].date) : ''}</span>
          <span>평균: {dauTrend.length ? Math.round(dauTrend.reduce((a, b) => a + b.dau, 0) / dauTrend.length) : 0}명/일</span>
          <span>{dauTrend.length ? formatDate(dauTrend[dauTrend.length - 1].date) : ''}</span>
        </div>
      </div>

      {/* ===== 코호트 히트맵 ===== */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-white">🔥 코호트 잔존율</h3>
            <p className="text-xs text-gray-500 mt-1">가입 시점 기준 D+N일에 마지막 접속이 N일 이후인 비율</p>
          </div>
          <div className="flex gap-1">
            {(['week', 'month'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setCohortType(t)}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  cohortType === t
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {t === 'week' ? '주별' : '월별'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs">
                <th className="px-3 py-2 text-left font-medium">{cohortType === 'week' ? '주차' : '월'}</th>
                <th className="px-3 py-2 text-right font-medium">가입자</th>
                <th className="px-3 py-2 text-center font-medium">D+1</th>
                <th className="px-3 py-2 text-center font-medium">D+7</th>
                <th className="px-3 py-2 text-center font-medium">D+14</th>
                <th className="px-3 py-2 text-center font-medium">D+30</th>
                <th className="px-3 py-2 text-center font-medium">D+60</th>
                <th className="px-3 py-2 text-center font-medium">D+90</th>
              </tr>
            </thead>
            <tbody>
              {cohort.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    코호트 데이터가 없습니다
                  </td>
                </tr>
              ) : (
                cohort.rows.map((row) => (
                  <tr key={row.cohort} className="border-t border-gray-700/30">
                    <td className="px-3 py-2 text-gray-300 font-mono text-xs">{row.cohort}</td>
                    <td className="px-3 py-2 text-right text-white font-medium">{row.total}</td>
                    {(['d1', 'd7', 'd14', 'd30', 'd60', 'd90'] as const).map((k) => (
                      <td key={k} className="px-1 py-1 text-center">
                        <div className={`rounded px-2 py-1.5 text-xs font-bold ${pctToBg(row[k])}`}>
                          {row[k] === null ? '—' : `${row[k]}%`}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-3 mt-4 text-xs text-gray-400 flex-wrap">
          <span>범례:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500/40 rounded" /> &lt;10%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-500/50 rounded" /> 10-25%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500/50 rounded" /> 25-40%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500/60 rounded" /> 40-60%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-600/80 rounded" /> 60%+</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-800/50 rounded border border-gray-700" /> 미도달</span>
        </div>
      </div>

      {/* ===== Tier별 비교 ===== */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">💎 Tier별 30일 잔존율 비교</h3>
        <div className="space-y-4">
          <TierBar
            label="💎 프리미엄"
            active={cards.premium_active_30d}
            total={cards.premium_total}
            pct={cards.premium_retention_30d}
            color="bg-emerald-500"
          />
          <TierBar
            label="🆓 무료"
            active={cards.free_active_30d}
            total={cards.free_total}
            pct={cards.free_retention_30d}
            color="bg-gray-400"
          />
        </div>
      </div>

      {/* ===== 휴면 회원 리스트 ===== */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-white">😴 휴면 회원 (30일 이상 미접속)</h3>
            <p className="text-xs text-gray-500 mt-1">
              총 {dormant.total.toLocaleString()}명 · 이메일 마케팅 타겟 추출용
            </p>
          </div>
          <button
            onClick={downloadDormantCSV}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white font-medium"
          >
            📤 CSV 내보내기
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs bg-gray-900/50">
                <th className="px-3 py-2 text-left">회원</th>
                <th className="px-3 py-2 text-left">국가</th>
                <th className="px-3 py-2 text-left">등급</th>
                <th className="px-3 py-2 text-left">가입일</th>
                <th className="px-3 py-2 text-left">마지막 접속</th>
                <th className="px-3 py-2 text-right">미접속</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {dormant.users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    휴면 회원이 없습니다
                  </td>
                </tr>
              ) : (
                dormant.users.map((u) => {
                  const days = u.last_login_at
                    ? Math.floor((Date.now() - new Date(u.last_login_at).getTime()) / 86400000)
                    : null
                  return (
                    <tr key={u.id} className="hover:bg-gray-700/20">
                      <td className="px-3 py-2">
                        <div className="text-white font-medium">{u.name || u.email.split('@')[0]}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{u.signup_country_code || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          u.tier === 'premium'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {u.tier === 'premium' ? '💎' : '무료'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{formatDate(u.created_at)}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{formatDateTime(u.last_login_at)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`text-xs font-bold ${
                          days && days >= 90 ? 'text-red-400' : days && days >= 60 ? 'text-orange-400' : 'text-yellow-400'
                        }`}>
                          {days ? `${days}일` : '-'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {dormant.total > dormant.size && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-gray-500">
              {dormant.page * dormant.size + 1} - {Math.min((dormant.page + 1) * dormant.size, dormant.total)} / {dormant.total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setDormantPage((p) => Math.max(0, p - 1))}
                disabled={dormant.page === 0}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← 이전
              </button>
              <button
                onClick={() => setDormantPage((p) => p + 1)}
                disabled={(dormant.page + 1) * dormant.size >= dormant.total}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음 →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 text-right">
        업데이트: {formatDateTime(data.generatedAt)} ·{' '}
        <button onClick={fetchData} className="text-emerald-400 hover:underline">
          🔄 새로고침
        </button>
      </div>
    </div>
  )
}

// ==================== 서브 컴포넌트 ====================
function pct(part: number, total: number): string {
  if (!total) return '0.0'
  return ((part / total) * 100).toFixed(1)
}

function Card({
  icon,
  label,
  value,
  sub,
  accent = 'gray',
}: {
  icon: string
  label: string
  value: number | string
  sub?: string
  accent?: 'emerald' | 'yellow' | 'blue' | 'purple' | 'gray' | 'red'
}) {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-600/20 to-emerald-800/20 border-emerald-500/30',
    yellow: 'from-yellow-600/20 to-yellow-800/20 border-yellow-500/30',
    blue: 'from-blue-600/20 to-blue-800/20 border-blue-500/30',
    purple: 'from-purple-600/20 to-purple-800/20 border-purple-500/30',
    gray: 'from-gray-700/20 to-gray-900/20 border-gray-600/30',
    red: 'from-red-600/20 to-red-800/20 border-red-500/30',
  }
  return (
    <div className={`bg-gradient-to-br rounded-xl p-4 md:p-5 border ${colorMap[accent]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-2xl md:text-3xl font-bold text-white mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-sm text-gray-400">{label}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

function TierBar({
  label,
  active,
  total,
  pct,
  color,
}: {
  label: string
  active: number
  total: number
  pct: number
  color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-white font-medium">{label}</span>
        <span className="text-gray-400">
          {active.toLocaleString()} / {total.toLocaleString()}명
          <span className="ml-2 text-white font-bold">{pct}%</span>
        </span>
      </div>
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`${color} h-full transition-all duration-500`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}
