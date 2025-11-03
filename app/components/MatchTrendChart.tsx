'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, LineStyle } from 'lightweight-charts'

interface TrendData {
  timestamp: string
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
}

interface MatchTrendChartProps {
  data: TrendData[]
  darkMode?: boolean
}

export default function MatchTrendChart({ data, darkMode = false }: MatchTrendChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 100,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: darkMode ? '#94a3b8' : '#64748b',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: darkMode ? '#334155' : '#e2e8f0', style: LineStyle.Dotted },
      },
      timeScale: {
        borderColor: darkMode ? '#334155' : '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: darkMode ? '#334155' : '#e2e8f0',
        visible: false,
      },
      crosshair: {
        vertLine: {
          width: 1,
          color: darkMode ? '#64748b' : '#94a3b8',
          style: LineStyle.Dashed,
        },
        horzLine: {
          visible: false,
        },
      },
    })

    // 홈팀 승률 라인 (파란색)
    const homeLineSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      lastValueVisible: false,
      priceLineVisible: false,
    })

    // 원정팀 승률 라인 (빨간색)
    const awayLineSeries = chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      lastValueVisible: false,
      priceLineVisible: false,
    })

    // 무승부 영역 (회색 영역)
    const drawAreaSeries = chart.addAreaSeries({
      topColor: darkMode ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.2)',
      bottomColor: darkMode ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.1)',
      lineColor: darkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(148, 163, 184, 0.4)',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    })

    // 데이터 변환
    const homeData = data.map(d => ({
      time: Math.floor(new Date(d.timestamp).getTime() / 1000) as any,
      value: d.homeWinProbability,
    }))

    const awayData = data.map(d => ({
      time: Math.floor(new Date(d.timestamp).getTime() / 1000) as any,
      value: d.awayWinProbability,
    }))

    const drawData = data.map(d => ({
      time: Math.floor(new Date(d.timestamp).getTime() / 1000) as any,
      value: d.drawProbability + 50, // 중앙에 위치하도록 오프셋
    }))

    homeLineSeries.setData(homeData)
    awayLineSeries.setData(awayData)
    drawAreaSeries.setData(drawData)

    // Y축 범위 설정 (0-100%)
    chart.priceScale('right').applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    })

    // 반응형 처리
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data, darkMode])

  return (
    <div className="relative w-full">
      <div ref={chartContainerRef} className="w-full" />
      
      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500"></div>
          <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>홈</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-slate-400"></div>
          <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>무승부</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-red-500"></div>
          <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>원정</span>
        </div>
      </div>
    </div>
  )
}
