'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

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
  innings: {
    home: Record<string, number | null>
    away: Record<string, number | null>
  } | null
  odds: {
    homeWinProb: number
    awayWinProb: number
    homeWinOdds: number
    awayWinOdds: number
    overUnderLine: number
    overOdds: number
    underOdds: number
  } | null
}

// =====================================================
// 상수
// =====================================================
const LEAGUE_COLORS: Record<string, string> = {
  KBO: 'bg-red-500',
  NPB: 'bg-orange-500', 
  MLB: 'bg-blue-600',
  CPBL: 'bg-purple-500',
}

// 팀 로고 컴포넌트
function TeamLogo({ 
  src, 
  team, 
  size = 'md',
  className = ''
}: { 
  src?: string
  team: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
    xl: 'w-20 h-20 text-base',
  }
  
  if (src) {
    return (
      <img 
        src={src} 
        alt={team} 
        className={`${sizeClasses[size]} object-contain flex-shrink-0 ${className}`}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 flex-shrink-0 border-2 border-gray-300 ${className}`}>
      {team.slice(0, 2)}
    </div>
  )
}

// =====================================================
// 더미 데이터 (API 없는 섹션용)
// =====================================================

// 더미 데이터: 뉴스
const DUMMY_NEWS = [
  {
    id: 1,
    league: 'KBO',
    title: '삼성 외국인 선수 교체 임박, 새 에이스 영입 추진',
    titleEn: 'Samsung to replace foreign player, pursuing new ace',
    summary: '삼성 라이온즈가 부진한 외국인 투수를 대체할 새로운 선수 영입을 추진 중이다.',
    summaryEn: 'Samsung Lions pursuing new foreign pitcher to replace struggling player.',
    team: '삼성',
    date: '2시간 전',
    dateEn: '2h ago',
    featured: true,
  },
  {
    id: 2,
    league: 'MLB',
    title: '오타니 시즌 45-45 달성, 역사적인 기록 경신',
    titleEn: 'Ohtani achieves historic 45-45 season',
    summary: '오타니 쇼헤이가 MLB 역사상 최초로 45홈런-45도루를 달성했다.',
    summaryEn: 'Shohei Ohtani becomes first player in MLB history to hit 45 HR and steal 45 bases.',
    team: '다저스',
    date: '4시간 전',
    dateEn: '4h ago',
    featured: true,
  },
  {
    id: 3,
    league: 'NPB',
    title: '소프트뱅크 매직넘버 3, 우승 눈앞',
    titleEn: 'SoftBank magic number 3, championship in sight',
    summary: '소프트뱅크 호크스가 퍼시픽리그 우승에 한 걸음 더 다가섰다.',
    summaryEn: 'SoftBank Hawks one step closer to Pacific League championship.',
    team: '소프트뱅크',
    date: '5시간 전',
    dateEn: '5h ago',
    featured: false,
  },
  {
    id: 4,
    league: 'KBO',
    title: 'LG 트윈스 2년 연속 정규시즌 우승 확정',
    titleEn: 'LG Twins clinch 2nd consecutive regular season title',
    summary: 'LG 트윈스가 2년 연속 정규시즌 1위를 확정지었다.',
    summaryEn: 'LG Twins have clinched their second consecutive regular season championship.',
    team: 'LG',
    date: '6시간 전',
    dateEn: '6h ago',
    featured: false,
  },
  {
    id: 5,
    league: 'MLB',
    title: '다저스, 플레이오프 진출 확정',
    titleEn: 'Dodgers clinch playoff berth',
    summary: 'LA 다저스가 포스트시즌 진출을 확정했다.',
    summaryEn: 'Los Angeles Dodgers have clinched their postseason berth.',
    team: '다저스',
    date: '8시간 전',
    dateEn: '8h ago',
    featured: false,
  },
]

// 더미 데이터: 순위
const DUMMY_STANDINGS: Record<string, Array<{rank: number, team: string, teamEn: string, wins: number, losses: number, pct: string, gb: string}>> = {
  KBO: [
    { rank: 1, team: 'LG', teamEn: 'LG', wins: 82, losses: 47, pct: '.636', gb: '-' },
    { rank: 2, team: 'KT', teamEn: 'KT', wins: 78, losses: 51, pct: '.605', gb: '4.0' },
    { rank: 3, team: 'SSG', teamEn: 'SSG', wins: 75, losses: 54, pct: '.581', gb: '7.0' },
  ],
  NPB: [
    { rank: 1, team: '소프트뱅크', teamEn: 'SoftBank', wins: 78, losses: 42, pct: '.650', gb: '-' },
    { rank: 2, team: '오릭스', teamEn: 'Orix', wins: 72, losses: 48, pct: '.600', gb: '6.0' },
    { rank: 3, team: '요미우리', teamEn: 'Yomiuri', wins: 68, losses: 52, pct: '.567', gb: '10.0' },
  ],
  MLB: [
    { rank: 1, team: '다저스', teamEn: 'Dodgers', wins: 95, losses: 55, pct: '.633', gb: '-' },
    { rank: 2, team: '필리스', teamEn: 'Phillies', wins: 90, losses: 60, pct: '.600', gb: '5.0' },
    { rank: 3, team: '브루어스', teamEn: 'Brewers', wins: 88, losses: 62, pct: '.587', gb: '7.0' },
  ],
  CPBL: [
    { rank: 1, team: '라쿠텐', teamEn: 'Rakuten', wins: 62, losses: 38, pct: '.620', gb: '-' },
    { rank: 2, team: '웨이취안', teamEn: 'Wei Chuan', wins: 55, losses: 45, pct: '.550', gb: '7.0' },
    { rank: 3, team: '푸방', teamEn: 'Fubon', wins: 50, losses: 50, pct: '.500', gb: '12.0' },
  ],
}

// =====================================================
// 메인 컴포넌트
// =====================================================
export default function BaseballMainPage() {
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')
  const [newsLeague, setNewsLeague] = useState('ALL')
  const [standingsLeague, setStandingsLeague] = useState('KBO')
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const tickerRef = useRef<HTMLDivElement>(null)

  // API에서 경기 데이터 가져오기
  useEffect(() => {
    async function fetchMatches() {
      setLoading(true)
      try {
        const url = selectedLeague === 'ALL' 
          ? '/api/baseball/matches?limit=50'
          : `/api/baseball/matches?league=${selectedLeague}&limit=50`
        
        const response = await fetch(url)
        const data = await response.json()
        
        if (data.success) {
          setMatches(data.matches)
        }
      } catch (err) {
        console.error('Failed to fetch matches:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchMatches()
  }, [selectedLeague])

  // 필터링된 뉴스
  const filteredNews = newsLeague === 'ALL' 
    ? DUMMY_NEWS 
    : DUMMY_NEWS.filter(news => news.league === newsLeague)

  const featuredNews = DUMMY_NEWS.filter(n => n.featured)

  // TOP PICK 선정 (확률 차이 가장 큰 경기)
  const topPick = matches.length > 0 
    ? matches.reduce((best, match) => {
        if (!match.odds) return best
        const diff = Math.abs(match.odds.homeWinProb - match.odds.awayWinProb)
        const bestDiff = best?.odds ? Math.abs(best.odds.homeWinProb - best.odds.awayWinProb) : 0
        return diff > bestDiff ? match : best
      }, matches[0])
    : null

  return (
    <div className="min-h-screen bg-gray-200">
      
      {/* ===== 헤더 ===== */}
      <header className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors text-xl">⚽</Link>
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 text-xl">⚾</span>
                <span className="text-xl font-bold">
                  <span className="text-gray-800">BASEBALL</span>
                  <span className="text-emerald-500">TREND</span>
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-all border border-gray-300"
            >
              {language === 'ko' ? '🇰🇷 한국어' : '🇺🇸 English'}
            </button>
          </div>
        </div>
      </header>

      {/* ===== 스코어 티커 ===== */}
      <div className="bg-white border-b border-gray-300 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div 
            ref={tickerRef}
            className="flex overflow-x-auto scrollbar-hide"
          >
            {loading ? (
              <div className="flex items-center justify-center w-full py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              matches.slice(0, 10).map((match) => (
                <Link
                  key={match.id}
                  href={`/baseball/${match.id}`}
                  className="flex-shrink-0 flex items-center gap-3 px-5 py-3 border-r border-gray-200 hover:bg-gray-50 transition-colors min-w-[220px]"
                >
                  {/* 리그 뱃지 */}
                  <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded shadow-sm ${LEAGUE_COLORS[match.league]}`}>
                    {match.league}
                  </span>
                  
                  {/* 팀 & 스코어 */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TeamLogo src={match.awayLogo} team={match.awayTeamKo} size="sm" />
                        <span className={`text-sm ${match.status === 'FT' && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                          {language === 'ko' ? match.awayTeamKo : match.awayTeam}
                        </span>
                      </div>
                      <span className={`font-mono font-bold text-sm ${match.status === 'FT' && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? 'text-gray-900' : 'text-gray-400'}`}>
                        {match.awayScore ?? '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TeamLogo src={match.homeLogo} team={match.homeTeamKo} size="sm" />
                        <span className={`text-sm ${match.status === 'FT' && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                          {language === 'ko' ? match.homeTeamKo : match.homeTeam}
                        </span>
                      </div>
                      <span className={`font-mono font-bold text-sm ${match.status === 'FT' && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? 'text-gray-900' : 'text-gray-400'}`}>
                        {match.homeScore ?? '-'}
                      </span>
                    </div>
                  </div>
                  
                  {/* 상태 */}
                  <div className="text-right w-12">
                    {match.status === 'FT' ? (
                      <span className="text-xs text-gray-500 font-medium">Final</span>
                    ) : (
                      <span className="text-xs text-gray-500">{match.time?.slice(0, 5)}</span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ===== 메인 컨텐츠 ===== */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* 상단: 피처드 + 사이드바 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* 피처드 (TOP PICK) - 2컬럼 */}
          <div className="lg:col-span-2">
            {topPick ? (
              <Link 
                href={`/baseball/${topPick.id}`}
                className="block relative overflow-hidden rounded-2xl bg-white shadow-xl hover:shadow-2xl transition-all group border border-gray-300"
              >
                {/* 상단 그라데이션 바 */}
                <div className="h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />
                
                <div className="p-6 md:p-8">
                  {/* 뱃지 */}
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-3 py-1.5 rounded-full bg-amber-400 text-amber-900 text-xs font-bold shadow">
                      🔥 TOP PICK
                    </span>
                    <span className={`text-xs font-bold text-white px-2 py-1 rounded shadow ${LEAGUE_COLORS[topPick.league]}`}>
                      {topPick.league}
                    </span>
                    <span className="text-sm text-gray-500 font-medium">
                      {topPick.date} {topPick.time?.slice(0, 5)}
                    </span>
                  </div>
                  
                  {/* 매치업 */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-8">
                      {/* 홈팀 */}
                      <div className="text-center">
                        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-3 border-2 border-gray-300 shadow-lg">
                          <TeamLogo src={topPick.homeLogo} team={topPick.homeTeamKo} size="xl" />
                        </div>
                        <div className="font-bold text-gray-800">
                          {language === 'ko' ? topPick.homeTeamKo : topPick.homeTeam}
                        </div>
                        <div className="text-xs text-gray-500">HOME</div>
                      </div>
                      
                      {/* VS + 확률 */}
                      <div className="text-center px-6">
                        {topPick.status === 'FT' ? (
                          <div className="text-4xl font-black text-gray-800 mb-2">
                            {topPick.homeScore} - {topPick.awayScore}
                          </div>
                        ) : (
                          <div className="text-4xl font-bold text-gray-300 mb-2">VS</div>
                        )}
                        {topPick.odds && (
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-emerald-600">{topPick.odds.homeWinProb}%</span>
                            <span className="text-gray-400">:</span>
                            <span className="text-lg font-bold text-blue-600">{topPick.odds.awayWinProb}%</span>
                          </div>
                        )}
                      </div>
                      
                      {/* 원정팀 */}
                      <div className="text-center">
                        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-3 border-2 border-gray-300 shadow-lg">
                          <TeamLogo src={topPick.awayLogo} team={topPick.awayTeamKo} size="xl" />
                        </div>
                        <div className="font-bold text-gray-800">
                          {language === 'ko' ? topPick.awayTeamKo : topPick.awayTeam}
                        </div>
                        <div className="text-xs text-gray-500">AWAY</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 확률 바 */}
                  {topPick.odds && (
                    <div className="mt-4">
                      <div className="h-3 rounded-full overflow-hidden bg-gray-200 flex shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                          style={{ width: `${topPick.odds.homeWinProb}%` }}
                        />
                        <div 
                          className="bg-gradient-to-r from-blue-400 to-blue-500 transition-all"
                          style={{ width: `${topPick.odds.awayWinProb}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <div className="rounded-2xl bg-white shadow-xl border border-gray-300 p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading...</p>
              </div>
            )}
          </div>
          
          {/* 사이드바: 순위 */}
          <div className="lg:col-span-1">
            <div className="rounded-xl bg-white shadow-xl overflow-hidden h-full border border-gray-300">
              {/* 헤더 */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b-2 border-gray-200">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  📊 {language === 'ko' ? '순위' : 'Standings'}
                </h3>
                <select
                  value={standingsLeague}
                  onChange={(e) => setStandingsLeague(e.target.value)}
                  className="text-xs bg-white border-2 border-gray-300 rounded-lg px-2 py-1.5 text-gray-600 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="KBO">KBO</option>
                  <option value="NPB">NPB</option>
                  <option value="MLB">MLB</option>
                  <option value="CPBL">CPBL</option>
                </select>
              </div>
              
              {/* 순위 목록 */}
              <div className="divide-y divide-gray-200">
                {DUMMY_STANDINGS[standingsLeague]?.map((team) => (
                  <div key={team.rank} className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                    <span className={`w-6 text-sm font-bold ${
                      team.rank === 1 ? 'text-amber-500' : 
                      team.rank === 2 ? 'text-gray-400' :
                      team.rank === 3 ? 'text-amber-700' : 'text-gray-400'
                    }`}>
                      {team.rank}
                    </span>
                    <TeamLogo team={language === 'ko' ? team.team : team.teamEn} size="sm" className="mr-2" />
                    <span className="flex-1 text-sm font-bold text-gray-800">
                      {language === 'ko' ? team.team : team.teamEn}
                    </span>
                    <span className="text-xs text-gray-500 w-16 text-right font-medium">
                      {team.wins}-{team.losses}
                    </span>
                    <span className="text-xs text-emerald-600 w-12 text-right font-bold font-mono">
                      {team.pct}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* 더보기 */}
              <Link 
                href="/baseball/standings"
                className="block px-4 py-3 text-center text-sm text-gray-500 hover:text-emerald-600 border-t-2 border-gray-200 transition-colors font-bold bg-gray-50"
              >
                {language === 'ko' ? '전체 순위 보기' : 'View Full Standings'} →
              </Link>
            </div>
          </div>
        </div>

        {/* ===== 오늘의 경기 ===== */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              📅 {language === 'ko' ? '경기 목록' : 'Match List'}
            </h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 border border-gray-300">
              {['ALL', 'KBO', 'NPB', 'MLB', 'CPBL'].map((league) => (
                <button
                  key={league}
                  onClick={() => setSelectedLeague(league)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    selectedLeague === league
                      ? 'bg-white text-gray-800 shadow-md border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {league === 'ALL' ? (language === 'ko' ? '전체' : 'All') : league}
                </button>
              ))}
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {matches.slice(0, 10).map((match) => (
                <Link
                  key={match.id}
                  href={`/baseball/${match.id}`}
                  className="flex-shrink-0 w-[300px] rounded-xl bg-white shadow-xl hover:shadow-2xl transition-all overflow-hidden border border-gray-300 group"
                >
                  {/* 리그 컬러 바 */}
                  <div className={`h-1.5 ${LEAGUE_COLORS[match.league]}`} />
                  
                  {/* 상단 바 */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-b-2 border-gray-200">
                    <span className={`text-xs font-bold text-white px-2 py-0.5 rounded shadow-sm ${LEAGUE_COLORS[match.league]}`}>
                      {match.league}
                    </span>
                    {match.status === 'FT' ? (
                      <span className="text-xs text-gray-500 font-bold">Final</span>
                    ) : (
                      <span className="text-xs text-gray-500 font-medium">{match.time?.slice(0, 5)}</span>
                    )}
                  </div>
                  
                  {/* 팀 */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <TeamLogo src={match.awayLogo} team={match.awayTeamKo} size="md" />
                        <span className="font-bold text-gray-800">
                          {language === 'ko' ? match.awayTeamKo : match.awayTeam}
                        </span>
                      </div>
                      <span className="text-2xl font-black text-gray-800 font-mono">
                        {match.awayScore ?? '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TeamLogo src={match.homeLogo} team={match.homeTeamKo} size="md" />
                        <span className="font-bold text-gray-800">
                          {language === 'ko' ? match.homeTeamKo : match.homeTeam}
                        </span>
                      </div>
                      <span className="text-2xl font-black text-gray-800 font-mono">
                        {match.homeScore ?? '-'}
                      </span>
                    </div>
                    
                    {/* 확률 바 */}
                    {match.odds && (
                      <div className="mt-4 pt-3 border-t-2 border-gray-200">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className={`font-bold ${match.odds.awayWinProb > match.odds.homeWinProb ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {match.odds.awayWinProb}%
                          </span>
                          <span className="text-gray-400 text-[10px] font-medium">WIN PROBABILITY</span>
                          <span className={`font-bold ${match.odds.homeWinProb > match.odds.awayWinProb ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {match.odds.homeWinProb}%
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-gray-300 overflow-hidden flex shadow-inner">
                          <div 
                            className={`h-full transition-all ${match.odds.awayWinProb > match.odds.homeWinProb ? 'bg-emerald-500' : 'bg-gray-400'}`}
                            style={{ width: `${match.odds.awayWinProb}%` }}
                          />
                          <div 
                            className={`h-full transition-all ${match.odds.homeWinProb > match.odds.awayWinProb ? 'bg-emerald-500' : 'bg-gray-400'}`}
                            style={{ width: `${match.odds.homeWinProb}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ===== 뉴스 섹션 ===== */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              📰 {language === 'ko' ? '리그 뉴스' : 'League News'}
            </h2>
            
            {/* 리그 필터 */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 border border-gray-300">
              {['ALL', 'KBO', 'NPB', 'MLB', 'CPBL'].map((league) => (
                <button
                  key={league}
                  onClick={() => setNewsLeague(league)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    newsLeague === league
                      ? 'bg-white text-gray-800 shadow-md border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {league === 'ALL' ? (language === 'ko' ? '전체' : 'All') : league}
                </button>
              ))}
            </div>
          </div>
          
          {/* 피처드 뉴스 (2개) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {featuredNews.slice(0, 2).map((news) => (
              <Link
                key={news.id}
                href={`/baseball/news/${news.id}`}
                className="group rounded-xl bg-white shadow-xl hover:shadow-2xl transition-all overflow-hidden border border-gray-300"
              >
                {/* 이미지 영역 */}
                <div className={`h-44 flex items-center justify-center relative ${
                  news.league === 'KBO' ? 'bg-gradient-to-br from-red-100 to-red-200' :
                  news.league === 'MLB' ? 'bg-gradient-to-br from-blue-100 to-blue-200' :
                  news.league === 'NPB' ? 'bg-gradient-to-br from-orange-100 to-orange-200' : 'bg-gradient-to-br from-purple-100 to-purple-200'
                }`}>
                  <TeamLogo team={news.team} size="xl" />
                </div>
                
                {/* 텍스트 */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold text-white px-2 py-0.5 rounded shadow-sm ${LEAGUE_COLORS[news.league]}`}>
                      {news.league}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">{language === 'ko' ? news.date : news.dateEn}</span>
                  </div>
                  <h3 className="font-bold text-gray-800 group-hover:text-emerald-600 transition-colors line-clamp-2 mb-2">
                    {language === 'ko' ? news.title : news.titleEn}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {language === 'ko' ? news.summary : news.summaryEn}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          
          {/* 일반 뉴스 리스트 */}
          <div className="rounded-xl bg-white shadow-xl divide-y divide-gray-200 border border-gray-300">
            {filteredNews.filter(n => !n.featured).slice(0, 4).map((news) => (
              <Link
                key={news.id}
                href={`/baseball/news/${news.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group"
              >
                {/* 아이콘 */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-200 ${
                  news.league === 'KBO' ? 'bg-red-100' :
                  news.league === 'MLB' ? 'bg-blue-100' :
                  news.league === 'NPB' ? 'bg-orange-100' : 'bg-purple-100'
                }`}>
                  <TeamLogo team={news.team} size="md" />
                </div>
                
                {/* 텍스트 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold text-white px-1.5 py-0.5 rounded shadow-sm ${LEAGUE_COLORS[news.league]}`}>
                      {news.league}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">{language === 'ko' ? news.date : news.dateEn}</span>
                  </div>
                  <h3 className="font-bold text-gray-800 group-hover:text-emerald-600 transition-colors line-clamp-1">
                    {language === 'ko' ? news.title : news.titleEn}
                  </h3>
                </div>
                
                {/* 화살표 */}
                <span className="text-gray-300 group-hover:text-emerald-500 transition-colors text-lg">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ===== AI 적중률 ===== */}
        <section>
          <div className="rounded-xl bg-white shadow-xl overflow-hidden border border-gray-300">
            {/* 그라데이션 바 */}
            <div className="h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
            
            <div className="p-6 flex items-center justify-between flex-wrap gap-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                  🎯 AI {language === 'ko' ? '예측 적중률' : 'Prediction Accuracy'}
                </h3>
                <p className="text-sm text-gray-500">
                  {language === 'ko' ? '2024 시즌 누적 기준' : '2024 Season Cumulative'}
                </p>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-4xl font-black text-emerald-600">67.2<span className="text-xl">%</span></div>
                  <div className="text-xs text-gray-500 font-bold">{language === 'ko' ? '전체' : 'Overall'}</div>
                </div>
                <div className="h-12 w-px bg-gray-300" />
                <div className="flex gap-6">
                  {[
                    { league: 'KBO', pct: '71.5%', color: 'text-red-500' },
                    { league: 'NPB', pct: '65.2%', color: 'text-orange-500' },
                    { league: 'MLB', pct: '68.4%', color: 'text-blue-600' },
                  ].map((item) => (
                    <div key={item.league} className="text-center">
                      <div className={`text-xl font-bold ${item.color}`}>{item.pct}</div>
                      <div className="text-xs text-gray-500 font-bold">{item.league}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ===== 푸터 ===== */}
      <footer className="mt-12 py-6 bg-white border-t border-gray-300 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 font-medium">
            © 2025 TrendSoccer · Baseball Trend Analysis
          </p>
        </div>
      </footer>
    </div>
  )
}