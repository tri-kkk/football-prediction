'use client'

import { useEffect, useRef } from 'react'

export default function AdsterraNativeBanner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    // 이미 로드되었으면 스킵
    if (scriptLoadedRef.current) return
    if (!containerRef.current) return

    try {
      // 스크립트 생성
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.setAttribute('data-cfasync', 'false')
      script.src = '//pl27997789.effectivegatecpm.com/8577f155e1a4fbe24cedf231aeb4e9f7/invoke.js'
      
      // 컨테이너에 추가
      containerRef.current.appendChild(script)
      scriptLoadedRef.current = true

      console.log('✅ Adsterra Native Banner script loaded')
    } catch (error) {
      console.error('❌ Failed to load Adsterra script:', error)
    }

    // cleanup - 언마운트 시 정리
    return () => {
      if (containerRef.current) {
        const scripts = containerRef.current.getElementsByTagName('script')
        while (scripts.length > 0) {
          scripts[0].parentNode?.removeChild(scripts[0])
        }
      }
    }
  }, []) // 빈 배열 - 한 번만 실행!

  return (
    <div className="my-8 flex justify-center">
      <div ref={containerRef} className="w-full max-w-4xl">
        {/* 광고 컨테이너 */}
        <div id="container-8577f155e1a4fbe24cedf231aeb4e9f7"></div>
      </div>
    </div>
  )
}