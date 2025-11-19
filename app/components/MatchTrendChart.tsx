// components/MatchTrendChart.tsx
'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts'

interface TrendData {
  timestamp: string
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
}

interface MatchTrendChartProps {
  data: TrendData[]
  darkMode: boolean
}

export default function MatchTrendChart({ data, darkMode }: MatchTrendChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) {
      console.warn('⚠️ Chart: No container or no data')
      return
    }

    const container = chartContainerRef.current
    
    console.log('📊 Chart rendering with', data.length, 'points')
    
    // 🔧 페이드인 제거 - 즉시 표시
    container.style.opacity = '1'
    
    // Y축 범위 동적 계산
    const allValues = data.flatMap(point => [
      point.homeWinProbability,
      point.drawProbability,
      point.awayWinProbability
    ])
    const minValue = Math.min(...allValues)
    const maxValue = Math.max(...allValues)
    const range = maxValue - minValue
    
    // 동적 패딩
    let padding
    if (range < 10) {
      padding = range * 1.5
    } else if (range < 20) {
      padding = range * 0.8
    } else {
      padding = range * 0.3
    }
    
    const yMin = Math.max(0, minValue - padding)
    const yMax = Math.min(100, maxValue + padding)

    // 차트 생성
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },  // 투명 배경
        textColor: darkMode ? '#9ca3af' : '#1f2937',  // 밝은 회색
      },
      grid: {
        vertLines: { color: darkMode ? '#374151' : '#e5e7eb', style: 1 },  // 더 밝게
        horzLines: { color: darkMode ? '#374151' : '#e5e7eb', style: 1 },  // 더 밝게
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: darkMode ? '#374151' : '#e5e7eb',  // 더 밝게
      },
      rightPriceScale: {
        borderColor: darkMode ? '#374151' : '#e5e7eb',  // 더 밝게
        autoScale: false,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: darkMode ? '#4b5563' : '#9ca3af',
          style: 2,
        },
        horzLine: {
          width: 1,
          color: darkMode ? '#4b5563' : '#9ca3af',
          style: 2,
        },
      },
    })

    chartRef.current = chart

    // 홈팀 승률 (파란색 영역 - 강화)
    const homeSeries = chart.addAreaSeries({
      topColor: darkMode ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.4)',
      bottomColor: darkMode ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.1)',
      lineColor: '#3b82f6',
      lineWidth: 4,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
      lastValueVisible: true,
      priceLineVisible: false,
    })

    // 무승부 (회색 선 - 밝게)
    const drawSeries = chart.addLineSeries({
      color: darkMode ? '#9ca3af' : '#6b7280',  // 다크모드에서 더 밝게
      lineWidth: 3,
      lineStyle: 2, // 점선
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      lastValueVisible: true,
      priceLineVisible: false,
    })

    // 원정팀 승률 (빨간색 영역 - 강화)
    const awaySeries = chart.addAreaSeries({
      topColor: darkMode ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.4)',
      bottomColor: darkMode ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.1)',
      lineColor: '#ef4444',
      lineWidth: 4,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
      lastValueVisible: true,
      priceLineVisible: false,
    })

    // 데이터 변환
    const homeData = data.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.homeWinProbability,
    }))

    const drawData = data.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.drawProbability,
    }))

    const awayData = data.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.awayWinProbability,
    }))

    // 🎨 애니메이션: 데이터를 점진적으로 추가
    const animateData = async () => {
      try {
        console.log('📊 Chart animation starting...')
        console.log('📊 Data length:', data.length)
        console.log('📊 First point:', homeData[0])
        console.log('📊 Last point:', homeData[homeData.length - 1])
        
        // 🔧 디버깅: 애니메이션 제거, 즉시 표시
        homeSeries.setData(homeData)
        drawSeries.setData(drawData)
        awaySeries.setData(awayData)
        
        console.log('✅ Chart data set successfully')
        
        // 페이드인 완료
        container.style.opacity = '1'
        console.log('✅ Chart visible')
      } catch (error) {
        console.error('❌ Chart animation error:', error)
        // 에러 발생 시에도 표시
        container.style.opacity = '1'
      }
    }

    // Y축 범위 설정
    chart.priceScale('right').applyOptions({
      autoScale: false,
      mode: 0,  // Normal mode
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
      // 🔧 명시적 범위 설정
      visible: true,
      borderVisible: true,
    })

    // 🔧 Y축에 범위 적용
    chart.timeScale().fitContent()
    
    // 시리즈에 Y축 범위 적용
    homeSeries.priceScale().applyOptions({
      autoScale: false,
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    })

    // 🔧 애니메이션 즉시 시작 (delay 제거)
    animateData()

    // 시간 축 맞추기
    chart.timeScale().fitContent()

    // 리사이즈 핸들러
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    // 클린업
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data, darkMode])

  return (
    <div 
      ref={chartContainerRef} 
      className="chart-container w-full"
      style={{ 
        minHeight: '300px',
        position: 'relative'
      }}
    />
  )
}