'use client'

import { useMemo } from 'react'

interface MatchEvent {
  time: number
  type: 'goal' | 'card' | 'subst' | 'var' | 'penalty'
  team: 'home' | 'away'
  player: string
  detail?: string
}

interface MomentumPoint {
  time: number
  value: number // -100 (어웨이 완전 우세) ~ +100 (홈 완전 우세)
}

interface MomentumGraphProps {
  events?: MatchEvent[]
  elapsed: number
  status: string
  homeTeam: string
  awayTeam: string
  language: string
  // 실제 API에서 모멘텀 데이터가 오면 사용
  momentumData?: MomentumPoint[]
}

// ============================================================
// 📈 FotMob 스타일 모멘텀 그래프
// ============================================================
export default function MomentumGraph({
  events = [],
  elapsed,
  status,
  homeTeam,
  awayTeam,
  language,
  momentumData
}: MomentumGraphProps) {
  const isLive = ['1H', '2H', 'ET', 'P', 'LIVE'].includes(status)
  const maxTime = status === 'ET' ? 120 : 90

  // 모멘텀 데이터 생성 (API 데이터가 없으면 이벤트 기반으로 시뮬레이션)
  const graphData = useMemo(() => {
    if (momentumData && momentumData.length > 0) {
      return momentumData
    }

    // 이벤트 기반 모멘텀 시뮬레이션
    const points: MomentumPoint[] = [{ time: 0, value: 0 }]
    let currentMomentum = 0

    // 시간순 정렬
    const sortedEvents = [...events].sort((a, b) => a.time - b.time)

    // 1분 단위로 모멘텀 포인트 생성
    for (let t = 1; t <= Math.min(elapsed, maxTime); t++) {
      // 해당 시간의 이벤트 확인
      const timeEvents = sortedEvents.filter(e => e.time === t)
      
      for (const event of timeEvents) {
        const isHome = event.team === 'home'
        const direction = isHome ? 1 : -1

        switch (event.type) {
          case 'goal':
            currentMomentum += direction * 35
            break
          case 'penalty':
            currentMomentum += direction * 25
            break
          case 'card':
            // 상대팀에게 유리
            currentMomentum -= direction * 15
            break
          case 'subst':
            // 약간의 변동
            currentMomentum += direction * 5
            break
        }
      }

      // 자연스러운 등락 추가 (랜덤 시뮬레이션)
      const noise = (Math.sin(t * 0.3) * 10) + (Math.cos(t * 0.7) * 8)
      const trend = Math.sin(t * 0.05) * 15

      // 모멘텀 범위 제한 (-100 ~ 100)
      currentMomentum = Math.max(-100, Math.min(100, currentMomentum + noise * 0.1))
      
      // 시간이 지나면 중립으로 회귀
      currentMomentum *= 0.98

      points.push({
        time: t,
        value: currentMomentum + trend + noise * 0.3
      })
    }

    return points
  }, [events, elapsed, maxTime, momentumData])

  // SVG 경로 생성
  const generatePath = useMemo(() => {
    if (graphData.length < 2) return ''

    const width = 100
    const height = 50
    const centerY = height / 2

    const points = graphData.map((point, index) => {
      const x = (point.time / maxTime) * width
      const y = centerY - (point.value / 100) * (height / 2 - 5)
      return { x, y }
    })

    // Smooth curve using bezier
    let path = `M ${points[0].x} ${points[0].y}`
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cpX = (prev.x + curr.x) / 2
      path += ` Q ${cpX} ${prev.y} ${curr.x} ${curr.y}`
    }

    return path
  }, [graphData, maxTime])

  // 그라데이션 영역 경로
  const generateAreaPath = useMemo(() => {
    if (graphData.length < 2) return { homePath: '', awayPath: '' }

    const width = 100
    const height = 50
    const centerY = height / 2

    const points = graphData.map((point) => {
      const x = (point.time / maxTime) * width
      const y = centerY - (point.value / 100) * (height / 2 - 5)
      return { x, y, value: point.value }
    })

    // 홈팀 영역 (위쪽)
    let homePath = `M ${points[0].x} ${centerY}`
    for (const point of points) {
      if (point.value > 0) {
        homePath += ` L ${point.x} ${point.y}`
      } else {
        homePath += ` L ${point.x} ${centerY}`
      }
    }
    homePath += ` L ${points[points.length - 1].x} ${centerY} Z`

    // 어웨이팀 영역 (아래쪽)
    let awayPath = `M ${points[0].x} ${centerY}`
    for (const point of points) {
      if (point.value < 0) {
        awayPath += ` L ${point.x} ${point.y}`
      } else {
        awayPath += ` L ${point.x} ${centerY}`
      }
    }
    awayPath += ` L ${points[points.length - 1].x} ${centerY} Z`

    return { homePath, awayPath }
  }, [graphData, maxTime])

  // 현재 모멘텀 값
  const currentMomentum = graphData.length > 0 ? graphData[graphData.length - 1].value : 0
  const homeAdvantage = currentMomentum > 0
  const awayAdvantage = currentMomentum < 0

  // 이벤트 마커 위치
  const eventMarkers = useMemo(() => {
    return events.map(event => {
      const x = (event.time / maxTime) * 100
      const point = graphData.find(p => p.time === event.time)
      const y = point ? 50 - (point.value / 100) * 20 : 25
      return { ...event, x, y }
    })
  }, [events, graphData, maxTime])

  return (
    <div className="w-full bg-[#1a1a1a] rounded-xl p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${homeAdvantage ? 'bg-blue-500' : 'bg-gray-600'}`} />
          <span className={`text-xs font-semibold ${homeAdvantage ? 'text-blue-400' : 'text-gray-500'}`}>
            {homeTeam}
          </span>
        </div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
          {language === 'ko' ? '모멘텀' : 'Momentum'}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${awayAdvantage ? 'text-red-400' : 'text-gray-500'}`}>
            {awayTeam}
          </span>
          <div className={`w-2 h-2 rounded-full ${awayAdvantage ? 'bg-red-500' : 'bg-gray-600'}`} />
        </div>
      </div>

      {/* 그래프 */}
      <div className="relative h-32 w-full">
        <svg 
          viewBox="0 0 100 50" 
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* 그라데이션 정의 */}
          <defs>
            <linearGradient id="homeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="awayGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6B7280" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>

          {/* 배경 그리드 */}
          <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="#2a2a2a" strokeWidth="0.3" strokeDasharray="2,2" />
          <line x1="0" y1="25" x2="100" y2="25" stroke="#333" strokeWidth="0.5" />
          <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="#2a2a2a" strokeWidth="0.3" strokeDasharray="2,2" />
          
          {/* 하프타임 라인 */}
          <line x1="50" y1="0" x2="50" y2="50" stroke="#444" strokeWidth="0.5" strokeDasharray="2,2" />

          {/* 홈팀 영역 (위) */}
          <path
            d={generateAreaPath.homePath}
            fill="url(#homeGradient)"
          />

          {/* 어웨이팀 영역 (아래) */}
          <path
            d={generateAreaPath.awayPath}
            fill="url(#awayGradient)"
          />

          {/* 메인 라인 */}
          <path
            d={generatePath}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 이벤트 마커 */}
          {eventMarkers.map((event, idx) => (
            <g key={idx}>
              {event.type === 'goal' && (
                <circle
                  cx={event.x}
                  cy={event.y}
                  r="2"
                  fill="white"
                  stroke={event.team === 'home' ? '#3B82F6' : '#EF4444'}
                  strokeWidth="1"
                />
              )}
              {event.type === 'card' && (
                <rect
                  x={event.x - 1}
                  y={event.y - 1.5}
                  width="2"
                  height="3"
                  fill={event.detail === 'Red Card' ? '#EF4444' : '#FBBF24'}
                  rx="0.3"
                />
              )}
            </g>
          ))}

          {/* 현재 위치 표시 (라이브일 때) */}
          {isLive && graphData.length > 0 && (
            <g>
              <circle
                cx={(elapsed / maxTime) * 100}
                cy={25 - (currentMomentum / 100) * 20}
                r="2.5"
                fill="#10B981"
                className="animate-pulse"
              />
              <circle
                cx={(elapsed / maxTime) * 100}
                cy={25 - (currentMomentum / 100) * 20}
                r="4"
                fill="none"
                stroke="#10B981"
                strokeWidth="0.5"
                opacity="0.5"
                className="animate-ping"
              />
            </g>
          )}
        </svg>

        {/* 팀 라벨 */}
        <div className="absolute left-0 top-1 text-[9px] text-blue-400/70 font-medium">
          {language === 'ko' ? '홈 우세' : 'HOME'}
        </div>
        <div className="absolute left-0 bottom-1 text-[9px] text-red-400/70 font-medium">
          {language === 'ko' ? '원정 우세' : 'AWAY'}
        </div>
      </div>

      {/* 시간 레이블 */}
      <div className="flex justify-between mt-2 text-[10px] text-gray-600 px-1">
        <span>0'</span>
        <span>15'</span>
        <span>30'</span>
        <span>HT</span>
        <span>60'</span>
        <span>75'</span>
        <span>90'</span>
      </div>

      {/* 현재 상태 표시 */}
      {isLive && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                homeAdvantage ? 'bg-blue-500' : awayAdvantage ? 'bg-red-500' : 'bg-gray-500'
              }`} />
              <span className="text-xs text-gray-400">
                {language === 'ko' ? '현재 압박' : 'Current pressure'}:
              </span>
            </div>
            <span className={`text-sm font-bold ${
              homeAdvantage ? 'text-blue-400' : awayAdvantage ? 'text-red-400' : 'text-gray-400'
            }`}>
              {homeAdvantage 
                ? `${homeTeam} +${Math.abs(Math.round(currentMomentum))}%`
                : awayAdvantage 
                  ? `${awayTeam} +${Math.abs(Math.round(currentMomentum))}%`
                  : (language === 'ko' ? '균형' : 'Balanced')
              }
            </span>
          </div>
        </div>
      )}

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full border border-gray-400" />
          <span>{language === 'ko' ? '골' : 'Goal'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-3 bg-yellow-400 rounded-sm" />
          <span>{language === 'ko' ? '경고' : 'Yellow'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-3 bg-red-500 rounded-sm" />
          <span>{language === 'ko' ? '퇴장' : 'Red'}</span>
        </div>
      </div>
    </div>
  )
}
