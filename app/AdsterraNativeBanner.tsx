'use client'

import { useEffect, useRef } from 'react'

interface AdsterraNativeBannerProps {
  id?: string
}

export default function AdsterraNativeBanner({ id = 'native-banner' }: AdsterraNativeBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null)
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    // 스크립트가 이미 로드되었으면 스킵
    if (scriptLoadedRef.current) return

    const script = document.createElement('script')
    script.async = true
    script.setAttribute('data-cfasync', 'false')
    script.src = '//pl27997789.effectivegatecpm.com/8577f155e1a4fbe24cedf231aeb4e9f7/invoke.js'

    if (bannerRef.current) {
      bannerRef.current.appendChild(script)
      scriptLoadedRef.current = true
    }

    return () => {
      // cleanup
      if (bannerRef.current && script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  return (
    <div className="my-8 flex justify-center">
      <div 
        ref={bannerRef}
        className="w-full max-w-4xl"
      >
        <div id="container-8577f155e1a4fbe24cedf231aeb4e9f7"></div>
      </div>
    </div>
  )
}
