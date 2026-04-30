// 📁 파일 위치: app/components/MatchStatsWidget.tsx
'use client'

import { useEffect, useRef } from 'react'

interface MatchStatsWidgetProps {
  fixtureId: number
  darkMode?: boolean
  language?: string
}

export default function MatchStatsWidget({ 
  fixtureId, 
  darkMode = true, 
  language = 'en' 
}: MatchStatsWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptLoaded = useRef(false)

  useEffect(() => {
    // 위젯 스크립트 로드
    if (!scriptLoaded.current) {
      const script = document.createElement('script')
      script.src = 'https://widgets.api-sports.io/3.1.0/widgets.js'
      script.type = 'module'
      script.async = true
      document.body.appendChild(script)
      scriptLoaded.current = true
    }

    // 컴포넌트 언마운트 시 위젯 정리
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [])

  useEffect(() => {
    // fixtureId가 변경되면 위젯 재렌더링
    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <api-sports-widget 
          data-type="game"
          data-game-id="${fixtureId}"
        ></api-sports-widget>
        
        <api-sports-widget 
          data-type="config"
          data-key="${process.env.NEXT_PUBLIC_API_FOOTBALL_KEY || ''}"
          data-sport="football"
          data-lang="${language}"
          data-theme="${darkMode ? 'dark' : 'white'}"
          data-show-errors="false"
          data-show-logos="true"
        ></api-sports-widget>
      `
    }
  }, [fixtureId, darkMode, language])

  return (
    <div 
      ref={containerRef}
      className="api-football-widget-container"
      style={{ 
        minHeight: '400px',
        backgroundColor: darkMode ? '#1a1a2e' : '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden'
      }}
    />
  )
}
