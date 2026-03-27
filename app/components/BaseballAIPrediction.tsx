'use client'

import { useState, useEffect } from 'react'

interface PredictionProps {
  matchId: number
  homeTeam: string
  awayTeam: string
  homeTeamKo?: string
  awayTeamKo?: string
  season: string
  league?: string
  overUnderLine?: number | null  // 배당 라인 (없으면 8.5 기본값)
}

interface PredictionResult {
  homeWinProb: number
  awayWinProb: number
  overProb: number
  underProb: number
  confidence: string
  grade: string
}

interface AIInsights {
  keyFactors: Array<{ name: string; value: number; impact: number; description: string }>
  homeAdvantage: { homeRecord: string; awayRecord: string; advantage: number }
  recentForm: { home: string; away: string }
  summary: string
}

function SemiGauge({ pct, color, size = 110 }: { pct: number; color: string; size?: number }) {
  const r = 38
  const circumference = Math.PI * r
  const offset = circumference * (1 - pct / 100)
  return (
    <svg width={size} height={size * 0.58} viewBox="0 0 100 55">
      <path d="M 12 50 A 38 38 0 0 1 88 50" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      <path d="M 12 50 A 38 38 0 0 1 88 50" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
    </svg>
  )
}

function Section({ color, label, badge, children }: {
  color: string; label: string; badge?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="px-4 py-4" style={{ background: '#0d1117' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#94a3b8' }}>{label}</span>
        </div>
        {badge}
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ background: '#0f1623', border: '1px solid #1e293b' }}>
        {children}
      </div>
    </div>
  )
}


const confMap: Record<string, { label: string; color: string }> = {
  HIGH:   { label: '높음', color: '#34d399' },
  MEDIUM: { label: '보통', color: '#fbbf24' },
  LOW:    { label: '낮음', color: '#94a3b8' },
}

function LoadingDots({ color = '#3b82f6' }: { color?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full"
            style={{ background: color, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  )
}

export default function BaseballAIPrediction({
  matchId, homeTeam, awayTeam, homeTeamKo, awayTeamKo, season, league, overUnderLine
}: PredictionProps) {
  const HN = homeTeamKo || homeTeam
  const AN = awayTeamKo || awayTeam

  // 배당 라인: prop으로 받은 값만 사용, null이면 총점 섹션 숨김
  const ouLine = overUnderLine ?? null

  const [pred, setPred] = useState<PredictionResult | null>(null)
  const [ins, setIns] = useState<AIInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [homeSummary, setHomeSummary] = useState<string | null>(null)
  const [awaySummary, setAwaySummary] = useState<string | null>(null)
  const [newsLoading, setNewsLoading] = useState(false)

  useEffect(() => {
    load()
  }, [matchId])

  useEffect(() => {
    if (homeTeam && awayTeam) loadNews()
  }, [homeTeam, awayTeam])

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/baseball/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, homeTeam, awayTeam, season })
      })
      const d = await r.json()
      if (!d.success) throw new Error(d.error)
      setPred(d.prediction)
      setIns(d.insights)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadNews = async () => {
    setNewsLoading(true)
    try {
      const params = new URLSearchParams({
        homeTeam, awayTeam,
        homeTeamKo: HN, awayTeamKo: AN,
        league: league || 'MLB',
      })
      const r = await fetch(`/api/baseball/team-news?${params}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      if (d.success) {
        setHomeSummary(d.home ?? null)
        setAwaySummary(d.away ?? null)
      }
    } catch (e) {
      console.error('loadNews error:', e)
    } finally {
      setNewsLoading(false)
    }
  }

  return (
    <div style={{ background: '#0d1117' }}>

      {/* 메인 헤더 */}
      <div className="px-4 py-2.5 flex items-center justify-between"
        style={{ background: 'linear-gradient(90deg, #1e3a5f, #1a2744)', borderBottom: '1px solid #334155' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>✦</div>
          <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>AI 전력 분석</span>
        </div>
        {pred && (
          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full text-white tracking-wider"
            style={{
              background: pred.grade === 'PICK' ? '#ef4444' : pred.grade === 'GOOD' ? '#2563eb' : '#475569',
              boxShadow: pred.grade === 'PICK' ? '0 0 10px #ef444450' : pred.grade === 'GOOD' ? '0 0 10px #2563eb50' : 'none'
            }}>
            {pred.grade}
          </span>
        )}
      </div>

      {loading && !pred && (
        <div style={{ background: '#0d1117' }}>
          <LoadingDots />
        </div>
      )}

      {error && (
        <div className="mx-4 my-4 px-4 py-3 rounded-xl text-xs text-center"
          style={{ background: '#ef444410', color: '#f87171', border: '1px solid #ef444430' }}>
          {error}
        </div>
      )}

      {pred && (
        <div>

          {/* 승부 지표 */}
          <Section color="#3b82f6" label="승부 지표">
            <div className="px-4 pt-5 pb-4 flex items-center justify-between">
              {/* 원정 */}
              <div className="flex-1 flex flex-col items-center">
                <div className="relative">
                  <SemiGauge pct={pred.awayWinProb} color="#ef4444" />
                  <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: '14px' }}>
                    <span className="text-2xl font-black text-white">{pred.awayWinProb}%</span>
                  </div>
                </div>
                <p className="text-sm font-bold mt-1 truncate max-w-[90px] text-center" style={{ color: '#e2e8f0' }}>{AN}</p>
                <span className="text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full"
                  style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>원정</span>
              </div>
              {/* 중앙 */}
              <div className="flex flex-col items-center gap-3 px-3">
                <span className="text-sm font-black" style={{ color: '#334155' }}>VS</span>
                <div className="w-16 h-1.5 rounded-full overflow-hidden flex">
                  <div className="h-full rounded-l-full" style={{ width: `${pred.awayWinProb}%`, background: 'linear-gradient(90deg, #ef4444, #f87171)' }} />
                  <div className="h-full rounded-r-full flex-1" style={{ background: 'linear-gradient(90deg, #60a5fa, #3b82f6)' }} />
                </div>
              </div>
              {/* 홈 */}
              <div className="flex-1 flex flex-col items-center">
                <div className="relative">
                  <SemiGauge pct={pred.homeWinProb} color="#3b82f6" />
                  <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: '14px' }}>
                    <span className="text-2xl font-black text-white">{pred.homeWinProb}%</span>
                  </div>
                </div>
                <p className="text-sm font-bold mt-1 truncate max-w-[90px] text-center" style={{ color: '#e2e8f0' }}>{HN}</p>
                <span className="text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full"
                  style={{ background: '#3b82f620', color: '#60a5fa', border: '1px solid #3b82f640' }}>홈</span>
              </div>
            </div>
          </Section>

          {/* 총점 지표 - 배당 기준선 있을 때만 표시 */}
          {ouLine !== null && (
          <Section color="#f97316" label="총점 지표"
            badge={<span className="text-[10px]" style={{ color: '#64748b' }}>기준 {ouLine}</span>}>
            <div className="p-3">
              <div className="flex items-center justify-center mb-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ background: '#f9731618', border: '1px solid #f9731650' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#f97316' }} />
                  <span className="text-xs font-bold" style={{ color: '#f97316' }}>기준 {ouLine}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'OVER',  prob: pred.overProb,  active: pred.overProb >= pred.underProb, c: '#f97316' },
                  { label: 'UNDER', prob: pred.underProb, active: pred.underProb > pred.overProb,  c: '#8b5cf6' },
                ].map(({ label, prob, active, c }) => (
                  <div key={label} className="rounded-xl py-4 text-center relative overflow-hidden"
                    style={{ background: active ? c + '12' : '#131920', border: `1px solid ${active ? c + '50' : '#243044'}` }}>
                    {active && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: c + '25', color: c }}>우세</span>
                    )}
                    <p className="text-xs font-semibold mb-1" style={{ color: active ? c : '#64748b' }}>{label}</p>
                    <p className="text-3xl font-black" style={{ color: active ? c : '#475569' }}>{prob}%</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>
          )}

          {ins && (
            <>
              {/* 홈/원정 전적 */}
              <Section color="#f59e0b" label="최근 10경기 홈 / 원정 전적">
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {[
                      { label: '원정 승률', val: ins.homeAdvantage.awayRecord, name: AN, c: '#ef4444' },
                      { label: '홈 승률',   val: ins.homeAdvantage.homeRecord, name: HN, c: '#3b82f6' },
                    ].map(({ label, val, name, c }) => (
                      <div key={label} className="rounded-xl py-3.5 text-center"
                        style={{ background: c + '12', border: `1px solid ${c}30` }}>
                        <p className="text-[11px] font-semibold mb-1" style={{ color: '#94a3b8' }}>{label}</p>
                        <p className="text-2xl font-black" style={{ color: c }}>{val}</p>
                        <p className="text-[11px] mt-1 truncate px-2" style={{ color: '#64748b' }}>{name}</p>
                      </div>
                    ))}
                  </div>
                  {ins.homeAdvantage.advantage > 0.1 && (
                    <div className="text-center py-2.5 rounded-xl"
                      style={{ background: '#3b82f610', border: '1px solid #3b82f625' }}>
                      <p className="text-xs font-semibold" style={{ color: '#60a5fa' }}>
                        홈 어드밴티지 +{(ins.homeAdvantage.advantage * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              </Section>

              {/* 최근 10경기 + 신뢰도 */}
              <Section color="#06b6d4" label="최근 10경기 승률">
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {[
                      { name: AN, val: ins.recentForm.away, c: '#f97316' },
                      { name: HN, val: ins.recentForm.home, c: '#10b981' },
                    ].map(({ name, val, c }) => (
                      <div key={name} className="rounded-xl py-3.5 text-center"
                        style={{ background: c + '12', border: `1px solid ${c}30` }}>
                        <p className="text-xs mb-1 truncate px-2 font-semibold" style={{ color: '#94a3b8' }}>{name}</p>
                        <p className="text-2xl font-black" style={{ color: c }}>{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: '#131920', border: '1px solid #243044' }}>
                    <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>분석 신뢰도</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: confMap[pred.confidence]?.color ?? '#94a3b8',
                          boxShadow: `0 0 6px ${confMap[pred.confidence]?.color ?? '#94a3b8'}` }} />
                      <span className="text-sm font-bold"
                        style={{ color: confMap[pred.confidence]?.color ?? '#94a3b8' }}>
                        {confMap[pred.confidence]?.label ?? '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </Section>
            </>
          )}

          {/* 팀 뉴스 요약 */}
          {(newsLoading || homeSummary || awaySummary) && (
            <Section color="#a78bfa" label="팀 뉴스">
              {newsLoading ? (
                <LoadingDots color="#a78bfa" />
              ) : (
                <div className="flex flex-col gap-3 p-4">
                  {awaySummary && (
                    <div className="rounded-2xl p-4" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#ef4444' }} />
                        <span className="text-[11px] font-bold tracking-wide uppercase" style={{ color: '#ef4444' }}>
                          원정 · {AN}
                        </span>
                      </div>
                      <p className="text-sm leading-7 font-medium" style={{ color: '#cbd5e1' }}>{awaySummary}</p>
                    </div>
                  )}
                  {homeSummary && (
                    <div className="rounded-2xl p-4" style={{ background: '#3b82f610', border: '1px solid #3b82f630' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#60a5fa' }} />
                        <span className="text-[11px] font-bold tracking-wide uppercase" style={{ color: '#60a5fa' }}>
                          홈 · {HN}
                        </span>
                      </div>
                      <p className="text-sm leading-7 font-medium" style={{ color: '#cbd5e1' }}>{homeSummary}</p>
                    </div>
                  )}
                </div>
              )}
            </Section>
          )}

        </div>
      )}
    </div>
  )
}