'use client'
// components/PitcherMatchup.tsx
// 사용법: <PitcherMatchup matchId={match.id} homeTeamKo="다저스" awayTeamKo="양키스" />

import { useState, useEffect } from 'react'
import { PitcherStat } from '@/app/api/baseball/pitcher-stats/route'

interface Props {
  matchId: number | string
  homeTeamKo?: string
  awayTeamKo?: string
}

function StatBar({ homeVal, awayVal, label, lowerIsBetter = false }: {
  homeVal: number; awayVal: number; label: string; lowerIsBetter?: boolean
}) {
  const total = homeVal + awayVal
  const homePct = total > 0 ? (homeVal / total) * 100 : 50
  const homeWins = lowerIsBetter ? homeVal <= awayVal : homeVal >= awayVal

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold tabular-nums" style={{ color: homeWins ? '#60a5fa' : '#64748b' }}>
          {homeVal}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
          {label}
        </span>
        <span className="text-xs font-bold tabular-nums" style={{ color: !homeWins ? '#f87171' : '#64748b' }}>
          {awayVal}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: '#1e293b' }}>
        <div className="h-full transition-all duration-700"
          style={{ width: `${homePct}%`, background: homeWins ? '#3b82f6' : '#ef4444', borderRadius: '9999px 0 0 9999px' }} />
        <div className="h-full flex-1"
          style={{ background: !homeWins ? '#3b82f6' : '#ef4444', borderRadius: '0 9999px 9999px 0' }} />
      </div>
    </div>
  )
}

function PitcherCard({ pitcher, isHome }: { pitcher: PitcherStat; isHome: boolean }) {
  const accent = isHome ? '#3b82f6' : '#ef4444'
  const accentBg = isHome ? '#3b82f610' : '#ef444410'
  const [imgError, setImgError] = useState(false)

  return (
    <div className="flex-1 rounded-xl p-3" style={{ background: accentBg, border: `1px solid ${accent}30` }}>
      {/* 헤더: 사진 + 이름 */}
      <div className={`flex items-center gap-2 mb-3 ${!isHome ? 'flex-row-reverse' : ''}`}>
        <div className="relative flex-shrink-0">
          {!imgError ? (
            <img
              src={pitcher.photo}
              alt={pitcher.fullName}
              className="w-11 h-11 rounded-full object-cover object-top"
              style={{ border: `2px solid ${accent}40` }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-black"
              style={{ background: `${accent}20`, border: `2px solid ${accent}40`, color: accent }}>
              {pitcher.fullName.charAt(0)}
            </div>
          )}
          {/* 투구 손 */}
          <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: accent, color: '#fff' }}>
            {pitcher.throwingHand}
          </span>
        </div>
        <div className={`flex-1 min-w-0 ${!isHome ? 'text-right' : ''}`}>
          <p className="text-xs font-black truncate leading-tight" style={{ color: '#f1f5f9' }}>
            {pitcher.fullName}
          </p>
          <p className="text-[10px] truncate" style={{ color: '#64748b' }}>{pitcher.team}</p>
        </div>
      </div>

      {/* 핵심 스탯 3개 */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        {[
          { label: 'ERA', val: pitcher.era > 0 ? pitcher.era.toFixed(2) : '-', good: pitcher.era > 0 && pitcher.era <= 3.75 },
          { label: 'WHIP', val: pitcher.whip > 0 ? pitcher.whip.toFixed(2) : '-', good: pitcher.whip > 0 && pitcher.whip <= 1.20 },
          { label: 'K/9', val: pitcher.strikeoutsPer9Inn > 0 ? String(pitcher.strikeoutsPer9Inn) : '-', good: pitcher.strikeoutsPer9Inn >= 8 },
        ].map(({ label, val, good }) => (
          <div key={label} className="text-center py-1.5 rounded-lg" style={{ background: '#0d1117' }}>
            <p className="text-[9px] mb-0.5" style={{ color: '#475569' }}>{label}</p>
            <p className="text-xs font-black" style={{ color: val === '-' ? '#334155' : good ? accent : '#94a3b8' }}>
              {val}
            </p>
          </div>
        ))}
      </div>

      {/* 승패 기록 */}
      <div className={`flex items-center gap-1 text-xs mb-3 ${!isHome ? 'justify-end' : ''}`}>
        <span className="font-black" style={{ color: '#10b981' }}>{pitcher.wins}승</span>
        <span style={{ color: '#334155' }}>-</span>
        <span className="font-black" style={{ color: '#ef4444' }}>{pitcher.losses}패</span>
        <span style={{ color: '#334155' }}>·</span>
        <span style={{ color: '#475569' }}>{pitcher.inningsPitched}IP</span>
      </div>

      {/* 강점 */}
      {pitcher.strengths.length > 0 && (
        <div className="space-y-1 mb-1.5">
          {pitcher.strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-1">
              <span style={{ color: '#10b981', fontSize: '9px', marginTop: '2px', flexShrink: 0 }}>✦</span>
              <span className="text-[10px] leading-tight" style={{ color: '#94a3b8' }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* 약점 */}
      {pitcher.weakness.length > 0 && (
        <div className="space-y-1">
          {pitcher.weakness.map((w, i) => (
            <div key={i} className="flex items-start gap-1">
              <span style={{ color: '#f97316', fontSize: '9px', marginTop: '2px', flexShrink: 0 }}>▲</span>
              <span className="text-[10px] leading-tight" style={{ color: '#94a3b8' }}>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NoPitcherCard({ isHome, name }: { isHome: boolean; name?: string | null }) {
  const accent = isHome ? '#3b82f6' : '#ef4444'
  return (
    <div className="flex-1 rounded-xl p-4 flex flex-col items-center justify-center gap-2"
      style={{ background: `${accent}08`, border: `1px dashed ${accent}25`, minHeight: '160px' }}>
      <span className="text-2xl">❓</span>
      <div className="text-center">
        <p className="text-xs font-bold" style={{ color: accent }}>{isHome ? '홈' : '원정'} 선발</p>
        <p className="text-[11px] mt-0.5" style={{ color: '#475569' }}>
          {name ?? '미발표'}
        </p>
      </div>
    </div>
  )
}

export default function PitcherMatchup({ matchId, homeTeamKo, awayTeamKo }: Props) {
  const HN = homeTeamKo ?? '홈'
  const AN = awayTeamKo ?? '원정'

  const [data, setData] = useState<{
    homePitcher: PitcherStat | null
    awayPitcher: PitcherStat | null
    homePitcherName?: string | null
    awayPitcherName?: string | null
    matchupNote: string
    season?: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!matchId) return
    setLoading(true)
    setError(null)
    fetch(`/api/baseball/pitcher-stats?matchId=${matchId}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) throw new Error(json.error)
        setData(json)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [matchId])

  const hp = data?.homePitcher
  const ap = data?.awayPitcher

  return (
    <div style={{ background: '#0d1117' }}>

      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(135deg, #1c1f2e 0%, #0f1118 100%)', borderBottom: '1px solid #1e293b' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', fontSize: '14px' }}>⚾</div>
          <span className="text-sm font-bold" style={{ color: '#f1f5f9' }}>선발투수 분석</span>
        </div>
        {data?.season && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: '#1e293b', color: '#64748b' }}>{data.season} 시즌</span>
        )}
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-10" style={{ background: '#131920' }}>
          <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <span className="text-xs" style={{ color: '#64748b' }}>투수 스탯 불러오는 중...</span>
        </div>
      )}

      {/* 에러 */}
      {error && !loading && (
        <div className="px-4 py-6 text-center" style={{ background: '#131920' }}>
          <p className="text-xs" style={{ color: '#ef4444' }}>⚠️ {error}</p>
        </div>
      )}

      {/* 본문 */}
      {!loading && !error && data && (
        <>
          {/* 투수 카드 */}
          <div className="mt-px px-4 pt-4 pb-3" style={{ background: '#131920' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full" style={{ background: '#f97316' }} />
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#64748b' }}>선발 매치업</p>
            </div>

            <div className="flex gap-2">
              {/* 원정 */}
              {ap
                ? <PitcherCard pitcher={ap} isHome={false} />
                : <NoPitcherCard isHome={false} name={data.awayPitcherName} />}

              {/* VS */}
              <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0 py-2">
                <div className="w-px flex-1" style={{ background: '#1e293b' }} />
                <span className="text-[10px] font-black px-0.5" style={{ color: '#334155' }}>VS</span>
                <div className="w-px flex-1" style={{ background: '#1e293b' }} />
              </div>

              {/* 홈 */}
              {hp
                ? <PitcherCard pitcher={hp} isHome={true} />
                : <NoPitcherCard isHome={true} name={data.homePitcherName} />}
            </div>
          </div>

          {/* 스탯 비교 (둘 다 있을 때) */}
          {hp && ap && parseFloat(hp.inningsPitched) > 0 && parseFloat(ap.inningsPitched) > 0 && (
            <div className="mt-px px-4 py-4" style={{ background: '#131920' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 rounded-full" style={{ background: '#8b5cf6' }} />
                <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#64748b' }}>스탯 비교</p>
              </div>

              <div className="flex justify-between text-[10px] font-bold mb-3">
                <span style={{ color: '#60a5fa' }}>{HN} (홈)</span>
                <span style={{ color: '#f87171' }}>{AN} (원정)</span>
              </div>

              <StatBar homeVal={parseFloat(hp.era.toFixed(2))} awayVal={parseFloat(ap.era.toFixed(2))} label="ERA" lowerIsBetter />
              <StatBar homeVal={parseFloat(hp.whip.toFixed(2))} awayVal={parseFloat(ap.whip.toFixed(2))} label="WHIP" lowerIsBetter />
              <StatBar homeVal={hp.strikeoutsPer9Inn} awayVal={ap.strikeoutsPer9Inn} label="K/9" />
              <StatBar homeVal={hp.strikeoutWalkRatio} awayVal={ap.strikeoutWalkRatio} label="K/BB" />
            </div>
          )}

          {/* 매치업 분석 노트 */}
          <div className="mt-px px-4 py-4" style={{ background: '#131920' }}>
            <div className="rounded-xl p-4 flex gap-3"
              style={{ background: '#f9731610', border: '1px solid #f9731630' }}>
              <div className="w-0.5 rounded-full flex-shrink-0 self-stretch"
                style={{ background: 'linear-gradient(180deg, #f97316, #ea580c)' }} />
              <div>
                <p className="text-[10px] font-bold mb-1.5 tracking-widest uppercase" style={{ color: '#f97316' }}>
                  매치업 분석
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#cbd5e1' }}>
                  {data.matchupNote}
                </p>
              </div>
            </div>
          </div>

          {/* 한 줄 요약 */}
          {(hp?.summary || ap?.summary) && (
            <div className="mt-px px-4 pb-4 space-y-2" style={{ background: '#131920' }}>
              {ap?.summary && (
                <div className="rounded-lg px-3 py-2.5" style={{ background: '#1a1f2e', border: '1px solid #1e293b' }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: '#f87171' }}>
                    ⚾ 원정 선발 — {ap.fullName}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{ap.summary}</p>
                </div>
              )}
              {hp?.summary && (
                <div className="rounded-lg px-3 py-2.5" style={{ background: '#1a1f2e', border: '1px solid #1e293b' }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: '#60a5fa' }}>
                    ⚾ 홈 선발 — {hp.fullName}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{hp.summary}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
