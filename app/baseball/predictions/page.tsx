'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '../../contexts/LanguageContext'

// =====================================================
// 타입 정의
// =====================================================
interface Match {
  id: number
  league: string
  leagueName: string
  date: string
  time: string
  timestamp: string
  homeTeam: string
  homeTeamKo: string
  homeLogo: string
  homeScore: number | null
  awayTeam: string
  awayTeamKo: string
  awayLogo: string
  awayScore: number | null
  status: string
  odds: {
    homeWinProb: number
    awayWinProb: number
    homeWinOdds: number
    awayWinOdds: number
    overUnderLine: number
    overOdds: number
    underOdds: number
  } | null
  mlPrediction?: {
    homeWinProb: number
    awayWinProb: number
  } | null
  aiPick?: string | null
  aiPickConfidence?: string | null
  homePitcher?: string | null
  homePitcherId?: number | null
  awayPitcher?: string | null
  awayPitcherId?: number | null
}

interface PredictionResult {
  match: Match
  prediction: {
    homeWinProb: number
    awayWinProb: number
    recommendedBet: 'HOME' | 'AWAY' | 'NONE'
    confidence: number
    grade: 'PICK' | 'GOOD' | 'PASS'
    reason: string
    reasonEn: string
    isML: boolean
  }
}

// =====================================================
// 상수
// =====================================================
const LEAGUES = [
  { id: 'ALL', name: '전체', nameEn: 'All' },
  { id: 'KBO', name: 'KBO', nameEn: 'KBO' },
  { id: 'MLB', name: 'MLB', nameEn: 'MLB' },
  { id: 'NPB', name: 'NPB', nameEn: 'NPB' },
  { id: 'CPBL', name: 'CPBL', nameEn: 'CPBL' },
]

const LEAGUE_COLOR_HEX: Record<string, string> = {
  KBO: '#dc2626',
  NPB: '#ea580c',
  MLB: '#2563eb',
  CPBL: '#7c3aed',
}

// =====================================================
// 유틸리티 함수
// =====================================================

function calculatePrediction(match: Match): PredictionResult['prediction'] {
  // ✅ 1순위: DB에 저장된 AI pick
  if (match.aiPick && (match.aiPick === 'PICK' || match.aiPick === 'GOOD' || match.aiPick === 'PASS')) {
    const grade = match.aiPick as 'PICK' | 'GOOD' | 'PASS'
    const homeProb = match.odds?.homeWinProb ?? 50
    const awayProb = match.odds?.awayWinProb ?? 50
    const recommendedBet: 'HOME' | 'AWAY' | 'NONE' = grade !== 'PASS'
      ? (homeProb >= awayProb ? 'HOME' : 'AWAY')
      : 'NONE'
    const reason = grade === 'PICK'
      ? (homeProb >= awayProb ? '홈팀 압도적 우세' : '원정팀 압도적 우세')
      : grade === 'GOOD'
      ? (homeProb >= awayProb ? '홈팀 우세 예상' : '원정팀 우세 예상')
      : '접전 예상 - 신중한 접근 필요'
    const reasonEn = grade === 'PICK'
      ? (homeProb >= awayProb ? 'Home team dominant' : 'Away team dominant')
      : grade === 'GOOD'
      ? (homeProb >= awayProb ? 'Home team favored' : 'Away team favored')
      : 'Close match - proceed with caution'
    return { homeWinProb: homeProb, awayWinProb: awayProb, recommendedBet, confidence: Math.max(homeProb, awayProb), grade, reason, reasonEn, isML: true }
  }

  // ✅ 2순위: ML 예측값
  const ml = match.mlPrediction
  const odds = match.odds
  const source = ml ?? (odds ? { homeWinProb: odds.homeWinProb, awayWinProb: odds.awayWinProb } : null)
  const isML = !!ml

  if (!source) {
    return {
      homeWinProb: 50, awayWinProb: 50,
      recommendedBet: 'NONE', confidence: 0,
      grade: 'PASS', reason: '데이터 없음', reasonEn: 'No data', isML: false,
    }
  }

  const homeProb = source.homeWinProb
  const awayProb = source.awayWinProb
  const diff = Math.abs(homeProb - awayProb)

  let grade: 'PICK' | 'GOOD' | 'PASS' = 'PASS'
  let recommendedBet: 'HOME' | 'AWAY' | 'NONE' = 'NONE'
  let reason = ''
  let reasonEn = ''

  if (diff >= 20) {
    grade = 'PICK'
    recommendedBet = homeProb > awayProb ? 'HOME' : 'AWAY'
    reason = homeProb > awayProb ? '홈팀 압도적 우세' : '원정팀 압도적 우세'
    reasonEn = homeProb > awayProb ? 'Home team dominant' : 'Away team dominant'
  } else if (diff >= 10) {
    grade = 'GOOD'
    recommendedBet = homeProb > awayProb ? 'HOME' : 'AWAY'
    reason = homeProb > awayProb ? '홈팀 우세 예상' : '원정팀 우세 예상'
    reasonEn = homeProb > awayProb ? 'Home team favored' : 'Away team favored'
  } else {
    grade = 'PASS'
    reason = '접전 예상 - 신중한 접근 필요'
    reasonEn = 'Close match - proceed with caution'
  }

  return { homeWinProb: homeProb, awayWinProb: awayProb, recommendedBet, confidence: Math.max(homeProb, awayProb), grade, reason, reasonEn, isML }
}

function formatDate(dateStr: string, lang: 'ko' | 'en'): string {
  const date = new Date(dateStr)
  if (lang === 'ko') {
    return date.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric', weekday: 'short' })
  }
  return date.toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric', weekday: 'short' })
}

function formatDateFull(dateStr: string, lang: 'ko' | 'en'): string {
  const date = new Date(dateStr)
  if (lang === 'ko') {
    return date.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' })
  }
  return date.toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' })
}

function formatTimeKST(timestamp: string): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).slice(0, 5)
}

// =====================================================
// 컴포넌트
// =====================================================

function TeamLogo({ src, team, size = 'md' }: { src?: string; team: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-14 h-14 text-base' }
  if (src) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-white flex items-center justify-center flex-shrink-0 p-1 shadow-sm`}>
        <img src={src} alt={team} className="w-full h-full object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      </div>
    )
  }
  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-gray-400`}
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {team.substring(0, 2)}
    </div>
  )
}

function GradeBadge({ grade, size = 'sm' }: { grade: 'PICK' | 'GOOD' | 'PASS'; size?: 'sm' | 'lg' }) {
  const styles = {
    PICK: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', shadow: '0 0 10px rgba(245,158,11,0.3)' },
    GOOD: { bg: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', shadow: 'none' },
    PASS: { bg: '#374151', color: '#9ca3af', shadow: 'none' },
  }
  const s = styles[grade]
  const sizeClass = size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[10px]'
  return (
    <span
      className={`${sizeClass} rounded font-black tracking-widest`}
      style={{ background: s.bg, color: s.color, boxShadow: s.shadow, letterSpacing: '0.08em' }}
    >
      {grade}
    </span>
  )
}

function ConfidenceBar({ homeProb, awayProb, language }: {
  homeProb: number
  awayProb: number
  language: 'ko' | 'en'
}) {
  const pickedSide = homeProb > awayProb ? 'home' : 'away'
  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] mb-1.5">
        <span className={pickedSide === 'away' ? 'text-emerald-400 font-bold' : 'text-gray-500'}>{awayProb}%</span>
        <span className="text-[10px] text-gray-600">{language === 'ko' ? '승리 확률' : 'Win Prob.'}</span>
        <span className={pickedSide === 'home' ? 'text-emerald-400 font-bold' : 'text-gray-500'}>{homeProb}%</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: '#1e293b' }}>
        <div
          className="h-full rounded-l-full transition-all duration-700"
          style={{
            width: `${awayProb}%`,
            background: pickedSide === 'away' ? 'linear-gradient(90deg, #10b981, #34d399)' : '#475569',
          }}
        />
        <div className="w-[2px]" style={{ background: '#0a0a0f' }} />
        <div
          className="h-full rounded-r-full transition-all duration-700"
          style={{
            width: `${homeProb}%`,
            background: pickedSide === 'home' ? 'linear-gradient(90deg, #34d399, #10b981)' : '#475569',
          }}
        />
      </div>
    </div>
  )
}

function SummaryDashboard({ stats, dateStr, language, onPrev, onNext }: {
  stats: { total: number; pick: number; good: number; pass: number }
  dateStr: string
  language: 'ko' | 'en'
  onPrev?: () => void
  onNext?: () => void
}) {
  return (
    <div className="rounded-2xl p-4 mb-5" style={{ background: 'linear-gradient(135deg, #111827, #13132a)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* 날짜 네비게이션 */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={onPrev}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-lg">
            {dateStr ? formatDateFull(dateStr, language) : (language === 'ko' ? '날짜 없음' : 'No date')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {language === 'ko' ? `${stats.total}경기 분석 완료` : `${stats.total} matches analyzed`}
          </p>
        </div>
        <button
          onClick={onNext}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* 등급별 통계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
          <GradeBadge grade="PICK" size="lg" />
          <p className="text-2xl font-black text-white mt-2">{stats.pick}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{language === 'ko' ? '확률차 20%↑' : 'Diff 20%↑'}</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
          <GradeBadge grade="GOOD" size="lg" />
          <p className="text-2xl font-black text-white mt-2">{stats.good}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{language === 'ko' ? '확률차 10-20%' : 'Diff 10-20%'}</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <GradeBadge grade="PASS" size="lg" />
          <p className="text-2xl font-black text-white mt-2">{stats.pass}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{language === 'ko' ? '확률차 10%↓' : 'Diff 10%↓'}</p>
        </div>
      </div>
    </div>
  )
}

function PredictionCard({ match, prediction, language, isPremium, isLoggedIn }: {
  match: Match
  prediction: PredictionResult['prediction']
  language: 'ko' | 'en'
  isPremium: boolean
  isLoggedIn: boolean
}) {
  const router = useRouter()
  const homeTeamName = language === 'ko' ? match.homeTeamKo || match.homeTeam : match.homeTeam
  const awayTeamName = language === 'ko' ? match.awayTeamKo || match.awayTeam : match.awayTeam
  const pickedTeam = prediction.recommendedBet === 'HOME' ? homeTeamName : awayTeamName
  const isPick = prediction.grade === 'PICK'

  const isLocked = !isPremium
  const leagueColor = LEAGUE_COLOR_HEX[match.league] || '#6b7280'

  return (
    <div
      className="rounded-xl overflow-hidden transition-all hover:translate-y-[-2px]"
      style={{
        background: '#111827',
        border: isPick ? '1px solid rgba(245,158,11,0.18)' : '1px solid rgba(255,255,255,0.05)',
        boxShadow: isPick ? '0 4px 24px rgba(245,158,11,0.05)' : '0 2px 10px rgba(0,0,0,0.3)',
      }}
    >
      {/* 리그 컬러 탑라인 */}
      <div className="h-[2px] w-full" style={{ background: leagueColor }} />

      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: leagueColor }}>
            {match.league}
          </span>
          <span className="text-[11px] text-gray-500 tabular-nums">
            {formatDate(match.timestamp || match.date, language)} {formatTimeKST(match.timestamp)}
          </span>
        </div>
        <GradeBadge grade={prediction.grade} />
      </div>

      {/* 팀 매치업 */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          {/* 원정팀 */}
          <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
            <TeamLogo src={match.awayLogo} team={match.awayTeam} size="lg" />
            <div className="text-center">
              <p className="font-bold text-white text-[13px] leading-tight truncate max-w-[100px]">{awayTeamName}</p>
              <span className="inline-block text-[10px] font-bold mt-1.5 px-2.5 py-[3px] rounded-full"
                style={{ background: '#ef4444', color: '#ffffff' }}>
                {language === 'ko' ? '원정' : 'Away'}
              </span>
            </div>
          </div>

          {/* VS */}
          <div className="flex-shrink-0 px-1">
            <span className="text-xs font-black text-gray-700">VS</span>
          </div>

          {/* 홈팀 */}
          <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
            <TeamLogo src={match.homeLogo} team={match.homeTeam} size="lg" />
            <div className="text-center">
              <p className="font-bold text-white text-[13px] leading-tight truncate max-w-[100px]">{homeTeamName}</p>
              <span className="inline-block text-[10px] font-bold mt-1.5 px-2.5 py-[3px] rounded-full"
                style={{ background: '#3b82f6', color: '#ffffff' }}>
                {language === 'ko' ? '홈' : 'Home'}
              </span>
            </div>
          </div>
        </div>

        {/* 선발투수 - MLB만 표시 */}
        {match.league === 'MLB' && (
          <div className="flex items-center justify-between mb-3 px-1 py-2 rounded-lg" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex-1 text-center">
              <p className="text-[9px] text-gray-600 mb-0.5">{language === 'ko' ? '선발' : 'SP'}</p>
              <p className="text-[11px] font-semibold text-gray-400">{match.awayPitcher ? match.awayPitcher.split(' ').pop() : '—'}</p>
            </div>
            <div className="w-px h-5 bg-gray-800" />
            <div className="flex-1 text-center">
              <p className="text-[9px] text-gray-600 mb-0.5">{language === 'ko' ? '선발' : 'SP'}</p>
              <p className="text-[11px] font-semibold text-gray-400">{match.homePitcher ? match.homePitcher.split(' ').pop() : '—'}</p>
            </div>
          </div>
        )}

        {/* 확률 바 + 예측 — PICK 잠금 시 통합 블러 */}
        {isLocked ? (
          <div className="relative rounded-xl overflow-hidden mt-1"
            style={{ border: '1px solid rgba(245,158,11,0.12)' }}>
            {/* 블러 배경 콘텐츠 */}
            <div className="blur-md pointer-events-none select-none px-3 py-3" aria-hidden="true">
              <ConfidenceBar homeProb={50} awayProb={50} language={language} />
              <div className="flex items-center gap-2 mt-3" style={{ background: 'rgba(6,78,59,0.12)', padding: '8px 12px', borderRadius: '8px' }}>
                <span className="text-emerald-400 font-bold text-sm">██████</span>
                <span className="text-[10px] text-gray-500">{language === 'ko' ? '승' : 'Win'}</span>
                <span className="text-emerald-300 font-black text-sm tabular-nums">●●%</span>
              </div>
            </div>
            {/* 잠금 오버레이 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{ background: 'rgba(10,10,15,0.92)' }}>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🔒</span>
                <span className="text-[12px] font-bold" style={{ color: '#fbbf24' }}>
                  PICK {language === 'ko' ? '프리미엄 전용' : 'Premium Only'}
                </span>
              </div>
              {isLoggedIn ? (
                <button
                  onClick={() => router.push('/premium/pricing')}
                  className="px-5 py-1.5 rounded-full text-[11px] font-bold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
                  {language === 'ko' ? '프리미엄 →' : 'Upgrade →'}
                </button>
              ) : (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => router.push('/login')}
                    className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
                    style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }}>
                    {language === 'ko' ? '로그인' : 'Sign in'}
                  </button>
                  <button
                    onClick={() => router.push('/premium/pricing')}
                    className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
                    {language === 'ko' ? '프리미엄 →' : 'Premium →'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <ConfidenceBar
            homeProb={prediction.homeWinProb}
            awayProb={prediction.awayWinProb}
            language={language}
          />
        )}
      </div>

      {/* 예측 영역 — 잠금이 아닌 경우만 */}
      {!isLocked && (
        prediction.recommendedBet !== 'NONE' ? (
          <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(6,78,59,0.12)', border: '1px solid rgba(16,185,129,0.08)' }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-emerald-400 font-bold text-[13px]">{pickedTeam}</span>
              <span className="text-[10px] text-gray-500">{language === 'ko' ? '승' : 'Win'}</span>
              <span className="text-emerald-300 font-black text-[13px] ml-auto tabular-nums">{prediction.confidence}%</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 pl-3.5">
              {language === 'ko' ? prediction.reason : prediction.reasonEn}
            </p>
          </div>
        ) : (
          <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-gray-500">
              {language === 'ko' ? prediction.reason : prediction.reasonEn}
            </p>
          </div>
        )
      )}

      {/* 상세 분석 링크 */}
      <Link
        href={`/baseball/${match.id}`}
        className="flex items-center justify-center gap-1.5 px-4 py-3 text-[13px] font-semibold text-blue-400 hover:text-blue-300 transition-colors hover:bg-white/[0.02]"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        {language === 'ko' ? '상세 분석 보기' : 'View Details'}
        <span className="text-sm">→</span>
      </Link>
    </div>
  )
}

// =====================================================
// 메인 페이지 컴포넌트
// =====================================================
export default function BaseballPredictionsPage() {
  const { language } = useLanguage()
  const { data: session } = useSession()
  const router = useRouter()
  const isPremium = (session?.user as any)?.tier === 'premium'
  const isLoggedIn = !!session?.user

  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [predictions, setPredictions] = useState<PredictionResult[]>([])
  const [currentDate, setCurrentDate] = useState('')

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('status', 'scheduled')
        if (selectedLeague !== 'ALL') params.append('league', selectedLeague)
        params.append('limit', '50')

        const response = await fetch(`/api/baseball/matches?${params}`)
        const data = await response.json()

        if (data.success && data.matches && data.matches.length > 0) {
          // KST 기준 오늘 날짜
          const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
          const today = kstNow.toISOString().split('T')[0]

          // timestamp → KST 날짜 추출 헬퍼
          const getKSTDate = (m: Match) => {
            if (m.timestamp) {
              const d = new Date(new Date(m.timestamp).getTime() + 9 * 60 * 60 * 1000)
              return d.toISOString().split('T')[0]
            }
            return m.date
          }

          // ✅ 오늘 이후 경기만 (aiPick, odds, mlPrediction 중 하나라도 있으면 포함)
          const futureMatches = data.matches.filter((m: Match) => getKSTDate(m) >= today)
          const matchesWithData = futureMatches.filter(
            (m: Match) => m.odds !== null || m.mlPrediction != null || m.aiPick != null
          )

          if (matchesWithData.length > 0) {
            matchesWithData.sort((a: Match, b: Match) =>
              new Date(a.timestamp || a.date).getTime() - new Date(b.timestamp || b.date).getTime()
            )

            // ✅ KST 기준 가장 이른 날짜 하루치만 표시
            const earliestDate = getKSTDate(matchesWithData[0])
            setCurrentDate(earliestDate)

            const upcomingMatches = matchesWithData
              .filter((m: Match) => getKSTDate(m) === earliestDate)
              .slice(0, 30)

            setMatches(upcomingMatches)

            const preds = upcomingMatches.map((match: Match) => ({
              match,
              prediction: calculatePrediction(match),
            }))

            preds.sort((a: PredictionResult, b: PredictionResult) => {
              const gradeOrder = { PICK: 0, GOOD: 1, PASS: 2 }
              return gradeOrder[a.prediction.grade] - gradeOrder[b.prediction.grade]
            })

            setPredictions(preds)
          } else {
            setMatches([])
            setPredictions([])
          }
        } else {
          setMatches([])
          setPredictions([])
        }
      } catch (error) {
        console.error('Failed to fetch matches:', error)
        setMatches([])
        setPredictions([])
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [selectedLeague])

  const stats = {
    total: predictions.length,
    pick: predictions.filter(p => p.prediction.grade === 'PICK').length,
    good: predictions.filter(p => p.prediction.grade === 'GOOD').length,
    pass: predictions.filter(p => p.prediction.grade === 'PASS').length,
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      {/* 스티키 헤더: 리그 필터 */}
      <div className="sticky top-0 z-40" style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {LEAGUES.map(league => (
              <button key={league.id} onClick={() => setSelectedLeague(league.id)}
                className="px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all"
                style={{
                  background: selectedLeague === league.id ? '#2563eb' : 'rgba(255,255,255,0.06)',
                  color: selectedLeague === league.id ? '#fff' : '#9ca3af',
                  border: selectedLeague === league.id ? 'none' : '1px solid rgba(255,255,255,0.04)',
                }}>
                {language === 'ko' ? league.name : league.nameEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 pt-5 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
            <p className="text-gray-400">{language === 'ko' ? 'AI가 분석 중입니다...' : 'AI is analyzing...'}</p>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-12 h-12 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
              <path strokeLinecap="round" strokeWidth="1.5" d="M5.5 12c1.5-2 3.5-3 6.5-3s5 1 6.5 3M5.5 12c1.5 2 3.5 3 6.5 3s5-1 6.5-3" />
            </svg>
            <p className="text-gray-400">{language === 'ko' ? '예정된 경기가 없습니다' : 'No scheduled matches'}</p>
          </div>
        ) : (
          <>
            {/* 요약 대시보드 */}
            <SummaryDashboard stats={stats} dateStr={currentDate} language={language} />

            {/* PICK 섹션 */}
            {stats.pick > 0 && (
              <div className="mb-8">
                <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #f59e0b, #d97706)' }} />
                  TOP PICK
                  <span className="text-sm font-normal text-gray-500">({stats.pick})</span>
                </h2>

                {/* 프리미엄 유도 배너 */}
                {!isPremium && (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4 gap-3"
                    style={{ background: 'linear-gradient(135deg, #1c1a0e, #1a1507)', border: '1px solid rgba(245,158,11,0.18)' }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg">⚡</span>
                      <div>
                        <p className="text-xs font-bold" style={{ color: '#fbbf24' }}>
                          {language === 'ko'
                            ? `오늘 TOP PICK ${stats.pick}개`
                            : `${stats.pick} TOP PICK${stats.pick > 1 ? 's' : ''} today`}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {language === 'ko' ? '프리미엄에서 모든 PICK을 확인하세요' : 'Unlock all PICKs with Premium'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/premium/pricing')}
                      className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold text-white whitespace-nowrap transition-all active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
                      {language === 'ko' ? '업그레이드 →' : 'Upgrade →'}
                    </button>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {predictions.filter(p => p.prediction.grade === 'PICK').map(({ match, prediction }) => (
                    <PredictionCard key={match.id} match={match} prediction={prediction} language={language} isPremium={isPremium} isLoggedIn={isLoggedIn} />
                  ))}
                </div>
              </div>
            )}

            {/* GOOD 섹션 */}
            {stats.good > 0 && (
              <div className="mb-8">
                <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #10b981, #059669)' }} />
                  {language === 'ko' ? '추천 경기' : 'Recommended'}
                  <span className="text-sm font-normal text-gray-500">({stats.good})</span>
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {predictions.filter(p => p.prediction.grade === 'GOOD').map(({ match, prediction }) => (
                    <PredictionCard key={match.id} match={match} prediction={prediction} language={language} isPremium={isPremium} isLoggedIn={isLoggedIn} />
                  ))}
                </div>
              </div>
            )}

            {/* PASS 섹션 */}
            {stats.pass > 0 && (
              <div className="mb-8">
                <h2 className="text-base font-bold text-gray-400 mb-3 flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full bg-gray-600" />
                  {language === 'ko' ? '접전 예상' : 'Close Matches'}
                  <span className="text-sm font-normal text-gray-600">({stats.pass})</span>
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {predictions.filter(p => p.prediction.grade === 'PASS').map(({ match, prediction }) => (
                    <PredictionCard key={match.id} match={match} prediction={prediction} language={language} isPremium={isPremium} isLoggedIn={isLoggedIn} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* 면책 조항 - 인라인 */}
        <div className="text-center py-6 mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            {language === 'ko'
              ? 'AI 분석은 참고용이며, 실제 결과와 다를 수 있습니다. 책임감 있는 이용을 권장합니다.'
              : 'AI analysis is for reference only. Actual results may vary.'}
          </p>
        </div>
      </div>
    </div>
  )
}