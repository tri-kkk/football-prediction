'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '../../contexts/LanguageContext'
import BaseballAIPrediction from '../../components/BaseballAIPrediction'

// =====================================================
// 타입 정의
// =====================================================
interface MatchDetail {
  id: number
  league: string
  leagueName: string
  season: string
  date: string
  time: string
  timestamp: string
  venue: string | null
  home: {
    id: number
    team: string
    teamKo: string
    logo: string
    score: number | null
  }
  away: {
    id: number
    team: string
    teamKo: string
    logo: string
    score: number | null
  }
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
    bookmaker: string
    updatedAt: string
    ouLines: Array<{ line: number; over: number; under: number }> | null
  } | null
  oddsTrend: Array<{
    time: string
    homeProb: number
    awayProb: number
  }>
  h2h: Array<{
    id: number
    date: string
    homeTeam: string
    awayTeam: string
    homeScore: number
    awayScore: number
  }>
  teamStats: {
    home: {
      recentForm: string
      avgRuns: number
      winRate: number
    }
    away: {
      recentForm: string
      avgRuns: number
      winRate: number
    }
  } | null
  relatedMatches: Array<{
    id: number
    homeTeam: string
    awayTeam: string
    homeLogo: string
    awayLogo: string
    date: string
    time: string
    homeScore: number | null
    awayScore: number | null
    status: string
  }>
  // ✅ 선발 투수 (MLB만)
  homePitcher?: string | null
  homePitcherId?: number | null
  awayPitcher?: string | null
  awayPitcherId?: number | null
  // ✅ 선발 투수 한글 (KBO/NPB)
  homePitcherKo?: string | null
  awayPitcherKo?: string | null
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

const TEAM_NAME_KO: Record<string, string> = {
  // KBO
  'Hanwha Eagles': '한화',
  'LG Twins': 'LG',
  'Kiwoom Heroes': '키움',
  'Lotte Giants': '롯데',
  'Samsung Lions': '삼성',
  'Doosan Bears': '두산',
  'KT Wiz Suwon': 'KT',
  'KT Wiz': 'KT',
  'KIA Tigers': 'KIA',
  'NC Dinos': 'NC',
  'SSG Landers': 'SSG',
  // NPB
  'Hanshin Tigers': '한신',
  'Yomiuri Giants': '요미우리',
  'Hiroshima Carp': '히로시마',
  'Hiroshima Toyo Carp': '히로시마',
  'Yakult Swallows': '야쿠르트',
  'Yokohama BayStars': '요코하마',
  'Yokohama DeNA BayStars': '요코하마',
  'Chunichi Dragons': '주니치',
  'Fukuoka S. Hawks': '소프트뱅크',
  'SoftBank Hawks': '소프트뱅크',
  'Orix Buffaloes': '오릭스',
  'Chiba Lotte Marines': '지바롯데',
  'Lotte Marines': '지바롯데',
  'Rakuten Gold. Eagles': '라쿠텐',
  'Rakuten Eagles': '라쿠텐',
  'Seibu Lions': '세이부',
  'Nippon Ham Fighters': '니혼햄',
}

// MLB 팀 컬러 (배경용)
const MLB_TEAM_COLORS: Record<string, string> = {
  'Seattle Mariners':        '#005C5C',
  'Chicago Cubs':            '#0E3386',
  'New York Yankees':        '#003087',
  'Boston Red Sox':          '#BD3039',
  'Los Angeles Dodgers':     '#005A9C',
  'San Francisco Giants':    '#FD5A1E',
  'Houston Astros':          '#002D62',
  'Atlanta Braves':          '#CE1141',
  'New York Mets':           '#002D72',
  'Philadelphia Phillies':   '#E81828',
  'St.Louis Cardinals':      '#C41E3A',
  'Chicago White Sox':       '#27251F',
  'Milwaukee Brewers':       '#FFC52F',
  'Minnesota Twins':         '#002B5C',
  'Detroit Tigers':          '#0C2340',
  'Cleveland Guardians':     '#E31937',
  'Kansas City Royals':      '#004687',
  'Baltimore Orioles':       '#DF4601',
  'Tampa Bay Rays':          '#092C5C',
  'Toronto Blue Jays':       '#134A8E',
  'Texas Rangers':           '#003278',
  'Los Angeles Angels':      '#BA0021',
  'Oakland Athletics':       '#003831',
  'Athletics':               '#003831',
  'Arizona Diamondbacks':    '#A71930',
  'Colorado Rockies':        '#33006F',
  'San Diego Padres':        '#2F241D',
  'Miami Marlins':           '#00A3E0',
  'Washington Nationals':    '#AB0003',
  'Pittsburgh Pirates':      '#27251F',
  'Cincinnati Reds':         '#C6011F',
}

// =====================================================
// 팀 로고 컴포넌트
// =====================================================
function TeamLogo({ src, team, size = 'md' }: { src?: string; team: string; size?: 'sm' | 'md' | 'lg' }) {
  const wrapSize = { sm: 'w-8 h-8',   md: 'w-14 h-14', lg: 'w-18 h-18' }
  const imgSize  = { sm: 'w-5 h-5',   md: 'w-10 h-10', lg: 'w-14 h-14' }
  const pad      = { sm: 'p-1',       md: 'p-2',       lg: 'p-2' }

  if (src) {
    return (
      <div className={`${wrapSize[size]} ${pad[size]} rounded-full flex items-center justify-center flex-shrink-0`}
        style={{ background: 'rgba(255,255,255,0.93)' }}>
        <img
          src={src}
          alt={team}
          className={`${imgSize[size]} object-contain`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>
    )
  }

  return (
    <div className={`${wrapSize[size]} rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0`}
      style={{ background: 'rgba(255,255,255,0.15)', color: '#94a3b8' }}>
      {team.slice(0, 2)}
    </div>
  )
}

// =====================================================
// 선발 투수 이미지 (spots → headshot 순 fallback)
// =====================================================
function PitcherImage({ pitcherId, name }: { pitcherId: number; name: string }) {
  const [src, setSrc] = useState(
    `https://midfield.mlbstatic.com/v1/people/${pitcherId}/spots/240`
  )
  const [tried, setTried] = useState(false)

  return (
    <img
      src={src}
      alt={name}
      className="w-full h-full object-contain object-bottom"
      onError={() => {
        if (!tried) {
          setTried(true)
          // spots 없으면 headshot으로 fallback
          setSrc(`https://img.mlbstatic.com/mlb-photos/image/upload/w_300,h_360,g_north,c_fill/v1/people/${pitcherId}/headshot/67/current`)
        }
      }}
    />
  )
}

// =====================================================
// 메인 컴포넌트
// =====================================================
export default function BaseballDetailPage() {
  const params = useParams()
  const matchId = params?.id as string
  const { language } = useLanguage()
  const { data: session } = useSession()
  const router = useRouter()

  // 번역 헬퍼
  const t = (ko: string, en: string) => language === 'ko' ? ko : en

  // 프리미엄 여부 체크
  const isPremium = (session?.user as any)?.tier === 'premium'
  const isLoggedIn = !!session?.user
  
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // H2H와 팀 통계 state 추가
  const [h2hData, setH2hData] = useState<any>(null)
  const [homeStats, setHomeStats] = useState<any>(null)
  const [awayStats, setAwayStats] = useState<any>(null)
  
  // 선발 투수 스탯 (MLB만)
  const [homePitcherStats, setHomePitcherStats] = useState<any>(null)
  const [awayPitcherStats, setAwayPitcherStats] = useState<any>(null)

  // KBO/NPB 선발 투수 이름 (API-Sports lineups)
  const [kboNpbHomePitcher, setKboNpbHomePitcher] = useState<string | null>(null)
  const [kboNpbAwayPitcher, setKboNpbAwayPitcher] = useState<string | null>(null)
  const [kboNpbPitcherLoading, setKboNpbPitcherLoading] = useState(false)
  const [kboHomePitcherStats, setKboHomePitcherStats] = useState<any>(null)
  const [kboAwayPitcherStats, setKboAwayPitcherStats] = useState<any>(null)
  const [kboPitcherStatsFetched, setKboPitcherStatsFetched] = useState(false)

  // Claude AI 투수 분석
  const [pitcherAnalysis, setPitcherAnalysis] = useState<string | null>(null)
  const [pitcherAnalysisLoading, setPitcherAnalysisLoading] = useState(false)
  const pitcherAnalysisGenerated = useRef(false)

  // 라이브 폴링용 hits/errors (DB에서 갱신)
  const [liveHits, setLiveHits] = useState<{ home: number; away: number } | null>(null)
  const [liveErrors, setLiveErrors] = useState<{ home: number; away: number } | null>(null)

  // 사이드바: 오늘 경기 목록
  const [todayMatches, setTodayMatches] = useState<any[]>([])
  const [sidebarLeague, setSidebarLeague] = useState<string>('ALL')

  useEffect(() => {
    async function fetchMatch() {
      if (!matchId) return
      setLoading(true)
      setError(null)
      
      try {
        console.log('🔍 Fetching match:', matchId)
        
        // Query parameter 방식으로 호출
        const response = await fetch(`/api/baseball/matches?id=${matchId}`)
        console.log('📡 API Response status:', response.status)
        
        const data = await response.json()
        console.log('📦 API Response data:', data)
        
        if (data.success && data.matches && data.matches.length > 0) {
          // matches 배열의 첫 번째 경기
          const matchData = data.matches[0]
          console.log('⚾ Match data:', matchData)
          
          // MatchDetail 형식으로 변환
          const formattedMatch: MatchDetail = {
            id: matchData.id,
            league: matchData.league,
            leagueName: matchData.leagueName || matchData.league_name,
            season: matchData.season || '2025',
            date: matchData.date || matchData.match_date,
            time: matchData.time || '00:00',
            timestamp: matchData.timestamp || matchData.match_timestamp,
            venue: matchData.venue || null,
            home: {
              id: matchData.home_team_id || matchData.homeTeamId || 0,
              team: matchData.home_team || matchData.homeTeam,
              teamKo: matchData.home_team_ko || matchData.homeTeamKo || TEAM_NAME_KO[matchData.home_team || matchData.homeTeam] || matchData.home_team || matchData.homeTeam,
              logo: matchData.home_team_logo || matchData.homeLogo,
              score: matchData.home_score ?? matchData.homeScore ?? null
            },
            away: {
              id: matchData.away_team_id || matchData.awayTeamId || 0,
              team: matchData.away_team || matchData.awayTeam,
              teamKo: matchData.away_team_ko || matchData.awayTeamKo || TEAM_NAME_KO[matchData.away_team || matchData.awayTeam] || matchData.away_team || matchData.awayTeam,
              logo: matchData.away_team_logo || matchData.awayLogo,
              score: matchData.away_score ?? matchData.awayScore ?? null
            },
            status: matchData.status,
            innings: matchData.innings || null,
            odds: matchData.odds || null,
            oddsTrend: [],
            h2h: [],
            teamStats: null,
            relatedMatches: [],
            // ✅ 선발 투수
            homePitcher: matchData.homePitcher ?? null,
            homePitcherId: matchData.homePitcherId ?? null,
            awayPitcher: matchData.awayPitcher ?? null,
            awayPitcherId: matchData.awayPitcherId ?? null,
            homePitcherKo: matchData.homePitcherKo ?? null,
            awayPitcherKo: matchData.awayPitcherKo ?? null,
          }
          
          console.log('✅ Formatted match:', formattedMatch)
          setMatch(formattedMatch)
          
          // 경기 정보를 받은 후 H2H와 팀 통계 조회
          const homeTeamId = formattedMatch.home.id
          const awayTeamId = formattedMatch.away.id
          
          console.log('🆔 Team IDs:', { homeTeamId, awayTeamId })
          
          if (homeTeamId && awayTeamId && homeTeamId > 0 && awayTeamId > 0) {
            // 병렬로 H2H, 홈팀 통계, 원정팀 통계 조회
            console.log('📊 Fetching H2H and stats...')
            
            const [h2hRes, homeStatsRes, awayStatsRes] = await Promise.all([
              fetch(`/api/baseball/h2h?homeTeamId=${homeTeamId}&awayTeamId=${awayTeamId}`),
              fetch(`/api/baseball/team-stats?teamId=${homeTeamId}`),
              fetch(`/api/baseball/team-stats?teamId=${awayTeamId}`)
            ])
            
            const [h2h, homeS, awayS] = await Promise.all([
              h2hRes.json(),
              homeStatsRes.json(),
              awayStatsRes.json()
            ])
            
            console.log('📊 H2H:', h2h)
            console.log('📊 Home stats:', homeS)
            console.log('📊 Away stats:', awayS)
            
            if (h2h.success) setH2hData(h2h)
            if (homeS.success) setHomeStats(homeS)
            if (awayS.success) setAwayStats(awayS)
          } else {
            console.warn('⚠️ Team IDs not found or invalid (0), skipping H2H and stats')
            console.warn('   H2H와 팀 통계는 표시되지 않지만 경기 정보는 정상 표시됩니다.')
          }
          
        } else {
          console.error('❌ No match data:', data)
          setError(data.error || '경기 정보를 불러오는데 실패했습니다.')
        }
      } catch (err: any) {
        console.error('❌ Fetch error:', err)
        setError(err.message || '서버 연결에 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchMatch()
  }, [matchId])

  // MLB 선발 투수 스탯 fetch
  useEffect(() => {
    if (!match || match.league !== 'MLB') return

    const currentYear = new Date().getFullYear()
    const prevYear = currentYear - 1

    async function fetchOneSeason(pitcherId: number, season: number) {
      try {
        const res = await fetch(
          `https://statsapi.mlb.com/api/v1/people/${pitcherId}?hydrate=stats(group=[pitching],type=[season],season=${season})`,
          { signal: AbortSignal.timeout(5000) }
        )
        const data = await res.json()
        return data.people?.[0]?.stats?.[0]?.splits?.[0]?.stat ?? null
      } catch { return null }
    }

    async function fetchPitcherStats(pitcherId: number) {
      try {
        const [infoRes, currentStat, prevStat] = await Promise.all([
          fetch(`https://statsapi.mlb.com/api/v1/people/${pitcherId}`, { signal: AbortSignal.timeout(5000) })
            .then(r => r.json()).then(d => d.people?.[0]).catch(() => null),
          fetchOneSeason(pitcherId, currentYear),
          fetchOneSeason(pitcherId, prevYear),
        ])
        return {
          fullName: infoRes?.fullName,
          pitchHand: infoRes?.pitchHand?.description,
          current: currentStat ? { ...currentStat, season: currentYear } : null,
          prev: prevStat ? { ...prevStat, season: prevYear } : null,
        }
      } catch { return null }
    }

    async function loadPitcherStats() {
      const [homeS, awayS] = await Promise.all([
        match.homePitcherId ? fetchPitcherStats(match.homePitcherId) : Promise.resolve(null),
        match.awayPitcherId ? fetchPitcherStats(match.awayPitcherId) : Promise.resolve(null),
      ])
      setHomePitcherStats(homeS)
      setAwayPitcherStats(awayS)
    }

    loadPitcherStats()
  }, [match?.homePitcherId, match?.awayPitcherId, match?.league])

  // KBO/NPB 선발 투수 fetch (DB 우선, API-Sports fallback)
  useEffect(() => {
    if (!match || !matchId) return
    if (match.league !== 'KBO' && match.league !== 'NPB' && match.league !== 'CPBL') return

    // DB에 이미 선발 정보 있으면 바로 세팅
    if (match.homePitcherKo || match.awayPitcherKo) {
      setKboNpbHomePitcher(match.homePitcherKo ?? null)
      setKboNpbAwayPitcher(match.awayPitcherKo ?? null)
      return
    }

    // DB에 없으면 API-Sports lineups fallback
    async function fetchKboNpbLineups() {
      setKboNpbPitcherLoading(true)
      try {
        const res = await fetch(`/api/baseball/lineups?gameId=${matchId}`, {
          signal: AbortSignal.timeout(8000)
        })
        if (!res.ok) return
        const data = await res.json()
        if (data.success) {
          setKboNpbHomePitcher(data.homePitcher ?? null)
          setKboNpbAwayPitcher(data.awayPitcher ?? null)
        }
      } catch { /* 무시 */ } finally {
        setKboNpbPitcherLoading(false)
      }
    }

    fetchKboNpbLineups()
  }, [matchId, match?.league, match?.homePitcherKo, match?.awayPitcherKo])

  // KBO/NPB 선발 스탯 fetch
  useEffect(() => {
    if (!match || !kboNpbHomePitcher && !kboNpbAwayPitcher) return
    if (match.league !== 'KBO' && match.league !== 'NPB') return

    async function fetchKboPitcherStats() {
      const league = match!.league.toLowerCase()
      const params = new URLSearchParams({ season: '2025' })
      if (kboNpbHomePitcher) params.set('homePitcher', kboNpbHomePitcher)
      if (kboNpbAwayPitcher) params.set('awayPitcher', kboNpbAwayPitcher)
      if (match!.home.teamKo) params.set('homeTeam', match!.home.teamKo)
      if (match!.away.teamKo) params.set('awayTeam', match!.away.teamKo)

      try {
        const res = await fetch(`/api/baseball/kbo-pitcher-stats?${params}&league=${league}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.success) {
          setKboHomePitcherStats(data.homePitcher ?? null)
          setKboAwayPitcherStats(data.awayPitcher ?? null)
        }
      } catch { /* 무시 */ } finally {
        setKboPitcherStatsFetched(true)
      }
    }

    fetchKboPitcherStats()
  }, [kboNpbHomePitcher, kboNpbAwayPitcher, match?.league])

  // Claude API 투수 매치업 분석 - 스탯 로드 완료 후 실행
  useEffect(() => {
    if (!match) return

    // MLB: homePitcherStats / awayPitcherStats
    // KBO/NPB: kboHomePitcherStats / kboAwayPitcherStats
    const isMLB = match.league === 'MLB'
    const isKboNpb = match.league === 'KBO' || match.league === 'NPB'
    if (!isMLB && !isKboNpb) return

    // 변수명을 pitcherHomeStats/pitcherAwayStats로 변경 (위 state homeStats/awayStats와 충돌 방지)
    const pitcherHomeStats = isMLB ? homePitcherStats : kboHomePitcherStats
    const pitcherAwayStats = isMLB ? awayPitcherStats : kboAwayPitcherStats
    const homeName = isMLB ? match.homePitcher : kboNpbHomePitcher
    const awayName = isMLB ? match.awayPitcher : kboNpbAwayPitcher

    // KBO/NPB: 투수 이름은 세팅됐는데 stats fetch가 아직 완료되지 않았으면 대기
    if (isKboNpb && (kboNpbHomePitcher || kboNpbAwayPitcher) && !kboPitcherStatsFetched) return

    // stats도 이름도 없으면 분석 불가
    if (!pitcherHomeStats && !pitcherAwayStats) return

    // 이미 분석 있으면 재생성 안함 (← 체크를 뒤로 이동)
    if (pitcherAnalysisGenerated.current) return

    async function generateAnalysis() {
      pitcherAnalysisGenerated.current = true
      setPitcherAnalysisLoading(true)
      setPitcherAnalysis(null)

      try {
        const res = await fetch('/api/baseball/pitcher-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: match!.id,
            homeTeam: match!.home.teamKo,
            awayTeam: match!.away.teamKo,
            homePitcher: homeName,
            awayPitcher: awayName,
            homeStats: pitcherHomeStats,
            awayStats: pitcherAwayStats,
            league: match!.league,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'API error')
        setPitcherAnalysis(data.analysis ?? null)
      } catch (e) {
        console.error('Claude pitcher analysis error:', e)
      } finally {
        setPitcherAnalysisLoading(false)
      }
    }

    generateAnalysis()
  }, [match?.league, homePitcherStats, awayPitcherStats, kboHomePitcherStats, kboAwayPitcherStats, kboNpbHomePitcher, kboNpbAwayPitcher, kboPitcherStatsFetched])

  const isFinished = match?.status === 'FT'
  const isLive = match?.status?.startsWith('IN') ?? false
  const currentInning = isLive ? match!.status.replace('IN', '') : null

  // 라이브 경기 30초 폴링 (/api/baseball/live → API-Sports 직접 조회 + DB 업데이트)
  useEffect(() => {
    if (!matchId || !isLive) return

    async function pollLive() {
      try {
        const res = await fetch('/api/baseball/live')
        const data = await res.json()
        if (data.success && data.matches?.length > 0) {
          // matchId에 해당하는 경기만 찾기
          const m = data.matches.find((m: any) => String(m.id) === String(matchId))
          if (!m) return
          setMatch(prev => prev ? {
            ...prev,
            status: m.status,
            home: { ...prev.home, score: m.homeScore },
            away: { ...prev.away, score: m.awayScore },
            innings: m.innings,
          } : prev)
          setLiveHits({ home: m.homeHits, away: m.awayHits })
          setLiveErrors({ home: m.homeErrors, away: m.awayErrors })
        }
      } catch { /* 무시 */ }
    }

    pollLive()
    const interval = setInterval(pollLive, 30000)
    return () => clearInterval(interval)
  }, [matchId, isLive])

  // 사이드바: 오늘 경기 + 현재 경기와 같은 날짜 경기 fetch
  useEffect(() => {
    async function fetchSidebarMatches() {
      try {
        // 1) 오늘 경기
        const todayRes = await fetch('/api/baseball/matches?status=today&skipML=true')
        const todayData = await todayRes.json()
        let matches = todayData.success && todayData.matches ? todayData.matches : []

        // 2) 현재 경기 날짜가 오늘이 아니면 해당 날짜 경기도 추가
        if (match?.date) {
          const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
          const todayStr = kstNow.toISOString().split('T')[0]
          const matchDateStr = match.date.split('T')[0]
          if (matchDateStr !== todayStr) {
            try {
              const dateRes = await fetch(`/api/baseball/matches?date=${matchDateStr}&skipML=true`)
              const dateData = await dateRes.json()
              if (dateData.success && dateData.matches) {
                // 중복 제거 후 병합
                const existingIds = new Set(matches.map((m: any) => String(m.id)))
                const newMatches = dateData.matches.filter((m: any) => !existingIds.has(String(m.id)))
                matches = [...newMatches, ...matches]
              }
            } catch { /* 무시 */ }
          }
        }

        setTodayMatches(matches)
      } catch { /* 무시 */ }
    }
    fetchSidebarMatches()
  }, [match?.date])

  // 현재 경기 리그로 사이드바 탭 자동 선택
  useEffect(() => {
    if (match?.league) setSidebarLeague(match.league)
  }, [match?.league])

  // 이닝 스코어 배열
  const getInningsArray = () => {
    if (!match?.innings) return []
    const innings = []
    for (let i = 1; i <= 9; i++) {
      innings.push({
        inning: i,
        away: match.innings.away?.[i.toString()] ?? '-',
        home: match.innings.home?.[i.toString()] ?? '-',
      })
    }
    return innings
  }

  // 로딩
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">{t('로딩 중...', 'Loading...')}</p>
        </div>
      </div>
    )
  }

  // 에러
  if (error || !match) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <div className="bg-[#1a1f2e] rounded-lg shadow p-6 text-center max-w-sm w-full border border-gray-800/20">
          <div className="text-4xl mb-3">⚾</div>
          <h1 className="text-base font-bold text-white mb-2">{t('경기를 찾을 수 없습니다', 'Match not found')}</h1>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <Link href="/baseball" className="inline-block px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            {t('돌아가기', 'Back')}
          </Link>
        </div>
      </div>
    )
  }

  const innings = getInningsArray()

  return (
    <div className={`min-h-screen bg-[#0f0f0f] pb-20${isPremium ? ' premium-no-ads' : ''}`}>
      {/* 프리미엄 자동광고 숨김 */}
      {isPremium && (
        <style>{`
          .premium-no-ads ins.adsbygoogle,
          .premium-no-ads [id^="google_ads"],
          .premium-no-ads iframe[id^="aswift"] {
            display: none !important;
            height: 0 !important;
          }
        `}</style>
      )}

      {/* 모바일 경기 네비 - xl 미만에서만 표시 */}
      {todayMatches.length > 0 && (
        <div className="xl:hidden bg-[#141824] border-b border-gray-800/30">
          {/* 리그 탭 */}
          {(() => {
            const leagues = ['ALL', ...Array.from(new Set(todayMatches.map((m: any) => m.league))).sort()]
            return leagues.length > 2 ? (
              <div className="flex gap-1.5 px-3 pt-2.5 pb-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {leagues.map(lg => (
                  <button
                    key={lg}
                    onClick={() => setSidebarLeague(lg)}
                    className={`flex-shrink-0 px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      sidebarLeague === lg
                        ? lg === 'ALL' ? 'bg-gray-600 text-white' : `${LEAGUE_COLORS[lg] || 'bg-gray-600'} text-white`
                        : 'bg-gray-800/50 text-gray-500'
                    }`}
                  >
                    {lg}
                  </button>
                ))}
              </div>
            ) : <div className="pt-2" />
          })()}
          {/* 가로 스크롤 경기 카드 */}
          <div
            className="flex pb-2 px-2 gap-2"
            style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {todayMatches
              .filter((m: any) => sidebarLeague === 'ALL' || m.league === sidebarLeague)
              .map((m: any) => {
                const isCurrent = String(m.id) === String(matchId)
                const mIsLive = m.status?.startsWith('IN')
                const mIsDone = m.status === 'FT'
                const awayKo = m.awayTeamKo || m.away_team_ko || m.awayTeam || m.away_team || ''
                const homeKo = m.homeTeamKo || m.home_team_ko || m.homeTeam || m.home_team || ''
                const awayLogo = m.awayLogo || m.away_team_logo
                const homeLogo = m.homeLogo || m.home_team_logo
                const awayScore = m.awayScore ?? m.away_score ?? 0
                const homeScore = m.homeScore ?? m.home_score ?? 0
                return (
                  <Link
                    key={m.id}
                    href={`/baseball/${m.id}`}
                    className={`flex-shrink-0 flex flex-col justify-between px-2.5 py-2 rounded-lg min-w-[120px] transition-colors border ${
                      isCurrent
                        ? 'bg-blue-600/15 border-blue-500/40'
                        : 'bg-[#1a1f2e] border-gray-800/20 hover:bg-white/5'
                    }`}
                  >
                    {/* 상태 */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${LEAGUE_COLORS[m.league] || 'bg-gray-600'} text-white`}>
                        {m.league}
                      </span>
                      {mIsLive ? (
                        <span className="flex items-center gap-0.5 text-[9px] text-red-400 font-bold">
                          <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
                          LIVE
                        </span>
                      ) : mIsDone ? (
                        <span className="text-[9px] text-gray-600">{t('종료', 'Final')}</span>
                      ) : (
                        <span className="text-[9px] text-gray-500">
                          {m.match_timestamp ? new Date(m.match_timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : t('예정', 'TBD')}
                        </span>
                      )}
                    </div>
                    {/* 원정팀 */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center flex-shrink-0 p-0.5">
                        {awayLogo
                          ? <img src={awayLogo} alt="" className="w-full h-full object-contain" />
                          : <span className="text-[6px] text-gray-700 font-bold">{awayKo.slice(0, 2)}</span>}
                      </div>
                      <span className={`text-[11px] truncate flex-1 min-w-0 ${isCurrent ? 'text-white' : 'text-gray-400'}`}>{awayKo}</span>
                      {(mIsLive || mIsDone) && (
                        <span className={`text-xs font-bold tabular-nums ml-1 ${awayScore > homeScore ? 'text-white' : 'text-gray-600'}`}>{awayScore}</span>
                      )}
                    </div>
                    {/* 홈팀 */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center flex-shrink-0 p-0.5">
                        {homeLogo
                          ? <img src={homeLogo} alt="" className="w-full h-full object-contain" />
                          : <span className="text-[6px] text-gray-700 font-bold">{homeKo.slice(0, 2)}</span>}
                      </div>
                      <span className={`text-[11px] truncate flex-1 min-w-0 ${isCurrent ? 'text-white' : 'text-gray-400'}`}>{homeKo}</span>
                      {(mIsLive || mIsDone) && (
                        <span className={`text-xs font-bold tabular-nums ml-1 ${homeScore > awayScore ? 'text-white' : 'text-gray-600'}`}>{homeScore}</span>
                      )}
                    </div>
                  </Link>
                )
              })}
          </div>
        </div>
      )}

      {/* PC 3컬럼 레이아웃 */}
      <div className="max-w-7xl mx-auto flex gap-4 px-4 pt-4 items-start">

        {/* 왼쪽 사이드바 - PC only */}
        <aside className="hidden xl:block w-60 flex-shrink-0 sticky top-[72px] self-start">
          <div className="bg-[#1a1f2e] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#141824]">
              <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">{t('경기 목록', 'Match List')}</span>
              {/* 리그 탭 */}
              {(() => {
                const leagues = ['ALL', ...Array.from(new Set(todayMatches.map((m: any) => m.league))).sort()]
                return leagues.length > 2 ? (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {leagues.map(lg => (
                      <button
                        key={lg}
                        onClick={() => setSidebarLeague(lg)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                          sidebarLeague === lg
                            ? lg === 'ALL' ? 'bg-gray-600 text-white' : `${LEAGUE_COLORS[lg] || 'bg-gray-600'} text-white`
                            : 'bg-gray-800/60 text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {lg}
                      </button>
                    ))}
                  </div>
                ) : null
              })()}
            </div>
            <div className="divide-y divide-gray-800/30 overflow-y-auto scrollbar-none" style={{ maxHeight: 'calc(100vh - 120px)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {todayMatches.length === 0 ? (
                <p className="text-xs text-gray-500 px-4 py-5 text-center">{t('경기 없음', 'No games')}</p>
              ) : todayMatches
                  .filter((m: any) => sidebarLeague === 'ALL' || m.league === sidebarLeague)
                  .map((m: any) => {
                const isCurrent = String(m.id) === String(matchId)
                const mIsLive = m.status?.startsWith('IN')
                const mIsDone = m.status === 'FT'
                const awayKo = m.awayTeamKo || m.away_team_ko || m.awayTeam || m.away_team || ''
                const homeKo = m.homeTeamKo || m.home_team_ko || m.homeTeam || m.home_team || ''
                const awayLogo = m.awayLogo || m.away_team_logo
                const homeLogo = m.homeLogo || m.home_team_logo
                const awayScore = m.awayScore ?? m.away_score ?? 0
                const homeScore = m.homeScore ?? m.home_score ?? 0
                return (
                  <Link
                    key={m.id}
                    href={`/baseball/${m.id}`}
                    className={`block px-4 py-3 transition-colors hover:bg-white/5 ${isCurrent ? 'bg-blue-600/10 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
                  >
                    {/* 상태 배지 */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${LEAGUE_COLORS[m.league] || 'bg-gray-600'} text-white`}>
                        {m.league}
                      </span>
                      {mIsLive ? (
                        <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold">
                          <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
                          LIVE
                        </span>
                      ) : mIsDone ? (
                        <span className="text-[10px] text-gray-600 font-medium">{t('종료', 'Final')}</span>
                      ) : (
                        <span className="text-[10px] text-gray-500">
                          {m.match_timestamp ? new Date(m.match_timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : t('예정', 'TBD')}
                        </span>
                      )}
                    </div>
                    {/* 원정팀 */}
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center flex-shrink-0 p-0.5">
                        {awayLogo
                          ? <img src={awayLogo} alt="" className="w-full h-full object-contain" />
                          : <span className="text-[7px] text-gray-700 font-bold">{awayKo.slice(0, 2)}</span>}
                      </div>
                      <span className={`text-xs truncate flex-1 min-w-0 ${isCurrent ? 'text-white' : 'text-gray-400'}`}>{awayKo}</span>
                      {(mIsLive || mIsDone) && (
                        <span className={`text-xs font-bold tabular-nums flex-shrink-0 ${awayScore > homeScore ? 'text-white' : 'text-gray-500'}`}>{awayScore}</span>
                      )}
                    </div>
                    {/* 홈팀 */}
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center flex-shrink-0 p-0.5">
                        {homeLogo
                          ? <img src={homeLogo} alt="" className="w-full h-full object-contain" />
                          : <span className="text-[7px] text-gray-700 font-bold">{homeKo.slice(0, 2)}</span>}
                      </div>
                      <span className={`text-xs truncate flex-1 min-w-0 ${isCurrent ? 'text-white' : 'text-gray-400'}`}>{homeKo}</span>
                      {(mIsLive || mIsDone) && (
                        <span className={`text-xs font-bold tabular-nums flex-shrink-0 ${homeScore > awayScore ? 'text-white' : 'text-gray-500'}`}>{homeScore}</span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </aside>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 min-w-0 max-w-2xl mx-auto xl:mx-0">
        {/* 메인 스코어 카드 */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #141824 0%, #1a1f2e 100%)' }}>
          {/* 리그 + 상태 */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className={`px-2.5 py-1 text-[10px] font-bold text-white rounded-lg ${LEAGUE_COLORS[match.league]}`}>
                {match.league}
              </span>
              <span className="text-xs text-gray-400 font-medium">{match.leagueName}</span>
            </div>
            {isLive ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-red-400"
                style={{ background: '#ef444415', border: '1px solid #ef444430' }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                </span>
                LIVE · {currentInning}{t('회', 'th')}
              </span>
            ) : isFinished ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background: '#1e293b', color: '#64748b' }}>
                {t('경기 종료', 'Final')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-400"
                style={{ background: '#10b98115', border: '1px solid #10b98130' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t('예정', 'Scheduled')}
              </span>
            )}
          </div>

          {/* 스코어 - 모바일 최적화 */}
          <div className="px-4 pt-2 pb-5">
            <div className="flex items-center justify-between gap-2">
              {/* 원정팀 */}
              <div className="flex-1 flex flex-col items-center gap-2.5 min-w-0">
                <div className="relative">
                  <TeamLogo src={match.away.logo} team={match.away.teamKo} size="lg" />
                  {isFinished && match.away.score !== null && match.home.score !== null && match.away.score > match.home.score && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-white text-[10px] font-black">W</span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="font-bold text-white text-sm leading-snug">
                    {language === 'ko' ? match.away.teamKo : match.away.team}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t('원정', 'Away')}</p>
                </div>
                {(isFinished || isLive) && (
                  <span className={`text-4xl font-black tabular-nums ${
                    isLive ? 'text-white' :
                    (match.away.score ?? 0) > (match.home.score ?? 0) ? 'text-white' : 'text-gray-600'
                  }`}>
                    {match.away.score ?? 0}
                  </span>
                )}
              </div>

              {/* 가운데 VS / 스코어 구분자 */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 gap-1">
                {isLive ? (
                  <span className="text-xs font-black text-red-400 tracking-widest">LIVE</span>
                ) : isFinished ? (
                  <span className="text-[10px] font-bold text-gray-600 tracking-widest">FINAL</span>
                ) : (
                  <>
                    <span className="text-lg font-black text-gray-600">VS</span>
                  </>
                )}
                {/* 날짜/시간 */}
                <p className="text-center text-[10px] text-gray-500 tracking-wide whitespace-nowrap">
                  {match.date?.slice(5)}
                  {!isFinished && <span className="text-gray-400 font-semibold"> {(() => {
                    const ts = match.timestamp
                    if (ts) {
                      const d = new Date(typeof ts === 'number' ? ts * 1000 : ts)
                      if (!isNaN(d.getTime())) {
                        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                      }
                    }
                    return match.time
                  })()}</span>}
                </p>
              </div>

              {/* 홈팀 */}
              <div className="flex-1 flex flex-col items-center gap-2.5 min-w-0">
                <div className="relative">
                  <TeamLogo src={match.home.logo} team={match.home.teamKo} size="lg" />
                  {isFinished && match.away.score !== null && match.home.score !== null && match.home.score > match.away.score && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-white text-[10px] font-black">W</span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="font-bold text-white text-sm leading-snug">
                    {language === 'ko' ? match.home.teamKo : match.home.team}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t('홈', 'Home')}</p>
                </div>
                {(isFinished || isLive) && (
                  <span className={`text-4xl font-black tabular-nums ${
                    isLive ? 'text-white' :
                    (match.home.score ?? 0) > (match.away.score ?? 0) ? 'text-white' : 'text-gray-600'
                  }`}>
                    {match.home.score ?? 0}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 선발 투수 스탯 - MLB 전용 별도 카드 */}
        {match.league === 'MLB' && (
          <div className="mt-3 rounded-2xl overflow-hidden" style={{ background: '#0f1623', border: '1px solid #1e293b' }}>
            {/* 헤더 */}
            <div className="px-4 py-3 flex items-center gap-2.5" style={{ borderBottom: '1px solid #1e293b' }}>
              <div className="w-1 h-5 rounded-full bg-cyan-500" />
              <span className="text-white text-sm font-bold">{t('선발 투수', 'Starting Pitchers')}</span>
            </div>

            <div className="grid grid-cols-2 divide-x divide-gray-800/60 items-stretch">
              {[
                {
                  pitcherId: match.awayPitcherId,
                  pitcherName: match.awayPitcher,
                  stats: awayPitcherStats,
                  label: t('원정', 'Away'),
                  accentColor: 'text-red-400',
                  borderImg: 'border-red-500/50',
                },
                {
                  pitcherId: match.homePitcherId,
                  pitcherName: match.homePitcher,
                  stats: homePitcherStats,
                  label: t('홈', 'Home'),
                  accentColor: 'text-blue-400',
                  borderImg: 'border-blue-500/50',
                },
              ].map(({ pitcherId, pitcherName, stats, label, accentColor, borderImg }, idx) => {
                const currentYear = new Date().getFullYear()
                const prevYear = currentYear - 1
                const displayStats = stats?.current || stats?.prev || null

                return (
                  <div key={idx} className="px-4 py-4">
                    {/* 프로필 영역 */}
                    <div className="flex flex-col items-center mb-4">
                      {/* 라벨 */}
                      <span className={`text-xs font-bold mb-2 ${accentColor}`}>{label}</span>
                      
                      {/* 사진 */}
                      {pitcherId ? (
                        <div className="w-28 h-36 rounded-2xl mb-2.5 overflow-hidden flex items-end justify-center">
                          <PitcherImage pitcherId={pitcherId} name={pitcherName || ''} />
                        </div>
                      ) : (
                        <div className="w-28 h-36 mb-2.5 flex items-end justify-center pb-2">
                          <div className={`w-24 h-24 rounded-full border-2 ${borderImg} flex items-center justify-center bg-gray-900`}>
                            <span className="text-gray-500 text-3xl">?</span>
                          </div>
                        </div>
                      )}

                      {/* 이름 */}
                      <p className="text-sm font-bold text-white text-center leading-tight">
                        {pitcherName || t('미정', 'TBD')}
                      </p>
                      {stats?.pitchHand && (
                        <p className="text-xs text-gray-500 mt-0.5">{stats.pitchHand}{t('투', '-hand')}</p>
                      )}
                    </div>

                    {/* 스탯 */}
                    {displayStats ? (
                      <div>
                        {/* 시즌 뱃지 */}
                        <div className="flex justify-center gap-1.5 mb-3">
                          {stats?.current && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-400 font-bold">
                              {currentYear}
                            </span>
                          )}
                          {stats?.prev && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                              !stats.current ? 'bg-blue-600/30 text-blue-400' : 'bg-gray-700/60 text-gray-500'
                            }`}>
                              {prevYear}
                            </span>
                          )}
                        </div>

                        {/* 올시즌 스탯 */}
                        {stats?.current && (() => {
                          const s = stats.current
                          return (
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { label: 'ERA', value: s.era },
                                  { label: 'WHIP', value: s.whip },
                                  { label: 'K/9', value: s.strikeoutsPer9Inn ? parseFloat(s.strikeoutsPer9Inn).toFixed(1) : '-' },
                                ].map(({ label, value }) => (
                                  <div key={label} className="bg-gray-900/70 rounded-lg py-2 text-center">
                                    <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
                                    <p className="text-sm font-bold text-white">{value ?? '-'}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { label: t('승-패', 'W-L'), value: `${s.wins}-${s.losses}` },
                                  { label: 'IP', value: s.inningsPitched },
                                  { label: 'K', value: s.strikeOuts },
                                ].map(({ label, value }) => (
                                  <div key={label} className="bg-gray-900/70 rounded-lg py-2 text-center">
                                    <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
                                    <p className="text-sm font-bold text-white">{value ?? '-'}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}

                        {/* 작년 스탯 */}
                        {stats?.prev && (
                          <div className={`${stats?.current ? 'mt-3 pt-3 border-t border-gray-800/50' : 'space-y-2'}`}>
                            {stats?.current && (
                              <p className="text-[10px] text-gray-600 text-center mb-2">{prevYear} {t('시즌', 'Season')}</p>
                            )}
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { label: 'ERA', value: stats.prev.era },
                                { label: 'WHIP', value: stats.prev.whip },
                                { label: 'K', value: stats.prev.strikeOuts },
                              ].map(({ label, value }) => (
                                <div key={label} className="bg-gray-900/40 rounded-lg py-2 text-center">
                                  <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
                                  <p className={`text-sm font-bold ${stats?.current ? 'text-gray-500' : 'text-white'}`}>{value ?? '-'}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 강점 / 약점 분석 */}
                        {(stats?.current || stats?.prev) && (() => {
                          const s = stats.current ?? stats.prev
                          const era = parseFloat(s.era ?? '99')
                          const whip = parseFloat(s.whip ?? '99')
                          const ip = parseFloat(s.inningsPitched ?? '0')
                          const k9 = s.strikeoutsPer9Inn ? parseFloat(s.strikeoutsPer9Inn) : 0
                          const bb = s.baseOnBalls ?? 0
                          const k = s.strikeOuts ?? 0
                          const kbb = bb > 0 ? k / bb : k

                          const strengths: string[] = []
                          const weakness: string[] = []

                          if (ip > 0) {
                            if (era > 0 && era <= 3.00) strengths.push(t('에이스급 ERA', 'Ace-level ERA'))
                            else if (era > 0 && era <= 3.75) strengths.push(t('안정적인 ERA', 'Solid ERA'))
                            else if (era >= 5.00) weakness.push(t('높은 ERA', 'High ERA'))

                            if (k9 >= 10) strengths.push(t(`탈삼진 머신 (K/9 ${k9.toFixed(1)})`, `Strikeout machine (K/9 ${k9.toFixed(1)})`))
                            else if (k9 >= 8.5) strengths.push(t('높은 삼진율', 'High K rate'))
                            else if (k9 < 6 && k9 > 0) weakness.push(t('낮은 삼진율', 'Low K rate'))

                            if (whip > 0 && whip <= 1.10) strengths.push(t('출루 억제 탁월', 'Excellent WHIP'))
                            else if (whip >= 1.45) weakness.push(t('주자 허용 多', 'High baserunners'))

                            if (kbb >= 3.5) strengths.push(t('제구력 우수', 'Good command'))
                            else if (kbb < 2.0 && bb > 5) weakness.push(t('볼넷 주의', 'Walk prone'))
                          }

                          if (strengths.length === 0 && weakness.length === 0) return null

                          return (
                            <div className="mt-3 pt-3 border-t border-gray-800/50 flex flex-col gap-1.5">
                              {strengths.map((s, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                                  style={{ background: '#05966915', color: '#34d399' }}>
                                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                                    style={{ background: '#05966930' }}>✦</span>
                                  {s}
                                </span>
                              ))}
                              {weakness.map((w, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                                  style={{ background: '#f9731610', color: '#fb923c' }}>
                                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                                    style={{ background: '#f9731625' }}>▲</span>
                                  {w}
                                </span>
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    ) : pitcherId ? (
                      <div className="flex justify-center py-4">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600 text-center py-4">{t('선발 미정', 'Starter TBD')}</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Claude AI 투수 매치업 분석 */}
            {(pitcherAnalysisLoading || pitcherAnalysis) && (
              <div className="mx-4 mb-4 rounded-2xl overflow-hidden"
                style={{ background: 'linear-gradient(145deg, #0f172a, #131c2e)', border: '1px solid #334155' }}>
                {/* 헤더 */}
                <div className="px-4 py-2.5 flex items-center justify-between"
                  style={{ background: 'linear-gradient(90deg, #1e3a5f, #1a2744)', borderBottom: '1px solid #334155' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>✦</div>
                    <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{t('투수 매치업 분석', 'Pitcher Matchup Analysis')}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: '#2563eb20', color: '#60a5fa', border: '1px solid #2563eb40' }}>
                    Trend baseball
                  </span>
                </div>
                {/* 내용 */}
                <div className="px-4 py-5">
                  {pitcherAnalysisLoading ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="flex gap-1.5">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-2 h-2 rounded-full"
                            style={{
                              background: '#3b82f6',
                              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                            }} />
                        ))}
                      </div>
                      <span className="text-xs" style={{ color: '#64748b' }}>{t('투수 매치업 분석 중...', 'Analyzing pitcher matchup...')}</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pitcherAnalysis?.split(/(?<=[.다니])\s+/).filter(Boolean).map((sentence, i) => (
                        <p key={i} className="text-[13px] leading-relaxed" style={{ color: '#cbd5e1', letterSpacing: '0.01em' }}>
                          {sentence.trim()}
                        </p>
                      )) || (
                        <p className="text-[13px] leading-relaxed" style={{ color: '#cbd5e1' }}>
                          {pitcherAnalysis}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 선발 투수 - KBO/NPB/CPBL */}
        {(match.league === 'KBO' || match.league === 'NPB' || match.league === 'CPBL') &&
          (kboNpbHomePitcher || kboNpbAwayPitcher || kboNpbPitcherLoading) && (
            <div className="mt-3 rounded-2xl overflow-hidden" style={{ background: '#0f1623', border: '1px solid #1e293b' }}>
              <div className="px-4 py-3 flex items-center gap-2.5" style={{ borderBottom: '1px solid #1e293b' }}>
                <div className="w-1 h-5 rounded-full bg-cyan-500" />
                <span className="text-white text-sm font-bold">{t('선발 투수', 'Starting Pitchers')}</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-800/60">
                {[
                  { name: kboNpbAwayPitcher, stats: kboAwayPitcherStats, label: t('원정', 'Away'), accentColor: 'text-red-400' },
                  { name: kboNpbHomePitcher, stats: kboHomePitcherStats, label: t('홈', 'Home'),   accentColor: 'text-blue-400' },
                ].map(({ name, stats, label, accentColor }, idx) => (
                  <div key={idx} className="px-4 py-4">
                    {/* 프로필 */}
                    <div className="flex flex-col items-center mb-4">
                      <span className={`text-xs font-bold mb-2 ${accentColor}`}>{label}</span>
                      {kboNpbPitcherLoading && !name ? (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                      ) : (
                        <p className="text-sm font-bold text-white text-center leading-tight">
                          {name || t('선발 미정', 'Starter TBD')}
                        </p>
                      )}
                      {stats?.season && match.league === 'MLB' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-400 font-bold mt-1">
                          {stats.season}
                        </span>
                      )}
                    </div>

                    {/* 스탯 */}
                    {stats ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { label: 'ERA', value: stats.era  != null ? Number(stats.era).toFixed(2) : '-' },
                            { label: stats.whip != null ? 'WHIP' : 'BB', value: stats.whip != null ? Number(stats.whip).toFixed(2) : (stats.walks ?? '-') },
                            { label: 'K',   value: stats.strikeouts ?? '-' },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-gray-900/70 rounded-lg py-2 text-center">
                              <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
                              <p className="text-sm font-bold text-white">{value}</p>
                            </div>
                          ))}
                        </div>

                        {/* 강점/약점 태그 */}
                        {(stats.strengths?.length > 0 || stats.weakness?.length > 0) && (
                          <div className="mt-2 pt-2 border-t border-gray-800/50 flex flex-wrap gap-1">
                            {stats.strengths?.map((s: string, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{ background: '#05966920', color: '#34d399', border: '1px solid #05966940' }}>
                                ✦ {s}
                              </span>
                            ))}
                            {stats.weakness?.map((w: string, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{ background: '#f9731620', color: '#fb923c', border: '1px solid #f9731640' }}>
                                ▲ {w}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : name && !kboPitcherStatsFetched ? (
                      <div className="flex justify-center py-4">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : name ? (
                      <p className="text-xs text-gray-500 text-center py-4">{t('이번 시즌 기록 집계 중', 'Stats being compiled')}</p>
                    ) : (
                      <p className="text-xs text-gray-600 text-center py-4">{t('선발 미정', 'Starter TBD')}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Claude AI 투수 매치업 분석 */}
              {(pitcherAnalysisLoading || pitcherAnalysis) && (
                <div className="mx-4 mb-4 rounded-2xl overflow-hidden"
                  style={{ background: 'linear-gradient(145deg, #0f172a, #131c2e)', border: '1px solid #334155' }}>
                  <div className="px-4 py-2.5 flex items-center justify-between"
                    style={{ background: 'linear-gradient(90deg, #1e3a5f, #1a2744)', borderBottom: '1px solid #334155' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>✦</div>
                      <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{t('투수 매치업 분석', 'Pitcher Matchup Analysis')}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: '#2563eb20', color: '#60a5fa', border: '1px solid #2563eb40' }}>
                      Trend baseball
                    </span>
                  </div>
                  <div className="px-4 py-4">
                    {pitcherAnalysisLoading ? (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <div className="flex gap-1.5">
                          {[0,1,2].map(i => (
                            <div key={i} className="w-2 h-2 rounded-full"
                              style={{ background: '#3b82f6', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                          ))}
                        </div>
                        <span className="text-xs" style={{ color: '#64748b' }}>{t('투수 매치업 분석 중...', 'Analyzing pitcher matchup...')}</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pitcherAnalysis?.split(/(?<=[.다니])\s+/).filter(Boolean).map((sentence: string, i: number) => (
                          <p key={i} className="text-[13px] leading-relaxed" style={{ color: '#cbd5e1', letterSpacing: '0.01em' }}>
                            {sentence.trim()}
                          </p>
                        )) || (
                          <p className="text-[13px] leading-relaxed" style={{ color: '#cbd5e1' }}>
                            {pitcherAnalysis}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        }

        {/* AI 예측 컴포넌트 - 예정 경기만 */}
        {match.status === "NS" && (
          <div className="mt-2">
            {isPremium ? (
              /* ✅ 프리미엄: 전체 공개 */
              <BaseballAIPrediction
                matchId={match.id}
                homeTeam={match.home.team}
                awayTeam={match.away.team}
                homeTeamKo={match.home.teamKo}
                awayTeamKo={match.away.teamKo}
                season={match.season}
                overUnderLine={match.odds?.overUnderLine ?? null}
                league={match.league}
              />
            ) : (
              /* 🔒 비회원/무료회원: 잠금 UI */
              <div className="mx-0 rounded-none overflow-hidden" style={{ background: '#0f1623', border: '1px solid #1e293b' }}>
                {/* 헤더 */}
                <div className="px-4 py-2.5 flex items-center justify-between"
                  style={{ background: 'linear-gradient(90deg, #1e3a5f, #1a2744)', borderBottom: '1px solid #334155' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>✦</div>
                    <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{t('AI 야구 분석', 'AI Baseball Analysis')}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: '#7c3aed30', color: '#a78bfa', border: '1px solid #7c3aed50' }}>
                    PREMIUM
                  </span>
                </div>

                {/* 블러 미리보기 영역 */}
                <div className="relative">
                  {/* 블러 처리된 더미 컨텐츠 */}
                  <div className="px-4 py-5 blur-sm pointer-events-none select-none" aria-hidden="true">
                    <div className="flex justify-between mb-4">
                      <div className="text-center flex-1">
                        <p className="text-[11px] mb-1" style={{ color: '#64748b' }}>{language === 'ko' ? match.away.teamKo : match.away.team} {t('승리', 'Win')}</p>
                        <div className="text-2xl font-black" style={{ color: '#f87171' }}>●●%</div>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-[11px] mb-1" style={{ color: '#64748b' }}>{language === 'ko' ? match.home.teamKo : match.home.team} {t('승리', 'Win')}</p>
                        <div className="text-2xl font-black" style={{ color: '#60a5fa' }}>●●%</div>
                      </div>
                    </div>
                    <div className="h-2 rounded-full mb-4" style={{ background: '#1e293b' }}>
                      <div className="h-2 rounded-full w-3/5" style={{ background: 'linear-gradient(90deg, #f87171, #60a5fa)' }} />
                    </div>
                    <div className="space-y-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-3 rounded-full" style={{ background: '#1e293b', width: `${75 - i * 10}%` }} />
                      ))}
                    </div>
                  </div>

                  {/* 잠금 오버레이 */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                    style={{ background: 'linear-gradient(to top, #0f1623 60%, #0f162380)' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ background: 'linear-gradient(135deg, #2563eb20, #7c3aed20)', border: '1px solid #7c3aed40' }}>
                      🔒
                    </div>
                    <div className="text-center px-6">
                      <p className="text-sm font-bold text-white mb-1">
                        {t('AI 야구 분석은 프리미엄 전용입니다', 'AI Baseball Analysis is Premium only')}
                      </p>
                      <p className="text-xs" style={{ color: '#64748b' }}>
                        {t('승리 확률 · O/U 분석 · 투수 매치업 종합', 'Win probability · O/U analysis · Pitcher matchup')}
                      </p>
                    </div>
                    {isLoggedIn ? (
                      /* 로그인은 됐지만 무료회원 */
                      <button
                        onClick={() => router.push('/premium/pricing')}
                        className="px-5 py-2 rounded-full text-sm font-bold text-white transition-all active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                        {t('프리미엄 업그레이드 →', 'Upgrade to Premium →')}
                      </button>
                    ) : (
                      /* 비회원 */
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push('/login')}
                          className="px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95"
                          style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }}>
                          {t('로그인', 'Sign in')}
                        </button>
                        <button
                          onClick={() => router.push('/premium/pricing')}
                          className="px-4 py-2 rounded-full text-xs font-bold text-white transition-all active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                          {t('프리미엄 시작 →', 'Start Premium →')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== 라이브 실황 카드 (DB 기반 R/H/E) ===== */}
        {isLive && (
          <div className="mt-3 rounded-2xl overflow-hidden" style={{ background: '#0f1623', border: '1px solid #ef444430' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #1e293b' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full bg-red-500" />
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-white text-sm font-bold">
                  LIVE · {currentInning}{t('회 진행 중', 'th inning')}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#1e293b', color: '#64748b' }}>{t('30초 자동 갱신', 'Auto-refresh 30s')}</span>
            </div>

            {/* R/H/E */}
            <div className="px-4 py-4">
              <div className="grid grid-cols-4 text-center text-xs border border-gray-800 rounded-lg overflow-hidden">
                <div className="bg-gray-800/30 py-1.5 text-gray-500 font-medium"></div>
                <div className="bg-gray-800/30 py-1.5 text-gray-400 font-bold">R</div>
                <div className="bg-gray-800/30 py-1.5 text-gray-400 font-bold">H</div>
                <div className="bg-gray-800/30 py-1.5 text-gray-400 font-bold">E</div>

                {/* 원정 */}
                <div className="py-2 text-gray-300 font-medium text-[11px] truncate px-1">
                  {language === 'ko' ? (match.away.teamKo || TEAM_NAME_KO[match.away.team] || match.away.team.split(' ').pop()) : match.away.team.split(' ').pop()}
                </div>
                <div className="py-2 text-white font-black">{match.away.score ?? '-'}</div>
                <div className="py-2 text-gray-300">{liveHits?.away ?? '-'}</div>
                <div className="py-2 text-gray-300">{liveErrors?.away ?? '-'}</div>

                {/* 홈 */}
                <div className="py-2 text-gray-300 font-medium text-[11px] border-t border-gray-800 truncate px-1">
                  {language === 'ko' ? (match.home.teamKo || TEAM_NAME_KO[match.home.team] || match.home.team.split(' ').pop()) : match.home.team.split(' ').pop()}
                </div>
                <div className="py-2 text-white font-black border-t border-gray-800">{match.home.score ?? '-'}</div>
                <div className="py-2 text-gray-300 border-t border-gray-800">{liveHits?.home ?? '-'}</div>
                <div className="py-2 text-gray-300 border-t border-gray-800">{liveErrors?.home ?? '-'}</div>
              </div>
            </div>
          </div>
        )}

        {/* 이닝 스코어보드 - 라이브 or 종료 (DB 기반 통합) */}
        {(isFinished || isLive) && innings.length > 0 && (
          <div className="mt-3 rounded-2xl overflow-hidden" style={{ background: '#0f1623', border: '1px solid #1e293b' }}>
            <div className="px-4 py-3 flex items-center gap-2.5" style={{ borderBottom: '1px solid #1e293b' }}>
              <div className="w-1 h-5 rounded-full bg-blue-500" />
              <span className="text-white text-sm font-bold tracking-tight">{t('이닝 스코어', 'Inning Score')}</span>
              {isLive && (
                <span className="flex items-center gap-1 ml-auto">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                  </span>
                  <span className="text-[10px] font-black text-red-400">{currentInning}{t('회 진행 중', 'th inning')}</span>
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-2 py-2 text-left text-gray-400 font-medium w-16">{t('팀', 'Team')}</th>
                    {innings.map((inn) => (
                      <th key={inn.inning} className={`px-1.5 py-2 text-center font-medium w-7 ${
                        isLive && inn.inning.toString() === currentInning
                          ? 'text-red-400 bg-red-500/10'
                          : 'text-gray-400'
                      }`}>{inn.inning}</th>
                    ))}
                    <th className="px-2 py-2 text-center font-medium text-white bg-gray-700/30 w-8">R</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 원정팀 */}
                  <tr className="border-t border-gray-800/10">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <TeamLogo src={match.away.logo} team={match.away.teamKo} size="sm" />
                        <span className="text-gray-300 font-medium truncate max-w-[60px] text-[11px]">
                          {language === 'ko'
                            ? (match.away.teamKo || TEAM_NAME_KO[match.away.team] || match.away.team?.split(' ').pop()?.slice(0, 4))
                            : match.away.team?.split(' ').pop()?.slice(0, 4)}
                        </span>
                      </div>
                    </td>
                    {innings.map((inn) => (
                      <td key={inn.inning} className={`px-1.5 py-2 text-center ${
                        isLive && inn.inning.toString() === currentInning
                          ? 'text-red-300 bg-red-500/10 font-bold'
                          : 'text-gray-400'
                      }`}>{inn.away}</td>
                    ))}
                    <td className={`px-2 py-2 text-center font-semibold bg-gray-800/50 ${(match.away.score ?? 0) > (match.home.score ?? 0) ? 'text-emerald-600' : 'text-gray-300'}`}>
                      {match.away.score}
                    </td>
                  </tr>
                  {/* 홈팀 */}
                  <tr className="border-t border-gray-800/10">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <TeamLogo src={match.home.logo} team={match.home.teamKo} size="sm" />
                        <span className="text-gray-300 font-medium truncate max-w-[60px] text-[11px]">
                          {language === 'ko'
                            ? (match.home.teamKo || TEAM_NAME_KO[match.home.team] || match.home.team?.split(' ').pop()?.slice(0, 4))
                            : match.home.team?.split(' ').pop()?.slice(0, 4)}
                        </span>
                      </div>
                    </td>
                    {innings.map((inn) => (
                      <td key={inn.inning} className={`px-1.5 py-2 text-center ${
                        isLive && inn.inning.toString() === currentInning
                          ? 'text-red-300 bg-red-500/10 font-bold'
                          : 'text-gray-400'
                      }`}>{inn.home}</td>
                    ))}
                    <td className={`px-2 py-2 text-center font-semibold bg-gray-800/50 ${(match.home.score ?? 0) > (match.away.score ?? 0) ? 'text-emerald-600' : 'text-gray-300'}`}>
                      {match.home.score}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* H2H */}
        {(h2hData?.success && h2hData.count > 0) && (
          <div className="mx-4 mt-3 rounded-2xl overflow-hidden" style={{ background: '#0f1623', border: '1px solid #1e293b' }}>
            <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: '1px solid #1e293b' }}>
              <div className="w-1 h-5 rounded-full bg-amber-500" />
              <span className="text-sm font-bold text-white">{t('상대 전적', 'Head to Head')}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold ml-auto"
                style={{ background: '#1e293b', color: '#94a3b8' }}>
                {h2hData.summary.homeWins}{t('승', 'W')} - {h2hData.summary.awayWins}{t('패', 'L')}
              </span>
            </div>
            <div>
              {h2hData.matches.slice(0, 5).map((game: any, idx: number) => {
                const getKoreanName = (engName: string) => {
                  const teamMapping: Record<string, string> = {
                    // MLB
                    'Tampa Bay Rays': '탬파베이 레이스', 'Minnesota Twins': '미네소타 트윈스',
                    'Cincinnati Reds': '신시내티 레즈', 'Kansas City Royals': '캔자스시티 로열스',
                    'Baltimore Orioles': '볼티모어 오리올스', 'Atlanta Braves': '애틀랜타 브레이브스',
                    'Detroit Tigers': '디트로이트 타이거스', 'Boston Red Sox': '보스턴 레드삭스',
                    'Pittsburgh Pirates': '피츠버그 파이어리츠', 'Miami Marlins': '마이애미 말린스',
                    'Philadelphia Phillies': '필라델피아 필리스', 'Toronto Blue Jays': '토론토 블루제이스',
                    'New York Yankees': '뉴욕 양키스', 'New York Mets': '뉴욕 메츠',
                    'Houston Astros': '휴스턴 애스트로스', 'Texas Rangers': '텍사스 레인저스',
                    'Arizona Diamondbacks': '애리조나 다이아몬드백스', 'Los Angeles Dodgers': '로스앤젤레스 다저스',
                    'Cleveland Guardians': '클리블랜드 가디언스', 'Chicago Cubs': '시카고 컵스',
                    'San Diego Padres': '샌디에이고 파드리스', 'Athletics': '오클랜드 애슬레틱스',
                    'Milwaukee Brewers': '밀워키 브루어스', 'Los Angeles Angels': '로스앤젤레스 에인절스',
                    'San Francisco Giants': '샌프란시스코 자이언츠', 'Seattle Mariners': '시애틀 매리너스',
                    'Chicago White Sox': '시카고 화이트삭스', 'Colorado Rockies': '콜로라도 로키스',
                    'Washington Nationals': '워싱턴 내셔널스', 'St.Louis Cardinals': '세인트루이스 카디널스',
                    // KBO
                    'LG Twins': 'LG 트윈스', 'KT Wiz': 'KT 위즈', 'SSG Landers': 'SSG 랜더스',
                    'NC Dinos': 'NC 다이노스', 'Doosan Bears': '두산 베어스', 'KIA Tigers': 'KIA 타이거즈',
                    'Lotte Giants': '롯데 자이언츠', 'Samsung Lions': '삼성 라이온즈',
                    'Hanwha Eagles': '한화 이글스', 'Kiwoom Heroes': '키움 히어로즈',
                    // NPB (센트럴 리그)
                    'Yomiuri Giants': '요미우리 자이언츠', 'Hanshin Tigers': '한신 타이거즈',
                    'Hiroshima Toyo Carp': '히로시마 도요 카프', 'Yakult Swallows': '야쿠르트 스왈로즈',
                    'DeNA BayStars': '요코하마 DeNA 베이스타즈', 'Chunichi Dragons': '주니치 드래곤즈',
                    // NPB (퍼시픽 리그)
                    'SoftBank Hawks': '소프트뱅크 호크스', 'Orix Buffaloes': '오릭스 버팔로즈',
                    'Lotte Marines': '지바 롯데 마린스', 'Rakuten Eagles': '도호쿠 라쿠텐 이글스',
                    'Seibu Lions': '사이타마 세이부 라이온즈', 'Nippon Ham Fighters': '홋카이도 닛폰햄 파이터즈',
                    // CPBL
                    'Uni-President Lions': '유니-프레지던트 라이온즈', 'CTBC Brothers': 'CTBC 브라더스',
                    'Fubon Guardians': '푸방 가디언즈', 'Rakuten Monkeys': '라쿠텐 몽키즈',
                    'Wei Chuan Dragons': '웨이취안 드래곤즈',
                  }
                  return teamMapping[engName] || engName
                }
                const isHome = game.winner === 'home'
                const isAway = game.winner === 'away'
                const awayName = language === 'ko' ? getKoreanName(game.awayTeam) : game.awayTeam
                const homeName = language === 'ko' ? getKoreanName(game.homeTeam) : game.homeTeam
                return (
                  <div key={game.id} className="flex items-center px-4 py-3 gap-2"
                    style={{ borderTop: idx > 0 ? '1px solid #1e293b' : 'none' }}>
                    {/* 날짜 */}
                    <span className="text-[11px] w-9 flex-shrink-0 font-medium" style={{ color: '#94a3b8' }}>
                      {new Date(game.date).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'numeric', day: 'numeric' })}
                    </span>
                    {/* 원정팀 */}
                    <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                      {isAway && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: '#ef444425', color: '#f87171' }}>{t('승', 'W')}</span>}
                      <span className="text-xs font-medium truncate" style={{ color: isAway ? '#f1f5f9' : '#94a3b8' }}>{awayName}</span>
                    </div>
                    {/* 스코어 */}
                    <div className="flex items-center gap-1 flex-shrink-0 px-2">
                      <span className="text-sm font-black tabular-nums w-5 text-right" style={{ color: isAway ? '#f87171' : '#64748b' }}>{game.awayScore}</span>
                      <span className="text-xs font-medium" style={{ color: '#475569' }}>-</span>
                      <span className="text-sm font-black tabular-nums w-5 text-left" style={{ color: isHome ? '#60a5fa' : '#64748b' }}>{game.homeScore}</span>
                    </div>
                    {/* 홈팀 */}
                    <div className="flex-1 flex items-center justify-start gap-1.5 min-w-0">
                      <span className="text-xs font-medium truncate" style={{ color: isHome ? '#f1f5f9' : '#94a3b8' }}>{homeName}</span>
                      {isHome && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: '#3b82f625', color: '#60a5fa' }}>{t('승', 'W')}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 배당률 */}
        {match.odds && (
          <div className="mx-4 mt-3 rounded-2xl overflow-hidden" style={{ background: '#0f1623', border: '1px solid #1e293b' }}>
            <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: '1px solid #1e293b' }}>
              <div className="w-1 h-5 rounded-full bg-purple-500" />
              <span className="text-sm font-bold text-white">{t('배당률', 'Odds')}</span>
              {match.odds?.bookmaker && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium ml-auto"
                  style={{ background: '#1e293b', color: '#64748b' }}>
                  {match.odds.bookmaker}
                </span>
              )}
            </div>
            <div className="p-4">
              {/* 배당 카드 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 text-center" style={{
                  background: isFinished && match.away.score !== null && match.home.score !== null
                    ? match.away.score > match.home.score ? '#ef444415' : '#0f172a'
                    : '#ef444410',
                  border: `1px solid ${isFinished && match.away.score !== null && match.home.score !== null
                    ? match.away.score > match.home.score ? '#ef444450' : '#1e293b'
                    : '#ef444430'}`
                }}>
                  <p className="text-[11px] font-semibold mb-2 flex items-center justify-center gap-1" style={{ color: '#94a3b8' }}>
                    {language === 'ko' ? match.away.teamKo : match.away.team} {t('승', 'Win')}
                    {isFinished && match.away.score !== null && match.home.score !== null && (
                      match.away.score > match.home.score
                        ? <span className="text-emerald-400 text-xs">✓</span>
                        : <span style={{ color: '#334155' }}>✗</span>
                    )}
                  </p>
                  <p className="text-3xl font-black tabular-nums" style={{
                    color: isFinished && match.away.score !== null && match.home.score !== null
                      ? match.away.score > match.home.score ? '#f87171' : '#334155'
                      : '#f87171'
                  }}>{match.odds.awayWinOdds}</p>
                </div>
                <div className="rounded-2xl p-4 text-center" style={{
                  background: isFinished && match.away.score !== null && match.home.score !== null
                    ? match.home.score > match.away.score ? '#3b82f615' : '#0f172a'
                    : '#3b82f610',
                  border: `1px solid ${isFinished && match.away.score !== null && match.home.score !== null
                    ? match.home.score > match.away.score ? '#3b82f650' : '#1e293b'
                    : '#3b82f630'}`
                }}>
                  <p className="text-[11px] font-semibold mb-2 flex items-center justify-center gap-1" style={{ color: '#94a3b8' }}>
                    {language === 'ko' ? match.home.teamKo : match.home.team} {t('승', 'Win')}
                    {isFinished && match.away.score !== null && match.home.score !== null && (
                      match.home.score > match.away.score
                        ? <span className="text-emerald-400 text-xs">✓</span>
                        : <span style={{ color: '#334155' }}>✗</span>
                    )}
                  </p>
                  <p className="text-3xl font-black tabular-nums" style={{
                    color: isFinished && match.away.score !== null && match.home.score !== null
                      ? match.home.score > match.away.score ? '#60a5fa' : '#334155'
                      : '#60a5fa'
                  }}>{match.odds.homeWinOdds}</p>
                </div>
              </div>
              {/* 오버/언더 */}
              {match.odds.overUnderLine && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid #1e293b' }}>
                  {/* 헤더 */}
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <p className="text-[11px] font-semibold" style={{ color: '#475569' }}>
                      Over / Under
                    </p>
                    {isFinished && match.home.score !== null && match.away.score !== null && (
                      <p className="text-[11px]">
                        <span style={{ color: '#64748b' }}>{t('총점', 'Total')} </span>
                        <span className="font-bold text-white">{match.home.score + match.away.score}</span>
                      </p>
                    )}
                  </div>

                  {/* 라인 테이블 */}
                  {(() => {
                    const totalScore = isFinished && match.home.score !== null && match.away.score !== null
                      ? match.home.score + match.away.score
                      : null
                    const bestLine = match.odds.overUnderLine

                    // ouLines 있으면 사용, 없으면 단일 라인으로 fallback
                    const lines = match.odds.ouLines && match.odds.ouLines.length > 0
                      ? match.odds.ouLines
                      : [{ line: bestLine, over: match.odds.overOdds, under: match.odds.underOdds }]

                    return (
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b' }}>
                        {/* 컬럼 헤더 */}
                        <div className="grid grid-cols-3 px-3 py-1.5" style={{ background: '#0a0f1a', borderBottom: '1px solid #1e293b' }}>
                          <p className="text-[10px] font-semibold" style={{ color: '#475569' }}>Line</p>
                          <p className="text-[10px] font-semibold text-center" style={{ color: '#f87171' }}>Over</p>
                          <p className="text-[10px] font-semibold text-right" style={{ color: '#60a5fa' }}>Under</p>
                        </div>

                        {lines.map((l, idx) => {
                          const isBest = l.line === bestLine
                          const overHit = totalScore !== null && totalScore > l.line
                          const underHit = totalScore !== null && totalScore < l.line
                          const pushHit = totalScore !== null && totalScore === l.line

                          return (
                            <div
                              key={l.line}
                              className="grid grid-cols-3 px-3 py-2.5 items-center"
                              style={{
                                background: isBest ? '#1e293b40' : 'transparent',
                                borderTop: idx > 0 ? '1px solid #1e293b30' : 'none',
                              }}
                            >
                              {/* 라인 */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-black tabular-nums" style={{ color: isBest ? '#f1f5f9' : '#64748b' }}>
                                  {l.line}
                                </span>
                                {isBest && (
                                  <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: '#3b82f620', color: '#60a5fa' }}>
                                    기준
                                  </span>
                                )}
                                {pushHit && (
                                  <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: '#f59e0b20', color: '#fbbf24' }}>
                                    PUSH
                                  </span>
                                )}
                              </div>

                              {/* Over */}
                              <div className="text-center">
                                <span
                                  className="text-sm font-black tabular-nums"
                                  style={{ color: overHit ? '#34d399' : isFinished ? '#334155' : '#f87171' }}
                                >
                                  {l.over}
                                </span>
                                {isFinished && overHit && (
                                  <span className="ml-1 text-[9px]" style={{ color: '#34d399' }}>✓</span>
                                )}
                              </div>

                              {/* Under */}
                              <div className="text-right">
                                <span
                                  className="text-sm font-black tabular-nums"
                                  style={{ color: underHit ? '#34d399' : isFinished ? '#334155' : '#60a5fa' }}
                                >
                                  {l.under}
                                </span>
                                {isFinished && underHit && (
                                  <span className="ml-1 text-[9px]" style={{ color: '#34d399' }}>✓</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 관련 경기 */}
        {match.relatedMatches && match.relatedMatches.length > 0 && (
          <div className="mx-4 mt-3 rounded-2xl overflow-hidden" style={{ background: '#0f1623', border: '1px solid #1e293b' }}>
            <div className="px-4 py-3 flex items-center gap-2.5" style={{ borderBottom: '1px solid #1e293b' }}>
              <div className="w-1 h-5 rounded-full bg-gray-500" />
              <span className="text-white text-sm font-bold tracking-tight">{t('관련 경기', 'Related Games')}</span>
            </div>
            <div className="divide-y">
              {match.relatedMatches.slice(0, 3).map((related) => (
                <Link key={related.id} href={`/baseball/${related.id}`} className="flex items-center px-4 py-3 hover:bg-gray-800/50">
                  <span className="text-[10px] text-gray-400 w-12">{related.date?.slice(5)}</span>
                  <div className="flex items-center gap-1.5 flex-1">
                    <TeamLogo src={related.awayLogo} team={related.awayTeam} size="sm" />
                    <span className="text-xs text-gray-300 truncate">
                      {language === 'ko' ? (TEAM_NAME_KO[related.awayTeam] || related.awayTeam) : related.awayTeam}
                    </span>
                  </div>
                  <div className="px-2 text-center">
                    {related.status === 'FT' ? (
                      <span className="text-xs font-medium text-white">{related.awayScore} - {related.homeScore}</span>
                    ) : (
                      <span className="text-[10px] text-gray-400">{related.time?.slice(0, 5)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 justify-end">
                    <span className="text-xs text-gray-300 truncate">
                      {language === 'ko' ? (TEAM_NAME_KO[related.homeTeam] || related.homeTeam) : related.homeTeam}
                    </span>
                    <TeamLogo src={related.homeLogo} team={related.homeTeam} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 하단 여백 */}
        <div className="h-4" />
        </div> {/* 메인 컨텐츠 닫기 */}

        {/* 오른쪽 사이드바 - PC only (빈 공간 or 광고용) */}
        <aside className="hidden xl:block w-64 flex-shrink-0" />

      </div> {/* max-w-7xl flex 닫기 */}
    </div>
  )
}