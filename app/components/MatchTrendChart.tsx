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
      height: 300,
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
        visible: true,
      },
      crosshair: {
        vertLine: {
          width: 1,
          color: darkMode ? '#64748b' : '#94a3b8',
          style: LineStyle.Dashed,
        },
        horzLine: {
          visible: true,
          color: darkMode ? '#64748b' : '#94a3b8',
          style: LineStyle.Dashed,
        },
      },
    })

    // Home team win probability line (blue)
    const homeLineSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 3,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      lastValueVisible: false,
      priceLineVisible: false,
    })

    // Away team win probability line (red)
    const awayLineSeries = chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 3,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      lastValueVisible: false,
      priceLineVisible: false,
    })

    // Draw probability line (gray)
    const drawLineSeries = chart.addLineSeries({
      color: '#9ca3af',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      lastValueVisible: false,
      priceLineVisible: false,
      lineStyle: LineStyle.Dashed,
    })

    // Data conversion
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
      value: d.drawProbability,
    }))

    homeLineSeries.setData(homeData)
    awayLineSeries.setData(awayData)
    drawLineSeries.setData(drawData)

    // Y-axis range setting (0-100%)
    chart.priceScale('right').applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    })

    // Responsive handling
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
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500"></div>
          <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>HOME</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-slate-400"></div>
          <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>DRAW</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-red-500"></div>
          <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>AWAY</span>
        </div>
      </div>
    </div>
  )
}
