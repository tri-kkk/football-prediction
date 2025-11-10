'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getTeamLogo, TEAM_NAME_KR } from '../teamLogos'

// 리그 정보 (메인과 동일)
const LEAGUES = [
  { 
    code: 'ALL', 
    name: '전체', 
    flag: '🌍',
    logo: null,
    isEmoji: true
  },
  { 
    code: 'PL', 
    name: '프리미어리그', 
    flag: 'https://flagcdn.com/w40/gb-eng.png',
    logo: 'https://crests.football-data.org/PL.svg',
    isEmoji: false
  },
  { 
    code: 'PD', 
    name: '라리가', 
    flag: 'https://flagcdn.com/w40/es.png',
    logo: 'https://crests.football-data.org/PD.svg',
    isEmoji: false
  },
  { 
    code: 'BL1', 
    name: '분데스리가', 
    flag: 'https://flagcdn.com/w40/de.png',
    logo: 'https://crests.football-data.org/BL1.svg',
    isEmoji: false
  },
  { 
    code: 'SA', 
    name: '세리에A', 
    flag: 'https://flagcdn.com/w40/it.png',
    logo: 'https://crests.football-data.org/SA.svg',
    isEmoji: false
  },
  { 
    code: 'FL1', 
    name: '리그1', 
    flag: 'https://flagcdn.com/w40/fr.png',
    logo: 'https://crests.football-data.org/FL1.svg',
    isEmoji: false
  },
  { 
    code: 'CL', 
    name: '챔피언스리그', 
    flag: '⭐',
    logo: 'https://crests.football-data.org/CL.svg',
    isEmoji: false
  },
]

// 팀명 번역 함수
function translateTeamName(englishName: string): string {
  return TEAM_NAME_KR[englishName] || englishName
}

// 경기 데이터 인터페이스
interface Match {
  id: string
  league: string
  leagueLogo: string
  homeTeam: string
  homeTeamKR: string
  awayTeam: string
  awayTeamKR: string
  homeCrest: string
  awayCrest: string
  homeWinRate: number
  drawRate: number
  awayWinRate: number
  volatility: number
  momentum: number
  trend: 'up' | 'down' | 'stable'
  date: string
  time: string
  commenceTime: string
}

// 변동성 계산
function calculateVolatility(trendData: any[]): number {
  if (!trendData || trendData.length < 2) return 0
  const homeProbs = trendData.map(d => d.homeWinProbability)
  const mean = homeProbs.reduce((a, b) => a + b, 0) / homeProbs.length
  const squaredDiffs = homeProbs.map(p => Math.pow(p - mean, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length
  const stdDev = Math.sqrt(variance)
  return Math.min(stdDev * 10, 100)
}

// 모멘텀 계산
function calculateMomentum(trendData: any[]): number {
  if (!trendData || trendData.length < 2) return 0
  const homeProbs = trendData.map(d => d.homeWinProbability)
  const recent = homeProbs.slice(-3)
  const earlier = homeProbs.slice(0, 3)
  if (recent.length === 0 || earlier.length === 0) return 0
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
  return Math.max(-100, Math.min(100, (recentAvg - earlierAvg) * 2))
}

// 3D 지형도 컴포넌트
function MovementMap({ matches, selectedLeague }: { matches: Match[], selectedLeague: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredMatch, setHoveredMatch] = useState<Match | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)
    
    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    
    // 배경 (그라디언트로 깊이감)
    const bgGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2)
    bgGradient.addColorStop(0, '#0a0a0a')
    bgGradient.addColorStop(1, '#000000')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)
    
    const filteredMatches = selectedLeague === 'ALL' 
      ? matches 
      : matches.filter(m => m.league === selectedLeague)
    
    // 그리드
    ctx.strokeStyle = 'rgba(31, 31, 31, 0.5)'
    ctx.lineWidth = 1
    
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    
    for (let i = 0; i <= 6; i++) {
      const y = (height / 6) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    
    // 경기 포인트
    filteredMatches.forEach((match, index) => {
      const x = (index % 10) * (width / 10) + (width / 20)
      const y = Math.floor(index / 10) * (height / 6) + (height / 12)
      
      const hue = 240 - (match.volatility * 1.2)
      const saturation = 80 + match.volatility * 0.2
      const lightness = 55 + match.volatility * 0.25
      
      // 강한 외곽 글로우 (항상 표시)
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 40 + match.volatility * 0.8)
      glowGradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`)
      glowGradient.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.4)`)
      glowGradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0)`)
      ctx.fillStyle = glowGradient
      ctx.fillRect(x - 50, y - 50, 100, 100)
      
      // 메인 원 (더 크게)
      const radius = 12 + match.volatility * 0.25
      // 메인 원에 그라디언트 (입체감)
      const circleGradient = ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius)
      circleGradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness + 15}%)`)
      circleGradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness}%)`)
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = circleGradient
      ctx.fill()
      
      // 강한 테두리
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.lineWidth = 3
      ctx.stroke()
      
      // 변동성 텍스트 표시 (원 중앙에 큰 포인트만)
      if (match.volatility > 40) {
        ctx.save()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 8px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${Math.round(match.volatility)}%`, x, y)
        ctx.restore()
      }
      
      // 경기 정보 텍스트 (원 아래에 팀명 약어)
      ctx.save()
      ctx.fillStyle = '#9ca3af'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'center'
      const homeShort = match.homeTeam.substring(0, 3).toUpperCase()
      const awayShort = match.awayTeam.substring(0, 3).toUpperCase()
      ctx.fillText(`${homeShort}-${awayShort}`, x, y + radius + 12)
      ctx.restore()
      
      if (Math.abs(match.momentum) > 15) {
        ctx.save()
        ctx.translate(x, y)
        const angle = match.momentum > 0 ? -Math.PI / 2 : Math.PI / 2
        ctx.rotate(angle)
        ctx.beginPath()
        ctx.moveTo(0, -radius - 5)
        ctx.lineTo(-4, -radius - 10)
        ctx.lineTo(4, -radius - 10)
        ctx.closePath()
        ctx.fillStyle = match.momentum > 0 ? '#10b981' : '#ef4444'
        ctx.fill()
        ctx.restore()
      }
      
      if (hoveredMatch?.id === match.id) {
        ctx.beginPath()
        ctx.arc(x, y, radius + 5, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'
        ctx.lineWidth = 3
        ctx.stroke()
        
        // 호버 시 풀네임 표시
        ctx.save()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
        ctx.shadowBlur = 4
        ctx.fillText(`${match.homeTeam} vs ${match.awayTeam}`, x, y - radius - 15)
        ctx.restore()
      }
    })
    
  }, [matches, selectedLeague, hoveredMatch])
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setMousePos({ x: e.clientX, y: e.clientY })
    
    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    
    const filteredMatches = selectedLeague === 'ALL' 
      ? matches 
      : matches.filter(m => m.league === selectedLeague)
    
    let found = false
    filteredMatches.forEach((match, index) => {
      const px = (index % 10) * (width / 10) + (width / 20)
      const py = Math.floor(index / 10) * (height / 6) + (height / 12)
      const radius = 8 + match.volatility * 0.15
      
      const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
      if (distance < radius + 5) {
        setHoveredMatch(match)
        found = true
      }
    })
    
    if (!found) setHoveredMatch(null)
  }
  
  return (
    <>
      <div className="relative w-full h-[600px] bg-black rounded-xl overflow-hidden border border-[#1f1f1f]">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredMatch(null)}
        />
        
        {/* 하단 통계 패널 */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
          {/* 실시간 통계 - 좌측 하단 */}
          <div className="bg-[#0f0f0f]/90 p-4 rounded-lg border border-gray-800 min-w-[180px]">
            <div className="text-white text-sm font-semibold mb-3">실시간 통계</div>
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>총 경기:</span>
                <span className="text-white font-semibold">{(selectedLeague === 'ALL' ? matches : matches.filter(m => m.league === selectedLeague)).length}개</span>
              </div>
              <div className="flex justify-between">
                <span>평균 변동성:</span>
                <span className="text-white font-semibold">{matches.length > 0 ? (matches.reduce((acc, m) => acc + m.volatility, 0) / matches.length).toFixed(1) : '0.0'}%</span>
              </div>
              <div className="flex justify-between text-green-400">
                <span>↑ 상승:</span>
                <span className="font-semibold">{matches.filter(m => m.trend === 'up').length}개</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>↓ 하락:</span>
                <span className="font-semibold">{matches.filter(m => m.trend === 'down').length}개</span>
              </div>
            </div>
          </div>
          
          {/* 변동성 범례 - 우측 하단 */}
          <div className="bg-[#0f0f0f]/90 p-4 rounded-lg border border-gray-800">
            <div className="text-white text-sm font-semibold mb-2">변동성 범례</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="text-white text-xs">낮음</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span className="text-white text-xs">중간</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-white text-xs">높음</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 툴팁 - 캔버스 외부에서 전역으로 표시 */}
      {hoveredMatch && (
        <div 
          className="fixed bg-[#0f0f0f] text-white p-4 rounded-lg shadow-2xl border border-gray-800 pointer-events-none z-[9999]"
          style={{
            left: Math.min(mousePos.x + 15, window.innerWidth - 300),
            top: Math.max(60, Math.min(mousePos.y - 60, window.innerHeight - 180)),
          }}
        >
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-800">
            <span className="text-xs font-semibold text-gray-400">{LEAGUES.find(l => l.code === hoveredMatch.league)?.name}</span>
          </div>
          <div className="font-bold mb-3 text-sm">{hoveredMatch.homeTeam} vs {hoveredMatch.awayTeam}</div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-black/50 p-2 rounded">
              <div className="text-gray-500 mb-1">변동성</div>
              <div className="font-semibold text-white text-base">{hoveredMatch.volatility.toFixed(1)}%</div>
            </div>
            <div className="bg-black/50 p-2 rounded">
              <div className="text-gray-500 mb-1">모멘텀</div>
              <div className={`font-semibold text-base ${hoveredMatch.momentum > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {hoveredMatch.momentum > 0 ? '↑' : '↓'} {Math.abs(hoveredMatch.momentum).toFixed(1)}
              </div>
            </div>
          </div>
          
          {/* 승무패 확률 미리보기 */}
          <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-gray-500 mb-1">홈</div>
              <div className="text-blue-400 font-bold">{hoveredMatch.homeWinRate.toFixed(0)}%</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500 mb-1">무</div>
              <div className="text-gray-400 font-bold">{hoveredMatch.drawRate.toFixed(0)}%</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500 mb-1">원정</div>
              <div className="text-red-400 font-bold">{hoveredMatch.awayWinRate.toFixed(0)}%</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// 경기 리스트 (메인과 동일한 카드 디자인)
function MatchList({ matches, selectedLeague }: { matches: Match[], selectedLeague: string }) {
  const filteredMatches = selectedLeague === 'ALL' 
    ? matches 
    : matches.filter(m => m.league === selectedLeague)
  
  const sortedMatches = [...filteredMatches].sort((a, b) => b.volatility - a.volatility)
  
  if (sortedMatches.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-xl font-bold text-white mb-2">경기 데이터가 없습니다</h3>
        <p className="text-gray-400">다른 리그를 선택해보세요</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {sortedMatches.map(match => (
        <div 
          key={match.id}
          className="bg-[#0f0f0f] p-6 rounded-xl border border-[#1f1f1f] hover:border-gray-800 transition-colors"
        >
          {/* 리그 정보 */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-gray-400">{LEAGUES.find(l => l.code === match.league)?.name}</span>
            <span className="text-gray-600 mx-1">•</span>
            <span className="text-sm text-gray-400">{match.date} • 오전 {match.time}</span>
          </div>
          
          {/* 팀 정보 - 영문 팀명 사용 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 flex-1">
              <img src={match.homeCrest} alt={match.homeTeam} className="w-12 h-12 object-contain" />
              <span className="text-white font-semibold text-base">{match.homeTeam}</span>
            </div>
            <div className="text-gray-600 text-2xl font-bold mx-4">VS</div>
            <div className="flex items-center gap-3 flex-1 justify-end">
              <span className="text-white font-semibold text-base">{match.awayTeam}</span>
              <img src={match.awayCrest} alt={match.awayTeam} className="w-12 h-12 object-contain" />
            </div>
          </div>
          
          {/* 승무패 확률 */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* 홈 */}
            <div className="relative overflow-hidden rounded-xl py-3 px-3 bg-[#000000]">
              <div 
                className="absolute bottom-0 left-0 h-1 transition-all duration-500 bg-blue-500"
                style={{ width: `${match.homeWinRate}%` }}
              ></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="text-xs font-medium mb-1 text-gray-500">홈</div>
                <div className="text-3xl font-black text-white">{match.homeWinRate.toFixed(1)}%</div>
                <div className="h-4 mt-1"></div>
              </div>
            </div>
            
            {/* 무승부 */}
            <div className="relative overflow-hidden rounded-xl py-3 px-3 bg-[#000000]">
              <div 
                className="absolute bottom-0 left-0 h-1 transition-all duration-500 bg-gray-600"
                style={{ width: `${match.drawRate}%` }}
              ></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="text-xs font-medium mb-1 text-gray-500">무승부</div>
                <div className="text-3xl font-black text-gray-400">{match.drawRate.toFixed(1)}%</div>
                <div className="h-4 mt-1"></div>
              </div>
            </div>
            
            {/* 원정 */}
            <div className="relative overflow-hidden rounded-xl py-3 px-3 bg-[#000000]">
              <div 
                className="absolute bottom-0 left-0 h-1 transition-all duration-500 bg-red-500"
                style={{ width: `${match.awayWinRate}%` }}
              ></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="text-xs font-medium mb-1 text-gray-500">원정</div>
                <div className="text-3xl font-black text-white">{match.awayWinRate.toFixed(1)}%</div>
                <div className="h-4 mt-1"></div>
              </div>
            </div>
          </div>
          
          {/* 변동성/모멘텀 정보 */}
          <div className="flex items-center justify-between text-sm pt-4 border-t border-[#1f1f1f]">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-gray-500">변동성: </span>
                <span className={`font-semibold ${
                  match.volatility > 70 ? 'text-red-400' : 
                  match.volatility > 40 ? 'text-yellow-400' : 
                  'text-green-400'
                }`}>
                  {match.volatility.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">모멘텀: </span>
                <span className={`font-semibold ${match.momentum > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {match.momentum > 0 ? '↑' : '↓'} {Math.abs(match.momentum).toFixed(1)}
                </span>
              </div>
            </div>
            <div className={`px-3 py-1 rounded text-xs font-semibold ${
              match.volatility > 70 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              match.volatility > 40 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
              'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}>
              {match.volatility > 70 ? '🔥 격변 중' : match.volatility > 40 ? '⚡ 활발' : '✅ 안정'}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MovementPage() {
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [matches, setMatches] = useState<Match[]>([])
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      
      try {
        const leagues = selectedLeague === 'ALL' 
          ? ['PL', 'PD', 'BL1', 'SA', 'FL1', 'CL']
          : [selectedLeague]
        
        const promises = leagues.map(league => 
          fetch(`/api/odds-from-db?league=${league}`).then(r => r.json())
        )
        
        const results = await Promise.all(promises)
        const allMatches = results.flatMap(result => 
          result.success ? result.data : []
        )
        
        // 종료된 경기 필터링 (경기 시작 후 3시간 이상 지난 경기 제외)
        const now = new Date()
        const activeMatches = allMatches.filter((match: any) => {
          const commenceDate = new Date(match.commence_time)
          const hoursFromStart = (now.getTime() - commenceDate.getTime()) / (1000 * 60 * 60)
          // 경기 시작 후 3시간 이내만 표시 (종료되지 않은 경기)
          return hoursFromStart < 3
        })
        
        console.log('📊 활성 경기 수:', activeMatches.length, '/ 전체:', allMatches.length)
        
        const matchesWithAnalysis = await Promise.all(
          activeMatches.slice(0, 40).map(async (match: any) => {
            try {
              const trendResponse = await fetch(`/api/match-trend?matchId=${match.match_id}`)
              const trendResult = await trendResponse.json()
              
              let volatility = 0
              let momentum = 0
              
              if (trendResult.success && trendResult.data && trendResult.data.length > 0) {
                volatility = calculateVolatility(trendResult.data)
                momentum = calculateMomentum(trendResult.data)
              } else {
                volatility = Math.random() * 30
                momentum = 0
              }
              
              const commenceDate = new Date(match.commence_time)
              const now = new Date()
              const hoursUntil = (commenceDate.getTime() - now.getTime()) / (1000 * 60 * 60)
              
              let dateStr = '오늘'
              if (hoursUntil > 24) {
                dateStr = `${Math.floor(hoursUntil / 24)}일 후`
              } else if (hoursUntil < -24) {
                dateStr = '종료'
              } else if (hoursUntil < 0) {
                dateStr = '라이브'
              }
              
              const timeStr = commenceDate.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })
              
              const homeTeamEng = match.home_team || 'Unknown'
              const awayTeamEng = match.away_team || 'Unknown'
              
              return {
                id: match.match_id,
                league: match.league_code,
                leagueLogo: LEAGUES.find(l => l.code === match.league_code)?.logo,
                homeTeam: homeTeamEng,  // 영문 그대로 사용
                homeTeamKR: translateTeamName(homeTeamEng),  // 한글은 보관만
                awayTeam: awayTeamEng,  // 영문 그대로 사용
                awayTeamKR: translateTeamName(awayTeamEng),  // 한글은 보관만
                homeCrest: getTeamLogo(translateTeamName(homeTeamEng)),
                awayCrest: getTeamLogo(translateTeamName(awayTeamEng)),
                homeWinRate: match.home_probability || 0,
                drawRate: match.draw_probability || 0,
                awayWinRate: match.away_probability || 0,
                volatility,
                momentum,
                trend: momentum > 10 ? 'up' as const : momentum < -10 ? 'down' as const : 'stable' as const,
                date: dateStr,
                time: timeStr,
                commenceTime: match.commence_time
              }
            } catch (err) {
              console.error('경기 분석 실패:', err)
              return null
            }
          })
        )
        
        setMatches(matchesWithAnalysis.filter(m => m !== null) as Match[])
        
      } catch (err: any) {
        console.error('데이터 로드 실패:', err)
        setError(err.message || '데이터를 불러올 수 없습니다')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [selectedLeague])
  
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 타이틀 */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">
            🌊 배당 무브먼트 맵
          </h1>
          <p className="text-gray-400">
            실시간 배당 변화를 3D 지형도로 시각화합니다. 높이는 변동성을, 색상은 리스크를 나타냅니다.
          </p>
        </div>
        
        {/* 컨트롤 */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {/* 리그 필터 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {LEAGUES.map(league => (
              <button
                key={league.code}
                onClick={() => setSelectedLeague(league.code)}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  selectedLeague === league.code
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#1f1f1f] text-gray-400 hover:bg-gray-800'
                }`}
              >
                {league.isEmoji ? (
                  <span>{league.flag}</span>
                ) : (
                  <img src={league.flag} alt="" className="w-5 h-4" />
                )}
                <span>{league.name}</span>
              </button>
            ))}
          </div>
          
          {/* 뷰 모드 */}
          <div className="flex items-center gap-2 bg-[#1f1f1f] p-1 rounded-lg">
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🗺️ 맵 뷰
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📋 리스트 뷰
            </button>
          </div>
        </div>
        
        {/* 로딩 */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-spin">⚽</div>
            <h3 className="text-xl font-bold text-white mb-2">데이터 로딩 중...</h3>
            <p className="text-gray-400">변동성과 모멘텀을 분석하고 있습니다</p>
          </div>
        )}
        
        {/* 에러 */}
        {error && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-white mb-2">에러 발생</h3>
            <p className="text-gray-400">{error}</p>
          </div>
        )}
        
        {/* 컨텐츠 */}
        {!loading && !error && (
          <>
            {viewMode === 'map' ? (
              <MovementMap matches={matches} selectedLeague={selectedLeague} />
            ) : (
              <MatchList matches={matches} selectedLeague={selectedLeague} />
            )}
            
            {/* 인사이트 카드 */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 p-6 rounded-xl border border-red-500/20">
                <div className="text-3xl mb-2">🔥</div>
                <div className="text-white font-semibold mb-1">격변 중인 경기</div>
                <div className="text-3xl font-black text-red-400">
                  {matches.filter(m => m.volatility > 70).length}개
                </div>
                <div className="text-xs text-gray-500 mt-2">변동성 70% 이상</div>
              </div>
              
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 p-6 rounded-xl border border-green-500/20">
                <div className="text-3xl mb-2">📈</div>
                <div className="text-white font-semibold mb-1">상승 추세</div>
                <div className="text-3xl font-black text-green-400">
                  {matches.filter(m => m.trend === 'up').length}개
                </div>
                <div className="text-xs text-gray-500 mt-2">모멘텀 +10 이상</div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-6 rounded-xl border border-blue-500/20">
                <div className="text-3xl mb-2">⚡</div>
                <div className="text-white font-semibold mb-1">평균 변동성</div>
                <div className="text-3xl font-black text-blue-400">
                  {matches.length > 0 ? (matches.reduce((acc, m) => acc + m.volatility, 0) / matches.length).toFixed(1) : '0.0'}%
                </div>
                <div className="text-xs text-gray-500 mt-2">전체 경기 기준</div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}