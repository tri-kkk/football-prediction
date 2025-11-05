'use client'

interface MiniTrendChartProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  showChange?: boolean
  timeRange?: '6h' | '24h'
}

export default function MiniTrendChart({
  data,
  width = 100,
  height = 30,
  color = '#3b82f6',
  showChange = true,
  timeRange = '6h'
}: MiniTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-slate-500 text-xs"
        style={{ width, height }}
      >
        No Data
      </div>
    )
  }

  // 데이터 정규화 (0-100 → SVG 좌표)
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  // 변화율 계산
  const firstValue = data[0]
  const lastValue = data[data.length - 1]
  const change = ((lastValue - firstValue) / firstValue) * 100
  const isPositive = change > 0

  return (
    <div className="flex flex-col items-center gap-1">
      {/* SVG 차트 */}
      <svg 
        width={width} 
        height={height}
        className="overflow-visible"
      >
        {/* 배경 영역 */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* 영역 채우기 */}
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={`url(#gradient-${color})`}
        />

        {/* 라인 */}
        <polyline
          points={points}
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 마지막 포인트 강조 */}
        {data.length > 0 && (
          <circle
            cx={(data.length - 1) / (data.length - 1) * width}
            cy={height - ((lastValue - min) / range) * height}
            r="3"
            fill={color}
            className="animate-pulse"
          />
        )}
      </svg>

      {/* 변화율 표시 */}
      {showChange && (
        <div 
          className={`text-[10px] font-bold ${
            isPositive ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </div>
      )}

      {/* 시간 범위 표시 */}
      <div className="text-[9px] text-slate-500">
        {timeRange}
      </div>
    </div>
  )
}

// 사용 예시 (주석)
/*
<MiniTrendChart 
  data={[45, 47, 46, 48, 50, 52]} 
  width={80}
  height={25}
  color="#3b82f6"
  showChange={true}
  timeRange="6h"
/>
*/
