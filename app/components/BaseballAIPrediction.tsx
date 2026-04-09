'use client'

import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

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

interface TeamFormStat {
  scored: number
  conceded: number
  hits: number
  runDiff: number
  games: number
}

interface TeamSeasonStat {
  avg: number | null
  obp: number | null
  slg: number | null
  ops: number | null
  hr: number | null
  era: number | null
  whip: number | null
  oppAvg: number | null
}

interface AIInsights {
  keyFactors: Array<{ name: string; value: number; impact: number; description: string }>
  homeAdvantage: { homeRecord: string; awayRecord: string; advantage: number }
  recentForm: { home: string; away: string }
  teamForm?: { home: TeamFormStat; away: TeamFormStat }
  teamSeason?: { home: TeamSeasonStat | null; away: TeamSeasonStat | null }
  summary: string
}

interface PredictDataQuality {
  homeGamesPlayed: number
  awayGamesPlayed: number
  reliable: boolean
  hasPitcherData?: boolean
  pitcherAdjustment?: number
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


const confMapData: Record<string, { ko: string; en: string; color: string }> = {
  HIGH:   { ko: '높음', en: 'High',   color: '#34d399' },
  MEDIUM: { ko: '보통', en: 'Medium', color: '#fbbf24' },
  LOW:    { ko: '낮음', en: 'Low',    color: '#94a3b8' },
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

// 미러 분할 바: away가 왼쪽(빨강), home이 오른쪽(파랑)
// awayShare(0~100) = away가 차지하는 비율 — 강함에 따라 영역이 넓어짐
function computeBarShare(
  awayVal: number | null | undefined,
  homeVal: number | null | undefined,
  higherBetter: boolean
): number {
  if (awayVal == null || homeVal == null) return 50
  const a = Math.max(awayVal, 0.0001)
  const h = Math.max(homeVal, 0.0001)
  // higher-is-better: 큰 값이 강함, lower-is-better: 작은 값이 강함 → 역수로 변환
  const aS = higherBetter ? a : 1 / a
  const hS = higherBetter ? h : 1 / h
  const raw = aS / (aS + hS)
  // 50% 기준 편차를 ~2.2배 증폭 (실측 KBO 격차에서 시각적으로 의미 있는 폭)
  const dev = raw - 0.5
  const amplified = 0.5 + dev * 2.2
  // 양 끝 클램프 (한쪽이 완전히 사라지지 않게)
  return Math.max(12, Math.min(88, amplified * 100))
}

// 미러 분할 바 컴포넌트
function MirrorBar({ awayShare, height = 6 }: { awayShare: number; height?: number }) {
  const homeShare = 100 - awayShare
  return (
    <div
      className="mt-1.5 rounded-full overflow-hidden flex"
      style={{ height, background: '#0b1118', border: '1px solid #1e2a3a' }}
      role="img"
      aria-label={`away ${awayShare.toFixed(0)}% / home ${homeShare.toFixed(0)}%`}
    >
      <div
        style={{
          width: `${awayShare}%`,
          background: 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
          transition: 'width 0.6s ease-out',
        }}
      />
      <div
        style={{
          width: `${homeShare}%`,
          background: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)',
          transition: 'width 0.6s ease-out',
        }}
      />
    </div>
  )
}

export default function BaseballAIPrediction({
  matchId, homeTeam, awayTeam, homeTeamKo, awayTeamKo, season, league, overUnderLine
}: PredictionProps) {
  const { language } = useLanguage()
  const t = (ko: string, en: string) => language === 'ko' ? ko : en
  const HN = language === 'ko' ? (homeTeamKo || homeTeam) : homeTeam
  const AN = language === 'ko' ? (awayTeamKo || awayTeam) : awayTeam

  // 배당 라인: prop으로 받은 값만 사용, null이면 총점 섹션 숨김
  const ouLine = overUnderLine ?? null

  const [pred, setPred] = useState<PredictionResult | null>(null)
  const [ins, setIns] = useState<AIInsights | null>(null)
  const [dq, setDq] = useState<PredictDataQuality | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [homeSummary, setHomeSummary] = useState<string | null>(null)
  const [awaySummary, setAwaySummary] = useState<string | null>(null)
  const [newsLoading, setNewsLoading] = useState(false)

  // 중복 호출 방지 가드 — StrictMode 더블 마운트 / 동일 deps 재발화 차단
  const predictKeyRef = useRef<string | null>(null)
  const newsKeyRef = useRef<string | null>(null)
  const predictAbortRef = useRef<AbortController | null>(null)
  const newsAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const key = `${matchId}|${homeTeam}|${awayTeam}|${season}`
    if (predictKeyRef.current === key) return
    predictKeyRef.current = key
    predictAbortRef.current?.abort()
    const ac = new AbortController()
    predictAbortRef.current = ac
    load(ac.signal)
    return () => { /* keep ref so re-mount with same key skips */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, homeTeam, awayTeam, season])

  useEffect(() => {
    if (!homeTeam || !awayTeam) return
    const key = `${homeTeam}|${awayTeam}|${language}`
    if (newsKeyRef.current === key) return
    newsKeyRef.current = key
    newsAbortRef.current?.abort()
    const ac = new AbortController()
    newsAbortRef.current = ac
    loadNews(ac.signal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeTeam, awayTeam, language])

  const load = async (signal?: AbortSignal) => {
    setLoading(true); setError(null)
    try {
      // 1단계: quick=true → Railway ML 스킵, DB 기반 즉시 응답 (~300-500ms)
      const quickRes = await fetch('/api/baseball/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, homeTeam, awayTeam, season, quick: true }),
        signal,
      })
      const quickData = await quickRes.json()
      if (signal?.aborted) return
      if (quickData.success) {
        setPred(quickData.prediction)
        setIns(quickData.insights)
        setDq(quickData.dataQuality ?? null)
        setLoading(false)
      } else if (!quickData.success) {
        throw new Error(quickData.error || 'predict quick failed')
      }

      // 2단계: full predict → Railway ML 포함. 완료되면 prediction만 덮어씀
      try {
        const fullRes = await fetch('/api/baseball/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId, homeTeam, awayTeam, season }),
          signal,
        })
        const fullData = await fullRes.json()
        if (signal?.aborted) return
        if (fullData.success) {
          setPred(fullData.prediction)
          setIns(fullData.insights)
          setDq(fullData.dataQuality ?? null)
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn('full predict failed, quick result retained:', e)
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setError(e.message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }

  const loadNews = async (signal?: AbortSignal) => {
    setNewsLoading(true)
    try {
      const params = new URLSearchParams({
        homeTeam, awayTeam,
        homeTeamKo: HN, awayTeamKo: AN,
        league: league || 'MLB',
        language,
      })
      const r = await fetch(`/api/baseball/team-news?${params}`, { signal })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      if (signal?.aborted) return
      if (d.success) {
        setHomeSummary(d.home ?? null)
        setAwaySummary(d.away ?? null)
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return
      console.error('loadNews error:', e)
    } finally {
      if (!signal?.aborted) setNewsLoading(false)
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
          <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{t('AI 전력 분석', 'AI Analysis')}</span>
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
          <Section color="#3b82f6" label={t('승부 지표', 'Win Probability')}>
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
                  style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>{t('원정', 'Away')}</span>
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
                  style={{ background: '#3b82f620', color: '#60a5fa', border: '1px solid #3b82f640' }}>{t('홈', 'Home')}</span>
              </div>
            </div>
            {/* 한 줄 요약 (선발 매치업 코멘트 포함) */}
            {ins?.summary && (
              <div className="px-4 pb-4">
                <div className="rounded-xl px-3.5 py-2.5"
                  style={{ background: '#1e293b60', border: '1px solid #334155' }}>
                  <p className="text-[12px] leading-relaxed text-center break-keep" style={{ color: '#cbd5e1' }}>
                    {ins.summary
                      .split(homeTeam).join(HN)
                      .split(awayTeam).join(AN)}
                  </p>
                </div>
              </div>
            )}
          </Section>

          {/* 총점 지표 - 배당 기준선 있을 때만 표시 */}
          {ouLine !== null && (
          <Section color="#f97316" label={t('총점 지표', 'Over/Under')}
            badge={<span className="text-[10px]" style={{ color: '#64748b' }}>{t('기준', 'Line')} {ouLine}</span>}>
            <div className="p-3">
              <div className="flex items-center justify-center mb-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ background: '#f9731618', border: '1px solid #f9731650' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#f97316' }} />
                  <span className="text-xs font-bold" style={{ color: '#f97316' }}>{t('기준', 'Line')} {ouLine}</span>
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
                        style={{ background: c + '25', color: c }}>{t('우세', 'Favored')}</span>
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
              <Section color="#f59e0b" label={t('최근 10경기 홈 / 원정 전적', 'Last 10 Home/Away Record')}>
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {[
                      { label: t('원정 승률', 'Away Win%'), val: ins.homeAdvantage.awayRecord, name: AN, c: '#ef4444' },
                      { label: t('홈 승률', 'Home Win%'),   val: ins.homeAdvantage.homeRecord, name: HN, c: '#3b82f6' },
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
                        {t('홈 어드밴티지', 'Home Advantage')} +{(ins.homeAdvantage.advantage * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              </Section>

              {/* 최근 10경기 + 신뢰도 */}
              <Section color="#06b6d4" label={t('최근 10경기 승률', 'Last 10 Win Rate')}>
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
                    <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>{t('분석 신뢰도', 'Confidence')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: confMapData[pred.confidence]?.color ?? '#94a3b8',
                          boxShadow: `0 0 6px ${confMapData[pred.confidence]?.color ?? '#94a3b8'}` }} />
                      <span className="text-sm font-bold"
                        style={{ color: confMapData[pred.confidence]?.color ?? '#94a3b8' }}>
                        {confMapData[pred.confidence] ? t(confMapData[pred.confidence].ko, confMapData[pred.confidence].en) : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </Section>

              {/* 선발투수 매치업 (실제 데이터 있을 때만) */}
              {(() => {
                const pitcherFactor = ins.keyFactors.find(f => f.name === '선발투수 ERA' || f.name === 'Starter ERA')
                if (!pitcherFactor || !dq?.hasPitcherData) return null
                // description: "원정 0.00 vs 홈 3.60 (원정 우세)"
                const m = pitcherFactor.description.match(/원정\s*([\d.]+)\s*vs\s*홈\s*([\d.]+)/)
                if (!m) return null
                const awayEra = parseFloat(m[1])
                const homeEra = parseFloat(m[2])
                const eraDiff = Math.abs(awayEra - homeEra)
                const awayBetter = awayEra < homeEra
                const aceTeam = awayBetter ? AN : HN
                const aceColor = awayBetter ? '#ef4444' : '#3b82f6'
                const tier =
                  eraDiff >= 1.5 ? { ko: '압도적 우위', en: 'Dominant edge' } :
                  eraDiff >= 0.75 ? { ko: '뚜렷한 우위', en: 'Clear edge' } :
                  eraDiff >= 0.3 ? { ko: '소폭 우위', en: 'Slight edge' } :
                  { ko: '대등', en: 'Even' }
                return (
                  <Section color="#a78bfa" label={t('선발 투수 매치업', 'Starter Matchup')}
                    badge={
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: aceColor + '20', color: aceColor, border: `1px solid ${aceColor}40` }}>
                        {t(tier.ko, tier.en)}
                      </span>
                    }>
                    <div className="p-3">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {[
                          { name: AN, era: awayEra, c: '#ef4444', isAce: awayBetter },
                          { name: HN, era: homeEra, c: '#3b82f6', isAce: !awayBetter },
                        ].map(({ name, era, c, isAce }) => {
                          const showAce = isAce && eraDiff >= 0.3
                          return (
                            <div key={name} className="rounded-xl pt-2 pb-3 px-2 text-center"
                              style={{ background: c + '12', border: `1px solid ${isAce ? c + '60' : c + '30'}` }}>
                              <div className="h-[16px] flex items-center justify-center mb-1">
                                {showAce ? (
                                  <span className="text-[9px] font-black px-1.5 py-[1px] rounded-full tracking-wider"
                                    style={{ background: c, color: '#fff' }}>ACE</span>
                                ) : (
                                  <span className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>ERA</span>
                                )}
                              </div>
                              <p className="text-2xl font-black leading-none" style={{ color: c }}>{era.toFixed(2)}</p>
                              <p className="text-[10px] mt-1.5 truncate font-medium" style={{ color: '#94a3b8' }}>{name}</p>
                            </div>
                          )
                        })}
                      </div>
                      {eraDiff >= 0.3 && (
                        <div className="text-center py-2 px-3 rounded-xl"
                          style={{ background: aceColor + '10', border: `1px solid ${aceColor}25` }}>
                          <p className="text-[11px] font-semibold leading-snug break-keep" style={{ color: aceColor }}>
                            {t(`${aceTeam} 마운드 우세 (ERA ${Math.min(awayEra, homeEra).toFixed(2)})`,
                               `${aceTeam} mound edge (ERA ${Math.min(awayEra, homeEra).toFixed(2)})`)}
                          </p>
                        </div>
                      )}
                      {dq.pitcherAdjustment != null && Math.abs(dq.pitcherAdjustment) >= 1 && (
                        <p className="text-[10px] text-center mt-2 break-keep" style={{ color: '#64748b' }}>
                          {t(`승률 보정 ${dq.pitcherAdjustment > 0 ? '+' : ''}${dq.pitcherAdjustment.toFixed(1)}%p`,
                             `Win% adjustment ${dq.pitcherAdjustment > 0 ? '+' : ''}${dq.pitcherAdjustment.toFixed(1)}%p`)}
                        </p>
                      )}
                    </div>
                  </Section>
                )
              })()}

              {/* 최근 10경기 팀 생산력 (득실점/안타) */}
              {ins.teamForm && (ins.teamForm.home.games > 0 || ins.teamForm.away.games > 0) && (() => {
                const tf = ins.teamForm!
                const h = tf.home
                const a = tf.away
                const scoredDiff = a.scored - h.scored
                const scoredLead = Math.abs(scoredDiff) >= 0.5
                  ? (scoredDiff > 0 ? { side: 'away', c: '#ef4444', name: AN } : { side: 'home', c: '#3b82f6', name: HN })
                  : null
                const concededDiff = a.conceded - h.conceded
                const concededLead = Math.abs(concededDiff) >= 0.5
                  ? (concededDiff < 0 ? { side: 'away', c: '#ef4444', name: AN } : { side: 'home', c: '#3b82f6', name: HN })
                  : null
                return (
                  <Section color="#10b981" label={t('최근 10경기 팀 생산력', 'Last 10 Team Production')}
                    badge={<span className="text-[10px]" style={{ color: '#64748b' }}>{t('경기당', 'per game')}</span>}>
                    <div className="p-3">
                      {/* 3가지 지표 행: 득점 / 실점 / 안타 */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { key: 'scored',   label: t('득점', 'Runs'),     awayVal: a.scored,   homeVal: h.scored,   higherBetter: true  },
                          { key: 'conceded', label: t('실점', 'Allowed'),  awayVal: a.conceded, homeVal: h.conceded, higherBetter: false },
                          { key: 'hits',     label: t('안타', 'Hits'),     awayVal: a.hits,     homeVal: h.hits,     higherBetter: true  },
                        ].map(({ key, label, awayVal, homeVal, higherBetter }) => {
                          const diff = awayVal - homeVal
                          const meaningful = Math.abs(diff) >= (key === 'hits' ? 0.8 : 0.5)
                          const awayBetter = meaningful && (higherBetter ? diff > 0 : diff < 0)
                          const homeBetter = meaningful && (higherBetter ? diff < 0 : diff > 0)
                          const awayShare = computeBarShare(awayVal, homeVal, higherBetter)
                          return (
                            <div key={key} className="rounded-xl py-2.5 px-2 text-center"
                              style={{ background: '#131920', border: '1px solid #243044' }}>
                              <p className="text-[10px] font-semibold mb-1.5" style={{ color: '#94a3b8' }}>{label}</p>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[13px] font-black tabular-nums"
                                  style={{ color: awayBetter ? '#ef4444' : '#64748b' }}>
                                  {awayVal.toFixed(1)}
                                </span>
                                <span className="text-[9px]" style={{ color: '#334155' }}>vs</span>
                                <span className="text-[13px] font-black tabular-nums"
                                  style={{ color: homeBetter ? '#3b82f6' : '#64748b' }}>
                                  {homeVal.toFixed(1)}
                                </span>
                              </div>
                              <MirrorBar awayShare={awayShare} />
                            </div>
                          )
                        })}
                      </div>
                      {/* 득점 우위 하이라이트 */}
                      {scoredLead && (
                        <div className="text-center py-2 px-3 rounded-xl mb-2"
                          style={{ background: scoredLead.c + '10', border: `1px solid ${scoredLead.c}25` }}>
                          <p className="text-[11px] font-semibold break-keep" style={{ color: scoredLead.c }}>
                            {t(`${scoredLead.name} 타선 우세 (${Math.max(a.scored, h.scored).toFixed(1)}점/경기)`,
                               `${scoredLead.name} better offense (${Math.max(a.scored, h.scored).toFixed(1)} R/G)`)}
                          </p>
                        </div>
                      )}
                      {concededLead && (
                        <div className="text-center py-2 px-3 rounded-xl"
                          style={{ background: concededLead.c + '10', border: `1px solid ${concededLead.c}25` }}>
                          <p className="text-[11px] font-semibold break-keep" style={{ color: concededLead.c }}>
                            {t(`${concededLead.name} 수비 우세 (${Math.min(a.conceded, h.conceded).toFixed(1)}실점/경기)`,
                               `${concededLead.name} better defense (${Math.min(a.conceded, h.conceded).toFixed(1)} RA/G)`)}
                          </p>
                        </div>
                      )}
                    </div>
                  </Section>
                )
              })()}

              {/* 시즌 팀 스탯 (KBO: 타율/OPS/방어율/WHIP — 실측값) */}
              {ins.teamSeason && (ins.teamSeason.home || ins.teamSeason.away) && (() => {
                const ts = ins.teamSeason!
                const hs = ts.home
                const as = ts.away
                if (!hs && !as) return null

                // 의미 있는 차이 임계치
                const bigger = (aVal: number | null, hVal: number | null, thresh: number, higherBetter: boolean) => {
                  if (aVal == null || hVal == null) return null
                  const diff = aVal - hVal
                  if (Math.abs(diff) < thresh) return null
                  return (higherBetter ? diff > 0 : diff < 0) ? 'away' : 'home'
                }

                // 4개 카드: 팀 타율, OPS, 팀 방어율, 팀 WHIP
                const metrics: Array<{
                  key: string; label: string; awayVal: number | null; homeVal: number | null
                  fmt: (v: number) => string; higherBetter: boolean; thresh: number
                }> = [
                  { key: 'avg',  label: t('팀 타율', 'Team AVG'),  awayVal: as?.avg  ?? null, homeVal: hs?.avg  ?? null, fmt: v => v.toFixed(3), higherBetter: true,  thresh: 0.010 },
                  { key: 'ops',  label: t('팀 OPS', 'Team OPS'),   awayVal: as?.ops  ?? null, homeVal: hs?.ops  ?? null, fmt: v => v.toFixed(3), higherBetter: true,  thresh: 0.020 },
                  { key: 'era',  label: t('팀 방어율', 'Team ERA'), awayVal: as?.era  ?? null, homeVal: hs?.era  ?? null, fmt: v => v.toFixed(2), higherBetter: false, thresh: 0.30 },
                  { key: 'whip', label: t('팀 WHIP', 'Team WHIP'),  awayVal: as?.whip ?? null, homeVal: hs?.whip ?? null, fmt: v => v.toFixed(2), higherBetter: false, thresh: 0.08 },
                ]

                // 값이 하나도 없으면 숨김
                const anyValue = metrics.some(m => m.awayVal != null || m.homeVal != null)
                if (!anyValue) return null

                const seasonStatsSource = league === 'MLB' ? 'MLB' : league === 'KBO' ? 'KBO' : (league || '')
                return (
                  <Section color="#f59e0b" label={t('시즌 팀 스탯', 'Season Team Stats')}
                    badge={seasonStatsSource ? <span className="text-[10px]" style={{ color: '#64748b' }}>{seasonStatsSource}</span> : undefined}>
                    <div className="p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {metrics.map(({ key, label, awayVal, homeVal, fmt, higherBetter, thresh }) => {
                          const winner = bigger(awayVal, homeVal, thresh, higherBetter)
                          const hasBoth = awayVal != null && homeVal != null
                          const awayShare = hasBoth ? computeBarShare(awayVal, homeVal, higherBetter) : 50
                          return (
                            <div key={key} className="rounded-xl py-2.5 px-2.5"
                              style={{ background: '#131920', border: '1px solid #243044' }}>
                              <p className="text-[10px] font-semibold mb-1.5 text-center" style={{ color: '#94a3b8' }}>{label}</p>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[13px] font-black tabular-nums"
                                  style={{ color: winner === 'away' ? '#ef4444' : '#64748b' }}>
                                  {awayVal != null ? fmt(awayVal) : '-'}
                                </span>
                                <span className="text-[9px]" style={{ color: '#334155' }}>vs</span>
                                <span className="text-[13px] font-black tabular-nums"
                                  style={{ color: winner === 'home' ? '#3b82f6' : '#64748b' }}>
                                  {homeVal != null ? fmt(homeVal) : '-'}
                                </span>
                              </div>
                              {hasBoth && <MirrorBar awayShare={awayShare} />}
                            </div>
                          )
                        })}
                      </div>
                      {/* 팀명 라벨 */}
                      <div className="flex items-center justify-between mt-2 px-1">
                        <span className="text-[10px] font-semibold" style={{ color: '#ef4444' }}>● {AN}</span>
                        <span className="text-[10px] font-semibold" style={{ color: '#3b82f6' }}>{HN} ●</span>
                      </div>
                    </div>
                  </Section>
                )
              })()}
            </>
          )}

          {/* 팀 뉴스 요약 */}
          {(newsLoading || homeSummary || awaySummary) && (
            <Section color="#a78bfa" label={t('팀 뉴스', 'Team News')}>
              {newsLoading ? (
                <LoadingDots color="#a78bfa" />
              ) : (
                <div className="flex flex-col gap-3 p-4">
                  {awaySummary && (
                    <div className="rounded-2xl p-4" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#ef4444' }} />
                        <span className="text-[11px] font-bold tracking-wide uppercase" style={{ color: '#ef4444' }}>
                          {t('원정', 'Away')} · {AN}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {awaySummary.split(/\n|(?<=[.다니요])\s+/).filter(Boolean).map((sentence, i) => (
                          <p key={i} className="text-[13px] leading-relaxed" style={{ color: '#cbd5e1' }}>
                            {sentence.trim()}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {homeSummary && (
                    <div className="rounded-2xl p-4" style={{ background: '#3b82f610', border: '1px solid #3b82f630' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#60a5fa' }} />
                        <span className="text-[11px] font-bold tracking-wide uppercase" style={{ color: '#60a5fa' }}>
                          {t('홈', 'Home')} · {HN}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {homeSummary.split(/\n|(?<=[.다니요])\s+/).filter(Boolean).map((sentence, i) => (
                          <p key={i} className="text-[13px] leading-relaxed" style={{ color: '#cbd5e1' }}>
                            {sentence.trim()}
                          </p>
                        ))}
                      </div>
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