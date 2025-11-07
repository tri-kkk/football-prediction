'use client'

import { useEffect, useRef } from 'react'

export default function AdsterraNativeBanner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    if (scriptLoadedRef.current || !containerRef.current) return

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.setAttribute('data-cfasync', 'false')
    script.src = '//pl27997789.effectivegatecpm.com/8577f155e1a4fbe24cedf231aeb4e9f7/invoke.js'
    
    script.onload = () => console.log('✅ Adsterra loaded')
    script.onerror = () => console.error('❌ Adsterra failed')

    containerRef.current.appendChild(script)
    scriptLoadedRef.current = true

    return () => {
      if (containerRef.current && script.parentNode) {
        containerRef.current.removeChild(script)
      }
      scriptLoadedRef.current = false
    }
  }, [])

  return (
    <div className="my-8 flex justify-center">
      <div ref={containerRef} className="w-full max-w-4xl">
        <div id="container-8577f155e1a4fbe24cedf231aeb4e9f7"></div>
      </div>
    </div>
  )
}