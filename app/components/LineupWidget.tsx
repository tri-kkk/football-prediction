'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Player {
  id: number
  name: string
  number: number
  position: string
  grid?: string
  coordinates: { x: number; y: number }
  photo?: string
}

interface TeamLineup {
  team: {
    id: number
    name: string
    logo: string
  }
  coach: {
    id: number
    name: string
    photo: string
  }
  formation: string
  formationArray: number[]
  startXI: Player[]
  substitutes: Player[]
}

interface LineupData {
  success: boolean
  available: boolean
  home?: TeamLineup
  away?: TeamLineup
}

interface LineupWidgetProps {
  fixtureId: number
  homeTeam?: string
  awayTeam?: string
  testMode?: boolean
}

export default function LineupWidget({ fixtureId, homeTeam, awayTeam, testMode = false }: LineupWidgetProps) {
  const [lineupData, setLineupData] = useState<LineupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(true)

  // 화면 크기 감지
  useEffect(() => {
    const checkScreen = () => {
      setIsDesktop(window.innerWidth >= 1024) // lg breakpoint
    }
    
    checkScreen()
    window.addEventListener('resize', checkScreen)
    return () => window.removeEventListener('resize', checkScreen)
  }, [])

  useEffect(() => {
    fetchLineup()
  }, [fixtureId, testMode])

  const fetchLineup = async () => {
    try {
      setLoading(true)
      const url = testMode 
        ? `/api/lineup-details?fixtureId=${fixtureId}&test=true`
        : `/api/lineup-details?fixtureId=${fixtureId}`
      
      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setLineupData(data)
        setError(null)
      } else {
        setError(data.message || '라인업을 불러올 수 없습니다')
      }
    } catch (err: any) {
      console.error('Error fetching lineup:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-lg p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          <span className="ml-3 text-gray-400">라인업 로딩 중...</span>
        </div>
      </div>
    )
  }

  if (error || !lineupData?.available) {
    return (
      <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-center text-center py-8">
          <div>
            <div className="text-4xl mb-3">👥</div>
            <p className="text-gray-400 mb-2">
              {error || '라인업이 아직 발표되지 않았습니다'}
            </p>
            <p className="text-sm text-gray-600">
              경기 시작 1-2시간 전에 확인해주세요
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { home, away } = lineupData

  if (!home || !away) {
    return null
  }

  // 🎯 핵심: grid 좌표를 실제 축구장 위치로 정확히 변환
  const calculatePosition = (player: Player, isHome: boolean, lineup: TeamLineup) => {
    if (!player.grid) {
      console.warn('No grid for player:', player.name)
      return { left: 50, top: 50 }
    }

    const [row, col] = player.grid.split(':').map(n => parseInt(n))
    
    // 포메이션 분석 (예: "4-2-3-1" → [4, 2, 3, 1])
    const formation = lineup.formationArray
    const totalLines = formation.length
    
    // 🏟️ 가로 방향 (깊이): 골대에서부터의 거리
    let left: number
    
    if (isHome) {
      // 홈팀: 왼쪽에서 오른쪽으로 (0% ~ 48%)
      if (row === 1) {
        // 골키퍼
        left = 6
      } else {
        // 필드 플레이어: row 2부터 시작
        // 라인 간격을 포메이션 라인 수에 따라 동적 계산
        const fieldDepth = 42  // 골키퍼 이후 사용 가능한 깊이 (6% ~ 48%)
        const lineSpacing = fieldDepth / (totalLines + 0.5)
        left = 6 + (row - 1) * lineSpacing
      }
    } else {
      // 원정팀: 오른쪽에서 왼쪽으로 (52% ~ 94%)
      if (row === 1) {
        // 골키퍼
        left = 94
      } else {
        // 필드 플레이어
        const fieldDepth = 42
        const lineSpacing = fieldDepth / (totalLines + 0.5)
        left = 94 - (row - 1) * lineSpacing
      }
    }

    // 🏟️ 세로 방향 (좌우): 터치라인 간 위치
    let top: number
    
    if (player.position === 'G') {
      // 골키퍼는 항상 중앙
      top = 50
    } else {
      // 현재 라인의 선수 수 파악
      const lineIndex = row - 2  // row 2가 첫 번째 라인 (index 0)
      const playersInLine = lineIndex >= 0 && lineIndex < formation.length 
        ? formation[lineIndex] 
        : 1
      
      // 선수들을 균등하게 배치
      // 가장자리 15% 여백, 중간 70% 사용
      const minTop = 15
      const maxTop = 85
      const usableWidth = maxTop - minTop
      
      if (playersInLine === 1) {
        // 1명이면 중앙
        top = 50
      } else {
        // 여러 명이면 균등 분배
        const spacing = usableWidth / (playersInLine - 1)
        top = minTop + (col - 1) * spacing
      }
    }

    return { left, top }
  }

  // 선수 카드 컴포넌트
  const PlayerCard = ({ 
    player, 
    color,
    position 
  }: { 
    player: Player
    color: 'blue' | 'red'
    position: { left: number; top: number }
  }) => {
    const photoUrl = `https://media.api-sports.io/football/players/${player.id}.png`
    
    return (
      <div 
        className="absolute transform -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${position.left}%`, top: `${position.top}%` }}
      >
        <div className="flex flex-col items-center">
          {/* 선수 원 */}
          <div className="relative">
            <div 
              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 overflow-hidden ${
                color === 'blue' 
                  ? 'bg-blue-600 border-blue-400' 
                  : 'bg-red-600 border-red-400'
              }`}
            >
              <Image
                src={photoUrl}
                alt={player.name}
                width={48}
                height={48}
                className="rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
            
            {/* 번호 배지 - 우측 하단 */}
            <div 
              className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                color === 'blue'
                  ? 'bg-blue-700 border-blue-300 text-white'
                  : 'bg-red-700 border-red-300 text-white'
              }`}
            >
              {player.number}
            </div>
          </div>
          
          {/* 이름 */}
          <div className="mt-1 px-2 py-0.5 bg-black/80 rounded text-[10px] text-white font-semibold max-w-[60px] truncate text-center">
            {player.name.split(' ').pop()}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a1a] rounded-lg overflow-hidden border border-gray-700">
      {/* 헤더 */}
      <div className="bg-[#0a0a0a] px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            <h3 className="text-lg font-bold text-white">선발 라인업</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Image src={home.team.logo} alt={home.team.name} width={24} height={24} />
              <span className="text-sm text-blue-400 font-bold">{home.formation}</span>
            </div>
            <span className="text-sm text-gray-500">vs</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-400 font-bold">{away.formation}</span>
              <Image src={away.team.logo} alt={away.team.name} width={24} height={24} />
            </div>
          </div>
        </div>
      </div>

      {/* 데스크탑: 축구장 시각화 */}
      {isDesktop ? (
        <div className="relative overflow-x-auto">
          <div 
            className="relative bg-gradient-to-r from-green-950 via-green-900 to-green-950"
            style={{ 
              minWidth: '1000px',
              height: '500px'
            }}
          >
            {/* 축구장 라인 */}
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 1000 500">
              <line x1="500" y1="0" x2="500" y2="500" stroke="white" strokeWidth="2" />
              <circle cx="500" cy="250" r="60" fill="none" stroke="white" strokeWidth="2" />
              <circle cx="500" cy="250" r="4" fill="white" />
              <rect x="0" y="125" width="150" height="250" fill="none" stroke="white" strokeWidth="2" />
              <rect x="0" y="175" width="50" height="150" fill="none" stroke="white" strokeWidth="2" />
              <rect x="850" y="125" width="150" height="250" fill="none" stroke="white" strokeWidth="2" />
              <rect x="950" y="175" width="50" height="150" fill="none" stroke="white" strokeWidth="2" />
            </svg>

            {/* 팀 정보 오버레이 */}
            <div className="absolute left-4 top-4 z-20">
              <div className="flex items-center gap-2 bg-black/70 rounded-lg px-3 py-2 border border-blue-500/30">
                <Image src={home.team.logo} alt={home.team.name} width={28} height={28} />
                <div>
                  <div className="text-white font-bold text-xs">{home.team.name}</div>
                  <div className="text-[10px] text-gray-400">{home.coach.name}</div>
                </div>
              </div>
            </div>

            <div className="absolute right-4 top-4 z-20">
              <div className="flex items-center gap-2 bg-black/70 rounded-lg px-3 py-2 border border-red-500/30">
                <div className="text-right">
                  <div className="text-white font-bold text-xs">{away.team.name}</div>
                  <div className="text-[10px] text-gray-400">{away.coach.name}</div>
                </div>
                <Image src={away.team.logo} alt={away.team.name} width={28} height={28} />
              </div>
            </div>

            {/* 선수 배치 */}
            <div className="relative w-full h-full">
              {home.startXI.map((player, idx) => {
                const position = calculatePosition(player, true, home)
                return (
                  <PlayerCard 
                    key={`home-${player.id || idx}`}
                    player={player} 
                    color="blue"
                    position={position}
                  />
                )
              })}

              {away.startXI.map((player, idx) => {
                const position = calculatePosition(player, false, away)
                return (
                  <PlayerCard 
                    key={`away-${player.id || idx}`}
                    player={player} 
                    color="red"
                    position={position}
                  />
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* 모바일/태블릿: 선수 리스트 */
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 홈팀 리스트 */}
            <div className="bg-[#0a0a0a] rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700">
                <Image src={home.team.logo} alt={home.team.name} width={32} height={32} />
                <div>
                  <div className="text-white font-bold text-sm">{home.team.name}</div>
                  <div className="text-xs text-gray-400">{home.coach.name}</div>
                </div>
              </div>

              <div className="space-y-2">
                {home.startXI.map((player, idx) => (
                  <div 
                    key={player.id || idx}
                    className="flex items-center gap-2 p-2 rounded bg-gray-800/50"
                  >
                    <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">{player.number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{player.name}</div>
                      <div className="text-xs text-gray-500">{player.position}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 원정팀 리스트 */}
            <div className="bg-[#0a0a0a] rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700">
                <Image src={away.team.logo} alt={away.team.name} width={32} height={32} />
                <div>
                  <div className="text-white font-bold text-sm">{away.team.name}</div>
                  <div className="text-xs text-gray-400">{away.coach.name}</div>
                </div>
              </div>

              <div className="space-y-2">
                {away.startXI.map((player, idx) => (
                  <div 
                    key={player.id || idx}
                    className="flex items-center gap-2 p-2 rounded bg-gray-800/50"
                  >
                    <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">{player.number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{player.name}</div>
                      <div className="text-xs text-gray-500">{player.position}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 교체 선수 목록 (항상 표시) */}
      <div className="bg-[#0a0a0a] px-6 py-4 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-6">
          {/* 홈팀 교체 */}
          <div>
            <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
              <span>🔄</span>
              교체 선수 (홈)
            </h4>
            <div className="space-y-2">
              {home.substitutes.slice(0, 7).map((player, idx) => (
                <div key={player.id || idx} className="flex items-center gap-2 text-xs">
                  <span className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold">
                    {player.number}
                  </span>
                  <span className="text-gray-300 flex-1 truncate">{player.name}</span>
                  <span className="text-gray-500">{player.position}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 원정팀 교체 */}
          <div>
            <h4 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
              <span>🔄</span>
              교체 선수 (원정)
            </h4>
            <div className="space-y-2">
              {away.substitutes.slice(0, 7).map((player, idx) => (
                <div key={player.id || idx} className="flex items-center gap-2 text-xs">
                  <span className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold">
                    {player.number}
                  </span>
                  <span className="text-gray-300 flex-1 truncate">{player.name}</span>
                  <span className="text-gray-500">{player.position}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}